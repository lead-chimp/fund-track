import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/services/TokenService";
import { prisma } from "@/lib/prisma";

interface Step1Data {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
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

    // Parse and validate request body
    const body: Step1Data = await request.json();

    // Trim all string fields first
    const trimmedData = {
      firstName: body.firstName?.trim() || "",
      lastName: body.lastName?.trim() || "",
      email: body.email?.trim() || "",
      phone: body.phone?.trim() || "",
      businessName: body.businessName?.trim() || "",
    };

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "businessName",
    ];
    const missingFields = requiredFields.filter(
      (field) => !trimmedData[field as keyof typeof trimmedData]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields,
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedData.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = trimmedData.phone.replace(/[\s\-\(\)]/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Update lead with step 1 data
    await prisma.lead.update({
      where: { id: intakeSession.leadId },
      data: {
        firstName: trimmedData.firstName,
        lastName: trimmedData.lastName,
        email: trimmedData.email.toLowerCase(),
        phone: cleanPhone.replace(/^\+/, ""),
        businessName: trimmedData.businessName,
        step1CompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Step 1 completed successfully",
      data: {
        step1Completed: true,
        nextStep: 2,
      },
    });
  } catch (error) {
    console.error("Error processing step 1:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
