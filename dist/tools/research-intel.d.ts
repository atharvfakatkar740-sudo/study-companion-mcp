export declare function searchSemanticScholar(query: string, limit?: number): Promise<object>;
export declare function addToCitationGraph(paperId: string, fetchCitations?: boolean, depth?: number): Promise<object>;
export declare function addManualCitation(fromTitle: string, toTitle: string, type?: "cites" | "extends" | "reproduces" | "competes"): object;
export declare function getCitationGraph(paperTitle?: string): object;
export declare function trackPaperLineage(lineageName: string, description: string, papers: Array<{
    title: string;
    year?: number;
    contribution: string;
}>): object;
export declare function getPaperLineages(): object;
export declare function generateImplementationChecklist(paperTitle: string, paperType?: "vae" | "gnn" | "transformer" | "general"): object;
export declare function updateChecklistItem(checklistId: string, itemId: string, completed: boolean, notes?: string): object;
export declare function getImplementationChecklists(checklistId?: string): object;
export declare function findBridgePapers(topicA: string, topicB: string): object;
export declare function citationGraphStats(): object;
//# sourceMappingURL=research-intel.d.ts.map