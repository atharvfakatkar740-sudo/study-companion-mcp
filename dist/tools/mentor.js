import { loadJSON } from "../utils/storage.js";
import { getStudyPhases, getMentorKnowledge } from "../engine/plan-loader.js";
// Load mentor knowledge from data/mentor-knowledge.json (editable without rebuild)
function getProjectGuidanceData() {
    return getMentorKnowledge();
}
export function getProjectGuidance(projectId, milestoneId) {
    const state = loadJSON("milestones-completed.json", {});
    const STUDY_PHASES = getStudyPhases();
    const phase = STUDY_PHASES.find((p) => p.projects.some((pr) => pr.id === projectId));
    const project = phase?.projects.find((p) => p.id === projectId);
    if (!project)
        return { error: `Project '${projectId}' not found.` };
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
        completedMilestones: completedMilestones.map((id) => project.milestones.find((m) => m.id === id)?.description || id),
    };
}
export function listProjects() {
    const state = loadJSON("milestones-completed.json", {});
    const plannerState = loadJSON("planner-state.json", { completedProjects: [] });
    const allProjects = getStudyPhases().flatMap((phase) => phase.projects.map((p) => {
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
    }));
    return { projects: allProjects, totalProjects: allProjects.length };
}
export function getWeeklyReport() {
    const plannerState = loadJSON("planner-state.json", { totalStudyHours: 0, streakDays: 0, completedTopics: [], completedProjects: [] });
    const revisions = loadJSON("revisions.json", []);
    const papers = loadJSON("papers.json", []);
    const memories = loadJSON("memory.json", []);
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const recentMemories = memories.filter((m) => m.timestamp >= weekAgoStr);
    const recentPapers = papers.filter((p) => p.completedDate && p.completedDate >= weekAgoStr);
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
            revisionItemsDue: revisions.filter((r) => r.nextReview <= today.toISOString().split("T")[0]).length,
        },
        recommendations: generateRecommendations(plannerState, revisions, papers),
    };
}
function generateRecommendations(state, revisions, papers) {
    const recs = [];
    const today = new Date().toISOString().split("T")[0];
    const dueRevisions = revisions.filter((r) => r.nextReview <= today);
    if (dueRevisions.length > 5) {
        recs.push(`⚠️ You have ${dueRevisions.length} overdue revisions. Prioritize these to maintain retention.`);
    }
    if (state.streakDays >= 7) {
        recs.push(`🔥 ${state.streakDays}-day streak! Consistency is your biggest advantage.`);
    }
    if (state.streakDays === 0) {
        recs.push("Start fresh today. Even 30 minutes compounds over 3 years.");
    }
    const queuedPapers = papers.filter((p) => p.status === "queued");
    if (queuedPapers.length > 0 && papers.filter((p) => p.status === "reading").length === 0) {
        recs.push(`📄 No paper currently in progress. Start: "${queuedPapers[0].title}"`);
    }
    recs.push("Remember: Labs care about reproducibility, implementation quality, engineering maturity.");
    return recs;
}
//# sourceMappingURL=mentor.js.map