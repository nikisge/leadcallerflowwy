import twilio from "twilio";

// Twilio Client (for server-side operations) - lazy initialization
let _twilioClient: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!_twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    _twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return _twilioClient;
}

// Generate access token for browser-based calling
export function generateAccessToken(identity: string): string {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  // Use IE1 region if TwiML App is in Ireland, otherwise default
  const region = process.env.TWILIO_REGION || "ie1";

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY_SID!,
    process.env.TWILIO_API_KEY_SECRET!,
    {
      identity,
      region,
    }
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: false,
  });

  token.addGrant(voiceGrant);

  return token.toJwt();
}

// Generate TwiML for outgoing call
export function generateOutgoingTwiML(phoneNumber: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  // Clean the phone number - remove all whitespace, tabs, newlines
  const cleanedNumber = phoneNumber.replace(/\s+/g, "").trim();

  console.log("Generating TwiML for cleaned number:", cleanedNumber);

  response.dial(
    {
      callerId: process.env.TWILIO_PHONE_NUMBER,
    },
    cleanedNumber
  );

  return response.toString();
}
