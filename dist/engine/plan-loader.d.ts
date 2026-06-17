import type { StudyPlanJSON, MentorKnowledgeJSON, ResearcherConfigJSON } from "./plan-schema.js";
import type { Phase } from "../utils/types.js";
export declare function getStudyPlan(): StudyPlanJSON;
export declare function getStudyPhases(): Phase[];
export declare function getPapersReadingList(): StudyPlanJSON["reading_list"];
export declare function getPlanMeta(): StudyPlanJSON["meta"];
export declare function getMentorKnowledge(): MentorKnowledgeJSON;
export declare function saveMentorGuidance(projectId: string, milestoneId: string, guidance: {
    projectId: string;
    currentMilestone: string;
    guidance: string;
    resources: string[];
    commonMistakes: string[];
    nextSteps: string[];
}): void;
export declare function getResearcherConfig(): ResearcherConfigJSON;
export declare function savePlan(plan: StudyPlanJSON): void;
export declare function snapshotPlan(label?: string): string;
export declare function getPlanHistory(): string[];
export declare function reloadPlan(): void;
export declare function getCurrentPhaseFromPlan(startDate: string, now?: Date): string;
export declare function findPhaseById(phaseId: string): Phase | undefined;
export declare function getAllTopics(): Phase["topics"];
export declare function getAllProjects(): Phase["projects"];
//# sourceMappingURL=plan-loader.d.ts.map