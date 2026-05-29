import { ChromaClient, Collection } from "chromadb";
import { loadJSON, saveJSON } from "../utils/storage.js";
import { ollamaEmbed } from "./ollama.js";
import { MemoryEntry } from "../utils/types.js";

// ============================================
// v2.0 — ChromaDB Vector Database (100% Free, Local)
// Persistent semantic memory for RAG-powered chat
// ============================================

interface VectorDBConfig {
  chromaUrl: string;
  collections: {
    chat: string;
    insights: string;
    sessions: string;
    papers: string;
  };
}

const DEFAULT_CONFIG: VectorDBConfig = {
  chromaUrl: "http://localhost:8000",
  collections: {
    chat: "study-chat-history",
    insights: "study-insights",
    sessions: "study-sessions",
    papers: "study-papers",
  },
};

function getConfig(): VectorDBConfig {
  return loadJSON<VectorDBConfig>("vectordb-config.json", DEFAULT_CONFIG);
}

let _client: ChromaClient | null = null;

function getClient(): ChromaClient {
  if (!_client) {
    const config = getConfig();
    _client = new ChromaClient({ path: config.chromaUrl });
  }
  return _client;
}

async function getOrCreateCollection(name: string): Promise<Collection> {
  const client = getClient();
  return await client.getOrCreateCollection({ name });
}

// --- Store & Retrieve ---

export async function storeDocument(
  collectionName: string,
  id: string,
  text: string,
  metadata: Record<string, string | number | boolean>
): Promise<void> {
  const collection = await getOrCreateCollection(collectionName);
  const embeddings = await ollamaEmbed(text);

  await collection.add({
    ids: [id],
    embeddings: embeddings,
    documents: [text],
    metadatas: [metadata],
  });
}

export async function queryDocuments(
  collectionName: string,
  queryText: string,
  nResults: number = 5,
  whereFilter?: Record<string, string | number | boolean>
): Promise<{
  ids: string[];
  documents: string[];
  metadatas: Record<string, any>[];
  distances: number[];
}> {
  const collection = await getOrCreateCollection(collectionName);
  const queryEmbedding = await ollamaEmbed(queryText);

  const results = await collection.query({
    queryEmbeddings: queryEmbedding,
    nResults,
    where: whereFilter as any,
  });

  return {
    ids: (results.ids?.[0] || []) as string[],
    documents: (results.documents?.[0] || []) as string[],
    metadatas: (results.metadatas?.[0] || []) as Record<string, any>[],
    distances: (results.distances?.[0] || []) as number[],
  };
}

// --- Chat History Storage ---

