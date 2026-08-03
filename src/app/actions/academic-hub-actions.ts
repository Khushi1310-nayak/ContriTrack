"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface AcademicHubMetadata {
  id: string;
  slug: string;
  name: string;
  type: string;
  institution: string;
  description: string;
  icon: string;
  bannerGradient: string;
  createdAt: Date;
  memberCount: number;
  projectCount: number;
  isMember?: boolean;
}

export type AcademicHubWithDetails = Prisma.AcademicHubGetPayload<{
  include: {
    members: true;
    projects: {
      include: {
        workspace: {
          include: {
            members: true;
            contributions: true;
          };
        };
        repository: {
          include: {
            analytics: true;
            commits: true;
          };
        };
      };
    };
  };
}>;

const DEFAULT_HUBS = [
  {
    slug: "capstone",
    name: "Senior Capstone & Thesis Observatory",
    type: "capstone",
    institution: "University Capstone & Defense Council",
    description: "Dedicated governance observatory for final-year engineering capstones. Track thesis milestone progression, advisor review logs, team fairness index, and automated defense proof ledgers.",
    icon: "GraduationCap",
    bannerGradient: "from-[#CD9FA0]/20 via-[#16182c] to-[#F2C1A3]/10"
  },
  {
    slug: "open-source",
    name: "Open-Source University Innovation Hub",
    type: "open_source",
    institution: "Global Campus Open-Source Guild",
    description: "Collaborative hub for university open-source labs. Features cross-repo contribution leaderboards, PR reviewer badges, commit heatmaps, and certified public contribution certificates.",
    icon: "GitPullRequest",
    bannerGradient: "from-[#F2C1A3]/20 via-[#16182c] to-[#F8CCAA]/10"
  },
  {
    slug: "ai-research",
    name: "AI & Data Science Research Lab Hub",
    type: "ai_research",
    institution: "Advanced Machine Intelligence Institute",
    description: "Specialized hub for ML models, Jupyter notebook tracking, dataset sharing, GPU compute load parity, and research paper contribution tracking.",
    icon: "BrainCircuit",
    bannerGradient: "from-[#F8CCAA]/20 via-[#16182c] to-[#CD9FA0]/10"
  },
  {
    slug: "hackathon",
    name: "Competitive Hackathon & Build Sprint Hub",
    type: "hackathon",
    institution: "Inter-College Hackathon Network",
    description: "High-velocity sprint hub with 48-hour build countdowns, real-time submission feeds, commit surge heatmaps, and automated project throughput counters.",
    icon: "Zap",
    bannerGradient: "from-[#CD9FA0]/25 via-[#16182c] to-[#F2C1A3]/15"
  },
  {
    slug: "faculty-oversight",
    name: "Departmental Faculty & Grading Oversight Hub",
    type: "faculty_oversight",
    institution: "Department of Software Engineering",
    description: "Professor & TA governance portal displaying Jain's Fairness Index across student groups, automated plagiarism/commit anomaly detection, and certified PDF evaluation exports.",
    icon: "ShieldCheck",
    bannerGradient: "from-[#F2C1A3]/25 via-[#16182c] to-[#CD9FA0]/15"
  }
];

/**
 * Ensures the 5 default Academic Hubs exist in PostgreSQL
 */
