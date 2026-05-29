# Study Companion MCP Server v2.0

An AI-powered study companion with **human-like chat** (local Ollama LLM), **persistent vector memory** (ChromaDB), **real-time Google Calendar sync**, **mobile notifications**, and **paper summarization**. Built as an MCP server for long-term technical mastery in computational biology + ML research.

**100% free and local** — no API keys required for core features.

## What's New in v2.0

- **Local LLM Chat (Ollama)** — Talk to "Astra", your AI study companion. Remembers past conversations, uses your knowledge base as context (RAG). Runs entirely on your laptop.
- **Vector Database (ChromaDB)** — All insights, sessions, and chats stored with LLM embeddings. Semantic search that actually understands your questions.
- **Google Calendar OAuth** — Real-time sync: study sessions go directly to your calendar. No copy-paste.
- **Paper Summarization** — Auto-summarize papers, generate study material, compare papers side-by-side.
- **Mobile Notifications (ntfy.sh)** — Push notifications for study reminders, streak updates, revision alerts. Free, no account needed.
- **Collaborative Tracking** — Export/import/compare progress with study partners.

## Cost & Subscriptions Guide

### Completely Free (Core System)

| Tool | Cost | What It Does |
|------|------|-------------|
| **Ollama** | $0 | Local LLM — chat, embeddings, summarization |
| **ChromaDB** | $0 | Vector database for persistent memory |
| **ntfy.sh** | $0 | Mobile push notifications |
| **Google Calendar API** | $0 | Real-time calendar sync (free tier: 1M queries/day) |
| **arXiv API** | $0 | Paper search and fetching |
| **GitHub API** | $0 | Activity tracking (unauthenticated: 60 req/hr) |

### Required Downloads (One-Time, Free)

| Download | Size | Purpose |
|----------|------|---------|
| `ollama pull llama3.1:8b` | ~4.7 GB | Chat & summarization model |
| `ollama pull nomic-embed-text` | ~274 MB | Embedding model for vector search |
| ChromaDB | ~50 MB | Vector database server |

### Optional Paid (Recommended)

| Subscription | Cost | Why |
|-------------|------|-----|
| **Claude Pro** (Anthropic) | $20/month | Best MCP host — Claude calls your tools intelligently. This is how you interact with the MCP server. |
| **Windsurf Pro** | $15/month | IDE with built-in MCP support + AI coding. Alternative: use Claude Desktop (free with Pro). |

### Total Monthly Cost

| Setup | Cost | What You Get |
|-------|------|-------------|
| **Minimum (all local)** | **$0/month** | Ollama chat + ChromaDB + ntfy notifications. Use Claude Desktop free tier. |
| **Recommended** | **$20/month** | Claude Pro for powerful MCP interaction. Everything else free. |
| **Full IDE setup** | **$35/month** | Claude Pro + Windsurf Pro. Maximum productivity. |

### Hardware Requirements

| RAM | Experience |
|-----|-----------|
| 8 GB | Use `llama3.2:3b` or `gemma2:2b` (lighter models) |
| 16 GB | `llama3.1:8b` runs smoothly (recommended) |
| 32 GB+ | Can run `llama3.1:70b` for research-grade responses |

## Features

### 1. Adaptive Study Planner
- **Time-aware scheduling**: Different plans for weekdays (3hr) vs weekends (8-10hr)
- **Phase-based progression**: Auto-tracks which phase you're in
- **Priority-driven focus**: Topics ordered by criticality

### 2. Spaced Repetition (SM-2)
- Add concepts as you learn them
- Algorithm schedules optimal review times
- Tracks retention and ease factors

### 3. Research Assistant
- Paper queue with priorities
- Architecture annotation framework
- Pre-loaded Lotfollahi lab reading list

### 4. Knowledge Memory System
- Save insights, questions, connections, breakthroughs
- Full-text + semantic search
- Topic connection mapping

### 5. Project Mentor
- Step-by-step milestone guidance
- Common mistakes, resources, next steps

### 6. AI Study Companion Chat (v2.0)
- **"Astra"** — warm, knowledgeable study companion persona
- RAG-powered: answers draw from YOUR stored knowledge
- Persistent memory across sessions via ChromaDB
- Socratic method: guides understanding, doesn't just give answers

### 7. Paper Summarization (v2.0)
- Auto-summarize papers from your reading queue
- Generate quiz questions and SRS items from papers
- Compare papers side-by-side
- Abstract analysis: "should I read this?"

