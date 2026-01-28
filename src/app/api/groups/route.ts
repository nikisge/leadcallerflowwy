import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/groups - List all groups with lead counts
export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also get count of leads without a group
    const ungroupedCount = await prisma.lead.count({
      where: { groupId: null },
    });

    return NextResponse.json({
      groups,
      ungroupedCount,
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null,
        color: color || "#3b82f6",
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
