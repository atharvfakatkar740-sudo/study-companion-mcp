import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Tool imports
import {
  getDailyPlan,
  getPhaseStatus,
  markTopicComplete,
  markProjectMilestone,
  logStudySession,
  setStartDate,
  overridePhase,
  clearPhaseOverride,
  getFullRoadmap,
} from "./tools/planner.js";

import {
  addRevisionItem,
  getRevisionsDue,
  reviewItem,
  getRevisionStats,
  bulkAddRevisions,
} from "./tools/revision.js";

import {
  addPaper,
  getPaperQueue,
  startReadingPaper,
  annotatePaper,
  completePaper,
  getPaperNotes,
  searchPapers,
} from "./tools/research.js";

import {
  saveInsight,
  searchMemory,
  getRecentInsights,
  getTopicNotes,
  updateTopicNotes,
  getConnectionMap,
  getMemoryStats,
} from "./tools/memory.js";

import {
  getProjectGuidance,
  listProjects,
  getWeeklyReport,
} from "./tools/mentor.js";

import {
  semanticSearch,
  findRelatedConcepts,
  rebuildVectorIndex,
} from "./tools/vectors.js";

import {
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getTimeDistribution,
  getPredictedCompletion,
} from "./tools/analytics.js";

import {
  fetchGitHubActivity,
  searchArxiv,
  fetchLotfollahiPapers,
  fetchResearcherPapers,
  draftBlogPost,
} from "./tools/integrations.js";

import {
  reviewCode,
  generateQuiz,
  scoutNewResearch,
} from "./tools/agents.js";

import {
  scheduleStudySessions,
  updateScheduleTemplate,
  getNextStudySession,
  createCalendarEvent,
  getWeeklyScheduleOverview,
} from "./tools/calendar.js";

// v2.0 imports
import {
  checkOllamaStatus,
  configureOllama,
} from "./tools/ollama.js";

import {
  indexAllInsights,
  semanticSearchInsights,
  checkVectorDBStatus,
  configureVectorDB,
  storeStudySessionVector,
} from "./tools/vectordb.js";

import {
  studyChat,
  askContextQuestion,
  getChatSessions,
  searchPastChats,
  startNewChatSession,
} from "./tools/chat.js";

import {
  getAuthUrl,
  handleAuthCallback,
  syncStudySessions,
  listUpcomingEvents,
  deleteStudyEvents,
  quickAddEvent,
  configureGCal,
} from "./tools/gcal-sync.js";

import {
  summarizePaper,
  summarizeFromAbstract,
  generateKeyInsightsFromPaper,
  comparePapers,
} from "./tools/paper-summarizer.js";

import {
  sendNotification,
  notifyStudyReminder,
  notifyStreakUpdate,
  notifyRevisionDue,
  configureNotifications,
  getNotificationHistory,
  testNotification,
} from "./tools/notifications.js";

import {
  exportProgress,
  importProgress,
  compareProgress,
  generateShareableReport,
} from "./tools/collab.js";

import {
  getPlanInfo,
  reloadStudyPlan,
  validatePlan,
  addPhaseToPlan,
  addTopicToPlan,
  addProjectToPlan,
  snapshotCurrentPlan,
  listPlanSnapshots,
  exportPlanAsMarkdown,
  getResearchersInfo,
} from "./tools/plan-manager.js";

// Create the MCP server
const server = new McpServer({
  name: "study-companion",
  version: "3.0.0",
  description: "AI-powered study companion with dynamic JSON study plans, local LLM chat (Ollama), vector memory (ChromaDB), Google Calendar OAuth sync, paper summarization, mobile notifications, and collaborative tracking. Hybrid architecture: edit plans without rebuild.",
});

// ============================================
// PLANNER TOOLS
// ============================================

server.tool(
  "get_daily_plan",
  "Get today's personalized study plan based on current phase, day of week, and progress. Returns study blocks, revision items due, and project tasks.",
  {},
  async () => {
    const plan = getDailyPlan();
    return { content: [{ type: "text", text: JSON.stringify(plan, null, 2) }] };
  }
);

server.tool(
  "get_phase_status",
  "Get detailed status of the current learning phase including topic progress, project status, and deliverables.",
  {},
  async () => {
    const status = getPhaseStatus();
    return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
  }
);

