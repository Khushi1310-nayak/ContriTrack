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
    // 1. Get user details from Postgres to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found in Postgres" };
    }

    // 2. Delete from Firebase Auth if the account is present
    try {
      await adminAuth.deleteUser(userId);
      console.log(`Deleted user ${userId} from Firebase Auth`);
    } catch (firebaseError: unknown) {
      // If the user is already deleted from Firebase (e.g., auth/user-not-found), 
      // we still want to proceed to clean up Postgres.
      const fbErr = firebaseError as { code?: string };
      if (fbErr.code === "auth/user-not-found") {
        console.warn(`User ${userId} already missing from Firebase Auth, proceeding to Postgres deletion.`);
      } else {
        console.error("Error deleting from Firebase Auth:", firebaseError);
        return { success: false, error: "Failed to delete from Firebase Auth" };
      }
    }

    // 3. Delete from Postgres
    // Because of onDelete: Cascade on relations (UserProfile, WorkspaceMember, etc),
    // deleting the root User will clean up everything else.
    await prisma.user.delete({
      where: { id: userId },
    });
    
    console.log(`Deleted user ${userId} from PostgreSQL`);

    // 4. Revalidate the admin users page
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error completely deleting user:", error);
    const err = error as Error;
    return { success: false, error: err.message || "Failed to delete user account" };
  }
}
