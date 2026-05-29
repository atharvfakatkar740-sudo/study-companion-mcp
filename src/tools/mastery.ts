import { loadJSON, saveJSON } from "../utils/storage.js";
import { getStudyPhases } from "../engine/plan-loader.js";

// ============================================
// v3.0.2 — Adaptive Mastery Tracking
// Performance-based difficulty levels per concept
// ============================================

interface MasteryInfo {
  level: "beginner" | "intermediate" | "advanced" | "unknown";
  score: number;        // 0-100 cumulative mastery score
  assessments: number;  // total assessments taken
  lastAssessed: string;
  history: AssessmentRecord[];
}

interface AssessmentRecord {
  date: string;
  type: "quiz" | "derivation" | "implementation" | "explanation" | "review";
  score: number;       // 0-100 for this assessment
  difficulty: "easy" | "medium" | "hard";
  timeSpentMinutes?: number;
  notes?: string;
}

interface MasteryState {
  [conceptId: string]: MasteryInfo;
}

function loadMastery(): MasteryState {
  return loadJSON<MasteryState>("mastery-state.json", {});
}

function saveMastery(state: MasteryState): void {
  saveJSON("mastery-state.json", state);
}

function scoreToLevel(score: number): "beginner" | "intermediate" | "advanced" | "unknown" {
  if (score >= 80) return "advanced";
  if (score >= 50) return "intermediate";
  if (score > 0) return "beginner";
  return "unknown";
}

// --- Public API ---

export function assessUnderstanding(
  conceptId: string,
  assessmentType: "quiz" | "derivation" | "implementation" | "explanation" | "review",
  score: number,
  difficulty: "easy" | "medium" | "hard" = "medium",
  timeSpentMinutes?: number,
  notes?: string
): object {
  const mastery = loadMastery();

  if (!mastery[conceptId]) {
    mastery[conceptId] = {
      level: "unknown",
      score: 0,
      assessments: 0,
      lastAssessed: new Date().toISOString().split("T")[0],
      history: [],
    };
  }

  const entry = mastery[conceptId];

  // Difficulty multiplier: harder assessments contribute more
  const diffMultiplier = difficulty === "hard" ? 1.3 : difficulty === "medium" ? 1.0 : 0.7;

  // Type multiplier: derivation/implementation weigh more than quiz
  const typeMultiplier =
    assessmentType === "derivation" ? 1.4
    : assessmentType === "implementation" ? 1.3
    : assessmentType === "explanation" ? 1.2
    : assessmentType === "review" ? 0.8
    : 1.0;

  const adjustedScore = Math.min(100, score * diffMultiplier * typeMultiplier);

  // Exponential moving average: recent assessments matter more
  const alpha = 0.3; // weight of new assessment
  entry.score = entry.assessments === 0
    ? adjustedScore
    : entry.score * (1 - alpha) + adjustedScore * alpha;

  entry.assessments += 1;
  entry.lastAssessed = new Date().toISOString().split("T")[0];
  entry.level = scoreToLevel(entry.score);

  entry.history.push({
    date: new Date().toISOString().split("T")[0],
    type: assessmentType,
    score,
    difficulty,
    timeSpentMinutes,
    notes,
  });

  // Keep last 20 assessments
  if (entry.history.length > 20) {
    entry.history = entry.history.slice(-20);
  }

  saveMastery(mastery);

  return {
    conceptId,
    newLevel: entry.level,
    masteryScore: Math.round(entry.score),
    totalAssessments: entry.assessments,
    trend: getTrend(entry.history),
    message: entry.level === "advanced"
      ? `Excellent mastery of '${conceptId}'! Score: ${Math.round(entry.score)}/100.`
      : entry.level === "intermediate"
      ? `Solid progress on '${conceptId}'. Score: ${Math.round(entry.score)}/100. Keep practicing for advanced level.`
      : `Building foundations on '${conceptId}'. Score: ${Math.round(entry.score)}/100. More practice recommended.`,
  };
}

function getTrend(history: AssessmentRecord[]): "improving" | "stable" | "declining" | "new" {
  if (history.length < 3) return "new";
  const recent = history.slice(-3).map((h) => h.score);
  const earlier = history.slice(-6, -3).map((h) => h.score);
  if (earlier.length === 0) return "new";

  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;

  if (recentAvg > earlierAvg + 10) return "improving";
  if (recentAvg < earlierAvg - 10) return "declining";
  return "stable";
}

