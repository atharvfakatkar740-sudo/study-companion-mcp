import { loadJSON, saveJSON } from "../utils/storage.js";
import { STUDY_PHASES } from "../data/study-plan.js";

// ============================================
// Google Calendar Integration
// Generates scheduling data compatible with Google Calendar MCP
// ============================================

interface ScheduledSession {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  topic: string;
  type: "study" | "revision" | "project" | "paper" | "blog";
  recurring?: boolean;
  calendarEventCreated?: boolean;
}

interface WeeklyScheduleTemplate {
  weekday: DayTemplate[];
  weekend: DayTemplate[];
}

interface DayTemplate {
  startHour: number;
  endHour: number;
  activity: string;
  topic?: string;
}

const DEFAULT_WEEKDAY_TEMPLATE: DayTemplate[] = [
  { startHour: 20, endHour: 21, activity: "Paper Reading / Theory" },
  { startHour: 21, endHour: 22, activity: "Implementation / Coding" },
  { startHour: 22, endHour: 23, activity: "Math + Experiments" },
];

const DEFAULT_WEEKEND_TEMPLATE: DayTemplate[] = [
  { startHour: 8, endHour: 10, activity: "Deep Focus: Implementation" },
  { startHour: 10, endHour: 10.5, activity: "Break" },
  { startHour: 10.5, endHour: 12.5, activity: "Paper Reading + Notes" },
  { startHour: 12.5, endHour: 13.5, activity: "Lunch Break" },
  { startHour: 13.5, endHour: 15.5, activity: "Project Work" },
  { startHour: 15.5, endHour: 16, activity: "Break" },
  { startHour: 16, endHour: 17.5, activity: "Spaced Repetition + Review" },
  { startHour: 17.5, endHour: 18.5, activity: "Blog Writing / Documentation" },
];

function getScheduleConfig(): WeeklyScheduleTemplate {
  return loadJSON<WeeklyScheduleTemplate>("schedule-config.json", {
    weekday: DEFAULT_WEEKDAY_TEMPLATE,
    weekend: DEFAULT_WEEKEND_TEMPLATE,
  });
}

