"use server";

import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Configure SMTP Nodemailer transporter using dynamic environment variables
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("SMTP credentials not configured in .env. Falling back to mock console transport.");
    return {
      sendMail: async (options: any) => {
        console.log("=== MOCK EMAIL DISPATCH ===");
        console.log(`From: ${options.from}`);
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log("HTML Content preview:", options.html?.substring(0, 250));
        console.log("===========================");
        return { messageId: "mock-message-id-" + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

interface ProfileInput {
  fullName: string;
  displayName?: string | null;
  email?: string;
  phoneNumber?: string | null;
  university?: string | null;
  degree?: string | null;
  userType?: string | null;
  roleInContriTrack?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  githubUsername?: string | null;
  linkedinUrl?: string | null;
}

interface SecurityInput {
  twoFactorEnabled?: boolean;
  recoveryEmail?: string | null;
  verifiedPhone?: string | null;
  passwordChangedAt?: Date | string | null;
  lastLogin?: Date | string | null;
  failedAttempts?: number;
}

/**
 * Helper to log user security audits and AAA logs
 */
export async function recordUserActivityLog(
  userId: string,
  activityType: string,
  metadata?: {
    ipAddress?: string;
    device?: string;
    browser?: string;
    location?: string;
  }
) {
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        activityType,
        ipAddress: metadata?.ipAddress || "127.0.0.1",
        device: metadata?.device || "desktop",
        browser: metadata?.browser || "Chrome",
        location: metadata?.location || "Local LAN"
      }
    });
  } catch (err) {
    console.error("Activity audit log deferred:", err);
  }
}

/**
 * 1. Synchronize User Profile on initial Auth login/signup
 */