export function getDifficultyProfile(topic?: string): object {
  const mastery = loadMastery();
  const entries = Object.entries(mastery);

  let filtered = entries;
  if (topic) {
    // Try to match by concept ID or topic field
    const topicLower = topic.toLowerCase();
    filtered = entries.filter(([id]) => id.toLowerCase().includes(topicLower));
  }

  const profile: Record<string, object> = {};
  const levelCounts = { beginner: 0, intermediate: 0, advanced: 0, unknown: 0 };

  for (const [id, info] of filtered) {
    profile[id] = {
      level: info.level,
      score: Math.round(info.score),
      assessments: info.assessments,
      lastAssessed: info.lastAssessed,
      trend: getTrend(info.history),
    };
    levelCounts[info.level]++;
  }

  const total = filtered.length;
  const avgScore = total > 0
    ? Math.round(filtered.reduce((s, [, v]) => s + v.score, 0) / total)
    : 0;

  return {
    title: topic ? `Mastery Profile: ${topic}` : "Overall Mastery Profile",
    summary: {
      totalConcepts: total,
      averageScore: avgScore,
      levels: levelCounts,
    },
    concepts: profile,
    recommendation: getProfileRecommendation(levelCounts, avgScore),
  };
}

function getProfileRecommendation(
  levels: Record<string, number>,
  avgScore: number
): string {
  if (levels.advanced > levels.beginner + levels.unknown) {
    return "Strong overall mastery. Focus on converting intermediate concepts to advanced.";
  }
  if (levels.beginner + levels.unknown > levels.intermediate + levels.advanced) {
    return "Many concepts still at foundational level. Increase active recall practice frequency.";
  }
  if (avgScore < 40) {
    return "Low average score. Consider reviewing prerequisites and slowing down to build depth.";
  }
  return "Balanced profile. Keep consistent practice across all concepts.";
}

export function generateChallenge(
  conceptId: string,
  challengeType?: "derivation" | "implementation" | "explanation" | "comparison"
): object {
  const mastery = loadMastery();
  const info = mastery[conceptId];
  const level = info?.level || "unknown";

  // Auto-select difficulty based on mastery level
  const difficulty = level === "advanced" ? "hard" : level === "intermediate" ? "medium" : "easy";
  const type = challengeType || selectChallengeType(level);

  // Concept name (humanize the ID)
  const name = conceptId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const challenge = buildChallenge(name, conceptId, type, difficulty);

  return {
    conceptId,
    currentMastery: level,
    difficulty,
    challengeType: type,
    ...challenge,
    instructions: [
      "Attempt without looking at references first.",
      "After completion, use assess_understanding to record your performance.",
      `Suggested difficulty for your level: ${difficulty}`,
    ],
  };
}

function selectChallengeType(level: string): "derivation" | "implementation" | "explanation" | "comparison" {
  if (level === "advanced") return "derivation";
  if (level === "intermediate") return "implementation";
  return "explanation";
}

function buildChallenge(
  name: string,
  id: string,
  type: string,
  difficulty: string
): object {
  switch (type) {
    case "derivation":
      return {
        title: `Derivation Challenge: ${name}`,
        prompt: difficulty === "hard"
          ? `Derive ${name} from first principles. Show every step, state assumptions, and explain the intuition behind each transition.`
          : difficulty === "medium"
          ? `Derive the key equation(s) for ${name}. Explain what each term represents.`
          : `Write out the main formula for ${name} and explain each variable.`,
        rubric: {
          90: "Complete derivation with all steps, correct notation, and deep intuition",
          70: "Key equations correct with reasonable explanations",
          50: "Partial derivation, some steps missing or unclear",
          30: "Remembered formula but couldn't derive it",
          0: "Could not recall the key equations",
        },
      };
    case "implementation":
      return {
        title: `Implementation Challenge: ${name}`,
        prompt: difficulty === "hard"
          ? `Implement ${name} from scratch in PyTorch without any references. Include training loop, loss function, and evaluation. Add type hints and docstrings.`
          : difficulty === "medium"
          ? `Write the core forward pass for ${name} in PyTorch. Include the loss function.`
          : `Write pseudocode for ${name}. Describe the input, output, and key operations.`,
        rubric: {
          90: "Clean, runnable implementation with proper engineering practices",
          70: "Correct logic with minor issues (missing edge cases, no type hints)",
          50: "Partially correct, key components present but buggy",
          30: "Structure understood but significant implementation gaps",
          0: "Could not produce meaningful code",
        },
      };
    case "explanation":
      return {
        title: `Explain Like I'm 5: ${name}`,
        prompt: difficulty === "hard"
          ? `Explain ${name} to three audiences: (1) a 5-year-old, (2) an undergrad CS student, (3) a reviewer at NeurIPS. Each should be 2-3 sentences.`
          : difficulty === "medium"
          ? `Explain ${name} in simple terms. What problem does it solve? How does it work? Why should someone care?`
          : `In one sentence, what is ${name}? Give a real-world analogy.`,
        rubric: {
          90: "Crystal clear explanation that shows deep understanding",
          70: "Good explanation with correct key points",
          50: "Partially correct, some confusion in explanation",
          30: "Vague understanding, missing key aspects",
          0: "Could not explain the concept",
        },
      };
    case "comparison":
      return {
        title: `Compare & Contrast: ${name}`,
        prompt: difficulty === "hard"
          ? `Compare ${name} with its closest alternative(s). Cover: mathematical formulation, computational complexity, strengths, weaknesses, and when to use each. Cite specific papers.`
          : difficulty === "medium"
          ? `Compare ${name} with a related approach. What are the key differences? When would you choose one over the other?`
          : `Name one alternative to ${name}. What's the main difference?`,
        rubric: {
          90: "Comprehensive comparison with nuanced understanding of tradeoffs",
          70: "Correct key differences identified with good reasoning",
          50: "Some differences noted but comparison is shallow",
          30: "Knows alternatives exist but can't articulate differences well",
          0: "Could not compare",
        },
      };
    default:
      return { title: `Challenge: ${name}`, prompt: `Explain and demonstrate your understanding of ${name}.` };
  }
}

