/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST, DELETE } from '../route';
import { fileUploadService } from '@/services/FileUploadService';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
    prisma: {
        lead: {
            findUnique: jest.fn(),
        },
        document: {
            create: jest.fn(),
            findFirst: jest.fn(),
            delete: jest.fn(),
        },
    },
}));
jest.mock('@/services/FileUploadService');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFileUploadService = fileUploadService as jest.Mocked<typeof fileUploadService>;

// Get the mocked prisma instance
const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma');

describe('/api/leads/[id]/files', () => {
    const mockSession = {
        user: {
            id: '1',
            email: 'test@example.com',
            role: 'USER',
        },
    };

    const mockLead = {
        id: 1,
        legacyLeadId: BigInt(123456789),
        campaignId: 1,
        email: 'john.doe@example.com',
        phone: '555-0123',
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Test Business',
        status: 'NEW',
        intakeToken: 'token123',
        intakeCompletedAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        importedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST', () => {
        it('should upload file successfully', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);
            mockFileUploadService.uploadFile.mockResolvedValue({
                fileName: 'test-file.pdf',
                fileId: 'b2-file-id',
                bucketName: 'test-bucket',
                fileSize: 12,
                contentType: 'application/pdf',
                uploadTimestamp: Date.now(),
            });

            const mockDocument = {
                id: 1,
                leadId: 1,
                filename: 'test-file.pdf',
                originalFilename: 'Test File.pdf',
                fileSize: 12,
                mimeType: 'application/pdf',
                b2FileId: 'b2-file-id',
                b2BucketName: 'test-bucket',
                uploadedBy: 1,
                uploadedAt: '2024-01-01T00:00:00.000Z',
                user: {
                    id: 1,
                    email: 'test@example.com',
                },
            };

            (mockPrisma.document.create as jest.Mock).mockResolvedValue(mockDocument);

            const file = new File(['test content'], 'Test File.pdf', { type: 'application/pdf' });
            const formData = new FormData();
            formData.append('file', file);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.document).toEqual(mockDocument);
            expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
                expect.any(Buffer),
                'Test File.pdf',
                'application/pdf',
                1
            );
            expect(mockPrisma.document.create as jest.Mock).toHaveBeenCalledWith({
                data: {
                    leadId: 1,
                    filename: 'test-file.pdf',
                    originalFilename: 'Test File.pdf',
                    fileSize: 12,
                    mimeType: 'application/pdf',
                    b2FileId: 'b2-file-id',
                    b2BucketName: 'test-bucket',
                    uploadedBy: 1,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });
        });

        it('should return 401 if not authenticated', async () => {
            mockGetServerSession.mockResolvedValue(null);

            const formData = new FormData();
            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return 400 for invalid lead ID', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);

            const formData = new FormData();
            const request = new NextRequest('http://localhost:3000/api/leads/invalid/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: 'invalid' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid lead ID');
        });

        it('should return 404 if lead not found', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(null);

            const formData = new FormData();
            const request = new NextRequest('http://localhost:3000/api/leads/999/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '999' } });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('Lead not found');
        });

        it('should return 400 if no file provided', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

            const formData = new FormData();
            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('No file provided');
        });

        it('should return 400 for invalid file type', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const formData = new FormData();
            formData.append('file', file);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid file type. Only PDF, JPG, PNG, and DOCX files are allowed.');
        });

        it('should return 400 for file too large', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

            // Create a file larger than 10MB
            const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
            const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
            const formData = new FormData();
            formData.append('file', file);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('File size too large. Maximum size is 10MB.');
        });

        it('should handle upload service error', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);
            mockFileUploadService.uploadFile.mockRejectedValue(new Error('Upload failed'));

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            const formData = new FormData();
            formData.append('file', file);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });

        it('should handle database error', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);
            mockFileUploadService.uploadFile.mockResolvedValue({
                fileName: 'test-file.pdf',
                fileId: 'b2-file-id',
                bucketName: 'test-bucket',
                fileSize: 12,
                contentType: 'application/pdf',
                uploadTimestamp: Date.now(),
            });
            (mockPrisma.document.create as jest.Mock).mockRejectedValue(new Error('Database error'));

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            const formData = new FormData();
            formData.append('file', file);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'POST',
                body: formData,
            });

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });
    });

    describe('DELETE', () => {
        it('should delete file successfully', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

            const mockDocument = {
                id: 1,
                leadId: 1,
                filename: 'test-file.pdf',
                originalFilename: 'Test File.pdf',
                fileSize: 12,
                mimeType: 'application/pdf',
                b2FileId: 'b2-file-id',
                b2BucketName: 'test-bucket',
                uploadedBy: 1,
                uploadedAt: '2024-01-01T00:00:00.000Z',
            };

            (mockPrisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
            (mockPrisma.document.delete as jest.Mock).mockResolvedValue(mockDocument);
            mockFileUploadService.deleteFile.mockResolvedValue(undefined);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files?documentId=1', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(mockFileUploadService.deleteFile).toHaveBeenCalledWith('b2-file-id', 'test-file.pdf');
            expect(mockPrisma.document.delete as jest.Mock).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it('should return 401 if not authenticated', async () => {
            mockGetServerSession.mockResolvedValue(null);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files?documentId=1', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return 400 for invalid lead ID', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);

            const request = new NextRequest('http://localhost:3000/api/leads/invalid/files?documentId=1', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: 'invalid' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid lead ID');
        });

        it('should return 400 if document ID is missing', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Document ID is required');
        });

        it('should return 400 for invalid document ID', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files?documentId=invalid', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid document ID');
        });

        it('should return 404 if lead not found', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest('http://localhost:3000/api/leads/999/files?documentId=1', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '999' } });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('Lead not found');
        });

        it('should return 404 if document not found', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);
            (mockPrisma.document.findFirst as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files?documentId=999', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('Document not found');
        });

        it('should continue with database deletion even if B2 deletion fails', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

            const mockDocument = {
                id: 1,
                leadId: 1,
                filename: 'test-file.pdf',
                originalFilename: 'Test File.pdf',
                fileSize: 12,
                mimeType: 'application/pdf',
                b2FileId: 'b2-file-id',
                b2BucketName: 'test-bucket',
                uploadedBy: 1,
                uploadedAt: '2024-01-01T00:00:00.000Z',
            };

            (mockPrisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
            (mockPrisma.document.delete as jest.Mock).mockResolvedValue(mockDocument);
            mockFileUploadService.deleteFile.mockRejectedValue(new Error('B2 deletion failed'));

            const request = new NextRequest('http://localhost:3000/api/leads/1/files?documentId=1', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(mockPrisma.document.delete as jest.Mock).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it('should handle database error during deletion', async () => {
            mockGetServerSession.mockResolvedValue(mockSession);
            (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

            const mockDocument = {
                id: 1,
                leadId: 1,
                filename: 'test-file.pdf',
                originalFilename: 'Test File.pdf',
                fileSize: 12,
                mimeType: 'application/pdf',
                b2FileId: 'b2-file-id',
                b2BucketName: 'test-bucket',
                uploadedBy: 1,
                uploadedAt: '2024-01-01T00:00:00.000Z',
            };

            (mockPrisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
            (mockPrisma.document.delete as jest.Mock).mockRejectedValue(new Error('Database error'));
            mockFileUploadService.deleteFile.mockResolvedValue(undefined);

            const request = new NextRequest('http://localhost:3000/api/leads/1/files?documentId=1', {
                method: 'DELETE',
            });

            const response = await DELETE(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });
    });
});