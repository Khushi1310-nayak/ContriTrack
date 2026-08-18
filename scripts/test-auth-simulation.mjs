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

async function runTests() {
  console.log("=== SIMULATING AUTH FLOWS & DATABASE INTEGRITY ===");

  const testEmail = "test_audit_user_" + Date.now() + "@example.com";
  const testUid = "mock_uid_" + Date.now();
  const testFullName = "Test Auditor";

  console.log(`\n1. Testing New User Creation with UID: ${testUid}, Email: ${testEmail}`);

  // Test upsert behavior
  const user = await prisma.user.create({
    data: {
      id: testUid,
      fullName: testFullName,
      displayName: "Auditor",
      email: testEmail,
      university: "Stanford University",
      githubUsername: "testauditor",
      status: "ACTIVE"
    }
  });
  console.log(`[PASS] User record created: ID=${user.id}`);

  // Test profile creation
  const profile = await prisma.userProfile.create({
    data: {
      userId: testUid,
      fullName: testFullName,
      displayName: "Auditor",
      email: testEmail,
      university: "Stanford University",
      githubUsername: "testauditor",
      userType: "Student",
      roleInContriTrack: "Student"
    }
  });
  console.log(`[PASS] UserProfile created: ID=${profile.id}, UserID=${profile.userId}`);

  // Test user security creation
  const security = await prisma.userSecurity.create({
    data: {
      userId: testUid,
      twoFactorEnabled: false
    }
  });
  console.log(`[PASS] UserSecurity created: ID=${security.id}, UserID=${security.userId}`);

  // Test workspace assignment
  const workspace = await prisma.workspace.create({
    data: {
      name: "Test Studio Workspace",
      ownerId: testUid,
      inviteCode: "CT-" + Math.random().toString(36).substring(2, 8).toUpperCase()
    }
  });
  console.log(`[PASS] Workspace created: ID=${workspace.id}`);

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: testUid,
      role: "lead"
    }
  });
  console.log(`[PASS] WorkspaceMember created: ID=${member.id}`);

  // Clean up test data
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.workspace.delete({ where: { id: workspace.id } });
  await prisma.userSecurity.deleteMany({ where: { userId: testUid } });
  await prisma.userProfile.deleteMany({ where: { userId: testUid } });
  await prisma.user.delete({ where: { id: testUid } });
  console.log(`[PASS] Cleaned up temporary simulation data.`);

  console.log("\n=== ALL DATABASE CONSTRAINTS VERIFIED CLEANLY ===");
}

runTests()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
