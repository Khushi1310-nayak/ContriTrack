import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
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
    if (!authCheck.valid || !authCheck.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error || "Invalid token" },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    const workspaceId = authCheck.workspaceId;
    const userId = authCheck.userId || "api-client";

    let body: { type?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const reportType = body.type || "contribution";
    const snapshotId = "snap_" + Math.random().toString(36).substring(2, 10);

    // Create certified report entry in PostgreSQL
    const report = await prisma.report.create({
      data: {
        workspaceId,
        type: reportType,
        generatedBy: userId,
        reportUrl: ""
      }
    });

    const reportUrl = `/api/reports/pdf?reportId=${report.id}&snapshotId=${snapshotId}`;
    
    const updated = await prisma.report.update({
      where: { id: report.id },
      data: { reportUrl }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      reportId: updated.id,
      reportType: updated.type,
      workspaceId: updated.workspaceId,
      createdAt: updated.createdAt,
      downloadUrl: `${appUrl}${reportUrl}`,
      directPdfEndpoint: reportUrl
    });
  } catch (error: unknown) {
    console.error("Developer Generate PDF error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
