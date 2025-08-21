import { NextRequest, NextResponse } from 'next/server';
import { createTestLeadPoller } from '@/services/LeadPoller';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        if (!action || !['poll', 'status'].includes(action)) {
            return NextResponse.json(
                { error: 'Action must be "poll" or "status"' },
                { status: 400 }
            );
        }

        const testPoller = createTestLeadPoller();

        let result;

        switch (action) {
            case 'poll':
                console.log('🧪 Starting test lead polling...');
                result = await testPoller.pollAndImportLeads();
                break;
            case 'status':
                result = {
                    message: 'Test poller status',
                    campaignIds: [11302],
                    batchSize: 10,
                };
                break;
        }

        return NextResponse.json({
            success: true,
            action,
            result,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Test lead polling error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const testPoller = createTestLeadPoller();

        return NextResponse.json({
            message: 'Test Lead Polling API',
            campaignIds: [11302],
            batchSize: 10,
            availableActions: ['poll', 'status'],
            usage: {
                poll: 'POST with {"action": "poll"} to trigger test polling',
                status: 'POST with {"action": "status"} to get poller status'
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Get test lead polling info error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}