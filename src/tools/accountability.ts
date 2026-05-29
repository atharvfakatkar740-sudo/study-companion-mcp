import { loadJSON, saveJSON } from "../utils/storage.js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getStudyPhases, getPlanMeta } from "../engine/plan-loader.js";
import type { RevisionItem, MemoryEntry } from "../utils/types.js";

// ============================================
// v3.2 — Deep Accountability & Productivity
// Daily standup, velocity tracking, retros, burnout detection
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

// --- Data Loaders ---

interface SessionLogEntry {
  hours: number;
  topic: string;
  notes?: string;
  logged_at: string;
}

interface PlannerState {
  startDate: string;
  currentPhaseOverride?: string;
  completedTopics: string[];
  completedProjects: string[];
  totalStudyHours: number;
  streakDays: number;
  lastActiveDate?: string;
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

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(days: number): string {
  return dateStr(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

function getSessionsInRange(sessions: SessionLogEntry[], startDate: string, endDate: string): SessionLogEntry[] {
  return sessions.filter((s) => {
    const d = s.logged_at.split("T")[0];
    return d >= startDate && d <= endDate;
  });
}

// ============================================
// 1. Daily Standup Generator
// ============================================

export function dailyStandup(): object {
  const today = dateStr(new Date());
  const yesterday = daysAgo(1);
  const sessions = loadSessionLog();
  const plannerState = loadJSON<PlannerState>("planner-state.json", {
    startDate: today, completedTopics: [], completedProjects: [], totalStudyHours: 0, streakDays: 0,
  });
  const revisions = loadJSON<RevisionItem[]>("revisions.json", []);
  const papers = loadJSON<any[]>("papers.json", []);
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});
  const phases = getStudyPhases();

  // Yesterday's work
  const yesterdaySessions = getSessionsInRange(sessions, yesterday, yesterday);
  const yesterdayHours = yesterdaySessions.reduce((s, e) => s + e.hours, 0);
  const yesterdayTopics = [...new Set(yesterdaySessions.map((s) => s.topic))];

  // Today's due items
  const dueRevisions = revisions.filter((r) => r.nextReview <= today);
  const readingPaper = papers.find((p: any) => p.status === "reading");
  const queuedPapers = papers.filter((p: any) => p.status === "queued");

  // Current phase info
  const currentPhaseId = plannerState.currentPhaseOverride || getCurrentPhaseFromState(plannerState, phases);
  const currentPhase = phases.find((p) => p.id === currentPhaseId);
  const remainingTopics = currentPhase
    ? currentPhase.topics.filter((t) => !plannerState.completedTopics.includes(t.id))
    : [];
  const remainingProjects = currentPhase
    ? currentPhase.projects.filter((p) => !plannerState.completedProjects.includes(p.id))
    : [];

  // Struggling concepts
  const struggles = Object.entries(mastery)
    .filter(([, info]: [string, any]) => info.level === "beginner" && info.assessments >= 3)
    .map(([id, info]: [string, any]) => ({ concept: id, score: Math.round(info.score) }));

  // Streak info
  const streakMessage = plannerState.streakDays >= 7
    ? `${plannerState.streakDays}-day streak! Keep it going.`
    : plannerState.streakDays > 0
    ? `${plannerState.streakDays}-day streak. Build consistency.`
    : "No active streak. Today is day 1.";

  return {
    title: `Daily Standup — ${today}`,
    yesterday: {
      hours: yesterdayHours,
      topics: yesterdayTopics.length > 0 ? yesterdayTopics : ["No sessions logged"],
      sessions: yesterdaySessions.length,
    },
    todayPlan: {
      revisionsDue: dueRevisions.length,
      topRevisions: dueRevisions.slice(0, 5).map((r) => ({ concept: r.concept, topic: r.topic, overdueDays: Math.floor((new Date(today).getTime() - new Date(r.nextReview).getTime()) / (24 * 60 * 60 * 1000)) })),
      currentPaper: readingPaper ? readingPaper.title : (queuedPapers.length > 0 ? `Start: "${queuedPapers[0].title}"` : "No papers in queue"),
      focusTopics: remainingTopics.slice(0, 3).map((t) => ({ id: t.id, name: t.name, priority: t.priority })),
      focusProject: remainingProjects.length > 0 ? { id: remainingProjects[0].id, name: remainingProjects[0].name } : null,
    },
    status: {
      currentPhase: currentPhase?.name || currentPhaseId,
      totalHours: plannerState.totalStudyHours,
      streak: streakMessage,
      topicsRemaining: remainingTopics.length,
      projectsRemaining: remainingProjects.length,
    },
    blockers: [
      ...(dueRevisions.length > 10 ? [`${dueRevisions.length} overdue revisions — risk of retention loss`] : []),
      ...(struggles.length > 0 ? [`Struggling with: ${struggles.map((s) => s.concept).join(", ")}`] : []),
      ...(plannerState.streakDays === 0 ? ["Streak broken — prioritize at least 30 min today"] : []),
    ],
    quickWins: [
      ...(dueRevisions.length > 0 ? [`Review ${Math.min(dueRevisions.length, 5)} SRS items (15 min)`] : []),
      ...(readingPaper ? [`Continue reading: "${readingPaper.title}"`] : []),
      "Log today's session when done (use log_study_session)",
    ],
  };
}

// ============================================
// 2. End of Day Review
// ============================================

export function endOfDayReview(): object {
  const today = dateStr(new Date());
  const sessions = loadSessionLog();
  const todaySessions = getSessionsInRange(sessions, today, today);
  const todayHours = todaySessions.reduce((s, e) => s + e.hours, 0);
  const todayTopics = [...new Set(todaySessions.map((s) => s.topic))];

  const revisions = loadJSON<RevisionItem[]>("revisions.json", []);
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});

  // Revisions completed today
  const reviewedToday = revisions.filter((r) => r.lastReviewed === today);

  // Insights recorded today
  const todayInsights = memories.filter((m) => m.timestamp.startsWith(today));

  // Mastery assessments today
  const todayAssessments = Object.entries(mastery)
    .filter(([, info]: [string, any]) => info.lastAssessed === today)
    .map(([id, info]: [string, any]) => ({ concept: id, level: info.level, score: Math.round(info.score) }));

  // What didn't happen
  const missedItems: string[] = [];
  const dueRevisions = revisions.filter((r) => r.nextReview <= today && r.lastReviewed !== today);
  if (dueRevisions.length > 0) missedItems.push(`${dueRevisions.length} SRS items still due`);
  if (todayHours === 0) missedItems.push("No study sessions logged");
  if (todayInsights.length === 0 && todayHours > 0) missedItems.push("No insights saved — capture key takeaways!");

  // Quality score
  let qualityScore = 50;
  if (todayHours > 0) qualityScore += 15;
  if (todayHours >= 2) qualityScore += 10;
  if (reviewedToday.length > 0) qualityScore += 10;
  if (todayInsights.length > 0) qualityScore += 10;
  if (todayAssessments.length > 0) qualityScore += 5;
  qualityScore = Math.min(100, qualityScore);

  return {
    title: `End of Day Review — ${today}`,
    accomplished: {
      studyHours: todayHours,
      topicsCovered: todayTopics,
      sessionsLogged: todaySessions.length,
      revisionsCompleted: reviewedToday.length,
      insightsSaved: todayInsights.length,
      masteryAssessments: todayAssessments.length,
    },
    assessments: todayAssessments,
    missed: missedItems.length > 0 ? missedItems : ["Nothing missed — great day!"],
    dayScore: `${qualityScore}/100`,
    rating: qualityScore >= 80 ? "Excellent" : qualityScore >= 60 ? "Good" : qualityScore >= 40 ? "Okay" : "Needs improvement",
    reflection: {
      prompt: "What was the most valuable thing you learned today?",
      suggestion: todayTopics.length > 0
        ? `You studied ${todayTopics.join(", ")}. Save a key insight with save_insight.`
        : "Even on rest days, a 15-minute review compounds over time.",
    },
    tomorrowPrep: [
      ...(dueRevisions.length > 0 ? [`${dueRevisions.length} SRS items carry over to tomorrow`] : []),
      "Check daily_standup in the morning for your plan",
    ],
  };
}

