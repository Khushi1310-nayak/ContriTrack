"use server";

import { prisma } from "@/lib/db";
import {
  Workspace,
  WorkspaceMember,
  TeamActivity,
  MemberPresence,
  ContributionSummary
} from "@prisma/client";

/**
 * Helper to dynamically rotate a workspace's invite code if it was updated more than 5 minutes ago.
 * This guarantees 100% dynamic rotation with zero background scheduler dependencies.
 */
export async function rotateInviteCodeIfExpired(workspace: Workspace): Promise<Workspace> {
  const fiveMinutesInMs = 5 * 60 * 1000;
  const timeSinceUpdate = Date.now() - new Date(workspace.inviteCodeUpdatedAt).getTime();

  if (timeSinceUpdate > fiveMinutesInMs) {
    const newInviteCode = "CT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const updated = await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          inviteCode: newInviteCode,
          inviteCodeUpdatedAt: new Date()
        }
      });

      // Log rotation event as a system workspace log
      await prisma.teamActivity.create({
        data: {
          workspaceId: workspace.id,
          userId: workspace.ownerId,
          userFullName: "System",
          activityType: "role_change",
          metadata: "Invite code rotated automatically after 5 minutes."
        }
      });
      return updated;
    } catch (e) {
      console.error("Failed to automatically rotate invite code:", e);
    }
  }
  return workspace;
}

/**
 * Fetch all workspaces where the user is an active member.
 * If none exist, auto-creates a default Main Studio Workspace to ensure instant system operations.
 */
export async function fetchUserWorkspaces(userId: string) {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true }
    });

    const rawWorkspaces = memberships.map((m: { workspace: Workspace }) => m.workspace);

    // Apply dynamic 5-minute lazy-rotation check & update
    let workspaces = await Promise.all(
      rawWorkspaces.map(async (ws) => {
        return await rotateInviteCodeIfExpired(ws);
      })
    );

    return { success: true, workspaces };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to fetch user workspaces:", err);
    return { success: false, error: err.message || "Failed to load workspaces." };
  }
}

/**
 * Create a brand-new workspace with an auto-generated unique invite code.
 */
export async function createWorkspace(name: string, ownerId: string) {
  try {
    if (!name.trim()) {
      return { success: false, error: "Workspace name cannot be empty." };
    }

    const inviteCode = "CT-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId,
        inviteCode,
        members: {
          create: {
            userId: ownerId,
            role: "Owner",
            activityStatus: "online"
          }
        }
      }
    });

    // Add activity
    await prisma.teamActivity.create({
      data: {
        workspaceId: workspace.id,
        userId: ownerId,
        userFullName: "System",
        activityType: "join",
        metadata: `Created workspace "${name}".`
      }
    });

    return { success: true, workspace };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to create workspace:", err);
    return { success: false, error: err.message || "Failed to create workspace." };
  }
}

/**
 * Join an existing workspace using a unique 8-character invite code.
 */
export async function joinWorkspace(inviteCode: string, userId: string, fullName: string) {
  try {
    const code = inviteCode.trim().toUpperCase();
    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode: code }
    });

    if (!workspace) {
      return { success: false, error: "Invalid invite code. Workspace not found." };
    }

    // Check if invite code has expired (5 minutes)
    const fiveMinutesInMs = 5 * 60 * 1000;
    const timeSinceUpdate = Date.now() - new Date(workspace.inviteCodeUpdatedAt).getTime();
    if (timeSinceUpdate > fiveMinutesInMs) {
      await rotateInviteCodeIfExpired(workspace);
      return { success: false, error: "This invite code has expired (valid for 5 mins). Please ask the host for a fresh code." };
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId
        }
      }
    });

    if (existingMember) {
      return { success: false, error: "You are already a member of this workspace." };
    }

    // Join workspace
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "Contributor",
        activityStatus: "online"
      }
    });

    // Register Activity
    await prisma.teamActivity.create({
      data: {
        workspaceId: workspace.id,
        userId,
        userFullName: fullName,
        activityType: "join",
        metadata: `${fullName} joined the workspace.`
      }
    });

    return { success: true, workspace, member };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to join workspace:", err);
    return { success: false, error: err.message || "Failed to join workspace." };
  }
}

/**
 * Fetch all roster teammates registered in a specific workspace, resolving presence, contribution indexes and names.
 */
