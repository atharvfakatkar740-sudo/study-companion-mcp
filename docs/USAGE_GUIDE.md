# Study Companion MCP — Complete Usage Guide

> **TL;DR**: This is NOT a standalone app. It's a **tool provider** for AI assistants like Claude (in Windsurf, Claude Desktop, or Cursor). You talk to Claude in natural language and Claude calls these tools behind the scenes.

---

## How MCP Works (The Mental Model)

```
┌──────────────────────────────────────────────┐
│  YOU (natural language)                      │
│  "What should I study today?"                │
│  "Track that I studied GNNs for 2 hours"     │
│  "Am I on pace for my 18-month goal?"        │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  AI ASSISTANT (Claude in Windsurf)           │
│  Understands your intent, picks the right    │
│  tool, calls it, formats the response        │
└──────────────┬───────────────────────────────┘
               │ calls tools via MCP protocol
               ▼
┌──────────────────────────────────────────────┐
│  STUDY COMPANION MCP SERVER (this project)   │
│  ~122 tools across 21 files                  │
│  Runs as a background process via stdio      │
│  Stores everything locally in data/          │
└──────────────────────────────────────────────┘
```

**You never interact with the MCP server directly.** You talk to Claude, and Claude uses the tools.

---

## Setup: Adding to Windsurf

### Step 1: Build the project

```bash
cd study-companion-mcp
npm install
npm run build
```

### Step 2: Configure Windsurf MCP

1. Open Windsurf
2. Go to **Settings** → **MCP** (or press `Ctrl+Shift+P` → "MCP: Open Settings")
3. Add this configuration:

```json
{
  "mcpServers": {
    "study-companion": {
      "command": "node",
      "args": ["c:\\Users\\afakatkar\\Documents\\Learning\\ML\\anomaly detection\\study-companion-mcp\\dist\\index.js"],
      "env": {}
    }
  }
}
```

4. Restart Windsurf or reload the MCP connection

### Step 3: Verify it works

In Windsurf's AI chat (Cascade), type:

> "What tools do you have from study-companion?"

Claude should list all ~122 tools. If it doesn't, check that:
- `npm run build` completed without errors
- The path in the config matches your actual project location
- You restarted Windsurf after adding the config

---

## Alternative Hosts (Not Just Windsurf)

| Host | How to Use | Cost |
|------|-----------|------|
| **Windsurf** | Add to MCP settings (see above) | Free / $15/mo Pro |
| **Claude Desktop** | Add to `claude_desktop_config.json` | Free / $20/mo Pro |
| **Cursor** | Add to MCP settings in Cursor | Free / $20/mo Pro |
| **VS Code + Copilot** | MCP support via extensions | Copilot sub |

All use the same config format. The MCP server doesn't care which host you use.

---

## Daily Workflow: How to Actually Use This

### 🌅 Morning Routine (2 minutes)

Say to Claude:

> "Run my daily standup"

Claude calls `daily_standup` → you get:
- Yesterday's study summary
- Today's plan (SRS items due, focus topics, papers)
- Current streak
- Blockers and quick wins

Then:

> "What's my daily plan?"

Claude calls `get_daily_plan` → structured study blocks for today.

---

### 📚 During Study Sessions

**Starting a session:**
> "I'm going to study VAE reparameterization for the next 2 hours"

**Logging what you learned:**
> "Save this insight: The reparameterization trick works by sampling from N(0,1) and shifting by mu + sigma*epsilon, which makes the gradient flow through the sampling step"

Claude calls `save_insight` with topic tagging.

**When you're stuck:**
> "I don't understand why KL divergence is used in VAEs"

Claude calls `study_chat` → Astra explains using your past notes as context.

**Active recall:**
> "Quiz me on what I learned about GNNs this week"

Claude calls `derivation_quiz`, `implementation_challenge`, or `compare_contrast`.

**Logging the session:**
> "Log 2 hours studying VAEs, topic: variational inference, productivity 4/5"

Claude calls `log_session`.

---

### 🔬 Research Workflow

**Finding papers:**
> "Search Semantic Scholar for papers on perturbation prediction in single-cell"

Claude calls `search_semantic_scholar` → returns papers with IDs, citations, TLDRs.

**Building your citation graph:**
> "Add that CPA paper to my citation graph"

Claude calls `add_to_citation_graph` → fetches references and citing papers.

**Tracking paper lineage:**
> "Track the Lotfollahi evolution: scGen (2019) → trVAE (2020) → CPA (2021) → chemCPA (2023)"

