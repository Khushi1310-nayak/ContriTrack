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
    
    const authCheck = await validateApiKey(token, "write", ip);
    if (!authCheck.valid || !authCheck.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error || "Key requires write permission" },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    const workspaceId = authCheck.workspaceId;
    const body = await request.json();

    const { 
      pipelineName, 
      branch, 
      commitSha, 
      status, // "success" | "failure" | "running"
      testsPassed, 
      testsFailed, 
      codeCoveragePct,
      authorName
    } = body;

    if (!pipelineName || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: 'pipelineName' and 'status' (success/failure) are required." },
        { status: 400 }
      );
    }

    // Target or find first task to anchor telemetry log
    const task = await prisma.task.findFirst({
      where: { workspaceId }
    });

    const buildLog = `[CI/CD - ${pipelineName}]: ${status.toUpperCase()} on branch '${branch || 'main'}' (${(commitSha || 'latest').substring(0, 7)}) | Tests: ${testsPassed || 0} passed, ${testsFailed || 0} failed | Coverage: ${codeCoveragePct || 'N/A'}%`;

    if (task) {
      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          userId: authCheck.userId || null,
          actionType: status === "success" ? "ci_success" : "ci_failure",
          metadata: buildLog
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "CI/CD pipeline event ingested into ContriTrack workspace telemetry.",
      workspaceId,
      timestamp: new Date().toISOString(),
      event: {
        pipelineName,
        branch: branch || "main",
        commitSha: commitSha || "HEAD",
        status,
        testsPassed: testsPassed || 0,
        testsFailed: testsFailed || 0,
        codeCoveragePct: codeCoveragePct || null,
        authorName: authorName || "CI Runner"
      }
    });
  } catch (error: unknown) {
    console.error("Developer CI Build Event error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
