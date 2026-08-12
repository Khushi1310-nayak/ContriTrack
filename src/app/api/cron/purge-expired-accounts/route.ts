import { NextResponse } from "next/server";
import { purgeExpiredArchivedAccountsAction } from "@/app/actions/settings-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await purgeExpiredArchivedAccountsAction();
    return NextResponse.json({ ...res, executedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
