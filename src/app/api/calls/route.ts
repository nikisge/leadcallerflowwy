import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/calls - List all calls
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where = leadId ? { leadId } : {};

    const calls = await prisma.call.findMany({
      where,
      orderBy: { datum: "desc" },
      take: limit,
      include: {
        lead: {
          select: {
            firmenname: true,
            ansprechpartner: true,
          },
        },
      },
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}

// POST /api/calls - Create a new call record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create call record
    const call = await prisma.call.create({
      data: {
        leadId: body.leadId,
        ergebnis: body.ergebnis,
        dauer: body.dauer || null,
        notiz: body.notiz || null,
        twilioSid: body.twilioSid || null,
      },
    });

    // Update lead's last call and attempt count
    await prisma.lead.update({
      where: { id: body.leadId },
      data: {
        letzterAnruf: new Date(),
        anrufVersuche: { increment: 1 },
        // Optionally update status based on call result
        ...(body.updateStatus ? { status: body.status } : {}),
        ...(body.notiz ? { notizen: body.notiz } : {}),
      },
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error("Error creating call:", error);
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}
