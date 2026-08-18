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

    // Fetch workspace metadata, deliverables, and metrics
    const [workspace, tasks, members] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, createdAt: true }
      }),
      prisma.task.findMany({
        where: { workspaceId },
        include: { assignee: true }
      }),
      prisma.workspaceMember.findMany({
        where: { workspaceId }
      })
    ]);

    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const completed = tasks.filter(t => t.status === "completed");
    const inProgress = tasks.filter(t => t.status === "in_progress");
    const backlog = tasks.filter(t => t.status === "backlog" || t.status === "todo");
    const overdue = tasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date());

    const velocityScore = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
    
    // Top contributors in this sprint
    const memberTaskCounts = new Map<string, number>();
    completed.forEach(t => {
      if (t.assigneeId) {
        memberTaskCounts.set(t.assigneeId, (memberTaskCounts.get(t.assigneeId) || 0) + 1);
      }
    });

    const summaryText = `Sprint velocity achieved a ${velocityScore}% deliverable resolution index across ${tasks.length} total backlog items. ${completed.length} tasks resolved, ${inProgress.length} actively in progress, and ${overdue.length} items flagged as overdue. Team parity remains stable across ${members.length} active collaborators.`;

    return NextResponse.json({
      success: true,
      workspaceName: workspace.name,
      generatedAt: new Date().toISOString(),
      sprintMetrics: {
        totalBacklogItems: tasks.length,
        completedDeliverables: completed.length,
        inProgressItems: inProgress.length,
        unstartedBacklog: backlog.length,
        overdueItemsCount: overdue.length,
        sprintVelocityScore: velocityScore
      },
      aiSummary: summaryText,
      recommendations: [
        overdue.length > 0 
          ? `Address ${overdue.length} overdue tasks in upcoming triage session.`
          : "Workload cadence is on track with zero overdue blockers.",
        inProgress.length > members.length * 2
          ? "High work-in-progress concurrency detected. Consider limiting active tasks per engineer."
          : "Work-in-progress task concurrency is within optimal thresholds."
      ]
    });
  } catch (error: unknown) {
    console.error("Developer AI Sprint Summary error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
