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

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY_SID!,
    process.env.TWILIO_API_KEY_SECRET!,
    { identity }
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

  response.dial(
    {
      callerId: process.env.TWILIO_PHONE_NUMBER,
    },
    phoneNumber
  );

  return response.toString();
}
