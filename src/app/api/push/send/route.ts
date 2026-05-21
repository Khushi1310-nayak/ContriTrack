import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/app/actions/notification-actions";

/**
 * Programmatic Web Push HTTP POST trigger
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      senderId,
      receiverId,
      type,
      title,
      message,
      priority,
      actionUrl
    } = body;

    if (!workspaceId || !receiverId || !type || !title || !message || !priority) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const res = await createNotification({
      workspaceId,
      senderId,
      receiverId,
      type,
      title,
      message,
      priority,
      actionUrl
    });

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, notification: res.notification });
  } catch (err: any) {
    console.error("Error in api/push/send route:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
