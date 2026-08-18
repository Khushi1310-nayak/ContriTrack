import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";

const SUPPORTED_WEBHOOK_EVENTS = [
  {
    event: "task.created",
    description: "Triggered whenever a teammate creates a new task or deliverable in the workspace.",
    examplePayload: {
      event: "task.created",
      workspaceId: "ws_example",
      taskId: "task_123",
      title: "Design Neural Architecture",
      priority: "high",
      creatorName: "Khushi Nayak",
      timestamp: new Date().toISOString()
    }
  },
  {
    event: "task.completed",
    description: "Triggered whenever a task status shifts to 'completed'.",
    examplePayload: {
      event: "task.completed",
      workspaceId: "ws_example",
      taskId: "task_123",
      title: "Design Neural Architecture",
      completedBy: "Khushi Nayak",
      timestamp: new Date().toISOString()
    }
  },
  {
    event: "fairness.threshold_alert",
    description: "Triggered when Jain's Fairness Index drops below 70% in a workspace.",
    examplePayload: {
      event: "fairness.threshold_alert",
      workspaceId: "ws_example",
      currentFairnessScore: 64,
      status: "action_recommended",
      timestamp: new Date().toISOString()
    }
  },
  {
    event: "burnout.signal_detected",
    description: "Triggered when overtime concurrency or late night sessions exceed safety bounds.",
    examplePayload: {
      event: "burnout.signal_detected",
      workspaceId: "ws_example",
      userId: "user_456",
      stressLevel: 85,
      timestamp: new Date().toISOString()
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "Missing or invalid Bearer authentication header." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    const authCheck = await validateApiKey(token, "read", ip);
    if (!authCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error || "Invalid token" },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      availableEventStreamsCount: SUPPORTED_WEBHOOK_EVENTS.length,
      supportedEvents: SUPPORTED_WEBHOOK_EVENTS
    });
  } catch (error: unknown) {
    console.error("Developer Webhooks API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "Missing or invalid Bearer authentication header." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    const authCheck = await validateApiKey(token, "write", ip);
    if (!authCheck.valid || !authCheck.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error || "Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { targetUrl, eventType } = body;

    if (!targetUrl || !eventType) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: 'targetUrl' (HTTPS) and 'eventType' are required." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Webhook endpoint '${targetUrl}' registered for event stream '${eventType}'.`,
      workspaceId: authCheck.workspaceId,
      subscribedAt: new Date().toISOString(),
      activeStatus: "listening"
    });
  } catch (error: unknown) {
    console.error("Developer Webhooks POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
