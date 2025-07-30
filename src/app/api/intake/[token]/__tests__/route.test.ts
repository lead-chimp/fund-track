import { GET } from '../route';
import { TokenService } from '@/services/TokenService';
import { NextRequest } from 'next/server';

// Mock TokenService
jest.mock('@/services/TokenService');
const mockTokenService = TokenService as jest.Mocked<typeof TokenService>;

describe('/api/intake/[token] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 for missing token', async () => {
    const request = new NextRequest('http://localhost:3000/api/intake/');
    const params = { token: '' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Token is required');
  });

  it('should return 404 for invalid token', async () => {
    mockTokenService.validateToken.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/intake/invalid-token');
    const params = { token: 'invalid-token' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Invalid or expired token');
    expect(mockTokenService.validateToken).toHaveBeenCalledWith('invalid-token');
  });

  it('should return intake session data for valid token', async () => {
    const mockIntakeSession = {
      leadId: 1,
      token: 'valid-token',
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
        status: 'PENDING',
      },
    };

    mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

    const request = new NextRequest('http://localhost:3000/api/intake/valid-token');
    const params = { token: 'valid-token' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockIntakeSession);
    expect(mockTokenService.validateToken).toHaveBeenCalledWith('valid-token');
  });

  it('should return 500 for internal server error', async () => {
    mockTokenService.validateToken.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/intake/error-token');
    const params = { token: 'error-token' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});