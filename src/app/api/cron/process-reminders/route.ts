import { NextResponse } from "next/server";
import { processUpcomingReminders } from "@/lib/reminder-worker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await processUpcomingReminders();
    return NextResponse.json({ success: true, processedAt: new Date().toISOString() });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message || String(error) }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
