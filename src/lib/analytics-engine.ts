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

  // Calculate & cache metrics for each member
  for (const member of members) {
    const userCommits = commitCounts[member.gitUsername];
    const userLines = linesModified[member.gitUsername];
    const activeDaysCount = activeDaysMap[member.gitUsername].size;

    const commitSharePct = totalCommits > 0 ? (userCommits / totalCommits) * 100 : 0;
    const codeChangePct = totalLines > 0 ? (userLines / totalLines) * 100 : 0;

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
          gitUsername: member.gitUsername,
        }
      },
      update: {
        commitSharePct,
        codeChangePct,
        fairnessScore: commitFairnessScore,
        burnoutIndex,
        activeDays: activeDaysCount,
      },
      create: {
        repoId,
        gitUsername: member.gitUsername,
        commitSharePct,
        codeChangePct,
        fairnessScore: commitFairnessScore,
        burnoutIndex,
        activeDays: activeDaysCount,
      }
    });
  }
}
