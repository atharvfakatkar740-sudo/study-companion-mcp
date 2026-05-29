import { loadJSON, saveJSON } from "../utils/storage.js";
import { ollamaChat, getStudyCompanionSystem } from "./ollama.js";
import {
  storeChatMessage,
  searchChatHistory,
  getRelevantContext,
  storeStudySessionVector,
} from "./vectordb.js";

// ============================================
// v2.0 — RAG-Powered Study Companion Chat
// Human-like conversational AI with persistent memory
// ============================================

interface ChatSession {
  id: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  topics: string[];
  summary?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// In-memory buffer for current session (flushed to ChromaDB periodically)
let currentSessionId: string | null = null;
let sessionMessages: ChatMessage[] = [];

function getOrCreateSession(): string {
  if (!currentSessionId) {
    currentSessionId = `session-${Date.now()}`;
    sessionMessages = [];

    // Track sessions
    const sessions = loadJSON<ChatSession[]>("chat-sessions.json", []);
    sessions.push({
      id: currentSessionId,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
      topics: [],
    });
    if (sessions.length > 100) sessions.shift();
    saveJSON("chat-sessions.json", sessions);
  }
  return currentSessionId;
}

function updateSessionMeta(topics: string[] = []): void {
  if (!currentSessionId) return;
  const sessions = loadJSON<ChatSession[]>("chat-sessions.json", []);
  const session = sessions.find((s) => s.id === currentSessionId);
  if (session) {
    session.lastMessageAt = new Date().toISOString();
    session.messageCount = sessionMessages.length;
    for (const t of topics) {
      if (!session.topics.includes(t)) session.topics.push(t);
    }
    saveJSON("chat-sessions.json", sessions);
  }
}

// --- Main Chat Function ---

export async function studyChat(
  message: string,
  options?: { sessionId?: string; useContext?: boolean; model?: string }
): Promise<object> {
  const sessionId = options?.sessionId || getOrCreateSession();
  const useContext = options?.useContext !== false; // Default: true

  // 1. Store user message in vector DB
  try {
    await storeChatMessage("user", message, sessionId);
  } catch {
    // ChromaDB might not be running, continue anyway with local buffer
  }

  // Add to local buffer
  sessionMessages.push({
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  });

  // 2. Retrieve relevant context from knowledge base
  let context = "";
  let contextSources = 0;
  if (useContext) {
    try {
      context = await getRelevantContext(message);
      contextSources = (context.match(/---/g) || []).length;
    } catch {
      // ChromaDB not available, fallback to no context
    }
  }

  // 3. Build messages array with context injection
  const systemPrompt = buildSystemPrompt(context);
  const recentMessages = sessionMessages.slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 4. Get response from Ollama
  let response: string;
  let model: string;
  let duration: number | undefined;

  try {
    const result = await ollamaChat(recentMessages, {
      system: systemPrompt,
      model: options?.model,
    });
    response = result.response;
    model = result.model;
    duration = result.totalDuration;
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
      hint: err.message.includes("not running")
        ? "Start Ollama with: ollama serve"
        : "Check Ollama status with the ollama_status tool.",
    };
  }

  // 5. Store assistant response
  sessionMessages.push({
    role: "assistant",
    content: response,
    timestamp: new Date().toISOString(),
  });

  try {
    await storeChatMessage("assistant", response, sessionId);
  } catch {
    // ChromaDB not available
  }

  // 6. Detect topics mentioned
  const detectedTopics = detectTopics(message + " " + response);
  updateSessionMeta(detectedTopics);

  return {
    response,
    sessionId,
    model,
    responseTimeMs: duration,
    contextUsed: contextSources > 0,
    contextSources,
    messageNumber: sessionMessages.length,
    detectedTopics: detectedTopics.length > 0 ? detectedTopics : undefined,
  };
}

// --- Context-Based Q&A ---

