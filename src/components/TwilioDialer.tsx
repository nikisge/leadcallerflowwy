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

type TwilioDevice = {
  connect: (params: { params: { To: string } }) => TwilioCall;
  disconnectAll: () => void;
  destroy: () => void;
  register: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type TwilioCall = {
  disconnect: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type TwilioDeviceConstructor = new (token: string, options?: { codecPreferences: string[] }) => TwilioDevice;

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
  const activeCall = useRef<TwilioCall | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Load Twilio SDK
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Twilio) {
      const script = document.createElement("script");
      script.src = "https://sdk.twilio.com/js/client/v2.1/twilio.min.js";
      script.async = true;
      script.onload = () => {
        setSdkLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Twilio SDK");
      };
      document.body.appendChild(script);
    } else if (window.Twilio) {
      setSdkLoaded(true);
    }
  }, []);

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    if (!sdkLoaded || !window.Twilio) return;

    try {
      const response = await fetch("/api/twilio/token");
      if (!response.ok) {
        const data = await response.json();
        if (data.error === "Twilio not configured") {
          return; // Silently fail if not configured
        }
        throw new Error(data.error);
      }

      const { token } = await response.json();

      const newDevice = new window.Twilio.Device(token, {
        codecPreferences: ["opus", "pcmu"],
        edge: "dublin", // Ireland region
      });

      newDevice.on("ready", () => {
        console.log("Twilio Device Ready");
      });

      newDevice.on("error", (error: unknown) => {
        console.error("Twilio Device Error:", error);
        toast({
          title: "Verbindungsfehler",
          description: "Twilio-Verbindung fehlgeschlagen",
          variant: "destructive",
        });
      });

      newDevice.on("disconnect", () => {
        setIsCallActive(false);
        activeCall.current = null;
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        onCallEnd?.();
      });

      await newDevice.register();
      setDevice(newDevice);
    } catch (error) {
      console.error("Error initializing Twilio:", error);
    }
  }, [sdkLoaded, toast, onCallEnd]);

  useEffect(() => {
    initializeDevice();

    return () => {
      if (device) {
        device.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initializeDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCall = async () => {
    if (!device) {
      // Fallback to tel: link
      window.location.href = `tel:${phoneNumber}`;
      onCallStart?.();
      return;
    }

    setIsConnecting(true);

    try {
      const call = device.connect({
        params: { To: phoneNumber },
      });

      call.on("accept", () => {
        setIsConnecting(false);
        setIsCallActive(true);
        setCallDuration(0);
        activeCall.current = call;
        onCallStart?.();

        // Start duration timer
        timerRef.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      });

      call.on("disconnect", () => {
        setIsCallActive(false);
        setIsConnecting(false);
        activeCall.current = null;
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        onCallEnd?.();
      });

      call.on("error", (error: unknown) => {
        console.error("Call error:", error);
        setIsConnecting(false);
        setIsCallActive(false);
        toast({
          title: "Anruf fehlgeschlagen",
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error("Error starting call:", error);
      setIsConnecting(false);
      toast({
        title: "Anruf konnte nicht gestartet werden",
        variant: "destructive",
      });
    }
  };

  const endCall = () => {
    if (activeCall.current) {
      activeCall.current.disconnect();
    } else if (device) {
      device.disconnectAll();
    }
    setIsCallActive(false);
    setIsConnecting(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onCallEnd?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
