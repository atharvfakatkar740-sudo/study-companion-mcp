import { loadJSON, saveJSON, saveNotes, loadNotes } from "../utils/storage.js";
import { MemoryEntry } from "../utils/types.js";

function getMemories(): MemoryEntry[] {
  return loadJSON<MemoryEntry[]>("memory.json", []);
}

export function saveInsight(
  content: string,
  topic: string,
  type: "insight" | "question" | "connection" | "implementation_note" | "mistake" | "breakthrough",
  tags?: string[],
  relatedTopics?: string[]
): object {
  const memories = getMemories();
  const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const entry: MemoryEntry = {
    id,
    content,
    topic,
    tags: tags || [],
    timestamp: new Date().toISOString(),
    type,
    relatedTopics,
  };

  memories.push(entry);
  saveJSON("memory.json", memories);

  return {
    success: true,
    message: `Saved ${type}: "${content.slice(0, 60)}..."`,
    id,
    totalMemories: memories.length,
  };
}

export function searchMemory(query: string, type?: string, topic?: string): object {
  const memories = getMemories();
  const q = query.toLowerCase();

  let results = memories.filter((m) => {
    const matchesQuery =
      m.content.toLowerCase().includes(q) ||
      m.topic.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q));
    const matchesType = type ? m.type === type : true;
    const matchesTopic = topic ? m.topic.toLowerCase().includes(topic.toLowerCase()) : true;
    return matchesQuery && matchesType && matchesTopic;
  });

  // Sort by recency
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    results: results.slice(0, 20).map((m) => ({
      id: m.id,
      content: m.content,
      topic: m.topic,
      type: m.type,
      tags: m.tags,
      timestamp: m.timestamp,
      relatedTopics: m.relatedTopics,
    })),
    totalMatches: results.length,
  };
}

export function getRecentInsights(count: number = 10, type?: string): object {
  const memories = getMemories();
  let filtered = type ? memories.filter((m) => m.type === type) : memories;
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    insights: filtered.slice(0, count).map((m) => ({
      id: m.id,
      content: m.content,
      topic: m.topic,
      type: m.type,
      timestamp: m.timestamp,
    })),
    total: memories.length,
  };
}

export function getTopicNotes(topicId: string): object {
  const content = loadNotes(topicId);
  if (!content) {
    return { topicId, content: "No notes yet for this topic.", exists: false };
  }
  return { topicId, content, exists: true };
}

export function updateTopicNotes(topicId: string, content: string): object {
  saveNotes(topicId, content);
  return { success: true, message: `Notes updated for topic '${topicId}'.` };
}

export function getConnectionMap(topic?: string): object {
  const memories = getMemories();
  const connections: Record<string, string[]> = {};

  for (const m of memories) {
    if (topic && m.topic !== topic && !m.relatedTopics?.includes(topic)) continue;

    if (!connections[m.topic]) connections[m.topic] = [];
    if (m.relatedTopics) {
      for (const rt of m.relatedTopics) {
        if (!connections[m.topic].includes(rt)) connections[m.topic].push(rt);
        if (!connections[rt]) connections[rt] = [];
        if (!connections[rt].includes(m.topic)) connections[rt].push(m.topic);
      }
    }
  }

  return {
    connections,
    topicCount: Object.keys(connections).length,
    description: "Map of topic interconnections based on your saved insights.",
  };
}

export function getMemoryStats(): object {
  const memories = getMemories();
  const byType: Record<string, number> = {};
  const byTopic: Record<string, number> = {};

  for (const m of memories) {
    byType[m.type] = (byType[m.type] || 0) + 1;
    byTopic[m.topic] = (byTopic[m.topic] || 0) + 1;
  }

  return {
    totalMemories: memories.length,
    byType,
    byTopic,
    mostActiveTopics: Object.entries(byTopic)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count })),
  };
}
