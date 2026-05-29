# Study Companion MCP — Features & Update Roadmap

> **Goal**: Transform this from a study tracker into an **autonomous research apprenticeship system** that accelerates your path from software engineer → computational biology researcher at the Lotfollahi lab level.

---

## Current State: v2.0 (73 tools)

**What exists**: Planning, SRS, research tracking, memory, mentoring, vector search, analytics, GitHub/arXiv integration, multi-agent (code review, quiz, scout), calendar, Ollama chat (Astra), ChromaDB RAG, paper summarization, notifications, collaboration.

**Key gaps identified**:
1. No active learning enforcement (passive tracking only)
2. No concept dependency modeling (flat topic lists)
3. No code execution or experiment tracking
4. No adaptive difficulty based on performance
5. No deep research intelligence (citation graphs, gap detection)
6. No accountability mechanisms beyond streak counting
7. No portfolio automation (blog, README, social)
8. No domain-specific biology tooling
9. No multi-modal learning support (diagrams, equations, voice)
10. No time-series prediction on YOUR learning patterns

---

## v3.0 — Intelligent Learning Engine

**Theme**: Move from passive tracking to **active learning orchestration**.

### 3.0.1 — Concept Dependency Graph
| Tool | Description |
|------|-------------|
| `add_concept_dependency` | Define prerequisite relationships (e.g., "KL divergence" requires "probability distributions") |
| `get_learning_path` | Generate optimal learning order for a target concept |
| `visualize_knowledge_graph` | ASCII/Mermaid diagram of your knowledge state |
| `find_knowledge_gaps` | Detect missing prerequisites for your current phase topics |
| `suggest_next_concept` | AI-recommended next thing to learn based on graph + performance |

**Why**: Your study plan has implicit dependencies (you can't understand ELBO without KL divergence, can't do CPA without VAEs). Making these explicit lets the system guide you optimally.

### 3.0.2 — Adaptive Difficulty Engine
| Tool | Description |
|------|-------------|
| `assess_understanding` | Socratic assessment on a topic (multi-level questions) |
| `get_difficulty_profile` | Your current mastery level per topic (beginner/intermediate/advanced) |
| `generate_challenge` | Generate appropriately difficult problems based on your level |
| `update_mastery` | Auto-adjust mastery based on quiz/review performance |
| `struggle_detection` | Detect when you're stuck and suggest different approaches |

**Why**: SM-2 tracks retention but not depth. You might "remember" VAEs exist but not truly understand reparameterization. This measures actual understanding.

### 3.0.3 — Active Recall & Testing
| Tool | Description |
|------|-------------|
| `generate_derivation_quiz` | Generate "derive X from first principles" challenges |
| `implementation_challenge` | "Implement X without looking at references" tasks |
| `explain_like_im_5` | Force you to explain concepts simply (Feynman technique) |
| `compare_contrast` | Generate comparison questions (VAE vs AE, GCN vs GAT) |
| `weekly_comprehensive_test` | End-of-week assessment covering all topics studied |
| `export_anki_deck` | Export SRS items as Anki-compatible deck |

**Why**: Active recall is 3-5x more effective than passive review. Current quiz generation is basic; this makes it rigorous and multi-format.

### 3.0.4 — Interleaved Practice Scheduler
| Tool | Description |
|------|-------------|
| `get_interleaved_session` | Mix topics optimally (e.g., 40% current + 30% recent + 30% older) |
| `spacing_optimizer` | Compute optimal review intervals based on YOUR forgetting curves |
| `topic_rotation_plan` | Prevent over-focusing on one area at expense of others |

**Why**: Research shows interleaving beats blocked practice. Your plan says "1hr reading, 1hr implementation, 1hr math" — this makes that allocation data-driven.

---

## v3.1 — Research Intelligence System

**Theme**: Become a **research-aware system** that understands the scientific landscape.

