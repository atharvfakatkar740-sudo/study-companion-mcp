import { loadJSON, saveJSON } from "../utils/storage.js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PaperEntry } from "../utils/types.js";

// ============================================
// v3.3 — Research Intelligence System
// Citation graph, paper lineage, implementation checklists, Semantic Scholar API
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

// --- Types ---

interface CitationNode {
  paperId: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  citationCount?: number;
  tldr?: string;
  url?: string;
  addedDate: string;
  source: "manual" | "semantic_scholar" | "papers_json";
}

interface CitationEdge {
  from: string; // citing paper ID
  to: string;   // cited paper ID
  type: "cites" | "cited_by" | "extends" | "reproduces" | "competes";
}

interface CitationGraph {
  nodes: CitationNode[];
  edges: CitationEdge[];
  lineages: PaperLineage[];
  lastUpdated: string;
}

interface PaperLineage {
  id: string;
  name: string;
  description: string;
  papers: Array<{
    paperId: string;
    title: string;
    year?: number;
    contribution: string;
    order: number;
  }>;
}

interface ImplementationChecklist {
  id: string;
  paperId: string;
  paperTitle: string;
  createdDate: string;
  status: "not_started" | "in_progress" | "completed";
  sections: ChecklistSection[];
}

interface ChecklistSection {
  name: string;
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  notes?: string;
}

// --- Loaders ---

function loadCitationGraph(): CitationGraph {
  return loadJSON<CitationGraph>("citation-graph.json", {
    nodes: [], edges: [], lineages: [], lastUpdated: new Date().toISOString(),
  });
}

function saveCitationGraph(graph: CitationGraph): void {
  graph.lastUpdated = new Date().toISOString();
  saveJSON("citation-graph.json", graph);
}

function loadChecklists(): ImplementationChecklist[] {
  return loadJSON<ImplementationChecklist[]>("implementation-checklists.json", []);
}

function saveChecklists(checklists: ImplementationChecklist[]): void {
  saveJSON("implementation-checklists.json", checklists);
}

// ============================================
// 1. Semantic Scholar API Integration
// ============================================

const S2_API_BASE = "https://api.semanticscholar.org/graph/v1";
const S2_FIELDS = "paperId,title,authors,year,venue,citationCount,tldr,externalIds,url,citations,references";

async function fetchFromSemanticScholar(endpoint: string): Promise<any> {
  try {
    const res = await fetch(`${S2_API_BASE}${endpoint}`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) {
      return { error: `Semantic Scholar API error: ${res.status} ${res.statusText}` };
    }
    return await res.json();
  } catch (err: any) {
    return { error: `Semantic Scholar API failed: ${err.message}` };
  }
}

export async function searchSemanticScholar(query: string, limit: number = 10): Promise<object> {
  const data = await fetchFromSemanticScholar(
    `/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${S2_FIELDS}`
  );

  if (data.error) return data;

  const papers = (data.data || []).map((p: any) => ({
    paperId: p.paperId,
    title: p.title,
    authors: (p.authors || []).map((a: any) => a.name),
    year: p.year,
    venue: p.venue,
    citationCount: p.citationCount,
    tldr: p.tldr?.text,
    url: p.url,
  }));

  return {
    query,
    resultCount: papers.length,
    papers,
    tip: "Use add_to_citation_graph with a paperId to add papers to your citation graph.",
  };
}

// ============================================
// 2. Citation Graph Building
// ============================================