// ============================================
// 3. Phase Velocity Tracker
// ============================================

export function phaseVelocity(): object {
  const plannerState = loadJSON<PlannerState>("planner-state.json", {
    startDate: dateStr(new Date()), completedTopics: [], completedProjects: [], totalStudyHours: 0, streakDays: 0,
  });
  const sessions = loadSessionLog();
  const phases = getStudyPhases();
  const meta = getPlanMeta();

  const startDate = new Date(plannerState.startDate);
  const now = new Date();
  const totalDays = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
  const totalWeeks = Math.max(1, totalDays / 7);
  const monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());

  // Total counts
  const totalTopics = phases.reduce((s, p) => s + p.topics.length, 0);
  const totalProjects = phases.reduce((s, p) => s + p.projects.length, 0);
  const completedTopics = plannerState.completedTopics.length;
  const completedProjects = plannerState.completedProjects.length;

  // Expected progress (linear interpolation over total plan duration)
  const totalMonths = meta?.timeframe_months || 18;
  const expectedProgress = Math.min(1, monthsElapsed / totalMonths);
  const expectedTopics = Math.round(totalTopics * expectedProgress);
  const expectedProjects = Math.round(totalProjects * expectedProgress);

  // Velocity metrics
  const topicVelocity = completedTopics / totalWeeks; // topics per week
  const projectVelocity = completedProjects / totalWeeks;
  const hoursPerWeek = plannerState.totalStudyHours / totalWeeks;

  // Projected completion
  const topicsRemaining = totalTopics - completedTopics;
  const weeksToComplete = topicVelocity > 0 ? topicsRemaining / topicVelocity : Infinity;
  const projectedCompletionDate = topicVelocity > 0
    ? dateStr(new Date(now.getTime() + weeksToComplete * 7 * 24 * 60 * 60 * 1000))
    : "N/A (no velocity data)";

  // Per-phase breakdown
  const phaseBreakdown = phases.map((phase) => {
    const phaseTopics = phase.topics.length;
    const phaseCompleted = phase.topics.filter((t) => plannerState.completedTopics.includes(t.id)).length;
    const phaseProjects = phase.projects.length;
    const phaseProjectsDone = phase.projects.filter((p) => plannerState.completedProjects.includes(p.id)).length;

    // Is this phase expected to be done by now?
    const phaseEnd = phase.monthRange[1];
    const shouldBeDone = monthsElapsed > phaseEnd;
    const isActive = monthsElapsed >= phase.monthRange[0] && monthsElapsed <= phase.monthRange[1];

    return {
      id: phase.id,
      name: phase.name,
      topicProgress: `${phaseCompleted}/${phaseTopics}`,
      projectProgress: `${phaseProjectsDone}/${phaseProjects}`,
      status: phaseCompleted === phaseTopics ? "completed"
        : isActive ? "active"
        : shouldBeDone ? "behind"
        : "upcoming",
      percentComplete: phaseTopics > 0 ? Math.round((phaseCompleted / phaseTopics) * 100) : 0,
    };
  });

  // Overall status
  const topicDelta = completedTopics - expectedTopics;
  const overallStatus = topicDelta >= 2 ? "ahead" : topicDelta <= -3 ? "behind" : "on_track";

  return {
    title: "Phase Velocity Report",
    elapsed: {
      days: totalDays,
      weeks: Math.round(totalWeeks * 10) / 10,
      months: monthsElapsed,
      percentOfPlan: `${Math.round(expectedProgress * 100)}%`,
    },
    progress: {
      topics: `${completedTopics}/${totalTopics} (expected: ${expectedTopics})`,
      projects: `${completedProjects}/${totalProjects} (expected: ${expectedProjects})`,
      totalHours: plannerState.totalStudyHours,
      streak: plannerState.streakDays,
    },
    velocity: {
      topicsPerWeek: Math.round(topicVelocity * 100) / 100,
      projectsPerWeek: Math.round(projectVelocity * 100) / 100,
      hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
    },
    projection: {
      status: overallStatus,
      topicDelta: topicDelta >= 0 ? `+${topicDelta} ahead` : `${topicDelta} behind`,
      projectedCompletion: projectedCompletionDate,
      targetCompletion: meta?.timeframe_months
        ? dateStr(new Date(startDate.getTime() + meta.timeframe_months * 30 * 24 * 60 * 60 * 1000))
        : "N/A",
    },
    phases: phaseBreakdown,
    recommendations: getVelocityRecommendations(overallStatus, hoursPerWeek, topicVelocity, phaseBreakdown),
  };
}

