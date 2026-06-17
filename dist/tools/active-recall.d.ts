export declare function generateDerivationQuiz(topic: string, count?: number): object;
export declare function generateImplementationChallenge(topic: string, language?: string): object;
export declare function generateELI5Challenge(concept: string): object;
export declare function generateComparison(conceptA: string, conceptB: string): object;
export declare function generateWeeklyTest(): object;
export declare function exportAnkiDeck(topic?: string, includeInsights?: boolean): object;
export declare function recordTestResult(testId: string, scores: Array<{
    questionId: string;
    score: number;
}>, duration?: number): object;
//# sourceMappingURL=active-recall.d.ts.map