export async function addToCitationGraph(
  paperId: string,
  fetchCitations: boolean = true,
  depth: number = 1
): Promise<object> {
  const graph = loadCitationGraph();

  // Fetch paper details from Semantic Scholar
  const data = await fetchFromSemanticScholar(
    `/paper/${paperId}?fields=${S2_FIELDS}`
  );

  if (data.error) return data;

  // Add node if not exists
  const existingNode = graph.nodes.find((n) => n.paperId === data.paperId);
  if (!existingNode) {
    graph.nodes.push({
      paperId: data.paperId,
      title: data.title,
      authors: (data.authors || []).map((a: any) => a.name),
      year: data.year,
      venue: data.venue,
      citationCount: data.citationCount,
      tldr: data.tldr?.text,
      url: data.url,
      addedDate: new Date().toISOString().split("T")[0],
      source: "semantic_scholar",
    });
  }

  let addedEdges = 0;
  let addedNodes = 0;

  if (fetchCitations && depth > 0) {
    // Add references (papers this paper cites)
    const refs = data.references || [];
    for (const ref of refs.slice(0, 15)) {
      if (!ref.paperId) continue;

      if (!graph.nodes.find((n) => n.paperId === ref.paperId)) {
        graph.nodes.push({
          paperId: ref.paperId,
          title: ref.title || "Unknown",
          authors: (ref.authors || []).map((a: any) => a.name),
          year: ref.year,
          venue: ref.venue,
          citationCount: ref.citationCount,
          tldr: ref.tldr?.text,
          url: ref.url,
          addedDate: new Date().toISOString().split("T")[0],
          source: "semantic_scholar",
        });
        addedNodes++;
      }

      const edgeExists = graph.edges.find((e) => e.from === data.paperId && e.to === ref.paperId);
      if (!edgeExists) {
        graph.edges.push({ from: data.paperId, to: ref.paperId, type: "cites" });
        addedEdges++;
      }
    }

    // Add citations (papers that cite this paper)
    const cites = data.citations || [];
    for (const cite of cites.slice(0, 15)) {
      if (!cite.paperId) continue;

      if (!graph.nodes.find((n) => n.paperId === cite.paperId)) {
        graph.nodes.push({
          paperId: cite.paperId,
          title: cite.title || "Unknown",
          authors: (cite.authors || []).map((a: any) => a.name),
          year: cite.year,
          venue: cite.venue,
          citationCount: cite.citationCount,
          tldr: cite.tldr?.text,
          url: cite.url,
          addedDate: new Date().toISOString().split("T")[0],
          source: "semantic_scholar",
        });
        addedNodes++;
      }

      const edgeExists = graph.edges.find((e) => e.from === cite.paperId && e.to === data.paperId);
      if (!edgeExists) {
        graph.edges.push({ from: cite.paperId, to: data.paperId, type: "cites" });
        addedEdges++;
      }
    }
  }

  saveCitationGraph(graph);

  return {
    success: true,
    paper: { title: data.title, paperId: data.paperId, year: data.year },
    graph: {
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      newNodesAdded: addedNodes,
      newEdgesAdded: addedEdges,
    },
  };
}

export function addManualCitation(
  fromTitle: string,
  toTitle: string,
  type: "cites" | "extends" | "reproduces" | "competes" = "cites"
): object {
  const graph = loadCitationGraph();

  // Auto-create nodes if they don't exist
  for (const title of [fromTitle, toTitle]) {
    if (!graph.nodes.find((n) => n.title.toLowerCase() === title.toLowerCase())) {
      graph.nodes.push({
        paperId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        authors: [],
        addedDate: new Date().toISOString().split("T")[0],
        source: "manual",
      });
    }
  }

  const fromNode = graph.nodes.find((n) => n.title.toLowerCase() === fromTitle.toLowerCase());
  const toNode = graph.nodes.find((n) => n.title.toLowerCase() === toTitle.toLowerCase());

  if (!fromNode || !toNode) return { error: "Could not find or create paper nodes." };

  const edgeExists = graph.edges.find((e) => e.from === fromNode.paperId && e.to === toNode.paperId);
  if (edgeExists) return { message: "Edge already exists.", edge: edgeExists };

  graph.edges.push({ from: fromNode.paperId, to: toNode.paperId, type });
  saveCitationGraph(graph);

  return {
    success: true,
    edge: { from: fromNode.title, to: toNode.title, type },
    graphSize: { nodes: graph.nodes.length, edges: graph.edges.length },
  };
}

