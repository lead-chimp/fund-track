import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";
import { fileUploadService } from "@/services/FileUploadService";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let session: any = null;
  let leadId: number | null = null;

  try {
    // Check authentication
    session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    leadId = parseInt(id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only PDF, JPG, PNG, and DOCX files are allowed.",
        },
        { status: 400 }
      );
    }

    // 10MB limit
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file to Backblaze B2
    const uploadResult = await fileUploadService.uploadFile(
      buffer,
      file.name,
      file.type,
      leadId
    );

    // Save document metadata to database
    const document = await prisma.document.create({
      data: {
        leadId,
        filename: uploadResult.fileName,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        b2FileId: uploadResult.fileId,
        b2BucketName: uploadResult.bucketName,
        uploadedBy: parseInt(session.user.id),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Log the file upload for audit purposes
    logger.info("Staff file uploaded", {
      leadId,
      documentId: document.id,
      filename: document.originalFilename,
      fileSize: document.fileSize,
      uploadedBy: session.user.id,
      userEmail: session.user.email,
    });

    return NextResponse.json({ document });
  } catch (error) {
    logger.error("Error uploading file", {
      leadId,
      error: error instanceof Error ? error.message : "Unknown error",
      userEmail: session?.user?.email,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  let session: any = null;
  let leadId: number | null = null;

  try {
    // Check authentication
    session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    leadId = parseInt(id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Get document ID from query parameters
    const { searchParams } = new URL(request.url);
    const documentIdParam = searchParams.get("documentId");

    if (!documentIdParam) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const documentId = parseInt(documentIdParam);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
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
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete file from Backblaze B2
    try {
      logger.info("Attempting to delete file from B2", {
        documentId,
        leadId,
        b2FileId: document.b2FileId,
        filename: document.filename,
      });

      await fileUploadService.deleteFile(document.b2FileId, document.filename);

      logger.info("Successfully deleted file from B2", {
        documentId,
        leadId,
        b2FileId: document.b2FileId,
        filename: document.filename,
      });
    } catch (error) {
      logger.error("Failed to delete file from B2", {
        documentId,
        leadId,
        b2FileId: document.b2FileId,
        filename: document.filename,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Continue with database deletion even if B2 deletion fails
    }

    // Delete document record from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Log the file deletion for audit purposes
    logger.info("Staff file deleted", {
      leadId,
      documentId,
      filename: document.originalFilename,
      fileSize: document.fileSize,
      deletedBy: session.user.id,
      userEmail: session.user.email,
      originalUploadedBy: document.uploadedBy,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting file", {
      leadId,
      error: error instanceof Error ? error.message : "Unknown error",
      userEmail: session?.user?.email,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
