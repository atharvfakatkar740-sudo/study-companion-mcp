export declare function scheduleStudySessions(startDate: string, daysAhead?: number, customTopics?: string[]): object;
export declare function updateScheduleTemplate(dayType: "weekday" | "weekend", slots: {
    startHour: number;
    endHour: number;
    activity: string;
}[]): object;
export declare function getNextStudySession(): object;
export declare function createCalendarEvent(title: string, date: string, startHour: number, durationMinutes: number, description?: string): object;
export declare function getWeeklyScheduleOverview(): object;
//# sourceMappingURL=calendar.d.ts.map