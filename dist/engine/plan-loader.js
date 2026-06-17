import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { StudyPlanSchema, MentorKnowledgeSchema, ResearcherConfigSchema } from "./plan-schema.js";
// ============================================
// Plan Engine — Singleton loader for study plan
// ============================================
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const PLAN_HISTORY_DIR = join(DATA_DIR, "plan-history");
function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
// --- Cached state ---
let cachedPlan = null;
let cachedPhases = null;
let cachedMentorKnowledge = null;
let cachedResearchers = null;
// --- Plan Loading ---
function getPlanPath() {
    return join(DATA_DIR, "study-plan.json");
}
function loadPlanFromDisk() {
    const planPath = getPlanPath();
    if (!existsSync(planPath)) {
        throw new Error(`Study plan not found at ${planPath}. Create a data/study-plan.json file.`);
    }
    const raw = readFileSync(planPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = StudyPlanSchema.safeParse(parsed);
    if (!result.success) {
        const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
        throw new Error(`Study plan validation failed:\n${issues}`);
    }
    return result.data;
}
function phaseJSONToPhase(p) {
    return {
        id: p.id,
        name: p.name,
        monthRange: p.monthRange,
        description: p.description,
        topics: p.topics.map((t) => ({
            id: t.id,
            name: t.name,
            phase: t.phase,
            priority: t.priority,
            subtopics: t.subtopics,
            status: t.status,
        })),
        deliverables: p.deliverables,
        projects: p.projects.map((pr) => ({
            id: pr.id,
            name: pr.name,
            phase: pr.phase,
            description: pr.description,
            milestones: pr.milestones.map((m) => ({
                id: m.id,
                description: m.description,
                completed: m.completed,
            })),
            status: pr.status,
        })),
    };
}
// --- Public API ---
export function getStudyPlan() {
    if (!cachedPlan) {
        cachedPlan = loadPlanFromDisk();
    }
    return cachedPlan;
}
export function getStudyPhases() {
    if (!cachedPhases) {
        const plan = getStudyPlan();
        cachedPhases = plan.phases.map(phaseJSONToPhase);
    }
    return cachedPhases;
}
export function getPapersReadingList() {
    return getStudyPlan().reading_list || [];
}
export function getPlanMeta() {
    return getStudyPlan().meta;
}
// --- Mentor Knowledge ---
function getMentorKnowledgePath() {
    return join(DATA_DIR, "mentor-knowledge.json");
}
export function getMentorKnowledge() {
    if (!cachedMentorKnowledge) {
        const path = getMentorKnowledgePath();
        if (!existsSync(path)) {
            cachedMentorKnowledge = {};
            return cachedMentorKnowledge;
        }
        const raw = readFileSync(path, "utf-8");
        const parsed = JSON.parse(raw);
        const result = MentorKnowledgeSchema.safeParse(parsed);
        if (!result.success) {
            console.error("Mentor knowledge validation warning:", result.error.issues);
            cachedMentorKnowledge = parsed; // Use unvalidated as fallback
        }
        else {
            cachedMentorKnowledge = result.data;
        }
    }
    return cachedMentorKnowledge;
}
export function saveMentorGuidance(projectId, milestoneId, guidance) {
    const knowledge = getMentorKnowledge();
    if (!knowledge[projectId])
        knowledge[projectId] = {};
    knowledge[projectId][milestoneId] = guidance;
    writeFileSync(getMentorKnowledgePath(), JSON.stringify(knowledge, null, 2), "utf-8");
    cachedMentorKnowledge = knowledge;
}
// --- Researcher Config ---
function getResearcherConfigPath() {
    return join(DATA_DIR, "researchers.json");
}
export function getResearcherConfig() {
    if (!cachedResearchers) {
        const path = getResearcherConfigPath();
        if (!existsSync(path)) {
            cachedResearchers = { researchers: [], search_recommendations: [], suggested_arxiv_queries: [] };
            return cachedResearchers;
        }
        const raw = readFileSync(path, "utf-8");
        const parsed = JSON.parse(raw);
        const result = ResearcherConfigSchema.safeParse(parsed);
        if (!result.success) {
            console.error("Researcher config validation warning:", result.error.issues);
            cachedResearchers = parsed;
        }
        else {
            cachedResearchers = result.data;
        }
    }
    return cachedResearchers;
}
// --- Plan Mutation ---
export function savePlan(plan) {
    const result = StudyPlanSchema.safeParse(plan);
    if (!result.success) {
        const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
        throw new Error(`Cannot save invalid plan:\n${issues}`);
    }
    writeFileSync(getPlanPath(), JSON.stringify(result.data, null, 2), "utf-8");
    cachedPlan = result.data;
    cachedPhases = null; // Invalidate phase cache
}
export function snapshotPlan(label) {
    ensureDir(PLAN_HISTORY_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = label ? `${timestamp}_${label}.json` : `${timestamp}.json`;
    const dest = join(PLAN_HISTORY_DIR, filename);
    copyFileSync(getPlanPath(), dest);
    return filename;
}
export function getPlanHistory() {
    ensureDir(PLAN_HISTORY_DIR);
    return readdirSync(PLAN_HISTORY_DIR)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse();
}
export function reloadPlan() {
    cachedPlan = null;
    cachedPhases = null;
    cachedMentorKnowledge = null;
    cachedResearchers = null;
}
// --- Phase Helpers ---
export function getCurrentPhaseFromPlan(startDate, now = new Date()) {
    const phases = getStudyPhases();
    const start = new Date(startDate);
    const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    for (const phase of phases) {
        if (monthsElapsed >= phase.monthRange[0] && monthsElapsed <= phase.monthRange[1]) {
            return phase.id;
        }
    }
    return phases[phases.length - 1].id;
}
export function findPhaseById(phaseId) {
    return getStudyPhases().find((p) => p.id === phaseId);
}
export function getAllTopics() {
    return getStudyPhases().flatMap((p) => p.topics);
}
export function getAllProjects() {
    return getStudyPhases().flatMap((p) => p.projects);
}
//# sourceMappingURL=plan-loader.js.map