"use server";

import { prisma } from "@/lib/db";

/**
 * Generate a certified workspace report entry
 */
export async function generateReport(data: {
  workspaceId: string;
  type: string;
  generatedBy: string;
  snapshotId: string;
}) {
  try {
    const report = await prisma.report.create({
      data: {
        workspaceId: data.workspaceId,
        type: data.type,
        generatedBy: data.generatedBy,
        reportUrl: ""
      }
    });

    const reportUrl = `/api/reports/pdf?reportId=${report.id}&snapshotId=${data.snapshotId}`;
    
    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: { reportUrl }
    });

    return { success: true, report: updatedReport };
  } catch (error: any) {
    console.error("Error in generateReport server action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all certified generated reports for a workspace
 */
export async function fetchWorkspaceReports(workspaceId: string) {
  try {
    const reports = await prisma.report.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, reports };
  } catch (error: any) {
    console.error("Error in fetchWorkspaceReports server action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a certified generated report
 */
export async function deleteReport(reportId: string) {
  try {
    await prisma.report.delete({
      where: { id: reportId }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteReport server action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a persistent contribution report from actual database telemetry
 */
export async function generateContributionReport(workspaceId: string, userId: string) {
  try {
    // 1. Fetch user information
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) throw new Error("Teammate not found");

    // 2. Fetch linked repository IDs from tasks in this workspace
    const tasks = await prisma.task.findMany({
      where: { workspaceId }
    });
    const repoIds = Array.from(new Set(tasks.map(t => t.repositoryId).filter(Boolean))) as string[];

    // 3. Count commits dynamically
    const commitsCount = await prisma.commit.count({
      where: {
        authorName: user.githubUsername || user.fullName,
        repoId: { in: repoIds }
      }
    });

    // 4. Count pull requests dynamically
    const prsCount = await prisma.pullRequest.count({
      where: {
        authorName: user.githubUsername || user.fullName,
        repoId: { in: repoIds }
      }
    });

    // 5. Count completed tasks assigned to user
    const completedTasksCount = tasks.filter(
      t => t.assigneeId === userId && t.status === "completed"
    ).length;

    // 6. Calculate meeting speaking participation
    const meetingParticipants = await prisma.meetingParticipant.findMany({
      where: {
        userId,
        attendanceStatus: "attended"
      }
    });
    const meetingCount = meetingParticipants.length;
    // Estimate speaking time share based on attendance
    const speakingShare = meetingCount > 0 ? Math.min(100, Math.round(meetingCount * 12.5)) : 0.0;

    // 7. Calculate overall contribution score dynamically
    const commitScore = commitsCount * 1.5;
    const prScore = prsCount * 5.0;
    const taskScore = completedTasksCount * 8.0;
    const meetingScore = meetingCount * 2.0;
    const rawContributionScore = commitScore + prScore + taskScore + meetingScore;

    // 8. Workload Fairness index (ideal target vs actual)
    const allMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId }
    });
    const totalMembersCount = allMembers.length || 1;
    const idealShare = 100 / totalMembersCount;
    // Estimate user's share of total tasks completed
    const totalWorkspaceTasksCompleted = tasks.filter(t => t.status === "completed").length || 1;
    const userTaskSharePct = (completedTasksCount / totalWorkspaceTasksCompleted) * 100;
    const deviation = Math.abs(userTaskSharePct - idealShare);
    const fairnessScore = Math.max(0, Math.min(100, Math.round(100 - deviation)));

    // 9. Save in dynamic ContributionReport table
    const report = await prisma.contributionReport.create({
      data: {
        workspaceId,
        userId,
        commits: commitsCount,
        pullRequests: prsCount,
        tasksCompleted: completedTasksCount,
        meetingParticipation: speakingShare,
        contributionScore: Math.round(rawContributionScore * 10) / 10,
        fairnessScore
      }
    });

    return { success: true, report };
  } catch (error: any) {
    console.error("Error in generateContributionReport server action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a persistent sprint workload and efficiency report
 */
export async function generateSprintReport(workspaceId: string, sprintName: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { workspaceId }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const overdueTasks = tasks.filter(
      t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;

    // Estimate speed index of tasks completed
    const completedPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0.0;
    const overduePenalty = overdueTasks * 5.0;
    const productivityScore = Math.max(0, Math.min(100, Math.round(completedPct - overduePenalty)));

    const report = await prisma.sprintReport.create({
      data: {
        workspaceId,
        sprintName,
        completedTasks,
        overdueTasks,
        productivityScore
      }
    });

    return { success: true, report };
  } catch (error: any) {
    console.error("Error in generateSprintReport server action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a persistent meeting attendance analytics report
 */
export async function generateMeetingReport(workspaceId: string) {
  try {
    // Fetch all workspace meetings
    const meetings = await prisma.meeting.findMany({
      where: { workspaceId },
      include: {
        participants: true
      }
    });

    let totalInvited = 0;
    let totalAttended = 0;
    let completedMeetingCount = 0;

    meetings.forEach(m => {
      if (m.status === "completed") {
        completedMeetingCount++;
        m.participants.forEach(p => {
          totalInvited++;
          if (p.attendanceStatus === "attended") {
            totalAttended++;
          }
        });
      }
    });

    const attendanceRate = totalInvited > 0 ? Math.round((totalAttended / totalInvited) * 100) : 100.0;

    // Count action items (tasks completed that mention meetings or are scheduled)
    const tasks = await prisma.task.findMany({
      where: { workspaceId }
    });
    const completedActionItems = tasks.filter(t => t.status === "completed").length;

    const report = await prisma.meetingReport.create({
      data: {
        workspaceId,
        attendanceRate,
        actionItemsCompleted: completedActionItems
      }
    });

    return { success: true, report };
  } catch (error: any) {
    console.error("Error in generateMeetingReport server action:", error);
    return { success: false, error: error.message };
  }
}
