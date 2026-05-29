import { loadJSON, saveJSON } from "../utils/storage.js";
import { MemoryEntry } from "../utils/types.js";

// ============================================
// v1.1 — Vector Memory: TF-IDF + Cosine Similarity
// ============================================

interface VectorIndex {
  vocabulary: Record<string, number>; // word -> index
  idfScores: Record<string, number>; // word -> IDF
  documentVectors: Record<string, number[]>; // memoryId -> TF-IDF vector
  lastUpdated: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .filter((t) => !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
  "was", "one", "our", "out", "had", "has", "his", "how", "its", "may",
  "new", "now", "old", "see", "way", "who", "did", "get", "let", "say",
  "she", "too", "use", "that", "this", "with", "have", "from", "they",
  "been", "will", "each", "make", "like", "than", "them", "then",
  "what", "when", "which", "would", "there", "their", "about", "could",
  "other", "into", "more", "some", "very", "just", "also", "should",
]);

function computeTF(tokens: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }
  const max = Math.max(...Object.values(freq), 1);
  const tf: Record<string, number> = {};
  for (const [word, count] of Object.entries(freq)) {
    tf[word] = 0.5 + 0.5 * (count / max); // augmented TF
  }
  return tf;
}

function computeIDF(documents: string[][]): Record<string, number> {
  const N = documents.length;
  const docFreq: Record<string, number> = {};
  for (const doc of documents) {
    const uniqueWords = new Set(doc);
    for (const word of uniqueWords) {
      docFreq[word] = (docFreq[word] || 0) + 1;
    }
  }
  const idf: Record<string, number> = {};
  for (const [word, df] of Object.entries(docFreq)) {
    idf[word] = Math.log((N + 1) / (df + 1)) + 1; // smoothed IDF
  }
  return idf;
}

function vectorize(tf: Record<string, number>, idf: Record<string, number>, vocab: string[]): number[] {
  return vocab.map((word) => (tf[word] || 0) * (idf[word] || 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function buildIndex(): VectorIndex {
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);
  if (memories.length === 0) {
    return { vocabulary: {}, idfScores: {}, documentVectors: {}, lastUpdated: new Date().toISOString() };
  }

  // Tokenize all documents
  const tokenizedDocs: Record<string, string[]> = {};
  for (const mem of memories) {
    const text = `${mem.content} ${mem.topic} ${mem.tags.join(" ")} ${(mem.relatedTopics || []).join(" ")}`;
    tokenizedDocs[mem.id] = tokenize(text);
  }

  // Compute IDF
  const allDocs = Object.values(tokenizedDocs);
  const idf = computeIDF(allDocs);

  // Build vocabulary (top terms by document frequency)
  const vocab = Object.keys(idf).sort((a, b) => idf[b] - idf[a]).slice(0, 500);
  const vocabIndex: Record<string, number> = {};
  vocab.forEach((w, i) => (vocabIndex[w] = i));

  // Vectorize each document
  const vectors: Record<string, number[]> = {};
  for (const [id, tokens] of Object.entries(tokenizedDocs)) {
    const tf = computeTF(tokens);
    vectors[id] = vectorize(tf, idf, vocab);
  }

  const index: VectorIndex = {
    vocabulary: vocabIndex,
    idfScores: idf,
    documentVectors: vectors,
    lastUpdated: new Date().toISOString(),
  };

  saveJSON("vector-index.json", index);
  return index;
}

export function semanticSearch(query: string, topK: number = 10): object {
  const index = buildIndex();
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);

  if (memories.length === 0) {
    return { results: [], message: "No memories stored yet." };
  }

  // Vectorize query
  const queryTokens = tokenize(query);
  const queryTF = computeTF(queryTokens);
  const vocab = Object.keys(index.vocabulary).sort((a, b) => index.vocabulary[a] - index.vocabulary[b]);
  const queryVector = vectorize(queryTF, index.idfScores, vocab);

  // Compute similarities
  const scores: { id: string; score: number }[] = [];
  for (const [id, vec] of Object.entries(index.documentVectors)) {
    const score = cosineSimilarity(queryVector, vec);
    if (score > 0.05) {
      scores.push({ id, score });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  const topResults = scores.slice(0, topK);

  // Map back to memory entries
  const results = topResults.map((s) => {
    const mem = memories.find((m) => m.id === s.id);
    return {
      id: s.id,
      content: mem?.content || "",
      topic: mem?.topic || "",
      type: mem?.type || "",
      tags: mem?.tags || [],
      similarity: Math.round(s.score * 1000) / 1000,
      timestamp: mem?.timestamp,
    };
  });

  return {
    query,
    results,
    totalMemories: memories.length,
    indexSize: Object.keys(index.documentVectors).length,
  };
}

export function findRelatedConcepts(concept: string, topK: number = 8): object {
  const index = buildIndex();
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);

  if (memories.length === 0) {
    return { concept, related: [], message: "No memories stored yet." };
  }

  // Find the memory closest to the concept, then find neighbors of that
  const queryTokens = tokenize(concept);
  const queryTF = computeTF(queryTokens);
  const vocab = Object.keys(index.vocabulary).sort((a, b) => index.vocabulary[a] - index.vocabulary[b]);
  const queryVector = vectorize(queryTF, index.idfScores, vocab);

  const scores: { id: string; score: number }[] = [];
  for (const [id, vec] of Object.entries(index.documentVectors)) {
    const score = cosineSimilarity(queryVector, vec);
    scores.push({ id, score });
  }

  scores.sort((a, b) => b.score - a.score);
  const topResults = scores.slice(0, topK);

  // Extract unique topics and tags from related results
  const relatedTopics = new Set<string>();
  const relatedTags = new Set<string>();
  const relatedConcepts: { content: string; topic: string; similarity: number }[] = [];

  for (const s of topResults) {
    const mem = memories.find((m) => m.id === s.id);
    if (mem) {
      relatedTopics.add(mem.topic);
      mem.tags.forEach((t) => relatedTags.add(t));
      if (mem.relatedTopics) mem.relatedTopics.forEach((t) => relatedTopics.add(t));
      relatedConcepts.push({
        content: mem.content,
        topic: mem.topic,
        similarity: Math.round(s.score * 1000) / 1000,
      });
    }
  }

  return {
    concept,
    relatedConcepts,
    relatedTopics: [...relatedTopics],
    relatedTags: [...relatedTags],
    suggestion: `These ${relatedConcepts.length} concepts are semantically closest to "${concept}" in your knowledge base.`,
  };
}

export function rebuildVectorIndex(): object {
  const index = buildIndex();
  return {
    success: true,
    message: "Vector index rebuilt.",
    vocabularySize: Object.keys(index.vocabulary).length,
    documentsIndexed: Object.keys(index.documentVectors).length,
    lastUpdated: index.lastUpdated,
  };
}
