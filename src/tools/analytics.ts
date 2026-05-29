import { loadJSON } from "../utils/storage.js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_PHASES } from "../data/study-plan.js";

// ============================================
// v1.2 — Progress Analytics
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

interface SessionLogEntry {
  hours: number;
  topic: string;
  notes?: string;
  logged_at: string;
}

function loadSessionLog(): SessionLogEntry[] {
  const logFile = join(DATA_DIR, "session-log.jsonl");
  if (!existsSync(logFile)) return [];
  try {
    const raw = readFileSync(logFile, "utf-8");
    return raw
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => JSON.parse(line));
  } catch {
    return [];
  }
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / (24 * 60 * 60 * 1000) + start.getDay() + 1) / 7);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getWeeklyAnalytics(weeksBack: number = 4): object {
  const sessions = loadSessionLog();
  const now = new Date();
  const cutoff = new Date(now.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000);

  const weeklyData: Record<string, { hours: number; sessions: number; topics: Record<string, number> }> = {};

  for (const session of sessions) {
    const date = new Date(session.logged_at);
    if (date < cutoff) continue;

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split("T")[0];

    if (!weeklyData[key]) {
      weeklyData[key] = { hours: 0, sessions: 0, topics: {} };
    }
    weeklyData[key].hours += session.hours;
    weeklyData[key].sessions += 1;
    weeklyData[key].topics[session.topic] = (weeklyData[key].topics[session.topic] || 0) + session.hours;
  }

  // Generate ASCII chart
  const weeks = Object.entries(weeklyData).sort(([a], [b]) => a.localeCompare(b));
  const maxHours = Math.max(...weeks.map(([, d]) => d.hours), 1);
  const barWidth = 20;

  const chart = weeks.map(([week, data]) => {
    const barLen = Math.round((data.hours / maxHours) * barWidth);
    const bar = "█".repeat(barLen) + "░".repeat(barWidth - barLen);
    return `${week} │${bar}│ ${data.hours.toFixed(1)}h (${data.sessions} sessions)`;
  });

  return {
    title: "Weekly Study Hours",
    chart: chart.join("\n"),
    weeks: weeks.map(([week, data]) => ({
      weekOf: week,
      totalHours: Math.round(data.hours * 10) / 10,
      sessions: data.sessions,
      avgHoursPerDay: Math.round((data.hours / 7) * 10) / 10,
      topTopics: Object.entries(data.topics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([topic, hours]) => ({ topic, hours: Math.round(hours * 10) / 10 })),
    })),
    summary: {
      totalWeeks: weeks.length,
      totalHours: Math.round(weeks.reduce((sum, [, d]) => sum + d.hours, 0) * 10) / 10,
      avgWeeklyHours: Math.round((weeks.reduce((sum, [, d]) => sum + d.hours, 0) / Math.max(weeks.length, 1)) * 10) / 10,
    },
  };
}

export function getMonthlyAnalytics(): object {
  const sessions = loadSessionLog();

  const monthlyData: Record<string, { hours: number; sessions: number; topics: Record<string, number> }> = {};

  for (const session of sessions) {
    const date = new Date(session.logged_at);
    const key = getMonthKey(date);

    if (!monthlyData[key]) {
      monthlyData[key] = { hours: 0, sessions: 0, topics: {} };
    }
    monthlyData[key].hours += session.hours;
    monthlyData[key].sessions += 1;
    monthlyData[key].topics[session.topic] = (monthlyData[key].topics[session.topic] || 0) + session.hours;
  }

  const months = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b));
  const maxHours = Math.max(...months.map(([, d]) => d.hours), 1);
  const barWidth = 25;

  const chart = months.map(([month, data]) => {
    const barLen = Math.round((data.hours / maxHours) * barWidth);
    const bar = "█".repeat(barLen) + "░".repeat(barWidth - barLen);
    return `${month} │${bar}│ ${data.hours.toFixed(1)}h`;
  });

  return {
    title: "Monthly Study Hours",
    chart: chart.join("\n"),
    months: months.map(([month, data]) => ({
      month,
      totalHours: Math.round(data.hours * 10) / 10,
      sessions: data.sessions,
      topTopics: Object.entries(data.topics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([topic, hours]) => ({ topic, hours: Math.round(hours * 10) / 10 })),
    })),
  };
}

export function getTimeDistribution(): object {
  const sessions = loadSessionLog();

  const byTopic: Record<string, number> = {};
  const byDayOfWeek: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const session of sessions) {
    byTopic[session.topic] = (byTopic[session.topic] || 0) + session.hours;
    const day = dayNames[new Date(session.logged_at).getDay()];
    byDayOfWeek[day] += session.hours;
  }

  // Topic distribution chart
  const totalHours = Object.values(byTopic).reduce((sum, h) => sum + h, 0) || 1;
  const topicChart = Object.entries(byTopic)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([topic, hours]) => {
      const pct = Math.round((hours / totalHours) * 100);
      const barLen = Math.round(pct / 5);
      const bar = "█".repeat(barLen);
      return `${topic.padEnd(25)} ${bar} ${pct}% (${hours.toFixed(1)}h)`;
    });

  // Day of week distribution
  const maxDayHours = Math.max(...Object.values(byDayOfWeek), 1);
  const dayChart = Object.entries(byDayOfWeek).map(([day, hours]) => {
    const barLen = Math.round((hours / maxDayHours) * 15);
    const bar = "█".repeat(barLen) + "░".repeat(15 - barLen);
    return `${day} │${bar}│ ${hours.toFixed(1)}h`;
  });

  return {
    title: "Time Distribution Analysis",
    topicDistribution: {
      chart: topicChart.join("\n"),
      data: Object.entries(byTopic)
        .sort(([, a], [, b]) => b - a)
        .map(([topic, hours]) => ({
          topic,
          hours: Math.round(hours * 10) / 10,
          percentage: Math.round((hours / totalHours) * 100),
        })),
    },
    dayOfWeekDistribution: {
      chart: dayChart.join("\n"),
      data: byDayOfWeek,
      insight: Object.entries(byDayOfWeek).sort(([, a], [, b]) => b - a)[0]?.[0]
        ? `Most productive day: ${Object.entries(byDayOfWeek).sort(([, a], [, b]) => b - a)[0][0]}`
        : "No data yet",
    },
    totalHours: Math.round(totalHours * 10) / 10,
    totalSessions: sessions.length,
  };
}

