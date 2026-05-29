import { loadJSON, saveJSON } from "../utils/storage.js";
import { STUDY_PHASES } from "../data/study-plan.js";
import { getDayType, generateWeekdayBlocks, generateWeekendBlocks, getCurrentPhaseId, getActiveFocusTopics } from "../data/schedule.js";
import { DailyPlan, ProgressSnapshot, Topic } from "../utils/types.js";

interface PlannerState {
  startDate: string;
  currentPhaseOverride?: string;
  completedTopics: string[];
  completedProjects: string[];
  totalStudyHours: number;
  streakDays: number;
  lastActiveDate?: string;
}

const DEFAULT_STATE: PlannerState = {
  startDate: new Date().toISOString().split("T")[0],
  completedTopics: [],
  completedProjects: [],
  totalStudyHours: 0,
  streakDays: 0,
};

function getState(): PlannerState {
  return loadJSON<PlannerState>("planner-state.json", DEFAULT_STATE);
}

function setState(state: PlannerState): void {
  saveJSON("planner-state.json", state);
}

export function getDailyPlan(): DailyPlan {
  const state = getState();
  const now = new Date();
  const dayType = getDayType(now);
  const currentPhaseId = state.currentPhaseOverride || getCurrentPhaseId(state.startDate, now);
  const phase = STUDY_PHASES.find((p) => p.id === currentPhaseId);

  if (!phase) {
    return {
      date: now.toISOString().split("T")[0],
      dayType,
      currentPhase: currentPhaseId,
      blocks: [],
      revisionsdue: [],
    };
  }

  const allTopics = phase.topics.map((t) => ({ id: t.id, phase: t.phase, priority: t.priority }));
  const focusTopics = getActiveFocusTopics(currentPhaseId, state.completedTopics, allTopics);
  const activeProject = phase.projects.find((p) => !state.completedProjects.includes(p.id));

  const blocks = dayType === "weekend"
    ? generateWeekendBlocks(focusTopics, activeProject?.id)
    : generateWeekdayBlocks(focusTopics, activeProject?.id);

  // Load revision items due today
  const revisions = loadJSON<any[]>("revisions.json", []);
  const today = now.toISOString().split("T")[0];
  const dueRevisions = revisions.filter((r: any) => r.nextReview <= today);

  return {
    date: today,
    dayType,
    currentPhase: phase.name,
    blocks,
    revisionsdue: dueRevisions.slice(0, 5),
    projectTask: activeProject ? `Continue: ${activeProject.name}` : undefined,
  };
}

export function getPhaseStatus(): object {
  const state = getState();
  const now = new Date();
  const currentPhaseId = state.currentPhaseOverride || getCurrentPhaseId(state.startDate, now);
  const phase = STUDY_PHASES.find((p) => p.id === currentPhaseId);

  if (!phase) return { error: "Phase not found" };

  const totalTopics = phase.topics.length;
  const completedTopics = phase.topics.filter((t) => state.completedTopics.includes(t.id)).length;
  const totalProjects = phase.projects.length;
  const completedProjects = phase.projects.filter((p) => state.completedProjects.includes(p.id)).length;

  const topicBreakdown = phase.topics.map((t) => ({
    id: t.id,
    name: t.name,
    priority: t.priority,
    status: state.completedTopics.includes(t.id) ? "completed" : t.status,
    subtopics: t.subtopics,
  }));

  const projectBreakdown = phase.projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: state.completedProjects.includes(p.id) ? "completed" : p.status,
    milestones: p.milestones,
  }));

  return {
    phase: phase.name,
    phaseId: phase.id,
    description: phase.description,
    monthRange: phase.monthRange,
    progress: {
      topics: `${completedTopics}/${totalTopics}`,
      projects: `${completedProjects}/${totalProjects}`,
      percentage: Math.round((completedTopics / totalTopics) * 100),
    },
    topics: topicBreakdown,
    projects: projectBreakdown,
    deliverables: phase.deliverables,
    totalStudyHours: state.totalStudyHours,
    streak: state.streakDays,
  };
}

export function markTopicComplete(topicId: string): object {
  const state = getState();
  if (!state.completedTopics.includes(topicId)) {
    state.completedTopics.push(topicId);
    setState(state);
  }
  return { success: true, message: `Topic '${topicId}' marked complete.`, totalCompleted: state.completedTopics.length };
}

export function markProjectMilestone(projectId: string, milestoneId: string): object {
  const state = getState();
  const milestones = loadJSON<Record<string, string[]>>("milestones-completed.json", {});
  if (!milestones[projectId]) milestones[projectId] = [];
  if (!milestones[projectId].includes(milestoneId)) {
    milestones[projectId].push(milestoneId);
  }
  saveJSON("milestones-completed.json", milestones);

  // Check if project is fully complete
  const phase = STUDY_PHASES.find((p) => p.projects.some((pr) => pr.id === projectId));
  const project = phase?.projects.find((p) => p.id === projectId);
  if (project && project.milestones.every((m) => milestones[projectId].includes(m.id))) {
    if (!state.completedProjects.includes(projectId)) {
      state.completedProjects.push(projectId);
      setState(state);
    }
    return { success: true, message: `Milestone complete. Project '${projectId}' is now FULLY COMPLETED!` };
  }

  return { success: true, message: `Milestone '${milestoneId}' marked complete for project '${projectId}'.` };
}

export function logStudySession(hours: number, topic: string, notes?: string): object {
  const state = getState();
  const today = new Date().toISOString().split("T")[0];

  state.totalStudyHours += hours;

  // Update streak
  if (state.lastActiveDate) {
    const lastDate = new Date(state.lastActiveDate);
    const diff = Math.floor((new Date(today).getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diff === 1) {
      state.streakDays += 1;
    } else if (diff > 1) {
      state.streakDays = 1;
    }
  } else {
    state.streakDays = 1;
  }
  state.lastActiveDate = today;
  setState(state);

  return {
    success: true,
    totalHours: state.totalStudyHours,
    streak: state.streakDays,
    message: `Logged ${hours}h on '${topic}'. Total: ${state.totalStudyHours}h. Streak: ${state.streakDays} days.`,
  };
}

export function setStartDate(date: string): object {
  const state = getState();
  state.startDate = date;
  setState(state);
  return { success: true, message: `Start date set to ${date}. Phase calculations will use this as reference.` };
}

export function overridePhase(phaseId: string): object {
  const state = getState();
  const phase = STUDY_PHASES.find((p) => p.id === phaseId);
  if (!phase) {
    return { error: `Phase '${phaseId}' not found. Valid phases: ${STUDY_PHASES.map((p) => p.id).join(", ")}` };
  }
  state.currentPhaseOverride = phaseId;
  setState(state);
  return { success: true, message: `Phase overridden to '${phase.name}'. Use 'clear_phase_override' to return to auto-detection.` };
}

export function clearPhaseOverride(): object {
  const state = getState();
  delete state.currentPhaseOverride;
  setState(state);
  return { success: true, message: "Phase override cleared. Now using time-based auto-detection." };
}

export function getFullRoadmap(): object {
  return STUDY_PHASES.map((phase) => ({
    id: phase.id,
    name: phase.name,
    months: `${phase.monthRange[0]}-${phase.monthRange[1]}`,
    description: phase.description,
    topicCount: phase.topics.length,
    projectCount: phase.projects.length,
    deliverables: phase.deliverables,
  }));
}
