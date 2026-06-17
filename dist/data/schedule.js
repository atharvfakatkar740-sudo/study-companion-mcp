import { getCurrentPhaseFromPlan } from "../engine/plan-loader.js";
// Time-aware scheduling based on the study plan's recommended schedule
// Weekdays: 3 focused hours (1hr reading, 1hr implementation, 1hr math+experiments)
// Weekends: 8-10 hours (projects, reproductions, blog writing, debugging, literature)
export function isWeekend(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6;
}
export function getDayType(date = new Date()) {
    return isWeekend(date) ? "weekend" : "weekday";
}
export function generateWeekdayBlocks(currentTopics, currentProject) {
    const blocks = [
        {
            duration: 60,
            activity: "reading",
            topic: currentTopics[0] || "papers",
            description: "Deep reading: paper or textbook chapter. Take notes on key concepts.",
        },
        {
            duration: 60,
            activity: "implementation",
            topic: currentTopics[1] || currentTopics[0] || "pytorch",
            description: "Hands-on coding: implement what you read or advance current project.",
        },
        {
            duration: 60,
            activity: "math",
            topic: currentTopics[2] || "math-foundations",
            description: "Math + experiments: derivations, proofs, or running experiments.",
        },
    ];
    return blocks;
}
export function generateWeekendBlocks(currentTopics, currentProject) {
    const blocks = [
        {
            duration: 120,
            activity: "project",
            topic: currentProject || "current-project",
            description: "Deep project work: build, debug, iterate on your main project.",
        },
        {
            duration: 90,
            activity: "implementation",
            topic: currentTopics[0] || "reproduction",
            description: "Paper reproduction or advanced implementation work.",
        },
        {
            duration: 60,
            activity: "reading",
            topic: "literature",
            description: "Literature exploration: find new papers, read related work.",
        },
        {
            duration: 90,
            activity: "project",
            topic: currentProject || "current-project",
            description: "Continue project building: focus on quality and documentation.",
        },
        {
            duration: 60,
            activity: "blog",
            topic: "writing",
            description: "Blog writing or README documentation for public portfolio.",
        },
        {
            duration: 60,
            activity: "revision",
            topic: "review",
            description: "Spaced repetition review + debugging experiments.",
        },
    ];
    return blocks;
}
// Determine current phase based on month number — dynamically from plan JSON
export function getCurrentPhaseId(startDate, now = new Date()) {
    return getCurrentPhaseFromPlan(startDate, now);
}
// Calculate optimal focus topics based on phase progress
export function getActiveFocusTopics(phaseId, completedTopicIds, allTopics) {
    const phaseTopics = allTopics
        .filter((t) => t.phase === phaseId && !completedTopicIds.includes(t.id))
        .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 3) -
            (priorityOrder[b.priority] || 3);
    });
    // Return top 3 focus topics
    return phaseTopics.slice(0, 3).map((t) => t.id);
}
//# sourceMappingURL=schedule.js.map