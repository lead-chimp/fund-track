import { NextResponse } from 'next/server';
import { backgroundJobScheduler } from '@/services/BackgroundJobScheduler';

// Allow access in development without authentication
function isDevEnvironment() {
    return process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_ENDPOINTS === 'true';
}

export async function GET() {
    try {
        const status = backgroundJobScheduler.getStatus();

        return NextResponse.json({
            success: true,
            action: 'scheduler-status',
            result: {
                scheduler: status,
                environment: {
                    nodeEnv: process.env.NODE_ENV,
                    backgroundJobsEnabled: process.env.ENABLE_BACKGROUND_JOBS,
                    leadPollingPattern: process.env.LEAD_POLLING_CRON_PATTERN,
                    campaignIds: process.env.MERCHANT_FUNDING_CAMPAIGN_IDS,
                },
                timestamp: new Date().toISOString(),
            }
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to get scheduler status',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'start') {
            // Manually start the scheduler
            backgroundJobScheduler.start();
            return NextResponse.json({
                success: true,
                message: 'Background job scheduler started manually',
                timestamp: new Date().toISOString(),
            });
        } else if (action === 'stop') {
            // Manually stop the scheduler
            backgroundJobScheduler.stop();
            return NextResponse.json({
                success: true,
                message: 'Background job scheduler stopped manually',
                timestamp: new Date().toISOString(),
            });
        } else if (action === 'poll') {
            // Manually trigger lead polling
            await backgroundJobScheduler.executeLeadPollingManually();
            return NextResponse.json({
                success: true,
                message: 'Lead polling executed manually',
                timestamp: new Date().toISOString(),
            });
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use "start", "stop", or "poll"' },
                { status: 400 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to execute scheduler action',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}