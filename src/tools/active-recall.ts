import { loadJSON, saveJSON } from "../utils/storage.js";
import { MemoryEntry, RevisionItem } from "../utils/types.js";
import { getStudyPhases } from "../engine/plan-loader.js";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================
// v3.0.3 — Active Recall & Testing Engine
// Multi-format recall challenges + Anki export
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

interface RecallChallenge {
  id: string;
  type: "derivation" | "implementation" | "eli5" | "comparison" | "comprehensive";
  question: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  rubric: Record<number, string>;
  hints?: string[];
  timeLimit?: number; // minutes
}

interface TestResult {
  testId: string;
  date: string;
  type: string;
  totalQuestions: number;
  scores: Array<{ questionId: string; score: number }>;
  averageScore: number;
  duration?: number;
}

// --- Derivation Quiz ---

export function generateDerivationQuiz(
  topic: string,
  count: number = 3
): object {
  const revisions = loadJSON<RevisionItem[]>("revisions.json", []);
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});

  // Find relevant concepts from SRS and memories
  const topicLower = topic.toLowerCase();
  const relatedRevisions = revisions.filter((r) =>
    r.topic.toLowerCase().includes(topicLower) ||
    r.concept.toLowerCase().includes(topicLower)
  );
  const relatedMemories = memories.filter((m) =>
    m.topic.toLowerCase().includes(topicLower) ||
    m.content.toLowerCase().includes(topicLower)
  );

  const challenges: RecallChallenge[] = [];

  // Generate derivation questions from revision items
  for (const item of relatedRevisions.slice(0, count)) {
    const conceptMastery = findMasteryLevel(mastery, item.concept);
    const difficulty = conceptMastery === "advanced" ? "hard" : conceptMastery === "intermediate" ? "medium" : "easy";

    challenges.push({
      id: `deriv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "derivation",
      question: generateDerivationPrompt(item.concept, difficulty),
      topic: item.topic,
      difficulty,
      rubric: {
        90: "Complete derivation with correct notation and clear intuition",
        70: "Key equations present with reasonable steps",
        50: "Partial derivation — some steps correct",
        30: "Remembered the result but couldn't derive it",
        0: "Could not start the derivation",
      },
      hints: [
        `This is related to: ${item.topic}`,
        `Think about what inputs and outputs are involved.`,
        `What assumptions or constraints apply?`,
      ],
      timeLimit: difficulty === "hard" ? 15 : difficulty === "medium" ? 10 : 5,
    });
  }

  // Fill remaining with insight-based derivations
  for (const mem of relatedMemories.slice(0, Math.max(0, count - challenges.length))) {
    challenges.push({
      id: `deriv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "derivation",
      question: `Derive or formally express the following insight you had: "${mem.content.slice(0, 100)}..."`,
      topic: mem.topic,
      difficulty: "medium",
      rubric: {
        90: "Formalized the insight with correct math/logic",
        70: "Good formalization with minor gaps",
        50: "Partially formalized",
        30: "Could recall the idea but not formalize it",
        0: "Could not recall",
      },
    });
  }

  const testId = `test-deriv-${Date.now()}`;

  return {
    testId,
    title: `Derivation Quiz: ${topic}`,
    instructions: [
      "Work through each derivation on paper or in a notebook.",
      "Do NOT look at references until you've attempted each one.",
      "After completing, self-score each question using the rubric.",
      "Use assess_understanding to record your scores for mastery tracking.",
    ],
    totalQuestions: challenges.length,
    estimatedTime: `${challenges.reduce((s, c) => s + (c.timeLimit || 10), 0)} minutes`,
    challenges,
  };
}

