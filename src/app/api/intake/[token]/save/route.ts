import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/services/TokenService";
import { prisma } from "@/lib/prisma";

interface SaveProgressData {
  step: number;
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    businessName?: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate the token
    const intakeSession = await TokenService.validateToken(token);

    if (!intakeSession) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    // Check if intake is already completed
    if (intakeSession.isCompleted) {
      return NextResponse.json(
        { error: "Intake process has already been completed" },
        { status: 400 }
      );
    }

    // Parse request body
    const body: SaveProgressData = await request.json();

    if (!body.step || !body.data) {
      return NextResponse.json(
        { error: "Step and data are required" },
        { status: 400 }
      );
    }

    // Only handle step 1 for now (step 2 will be implemented in the next task)
    if (body.step === 1) {
      // Validate required fields for step 1
      const requiredFields: (keyof typeof body.data)[] = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "businessName",
      ];
      const missingFields = requiredFields.filter(
        (field) => !body.data[field]?.trim()
      );

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "Missing required fields for saving progress",
            missingFields,
          },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (body.data.email && !emailRegex.test(body.data.email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Validate phone format
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = body.data.phone?.replace(/[\s\-\(\)]/g, "") || "";
      if (body.data.phone && !phoneRegex.test(cleanPhone)) {
        return NextResponse.json(
          { error: "Invalid phone number format" },
          { status: 400 }
        );
      }

      // Update lead with step 1 data (but don't mark as completed)
      await prisma.lead.update({
        where: { id: intakeSession.leadId },
        data: {
          firstName: body.data.firstName?.trim(),
          lastName: body.data.lastName?.trim(),
          email: body.data.email?.trim().toLowerCase(),
          phone: cleanPhone.replace(/^\+/, ""),
          businessName: body.data.businessName?.trim(),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Progress saved successfully",
        data: {
          step: body.step,
          saved: true,
        },
      });
    }

    return NextResponse.json({ error: "Invalid step number" }, { status: 400 });
  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
