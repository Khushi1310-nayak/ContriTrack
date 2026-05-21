import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "default-user";
  const userEmail = searchParams.get("email") || "";
  const userName = searchParams.get("name") || "";

  // Get OAuth client credential from environment, or use demo mock values for instant out-of-the-box execution
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "Iv23li8Z1aY8G1b5c9d0";
  
  // Base64 encode state payload containing user attributes to preserve them across redirect redirects
  const statePayload = Buffer.from(JSON.stringify({ userId, email: userEmail, name: userName })).toString("base64");
  
  const callbackUrl = `${new URL(request.url).origin}/api/auth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    callbackUrl
  )}&scope=repo%20user%20read:org&state=${statePayload}`;

  return NextResponse.redirect(githubAuthUrl);
}