### 3.1.1 — Citation Graph & Paper Intelligence
| Tool | Description |
|------|-------------|
| `build_citation_graph` | Map relationships between papers in your queue (cites/cited-by) |
| `find_bridge_papers` | Find papers connecting two topics (e.g., VAEs → spatial genomics) |
| `track_paper_lineage` | Show evolution: scGen → trVAE → CPA → chemCPA |
| `get_paper_impact_score` | Estimate paper importance based on citations + recency |
| `discover_related_papers` | Semantic search across arXiv/Semantic Scholar for related work |
| `conference_deadline_tracker` | Track NeurIPS, ICML, ICLR, ISMB submission deadlines |

**Why**: Understanding paper relationships is critical for Phase 2-4. You need to see how Lotfollahi's work evolved and where it's heading.

### 3.1.2 — Research Gap Detector
| Tool | Description |
|------|-------------|
| `analyze_research_frontier` | Summarize open problems in a subfield |
| `identify_contribution_opportunities` | Where YOUR skills could add value |
| `lab_direction_tracker` | Monitor Lotfollahi lab's recent papers/preprints for new directions |
| `trend_analysis` | What's hot in single-cell AI right now (based on arXiv frequency) |

**Why**: By Phase 4, you need to find YOUR niche. This helps identify where the gaps are.

### 3.1.3 — Implementation Tracker
| Tool | Description |
|------|-------------|
| `log_reproduction_attempt` | Track paper reproduction progress (architecture, data, results) |
| `compare_my_results` | Compare your reproduction metrics vs published results |
| `implementation_checklist` | Auto-generate checklist from paper (data, model, training, eval) |
| `benchmark_dashboard` | Track all your model performances across projects |

**Why**: Phase 2 requires reproducing scGen, CPA, trVAE. This tracks fidelity of reproductions.

---

## v3.2 — Deep Accountability & Productivity

**Theme**: Prevent stagnation, detect burnout, enforce consistency.

### 3.2.1 — Accountability Engine
| Tool | Description |
|------|-------------|
| `daily_standup` | Generate morning brief: what's planned, what's due, blockers |
| `end_of_day_review` | Evening reflection: what was accomplished, what didn't happen |
| `weekly_retrospective` | Deep analysis: velocity trends, topic coverage, missed sessions |
| `monthly_strategic_review` | Are you on track for the 18-month goal? Phase progress vs expected |
| `commitment_contract` | Set weekly minimum hours with accountability mechanisms |

**Why**: With a full-time job, consistency is everything. This catches drift early.

### 3.2.2 — Energy & Focus Intelligence
| Tool | Description |
|------|-------------|
| `log_energy_level` | Track energy/focus during sessions (1-5 scale) |
| `optimal_study_time` | Detect YOUR best hours based on session quality patterns |
| `burnout_risk_score` | Analyze patterns that predict burnout (declining hours, missed streaks) |
| `suggest_recovery` | When burnout detected, suggest lighter study modes |
| `deep_work_tracker` | Track uninterrupted focus blocks vs fragmented sessions |

**Why**: 3 hours of deep focus beats 6 hours of distracted study. This optimizes quality, not just quantity.

### 3.2.3 — Goal Proximity & Milestone Tracking
| Tool | Description |
|------|-------------|
| `phase_velocity` | How fast are you progressing vs plan (ahead/behind/on-track) |
| `critical_path_analysis` | What's blocking your next phase transition? |
| `18_month_projection` | At current rate, where will you be in 18 months? |
| `celebrate_milestone` | Acknowledge achievements (with notification) |
| `course_correction` | Suggest plan adjustments when you're behind |

**Why**: The study plan says 18 months to portfolio-ready. This tells you whether you're actually on pace.

---

## v3.3 — Portfolio & Visibility Automation

**Theme**: Automate the public-facing work that makes you visible (Phase 3).

