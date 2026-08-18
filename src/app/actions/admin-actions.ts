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
 * Deletes a user account entirely (from Firebase Auth AND Postgres)
 */
export async function deleteUserAccountAdmin(userId: string) {
  try {
    // 1. Delete from Firebase Auth if the account is present
    try {
      await adminAuth.deleteUser(userId);
      console.log(`Deleted user ${userId} from Firebase Auth`);
    } catch (firebaseError: unknown) {
      const fbErr = firebaseError as { code?: string };
      if (fbErr.code === "auth/user-not-found") {
        console.warn(`User ${userId} already missing from Firebase Auth, proceeding to Postgres deletion.`);
      } else {
        console.warn("Notice deleting from Firebase Auth:", firebaseError);
      }
    }

    // 2. Delete from Postgres cascading across all related tables
    await prisma.userProfile.deleteMany({ where: { userId } });
    await prisma.userSecurity.deleteMany({ where: { userId } });
    await prisma.workspaceMember.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    
    console.log(`Deleted user ${userId} from PostgreSQL`);

    // 3. Revalidate the admin users page
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error completely deleting user:", error);
    const err = error as Error;
    return { success: false, error: err.message || "Failed to delete user account" };
  }
}
