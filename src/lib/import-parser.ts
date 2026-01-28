import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  suggestedMapping: Record<string, string>;
}

// Known column name mappings (German/English variations)
const COLUMN_MAPPINGS: Record<string, string[]> = {
  firmenname: ["firmenname", "firma", "unternehmen", "company", "company name", "name"],
  ansprechpartner: ["ansprechpartner", "kontakt", "contact", "contact person", "vorname nachname", "name", "kontaktperson"],
  anrede: ["anrede", "salutation", "titel", "title"],
  telefon: ["telefon", "telefonnummer", "phone", "tel", "tel.", "telephone", "mobil", "mobile"],
  email: ["email", "e-mail", "mail", "e mail"],
  website: ["website", "webseite", "web", "url", "homepage"],
  branche: ["branche", "industry", "sector", "kategorie", "category"],
  ort: ["ort", "stadt", "city", "location", "plz", "postleitzahl"],
};

// Normalize a column name for matching
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\-]/g, " ")
    .replace(/\s+/g, " ");
}

// Find best matching field for a column
function findBestMatch(columnName: string): string | null {
  const normalized = normalizeColumnName(columnName);

  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    if (variations.some((v) => normalized.includes(v) || v.includes(normalized))) {
      return field;
    }
  }

  return null;
}

// Parse XLSX file
export async function parseXLSX(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet, {
    defval: null,
    raw: false,
  });

  if (jsonData.length === 0) {
    return { headers: [], rows: [], suggestedMapping: {} };
  }

  const headers = Object.keys(jsonData[0]);
  const suggestedMapping: Record<string, string> = {};

  for (const header of headers) {
    const match = findBestMatch(header);
    if (match) {
      suggestedMapping[header] = match;
    }
  }

  return {
    headers,
    rows: jsonData,
    suggestedMapping,
  };
}

// Parse CSV file
export async function parseCSV(content: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<ParsedRow>(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV parsing warnings:", results.errors);
        }

        const headers = results.meta.fields || [];
        const suggestedMapping: Record<string, string> = {};

        for (const header of headers) {
          const match = findBestMatch(header);
          if (match) {
            suggestedMapping[header] = match;
          }
        }

        resolve({
          headers,
          rows: results.data,
          suggestedMapping,
        });
      },
      error: (error: unknown) => {
        reject(error);
      },
    });
  });
}

// Parse file based on type
export async function parseFile(
  file: File
): Promise<ParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    return parseXLSX(buffer);
  } else if (extension === "csv") {
    const content = await file.text();
    return parseCSV(content);
  }

  throw new Error(`Unsupported file type: ${extension}`);
}

// Transform parsed data using mapping
export function transformData(
  rows: ParsedRow[],
  mapping: Record<string, string>
): Partial<{
  firmenname: string;
  ansprechpartner: string;
  anrede: string;
  telefon: string;
  email: string;
  website: string;
  branche: string;
  ort: string;
}>[] {
  return rows.map((row) => {
    const transformed: Record<string, string | null> = {};

    for (const [sourceColumn, targetField] of Object.entries(mapping)) {
      if (row[sourceColumn] !== undefined && row[sourceColumn] !== null) {
        transformed[targetField] = String(row[sourceColumn]);
      }
    }

    return transformed;
  });
}
