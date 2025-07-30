// Mock dependencies
jest.mock('@/services/TokenService');
jest.mock('@/services/FileUploadService', () => ({
  fileUploadService: {
    uploadFile: jest.fn(),
  },
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      create: jest.fn(),
    },
  },
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { TokenService } from '@/services/TokenService';
import { fileUploadService } from '@/services/FileUploadService';
import { prisma } from '@/lib/prisma';

const mockTokenService = TokenService as jest.Mocked<typeof TokenService>;
const mockFileUploadService = fileUploadService as jest.Mocked<typeof fileUploadService>;
const mockDocumentCreate = prisma.document.create as jest.MockedFunction<typeof prisma.document.create>;

describe('/api/intake/[token]/step2', () => {
  const mockIntakeSession = {
    leadId: 1,
    token: 'test-token',
    isValid: true,
    isCompleted: false,
    step1Completed: true,
    step2Completed: false,
    lead: {
      id: 1,
      email: 'test@example.com',
      phone: '1234567890',
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Test Business',
      status: 'pending',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upload documents successfully', async () => {
    // Mock token validation
    mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

    // Mock file upload service
    mockFileUploadService.uploadFile.mockResolvedValue({
      fileId: 'test-file-id',
      fileName: 'test-file.pdf',
      bucketName: 'test-bucket',
      fileSize: 1024,
      contentType: 'application/pdf',
      uploadTimestamp: Date.now(),
    });

    // Mock database document creation
    mockDocumentCreate.mockResolvedValue({
      id: 1,
      leadId: 1,
      filename: 'test-file.pdf',
      originalFilename: 'document.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      b2FileId: 'test-file-id',
      b2BucketName: 'test-bucket',
      uploadedBy: null,
      uploadedAt: new Date(),
    });

    // Mock step 2 completion
    mockTokenService.markStep2Completed.mockResolvedValue(true);

    // Create mock files
    const mockFile = new File(['test content'], 'document.pdf', {
      type: 'application/pdf',
    });

    // Create form data with 3 files
    const formData = new FormData();
    formData.append('documents', mockFile);
    formData.append('documents', mockFile);
    formData.append('documents', mockFile);

    const request = new NextRequest('http://localhost/api/intake/test-token/step2', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request, { params: { token: 'test-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.documents).toHaveLength(3);
    expect(mockTokenService.markStep2Completed).toHaveBeenCalledWith(1);
  });

  it('should reject invalid token', async () => {
    mockTokenService.validateToken.mockResolvedValue(null);

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/intake/invalid-token/step2', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request, { params: { token: 'invalid-token' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired token');
  });

  it('should reject if step 1 not completed', async () => {
    const incompleteSession = {
      ...mockIntakeSession,
      step1Completed: false,
    };
    mockTokenService.validateToken.mockResolvedValue(incompleteSession);

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/intake/test-token/step2', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request, { params: { token: 'test-token' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Step 1 must be completed before uploading documents');
  });

  it('should reject if step 2 already completed', async () => {
    const completedSession = {
      ...mockIntakeSession,
      step2Completed: true,
    };
    mockTokenService.validateToken.mockResolvedValue(completedSession);

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/intake/test-token/step2', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request, { params: { token: 'test-token' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Step 2 has already been completed');
  });

  it('should reject if not exactly 3 documents', async () => {
    mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

    const mockFile = new File(['test content'], 'document.pdf', {
      type: 'application/pdf',
    });

    // Create form data with only 2 files
    const formData = new FormData();
    formData.append('documents', mockFile);
    formData.append('documents', mockFile);

    const request = new NextRequest('http://localhost/api/intake/test-token/step2', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request, { params: { token: 'test-token' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Exactly 3 documents are required');
  });

  it('should handle file upload errors', async () => {
    mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
    mockFileUploadService.uploadFile.mockRejectedValue(new Error('Upload failed'));

    const mockFile = new File(['test content'], 'document.pdf', {
      type: 'application/pdf',
    });

    const formData = new FormData();
    formData.append('documents', mockFile);
    formData.append('documents', mockFile);
    formData.append('documents', mockFile);

    const request = new NextRequest('http://localhost/api/intake/test-token/step2', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request, { params: { token: 'test-token' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to upload document');
  });
});