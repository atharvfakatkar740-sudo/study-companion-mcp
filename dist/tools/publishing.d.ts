export declare function getConferenceDeadlines(tier?: string, withinDays?: number): object;
export declare function getConferenceInfo(conferenceId: string): object;
export declare function getConferencesByTier(): object;
export declare function getPublicationStrategy(): object;
export declare function startPaperDraft(title: string, strategy: string, targetVenue: string, coauthors?: string[], notes?: string): object;
export declare function updatePaperDraft(draftId: string, updates: {
    status?: string;
    title?: string;
    targetVenue?: string;
    coauthors?: string[];
    notes?: string;
}): object;
export declare function getPaperDrafts(): object;
export declare function getTargetResearchers(alignment?: string): object;
export declare function checkOutreachReadiness(researcherId: string): object;
export declare function logEcosystemContribution(ecosystem: string, type: "pr" | "issue" | "review" | "documentation" | "feature" | "bug_fix", repo: string, description: string, url?: string): object;
export declare function getEcosystemVisibility(): object;
export declare function getConferenceAlerts(): object;
export declare function getFirstPaperAdvice(): object;
export declare function getPublishingDashboard(): object;
//# sourceMappingURL=publishing.d.ts.map