server.tool(
  "get_roadmap",
  "View the complete multi-phase learning roadmap with all phases, topic counts, and deliverables.",
  {},
  async () => {
    const roadmap = getFullRoadmap();
    return { content: [{ type: "text", text: JSON.stringify(roadmap, null, 2) }] };
  }
);

server.tool(
  "mark_topic_complete",
  "Mark a topic as completed. Use get_phase_status to see available topic IDs.",
  { topic_id: z.string().describe("The ID of the topic to mark as complete (e.g., 'pytorch-deep', 'vaes', 'gcn')") },
  async ({ topic_id }) => {
    const result = markTopicComplete(topic_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "mark_milestone",
  "Mark a project milestone as complete. Use get_project_guidance to see milestone IDs.",
  {
    project_id: z.string().describe("The project ID (e.g., 'vae-from-scratch', 'gnn-from-scratch')"),
    milestone_id: z.string().describe("The milestone ID (e.g., 'vae-1', 'gnn-2')"),
  },
  async ({ project_id, milestone_id }) => {
    const result = markProjectMilestone(project_id, milestone_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "log_session",
  "Log a study session to track total hours and maintain your streak.",
  {
    hours: z.number().describe("Hours studied (can be decimal, e.g., 1.5)"),
    topic: z.string().describe("What you studied"),
    notes: z.string().optional().describe("Optional notes about the session"),
  },
  async ({ hours, topic, notes }) => {
    const result = logStudySession(hours, topic, notes);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "set_start_date",
  "Set the start date for your learning journey. Phase calculations use this as reference.",
  { date: z.string().describe("Start date in YYYY-MM-DD format") },
  async ({ date }) => {
    const result = setStartDate(date);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "override_phase",
  "Manually set your current phase (overrides time-based auto-detection).",
  { phase_id: z.string().describe("Phase ID: phase1-foundations, phase2-compbio, phase3-visibility, phase4-alignment, phase5-outreach") },
  async ({ phase_id }) => {
    const result = overridePhase(phase_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "clear_phase_override",
  "Remove manual phase override and return to time-based auto-detection.",
  {},
  async () => {
    const result = clearPhaseOverride();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// REVISION / SPACED REPETITION TOOLS
// ============================================

server.tool(
  "add_revision",
  "Add a concept to the spaced repetition system. Use this whenever you learn something important that you want to retain long-term.",
  {
    topic: z.string().describe("Topic area (e.g., 'VAEs', 'GNNs', 'linear-algebra')"),
    concept: z.string().describe("The concept or fact to remember (be specific and concise)"),
  },
  async ({ topic, concept }) => {
    const result = addRevisionItem(topic, concept);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "bulk_add_revisions",
  "Add multiple concepts to spaced repetition at once.",
  {
    topic: z.string().describe("Topic area for all items"),
    concepts: z.array(z.string()).describe("Array of concepts to add"),
  },
  async ({ topic, concepts }) => {
    const result = bulkAddRevisions(topic, concepts);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_revisions_due",
  "Get all revision items due for review today, plus upcoming items.",
  {},
  async () => {
    const result = getRevisionsDue();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "review_item",
  "Record a revision attempt. The SM-2 algorithm adjusts the next review interval based on difficulty.",
  {
    item_id: z.string().describe("The revision item ID"),
    difficulty: z.enum(["easy", "medium", "hard", "forgot"]).describe("How well you recalled: easy (perfect), medium (some effort), hard (barely), forgot (reset)"),
  },
  async ({ item_id, difficulty }) => {
    const result = reviewItem(item_id, difficulty);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "revision_stats",
  "Get statistics about your spaced repetition system: retention estimates, mature items, topic distribution.",
  {},
  async () => {
    const result = getRevisionStats();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// RESEARCH / PAPER TOOLS
// ============================================

server.tool(
  "add_paper",
  "Add a paper to your reading queue.",
  {
    title: z.string().describe("Paper title"),
    authors: z.string().describe("Authors"),
    url: z.string().optional().describe("URL to paper"),
    phase: z.string().optional().describe("Which phase this paper belongs to"),
    priority: z.number().optional().describe("Priority (lower = read sooner)"),
  },
  async ({ title, authors, url, phase, priority }) => {
    const result = addPaper(title, authors, url, phase, priority);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_paper_queue",
  "View your paper reading queue: what's next, currently reading, and completed count.",
  {},
  async () => {
    const result = getPaperQueue();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "start_paper",
  "Mark a paper as currently being read.",
  { paper_id: z.string().describe("The paper ID") },
  async ({ paper_id }) => {
    const result = startReadingPaper(paper_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "annotate_paper",
  "Add notes and architecture analysis to a paper. Follows the study plan's framework: input, representation, latent space, objective, uncertainty.",
  {
    paper_id: z.string().describe("The paper ID"),
    notes: z.string().optional().describe("General notes"),
    key_insights: z.array(z.string()).optional().describe("Key insights from the paper"),
    input: z.string().optional().describe("What is the input?"),
    representation: z.string().optional().describe("What is the representation?"),
    latent_space: z.string().optional().describe("What is the latent space?"),
    objective: z.string().optional().describe("What is the prediction objective?"),
    uncertainty_model: z.string().optional().describe("How is uncertainty modeled?"),
  },
  async ({ paper_id, notes, key_insights, input, representation, latent_space, objective, uncertainty_model }) => {
    const archNotes = (input || representation || latent_space || objective || uncertainty_model)
      ? { input, representation, latentSpace: latent_space, objective, uncertaintyModel: uncertainty_model }
      : undefined;
    const result = annotatePaper(paper_id, notes, key_insights, archNotes);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "complete_paper",
  "Mark a paper as completed with optional final insights.",
  {
    paper_id: z.string().describe("The paper ID"),
    key_insights: z.array(z.string()).optional().describe("Final key takeaways"),
  },
  async ({ paper_id, key_insights }) => {
    const result = completePaper(paper_id, key_insights);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_paper_notes",
  "Retrieve all notes and annotations for a specific paper.",
  { paper_id: z.string().describe("The paper ID") },
  async ({ paper_id }) => {
    const result = getPaperNotes(paper_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "search_papers",
  "Search through your paper database by title, author, or notes content.",
  { query: z.string().describe("Search query") },
  async ({ query }) => {
    const result = searchPapers(query);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// MEMORY / KNOWLEDGE TOOLS
// ============================================

server.tool(
  "save_insight",
  "Save a learning insight, question, connection, or breakthrough to your knowledge base. Use this liberally to build your second brain.",
  {
    content: z.string().describe("The insight or note content"),
    topic: z.string().describe("Related topic"),
    type: z.enum(["insight", "question", "connection", "implementation_note", "mistake", "breakthrough"]).describe("Type of memory"),
    tags: z.array(z.string()).optional().describe("Tags for retrieval"),
    related_topics: z.array(z.string()).optional().describe("Other topics this connects to"),
  },
  async ({ content, topic, type, tags, related_topics }) => {
    const result = saveInsight(content, topic, type, tags, related_topics);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "search_memory",
  "Search your knowledge base for past insights, questions, and notes.",
  {
    query: z.string().describe("Search query"),
    type: z.string().optional().describe("Filter by type: insight, question, connection, implementation_note, mistake, breakthrough"),
    topic: z.string().optional().describe("Filter by topic"),
  },
  async ({ query, type, topic }) => {
    const result = searchMemory(query, type, topic);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "recent_insights",
  "Get your most recent learning insights.",
  {
    count: z.number().optional().describe("Number of recent insights to retrieve (default: 10)"),
    type: z.string().optional().describe("Filter by type"),
  },
  async ({ count, type }) => {
    const result = getRecentInsights(count || 10, type);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_topic_notes",
  "Retrieve detailed notes for a specific topic.",
  { topic_id: z.string().describe("Topic ID") },
  async ({ topic_id }) => {
    const result = getTopicNotes(topic_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "update_topic_notes",
  "Create or update detailed notes for a topic (stored as markdown).",
  {
    topic_id: z.string().describe("Topic ID"),
    content: z.string().describe("Markdown content for the notes"),
  },
  async ({ topic_id, content }) => {
    const result = updateTopicNotes(topic_id, content);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "connection_map",
  "View how your knowledge topics interconnect based on saved insights.",
  { topic: z.string().optional().describe("Optional: focus on connections for a specific topic") },
  async ({ topic }) => {
    const result = getConnectionMap(topic);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "memory_stats",
  "Get statistics about your knowledge base: total memories, distribution by type and topic.",
  {},
  async () => {
    const result = getMemoryStats();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// MENTOR / PROJECT TOOLS
// ============================================

server.tool(
  "get_project_guidance",
  "Get mentoring guidance for your current project milestone. Includes tips, common mistakes, resources, and next steps.",
  {
    project_id: z.string().describe("Project ID (e.g., 'vae-from-scratch', 'gnn-from-scratch', 'scgen-reproduce')"),
    milestone_id: z.string().optional().describe("Specific milestone ID (defaults to current incomplete milestone)"),
  },
  async ({ project_id, milestone_id }) => {
    const result = getProjectGuidance(project_id, milestone_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_projects",
  "List all projects across all phases with their progress status.",
  {},
  async () => {
    const result = listProjects();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "weekly_report",
  "Get a comprehensive weekly report: hours, streak, progress, and personalized recommendations.",
  {},
  async () => {
    const result = getWeeklyReport();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// VECTOR MEMORY TOOLS (v1.1)
// ============================================

server.tool(
  "semantic_search",
  "Search your knowledge base using semantic similarity (TF-IDF + cosine). Finds concepts related to a query even if exact words don't match.",
  {
    query: z.string().describe("Natural language query to find related concepts"),
    top_k: z.number().optional().describe("Number of results to return (default: 10)"),
  },
  async ({ query, top_k }) => {
    const result = semanticSearch(query, top_k || 10);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "find_related_concepts",
  "Find concepts semantically related to a given concept using vector similarity. Great for discovering connections you didn't know existed.",
  {
    concept: z.string().describe("The concept to find related items for"),
    top_k: z.number().optional().describe("Number of related concepts to return (default: 8)"),
  },
  async ({ concept, top_k }) => {
    const result = findRelatedConcepts(concept, top_k || 8);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "rebuild_vector_index",
  "Rebuild the vector search index. Run this after adding many new insights.",
  {},
  async () => {
    const result = rebuildVectorIndex();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// ANALYTICS TOOLS (v1.2)
// ============================================

server.tool(
  "weekly_analytics",
  "Get weekly study hour charts and topic breakdowns. Visualizes your progress over recent weeks.",
  {
    weeks_back: z.number().optional().describe("Number of weeks to analyze (default: 4)"),
  },
  async ({ weeks_back }) => {
    const result = getWeeklyAnalytics(weeks_back || 4);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "monthly_analytics",
  "Get monthly study hour charts showing long-term trends.",
  {},
  async () => {
    const result = getMonthlyAnalytics();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "time_distribution",
  "Analyze how your study time is distributed across topics and days of the week.",
  {},
  async () => {
    const result = getTimeDistribution();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "predicted_completion",
  "Predict when you'll complete each phase based on your current pace. Shows velocity and estimated dates.",
  {},
  async () => {
    const result = getPredictedCompletion();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// EXTERNAL INTEGRATION TOOLS (v1.3)
// ============================================

server.tool(
  "github_activity",
  "Fetch and analyze your GitHub activity. Tracks contributions and identifies ML-relevant repos.",
  {
    username: z.string().describe("Your GitHub username"),
  },
  async ({ username }) => {
    const result = await fetchGitHubActivity(username);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "search_arxiv",
  "Search arXiv for papers by keyword, author, or topic. Highlights papers relevant to your research focus.",
  {
    query: z.string().describe("Search query (supports author, title, keywords)"),
    max_results: z.number().optional().describe("Maximum results to return (default: 10)"),
  },
  async ({ query, max_results }) => {
    const result = await searchArxiv(query, max_results || 10);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "fetch_lotfollahi_papers",
  "Fetch the latest papers from Mohammad Lotfollahi on arXiv.",
  {},
  async () => {
    const result = await fetchLotfollahiPapers();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "fetch_researcher_papers",
  "Fetch papers for any researcher configured in data/researchers.json. Defaults to primary researcher if no name given.",
  {
    researcher_name: z.string().optional().describe("Researcher name to search for (partial match). Omit to use primary researcher."),
  },
  async ({ researcher_name }) => {
    const result = await fetchResearcherPapers(researcher_name);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "draft_blog_post",
  "Generate a blog post draft structure from your notes and insights on a topic. Auto-populates from your knowledge base.",
  {
    topic: z.string().describe("Topic to write about"),
    style: z.enum(["tutorial", "paper-breakdown", "concept-explanation", "implementation-walkthrough"]).optional().describe("Blog post style (default: concept-explanation)"),
  },
  async ({ topic, style }) => {
    const result = draftBlogPost(topic, style || "concept-explanation");
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// MULTI-AGENT TOOLS (v1.4)
// ============================================

server.tool(
  "review_code",
  "Code reviewer agent: Analyzes your code for ML-specific issues, best practices, and portfolio quality. Designed for PyTorch/ML code.",
  {
    code: z.string().describe("The code to review"),
    context: z.string().describe("What this code is for (e.g., 'VAE encoder', 'GNN message passing')"),
    language: z.string().optional().describe("Programming language (default: python)"),
  },
  async ({ code, context, language }) => {
    const result = reviewCode(code, context, language || "python");
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "generate_quiz",
  "Quiz master agent: Generates quiz questions from your SRS items and knowledge base for active recall testing.",
  {
    topic: z.string().optional().describe("Focus topic for the quiz (optional, defaults to mixed)"),
    count: z.number().optional().describe("Number of questions (default: 5)"),
    difficulty: z.string().optional().describe("Difficulty filter: easy, medium, hard"),
  },
  async ({ topic, count, difficulty }) => {
    const result = generateQuiz(topic, count || 5, difficulty);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "research_scout",
  "Research scout agent: Recommends new papers, researchers, and search queries based on your activity and focus area.",
  {
    focus_area: z.string().optional().describe("Specific research area to scout (optional, auto-detected from your activity)"),
  },
  async ({ focus_area }) => {
    const result = scoutNewResearch(focus_area);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// GOOGLE CALENDAR TOOLS
// ============================================

server.tool(
  "schedule_study_sessions",
  "Generate study sessions for the upcoming days based on your schedule template and current phase. Outputs Google Calendar-compatible events.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    days_ahead: z.number().optional().describe("Number of days to schedule (default: 7)"),
    topics: z.array(z.string()).optional().describe("Custom topics to focus on (optional, auto-detected from phase)"),
  },
  async ({ start_date, days_ahead, topics }) => {
    const result = scheduleStudySessions(start_date, days_ahead || 7, topics);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "update_schedule_template",
  "Update your weekly study schedule template (weekday or weekend time slots).",
  {
    day_type: z.enum(["weekday", "weekend"]).describe("Which template to update"),
    slots: z.array(z.object({
      startHour: z.number().describe("Start hour (24h format, decimals OK, e.g. 20.5 = 8:30 PM)"),
      endHour: z.number().describe("End hour (24h format)"),
      activity: z.string().describe("Activity description"),
    })).describe("Array of time slots"),
  },
  async ({ day_type, slots }) => {
    const result = updateScheduleTemplate(day_type, slots);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "next_study_session",
  "Get your next upcoming scheduled study session.",
  {},
  async () => {
    const result = getNextStudySession();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "create_calendar_event",
  "Create a single Google Calendar event for a study session. Returns event data compatible with Google Calendar MCP.",
  {
    title: z.string().describe("Event title"),
    date: z.string().describe("Date in YYYY-MM-DD format"),
    start_hour: z.number().describe("Start hour (24h, decimals OK, e.g. 20.5 = 8:30 PM)"),
    duration_minutes: z.number().describe("Duration in minutes"),
    description: z.string().optional().describe("Event description"),
  },
  async ({ title, date, start_hour, duration_minutes, description }) => {
    const result = createCalendarEvent(title, date, start_hour, duration_minutes, description);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "weekly_schedule_overview",
  "View your current weekly schedule template with time allocations.",
  {},
  async () => {
    const result = getWeeklyScheduleOverview();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// OLLAMA LLM TOOLS (v2.0)
// ============================================

server.tool(
  "ollama_status",
  "Check if Ollama is running and which models are installed. Shows setup instructions if not configured.",
  {},
  async () => {
    const result = await checkOllamaStatus();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "configure_ollama",
  "Configure Ollama settings: model, temperature, base URL, max tokens.",
  {
    chat_model: z.string().optional().describe("Chat model (e.g., 'llama3.1:8b', 'mistral:7b', 'gemma2:2b')"),
    embed_model: z.string().optional().describe("Embedding model (e.g., 'nomic-embed-text')"),
    temperature: z.number().optional().describe("Generation temperature (0-1, default: 0.7)"),
    base_url: z.string().optional().describe("Ollama server URL (default: http://localhost:11434)"),
  },
  async ({ chat_model, embed_model, temperature, base_url }) => {
    const updates: Record<string, any> = {};
    if (chat_model) updates.chatModel = chat_model;
    if (embed_model) updates.embedModel = embed_model;
    if (temperature !== undefined) updates.temperature = temperature;
    if (base_url) updates.baseUrl = base_url;
    const result = configureOllama(updates);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// STUDY CHAT TOOLS (v2.0)
// ============================================

server.tool(
  "study_chat",
  "Chat with your AI study companion (Astra). Powered by local Ollama with RAG context from your knowledge base. Remembers past conversations via ChromaDB.",
  {
    message: z.string().describe("Your message to the study companion"),
    session_id: z.string().optional().describe("Continue a specific chat session"),
    use_context: z.boolean().optional().describe("Use knowledge base context (default: true)"),
    model: z.string().optional().describe("Override chat model for this message"),
  },
  async ({ message, session_id, use_context, model }) => {
    const result = await studyChat(message, { sessionId: session_id, useContext: use_context, model });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "ask_knowledge_base",
  "Ask a question answered ONLY from your stored knowledge (insights, sessions, notes). Pure RAG — no hallucination, just your own data.",
  {
    question: z.string().describe("Question to answer from your knowledge base"),
  },
  async ({ question }) => {
    const result = await askContextQuestion(question);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "chat_sessions",
  "List your chat sessions with the study companion.",
  {
    limit: z.number().optional().describe("Number of sessions to show (default: 10)"),
  },
  async ({ limit }) => {
    const result = await getChatSessions(limit || 10);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "search_chats",
  "Search through past conversations with the study companion using semantic search.",
  {
    query: z.string().describe("Search query"),
    limit: z.number().optional().describe("Max results (default: 10)"),
  },
  async ({ query, limit }) => {
    const result = await searchPastChats(query, limit || 10);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "new_chat_session",
  "Start a fresh chat session with the study companion.",
  {},
  async () => {
    const result = startNewChatSession();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// VECTOR DB TOOLS (v2.0)
// ============================================

server.tool(
  "vectordb_status",
  "Check ChromaDB connection status and collection statistics.",
  {},
  async () => {
    const result = await checkVectorDBStatus();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "index_insights",
  "Index all your knowledge base insights into ChromaDB with Ollama embeddings for semantic search.",
  {},
  async () => {
    const result = await indexAllInsights();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "deep_semantic_search",
  "Search insights using Ollama LLM embeddings via ChromaDB. More accurate than TF-IDF.",
  {
    query: z.string().describe("Natural language search query"),
    top_k: z.number().optional().describe("Results to return (default: 8)"),
    topic: z.string().optional().describe("Filter by topic"),
  },
  async ({ query, top_k, topic }) => {
    const result = await semanticSearchInsights(query, top_k || 8, topic);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "configure_vectordb",
  "Configure ChromaDB connection settings.",
  {
    chroma_url: z.string().optional().describe("ChromaDB server URL (default: http://localhost:8000)"),
  },
  async ({ chroma_url }) => {
    const result = configureVectorDB(chroma_url ? { chromaUrl: chroma_url } : {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// GOOGLE CALENDAR OAUTH TOOLS (v2.0)
// ============================================

server.tool(
  "gcal_auth",
  "Start Google Calendar OAuth authentication. Returns a URL to authorize access.",
  {},
  async () => {
    const result = getAuthUrl();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "gcal_auth_callback",
  "Complete Google Calendar OAuth by providing the authorization code.",
  {
    code: z.string().describe("The authorization code from Google OAuth redirect"),
  },
  async ({ code }) => {
    const result = await handleAuthCallback(code);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "gcal_sync",
  "Sync study sessions directly to your Google Calendar in real-time.",
  {
    sessions: z.array(z.object({
      title: z.string(),
      description: z.string(),
      startTime: z.string().describe("ISO datetime"),
      endTime: z.string().describe("ISO datetime"),
      type: z.string().describe("study|revision|project|paper|blog"),
    })).describe("Sessions to sync"),
  },
  async ({ sessions }) => {
    const result = await syncStudySessions(sessions);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "gcal_upcoming",
  "List upcoming events from your Google Calendar.",
  {
    max_results: z.number().optional().describe("Max events to show (default: 10)"),
  },
  async ({ max_results }) => {
    const result = await listUpcomingEvents(max_results || 10);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "gcal_quick_add",
  "Quickly add an event to Google Calendar using natural language (e.g., 'Study VAEs tomorrow 8pm for 2 hours').",
  {
    text: z.string().describe("Natural language event description"),
  },
  async ({ text }) => {
    const result = await quickAddEvent(text);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "gcal_delete_synced",
  "Delete previously synced study sessions from Google Calendar.",
  {
    event_ids: z.array(z.string()).optional().describe("Specific event IDs to delete (default: all synced)"),
  },
  async ({ event_ids }) => {
    const result = await deleteStudyEvents(event_ids);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "configure_gcal",
  "Configure Google Calendar settings (timezone, colors, reminders).",
  {
    calendar_id: z.string().optional().describe("Calendar ID (default: 'primary')"),
    time_zone: z.string().optional().describe("Timezone (default: 'Asia/Kolkata')"),
    reminder_minutes: z.number().optional().describe("Popup reminder minutes before event"),
  },
  async ({ calendar_id, time_zone, reminder_minutes }) => {
    const updates: Record<string, any> = {};
    if (calendar_id) updates.calendarId = calendar_id;
    if (time_zone) updates.timeZone = time_zone;
    if (reminder_minutes) updates.reminderMinutes = reminder_minutes;
    const result = configureGCal(updates);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// PAPER SUMMARIZATION TOOLS (v2.0)
// ============================================

server.tool(
  "summarize_paper",
  "Auto-summarize a paper from your reading queue using local Ollama LLM. Generates key insights, methodology, and relevance analysis.",
  {
    paper_id: z.string().describe("Paper ID from your reading queue"),
  },
  async ({ paper_id }) => {
    const result = await summarizePaper(paper_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "analyze_abstract",
  "Quick analysis of a paper from its abstract. Tells you if it's worth a full read.",
  {
    title: z.string().describe("Paper title"),
    abstract: z.string().describe("Paper abstract text"),
    authors: z.string().optional().describe("Authors"),
  },
  async ({ title, abstract, authors }) => {
    const result = await summarizeFromAbstract(title, abstract, authors);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "paper_study_material",
  "Generate quiz questions and spaced repetition items from a paper using Ollama.",
  {
    paper_id: z.string().describe("Paper ID"),
  },
  async ({ paper_id }) => {
    const result = await generateKeyInsightsFromPaper(paper_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "compare_papers",
  "Compare multiple papers side-by-side using Ollama analysis.",
  {
    paper_ids: z.array(z.string()).describe("Array of paper IDs to compare (minimum 2)"),
  },
  async ({ paper_ids }) => {
    const result = await comparePapers(paper_ids);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// NOTIFICATION TOOLS (v2.0)
// ============================================

server.tool(
  "send_notification",
  "Send a push notification to your phone via ntfy.sh (free, no account needed).",
  {
    title: z.string().describe("Notification title"),
    message: z.string().describe("Notification body"),
    priority: z.number().optional().describe("Priority 1-5 (default: 3)"),
  },
  async ({ title, message, priority }) => {
    const result = await sendNotification(title, message, { priority });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "test_notification",
  "Send a test notification to verify your phone is connected.",
  {},
  async () => {
    const result = await testNotification();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "configure_notifications",
  "Configure push notification settings: topic, quiet hours, priority.",
  {
    topic: z.string().optional().describe("ntfy topic name (your unique channel)"),
    enabled: z.boolean().optional().describe("Enable/disable notifications"),
    quiet_hours_start: z.number().optional().describe("Quiet hours start (24h format)"),
    quiet_hours_end: z.number().optional().describe("Quiet hours end (24h format)"),
    server_url: z.string().optional().describe("ntfy server URL (default: https://ntfy.sh)"),
  },
  async ({ topic, enabled, quiet_hours_start, quiet_hours_end, server_url }) => {
    const updates: Record<string, any> = {};
    if (topic) updates.topic = topic;
    if (enabled !== undefined) updates.enabled = enabled;
    if (quiet_hours_start !== undefined) updates.quietHoursStart = quiet_hours_start;
    if (quiet_hours_end !== undefined) updates.quietHoursEnd = quiet_hours_end;
    if (server_url) updates.serverUrl = server_url;
    const result = configureNotifications(updates);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "notification_history",
  "View recently sent notifications.",
  {
    limit: z.number().optional().describe("Max notifications to show (default: 20)"),
  },
  async ({ limit }) => {
    const result = getNotificationHistory(limit || 20);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// COLLABORATION TOOLS (v2.0)
// ============================================

server.tool(
  "export_progress",
  "Export your study progress as a shareable snapshot.",
  {
    user_name: z.string().optional().describe("Your name for the export"),
  },
  async ({ user_name }) => {
    const result = exportProgress(user_name);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "import_progress",
  "Import a study partner's progress snapshot for comparison.",
  {
    snapshot_json: z.string().describe("JSON string of the progress snapshot"),
  },
  async ({ snapshot_json }) => {
    const result = importProgress(snapshot_json);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "compare_progress",
  "Compare your progress with an imported study partner's data.",
  {
    other_user: z.string().optional().describe("Name of the user to compare against"),
  },
  async ({ other_user }) => {
    const result = compareProgress(other_user);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "shareable_report",
  "Generate a markdown progress report you can share on GitHub, LinkedIn, etc.",
  {},
  async () => {
    const result = generateShareableReport();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// PLAN MANAGEMENT TOOLS (v3.0)
// ============================================

server.tool(
  "plan_info",
  "Get info about the currently loaded study plan: name, version, phases, topics, and projects.",
  {},
  async () => {
    const result = getPlanInfo();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "reload_plan",
  "Reload the study plan from data/study-plan.json. Use after editing the JSON file to apply changes without restarting.",
  {},
  async () => {
    const result = reloadStudyPlan();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "validate_plan",
  "Validate the study plan JSON for schema correctness, duplicate IDs, phase overlaps, and reference integrity.",
  {},
  async () => {
    const result = validatePlan();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "add_phase",
  "Add a new phase to the study plan. Automatically snapshots before modification.",
  {
    id: z.string().describe("Phase ID (e.g., 'phase6-advanced')"),
    name: z.string().describe("Phase display name"),
    month_start: z.number().describe("Start month number"),
    month_end: z.number().describe("End month number"),
    description: z.string().describe("Phase description"),
  },
  async ({ id, name, month_start, month_end, description }) => {
    const result = addPhaseToPlan(id, name, month_start, month_end, description);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "add_topic",
  "Add a new topic to an existing phase. Automatically snapshots before modification.",
  {
    phase_id: z.string().describe("Phase ID to add the topic to"),
    topic_id: z.string().describe("Unique topic ID"),
    name: z.string().describe("Topic display name"),
    priority: z.enum(["critical", "high", "medium", "low"]).describe("Topic priority"),
    subtopics: z.array(z.string()).describe("List of subtopics"),
  },
  async ({ phase_id, topic_id, name, priority, subtopics }) => {
    const result = addTopicToPlan(phase_id, topic_id, name, priority, subtopics);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "add_project",
  "Add a new project to an existing phase with milestones. Automatically snapshots before modification.",
  {
    phase_id: z.string().describe("Phase ID to add the project to"),
    project_id: z.string().describe("Unique project ID"),
    name: z.string().describe("Project display name"),
    description: z.string().describe("Project description"),
    milestones: z.array(z.object({
      id: z.string().describe("Milestone ID"),
      description: z.string().describe("Milestone description"),
    })).describe("List of milestones for the project"),
  },
  async ({ phase_id, project_id, name, description, milestones }) => {
    const result = addProjectToPlan(phase_id, project_id, name, description, milestones);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "snapshot_plan",
  "Create a timestamped backup of the current study plan.",
  {
    label: z.string().optional().describe("Optional label for the snapshot (e.g., 'before-restructure')"),
  },
  async ({ label }) => {
    const result = snapshotCurrentPlan(label);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_plan_snapshots",
  "List all saved study plan snapshots/backups.",
  {},
  async () => {
    const result = listPlanSnapshots();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "export_plan_markdown",
  "Export the current study plan as a formatted markdown document.",
  {},
  async () => {
    const result = exportPlanAsMarkdown();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "researchers_info",
  "View configured researchers, search recommendations, and arXiv queries from data/researchers.json.",
  {},
  async () => {
    const result = getResearchersInfo();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Study Companion MCP server v3.0.0 running on stdio");
  console.error("Hybrid architecture: JSON study plans + Plan Engine");
  console.error("Local AI: Ollama | Vector DB: ChromaDB | Notifications: ntfy.sh");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
