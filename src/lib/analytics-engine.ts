import { prisma } from "./db";

/**
 * Calculates real-time Git contribution telemetry metrics
 * including Jain's Fairness Index, active day counts, commit load,
 * and code change densities.
 */
export async function recalculateContributionAnalytics(repoId: string) {
  // 1. Fetch Repository Members
  const members = await prisma.repositoryMember.findMany({
    where: { repoId },
  });

  if (members.length === 0) return;

  // 2. Fetch Commits
  const commits = await prisma.commit.findMany({
    where: { repoId },
  });

  const totalCommits = commits.length;
  let totalAdditions = 0;
  let totalDeletions = 0;

  commits.forEach((c) => {
    totalAdditions += c.additions;
    totalDeletions += c.deletions;
  });

  const totalLines = totalAdditions + totalDeletions;

  // Trackers per developer
  const commitCounts: Record<string, number> = {};
  const linesModified: Record<string, number> = {};
  const activeDaysMap: Record<string, Set<string>> = {};

  // Initialize
  members.forEach((m) => {
    commitCounts[m.gitUsername] = 0;
    linesModified[m.gitUsername] = 0;
    activeDaysMap[m.gitUsername] = new Set<string>();
  });

  // Calculate totals per developer
  commits.forEach((c) => {
    const author = c.authorName;
    if (commitCounts[author] !== undefined) {
      commitCounts[author]++;
      linesModified[author] += c.additions + c.deletions;
      const dateStr = new Date(c.authoredAt).toISOString().split("T")[0];
      activeDaysMap[author].add(dateStr);
    }
  });

  // Calculate Jain's Fairness Index for Commits
  // Formula: (sum(x_i))^2 / (n * sum(x_i^2))
  // Indicates commit distribution equality (0 to 100%)
  let sumCommits = 0;
  let sumSqCommits = 0;
  const n = members.length;

  members.forEach((m) => {
    const x = commitCounts[m.gitUsername];
    sumCommits += x;
    sumSqCommits += x * x;
  });

  const commitFairnessScore = sumSqCommits > 0 
    ? Math.round(((sumCommits * sumCommits) / (n * sumSqCommits)) * 100) 
    : 100;

  // 3. Fetch Pull Requests for advanced telemetry
  const prs = await prisma.pullRequest.findMany({
    where: { repoId }
  });

  const prTimes: Record<string, number[]> = {};
  const prCounts: Record<string, number> = {};

  members.forEach((m) => {
    prTimes[m.gitUsername] = [];
    prCounts[m.gitUsername] = 0;
  });

  prs.forEach(pr => {
    const author = pr.authorName;
    if (prTimes[author] !== undefined) {
      prCounts[author]++;
      if (pr.mergedAt && pr.createdAt) {
        const diffMs = pr.mergedAt.getTime() - pr.createdAt.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        prTimes[author].push(diffHours);
      }
    }
  });

  // Calculate & cache metrics for each member
  for (const member of members) {
    const username = member.gitUsername;
    const userCommits = commitCounts[username];
    const userLines = linesModified[username];
    const activeDaysCount = activeDaysMap[username].size;

    const commitSharePct = totalCommits > 0 ? (userCommits / totalCommits) * 100 : 0;
    const codeChangePct = totalLines > 0 ? (userLines / totalLines) * 100 : 0;

    // Calculate PR Merge Time Average
    const userPrTimes = prTimes[username];
    let prMergeTimeAvg = 0;
    if (userPrTimes.length > 0) {
      prMergeTimeAvg = Math.round((userPrTimes.reduce((a, b) => a + b, 0) / userPrTimes.length) * 10) / 10;
    }

    // Proxy calculation for Review Quality Score based on PR volume and lines modified
    // Real code review telemetry would use octokit review APIs directly
    const userPrCount = prCounts[username];
    const reviewQualityScore = Math.min(100, Math.round((userPrCount * 15) + (userLines / 500)));

    // Calculate dynamic burnout index: high line count and commit share in short active windows
    const burnoutIndex = Math.min(
      100,
      Math.round(
        (commitSharePct * 0.3) + 
        (Math.min(userLines, 10000) / 100) + 
        (activeDaysCount * 2)
      )
    );

    // Upsert into cached analytics table
    await prisma.contributionAnalytics.upsert({
      where: {
        repoId_gitUsername: {
          repoId,
          gitUsername: username,
        }
      },
      update: {
        commitSharePct,
        codeChangePct,
        fairnessScore: commitFairnessScore,
        burnoutIndex,
        activeDays: activeDaysCount,
        prMergeTimeAvg,
        reviewQualityScore,
      },
      create: {
        repoId,
        gitUsername: username,
        commitSharePct,
        codeChangePct,
        fairnessScore: commitFairnessScore,
        burnoutIndex,
        activeDays: activeDaysCount,
        prMergeTimeAvg,
        reviewQualityScore,
      }
    });
  }
}
