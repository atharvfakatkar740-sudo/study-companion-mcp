import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getFilePath(filename: string): string {
  ensureDir(DATA_DIR);
  return join(DATA_DIR, filename);
}

export function loadJSON<T>(filename: string, defaultValue: T): T {
  const filepath = getFilePath(filename);
  if (!existsSync(filepath)) {
    saveJSON(filename, defaultValue);
    return defaultValue;
  }
  try {
    const raw = readFileSync(filepath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function saveJSON<T>(filename: string, data: T): void {
  const filepath = getFilePath(filename);
  ensureDir(dirname(filepath));
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

export function loadNotes(topicId: string): string {
  const notesDir = join(DATA_DIR, "notes");
  ensureDir(notesDir);
  const filepath = join(notesDir, `${topicId}.md`);
  if (!existsSync(filepath)) return "";
  return readFileSync(filepath, "utf-8");
}

export function saveNotes(topicId: string, content: string): void {
  const notesDir = join(DATA_DIR, "notes");
  ensureDir(notesDir);
  const filepath = join(notesDir, `${topicId}.md`);
  writeFileSync(filepath, content, "utf-8");
}

export function appendSessionLog(session: Record<string, unknown>): void {
  const logFile = getFilePath("session-log.jsonl");
  const line = JSON.stringify({ ...session, logged_at: new Date().toISOString() }) + "\n";
  appendFileSync(logFile, line, "utf-8");
}

export function getDataDir(): string {
  ensureDir(DATA_DIR);
  return DATA_DIR;
}
