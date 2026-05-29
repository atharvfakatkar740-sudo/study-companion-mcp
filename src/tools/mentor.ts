import { loadJSON } from "../utils/storage.js";
import { getStudyPhases, getMentorKnowledge } from "../engine/plan-loader.js";

interface MentorGuidance {
  projectId: string;
  currentMilestone: string;
  guidance: string;
  resources: string[];
  commonMistakes: string[];
  nextSteps: string[];
}

// Load mentor knowledge from data/mentor-knowledge.json (editable without rebuild)
function getProjectGuidanceData(): Record<string, Record<string, MentorGuidance>> {
  return getMentorKnowledge() as Record<string, Record<string, MentorGuidance>>;
}

export function getProjectGuidance(projectId: string, milestoneId?: string): object {
  const state = loadJSON<Record<string, string[]>>("milestones-completed.json", {});
  const STUDY_PHASES = getStudyPhases();
  const phase = STUDY_PHASES.find((p) => p.projects.some((pr) => pr.id === projectId));
  const project = phase?.projects.find((p) => p.id === projectId);

  if (!project) return { error: `Project '${projectId}' not found.` };

  // Find current milestone (first incomplete one)
  const completedMilestones = state[projectId] || [];
  const currentMilestone = milestoneId ||
    project.milestones.find((m) => !completedMilestones.includes(m.id))?.id;

  if (!currentMilestone) {
    return { message: `Project '${projectId}' is complete! Congratulations!`, project: project.name };
  }

  const PROJECT_GUIDANCE = getProjectGuidanceData();
  const guidance = PROJECT_GUIDANCE[projectId]?.[currentMilestone];

  if (!guidance) {
    const milestone = project.milestones.find((m) => m.id === currentMilestone);
    return {
      project: project.name,
      currentMilestone: milestone?.description || currentMilestone,
      guidance: "No specific guidance template for this milestone yet. Break it into sub-tasks and tackle one at a time.",
      progress: `${completedMilestones.length}/${project.milestones.length} milestones done`,
    };
  }

  return {
    project: project.name,
    ...guidance,
    progress: `${completedMilestones.length}/${project.milestones.length} milestones done`,
    completedMilestones: completedMilestones.map((id) =>
      project.milestones.find((m) => m.id === id)?.description || id
    ),
  };
}

export function listProjects(): object {
  const state = loadJSON<Record<string, string[]>>("milestones-completed.json", {});
  const plannerState = loadJSON<{ completedProjects: string[] }>("planner-state.json", { completedProjects: [] });

  const allProjects = getStudyPhases().flatMap((phase) =>
    phase.projects.map((p) => {
      const completed = state[p.id] || [];
      return {
        id: p.id,
        name: p.name,
        phase: phase.name,
        description: p.description,
        progress: `${completed.length}/${p.milestones.length}`,
        status: plannerState.completedProjects.includes(p.id)
          ? "completed"
          : completed.length > 0
          ? "in_progress"
          : "not_started",
        milestones: p.milestones.map((m) => ({
          id: m.id,
          description: m.description,
          completed: completed.includes(m.id),
        })),
      };
    })
  );

  return { projects: allProjects, totalProjects: allProjects.length };
}

export function getWeeklyReport(): object {
  const plannerState = loadJSON<{
    totalStudyHours: number;
    streakDays: number;
    completedTopics: string[];
    completedProjects: string[];
  }>("planner-state.json", { totalStudyHours: 0, streakDays: 0, completedTopics: [], completedProjects: [] });

  const revisions = loadJSON<any[]>("revisions.json", []);
  const papers = loadJSON<any[]>("papers.json", []);
  const memories = loadJSON<any[]>("memory.json", []);

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const recentMemories = memories.filter((m: any) => m.timestamp >= weekAgoStr);
  const recentPapers = papers.filter((p: any) => p.completedDate && p.completedDate >= weekAgoStr);

  return {
    summary: {
      totalStudyHours: plannerState.totalStudyHours,
      currentStreak: plannerState.streakDays,
      topicsCompleted: plannerState.completedTopics.length,
      projectsCompleted: plannerState.completedProjects.length,
    },
    thisWeek: {
      insightsRecorded: recentMemories.length,
      papersCompleted: recentPapers.length,
      revisionItemsDue: revisions.filter((r: any) => r.nextReview <= today.toISOString().split("T")[0]).length,
    },
    recommendations: generateRecommendations(plannerState, revisions, papers),
  };
}

function generateRecommendations(state: any, revisions: any[], papers: any[]): string[] {
  const recs: string[] = [];
  const today = new Date().toISOString().split("T")[0];
  const dueRevisions = revisions.filter((r: any) => r.nextReview <= today);

  if (dueRevisions.length > 5) {
    recs.push(`⚠️ You have ${dueRevisions.length} overdue revisions. Prioritize these to maintain retention.`);
  }
  if (state.streakDays >= 7) {
    recs.push(`🔥 ${state.streakDays}-day streak! Consistency is your biggest advantage.`);
  }
  if (state.streakDays === 0) {
    recs.push("Start fresh today. Even 30 minutes compounds over 3 years.");
  }

  const queuedPapers = papers.filter((p: any) => p.status === "queued");
  if (queuedPapers.length > 0 && papers.filter((p: any) => p.status === "reading").length === 0) {
    recs.push(`📄 No paper currently in progress. Start: "${queuedPapers[0].title}"`);
  }

  recs.push("Remember: Labs care about reproducibility, implementation quality, engineering maturity.");

  return recs;
}
