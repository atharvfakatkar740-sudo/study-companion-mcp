import { loadJSON, saveJSON } from "../utils/storage.js";
import { MemoryEntry } from "../utils/types.js";
import { getResearcherConfig } from "../engine/plan-loader.js";

// ============================================
// v1.4 — Multi-Agent System
// ============================================

// --- Code Reviewer Agent ---

interface ReviewRequest {
  id: string;
  code: string;
  context: string;
  language: string;
  timestamp: string;
  feedback?: ReviewFeedback;
}

interface ReviewFeedback {
  overallScore: number; // 1-10
  issues: ReviewIssue[];
  strengths: string[];
  suggestions: string[];
}

interface ReviewIssue {
  type: "bug" | "style" | "performance" | "readability" | "best-practice" | "ml-specific";
  severity: "critical" | "warning" | "info";
  description: string;
  suggestion?: string;
}

export function reviewCode(code: string, context: string, language: string = "python"): object {
  const issues: ReviewIssue[] = [];
  const strengths: string[] = [];
  const suggestions: string[] = [];

  // ML-specific code review heuristics
  const lowerCode = code.toLowerCase();

  // Check for common ML issues
  if (lowerCode.includes("model.eval") && !lowerCode.includes("torch.no_grad")) {
    issues.push({
      type: "ml-specific",
      severity: "warning",
      description: "model.eval() found without torch.no_grad() context. Memory may not be freed during inference.",
      suggestion: "Wrap inference in `with torch.no_grad():` for memory efficiency.",
    });
  }

  if (lowerCode.includes(".detach()") && lowerCode.includes("loss")) {
    issues.push({
      type: "ml-specific",
      severity: "info",
      description: "Using .detach() with loss — ensure this is intentional (stops gradient flow).",
    });
  }

  if (lowerCode.includes("numpy") && lowerCode.includes("cuda")) {
    issues.push({
      type: "bug",
      severity: "critical",
      description: "Mixing numpy and CUDA tensors directly can cause errors. Use .cpu().numpy().",
      suggestion: "Always call .cpu() before .numpy() on CUDA tensors.",
    });
  }

  if (lowerCode.includes("kl_divergence") || lowerCode.includes("kl_loss")) {
    if (!lowerCode.includes("log_var") && !lowerCode.includes("logvar")) {
      issues.push({
        type: "ml-specific",
        severity: "warning",
        description: "KL divergence computation detected but no log_var usage. Using var directly is numerically unstable.",
        suggestion: "Use log_var for numerical stability: KL = -0.5 * sum(1 + log_var - mu^2 - exp(log_var))",
      });
    }
  }

  if (lowerCode.includes("dataloader") && !lowerCode.includes("num_workers")) {
    issues.push({
      type: "performance",
      severity: "info",
      description: "DataLoader without num_workers specified. Default is 0 (single-process loading).",
      suggestion: "Add num_workers=4 (or more) for faster data loading on multi-core systems.",
    });
  }

  if (lowerCode.includes("scatter_") || lowerCode.includes("index_select")) {
    strengths.push("Using efficient sparse/indexed operations — good for GNN implementations.");
  }

  if (lowerCode.includes("message_passing") || lowerCode.includes("propagate")) {
    strengths.push("GNN message passing pattern detected — core pattern for graph-based research work.");
  }

  // General code quality
  if (code.split("\n").length > 50 && !code.includes("def ") && !code.includes("class ")) {
    issues.push({
      type: "readability",
      severity: "warning",
      description: "Long code block without function/class decomposition.",
      suggestion: "Break into smaller functions for reusability and testing.",
    });
  }

  if (lowerCode.includes("print(") && !lowerCode.includes("logging")) {
    issues.push({
      type: "best-practice",
      severity: "info",
      description: "Using print() instead of logging. For research code, structured logging helps reproducibility.",
      suggestion: "Consider using Python's logging module or wandb for experiment tracking.",
    });
  }

  // Type annotations check for Python
  if (language === "python") {
    const funcDefs = code.match(/def \w+\([^)]*\)/g) || [];
    const typedFuncs = code.match(/def \w+\([^)]*:.*\)/g) || [];
    if (funcDefs.length > 0 && typedFuncs.length < funcDefs.length / 2) {
      issues.push({
        type: "best-practice",
        severity: "info",
        description: "Missing type annotations on function parameters.",
        suggestion: "Type hints improve readability and catch bugs early. Important for portfolio code.",
      });
    }
  }

  if (code.includes("seed") || code.includes("manual_seed")) {
    strengths.push("Random seed setting detected — good practice for reproducibility.");
  }

  if (code.includes("__repr__") || code.includes("__str__")) {
    strengths.push("Custom string representations — shows engineering maturity.");
  }

  // Score
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  let score = 8 - criticalCount * 2 - warningCount * 0.5 + strengths.length * 0.3;
  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  // Suggestions based on context
  if (context.toLowerCase().includes("vae")) {
    suggestions.push("For VAE code targeting bio: ensure latent dim is configurable and document the ELBO decomposition.");
    suggestions.push("Consider adding beta-VAE support (beta parameter on KL term) for disentanglement experiments.");
  }
  if (context.toLowerCase().includes("gnn") || context.toLowerCase().includes("graph")) {
    suggestions.push("For GNN portfolio code: add edge feature support — molecular graphs need bond type features.");
    suggestions.push("Include a graph-level readout (mean/sum pooling) for graph classification tasks.");
  }
  suggestions.push("Add a docstring explaining the biological motivation if this connects to your research direction.");

  // Save review
  const review: ReviewRequest = {
    id: `review-${Date.now()}`,
    code: code.slice(0, 500),
    context,
    language,
    timestamp: new Date().toISOString(),
    feedback: { overallScore: score, issues, strengths, suggestions },
  };

  const reviews = loadJSON<ReviewRequest[]>("code-reviews.json", []);
  reviews.push(review);
  if (reviews.length > 50) reviews.shift();
  saveJSON("code-reviews.json", reviews);

  return {
    reviewId: review.id,
    score: `${score}/10`,
    issues,
    strengths: strengths.length > 0 ? strengths : ["No specific strengths detected from static analysis."],
    suggestions,
    summary: criticalCount > 0
      ? `⚠️ ${criticalCount} critical issue(s) found. Fix before committing.`
      : issues.length === 0
      ? "✅ Code looks clean! No issues detected."
      : `Found ${issues.length} issue(s): ${criticalCount} critical, ${warningCount} warnings, ${issues.length - criticalCount - warningCount} info.`,
  };
}

