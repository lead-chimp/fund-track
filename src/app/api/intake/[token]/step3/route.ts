import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/services/TokenService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface Step3Data {
  digitalSignature: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Validate the intake token
    const intakeSession = await TokenService.validateToken(token);
    if (!intakeSession) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if step 1 and step 2 are completed
    if (!intakeSession.step1Completed) {
      return NextResponse.json(
        { error: 'Step 1 must be completed before digital signature' },
        { status: 400 }
      );
    }

    if (!intakeSession.step2Completed) {
      return NextResponse.json(
        { error: 'Step 2 must be completed before digital signature' },
        { status: 400 }
      );
    }

    // Check if step 3 is already completed
    if (intakeSession.step3Completed) {
      return NextResponse.json(
        { error: 'Step 3 has already been completed' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body: Step3Data = await request.json();

    // Validate required fields
    if (!body.digitalSignature) {
      return NextResponse.json(
        { error: 'Digital signature is required' },
        { status: 400 }
      );
    }

    // Validate signature format (should be a base64 data URL)
    if (!body.digitalSignature.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 400 }
      );
    }

    // Update the lead with signature data
    await prisma.lead.update({
      where: { id: intakeSession.leadId },
      data: {
        digitalSignature: body.digitalSignature,
        signatureDate: new Date(),
        step3CompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Mark step 3 as completed (this will also mark the entire intake as completed)
    const success = await TokenService.markStep3Completed(intakeSession.leadId);

    if (!success) {
      logger.error('Failed to mark step 3 as completed', {
        leadId: intakeSession.leadId,
        token,
      });
      return NextResponse.json(
        { error: 'Failed to complete step 3' },
        { status: 500 }
      );
    }

    logger.info('Step 3 completed successfully', {
      leadId: intakeSession.leadId,
      token,
    });

    return NextResponse.json({
      success: true,
      message: 'Digital signature completed successfully',
      data: {
        step3Completed: true,
        intakeCompleted: true,
        nextStep: 'completed',
      },
    });
  } catch (error) {
    logger.error('Error in step 3 API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}