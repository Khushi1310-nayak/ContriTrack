"use server";

import { prisma } from "@/lib/db";
import { startReminderWorker } from "@/lib/reminder-worker";
import { createNotification } from "@/app/actions/notification-actions";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface CreateMeetingInput {
  workspaceId: string;
  creatorId: string;
  title: string;
  description?: string;
  platform: string;
  meetingLink?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  recurring?: boolean;
  recurrenceRule?: string;
  participantIds?: string[];
  agendaItems?: { title: string; description?: string }[];
  reminderMinutes?: number[];
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  platform?: string;
  meetingLink?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  recurring?: boolean;
  recurrenceRule?: string;
  status?: string;
}

// ─────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────

/**
 * Fetch all meetings for a workspace, ordered by date + time
 */
export async function fetchWorkspaceMeetings(workspaceId: string) {
  try {
    const meetings = await prisma.meeting.findMany({
      where: { workspaceId },
      include: {
        participants: true,
        agenda: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
        reminders: true,
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    });
    return { success: true, meetings };
  } catch (error) {
    console.error("fetchWorkspaceMeetings error:", error);
    return { success: false, error: "Failed to load meetings.", meetings: [] };
  }
}

/**
 * Fetch only upcoming meetings (for reminder banner)
 */
export async function fetchUpcomingMeetings(workspaceId: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const meetings = await prisma.meeting.findMany({
      where: {
        workspaceId,
        scheduledDate: { gte: today },
        status: { in: ["upcoming", "live"] },
      },
      include: { participants: true },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      take: 5,
    });
    return { success: true, meetings };
  } catch (error) {
    console.error("fetchUpcomingMeetings error:", error);
    return { success: false, meetings: [] };
  }
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

/**
 * Create a new meeting with participants, agenda items, and reminders
 */
export async function createMeeting(input: CreateMeetingInput) {
  try {
    const meeting = await prisma.meeting.create({
      data: {
        workspaceId: input.workspaceId,
        creatorId: input.creatorId,
        title: input.title,
        description: input.description || null,
        platform: input.platform || "meet",
        meetingLink: input.meetingLink || null,
        scheduledDate: input.scheduledDate,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone || "Asia/Kolkata",
        recurring: input.recurring || false,
        recurrenceRule: input.recurrenceRule || null,
        status: "upcoming",
      },
    });

    // Seed participants
    if (input.participantIds && input.participantIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: input.participantIds } },
      });
      await prisma.meetingParticipant.createMany({
        data: users.map((u) => ({
          meetingId: meeting.id,
          userId: u.id,
          userEmail: u.email,
          userFullName: u.fullName,
          role: u.id === input.creatorId ? "host" : "participant",
          attendanceStatus: u.id === input.creatorId ? "accepted" : "pending",
        })),
        skipDuplicates: true,
      });
    }

    // Seed agenda items
    if (input.agendaItems && input.agendaItems.length > 0) {
      await prisma.meetingAgenda.createMany({
        data: input.agendaItems.map((item) => ({
          meetingId: meeting.id,
          title: item.title,
          description: item.description || null,
          createdBy: input.creatorId,
        })),
      });
    }

    // Seed reminders
    const minutesList = input.reminderMinutes || [15];
    await prisma.meetingReminder.createMany({
      data: minutesList.map((min) => ({
        meetingId: meeting.id,
        reminderType: "in_app",
        minutesBefore: min,
      })),
    });

    // Return full meeting with relations
    const full = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        participants: true,
        agenda: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
        reminders: true,
      },
    });

    // Notify all participants (except the creator) about the new meeting
    if (input.participantIds && input.participantIds.length > 0) {
      const creator = await prisma.user.findUnique({ where: { id: input.creatorId } });
      const creatorName = creator?.fullName || "Teammate";
      const notifyIds = input.participantIds.filter(id => id !== input.creatorId);
      for (const participantId of notifyIds) {
        await createNotification({
          workspaceId: input.workspaceId,
          senderId: input.creatorId,
          receiverId: participantId,
          type: "meeting",
          title: `📅 New Meeting: ${input.title}`,
          message: `${creatorName} scheduled a meeting "${input.title}" on ${input.scheduledDate} at ${input.startTime}`,
          priority: "high",
          actionUrl: `/dashboard?tab=meetings&meetingId=${meeting.id}`
        });
      }
    }

    return { success: true, meeting: full };
  } catch (error) {
    console.error("createMeeting error:", error);
    return { success: false, error: "Failed to create meeting." };
  }
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

/**
 * Update any meeting fields
 */
