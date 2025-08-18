import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fileUploadService } from "@/services/FileUploadService";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, documentId } = await params;
    const leadId = parseInt(id);
    const docId = parseInt(documentId);

    if (isNaN(leadId) || isNaN(docId)) {
      return NextResponse.json(
        { error: "Invalid lead ID or document ID" },
        { status: 400 }
      );
    }

    // Find the document
    const document = await prisma.document.findFirst({
      where: {
        id: docId,
        leadId: leadId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Generate download URL
    try {
      const downloadResult = await fileUploadService.getDownloadUrl(
        document.b2FileId,
        document.filename,
        1 // 1 hour expiration
      );

      // Redirect to the download URL
      return NextResponse.redirect(downloadResult.downloadUrl);
    } catch (downloadError) {
      console.error("❌ DOWNLOAD: Failed to generate download URL", {
        documentId: docId,
        filename: document.filename,
        error:
          downloadError instanceof Error
            ? downloadError.message
            : "Unknown error",
        stack: downloadError instanceof Error ? downloadError.stack : undefined,
      });
      throw downloadError;
    }
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