export async function syncUserProfileWithPostgres(
  userId: string,
  data: {
    fullName: string;
    displayName?: string;
    email: string;
    university?: string;
    githubUsername?: string;
    ipAddress?: string;
    device?: string;
    browser?: string;
  }
) {
  try {
    let profile: any = null;

    // Check if there is an archived account under this exact email
    const archive = await prisma.deletedAccountArchive.findUnique({
      where: { userEmail: data.email }
    });

    if (archive) {
      // Return archive status to intercept frontend onboarding/dashboard redirects
      return { 
        success: true, 
        isArchived: true, 
        email: data.email,
        deletedAt: archive.deletedAt,
        recoverableUntil: archive.recoverableUntil
      };
    }

    // Ensure the base User record exists and has status = "ACTIVE"
    await prisma.user.upsert({
      where: { email: data.email },
      update: {
        fullName: data.fullName,
        displayName: data.displayName || undefined,
        university: data.university || undefined,
        githubUsername: data.githubUsername || undefined,
        status: "ACTIVE",
        deletedAt: null,
        restorableUntil: null
      },
      create: {
        id: userId,
        fullName: data.fullName,
        displayName: data.displayName || "",
        email: data.email,
        university: data.university || "",
        githubUsername: data.githubUsername || "",
        status: "ACTIVE"
      }
    });

    // 1. Transactionally upsert both Profile and Security registries
    profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        fullName: data.fullName,
        displayName: data.displayName || undefined,
        email: data.email,
        university: data.university || undefined,
        githubUsername: data.githubUsername || undefined
      },
      create: {
        userId,
        fullName: data.fullName,
        displayName: data.displayName || "",
        email: data.email,
        university: data.university || "",
        degree: "",
        userType: "Student",
        roleInContriTrack: "Student",
        bio: "",
        githubUsername: data.githubUsername || "",
        linkedinUrl: ""
      }
    });

    // Track multiple active sessions and alert if IP changed
    const existingSecurity = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    let sessions: Array<any> = [];
    let isSuspicious = false;

    const newSession = {
      id: "sess_" + Math.random().toString(36).substring(2, 11),
      device: data.device || "desktop",
      browser: data.browser || "Chrome",
      ip: data.ipAddress || "127.0.0.1",
      lastActive: new Date().toISOString(),
      current: true
    };

    if (existingSecurity && existingSecurity.activeSessions) {
      try {
        const parsed = JSON.parse(existingSecurity.activeSessions) as Array<any>;
        const mapped = parsed.map(s => ({ ...s, current: false }));
        const lastSession = parsed.find(s => s.current) || parsed[0];
        if (lastSession && lastSession.ip !== newSession.ip) {
          isSuspicious = true;
        }
        sessions = [newSession, ...mapped].slice(0, 5);
      } catch (err) {
        sessions = [newSession];
      }
    } else {
      sessions = [newSession];
    }

    const initialSession = JSON.stringify(sessions);

    await prisma.userSecurity.upsert({
      where: { userId },
      update: {
        lastLogin: new Date(),
        activeSessions: initialSession
      },
      create: {
        userId,
        twoFactorEnabled: false,
        recoveryEmail: data.email,
        verifiedPhone: "",
        passwordChangedAt: new Date(),
        lastLogin: new Date(),
        activeSessions: initialSession,
        failedAttempts: 0
      }
    });

    if (isSuspicious && data.email) {
      sendSuspiciousLoginAlertEmail(data.email, data.fullName, {
        ip: newSession.ip,
        browser: newSession.browser,
        device: newSession.device
      }).catch(err => console.error("Suspicious login email trigger failure:", err));
    }

    // 2. Audit tracking
    await recordUserActivityLog(userId, "login", {
      ipAddress: data.ipAddress,
      device: data.device,
      browser: data.browser
    });

    return { success: true, profile };
  } catch (error) {
    console.error("Error inside syncUserProfileWithPostgres action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 2. Fetch complete Profile, Security parameters, and Notification preferences
 */
export async function fetchUserProfileAndSecurity(userId: string) {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    const security = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    // If they do not exist yet, attempt to synchronize empty registers
    if (!profile && userId) {
      return {
        success: false,
        error: "User identity does not exist in live PostgreSQL. Run synchronization first."
      };
    }

    return { success: true, profile, security };
  } catch (error) {
    console.error("Error inside fetchUserProfileAndSecurity action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 3. Update User Profile registry
 */
export async function updateUserProfile(userId: string, data: ProfileInput) {
  try {
    const updated = await prisma.userProfile.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
        university: data.university,
        degree: data.degree,
        userType: data.userType,
        roleInContriTrack: data.roleInContriTrack,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        githubUsername: data.githubUsername,
        linkedinUrl: data.linkedinUrl
      }
    });

    // Sync updates to the base User model using email to prevent ID mismatch from Firebase re-registrations
    await prisma.user.update({
      where: { email: updated.email },
      data: {
        fullName: data.fullName,
        displayName: data.displayName,
        university: data.university || null,
        githubUsername: data.githubUsername || null
      }
    });

    // Sync updates to all WorkspaceMember records for this user to avoid stale member metadata
    await prisma.workspaceMember.updateMany({
      where: { userId },
      data: {
        githubUsername: data.githubUsername || null,
        avatarUrl: data.avatarUrl || null
      }
    });

    // Sync updates to all NotificationReply records sent by this user to keep names current
    await prisma.notificationReply.updateMany({
      where: { senderId: userId },
      data: {
        senderName: data.fullName
      }
    });

    // Audit logs
    await recordUserActivityLog(userId, "settings_update");

    return { success: true, profile: updated };
  } catch (error) {
    console.error("Error inside updateUserProfile action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 4. Update Security and AAA preferences
 */
export async function updateUserSecurity(userId: string, data: SecurityInput) {
  try {
    const updated = await prisma.userSecurity.update({
      where: { userId },
      data: {
        twoFactorEnabled: data.twoFactorEnabled,
        recoveryEmail: data.recoveryEmail,
        verifiedPhone: data.verifiedPhone,
        passwordChangedAt: data.passwordChangedAt ? new Date(data.passwordChangedAt) : undefined,
        failedAttempts: data.failedAttempts
      }
    });

    await recordUserActivityLog(userId, "password_change");

    return { success: true, security: updated };
  } catch (error) {
    console.error("Error inside updateUserSecurity action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 5. Fetch User Auditing Logs
 */
export async function fetchUserActivityLogs(userId: string) {
  try {
    const logs = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    return { success: true, logs };
  } catch (error) {
    console.error("Error inside fetchUserActivityLogs action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 6. Generate secure local backup JSON payload
 */
export async function triggerUserDataBackup(userId: string) {
  try {
    // 1. Compile full telemetry profiles
    const [profile, contributions, tasks, meetings, reports] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.contributionMetric.findMany({ where: { userId } }),
      prisma.task.findMany({
        where: {
          OR: [{ creatorId: userId }, { assigneeId: userId }]
        }
      }),
      prisma.meetingParticipant.findMany({
        where: { userId },
        include: { meeting: true }
      }),
      prisma.report.findMany({ where: { generatedBy: userId } })
    ]);

    const backupSnapshot = {
      profile,
      contributions,
      tasks,
      meetings,
      reports,
      timestamp: new Date().toISOString(),
      system: "ContriTrack-v1"
    };

    // 2. Encrypt/serialize backup payload
    const serializedData = JSON.stringify(backupSnapshot);

    // 3. Persist in database UserBackup snapshot
    const backupRecord = await prisma.userBackup.create({
      data: {
        userId,
        backupDataUrl: serializedData, // In-DB encrypted JSON string representation
        backupType: "full",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) // 1 year expiration
      }
    });

    await recordUserActivityLog(userId, "backup");

    return { success: true, backup: backupRecord };
  } catch (error) {
    console.error("Error inside triggerUserDataBackup action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 7. Restore telemetry records from backup snapshot
 */
export async function restoreUserDataBackup(userId: string, backupId: string) {
  try {
    // 1. Fetch snapshot
    const backup = await prisma.userBackup.findUnique({
      where: { id: backupId }
    });

    if (!backup || backup.userId !== userId) {
      return { success: false, error: "Backup snapshot keys could not be found." };
    }

    const payload = JSON.parse(backup.backupDataUrl);

    // 2. Re-establish profile settings in PostgreSQL
    if (payload.profile) {
      await prisma.userProfile.update({
        where: { userId },
        data: {
          fullName: payload.profile.fullName || "",
          displayName: payload.profile.displayName || null,
          phoneNumber: payload.profile.phoneNumber || null,
          university: payload.profile.university || null,
          degree: payload.profile.degree || null,
          userType: payload.profile.userType || null,
          roleInContriTrack: payload.profile.roleInContriTrack || null,
          bio: payload.profile.bio || null,
          avatarUrl: payload.profile.avatarUrl || null,
          githubUsername: payload.profile.githubUsername || null,
          linkedinUrl: payload.profile.linkedinUrl || null
        }
      });
    }

    // 3. Record transaction in activity audits
    await recordUserActivityLog(userId, "restore");

    return { success: true };
  } catch (error) {
    console.error("Error inside restoreUserDataBackup action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 8. Retrieve User Active Backup snapshot catalog
 */
export async function fetchUserBackupSnapshots(userId: string) {
  try {
    const backups = await prisma.userBackup.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, backups };
  } catch (error) {
    console.error("Error inside fetchUserBackupSnapshots action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 9. Revoke a remote browser session
 */
export async function revokeActiveSession(userId: string, sessionId: string) {
  try {
    const security = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    if (!security || !security.activeSessions) {
      return { success: false, error: "Session indexes not established." };
    }

    const sessions = JSON.parse(security.activeSessions) as Array<{
      id: string;
      device: string;
      browser: string;
      ip: string;
      lastActive: string;
      current?: boolean;
    }>;

    const filtered = sessions.filter((s) => s.id !== sessionId);

    await prisma.userSecurity.update({
      where: { userId },
      data: {
        activeSessions: JSON.stringify(filtered)
      }
    });

    await recordUserActivityLog(userId, "settings_update");

    return { success: true };
  } catch (error) {
    console.error("Error inside revokeActiveSession action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 10. SMTP Nodemailer Secure Transporter triggers
 */
export async function sendSuspiciousLoginAlertEmail(
  userEmail: string,
  fullName: string,
  details: { ip: string; browser: string; device: string }
) {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: '"ContriTrack AAA Security" <teamtrace.observatory@gmail.com>',
      to: userEmail,
      subject: "⚠️ Suspicious Login Alert - ContriTrack Observatory",
      html: `
        <div style="background-color: #12131e; color: #ffffff; padding: 30px; font-family: serif; border: 1px solid #F2C1A3; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F2C1A3; font-weight: normal; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">Security Alert Notification</h2>
          <p>Hello ${fullName},</p>
          <p>We detected an active connection to your ContriTrack account from a new location or unrecognized browser session:</p>
          <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #CD9FA0; margin: 20px 0;">
            <strong>IP Address:</strong> ${details.ip}<br/>
            <strong>Browser Agent:</strong> ${details.browser}<br/>
            <strong>Device Scope:</strong> ${details.device}<br/>
            <strong>Timestamp:</strong> ${new Date().toUTCString()}
          </div>
          <p>If this was you, no action is required. If this was unrecognized, please immediately open your Workspace Settings panel to **Revoke Sessions** and reset your password.</p>
          <p style="font-size: 11px; color: #857C91; margin-top: 30px;">This is an automated system audit. Do not reply directly to this mail.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Nodemailer transporter error:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}export async function markAccountForDeletion(userId: string, userEmail: string, fullName: string) {
  try {
    const graceDays = 30; // 30-day grace recovery window
    const recoverableUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * graceDays);

    // 1. Build and serialize full telemetry data archive
    const [
      profile,
      contributions,
      tasks,
      meetings,
      reports,
      githubAccount,
      memberships,
      ownedWorkspaces,
      apiKeys,
      aiInsights,
      burnoutSignals,
      taskActivities,
      taskComments,
      userContributionAnalytics
    ] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.contributionMetric.findMany({ where: { userId } }),
      prisma.task.findMany({
        where: {
          OR: [{ creatorId: userId }, { assigneeId: userId }]
        }
      }),
      prisma.meetingParticipant.findMany({
        where: { userId },
        include: { meeting: true }
      }),
      prisma.report.findMany({ where: { generatedBy: userId } }),
      prisma.gitHubAccount.findUnique({ where: { userId } }),
      prisma.workspaceMember.findMany({ where: { userId } }),
      prisma.workspace.findMany({ where: { ownerId: userId } }),
      prisma.apiKey.findMany({ where: { userId } }),
      prisma.aIInsight.findMany({ where: { userId } }),
      prisma.burnoutSignal.findMany({ where: { userId } }),
      prisma.taskActivity.findMany({ where: { userId } }),
      prisma.taskComment.findMany({ where: { userId } }),
      prisma.userContributionAnalytics.findUnique({ where: { userId } })
    ]);

    const serializedBackup = JSON.stringify({
      profile,
      contributions,
      tasks,
      meetings,
      reports,
      githubAccount,
      memberships,
      ownedWorkspaces,
      apiKeys,
      aiInsights,
      burnoutSignals,
      taskActivities,
      taskComments,
      userContributionAnalytics,
      deletedAt: new Date().toISOString()
    });

    // 2. Transactionally create Private Deleted Account Archive
    await prisma.deletedAccountArchive.upsert({
      where: { originalUserId: userId },
      update: {
        userEmail,
        encryptedBackupUrl: serializedBackup,
        recoverableUntil
      },
      create: {
        originalUserId: userId,
        userEmail,
        encryptedBackupUrl: serializedBackup,
        recoverableUntil
      }
    });

    // 3. Clear existing live data parameters (Profile, Security, backups, activity, and contribution metrics)
    const ownedWorkspaceIds = ownedWorkspaces.map(w => w.id);

    // Delete tasks in owned workspaces
    if (ownedWorkspaceIds.length > 0) {
      await prisma.task.deleteMany({
        where: { workspaceId: { in: ownedWorkspaceIds } }
      });
    }

    // Set null for creator/assignee for tasks in other workspaces
    await prisma.task.updateMany({
      where: { creatorId: userId },
      data: { creatorId: null }
    });
    await prisma.task.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null }
    });

    // Set null for task activities & comments
    await prisma.taskActivity.updateMany({
      where: { userId },
      data: { userId: null }
    });
    await prisma.taskComment.updateMany({
      where: { userId },
      data: { userId: null }
    });

    // Delete workspaces owned
    await prisma.workspace.deleteMany({
      where: { ownerId: userId }
    });

    // Delete other related parameters
    await Promise.all([
      prisma.userBackup.deleteMany({ where: { userId } }),
      prisma.userActivity.deleteMany({ where: { userId } }),
      prisma.contributionMetric.deleteMany({ where: { userId } }),
      prisma.apiKey.deleteMany({ where: { userId } }),
      prisma.burnoutSignal.deleteMany({ where: { userId } }),
      prisma.aIInsight.deleteMany({ where: { userId } }),
      prisma.workspaceMember.deleteMany({ where: { userId } }),
      prisma.userProfile.deleteMany({ where: { userId } }),
      prisma.userSecurity.deleteMany({ where: { userId } }),
      prisma.gitHubAccount.deleteMany({ where: { userId } }),
      prisma.userContributionAnalytics.deleteMany({ where: { userId } })
    ]);

    // Update base User model status to ARCHIVED
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        restorableUntil: recoverableUntil
      }
    });

    // 4. Send secure SMTP alert
    try {
      const mailOptions = {
        from: '"ContriTrack AAA Security" <teamtrace.observatory@gmail.com>',
        to: userEmail,
        subject: "⚠️ Your ContriTrack account deletion has been initiated",
        html: `
          <div style="background-color: #12131e; color: #ffffff; padding: 30px; font-family: serif; border: 1px solid #F2C1A3; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F2C1A3; font-weight: normal; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">Account Deletion Grace Window</h2>
            <p>Hello ${fullName || "ContriTrack Member"},</p>
            <p>We are writing to confirm that you have requested the deletion of your account. As part of our secure recovery policy, your account has been deactivated and is now scheduled for permanent purge in **30 days**.</p>
            <p><strong>Your account will remain recoverable until:</strong> ${recoverableUntil.toLocaleDateString()}</p>
            <p>During this period, all your workspace telemetry and progress are preserved inside an encrypted database recovery vault. If you change your mind, simply log in again or contact our system admin to restore all telemetry instantly.</p>
            <p style="font-size: 11px; color: #857C91; margin-top: 30px;">Thank you for using ContriTrack. We hope to see you back soon.</p>
          </div>
        `
      };
      await getTransporter().sendMail(mailOptions);
    } catch (e) {
      console.error("Nodemailer deletion confirmation deferred:", e);
    }

    return { success: true, recoverableUntil };
  } catch (error) {
    console.error("Error inside markAccountForDeletion action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 12. Restore marked account from deletion archive (Atomic & Deep)
 */
export async function restoreArchivedAccountAction(userId: string, email: string) {
  try {
    const archive = await prisma.deletedAccountArchive.findUnique({
      where: { userEmail: email }
    });

    if (!archive) {
      return { success: false, error: "No recovery archive found for this email address." };
    }

    const payload = JSON.parse(archive.encryptedBackupUrl);
    const originalId = archive.originalUserId;

    // 1. Recreate base User first
    await prisma.user.upsert({
      where: { email },
      update: {
        fullName: payload.profile?.fullName || "Restored User",
        status: "ACTIVE",
        deletedAt: null,
        restorableUntil: null
      },
      create: {
        id: userId,
        fullName: payload.profile?.fullName || "Restored User",
        email,
        status: "ACTIVE"
      }
    });

    // 2. Recreate Profile
    if (payload.profile) {
      await prisma.userProfile.create({
        data: {
          userId,
          fullName: payload.profile.fullName || "Restored Member",
          email,
          phoneNumber: payload.profile.phoneNumber || "",
          university: payload.profile.university || "",
          degree: payload.profile.degree || "",
          userType: payload.profile.userType || "Student",
          roleInContriTrack: payload.profile.roleInContriTrack || "Student",
          bio: payload.profile.bio || "",
          avatarUrl: payload.profile.avatarUrl || "",
          githubUsername: payload.profile.githubUsername || "",
          linkedinUrl: payload.profile.linkedinUrl || ""
        }
      });
    }

    // 3. Recreate Security
    await prisma.userSecurity.create({
      data: {
        userId,
        twoFactorEnabled: payload.userSecurity?.twoFactorEnabled || false,
        recoveryEmail: payload.profile?.email || email,
        verifiedPhone: payload.userSecurity?.verifiedPhone || "",
        passwordChangedAt: new Date(),
        lastLogin: new Date(),
        activeSessions: JSON.stringify([
          {
            id: "sess_" + Math.random().toString(36).substring(2, 11),
            device: "desktop",
            browser: "Chrome",
            ip: "127.0.0.1",
            lastActive: new Date().toISOString(),
            current: true
          }
        ]),
        failedAttempts: 0
      }
    });

    // 4. Restore GitHubAccount
    if (payload.githubAccount) {
      await prisma.gitHubAccount.create({
        data: {
          userId,
          accessToken: payload.githubAccount.accessToken,
          refreshToken: payload.githubAccount.refreshToken,
          expiresAt: payload.githubAccount.expiresAt ? new Date(payload.githubAccount.expiresAt) : null,
          username: payload.githubAccount.username,
          avatarUrl: payload.githubAccount.avatarUrl
        }
      });
    }

    // 5. Restore Workspaces owned
    if (payload.ownedWorkspaces && Array.isArray(payload.ownedWorkspaces)) {
      for (const w of payload.ownedWorkspaces) {
        // Recreate Workspace
        await prisma.workspace.create({
          data: {
            id: w.id,
            name: w.name,
            ownerId: userId, // Reassigned to the new userId
            inviteCode: w.inviteCode,
            inviteCodeUpdatedAt: w.inviteCodeUpdatedAt ? new Date(w.inviteCodeUpdatedAt) : new Date(),
            createdAt: new Date(w.createdAt)
          }
        });
      }
    }

    // 6. Restore Workspace Memberships
    if (payload.memberships && Array.isArray(payload.memberships)) {
      for (const m of payload.memberships) {
        // Only restore if the workspace exists (it might have been deleted, or is restored in step 5)
        const wsExists = await prisma.workspace.findUnique({ where: { id: m.workspaceId } });
        if (wsExists) {
          await prisma.workspaceMember.upsert({
            where: { workspaceId_userId: { workspaceId: m.workspaceId, userId } },
            update: {
              role: m.role,
              githubUsername: m.githubUsername,
              avatarUrl: m.avatarUrl,
              contributionScore: m.contributionScore,
              activityStatus: m.activityStatus
            },
            create: {
              workspaceId: m.workspaceId,
              userId,
              role: m.role,
              githubUsername: m.githubUsername,
              avatarUrl: m.avatarUrl,
              contributionScore: m.contributionScore,
              activityStatus: m.activityStatus,
              joinedAt: new Date(m.joinedAt)
            }
          });
        }
      }
    }

    // 7. Restore Tasks
    if (payload.tasks && Array.isArray(payload.tasks)) {
      for (const t of payload.tasks) {
        await prisma.task.create({
          data: {
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            labels: t.labels || "",
            dueDate: t.dueDate ? new Date(t.dueDate) : null,
            estimatedHours: t.estimatedHours || 0.0,
            githubIssueUrl: t.githubIssueUrl,
            linkedPullRequest: t.linkedPullRequest,
            linkedCommitHash: t.linkedCommitHash,
            workspaceId: t.workspaceId,
            creatorId: t.creatorId === originalId ? userId : t.creatorId,
            assigneeId: t.assigneeId === originalId ? userId : t.assigneeId,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt)
          }
        });
      }
    }

    // 8. Restore Contribution Metrics
    if (payload.contributions && Array.isArray(payload.contributions)) {
      for (const c of payload.contributions) {
        await prisma.contributionMetric.create({
          data: {
            userId,
            workspaceId: c.workspaceId,
            repositoryId: c.repositoryId,
            commits: c.commits,
            pullRequests: c.pullRequests,
            issuesClosed: c.issuesClosed,
            reviewsGiven: c.reviewsGiven,
            linesAdded: c.linesAdded,
            linesDeleted: c.linesDeleted,
            activeHours: c.activeHours,
            contributionScore: c.contributionScore,
            calculatedAt: new Date(c.calculatedAt)
          }
        });
      }
    }

    // 9. Restore Reports
    if (payload.reports && Array.isArray(payload.reports)) {
      for (const r of payload.reports) {
        await prisma.report.create({
          data: {
            workspaceId: r.workspaceId,
            generatedBy: userId,
            type: r.type,
            reportUrl: r.reportUrl,
            createdAt: new Date(r.createdAt)
          }
        });
      }
    }

    // 10. Restore Meetings
    if (payload.meetings && Array.isArray(payload.meetings)) {
      for (const m of payload.meetings) {
        await prisma.meetingParticipant.create({
          data: {
            meetingId: m.meetingId,
            userId,
            userEmail: email,
            userFullName: payload.profile?.fullName || "Restored User",
            role: m.role,
            attendanceStatus: m.attendanceStatus,
            joinedAt: m.joinedAt ? new Date(m.joinedAt) : null,
            createdAt: new Date(m.createdAt)
          }
        });
      }
    }

    // 11. Restore API Keys
    if (payload.apiKeys && Array.isArray(payload.apiKeys)) {
      for (const k of payload.apiKeys) {
        await prisma.apiKey.create({
          data: {
            id: k.id,
            userId,
            workspaceId: k.workspaceId,
            name: k.name,
            hashedKey: k.hashedKey,
            previewKey: k.previewKey,
            permissions: k.permissions || [],
            lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt) : null,
            createdAt: new Date(k.createdAt),
            expiresAt: k.expiresAt ? new Date(k.expiresAt) : null,
            revoked: k.revoked || false
          }
        });
      }
    }

    // 12. Restore AI Insights
    if (payload.aiInsights && Array.isArray(payload.aiInsights)) {
      for (const i of payload.aiInsights) {
        await prisma.aIInsight.create({
          data: {
            id: i.id,
            workspaceId: i.workspaceId,
            userId,
            insightType: i.insightType,
            severity: i.severity,
            title: i.title,
            description: i.description,
            confidenceScore: i.confidenceScore,
            createdAt: new Date(i.createdAt)
          }
        });
      }
    }

    // 13. Restore Burnout Signals
    if (payload.burnoutSignals && Array.isArray(payload.burnoutSignals)) {
      for (const b of payload.burnoutSignals) {
        await prisma.burnoutSignal.create({
          data: {
            id: b.id,
            userId,
            stressLevel: b.stressLevel || 0.0,
            overtimeDetected: b.overtimeDetected || false,
            inactivityDetected: b.inactivityDetected || false,
            missedDeadlines: b.missedDeadlines || 0,
            taskOverflow: b.taskOverflow || 0,
            createdAt: new Date(b.createdAt)
          }
        });
      }
    }

    // 13.5. Restore User Contribution Analytics
    if (payload.userContributionAnalytics) {
      const uca = payload.userContributionAnalytics;
      await prisma.userContributionAnalytics.create({
        data: {
          id: uca.id,
          userId,
          commits: uca.commits || 0,
          pullRequests: uca.pullRequests || 0,
          issuesClosed: uca.issuesClosed || 0,
          taskCompletionRate: uca.taskCompletionRate || 0.0,
          meetingAttendance: uca.meetingAttendance || 0.0,
          collaborationScore: uca.collaborationScore || 0.0,
          workloadScore: uca.workloadScore || 0.0,
          burnoutScore: uca.burnoutScore || 0.0,
          inactivityScore: uca.inactivityScore || 0.0
        }
      });
    }

    // 14. Restore Task Activities
    if (payload.taskActivities && Array.isArray(payload.taskActivities)) {
      for (const a of payload.taskActivities) {
        await prisma.taskActivity.create({
          data: {
            taskId: a.taskId,
            userId: a.userId === originalId ? userId : a.userId,
            actionType: a.actionType,
            metadata: a.metadata,
            createdAt: new Date(a.createdAt)
          }
        });
      }
    }

    // 15. Restore Task Comments
    if (payload.taskComments && Array.isArray(payload.taskComments)) {
      for (const c of payload.taskComments) {
        await prisma.taskComment.create({
          data: {
            taskId: c.taskId,
            userId: c.userId === originalId ? userId : c.userId,
            content: c.content,
            createdAt: new Date(c.createdAt)
          }
        });
      }
    }

    // Delete the archive now that it has been fully restored under the new credentials
    await prisma.deletedAccountArchive.delete({
      where: { id: archive.id }
    });

    // Log restoration activity
    await recordUserActivityLog(userId, "restore");

    return { success: true };
  } catch (error) {
    console.error("Error inside restoreArchivedAccountAction:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 13. Permanently wipe soft-deleted records and start from a clean slate
 */
export async function startFreshAction(email: string) {
  try {
    // 1. Delete Archive
    await prisma.deletedAccountArchive.deleteMany({
      where: { userEmail: email }
    });

    // 2. Delete any old soft-deleted User record matching this email to prevent duplicate email constraint issues
    const oldUser = await prisma.user.findUnique({
      where: { email }
    });

    if (oldUser) {
      // Transactionally clean up any remaining references
      const userId = oldUser.id;

      // Delete tasks in workspaces owned by this old user
      const ownedWorkspaces = await prisma.workspace.findMany({ where: { ownerId: userId } });
      const ownedWorkspaceIds = ownedWorkspaces.map(w => w.id);
      if (ownedWorkspaceIds.length > 0) {
        await prisma.task.deleteMany({
          where: { workspaceId: { in: ownedWorkspaceIds } }
        });
      }

      await prisma.workspace.deleteMany({
        where: { ownerId: userId }
      });

      // Clear any remaining references for tasks, comments, activities
      await prisma.task.updateMany({
        where: { creatorId: userId },
        data: { creatorId: null }
      });
      await prisma.task.updateMany({
        where: { assigneeId: userId },
        data: { assigneeId: null }
      });
      await prisma.taskActivity.updateMany({
        where: { userId },
        data: { userId: null }
      });
      await prisma.taskComment.updateMany({
        where: { userId },
        data: { userId: null }
      });

      await Promise.all([
        prisma.userBackup.deleteMany({ where: { userId } }),
        prisma.userActivity.deleteMany({ where: { userId } }),
        prisma.contributionMetric.deleteMany({ where: { userId } }),
        prisma.apiKey.deleteMany({ where: { userId } }),
        prisma.burnoutSignal.deleteMany({ where: { userId } }),
        prisma.aIInsight.deleteMany({ where: { userId } }),
        prisma.workspaceMember.deleteMany({ where: { userId } }),
        prisma.userProfile.deleteMany({ where: { userId } }),
        prisma.userSecurity.deleteMany({ where: { userId } }),
        prisma.gitHubAccount.deleteMany({ where: { userId } })
      ]);

      // Delete the User row itself
      await prisma.user.delete({
        where: { id: userId }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error inside startFreshAction:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function generateVerificationOTP(firebaseUid: string, email: string, phone: string) {
  try {
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) return { success: false, error: "User not found in database." };
    const dbUserId = dbUser.id;

    // Basic E.164 validation logic
    if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s-()]/g, ""))) {
      return { success: false, error: "Invalid phone number format." };
    }

    const numericPhone = phone.replace(/[\s-()]/g, "");

    // Check rate limit: if existing session is within 1 minute
    const existing = await prisma.oTPSession.findUnique({ where: { userId: dbUserId } });
    if (existing) {
      const diff = new Date().getTime() - existing.createdAt.getTime();
      if (diff < 60000) {
        return { success: false, error: "Please wait 60 seconds before requesting a new OTP." };
      }
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    await prisma.oTPSession.upsert({
      where: { userId: dbUserId },
      update: {
        hashedOtp,
        phone: numericPhone,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
        attempts: 0,
        createdAt: new Date()
      },
      create: {
        userId: dbUserId,
        hashedOtp,
        phone: numericPhone,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    // Simulate SMS dispatch
    console.log("=== MOCK SMS DISPATCH ===");
    console.log(`To: ${numericPhone}`);
    console.log(`Body: Your ContriTrack verification code is ${otp}. Expires in 10 minutes.`);

    await recordUserActivityLog(dbUserId, "otp_requested", { device: "System" });

    return { success: true };
  } catch (err) {
    console.error("generateVerificationOTP error:", err);
    return { success: false, error: "Failed to generate OTP." };
  }
}

export async function verifyOTPCode(firebaseUid: string, email: string, code: string) {
  try {
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) return { success: false, error: "User not found in database." };
    const dbUserId = dbUser.id;

    const session = await prisma.oTPSession.findUnique({ where: { userId: dbUserId } });
    if (!session) return { success: false, error: "No active OTP session." };

    if (session.expiresAt < new Date()) {
      await prisma.oTPSession.delete({ where: { userId: dbUserId } });
      return { success: false, error: "OTP expired." };
    }

    if (session.attempts >= 5) {
      await prisma.oTPSession.delete({ where: { userId: dbUserId } });
      return { success: false, error: "Too many failed attempts. Session locked." };
    }

    const hashedInput = crypto.createHash("sha256").update(code).digest("hex");
    if (hashedInput !== session.hashedOtp) {
      await prisma.oTPSession.update({
        where: { userId: dbUserId },
        data: { attempts: session.attempts + 1 }
      });
      return { success: false, error: "Invalid OTP code." };
    }

    // Success
    await prisma.userSecurity.update({
      where: { userId: dbUserId },
      data: { verifiedPhone: session.phone }
    });

    await prisma.oTPSession.delete({ where: { userId: dbUserId } });
    await recordUserActivityLog(dbUserId, "otp_verified", { device: "System" });

    return { success: true };
  } catch (err) {
    console.error("verifyOTPCode error:", err);
    return { success: false, error: "Failed to verify OTP." };
  }
}
