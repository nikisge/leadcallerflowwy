import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/leads/branchen - Get all unique branchen
export async function GET() {
  try {
    const branchen = await prisma.lead.findMany({
      where: {
        branche: {
          not: null,
        },
      },
      select: {
        branche: true,
      },
      distinct: ["branche"],
      orderBy: {
        branche: "asc",
      },
    });

    const uniqueBranchen = branchen
      .map((b) => b.branche)
      .filter((b): b is string => b !== null);

    return NextResponse.json(uniqueBranchen);
  } catch (error) {
    console.error("Error fetching branchen:", error);
    return NextResponse.json(
      { error: "Failed to fetch branchen" },
      { status: 500 }
    );
  }
}
