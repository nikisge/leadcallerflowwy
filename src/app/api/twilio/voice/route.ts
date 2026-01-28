import { NextRequest, NextResponse } from "next/server";
import { generateOutgoingTwiML } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// POST /api/twilio/voice - Handle outgoing voice calls (TwiML webhook)
export async function POST(request: NextRequest) {
  console.log("=== Twilio Voice Webhook Called ===");

  try {
    const contentType = request.headers.get("content-type") || "";
    console.log("Content-Type:", contentType);

    let to: string | null = null;

    // Handle both form data and URL-encoded data
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      to = formData.get("To") as string;

      // Log all form data for debugging
      console.log("Form data received:");
      formData.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      // Try to parse as JSON as fallback
      try {
        const body = await request.json();
        to = body.To;
        console.log("JSON body received:", body);
      } catch {
        console.log("Could not parse body as JSON");
      }
    }

    console.log("Target phone number (To):", to);

    if (!to) {
      console.error("No phone number provided in request");
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE">Keine Telefonnummer angegeben.</Say>
</Response>`;
      return new NextResponse(errorTwiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    // Check if caller ID is configured
    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.error("TWILIO_PHONE_NUMBER not configured");
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE">Twilio ist nicht korrekt konfiguriert.</Say>
</Response>`;
      return new NextResponse(errorTwiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    console.log("Generating TwiML for call to:", to);
    console.log("Using caller ID:", process.env.TWILIO_PHONE_NUMBER);

    const twiml = generateOutgoingTwiML(to);
    console.log("Generated TwiML:", twiml);

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });

  } catch (error) {
    console.error("Error in voice webhook:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE">Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.</Say>
</Response>`;
    return new NextResponse(errorTwiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

// Also handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    status: "Voice webhook endpoint",
    method: "POST",
    description: "This endpoint receives TwiML requests from Twilio",
    configured: {
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ? "Set" : "NOT SET",
    },
  });
}
