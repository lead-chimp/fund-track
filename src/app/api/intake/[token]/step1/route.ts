import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/services/TokenService";
import { prisma } from "@/lib/prisma";

interface Step1Data {
  // Business Details Section
  businessName: string;           // Legal Business Name*
  dba: string;                   // DBA - optional
  businessAddress: string;        // Business Address*
  businessPhone: string;          // Business Phone*
  businessEmail: string;          // Company Email*
  mobile: string;                // Mobile*
  businessCity: string;          // City*
  businessState: string;         // State*
  businessZip: string;           // Zip*
  ownershipPercentage: string;   // Percentage of Ownership*
  taxId: string;                 // Tax ID*
  stateOfInc: string;           // State of Inc*
  dateBusinessStarted: string;   // Date Business Started*
  legalEntity: string;          // Legal Entity*
  natureOfBusiness: string;     // Nature of Business*
  hasExistingLoans: string;     // Do You Have Any Loans Now*
  industry: string;             // Enter Your Industry or Product Type*
  monthlyRevenue: string;       // Monthly Gross Revenue*
  amountNeeded: string;         // Amount Requested*
  
  // Personal Details Section
  firstName: string;            // First Name*
  lastName: string;             // Last Name*
  dateOfBirth: string;          // Date of Birth*
  socialSecurity: string;       // Social Security*
  personalAddress: string;      // Address*
  personalCity: string;         // City*
  personalState: string;        // State*
  personalZip: string;          // Zip Code*
  
  // Legal Information Section
  legalName: string;            // Your legal name*
  email: string;                // Email Address*
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
      // Business Details Section
      businessName: body.businessName?.trim() || "",
      dba: body.dba?.trim() || "",
      businessAddress: body.businessAddress?.trim() || "",
      businessPhone: body.businessPhone?.trim() || "",
      businessEmail: body.businessEmail?.trim() || "",
      mobile: body.mobile?.trim() || "",
      businessCity: body.businessCity?.trim() || "",
      businessState: body.businessState?.trim() || "",
      businessZip: body.businessZip?.trim() || "",
      ownershipPercentage: body.ownershipPercentage?.trim() || "",
      taxId: body.taxId?.trim() || "",
      stateOfInc: body.stateOfInc?.trim() || "",
      dateBusinessStarted: body.dateBusinessStarted?.trim() || "",
      legalEntity: body.legalEntity?.trim() || "",
      natureOfBusiness: body.natureOfBusiness?.trim() || "",
      hasExistingLoans: body.hasExistingLoans?.trim() || "",
      industry: body.industry?.trim() || "",
      monthlyRevenue: body.monthlyRevenue?.trim() || "",
      amountNeeded: body.amountNeeded?.trim() || "",
      
      // Personal Details Section
      firstName: body.firstName?.trim() || "",
      lastName: body.lastName?.trim() || "",
      dateOfBirth: body.dateOfBirth?.trim() || "",
      socialSecurity: body.socialSecurity?.trim() || "",
      personalAddress: body.personalAddress?.trim() || "",
      personalCity: body.personalCity?.trim() || "",
      personalState: body.personalState?.trim() || "",
      personalZip: body.personalZip?.trim() || "",
      
      // Legal Information Section
      legalName: body.legalName?.trim() || "",
      email: body.email?.trim() || "",
    };

    // Validate required fields (all fields marked with * in specification)
    const requiredFields = [
      // Business Details Section
      "businessName",
      "businessAddress", 
      "businessPhone",
      "businessEmail",
      "mobile",
      "businessCity",
      "businessState",
      "businessZip",
      "ownershipPercentage",
      "taxId",
      "stateOfInc",
      "dateBusinessStarted",
      "legalEntity",
      "natureOfBusiness",
      "hasExistingLoans",
      "industry",
      "monthlyRevenue",
      "amountNeeded",
      
      // Personal Details Section
      "firstName",
      "lastName",
      "dateOfBirth",
      "socialSecurity",
      "personalAddress",
      "personalCity",
      "personalState",
      "personalZip",
      
      // Legal Information Section
      "legalName",
      "email",
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

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedData.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    if (!emailRegex.test(trimmedData.businessEmail)) {
      return NextResponse.json(
        { error: "Invalid business email format" },
        { status: 400 }
      );
    }

    // Validate phone formats (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanBusinessPhone = trimmedData.businessPhone.replace(/[\s\-\(\)]/g, "");
    if (!phoneRegex.test(cleanBusinessPhone)) {
      return NextResponse.json(
        { error: "Invalid business phone number format" },
        { status: 400 }
      );
    }
    const cleanMobile = trimmedData.mobile.replace(/[\s\-\(\)]/g, "");
    if (!phoneRegex.test(cleanMobile)) {
      return NextResponse.json(
        { error: "Invalid mobile number format" },
        { status: 400 }
      );
    }

    // Validate numeric fields (these are now dropdown selections, so we validate they're not empty)
    const amountNeeded = parseInt(trimmedData.amountNeeded);
    if (isNaN(amountNeeded) || amountNeeded <= 0) {
      return NextResponse.json(
        { error: "Invalid amount requested" },
        { status: 400 }
      );
    }

    const monthlyRevenue = parseInt(trimmedData.monthlyRevenue);
    if (isNaN(monthlyRevenue) || monthlyRevenue < 0) {
      return NextResponse.json(
        { error: "Invalid monthly gross revenue" },
        { status: 400 }
      );
    }

    // Validate ownership percentage
    const ownershipPercentage = parseFloat(trimmedData.ownershipPercentage);
    if (isNaN(ownershipPercentage) || ownershipPercentage < 0 || ownershipPercentage > 100) {
      return NextResponse.json(
        { error: "Invalid ownership percentage (must be between 0-100)" },
        { status: 400 }
      );
    }

    // Update lead with step 1 data
    await prisma.lead.update({
      where: { id: intakeSession.leadId },
      data: {
        // Business Details Section
        businessName: trimmedData.businessName,
        dba: trimmedData.dba || null,
        businessAddress: trimmedData.businessAddress,
        businessPhone: cleanBusinessPhone.replace(/^\+/, ""),
        businessEmail: trimmedData.businessEmail.toLowerCase(),
        mobile: cleanMobile.replace(/^\+/, ""),
        businessCity: trimmedData.businessCity,
        businessState: trimmedData.businessState,
        businessZip: trimmedData.businessZip,
        ownershipPercentage: trimmedData.ownershipPercentage,
        taxId: trimmedData.taxId,
        stateOfInc: trimmedData.stateOfInc,
        dateBusinessStarted: trimmedData.dateBusinessStarted,
        legalEntity: trimmedData.legalEntity,
        natureOfBusiness: trimmedData.natureOfBusiness,
        hasExistingLoans: trimmedData.hasExistingLoans,
        industry: trimmedData.industry,
        monthlyRevenue: monthlyRevenue,
        amountNeeded: amountNeeded,
        
        // Personal Details Section
        firstName: trimmedData.firstName,
        lastName: trimmedData.lastName,
        dateOfBirth: trimmedData.dateOfBirth,
        socialSecurity: trimmedData.socialSecurity,
        personalAddress: trimmedData.personalAddress,
        personalCity: trimmedData.personalCity,
        personalState: trimmedData.personalState,
        personalZip: trimmedData.personalZip,
        
        // Legal Information Section
        legalName: trimmedData.legalName,
        email: trimmedData.email.toLowerCase(),
        
        // System fields
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
