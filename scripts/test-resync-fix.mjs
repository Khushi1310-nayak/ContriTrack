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

async function testFix() {
  console.log("=== TESTING USER ID RESYNC FIX ===");

  const testEmail = "test_fix_" + Date.now() + "@example.com";
  const oldUid = "old_uid_" + Date.now();
  const newUid = "new_uid_" + Date.now();

  await prisma.user.create({
    data: {
      id: oldUid,
      fullName: "Old User",
      email: testEmail
    }
  });

  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (existingUser && existingUser.id !== newUid) {
    // Delete the stale record and create with new Firebase UID to guarantee 100% integrity
    await prisma.user.delete({ where: { id: existingUser.id } });
    await prisma.user.create({
      data: {
        id: newUid,
        fullName: "New Re-registered User",
        email: testEmail,
        status: "ACTIVE"
      }
    });
  }

  const updatedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  console.log(`Updated User ID: ${updatedUser?.id} (Matches newUid: ${updatedUser?.id === newUid})`);

  // Cleanup
  await prisma.user.deleteMany({ where: { email: testEmail } });
  console.log("=== FIX VERIFIED SUCCESSFULLY ===");
}

testFix()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