Claude calls `track_paper_lineage`.

**Starting a paper reproduction:**
> "Generate an implementation checklist for the CPA paper, it's a VAE architecture"

Claude calls `generate_implementation_checklist` with `paper_type: "vae"` → structured checklist with ~30 items across data pipeline, architecture, training, evaluation, documentation.

---

### 📊 Weekly Workflow

**Every Sunday evening:**
> "Give me my weekly retrospective"

Claude calls `weekly_retrospective` → hours trend, topic diversity, mastery changes, wins, improvements, next-week focus.

**Check velocity:**
> "Am I ahead or behind schedule?"

Claude calls `phase_velocity` → topics/projects completed vs expected.

**Burnout check:**
> "Check my burnout risk"

Claude calls `burnout_detection` → analyzes session trends and flags risk signals.

---

### 🎯 Publishing & Career Strategy

**Conference tracking:**
> "What conference deadlines are coming up?"

Claude calls `conference_deadlines` → urgent, upcoming, and future deadlines.

> "Tell me about NeurIPS"

Claude calls `conference_info` with `neurips` → topics, strategic fit, your entry path, workshop targets.

**Publication readiness:**
> "What should my first paper be about?"

Claude calls `first_paper_advice` → personalized strategy based on your skills.

> "Am I ready to reach out to Lotfollahi?"

Claude calls `outreach_readiness` with `lotfollahi` → evaluates your progress against contact criteria.

**Tracking contributions:**
> "I just submitted a PR to scanpy fixing a documentation issue"

Claude calls `log_ecosystem_contribution` → tracks your scverse visibility.

**Full dashboard:**
> "Show me my publishing dashboard"

Claude calls `publishing_dashboard` → paper pipeline, ecosystems, deadlines, researchers.

---

### 🧠 Knowledge Management

**Spaced repetition:**
> "Add KL divergence to my revision list"

> "What do I need to review today?"

> "I reviewed VAE loss functions — it was easy"

Claude calls `add_revision`, `get_revisions_due`, `review_item`.

**Concept dependencies:**
> "Add a dependency: ELBO requires KL divergence"

> "What's the optimal learning path to understand CPA?"

Claude calls `add_concept_dependency`, `get_learning_path`.

**Mastery tracking:**
> "Assess my understanding of graph neural networks — I scored 7/10 on a hard quiz"

Claude calls `assess_understanding` → updates your mastery level.

---

## Pro Tips for Maximum Value

### 1. Be Conversational, Not Technical

You don't need to know tool names. Just talk naturally:

| ❌ Don't say | ✅ Say instead |
|-------------|---------------|
| "Call log_session with hours 2, topic GNNs" | "I just studied GNNs for 2 hours" |
| "Run weekly_retrospective tool" | "How was my week?" |
| "Execute search_semantic_scholar" | "Find me papers on spatial transcriptomics GNNs" |

Claude figures out which tool to call.

### 2. Build Habits Around Key Tools

| Time | What to Say | Why |
|------|------------|-----|
| **Morning** | "Daily standup" | Start the day focused |
| **After each session** | "Log X hours on Y" | Build the data that powers everything |
| **When you learn something** | "Save this insight: ..." | Feeds your knowledge base |
| **End of day** | "End of day review" | Reflect and close the loop |
| **Sunday evening** | "Weekly retro" | Course correct weekly |
| **Monthly** | "Am I on pace?" + "Publishing dashboard" | Strategic check-in |

### 3. Log Sessions Religiously

The entire system's intelligence depends on your session log. Without it:
- Velocity tracking doesn't work
- Burnout detection can't detect anything
- Weekly retros have no data
- Mastery trends are invisible

**Just say "log X hours on Y" after every study session.** That's it.

### 4. Use the Citation Graph Early

Don't wait until Phase 2. Start adding papers now:

> "Search for scGen paper on Semantic Scholar"
> "Add it to my citation graph"
> "Now search for CPA"
> "Add CPA too"
> "Track the lineage: scGen → trVAE → CPA → chemCPA"

This builds a knowledge map that powers bridge paper discovery later.

### 5. Let It Quiz You

Active recall is 3-5x more effective than passive review:

> "Give me a derivation quiz on VAEs"
> "Challenge me to implement attention from scratch"
> "Explain like I'm 5: what is a graph neural network?"
> "Compare and contrast: VAE vs autoencoder"

### 6. Track Everything for Publishing