export async function fetchWorkspaceTeammates(workspaceId: string) {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { role: "asc" }
    });

    const userIds = members.map((m: WorkspaceMember) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: userIds } }
    });

    const presences = await prisma.memberPresence.findMany({
      where: { workspaceId }
    });

    const contributions = await prisma.contributionSummary.findMany({
      where: { workspaceId }
    });

    const formatted = members.map((m: WorkspaceMember) => {
      const user = users.find(u => u.id === m.userId);
      const profile = profiles.find(p => p.userId === m.userId);
      const presence = presences.find((p: MemberPresence) => p.userId === m.userId);
      const contribution = contributions.find((c: ContributionSummary) => c.userId === m.userId);

      return {
        id: m.id,
        userId: m.userId,
        fullName: user?.fullName || "Teammate",
        email: user?.email || "",
        role: m.role,
        contriTrackRole: profile?.roleInContriTrack || "Student",
        userType: profile?.userType || "Student",
        joinedAt: m.joinedAt.toISOString(),
        githubUsername: m.githubUsername || user?.githubUsername || "",
        avatarUrl: m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || "TM")}`,
        contributionScore: m.contributionScore || contribution?.contributionScore || 0,
        activityStatus: presence?.onlineStatus || m.activityStatus || "offline",
        lastSeen: presence?.lastSeen ? presence.lastSeen.toISOString() : m.joinedAt.toISOString(),
        activeRepository: presence?.activeRepository || null,
        activeTask: presence?.activeTask || null,
        stats: {
          commits: contribution?.commits || 0,
          pullRequests: contribution?.pullRequests || 0,
          reviews: contribution?.reviews || 0,
          tasksCompleted: contribution?.tasksCompleted || 0,
          meetingsAttended: contribution?.meetingsAttended || 0
        }
      };
    });

    return { success: true, teammates: formatted };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to fetch workspace teammates:", err);
    return { success: false, error: err.message || "Failed to load teammates." };
  }
}

/**
 * Safely change a member's role (Owner | Admin | Contributor | Viewer) inside a workspace.
 */
export async function updateMemberRole(
  workspaceId: string,
  memberUserId: string,
  newRole: string,
  requesterUserId: string
) {
  try {
    // 1. Fetch requester membership to assert credentials
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: requesterUserId
        }
      }
    });

    if (!requester || (requester.role !== "Owner" && requester.role !== "Admin")) {
      return { success: false, error: "Unauthorized. Only Owners or Admins can modify roles." };
    }

    // 2. Fetch target member details
    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId
        }
      }
    });

    if (!targetMember) {
      return { success: false, error: "Target member not found in this workspace." };
    }

    if (targetMember.role === "Owner" && requester.role !== "Owner") {
      return { success: false, error: "Only Owners can modify roles of other Owners." };
    }

    // 3. Update role
    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId
        }
      },
      data: { role: newRole }
    });

    // 4. Resolve user details for logs
    const user = await prisma.user.findUnique({ where: { id: memberUserId } });
    const memberName = user?.fullName || "Teammate";

    await prisma.teamActivity.create({
      data: {
        workspaceId,
        userId: memberUserId,
        userFullName: memberName,
        activityType: "role_change",
        metadata: `Role of ${memberName} updated to "${newRole}".`
      }
    });

    return { success: true, member: updated };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to update member role:", err);
    return { success: false, error: err.message || "Failed to modify role." };
  }
}

/**
 * Remove a member from the workspace entirely (e.g. kicking or self-leave).
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  memberUserId: string,
  requesterUserId: string
) {
  try {
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: requesterUserId
        }
      }
    });

    const isSelfLeave = memberUserId === requesterUserId;

    if (!isSelfLeave && (!requester || (requester.role !== "Owner" && requester.role !== "Admin"))) {
      return { success: false, error: "Unauthorized. Insufficient permissions to remove members." };
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId
        }
      }
    });

    if (!targetMember) {
      return { success: false, error: "Member not found in workspace." };
    }

    if (targetMember.role === "Owner" && !isSelfLeave) {
      return { success: false, error: "Workspace Owners cannot be removed. Transfer ownership first." };
    }

    // Handle Owner leaving the workspace
    if (targetMember.role === "Owner") {
      // 1. Delete associated tasks and meetings linked to this workspace first
      await prisma.task.deleteMany({ where: { workspaceId } });
      await prisma.meeting.deleteMany({ where: { workspaceId } });

      // 2. Delete the workspace itself (which automatically cascades to WorkspaceMember, TeamActivity, MemberPresence, ContributionSummary)
      await prisma.workspace.delete({ where: { id: workspaceId } });

      return { success: true };
    }

    // Remove member (non-owner)
    await prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: memberUserId }
    });

    // Also clear presence & contributions
    await prisma.memberPresence.deleteMany({
      where: { workspaceId, userId: memberUserId }
    });
    await prisma.contributionSummary.deleteMany({
      where: { workspaceId, userId: memberUserId }
    });

    // Add activity
    const user = await prisma.user.findUnique({ where: { id: memberUserId } });
    const memberName = user?.fullName || "Teammate";

    await prisma.teamActivity.create({
      data: {
        workspaceId,
        userId: memberUserId,
        userFullName: memberName,
        activityType: "role_change",
        metadata: isSelfLeave
          ? `${memberName} left the workspace.`
          : `${memberName} was removed from the workspace.`
      }
    });

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to remove member:", err);
    return { success: false, error: err.message || "Failed to remove member." };
  }
}

/**
 * Register periodic online presence checks for active workspace members.
 */
export async function updateUserPresence(
  workspaceId: string,
  userId: string,
  status: string, // "online" | "idle" | "offline"
  activeRepo?: string | null,
  activeTask?: string | null
) {
  try {
    const presence = await prisma.memberPresence.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      },
      update: {
        onlineStatus: status,
        lastSeen: new Date(),
        activeRepository: activeRepo || null,
        activeTask: activeTask || null
      },
      create: {
        workspaceId,
        userId,
        onlineStatus: status,
        lastSeen: new Date(),
        activeRepository: activeRepo || null,
        activeTask: activeTask || null
      }
    });

    // Also update dynamic status cache on WorkspaceMember
    await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      },
      data: {
        activityStatus: status
      }
    });

    return { success: true, presence };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to update user presence:", err);
    return { success: false, error: err.message || "Failed to sync presence." };
  }
}

/**
 * Retrieve workspace event feed activity logs.
 */
export async function fetchWorkspaceActivities(workspaceId: string) {
  try {
    const activities = await prisma.teamActivity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const userIds = Array.from(new Set(activities.map(a => a.userId).filter(Boolean))) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    return {
      success: true,
      activities: activities.map((act: TeamActivity) => {
        const user = users.find(u => u.id === act.userId);
        return {
          id: act.id,
          userId: act.userId,
          fullName: user?.fullName || act.userFullName,
          activityType: act.activityType,
          metadata: act.metadata || "",
          createdAt: act.createdAt.toISOString()
        };
      })
    };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to fetch workspace activities:", err);
    return { success: false, error: err.message || "Failed to load activity logs." };
  }
}

/**
 * Aggregate authentic engineering telemetry contributions inside the database.
 * Merges Git Commits share, PR lines, Kanban completed tasks count, and Meeting RSVPs.
 */
export async function calculateWorkspaceContributions(workspaceId: string) {
  try {
    // 1. Fetch workspace members
    const members = await prisma.workspaceMember.findMany({ where: { workspaceId } });
    if (members.length === 0) return { success: true };

    const userIds = members.map((m: WorkspaceMember) => m.userId);
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });

    // 2. Fetch tasks in this workspace to identify linked repositories
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      select: { repositoryId: true, assigneeId: true, status: true }
    });

    const repoIds = Array.from(
      new Set(tasks.map(t => t.repositoryId).filter(Boolean))
    ) as string[];

    // 3. For each teammate, compile authentic contribution numbers
    for (const member of members) {
      const user = users.find(u => u.id === member.userId);
      if (!user) continue;

      const userGitUsername = member.githubUsername || user.githubUsername || user.fullName;

      // Commits Count
      const commitsCount = await prisma.commit.count({
        where: {
          repoId: { in: repoIds },
          authorName: userGitUsername
        }
      });

      // Pull Request Count
      const prCount = await prisma.pullRequest.count({
        where: {
          repoId: { in: repoIds },
          authorName: userGitUsername
        }
      });

      // Completed Tasks count
      const completedTasksCount = tasks.filter(
        t => t.assigneeId === member.userId && t.status === "completed"
      ).length;

      // Meetings attended (RSVPs with status 'accepted' or 'attended')
      const meetingRsvpsCount = await prisma.meetingParticipant.count({
        where: {
          userId: member.userId,
          attendanceStatus: { in: ["accepted", "attended"] },
          meeting: { workspaceId }
        }
      });

      // Recalculate deep score: 10 per commit, 25 per PR, 15 per task completed, 10 per meeting attended
      const score = parseFloat(
        (commitsCount * 10.0 + prCount * 25.0 + completedTasksCount * 15.0 + meetingRsvpsCount * 10.0).toFixed(1)
      );

      // Upsert ContributionSummary
      await prisma.contributionSummary.upsert({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: member.userId
          }
        },
        update: {
          commits: commitsCount,
          pullRequests: prCount,
          tasksCompleted: completedTasksCount,
          meetingsAttended: meetingRsvpsCount,
          contributionScore: score
        },
        create: {
          workspaceId,
          userId: member.userId,
          commits: commitsCount,
          pullRequests: prCount,
          tasksCompleted: completedTasksCount,
          meetingsAttended: meetingRsvpsCount,
          contributionScore: score
        }
      });

      // Also sync back to WorkspaceMember score cache for instant indexing
      await prisma.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: member.userId
          }
        },
        data: {
          contributionScore: score
        }
      });
    }

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to calculate workspace contributions:", err);
    return { success: false, error: err.message || "Failed to calculate contributions." };
  }
}

/**
 * Delete a workspace entirely (Owner only).
 */
export async function deleteWorkspace(workspaceId: string, ownerId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    if (workspace.ownerId !== ownerId) {
      return { success: false, error: "Unauthorized. Only the owner can delete this workspace." };
    }

    // 1. Delete associated tasks, meetings, summaries, presences, activities
    await prisma.task.deleteMany({ where: { workspaceId } });
    await prisma.meeting.deleteMany({ where: { workspaceId } });
    await prisma.teamActivity.deleteMany({ where: { workspaceId } });
    await prisma.memberPresence.deleteMany({ where: { workspaceId } });
    await prisma.contributionSummary.deleteMany({ where: { workspaceId } });

    // 2. Delete the workspace member references
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } });

    // 3. Delete the workspace itself
    await prisma.workspace.delete({ where: { id: workspaceId } });

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to delete workspace:", err);
    return { success: false, error: err.message || "Failed to delete workspace." };
  }
}
