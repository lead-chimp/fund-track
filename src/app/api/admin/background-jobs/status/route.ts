import { NextResponse } from 'next/server';
import { backgroundJobScheduler } from '@/services/BackgroundJobScheduler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get scheduler status
    const status = backgroundJobScheduler.getStatus();
    
    // Add environment info
    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV,
      enableBackgroundJobs: process.env.ENABLE_BACKGROUND_JOBS,
      leadPollingPattern: process.env.LEAD_POLLING_CRON_PATTERN || '*/15 * * * *',
      followUpPattern: process.env.FOLLOWUP_CRON_PATTERN || '*/5 * * * *',
      campaignIds: process.env.MERCHANT_FUNDING_CAMPAIGN_IDS,
      batchSize: process.env.LEAD_POLLING_BATCH_SIZE || '100',
      timezone: process.env.TZ || 'America/New_York'
    };
    
    return NextResponse.json({
      success: true,
      scheduler: status,
      environment: environmentInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get background job status:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}