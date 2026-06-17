export declare function studyChat(message: string, options?: {
    sessionId?: string;
    useContext?: boolean;
    model?: string;
}): Promise<object>;
export declare function askContextQuestion(question: string): Promise<object>;
export declare function getChatSessions(limit?: number): Promise<object>;
export declare function searchPastChats(query: string, limit?: number): Promise<object>;
export declare function startNewChatSession(): object;
//# sourceMappingURL=chat.d.ts.map