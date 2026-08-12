import { NextResponse } from "next/server";
import { purgeExpiredArchivedAccountsAction } from "@/app/actions/settings-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await purgeExpiredArchivedAccountsAction();
    return NextResponse.json({ ...res, executedAt: new Date().toISOString() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
