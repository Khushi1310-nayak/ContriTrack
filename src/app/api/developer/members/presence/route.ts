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

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId }
    });

    const userIds = members.map(m => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const activeTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: { in: ["in_progress", "todo"] }
      },
      select: {
        id: true,
        title: true,
        status: true,
        assigneeId: true
      }
    });

    return NextResponse.json({
      success: true,
      workspaceId,
      timestamp: new Date().toISOString(),
      activeMembersCount: members.length,
      members: members.map(m => {
        const u = userMap.get(m.userId);
        const memberTask = activeTasks.find(t => t.assigneeId === m.userId);
        return {
          userId: m.userId,
          fullName: u?.fullName || "Collaborator",
          email: u?.email || "unlinked@user",
          role: m.role || "Contributor",
          githubUsername: m.githubUsername || null,
          activityStatus: m.activityStatus || "online",
          currentActiveTask: memberTask ? memberTask.title : "Standby / Backlog review",
          joinedAt: m.joinedAt
        };
      })
    });
  } catch (error: unknown) {
    console.error("Developer Members Presence error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
