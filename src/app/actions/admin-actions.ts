"use server";

import { adminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Fetches all users from PostgreSQL
 */
export async function getAllUsersForAdmin() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, users };
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

/**
 * Deletes a user account entirely (from Firebase Auth AND Postgres) with 100% total data erasure
 */
export async function deleteUserAccountAdmin(userId: string) {
  try {
    // 1. Discover user email if available for cross-table complete wipe
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    const existingProfile = await prisma.userProfile.findUnique({ where: { userId } });
    const userEmail = existingUser?.email || existingProfile?.email || null;

    // 2. Delete from Firebase Auth if the account is present by UID
    try {
      await adminAuth.deleteUser(userId);
      console.log(`Deleted user ${userId} from Firebase Auth by UID`);
    } catch (firebaseError: unknown) {
      const fbErr = firebaseError as { code?: string };
      if (fbErr.code !== "auth/user-not-found") {
        console.warn("Notice deleting from Firebase Auth by UID:", firebaseError);
      }
    }

    // Also check and delete by email from Firebase Auth if UID differed
    if (userEmail) {
      try {
        const fbUserByEmail = await adminAuth.getUserByEmail(userEmail);
        if (fbUserByEmail && fbUserByEmail.uid !== userId) {
          await adminAuth.deleteUser(fbUserByEmail.uid);
          console.log(`Deleted user ${fbUserByEmail.uid} from Firebase Auth by Email ${userEmail}`);
        }
      } catch {
        // Ignored if not found
      }
    }

    // 3. Delete from Postgres cascading across every single related table
    const emailOrUserId = userEmail ? [{ userId }, { email: userEmail }] : [{ userId }];
    const emailOrOriginalId = userEmail ? [{ originalUserId: userId }, { userEmail }] : [{ originalUserId: userId }];

    await Promise.allSettled([
      prisma.deletedAccountArchive.deleteMany({ where: { OR: emailOrOriginalId } }),
      prisma.userProfile.deleteMany({ where: { OR: emailOrUserId } }),
      prisma.userSecurity.deleteMany({ where: { userId } }),
      prisma.userActivity.deleteMany({ where: { userId } }),
      prisma.userBackup.deleteMany({ where: { userId } }),
      prisma.oTPSession.deleteMany({ where: { userId } }),
      prisma.contributionMetric.deleteMany({ where: { userId } }),
      prisma.userContributionAnalytics.deleteMany({ where: { userId } }),
      prisma.burnoutSignal.deleteMany({ where: { userId } }),
      prisma.aIInsight.deleteMany({ where: { userId } }),
      prisma.gitHubAccount.deleteMany({ where: { userId } }),
      prisma.workspaceMember.deleteMany({ where: { userId } }),
      prisma.meetingParticipant.deleteMany({ where: { userId } }),
      prisma.notificationReply.deleteMany({ where: { senderId: userId } }),
      prisma.notification.deleteMany({ where: { OR: [{ receiverId: userId }, { senderId: userId }] } }),
      prisma.taskComment.deleteMany({ where: { userId } }),
      prisma.taskActivity.deleteMany({ where: { userId } }),
      prisma.task.updateMany({ where: { creatorId: userId }, data: { creatorId: null } }),
      prisma.task.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } })
    ]);

    // Finally delete root User record(s)
    await prisma.user.deleteMany({
      where: {
        OR: userEmail ? [{ id: userId }, { email: userEmail }] : [{ id: userId }]
      }
    });
    
    console.log(`Completely wiped user ${userId} (${userEmail || "no email"}) from PostgreSQL`);

    // 4. Revalidate the admin users page
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error completely deleting user:", error);
    const err = error as Error;
    return { success: false, error: err.message || "Failed to delete user account" };
  }
}
