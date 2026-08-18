import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

// GET: Retrieve all active tasks under authorized workspace
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
        { success: false, error: "Unauthorized", message: authCheck.error },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId: authCheck.workspaceId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        createdAt: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      requestedAt: new Date().toISOString(),
      workspaceId: authCheck.workspaceId,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        assignee: t.assignee
      }))
    });
  } catch (error: unknown) {
    console.error("API Tasks query error:", error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: err.message || String(error) },
      { status: 500 }
    );
  }
}

// POST: Create and insert new Task inside the workspace
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
    if (!authCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: authCheck.error },
        { status: 401 }
      );
    }

    const limitResponse = rateLimiter(token);
    if (limitResponse) return limitResponse;

    const payload = await request.json();
    const { title, description, priority = "medium", status = "todo", assigneeId } = payload;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Bad Request", message: "Task 'title' is a required parameter." },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        status,
        workspaceId: authCheck.workspaceId!,
        creatorId: authCheck.userId!,
        assigneeId: assigneeId || null
      }
    });

    return NextResponse.json({
      success: true,
      message: "Task created successfully inside authorized workspace scope.",
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        workspaceId: task.workspaceId,
        createdAt: task.createdAt
      }
    });
  } catch (error: unknown) {
    console.error("API Task creation error:", error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: err.message || String(error) },
      { status: 500 }
    );
  }
}
