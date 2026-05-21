import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // 1. Bearer Token authorization checks
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
        { success: false, error: "Unauthorized", message: authCheck.error },
        { status: 401 }
      );
    }

    // 2. Enforce active key rate limit
    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    // 3. Fetch real database workspaces for this authorized tenant
    const workspaces = await prisma.workspace.findMany({
      where: {
        id: authCheck.workspaceId
      },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        createdAt: true,
        members: {
          select: {
            userId: true,
            role: true,
            githubUsername: true,
            contributionScore: true
          }
        }
      }
    });

    return NextResponse.json(
      {
        success: true,
        requestedAt: new Date().toISOString(),
        workspaceId: authCheck.workspaceId,
        authorizedUser: authCheck.userId,
        workspaces: workspaces.map(w => ({
          id: w.id,
          name: w.name,
          inviteCode: w.inviteCode,
          createdAt: w.createdAt,
          memberCount: w.members.length,
          members: w.members
        }))
      },
      {
        headers: {
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "59",
        }
      }
    );
  } catch (error: any) {
    console.error("API Workspaces critical gateway error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
