import { loadJSON, saveJSON } from "../utils/storage.js";

// ============================================
// v2.0 — Mobile Notifications via ntfy.sh (100% Free)
// Push notifications to any phone without an app store listing
// https://ntfy.sh — open source, self-hostable
// ============================================

interface NotifyConfig {
  serverUrl: string;
  topic: string;        // unique topic name (acts as your channel)
  enabled: boolean;
  defaultPriority: number; // 1-5
  quietHoursStart: number; // 24h format
  quietHoursEnd: number;
  tags: Record<string, string>; // emoji tags for message types
}

const DEFAULT_CONFIG: NotifyConfig = {
  serverUrl: "https://ntfy.sh",
  topic: "study-companion-" + Math.random().toString(36).slice(2, 8),
  enabled: true,
  defaultPriority: 3,
  quietHoursStart: 23,  // 11 PM
  quietHoursEnd: 7,     // 7 AM
  tags: {
    study: "books",
    revision: "brain",
    milestone: "trophy",
    reminder: "bell",
    streak: "fire",
    warning: "warning",
  },
};

function getConfig(): NotifyConfig {
  return loadJSON<NotifyConfig>("notify-config.json", DEFAULT_CONFIG);
}

function isQuietHours(): boolean {
  const config = getConfig();
  const hour = new Date().getHours();
  if (config.quietHoursStart > config.quietHoursEnd) {
    return hour >= config.quietHoursStart || hour < config.quietHoursEnd;
  }
  return hour >= config.quietHoursStart && hour < config.quietHoursEnd;
}

// --- Send Notifications ---

export async function sendNotification(
  title: string,
  message: string,
  options?: {
    priority?: number;  // 1(min) to 5(max)
    tags?: string[];    // emoji shortcodes
    click?: string;     // URL to open on click
    type?: string;      // for tag lookup
    bypassQuietHours?: boolean;
  }
): Promise<object> {
  const config = getConfig();

  if (!config.enabled) {
    return { sent: false, reason: "Notifications disabled. Use configure_notifications to enable." };
  }

  if (isQuietHours() && !options?.bypassQuietHours) {
    return {
      sent: false,
      reason: `Quiet hours (${config.quietHoursStart}:00 - ${config.quietHoursEnd}:00). Use bypassQuietHours to override.`,
      queued: true,
    };
  }

  // Resolve emoji tags
  const tags: string[] = options?.tags || [];
  if (options?.type && config.tags[options.type]) {
    tags.push(config.tags[options.type]);
  }

  try {
    const res = await fetch(`${config.serverUrl}/${config.topic}`, {
      method: "POST",
      headers: {
        "Title": title,
        "Priority": String(options?.priority || config.defaultPriority),
        "Tags": tags.join(","),
        ...(options?.click ? { "Click": options.click } : {}),
      },
      body: message,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { sent: false, error: `ntfy error ${res.status}: ${errText}` };
    }

    // Log notification
    const log = loadJSON<any[]>("notification-log.json", []);
    log.push({
      title,
      message: message.slice(0, 100),
      timestamp: new Date().toISOString(),
      priority: options?.priority || config.defaultPriority,
    });
    if (log.length > 200) log.splice(0, log.length - 200);
    saveJSON("notification-log.json", log);

    return {
      sent: true,
      topic: config.topic,
      title,
      priority: options?.priority || config.defaultPriority,
    };
  } catch (err: any) {
    return { sent: false, error: `Failed to send: ${err.message}` };
  }
}

// --- Pre-built Notification Types ---

export async function notifyStudyReminder(
  topic: string,
  startTime: string,
  minutesBefore: number = 10
): Promise<object> {
  return sendNotification(
    `📚 Study Session in ${minutesBefore}min`,
    `Time to study: ${topic}\nStarting at ${startTime}\n\nConsistency > Intensity. Let's go!`,
    { priority: 4, type: "reminder" }
  );
}

export async function notifyStreakUpdate(
  currentStreak: number,
  totalHours: number
): Promise<object> {
  const messages = [
    `${currentStreak} day streak! 🔥 ${totalHours}h total. Keep it alive!`,
    `${currentStreak} days strong! Your future self thanks you.`,
    `Streak: ${currentStreak} days, ${totalHours}h invested. Compounding knowledge.`,
  ];

  return sendNotification(
    `🔥 ${currentStreak}-Day Study Streak!`,
    messages[currentStreak % messages.length],
    { priority: 3, type: "streak" }
  );
}

export async function notifyRevisionDue(
  dueCount: number,
  topConcepts: string[]
): Promise<object> {
  return sendNotification(
    `🧠 ${dueCount} Reviews Due Today`,
    `Spaced repetition items ready:\n${topConcepts.slice(0, 3).map((c) => `• ${c}`).join("\n")}\n${dueCount > 3 ? `...and ${dueCount - 3} more` : ""}`,
    { priority: 3, type: "revision" }
  );
}

export async function notifyMilestoneComplete(
  project: string,
  milestone: string
): Promise<object> {
  return sendNotification(
    `🏆 Milestone Complete!`,
    `${project}: "${milestone}"\n\nAnother step toward the Lotfollahi lab. Celebrate this win! 🎉`,
    { priority: 4, type: "milestone" }
  );
}

export async function notifyWeeklySummary(summary: {
  hours: number;
  streak: number;
  topicsCompleted: number;
  papersRead: number;
}): Promise<object> {
  return sendNotification(
    `📊 Weekly Study Summary`,
    `Hours: ${summary.hours}h\nStreak: ${summary.streak} days\nTopics: ${summary.topicsCompleted} completed\nPapers: ${summary.papersRead} read\n\nKeep building momentum! 💪`,
    { priority: 3, type: "study" }
  );
}

// --- Configuration ---

export function configureNotifications(updates: Partial<NotifyConfig>): object {
  const config = getConfig();
  const newConfig = { ...config, ...updates };
  saveJSON("notify-config.json", newConfig);

  return {
    message: "Notification settings updated.",
    config: newConfig,
    setup: {
      step1: `Install ntfy app on your phone: https://ntfy.sh`,
      step2: `Subscribe to topic: ${newConfig.topic}`,
      step3: "You'll now receive push notifications!",
      note: "FREE — no account needed. Works on Android (Play Store) and iOS (App Store).",
      selfHost: "Optional: self-host ntfy server with `docker run -p 8080:80 binwiederhier/ntfy`",
    },
  };
}

export function getNotificationHistory(limit: number = 20): object {
  const log = loadJSON<any[]>("notification-log.json", []);
  return {
    notifications: log.slice(-limit).reverse(),
    total: log.length,
    config: {
      topic: getConfig().topic,
      enabled: getConfig().enabled,
      quietHours: `${getConfig().quietHoursStart}:00 - ${getConfig().quietHoursEnd}:00`,
    },
  };
}

export function testNotification(): Promise<object> {
  return sendNotification(
    "🧪 Test Notification",
    "Study Companion MCP is connected! You'll receive study reminders, streak updates, and milestone celebrations here.",
    { priority: 3, tags: ["white_check_mark"], bypassQuietHours: true }
  );
}
