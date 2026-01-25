import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/leads/bulk - Bulk update leads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, update } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No lead IDs provided" },
        { status: 400 }
      );
    }

    const result = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: update,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Error bulk updating leads:", error);
    return NextResponse.json(
      { error: "Failed to bulk update leads" },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/bulk - Bulk delete leads
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No lead IDs provided" },
        { status: 400 }
      );
    }

    const result = await prisma.lead.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error bulk deleting leads:", error);
    return NextResponse.json(
      { error: "Failed to bulk delete leads" },
      { status: 500 }
    );
  }
}
