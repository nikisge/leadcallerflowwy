import { NextRequest, NextResponse } from "next/server";
import { generateAccessToken } from "@/lib/twilio";

// GET /api/twilio/token - Generate Twilio access token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identity = searchParams.get("identity") || "default-user";

    // Check if Twilio credentials are configured
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_API_KEY_SID ||
      !process.env.TWILIO_API_KEY_SECRET ||
      process.env.TWILIO_ACCOUNT_SID === "your_account_sid"
    ) {
      return NextResponse.json(
        {
          error: "Twilio not configured",
          message: "Please configure your Twilio credentials in .env",
        },
        { status: 503 }
      );
    }

    const token = generateAccessToken(identity);

    return NextResponse.json({ token, identity });
  } catch (error) {
    console.error("Error generating Twilio token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
