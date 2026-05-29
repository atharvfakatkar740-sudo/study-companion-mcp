# Study Companion MCP — Dynamic vs Static Study Plan Architecture

> **Core question**: Should the system accept study plans dynamically (via JSON/YAML data files) or remain hardcoded for maximum specialization?

---

## Current Coupling Analysis

### Tightly Coupled to the Study Plan (6 files)

| File | What's hardcoded | Severity |
|------|-----------------|----------|
| `src/data/study-plan.ts` | ALL phases, topics, projects, milestones, reading list as TypeScript constants | 🔴 **Total** — the entire data model is compiled in |
| `src/data/schedule.ts` | Phase IDs in `getCurrentPhaseId()`, weekday 3hr / weekend 8-10hr block structure | 🔴 **Total** — timing logic baked into code |
| `src/tools/mentor.ts` | `PROJECT_GUIDANCE` object with per-milestone advice for VAE/GNN projects specifically | 🟠 **Heavy** — ~150 lines of domain-specific mentoring knowledge |
| `src/tools/agents.ts` | Key researchers (Lotfollahi, Theis, Tang, Bronstein), research scout focus areas | 🟡 **Medium** — researcher names + lab directions embedded |
| `src/tools/integrations.ts` | `fetchLotfollahiPapers()` — a function dedicated to one researcher | 🟡 **Medium** — single function hardcoded |
| `src/tools/analytics.ts` | Imports `STUDY_PHASES` for predicted completion calculations | 🟢 **Light** — only uses phase structure, not content |

### Already Generic (11 files — no changes needed)

| File | Why it's generic |
|------|-----------------|
| `src/utils/types.ts` | Interfaces are abstract: `Phase`, `Topic`, `Project`, `Milestone` work for ANY plan |
| `src/tools/revision.ts` | SRS engine operates on topic+concept strings — completely plan-agnostic |
| `src/tools/memory.ts` | Knowledge base stores arbitrary insights — plan-agnostic |
| `src/tools/research.ts` | Paper management is generic (except pre-loaded reading list in study-plan.ts) |
| `src/tools/chat.ts` | RAG chat works with any knowledge base content |
| `src/tools/vectordb.ts` | ChromaDB integration is content-agnostic |
| `src/tools/ollama.ts` | LLM wrapper has no plan knowledge |
| `src/tools/notifications.ts` | Push notifications are generic |
| `src/tools/collab.ts` | Progress export/import is structure-agnostic |
| `src/tools/calendar.ts` | Calendar events are generic |
| `src/tools/gcal-sync.ts` | OAuth + event creation are generic |

### Verdict: ~65% of the system is already generic. The coupling is concentrated in 3 key areas:
1. **Data definition** (`study-plan.ts`)
2. **Timing logic** (`schedule.ts`)
3. **Domain mentoring** (`mentor.ts` + `agents.ts`)

---

## Three Architecture Options

---

## Option A: Fully Dynamic (JSON-Driven Study Plan)

### How it works
- Study plan defined as `data/study-plan.json` (not `.ts`)
- User provides/edits the JSON file directly, or via a `load_study_plan` tool
- System reads the plan at runtime, no recompilation needed
- Mentor guidance loaded from `data/mentor-guidance.json`
- Key researchers defined in `data/researchers.json`

### Required Changes

```
DELETED:
  src/data/study-plan.ts          → replaced by data/study-plan.json

MODIFIED:
  src/data/schedule.ts            → reads phase timing from JSON, no hardcoded IDs
  src/tools/planner.ts            → loads from JSON instead of importing constant
  src/tools/mentor.ts             → loads guidance from JSON, falls back to LLM
  src/tools/agents.ts             → loads researcher list from JSON config
  src/tools/integrations.ts       → generic `fetch_researcher_papers(name)` instead of hardcoded function
  src/tools/analytics.ts          → reads phases from loaded plan
  src/index.ts                    → register dynamic tool: load_study_plan, update_study_plan

NEW:
  data/study-plan.json            → the plan data
  data/mentor-guidance.json       → per-project mentoring advice
  data/researchers.json           → tracked researchers + focus areas
  src/tools/plan-manager.ts       → tools for loading/updating/validating plans
```

