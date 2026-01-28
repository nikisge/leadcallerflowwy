"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  PhoneOff,
  SkipForward,
  ThumbsDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Globe,
  Mail,
  Building2,
  MapPin,
  User,
  Clock,
  AlertCircle,
} from "lucide-react";
import { LEAD_STATUSES, PRODUKTE, type Lead, type CallResult } from "@/lib/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TwilioDialer } from "./TwilioDialer";

export function CallQueue() {
  const [queue, setQueue] = useState<Lead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notiz, setNotiz] = useState("");
  const [, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [twilioConfigured, setTwilioConfigured] = useState<boolean | null>(null);

  const { toast } = useToast();

  const currentLead = queue[currentIndex];

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("callQueue");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQueue(parsed);
      } catch {
        console.error("Error parsing call queue");
      }
    }

    // Check Twilio configuration
    checkTwilioConfig();
  }, []);

  const checkTwilioConfig = async () => {
    try {
      const response = await fetch("/api/twilio/token");
      if (response.ok) {
        setTwilioConfigured(true);
      } else {
        const data = await response.json();
        if (data.error === "Twilio not configured") {
          setTwilioConfigured(false);
        }
      }
    } catch {
      setTwilioConfigured(false);
    }
  };

  const saveQueueToStorage = (newQueue: Lead[]) => {
    localStorage.setItem("callQueue", JSON.stringify(newQueue));
    setQueue(newQueue);
  };

  const removeFromQueue = (leadId: string) => {
    const newQueue = queue.filter((l) => l.id !== leadId);
    saveQueueToStorage(newQueue);
    if (currentIndex >= newQueue.length && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const clearQueue = () => {
    localStorage.removeItem("callQueue");
    setQueue([]);
    setCurrentIndex(0);
  };

  const goToNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setNotiz("");
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setNotiz("");
    }
  };

  const logCall = async (ergebnis: CallResult, status?: string, produkt?: string) => {
    if (!currentLead) return;

    const duration = callStartTime
      ? Math.round((new Date().getTime() - callStartTime.getTime()) / 1000)
      : null;

    try {
      // Log the call
      await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: currentLead.id,
          ergebnis,
          dauer: duration,
          notiz: notiz || null,
        }),
      });

      // Update lead status if provided
      if (status || produkt) {
        await fetch(`/api/leads/${currentLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            produkt,
            notizen: notiz || currentLead.notizen,
          }),
        });
      }

      toast({ title: "Anruf gespeichert" });

      // Move to next
      setNotiz("");
      setCallStartTime(null);
      goToNext();
    } catch {
      toast({
        title: "Fehler",
        description: "Anruf konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const handleQuickAction = (action: "nicht_erreicht" | "kein_interesse" | "interessiert" | "gebucht") => {
    switch (action) {
      case "nicht_erreicht":
        logCall("nicht_erreicht");
        break;
      case "kein_interesse":
        logCall("erreicht", "kein_interesse");
        break;
      case "interessiert":
        logCall("erreicht", "interessiert");
        break;
      case "gebucht":
        // Ask for product when booking
        break;
    }
  };

  const handleBooking = (produkt: string) => {
    logCall("erreicht", "gebucht", produkt);
  };

  const handleCallStart = () => {
    setIsCallActive(true);
    setCallStartTime(new Date());
  };

  const handleCallEnd = () => {
    setIsCallActive(false);
  };

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Keine Leads in der Warteschlange</h3>
          <p className="text-muted-foreground mb-4">
            Wählen Sie Leads in der Lead-Tabelle aus und fügen Sie sie zur Anruf-Liste hinzu.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Zur Lead-Tabelle
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Call Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Twilio Warning */}
        {twilioConfigured === false && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Twilio nicht konfiguriert</p>
                  <p className="text-sm text-yellow-700">
                    Browser-Anrufe sind nicht verfügbar. Bitte konfigurieren Sie Ihre Twilio-Credentials in der .env Datei.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Lead Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {currentIndex + 1} / {queue.length}
              </Badge>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  disabled={currentIndex >= queue.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFromQueue(currentLead.id)}
            >
              <X className="h-4 w-4 mr-1" />
              Entfernen
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Lead Info */}
            <div>
              <h2 className="text-2xl font-bold">{currentLead.firmenname}</h2>
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <User className="h-4 w-4" />
                {currentLead.anrede && `${currentLead.anrede} `}
                {currentLead.ansprechpartner}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${currentLead.telefon}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {currentLead.telefon}
                </a>
              </div>
              {currentLead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${currentLead.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {currentLead.email}
                  </a>
                </div>
              )}
              {currentLead.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={currentLead.website.startsWith("http") ? currentLead.website : `https://${currentLead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {currentLead.website}
                  </a>
                </div>
              )}
              {currentLead.branche && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {currentLead.branche}
                </div>
              )}
              {currentLead.ort && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {currentLead.ort}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {currentLead.anrufVersuche} Anrufversuche
                {currentLead.letzterAnruf && (
                  <span className="text-sm text-muted-foreground">
                    (zuletzt: {format(new Date(currentLead.letzterAnruf), "dd.MM.yyyy", { locale: de })})
                  </span>
                )}
              </div>
            </div>

            {/* Status & Product */}
            <div className="flex items-center gap-4">
              <Badge className={LEAD_STATUSES.find(s => s.value === currentLead.status)?.color}>
                {LEAD_STATUSES.find(s => s.value === currentLead.status)?.label}
              </Badge>
              {currentLead.produkt && (
                <Badge variant="outline">
                  {PRODUKTE.find(p => p.value === currentLead.produkt)?.label}
                </Badge>
              )}
            </div>

            {/* Previous Notes */}
            {currentLead.notizen && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Bisherige Notizen:</p>
                <p className="text-sm">{currentLead.notizen}</p>
              </div>
            )}

            {/* Dialer */}
            {twilioConfigured && (
              <TwilioDialer
                phoneNumber={currentLead.telefon}
                onCallStart={handleCallStart}
                onCallEnd={handleCallEnd}
              />
            )}

            {/* Fallback for manual dialing */}
            {!twilioConfigured && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  window.location.href = `tel:${currentLead.telefon}`;
                  handleCallStart();
                }}
              >
                <Phone className="h-5 w-5 mr-2" />
                {currentLead.telefon} anrufen
              </Button>
            )}

            {/* Notes Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Notiz zum Anruf</label>
              <Textarea
                placeholder="Notizen zum Gespräch..."
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                rows={3}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12"
                onClick={() => handleQuickAction("nicht_erreicht")}
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                Nicht erreicht
              </Button>
              <Button
                variant="outline"
                className="h-12 text-red-600 hover:text-red-700"
                onClick={() => handleQuickAction("kein_interesse")}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Kein Interesse
              </Button>
              <Button
                variant="outline"
                className="h-12 text-green-600 hover:text-green-700"
                onClick={() => handleQuickAction("interessiert")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Interessiert
              </Button>
              <Select onValueChange={handleBooking}>
                <SelectTrigger className="h-12 bg-green-600 text-white hover:bg-green-700">
                  <SelectValue placeholder="Termin gebucht" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUKTE.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Skip Button */}
            <Button
              variant="ghost"
              className="w-full"
              onClick={goToNext}
              disabled={currentIndex >= queue.length - 1}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Überspringen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Queue Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">Warteschlange</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearQueue}>
              Leeren
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {queue.map((lead, idx) => (
                <div
                  key={lead.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                    idx === currentIndex ? "bg-muted" : ""
                  }`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setNotiz("");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{lead.firmenname}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.ansprechpartner}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        idx === currentIndex ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {idx + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Tastenkürzel</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><kbd className="px-1 bg-muted rounded">←</kbd> <kbd className="px-1 bg-muted rounded">→</kbd> Vorheriger/Nächster</p>
            <p><kbd className="px-1 bg-muted rounded">N</kbd> Nicht erreicht</p>
            <p><kbd className="px-1 bg-muted rounded">K</kbd> Kein Interesse</p>
            <p><kbd className="px-1 bg-muted rounded">I</kbd> Interessiert</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
