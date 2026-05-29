import { loadJSON, saveJSON } from "../utils/storage.js";
import { RevisionItem } from "../utils/types.js";

// SM-2 Spaced Repetition Algorithm (SuperMemo 2)
// This is the core algorithm used by Anki

function calculateNextReview(item: RevisionItem, quality: number): RevisionItem {
  // quality: 0-5 (0=complete blackout, 5=perfect recall)
  // We map difficulty to quality: forgot=1, hard=2, medium=3, easy=5

  let { easeFactor, interval, repetitions } = item;

  if (quality < 3) {
    // Failed recall - reset
    repetitions = 0;
    interval = 1;
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...item,
    easeFactor,
    interval,
    repetitions,
    lastReviewed: new Date().toISOString().split("T")[0],
    nextReview: nextReview.toISOString().split("T")[0],
  };
}

function difficultyToQuality(difficulty: "easy" | "medium" | "hard" | "forgot"): number {
  switch (difficulty) {
    case "easy": return 5;
    case "medium": return 3;
    case "hard": return 2;
    case "forgot": return 1;
  }
}

export function addRevisionItem(topic: string, concept: string): object {
  const items = loadJSON<RevisionItem[]>("revisions.json", []);
  const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const today = new Date().toISOString().split("T")[0];

  const newItem: RevisionItem = {
    id,
    topic,
    concept,
    lastReviewed: today,
    nextReview: today, // Review tomorrow
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    difficulty: "medium",
  };

  items.push(newItem);
  saveJSON("revisions.json", items);

  return {
    success: true,
    message: `Added revision item: "${concept}" (topic: ${topic}). First review: today.`,
    id,
  };
}

export function getRevisionsDue(): object {
  const items = loadJSON<RevisionItem[]>("revisions.json", []);
  const today = new Date().toISOString().split("T")[0];
  const due = items.filter((item) => item.nextReview <= today);
  const upcoming = items
    .filter((item) => item.nextReview > today)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
    .slice(0, 5);

  return {
    dueCount: due.length,
    dueItems: due.map((item) => ({
      id: item.id,
      topic: item.topic,
      concept: item.concept,
      lastReviewed: item.lastReviewed,
      interval: item.interval,
      repetitions: item.repetitions,
    })),
    upcomingCount: upcoming.length,
    upcoming: upcoming.map((item) => ({
      concept: item.concept,
      topic: item.topic,
      nextReview: item.nextReview,
    })),
    totalItems: items.length,
  };
}

export function reviewItem(itemId: string, difficulty: "easy" | "medium" | "hard" | "forgot"): object {
  const items = loadJSON<RevisionItem[]>("revisions.json", []);
  const index = items.findIndex((item) => item.id === itemId);

  if (index === -1) {
    return { error: `Revision item '${itemId}' not found.` };
  }

  const quality = difficultyToQuality(difficulty);
  const updated = calculateNextReview(items[index], quality);
  updated.difficulty = difficulty;
  items[index] = updated;
  saveJSON("revisions.json", items);

  return {
    success: true,
    concept: updated.concept,
    difficulty,
    nextReview: updated.nextReview,
    interval: `${updated.interval} days`,
    easeFactor: updated.easeFactor.toFixed(2),
    message: difficulty === "forgot"
      ? `Reset "${updated.concept}". Will review again tomorrow.`
      : `Next review for "${updated.concept}": ${updated.nextReview} (${updated.interval} days).`,
  };
}

export function getRevisionStats(): object {
  const items = loadJSON<RevisionItem[]>("revisions.json", []);
  const today = new Date().toISOString().split("T")[0];

  const topicGroups: Record<string, number> = {};
  let totalRetention = 0;
  let matureCount = 0; // items with interval > 21 days

  for (const item of items) {
    topicGroups[item.topic] = (topicGroups[item.topic] || 0) + 1;
    if (item.interval > 21) matureCount++;
    // Estimate retention based on ease factor
    totalRetention += Math.min(item.easeFactor / 2.5, 1);
  }

  return {
    totalItems: items.length,
    dueToday: items.filter((i) => i.nextReview <= today).length,
    matureItems: matureCount,
    averageRetention: items.length > 0 ? `${Math.round((totalRetention / items.length) * 100)}%` : "N/A",
    byTopic: topicGroups,
  };
}

export function bulkAddRevisions(topic: string, concepts: string[]): object {
  const items = loadJSON<RevisionItem[]>("revisions.json", []);
  const today = new Date().toISOString().split("T")[0];
  const newIds: string[] = [];

  for (const concept of concepts) {
    const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    items.push({
      id,
      topic,
      concept,
      lastReviewed: today,
      nextReview: today,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      difficulty: "medium",
    });
    newIds.push(id);
  }

  saveJSON("revisions.json", items);
  return {
    success: true,
    message: `Added ${concepts.length} revision items for topic '${topic}'.`,
    ids: newIds,
  };
}
