import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-key-actions";
import { rateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

// GET: Retrieve all logged meetings under authorized workspace scope
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

    const meetings = await prisma.meeting.findMany({
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
        platform: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        status: true,
        meetingLink: true,
        participants: {
          select: {
            userEmail: true,
            userFullName: true,
            role: true,
            attendanceStatus: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      requestedAt: new Date().toISOString(),
      workspaceId: authCheck.workspaceId,
      meetings: meetings.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        platform: m.platform,
        scheduledDate: m.scheduledDate,
        startTime: m.startTime,
        endTime: m.endTime,
        status: m.status,
        meetingLink: m.meetingLink,
        participants: m.participants
      }))
    });
  } catch (error: unknown) {
    console.error("API Meetings query error:", error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: err.message || String(error) },
      { status: 500 }
    );
  }
}

// POST: Register a sync meeting in the workspace
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
    const { title, description, platform = "meet", scheduledDate, startTime, endTime, meetingLink } = payload;

    if (!title || !scheduledDate || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: "Bad Request", message: "Parameters 'title', 'scheduledDate', 'startTime', and 'endTime' are required." },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        platform,
        scheduledDate,
        startTime,
        endTime,
        meetingLink,
        workspaceId: authCheck.workspaceId!,
        creatorId: authCheck.userId!,
        status: "upcoming"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Sync meeting registered successfully inside authorised workspace scope.",
      meeting: {
        id: meeting.id,
        title: meeting.title,
        platform: meeting.platform,
        scheduledDate: meeting.scheduledDate,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        workspaceId: meeting.workspaceId
      }
    });
  } catch (error: unknown) {
    console.error("API Meeting creation error:", error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: err.message || String(error) },
      { status: 500 }
    );
  }
}
