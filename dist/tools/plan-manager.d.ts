export declare function getPlanInfo(): object;
export declare function reloadStudyPlan(): object;
export declare function validatePlan(): object;
export declare function addPhaseToPlan(id: string, name: string, monthStart: number, monthEnd: number, description: string): object;
export declare function addTopicToPlan(phaseId: string, topicId: string, name: string, priority: "critical" | "high" | "medium" | "low", subtopics: string[]): object;
export declare function addProjectToPlan(phaseId: string, projectId: string, name: string, description: string, milestones: Array<{
    id: string;
    description: string;
}>): object;
export declare function snapshotCurrentPlan(label?: string): object;
export declare function listPlanSnapshots(): object;
export declare function exportPlanAsMarkdown(): object;
export declare function getResearchersInfo(): object;
//# sourceMappingURL=plan-manager.d.ts.map