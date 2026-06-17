import { StudyBlock } from "../utils/types.js";
export declare function isWeekend(date?: Date): boolean;
export declare function getDayType(date?: Date): "weekday" | "weekend";
export declare function generateWeekdayBlocks(currentTopics: string[], currentProject?: string): StudyBlock[];
export declare function generateWeekendBlocks(currentTopics: string[], currentProject?: string): StudyBlock[];
export declare function getCurrentPhaseId(startDate: string, now?: Date): string;
export declare function getActiveFocusTopics(phaseId: string, completedTopicIds: string[], allTopics: Array<{
    id: string;
    phase: string;
    priority: string;
}>): string[];
//# sourceMappingURL=schedule.d.ts.map