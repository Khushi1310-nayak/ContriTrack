import { NextResponse } from "next/server";
import { processUpcomingReminders } from "@/lib/reminder-worker";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Optionally check for CRON header / authorization to secure the endpoint
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await processUpcomingReminders();
    return NextResponse.json({ success: true, processedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
