import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FileUploadService } from "@/services/FileUploadService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; documentId: string }> }
) {
  try {
    const { token, documentId } = await params;
    const docId = parseInt(documentId);

    if (isNaN(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    // Validate the share link
    const shareLink = await prisma.leadShareLink.findUnique({
      where: {
        token: token,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        lead: {
          include: {
            documents: {
              where: {
                id: docId
              }
            }
          }
        }
      }
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Invalid or expired share link" }, { status: 404 });
    }

    const document = shareLink.lead.documents[0];
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Download the file from Backblaze B2
    const fileUploadService = new FileUploadService();
    const fileBuffer = await fileUploadService.downloadFile(document.filename);

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.originalFilename}"`,
        'Content-Length': document.fileSize.toString(),
      },
    });

  } catch (error) {
    console.error("Error downloading shared document:", error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}