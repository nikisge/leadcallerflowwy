import { NextRequest, NextResponse } from "next/server";
import { generateOutgoingTwiML } from "@/lib/twilio";

// POST /api/twilio/voice - Handle outgoing voice calls (TwiML webhook)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get("To") as string;

    if (!to) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>No phone number provided</Say>
        </Response>`,
        {
          headers: { "Content-Type": "application/xml" },
        }
      );
    }

    const twiml = generateOutgoingTwiML(to);

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("Error handling voice webhook:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred</Say>
      </Response>`,
      {
        headers: { "Content-Type": "application/xml" },
      }
    );
  }
}
