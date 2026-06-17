interface VectorDBConfig {
    chromaUrl: string;
    collections: {
        chat: string;
        insights: string;
        sessions: string;
        papers: string;
    };
}
export declare function storeDocument(collectionName: string, id: string, text: string, metadata: Record<string, string | number | boolean>): Promise<void>;
export declare function queryDocuments(collectionName: string, queryText: string, nResults?: number, whereFilter?: Record<string, string | number | boolean>): Promise<{
    ids: string[];
    documents: string[];
    metadatas: Record<string, any>[];
    distances: number[];
}>;
export declare function storeChatMessage(role: "user" | "assistant", content: string, sessionId: string, metadata?: Record<string, string | number | boolean>): Promise<string>;
export declare function searchChatHistory(query: string, nResults?: number, sessionId?: string): Promise<object>;
export declare function indexAllInsights(): Promise<object>;
export declare function semanticSearchInsights(query: string, nResults?: number, topicFilter?: string): Promise<object>;
export declare function storeStudySessionVector(hours: number, topic: string, notes: string, insights?: string[]): Promise<object>;
export declare function getRelevantContext(query: string, maxChunks?: number): Promise<string>;
export declare function checkVectorDBStatus(): Promise<object>;
export declare function configureVectorDB(updates: Partial<VectorDBConfig>): object;
export {};
//# sourceMappingURL=vectordb.d.ts.map