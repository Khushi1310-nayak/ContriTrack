import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

// GET: Retrieve recent team standup logs & task activities
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

    // Fetch recent task activities for tasks in this workspace
    const workspaceTasks = await prisma.task.findMany({
      where: { workspaceId },
      select: { id: true, title: true }
    });

    const taskIds = workspaceTasks.map(t => t.id);

    const activities = await prisma.taskActivity.findMany({
      where: { taskId: { in: taskIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { id: true, fullName: true, email: true }
        },
        task: {
          select: { id: true, title: true, status: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      workspaceId,
      timestamp: new Date().toISOString(),
      activitiesCount: activities.length,
      standupFeed: activities.map(a => ({
        id: a.id,
        userName: a.user?.fullName || "Teammate",
        userEmail: a.user?.email || "unlinked",
        taskTitle: a.task?.title || "Deliverable",
        taskStatus: a.task?.status || "open",
        actionType: a.actionType,
        metadata: a.metadata,
        timestamp: a.createdAt
      }))
    });
  } catch (error: unknown) {
    console.error("Developer Standups GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST: Submit a daily standup update (Slack / Discord bot integration)
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

    const { authorName, accomplished, workingOn, blockers, taskId } = body;

    if (!accomplished || !workingOn) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: 'accomplished' and 'workingOn' are required." },
        { status: 400 }
      );
    }

    // Find or target task
    let targetTaskId = taskId;
    if (!targetTaskId) {
      const firstTask = await prisma.task.findFirst({
        where: { workspaceId }
      });
      if (firstTask) {
        targetTaskId = firstTask.id;
      }
    }

    const standupText = `[Daily Standup - ${authorName || 'Teammate'}]: Accomplished: ${accomplished} | Working on: ${workingOn} | Blockers: ${blockers || 'None'}`;

    if (targetTaskId) {
      await prisma.taskActivity.create({
        data: {
          taskId: targetTaskId,
          userId: authCheck.userId || null,
          actionType: "standup",
          metadata: standupText
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Daily standup registered in workspace telemetry feed.",
      workspaceId,
      timestamp: new Date().toISOString(),
      standup: {
        authorName: authorName || "Teammate",
        accomplished,
        workingOn,
        blockers: blockers || "None"
      }
    });
  } catch (error: unknown) {
    console.error("Developer Standups POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
