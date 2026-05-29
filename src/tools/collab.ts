import { loadJSON, saveJSON, getDataDir } from "../utils/storage.js";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// ============================================
// v2.0 — Collaborative Study Tracking
// Export, import, compare, and share progress
// ============================================

interface ProgressSnapshot {
  exportedAt: string;
  version: string;
  user: string;
  progress: {
    totalHours: number;
    streak: number;
    completedTopics: string[];
    completedProjects: string[];
    totalInsights: number;
    totalPapers: number;
    totalRevisions: number;
    currentPhase: string;
  };
  highlights: {
    topTopics: { topic: string; hours: number }[];
    recentInsights: { content: string; topic: string }[];
    papersCompleted: string[];
  };
  milestones: { id: string; name: string; completedAt: string }[];
}

export function exportProgress(userName?: string): object {
  const plannerState = loadJSON<any>("planner-state.json", {
    completedTopics: [],
    completedProjects: [],
    totalStudyHours: 0,
    streak: 0,
  });
  const memories = loadJSON<any[]>("memory.json", []);
  const papers = loadJSON<any[]>("papers.json", []);
  const revisions = loadJSON<any[]>("revisions.json", []);
  const milestones = loadJSON<any[]>("milestones-completed.json", []);

  // Compute top topics from session log
  const sessionLogPath = join(getDataDir(), "session-log.jsonl");
  let topicHours: Record<string, number> = {};
  if (existsSync(sessionLogPath)) {
    const lines = readFileSync(sessionLogPath, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const s = JSON.parse(line);
        topicHours[s.topic] = (topicHours[s.topic] || 0) + (s.hours || 0);
      } catch { /* skip malformed */ }
    }
  }

  const snapshot: ProgressSnapshot = {
    exportedAt: new Date().toISOString(),
    version: "2.0.0",
    user: userName || "anonymous",
    progress: {
      totalHours: plannerState.totalStudyHours || 0,
      streak: plannerState.streak || 0,
      completedTopics: plannerState.completedTopics || [],
      completedProjects: plannerState.completedProjects || [],
      totalInsights: memories.length,
      totalPapers: papers.length,
      totalRevisions: revisions.length,
      currentPhase: plannerState.currentPhaseOverride || "auto",
    },
    highlights: {
      topTopics: Object.entries(topicHours)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([topic, hours]) => ({ topic, hours: Math.round((hours as number) * 10) / 10 })),
      recentInsights: memories
        .filter((m: any) => m.type === "insight" || m.type === "breakthrough")
        .slice(-5)
        .map((m: any) => ({ content: m.content.slice(0, 100), topic: m.topic })),
      papersCompleted: papers
        .filter((p: any) => p.status === "completed")
        .map((p: any) => p.title),
    },
    milestones: (milestones || []).map((m: any) => ({
      id: m.id || m.milestoneId,
      name: m.name || m.milestone || "Unknown",
      completedAt: m.completedAt || m.timestamp || "",
    })),
  };

  // Save export
  const exportPath = `progress-export-${new Date().toISOString().split("T")[0]}.json`;
  saveJSON(exportPath, snapshot);

  return {
    exported: true,
    path: exportPath,
    summary: {
      hours: snapshot.progress.totalHours,
      topics: snapshot.progress.completedTopics.length,
      insights: snapshot.progress.totalInsights,
      papers: snapshot.progress.totalPapers,
    },
    shareInstructions: "Share the exported JSON file with study partners for comparison.",
  };
}

export function importProgress(snapshotJson: string): object {
  try {
    const snapshot: ProgressSnapshot = JSON.parse(snapshotJson);

    if (!snapshot.version || !snapshot.progress) {
      return { error: "Invalid progress snapshot format." };
    }

    const imports = loadJSON<ProgressSnapshot[]>("imported-progress.json", []);
    imports.push(snapshot);
    saveJSON("imported-progress.json", imports);

    return {
      imported: true,
      user: snapshot.user,
      exportedAt: snapshot.exportedAt,
      summary: {
        hours: snapshot.progress.totalHours,
        topics: snapshot.progress.completedTopics.length,
        insights: snapshot.progress.totalInsights,
      },
      message: `Imported progress from ${snapshot.user}. Use compare_progress to see side-by-side.`,
    };
  } catch (err: any) {
    return { error: `Failed to parse snapshot: ${err.message}` };
  }
}

