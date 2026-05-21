import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "contritrack-default-super-secret-key-32-chars!!!";
const IV_LENGTH = 16; // For AES

export function encrypt(text: string): string {
  // Ensure key is 32 bytes by hashing the environment key
  const key = crypto.createHash("sha256").update(String(ENCRYPTION_KEY)).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  if (!text || !text.includes(":")) {
    return text; // Gracefully return if text is not formatted as cipher
  }
  try {
    const key = crypto.createHash("sha256").update(String(ENCRYPTION_KEY)).digest();
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift() || "", "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Token decryption failed, returning raw value as fallback:", err);
    return text;
  }
}
