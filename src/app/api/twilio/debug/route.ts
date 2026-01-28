import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/twilio/debug - Debug Twilio configuration
export async function GET() {
  const config = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 6)}...` : "NOT SET",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "SET (hidden)" : "NOT SET",
    TWILIO_API_KEY_SID: process.env.TWILIO_API_KEY_SID ? `${process.env.TWILIO_API_KEY_SID.substring(0, 6)}...` : "NOT SET",
    TWILIO_API_KEY_SECRET: process.env.TWILIO_API_KEY_SECRET ? "SET (hidden)" : "NOT SET",
    TWILIO_TWIML_APP_SID: process.env.TWILIO_TWIML_APP_SID ? `${process.env.TWILIO_TWIML_APP_SID.substring(0, 6)}...` : "NOT SET",
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "NOT SET",
  };

  // Try to generate a token
  let tokenTest = "NOT TESTED";
  try {
    const twilio = await import("twilio");
    const AccessToken = twilio.default.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY_SID!,
      process.env.TWILIO_API_KEY_SECRET!,
      { identity: "debug-test" }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: false,
    });

    token.addGrant(voiceGrant);
    const jwt = token.toJwt();

    tokenTest = jwt ? `SUCCESS (length: ${jwt.length})` : "FAILED - empty token";
  } catch (error) {
    tokenTest = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  return NextResponse.json({
    config,
    tokenTest,
    timestamp: new Date().toISOString(),
  });
}
