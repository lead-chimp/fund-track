import { POST, GET } from '../route';
import { createLeadPoller } from '@/services/LeadPoller';
import { notificationService } from '@/services/NotificationService';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/services/LeadPoller');
jest.mock('@/services/NotificationService', () => ({
    notificationService: {
        sendEmail: jest.fn(),
        sendSMS: jest.fn(),
    },
}));
jest.mock('@/lib/prisma', () => ({
    prisma: {
        lead: {
            findMany: jest.fn(),
        },
    },
}));
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        notification: jest.fn(),
    },
}));

const mockCreateLeadPoller = createLeadPoller as jest.MockedFunction<typeof createLeadPoller>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/cron/poll-leads', () => {
    let mockLeadPoller: any;
    let mockRequest: NextRequest;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock lead poller
        mockLeadPoller = {
            pollAndImportLeads: jest.fn(),
        };
        mockCreateLeadPoller.mockReturnValue(mockLeadPoller);

        // Create mock request
        mockRequest = new NextRequest('http://localhost:3000/api/cron/poll-leads', {
            method: 'POST',
        });
    });

    describe('POST', () => {
        it('should successfully poll leads and send notifications', async () => {
            const mockPollingResult = {
                totalProcessed: 5,
                newLeads: 2,
                duplicatesSkipped: 3,
                errors: [],
                processingTime: 1000,
            };

            mockLeadPoller.pollAndImportLeads.mockResolvedValue(mockPollingResult);

            // Mock leads for notification
            (mockPrisma.lead.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 1,
                    email: 'test@example.com',
                    phone: '1234567890',
                    firstName: 'John',
                    lastName: 'Doe',
                    businessName: 'Test Business',
                    intakeToken: 'test-token-1',
                },
            ]);

            // Mock successful notifications
            (notificationService.sendEmail as jest.Mock).mockResolvedValue({ success: true, externalId: 'email-123' });
            (notificationService.sendSMS as jest.Mock).mockResolvedValue({ success: true, externalId: 'sms-123' });

            const response = await POST(mockRequest);
            const responseData = await response.json();

            expect(response.status).toBe(200);
            expect(responseData.success).toBe(true);
            expect(responseData.pollingResult).toEqual(mockPollingResult);
            expect(responseData.notificationResults).toEqual({
                emailsSent: 1,
                smsSent: 1,
                emailErrors: 0,
                smsErrors: 0,
            });
        });

        it('should handle case with no new leads', async () => {
            const mockPollingResult = {
                totalProcessed: 5,
                newLeads: 0,
                duplicatesSkipped: 5,
                errors: [],
                processingTime: 1000,
            };

            mockLeadPoller.pollAndImportLeads.mockResolvedValue(mockPollingResult);

            const response = await POST(mockRequest);
            const responseData = await response.json();

            expect(response.status).toBe(200);
            expect(responseData.success).toBe(true);
            expect(responseData.message).toBe('Lead polling completed, no new leads found');
            expect(mockPrisma.lead.findMany as jest.Mock).not.toHaveBeenCalled();
        });

        it('should handle polling errors', async () => {
            const error = new Error('Polling failed');
            mockLeadPoller.pollAndImportLeads.mockRejectedValue(error);

            const response = await POST(mockRequest);
            const responseData = await response.json();

            expect(response.status).toBe(500);
            expect(responseData.success).toBe(false);
            expect(responseData.error).toBe('Polling failed');
        });

        it('should handle notification failures gracefully', async () => {
            const mockPollingResult = {
                totalProcessed: 1,
                newLeads: 1,
                duplicatesSkipped: 0,
                errors: [],
                processingTime: 1000,
            };

            mockLeadPoller.pollAndImportLeads.mockResolvedValue(mockPollingResult);

            // Mock leads for notification
            (mockPrisma.lead.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 1,
                    email: 'test@example.com',
                    phone: '1234567890',
                    firstName: 'John',
                    lastName: 'Doe',
                    businessName: 'Test Business',
                    intakeToken: 'test-token-1',
                },
            ]);

            // Mock failed notifications
            (notificationService.sendEmail as jest.Mock).mockResolvedValue({ success: false, error: 'Email failed' });
            (notificationService.sendSMS as jest.Mock).mockResolvedValue({ success: false, error: 'SMS failed' });

            const response = await POST(mockRequest);
            const responseData = await response.json();

            expect(response.status).toBe(200);
            expect(responseData.success).toBe(true);
            expect(responseData.notificationResults.emailErrors).toBe(1);
            expect(responseData.notificationResults.smsErrors).toBe(1);
        });
    });

    describe('GET', () => {
        it('should return health check response', async () => {
            const response = await GET();
            const responseData = await response.json();

            expect(response.status).toBe(200);
            expect(responseData.message).toBe('Lead polling endpoint is available');
            expect(responseData.timestamp).toBeDefined();
        });
    });
});