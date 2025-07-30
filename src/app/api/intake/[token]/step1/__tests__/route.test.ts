import { NextRequest } from 'next/server';
import { POST } from '../route';
import { TokenService } from '@/services/TokenService';

// Mock dependencies
jest.mock('@/services/TokenService');
jest.mock('@/lib/prisma', () => ({
    prisma: {
        lead: {
            update: jest.fn(),
        },
    },
}));

import { prisma } from '@/lib/prisma';

const mockTokenService = TokenService as jest.Mocked<typeof TokenService>;
const mockLeadUpdate = prisma.lead.update as jest.MockedFunction<typeof prisma.lead.update>;

describe('/api/intake/[token]/step1', () => {
    const mockIntakeSession = {
        leadId: 1,
        token: 'test-token',
        isValid: true,
        isCompleted: false,
        step1Completed: false,
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

    const validStep1Data = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        businessName: 'Test Business LLC',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockLeadUpdate.mockClear();
    });

    describe('POST', () => {
        it('should successfully process valid step 1 data', async () => {
            mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
            mockLeadUpdate.mockResolvedValue({} as any);

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(validStep1Data),
                headers: { 'Content-Type': 'application/json' },
            });

            const response = await POST(request, { params: { token: 'test-token' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Step 1 completed successfully');
            expect(data.data.step1Completed).toBe(true);
            expect(data.data.nextStep).toBe(2);

            expect(mockLeadUpdate).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    phone: '5551234567',
                    businessName: 'Test Business LLC',
                    step1CompletedAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                },
            });
        });

        it('should return 400 when token is missing', async () => {
            const request = new NextRequest('http://localhost/api/intake//step1', {
                method: 'POST',
                body: JSON.stringify(validStep1Data),
            });

            const response = await POST(request, { params: { token: '' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Token is required');
        });

        it('should return 404 when token is invalid', async () => {
            mockTokenService.validateToken.mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/intake/invalid-token/step1', {
                method: 'POST',
                body: JSON.stringify(validStep1Data),
            });

            const response = await POST(request, { params: { token: 'invalid-token' } });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('Invalid or expired token');
        });

        it('should return 400 when intake is already completed', async () => {
            const completedSession = { ...mockIntakeSession, isCompleted: true };
            mockTokenService.validateToken.mockResolvedValue(completedSession);

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(validStep1Data),
            });

            const response = await POST(request, { params: { token: 'test-token' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Intake process has already been completed');
        });

        it('should return 400 when required fields are missing', async () => {
            mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

            const incompleteData = {
                firstName: 'John',
                // lastName missing
                email: 'john@example.com',
                phone: '555-123-4567',
                // businessName missing
            };

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(incompleteData),
            });

            const response = await POST(request, { params: { token: 'test-token' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing required fields');
            expect(data.missingFields).toEqual(['lastName', 'businessName']);
        });

        it('should return 400 when email format is invalid', async () => {
            mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

            const invalidEmailData = {
                ...validStep1Data,
                email: 'invalid-email',
            };

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(invalidEmailData),
            });

            const response = await POST(request, { params: { token: 'test-token' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid email format');
        });

        it('should return 400 when phone format is invalid', async () => {
            mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

            const invalidPhoneData = {
                ...validStep1Data,
                phone: 'invalid-phone',
            };

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(invalidPhoneData),
            });

            const response = await POST(request, { params: { token: 'test-token' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid phone number format');
        });

        it('should handle phone number formatting correctly', async () => {
            mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
            mockLeadUpdate.mockResolvedValue({} as any);

            const formattedPhoneData = {
                ...validStep1Data,
                phone: '+1 (555) 123-4567',
            };

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(formattedPhoneData),
            });

            const response = await POST(request, { params: { token: 'test-token' } });

            expect(response.status).toBe(200);
            expect(mockLeadUpdate).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    phone: '15551234567', // Cleaned phone number
                }),
            });
        });

        it('should handle database errors gracefully', async () => {
            mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
            mockLeadUpdate.mockRejectedValue(new Error('Database error'));

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(validStep1Data),
            });

            const response = await POST(request, { params: { token: 'test-token' } });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });

        it('should trim whitespace from input fields', async () => {
            mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
            mockLeadUpdate.mockResolvedValue({} as any);

            const dataWithWhitespace = {
                firstName: '  John  ',
                lastName: '  Doe  ',
                email: '  john.doe@example.com  ',
                phone: '  555-123-4567  ',
                businessName: '  Test Business LLC  ',
            };

            const request = new NextRequest('http://localhost/api/intake/test-token/step1', {
                method: 'POST',
                body: JSON.stringify(dataWithWhitespace),
                headers: { 'Content-Type': 'application/json' },
            });

            const response = await POST(request, { params: { token: 'test-token' } });

            if (response.status !== 200) {
                const errorData = await response.json();
                console.log('Error response:', errorData);
            }

            expect(response.status).toBe(200);
            expect(mockLeadUpdate).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    phone: '5551234567',
                    businessName: 'Test Business LLC',
                }),
            });
        });
    });
});