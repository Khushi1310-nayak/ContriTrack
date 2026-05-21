import { prisma } from "./db";
import { createNotification } from "@/app/actions/notification-actions";

export function getMeetingDateTime(scheduledDate: string, startTime: string, timezone: string): Date {
  let timeStr = startTime.trim();
  let hours = 0;
  let minutes = 0;

  const ampmMatch = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
  } else {
    const match24 = timeStr.match(/^(\d+):(\d+)/);
    if (match24) {
      hours = parseInt(match24[1], 10);
      minutes = parseInt(match24[2], 10);
    }
  }

  const dateStr = `${scheduledDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  
  try {
    const dateInUTC = new Date(dateStr + "Z");
    const offsetMinutes = getTimezoneOffset(timezone, dateInUTC);
    return new Date(dateInUTC.getTime() - offsetMinutes * 60 * 1000);
  } catch (err) {
    console.error("Timezone parsing error, falling back to local: ", err);
    return new Date(dateStr);
  }
}

function getTimezoneOffset(timeZone: string, date: Date): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => parseInt(parts.find(p => p.type === type)!.value, 10);
    
    const year = getVal("year");
    const month = getVal("month");
    const day = getVal("day");
    const hour = getVal("hour");
    const minute = getVal("minute");
    const second = getVal("second");
    
    const localUTC = Date.UTC(year, month - 1, day, hour, minute, second);
    const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
    
    return (localUTC - dateUTC) / 60 / 1000;
  } catch (err) {
    if (timeZone.toLowerCase().includes("kolkata") || timeZone.toLowerCase().includes("india") || timeZone.toLowerCase() === "ist") {
      return 330; 
    }
    return 0;
  }
}

export async function processUpcomingReminders() {
  try {
    const now = new Date();
    
    const reminders = await prisma.meetingReminder.findMany({
      where: {
        sent: false,
        failed: false,
      },
      include: {
        meeting: {
          include: {
            participants: true,
          },
        },
      },
    });

    for (const reminder of reminders) {
      try {
        const meeting = reminder.meeting;
        if (!meeting) {
          await prisma.meetingReminder.update({
            where: { id: reminder.id },
            data: { failed: true },
          });
          continue;
        }

        const meetingTime = getMeetingDateTime(meeting.scheduledDate, meeting.startTime, meeting.timezone);
        const targetAlertTime = new Date(meetingTime.getTime() - reminder.minutesBefore * 60 * 1000);

        if (now >= targetAlertTime) {
          const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
          if (targetAlertTime < threeHoursAgo) {
            await prisma.meetingReminder.update({
              where: { id: reminder.id },
              data: { failed: true, sent: true },
            });
            continue;
          }

          // Atomic claim update to prevent concurrency duplicate sends
          const updated = await prisma.meetingReminder.updateMany({
            where: { id: reminder.id, sent: false },
            data: { sent: true, scheduledAt: targetAlertTime },
          });
          if (updated.count === 0) {
            continue; // Already claimed by another thread/request
          }

          const dispatches = meeting.participants.map(async (participant) => {
            if (!participant.userId) return;
            const timeLabel = reminder.minutesBefore === 0 ? "now" : `in ${reminder.minutesBefore} minutes`;
            await createNotification({
              workspaceId: meeting.workspaceId,
              senderId: meeting.creatorId || undefined,
              receiverId: participant.userId,
              type: "meeting",
              title: `📅 Meeting Reminder: ${meeting.title}`,
              message: `Your meeting "${meeting.title}" starts ${timeLabel}. Link: ${meeting.meetingLink || "N/A"}`,
              priority: "high",
              actionUrl: `/dashboard?tab=meetings&meetingId=${meeting.id}`
            });
          });

          await Promise.all(dispatches);

          await prisma.meetingReminder.update({
            where: { id: reminder.id },
            data: { deliveredAt: new Date() },
          });
        }
      } catch (err) {
        console.error(`Failed processing reminder ${reminder.id}:`, err);
        await prisma.meetingReminder.update({
          where: { id: reminder.id },
          data: { failed: true },
        });
      }
    }
  } catch (err) {
    console.error("Main sweep loop failure:", err);
  }
}

let workerStarted = false;

export function startReminderWorker() {
  if (workerStarted) return;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    // Rely purely on Vercel/Supabase crons in production to avoid thread leakage
    return;
  }
  workerStarted = true;
  console.log("[ReminderWorker] In-memory reminder daemon started.");
  
  // Sweep once immediately
  void processUpcomingReminders();

  // Then sweep every 30 seconds
  setInterval(() => {
    void processUpcomingReminders();
  }, 30000);
}
