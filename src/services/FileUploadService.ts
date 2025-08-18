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
   * Initialize the B2 connection and authorize
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      await this.b2.authorize();
      this.isInitialized = true;
      logger.info("Backblaze B2 connection initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Backblaze B2 connection", { error });
      throw new Error("File storage service initialization failed");
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
    try {
      await this.initialize();

      // Validate file
      this.validateFile(file, originalFileName, mimeType, options);

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
    } catch (error) {
      logger.error("File upload failed", {
        originalFileName,
        leadId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error("File upload failed");
    }
  }

  /**
   * Generate a secure download URL for a file
   */
  async getDownloadUrl(
    fileId: string,
    fileName: string,
    expirationHours: number = 24
  ): Promise<FileDownloadResult> {
    try {
      await this.initialize();

      const downloadAuth = await this.b2.getDownloadAuthorization({
        bucketId: this.bucketId,
        fileNamePrefix: fileName,
        validDurationInSeconds: expirationHours * 3600,
      });

      const downloadUrl = `${this.b2.downloadUrl}/file/${this.bucketName}/${fileName}?Authorization=${downloadAuth.data.authorizationToken}`;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      return {
        downloadUrl,
        expiresAt,
      };
    } catch (error) {
      console.error("❌ B2 Download: Failed to generate download URL", {
        fileId,
        fileName,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      logger.error("Failed to generate download URL", {
        fileId,
        fileName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to generate download URL");
    }
  }

  /**
   * Delete a file from Backblaze B2
   */
  async deleteFile(fileId: string, fileName: string): Promise<void> {
    try {
      await this.initialize();

      await this.b2.deleteFileVersion({
        fileId,
        fileName,
      });

      logger.info("File deleted successfully", { fileId, fileName });
    } catch (error) {
      logger.error("File deletion failed", {
        fileId,
        fileName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("File deletion failed");
    }
  }

  /**
   * Get file information from Backblaze B2
   */
  async getFileInfo(fileId: string): Promise<any> {
    try {
      await this.initialize();

      const response = await this.b2.getFileInfo({ fileId });
      return response.data;
    } catch (error) {
      logger.error("Failed to get file info", {
        fileId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to get file information");
    }
  }

  /**
   * List files for a specific lead
   */
  async listFilesForLead(leadId: number): Promise<any[]> {
    try {
      await this.initialize();

      const response = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix: `leads/${leadId}/`,
        maxFileCount: 100,
      });

      return response.data.files || [];
    } catch (error) {
      logger.error("Failed to list files for lead", {
        leadId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to list files");
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
