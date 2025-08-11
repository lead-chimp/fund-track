import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { systemSettingsService } from '@/services/SystemSettingsService';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const setting = await systemSettingsService.getSettingRaw(params.key);
    
    if (!setting) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Error fetching system setting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system setting' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    console.log(`[Settings API] PUT request for key: ${params.key}`);
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      console.log('[Settings API] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    console.log(`[Settings API] Authenticated user: ${session.user.email} (ID: ${session.user.id})`);

    const body = await request.json();
    const { value } = body;

    console.log(`[Settings API] Updating ${params.key} to: ${value}`);

    if (value === undefined) {
      console.log('[Settings API] Missing value in request');
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id ? parseInt(session.user.id) : undefined;

    const updatedSetting = await systemSettingsService.updateSetting(
      params.key,
      value,
      userId && !isNaN(userId) ? userId : undefined
    );

    console.log(`[Settings API] Successfully updated: ${updatedSetting.key} = ${updatedSetting.value}`);

    return NextResponse.json({ 
      message: 'Setting updated successfully',
      setting: updatedSetting 
    });
  } catch (error) {
    console.error('[Settings API] Error updating system setting:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update setting' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'reset') {
      const userId = session.user.id ? parseInt(session.user.id) : undefined;

      const resetSetting = await systemSettingsService.resetSetting(
        params.key,
        userId && !isNaN(userId) ? userId : undefined
      );

      return NextResponse.json({ 
        message: 'Setting reset to default successfully',
        setting: resetSetting 
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error performing setting action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    );
  }
}