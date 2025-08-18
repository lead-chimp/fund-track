import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/services/TokenService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate the token and get intake session data
    const intakeSession = await TokenService.validateToken(token);

    if (!intakeSession) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    // Return the intake session data
    return NextResponse.json({
      success: true,
      data: intakeSession,
    });
  } catch (error) {
    console.error("Error retrieving intake session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
