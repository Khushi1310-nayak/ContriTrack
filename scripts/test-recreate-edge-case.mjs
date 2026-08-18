import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

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

async function testRecreatedAccountScenario() {
  console.log("=== TESTING RECREATED / RE-REGISTERED ACCOUNT EDGE CASE ===");

  const testEmail = "test_recreate_" + Date.now() + "@example.com";
  const oldUid = "old_firebase_uid_" + Date.now();
  const newUid = "new_firebase_uid_" + Date.now();

  console.log(`1. Creating initial user with Old UID: ${oldUid}, Email: ${testEmail}`);
  await prisma.user.create({
    data: {
      id: oldUid,
      fullName: "Initial Account",
      email: testEmail,
      status: "ACTIVE"
    }
  });

  await prisma.userProfile.create({
    data: {
      userId: oldUid,
      fullName: "Initial Account",
      email: testEmail,
      userType: "Student",
      roleInContriTrack: "Student"
    }
  });

  console.log(`2. Simulating User signing up again with New Firebase UID: ${newUid} for same email: ${testEmail}`);

  // This is what syncUserProfileWithPostgres does:
  // Let's check how prisma.user.upsert behaves when finding by email
  try {
    await prisma.user.upsert({
      where: { email: testEmail },
      update: {
        fullName: "New Account Name",
        status: "ACTIVE"
      },
      create: {
        id: newUid,
        fullName: "New Account Name",
        email: testEmail,
        status: "ACTIVE"
      }
    });

    const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    console.log(`[OBSERVATION] User ID in Postgres after upsert: ${userInDb?.id} (Expected newUid: ${newUid})`);
    
    if (userInDb?.id !== newUid) {
      console.warn(`[WARNING / BUG CONFIRMED] User ID was NOT updated to new Firebase UID ${newUid}! It remained ${userInDb?.id}.`);
    } else {
      console.log(`[PASS] User ID matches new Firebase UID.`);
    }

    // Check userProfile upsert
    await prisma.userProfile.upsert({
      where: { email: testEmail },
      update: {
        userId: newUid,
        fullName: "New Account Name"
      },
      create: {
        userId: newUid,
        fullName: "New Account Name",
        email: testEmail
      }
    });

    const profileInDb = await prisma.userProfile.findUnique({ where: { email: testEmail } });
    console.log(`[OBSERVATION] UserProfile userId in Postgres: ${profileInDb?.userId}`);

    const idMismatch = userInDb?.id !== profileInDb?.userId;
    console.log(`[DISCREPANCY DETECTED?] ${idMismatch ? "YES! User.id is '" + userInDb?.id + "' but UserProfile.userId is '" + profileInDb?.userId + "'" : "NO"}`);

  } finally {
    // Cleanup
    await prisma.userProfile.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log(`Cleaned up test data.`);
  }
}

testRecreatedAccountScenario()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
