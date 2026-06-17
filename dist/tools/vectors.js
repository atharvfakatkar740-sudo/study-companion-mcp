import { loadJSON, saveJSON } from "../utils/storage.js";
function tokenize(text) {
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
function computeTF(tokens) {
    const freq = {};
    for (const t of tokens) {
        freq[t] = (freq[t] || 0) + 1;
    }
    const max = Math.max(...Object.values(freq), 1);
    const tf = {};
    for (const [word, count] of Object.entries(freq)) {
        tf[word] = 0.5 + 0.5 * (count / max); // augmented TF
    }
    return tf;
}
function computeIDF(documents) {
    const N = documents.length;
    const docFreq = {};
    for (const doc of documents) {
        const uniqueWords = new Set(doc);
        for (const word of uniqueWords) {
            docFreq[word] = (docFreq[word] || 0) + 1;
        }
    }
    const idf = {};
    for (const [word, df] of Object.entries(docFreq)) {
        idf[word] = Math.log((N + 1) / (df + 1)) + 1; // smoothed IDF
    }
    return idf;
}
function vectorize(tf, idf, vocab) {
    return vocab.map((word) => (tf[word] || 0) * (idf[word] || 0));
}
function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}
function buildIndex() {
    const memories = loadJSON("memory.json", []);
    if (memories.length === 0) {
        return { vocabulary: {}, idfScores: {}, documentVectors: {}, lastUpdated: new Date().toISOString() };
    }
    // Tokenize all documents
    const tokenizedDocs = {};
    for (const mem of memories) {
        const text = `${mem.content} ${mem.topic} ${mem.tags.join(" ")} ${(mem.relatedTopics || []).join(" ")}`;
        tokenizedDocs[mem.id] = tokenize(text);
    }
    // Compute IDF
    const allDocs = Object.values(tokenizedDocs);
    const idf = computeIDF(allDocs);
    // Build vocabulary (top terms by document frequency)
    const vocab = Object.keys(idf).sort((a, b) => idf[b] - idf[a]).slice(0, 500);
    const vocabIndex = {};
    vocab.forEach((w, i) => (vocabIndex[w] = i));
    // Vectorize each document
    const vectors = {};
    for (const [id, tokens] of Object.entries(tokenizedDocs)) {
        const tf = computeTF(tokens);
        vectors[id] = vectorize(tf, idf, vocab);
    }
    const index = {
        vocabulary: vocabIndex,
        idfScores: idf,
        documentVectors: vectors,
        lastUpdated: new Date().toISOString(),
    };
    saveJSON("vector-index.json", index);
    return index;
}
export function semanticSearch(query, topK = 10) {
    const index = buildIndex();
    const memories = loadJSON("memory.json", []);
    if (memories.length === 0) {
        return { results: [], message: "No memories stored yet." };
    }
    // Vectorize query
    const queryTokens = tokenize(query);
    const queryTF = computeTF(queryTokens);
    const vocab = Object.keys(index.vocabulary).sort((a, b) => index.vocabulary[a] - index.vocabulary[b]);
    const queryVector = vectorize(queryTF, index.idfScores, vocab);
    // Compute similarities
    const scores = [];
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
export function findRelatedConcepts(concept, topK = 8) {
    const index = buildIndex();
    const memories = loadJSON("memory.json", []);
    if (memories.length === 0) {
        return { concept, related: [], message: "No memories stored yet." };
    }
    // Find the memory closest to the concept, then find neighbors of that
    const queryTokens = tokenize(concept);
    const queryTF = computeTF(queryTokens);
    const vocab = Object.keys(index.vocabulary).sort((a, b) => index.vocabulary[a] - index.vocabulary[b]);
    const queryVector = vectorize(queryTF, index.idfScores, vocab);
    const scores = [];
    for (const [id, vec] of Object.entries(index.documentVectors)) {
        const score = cosineSimilarity(queryVector, vec);
        scores.push({ id, score });
    }
    scores.sort((a, b) => b.score - a.score);
    const topResults = scores.slice(0, topK);
    // Extract unique topics and tags from related results
    const relatedTopics = new Set();
    const relatedTags = new Set();
    const relatedConcepts = [];
    for (const s of topResults) {
        const mem = memories.find((m) => m.id === s.id);
        if (mem) {
            relatedTopics.add(mem.topic);
            mem.tags.forEach((t) => relatedTags.add(t));
            if (mem.relatedTopics)
                mem.relatedTopics.forEach((t) => relatedTopics.add(t));
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
export function rebuildVectorIndex() {
    const index = buildIndex();
    return {
        success: true,
        message: "Vector index rebuilt.",
        vocabularySize: Object.keys(index.vocabulary).length,
        documentsIndexed: Object.keys(index.documentVectors).length,
        lastUpdated: index.lastUpdated,
    };
}
//# sourceMappingURL=vectors.js.map