### 3.3.1 — Content Generation Pipeline
| Tool | Description |
|------|-------------|
| `draft_paper_breakdown` | Generate blog post draft from paper notes + your annotations |
| `generate_twitter_thread` | Convert insight into a Twitter/X thread (with math notation) |
| `weekly_learning_log` | Auto-generate "This Week I Learned" post |
| `draft_readme` | Generate GitHub README from project milestones + code |
| `linkedin_update` | Generate professional update from progress data |

**Why**: Phase 3 requires blog posts, GitHub docs, social presence. This reduces friction.

### 3.3.2 — GitHub Portfolio Intelligence
| Tool | Description |
|------|-------------|
| `repo_health_check` | Analyze your repos for documentation quality, tests, CI |
| `contribution_strategy` | Suggest which open-source repos to contribute to (scvi-tools, scanpy) |
| `commit_pattern_analysis` | Are you committing consistently? Quality analysis of commit messages |
| `portfolio_completeness` | Grade your GitHub against "4-6 serious repos" target |
| `generate_project_proposal` | Draft a project proposal for a new repo |

**Why**: "Clean, documented, mathematically explained, reproducible" — this enforces that standard.

### 3.3.3 — Networking Intelligence
| Tool | Description |
|------|-------------|
| `track_researchers` | Monitor researchers you follow (new papers, tweets, talks) |
| `outreach_readiness_score` | Are you ready to contact Lotfollahi's lab? (based on substance metrics) |
| `draft_cold_email` | Generate research-informed outreach email |
| `community_engagement_log` | Track meaningful interactions (comments, PRs, discussions) |

**Why**: Phase 5 outreach requires substance. This ensures you don't reach out prematurely.

---

## v3.4 — Domain-Specific: Computational Biology Tooling

**Theme**: Purpose-built tools for the single-cell ML domain.

### 3.4.1 — Biology Concept Assistant
| Tool | Description |
|------|-------------|
| `explain_bio_concept` | Explain biology concepts from an engineer's perspective |
| `bio_ml_translator` | Map biology terms to ML equivalents (gene expression → feature vector) |
| `dataset_discovery` | Find relevant single-cell datasets for experiments (CELLxGENE, GEO) |
| `data_format_guide` | Explain AnnData, h5ad, loom, 10x formats |
| `biology_cheat_sheet` | Quick reference for biology terms you encounter in papers |

**Why**: Your plan explicitly says "learn biology through computational lens." This bridges the gap.

### 3.4.2 — Experiment Design Assistant
| Tool | Description |
|------|-------------|
| `design_experiment` | Help design ML experiments (baselines, metrics, ablations) |
| `suggest_baselines` | For a given task, what baselines should you compare against? |
| `metric_guide` | Which metrics matter for perturbation prediction, clustering, etc? |
| `hyperparameter_log` | Track hyperparameter choices across experiments |
| `experiment_journal` | Structured experiment logging (hypothesis → method → result → insight) |

**Why**: Research engineering requires rigorous experimentation. This enforces scientific method.

### 3.4.3 — Architecture Study Tools
| Tool | Description |
|------|-------------|
| `architecture_comparison` | Side-by-side comparison of model architectures (scGen vs trVAE vs CPA) |
| `component_library` | Catalog of reusable components (encoders, decoders, attention layers) |
| `architecture_quiz` | "Draw the CPA architecture from memory" type challenges |
| `loss_function_library` | Catalog of loss functions used in comp bio (reconstruction, KL, adversarial) |

**Why**: Deeply understanding architectures is your entry point to the field. This makes it systematic.

---

## v3.5 — Advanced AI & Multi-Modal

**Theme**: Leverage AI more deeply for personalized learning.

### 3.5.1 — Multi-Model Intelligence
| Tool | Description |
|------|-------------|
| `route_to_model` | Auto-select best model for task (code → CodeLlama, math → Mathstral, general → Llama) |
| `configure_model_router` | Set up model routing rules |
| `model_comparison` | Compare responses from different models for quality |

**Why**: Different models excel at different tasks. Math questions need different treatment than code generation.

