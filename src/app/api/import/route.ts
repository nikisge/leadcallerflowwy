import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Clean and format phone number to E.164 format (+49...)
function cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  console.log("Original phone:", JSON.stringify(phone));

  // Remove ALL non-digit characters first, except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  console.log("After cleaning non-digits:", cleaned);

  // Skip if it's not a valid phone number (too short)
  if (cleaned.length < 6) {
    console.log("Phone too short, skipping");
    return null;
  }

  // Convert German local format to international
  if (cleaned.startsWith("0")) {
    cleaned = "+49" + cleaned.substring(1);
  }

  // If no country code, assume Germany
  if (!cleaned.startsWith("+")) {
    cleaned = "+49" + cleaned;
  }

  // Validate minimum length for a real phone number
  if (cleaned.length < 10) {
    console.log("Final phone too short, skipping");
    return null;
  }

  console.log("Final cleaned phone:", cleaned);
  return cleaned;
}

// POST /api/import - Import leads from mapped data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leads, skipDuplicates = true, groupId } = body;

    console.log("=== IMPORT START ===");
    console.log("Total leads received:", leads?.length);
    console.log("Skip duplicates:", skipDuplicates);
    console.log("Group ID:", groupId);

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads provided" },
        { status: 400 }
      );
    }

    // Log first 3 leads to see what we're getting
    console.log("First 3 leads:", JSON.stringify(leads.slice(0, 3), null, 2));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      console.log(`\n--- Processing lead ${i + 1} ---`);
      console.log("Lead data:", JSON.stringify(lead));

      // Clean phone number first
      const cleanedPhone = cleanPhoneNumber(lead.telefon);

      // Only telefon is required
      if (!cleanedPhone) {
        const errorMsg = `Übersprungen #${i + 1}: Ungültige Telefonnummer "${lead.telefon || "leer"}" für "${lead.firmenname || "Unbekannt"}"`;
        console.log(errorMsg);
        errors.push(errorMsg);
        skipped++;
        continue;
      }

      // Check for duplicate phone numbers
      if (skipDuplicates) {
        const existing = await prisma.lead.findFirst({
          where: { telefon: cleanedPhone },
        });

        if (existing) {
          console.log(`Duplicate found for ${cleanedPhone}, skipping`);
          skipped++;
          continue;
        }
      }

      try {
        const created = await prisma.lead.create({
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
        console.log("Created lead:", created.id);
        imported++;
      } catch (err) {
        const errorMsg = `Import fehlgeschlagen für ${lead.firmenname}: ${err}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        skipped++;
      }
    }

    console.log("\n=== IMPORT COMPLETE ===");
    console.log("Imported:", imported);
    console.log("Skipped:", skipped);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: leads.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return NextResponse.json(
      { error: "Failed to import leads" },
      { status: 500 }
    );
  }
}