export function detectStruggle(conceptId?: string): object {
  const mastery = loadMastery();
  const revisions = loadJSON<any[]>("revisions.json", []);
  const today = new Date().toISOString().split("T")[0];

  const struggles: Array<{
    conceptId: string;
    issue: string;
    severity: "high" | "medium" | "low";
    suggestion: string;
  }> = [];

  const entries = conceptId
    ? Object.entries(mastery).filter(([id]) => id === conceptId)
    : Object.entries(mastery);

  for (const [id, info] of entries) {
    // Declining trend with multiple assessments
    if (info.history.length >= 3) {
      const trend = getTrend(info.history);
      if (trend === "declining") {
        struggles.push({
          conceptId: id,
          issue: "Performance declining over recent assessments",
          severity: "high",
          suggestion: "Try a different learning approach: watch a video, read a different textbook, or teach someone else.",
        });
      }
    }

    // Many assessments but still low score
    if (info.assessments >= 5 && info.score < 50) {
      struggles.push({
        conceptId: id,
        issue: `${info.assessments} assessments but score still at ${Math.round(info.score)}/100`,
        severity: "high",
        suggestion: "Check prerequisites in the concept graph. You may be missing a foundational concept.",
      });
    }

    // Long time since last assessment (potential decay)
    if (info.lastAssessed) {
      const daysSince = Math.floor(
        (new Date(today).getTime() - new Date(info.lastAssessed).getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysSince > 14 && info.level !== "advanced") {
        struggles.push({
          conceptId: id,
          issue: `${daysSince} days since last assessment — knowledge may be decaying`,
          severity: "medium",
          suggestion: "Schedule a quick review session to maintain retention.",
        });
      }
    }

    // SRS items keep getting marked as "forgot"
    const conceptRevisions = revisions.filter((r: any) =>
      r.concept.toLowerCase().includes(id.replace(/-/g, " ").toLowerCase())
    );
    const forgotCount = conceptRevisions.filter((r: any) => r.difficulty === "forgot").length;
    if (forgotCount >= 3) {
      struggles.push({
        conceptId: id,
        issue: `Marked as 'forgot' ${forgotCount} times in SRS`,
        severity: "high",
        suggestion: "Use the 'generate_challenge' tool with explanation type to rebuild understanding from scratch.",
      });
    }
  }

  // Sort by severity
  const severityRank = { high: 0, medium: 1, low: 2 };
  struggles.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    title: conceptId ? `Struggle Detection: ${conceptId}` : "Struggle Detection Report",
    totalIssues: struggles.length,
    high: struggles.filter((s) => s.severity === "high").length,
    medium: struggles.filter((s) => s.severity === "medium").length,
    struggles,
    overallAdvice: struggles.length === 0
      ? "No struggles detected. Keep up the good work!"
      : "Focus on the high-severity items. Consider reviewing prerequisites and trying different learning modalities.",
  };
}

export function getMasteryDashboard(): object {
  const mastery = loadMastery();
  const revisions = loadJSON<any[]>("revisions.json", []);
  const entries = Object.entries(mastery);

  if (entries.length === 0) {
    return {
      title: "Mastery Dashboard",
      message: "No mastery data yet. Use assess_understanding to start tracking.",
    };
  }

  const levels = { beginner: 0, intermediate: 0, advanced: 0, unknown: 0 };
  let totalScore = 0;
  const recentlyImproved: Array<{ concept: string; level: string; trend: string }> = [];

  for (const [id, info] of entries) {
    levels[info.level]++;
    totalScore += info.score;
    const trend = getTrend(info.history);
    if (trend === "improving") {
      recentlyImproved.push({ concept: id, level: info.level, trend });
    }
  }

  // Concepts needing attention (low score + long time since assessment)
  const today = new Date().toISOString().split("T")[0];
  const needsAttention = entries
    .filter(([, info]) => info.score < 50 || (info.lastAssessed && info.lastAssessed < today))
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 5)
    .map(([id, info]) => ({ concept: id, score: Math.round(info.score), level: info.level }));

  return {
    title: "Mastery Dashboard",
    summary: {
      totalConcepts: entries.length,
      averageScore: Math.round(totalScore / entries.length),
      levels,
      masteryRate: `${Math.round((levels.advanced / Math.max(entries.length, 1)) * 100)}%`,
    },
    recentlyImproved: recentlyImproved.slice(0, 5),
    needsAttention,
    totalAssessments: entries.reduce((s, [, v]) => s + v.assessments, 0),
  };
}
