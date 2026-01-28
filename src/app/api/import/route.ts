import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
      // Validate required fields
      if (!lead.firmenname || !lead.ansprechpartner || !lead.telefon) {
        errors.push(
          `Skipped: Missing required fields for ${lead.firmenname || "unknown"}`
        );
        skipped++;
        continue;
      }

      // Check for duplicate phone numbers
      if (skipDuplicates) {
        const existing = await prisma.lead.findFirst({
          where: { telefon: lead.telefon },
        });

        if (existing) {
          skipped++;
          continue;
        }
      }

      try {
        await prisma.lead.create({
          data: {
            firmenname: lead.firmenname,
            ansprechpartner: lead.ansprechpartner,
            anrede: lead.anrede || null,
            telefon: lead.telefon,
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
        errors.push(`Failed to import ${lead.firmenname}: ${err}`);
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
