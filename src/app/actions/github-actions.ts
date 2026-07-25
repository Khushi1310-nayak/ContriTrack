"use server";

import { prisma } from "@/lib/db";
import { getUserRepositories, syncRepositoryTelemetry } from "@/lib/github-service";
import { recalculateContributionAnalytics } from "@/lib/analytics-engine";

async function getDbUserId(userId: string): Promise<string> {
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

/**
 * Checks if the user profile has linked a GitHub OAuth profile.
 */
export async function checkGitHubConnection(userId: string) {
  try {
    const dbUserId = await getDbUserId(userId);
    const account = await prisma.gitHubAccount.findUnique({
      where: { userId: dbUserId },
      select: {
        username: true,
        avatarUrl: true,
        createdAt: true,
      }
    });
    return { connected: !!account, account };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Database connection error";
    console.error("Failed to check GitHub integration connection:", error);
    return { connected: false, error: errMsg };
  }
}

/**
 * Fetches all available repositories from GitHub using the user's decrypted OAuth token.
 */
export async function fetchAvailableRepositories(userId: string) {
  try {
    const dbUserId = await getDbUserId(userId);
    const repos = await getUserRepositories(dbUserId);
    return { success: true, repositories: repos };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to load repositories";
    console.error("Failed to fetch user repositories from GitHub OAuth client:", error);
    return { success: false, error: errMsg };
  }
}

/**
 * Adds selected repository details to our local workspace database and triggers initial sync.
 */
export async function linkRepository(userId: string, repoData: {
  githubId: string;
  owner: string;
  name: string;
  description?: string;
  url: string;
  visibility: string;
  language?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
}) {
  try {
    const dbUserId = await getDbUserId(userId);
    // Check if repository has already been linked in the database
    let repo = await prisma.gitHubRepository.findUnique({
      where: { githubId: repoData.githubId },
    });

    if (!repo) {
      repo = await prisma.gitHubRepository.create({
        data: {
          githubId: repoData.githubId,
          owner: repoData.owner,
          name: repoData.name,
          description: repoData.description || "",
          url: repoData.url,
          visibility: repoData.visibility,
          language: repoData.language || "TypeScript",
          stars: repoData.stars || 0,
          forks: repoData.forks || 0,
          openIssues: repoData.openIssues || 0,
        }
      });
    }

    // Connect authorized user as repository member
    const account = await prisma.gitHubAccount.findUnique({
      where: { userId: dbUserId },
    });

    if (account) {
      await prisma.repositoryMember.upsert({
        where: {
          repoId_gitUsername: {
            repoId: repo.id,
            gitUsername: account.username,
          }
        },
        update: {
          userId: dbUserId,
          role: "lead", // Setting linking user as lead contributor by default
        },
        create: {
          repoId: repo.id,
          gitUsername: account.username,
          gitAvatarUrl: account.avatarUrl || "https://avatars.githubusercontent.com/u/583231?v=4",
          userId: dbUserId,
          role: "lead",
        }
      });
    }

    // Execute background synchronizations for immediate render
    try {
      await syncRepositoryTelemetry(repo.id, dbUserId);
      await recalculateContributionAnalytics(repo.id);
    } catch (syncErr) {
      console.warn("Initial sync failed, fallback mock logs generated:", syncErr);
    }

    return { success: true, repository: repo };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to link repository";
    console.error("Failed to bridge and link repository:", error);
    return { success: false, error: errMsg };
  }
}

/**
 * Triggers complete telemetry synchronization cycle.
 */
export async function triggerRepositorySync(repoId: string, userId: string) {
  try {
    const dbUserId = await getDbUserId(userId);
    await syncRepositoryTelemetry(repoId, dbUserId);
    await recalculateContributionAnalytics(repoId);
    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Sync execution failed";
    console.error("Manual repository telemetry sync trigger failed:", error);
    return { success: false, error: errMsg };
  }
}

/**
 * Loads all connected repositories mapped to the user's workspace profile.
 */
export async function fetchLinkedRepositories(userId: string) {
  try {
    const dbUserId = await getDbUserId(userId);
    const memberRepos = await prisma.repositoryMember.findMany({
      where: { userId: dbUserId },
      select: { repoId: true }
    });

    const repoIds = memberRepos.map(mr => mr.repoId);

    const repositories = await prisma.gitHubRepository.findMany({
      where: {
        id: { in: repoIds }
      },
      include: {
        members: true,
        analytics: true,
        syncLogs: {
          orderBy: { syncedAt: "desc" },
          take: 1
        }
      }
    });

    const formatted = repositories.map(repo => {
      const lastSyncLog = repo.syncLogs[0] || null;
      return {
        id: repo.id,
        githubId: repo.githubId,
        owner: repo.owner,
        name: repo.name,
        description: repo.description,
        url: repo.url,
        visibility: repo.visibility,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        branchesCount: repo.branchesCount,
        lastCommitAt: repo.lastCommitAt ? repo.lastCommitAt.toISOString() : null,
        lastSyncedAt: repo.lastSyncedAt ? repo.lastSyncedAt.toISOString() : null,
        webhookActive: repo.webhookActive,
        collaboratorCount: repo.members.length,
        members: repo.members.map(m => ({
          username: m.gitUsername,
          avatar: m.gitAvatarUrl,
          role: m.role
        })),
        analytics: repo.analytics.map(a => ({
          username: a.gitUsername,
          commitShare: Math.round(a.commitSharePct),
          codeChangeShare: Math.round(a.codeChangePct),
          fairness: Math.round(a.fairnessScore),
          burnout: Math.round(a.burnoutIndex),
          activeDays: a.activeDays
        })),
        lastSyncStatus: lastSyncLog ? lastSyncLog.status : "idle",
        lastSyncMessage: lastSyncLog ? lastSyncLog.message : "Sync pending initialize."
      };
    });

    return { success: true, repositories: formatted };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to load linked repositories";
    console.error("Failed to load linked repositories:", error);
    return { success: false, error: errMsg };
  }
}

/**
 * Disconnects the user's GitHub integration.
 */
export async function disconnectGitHubAccount(userId: string) {
  try {
    const dbUserId = await getDbUserId(userId);
    const memberRepos = await prisma.repositoryMember.findMany({
      where: { userId: dbUserId },
      select: { repoId: true }
    });

    const repoIds = memberRepos.map(mr => mr.repoId);
    
    // CASCADE purge all repositories and related telemetry
    if (repoIds.length > 0) {
      await prisma.gitHubRepository.deleteMany({
        where: { id: { in: repoIds } }
      });
    }

    await prisma.gitHubAccount.delete({
      where: { userId: dbUserId }
    });

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to disconnect account";
    console.error("Failed to disconnect GitHub account:", error);
    return { success: false, error: errMsg };
  }
}

/**
 * Loads all detailed telemetry logs (commits, pull requests, issues) for rendering in dashboards.
 */
export async function fetchRepositoryAnalyticsDetails(repoId: string) {
  try {
    const repo = await prisma.gitHubRepository.findUnique({
      where: { id: repoId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: { cicdPassRate: true } as any
    });

    const commits = await prisma.commit.findMany({
      where: { repoId },
      orderBy: { authoredAt: "desc" },
      take: 20
    });

    const prs = await prisma.pullRequest.findMany({
      where: { repoId },
      orderBy: { createdAt: "desc" },
      take: 15
    });

    const issues = await prisma.issue.findMany({
      where: { repoId },
      orderBy: { createdAt: "desc" },
      take: 15
    });

    const analytics = await prisma.contributionAnalytics.findMany({
      where: { repoId }
    });

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cicdPassRate: (repo as any)?.cicdPassRate || 0,
      commits: commits.map(c => ({
        sha: c.sha.substring(0, 7),
        message: c.message,
        author: c.authorName,
        additions: c.additions,
        deletions: c.deletions,
        time: c.authoredAt.toISOString()
      })),
      prs: prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.authorName,
        createdAt: pr.createdAt.toISOString()
      })),
      issues: issues.map(iss => ({
        number: iss.number,
        title: iss.title,
        state: iss.state,
        author: iss.authorName,
        createdAt: iss.createdAt.toISOString()
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analytics: analytics.map((a: any) => ({
        username: a.gitUsername,
        commitShare: Math.round(a.commitSharePct),
        codeChangeShare: Math.round(a.codeChangePct),
        fairness: Math.round(a.fairnessScore),
        burnout: Math.round(a.burnoutIndex),
        activeDays: a.activeDays,
        prMergeTimeAvg: a.prMergeTimeAvg,
        reviewQualityScore: a.reviewQualityScore
      }))
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Database telemetry fetch failed";
    console.error("Failed to load repository telemetry metrics logs:", error);
    return { success: false, error: errMsg };
  }
}

/**
 * Fully deletes/unlinks a repository and all of its nested telemetry models cascade-deleted from the database.
 */
export async function deleteRepository(repoId: string) {
  try {
    const repo = await prisma.gitHubRepository.findUnique({
      where: { id: repoId }
    });

    if (!repo) {
      return { success: false, error: "Repository not found." };
    }

    await prisma.gitHubRepository.delete({
      where: { id: repoId }
    });

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fully delete repository.";
    console.error("Failed to fully delete repository:", error);
    return { success: false, error: errMsg };
  }
}