export function getCitationGraph(paperTitle?: string): object {
  const graph = loadCitationGraph();

  if (paperTitle) {
    const node = graph.nodes.find((n) => n.title.toLowerCase().includes(paperTitle.toLowerCase()));
    if (!node) return { error: `Paper "${paperTitle}" not found in citation graph.` };

    const outgoing = graph.edges.filter((e) => e.from === node.paperId);
    const incoming = graph.edges.filter((e) => e.to === node.paperId);

    const references = outgoing.map((e) => {
      const ref = graph.nodes.find((n) => n.paperId === e.to);
      return { title: ref?.title, year: ref?.year, type: e.type };
    });

    const citedBy = incoming.map((e) => {
      const citer = graph.nodes.find((n) => n.paperId === e.from);
      return { title: citer?.title, year: citer?.year, type: e.type };
    });

    return {
      paper: { title: node.title, year: node.year, citations: node.citationCount, tldr: node.tldr },
      references: references.sort((a, b) => (a.year || 0) - (b.year || 0)),
      citedBy: citedBy.sort((a, b) => (b.year || 0) - (a.year || 0)),
      referenceCount: references.length,
      citedByCount: citedBy.length,
    };
  }

  // Overview
  const topCited = [...graph.nodes]
    .filter((n) => n.citationCount)
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, 10);

  const hubPapers = graph.nodes
    .map((n) => {
      const outDeg = graph.edges.filter((e) => e.from === n.paperId).length;
      const inDeg = graph.edges.filter((e) => e.to === n.paperId).length;
      return { title: n.title, year: n.year, connections: outDeg + inDeg };
    })
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10);

  return {
    totalPapers: graph.nodes.length,
    totalEdges: graph.edges.length,
    lineages: graph.lineages.length,
    topCitedPapers: topCited.map((n) => ({ title: n.title, citations: n.citationCount, year: n.year })),
    hubPapers,
    lastUpdated: graph.lastUpdated,
  };
}

// ============================================
// 3. Paper Lineage Tracker
// ============================================

export function trackPaperLineage(
  lineageName: string,
  description: string,
  papers: Array<{ title: string; year?: number; contribution: string }>
): object {
  const graph = loadCitationGraph();

  const existingIdx = graph.lineages.findIndex((l) => l.name.toLowerCase() === lineageName.toLowerCase());

  const lineage: PaperLineage = {
    id: `lineage-${Date.now()}`,
    name: lineageName,
    description,
    papers: papers.map((p, i) => {
      // Try to find in graph nodes
      const node = graph.nodes.find((n) => n.title.toLowerCase().includes(p.title.toLowerCase()));
      return {
        paperId: node?.paperId || `manual-${p.title.replace(/\s+/g, "-").toLowerCase()}`,
        title: p.title,
        year: p.year || node?.year,
        contribution: p.contribution,
        order: i + 1,
      };
    }),
  };

  if (existingIdx >= 0) {
    graph.lineages[existingIdx] = lineage;
  } else {
    graph.lineages.push(lineage);
  }

  // Auto-create citation edges between consecutive papers
  for (let i = 1; i < lineage.papers.length; i++) {
    const from = lineage.papers[i];
    const to = lineage.papers[i - 1];
    const edgeExists = graph.edges.find((e) => e.from === from.paperId && e.to === to.paperId);
    if (!edgeExists) {
      graph.edges.push({ from: from.paperId, to: to.paperId, type: "extends" });
    }
  }

  saveCitationGraph(graph);

  // Generate visual
  const arrow = " → ";
  const visual = lineage.papers
    .sort((a, b) => a.order - b.order)
    .map((p) => `${p.title} (${p.year || "?"})`)
    .join(arrow);

  return {
    success: true,
    lineage: lineageName,
    description,
    evolution: visual,
    paperCount: lineage.papers.length,
    details: lineage.papers.sort((a, b) => a.order - b.order).map((p) => ({
      order: p.order,
      title: p.title,
      year: p.year,
      contribution: p.contribution,
    })),
  };
}

export function getPaperLineages(): object {
  const graph = loadCitationGraph();

  if (graph.lineages.length === 0) {
    return {
      lineages: [],
      suggestion: "Track your first lineage! Example: track_paper_lineage with name='Lotfollahi Evolution', papers=[{title:'scGen', contribution:'First autoencoder for perturbation'}, {title:'trVAE', contribution:'Style transfer VAE'}, {title:'CPA', contribution:'Compositional perturbation'}, {title:'chemCPA', contribution:'Chemical + genetic perturbation'}]",
    };
  }

  return {
    count: graph.lineages.length,
    lineages: graph.lineages.map((l) => ({
      name: l.name,
      description: l.description,
      paperCount: l.papers.length,
      evolution: l.papers
        .sort((a, b) => a.order - b.order)
        .map((p) => `${p.title} (${p.year || "?"})`)
        .join(" → "),
    })),
  };
}

