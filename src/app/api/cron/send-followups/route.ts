import { NextRequest, NextResponse } from 'next/server';
import { followUpScheduler } from '@/services/FollowUpScheduler';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/send-followups
 * Process the follow-up queue and send due notifications
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.backgroundJob('Starting follow-up processing job', 'follow-ups');

    // Process the follow-up queue
    const result = await followUpScheduler.processFollowUpQueue();

    const processingTime = Date.now() - startTime;

    if (result.success) {
      logger.backgroundJob('Follow-up processing completed successfully', 'follow-ups', {
        processingTime: `${processingTime}ms`,
        processed: result.processed,
        sent: result.sent,
        cancelled: result.cancelled,
        errors: result.errors.length
      });

      return NextResponse.json({
        success: true,
        message: 'Follow-up processing completed',
        data: {
          processed: result.processed,
          sent: result.sent,
          cancelled: result.cancelled,
          processingTime: `${processingTime}ms`,
          errors: result.errors
        }
      }, { status: 200 });
    } else {
      logger.error('Follow-up processing completed with errors', {
        processingTime: `${processingTime}ms`,
        processed: result.processed,
        sent: result.sent,
        cancelled: result.cancelled,
        errors: result.errors
      });

      return NextResponse.json({
        success: false,
        message: 'Follow-up processing completed with errors',
        data: {
          processed: result.processed,
          sent: result.sent,
          cancelled: result.cancelled,
          processingTime: `${processingTime}ms`,
          errors: result.errors
        }
      }, { status: 207 }); // 207 Multi-Status for partial success
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Follow-up processing job failed', {
      error: errorMessage,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: false,
      message: 'Follow-up processing failed',
      error: errorMessage,
      processingTime: `${processingTime}ms`
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/send-followups
 * Get follow-up queue statistics
 */
export async function GET() {
  try {
    const stats = await followUpScheduler.getFollowUpStats();

    return NextResponse.json({
      success: true,
      data: stats
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get follow-up stats', { error: errorMessage });

    return NextResponse.json({
      success: false,
      message: 'Failed to get follow-up statistics',
      error: errorMessage
    }, { status: 500 });
  }
}