### 3.5.2 — Voice & Multi-Modal
| Tool | Description |
|------|-------------|
| `voice_note` | Record voice notes during commute, auto-transcribe (Whisper) |
| `explain_diagram` | Describe/analyze architecture diagrams from papers |
| `latex_to_intuition` | Take a LaTeX equation and explain it intuitively |
| `generate_visualization` | Generate matplotlib/ASCII visualizations of concepts |

**Why**: Your commute time can become study time with voice notes. Diagrams are critical for architecture understanding.

### 3.5.3 — Personalized Tutoring
| Tool | Description |
|------|-------------|
| `socratic_deep_dive` | Multi-turn Socratic dialogue that adapts to your answers |
| `misconception_detector` | Detect common misconceptions based on your answers |
| `learning_style_profile` | Track how you learn best (visual, implementation, math-first, intuition-first) |
| `custom_curriculum_update` | AI suggests changes to your study plan based on progress |

**Why**: One-size-fits-all plans fail. This adapts to YOUR learning patterns.

---

## v4.0 — Autonomous Research Agent

**Theme**: The system becomes a **proactive research partner**, not just a reactive tool.

### 4.0.1 — Proactive Intelligence
| Tool | Description |
|------|-------------|
| `morning_brief` | Auto-generated daily brief (new papers, due reviews, schedule, focus suggestion) |
| `weekly_paper_digest` | Auto-curated papers from arXiv based on your interests |
| `opportunity_scanner` | Detect research engineer openings, PhD positions, collaborations |
| `skill_gap_alert` | "You haven't practiced GNNs in 2 weeks, your mastery is decaying" |
| `serendipity_engine` | Suggest unexpected connections between things you're learning |

### 4.0.2 — Code & Experiment Integration
| Tool | Description |
|------|-------------|
| `analyze_notebook` | Parse Jupyter notebook and extract insights/learnings |
| `track_git_learning` | Analyze your commits to detect what you're actually building |
| `code_to_flashcard` | Auto-generate SRS items from code you write |
| `debug_assistant` | When you're stuck on an implementation, guided debugging |
| `architecture_from_paper` | Extract model architecture from paper text → pseudocode → PyTorch skeleton |

### 4.0.3 — Long-Term Memory & Pattern Recognition
| Tool | Description |
|------|-------------|
| `learning_velocity_model` | ML model trained on YOUR data predicting learning speed per topic |
| `knowledge_decay_model` | Predict which concepts you're forgetting based on usage patterns |
| `connection_discovery` | Auto-detect connections between concepts you've learned |
| `insight_synthesis` | Periodically synthesize new insights from accumulated knowledge |
| `progress_narrative` | Generate a narrative of your research journey (for applications/CVs) |

### 4.0.4 — Collaboration & Community
| Tool | Description |
|------|-------------|
| `find_study_partners` | Match with others on similar paths (via shared progress exports) |
| `reading_group_organizer` | Coordinate paper reading with study partners |
| `peer_review_exchange` | Exchange code/writing for review |
| `lab_meeting_simulator` | Practice presenting your work as if in a lab meeting |

---

## Implementation Priority Matrix

| Version | Effort | Impact on Study Plan | Priority |
|---------|--------|---------------------|----------|
| **v3.0.1** Concept Dependencies | Medium | 🔴 Critical — prevents wasted time on prerequisites | **P0** |
| **v3.0.2** Adaptive Difficulty | Medium | 🔴 Critical — measures real understanding | **P0** |
| **v3.0.3** Active Recall | Low | 🔴 Critical — 3-5x learning efficiency | **P0** |
| **v3.2.1** Accountability Engine | Low | 🟠 High — prevents drift with full-time job | **P1** |
| **v3.1.1** Citation Graph | Medium | 🟠 High — essential for Phase 2+ | **P1** |
| **v3.4.1** Bio Concept Assistant | Low | 🟠 High — bridges domain gap | **P1** |
| **v3.2.3** Goal Proximity | Low | 🟠 High — keeps you on pace | **P1** |
| **v3.0.4** Interleaved Practice | Low | 🟡 Medium — optimizes session structure | **P2** |
| **v3.3.1** Content Pipeline | Medium | 🟡 Medium — needed by Phase 3 | **P2** |
| **v3.4.2** Experiment Design | Medium | 🟡 Medium — needed by Phase 2 | **P2** |
| **v3.1.2** Research Gaps | High | 🟡 Medium — needed by Phase 4 | **P2** |
| **v3.5.2** Voice/Multi-Modal | High | 🟡 Medium — reclaims commute time | **P3** |
| **v3.5.1** Multi-Model | Medium | 🔵 Nice — quality improvement | **P3** |
| **v3.3.2** GitHub Intelligence | Low | 🔵 Nice — needed by Phase 3 | **P3** |
| **v4.0.x** Autonomous Agent | Very High | 🔵 Future — long-term vision | **P4** |