// --- Quiz Master Agent ---

interface QuizQuestion {
  id: string;
  question: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  hint?: string;
  expectedAnswer?: string;
  source: "srs" | "memory" | "generated";
}

export function generateQuiz(topic?: string, count: number = 5, difficulty?: string): object {
  const revisions = loadJSON<any[]>("revisions.json", []);
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);

  const questions: QuizQuestion[] = [];

  // From spaced repetition items
  let srsItems = revisions;
  if (topic) {
    srsItems = srsItems.filter((r: any) => r.topic.toLowerCase().includes(topic.toLowerCase()));
  }

  // Prioritize items that are due or overdue
  const today = new Date().toISOString().split("T")[0];
  const dueItems = srsItems.filter((r: any) => r.nextReview <= today);
  const sourceItems = dueItems.length > 0 ? dueItems : srsItems;

  for (const item of sourceItems.slice(0, Math.ceil(count * 0.6))) {
    questions.push({
      id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question: generateQuestionFromConcept(item.concept, item.topic),
      topic: item.topic,
      difficulty: item.repetitions > 3 ? "hard" : item.repetitions > 1 ? "medium" : "easy",
      expectedAnswer: item.concept,
      source: "srs",
    });
  }

  // From memory insights
  let insightItems = memories.filter((m) => m.type === "insight" || m.type === "connection");
  if (topic) {
    insightItems = insightItems.filter((m) =>
      m.topic.toLowerCase().includes(topic.toLowerCase()) ||
      m.content.toLowerCase().includes(topic.toLowerCase())
    );
  }

  for (const mem of insightItems.slice(0, Math.ceil(count * 0.4))) {
    questions.push({
      id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question: generateQuestionFromInsight(mem),
      topic: mem.topic,
      difficulty: "medium",
      hint: mem.relatedTopics ? `Related to: ${mem.relatedTopics.join(", ")}` : undefined,
      expectedAnswer: mem.content,
      source: "memory",
    });
  }

  // Add generated conceptual questions if we don't have enough
  if (questions.length < count) {
    const generated = getGeneratedQuestions(topic || "general-ml");
    for (const q of generated.slice(0, count - questions.length)) {
      questions.push(q);
    }
  }

  // Shuffle
  questions.sort(() => Math.random() - 0.5);

  return {
    title: topic ? `Quiz: ${topic}` : "Mixed Topic Quiz",
    questionCount: Math.min(questions.length, count),
    questions: questions.slice(0, count),
    instructions: [
      "Try to answer each question from memory before looking at hints.",
      "After answering, use `review_item` to log your recall quality for SRS items.",
      "Questions marked 'hard' are concepts you've reviewed multiple times — deep recall expected.",
    ],
    scoring: "Self-assess: 0-2 correct = needs review, 3-4 = good, 5 = excellent retention!",
  };
}