// ============================================
// 4. Implementation Checklist Generator
// ============================================

export function generateImplementationChecklist(
  paperTitle: string,
  paperType: "vae" | "gnn" | "transformer" | "general" = "general"
): object {
  const checklists = loadChecklists();

  const sections = getChecklistTemplate(paperType, paperTitle);

  const checklist: ImplementationChecklist = {
    id: `checklist-${Date.now()}`,
    paperId: paperTitle.replace(/\s+/g, "-").toLowerCase(),
    paperTitle,
    createdDate: new Date().toISOString().split("T")[0],
    status: "not_started",
    sections,
  };

  checklists.push(checklist);
  saveChecklists(checklists);

  const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);

  return {
    success: true,
    checklistId: checklist.id,
    paperTitle,
    paperType,
    totalItems,
    sections: sections.map((s) => ({ name: s.name, itemCount: s.items.length })),
    items: sections.flatMap((s) => s.items.map((i) => ({ section: s.name, description: i.description }))),
  };
}

function getChecklistTemplate(type: string, title: string): ChecklistSection[] {
  const common: ChecklistSection[] = [
    {
      name: "Paper Understanding",
      items: [
        { id: "u1", description: `Read "${title}" end-to-end`, completed: false },
        { id: "u2", description: "Identify the core contribution / novelty", completed: false },
        { id: "u3", description: "List all equations and understand each term", completed: false },
        { id: "u4", description: "Identify the loss function(s) used", completed: false },
        { id: "u5", description: "Note the datasets and evaluation metrics", completed: false },
        { id: "u6", description: "Check for official code repository", completed: false },
      ],
    },
    {
      name: "Data Pipeline",
      items: [
        { id: "d1", description: "Download the dataset(s) used", completed: false },
        { id: "d2", description: "Understand the data format (AnnData, h5ad, CSV, etc.)", completed: false },
        { id: "d3", description: "Implement data loading and preprocessing", completed: false },
        { id: "d4", description: "Implement train/validation/test splits (match paper)", completed: false },
        { id: "d5", description: "Verify data statistics match paper's reported numbers", completed: false },
      ],
    },
  ];

  const typeSpecific: Record<string, ChecklistSection[]> = {
    vae: [
      {
        name: "VAE Architecture",
        items: [
          { id: "v1", description: "Implement encoder network", completed: false },
          { id: "v2", description: "Implement reparameterization trick", completed: false },
          { id: "v3", description: "Implement decoder network", completed: false },
          { id: "v4", description: "Implement reconstruction loss", completed: false },
          { id: "v5", description: "Implement KL divergence term", completed: false },
          { id: "v6", description: "Implement any regularization terms", completed: false },
          { id: "v7", description: "Verify latent dimension matches paper", completed: false },
        ],
      },
    ],
    gnn: [
      {
        name: "GNN Architecture",
        items: [
          { id: "g1", description: "Construct graph from data (adjacency / edge list)", completed: false },
          { id: "g2", description: "Implement node feature initialization", completed: false },
          { id: "g3", description: "Implement message passing layers", completed: false },
          { id: "g4", description: "Implement aggregation function", completed: false },
          { id: "g5", description: "Implement readout / pooling", completed: false },
          { id: "g6", description: "Match number of layers and hidden dimensions", completed: false },
        ],
      },
    ],
    transformer: [
      {
        name: "Transformer Architecture",
        items: [
          { id: "t1", description: "Implement tokenization / input embedding", completed: false },
          { id: "t2", description: "Implement positional encoding", completed: false },
          { id: "t3", description: "Implement multi-head attention", completed: false },
          { id: "t4", description: "Implement feed-forward layers", completed: false },
          { id: "t5", description: "Implement layer normalization", completed: false },
          { id: "t6", description: "Match number of layers, heads, and dimensions", completed: false },
        ],
      },
    ],
    general: [
      {
        name: "Model Architecture",
        items: [
          { id: "m1", description: "Implement the core model architecture", completed: false },
          { id: "m2", description: "Match all hyperparameters from the paper", completed: false },
          { id: "m3", description: "Verify parameter count matches paper", completed: false },
        ],
      },
    ],
  };

  const training: ChecklistSection = {
    name: "Training",
    items: [
      { id: "tr1", description: "Implement training loop", completed: false },
      { id: "tr2", description: "Match optimizer and learning rate schedule", completed: false },
      { id: "tr3", description: "Match batch size", completed: false },
      { id: "tr4", description: "Match number of epochs", completed: false },
      { id: "tr5", description: "Implement early stopping / checkpointing", completed: false },
      { id: "tr6", description: "Implement logging (loss curves, metrics)", completed: false },
      { id: "tr7", description: "Verify training loss decreases as expected", completed: false },
    ],
  };

  const evaluation: ChecklistSection = {
    name: "Evaluation & Comparison",
    items: [
      { id: "e1", description: "Implement all evaluation metrics from paper", completed: false },
      { id: "e2", description: "Run evaluation on test set", completed: false },
      { id: "e3", description: "Compare results to published numbers", completed: false },
      { id: "e4", description: "Run ablation studies if applicable", completed: false },
      { id: "e5", description: "Document any discrepancies and hypothesize why", completed: false },
    ],
  };

  const documentation: ChecklistSection = {
    name: "Documentation & Sharing",
    items: [
      { id: "doc1", description: "Write README with clear instructions", completed: false },
      { id: "doc2", description: "Add requirements.txt / environment.yml", completed: false },
      { id: "doc3", description: "Create a results comparison table", completed: false },
      { id: "doc4", description: "Push to GitHub", completed: false },
      { id: "doc5", description: "Write a blog post or tweet about learnings", completed: false },
    ],
  };

  return [
    ...common,
    ...(typeSpecific[type] || typeSpecific.general),
    training,
    evaluation,
    documentation,
  ];
}