---

## Recommended Implementation Order

### Sprint 1 (v3.0 — Core Intelligence) — ~2 weeks
1. **Concept dependency graph** — JSON storage of directed dependency edges
2. **Active recall engine** — Enhanced quiz generation with derivation/implementation challenges
3. **Adaptive mastery tracking** — Performance-based difficulty levels per concept
4. **Anki export** — Get SRS items into Anki for mobile review

### Sprint 2 (v3.2 — Accountability) — ~1 week
1. **Daily standup generator** — Morning brief pulling from all data sources
2. **Phase velocity tracker** — Are you ahead/behind schedule?
3. **Weekly retrospective** — Auto-generated from session logs
4. **Burnout detection** — Pattern analysis on session frequency/quality

### Sprint 3 (v3.1 — Research Intelligence) — ~2 weeks
1. **Citation graph builder** — Semantic Scholar API integration
2. **Paper lineage tracker** — Map scGen → trVAE → CPA evolution
3. **Implementation checklist generator** — From paper to actionable steps
4. **Conference deadline tracker** — ISMB, NeurIPS, ICML, ICLR deadlines

### Sprint 4 (v3.4 — Domain Tooling) — ~1 week
1. **Bio-ML translator** — Curated mapping of biology → ML concepts
2. **Dataset discovery** — CELLxGENE, GEO dataset search
3. **Experiment journal** — Structured experiment logging
4. **Architecture comparator** — Side-by-side model analysis

### Sprint 5 (v3.3 — Visibility Pipeline) — ~1 week
1. **Blog draft generator** — From paper notes to blog post
2. **README generator** — From project milestones to clean README
3. **Twitter thread generator** — From insights to threads
4. **Portfolio completeness score** — Grade against Phase 3 targets

### Sprint 6 (v3.5 + v4.0 — Advanced) — ~3 weeks
1. **Multi-model routing** — CodeLlama for code, Mathstral for math
2. **Voice notes with Whisper** — Commute study time
3. **Morning auto-brief** — Proactive daily intelligence
4. **Jupyter notebook analyzer** — Extract learnings from notebooks

---

## Technical Architecture Changes