export function getPredictedCompletion(): object {
  const sessions = loadSessionLog();
  const plannerState = loadJSON<{
    startDate: string;
    completedTopics: string[];
    completedProjects: string[];
    totalStudyHours: number;
  }>("planner-state.json", { startDate: new Date().toISOString().split("T")[0], completedTopics: [], completedProjects: [], totalStudyHours: 0 });

  // Total topics and projects across all phases
  const totalTopics = STUDY_PHASES.reduce((sum, p) => sum + p.topics.length, 0);
  const totalProjects = STUDY_PHASES.reduce((sum, p) => sum + p.projects.length, 0);
  const completedTopics = plannerState.completedTopics.length;
  const completedProjects = plannerState.completedProjects.length;

  // Calculate velocity (topics per week)
  const startDate = new Date(plannerState.startDate);
  const now = new Date();
  const weeksElapsed = Math.max(1, (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

  const topicVelocity = completedTopics / weeksElapsed;
  const projectVelocity = completedProjects / weeksElapsed;

  // Calculate weekly study hours (last 4 weeks)
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter((s) => new Date(s.logged_at) >= fourWeeksAgo);
  const recentHours = recentSessions.reduce((sum, s) => sum + s.hours, 0);
  const weeklyAvg = recentHours / 4;

  // Predict completion
  const remainingTopics = totalTopics - completedTopics;
  const remainingProjects = totalProjects - completedProjects;

  const weeksToCompleteTopics = topicVelocity > 0 ? remainingTopics / topicVelocity : Infinity;
  const weeksToCompleteProjects = projectVelocity > 0 ? remainingProjects / projectVelocity : Infinity;
  const weeksToComplete = Math.max(weeksToCompleteTopics, weeksToCompleteProjects);

  const predictedDate = isFinite(weeksToComplete)
    ? new Date(now.getTime() + weeksToComplete * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : "Unable to predict (need more data)";

  // Phase-level predictions
  const phasePredictons = STUDY_PHASES.map((phase) => {
    const phaseTopics = phase.topics.length;
    const phaseCompleted = phase.topics.filter((t) => plannerState.completedTopics.includes(t.id)).length;
    const phaseRemaining = phaseTopics - phaseCompleted;
    const weeksNeeded = topicVelocity > 0 ? phaseRemaining / topicVelocity : null;

    return {
      phase: phase.name,
      progress: `${phaseCompleted}/${phaseTopics} topics`,
      percentage: Math.round((phaseCompleted / Math.max(phaseTopics, 1)) * 100),
      estimatedWeeksRemaining: weeksNeeded ? Math.round(weeksNeeded) : "N/A",
      status: phaseCompleted === phaseTopics ? "COMPLETED" : phaseCompleted > 0 ? "IN PROGRESS" : "NOT STARTED",
    };
  });

  return {
    title: "Predicted Completion Analysis",
    currentPace: {
      weeksElapsed: Math.round(weeksElapsed * 10) / 10,
      topicsPerWeek: Math.round(topicVelocity * 100) / 100,
      projectsPerWeek: Math.round(projectVelocity * 100) / 100,
      avgWeeklyHours: Math.round(weeklyAvg * 10) / 10,
    },
    progress: {
      topics: `${completedTopics}/${totalTopics} (${Math.round((completedTopics / totalTopics) * 100)}%)`,
      projects: `${completedProjects}/${totalProjects} (${Math.round((completedProjects / totalProjects) * 100)}%)`,
    },
    predictions: {
      estimatedCompletionDate: predictedDate,
      estimatedWeeksRemaining: isFinite(weeksToComplete) ? Math.round(weeksToComplete) : "N/A",
      confidence: sessions.length >= 20 ? "moderate" : "low (need more session data)",
    },
    phaseBreakdown: phasePredictons,
    recommendations: generatePaceRecommendations(weeklyAvg, topicVelocity, weeksElapsed),
  };
}

function generatePaceRecommendations(weeklyHours: number, velocity: number, weeksElapsed: number): string[] {
  const recs: string[] = [];

  if (weeklyHours < 15) {
    recs.push(`Current pace: ${weeklyHours.toFixed(1)}h/week. Target 15-20h/week (3h weekdays + 8h weekends) for optimal progress.`);
  } else if (weeklyHours >= 20) {
    recs.push(`Excellent pace: ${weeklyHours.toFixed(1)}h/week. Sustainable intensity!`);
  }

  if (velocity < 0.5 && weeksElapsed > 4) {
    recs.push("Topic completion rate is slow. Focus on marking topics done rather than spreading across too many.");
  }

  if (weeksElapsed > 26 && velocity < 1) {
    recs.push("6+ months in with slow velocity. Consider narrowing focus to fewer topics at a time.");
  }

  recs.push("Consistency matters more than intensity. A 7-day streak at 3h/day beats sporadic 10h days.");

  return recs;
}
