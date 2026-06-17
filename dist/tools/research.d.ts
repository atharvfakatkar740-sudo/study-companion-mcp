export declare function addPaper(title: string, authors: string, url?: string, phase?: string, priority?: number): object;
export declare function getPaperQueue(): object;
export declare function startReadingPaper(paperId: string): object;
export declare function annotatePaper(paperId: string, notes?: string, keyInsights?: string[], architectureNotes?: {
    input?: string;
    representation?: string;
    latentSpace?: string;
    objective?: string;
    uncertaintyModel?: string;
}): object;
export declare function completePaper(paperId: string, keyInsights?: string[]): object;
export declare function getPaperNotes(paperId: string): object;
export declare function searchPapers(query: string): object;
//# sourceMappingURL=research.d.ts.map