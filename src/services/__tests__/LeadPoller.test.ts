import { LeadStatus } from '@prisma/client';

jest.mock('@/lib/legacy-db');
jest.mock('@/lib/prisma');

import { LeadPoller } from '../LeadPoller';
import { getLegacyDatabase } from '@/lib/legacy-db';
import { prisma } from '@/lib/prisma';

// Mock functions
const mockLegacyDb = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    query: jest.fn(),
    testConnection: jest.fn(),
    isConnected: jest.fn(),
};

const mockPrismaLead = {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
};

// Setup mocks
(getLegacyDatabase as jest.Mock).mockReturnValue(mockLegacyDb);
(prisma as any).lead = mockPrismaLead;

describe('LeadPoller', () => {
    let leadPoller: LeadPoller;

    beforeEach(() => {
        jest.clearAllMocks();

        leadPoller = new LeadPoller({
            campaignIds: [123, 456],
            batchSize: 2,
        });
    });

    describe('pollAndImportLeads', () => {
        it('should successfully poll and import new leads', async () => {
            // Mock legacy database response
            const mockLegacyLeads = [
                {
                    ID: 1,
                    CampaignID: 123,
                    Email: 'test1@example.com',
                    Phone: '1234567890',
                    FirstName: 'John',
                    LastName: 'Doe',
                    BusinessName: 'Test Business 1',
                    CreatedDate: new Date(),
                },
                {
                    ID: 2,
                    CampaignID: 456,
                    Email: 'test2@example.com',
                    Phone: '0987654321',
                    FirstName: 'Jane',
                    LastName: 'Smith',
                    BusinessName: 'Test Business 2',
                    CreatedDate: new Date(),
                },
            ];

            mockLegacyDb.connect.mockResolvedValue(undefined);
            mockLegacyDb.disconnect.mockResolvedValue(undefined);
            mockLegacyDb.query.mockResolvedValue(mockLegacyLeads);

            // Mock Prisma responses - no existing leads
            mockPrismaLead.findUnique.mockResolvedValue(null);
            mockPrismaLead.create.mockResolvedValue({} as any);

            const result = await leadPoller.pollAndImportLeads();

            expect(result.totalProcessed).toBe(2);
            expect(result.newLeads).toBe(2);
            expect(result.duplicatesSkipped).toBe(0);
            expect(result.errors).toHaveLength(0);
            expect(mockLegacyDb.connect).toHaveBeenCalled();
            expect(mockLegacyDb.disconnect).toHaveBeenCalled();
            expect(mockPrismaLead.create).toHaveBeenCalledTimes(2);
        });

        it('should skip duplicate leads', async () => {
            const mockLegacyLeads = [
                {
                    ID: 1,
                    CampaignID: 123,
                    Email: 'test1@example.com',
                    Phone: '1234567890',
                    FirstName: 'John',
                    LastName: 'Doe',
                    BusinessName: 'Test Business 1',
                    CreatedDate: new Date(),
                },
            ];

            mockLegacyDb.connect.mockResolvedValue(undefined);
            mockLegacyDb.disconnect.mockResolvedValue(undefined);
            mockLegacyDb.query.mockResolvedValue(mockLegacyLeads);

            // Mock existing lead
            mockPrismaLead.findUnique.mockResolvedValue({
                id: 1,
                legacyLeadId: BigInt(1),
            } as any);

            const result = await leadPoller.pollAndImportLeads();

            expect(result.totalProcessed).toBe(1);
            expect(result.newLeads).toBe(0);
            expect(result.duplicatesSkipped).toBe(1);
            expect(result.errors).toHaveLength(0);
            expect(mockPrismaLead.create).not.toHaveBeenCalled();
        });

        it('should handle database connection errors', async () => {
            mockLegacyDb.connect.mockRejectedValue(new Error('Connection failed'));

            const result = await leadPoller.pollAndImportLeads();

            expect(result.totalProcessed).toBe(0);
            expect(result.newLeads).toBe(0);
            expect(result.duplicatesSkipped).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Connection failed');
        });

        it('should handle individual lead import errors', async () => {
            const mockLegacyLeads = [
                {
                    ID: 1,
                    CampaignID: 123,
                    Email: 'test1@example.com',
                    Phone: '1234567890',
                    FirstName: 'John',
                    LastName: 'Doe',
                    BusinessName: 'Test Business 1',
                    CreatedDate: new Date(),
                },
            ];

            mockLegacyDb.connect.mockResolvedValue(undefined);
            mockLegacyDb.disconnect.mockResolvedValue(undefined);
            mockLegacyDb.query.mockResolvedValue(mockLegacyLeads);

            mockPrismaLead.findUnique.mockResolvedValue(null);
            mockPrismaLead.create.mockRejectedValue(new Error('Database constraint violation'));

            const result = await leadPoller.pollAndImportLeads();

            expect(result.totalProcessed).toBe(1);
            expect(result.newLeads).toBe(0);
            expect(result.duplicatesSkipped).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Failed to import lead 1');
        });
    });

    describe('data transformation', () => {
        it('should properly transform legacy lead data', async () => {
            const mockLegacyLead = {
                ID: 1,
                CampaignID: 123,
                Email: '  test@example.com  ',
                Phone: '(123) 456-7890',
                FirstName: '  John  ',
                LastName: '  Doe  ',
                BusinessName: '  Test Business  ',
                CreatedDate: new Date(),
            };

            mockLegacyDb.connect.mockResolvedValue(undefined);
            mockLegacyDb.disconnect.mockResolvedValue(undefined);
            mockLegacyDb.query.mockResolvedValue([mockLegacyLead]);

            mockPrismaLead.findUnique.mockResolvedValue(null);
            mockPrismaLead.create.mockResolvedValue({} as any);

            await leadPoller.pollAndImportLeads();

            expect(mockPrismaLead.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    legacyLeadId: BigInt(1),
                    campaignId: 123,
                    email: 'test@example.com',
                    phone: '1234567890',
                    firstName: 'John',
                    lastName: 'Doe',
                    businessName: 'Test Business',
                    status: LeadStatus.PENDING, // Updated to PENDING since token is generated
                    intakeToken: expect.any(String), // Now generates a token
                    intakeCompletedAt: null,
                    step1CompletedAt: null,
                    step2CompletedAt: null,
                    importedAt: expect.any(Date),
                }),
            });
        });

        it('should handle null and empty values', async () => {
            const mockLegacyLead = {
                ID: 1,
                CampaignID: 123,
                Email: null,
                Phone: '',
                FirstName: '   ',
                LastName: undefined,
                BusinessName: null,
                CreatedDate: new Date(),
            };

            mockLegacyDb.connect.mockResolvedValue(undefined);
            mockLegacyDb.disconnect.mockResolvedValue(undefined);
            mockLegacyDb.query.mockResolvedValue([mockLegacyLead]);

            mockPrismaLead.findUnique.mockResolvedValue(null);
            mockPrismaLead.create.mockResolvedValue({} as any);

            await leadPoller.pollAndImportLeads();

            expect(mockPrismaLead.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    email: null,
                    phone: null,
                    firstName: null,
                    lastName: null,
                    businessName: null,
                }),
            });
        });

        it('should handle invalid phone numbers', async () => {
            const mockLegacyLead = {
                ID: 1,
                CampaignID: 123,
                Email: 'test@example.com',
                Phone: '123', // Too short
                FirstName: 'John',
                LastName: 'Doe',
                BusinessName: 'Test Business',
                CreatedDate: new Date(),
            };

            mockLegacyDb.connect.mockResolvedValue(undefined);
            mockLegacyDb.disconnect.mockResolvedValue(undefined);
            mockLegacyDb.query.mockResolvedValue([mockLegacyLead]);

            mockPrismaLead.findUnique.mockResolvedValue(null);
            mockPrismaLead.create.mockResolvedValue({} as any);

            await leadPoller.pollAndImportLeads();

            expect(mockPrismaLead.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    phone: null,
                }),
            });
        });
    });

    describe('getLeadsNeedingIntakeTokens', () => {
        it('should fetch leads that need intake tokens', async () => {
            const mockLeads = [
                { id: 1, intakeToken: null, status: LeadStatus.NEW },
                { id: 2, intakeToken: null, status: LeadStatus.NEW },
            ];

            mockPrismaLead.findMany.mockResolvedValue(mockLeads as any);

            const result = await leadPoller.getLeadsNeedingIntakeTokens();

            expect(result).toEqual(mockLeads);
            expect(mockPrismaLead.findMany).toHaveBeenCalledWith({
                where: {
                    intakeToken: null,
                    status: LeadStatus.NEW,
                },
                orderBy: {
                    importedAt: 'desc',
                },
            });
        });
    });

    describe('updateLeadWithIntakeToken', () => {
        it('should update lead with intake token and set status to pending', async () => {
            mockPrismaLead.update.mockResolvedValue({} as any);

            await leadPoller.updateLeadWithIntakeToken(1, 'test-token-123');

            expect(mockPrismaLead.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    intakeToken: 'test-token-123',
                    status: LeadStatus.PENDING,
                },
            });
        });
    });
});