function getVelocityRecommendations(
  status: string,
  hoursPerWeek: number,
  topicVelocity: number,
  phases: any[]
): string[] {
  const recs: string[] = [];

  if (status === "behind") {
    recs.push("You're behind schedule. Consider increasing weekly study hours or reducing scope.");
    const behindPhases = phases.filter((p: any) => p.status === "behind");
    if (behindPhases.length > 0) {
      recs.push(`Overdue phases: ${behindPhases.map((p: any) => p.name).join(", ")}. Prioritize completing these.`);
    }
  } else if (status === "ahead") {
    recs.push("Ahead of schedule! Consider going deeper on current topics or starting the next phase early.");
  }

  if (hoursPerWeek < 10) {
    recs.push(`Only ${Math.round(hoursPerWeek)}h/week. Target 15-20h for meaningful progress with a full-time job.`);
  }

  if (topicVelocity < 0.5) {
    recs.push("Topic velocity is low. Focus on completing one topic fully before moving to the next.");
  }

  if (recs.length === 0) {
    recs.push("On track. Maintain current pace and focus on depth over breadth.");
  }

  return recs;
}

// ============================================
// 4. Weekly Retrospective
// ============================================

export function weeklyRetrospective(): object {
  const today = dateStr(new Date());
  const weekAgo = daysAgo(7);
  const twoWeeksAgo = daysAgo(14);
  const sessions = loadSessionLog();
  const revisions = loadJSON<RevisionItem[]>("revisions.json", []);
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});
  const testResults = loadJSON<any[]>("test-results.json", []);

  // This week
  const thisWeekSessions = getSessionsInRange(sessions, weekAgo, today);
  const thisWeekHours = thisWeekSessions.reduce((s, e) => s + e.hours, 0);
  const thisWeekTopics = [...new Set(thisWeekSessions.map((s) => s.topic))];

  // Last week (for comparison)
  const lastWeekSessions = getSessionsInRange(sessions, twoWeeksAgo, weekAgo);
  const lastWeekHours = lastWeekSessions.reduce((s, e) => s + e.hours, 0);

  // Daily breakdown
  const dailyHours: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const day = daysAgo(i);
    const daySessions = getSessionsInRange(sessions, day, day);
    dailyHours[day] = daySessions.reduce((s, e) => s + e.hours, 0);
  }

  // Active days
  const activeDays = Object.values(dailyHours).filter((h) => h > 0).length;

  // Revisions completed this week
  const weekRevisions = revisions.filter((r) => r.lastReviewed >= weekAgo);
  const forgotCount = weekRevisions.filter((r) => r.difficulty === "forgot").length;

  // Insights this week
  const weekInsights = memories.filter((m) => m.timestamp >= weekAgo);

  // Mastery changes this week
  const weekMastery = Object.entries(mastery)
    .filter(([, info]: [string, any]) => info.lastAssessed >= weekAgo)
    .map(([id, info]: [string, any]) => ({
      concept: id,
      level: info.level,
      score: Math.round(info.score),
    }));

  // Tests this week
  const weekTests = testResults.filter((t: any) => t.date >= weekAgo);

  // Hours trend
  const hoursDelta = thisWeekHours - lastWeekHours;
  const hoursTrend = hoursDelta > 1 ? "increasing" : hoursDelta < -1 ? "decreasing" : "stable";

  // Consistency score
  const consistencyScore = Math.round((activeDays / 7) * 100);

  // Topic coverage
  const phases = getStudyPhases();
  const currentPhaseTopics = phases.flatMap((p) => p.topics.map((t) => t.name));
  const coveredThisWeek = new Set(thisWeekTopics);
  const topicDiversity = currentPhaseTopics.length > 0
    ? Math.round((coveredThisWeek.size / Math.min(currentPhaseTopics.length, 5)) * 100)
    : 0;

  return {
    title: `Weekly Retrospective — ${weekAgo} to ${today}`,
    summary: {
      totalHours: Math.round(thisWeekHours * 10) / 10,
      previousWeekHours: Math.round(lastWeekHours * 10) / 10,
      hoursTrend,
      hoursDelta: `${hoursDelta >= 0 ? "+" : ""}${Math.round(hoursDelta * 10) / 10}h`,
      activeDays: `${activeDays}/7`,
      consistencyScore: `${consistencyScore}%`,
      topicDiversity: `${topicDiversity}%`,
    },
    dailyBreakdown: dailyHours,
    topicsCovered: thisWeekTopics,
    learning: {
      revisionsCompleted: weekRevisions.length,
      revisionsForgot: forgotCount,
      retentionRate: weekRevisions.length > 0
        ? `${Math.round(((weekRevisions.length - forgotCount) / weekRevisions.length) * 100)}%`
        : "N/A",
      insightsRecorded: weekInsights.length,
      masteryAssessments: weekMastery.length,
      testsCompleted: weekTests.length,
    },
    masteryChanges: weekMastery.slice(0, 10),
    wins: generateWins(thisWeekHours, activeDays, weekRevisions.length, weekInsights.length, weekTests),
    improvements: generateImprovements(
      thisWeekHours, activeDays, forgotCount, weekRevisions.length, weekInsights.length, topicDiversity, hoursTrend
    ),
    nextWeekFocus: generateNextWeekFocus(mastery, revisions, phases),
  };
}