export async function storeChatMessage(
  role: "user" | "assistant",
  content: string,
  sessionId: string,
  metadata?: Record<string, string | number | boolean>
): Promise<string> {
  const config = getConfig();
  const msgId = `chat-${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await storeDocument(config.collections.chat, msgId, content, {
    role,
    sessionId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });

  return msgId;
}

export async function searchChatHistory(
  query: string,
  nResults: number = 10,
  sessionId?: string
): Promise<object> {
  const config = getConfig();
  const filter = sessionId ? { sessionId } : undefined;

  const results = await queryDocuments(
    config.collections.chat,
    query,
    nResults,
    filter as any
  );

  return {
    messages: results.ids.map((id, i) => ({
      id,
      content: results.documents[i],
      role: results.metadatas[i]?.role,
      sessionId: results.metadatas[i]?.sessionId,
      timestamp: results.metadatas[i]?.timestamp,
      relevance: results.distances[i] ? Math.round((1 - results.distances[i]) * 1000) / 1000 : undefined,
    })),
    total: results.ids.length,
  };
}

// --- Study Insight Indexing ---

export async function indexAllInsights(): Promise<object> {
  const config = getConfig();
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);

  if (memories.length === 0) {
    return { indexed: 0, message: "No insights to index." };
  }

  const collection = await getOrCreateCollection(config.collections.insights);

  // Batch process for efficiency
  const batchSize = 20;
  let indexed = 0;

  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    const texts = batch.map(
      (m) => `${m.content} | Topic: ${m.topic} | Tags: ${m.tags.join(", ")} | Related: ${(m.relatedTopics || []).join(", ")}`
    );

    const embeddings = await ollamaEmbed(texts);

    await collection.add({
      ids: batch.map((m) => m.id),
      embeddings,
      documents: texts,
      metadatas: batch.map((m) => ({
        topic: m.topic,
        type: m.type,
        tags: m.tags.join(","),
        timestamp: m.timestamp,
      })),
    });

    indexed += batch.length;
  }

  return {
    indexed,
    collection: config.collections.insights,
    message: `Indexed ${indexed} insights into ChromaDB with Ollama embeddings.`,
  };
}

export async function semanticSearchInsights(
  query: string,
  nResults: number = 8,
  topicFilter?: string
): Promise<object> {
  const config = getConfig();
  const filter = topicFilter ? { topic: topicFilter } : undefined;

  const results = await queryDocuments(
    config.collections.insights,
    query,
    nResults,
    filter as any
  );

  return {
    query,
    results: results.ids.map((id, i) => ({
      id,
      content: results.documents[i],
      topic: results.metadatas[i]?.topic,
      type: results.metadatas[i]?.type,
      relevance: results.distances[i] ? Math.round((1 - results.distances[i]) * 1000) / 1000 : undefined,
    })),
    total: results.ids.length,
    note: "Using Ollama nomic-embed-text embeddings (768-dim) via ChromaDB",
  };
}

// --- Study Session Storage ---

export async function storeStudySessionVector(
  hours: number,
  topic: string,
  notes: string,
  insights?: string[]
): Promise<object> {
  const config = getConfig();
  const sessionId = `session-${Date.now()}`;
  const text = `Studied ${topic} for ${hours}h. ${notes} ${insights ? "Insights: " + insights.join("; ") : ""}`;

  await storeDocument(config.collections.sessions, sessionId, text, {
    hours,
    topic,
    date: new Date().toISOString().split("T")[0],
    timestamp: new Date().toISOString(),
  });

  return {
    stored: true,
    sessionId,
    message: `Study session stored in vector DB for future context retrieval.`,
  };
}

// --- Context Retrieval for RAG ---

export async function getRelevantContext(
  query: string,
  maxChunks: number = 8
): Promise<string> {
  const config = getConfig();
  const contextParts: string[] = [];

  // Search across all collections
  const collections = [
    { name: config.collections.insights, label: "Knowledge Base" },
    { name: config.collections.chat, label: "Past Conversations" },
    { name: config.collections.sessions, label: "Study Sessions" },
  ];

  for (const col of collections) {
    try {
      const results = await queryDocuments(col.name, query, Math.ceil(maxChunks / 3));
      if (results.documents.length > 0) {
        contextParts.push(`--- ${col.label} ---`);
        for (const doc of results.documents) {
          if (doc) contextParts.push(`• ${doc}`);
        }
      }
    } catch {
      // Collection might not exist yet, skip
    }
  }

  return contextParts.length > 0
    ? contextParts.join("\n")
    : "No relevant context found in your knowledge base yet. Keep studying and logging insights!";
}

// --- Status & Config ---

export async function checkVectorDBStatus(): Promise<object> {
  const config = getConfig();

  try {
    const client = getClient();
    const heartbeat = await client.heartbeat();
    const collections = await client.listCollections();

    const collectionStats: Record<string, number> = {};
    for (const col of collections) {
      try {
        const colName: string = (col as any).name ?? (col as string);
        const c = await client.getOrCreateCollection({ name: colName });
        collectionStats[colName] = await c.count();
      } catch {
        // skip
      }
    }

    return {
      status: "connected",
      chromaUrl: config.chromaUrl,
      heartbeat,
      collections: collectionStats,
      totalDocuments: Object.values(collectionStats).reduce((a, b) => a + b, 0),
    };
  } catch (err: any) {
    return {
      status: "disconnected",
      error: err.message,
      setup: {
        option1_pip: {
          install: "pip install chromadb",
          run: "chroma run --host localhost --port 8000",
        },
        option2_docker: {
          run: "docker run -p 8000:8000 chromadb/chroma",
        },
        note: "ChromaDB is 100% free and open source. All data stays on your machine.",
      },
    };
  }
}

export function configureVectorDB(updates: Partial<VectorDBConfig>): object {
  const config = getConfig();
  const newConfig = { ...config, ...updates };
  saveJSON("vectordb-config.json", newConfig);
  _client = null; // Reset client to pick up new config
  return { message: "Vector DB configuration updated.", config: newConfig };
}
