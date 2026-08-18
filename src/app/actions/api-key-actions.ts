"use server";

import { prisma } from "@/lib/db";
import crypto from "crypto";

// Secure helper to ensure the ApiKey table is dynamically initialized in PostgreSQL
async function ensureApiKeyTableExists() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ApiKey" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "hashedKey" TEXT UNIQUE NOT NULL,
        "previewKey" TEXT NOT NULL,
        "permissions" TEXT[] NOT NULL DEFAULT '{}',
        "lastUsedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "revoked" BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
  } catch (error) {
    console.error("Error checking or creating ApiKey table:", error);
  }
}

export interface ApiKeyMetadata {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  previewKey: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  revoked: boolean;
}

/**
 * Generate a new secure API token for a workspace
 */
export async function createApiKeyAction(
  userId: string,
  workspaceId: string,
  name: string,
  permissions: string[],
  expiresInDays: number | null
): Promise<{ success: boolean; rawKey?: string; key?: ApiKeyMetadata; error?: string }> {
  try {
    await ensureApiKeyTableExists();

    if (!userId || !workspaceId || !name) {
      return { success: false, error: "Missing required parameters" };
    }

    // 1. Create a secure, cryptographically random token
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const rawKey = `ct_live_${randomBytes}`;

    // 2. Hash token for secure comparison
    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    // 3. Create key preview (visible in lists)
    const previewKey = `ct_live_••••${rawKey.slice(-6)}`;

    // 4. Calculate expiration timestamp
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) 
      : null;

    const id = crypto.randomUUID();

    // 5. Store API Key securely using safe parameterized SQL execution
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ApiKey" ("id", "userId", "workspaceId", "name", "hashedKey", "previewKey", "permissions", "expiresAt", "revoked", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())
    `, 
      id, 
      userId, 
      workspaceId, 
      name, 
      hashedKey, 
      previewKey, 
      permissions, 
      expiresAt
    );

    const keyMetadata: ApiKeyMetadata = {
      id,
      userId,
      workspaceId,
      name,
      previewKey,
      permissions,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      revoked: false
    };

    return { success: true, rawKey, key: keyMetadata };
  } catch (error) {
    console.error("Failed to create API key:", error);
    return { success: false, error: (error as Error).message };
  }
}

interface ApiKeyRawRow {
  id: string;
  userId: string;
  workspaceId: string;
  name?: string;
  previewKey?: string;
  permissions?: string[];
  lastUsedAt?: Date | string | null;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  revoked: boolean;
}

/**
 * Get all API keys for a user's workspace
 */
export async function getApiKeysAction(userId: string, workspaceId: string): Promise<ApiKeyMetadata[]> {
  try {
    await ensureApiKeyTableExists();

    const keys = await prisma.$queryRawUnsafe<ApiKeyRawRow[]>(`
      SELECT "id", "userId", "workspaceId", "name", "previewKey", "permissions", "lastUsedAt", "createdAt", "expiresAt", "revoked"
      FROM "ApiKey"
      WHERE "userId" = $1 AND "workspaceId" = $2 AND "revoked" = FALSE
      ORDER BY "createdAt" DESC
    `, userId, workspaceId);

    return keys.map(k => ({
      id: k.id,
      userId: k.userId,
      workspaceId: k.workspaceId,
      name: k.name || "",
      previewKey: k.previewKey || "",
      permissions: Array.isArray(k.permissions) ? k.permissions : [],
      lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
      createdAt: new Date(k.createdAt).toISOString(),
      expiresAt: k.expiresAt ? new Date(k.expiresAt).toISOString() : null,
      revoked: k.revoked
    }));
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return [];
  }
}

/**
 * Revoke an API key completely
 */
export async function revokeApiKeyAction(keyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureApiKeyTableExists();

    await prisma.$executeRawUnsafe(`
      UPDATE "ApiKey"
      SET "revoked" = TRUE
      WHERE "id" = $1
    `, keyId);

    return { success: true };
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Validate an API key in incoming request streams and logs activity
 */
export async function validateApiKey(
  rawKey: string, 
  requiredPermission: string,
  ipAddress: string = "127.0.0.1"
): Promise<{ valid: boolean; workspaceId?: string; userId?: string; error?: string }> {
  try {
    await ensureApiKeyTableExists();
    if (process.env.NODE_ENV === "development" && ipAddress) {
      // Track verified client connection
    }

    if (!rawKey.startsWith("ct_live_")) {
      return { valid: false, error: "Invalid credentials prefix" };
    }

    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    const keys = await prisma.$queryRawUnsafe<ApiKeyRawRow[]>(`
      SELECT "id", "userId", "workspaceId", "permissions", "expiresAt", "revoked"
      FROM "ApiKey"
      WHERE "hashedKey" = $1 AND "revoked" = FALSE
      LIMIT 1
    `, hashedKey);

    if (keys.length === 0) {
      return { valid: false, error: "Credentials token does not exist" };
    }

    const key = keys[0];

    // Check expiration bounds
    if (key.expiresAt && new Date(key.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: "Credentials token has expired" };
    }

    // Permission validations
    const permissions: string[] = Array.isArray(key.permissions) ? key.permissions : [];
    const hasPermission = 
      permissions.includes("admin") ||
      permissions.includes(requiredPermission) ||
      permissions.some(p => 
        p === requiredPermission || 
        p.startsWith(requiredPermission + ":") || 
        (requiredPermission === "read" && p.startsWith("read")) ||
        (requiredPermission === "write" && p.startsWith("write"))
      );

    if (!hasPermission) {
      return { valid: false, error: `Unauthorized. Key requires permission: ${requiredPermission}` };
    }

    // Update lastUsedAt in the background
    await prisma.$executeRawUnsafe(`
      UPDATE "ApiKey"
      SET "lastUsedAt" = NOW()
      WHERE "id" = $1
    `, key.id);

    return { valid: true, workspaceId: key.workspaceId, userId: key.userId };
  } catch (error) {
    console.error("Failed to validate key:", error);
    return { valid: false, error: "Internal validation failure" };
  }
}
