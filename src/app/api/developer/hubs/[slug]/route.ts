import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
    if (!authCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error || "Invalid token" },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    // Fetch specific hub
    const hub = await prisma.academicHub.findUnique({
      where: { slug },
      include: {
        members: true,
        projects: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                members: {
                  select: { userId: true, role: true, contributionScore: true }
                }
              }
            },
            repository: {
              select: {
                id: true,
                name: true,
                stars: true,
                openIssues: true
              }
            }
          }
        }
      }
    });

    if (!hub) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: `Academic Hub '${slug}' does not exist.` },
        { status: 404 }
      );
    }

    // Compute aggregate metrics across linked projects
    let totalMembersAcrossProjects = 0;
    const scores: number[] = [];

    hub.projects.forEach(p => {
      if (p.workspace?.members) {
        totalMembersAcrossProjects += p.workspace.members.length;
        p.workspace.members.forEach(m => {
          if (m.contributionScore) scores.push(m.contributionScore);
        });
      }
    });

    const avgFairness = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 85;

    return NextResponse.json({
      success: true,
      hub: {
        id: hub.id,
        slug: hub.slug,
        name: hub.name,
        type: hub.type,
        institution: hub.institution,
        description: hub.description,
        icon: hub.icon,
        directMemberCount: hub.members.length,
        linkedProjectsCount: hub.projects.length,
        totalActiveResearchers: totalMembersAcrossProjects,
        averageFairnessIndex: avgFairness,
        createdAt: hub.createdAt
      },
      linkedProjects: hub.projects.map(p => ({
        id: p.id,
        projectName: p.projectName,
        description: p.description,
        workspaceId: p.workspaceId,
        workspaceName: p.workspace?.name || null,
        membersCount: p.workspace?.members.length || 0,
        linkedAt: p.linkedAt,
        repository: p.repository ? {
          name: p.repository.name,
          openIssues: p.repository.openIssues,
          stars: p.repository.stars
        } : null
      }))
    });
  } catch (error: unknown) {
    console.error("Developer Hub Detail API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