function generateQuestionFromConcept(concept: string, topic: string): string {
  const templates = [
    `Explain in your own words: ${concept}`,
    `How does "${concept}" relate to the broader context of ${topic}?`,
    `What would happen if you didn't account for "${concept}" in your implementation?`,
    `Can you write pseudocode demonstrating "${concept}"?`,
    `What is the mathematical intuition behind "${concept}"?`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateQuestionFromInsight(mem: MemoryEntry): string {
  const templates = [
    `You noted an insight about ${mem.topic}: Can you recall what you learned?`,
    `What connection did you discover related to ${mem.topic}?`,
    `Explain the key insight you had about ${mem.topic} and why it matters.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function getGeneratedQuestions(topic: string): QuizQuestion[] {
  const questionBank: Record<string, QuizQuestion[]> = {
    "vaes": [
      { id: "gen-1", question: "Derive the ELBO loss for a VAE. What are the two terms and what do they encourage?", topic: "VAEs", difficulty: "hard", source: "generated", expectedAnswer: "ELBO = E[log p(x|z)] - KL(q(z|x) || p(z)). Reconstruction term encourages accurate decoding, KL term encourages latent to match prior." },
      { id: "gen-2", question: "Why do we need the reparameterization trick? What problem does it solve?", topic: "VAEs", difficulty: "medium", source: "generated", expectedAnswer: "Sampling is non-differentiable. Reparameterization moves randomness outside the computational graph: z = mu + sigma * epsilon." },
      { id: "gen-3", question: "What is posterior collapse in VAEs and how can you prevent it?", topic: "VAEs", difficulty: "hard", source: "generated", expectedAnswer: "Decoder ignores latent code, KL goes to 0. Prevent with: KL annealing, free bits, stronger encoder, weaker decoder." },
    ],
    "gnns": [
      { id: "gen-4", question: "Explain the message passing framework in GNNs. What are the aggregate and update functions?", topic: "GNNs", difficulty: "medium", source: "generated", expectedAnswer: "Each node collects messages from neighbors (aggregate), then updates its own representation. h_v = UPDATE(h_v, AGGREGATE({h_u : u in N(v)}))." },
      { id: "gen-5", question: "What is the difference between GCN and GAT? When would you prefer one over the other?", topic: "GNNs", difficulty: "medium", source: "generated", expectedAnswer: "GCN uses fixed normalized adjacency weights. GAT learns attention weights per edge. GAT better when neighbor importance varies (heterogeneous graphs)." },
      { id: "gen-6", question: "What is over-smoothing in deep GNNs and how does it relate to graph diameter?", topic: "GNNs", difficulty: "hard", source: "generated", expectedAnswer: "Too many layers make all node representations converge (become indistinguishable). After k layers, nodes receive info from k-hop neighborhood — exceeding graph diameter homogenizes everything." },
    ],
    "general-ml": [
      { id: "gen-7", question: "Explain the bias-variance tradeoff in the context of model capacity.", topic: "ML Fundamentals", difficulty: "easy", source: "generated" },
      { id: "gen-8", question: "What is the difference between generative and discriminative models? Give examples.", topic: "ML Fundamentals", difficulty: "easy", source: "generated" },
      { id: "gen-9", question: "Why does batch normalization help training? What changes during inference?", topic: "Deep Learning", difficulty: "medium", source: "generated" },
    ],
  };

  const key = Object.keys(questionBank).find((k) => topic.toLowerCase().includes(k)) || "general-ml";
  return questionBank[key] || questionBank["general-ml"];
}

// --- Research Scout Agent ---

interface ScoutResult {
  id: string;
  title: string;
  relevance: string;
  actionItem: string;
}

export function scoutNewResearch(focusArea?: string): object {
  const papers = loadJSON<any[]>("papers.json", []);
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);

  // Determine focus from user's activity
  const topicFreq: Record<string, number> = {};
  for (const m of memories) {
    topicFreq[m.topic] = (topicFreq[m.topic] || 0) + 1;
  }
  const topTopics = Object.entries(topicFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([t]) => t);

  const focus = focusArea || topTopics[0] || "single-cell perturbation prediction";

  // Generate search recommendations
  const searchRecommendations = generateSearchRecommendations(focus, papers);

  // Check for papers that should be re-visited
  const oldPapers = papers.filter((p: any) => {
    if (p.status !== "completed") return false;
    const completed = new Date(p.completedDate);
    const monthsAgo = (Date.now() - completed.getTime()) / (30 * 24 * 60 * 60 * 1000);
    return monthsAgo > 2;
  });

  return {
    title: "Research Scout Report",
    currentFocus: focus,
    topActiveTopics: topTopics,
    searchRecommendations,
    suggestedArxivQueries: [
      `"${focus}" deep learning`,
      ...(getResearcherConfig().suggested_arxiv_queries || []),
      ...(getResearcherConfig().researchers.map((r) => r.name)),
    ],
    papersToRevisit: oldPapers.slice(0, 3).map((p: any) => ({
      title: p.title,
      completedDate: p.completedDate,
      suggestion: "Re-read with fresh eyes — you've learned more since then.",
    })),
    keyResearchers: getResearcherConfig().researchers.map((r) => ({
      name: r.name,
      focus: r.focus,
      lab: r.lab,
    })),
    actionItems: [
      `Search arXiv for recent "${focus}" papers (use search_arxiv tool)`,
      ...getResearcherConfig().researchers.slice(0, 2).map((r) => `Check ${r.name}'s lab GitHub for new repos/updates`),
      "Look for conference workshops: NeurIPS, ICML, ICLR bio-focused tracks",
      "Follow relevant hashtags on Twitter/X for real-time discoveries",
    ],
  };
}

function generateSearchRecommendations(focus: string, papers: any[]): object[] {
  const readTitles = papers.filter((p: any) => p.status === "completed").map((p: any) => p.title.toLowerCase());

  const config = getResearcherConfig();
  return config.search_recommendations || [];
}
