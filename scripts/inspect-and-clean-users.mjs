import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env and .env.local
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const firstEqual = trimmed.indexOf('=');
          const key = trimmed.substring(0, firstEqual).trim();
          let value = trimmed.substring(firstEqual + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  }
}

loadEnv();

const prisma = new PrismaClient();

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "contritrack-app";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    admin.initializeApp({ projectId });
  }
}

const adminAuth = admin.auth();

async function main() {
  console.log("=== USER AUDIT & PURGE SCRIPT ===");
  const targetEmails = ["khushinayak127@gmail.com", "manisanayak456@gmail.com"];

  for (const email of targetEmails) {
    console.log(`\n----------------------------------------`);
    console.log(`[CHECKING] Email: ${email}`);

    // 1. Check PostgreSQL User table
    const pgUsers = await prisma.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        githubAccount: true,
        createdTasks: true,
        assignedTasks: true,
      }
    });

    console.log(`[POSTGRES User] Records found: ${pgUsers.length}`);
    const userIds = pgUsers.map(u => u.id);
    if (pgUsers.length > 0) {
      pgUsers.forEach(u => {
        console.log(`  - ID: ${u.id}, Name: ${u.fullName}, Email: ${u.email}, Created: ${u.createdAt}`);
      });
    }

    // Check UserProfile
    const profiles = await prisma.userProfile.findMany({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { userId: { in: userIds } }
        ]
      }
    });
    console.log(`[POSTGRES UserProfile] Records found: ${profiles.length}`);
    profiles.forEach(p => console.log(`  - Profile: userId=${p.userId}, email=${p.email}, fullName=${p.fullName}`));

    // Check UserSecurity
    const securities = await prisma.userSecurity.findMany({
      where: { userId: { in: userIds } }
    });
    console.log(`[POSTGRES UserSecurity] Records found: ${securities.length}`);

    // Check WorkspaceMember
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { userId: { in: userIds } }
    });
    console.log(`[POSTGRES WorkspaceMember] Records found: ${workspaceMembers.length}`);

    // 2. Check Firebase Auth
    let fbUser = null;
    try {
      fbUser = await adminAuth.getUserByEmail(email);
      console.log(`[FIREBASE AUTH] User found: UID=${fbUser.uid}, Email=${fbUser.email}, Provider=${fbUser.providerData.map(p => p.providerId).join(', ')}`);
    } catch (fbErr) {
      if (fbErr.code === 'auth/user-not-found') {
        console.log(`[FIREBASE AUTH] User NOT found (clean).`);
      } else {
        console.log(`[FIREBASE AUTH] Error checking user:`, fbErr.message);
      }
    }

    // 3. Delete khushinayak127@gmail.com completely as requested
    if (email === "khushinayak127@gmail.com") {
      console.log(`\n[ACTION REQUIRED FOR khushinayak127@gmail.com]`);
      
      // Delete from Firebase
      if (fbUser) {
        try {
          await adminAuth.deleteUser(fbUser.uid);
          console.log(`  -> Deleted from Firebase Auth UID: ${fbUser.uid}`);
        } catch (err) {
          console.error(`  -> Failed to delete from Firebase:`, err.message);
        }
      } else {
        console.log(`  -> Firebase Auth already clean.`);
      }

      // Delete from Postgres UserProfile
      try {
        const deletedProfiles = await prisma.userProfile.deleteMany({
          where: {
            OR: [
              { email: { equals: email, mode: 'insensitive' } },
              { userId: { in: userIds } },
              ...(fbUser ? [{ userId: fbUser.uid }] : [])
            ]
          }
        });
        console.log(`  -> Deleted UserProfile count: ${deletedProfiles.count}`);
      } catch (err) {
        console.error(`  -> Failed to delete UserProfile:`, err.message);
      }

      // Delete from Postgres UserSecurity
      try {
        const allTargetUserIds = [...userIds, ...(fbUser ? [fbUser.uid] : [])];
        if (allTargetUserIds.length > 0) {
          const deletedSec = await prisma.userSecurity.deleteMany({
            where: { userId: { in: allTargetUserIds } }
          });
          console.log(`  -> Deleted UserSecurity count: ${deletedSec.count}`);
        }
      } catch (err) {
        console.error(`  -> Failed to delete UserSecurity:`, err.message);
      }

      // Delete from Postgres WorkspaceMember
      try {
        const allTargetUserIds = [...userIds, ...(fbUser ? [fbUser.uid] : [])];
        if (allTargetUserIds.length > 0) {
          const deletedMembers = await prisma.workspaceMember.deleteMany({
            where: { userId: { in: allTargetUserIds } }
          });
          console.log(`  -> Deleted WorkspaceMember count: ${deletedMembers.count}`);
        }
      } catch (err) {
        console.error(`  -> Failed to delete WorkspaceMember:`, err.message);
      }

      // Delete from Postgres User
      if (pgUsers.length > 0) {
        for (const u of pgUsers) {
          try {
            await prisma.user.delete({ where: { id: u.id } });
            console.log(`  -> Deleted from Postgres User ID: ${u.id}`);
          } catch (err) {
            console.error(`  -> Failed to delete from Postgres User ${u.id}:`, err.message);
          }
        }
      } else {
        console.log(`  -> PostgreSQL User table already clean.`);
      }
    }
  }

  console.log(`\n----------------------------------------`);
  console.log("=== FINAL VERIFICATION AFTER CLEANUP ===");
  for (const email of targetEmails) {
    const remainingPg = await prisma.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
    const remainingProfile = await prisma.userProfile.findMany({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
    let remainingFb = null;
    try {
      remainingFb = await adminAuth.getUserByEmail(email);
    } catch {
      remainingFb = null;
    }
    console.log(`Email: ${email} -> Postgres User: ${remainingPg.length}, Postgres Profile: ${remainingProfile.length}, Firebase Auth: ${remainingFb ? 'EXISTS' : 'CLEAN/NONE'}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
