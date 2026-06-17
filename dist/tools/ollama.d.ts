interface OllamaConfig {
    baseUrl: string;
    chatModel: string;
    embedModel: string;
    temperature: number;
    maxTokens: number;
}
export declare function ollamaChat(messages: {
    role: string;
    content: string;
}[], options?: {
    model?: string;
    temperature?: number;
    system?: string;
}): Promise<{
    response: string;
    model: string;
    totalDuration?: number;
}>;
export declare function ollamaEmbed(texts: string | string[], model?: string): Promise<number[][]>;
export declare function ollamaGenerate(prompt: string, options?: {
    model?: string;
    system?: string;
    temperature?: number;
}): Promise<string>;
export declare function checkOllamaStatus(): Promise<object>;
export declare function configureOllama(updates: Partial<OllamaConfig>): object;
export declare function getStudyCompanionSystem(): string;
export {};
//# sourceMappingURL=ollama.d.ts.map