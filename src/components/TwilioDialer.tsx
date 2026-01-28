"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

interface TwilioDialerProps {
  phoneNumber: string;
  onCallStart?: () => void;
  onCallEnd?: () => void;
}

// Type definitions for @twilio/voice-sdk v2.x
// See: https://www.twilio.com/docs/voice/sdks/javascript/twiliodevice
interface TwilioCall {
  disconnect: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  status: () => string;
}

interface TwilioDevice {
  connect: (options: { params: Record<string, string> }) => Promise<TwilioCall>;
  disconnectAll: () => void;
  destroy: () => void;
  register: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  state: string;
}

interface TwilioDeviceOptions {
  codecPreferences?: string[];
  edge?: string | string[];
  logLevel?: number;
}

type TwilioDeviceConstructor = new (token: string, options?: TwilioDeviceOptions) => TwilioDevice;

declare global {
  interface Window {
    Twilio?: {
      Device: TwilioDeviceConstructor;
    };
  }
}

export function TwilioDialer({ phoneNumber, onCallStart, onCallEnd }: TwilioDialerProps) {
  const [device, setDevice] = useState<TwilioDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const activeCall = useRef<TwilioCall | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Load Twilio SDK from jsDelivr CDN
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already loaded
    if (window.Twilio?.Device) {
      console.log("Twilio SDK already loaded");
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@twilio/voice-sdk@2.10.2/dist/twilio.min.js";
    script.async = true;

    script.onload = () => {
      console.log("Twilio SDK loaded successfully");
      // Give it a moment to initialize
      setTimeout(() => {
        if (window.Twilio?.Device) {
          setSdkLoaded(true);
        } else {
          console.error("Twilio SDK loaded but Device not available");
          setSdkError("SDK geladen aber Device nicht verfügbar");
        }
      }, 100);
    };

    script.onerror = (e) => {
      console.error("Failed to load Twilio SDK:", e);
      setSdkError("SDK konnte nicht geladen werden");
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup - it might still be needed
    };
  }, []);

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    if (!sdkLoaded || !window.Twilio?.Device) {
      console.log("SDK not ready yet, sdkLoaded:", sdkLoaded);
      return;
    }

    try {
      console.log("Fetching Twilio token...");
      const response = await fetch("/api/twilio/token");

      if (!response.ok) {
        const data = await response.json();
        if (data.error === "Twilio not configured") {
          console.log("Twilio not configured, skipping initialization");
          return;
        }
        throw new Error(data.error || "Token fetch failed");
      }

      const { token } = await response.json();
      console.log("Token received, initializing device...");

      // Create new device with v2 SDK options
      const newDevice = new window.Twilio.Device(token, {
        codecPreferences: ["opus", "pcmu"],
        edge: "dublin",
        logLevel: 1, // Enable debug logging
      });

      // Device events for v2 SDK
      newDevice.on("registered", () => {
        console.log("Twilio Device registered and ready");
      });

      newDevice.on("unregistered", () => {
        console.log("Twilio Device unregistered");
      });

      newDevice.on("error", (error: unknown) => {
        console.error("Twilio Device error:", error);
        toast({
          title: "Twilio Fehler",
          description: String(error),
          variant: "destructive",
        });
      });

      newDevice.on("tokenWillExpire", () => {
        console.log("Token will expire soon, should refresh");
        // Could implement token refresh here
      });

      // Register the device
      await newDevice.register();
      console.log("Device registered successfully");
      setDevice(newDevice);

    } catch (error) {
      console.error("Error initializing Twilio device:", error);
      setSdkError(String(error));
    }
  }, [sdkLoaded, toast]);

  useEffect(() => {
    initializeDevice();

    return () => {
      if (device) {
        console.log("Cleaning up Twilio device");
        device.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initializeDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCall = async () => {
    if (!device) {
      toast({
        title: "Twilio nicht bereit",
        description: "Bitte warte kurz oder lade die Seite neu",
        variant: "destructive",
      });
      return;
    }

    // Clean the phone number - remove all whitespace, tabs, etc.
    const cleanedNumber = phoneNumber.replace(/\s+/g, "").trim();

    if (!cleanedNumber || !cleanedNumber.startsWith("+")) {
      toast({
        title: "Ungültige Telefonnummer",
        description: "Nummer muss mit + beginnen (z.B. +49...)",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    console.log("Starting call to:", cleanedNumber);

    try {
      // IMPORTANT: device.connect() returns a Promise in v2 SDK!
      const call = await device.connect({
        params: { To: cleanedNumber },
      });

      console.log("Call object created, status:", call.status());
      activeCall.current = call;

      // Set up call event handlers
      call.on("accept", () => {
        console.log("Call accepted");
        setIsConnecting(false);
        setIsCallActive(true);
        setCallDuration(0);
        onCallStart?.();

        // Start duration timer
        timerRef.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      });

      call.on("ringing", () => {
        console.log("Call is ringing");
      });

      call.on("disconnect", () => {
        console.log("Call disconnected");
        handleCallEnd();
      });

      call.on("cancel", () => {
        console.log("Call cancelled");
        handleCallEnd();
      });

      call.on("reject", () => {
        console.log("Call rejected");
        handleCallEnd();
        toast({
          title: "Anruf abgelehnt",
          variant: "destructive",
        });
      });

      call.on("error", (error: unknown) => {
        console.error("Call error:", error);
        handleCallEnd();
        toast({
          title: "Anruf fehlgeschlagen",
          description: String(error),
          variant: "destructive",
        });
      });

    } catch (error) {
      console.error("Error starting call:", error);
      setIsConnecting(false);
      toast({
        title: "Anruf konnte nicht gestartet werden",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleCallEnd = () => {
    setIsCallActive(false);
    setIsConnecting(false);
    activeCall.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onCallEnd?.();
  };

  const endCall = () => {
    console.log("Ending call manually");
    if (activeCall.current) {
      activeCall.current.disconnect();
    } else if (device) {
      device.disconnectAll();
    }
    handleCallEnd();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Show error state
  if (sdkError) {
    return (
      <Button className="w-full h-14 text-lg" size="lg" disabled>
        <Phone className="h-5 w-5 mr-2" />
        Telefonie nicht verfügbar
      </Button>
    );
  }

  // Show loading state while SDK loads
  if (!sdkLoaded || !device) {
    return (
      <Button className="w-full h-14 text-lg" size="lg" disabled>
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Lade Telefonie...
      </Button>
    );
  }

  // Show active call UI
  if (isCallActive) {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex-1">
          <p className="font-medium text-green-900">Anruf aktiv</p>
          <p className="text-2xl font-mono text-green-700">{formatDuration(callDuration)}</p>
        </div>
        <Button
          size="lg"
          variant="destructive"
          onClick={endCall}
          className="h-12 px-6"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          Auflegen
        </Button>
      </div>
    );
  }

  // Default state - ready to call
  return (
    <Button
      className="w-full h-14 text-lg"
      size="lg"
      onClick={startCall}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Verbinde...
        </>
      ) : (
        <>
          <Phone className="h-5 w-5 mr-2" />
          {phoneNumber} anrufen
        </>
      )}
    </Button>
  );
}
