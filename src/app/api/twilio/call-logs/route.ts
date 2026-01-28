import { NextResponse } from "next/server";
import { getTwilioClient } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// GET /api/twilio/call-logs - Get recent call logs from Twilio
export async function GET() {
  try {
    const client = getTwilioClient();

    if (!client) {
      return NextResponse.json({
        error: "Twilio client not configured",
        config: {
          TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "SET" : "NOT SET",
          TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "SET" : "NOT SET",
          TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "NOT SET",
          TWILIO_TWIML_APP_SID: process.env.TWILIO_TWIML_APP_SID || "NOT SET",
        },
      }, { status: 500 });
    }

    // Get the last 10 calls
    const calls = await client.calls.list({ limit: 10 });

    const callData = calls.map((call) => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      direction: call.direction,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      errorCode: call.errorCode,
      errorMessage: call.errorMessage,
      price: call.price,
      priceUnit: call.priceUnit,
    }));

    return NextResponse.json({
      calls: callData,
      config: {
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
        TWILIO_TWIML_APP_SID: process.env.TWILIO_TWIML_APP_SID ? `${process.env.TWILIO_TWIML_APP_SID.substring(0, 10)}...` : "NOT SET",
      },
    });

  } catch (error) {
    console.error("Error fetching call logs:", error);
    return NextResponse.json({
      error: String(error),
    }, { status: 500 });
  }
}
