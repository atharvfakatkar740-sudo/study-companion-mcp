import { DailyPlan } from "../utils/types.js";
export declare function getDailyPlan(): DailyPlan;
export declare function getPhaseStatus(): object;
export declare function markTopicComplete(topicId: string): object;
export declare function markProjectMilestone(projectId: string, milestoneId: string): object;
export declare function logStudySession(hours: number, topic: string, notes?: string): object;
export declare function setStartDate(date: string): object;
export declare function overridePhase(phaseId: string): object;
export declare function clearPhaseOverride(): object;
export declare function getFullRoadmap(): object;
//# sourceMappingURL=planner.d.ts.map