import B2 from "backblaze-b2";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  bucketName: string;
  fileSize: number;
  contentType: string;
  uploadTimestamp: number;
}

export interface FileDownloadResult {
  downloadUrl: string;
  expiresAt: Date;
}

export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export class FileUploadService {
  private b2: B2;
  private bucketId: string;
  private bucketName: string;
  private isInitialized = false;
  private lastAuthTime: number = 0;
  private readonly AUTH_EXPIRY_BUFFER = 60 * 60 * 1000; // 1 hour buffer before token expires (B2 tokens last 24 hours)

  private readonly DEFAULT_VALIDATION: FileValidationOptions = {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".docx"],
  };

  constructor() {
    this.b2 = new B2({
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
      applicationKey: process.env.B2_APPLICATION_KEY!,
    });
    this.bucketName = process.env.B2_BUCKET_NAME!;
    this.bucketId = process.env.B2_BUCKET_ID!;
  }

  /**
   * Check if we need to re-authorize (tokens expire after 24 hours)
   */
  private needsReauthorization(): boolean {
    const now = Date.now();
    const timeSinceAuth = now - this.lastAuthTime;
    // Re-authorize if more than 23 hours have passed (1 hour buffer)
    return !this.isInitialized || timeSinceAuth > (23 * 60 * 60 * 1000);
  }

  /**
   * Execute a B2 operation with automatic retry on authorization errors
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Record<string, any> = {}
  ): Promise<T> {
    let retryCount = 0;
    const maxRetries = 2;
    const startTime = Date.now();

    while (retryCount <= maxRetries) {
      try {
        await this.initialize();
        const result = await operation();

        // Log successful operation
        logger.externalService(
          'Backblaze B2',
          operationName,
          true,
          Date.now() - startTime,
          { ...context, retryCount }
        );

        return result;
      } catch (error) {
        const isAuthError = error instanceof Error &&
          (error.message.includes('401') || error.message.includes('Unauthorized'));

        if (isAuthError && retryCount < maxRetries) {
          logger.warn(`B2 authorization error during ${operationName}, forcing re-authorization`, {
            ...context,
            retryCount,
            timeSinceLastAuth: Date.now() - this.lastAuthTime,
            error: error instanceof Error ? error.message : "Unknown error"
          });

          // Force re-authorization on next attempt
          this.isInitialized = false;
          this.lastAuthTime = 0;
          retryCount++;
          continue;
        }

        // Log failed operation
        logger.externalService(
          'Backblaze B2',
          operationName,
          false,
          Date.now() - startTime,
          {
            ...context,
            retryCount,
            error: error instanceof Error ? error.message : "Unknown error",
            errorType: isAuthError ? 'authorization' : 'other'
          }
        );

        throw error;
      }
    }

    throw new Error(`${operationName} failed after retries`);
  }

  /**
   * Initialize the B2 connection and authorize with automatic re-authorization
   */
  async initialize(): Promise<void> {
    try {
      if (!this.needsReauthorization()) {
        return;
      }

      const isReauth = this.isInitialized;
      const timeSinceLastAuth = this.isInitialized ? Date.now() - this.lastAuthTime : 0;

      logger.info("Authorizing Backblaze B2 connection", {
        isReauth,
        timeSinceLastAuth,
        hoursElapsed: timeSinceLastAuth / (1000 * 60 * 60)
      });

      const startTime = Date.now();
      await this.b2.authorize();
      const duration = Date.now() - startTime;

      this.isInitialized = true;
      this.lastAuthTime = Date.now();

      logger.externalService(
        'Backblaze B2',
        'Authorization',
        true,
        duration,
        {
          isReauth,
          authTime: new Date(this.lastAuthTime).toISOString(),
          bucketId: this.bucketId,
          bucketName: this.bucketName
        }
      );
    } catch (error) {
      logger.externalService(
        'Backblaze B2',
        'Authorization',
        false,
        0,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          bucketId: this.bucketId,
          bucketName: this.bucketName
        }
      );

      // Reset state on auth failure
      this.isInitialized = false;
      this.lastAuthTime = 0;
      throw new Error("File storage service authorization failed");
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    options: Partial<FileValidationOptions> = {}
  ): void {
    const validation = { ...this.DEFAULT_VALIDATION, ...options };

    // Check file size
    if (file.length > validation.maxSizeBytes) {
      throw new Error(
        `File size exceeds maximum allowed size of ${validation.maxSizeBytes} bytes`
      );
    }

    // Check MIME type
    if (!validation.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Check file extension
    const extension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf("."));
    if (!validation.allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} is not allowed`);
    }

    // Basic file content validation
    if (file.length === 0) {
      throw new Error("File is empty");
    }
  }

  /**
   * Generate a unique file name to prevent conflicts
   */
  private generateUniqueFileName(
    originalFileName: string,
    leadId: number
  ): string {
    const timestamp = Date.now();
    const hash = createHash("md5")
      .update(`${leadId}-${originalFileName}-${timestamp}`)
      .digest("hex")
      .substring(0, 8);
    const extension = originalFileName.substring(
      originalFileName.lastIndexOf(".")
    );
    const baseName = originalFileName.substring(
      0,
      originalFileName.lastIndexOf(".")
    );

    return `leads/${leadId}/${timestamp}-${hash}-${baseName}${extension}`;
  }

  /**
   * Upload file to Backblaze B2
   */
  async uploadFile(
    file: Buffer,
    originalFileName: string,
    mimeType: string,
    leadId: number,
    options: Partial<FileValidationOptions> = {}
  ): Promise<FileUploadResult> {
    // Validate file first (no need to retry validation)
    this.validateFile(file, originalFileName, mimeType, options);

    return await this.executeWithRetry(
      async () => {
        // Generate unique file name
        const fileName = this.generateUniqueFileName(originalFileName, leadId);

        // Get upload URL
        const uploadUrlResponse = await this.b2.getUploadUrl({
          bucketId: this.bucketId,
        });

        // Upload file
        const uploadResponse = await this.b2.uploadFile({
          uploadUrl: uploadUrlResponse.data.uploadUrl,
          uploadAuthToken: uploadUrlResponse.data.authorizationToken,
          fileName: fileName,
          data: file,
          mime: mimeType,
          info: {
            originalFileName: originalFileName,
            leadId: leadId.toString(),
            uploadedAt: new Date().toISOString(),
          },
        });

        const result: FileUploadResult = {
          fileId: uploadResponse.data.fileId,
          fileName: fileName,
          bucketName: this.bucketName,
          fileSize: file.length,
          contentType: mimeType,
          uploadTimestamp: Date.now(),
        };

        logger.info("File uploaded successfully", {
          fileId: result.fileId,
          fileName: result.fileName,
          leadId,
          fileSize: result.fileSize,
        });

        return result;
      },
      "File upload",
      { originalFileName, leadId }
    );
  }

  /**
   * Generate a secure download URL for a file
   */
  async getDownloadUrl(
    fileId: string,
    fileName: string,
    expirationHours: number = 24
  ): Promise<FileDownloadResult> {
    return await this.executeWithRetry(
      async () => {
        const downloadAuth = await this.b2.getDownloadAuthorization({
          bucketId: this.bucketId,
          fileNamePrefix: fileName,
          validDurationInSeconds: expirationHours * 3600,
        });

        const downloadUrl = `${this.b2.downloadUrl}/file/${this.bucketName}/${fileName}?Authorization=${downloadAuth.data.authorizationToken}`;

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expirationHours);

        logger.info("Successfully generated download URL", {
          fileId,
          fileName,
          expiresAt: expiresAt.toISOString(),
        });

        return {
          downloadUrl,
          expiresAt,
        };
      },
      "Generate download URL",
      { fileId, fileName }
    );
  }

  /**
   * Delete a file from Backblaze B2
   */
  async deleteFile(fileId: string, fileName: string): Promise<void> {
    await this.executeWithRetry(
      async () => {
        await this.b2.deleteFileVersion({
          fileId,
          fileName,
        });
        logger.info("File deleted successfully", { fileId, fileName });
      },
      "File deletion",
      { fileId, fileName }
    );
  }

  /**
   * Get file information from Backblaze B2
   */
  async getFileInfo(fileId: string): Promise<any> {
    return await this.executeWithRetry(
      async () => {
        const response = await this.b2.getFileInfo({ fileId });
        return response.data;
      },
      "Get file info",
      { fileId }
    );
  }

  /**
   * List files for a specific lead
   */
  async listFilesForLead(leadId: number): Promise<any[]> {
    return await this.executeWithRetry(
      async () => {
        const response = await this.b2.listFileNames({
          bucketId: this.bucketId,
          prefix: `leads/${leadId}/`,
          maxFileCount: 100,
        });
        return response.data.files || [];
      },
      "List files for lead",
      { leadId }
    );
  }

  /**
   * Download file content from Backblaze B2 using file name
   */
  async downloadFile(fileName: string): Promise<Buffer> {
    return await this.executeWithRetry(
      async () => {
        // Generate a temporary download URL and fetch the file
        const downloadAuth = await this.b2.getDownloadAuthorization({
          bucketId: this.bucketId,
          fileNamePrefix: fileName,
          validDurationInSeconds: 3600, // 1 hour
        });

        const downloadUrl = `${this.b2.downloadUrl}/file/${this.bucketName}/${fileName}?Authorization=${downloadAuth.data.authorizationToken}`;

        // Fetch the file content
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        logger.info("File downloaded successfully", {
          fileName,
          size: buffer.length
        });

        return buffer;
      },
      "File download",
      { fileName }
    );
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
