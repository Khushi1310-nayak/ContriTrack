"use server";

import { prisma } from "@/lib/db";
import { syncRepositoryTelemetry } from "@/lib/github-service";

async function resolveDbUserId(userId: string): Promise<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) {
    return userId;
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { email: true }
  });

  if (profile) {
    const user = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true }
    });
    if (user) return user.id;
  }

  const directUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  if (directUser) return directUser.id;

  return userId;
}

async function resolveDbUserIds(userIds: string[]): Promise<string[]> {
  const resolvedIds: string[] = [];
  for (const id of userIds) {
    const resolved = await resolveDbUserId(id);
    resolvedIds.push(resolved);
  }
  return resolvedIds;
}

/**
 * Fetch and dynamically compile workspace analytics
 */
export async function fetchWorkspaceAnalyticsData(
  workspaceId: string,
  filters?: {
    repositoryId?: string | null;
    memberId?: string | null;
    sprintName?: string | null;
    dateRange?: string | null; // "today" | "week" | "month" | "6months" | "all"
  }
) {
  try {
    const repositoryId = filters?.repositoryId || null;
    const memberId = filters?.memberId || null;
    const dateRange = filters?.dateRange || "all";

    // Date range parsing & Sprint Auto-Seeding
    let sprintFilter: { gte?: Date; lte?: Date } | null = null;
    if (filters?.sprintName) {
      const sprintName = filters.sprintName;
      let sprint = await prisma.sprint.findUnique({
        where: {
          workspaceId_name: { workspaceId, name: sprintName }
        }
      });
      if (!sprint) {
        // Auto-seed for 2-week cycle ending today
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);
        sprint = await prisma.sprint.create({
          data: {
            workspaceId,
            name: sprintName,
            startDate,
            endDate
          }
        });
      }
      sprintFilter = {
        gte: sprint.startDate,
        lte: sprint.endDate
      };
    }

    let dateFilter: { gte?: Date; lte?: Date } = {};
    if (sprintFilter) {
      dateFilter = sprintFilter;
    } else if (dateRange === "today") {
      dateFilter = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (dateRange === "week" || dateRange === "7d") {
      dateFilter = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === "month" || dateRange === "30d") {
      dateFilter = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === "6months") {
      dateFilter = { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) };
    }

    // 1. Fetch all members / users associated with this workspace
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId }
    });
    
    const memberFirebaseUserIds = workspaceMembers.map(wm => wm.userId);
    const dbUserIds = await resolveDbUserIds(memberFirebaseUserIds);

    // Find all repositories where at least one workspace member is a RepositoryMember
    const memberRepos = await prisma.repositoryMember.findMany({
      where: { userId: { in: dbUserIds } },
      select: { repoId: true }
    });
    
    const linkedRepoIds = Array.from(
      new Set(memberRepos.map(mr => mr.repoId))
    );

    const repositories = await prisma.gitHubRepository.findMany({
      where: {
        id: { in: linkedRepoIds }
      },
      include: {
        members: true
      }
    });

    const activeRepoId = repositoryId || (repositories[0]?.id || null);

    // 2. Fetch all users
    const users = await prisma.user.findMany({
      where: { id: { in: dbUserIds } },
      include: {
        createdTasks: true,
        assignedTasks: true
      }
    });

    // 3. Dynamic aggregates
    const totalCommits = await prisma.commit.count({
      where: {
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        ...(Object.keys(dateFilter).length ? { authoredAt: dateFilter } : {})
      }
    });

    const openPRs = await prisma.pullRequest.count({
      where: {
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        state: "open"
      }
    });

    const mergedPRs = await prisma.pullRequest.count({
      where: {
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        state: "merged"
      }
    });

    const openIssues = await prisma.issue.count({
      where: {
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        state: "open"
      }
    });

    const closedIssues = await prisma.issue.count({
      where: {
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        state: "closed"
      }
    });

    // 4. Tasks aggregates
    const workspaceTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        ...(activeRepoId ? { repositoryId: activeRepoId } : {}),
        ...(memberId ? { assigneeId: memberId } : {})
      }
    });

    const completedTasksCount = workspaceTasks.filter(t => t.status === "completed").length;
    const totalTasksCount = workspaceTasks.length;
    const sprintCompletionPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
    
    // Overdue tasks count
    const overdueTasksCount = workspaceTasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const overdueRatio = totalTasksCount > 0 ? Math.round((overdueTasksCount / totalTasksCount) * 100) : 0;

    // 5. Build contributor metrics using O(1) group aggregations
    const commitsGrouped = await prisma.commit.groupBy({
      by: ['authorName'],
      where: {
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        ...(Object.keys(dateFilter).length ? { authoredAt: dateFilter } : {})
      },
      _count: { id: true },
      _sum: { additions: true, deletions: true }
    });

    const prsGrouped = await prisma.pullRequest.groupBy({
      by: ['authorName'],
      where: {
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
      },
      _count: { id: true }
    });

    const issuesGrouped = await prisma.issue.groupBy({
      by: ['authorName'],
      where: {
        state: "closed",
        ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
        ...(Object.keys(dateFilter).length ? { closedAt: dateFilter } : {})
      },
      _count: { id: true }
    });

    // Hash Maps for O(1) lookups
    const commitsMap = new Map(commitsGrouped.map(c => [c.authorName.toLowerCase(), c]));
    const prsMap = new Map(prsGrouped.map(p => [p.authorName.toLowerCase(), p._count.id]));
    const issuesMap = new Map(issuesGrouped.map(i => [i.authorName.toLowerCase(), i._count.id]));

    const contributorStats = users.map((u) => {
      const gitName = (u.githubUsername || u.fullName).toLowerCase();
      const cData = commitsMap.get(gitName) || { _count: { id: 0 }, _sum: { additions: 0, deletions: 0 } };
      
      const userCommits = cData._count.id;
      const additions = cData._sum.additions || 0;
      const deletions = cData._sum.deletions || 0;
      const userPRs = prsMap.get(gitName) || 0;
      const userClosedIssues = issuesMap.get(gitName) || 0;

      const userTasks = workspaceTasks.filter(t => {
        if (t.assigneeId !== u.id) return false;
        const limit = dateFilter.gte;
        if (limit) {
          return t.updatedAt >= limit;
        }
        return true;
      });
      const userCompletedTasks = userTasks.filter(t => t.status === "completed").length;

      const score = parseFloat(
        (userCommits * 10.0 + userPRs * 25.0 + userCompletedTasks * 15.0 + (additions + deletions) * 0.05).toFixed(1)
      );

      const wm = workspaceMembers.find(m => m.userId === u.id);
      const githubUsername = wm?.githubUsername || u.githubUsername || "Unlinked";

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        githubUsername,
        commits: userCommits,
        pullRequests: userPRs,
        issuesClosed: userClosedIssues,
        linesAdded: additions,
        linesDeleted: deletions,
        completedTasks: userCompletedTasks,
        contributionScore: score
      };
    });

    // 6. Jain's Fairness Contribution Index
    // fairness = (sum(x_i))^2 / (n * sum(x_i^2))
    const nonZeroScores = contributorStats.length > 0 ? contributorStats.map(c => c.contributionScore || 1) : [1];
    const sumScores = nonZeroScores.reduce((a, b) => a + b, 0);
    const sumSqScores = nonZeroScores.reduce((a, b) => a + b * b, 0);
    const n = nonZeroScores.length;
    const fairnessScore = sumSqScores > 0 ? Math.min(100, Math.max(0, Math.round(((sumScores * sumScores) / (n * sumSqScores)) * 100))) : 100;

    // 7. Commit frequency timeline (Past 7 days)
    const commitTimeline = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const count = await prisma.commit.count({
        where: {
          ...(activeRepoId ? { repoId: activeRepoId } : { repoId: { in: linkedRepoIds } }),
          authoredAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      commitTimeline.push({ day: dayLabel, commits: count });
    }

    // 8. Dynamic AI Peer Parity Insights
    const sortedStats = [...contributorStats].sort((a, b) => b.contributionScore - a.contributionScore);
    const totalParityScores = sortedStats.reduce((s, c) => s + c.commits, 0) || 1;

    const dynamicInsights = [];
    
    if (fairnessScore >= 90) {
      dynamicInsights.push(`Peer collaboration is perfectly balanced, achieving a ${fairnessScore}% fairness distribution across tasks and repositories.`);
    } else if (fairnessScore >= 70) {
      dynamicInsights.push(`Workload distribution is acceptable at ${fairnessScore}%, but minor adjustments to task assignments could improve parity.`);
    } else {
      dynamicInsights.push(`Critical workload imbalance detected (${fairnessScore}% fairness). We recommend redistributing tasks in the next sprint.`);
    }

    if (sortedStats[0] && totalCommits > 0) {
      dynamicInsights.push(`${sortedStats[0].fullName} leads development velocity, holding ${Math.round((sortedStats[0].commits / totalParityScores) * 100)}% of tracked repository commits.`);
    }

    if (overdueRatio > 25) {
      dynamicInsights.push(`High risk: ${overdueRatio}% of sprint deliverables are overdue. Immediate backlog review required.`);
    } else {
      dynamicInsights.push(`Workspace velocity is stable with ${completedTasksCount} completed deliverables and a low overdue ratio of ${overdueRatio}%.`);
    }

    dynamicInsights.push(`PR merge efficiency shows ${mergedPRs} merged pull requests and ${openPRs} open reviews pending integration.`);

    // 9. Meeting Participation Insights (Dynamic)
    const meetings = await prisma.meeting.findMany({
      where: { workspaceId },
      include: { participants: true }
    });

    const meetingInsights = meetings.map(m => {
      const totalParticipants = m.participants.length;
      const attendedCount = m.participants.filter(p => p.attendanceStatus === "attended" || p.attendanceStatus === "accepted").length;
      const attendance = totalParticipants > 0 ? Math.round((attendedCount / totalParticipants) * 100) : 0;
      
      const hosts = m.participants.filter(p => p.role === "host").length;
      const speaking = hosts > 0 ? Math.round(80 / hosts) : Math.round(100 / (totalParticipants || 1));

      return {
        name: m.title || "Untitled",
        attendance,
        speaking
      };
    });

    return {
      success: true,
      data: {
        totalCommits,
        activeContributors: contributorStats.filter(c => c.commits > 0).length,
        sprintCompletionPct,
        fairnessScore,
        overdueRatio,
        openPRs,
        mergedPRs,
        openIssues,
        closedIssues,
        contributorStats,
        commitTimeline,
        insights: dynamicInsights,
        repositories,
        activeRepoId,
        meetingInsights
      }
    };
  } catch (error) {
    console.error("Failed to compile workspace analytics:", error);
    return { success: false, error: "Failed to load collaborative analytics." };
  }
}

