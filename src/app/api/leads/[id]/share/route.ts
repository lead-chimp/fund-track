import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Verify lead exists and user has access
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, firstName: true, lastName: true, businessName: true }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Deactivate any existing active share links for this lead
    await prisma.leadShareLink.updateMany({
      where: {
        leadId: leadId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Create new share link
    const shareLink = await prisma.leadShareLink.create({
      data: {
        leadId: leadId,
        token: token,
        createdBy: parseInt(session.user.id),
        expiresAt: expiresAt,
        isActive: true
      }
    });

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || '';
    const shareUrl = `${baseUrl}/share/${token}`;

    return NextResponse.json({
      success: true,
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        url: shareUrl,
        expiresAt: shareLink.expiresAt,
        createdAt: shareLink.createdAt
      }
    });

  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Get active share links for this lead
    const shareLinks = await prisma.leadShareLink.findMany({
      where: {
        leadId: leadId,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || '';
    const shareLinksWithUrls = shareLinks.map(link => ({
      id: link.id,
      token: link.token,
      url: `${baseUrl}/share/${link.token}`,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      accessCount: link.accessCount,
      accessedAt: link.accessedAt,
      createdBy: link.user.email
    }));

    return NextResponse.json({
      success: true,
      shareLinks: shareLinksWithUrls
    });

  } catch (error) {
    console.error("Error fetching share links:", error);
    return NextResponse.json(
      { error: "Failed to fetch share links" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (isNaN(leadId) || !linkId) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Deactivate the specific share link
    const updatedLink = await prisma.leadShareLink.updateMany({
      where: {
        id: parseInt(linkId),
        leadId: leadId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    if (updatedLink.count === 0) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Share link deactivated"
    });

  } catch (error) {
    console.error("Error deactivating share link:", error);
    return NextResponse.json(
      { error: "Failed to deactivate share link" },
      { status: 500 }
    );
  }
}