import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/services/TokenService";
import { fileUploadService } from "@/services/FileUploadService";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // Validate token
    const intakeSession = await TokenService.validateToken(token);
    if (!intakeSession) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Check if step 1 is completed
    if (!intakeSession.step1Completed) {
      return NextResponse.json(
        { error: "Step 1 must be completed before uploading documents" },
        { status: 400 }
      );
    }

    // Check if step 2 is already completed
    if (intakeSession.step2Completed) {
      return NextResponse.json(
        { error: "Step 2 has already been completed" },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll("documents") as File[];

    // Validate exactly 3 documents
    if (files.length !== 3) {
      return NextResponse.json(
        { error: "Exactly 3 documents are required" },
        { status: 400 }
      );
    }

    // Validate each file
    const uploadedDocuments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file || file.size === 0) {
        return NextResponse.json(
          { error: `Document ${i + 1} is empty or invalid` },
          { status: 400 }
        );
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        // Upload to Backblaze B2
        const uploadResult = await fileUploadService.uploadFile(
          buffer,
          file.name,
          file.type,
          intakeSession.leadId
        );

        // Store document metadata in database
        const document = await prisma.document.create({
          data: {
            leadId: intakeSession.leadId,
            filename: uploadResult.fileName,
            originalFilename: file.name,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.contentType,
            b2FileId: uploadResult.fileId,
            b2BucketName: uploadResult.bucketName,
            uploadedBy: null, // Uploaded by prospect, not staff
          },
        });

        uploadedDocuments.push({
          id: document.id,
          originalFilename: document.originalFilename,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          uploadedAt: document.uploadedAt,
        });

        logger.info("Document uploaded successfully", {
          leadId: intakeSession.leadId,
          documentId: document.id,
          filename: file.name,
          fileSize: file.size,
        });
      } catch (error) {
        logger.error("Failed to upload document", {
          leadId: intakeSession.leadId,
          filename: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        return NextResponse.json(
          { error: `Failed to upload document: ${file.name}` },
          { status: 500 }
        );
      }
    }

    // Mark step 2 as completed
    const success = await TokenService.markStep2Completed(intakeSession.leadId);
    if (!success) {
      logger.error("Failed to mark step 2 as completed", {
        leadId: intakeSession.leadId,
      });
      return NextResponse.json(
        { error: "Failed to complete step 2" },
        { status: 500 }
      );
    }

    logger.info("Step 2 completed successfully", {
      leadId: intakeSession.leadId,
      documentsUploaded: uploadedDocuments.length,
    });

    return NextResponse.json({
      success: true,
      message: "Documents uploaded successfully",
      documents: uploadedDocuments,
    });
  } catch (error) {
    logger.error("Step 2 API error", {
      token,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
