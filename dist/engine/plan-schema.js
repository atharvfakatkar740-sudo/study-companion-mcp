import { z } from "zod";
// ============================================
// Zod validation schemas for study plan JSON
// ============================================
export const MilestoneSchema = z.object({
    id: z.string(),
    description: z.string(),
    completed: z.boolean(),
    completedDate: z.string().optional(),
});
export const TopicSchema = z.object({
    id: z.string(),
    name: z.string(),
    phase: z.string(),
    priority: z.enum(["critical", "high", "medium", "low"]),
    subtopics: z.array(z.string()),
    status: z.enum(["not_started", "in_progress", "completed", "needs_review"]),
    completedDate: z.string().optional(),
    notes: z.string().optional(),
});
export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    phase: z.string(),
    description: z.string(),
    milestones: z.array(MilestoneSchema),
    status: z.enum(["not_started", "in_progress", "completed"]),
    githubRepo: z.string().optional(),
    startedDate: z.string().optional(),
    completedDate: z.string().optional(),
});
export const PhaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    monthRange: z.tuple([z.number(), z.number()]),
    description: z.string(),
    topics: z.array(TopicSchema),
    deliverables: z.array(z.string()),
    projects: z.array(ProjectSchema),
});
export const ReadingListItemSchema = z.object({
    title: z.string(),
    authors: z.string(),
    phase: z.string(),
    priority: z.number(),
    url: z.string().optional(),
});
export const PlanMetaSchema = z.object({
    name: z.string(),
    version: z.string(),
    created: z.string(),
    target: z.string().optional(),
    timeframe_months: z.number().optional(),
});
export const ScheduleConfigSchema = z.object({
    weekday_hours: z.number(),
    weekend_hours: z.number(),
});
export const StudyPlanSchema = z.object({
    meta: PlanMetaSchema,
    phases: z.array(PhaseSchema),
    reading_list: z.array(ReadingListItemSchema).optional(),
    schedule_config: ScheduleConfigSchema.optional(),
});
// Mentor knowledge schema
export const MentorGuidanceSchema = z.object({
    projectId: z.string(),
    currentMilestone: z.string(),
    guidance: z.string(),
    resources: z.array(z.string()),
    commonMistakes: z.array(z.string()),
    nextSteps: z.array(z.string()),
});
export const MentorKnowledgeSchema = z.record(z.string(), z.record(z.string(), MentorGuidanceSchema));
// Researcher config schema
export const ResearcherSchema = z.object({
    name: z.string(),
    focus: z.string(),
    lab: z.string(),
    arxiv_query: z.string().optional(),
});
export const ResearcherConfigSchema = z.object({
    researchers: z.array(ResearcherSchema),
    search_recommendations: z.array(z.object({
        area: z.string(),
        queries: z.array(z.string()),
        why: z.string(),
    })).optional(),
    suggested_arxiv_queries: z.array(z.string()).optional(),
});
//# sourceMappingURL=plan-schema.js.map