### New Tools

| Tool | Description |
|------|-------------|
| `load_study_plan` | Load a study plan from JSON file or raw text (auto-parse) |
| `update_study_plan` | Modify phases, topics, or projects in the active plan |
| `validate_study_plan` | Check plan for structural issues (missing IDs, circular deps) |
| `get_plan_schema` | Return the JSON schema so user can craft their own plan |
| `import_plan_from_markdown` | Parse a markdown study plan (like yours) into structured JSON via LLM |
| `switch_plan` | Switch between multiple saved plans |
| `plan_diff` | Show what changed between two plan versions |

### Advantages

| # | Advantage | Impact |
|---|-----------|--------|
| 1 | **No rebuild needed** — change plan, restart server, done | Huge for iteration speed |
| 2 | **Multi-plan support** — switch between plans (e.g., "ML Foundations" vs "Interview Prep") | Flexibility |
| 3 | **User-editable** — no TypeScript knowledge required to modify | Lower barrier |
| 4 | **Shareable** — send plan JSON to a study partner, they can use the same MCP | Community |
| 5 | **LLM-generated plans** — ask Astra to generate a plan, load it directly | AI integration |
| 6 | **Version control** — track plan evolution over time in git | Accountability |
| 7 | **Partial updates** — add one new topic without touching the rest | Granularity |

### Disadvantages

| # | Disadvantage | Impact |
|---|--------------|--------|
| 1 | **Loss of compile-time safety** — typos in JSON won't be caught until runtime | Risk of silent bugs |
| 2 | **Mentor guidance becomes shallow** — can't pre-write 150 lines of expert advice per milestone in JSON easily | Quality drop |
| 3 | **Schema drift** — JSON can become inconsistent without validation | Maintenance burden |
| 4 | **Less specialized** — system becomes "generic study tracker" instead of "Lotfollahi lab accelerator" | Identity dilution |
| 5 | **Colder start** — new plan has no mentoring knowledge until populated | Worse initial experience |
| 6 | **Validation complexity** — must validate IDs, cross-references, phase timing at runtime | More error-prone |

---

## Option B: Fully Static (Current Approach, Enhanced)

### How it works
- Keep everything in TypeScript constants
- Each plan update requires editing `.ts` files + `npm run build`
- Maximize the specialization: more hardcoded guidance, more domain-specific logic
- Add more Lotfollahi-specific intelligence

### Required Changes
- None structural — just add more content to existing files
- For plan updates: manually edit `study-plan.ts`, rebuild

### Advantages

| # | Advantage | Impact |
|---|-----------|--------|
| 1 | **Maximum specialization** — every tool can reference domain-specific knowledge | Best mentoring quality |
| 2 | **Type safety** — TypeScript catches errors at compile time | Zero runtime plan errors |
| 3 | **Deep mentoring** — can embed 150+ lines of expert advice per milestone | Unmatched guidance |
| 4 | **Performance** — no file parsing at runtime, constants are instant | Negligible but clean |
| 5 | **Simpler code** — no schema validation, no plan loading, no migration logic | Less maintenance |
| 6 | **Focused identity** — "This tool exists to get Atharv into the Lotfollahi lab" | Motivating clarity |

### Disadvantages

| # | Disadvantage | Impact |
|---|--------------|--------|
| 1 | **Requires rebuild** — any plan change needs `npm run build` | Friction for iteration |
| 2 | **Not shareable** — another person can't use this without forking + rewriting | No community value |
| 3 | **Monolithic plan** — adding a new phase means editing a 400-line file | Cumbersome for large changes |
| 4 | **Stale mentoring** — if you deviate from the plan, guidance becomes irrelevant | Rigidity |
| 5 | **Single plan only** — can't switch contexts (e.g., job interview prep) | Inflexible |
| 6 | **LLM can't update it** — Astra can't modify your plan for you | Missed AI leverage |

---

## Option C: Hybrid Architecture (RECOMMENDED)

### How it works