export function compareProgress(otherUserName?: string): object {
  // Load own progress
  const own = exportProgress("me") as any;
  const ownSummary = own.summary;

  // Load imported progress
  const imports = loadJSON<ProgressSnapshot[]>("imported-progress.json", []);

  if (imports.length === 0) {
    return {
      error: "No imported progress to compare against.",
      suggestion: "Ask a study partner to export their progress and use import_progress to load it.",
    };
  }

  const target = otherUserName
    ? imports.find((i) => i.user === otherUserName)
    : imports[imports.length - 1];

  if (!target) {
    return {
      error: `No imported progress found for "${otherUserName}".`,
      available: imports.map((i) => i.user),
    };
  }

  const otherSummary = {
    hours: target.progress.totalHours,
    topics: target.progress.completedTopics.length,
    insights: target.progress.totalInsights,
    papers: target.progress.totalPapers,
  };

  // Comparison
  const comparison = {
    you: ownSummary,
    them: { user: target.user, ...otherSummary },
    delta: {
      hours: Math.round((ownSummary.hours - otherSummary.hours) * 10) / 10,
      topics: ownSummary.topics - otherSummary.topics,
      insights: ownSummary.insights - otherSummary.insights,
      papers: ownSummary.papers - (otherSummary.papers || 0),
    },
    sharedTopics: target.progress.completedTopics.filter(
      (t: string) => (own as any).completedTopics?.includes(t)
    ),
  };

  // Generate encouragement
  const totalDelta = comparison.delta.hours;
  let encouragement: string;
  if (totalDelta > 0) {
    encouragement = `You're ${totalDelta}h ahead! Maintain your lead while keeping quality high.`;
  } else if (totalDelta < 0) {
    encouragement = `${target.user} is ${Math.abs(totalDelta)}h ahead. Focus on consistency — everyone has different schedules.`;
  } else {
    encouragement = "Neck and neck! Great friendly competition.";
  }

  return {
    comparison,
    encouragement,
    suggestion: "Remember: learning depth > breadth. Don't sacrifice understanding for speed.",
  };
}

export function generateShareableReport(): object {
  const plannerState = loadJSON<any>("planner-state.json", {});
  const memories = loadJSON<any[]>("memory.json", []);
  const papers = loadJSON<any[]>("papers.json", []);
  const milestones = loadJSON<any[]>("milestones-completed.json", []);

  const completedPapers = papers.filter((p: any) => p.status === "completed");

  const report = `
# 📊 Study Progress Report
**Generated**: ${new Date().toISOString().split("T")[0]}

## Overview
- **Total Study Hours**: ${plannerState.totalStudyHours || 0}h
- **Current Streak**: ${plannerState.streak || 0} days
- **Topics Completed**: ${(plannerState.completedTopics || []).length}
- **Knowledge Insights**: ${memories.length}
- **Papers Read**: ${completedPapers.length}/${papers.length}

## Milestones Achieved
${(milestones || []).map((m: any) => `- ✅ ${m.name || m.milestone || m.id}`).join("\n") || "- None yet — keep going!"}

## Key Insights
${memories
  .filter((m: any) => m.type === "breakthrough" || m.type === "insight")
  .slice(-5)
  .map((m: any) => `- 💡 **${m.topic}**: ${m.content.slice(0, 80)}...`)
  .join("\n") || "- Start saving insights to build your knowledge base!"}

## Papers Read
${completedPapers.slice(-5).map((p: any) => `- 📄 ${p.title}`).join("\n") || "- No papers completed yet."}

---
*Generated by Study Companion MCP v2.0 — Powered by local AI*
`.trim();

  saveJSON("shareable-report.md", report);

  return {
    report,
    format: "markdown",
    suggestion: "Share on GitHub, LinkedIn, or with study partners to show your progress!",
  };
}