export function updateChecklistItem(
  checklistId: string,
  itemId: string,
  completed: boolean,
  notes?: string
): object {
  const checklists = loadChecklists();
  const checklist = checklists.find((c) => c.id === checklistId);
  if (!checklist) return { error: `Checklist "${checklistId}" not found.` };

  let found = false;
  for (const section of checklist.sections) {
    const item = section.items.find((i) => i.id === itemId);
    if (item) {
      item.completed = completed;
      if (notes) item.notes = notes;
      found = true;
      break;
    }
  }

  if (!found) return { error: `Item "${itemId}" not found in checklist.` };

  // Update checklist status
  const totalItems = checklist.sections.reduce((s, sec) => s + sec.items.length, 0);
  const completedItems = checklist.sections.reduce(
    (s, sec) => s + sec.items.filter((i) => i.completed).length, 0
  );

  if (completedItems === totalItems) checklist.status = "completed";
  else if (completedItems > 0) checklist.status = "in_progress";
  else checklist.status = "not_started";

  saveChecklists(checklists);

  return {
    success: true,
    checklist: checklist.paperTitle,
    progress: `${completedItems}/${totalItems}`,
    percentComplete: Math.round((completedItems / totalItems) * 100),
    status: checklist.status,
  };
}

export function getImplementationChecklists(checklistId?: string): object {
  const checklists = loadChecklists();

  if (checklistId) {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return { error: `Checklist "${checklistId}" not found.` };

    const totalItems = checklist.sections.reduce((s, sec) => s + sec.items.length, 0);
    const completedItems = checklist.sections.reduce(
      (s, sec) => s + sec.items.filter((i) => i.completed).length, 0
    );

    return {
      id: checklist.id,
      paperTitle: checklist.paperTitle,
      status: checklist.status,
      progress: `${completedItems}/${totalItems}`,
      percentComplete: Math.round((completedItems / totalItems) * 100),
      sections: checklist.sections.map((s) => ({
        name: s.name,
        completed: s.items.filter((i) => i.completed).length,
        total: s.items.length,
        items: s.items.map((i) => ({
          id: i.id,
          description: i.description,
          completed: i.completed,
          notes: i.notes,
        })),
      })),
    };
  }

  return {
    count: checklists.length,
    checklists: checklists.map((c) => {
      const totalItems = c.sections.reduce((s, sec) => s + sec.items.length, 0);
      const completedItems = c.sections.reduce(
        (s, sec) => s + sec.items.filter((i) => i.completed).length, 0
      );
      return {
        id: c.id,
        paperTitle: c.paperTitle,
        status: c.status,
        progress: `${completedItems}/${totalItems}`,
        percentComplete: Math.round((completedItems / totalItems) * 100),
        createdDate: c.createdDate,
      };
    }),
  };
}

