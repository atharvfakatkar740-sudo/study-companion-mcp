export declare function saveInsight(content: string, topic: string, type: "insight" | "question" | "connection" | "implementation_note" | "mistake" | "breakthrough", tags?: string[], relatedTopics?: string[]): object;
export declare function searchMemory(query: string, type?: string, topic?: string): object;
export declare function getRecentInsights(count?: number, type?: string): object;
export declare function getTopicNotes(topicId: string): object;
export declare function updateTopicNotes(topicId: string, content: string): object;
export declare function getConnectionMap(topic?: string): object;
export declare function getMemoryStats(): object;
//# sourceMappingURL=memory.d.ts.map