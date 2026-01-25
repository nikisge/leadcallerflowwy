import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/leads - List all leads with filtering, sorting, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status");
    const branche = searchParams.get("branche");
    const produkt = searchParams.get("produkt");
    const search = searchParams.get("search");

    // Sorting
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (branche) {
      where.branche = branche;
    }

    if (produkt) {
      where.produkt = produkt;
    }

    if (search) {
      where.OR = [
        { firmenname: { contains: search } },
        { ansprechpartner: { contains: search } },
        { telefon: { contains: search } },
        { email: { contains: search } },
        { ort: { contains: search } },
      ];
    }

    // Execute query with count
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          anrufe: {
            orderBy: { datum: "desc" },
            take: 1,
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lead = await prisma.lead.create({
      data: {
        firmenname: body.firmenname,
        ansprechpartner: body.ansprechpartner,
        anrede: body.anrede || null,
        telefon: body.telefon,
        email: body.email || null,
        website: body.website || null,
        branche: body.branche || null,
        ort: body.ort || null,
        status: body.status || "neu",
        notizen: body.notizen || null,
        produkt: body.produkt || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
