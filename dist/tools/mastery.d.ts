export declare function assessUnderstanding(conceptId: string, assessmentType: "quiz" | "derivation" | "implementation" | "explanation" | "review", score: number, difficulty?: "easy" | "medium" | "hard", timeSpentMinutes?: number, notes?: string): object;
export declare function getDifficultyProfile(topic?: string): object;
export declare function generateChallenge(conceptId: string, challengeType?: "derivation" | "implementation" | "explanation" | "comparison"): object;
export declare function detectStruggle(conceptId?: string): object;
export declare function getMasteryDashboard(): object;
//# sourceMappingURL=mastery.d.ts.map