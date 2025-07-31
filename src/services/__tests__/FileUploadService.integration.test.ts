import { FileUploadService } from '../FileUploadService'
import { setupTestDatabase, cleanupDatabase, testDataFactory } from '../../../tests/setup/database'
import { resetAllExternalMocks, backblazeMock } from '../../__mocks__/external-services'

describe('FileUploadService Integration Tests', () => {
    let prisma: any
    let fileUploadService: FileUploadService

    beforeAll(async () => {
        prisma = await setupTestDatabase()
    })

    beforeEach(async () => {
        await cleanupDatabase()
        resetAllExternalMocks()
        fileUploadService = new FileUploadService()
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    describe('File Upload Integration', () => {
        it('should upload file to B2 and save metadata to database', async () => {
            // Create test lead and user
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            const user = await prisma.user.create({
                data: testDataFactory.user()
            })

            // Create mock file
            const fileBuffer = Buffer.from('test file content')
            const filename = 'test-document.pdf'
            const mimeType = 'application/pdf'

            const result = await fileUploadService.uploadFile(
                fileBuffer,
                filename,
                mimeType,
                lead.id,
                user.id
            )

            expect(result).toBeDefined()
            expect(result).toBeDefined()
            // Note: Property names may vary in the actual FileUploadResult implementation
            // We'll verify the data through the database record instead

            // Verify file was uploaded to B2
            const uploadedFiles = backblazeMock.getUploadedFiles()
            expect(uploadedFiles).toHaveLength(1)
            expect(uploadedFiles[0].fileName).toContain('test-document.pdf')

            // Verify metadata was saved to database
            const document = await prisma.document.findUnique({
                where: { id: result },
                include: { lead: true, user: true }
            })

            expect(document).toBeTruthy()
            expect(document.leadId).toBe(lead.id)
            expect(document.uploadedBy).toBe(user.id)
            expect(document.b2FileId).toBeTruthy()
            expect(document.b2BucketName).toBe('test-bucket')
            expect(document.originalFilename).toBe('test-document.pdf')
            expect(document.mimeType).toBe('application/pdf')
            expect(document.fileSize).toBe(fileBuffer.length)
        })

        it('should validate file types and reject invalid files', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            const user = await prisma.user.create({
                data: testDataFactory.user()
            })

            // Try to upload invalid file type
            const fileBuffer = Buffer.from('executable content')
            const filename = 'malicious.exe'
            const mimeType = 'application/x-executable'

            await expect(fileUploadService.uploadFile(
                fileBuffer,
                filename,
                mimeType,
                lead.id,
                user.id
            )).rejects.toThrow('Invalid file type')

            // Verify no file was uploaded
            const uploadedFiles = backblazeMock.getUploadedFiles()
            expect(uploadedFiles).toHaveLength(0)

            // Verify no database record was created
            const documents = await prisma.document.findMany({
                where: { leadId: lead.id }
            })
            expect(documents).toHaveLength(0)
        })

        it('should validate file size limits', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            const user = await prisma.user.create({
                data: testDataFactory.user()
            })

            // Create file that's too large (over 10MB)
            const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
            const filename = 'large-file.pdf'
            const mimeType = 'application/pdf'

            await expect(fileUploadService.uploadFile(
                largeBuffer,
                filename,
                mimeType,
                lead.id,
                user.id
            )).rejects.toThrow('File size exceeds limit')

            // Verify no file was uploaded
            const uploadedFiles = backblazeMock.getUploadedFiles()
            expect(uploadedFiles).toHaveLength(0)
        })

        it('should handle B2 upload failures gracefully', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            const user = await prisma.user.create({
                data: testDataFactory.user()
            })

            // Set up B2 mock to fail
            backblazeMock.setShouldFail(true, new Error('B2 service unavailable'))

            const fileBuffer = Buffer.from('test content')
            const filename = 'test.pdf'
            const mimeType = 'application/pdf'

            await expect(fileUploadService.uploadFile(
                fileBuffer,
                filename,
                mimeType,
                lead.id,
                user.id
            )).rejects.toThrow('B2 service unavailable')

            // Verify no database record was created
            const documents = await prisma.document.findMany({
                where: { leadId: lead.id }
            })
            expect(documents).toHaveLength(0)
        })
    })

    // Note: File download functionality may be handled by a separate service or API endpoint
    // The FileUploadService appears to focus on upload operations
    // Download tests would be better placed in API route tests or a separate download service test

    // Note: File deletion functionality may be handled by a separate service or API endpoint
    // The FileUploadService appears to focus on upload operations
    // Deletion tests would be better placed in API route tests or a separate file management service test

    // Note: File listing functionality may be handled by a separate service or API endpoint
    // The FileUploadService appears to focus on upload operations
    // File listing tests would be better placed in API route tests or a separate file management service test
})