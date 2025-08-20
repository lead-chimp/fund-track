import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || "25"))
    );

    // Cursor-based pagination: client may provide the last-seen `id` as
    // the `cursor` param. We fetch limit+1 rows to determine `hasMore`.
    const cursor = url.searchParams.get("cursor");
    const cursorId = cursor ? Number(cursor) : undefined;

    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const recipient = url.searchParams.get("recipient");
    const search = url.searchParams.get("search");

    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (recipient)
      where.recipient = { contains: recipient, mode: "insensitive" };
    if (search) {
      where.OR = [
        { recipient: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { externalId: { contains: search, mode: "insensitive" } },
        { errorMessage: { contains: search, mode: "insensitive" } },
      ];
    }

    // Use a stable ordering for cursor pagination (createdAt desc, id desc).
    const rows = await prisma.notificationLog.findMany({
      where,
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const logs = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? logs[logs.length - 1].id : null;

    return NextResponse.json({ logs, hasMore, nextCursor, limit });
  } catch (error) {
    console.error("Failed to fetch notification logs", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
