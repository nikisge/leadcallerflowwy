"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Check, X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  suggestedMapping: Record<string, string>;
}

const TARGET_FIELDS = [
  { value: "firmenname", label: "Firmenname *", required: true },
  { value: "ansprechpartner", label: "Ansprechpartner *", required: true },
  { value: "anrede", label: "Anrede", required: false },
  { value: "telefon", label: "Telefon *", required: true },
  { value: "email", label: "E-Mail", required: false },
  { value: "website", label: "Website", required: false },
  { value: "branche", label: "Branche", required: false },
  { value: "ort", label: "Ort", required: false },
];

// Known column name mappings (German/English variations)
const COLUMN_MAPPINGS: Record<string, string[]> = {
  firmenname: [
    "firmenname",
    "firma",
    "unternehmen",
    "company",
    "company name",
    "name",
  ],
  ansprechpartner: [
    "ansprechpartner",
    "kontakt",
    "contact",
    "contact person",
    "vorname nachname",
    "kontaktperson",
  ],
  anrede: ["anrede", "salutation", "titel", "title"],
  telefon: [
    "telefon",
    "telefonnummer",
    "phone",
    "tel",
    "tel.",
    "telephone",
    "mobil",
    "mobile",
  ],
  email: ["email", "e-mail", "mail", "e mail"],
  website: ["website", "webseite", "web", "url", "homepage"],
  branche: ["branche", "industry", "sector", "kategorie", "category"],
  ort: ["ort", "stadt", "city", "location", "plz", "postleitzahl"],
};

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\-]/g, " ")
    .replace(/\s+/g, " ");
}

function findBestMatch(columnName: string): string | null {
  const normalized = normalizeColumnName(columnName);

  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    if (
      variations.some((v) => normalized.includes(v) || v.includes(normalized))
    ) {
      return field;
    }
  }

  return null;
}

export function ImportMapper() {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
  } | null>(null);

  const { toast } = useToast();

  const parseFile = useCallback(async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
      toast({
        title: "Fehler",
        description: "Bitte eine XLSX oder CSV Datei hochladen",
        variant: "destructive",
      });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        sheet,
        {
          defval: null,
          raw: false,
        }
      );

      if (jsonData.length === 0) {
        toast({
          title: "Fehler",
          description: "Die Datei enthält keine Daten",
          variant: "destructive",
        });
        return;
      }

      const headers = Object.keys(jsonData[0]);
      const suggestedMapping: Record<string, string> = {};

      for (const header of headers) {
        const match = findBestMatch(header);
        if (match) {
          suggestedMapping[header] = match;
        }
      }

      setParsedData({
        headers,
        rows: jsonData,
        suggestedMapping,
      });

      setMapping(suggestedMapping);
      setImportResult(null);

      toast({
        title: "Datei geladen",
        description: `${jsonData.length} Zeilen gefunden`,
      });
    } catch {
      toast({
        title: "Fehler",
        description: "Datei konnte nicht gelesen werden",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        parseFile(file);
      }
    },
    [parseFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMapping((prev) => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const validateMapping = () => {
    const requiredFields = TARGET_FIELDS.filter((f) => f.required).map(
      (f) => f.value
    );
    const mappedFields = Object.values(mapping);

    const missingFields = requiredFields.filter(
      (f) => !mappedFields.includes(f)
    );
    return missingFields;
  };

  const handleImport = async () => {
    if (!parsedData) return;

    const missingFields = validateMapping();
    if (missingFields.length > 0) {
      toast({
        title: "Fehlende Pflichtfelder",
        description: `Bitte mappen Sie: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      // Transform data using mapping
      const transformedLeads = parsedData.rows.map((row) => {
        const lead: Record<string, string | null> = {};

        for (const [sourceColumn, targetField] of Object.entries(mapping)) {
          if (row[sourceColumn] !== undefined && row[sourceColumn] !== null) {
            lead[targetField] = String(row[sourceColumn]);
          }
        }

        return lead;
      });

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: transformedLeads,
          skipDuplicates,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        toast({
          title: "Import abgeschlossen",
          description: `${result.imported} von ${result.total} Leads importiert`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch {
      toast({
        title: "Fehler",
        description: "Import fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setParsedData(null);
    setMapping({});
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Import Result */}
      {importResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Check className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">
                  Import abgeschlossen
                </h3>
                <p className="text-green-700">
                  {importResult.imported} importiert, {importResult.skipped}{" "}
                  übersprungen (von {importResult.total} gesamt)
                </p>
              </div>
              <Button onClick={resetImport} variant="outline" className="ml-auto">
                Neuer Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drop Zone */}
      {!parsedData && !importResult && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Datei hier ablegen oder auswählen
          </h3>
          <p className="text-muted-foreground mb-4">
            Unterstützt: XLSX, XLS, CSV
          </p>
          <label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" asChild>
              <span>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Datei auswählen
              </span>
            </Button>
          </label>
        </div>
      )}

      {/* Mapping Interface */}
      {parsedData && !importResult && (
        <>
          {/* Column Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Spalten-Zuordnung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {parsedData.headers.map((header) => (
                  <div key={header} className="space-y-2">
                    <label className="text-sm font-medium">{header}</label>
                    <Select
                      value={mapping[header] || ""}
                      onValueChange={(v) => handleMappingChange(header, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nicht zuordnen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nicht zuordnen</SelectItem>
                        {TARGET_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Vorschau (erste 5 Zeilen)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsedData.headers.map((header) => (
                        <TableHead key={header}>
                          <div>
                            <div className="font-medium">{header}</div>
                            {mapping[header] && (
                              <div className="text-xs text-green-600">
                                → {mapping[header]}
                              </div>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.rows.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {parsedData.headers.map((header) => (
                          <TableCell key={header} className="max-w-[200px] truncate">
                            {row[header] != null ? String(row[header]) : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Import Options */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="skip-duplicates"
                      checked={skipDuplicates}
                      onCheckedChange={(c) => setSkipDuplicates(c as boolean)}
                    />
                    <label htmlFor="skip-duplicates" className="text-sm">
                      Duplikate überspringen (gleiche Telefonnummer)
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={resetImport}>
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importiere...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {parsedData.rows.length} Leads importieren
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
