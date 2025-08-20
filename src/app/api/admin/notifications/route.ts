import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

    // If a search query is present, use Postgres full-text search via raw SQL
    // to leverage the GIN index for performance.
    if (search) {
      // If cursor provided, fetch the created_at for the cursor id to build
      // a stable comparison for pagination.
      let cursorCreatedAt: Date | null = null;
      if (cursorId) {
        const cursorRow = await prisma.notificationLog.findUnique({
          where: { id: cursorId },
          select: { createdAt: true },
        });
        cursorCreatedAt = cursorRow ? cursorRow.createdAt : null;
      }

      // Build the conditional SQL fragment for the cursor if available.
      const cursorCondition = cursorCreatedAt
        ? Prisma.sql`AND ((nl.created_at < ${cursorCreatedAt}) OR (nl.created_at = ${cursorCreatedAt} AND nl.id < ${cursorId}))`
        : Prisma.empty;

      const rows = await prisma.$queryRaw(
        Prisma.sql`
        SELECT nl.id as id,
               nl.lead_id as "leadId",
               nl.type as type,
               nl.recipient as recipient,
               nl.subject as subject,
               nl.content as content,
               nl.status as status,
               nl.external_id as "externalId",
               nl.error_message as "errorMessage",
               nl.sent_at as "sentAt",
               nl.created_at as "createdAt",
               json_build_object('id', l.id, 'firstName', l.first_name, 'lastName', l.last_name, 'email', l.email, 'phone', l.phone) as lead
        FROM notification_log nl
        LEFT JOIN leads l ON nl.lead_id = l.id
        WHERE to_tsvector('english', coalesce(nl.recipient,'') || ' ' || coalesce(nl.subject,'') || ' ' || coalesce(nl.content,'') || ' ' || coalesce(nl.external_id,'') || ' ' || coalesce(nl.error_message,''))
              @@ plainto_tsquery('english', ${search})
        ${cursorCondition}
        ORDER BY nl.created_at DESC, nl.id DESC
        LIMIT ${limit + 1}
      `
      );

      const rowsArr = rows as any[];
      const hasMore = rowsArr.length > limit;
      const logs = hasMore ? rowsArr.slice(0, limit) : rowsArr;
      const nextCursor = hasMore ? String(logs[logs.length - 1].id) : null;

      return NextResponse.json({ logs, hasMore, nextCursor, limit });
    }

    // No search: use Prisma ORM path (fast with index on createdAt,id)
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
    const nextCursor = hasMore ? String(logs[logs.length - 1].id) : null;

    return NextResponse.json({ logs, hasMore, nextCursor, limit });
  } catch (error) {
    console.error("Failed to fetch notification logs", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