**Data layer**: Study plan lives in JSON (dynamic, editable, loadable)  
**Intelligence layer**: Domain-specific mentoring powered by LLM + curated knowledge base (dynamic but deep)  
**Code layer**: Generic algorithms that operate on any valid plan structure (static, robust)

```
┌─────────────────────────────────────────────────────┐
│                   MCP TOOLS LAYER                     │
│  (planner, revision, research, mentor, analytics)    │
│  ───────── ALL GENERIC, plan-agnostic ──────────     │
└────────────────────────┬────────────────────────────┘
                         │ reads
┌────────────────────────▼────────────────────────────┐
│               PLAN ENGINE (new)                       │
│  • Loads plan from JSON                              │
│  • Validates structure                               │
│  • Resolves phase timing                             │
│  • Provides typed access to current plan             │
└────────────────────────┬────────────────────────────┘
                         │ reads
┌────────────────────────▼────────────────────────────┐
│            DATA LAYER (JSON files)                    │
│  data/                                               │
│  ├── study-plan.json        ← THE plan (editable)   │
│  ├── mentor-knowledge.json  ← curated guidance       │
│  ├── researchers.json       ← tracked researchers    │
│  └── plan-history/          ← version snapshots      │
└─────────────────────────────────────────────────────┘
                         +
┌─────────────────────────────────────────────────────┐
│          LLM INTELLIGENCE LAYER (Ollama)             │
│  • Generates mentoring advice when curated is empty  │
│  • Parses markdown plans into structured JSON        │
│  • Suggests plan updates based on progress           │
│  • Provides domain expertise dynamically             │
└─────────────────────────────────────────────────────┘
```

### The Key Insight

**Specialization doesn't require hardcoding.**

Currently, specialization = hardcoded TypeScript constants.  
With the hybrid approach: specialization = **rich JSON data + LLM context**.

The mentoring quality doesn't drop because:
1. Your curated guidance moves to `mentor-knowledge.json` (same content, just JSON format)
2. When curated guidance doesn't exist, the LLM fills the gap using your knowledge base as context
3. As you study, new guidance is generated and **cached** — the system gets smarter over time

### How Plan Updates Work

```
User provides new/updated study plan (markdown, JSON, or natural language)
         │
         ▼
┌─────────────────────────────────┐
│  import_plan / update_plan tool  │
│  1. LLM parses into structure    │
│  2. Validates against schema     │
│  3. Merges with existing state   │
│     (preserves progress!)        │
│  4. Saves to study-plan.json     │
│  5. Snapshots old plan to        │
│     plan-history/                │
└─────────────────────────────────┘
         │
         ▼
  System immediately uses new plan
  No rebuild. No restart. Hot-reload.
```

### What Happens to Your Current Plan?

Your Lotfollahi-focused plan becomes the **initial data seed**:

```json
// data/study-plan.json (converted from current study-plan.ts)
{
  "meta": {
    "name": "Lotfollahi Lab Research Path",
    "version": "1.0",
    "created": "2025-05-29",
    "target": "Computational biology researcher at Wellcome Sanger",
    "timeframe_months": 24
  },
  "phases": [ /* exactly what's in study-plan.ts now */ ],
  "reading_list": [ /* papers */ ],
  "researchers": [
    { "name": "Mohammad Lotfollahi", "lab": "Wellcome Sanger", "focus": [...] }
  ],
  "schedule_config": {
    "weekday_hours": 3,
    "weekend_hours": 10,
    "blocks": { /* current block structure */ }
  }
}
```

```json
// data/mentor-knowledge.json (converted from current mentor.ts PROJECT_GUIDANCE)
{
  "vae-from-scratch": {
    "vae-1": {
      "guidance": "Start with a simple deterministic autoencoder...",
      "resources": [...],
      "commonMistakes": [...],
      "nextSteps": [...]
    }
  }
}
```

**Nothing is lost. Everything is preserved. But now it's editable.**

### Required Changes

