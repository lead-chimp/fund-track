import { NextResponse } from 'next/server';
import { backgroundJobScheduler } from '@/services/BackgroundJobScheduler';
import { auth } from "@/lib/auth";


export async function POST() {
  try {
    // Check if user is authenticated and is admin
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    console.log('🔄 Manual lead polling triggered by admin:', session.user.email);
    
    // Execute lead polling manually
    await backgroundJobScheduler.executeLeadPollingManually();
    
    return NextResponse.json({
      success: true,
      message: 'Lead polling executed successfully',
      timestamp: new Date().toISOString(),
      triggeredBy: session.user.email
    });
    
  } catch (error) {
    console.error('❌ Failed to execute manual lead polling:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to execute lead polling'
    }, { status: 500 });
  }
}