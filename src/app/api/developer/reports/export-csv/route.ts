import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized: Missing Bearer Token", { status: 401 });
    }

    const token = authHeader.substring(7);
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    const authCheck = await validateApiKey(token, "read", ip);
    if (!authCheck.valid || !authCheck.workspaceId) {
      return new NextResponse(`Unauthorized: ${authCheck.error || "Invalid Token"}`, { status: 401 });
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    const workspaceId = authCheck.workspaceId;

    // Fetch workspace members, tasks, and users
    const [workspace, members, tasks] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      prisma.workspaceMember.findMany({
        where: { workspaceId }
      }),
      prisma.task.findMany({
        where: { workspaceId },
        include: { assignee: true }
      })
    ]);

    const userIds = members.map(m => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Build CSV Header
    const csvRows: string[] = [
      `"ContriTrack Academic & Telemetry Grading Export - ${workspace?.name || 'Workspace'}"`,
      `"Exported At: ${new Date().toISOString()}"`,
      "",
      `"Member Name","Email","Role","GitHub Username","Tasks Assigned","Tasks Completed","Contribution Score"`,
    ];

    // Compute metrics for each member
    members.forEach((m) => {
      const u = userMap.get(m.userId);
      const memberTasks = tasks.filter(t => t.assigneeId === m.userId);
      const completed = memberTasks.filter(t => t.status === "completed").length;
      const name = u?.fullName || "Collaborator";
      const email = u?.email || "unlinked@user";
      const role = m.role || "Contributor";
      const github = m.githubUsername || "Unlinked";
      const score = m.contributionScore || (completed * 10);

      csvRows.push(
        `"${name}","${email}","${role}","${github}",${memberTasks.length},${completed},${score}`
      );
    });

    csvRows.push("");
    csvRows.push(`"Task ID","Task Title","Priority","Status","Assignee","Due Date"`);

    tasks.forEach((t) => {
      const assigneeName = t.assignee?.fullName || "Unassigned";
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No Date";
      csvRows.push(
        `"${t.id}","${t.title.replace(/"/g, '""')}","${t.priority}","${t.status}","${assigneeName}","${due}"`
      );
    });

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contritrack-telemetry-${workspaceId}.csv"`
      }
    });
  } catch (error: unknown) {
    console.error("Developer Export CSV error:", error);
    return new NextResponse("Internal Server Error: " + (error as Error).message, { status: 500 });
  }
}