function generateDerivationPrompt(concept: string, difficulty: string): string {
  const hard = [
    `Derive ${concept} from first principles. State all assumptions and show every algebraic step.`,
    `Prove that ${concept} holds under standard conditions. What happens when the assumptions are violated?`,
    `Starting from the general case, derive ${concept} and explain why each step is necessary.`,
  ];
  const medium = [
    `Derive the key equation(s) for ${concept}. Label each term and explain its role.`,
    `Write out the mathematical formulation of ${concept} and derive the gradient.`,
    `Show how ${concept} is computed step by step. What is the computational complexity?`,
  ];
  const easy = [
    `Write the main formula for ${concept}. Define each variable.`,
    `What is the mathematical expression for ${concept}? What does each part mean?`,
    `Express ${concept} as an equation and give a one-line interpretation.`,
  ];

  const pool = difficulty === "hard" ? hard : difficulty === "medium" ? medium : easy;
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- Implementation Challenge ---

export function generateImplementationChallenge(
  topic: string,
  language: string = "python"
): object {
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});
  const conceptLevel = findMasteryLevel(mastery, topic);
  const difficulty = conceptLevel === "advanced" ? "hard" : conceptLevel === "intermediate" ? "medium" : "easy";

  const name = topic.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const challenge: RecallChallenge = {
    id: `impl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "implementation",
    question: difficulty === "hard"
      ? `Implement ${name} from scratch in ${language}. Include: data loading, model definition, training loop, evaluation, and visualization. Add type hints, docstrings, and error handling.`
      : difficulty === "medium"
      ? `Implement the core ${name} module in ${language}. Include the forward pass and loss function. No need for full training pipeline.`
      : `Write pseudocode or skeleton code for ${name} in ${language}. Outline the main class/function structure with comments.`,
    topic,
    difficulty,
    rubric: {
      90: "Clean, runnable implementation with proper engineering practices",
      70: "Correct logic with minor issues (missing edge cases, incomplete docs)",
      50: "Partially correct — key components present but some bugs",
      30: "Structure understood but significant gaps in implementation",
      0: "Could not produce meaningful code",
    },
    hints: [
      `Think about the input/output shapes first.`,
      `What loss function is appropriate?`,
      `What are the hyperparameters?`,
    ],
    timeLimit: difficulty === "hard" ? 45 : difficulty === "medium" ? 25 : 15,
  };

  return {
    title: `Implementation Challenge: ${name}`,
    currentMastery: conceptLevel,
    difficulty,
    language,
    estimatedTime: `${challenge.timeLimit} minutes`,
    challenge,
    rules: [
      "Do NOT look at reference implementations.",
      "You may look up API docs (e.g., PyTorch docs) but not tutorials.",
      "Aim for correctness first, then clean code, then optimization.",
      "After completion, run it and note any bugs you had to fix.",
    ],
  };
}

// --- Explain Like I'm 5 (Feynman Technique) ---

export function generateELI5Challenge(concept: string): object {
  const name = concept.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `Feynman Challenge: ${name}`,
    challenges: [
      {
        audience: "5-year-old",
        prompt: `Explain ${name} to a 5-year-old using only everyday objects as analogies. No math, no jargon.`,
        example: "A neural network is like a bunch of friends passing notes — each friend reads the note, adds their own idea, and passes it on.",
        rubric: { 90: "Analogy is accurate and a child could understand", 50: "Good attempt but analogy breaks down", 0: "Too technical or inaccurate" },
      },
      {
        audience: "Undergraduate CS student",
        prompt: `Explain ${name} to an undergrad who knows basic linear algebra and probability. Use math where helpful but keep intuition first.`,
        rubric: { 90: "Clear, correct, good balance of intuition and formalism", 50: "Correct but either too hand-wavy or too dense", 0: "Incorrect or confusing" },
      },
      {
        audience: "NeurIPS reviewer",
        prompt: `Write a 2-sentence abstract-quality description of ${name} suitable for a top ML conference. Be precise, formal, and cite the key contribution.`,
        rubric: { 90: "Publication-quality precision with correct attribution", 50: "Technically correct but lacks precision/polish", 0: "Incorrect or too vague for a conference" },
      },
    ],
    instructions: [
      "The Feynman Technique: if you can't explain it simply, you don't understand it well enough.",
      "Write your explanation for EACH audience level.",
      "If you struggle at any level, that reveals a gap in your understanding.",
      "Use assess_understanding to record scores after self-evaluation.",
    ],
  };
}

// --- Compare & Contrast ---

export function generateComparison(conceptA: string, conceptB: string): object {
  const nameA = conceptA.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const nameB = conceptB.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `Compare & Contrast: ${nameA} vs ${nameB}`,
    dimensions: [
      {
        dimension: "Problem Formulation",
        prompt: `What problem does ${nameA} solve vs ${nameB}? Are they solving the same problem differently or different problems?`,
      },
      {
        dimension: "Mathematical Foundation",
        prompt: `Compare the mathematical formulations. What objective function does each optimize?`,
      },
      {
        dimension: "Architecture/Implementation",
        prompt: `How do the architectures differ? Compare key components (encoder, decoder, loss, training procedure).`,
      },
      {
        dimension: "Strengths & Weaknesses",
        prompt: `When would you choose ${nameA} over ${nameB}? What are the failure modes of each?`,
      },
      {
        dimension: "Computational Cost",
        prompt: `Compare time complexity, memory requirements, and scalability.`,
      },
      {
        dimension: "Use Cases",
        prompt: `Give a specific scenario where ${nameA} is clearly better, and one where ${nameB} wins.`,
      },
    ],
    rubric: {
      90: "Deep, nuanced comparison showing expert-level understanding of both",
      70: "Correct key differences with good reasoning",
      50: "Some differences noted but comparison is shallow or partially incorrect",
      30: "Knows both exist but can't articulate differences well",
      0: "Could not compare meaningfully",
    },
    scoringInstructions: "Score yourself on each dimension (0-100), then use assess_understanding with the average.",
  };
}

// --- Weekly Comprehensive Test ---

export function generateWeeklyTest(): object {
  const revisions = loadJSON<RevisionItem[]>("revisions.json", []);
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});
  const sessions = loadJSON<any[]>("session-log.json", []);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Topics studied this week (from sessions)
  const weekTopics = new Set<string>();
  for (const session of sessions) {
    if (session.date >= weekAgo && session.topic) {
      weekTopics.add(session.topic);
    }
  }

  // Recent revision items
  const weekRevisions = revisions.filter((r) => r.lastReviewed >= weekAgo);

  // Recent memories
  const weekMemories = memories.filter((m) => m.timestamp >= weekAgo);

  const sections: any[] = [];

  // Section 1: Quick recall (from SRS)
  const quickRecall = weekRevisions.slice(0, 5).map((r, i) => ({
    id: `wt-recall-${i + 1}`,
    type: "quick_recall",
    question: `Define or explain: ${r.concept}`,
    topic: r.topic,
    timeLimit: 2,
  }));
  if (quickRecall.length > 0) {
    sections.push({
      name: "Quick Recall (2 min each)",
      description: "Rapid-fire definitions from your SRS items this week",
      questions: quickRecall,
    });
  }

  // Section 2: Application (from memories)
  const application = weekMemories
    .filter((m) => m.type === "insight" || m.type === "connection")
    .slice(0, 3)
    .map((m, i) => ({
      id: `wt-apply-${i + 1}`,
      type: "application",
      question: `You had this insight: "${m.content.slice(0, 80)}..." — How would you apply this in a real project?`,
      topic: m.topic,
      timeLimit: 5,
    }));
  if (application.length > 0) {
    sections.push({
      name: "Application (5 min each)",
      description: "Apply insights from this week to practical scenarios",
      questions: application,
    });
  }

  // Section 3: Synthesis
  const topics = Array.from(weekTopics).slice(0, 3);
  if (topics.length >= 2) {
    sections.push({
      name: "Synthesis (10 min)",
      description: "Connect concepts across topics studied this week",
      questions: [{
        id: "wt-synth-1",
        type: "synthesis",
        question: `How do ${topics.join(" and ")} connect? Draw relationships and explain how understanding one helps with the others.`,
        topics,
        timeLimit: 10,
      }],
    });
  }

  // Section 4: Weakest concept deep dive
  const weakest = Object.entries(mastery)
    .filter(([, info]: [string, any]) => info.level === "beginner" || (info.level === "intermediate" && info.score < 60))
    .sort(([, a]: [string, any], [, b]: [string, any]) => a.score - b.score)
    .slice(0, 1);

  if (weakest.length > 0) {
    const [weakId] = weakest[0];
    sections.push({
      name: "Deep Dive: Weakest Concept (15 min)",
      description: "Focused assessment on your lowest-mastery concept",
      questions: [{
        id: "wt-deep-1",
        type: "deep_dive",
        question: `Explain ${weakId.replace(/-/g, " ")} thoroughly: definition, math, implementation, and one real-world application.`,
        concept: weakId,
        timeLimit: 15,
      }],
    });
  }

  const totalQuestions = sections.reduce((s: number, sec: any) => s + sec.questions.length, 0);
  const totalTime = sections.reduce(
    (s: number, sec: any) => s + sec.questions.reduce((qs: number, q: any) => qs + (q.timeLimit || 5), 0),
    0
  );

  const testId = `weekly-test-${new Date().toISOString().split("T")[0]}`;

  return {
    testId,
    title: `Weekly Comprehensive Test — ${new Date().toISOString().split("T")[0]}`,
    totalSections: sections.length,
    totalQuestions,
    estimatedTime: `${totalTime} minutes`,
    topicsCovered: Array.from(weekTopics),
    sections,
    instructions: [
      "Complete all sections in order. Time yourself.",
      "No references allowed during the test.",
      "After each section, score yourself using the rubric (0-100).",
      "Record results with assess_understanding for each concept.",
    ],
    grading: {
      "90-100": "Excellent retention — you truly learned this week's material",
      "70-89": "Good understanding with some gaps to review",
      "50-69": "Partial recall — revisit weak areas before moving forward",
      "Below 50": "Significant gaps — schedule extra review sessions",
    },
  };
}

// --- Anki Export ---

export function exportAnkiDeck(
  topic?: string,
  includeInsights: boolean = true
): object {
  const revisions = loadJSON<RevisionItem[]>("revisions.json", []);
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});

  // Filter by topic if specified
  let srsItems = revisions;
  let insightItems = memories.filter((m) => m.type === "insight" || m.type === "connection" || m.type === "breakthrough");

  if (topic) {
    const topicLower = topic.toLowerCase();
    srsItems = srsItems.filter((r) =>
      r.topic.toLowerCase().includes(topicLower) || r.concept.toLowerCase().includes(topicLower)
    );
    insightItems = insightItems.filter((m) =>
      m.topic.toLowerCase().includes(topicLower) || m.content.toLowerCase().includes(topicLower)
    );
  }

  // Build Anki-compatible TSV (tab-separated: front\tback\ttags)
  const cards: Array<{ front: string; back: string; tags: string }> = [];

  // From SRS revision items
  for (const item of srsItems) {
    const level = findMasteryLevel(mastery, item.concept);
    cards.push({
      front: `Define/Explain: ${item.concept}`,
      back: `Topic: ${item.topic}\nConcept: ${item.concept}\nMastery: ${level}\nSRS Interval: ${item.interval} days`,
      tags: `study-companion ${item.topic.replace(/\s+/g, "_")} srs`,
    });

    // Add a "why does it matter" card
    cards.push({
      front: `Why is "${item.concept}" important in ${item.topic}?`,
      back: `This concept is part of ${item.topic}. Think about how removing or changing it would affect the overall system.`,
      tags: `study-companion ${item.topic.replace(/\s+/g, "_")} why`,
    });
  }

  // From insights (if enabled)
  if (includeInsights) {
    for (const mem of insightItems) {
      cards.push({
        front: `What insight did you have about ${mem.topic}? (Hint: ${mem.content.slice(0, 40)}...)`,
        back: mem.content,
        tags: `study-companion ${mem.topic.replace(/\s+/g, "_")} insight`,
      });
    }
  }

  // Generate TSV content
  const tsvHeader = "#separator:tab\n#html:false\n#tags column:3\n";
  const tsvLines = cards.map((c) =>
    `${escapeAnki(c.front)}\t${escapeAnki(c.back)}\t${c.tags}`
  );
  const tsvContent = tsvHeader + tsvLines.join("\n");

  // Write to file
  const exportDir = join(DATA_DIR, "exports");
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true });
  }
  const filename = topic
    ? `anki-${topic.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`
    : `anki-full-deck-${new Date().toISOString().split("T")[0]}.txt`;
  const filepath = join(exportDir, filename);
  writeFileSync(filepath, tsvContent, "utf-8");

  return {
    title: topic ? `Anki Export: ${topic}` : "Anki Full Deck Export",
    totalCards: cards.length,
    srsCards: srsItems.length * 2, // 2 cards per SRS item
    insightCards: includeInsights ? insightItems.length : 0,
    exportedTo: filepath,
    importInstructions: [
      "Open Anki → File → Import",
      `Select the file: ${filename}`,
      "Set field separator to 'Tab'",
      "Map fields: Field 1 → Front, Field 2 → Back",
      "Tags will be imported automatically",
      "Tip: Create a 'Study Companion' deck first, then import into it",
    ],
    sampleCards: cards.slice(0, 3).map((c) => ({ front: c.front, back: c.back.slice(0, 80) })),
  };
}

function escapeAnki(text: string): string {
  return text.replace(/\t/g, "    ").replace(/\n/g, "<br>");
}

// --- Helpers ---

function findMasteryLevel(mastery: Record<string, any>, concept: string): string {
  // Direct match
  const conceptId = concept.toLowerCase().replace(/\s+/g, "-");
  if (mastery[conceptId]) return mastery[conceptId].level;

  // Fuzzy match
  const entry = Object.entries(mastery).find(([id]) =>
    id.includes(conceptId) || conceptId.includes(id)
  );
  return entry ? entry[1].level : "unknown";
}

export function recordTestResult(
  testId: string,
  scores: Array<{ questionId: string; score: number }>,
  duration?: number
): object {
  const results = loadJSON<TestResult[]>("test-results.json", []);

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, q) => s + q.score, 0) / scores.length)
    : 0;

  const result: TestResult = {
    testId,
    date: new Date().toISOString().split("T")[0],
    type: testId.includes("deriv") ? "derivation" : testId.includes("weekly") ? "weekly" : "custom",
    totalQuestions: scores.length,
    scores,
    averageScore: avgScore,
    duration,
  };

  results.push(result);
  if (results.length > 50) results.shift();
  saveJSON("test-results.json", results);

  return {
    testId,
    averageScore: avgScore,
    grade: avgScore >= 90 ? "A" : avgScore >= 80 ? "B" : avgScore >= 70 ? "C" : avgScore >= 60 ? "D" : "F",
    questionScores: scores,
    duration: duration ? `${duration} minutes` : "not recorded",
    message: avgScore >= 80
      ? "Excellent performance! Your recall is strong."
      : avgScore >= 60
      ? "Good effort. Review the questions you scored below 70 on."
      : "Significant gaps detected. Schedule additional review sessions.",
  };
}