export async function askContextQuestion(question: string): Promise<object> {
  // Pure RAG: retrieve context, let Ollama answer based solely on stored knowledge
  let context: string;
  try {
    context = await getRelevantContext(question, 12);
  } catch (err: any) {
    return {
      error: true,
      message: "ChromaDB not available. Run: chroma run --host localhost --port 8000",
    };
  }

  if (context.includes("No relevant context found")) {
    return {
      answer: "I don't have enough stored knowledge to answer this yet. Keep logging insights and study sessions!",
      context: "empty",
      suggestion: "Use save_insight to store what you learn, then I'll be able to answer context questions.",
    };
  }

  const prompt = `Based ONLY on the following context from the student's knowledge base, answer their question. If the context doesn't contain enough information, say so honestly.

CONTEXT:
${context}

QUESTION: ${question}

Answer naturally and helpfully, citing specific insights from the context when possible:`;

  try {
    const response = await ollamaChat(
      [{ role: "user", content: prompt }],
      {
        system: "You are a study companion answering questions based on the student's own notes and insights. Be specific and reference their past learning.",
        temperature: 0.3, // Lower temperature for factual retrieval
      }
    );

    return {
      answer: response.response,
      question,
      contextUsed: context,
      model: response.model,
      note: "Answer based on your stored knowledge base. Accuracy depends on what you've logged.",
    };
  } catch (err: any) {
    return { error: true, message: err.message };
  }
}

// --- Chat History & Sessions ---

export async function getChatSessions(limit: number = 10): Promise<object> {
  const sessions = loadJSON<ChatSession[]>("chat-sessions.json", []);
  const recent = sessions.slice(-limit).reverse();

  return {
    sessions: recent,
    total: sessions.length,
    currentSession: currentSessionId,
    tip: "Use study_chat with a session_id to continue a previous conversation.",
  };
}

export async function searchPastChats(query: string, limit: number = 10): Promise<object> {
  try {
    const results = await searchChatHistory(query, limit);
    return {
      query,
      ...results,
      note: "Results ranked by semantic similarity using Ollama embeddings.",
    };
  } catch (err: any) {
    return {
      error: true,
      message: "ChromaDB not available for chat search.",
      fallback: "Chat history is also stored locally in chat-sessions.json",
    };
  }
}

export function startNewChatSession(): object {
  // Save summary of old session if it exists
  if (currentSessionId && sessionMessages.length > 0) {
    const sessions = loadJSON<ChatSession[]>("chat-sessions.json", []);
    const session = sessions.find((s) => s.id === currentSessionId);
    if (session) {
      session.summary = `${session.messageCount} messages about: ${session.topics.join(", ") || "general study"}`;
      saveJSON("chat-sessions.json", sessions);
    }
  }

  currentSessionId = null;
  sessionMessages = [];
  const newId = getOrCreateSession();

  return {
    sessionId: newId,
    message: "New chat session started. I'm ready to help with your studies!",
    persona: "Astra — your AI study companion",
  };
}

// --- Helpers ---

function buildSystemPrompt(context: string): string {
  const base = getStudyCompanionSystem();

  if (!context || context.includes("No relevant context found")) {
    return base;
  }

  return `${base}

IMPORTANT — The following is relevant context from the student's knowledge base. Use it to personalize your response and reference their past learning:

${context}

When referencing stored knowledge, be natural about it (e.g., "Remember when you noted that..." or "Building on your insight about...").`;
}

function detectTopics(text: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    VAEs: ["vae", "variational", "elbo", "latent", "encoder", "decoder", "kl divergence", "reparameterization"],
    GNNs: ["gnn", "graph neural", "message passing", "gcn", "gat", "node embedding", "adjacency"],
    "Single-Cell": ["single-cell", "scrna", "gene expression", "perturbation", "scgen", "cell type"],
    PyTorch: ["pytorch", "tensor", "autograd", "nn.module", "dataloader", "optimizer"],
    "Linear Algebra": ["matrix", "eigenvalue", "svd", "projection", "vector space", "linear transform"],
    Probability: ["probability", "bayesian", "distribution", "likelihood", "posterior", "prior"],
    Transformers: ["transformer", "attention", "self-attention", "positional encoding", "bert", "gpt"],
    "Foundation Models": ["foundation model", "pretrained", "fine-tune", "transfer learning", "geneformer", "scgpt"],
  };

  const lower = text.toLowerCase();
  const detected: string[] = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      detected.push(topic);
    }
  }

  return detected;
}
