import { google, calendar_v3 } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadJSON, saveJSON } from "../utils/storage.js";

// ============================================
// v2.0 — Google Calendar OAuth Real-Time Sync
// Free tier: 1M queries/day (more than enough)
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const CREDENTIALS_PATH = join(DATA_DIR, "gcal-credentials.json");
const TOKEN_PATH = join(DATA_DIR, "gcal-token.json");

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

interface GCalConfig {
  calendarId: string;
  timeZone: string;
  colorMapping: Record<string, string>;
  reminderMinutes: number;
}

const DEFAULT_CONFIG: GCalConfig = {
  calendarId: "primary",
  timeZone: "Asia/Kolkata",
  colorMapping: {
    study: "9",     // blueberry
    revision: "6",  // tangerine
    project: "10",  // sage
    paper: "3",     // grape
    blog: "5",      // banana
  },
  reminderMinutes: 10,
};

function getConfig(): GCalConfig {
  return loadJSON<GCalConfig>("gcal-config.json", DEFAULT_CONFIG);
}

// --- OAuth2 Flow ---

function getOAuth2Client(): any {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      "Google Calendar credentials not found.\n\n" +
      "Setup (FREE — no credit card needed):\n" +
      "1. Go to https://console.cloud.google.com/\n" +
      "2. Create a project (or select existing)\n" +
      "3. Enable 'Google Calendar API'\n" +
      "4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID\n" +
      "5. Application type: Desktop App\n" +
      "6. Download the JSON and save it as:\n" +
      `   ${CREDENTIALS_PATH}\n\n` +
      "This is a one-time setup. The API itself is FREE."
    );
  }

  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  return new google.auth.OAuth2(client_id, client_secret, redirect_uris?.[0] || "http://localhost:3000/callback");
}

export function getAuthUrl(): object {
  try {
    const oauth2 = getOAuth2Client();
    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    return {
      authUrl: url,
      instructions: [
        "1. Open the URL above in your browser",
        "2. Sign in with your Google account",
        "3. Grant calendar access",
        "4. Copy the authorization code from the redirect",
        "5. Use gcal_auth_callback with the code to complete setup",
      ],
      note: "This only needs to be done once. The token auto-refreshes after that.",
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function handleAuthCallback(code: string): Promise<object> {
  try {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8");

    return {
      success: true,
      message: "Google Calendar authenticated! Token saved. You can now sync events.",
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : "unknown",
    };
  } catch (err: any) {
    return { error: `Authentication failed: ${err.message}` };
  }
}

async function getAuthenticatedCalendar(): Promise<calendar_v3.Calendar> {
  const oauth2 = getOAuth2Client();

  if (!existsSync(TOKEN_PATH)) {
    throw new Error(
      "Not authenticated with Google Calendar. Run gcal_auth to get started."
    );
  }

  const tokens = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
  oauth2.setCredentials(tokens);

  // Auto-refresh token if expired
  oauth2.on("tokens", (newTokens: any) => {
    const updated = { ...tokens, ...newTokens };
    writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2), "utf-8");
  });

  return google.calendar({ version: "v3", auth: oauth2 });
}

// --- Real-Time Calendar Operations ---

export async function syncStudySessions(sessions: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: string;
}[]): Promise<object> {
  const config = getConfig();
  let calendar: calendar_v3.Calendar;

  try {
    calendar = await getAuthenticatedCalendar();
  } catch (err: any) {
    return { error: err.message };
  }

  const created: string[] = [];
  const errors: string[] = [];

  for (const session of sessions) {
    try {
      const event: calendar_v3.Schema$Event = {
        summary: session.title,
        description: session.description,
        start: {
          dateTime: session.startTime.includes("T") ? session.startTime : `${session.startTime}T00:00:00`,
          timeZone: config.timeZone,
        },
        end: {
          dateTime: session.endTime.includes("T") ? session.endTime : `${session.endTime}T01:00:00`,
          timeZone: config.timeZone,
        },
        colorId: config.colorMapping[session.type] || "1",
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: config.reminderMinutes }],
        },
      };

      const res = await calendar.events.insert({
        calendarId: config.calendarId,
        requestBody: event,
      });

      created.push(res.data.id || "unknown");
    } catch (err: any) {
      errors.push(`Failed to create "${session.title}": ${err.message}`);
    }
  }

  // Track synced event IDs
  const synced = loadJSON<string[]>("gcal-synced-events.json", []);
  synced.push(...created);
  saveJSON("gcal-synced-events.json", synced);

  return {
    synced: created.length,
    failed: errors.length,
    eventIds: created,
    errors: errors.length > 0 ? errors : undefined,
    message: `${created.length}/${sessions.length} study sessions synced to Google Calendar.`,
  };
}

export async function listUpcomingEvents(maxResults: number = 10): Promise<object> {
  let calendar: calendar_v3.Calendar;
  try {
    calendar = await getAuthenticatedCalendar();
  } catch (err: any) {
    return { error: err.message };
  }

  const config = getConfig();
  const now = new Date().toISOString();

  try {
    const res = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin: now,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (res.data.items || []).map((e: calendar_v3.Schema$Event) => ({
      id: e.id,
      title: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      description: e.description?.slice(0, 100),
      isStudySession: e.summary?.includes("📚") || e.description?.includes("Study session"),
    }));

    return {
      events,
      total: events.length,
      studySessions: events.filter((e: { isStudySession?: boolean }) => e.isStudySession).length,
    };
  } catch (err: any) {
    return { error: `Failed to list events: ${err.message}` };
  }
}

export async function deleteStudyEvents(eventIds?: string[]): Promise<object> {
  let calendar: calendar_v3.Calendar;
  try {
    calendar = await getAuthenticatedCalendar();
  } catch (err: any) {
    return { error: err.message };
  }

  const config = getConfig();
  const idsToDelete = eventIds || loadJSON<string[]>("gcal-synced-events.json", []);

  let deleted = 0;
  const errors: string[] = [];

  for (const id of idsToDelete) {
    try {
      await calendar.events.delete({
        calendarId: config.calendarId,
        eventId: id,
      });
      deleted++;
    } catch (err: any) {
      if (err.code !== 404) {
        errors.push(`Failed to delete ${id}: ${err.message}`);
      }
    }
  }

  if (!eventIds) {
    saveJSON("gcal-synced-events.json", []);
  }

  return {
    deleted,
    errors: errors.length > 0 ? errors : undefined,
    message: `Deleted ${deleted} events from Google Calendar.`,
  };
}

export async function quickAddEvent(text: string): Promise<object> {
  let calendar: calendar_v3.Calendar;
  try {
    calendar = await getAuthenticatedCalendar();
  } catch (err: any) {
    return { error: err.message };
  }

  try {
    const res = await calendar.events.quickAdd({
      calendarId: getConfig().calendarId,
      text,
    });

    return {
      created: true,
      eventId: res.data.id,
      title: res.data.summary,
      start: res.data.start?.dateTime || res.data.start?.date,
      end: res.data.end?.dateTime || res.data.end?.date,
      message: `Event created: "${res.data.summary}"`,
    };
  } catch (err: any) {
    return { error: `Failed to create event: ${err.message}` };
  }
}

export function configureGCal(updates: Partial<GCalConfig>): object {
  const config = getConfig();
  const newConfig = { ...config, ...updates };
  saveJSON("gcal-config.json", newConfig);
  return { message: "Google Calendar config updated.", config: newConfig };
}
