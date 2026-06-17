import { z } from "zod";
export declare const MilestoneSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    completed: z.ZodBoolean;
    completedDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    completed: boolean;
    completedDate?: string | undefined;
}, {
    id: string;
    description: string;
    completed: boolean;
    completedDate?: string | undefined;
}>;
export declare const TopicSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    phase: z.ZodString;
    priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
    subtopics: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["not_started", "in_progress", "completed", "needs_review"]>;
    completedDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "completed" | "not_started" | "in_progress" | "needs_review";
    name: string;
    phase: string;
    priority: "critical" | "high" | "medium" | "low";
    subtopics: string[];
    notes?: string | undefined;
    completedDate?: string | undefined;
}, {
    id: string;
    status: "completed" | "not_started" | "in_progress" | "needs_review";
    name: string;
    phase: string;
    priority: "critical" | "high" | "medium" | "low";
    subtopics: string[];
    notes?: string | undefined;
    completedDate?: string | undefined;
}>;
export declare const ProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    phase: z.ZodString;
    description: z.ZodString;
    milestones: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        completed: z.ZodBoolean;
        completedDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        completed: boolean;
        completedDate?: string | undefined;
    }, {
        id: string;
        description: string;
        completed: boolean;
        completedDate?: string | undefined;
    }>, "many">;
    status: z.ZodEnum<["not_started", "in_progress", "completed"]>;
    githubRepo: z.ZodOptional<z.ZodString>;
    startedDate: z.ZodOptional<z.ZodString>;
    completedDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    status: "completed" | "not_started" | "in_progress";
    name: string;
    phase: string;
    milestones: {
        id: string;
        description: string;
        completed: boolean;
        completedDate?: string | undefined;
    }[];
    completedDate?: string | undefined;
    githubRepo?: string | undefined;
    startedDate?: string | undefined;
}, {
    id: string;
    description: string;
    status: "completed" | "not_started" | "in_progress";
    name: string;
    phase: string;
    milestones: {
        id: string;
        description: string;
        completed: boolean;
        completedDate?: string | undefined;
    }[];
    completedDate?: string | undefined;
    githubRepo?: string | undefined;
    startedDate?: string | undefined;
}>;
export declare const PhaseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    monthRange: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    description: z.ZodString;
    topics: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        phase: z.ZodString;
        priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
        subtopics: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEnum<["not_started", "in_progress", "completed", "needs_review"]>;
        completedDate: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        status: "completed" | "not_started" | "in_progress" | "needs_review";
        name: string;
        phase: string;
        priority: "critical" | "high" | "medium" | "low";
        subtopics: string[];
        notes?: string | undefined;
        completedDate?: string | undefined;
    }, {
        id: string;
        status: "completed" | "not_started" | "in_progress" | "needs_review";
        name: string;
        phase: string;
        priority: "critical" | "high" | "medium" | "low";
        subtopics: string[];
        notes?: string | undefined;
        completedDate?: string | undefined;
    }>, "many">;
    deliverables: z.ZodArray<z.ZodString, "many">;
    projects: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        phase: z.ZodString;
        description: z.ZodString;
        milestones: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            description: z.ZodString;
            completed: z.ZodBoolean;
            completedDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            completed: boolean;
            completedDate?: string | undefined;
        }, {
            id: string;
            description: string;
            completed: boolean;
            completedDate?: string | undefined;
        }>, "many">;
        status: z.ZodEnum<["not_started", "in_progress", "completed"]>;
        githubRepo: z.ZodOptional<z.ZodString>;
        startedDate: z.ZodOptional<z.ZodString>;
        completedDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        status: "completed" | "not_started" | "in_progress";
        name: string;
        phase: string;
        milestones: {
            id: string;
            description: string;
            completed: boolean;
            completedDate?: string | undefined;
        }[];
        completedDate?: string | undefined;
        githubRepo?: string | undefined;
        startedDate?: string | undefined;
    }, {
        id: string;
        description: string;
        status: "completed" | "not_started" | "in_progress";
        name: string;
        phase: string;
        milestones: {
            id: string;
            description: string;
            completed: boolean;
            completedDate?: string | undefined;
        }[];
        completedDate?: string | undefined;
        githubRepo?: string | undefined;
        startedDate?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    name: string;
    monthRange: [number, number];
    topics: {
        id: string;
        status: "completed" | "not_started" | "in_progress" | "needs_review";
        name: string;
        phase: string;
        priority: "critical" | "high" | "medium" | "low";
        subtopics: string[];
        notes?: string | undefined;
        completedDate?: string | undefined;
    }[];
    deliverables: string[];
    projects: {
        id: string;
        description: string;
        status: "completed" | "not_started" | "in_progress";
        name: string;
        phase: string;
        milestones: {
            id: string;
            description: string;
            completed: boolean;
            completedDate?: string | undefined;
        }[];
        completedDate?: string | undefined;
        githubRepo?: string | undefined;
        startedDate?: string | undefined;
    }[];
}, {
    id: string;
    description: string;
    name: string;
    monthRange: [number, number];
    topics: {
        id: string;
        status: "completed" | "not_started" | "in_progress" | "needs_review";
        name: string;
        phase: string;
        priority: "critical" | "high" | "medium" | "low";
        subtopics: string[];
        notes?: string | undefined;
        completedDate?: string | undefined;
    }[];
    deliverables: string[];
    projects: {
        id: string;
        description: string;
        status: "completed" | "not_started" | "in_progress";
        name: string;
        phase: string;
        milestones: {
            id: string;
            description: string;
            completed: boolean;
            completedDate?: string | undefined;
        }[];
        completedDate?: string | undefined;
        githubRepo?: string | undefined;
        startedDate?: string | undefined;
    }[];
}>;
export declare const ReadingListItemSchema: z.ZodObject<{
    title: z.ZodString;
    authors: z.ZodString;
    phase: z.ZodString;
    priority: z.ZodNumber;
    url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phase: string;
    priority: number;
    title: string;
    authors: string;
    url?: string | undefined;
}, {
    phase: string;
    priority: number;
    title: string;
    authors: string;
    url?: string | undefined;
}>;
export declare const PlanMetaSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodString;
    created: z.ZodString;
    target: z.ZodOptional<z.ZodString>;
    timeframe_months: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    created: string;
    target?: string | undefined;
    timeframe_months?: number | undefined;
}, {
    name: string;
    version: string;
    created: string;
    target?: string | undefined;
    timeframe_months?: number | undefined;
}>;
export declare const ScheduleConfigSchema: z.ZodObject<{
    weekday_hours: z.ZodNumber;
    weekend_hours: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    weekday_hours: number;
    weekend_hours: number;
}, {
    weekday_hours: number;
    weekend_hours: number;
}>;
export declare const StudyPlanSchema: z.ZodObject<{
    meta: z.ZodObject<{
        name: z.ZodString;
        version: z.ZodString;
        created: z.ZodString;
        target: z.ZodOptional<z.ZodString>;
        timeframe_months: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        version: string;
        created: string;
        target?: string | undefined;
        timeframe_months?: number | undefined;
    }, {
        name: string;
        version: string;
        created: string;
        target?: string | undefined;
        timeframe_months?: number | undefined;
    }>;
    phases: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        monthRange: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        description: z.ZodString;
        topics: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            phase: z.ZodString;
            priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
            subtopics: z.ZodArray<z.ZodString, "many">;
            status: z.ZodEnum<["not_started", "in_progress", "completed", "needs_review"]>;
            completedDate: z.ZodOptional<z.ZodString>;
            notes: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            status: "completed" | "not_started" | "in_progress" | "needs_review";
            name: string;
            phase: string;
            priority: "critical" | "high" | "medium" | "low";
            subtopics: string[];
            notes?: string | undefined;
            completedDate?: string | undefined;
        }, {
            id: string;
            status: "completed" | "not_started" | "in_progress" | "needs_review";
            name: string;
            phase: string;
            priority: "critical" | "high" | "medium" | "low";
            subtopics: string[];
            notes?: string | undefined;
            completedDate?: string | undefined;
        }>, "many">;
        deliverables: z.ZodArray<z.ZodString, "many">;
        projects: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            phase: z.ZodString;
            description: z.ZodString;
            milestones: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                description: z.ZodString;
                completed: z.ZodBoolean;
                completedDate: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }, {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }>, "many">;
            status: z.ZodEnum<["not_started", "in_progress", "completed"]>;
            githubRepo: z.ZodOptional<z.ZodString>;
            startedDate: z.ZodOptional<z.ZodString>;
            completedDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            status: "completed" | "not_started" | "in_progress";
            name: string;
            phase: string;
            milestones: {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }[];
            completedDate?: string | undefined;
            githubRepo?: string | undefined;
            startedDate?: string | undefined;
        }, {
            id: string;
            description: string;
            status: "completed" | "not_started" | "in_progress";
            name: string;
            phase: string;
            milestones: {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }[];
            completedDate?: string | undefined;
            githubRepo?: string | undefined;
            startedDate?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        monthRange: [number, number];
        topics: {
            id: string;
            status: "completed" | "not_started" | "in_progress" | "needs_review";
            name: string;
            phase: string;
            priority: "critical" | "high" | "medium" | "low";
            subtopics: string[];
            notes?: string | undefined;
            completedDate?: string | undefined;
        }[];
        deliverables: string[];
        projects: {
            id: string;
            description: string;
            status: "completed" | "not_started" | "in_progress";
            name: string;
            phase: string;
            milestones: {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }[];
            completedDate?: string | undefined;
            githubRepo?: string | undefined;
            startedDate?: string | undefined;
        }[];
    }, {
        id: string;
        description: string;
        name: string;
        monthRange: [number, number];
        topics: {
            id: string;
            status: "completed" | "not_started" | "in_progress" | "needs_review";
            name: string;
            phase: string;
            priority: "critical" | "high" | "medium" | "low";
            subtopics: string[];
            notes?: string | undefined;
            completedDate?: string | undefined;
        }[];
        deliverables: string[];
        projects: {
            id: string;
            description: string;
            status: "completed" | "not_started" | "in_progress";
            name: string;
            phase: string;
            milestones: {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }[];
            completedDate?: string | undefined;
            githubRepo?: string | undefined;
            startedDate?: string | undefined;
        }[];
    }>, "many">;
    reading_list: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        authors: z.ZodString;
        phase: z.ZodString;
        priority: z.ZodNumber;
        url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        phase: string;
        priority: number;
        title: string;
        authors: string;
        url?: string | undefined;
    }, {
        phase: string;
        priority: number;
        title: string;
        authors: string;
        url?: string | undefined;
    }>, "many">>;
    schedule_config: z.ZodOptional<z.ZodObject<{
        weekday_hours: z.ZodNumber;
        weekend_hours: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        weekday_hours: number;
        weekend_hours: number;
    }, {
        weekday_hours: number;
        weekend_hours: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    meta: {
        name: string;
        version: string;
        created: string;
        target?: string | undefined;
        timeframe_months?: number | undefined;
    };
    phases: {
        id: string;
        description: string;
        name: string;
        monthRange: [number, number];
        topics: {
            id: string;
            status: "completed" | "not_started" | "in_progress" | "needs_review";
            name: string;
            phase: string;
            priority: "critical" | "high" | "medium" | "low";
            subtopics: string[];
            notes?: string | undefined;
            completedDate?: string | undefined;
        }[];
        deliverables: string[];
        projects: {
            id: string;
            description: string;
            status: "completed" | "not_started" | "in_progress";
            name: string;
            phase: string;
            milestones: {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }[];
            completedDate?: string | undefined;
            githubRepo?: string | undefined;
            startedDate?: string | undefined;
        }[];
    }[];
    reading_list?: {
        phase: string;
        priority: number;
        title: string;
        authors: string;
        url?: string | undefined;
    }[] | undefined;
    schedule_config?: {
        weekday_hours: number;
        weekend_hours: number;
    } | undefined;
}, {
    meta: {
        name: string;
        version: string;
        created: string;
        target?: string | undefined;
        timeframe_months?: number | undefined;
    };
    phases: {
        id: string;
        description: string;
        name: string;
        monthRange: [number, number];
        topics: {
            id: string;
            status: "completed" | "not_started" | "in_progress" | "needs_review";
            name: string;
            phase: string;
            priority: "critical" | "high" | "medium" | "low";
            subtopics: string[];
            notes?: string | undefined;
            completedDate?: string | undefined;
        }[];
        deliverables: string[];
        projects: {
            id: string;
            description: string;
            status: "completed" | "not_started" | "in_progress";
            name: string;
            phase: string;
            milestones: {
                id: string;
                description: string;
                completed: boolean;
                completedDate?: string | undefined;
            }[];
            completedDate?: string | undefined;
            githubRepo?: string | undefined;
            startedDate?: string | undefined;
        }[];
    }[];
    reading_list?: {
        phase: string;
        priority: number;
        title: string;
        authors: string;
        url?: string | undefined;
    }[] | undefined;
    schedule_config?: {
        weekday_hours: number;
        weekend_hours: number;
    } | undefined;
}>;
export type StudyPlanJSON = z.infer<typeof StudyPlanSchema>;
export type PhaseJSON = z.infer<typeof PhaseSchema>;
export type TopicJSON = z.infer<typeof TopicSchema>;
export type ProjectJSON = z.infer<typeof ProjectSchema>;
export type MilestoneJSON = z.infer<typeof MilestoneSchema>;
export type ReadingListItemJSON = z.infer<typeof ReadingListItemSchema>;
export declare const MentorGuidanceSchema: z.ZodObject<{
    projectId: z.ZodString;
    currentMilestone: z.ZodString;
    guidance: z.ZodString;
    resources: z.ZodArray<z.ZodString, "many">;
    commonMistakes: z.ZodArray<z.ZodString, "many">;
    nextSteps: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    currentMilestone: string;
    guidance: string;
    resources: string[];
    commonMistakes: string[];
    nextSteps: string[];
}, {
    projectId: string;
    currentMilestone: string;
    guidance: string;
    resources: string[];
    commonMistakes: string[];
    nextSteps: string[];
}>;
export declare const MentorKnowledgeSchema: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodObject<{
    projectId: z.ZodString;
    currentMilestone: z.ZodString;
    guidance: z.ZodString;
    resources: z.ZodArray<z.ZodString, "many">;
    commonMistakes: z.ZodArray<z.ZodString, "many">;
    nextSteps: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    currentMilestone: string;
    guidance: string;
    resources: string[];
    commonMistakes: string[];
    nextSteps: string[];
}, {
    projectId: string;
    currentMilestone: string;
    guidance: string;
    resources: string[];
    commonMistakes: string[];
    nextSteps: string[];
}>>>;
export type MentorKnowledgeJSON = z.infer<typeof MentorKnowledgeSchema>;
export declare const ResearcherSchema: z.ZodObject<{
    name: z.ZodString;
    focus: z.ZodString;
    lab: z.ZodString;
    arxiv_query: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    focus: string;
    lab: string;
    arxiv_query?: string | undefined;
}, {
    name: string;
    focus: string;
    lab: string;
    arxiv_query?: string | undefined;
}>;
export declare const ResearcherConfigSchema: z.ZodObject<{
    researchers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        focus: z.ZodString;
        lab: z.ZodString;
        arxiv_query: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        focus: string;
        lab: string;
        arxiv_query?: string | undefined;
    }, {
        name: string;
        focus: string;
        lab: string;
        arxiv_query?: string | undefined;
    }>, "many">;
    search_recommendations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        area: z.ZodString;
        queries: z.ZodArray<z.ZodString, "many">;
        why: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        area: string;
        queries: string[];
        why: string;
    }, {
        area: string;
        queries: string[];
        why: string;
    }>, "many">>;
    suggested_arxiv_queries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    researchers: {
        name: string;
        focus: string;
        lab: string;
        arxiv_query?: string | undefined;
    }[];
    search_recommendations?: {
        area: string;
        queries: string[];
        why: string;
    }[] | undefined;
    suggested_arxiv_queries?: string[] | undefined;
}, {
    researchers: {
        name: string;
        focus: string;
        lab: string;
        arxiv_query?: string | undefined;
    }[];
    search_recommendations?: {
        area: string;
        queries: string[];
        why: string;
    }[] | undefined;
    suggested_arxiv_queries?: string[] | undefined;
}>;
export type ResearcherConfigJSON = z.infer<typeof ResearcherConfigSchema>;
//# sourceMappingURL=plan-schema.d.ts.map