### New Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "chromadb": "^1.9.2",
    "googleapis": "^144.0.0",
    "zod": "^3.22.4",
    "node-fetch": "^3.3.0",        // Semantic Scholar API
    "ical-generator": "^7.0.0",    // Calendar export
    "marked": "^12.0.0",           // Markdown generation
    "yaml": "^2.4.0"               // Config files
  }
}
```

### New File Structure
```
src/tools/
├── (existing 17 files)
├── concept-graph.ts        # v3.0.1 — Dependency graph
├── mastery.ts              # v3.0.2 — Adaptive difficulty
├── active-recall.ts        # v3.0.3 — Enhanced testing
├── interleave.ts           # v3.0.4 — Practice scheduling
├── citations.ts            # v3.1.1 — Citation graph
├── research-gaps.ts        # v3.1.2 — Gap detection
├── reproductions.ts        # v3.1.3 — Implementation tracking
├── accountability.ts       # v3.2.1 — Standup/retro
├── energy.ts               # v3.2.2 — Focus tracking
├── velocity.ts             # v3.2.3 — Goal proximity
├── content-pipeline.ts     # v3.3.1 — Blog/social generation
├── portfolio.ts            # v3.3.2 — GitHub analysis
├── networking.ts           # v3.3.3 — Researcher tracking
├── bio-assistant.ts        # v3.4.1 — Biology for engineers
├── experiments.ts          # v3.4.2 — Experiment design
├── architectures.ts        # v3.4.3 — Architecture study
├── model-router.ts         # v3.5.1 — Multi-model
├── multimodal.ts           # v3.5.2 — Voice/diagrams
├── tutor.ts                # v3.5.3 — Personalized tutoring
└── autonomous.ts           # v4.0   — Proactive agent
```

### New Data Files
```
data/
├── concept-graph.json      # Directed dependency graph
├── mastery-levels.json     # Per-concept mastery scores
├── experiment-journal.jsonl # Experiment logs
├── energy-log.jsonl        # Focus/energy tracking
├── citation-graph.json     # Paper citation relationships
├── reproduction-log.json   # Paper reproduction attempts
├── portfolio-scores.json   # GitHub repo quality scores
├── bio-glossary.json       # Biology-ML term mappings
├── architecture-catalog.json # Model architecture database
└── voice-notes/            # Transcribed voice notes
```

---

## Expected Tool Count by Version

| Version | New Tools | Total Tools | Theme |
|---------|-----------|-------------|-------|
| v2.0 (current) | — | 73 | AI-powered basics |
| v3.0 | ~20 | ~93 | Intelligent learning |
| v3.1 | ~12 | ~105 | Research intelligence |
| v3.2 | ~12 | ~117 | Accountability |
| v3.3 | ~10 | ~127 | Visibility automation |
| v3.4 | ~12 | ~139 | Domain tooling |
| v3.5 | ~10 | ~149 | Multi-modal AI |
| v4.0 | ~15 | ~164 | Autonomous agent |

---

## How This Maps to Your Study Plan

| Study Plan Phase | Most Impactful Features |
|------------------|------------------------|
| **Phase 1 (ML Foundations)** | Concept graph, adaptive difficulty, active recall, interleaving, experiment journal |
| **Phase 2 (Comp Bio)** | Bio assistant, dataset discovery, paper lineage, implementation tracker, architecture tools |
| **Phase 3 (Visibility)** | Content pipeline, portfolio intelligence, GitHub analysis, Twitter drafts |
| **Phase 4 (Lab Alignment)** | Research gap detector, lab direction tracker, contribution strategy, outreach readiness |
| **Phase 5 (Outreach)** | Cold email drafter, networking intelligence, progress narrative, lab meeting simulator |

---

## Success Metrics

By v3.x completion, the system should be able to:

1. **Answer**: "What should I learn next?" with data-driven precision
2. **Detect**: When you're memorizing without understanding
3. **Prevent**: Burning out or drifting from the plan
4. **Generate**: Blog posts, READMEs, social content from your work
5. **Track**: Paper reproductions against published benchmarks
6. **Predict**: When you'll be ready for each phase transition
7. **Alert**: New relevant papers, opportunities, deadlines
8. **Bridge**: Biology concepts into engineering language
9. **Enforce**: Scientific rigor in your experiments
10. **Measure**: Outreach readiness with quantitative scores

---

## Quick Wins (Can implement TODAY)

These require minimal code and provide immediate value:

1. **Anki export** — Convert existing SRS items to Anki deck format
2. **Daily standup** — Aggregate existing data into morning brief
3. **Phase velocity** — Simple calculation: topics completed / expected by now
4. **Bio glossary** — Static JSON mapping biology → ML terms
5. **Paper implementation checklist** — Template generator from paper metadata

---

*Last updated: 2025-05-29*
*Target: 164 tools by v4.0*
*Philosophy: Every feature should directly accelerate the path to Lotfollahi lab credibility.*
