interface GCalConfig {
    calendarId: string;
    timeZone: string;
    colorMapping: Record<string, string>;
    reminderMinutes: number;
}
export declare function getAuthUrl(): object;
export declare function handleAuthCallback(code: string): Promise<object>;
export declare function syncStudySessions(sessions: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    type: string;
}[]): Promise<object>;
export declare function listUpcomingEvents(maxResults?: number): Promise<object>;
export declare function deleteStudyEvents(eventIds?: string[]): Promise<object>;
export declare function quickAddEvent(text: string): Promise<object>;
export declare function configureGCal(updates: Partial<GCalConfig>): object;
export {};
//# sourceMappingURL=gcal-sync.d.ts.map