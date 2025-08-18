import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Character limit validation (5000 characters max)
    if (content.trim().length > 5000) {
      return NextResponse.json(
        { error: "Note content cannot exceed 5000 characters" },
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

    // Create the note
    const note = await prisma.leadNote.create({
      data: {
        leadId,
        userId: parseInt(session.user.id),
        content: content.trim(),
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

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
