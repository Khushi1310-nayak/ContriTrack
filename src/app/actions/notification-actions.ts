"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import webpush from "web-push";
import nodemailer from "nodemailer";

// Configure SMTP dynamic transporter with no hardcoded fallback keys
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("SMTP credentials not configured in .env. Falling back to mock console transport.");
    return {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        console.log("=== MOCK EMAIL DISPATCH ===");
        console.log(`From: ${options.from}`);
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log("HTML Content preview:", typeof options.html === "string" ? options.html.substring(0, 250) : "[Non-string HTML Content]");
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

// Reusable email alert helper with premium visual styling
export async function sendWorkspaceEmailAlert(
  userEmail: string,
  fullName: string,
  title: string,
  message: string,
  type: string
) {
  try {
    const transporter = getTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const mailOptions = {
      from: `"TeamTrace Observatory" <${process.env.SMTP_USER || "teamtrace.observatory@gmail.com"}>`,
      to: userEmail,
      subject: `🔔 TeamTrace Notification: ${title}`,
      html: `
        <div style="background-color: #09090b; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #141523; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); margin: 0 auto;">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <span style="font-size: 24px; font-family: Georgia, serif; color: #F2C1A3; font-weight: 300; letter-spacing: 2px;">TEAMTRACE</span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <h1 style="color: #ffffff; font-size: 20px; font-weight: 300; margin: 0; font-family: Georgia, serif;">Notification Dispatch</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 30px; padding-bottom: 30px; text-align: left;">
                <p style="font-size: 14px; line-height: 1.6; color: #857C91; margin: 0 0 16px 0;">
                  Greetings ${fullName},
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #ffffff; margin: 0 0 16px 0;">
                  <strong>${title}</strong>
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 24px 0;">
                  ${message}
                </p>
                <div style="background-color: #0b0c16; border: 1px solid rgba(242, 193, 163, 0.1); border-radius: 12px; padding: 15px; font-size: 12px; color: #CD9FA0;">
                  <strong>Notification Type:</strong> ${type.toUpperCase()}<br/>
                  <strong>Logged at:</strong> ${new Date().toLocaleString()}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 30px;">
                <a href="${appUrl}/dashboard" style="background-color: #F2C1A3; color: #12131e; padding: 12px 30px; border-radius: 30px; font-size: 13px; font-weight: bold; text-decoration: none; display: inline-block;">
                  Open Dashboard
                </a>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 20px; text-align: center;">
                <span style="font-size: 10px; color: #857C91; font-family: monospace;">This is an automated operational email alert from TeamTrace. You can adjust your preferences in Workspace Settings.</span>
              </td>
            </tr>
          </table>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Failed to send workspace email alert:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to dispatch email." };
  }
}

// Parse and notify teammate mentions
export async function parseAndNotifyMentions(
  content: string,
  workspaceId: string,
  senderId: string,
  senderName: string,
  actionUrl: string,
  sourceContext: string
) {
  try {
    const matches = content.match(/@(\w+)/g);
    if (!matches) return;

    const usernames = Array.from(new Set(matches.map(m => m.substring(1))));

    for (const username of usernames) {
      const profile = await prisma.userProfile.findFirst({
        where: {
          OR: [
            { displayName: { equals: username, mode: "insensitive" } },
            { githubUsername: { equals: username, mode: "insensitive" } },
            { fullName: { equals: username, mode: "insensitive" } }
          ]
        }
      });

      let resolvedUserId: string | null = null;

      if (profile) {
        resolvedUserId = profile.userId;
      } else {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { equals: username, mode: "insensitive" } },
              { displayName: { equals: username, mode: "insensitive" } }
            ]
          }
        });
        if (user) {
          resolvedUserId = user.id;
        }
      }

      if (resolvedUserId && resolvedUserId !== senderId) {
        await createNotification({
          workspaceId,
          senderId,
          receiverId: resolvedUserId,
          type: "mention",
          title: `💬 Mentioned in ${sourceContext}`,
          message: `${senderName} mentioned you: "${content.substring(0, 60)}..."`,
          priority: "high",
          actionUrl
        });
      }
    }
  } catch (error) {
    console.error("Failed parsing mentions:", error);
  }
}

// Initialize VAPID details for secure Web Push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:khushinayak127@gmail.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Fetch persistent notifications for an authenticated user with filtering
 */
export async function fetchNotifications(
  userId: string,
  filters?: {
    unreadOnly?: boolean;
    priority?: string;
    type?: string;
    limit?: number;
    workspaceId?: string;
  }
) {
  try {
    const where: Prisma.NotificationWhereInput = { receiverId: userId };

    if (filters?.unreadOnly) {
      where.isRead = false;
    }
    if (filters?.priority && filters.priority !== "all") {
      where.priority = filters.priority;
    }
    if (filters?.type && filters.type !== "all") {
      where.type = filters.type;
    }
    if (filters?.workspaceId) {
      where.workspaceId = filters.workspaceId;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
      include: {
        replies: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return { success: true, notifications };
  } catch (error) {
    console.error("Error in fetchNotifications server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(id: string) {
  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return { success: true, notification };
  } catch (error) {
    console.error("Error in markNotificationRead server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Mark all notifications as read for a given user
 */
export async function markAllNotificationsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { receiverId: userId, isRead: false },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    console.error("Error in markAllNotificationsRead server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Delete / archive a notification
 */
export async function deleteNotification(id: string) {
  try {
    await prisma.notification.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    console.error("Error in deleteNotification server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Delete all notifications for a user (or optionally filtered by workspace)
 */
export async function deleteAllNotifications(userId: string, workspaceId?: string) {
  try {
    const where: Prisma.NotificationWhereInput = { receiverId: userId };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }
    await prisma.notification.deleteMany({
      where
    });
    return { success: true };
  } catch (error) {
    console.error("Error in deleteAllNotifications server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Create a persistent notification and trigger background web push notifications
 */
export async function createNotification(data: {
  workspaceId: string;
  senderId?: string;
  receiverId: string;
  type: string; // "task" | "github" | "meeting" | "system" | "invite" | "mention" | "report"
  title: string;
  message: string;
  priority: string; // "low" | "medium" | "high" | "urgent"
  actionUrl?: string;
}) {
  try {
    // 1. Permanently persist in the database
    const notification = await prisma.notification.create({
      data: {
        workspaceId: data.workspaceId,
        senderId: data.senderId || null,
        receiverId: data.receiverId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority,
        actionUrl: data.actionUrl || null
      }
    });

    // 2. Query user preferences to check if browser pushes are authorized
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: data.receiverId }
    });

    // Default to true if preferences do not exist yet
    const browserEnabled = prefs ? prefs.browserEnabled : true;
    const isMeetingAlertAllowed = data.type === "meeting" ? (prefs ? prefs.meetingAlerts : true) : true;
    const isTaskAlertAllowed = data.type === "task" ? (prefs ? prefs.taskAlerts : true) : true;
    const isTeammateMentionAllowed = data.type === "mention" ? (prefs ? prefs.teammateMentions : true) : true;

    if (browserEnabled && isMeetingAlertAllowed && isTaskAlertAllowed && isTeammateMentionAllowed) {
      // 3. Retrieve registered push subscriptions for this user
      const subscriptions = await prisma.pushSubscriptionModel.findMany({
        where: { userId: data.receiverId }
      });

      // 4. Securely dispatch Web Push payload to active endpoints
      if (subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
        const payload = JSON.stringify({
          title: data.title,
          body: data.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: {
            url: data.actionUrl || "/dashboard",
            notificationId: notification.id
          }
        });

        const pushPromises = subscriptions.map(async (sub) => {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            };
            await webpush.sendNotification(pushSubscription, payload);
          } catch (err) {
            // Remove subscription from database if expired or unauthorized
            const status = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: number }).statusCode : undefined;
            if (status === 410 || status === 404) {
              await prisma.pushSubscriptionModel.delete({
                where: { id: sub.id }
              });
            }
          }
        });

        await Promise.all(pushPromises);
      }
    }

    // 5. Query user preferences to check if email alerts are authorized
    const emailEnabled = prefs ? prefs.emailEnabled : true;
    if (emailEnabled) {
      const receiver = await prisma.user.findUnique({
        where: { id: data.receiverId }
      });
      if (receiver && receiver.email) {
        sendWorkspaceEmailAlert(receiver.email, receiver.fullName, data.title, data.message, data.type)
          .catch((err) => console.error("Async email alert send failed:", err));
      }
    }

    return { success: true, notification };
  } catch (error) {
    console.error("Error in createNotification server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Add a comment or reply to an interactive notification card
 */
export async function addNotificationReply(data: {
  notificationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
}) {
  try {
    const reply = await prisma.notificationReply.create({
      data: {
        notificationId: data.notificationId,
        senderId: data.senderId,
        senderName: data.senderName,
        receiverId: data.receiverId,
        message: data.message
      }
    });

    // Trigger alert back to the original receiver/sender if applicable
    return { success: true, reply };
  } catch (error) {
    console.error("Error in addNotificationReply server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Save browser push subscription credentials
 */
export async function savePushSubscription(data: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceType?: string;
}) {
  try {
    // Check if subscription already exists to avoid duplicates
    const existing = await prisma.pushSubscriptionModel.findUnique({
      where: { endpoint: data.endpoint }
    });

    if (existing) {
      const updated = await prisma.pushSubscriptionModel.update({
        where: { endpoint: data.endpoint },
        data: {
          userId: data.userId,
          deviceType: data.deviceType || "desktop"
        }
      });
      return { success: true, subscription: updated };
    }

    const subscription = await prisma.pushSubscriptionModel.create({
      data: {
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        deviceType: data.deviceType || "desktop"
      }
    });

    return { success: true, subscription };
  } catch (error) {
    console.error("Error in savePushSubscription server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fetch user notification preferences
 */
export async function fetchNotificationPreferences(userId: string) {
  try {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!prefs) {
      // Create defaults
      prefs = await prisma.notificationPreference.create({
        data: {
          userId,
          browserEnabled: true,
          mobileEnabled: true,
          emailEnabled: true,
          meetingAlerts: true,
          taskAlerts: true,
          contributionAlerts: true,
          teammateMentions: true
        }
      });
    }

    return { success: true, preferences: prefs };
  } catch (error) {
    console.error("Error in fetchNotificationPreferences server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    browserEnabled?: boolean;
    mobileEnabled?: boolean;
    emailEnabled?: boolean;
    meetingAlerts?: boolean;
    taskAlerts?: boolean;
    contributionAlerts?: boolean;
    teammateMentions?: boolean;
  }
) {
  try {
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        browserEnabled: preferences.browserEnabled ?? true,
        mobileEnabled: preferences.mobileEnabled ?? true,
        emailEnabled: preferences.emailEnabled ?? true,
        meetingAlerts: preferences.meetingAlerts ?? true,
        taskAlerts: preferences.taskAlerts ?? true,
        contributionAlerts: preferences.contributionAlerts ?? true,
        teammateMentions: preferences.teammateMentions ?? true
      }
    });

    return { success: true, preferences: prefs };
  } catch (error) {
    console.error("Error in updateNotificationPreferences server action:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
