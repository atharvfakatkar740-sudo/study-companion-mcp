export declare function loadJSON<T>(filename: string, defaultValue: T): T;
export declare function saveJSON<T>(filename: string, data: T): void;
export declare function loadNotes(topicId: string): string;
export declare function saveNotes(topicId: string, content: string): void;
export declare function appendSessionLog(session: Record<string, unknown>): void;
export declare function getDataDir(): string;
//# sourceMappingURL=storage.d.ts.map