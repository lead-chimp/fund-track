import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fileUploadService } from '@/services/FileUploadService';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
    documentId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = parseInt(params.id);
    const documentId = parseInt(params.documentId);

    if (isNaN(leadId) || isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID or document ID' },
        { status: 400 }
      );
    }

    // Find the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        leadId: leadId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Generate download URL
    const downloadResult = await fileUploadService.getDownloadUrl(
      document.b2FileId,
      document.filename,
      1 // 1 hour expiration
    );

    // Redirect to the download URL
    return NextResponse.redirect(downloadResult.downloadUrl);
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}