/**
 * Periodically or manually sync all linked repositories in a workspace
 */
export async function syncWorkspaceGithubTelemetry(workspaceId: string, userId: string) {
  try {
    const dbExecutionUserId = await resolveDbUserId(userId);

    // 1. Fetch all members / users associated with this workspace
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId }
    });
    
    const memberFirebaseUserIds = workspaceMembers.map(wm => wm.userId);
    const dbUserIds = await resolveDbUserIds(memberFirebaseUserIds);

    // Find all repositories where at least one workspace member is a RepositoryMember
    const memberRepos = await prisma.repositoryMember.findMany({
      where: { userId: { in: dbUserIds } },
      select: { repoId: true }
    });
    
    const linkedRepoIds = Array.from(
      new Set(memberRepos.map(mr => mr.repoId))
    );

    const repositories = await prisma.gitHubRepository.findMany({
      where: { id: { in: linkedRepoIds } }
    });

    // 2. Run sync Repository Telemetry for each
    let successCount = 0;
    for (const repo of repositories) {
      try {
        await syncRepositoryTelemetry(repo.id, dbExecutionUserId);
        successCount++;
      } catch (err) {
        console.error(`Failed to sync repository ${repo.name}:`, err);
      }
    }

    // 3. Populate ContributionMetric database caches
    const users = await prisma.user.findMany();
    for (const u of users) {
      for (const repoId of linkedRepoIds) {
        const userCommits = await prisma.commit.count({
          where: { repoId, authorName: u.githubUsername || u.fullName }
        });

        const userPRs = await prisma.pullRequest.count({
          where: { repoId, authorName: u.githubUsername || u.fullName }
        });

        const userClosedIssues = await prisma.issue.count({
          where: { repoId, authorName: u.githubUsername || u.fullName, state: "closed" }
        });

        const commitDifs = await prisma.commit.aggregate({
          where: { repoId, authorName: u.githubUsername || u.fullName },
          _sum: { additions: true, deletions: true }
        });

        const additions = commitDifs._sum.additions || 0;
        const deletions = commitDifs._sum.deletions || 0;

        const score = parseFloat((userCommits * 10.0 + userPRs * 25.0 + (additions + deletions) * 0.05).toFixed(1));

        await prisma.contributionMetric.upsert({
          where: {
            userId_workspaceId_repositoryId: {
              userId: u.id,
              workspaceId,
              repositoryId: repoId
            }
          },
          update: {
            commits: userCommits,
            pullRequests: userPRs,
            issuesClosed: userClosedIssues,
            linesAdded: additions,
            linesDeleted: deletions,
            contributionScore: score,
            calculatedAt: new Date()
          },
          create: {
            userId: u.id,
            workspaceId,
            repositoryId: repoId,
            commits: userCommits,
            pullRequests: userPRs,
            issuesClosed: userClosedIssues,
            linesAdded: additions,
            linesDeleted: deletions,
            contributionScore: score
          }
        });
      }
    }

    // 4. Save a Productivity Snapshot of the current active sprint
    const tasks = await prisma.task.findMany({ where: { workspaceId } });
    const completed = tasks.filter(t => t.status === "completed").length;
    const overdue = tasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const velocity = tasks.length > 0 ? parseFloat((completed / tasks.length).toFixed(2)) : 0.0;

    await prisma.productivitySnapshot.upsert({
      where: {
        workspaceId_sprintName: {
          workspaceId,
          sprintName: "Active Sprint"
        }
      },
      update: {
        completedTasks: completed,
        overdueTasks: overdue,
        velocity,
        workloadBalance: 1.0,
        generatedAt: new Date()
      },
      create: {
        workspaceId,
        sprintName: "Active Sprint",
        completedTasks: completed,
        overdueTasks: overdue,
        velocity,
        workloadBalance: 1.0
      }
    });

    return { success: true, count: successCount };
  } catch (error) {
    console.error("Workspace telemetry sync error:", error);
    return { success: false, error: "Failed to complete workspace telemetry synchronization." };
  }
}
