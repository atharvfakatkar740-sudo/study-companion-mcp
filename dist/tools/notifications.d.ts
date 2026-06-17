interface NotifyConfig {
    serverUrl: string;
    topic: string;
    enabled: boolean;
    defaultPriority: number;
    quietHoursStart: number;
    quietHoursEnd: number;
    tags: Record<string, string>;
}
export declare function sendNotification(title: string, message: string, options?: {
    priority?: number;
    tags?: string[];
    click?: string;
    type?: string;
    bypassQuietHours?: boolean;
}): Promise<object>;
export declare function notifyStudyReminder(topic: string, startTime: string, minutesBefore?: number): Promise<object>;
export declare function notifyStreakUpdate(currentStreak: number, totalHours: number): Promise<object>;
export declare function notifyRevisionDue(dueCount: number, topConcepts: string[]): Promise<object>;
export declare function notifyMilestoneComplete(project: string, milestone: string): Promise<object>;
export declare function notifyWeeklySummary(summary: {
    hours: number;
    streak: number;
    topicsCompleted: number;
    papersRead: number;
}): Promise<object>;
export declare function configureNotifications(updates: Partial<NotifyConfig>): object;
export declare function getNotificationHistory(limit?: number): object;
export declare function testNotification(): Promise<object>;
export {};
//# sourceMappingURL=notifications.d.ts.map