function generateWins(hours: number, activeDays: number, revisions: number, insights: number, tests: any[]): string[] {
  const wins: string[] = [];
  if (hours >= 15) wins.push(`Strong study week: ${Math.round(hours)}h logged`);
  if (activeDays >= 6) wins.push(`${activeDays}/7 active days — excellent consistency`);
  if (revisions >= 20) wins.push(`${revisions} SRS reviews completed — retention is building`);
  if (insights >= 5) wins.push(`${insights} insights saved — active learning in action`);
  if (tests.length > 0) {
    const avgScore = tests.reduce((s: number, t: any) => s + (t.averageScore || 0), 0) / tests.length;
    if (avgScore >= 70) wins.push(`Test average: ${Math.round(avgScore)}% — solid understanding`);
  }
  if (wins.length === 0) wins.push("Every session counts. You showed up this week.");
  return wins;
}

function generateImprovements(
  hours: number, activeDays: number, forgot: number, revisions: number,
  insights: number, topicDiversity: number, hoursTrend: string
): string[] {
  const improvements: string[] = [];
  if (hours < 10) improvements.push("Aim for 10+ hours next week. Even small increases compound.");
  if (activeDays < 5) improvements.push("Study 5+ days per week. Consistency beats intensity.");
  if (forgot > revisions * 0.3 && revisions > 0) improvements.push(`High forget rate (${forgot}/${revisions}). Review prerequisites for struggling concepts.`);
  if (insights === 0) improvements.push("Save at least 1 insight per session — it builds your knowledge base.");
  if (topicDiversity < 50) improvements.push("Low topic diversity. Interleave topics for better retention.");
  if (hoursTrend === "decreasing") improvements.push("Hours trending down. Set a minimum daily commitment.");
  return improvements;
}