// ============================================
// 5. Find Bridge Papers
// ============================================

export function findBridgePapers(topicA: string, topicB: string): object {
  const graph = loadCitationGraph();

  // Find papers that have both topics in their title/venue or are connected to papers in both topics
  const papersA = graph.nodes.filter((n) =>
    n.title.toLowerCase().includes(topicA.toLowerCase()) ||
    n.venue?.toLowerCase().includes(topicA.toLowerCase())
  );

  const papersB = graph.nodes.filter((n) =>
    n.title.toLowerCase().includes(topicB.toLowerCase()) ||
    n.venue?.toLowerCase().includes(topicB.toLowerCase())
  );

  // Direct bridges: papers that match both topics
  const directBridges = graph.nodes.filter((n) =>
    (n.title.toLowerCase().includes(topicA.toLowerCase()) ||
     n.venue?.toLowerCase().includes(topicA.toLowerCase())) &&
    (n.title.toLowerCase().includes(topicB.toLowerCase()) ||
     n.venue?.toLowerCase().includes(topicB.toLowerCase()))
  );

  // Indirect bridges: papers cited by both topic groups
  const aReferences = new Set(
    papersA.flatMap((p) =>
      graph.edges.filter((e) => e.from === p.paperId).map((e) => e.to)
    )
  );

  const bReferences = new Set(
    papersB.flatMap((p) =>
      graph.edges.filter((e) => e.from === p.paperId).map((e) => e.to)
    )
  );

  const sharedReferences = [...aReferences].filter((id) => bReferences.has(id));
  const indirectBridges = sharedReferences
    .map((id) => graph.nodes.find((n) => n.paperId === id))
    .filter(Boolean);

  return {
    topicA,
    topicB,
    directBridges: directBridges.map((n) => ({ title: n.title, year: n.year, citations: n.citationCount })),
    indirectBridges: indirectBridges.map((n: any) => ({ title: n.title, year: n.year, citations: n.citationCount })),
    suggestion: directBridges.length === 0 && indirectBridges.length === 0
      ? `No bridge papers found yet. Try adding more papers to your citation graph with search_semantic_scholar, then add_to_citation_graph.`
      : `Found ${directBridges.length} direct and ${indirectBridges.length} indirect bridge papers.`,
    searchQuery: `"${topicA}" "${topicB}"`,
  };
}

// ============================================
// 6. Citation Graph Stats & Visualization
// ============================================

export function citationGraphStats(): object {
  const graph = loadCitationGraph();

  if (graph.nodes.length === 0) {
    return {
      empty: true,
      message: "Citation graph is empty. Start by searching with search_semantic_scholar, then add papers with add_to_citation_graph.",
    };
  }

  const yearDist: Record<number, number> = {};
  for (const n of graph.nodes) {
    if (n.year) yearDist[n.year] = (yearDist[n.year] || 0) + 1;
  }

  const venueDist: Record<string, number> = {};
  for (const n of graph.nodes) {
    if (n.venue) venueDist[n.venue] = (venueDist[n.venue] || 0) + 1;
  }

  const edgeTypeDist: Record<string, number> = {};
  for (const e of graph.edges) {
    edgeTypeDist[e.type] = (edgeTypeDist[e.type] || 0) + 1;
  }

  // Most connected papers
  const connectivity = graph.nodes.map((n) => {
    const out = graph.edges.filter((e) => e.from === n.paperId).length;
    const inc = graph.edges.filter((e) => e.to === n.paperId).length;
    return { title: n.title, year: n.year, outgoing: out, incoming: inc, total: out + inc };
  }).sort((a, b) => b.total - a.total);

  return {
    totalPapers: graph.nodes.length,
    totalEdges: graph.edges.length,
    lineages: graph.lineages.length,
    yearDistribution: yearDist,
    topVenues: Object.entries(venueDist).sort(([, a], [, b]) => b - a).slice(0, 10),
    edgeTypes: edgeTypeDist,
    mostConnected: connectivity.slice(0, 10),
    lastUpdated: graph.lastUpdated,
  };
}