```
NEW FILES:
  src/engine/plan-loader.ts       — Load, validate, cache the active plan
  src/engine/plan-schema.ts       — Zod schema for plan validation
  src/engine/plan-migrator.ts     — Handle plan version upgrades
  src/tools/plan-manager.ts       — Tools for loading/updating plans
  data/study-plan.json            — Converted from study-plan.ts
  data/mentor-knowledge.json      — Converted from mentor.ts guidance
  data/researchers.json           — Tracked researchers config
  data/plan-history/              — Snapshots of old plans

MODIFIED FILES:
  src/data/schedule.ts            — Read timing from loaded plan, not hardcoded
  src/tools/planner.ts            — Use plan-loader instead of importing constant
  src/tools/mentor.ts             — Load guidance from JSON + LLM fallback
  src/tools/agents.ts             — Load researchers from JSON
  src/tools/integrations.ts       — Generic researcher paper fetch
  src/tools/analytics.ts          — Use loaded plan for predictions

DELETED:
  src/data/study-plan.ts          — Replaced by data/study-plan.json
```

### New Tools (Plan Management)

| Tool | Description |
|------|-------------|
| `load_study_plan` | Load a new plan from JSON or markdown (LLM-parsed) |
| `update_phase` | Add/modify/remove a phase in the active plan |
| `update_topic` | Add/modify/remove a topic within a phase |
| `add_project` | Add a new project with milestones |
| `add_mentor_guidance` | Add curated mentoring advice for a milestone |
| `get_plan_schema` | Return the JSON schema for plan authoring |
| `plan_history` | View past plan versions and what changed |
| `rollback_plan` | Revert to a previous plan version |
| `suggest_plan_update` | LLM suggests modifications based on your progress |
| `export_plan` | Export current plan as markdown or JSON |

### Advantages (combines best of both)

| # | Advantage | Why it's the best of both worlds |
|---|-----------|----------------------------------|
| 1 | **Still specialized** — your Lotfollahi plan loads by default with full mentoring | Same quality as static |
| 2 | **Editable without rebuild** — change JSON, tools auto-reload | Same ease as dynamic |
| 3 | **LLM fills gaps** — new projects get AI-generated guidance automatically | Better than static (which has empty fallback) |
| 4 | **Progress preserved** — plan updates don't wipe your hours/streaks/completions | Critical for long-term use |
| 5 | **Validate on load** — Zod schema catches errors immediately with clear messages | Type safety without compilation |
| 6 | **Plan evolution tracking** — see how your plan changed over 18 months | Accountability + reflection |
| 7 | **Hot-swappable** — "I need interview prep for 2 weeks" → load alternate plan | Flexibility without losing main plan |
| 8 | **AI-updatable** — "Astra, add a new topic on diffusion models" → done | LLM integration |
| 9 | **Shareable** — export plan JSON, someone else can use it | Community value |
| 10 | **Mentor knowledge grows** — as LLM generates advice, it's cached for future use | Gets better over time |

### Disadvantages

| # | Disadvantage | Mitigation |
|---|--------------|------------|
| 1 | **More complex codebase** — plan-loader, schema, migrator are new modules | One-time engineering cost, ~300 lines total |
| 2 | **Runtime validation overhead** — plan checked on every load | Cache after first load; validate only on change |
| 3 | **Migration needed** — current study-plan.ts must be converted to JSON | One-time migration script (automated) |
| 4 | **Schema evolution** — if you add new fields, old plans need migration | Plan version field + migrator handles this |
| 5 | **LLM-generated guidance may be lower quality than hand-curated** | Cache good responses; curated JSON takes priority |

---

## Comparison Matrix

| Criterion | A (Dynamic) | B (Static) | C (Hybrid) |
|-----------|:-----------:|:----------:|:----------:|
| Specialization depth | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Flexibility to update | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Compile-time safety | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Mentor quality (day 1) | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Mentor quality (over time) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐+ |
| Engineering effort to build | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| LLM leverage | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Multi-plan support | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Shareability | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Progress preservation on update | ⭐⭐⭐ | N/A | ⭐⭐⭐⭐⭐ |
| Maintenance burden | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Recommendation: Option C (Hybrid)

### Why

1. **You WILL update your plan** — your study plan says "3-5 year mission." Plans change. New papers appear. Interests sharpen. The system must handle this gracefully.