function generateNextWeekFocus(mastery: Record<string, any>, revisions: RevisionItem[], phases: any[]): string[] {
  const focus: string[] = [];

  // Concepts needing attention
  const weakConcepts = Object.entries(mastery)
    .filter(([, info]: [string, any]) => info.level === "beginner" && info.assessments >= 2)
    .sort(([, a]: [string, any], [, b]: [string, any]) => a.score - b.score)
    .slice(0, 2);
  if (weakConcepts.length > 0) {
    focus.push(`Review weak concepts: ${weakConcepts.map(([id]) => id).join(", ")}`);
  }

  // Overdue revisions
  const today = dateStr(new Date());
  const overdue = revisions.filter((r) => r.nextReview < today).length;
  if (overdue > 5) focus.push(`Clear ${overdue} overdue SRS items`);

  focus.push("Take the weekly_comprehensive_test on Friday/Saturday");

  return focus;
}

// ============================================
// 5. Burnout Detection
// ============================================

export function detectBurnout(): object {
  const sessions = loadSessionLog();
  const plannerState = loadJSON<PlannerState>("planner-state.json", {
    startDate: dateStr(new Date()), completedTopics: [], completedProjects: [], totalStudyHours: 0, streakDays: 0,
  });
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});
  const today = dateStr(new Date());

  const signals: Array<{
    signal: string;
    severity: "high" | "medium" | "low";
    evidence: string;
    suggestion: string;
  }> = [];

  // --- Signal 1: Declining weekly hours ---
  const weeklyHours: number[] = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = daysAgo((w + 1) * 7);
    const weekEnd = daysAgo(w * 7);
    const weekSessions = getSessionsInRange(sessions, weekStart, weekEnd);
    weeklyHours.push(weekSessions.reduce((s, e) => s + e.hours, 0));
  }

  // Check for consistent decline (most recent first)
  if (weeklyHours.length >= 3) {
    const declining = weeklyHours[0] < weeklyHours[1] && weeklyHours[1] < weeklyHours[2];
    if (declining && weeklyHours[0] < weeklyHours[2] * 0.5) {
      signals.push({
        signal: "Hours dropping sharply",
        severity: "high",
        evidence: `Last 3 weeks: ${weeklyHours.slice(0, 3).map((h) => Math.round(h * 10) / 10 + "h").join(" → ")}`,
        suggestion: "Scale back to a sustainable minimum (even 30 min/day). Momentum matters more than volume.",
      });
    } else if (declining) {
      signals.push({
        signal: "Hours trending down",
        severity: "medium",
        evidence: `Last 3 weeks: ${weeklyHours.slice(0, 3).map((h) => Math.round(h * 10) / 10 + "h").join(" → ")}`,
        suggestion: "Check if external factors are causing this. Set a realistic minimum weekly target.",
      });
    }
  }

  // --- Signal 2: Missed days streak ---
  const recentDays: boolean[] = [];
  for (let d = 0; d < 14; d++) {
    const day = daysAgo(d);
    const daySessions = getSessionsInRange(sessions, day, day);
    recentDays.push(daySessions.length > 0);
  }

  const recentActiveDays = recentDays.slice(0, 7).filter(Boolean).length;
  const consecutiveMissed = recentDays.findIndex(Boolean); // days since last active

  if (consecutiveMissed >= 4) {
    signals.push({
      signal: `${consecutiveMissed} consecutive days missed`,
      severity: consecutiveMissed >= 7 ? "high" : "medium",
      evidence: `Last active: ${consecutiveMissed} days ago`,
      suggestion: "Start with something tiny — a 10-minute review. The hardest part is showing up.",
    });
  }

  // --- Signal 3: Declining session quality ---
  const recentSessions = sessions.slice(-20);
  if (recentSessions.length >= 10) {
    const recentHalf = recentSessions.slice(-10);
    const earlierHalf = recentSessions.slice(-20, -10);
    const recentAvgHours = recentHalf.reduce((s, e) => s + e.hours, 0) / recentHalf.length;
    const earlierAvgHours = earlierHalf.reduce((s, e) => s + e.hours, 0) / earlierHalf.length;

    if (recentAvgHours < earlierAvgHours * 0.6) {
      signals.push({
        signal: "Session duration shrinking",
        severity: "medium",
        evidence: `Recent avg: ${Math.round(recentAvgHours * 60)} min vs earlier: ${Math.round(earlierAvgHours * 60)} min`,
        suggestion: "Shorter sessions are fine if focused. But if you're cutting sessions short due to fatigue, take a rest day.",
      });
    }
  }

  // --- Signal 4: Mastery plateau/decline ---
  const decliningConcepts = Object.entries(mastery)
    .filter(([, info]: [string, any]) => {
      if (info.history && info.history.length >= 4) {
        const recent = info.history.slice(-2).map((h: any) => h.score);
        const earlier = info.history.slice(-4, -2).map((h: any) => h.score);
        const recentAvg = recent.reduce((a: number, b: number) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a: number, b: number) => a + b, 0) / earlier.length;
        return recentAvg < earlierAvg - 15;
      }
      return false;
    })
    .map(([id]) => id);

  if (decliningConcepts.length >= 3) {
    signals.push({
      signal: "Performance declining across multiple concepts",
      severity: "high",
      evidence: `Declining: ${decliningConcepts.slice(0, 5).join(", ")}`,
      suggestion: "You may be overloaded. Reduce the number of topics you're studying simultaneously.",
    });
  }

  // --- Signal 5: No variety (grinding same topic) ---
  const last2WeeksSessions = getSessionsInRange(sessions, daysAgo(14), today);
  const topicCounts: Record<string, number> = {};
  for (const s of last2WeeksSessions) {
    topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
  }
  const topicEntries = Object.entries(topicCounts);
  if (topicEntries.length === 1 && last2WeeksSessions.length > 5) {
    signals.push({
      signal: "No topic variety in 2 weeks",
      severity: "low",
      evidence: `Only studying: ${topicEntries[0][0]}`,
      suggestion: "Interleave topics to prevent fatigue and improve transfer learning.",
    });
  }

  // --- Burnout Risk Score ---
  const riskWeights = { high: 30, medium: 15, low: 5 };
  const riskScore = Math.min(100, signals.reduce((s, sig) => s + riskWeights[sig.severity], 0));
  const riskLevel = riskScore >= 60 ? "high" : riskScore >= 30 ? "moderate" : "low";

  return {
    title: "Burnout Risk Assessment",
    riskScore: `${riskScore}/100`,
    riskLevel,
    signals,
    weeklyHoursTrend: weeklyHours.map((h, i) => ({
      week: i === 0 ? "this week" : `${i} week(s) ago`,
      hours: Math.round(h * 10) / 10,
    })),
    recentActivity: {
      activeDaysLast7: recentActiveDays,
      activeDaysLast14: recentDays.filter(Boolean).length,
      currentStreak: plannerState.streakDays,
    },
    recovery: riskLevel === "high" ? {
      immediate: [
        "Take a full rest day (or two). Recovery IS part of learning.",
        "Next session: do ONLY enjoyable study (read an interesting paper, watch a lecture).",
        "Set a tiny daily minimum: 15 minutes. Nothing more required.",
      ],
      thisWeek: [
        "Reduce topic load to just 1-2 topics.",
        "Skip SRS if it feels like a chore — retention isn't worth burnout.",
        "Consider: is your schedule realistic with your job? Adjust the plan if needed.",
      ],
    } : riskLevel === "moderate" ? {
      suggestions: [
        "Watch for further decline. One bad week is normal; a trend is concerning.",
        "Mix in lighter activities: paper reading, concept mapping, blog drafting.",
        "Ensure at least 1 rest day per week.",
      ],
    } : {
      message: "No significant burnout signals. Keep up the sustainable pace!",
    },
  };
}

// --- Helper ---

function getCurrentPhaseFromState(state: PlannerState, phases: any[]): string {
  const start = new Date(state.startDate);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  for (const phase of phases) {
    if (monthsElapsed >= phase.monthRange[0] && monthsElapsed <= phase.monthRange[1]) {
      return phase.id;
    }
  }
  return phases[phases.length - 1]?.id || "unknown";
}
