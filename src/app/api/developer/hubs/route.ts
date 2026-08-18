import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "Missing or invalid Bearer authentication header." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    const authCheck = await validateApiKey(token, "read", ip);
    if (!authCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error || "Invalid token" },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    // Fetch all academic hubs from database
    const hubs = await prisma.academicHub.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            members: true,
            projects: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hubsCount: hubs.length,
      hubs: hubs.map(h => ({
        id: h.id,
        slug: h.slug,
        name: h.name,
        type: h.type,
        institution: h.institution,
        description: h.description,
        icon: h.icon,
        memberCount: h._count.members,
        projectCount: h._count.projects,
        createdAt: h.createdAt
      }))
    });
  } catch (error: unknown) {
    console.error("Developer Hubs API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
