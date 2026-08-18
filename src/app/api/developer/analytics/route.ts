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
        { success: false, error: "Unauthorized", message: authCheck.error },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    // Fetch workspace contribution summaries
    const summaries = await prisma.contributionSummary.findMany({
      where: {
        workspaceId: authCheck.workspaceId
      },
      orderBy: {
        contributionScore: "desc"
      }
    });

    // Compute aggregation stats
    let totalCommits = 0;
    let totalPrs = 0;
    let totalTasksCompleted = 0;
    let totalMeetingsAttended = 0;
    let sumScores = 0;

    summaries.forEach(s => {
      totalCommits += s.commits;
      totalPrs += s.pullRequests;
      totalTasksCompleted += s.tasksCompleted;
      totalMeetingsAttended += s.meetingsAttended;
      sumScores += s.contributionScore;
    });

    const avgWorkspaceScore = summaries.length > 0 ? (sumScores / summaries.length) : 0.0;

    return NextResponse.json({
      success: true,
      requestedAt: new Date().toISOString(),
      workspaceId: authCheck.workspaceId,
      metricsSummary: {
        totalContributors: summaries.length,
        aggregatedCommits: totalCommits,
        aggregatedPullRequests: totalPrs,
        aggregatedTasksCompleted: totalTasksCompleted,
        aggregatedMeetingsAttended: totalMeetingsAttended,
        workspaceParityHealthScore: parseFloat(avgWorkspaceScore.toFixed(2))
      },
      contributors: summaries.map(s => ({
        userId: s.userId,
        commitsCount: s.commits,
        pullRequestsCount: s.pullRequests,
        reviewsCount: s.reviews,
        tasksCompletedCount: s.tasksCompleted,
        meetingsAttendedCount: s.meetingsAttended,
        telemetryContributionScore: s.contributionScore,
        lastCalculated: s.updatedAt
      }))
    });
  } catch (error: unknown) {
    console.error("API Analytics query error:", error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: err.message || String(error) },
      { status: 500 }
    );
  }
}
