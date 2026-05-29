import { loadJSON, saveJSON } from "../utils/storage.js";
import { PaperEntry } from "../utils/types.js";
import { getPapersReadingList } from "../engine/plan-loader.js";

function getPapers(): PaperEntry[] {
  const papers = loadJSON<PaperEntry[]>("papers.json", []);
  if (papers.length === 0) {
    // Initialize with the pre-defined reading list
    const readingList = getPapersReadingList() || [];
    const initial: PaperEntry[] = readingList.map((p, i) => ({
      id: `paper-${i + 1}`,
      title: p.title,
      authors: [p.authors],
      url: p.url,
      phase: p.phase,
      status: "queued" as const,
      priority: p.priority,
      addedDate: new Date().toISOString().split("T")[0],
    }));
    saveJSON("papers.json", initial);
    return initial;
  }
  return papers;
}

export function addPaper(title: string, authors: string, url?: string, phase?: string, priority?: number): object {
  const papers = getPapers();
  const id = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newPaper: PaperEntry = {
    id,
    title,
    authors: [authors],
    url,
    phase: phase || "general",
    status: "queued",
    priority: priority || papers.length + 1,
    addedDate: new Date().toISOString().split("T")[0],
  };
  papers.push(newPaper);
  saveJSON("papers.json", papers);
  return { success: true, message: `Paper added: "${title}"`, id };
}

export function getPaperQueue(): object {
  const papers = getPapers();
  const queued = papers.filter((p) => p.status === "queued").sort((a, b) => a.priority - b.priority);
  const reading = papers.filter((p) => p.status === "reading");
  const completed = papers.filter((p) => p.status === "completed");

  return {
    nextUp: queued.slice(0, 3).map((p) => ({ id: p.id, title: p.title, priority: p.priority, phase: p.phase })),
    currentlyReading: reading.map((p) => ({ id: p.id, title: p.title, notes: p.notes })),
    completedCount: completed.length,
    totalCount: papers.length,
    queuedCount: queued.length,
  };
}

export function startReadingPaper(paperId: string): object {
  const papers = getPapers();
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return { error: `Paper '${paperId}' not found.` };

  paper.status = "reading";
  saveJSON("papers.json", papers);
  return {
    success: true,
    message: `Started reading: "${paper.title}"`,
    tip: "As you read, use 'annotate_paper' to record: input, representation, latent space, objective, uncertainty model.",
  };
}

export function annotatePaper(
  paperId: string,
  notes?: string,
  keyInsights?: string[],
  architectureNotes?: {
    input?: string;
    representation?: string;
    latentSpace?: string;
    objective?: string;
    uncertaintyModel?: string;
  }
): object {
  const papers = getPapers();
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return { error: `Paper '${paperId}' not found.` };

  if (notes) paper.notes = notes;
  if (keyInsights) paper.keyInsights = keyInsights;
  if (architectureNotes) paper.architectureNotes = architectureNotes;
  saveJSON("papers.json", papers);

  return { success: true, message: `Annotations saved for "${paper.title}".` };
}

export function completePaper(paperId: string, keyInsights?: string[]): object {
  const papers = getPapers();
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return { error: `Paper '${paperId}' not found.` };

  paper.status = "completed";
  paper.completedDate = new Date().toISOString().split("T")[0];
  if (keyInsights) paper.keyInsights = keyInsights;
  saveJSON("papers.json", papers);

  return {
    success: true,
    message: `Completed: "${paper.title}". ${papers.filter((p) => p.status === "completed").length} papers done total.`,
  };
}

export function getPaperNotes(paperId: string): object {
  const papers = getPapers();
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return { error: `Paper '${paperId}' not found.` };

  return {
    title: paper.title,
    authors: paper.authors,
    status: paper.status,
    notes: paper.notes || "No notes yet.",
    keyInsights: paper.keyInsights || [],
    architectureNotes: paper.architectureNotes || {},
    url: paper.url,
  };
}

export function searchPapers(query: string): object {
  const papers = getPapers();
  const q = query.toLowerCase();
  const results = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q)) ||
      p.notes?.toLowerCase().includes(q) ||
      p.keyInsights?.some((i) => i.toLowerCase().includes(q))
  );

  return {
    results: results.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      phase: p.phase,
      hasNotes: !!p.notes,
      insightCount: p.keyInsights?.length || 0,
    })),
    count: results.length,
  };
}
