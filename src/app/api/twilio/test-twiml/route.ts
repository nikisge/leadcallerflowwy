import { NextRequest, NextResponse } from "next/server";
import { generateOutgoingTwiML } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// GET /api/twilio/test-twiml?to=+49123456789 - Test TwiML generation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") || "+49123456789";

  const config = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : "NOT SET",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "SET" : "NOT SET",
    TWILIO_API_KEY_SID: process.env.TWILIO_API_KEY_SID ? `${process.env.TWILIO_API_KEY_SID.substring(0, 8)}...` : "NOT SET",
    TWILIO_API_KEY_SECRET: process.env.TWILIO_API_KEY_SECRET ? "SET" : "NOT SET",
    TWILIO_TWIML_APP_SID: process.env.TWILIO_TWIML_APP_SID ? `${process.env.TWILIO_TWIML_APP_SID.substring(0, 8)}...` : "NOT SET",
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "NOT SET",
    TWILIO_REGION: process.env.TWILIO_REGION || "NOT SET (default: ie1)",
  };

  try {
    const twiml = generateOutgoingTwiML(to);

    return NextResponse.json({
      success: true,
      testNumber: to,
      generatedTwiML: twiml,
      config,
      instructions: {
        step1: "Überprüfe ob TWILIO_PHONE_NUMBER korrekt ist (muss eine verifizierte Twilio-Nummer sein)",
        step2: "Prüfe in der Twilio Console unter Monitor > Logs > Calls die Fehlerdetails",
        step3: "Stelle sicher dass die TwiML App Voice URL auf https://deine-app.vercel.app/api/twilio/voice zeigt",
        step4: "Prüfe ob dein Twilio Account für internationale Anrufe nach Deutschland freigeschaltet ist",
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      config,
    }, { status: 500 });
  }
}
