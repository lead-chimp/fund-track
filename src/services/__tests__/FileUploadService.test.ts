// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { FileUploadService } from '../FileUploadService';
import { logger } from '@/lib/logger';

// Mock B2 class
jest.mock('backblaze-b2');

const mockB2Methods = {
  authorize: jest.fn(),
  getUploadUrl: jest.fn(),
  uploadFile: jest.fn(),
  getDownloadAuthorization: jest.fn(),
  deleteFileVersion: jest.fn(),
  getFileInfo: jest.fn(),
  listFileNames: jest.fn()
};

const mockB2Instance = {
  ...mockB2Methods,
  downloadUrl: 'https://f000.backblazeb2.com'
};

const B2 = require('backblaze-b2');
B2.mockImplementation(() => mockB2Instance);

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;
  const mockEnv = {
    B2_APPLICATION_KEY_ID: 'test-key-id',
    B2_APPLICATION_KEY: 'test-key',
    B2_BUCKET_NAME: 'test-bucket',
    B2_BUCKET_ID: 'test-bucket-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    Object.assign(process.env, mockEnv);
    
    fileUploadService = new FileUploadService();
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('initialize', () => {
    it('should initialize B2 connection successfully', async () => {
      mockB2Methods.authorize.mockResolvedValue({});

      await fileUploadService.initialize();

      expect(mockB2Methods.authorize).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Backblaze B2 connection initialized successfully');
    });

    it('should handle initialization failure', async () => {
      const error = new Error('Authorization failed');
      mockB2Methods.authorize.mockRejectedValue(error);

      await expect(fileUploadService.initialize()).rejects.toThrow('File storage service initialization failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to initialize Backblaze B2 connection', { error });
    });

    it('should not reinitialize if already initialized', async () => {
      mockB2Methods.authorize.mockResolvedValue({});

      await fileUploadService.initialize();
      await fileUploadService.initialize();

      expect(mockB2Methods.authorize).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateFile', () => {
    const validFile = Buffer.from('test file content');
    const validFileName = 'test.pdf';
    const validMimeType = 'application/pdf';

    it('should validate a valid file', () => {
      expect(() => {
        fileUploadService.validateFile(validFile, validFileName, validMimeType);
      }).not.toThrow();
    });

    it('should reject file that exceeds size limit', () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      expect(() => {
        fileUploadService.validateFile(largeFile, validFileName, validMimeType);
      }).toThrow('File size exceeds maximum allowed size');
    });

    it('should reject invalid MIME type', () => {
      expect(() => {
        fileUploadService.validateFile(validFile, validFileName, 'text/plain');
      }).toThrow('File type text/plain is not allowed');
    });

    it('should reject invalid file extension', () => {
      expect(() => {
        fileUploadService.validateFile(validFile, 'test.txt', validMimeType);
      }).toThrow('File extension .txt is not allowed');
    });

    it('should reject empty file', () => {
      const emptyFile = Buffer.alloc(0);
      
      expect(() => {
        fileUploadService.validateFile(emptyFile, validFileName, validMimeType);
      }).toThrow('File is empty');
    });

    it('should accept custom validation options', () => {
      const customOptions = {
        maxSizeBytes: 1024,
        allowedMimeTypes: ['text/plain'],
        allowedExtensions: ['.txt']
      };
      
      const smallFile = Buffer.from('small');
      
      expect(() => {
        fileUploadService.validateFile(smallFile, 'test.txt', 'text/plain', customOptions);
      }).not.toThrow();
    });
  });

  describe('uploadFile', () => {
    const testFile = Buffer.from('test file content');
    const fileName = 'test.pdf';
    const mimeType = 'application/pdf';
    const leadId = 123;

    beforeEach(() => {
      mockB2Methods.authorize.mockResolvedValue({});
      mockB2Methods.getUploadUrl.mockResolvedValue({
        data: {
          uploadUrl: 'https://upload.url',
          authorizationToken: 'auth-token'
        }
      });
      mockB2Methods.uploadFile.mockResolvedValue({
        data: {
          fileId: 'test-file-id',
          fileName: 'generated-file-name.pdf'
        }
      });
    });

    it('should upload file successfully', async () => {
      const result = await fileUploadService.uploadFile(testFile, fileName, mimeType, leadId);

      expect(mockB2Methods.authorize).toHaveBeenCalled();
      expect(mockB2Methods.getUploadUrl).toHaveBeenCalledWith({
        bucketId: 'test-bucket-id'
      });
      expect(mockB2Methods.uploadFile).toHaveBeenCalledWith({
        uploadUrl: 'https://upload.url',
        uploadAuthToken: 'auth-token',
        fileName: expect.stringMatching(/^leads\/123\/\d+-[a-f0-9]{8}-test\.pdf$/),
        data: testFile,
        mime: mimeType,
        info: {
          originalFileName: fileName,
          leadId: leadId.toString(),
          uploadedAt: expect.any(String)
        }
      });

      expect(result).toEqual({
        fileId: 'test-file-id',
        fileName: expect.stringMatching(/^leads\/123\/\d+-[a-f0-9]{8}-test\.pdf$/),
        bucketName: 'test-bucket',
        fileSize: testFile.length,
        contentType: mimeType,
        uploadTimestamp: expect.any(Number)
      });

      expect(logger.info).toHaveBeenCalledWith('File uploaded successfully', expect.any(Object));
    });

    it('should handle upload failure', async () => {
      const error = new Error('Upload failed');
      mockB2Methods.uploadFile.mockRejectedValue(error);

      await expect(fileUploadService.uploadFile(testFile, fileName, mimeType, leadId))
        .rejects.toThrow('Upload failed');

      expect(logger.error).toHaveBeenCalledWith('File upload failed', expect.any(Object));
    });

    it('should validate file before upload', async () => {
      const invalidFile = Buffer.alloc(0);

      await expect(fileUploadService.uploadFile(invalidFile, fileName, mimeType, leadId))
        .rejects.toThrow('File is empty');
    });
  });

  describe('getDownloadUrl', () => {
    const fileId = 'test-file-id';
    const fileName = 'test-file.pdf';

    beforeEach(() => {
      mockB2Methods.authorize.mockResolvedValue({});
      mockB2Methods.getDownloadAuthorization.mockResolvedValue({
        data: {
          authorizationToken: 'download-auth-token'
        }
      });
    });

    it('should generate download URL successfully', async () => {
      const result = await fileUploadService.getDownloadUrl(fileId, fileName);

      expect(mockB2Methods.getDownloadAuthorization).toHaveBeenCalledWith({
        bucketId: 'test-bucket-id',
        fileNamePrefix: fileName,
        validDurationInSeconds: 24 * 3600
      });

      expect(result.downloadUrl).toBe(
        'https://f000.backblazeb2.com/file/test-bucket/test-file.pdf?Authorization=download-auth-token'
      );
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should handle custom expiration hours', async () => {
      await fileUploadService.getDownloadUrl(fileId, fileName, 48);

      expect(mockB2Methods.getDownloadAuthorization).toHaveBeenCalledWith({
        bucketId: 'test-bucket-id',
        fileNamePrefix: fileName,
        validDurationInSeconds: 48 * 3600
      });
    });

    it('should handle download URL generation failure', async () => {
      const error = new Error('Download auth failed');
      mockB2Methods.getDownloadAuthorization.mockRejectedValue(error);

      await expect(fileUploadService.getDownloadUrl(fileId, fileName))
        .rejects.toThrow('Failed to generate download URL');

      expect(logger.error).toHaveBeenCalledWith('Failed to generate download URL', expect.any(Object));
    });
  });

  describe('deleteFile', () => {
    const fileId = 'test-file-id';
    const fileName = 'test-file.pdf';

    beforeEach(() => {
      mockB2Methods.authorize.mockResolvedValue({});
      mockB2Methods.deleteFileVersion.mockResolvedValue({});
    });

    it('should delete file successfully', async () => {
      await fileUploadService.deleteFile(fileId, fileName);

      expect(mockB2Methods.deleteFileVersion).toHaveBeenCalledWith({
        fileId,
        fileName
      });

      expect(logger.info).toHaveBeenCalledWith('File deleted successfully', { fileId, fileName });
    });

    it('should handle deletion failure', async () => {
      const error = new Error('Deletion failed');
      mockB2Methods.deleteFileVersion.mockRejectedValue(error);

      await expect(fileUploadService.deleteFile(fileId, fileName))
        .rejects.toThrow('File deletion failed');

      expect(logger.error).toHaveBeenCalledWith('File deletion failed', expect.any(Object));
    });
  });

  describe('getFileInfo', () => {
    const fileId = 'test-file-id';

    beforeEach(() => {
      mockB2Methods.authorize.mockResolvedValue({});
      mockB2Methods.getFileInfo.mockResolvedValue({
        data: {
          fileId,
          fileName: 'test-file.pdf',
          contentLength: 1024
        }
      });
    });

    it('should get file info successfully', async () => {
      const result = await fileUploadService.getFileInfo(fileId);

      expect(mockB2Methods.getFileInfo).toHaveBeenCalledWith({ fileId });
      expect(result).toEqual({
        fileId,
        fileName: 'test-file.pdf',
        contentLength: 1024
      });
    });

    it('should handle get file info failure', async () => {
      const error = new Error('Get info failed');
      mockB2Methods.getFileInfo.mockRejectedValue(error);

      await expect(fileUploadService.getFileInfo(fileId))
        .rejects.toThrow('Failed to get file information');

      expect(logger.error).toHaveBeenCalledWith('Failed to get file info', expect.any(Object));
    });
  });

  describe('listFilesForLead', () => {
    const leadId = 123;

    beforeEach(() => {
      mockB2Methods.authorize.mockResolvedValue({});
      mockB2Methods.listFileNames.mockResolvedValue({
        data: {
          files: [
            { fileId: 'file1', fileName: 'leads/123/file1.pdf' },
            { fileId: 'file2', fileName: 'leads/123/file2.pdf' }
          ]
        }
      });
    });

    it('should list files for lead successfully', async () => {
      const result = await fileUploadService.listFilesForLead(leadId);

      expect(mockB2Methods.listFileNames).toHaveBeenCalledWith({
        bucketId: 'test-bucket-id',
        prefix: 'leads/123/',
        maxFileCount: 100
      });

      expect(result).toEqual([
        { fileId: 'file1', fileName: 'leads/123/file1.pdf' },
        { fileId: 'file2', fileName: 'leads/123/file2.pdf' }
      ]);
    });

    it('should handle empty file list', async () => {
      mockB2Methods.listFileNames.mockResolvedValue({
        data: {}
      });

      const result = await fileUploadService.listFilesForLead(leadId);
      expect(result).toEqual([]);
    });

    it('should handle list files failure', async () => {
      const error = new Error('List failed');
      mockB2Methods.listFileNames.mockRejectedValue(error);

      await expect(fileUploadService.listFilesForLead(leadId))
        .rejects.toThrow('Failed to list files');

      expect(logger.error).toHaveBeenCalledWith('Failed to list files for lead', expect.any(Object));
    });
  });
});