2. **Specialization is data, not code** — Moving your expert mentoring knowledge from TypeScript to JSON doesn't make it less specialized. It makes it *editable* without being *generic*.

3. **LLM is the unlock** — The system already has Ollama. Using it to generate mentoring advice for new projects means you get expert guidance without hand-writing 150 lines per milestone.

4. **Progress must survive plan changes** — If you decide to add "diffusion models" to Phase 1, your 200 hours of study history shouldn't break. The hybrid approach explicitly handles this.

5. **The static approach has a hidden cost** — Every time you want to adjust timing, add a topic, or shift priorities, you're editing TypeScript and rebuilding. That friction will cause you to NOT update the plan when you should.

---

## Implementation Plan

### Phase 1: Data Migration (1-2 hours)
1. Convert `study-plan.ts` → `data/study-plan.json`
2. Convert `mentor.ts` PROJECT_GUIDANCE → `data/mentor-knowledge.json`
3. Create `data/researchers.json` from hardcoded lists in agents.ts

### Phase 2: Plan Engine (3-4 hours)
1. Create `src/engine/plan-loader.ts` — singleton that loads + caches active plan
2. Create `src/engine/plan-schema.ts` — Zod validation schema
3. Modify `schedule.ts` → read from plan-loader
4. Modify `planner.ts` → use plan-loader
5. Modify `mentor.ts` → load from JSON + LLM fallback
6. Modify `agents.ts` → load researchers from config
7. Modify `integrations.ts` → generic `fetch_researcher_papers`

### Phase 3: Plan Management Tools (2-3 hours)
1. Create `src/tools/plan-manager.ts` with load/update/validate/export tools
2. Add `import_plan_from_markdown` using Ollama to parse
3. Add plan versioning (auto-snapshot on changes)
4. Register new tools in `index.ts`

### Phase 4: LLM-Enhanced Mentoring (2-3 hours)
1. When mentor knowledge doesn't exist for a milestone → call Ollama
2. Cache generated guidance in `mentor-knowledge.json`
3. User can review + edit cached guidance
4. Add `add_mentor_guidance` tool for manual curation

### Total effort: ~10-12 hours of implementation

---

## What "Update the Plan" Looks Like After Implementation

### Scenario 1: Minor topic addition
```
User: "Add diffusion models as a new topic in Phase 1"
Tool call: update_topic → adds to study-plan.json
Result: Immediately available in daily plan, no rebuild
```

### Scenario 2: New project
```
User: "I want to add a scVI reproduction project to Phase 2"
Tool call: add_project → creates project with milestones
LLM: auto-generates initial mentor guidance based on paper
Result: Project appears in list, guidance available immediately
```

### Scenario 3: Completely new plan
```
User: "I'm switching focus to NLP for 2 months for job interviews"
Tool call: load_study_plan with new JSON
Result: Old plan archived, new plan active, progress for both tracked separately
Then: switch_plan back to original when ready
```

### Scenario 4: Plan evolution
```
User: "After reading the lab's latest paper, I want to add spatial transcriptomics earlier"
Tool call: update_phase → move topic from Phase 4 to Phase 2
Result: Topic available now, no progress lost on anything else
```

---

## Answer to Your Original Question

> Would this system be able to update itself if we were to provide a new study plan?

**Current state**: No. It requires editing TypeScript source code and rebuilding. A new plan means rewriting `study-plan.ts` (400 lines), updating `mentor.ts` guidance (150+ lines), changing researcher lists in `agents.ts`, and fixing phase IDs in `schedule.ts`. That's ~700+ lines of manual changes.

**After hybrid implementation**: Yes. You provide a JSON file or even raw markdown, and the system:
1. Parses it (via LLM if markdown)
2. Validates the structure
3. Preserves your existing progress
4. Archives the old plan
5. Loads the new plan immediately
6. Generates initial mentoring guidance via LLM
7. Starts operating on the new plan — zero rebuild, zero restart

**And it stays specialized** because the plan JSON can be as detailed and domain-specific as you want. The depth of mentoring isn't limited by the architecture — it's limited by the content you put in.
