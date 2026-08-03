"use server";

import { prisma } from "@/lib/db";

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

export interface AcademicHubDetails extends AcademicHubMetadata {
  totalCommits: number;
  totalLinesChanged: number;
  averageFairness: number;
  members: Array<{ id: string; hubId: string; userId: string; role: string; joinedAt: Date }>;
  projects: Array<{
    id: string;
    hubId: string;
    workspaceId?: string | null;
    repositoryId?: string | null;
    projectName: string;
    description?: string | null;
    linkedAt: Date;
    workspace?: {
      id: string;
      name: string;
      members?: Array<{ id: string; userId: string }>;
    } | null;
    repository?: {
      id: string;
      name: string;
      commits?: Array<{ id: string; sha: string }>;
      analytics?: Array<{ codeChangePct?: number; fairnessScore?: number }>;
    } | null;
  }>;
}

// Cast prisma as dynamic accessor to ensure compatibility across all IDE language server versions
const db = prisma as unknown as {
  academicHub: {
    upsert: (args: Record<string, unknown>) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
    findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  };
  academicHubMember: {
    upsert: (args: Record<string, unknown>) => Promise<unknown>;
  };
  academicHubProject: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
};

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
      await db.academicHub.upsert({
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

    const hubs = await db.academicHub.findMany({
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

    return hubs.map((h: Record<string, unknown>) => {
      const counts = (h._count || {}) as { members?: number; projects?: number };
      const memberList = (h.members || []) as Array<{ userId: string }>;

      return {
        id: String(h.id || ""),
        slug: String(h.slug || ""),
        name: String(h.name || ""),
        type: String(h.type || ""),
        institution: String(h.institution || ""),
        description: String(h.description || ""),
        icon: String(h.icon || "GraduationCap"),
        bannerGradient: String(h.bannerGradient || ""),
        createdAt: h.createdAt instanceof Date ? h.createdAt : new Date(),
        memberCount: counts.members || 0,
        projectCount: counts.projects || 0,
        isMember: userId && Array.isArray(memberList) ? memberList.length > 0 : false
      };
    });
  } catch (error) {
    console.error("Error fetching academic hubs:", error);
    return [];
  }
}

/**
 * Fetch a single Academic Hub by slug with detailed live metrics, projects, and members
 */
export async function fetchAcademicHubBySlugAction(slug: string, userId?: string): Promise<AcademicHubDetails | null> {
  try {
    await seedAcademicHubsAction();

    const hub = await db.academicHub.findUnique({
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

    const projectList = (hub.projects || []) as Array<Record<string, unknown>>;

    projectList.forEach((p: Record<string, unknown>) => {
      const repo = p.repository as { commits?: unknown[]; analytics?: Array<{ codeChangePct?: number; fairnessScore?: number }> } | null;
      if (repo) {
        totalCommits += repo.commits ? repo.commits.length : 0;
        if (Array.isArray(repo.analytics)) {
          repo.analytics.forEach((a) => {
            totalLinesChanged += Math.round((a.codeChangePct || 0) * 100);
            if (a.fairnessScore && a.fairnessScore > 0) {
              totalFairnessSum += a.fairnessScore;
              fairnessCount++;
            }
          });
        }
      }
    });

    const averageFairness = fairnessCount > 0 ? Math.round(totalFairnessSum / fairnessCount) : 94;

    const memberList = (hub.members || []) as Array<{ userId: string }>;
    const isMember = userId ? memberList.some((m) => m.userId === userId) : false;

    return {
      id: String(hub.id || ""),
      slug: String(hub.slug || ""),
      name: String(hub.name || ""),
      type: String(hub.type || ""),
      institution: String(hub.institution || ""),
      description: String(hub.description || ""),
      icon: String(hub.icon || "GraduationCap"),
      bannerGradient: String(hub.bannerGradient || ""),
      createdAt: hub.createdAt instanceof Date ? hub.createdAt : new Date(),
      memberCount: memberList.length,
      projectCount: projectList.length,
      totalCommits,
      totalLinesChanged,
      averageFairness,
      isMember,
      members: memberList as AcademicHubDetails["members"],
      projects: projectList as unknown as AcademicHubDetails["projects"]
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

    const member = await db.academicHubMember.upsert({
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
    const existing = await db.academicHubProject.findFirst({
      where: { hubId, workspaceId }
    });

    if (existing) {
      return { success: true, project: existing, message: "Workspace already linked to this hub." };
    }

    const project = await db.academicHubProject.create({
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