export function scheduleStudySessions(
  startDate: string,
  daysAhead: number = 7,
  customTopics?: string[]
): object {
  const config = getScheduleConfig();
  const plannerState = loadJSON<{
    currentPhaseOverride?: string;
    startDate: string;
    completedTopics: string[];
  }>("planner-state.json", { startDate: new Date().toISOString().split("T")[0], completedTopics: [] });

  // Determine current phase topics
  const currentPhaseId = plannerState.currentPhaseOverride || getCurrentPhaseFromDate(plannerState.startDate);
  const phase = STUDY_PHASES.find((p) => p.id === currentPhaseId);
  const activeTopics = customTopics || phase?.topics
    .filter((t) => !plannerState.completedTopics.includes(t.id))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 4)
    .map((t) => t.name) || ["General Study"];

  // Get revisions due
  const revisions = loadJSON<any[]>("revisions.json", []);
  const today = new Date().toISOString().split("T")[0];
  const hasDueRevisions = revisions.some((r: any) => r.nextReview <= today);

  const sessions: ScheduledSession[] = [];
  const start = new Date(startDate);

  for (let day = 0; day < daysAhead; day++) {
    const date = new Date(start.getTime() + day * 24 * 60 * 60 * 1000);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const template = isWeekend ? config.weekend : config.weekday;
    const dateStr = date.toISOString().split("T")[0];

    let topicIndex = day % activeTopics.length;

    for (const slot of template) {
      if (slot.activity === "Break" || slot.activity === "Lunch Break") continue;

      const startHour = Math.floor(slot.startHour);
      const startMin = Math.round((slot.startHour - startHour) * 60);
      const endHour = Math.floor(slot.endHour);
      const endMin = Math.round((slot.endHour - endHour) * 60);

      const sessionStart = `${dateStr}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;
      const sessionEnd = `${dateStr}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

      let topic = activeTopics[topicIndex % activeTopics.length];
      let sessionType: ScheduledSession["type"] = "study";

      if (slot.activity.toLowerCase().includes("revision") || slot.activity.toLowerCase().includes("review")) {
        sessionType = "revision";
        topic = hasDueRevisions ? "Spaced Repetition Review" : topic;
      } else if (slot.activity.toLowerCase().includes("project")) {
        sessionType = "project";
      } else if (slot.activity.toLowerCase().includes("paper")) {
        sessionType = "paper";
      } else if (slot.activity.toLowerCase().includes("blog") || slot.activity.toLowerCase().includes("document")) {
        sessionType = "blog";
      }

      sessions.push({
        id: `session-${dateStr}-${startHour}${startMin}`,
        title: `📚 ${slot.activity}: ${topic}`,
        description: `Study session - ${slot.activity}\nTopic: ${topic}\nPhase: ${phase?.name || "Unknown"}\n\nRemember: Consistency > Intensity`,
        startTime: sessionStart,
        endTime: sessionEnd,
        topic,
        type: sessionType,
      });

      topicIndex++;
    }
  }

  // Save scheduled sessions
  saveJSON("scheduled-sessions.json", sessions);

  // Generate Google Calendar compatible format
  const calendarEvents = sessions.map((s) => ({
    summary: s.title,
    description: s.description,
    start: { dateTime: s.startTime, timeZone: "Asia/Kolkata" },
    end: { dateTime: s.endTime, timeZone: "Asia/Kolkata" },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 10 }],
    },
    colorId: getColorForType(s.type),
  }));

  return {
    message: `Generated ${sessions.length} study sessions for ${daysAhead} days starting ${startDate}.`,
    sessions: sessions.map((s) => ({
      date: s.startTime.split("T")[0],
      time: `${s.startTime.split("T")[1].slice(0, 5)} - ${s.endTime.split("T")[1].slice(0, 5)}`,
      title: s.title,
      type: s.type,
    })),
    calendarEvents,
    googleCalendarInstructions: {
      note: "These events are formatted for Google Calendar API. To create them:",
      option1: "Use the Google Calendar MCP server with these event objects",
      option2: "Copy the calendarEvents array and use it with the Google Calendar API directly",
      timeZone: "Asia/Kolkata (IST, UTC+05:30)",
    },
    weeklyBreakdown: {
      weekdayHoursPerDay: config.weekday.reduce((sum, s) => sum + (s.endHour - s.startHour), 0),
      weekendHoursPerDay: config.weekend.filter((s) => !s.activity.includes("Break")).reduce((sum, s) => sum + (s.endHour - s.startHour), 0),
      totalWeeklyHours: config.weekday.reduce((sum, s) => sum + (s.endHour - s.startHour), 0) * 5 +
        config.weekend.filter((s) => !s.activity.includes("Break")).reduce((sum, s) => sum + (s.endHour - s.startHour), 0) * 2,
    },
  };
}

export function updateScheduleTemplate(
  dayType: "weekday" | "weekend",
  slots: { startHour: number; endHour: number; activity: string }[]
): object {
  const config = getScheduleConfig();
  config[dayType] = slots;
  saveJSON("schedule-config.json", config);

  return {
    success: true,
    message: `${dayType} schedule template updated with ${slots.length} slots.`,
    newTemplate: slots,
  };
}