### 8. Mobile Notifications (v2.0)
- Study reminders, streak alerts, revision notifications
- Quiet hours support
- Works on Android + iOS via ntfy.sh

## Setup

### 1. Install Node Dependencies

```bash
cd study-companion-mcp
npm install
npm run build
```

### 2. Install Ollama (Free, Local LLM)

```bash
# Download from https://ollama.com
# Then pull required models:
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Start Ollama (runs in background):
ollama serve
```

### 3. Install ChromaDB (Free, Local Vector DB)

```bash
# Option A: pip (simplest)
pip install chromadb
chroma run --host localhost --port 8000

# Option B: Docker
docker run -p 8000:8000 chromadb/chroma
```

### 4. Install ntfy (Free Mobile Notifications)

1. Install the **ntfy** app on your phone ([Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [iOS](https://apps.apple.com/app/ntfy/id1625396347))
2. Run `test_notification` tool to get your topic name
3. Subscribe to that topic in the app

### 5. Google Calendar OAuth (Free, Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google Calendar API**
3. Create **OAuth 2.0 Client ID** (Desktop App)
4. Download credentials JSON → save as `data/gcal-credentials.json`
5. Run `gcal_auth` tool → follow the URL → paste the code into `gcal_auth_callback`

### 6. Configure Windsurf / Claude Desktop

**Option A — Run from source:**
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

**Option B — Run from Docker (no Node.js needed):**
```json
{
  "mcpServers": {
    "study-companion": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-v", "./data:/app/data", "ghcr.io/afakatkar/study-companion-mcp:latest"]
    }
  }
}
```

## Docker

### Pull from GitHub Container Registry

```bash
docker pull ghcr.io/afakatkar/study-companion-mcp:latest
```

### Run with docker-compose (recommended — includes ChromaDB)

```bash
# Start ChromaDB in background
docker compose up -d chromadb

# Run MCP server interactively (stdio)
docker compose run --rm study-companion
```

### Run standalone

```bash
# Run MCP server (mount data dir for persistence)
docker run --rm -i -v ./data:/app/data ghcr.io/afakatkar/study-companion-mcp:latest
```

### Build locally

```bash
docker build -t study-companion-mcp .
docker run --rm -i -v ./data:/app/data study-companion-mcp
```

### CI/CD

Every merged PR to `main` automatically:
1. Builds the TypeScript project
2. Builds & pushes a Docker image to `ghcr.io/afakatkar/study-companion-mcp`
3. Creates a GitHub Release with the version from `package.json`

To trigger a new release, bump the `version` in `package.json` in your PR.

## Available Tools (73 total)

### Planner
| Tool | Description |
|------|-------------|
| `get_daily_plan` | Today's personalized study blocks |
| `get_phase_status` | Current phase progress + topics |
| `get_roadmap` | Full multi-phase roadmap |
| `mark_topic_complete` | Mark a topic done |
| `mark_milestone` | Complete a project milestone |
| `log_session` | Log study hours + maintain streak |
| `set_start_date` | Set journey start date |
| `override_phase` | Manually set current phase |
| `clear_phase_override` | Return to auto-detection |

### Spaced Repetition
| Tool | Description |
|------|-------------|
| `add_revision` | Add concept to SRS |
| `bulk_add_revisions` | Add multiple concepts at once |
| `get_revisions_due` | What needs review today |
| `review_item` | Record review attempt |
| `revision_stats` | Retention statistics |

### Research
| Tool | Description |
|------|-------------|
| `add_paper` | Add paper to queue |
| `get_paper_queue` | View reading queue |
| `start_paper` | Begin reading a paper |
| `annotate_paper` | Add notes + architecture analysis |
| `complete_paper` | Finish a paper |
| `get_paper_notes` | Retrieve paper annotations |
| `search_papers` | Search paper database |

### Memory
| Tool | Description |
|------|-------------|
| `save_insight` | Store a learning insight |
| `search_memory` | Search knowledge base |
| `recent_insights` | Recent learnings |
| `get_topic_notes` | Topic-specific notes |
| `update_topic_notes` | Write topic notes |
| `connection_map` | Topic interconnections |
| `memory_stats` | Knowledge base stats |

### Mentor
| Tool | Description |
|------|-------------|
| `get_project_guidance` | Milestone-specific mentoring |
| `list_projects` | All projects + progress |
| `weekly_report` | Comprehensive weekly summary |

### Vector Memory (v1.1)
| Tool | Description |
|------|-------------|
| `semantic_search` | Search knowledge base using cosine similarity |
| `find_related_concepts` | Find concepts semantically related to X |
| `rebuild_vector_index` | Rebuild the TF-IDF vector index |

### Progress Analytics (v1.2)
| Tool | Description |
|------|-------------|
| `weekly_analytics` | Weekly study hour charts + topic breakdowns |
| `monthly_analytics` | Monthly trend charts |
| `time_distribution` | Topic and day-of-week distribution analysis |
| `predicted_completion` | Predicted completion dates per phase |

### External Integrations (v1.3)
| Tool | Description |
|------|-------------|
| `github_activity` | Fetch + analyze GitHub contributions |
| `search_arxiv` | Search arXiv for papers |
| `fetch_lotfollahi_papers` | Get latest Lotfollahi lab papers |
| `draft_blog_post` | Generate blog post drafts from notes |

### Multi-Agent (v1.4)
| Tool | Description |
|------|-------------|
| `review_code` | Code reviewer for ML/PyTorch code quality |
| `generate_quiz` | Quiz master for active recall testing |
| `research_scout` | Research scout for new paper discovery |

### Google Calendar (v1.x)
| Tool | Description |
|------|-------------|
| `schedule_study_sessions` | Generate week of study sessions |
| `update_schedule_template` | Customize time slots |
| `next_study_session` | Get next upcoming session |
| `create_calendar_event` | Create single event |
| `weekly_schedule_overview` | View schedule template |

### Ollama LLM (v2.0)
| Tool | Description |
|------|-------------|
| `ollama_status` | Check Ollama connection + installed models |
| `configure_ollama` | Change model, temperature, URL |

### Study Chat (v2.0)
| Tool | Description |
|------|-------------|
| `study_chat` | Chat with Astra (RAG-powered, remembers context) |
| `ask_knowledge_base` | Q&A from YOUR stored knowledge only |
| `chat_sessions` | List past chat sessions |
| `search_chats` | Semantic search through chat history |
| `new_chat_session` | Start fresh conversation |

### Vector Database (v2.0)
| Tool | Description |
|------|-------------|
| `vectordb_status` | Check ChromaDB connection + stats |
| `index_insights` | Index knowledge base into ChromaDB |
| `deep_semantic_search` | LLM-powered semantic search (replaces TF-IDF) |
| `configure_vectordb` | Change ChromaDB URL |

### Google Calendar OAuth (v2.0)
| Tool | Description |
|------|-------------|
| `gcal_auth` | Start OAuth flow |
| `gcal_auth_callback` | Complete OAuth with auth code |
| `gcal_sync` | Sync sessions to calendar in real-time |
| `gcal_upcoming` | List upcoming calendar events |
| `gcal_quick_add` | Natural language event creation |
| `gcal_delete_synced` | Remove synced events |
| `configure_gcal` | Set timezone, colors, reminders |

### Paper Summarization (v2.0)
| Tool | Description |
|------|-------------|
| `summarize_paper` | Auto-summarize from reading queue via Ollama |
| `analyze_abstract` | Quick abstract analysis: "should I read this?" |
| `paper_study_material` | Generate quiz + SRS items from a paper |
| `compare_papers` | Side-by-side paper comparison |

### Notifications (v2.0)
| Tool | Description |
|------|-------------|
| `send_notification` | Push notification to phone |
| `test_notification` | Verify phone connection |
| `configure_notifications` | Set topic, quiet hours, priority |
| `notification_history` | View sent notifications |

### Collaboration (v2.0)
| Tool | Description |
|------|-------------|
| `export_progress` | Export shareable progress snapshot |
| `import_progress` | Import partner's progress |
| `compare_progress` | Side-by-side comparison |
| `shareable_report` | Generate markdown report for GitHub/LinkedIn |

## Usage Examples

```
# Core study workflow
"What should I study today?"           → get_daily_plan
"Log 2 hours on GNN implementation"    → log_session
"What do I need to review?"            → get_revisions_due
"Give me my weekly report"             → weekly_report

# v2.0 — Talk to your study companion
"Hey Astra, explain VAE reparameterization trick" → study_chat
"What did I learn about GNNs last week?"          → ask_knowledge_base
"Search my past conversations about attention"     → search_chats

# v2.0 — Paper workflow
"Summarize the scGEN paper"            → summarize_paper
"Is this abstract worth reading?"      → analyze_abstract
"Generate quiz questions from paper"   → paper_study_material
"Compare VAE paper vs GNN paper"       → compare_papers

# v2.0 — Calendar & notifications
"Sync my study sessions to calendar"   → gcal_sync
"Add 'Study VAEs tomorrow 8pm'"        → gcal_quick_add
"Send me a study reminder"             → send_notification
"Set up my phone notifications"        → configure_notifications → test_notification

# v2.0 — Collaboration
"Export my progress"                   → export_progress
"How am I doing vs my study partner?"  → compare_progress
"Generate a LinkedIn progress post"    → shareable_report
```

## Data Persistence

All data stored locally in `data/`:

| File | Purpose |
|------|---------|
| `planner-state.json` | Progress, streak, completed topics |
| `revisions.json` | Spaced repetition items |
| `papers.json` | Paper database |
| `memory.json` | Knowledge insights |
| `session-log.jsonl` | Study session log |
| `notes/` | Topic markdown notes |
| `ollama-config.json` | LLM settings (v2.0) |
| `vectordb-config.json` | ChromaDB settings (v2.0) |
| `chat-sessions.json` | Chat session history (v2.0) |
| `paper-summaries.json` | LLM-generated summaries (v2.0) |
| `gcal-credentials.json` | Google OAuth credentials (v2.0) |
| `gcal-token.json` | Google OAuth token (v2.0) |
| `notify-config.json` | Notification settings (v2.0) |
| `notification-log.json` | Sent notifications log (v2.0) |

**ChromaDB** stores vector embeddings separately (persisted in its own data directory).

## Architecture

```
src/
├── index.ts              MCP server entry point (73 tool registrations)
├── tools/
│   ├── planner.ts        Study planning & progress tracking
│   ├── revision.ts       SM-2 spaced repetition engine
│   ├── research.ts       Paper management
│   ├── memory.ts         Knowledge base & notes
│   ├── mentor.ts         Project mentoring & guidance
│   ├── vectors.ts        TF-IDF embeddings + cosine similarity (v1.1)
│   ├── analytics.ts      Progress charts + predictions (v1.2)
│   ├── integrations.ts   GitHub, arXiv, blog drafting (v1.3)
│   ├── agents.ts         Reviewer, quiz master, scout (v1.4)
│   ├── calendar.ts       Calendar event generation (v1.x)
│   ├── ollama.ts         Ollama LLM wrapper — chat, embed, generate (v2.0)
│   ├── vectordb.ts       ChromaDB integration — persistent RAG memory (v2.0)
│   ├── chat.ts           RAG-powered study companion chat (v2.0)
│   ├── gcal-sync.ts      Google Calendar OAuth real-time sync (v2.0)
│   ├── paper-summarizer.ts  LLM paper summarization (v2.0)
│   ├── notifications.ts  ntfy.sh mobile push notifications (v2.0)
│   └── collab.ts         Collaborative progress tracking (v2.0)
├── data/
│   ├── study-plan.ts     Complete roadmap data structure
│   └── schedule.ts       Time-aware scheduling logic
└── utils/
    ├── types.ts          TypeScript interfaces
    └── storage.ts        File-based persistence layer

External Services (all free, all local):
├── Ollama (localhost:11434)     Local LLM inference
├── ChromaDB (localhost:8000)    Vector database
├── ntfy.sh                      Push notifications
└── Google Calendar API          Calendar sync (OAuth)
```

## Evolution Roadmap

### v1.0 — Core ✅
- Study planner, SRS, research, memory, mentor (27 tools)

### v1.1-v1.4 — Advanced Features ✅
- Vector memory, analytics, GitHub/arXiv, multi-agent, calendar (46 tools)

### v2.0 — AI-Powered ✅
- Local LLM chat with RAG (Ollama + ChromaDB)
- Google Calendar OAuth real-time sync
- Automated paper summarization
- Mobile notifications (ntfy.sh)
- Collaborative study tracking
- **73 tools total**

### v3.0 — Future Ideas
- Voice interface (whisper.cpp for speech-to-text)
- Anki deck export from SRS
- Automated GitHub commit analysis for learning patterns
- Multi-user real-time collaboration via WebSocket
- Custom fine-tuned models on your study data


release