describe('createLeadPoller', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should create LeadPoller with environment configuration', () => {
        process.env.MERCHANT_FUNDING_CAMPAIGN_IDS = '123,456,789';
        process.env.LEAD_POLLING_BATCH_SIZE = '50';

        const { createLeadPoller, LeadPoller: ImportedLeadPoller } = require('../LeadPoller');
        const poller = createLeadPoller();

        expect(poller).toBeInstanceOf(ImportedLeadPoller);
    });

    it('should throw error if campaign IDs are not configured', () => {
        // Store original value
        const originalValue = process.env.MERCHANT_FUNDING_CAMPAIGN_IDS;
        
        try {
            // Set to empty string to simulate missing env var
            process.env.MERCHANT_FUNDING_CAMPAIGN_IDS = '';
            
            // Clear module cache to ensure fresh import
            jest.resetModules();
            
            // Import fresh module
            const { createLeadPoller } = require('../LeadPoller');

            expect(() => createLeadPoller()).toThrow('MERCHANT_FUNDING_CAMPAIGN_IDS environment variable is required');
        } finally {
            // Restore original value
            if (originalValue) {
                process.env.MERCHANT_FUNDING_CAMPAIGN_IDS = originalValue;
            }
            // Reset modules again to restore normal state
            jest.resetModules();
        }
    });
});