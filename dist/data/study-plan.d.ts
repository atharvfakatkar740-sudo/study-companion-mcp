import type { Phase } from "../utils/types.js";
export declare function getPhases(): Phase[];
export declare const STUDY_PHASES: Phase[];
export declare function getPapersReading(): Array<{
    title: string;
    authors: string;
    phase: string;
    priority: number;
    url?: string;
}>;
export declare const PAPERS_READING_LIST: {
    title: string;
    authors: string;
    phase: string;
    priority: number;
    url?: string;
}[];
//# sourceMappingURL=study-plan.d.ts.map