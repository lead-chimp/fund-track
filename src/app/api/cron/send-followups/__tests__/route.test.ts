import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { followUpScheduler } from '@/services/FollowUpScheduler';

// Mock dependencies
jest.mock('@/services/FollowUpScheduler', () => ({
  followUpScheduler: {
    processFollowUpQueue: jest.fn(),
    getFollowUpStats: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    backgroundJob: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFollowUpScheduler = followUpScheduler as jest.Mocked<typeof followUpScheduler>;

describe('/api/cron/send-followups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should process follow-up queue successfully', async () => {
      const mockResult = {
        success: true,
        processed: 5,
        sent: 4,
        cancelled: 1,
        errors: [],
      };

      mockFollowUpScheduler.processFollowUpQueue.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/cron/send-followups', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Follow-up processing completed');
      expect(data.data.processed).toBe(5);
      expect(data.data.sent).toBe(4);
      expect(data.data.cancelled).toBe(1);
      expect(data.data.errors).toEqual([]);
      expect(data.data.processingTime).toMatch(/^\d+ms$/);
    });

    it('should handle partial success with errors', async () => {
      const mockResult = {
        success: false,
        processed: 3,
        sent: 1,
        cancelled: 1,
        errors: ['Failed to send notification to lead 123'],
      };

      mockFollowUpScheduler.processFollowUpQueue.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/cron/send-followups', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status for partial success
      expect(data.success).toBe(false);
      expect(data.message).toBe('Follow-up processing completed with errors');
      expect(data.data.processed).toBe(3);
      expect(data.data.sent).toBe(1);
      expect(data.data.cancelled).toBe(1);
      expect(data.data.errors).toEqual(['Failed to send notification to lead 123']);
    });

    it('should handle processing failure', async () => {
      const error = new Error('Database connection failed');
      mockFollowUpScheduler.processFollowUpQueue.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/cron/send-followups', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Follow-up processing failed');
      expect(data.error).toBe('Database connection failed');
      expect(data.processingTime).toMatch(/^\d+ms$/);
    });

    it('should handle unknown error', async () => {
      mockFollowUpScheduler.processFollowUpQueue.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/cron/send-followups', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Follow-up processing failed');
      expect(data.error).toBe('Unknown error');
    });
  });

  describe('GET', () => {
    it('should return follow-up statistics', async () => {
      const mockStats = {
        totalPending: 15,
        dueSoon: 3,
        breakdown: {
          'THREE_HOUR_PENDING': 5,
          'THREE_HOUR_SENT': 10,
          'NINE_HOUR_PENDING': 3,
          'NINE_HOUR_SENT': 8,
        },
      };

      mockFollowUpScheduler.getFollowUpStats.mockResolvedValue(mockStats);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
    });

    it('should handle stats retrieval failure', async () => {
      const error = new Error('Database error');
      mockFollowUpScheduler.getFollowUpStats.mockRejectedValue(error);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to get follow-up statistics');
      expect(data.error).toBe('Database error');
    });

    it('should handle unknown error in stats retrieval', async () => {
      mockFollowUpScheduler.getFollowUpStats.mockRejectedValue('Unknown error');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to get follow-up statistics');
      expect(data.error).toBe('Unknown error');
    });
  });
});