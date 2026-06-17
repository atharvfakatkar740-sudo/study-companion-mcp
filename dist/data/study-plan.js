// ============================================
// Backward-compatible re-exports from the plan engine
// Data now lives in data/study-plan.json (editable without rebuild)
// ============================================
import { getStudyPhases, getPapersReadingList } from "../engine/plan-loader.js";
// Re-export as getter that loads from JSON
// Use these in any file that previously imported STUDY_PHASES directly
export function getPhases() {
    return getStudyPhases();
}
// Backward compatibility: STUDY_PHASES still works as a lazy-evaluated getter
// NOTE: This is now dynamically loaded from data/study-plan.json
export const STUDY_PHASES = new Proxy([], {
    get(target, prop, receiver) {
        const phases = getStudyPhases();
        if (prop === Symbol.iterator) {
            return function* () { yield* phases; };
        }
        return Reflect.get(phases, prop, receiver);
    },
});
export function getPapersReading() {
    return (getPapersReadingList() || []).map((p) => ({
        title: p.title,
        authors: p.authors,
        phase: p.phase,
        priority: p.priority,
        url: p.url,
    }));
}
// Backward compatibility alias
export const PAPERS_READING_LIST = new Proxy([], {
    get(target, prop, receiver) {
        const list = getPapersReading();
        if (prop === Symbol.iterator) {
            return function* () { yield* list; };
        }
        return Reflect.get(list, prop, receiver);
    },
});
//# sourceMappingURL=study-plan.js.map