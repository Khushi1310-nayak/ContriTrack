import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncRepositoryTelemetry } from "@/lib/github-service";
import { recalculateContributionAnalytics } from "@/lib/analytics-engine";

/**
 * Endpoint receiving live webhook requests from bridged GitHub repositories,
 * automating background sync cycles upon commit push, issue updates, or pull requests.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const githubId = String(payload.repository?.id);

    if (!githubId) {
      return NextResponse.json({ error: "Missing repository identity specs" }, { status: 400 });
    }

    // Identify if the repository is actively bridged inside our database
    const repository = await prisma.gitHubRepository.findUnique({
      where: { githubId },
    });

    if (!repository) {
      return NextResponse.json({ message: "Repository is not bridged inside this workspace." }, { status: 200 });
    }

    // Locate active lead developer in database to authorize Octokit request
    const leadCollab = await prisma.repositoryMember.findFirst({
      where: {
        repoId: repository.id,
        role: "lead",
        userId: { not: null }
      }
    });

    if (leadCollab && leadCollab.userId) {
      // Trigger complete telemetry sync
      await syncRepositoryTelemetry(repository.id, leadCollab.userId);
      await recalculateContributionAnalytics(repository.id);

      // Record logs
      await prisma.repositorySyncLog.create({
        data: {
          repoId: repository.id,
          status: "success",
          message: `Real-time webhook sync completed. Triggered by push event from ${payload.pusher?.name || "contributor"}.`,
          trigger: "webhook",
        }
      });
    }

    return NextResponse.json({ success: true, message: "Real-time sync sequence finalized successfully." });
  } catch (error: unknown) {
    console.error("Webhook receiver processing error:", error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
