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
    if (!authCheck.valid || !authCheck.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error || "Invalid token" },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    const workspaceId = authCheck.workspaceId;

    // Fetch active workspace members
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        userId: true,
        role: true,
        githubUsername: true,
        contributionScore: true
      }
    });

    const userIds = members.map(m => m.userId);

    // Fetch real telemetry and AI metrics
    const [analytics, burnoutSignals, recentInsights, tasks] = await Promise.all([
      prisma.userContributionAnalytics.findMany({
        where: { userId: { in: userIds } }
      }),
      prisma.burnoutSignal.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.aIInsight.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.task.findMany({
        where: { workspaceId }
      })
    ]);

    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalCommitsTracked = analytics.reduce((acc, a) => acc + (a.commits || 0), 0);

    // Calculate team average stress level
    const avgStress = burnoutSignals.length > 0
      ? Math.round(burnoutSignals.reduce((acc, b) => acc + b.stressLevel, 0) / burnoutSignals.length)
      : 15;

    // Jain's Fairness Index
    const scores = members.map(m => m.contributionScore || 1);
    const sumScores = scores.reduce((a, b) => a + b, 0);
    const sumSqScores = scores.reduce((a, b) => a + b * b, 0);
    const n = scores.length || 1;
    const fairnessScore = sumSqScores > 0 ? Math.min(100, Math.max(0, Math.round(((sumScores * sumScores) / (n * sumSqScores)) * 100))) : 100;

    return NextResponse.json({
      success: true,
      workspaceId,
      timestamp: new Date().toISOString(),
      parityIntelligence: {
        fairnessScore,
        averageTeamStress: avgStress,
        taskCompletionRate: completionRate,
        totalTasksTracked: totalTasks,
        completedDeliverables: completedTasks,
        totalCommitsTracked,
        activeCollaboratorsCount: members.length
      },
      burnoutSignals: burnoutSignals.map(b => ({
        userId: b.userId,
        stressLevel: b.stressLevel,
        overtimeDetected: b.overtimeDetected,
        missedDeadlines: b.missedDeadlines,
        taskOverflow: b.taskOverflow,
        recordedAt: b.createdAt
      })),
      recentInsights: recentInsights.map(i => ({
        id: i.id,
        insightType: i.insightType,
        title: i.title,
        description: i.description,
        confidenceScore: i.confidenceScore,
        severity: i.severity,
        createdAt: i.createdAt
      }))
    });
  } catch (error: unknown) {
    console.error("Developer AI Insights error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