export async function updateMeeting(meetingId: string, input: UpdateMeetingInput) {
  try {
    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.platform !== undefined && { platform: input.platform }),
        ...(input.meetingLink !== undefined && { meetingLink: input.meetingLink }),
        ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
        ...(input.startTime !== undefined && { startTime: input.startTime }),
        ...(input.endTime !== undefined && { endTime: input.endTime }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.recurring !== undefined && { recurring: input.recurring }),
        ...(input.recurrenceRule !== undefined && { recurrenceRule: input.recurrenceRule }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: {
        participants: true,
        agenda: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
        reminders: true,
      },
    });
    return { success: true, meeting };
  } catch (error) {
    console.error("updateMeeting error:", error);
    return { success: false, error: "Failed to update meeting." };
  }
}

/**
 * Soft-cancel a meeting (keeps record, changes status)
 */
export async function cancelMeeting(meetingId: string) {
  try {
    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "cancelled" },
      include: { participants: true, agenda: true, notes: true, reminders: true },
    });
    return { success: true, meeting };
  } catch (error) {
    console.error("cancelMeeting error:", error);
    return { success: false, error: "Failed to cancel meeting." };
  }
}

/**
 * Hard-delete a meeting
 */
export async function deleteMeeting(meetingId: string) {
  try {
    await prisma.meeting.delete({ where: { id: meetingId } });
    return { success: true };
  } catch (error) {
    console.error("deleteMeeting error:", error);
    return { success: false, error: "Failed to delete meeting." };
  }
}

/**
 * Duplicate an existing meeting to a new date (tomorrow by default)
 */
export async function duplicateMeeting(meetingId: string, creatorId: string, newDate?: string) {
  try {
    const original = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true, agenda: true, reminders: true },
    });
    if (!original) return { success: false, error: "Meeting not found." };

    const targetDate = newDate || (() => {
      const d = new Date(original.scheduledDate);
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    })();

    return createMeeting({
      workspaceId: original.workspaceId,
      creatorId,
      title: `${original.title} (Copy)`,
      description: original.description || undefined,
      platform: original.platform,
      meetingLink: original.meetingLink || undefined,
      scheduledDate: targetDate,
      startTime: original.startTime,
      endTime: original.endTime,
      timezone: original.timezone,
      recurring: original.recurring,
      recurrenceRule: original.recurrenceRule || undefined,
      participantIds: original.participants.map((p) => p.userId).filter(Boolean) as string[],
      agendaItems: original.agenda.map((a) => ({ title: a.title, description: a.description || undefined })),
      reminderMinutes: original.reminders.map((r) => r.minutesBefore),
    });
  } catch (error) {
    console.error("duplicateMeeting error:", error);
    return { success: false, error: "Failed to duplicate meeting." };
  }
}

// ─────────────────────────────────────────────
// PARTICIPANTS
// ─────────────────────────────────────────────

/**
 * Update a participant's RSVP attendance status
 */
export async function updateParticipantStatus(
  meetingId: string,
  userId: string,
  status: string
) {
  try {
    const participant = await prisma.meetingParticipant.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      update: {
        attendanceStatus: status,
        joinedAt: status === "attended" ? new Date() : undefined,
      },
      create: {
        meetingId,
        userId,
        attendanceStatus: status,
        role: "participant",
      },
    });
    return { success: true, participant };
  } catch (error) {
    console.error("updateParticipantStatus error:", error);
    return { success: false, error: "Failed to update attendance." };
  }
}

// ─────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────

/**
 * Add a collaborative note to a meeting
 */
export async function addMeetingNote(
  meetingId: string,
  authorId: string,
  authorName: string,
  content: string
) {
  try {
    const note = await prisma.meetingNote.create({
      data: { meetingId, authorId, authorName, content },
    });
    return { success: true, note };
  } catch (error) {
    console.error("addMeetingNote error:", error);
    return { success: false, error: "Failed to save note." };
  }
}

// ─────────────────────────────────────────────
// AGENDA
// ─────────────────────────────────────────────

/**
 * Add a new agenda item to an existing meeting
 */
export async function addAgendaItem(
  meetingId: string,
  title: string,
  description: string | undefined,
  createdBy: string
) {
  try {
    const item = await prisma.meetingAgenda.create({
      data: { meetingId, title, description: description || null, createdBy },
    });
    return { success: true, item };
  } catch (error) {
    console.error("addAgendaItem error:", error);
    return { success: false, error: "Failed to add agenda item." };
  }
}

/**
 * Toggle an agenda item's completed state
 */
export async function toggleAgendaItem(agendaId: string, completed: boolean) {
  try {
    const item = await prisma.meetingAgenda.update({
      where: { id: agendaId },
      data: { completed },
    });
    return { success: true, item };
  } catch (error) {
    console.error("toggleAgendaItem error:", error);
    return { success: false, error: "Failed to toggle agenda item." };
  }
}

/**
 * Start the background meeting reminder daemon safely on the server
 */
export async function triggerReminderDaemon() {
  try {
    startReminderWorker();
    return { success: true };
  } catch (err) {
    console.error("Failed to start reminder daemon:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