When you make open-source contributions, log them:

> "I submitted a PR to scvi-tools fixing a data loading bug"

When you start a paper idea:

> "Start tracking a paper draft: 'GNN-based perturbation prediction benchmark', strategy: benchmark-systems, target: ML4H workshop"

This builds your publication readiness over time.

---

## Tool Categories at a Glance (~122 tools)

| Category | Tools | What They Do |
|----------|-------|-------------|
| **Planner** | 9 | Daily plans, phase tracking, session logging |
| **Spaced Repetition** | 5 | SM-2 algorithm, review scheduling |
| **Research** | 7 | Paper queue, annotations, search |
| **Memory** | 7 | Insights, notes, knowledge connections |
| **Mentor** | 3 | Project guidance, weekly reports |
| **Vector Search** | 3 | TF-IDF semantic search |
| **Analytics** | 4 | Weekly/monthly charts, predictions |
| **Integrations** | 4 | GitHub, arXiv, blog drafts |
| **Multi-Agent** | 3 | Code review, quiz, research scout |
| **Calendar** | 5 | Session scheduling, events |
| **Ollama Chat** | 7 | Astra AI companion, RAG |
| **Vector DB** | 4 | ChromaDB semantic search |
| **Google Calendar** | 7 | OAuth sync, events |
| **Paper Summarizer** | 4 | LLM summaries, comparisons |
| **Notifications** | 4 | ntfy.sh mobile alerts |
| **Collaboration** | 4 | Export/import/compare progress |
| **Concept Graph** | 7 | Dependencies, learning paths |
| **Mastery** | 5 | Adaptive difficulty, assessments |
| **Active Recall** | 7 | Quizzes, Anki export |
| **Accountability** | 5 | Standup, retro, burnout detection |
| **Research Intel** | 11 | Citation graph, paper lineage |
| **Publishing** | 14 | Conferences, strategy, co-authors |
| **Plan Management** | 5 | Plan info, phases, topics, projects |

---

## Data Files Reference

All data lives in `data/` and persists between sessions:

| File | Auto-Created | What It Stores |
|------|-------------|---------------|
| `study-plan.json` | No (pre-loaded) | Your complete study plan |
| `planner-state.json` | Yes | Progress, streak, completed items |
| `session-log.jsonl` | Yes | Every study session logged |
| `revisions.json` | Yes | SRS items and review history |
| `papers.json` | Yes | Paper reading queue |
| `memory.json` | Yes | Knowledge insights |
| `concept-graph.json` | Yes | Concept dependencies |
| `mastery-state.json` | Yes | Per-concept mastery levels |
| `test-results.json` | Yes | Quiz and test scores |
| `citation-graph.json` | Yes | Paper citation network |
| `implementation-checklists.json` | Yes | Paper reproduction checklists |
| `publication-progress.json` | Yes | Paper drafts, submissions, contributions |
| `conferences.json` | No (pre-loaded) | Conference database with deadlines |
| `publishing-strategy.json` | No (pre-loaded) | Target researchers, ecosystems |
| `researchers.json` | No (pre-loaded) | Researcher tracking config |

---

## Troubleshooting

### "Claude doesn't see the tools"
1. Check `npm run build` succeeded
2. Verify the path in MCP config is correct (use absolute path)
3. Restart Windsurf completely
4. Check Windsurf's MCP panel — it should show "study-companion" as connected

### "Module not found errors"
```bash
cd study-companion-mcp
npm install
npm run build
```

### "Ollama/ChromaDB tools fail"
These require external services running:
```bash
ollama serve                              # Start Ollama
chroma run --host localhost --port 8000    # Start ChromaDB
```

Core tools (planner, SRS, research, memory, analytics, accountability, publishing) work **without** Ollama or ChromaDB.

### "Session data seems wrong"
All data is in `data/`. You can inspect any JSON file directly. The system never deletes data — it only appends.

---

## Quick Start Checklist

- [ ] Run `npm install && npm run build`
- [ ] Add MCP config to Windsurf settings
- [ ] Restart Windsurf
- [ ] Say "daily standup" to Claude
- [ ] Log your first study session
- [ ] Add your first SRS revision item
- [ ] Search for a paper on Semantic Scholar
- [ ] Check your conference deadlines
- [ ] Run your first weekly retrospective (after a week of data)

---

*This guide covers v3.3.0 with ~122 tools. The system grows with you — the more data you feed it, the smarter its recommendations become.*
