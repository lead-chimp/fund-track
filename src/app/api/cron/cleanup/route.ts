import { NextRequest, NextResponse } from 'next/server';
import { notificationCleanupService } from '@/services/NotificationCleanupService';
import { followUpScheduler } from '@/services/FollowUpScheduler';
import { logger } from '@/lib/logger';
import { validateCronRequest, createUnauthorizedResponse } from '@/lib/cron-auth';

/**
 * POST /api/cron/cleanup
 * Run cleanup tasks (old notifications, follow-ups, etc.)
 */
export async function POST(request: NextRequest) {
    // Validate cron request authentication
    if (!validateCronRequest(request)) {
        logger.warn("Unauthorized cron request to cleanup endpoint");
        return createUnauthorizedResponse();
    }

    const startTime = Date.now();

    try {
        logger.backgroundJob('Starting cleanup job', 'cleanup');

        // Clean up old notifications (keep 30 days)
        const notificationCleanup = await notificationCleanupService.cleanupOldNotifications(30);

        // Clean up old follow-ups (keep 30 days)
        const followUpCleanup = await followUpScheduler.cleanupOldFollowUps(30);

        const processingTime = Date.now() - startTime;

        logger.backgroundJob('Cleanup job completed', 'cleanup', {
            processingTime: `${processingTime}ms`,
            notificationsDeleted: notificationCleanup.deletedCount,
            followUpsDeleted: followUpCleanup
        });

        return NextResponse.json({
            success: true,
            message: 'Cleanup completed successfully',
            data: {
                notificationsDeleted: notificationCleanup.deletedCount,
                followUpsDeleted: followUpCleanup,
                processingTime: `${processingTime}ms`
            }
        }, { status: 200 });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('Cleanup job failed', {
            error: errorMessage,
            processingTime: `${processingTime}ms`
        });

        return NextResponse.json({
            success: false,
            message: 'Cleanup failed',
            error: errorMessage,
            processingTime: `${processingTime}ms`
        }, { status: 500 });
    }
}

/**
 * GET /api/cron/cleanup
 * Get cleanup statistics
 */
export async function GET() {
    try {
        // Return information about what would be cleaned up
        return NextResponse.json({
            success: true,
            message: 'Cleanup endpoint is available',
            info: {
                notificationRetentionDays: 30,
                followUpRetentionDays: 30
            }
        }, { status: 200 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('Failed to get cleanup info', { error: errorMessage });

        return NextResponse.json({
            success: false,
            message: 'Failed to get cleanup information',
            error: errorMessage
        }, { status: 500 });
    }
}
