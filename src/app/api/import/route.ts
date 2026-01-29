import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Clean and format phone number to E.164 format (+49...)
function cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove middle dots, spaces, dashes, parentheses, and other non-digit characters
  let cleaned = phone
    .replace(/[·•\-\(\)\s\.\/]/g, "") // Remove common separators
    .replace(/[^\d+]/g, ""); // Keep only digits and +

  // Skip if it's not a valid phone number (too short, contains text like "Geschlossen")
  if (cleaned.length < 6) return null;

  // Convert German local format to international
  if (cleaned.startsWith("0")) {
    cleaned = "+49" + cleaned.substring(1);
  }

  // If no country code, assume Germany
  if (!cleaned.startsWith("+")) {
    cleaned = "+49" + cleaned;
  }

  // Validate minimum length for a real phone number
  if (cleaned.length < 10) return null;

  return cleaned;
}

// POST /api/import - Import leads from mapped data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leads, skipDuplicates = true, groupId } = body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads provided" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      // Clean phone number first
      const cleanedPhone = cleanPhoneNumber(lead.telefon);

      // Only telefon is required
      if (!cleanedPhone) {
        errors.push(
          `Übersprungen: Ungültige Telefonnummer für "${lead.firmenname || "Unbekannt"}": ${lead.telefon || "leer"}`
        );
        skipped++;
        continue;
      }

      // Check for duplicate phone numbers
      if (skipDuplicates) {
        const existing = await prisma.lead.findFirst({
          where: { telefon: cleanedPhone },
        });

        if (existing) {
          skipped++;
          continue;
        }
      }

      try {
        await prisma.lead.create({
          data: {
            firmenname: lead.firmenname || "Unbekannt",
            ansprechpartner: lead.ansprechpartner || null,
            anrede: lead.anrede || null,
            telefon: cleanedPhone,
            email: lead.email || null,
            website: lead.website || null,
            branche: lead.branche || null,
            ort: lead.ort || null,
            status: "neu",
            groupId: groupId || null,
          },
        });
        imported++;
      } catch (err) {
        errors.push(`Import fehlgeschlagen für ${lead.firmenname}: ${err}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: leads.length,
      errors: errors.slice(0, 10), // Limit error messages
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return NextResponse.json(
      { error: "Failed to import leads" },
      { status: 500 }
    );
  }
}
