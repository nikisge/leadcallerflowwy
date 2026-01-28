// Status options for leads
export const LEAD_STATUSES = [
  { value: "neu", label: "Neu", color: "bg-blue-100 text-blue-800" },
  { value: "kontaktiert", label: "Kontaktiert", color: "bg-yellow-100 text-yellow-800" },
  { value: "interessiert", label: "Interessiert", color: "bg-green-100 text-green-800" },
  { value: "kein_interesse", label: "Kein Interesse", color: "bg-red-100 text-red-800" },
  { value: "gebucht", label: "Gebucht", color: "bg-purple-100 text-purple-800" },
] as const;

export type LeadStatus = typeof LEAD_STATUSES[number]["value"];

// Product options
export const PRODUKTE = [
  { value: "ki_produkt", label: "KI-Produkt" },
  { value: "beratung", label: "Beratung" },
] as const;

export type Produkt = typeof PRODUKTE[number]["value"] | null;

// Call result options
export const CALL_RESULTS = [
  { value: "erreicht", label: "Erreicht" },
  { value: "nicht_erreicht", label: "Nicht erreicht" },
  { value: "mailbox", label: "Mailbox" },
] as const;

export type CallResult = typeof CALL_RESULTS[number]["value"];

// Group type
export interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    leads: number;
  };
}

// Lead type
export interface Lead {
  id: string;
  firmenname: string;
  ansprechpartner: string;
  anrede: string | null;
  telefon: string;
  email: string | null;
  website: string | null;
  branche: string | null;
  ort: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: LeadStatus;
  notizen: string | null;
  produkt: Produkt;
  letzterAnruf: Date | null;
  anrufVersuche: number;
  groupId: string | null;
  group?: Group | null;
}

// Call type
export interface Call {
  id: string;
  leadId: string;
  datum: Date;
  dauer: number | null;
  ergebnis: CallResult;
  notiz: string | null;
  twilioSid: string | null;
}

// Import mapping type
export interface ColumnMapping {
  [sourceColumn: string]: string; // maps source column to target field
}
