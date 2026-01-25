import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/stats - Get dashboard statistics
export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ["status"],
      _count: true,
    });

    // Get leads by product
    const leadsByProduct = await prisma.lead.groupBy({
      by: ["produkt"],
      _count: true,
      where: {
        produkt: { not: null },
      },
    });

    // Get leads by branche (top 10)
    const leadsByBranche = await prisma.lead.groupBy({
      by: ["branche"],
      _count: true,
      where: {
        branche: { not: null },
      },
      orderBy: {
        _count: {
          branche: "desc",
        },
      },
      take: 10,
    });

    // Get calls per day (last 7 days)
    const callsLastWeek = await prisma.call.findMany({
      where: {
        datum: { gte: weekAgo },
      },
      select: {
        datum: true,
        ergebnis: true,
        dauer: true,
      },
    });

    // Group calls by day
    const callsByDay: Record<string, { total: number; erreicht: number; dauer: number }> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      callsByDay[dateStr] = { total: 0, erreicht: 0, dauer: 0 };
    }

    for (const call of callsLastWeek) {
      const dateStr = call.datum.toISOString().split("T")[0];
      if (callsByDay[dateStr]) {
        callsByDay[dateStr].total++;
        if (call.ergebnis === "erreicht") {
          callsByDay[dateStr].erreicht++;
        }
        if (call.dauer) {
          callsByDay[dateStr].dauer += call.dauer;
        }
      }
    }

    // Get totals
    const totalLeads = await prisma.lead.count();
    const totalCalls = await prisma.call.count();
    const totalCallsToday = await prisma.call.count({
      where: { datum: { gte: today } },
    });
    const totalBooked = await prisma.lead.count({
      where: { status: "gebucht" },
    });

    // Conversion rate
    const booked = leadsByStatus.find((s) => s.status === "gebucht")?._count || 0;

    // Success rate by branche
    const branchenStats = await prisma.lead.groupBy({
      by: ["branche"],
      _count: true,
      where: {
        branche: { not: null },
        status: "gebucht",
      },
    });

    return NextResponse.json({
      overview: {
        totalLeads,
        totalCalls,
        totalCallsToday,
        totalBooked,
        conversionRate: totalLeads > 0 ? ((booked / totalLeads) * 100).toFixed(1) : 0,
      },
      leadsByStatus: leadsByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      leadsByProduct: leadsByProduct.map((p) => ({
        produkt: p.produkt,
        count: p._count,
      })),
      leadsByBranche: leadsByBranche.map((b) => ({
        branche: b.branche,
        count: b._count,
      })),
      callsByDay: Object.entries(callsByDay)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .reverse(),
      branchenStats: branchenStats.map((b) => ({
        branche: b.branche,
        booked: b._count,
      })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