export function getNextStudySession(): object {
  const sessions = loadJSON<ScheduledSession[]>("scheduled-sessions.json", []);
  const now = new Date().toISOString();

  const upcoming = sessions
    .filter((s) => s.startTime > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (upcoming.length === 0) {
    return {
      message: "No upcoming sessions scheduled. Use schedule_study_sessions to plan your week.",
      suggestion: "Run: schedule_study_sessions with today's date and 7 days ahead.",
    };
  }

  const next = upcoming[0];
  const nextDate = new Date(next.startTime);
  const diffMs = nextDate.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (60 * 60 * 1000) * 10) / 10;

  return {
    nextSession: {
      title: next.title,
      date: next.startTime.split("T")[0],
      time: `${next.startTime.split("T")[1].slice(0, 5)} - ${next.endTime.split("T")[1].slice(0, 5)}`,
      topic: next.topic,
      type: next.type,
      startsIn: diffHours > 24 ? `${Math.round(diffHours / 24)} days` : `${diffHours} hours`,
    },
    todayRemaining: upcoming.filter((s) => s.startTime.split("T")[0] === now.split("T")[0]).length,
    totalUpcoming: upcoming.length,
  };
}

export function createCalendarEvent(
  title: string,
  date: string,
  startHour: number,
  durationMinutes: number,
  description?: string
): object {
  const startMin = Math.round((startHour - Math.floor(startHour)) * 60);
  const startH = Math.floor(startHour);

  const startTime = `${date}T${String(startH).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;
  const endDate = new Date(`${date}T${String(startH).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);
  const endTime = endDate.toISOString().replace("Z", "").split(".")[0];

  const event = {
    summary: title,
    description: description || `Study session: ${title}`,
    start: { dateTime: startTime, timeZone: "Asia/Kolkata" },
    end: { dateTime: endTime, timeZone: "Asia/Kolkata" },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 10 }],
    },
  };

  return {
    message: "Calendar event generated. Pass this to Google Calendar MCP to create it.",
    event,
    instructions: "Use the Google Calendar MCP server's create_event tool with this event data.",
  };
}

export function getWeeklyScheduleOverview(): object {
  const config = getScheduleConfig();

  const weekdayHours = config.weekday
    .filter((s) => !s.activity.includes("Break"))
    .reduce((sum, s) => sum + (s.endHour - s.startHour), 0);

  const weekendHours = config.weekend
    .filter((s) => !s.activity.includes("Break"))
    .reduce((sum, s) => sum + (s.endHour - s.startHour), 0);

  return {
    title: "Weekly Schedule Overview",
    weekday: {
      totalHours: weekdayHours,
      slots: config.weekday.map((s) => ({
        time: `${formatHour(s.startHour)} - ${formatHour(s.endHour)}`,
        activity: s.activity,
        duration: `${(s.endHour - s.startHour) * 60}min`,
      })),
    },
    weekend: {
      totalHours: weekendHours,
      slots: config.weekend.map((s) => ({
        time: `${formatHour(s.startHour)} - ${formatHour(s.endHour)}`,
        activity: s.activity,
        duration: `${(s.endHour - s.startHour) * 60}min`,
      })),
    },
    totalWeeklyHours: weekdayHours * 5 + weekendHours * 2,
    targetHours: 25,
    onTrack: (weekdayHours * 5 + weekendHours * 2) >= 20,
  };
}

// --- Helpers ---

function getCurrentPhaseFromDate(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  for (const phase of STUDY_PHASES) {
    if (monthsElapsed >= phase.monthRange[0] && monthsElapsed <= phase.monthRange[1]) {
      return phase.id;
    }
  }
  return STUDY_PHASES[STUDY_PHASES.length - 1].id;
}

function priorityRank(priority: string): number {
  switch (priority) {
    case "critical": return 0;
    case "high": return 1;
    case "medium": return 2;
    case "low": return 3;
    default: return 4;
  }
}

function getColorForType(type: string): string {
  switch (type) {
    case "study": return "9"; // blueberry
    case "revision": return "6"; // tangerine
    case "project": return "10"; // sage
    case "paper": return "3"; // grape
    case "blog": return "5"; // banana
    default: return "1";
  }
}

function formatHour(h: number): string {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${String(min).padStart(2, "0")} ${period}`;
}