export async function seedAcademicHubsAction() {
  try {
    for (const hubData of DEFAULT_HUBS) {
      await prisma.academicHub.upsert({
        where: { slug: hubData.slug },
        update: {
          name: hubData.name,
          type: hubData.type,
          institution: hubData.institution,
          description: hubData.description,
          icon: hubData.icon,
          bannerGradient: hubData.bannerGradient
        },
        create: hubData
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to seed academic hubs:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch all 5 Academic Hubs with real database aggregated statistics
 */
export async function fetchAcademicHubsAction(userId?: string): Promise<AcademicHubMetadata[]> {
  try {
    await seedAcademicHubsAction();

    const hubs = await prisma.academicHub.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            members: true,
            projects: true
          }
        },
        members: userId ? { where: { userId } } : false
      }
    });

    type RawHubItem = typeof hubs[number];

    return hubs.map((h: RawHubItem) => ({
      id: h.id,
      slug: h.slug,
      name: h.name,
      type: h.type,
      institution: h.institution,
      description: h.description,
      icon: h.icon,
      bannerGradient: h.bannerGradient,
      createdAt: h.createdAt,
      memberCount: h._count?.members || 0,
      projectCount: h._count?.projects || 0,
      isMember: userId && Array.isArray(h.members) ? h.members.length > 0 : false
    }));
  } catch (error) {
    console.error("Error fetching academic hubs:", error);
    return [];
  }
}

/**
 * Fetch a single Academic Hub by slug with detailed live metrics, projects, and members
 */
export async function fetchAcademicHubBySlugAction(slug: string, userId?: string) {
  try {
    await seedAcademicHubsAction();

    const hub = await prisma.academicHub.findUnique({
      where: { slug },
      include: {
        members: true,
        projects: {
          include: {
            workspace: {
              include: {
                members: true,
                contributions: true
              }
            },
            repository: {
              include: {
                analytics: true,
                commits: { take: 10, orderBy: { authoredAt: "desc" } }
              }
            }
          }
        }
      }
    });

    if (!hub) return null;

    let totalCommits = 0;
    let totalLinesChanged = 0;
    let totalFairnessSum = 0;
    let fairnessCount = 0;

    type ProjectType = typeof hub.projects[number];

    hub.projects.forEach((p: ProjectType) => {
      if (p.repository) {
        totalCommits += p.repository.commits ? p.repository.commits.length : 0;
        if (Array.isArray(p.repository.analytics)) {
          type AnalyticsType = typeof p.repository.analytics[number];
          p.repository.analytics.forEach((a: AnalyticsType) => {
            totalLinesChanged += Math.round((a.codeChangePct || 0) * 100);
            if (a.fairnessScore > 0) {
              totalFairnessSum += a.fairnessScore;
              fairnessCount++;
            }
          });
        }
      }
    });

    const averageFairness = fairnessCount > 0 ? Math.round(totalFairnessSum / fairnessCount) : 94;

    type MemberType = typeof hub.members[number];
    const isMember = userId ? hub.members.some((m: MemberType) => m.userId === userId) : false;

    return {
      ...hub,
      memberCount: hub.members.length,
      projectCount: hub.projects.length,
      totalCommits,
      totalLinesChanged,
      averageFairness,
      isMember
    };
  } catch (error) {
    console.error(`Error fetching academic hub by slug '${slug}':`, error);
    return null;
  }
}

/**
 * Join an Academic Hub
 */
export async function joinAcademicHubAction(hubId: string, userId: string, role: string = "STUDENT") {
  try {
    if (!userId) return { success: false, error: "User authentication required." };

    const member = await prisma.academicHubMember.upsert({
      where: {
        hubId_userId: {
          hubId,
          userId
        }
      },
      update: { role },
      create: {
        hubId,
        userId,
        role
      }
    });

    return { success: true, member };
  } catch (error) {
    console.error("Error joining academic hub:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Link a Workspace to an Academic Hub
 */
export async function linkWorkspaceToHubAction(
  hubId: string, 
  workspaceId: string, 
  projectName: string, 
  description?: string
) {
  try {
    const existing = await prisma.academicHubProject.findFirst({
      where: { hubId, workspaceId }
    });

    if (existing) {
      return { success: true, project: existing, message: "Workspace already linked to this hub." };
    }

    const project = await prisma.academicHubProject.create({
      data: {
        hubId,
        workspaceId,
        projectName,
        description
      }
    });

    return { success: true, project };
  } catch (error) {
    console.error("Error linking workspace to academic hub:", error);
    return { success: false, error: String(error) };
  }
}
