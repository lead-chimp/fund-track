import { NextResponse } from 'next/server';
import { backgroundJobScheduler } from '@/services/BackgroundJobScheduler';

export async function GET() {
    try {
        const status = backgroundJobScheduler.getStatus();

        return NextResponse.json({
            scheduler: status,
            environment: {
                nodeEnv: process.env.NODE_ENV,
                backgroundJobsEnabled: process.env.ENABLE_BACKGROUND_JOBS,
                leadPollingPattern: process.env.LEAD_POLLING_CRON_PATTERN,
                campaignIds: process.env.MERCHANT_FUNDING_CAMPAIGN_IDS,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to get scheduler status',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST() {
    try {
        // Manually trigger lead polling for testing
        await backgroundJobScheduler.executeLeadPollingManually();

        return NextResponse.json({
            success: true,
            message: 'Lead polling executed manually',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to execute manual polling',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}