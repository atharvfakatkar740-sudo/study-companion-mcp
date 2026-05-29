import { loadJSON, saveJSON } from "../utils/storage.js";
import { getStudyPhases } from "../engine/plan-loader.js";

// ============================================
// v3.0.1 — Concept Dependency Graph
// Directed acyclic graph of concept prerequisites
// ============================================

interface ConceptNode {
  id: string;
  name: string;
  topic?: string;
  description?: string;
  addedDate: string;
}

interface DependencyEdge {
  from: string; // prerequisite concept ID
  to: string;   // dependent concept ID
  strength: "required" | "recommended" | "helpful";
  addedDate: string;
}

interface ConceptGraph {
  nodes: ConceptNode[];
  edges: DependencyEdge[];
}

function loadGraph(): ConceptGraph {
  return loadJSON<ConceptGraph>("concept-graph.json", { nodes: [], edges: [] });
}

function saveGraph(graph: ConceptGraph): void {
  saveJSON("concept-graph.json", graph);
}

// --- Public API ---

export function addConcept(
  id: string,
  name: string,
  topic?: string,
  description?: string
): object {
  const graph = loadGraph();

  if (graph.nodes.some((n) => n.id === id)) {
    return { error: `Concept '${id}' already exists.` };
  }

  graph.nodes.push({
    id,
    name,
    topic: topic || "general",
    description,
    addedDate: new Date().toISOString().split("T")[0],
  });

  saveGraph(graph);
  return { success: true, message: `Concept '${name}' added.`, totalConcepts: graph.nodes.length };
}

export function addConceptDependency(
  prerequisiteId: string,
  dependentId: string,
  strength: "required" | "recommended" | "helpful" = "required"
): object {
  const graph = loadGraph();

  // Auto-create nodes if they don't exist
  for (const id of [prerequisiteId, dependentId]) {
    if (!graph.nodes.some((n) => n.id === id)) {
      graph.nodes.push({
        id,
        name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        addedDate: new Date().toISOString().split("T")[0],
      });
    }
  }

  // Check for duplicate edge
  if (graph.edges.some((e) => e.from === prerequisiteId && e.to === dependentId)) {
    return { error: `Dependency '${prerequisiteId}' → '${dependentId}' already exists.` };
  }

  // Check for cycle
  if (wouldCreateCycle(graph, prerequisiteId, dependentId)) {
    return { error: `Adding '${prerequisiteId}' → '${dependentId}' would create a cycle.` };
  }

  graph.edges.push({
    from: prerequisiteId,
    to: dependentId,
    strength,
    addedDate: new Date().toISOString().split("T")[0],
  });

  saveGraph(graph);
  return {
    success: true,
    message: `Dependency added: '${prerequisiteId}' → '${dependentId}' (${strength}).`,
    totalEdges: graph.edges.length,
  };
}

function wouldCreateCycle(graph: ConceptGraph, from: string, to: string): boolean {
  // BFS from 'from' following reverse edges — if we can reach 'to', it's a cycle
  const visited = new Set<string>();
  const queue = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) return false; // 'to' reaching 'from' is fine, we need 'from' reachable from 'to'
    visited.add(current);
  }

  // Actually: check if 'from' is reachable from 'to' via existing edges
  const visited2 = new Set<string>();
  const queue2 = [to];

  while (queue2.length > 0) {
    const current = queue2.shift()!;
    if (current === from) return true; // 'to' can reach 'from', so adding from→to makes a cycle
    if (visited2.has(current)) continue;
    visited2.add(current);

    for (const edge of graph.edges) {
      if (edge.from === current && !visited2.has(edge.to)) {
        queue2.push(edge.to);
      }
    }
  }

  return false;
}

export function getLearningPath(targetConceptId: string): object {
  const graph = loadGraph();
  const node = graph.nodes.find((n) => n.id === targetConceptId);
  if (!node) return { error: `Concept '${targetConceptId}' not found.` };

  // Topological sort of all ancestors
  const ancestors = getAllPrerequisites(graph, targetConceptId);
  const sorted = topologicalSort(graph, ancestors);

  // Check mastery state
  const mastery = loadJSON<Record<string, MasteryInfo>>("mastery-state.json", {});
  const revisions = loadJSON<any[]>("revisions.json", []);
  const completedTopics = loadJSON<{ completedTopics: string[] }>("planner-state.json", { completedTopics: [] }).completedTopics;

  const path = sorted.map((id, index) => {
    const concept = graph.nodes.find((n) => n.id === id);
    const masteryLevel = mastery[id]?.level || "unknown";
    const hasRevision = revisions.some((r: any) => r.concept.toLowerCase().includes(id.replace(/-/g, " ").toLowerCase()));

    return {
      step: index + 1,
      conceptId: id,
      name: concept?.name || id,
      topic: concept?.topic,
      mastery: masteryLevel,
      inSRS: hasRevision,
      prerequisites: graph.edges
        .filter((e) => e.to === id)
        .map((e) => ({ id: e.from, strength: e.strength })),
    };
  });

  // Add the target itself
  path.push({
    step: path.length + 1,
    conceptId: targetConceptId,
    name: node.name,
    topic: node.topic,
    mastery: mastery[targetConceptId]?.level || "unknown",
    inSRS: revisions.some((r: any) => r.concept.toLowerCase().includes(targetConceptId.replace(/-/g, " ").toLowerCase())),
    prerequisites: graph.edges
      .filter((e) => e.to === targetConceptId)
      .map((e) => ({ id: e.from, strength: e.strength })),
  });

  const unknownCount = path.filter((p) => p.mastery === "unknown" || p.mastery === "beginner").length;

  return {
    target: node.name,
    totalSteps: path.length,
    knowledgeGaps: unknownCount,
    path,
    recommendation: unknownCount > 3
      ? "Multiple gaps detected. Focus on the earliest unmastered concept first."
      : unknownCount > 0
      ? "A few gaps remain. You're close to mastering the full path."
      : "All prerequisites appear mastered. Ready to tackle the target concept!",
  };
}

function getAllPrerequisites(graph: ConceptGraph, conceptId: string): Set<string> {
  const prereqs = new Set<string>();
  const queue = [conceptId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.edges) {
      if (edge.to === current && !prereqs.has(edge.from)) {
        prereqs.add(edge.from);
        queue.push(edge.from);
      }
    }
  }

  return prereqs;
}

function topologicalSort(graph: ConceptGraph, nodeIds: Set<string>): string[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adj[id] = [];
  }

  for (const edge of graph.edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adj[edge.from].push(edge.to);
      inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
    }
  }

  const queue = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of (adj[current] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return sorted;
}

export function visualizeKnowledgeGraph(topic?: string): object {
  const graph = loadGraph();
  const mastery = loadJSON<Record<string, MasteryInfo>>("mastery-state.json", {});

  let filteredNodes = graph.nodes;
  let filteredEdges = graph.edges;

  if (topic) {
    const topicLower = topic.toLowerCase();
    filteredNodes = graph.nodes.filter(
      (n) => n.topic?.toLowerCase().includes(topicLower) || n.name.toLowerCase().includes(topicLower)
    );
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    filteredEdges = graph.edges.filter((e) => nodeIds.has(e.from) || nodeIds.has(e.to));
    // Also include connected nodes
    for (const edge of filteredEdges) {
      if (!nodeIds.has(edge.from)) {
        const node = graph.nodes.find((n) => n.id === edge.from);
        if (node) filteredNodes.push(node);
        nodeIds.add(edge.from);
      }
      if (!nodeIds.has(edge.to)) {
        const node = graph.nodes.find((n) => n.id === edge.to);
        if (node) filteredNodes.push(node);
        nodeIds.add(edge.to);
      }
    }
  }

  // Generate Mermaid diagram
  const mermaidLines = ["graph TD"];
  for (const node of filteredNodes) {
    const level = mastery[node.id]?.level || "unknown";
    const style = level === "advanced" ? ":::done" : level === "intermediate" ? ":::progress" : "";
    mermaidLines.push(`    ${node.id}["${node.name}"]${style}`);
  }
  for (const edge of filteredEdges) {
    const arrow = edge.strength === "required" ? "-->" : edge.strength === "recommended" ? "-.->": "-.->";
    mermaidLines.push(`    ${edge.from} ${arrow} ${edge.to}`);
  }

  // ASCII representation
  const asciiLines: string[] = [];
  const roots = filteredNodes.filter((n) => !filteredEdges.some((e) => e.to === n.id));
  for (const root of roots) {
    buildAsciiTree(graph, mastery, root.id, asciiLines, "", true, new Set());
  }

  return {
    title: topic ? `Knowledge Graph: ${topic}` : "Full Knowledge Graph",
    nodeCount: filteredNodes.length,
    edgeCount: filteredEdges.length,
    mermaid: mermaidLines.join("\n"),
    ascii: asciiLines.join("\n"),
    legend: {
      "→": "required dependency",
      "-.->": "recommended dependency",
      "✅": "advanced mastery",
      "🔵": "intermediate mastery",
      "⬜": "unknown/beginner",
    },
  };
}

function buildAsciiTree(
  graph: ConceptGraph,
  mastery: Record<string, MasteryInfo>,
  nodeId: string,
  lines: string[],
  prefix: string,
  isLast: boolean,
  visited: Set<string>
): void {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  const node = graph.nodes.find((n) => n.id === nodeId);
  const level = mastery[nodeId]?.level || "unknown";
  const icon = level === "advanced" ? "[OK]" : level === "intermediate" ? "[~~]" : "[  ]";
  const connector = isLast ? "└── " : "├── ";

  lines.push(`${prefix}${connector}${icon} ${node?.name || nodeId}`);

  const children = graph.edges
    .filter((e) => e.from === nodeId)
    .map((e) => e.to);

  const childPrefix = prefix + (isLast ? "    " : "│   ");
  children.forEach((childId, i) => {
    buildAsciiTree(graph, mastery, childId, lines, childPrefix, i === children.length - 1, visited);
  });
}

export function findKnowledgeGaps(): object {
  const graph = loadGraph();
  const mastery = loadJSON<Record<string, MasteryInfo>>("mastery-state.json", {});
  const phases = getStudyPhases();
  const completedTopics = loadJSON<{ completedTopics: string[] }>("planner-state.json", { completedTopics: [] }).completedTopics;

  const gaps: Array<{
    concept: string;
    name: string;
    blockedConcepts: string[];
    severity: "critical" | "moderate" | "minor";
  }> = [];

  for (const node of graph.nodes) {
    const level = mastery[node.id]?.level || "unknown";
    if (level === "advanced" || level === "intermediate") continue;

    // What does this concept block?
    const dependents = graph.edges
      .filter((e) => e.from === node.id && e.strength === "required")
      .map((e) => e.to);

    if (dependents.length === 0) continue;

    // Check if any dependents are needed for current phase
    const currentPhaseTopics = phases.flatMap((p) => p.topics.map((t) => t.id));
    const blocksCurrentPhase = dependents.some((d) => {
      const dNode = graph.nodes.find((n) => n.id === d);
      return dNode?.topic && currentPhaseTopics.some((t) => t.includes(dNode.topic || ""));
    });

    gaps.push({
      concept: node.id,
      name: node.name,
      blockedConcepts: dependents.map((d) => graph.nodes.find((n) => n.id === d)?.name || d),
      severity: dependents.length > 2 ? "critical" : blocksCurrentPhase ? "moderate" : "minor",
    });
  }

  // Sort by severity
  const severityRank = { critical: 0, moderate: 1, minor: 2 };
  gaps.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    title: "Knowledge Gap Analysis",
    totalGaps: gaps.length,
    critical: gaps.filter((g) => g.severity === "critical").length,
    moderate: gaps.filter((g) => g.severity === "moderate").length,
    minor: gaps.filter((g) => g.severity === "minor").length,
    gaps: gaps.slice(0, 15),
    recommendation: gaps.length === 0
      ? "No significant knowledge gaps detected. Well done!"
      : `Focus on the ${gaps.filter((g) => g.severity === "critical").length} critical gap(s) first — they block the most downstream concepts.`,
  };
}

export function suggestNextConcept(): object {
  const graph = loadGraph();
  const mastery = loadJSON<Record<string, MasteryInfo>>("mastery-state.json", {});
  const revisions = loadJSON<any[]>("revisions.json", []);
  const today = new Date().toISOString().split("T")[0];

  // Find concepts where all prerequisites are met but concept itself is unmastered
  const candidates: Array<{
    id: string;
    name: string;
    topic?: string;
    score: number;
    reason: string;
  }> = [];

  for (const node of graph.nodes) {
    const level = mastery[node.id]?.level || "unknown";
    if (level === "advanced") continue; // Already mastered

    // Check prerequisites
    const prereqs = graph.edges.filter((e) => e.to === node.id && e.strength === "required");
    const allPrereqsMet = prereqs.every((e) => {
      const prereqLevel = mastery[e.from]?.level || "unknown";
      return prereqLevel === "advanced" || prereqLevel === "intermediate";
    });

    if (!allPrereqsMet && prereqs.length > 0) continue; // Skip if prerequisites not met

    // Score: prioritize by number of dependents (high-impact concepts first)
    const dependentCount = graph.edges.filter((e) => e.from === node.id).length;
    const hasSRSDue = revisions.some((r: any) =>
      r.concept.toLowerCase().includes(node.id.replace(/-/g, " ").toLowerCase()) && r.nextReview <= today
    );

    let score = dependentCount * 10;
    if (level === "unknown") score += 5; // Unstarted concepts get a boost
    if (hasSRSDue) score += 3; // Has pending review
    if (prereqs.length === 0) score -= 2; // Foundational (already easy)

    const reason = dependentCount > 2
      ? `Unlocks ${dependentCount} downstream concepts`
      : level === "beginner"
      ? "Previously started but not yet solid"
      : prereqs.length === 0
      ? "Foundational concept — good starting point"
      : "All prerequisites met — ready to learn";

    candidates.push({ id: node.id, name: node.name, topic: node.topic, score, reason });
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    title: "Suggested Next Concepts",
    suggestions: candidates.slice(0, 5),
    totalCandidates: candidates.length,
    message: candidates.length === 0
      ? "No suggestions — either all concepts mastered or prerequisites not met."
      : `Top recommendation: Start with '${candidates[0].name}' — ${candidates[0].reason}.`,
  };
}

export function getGraphStats(): object {
  const graph = loadGraph();
  const mastery = loadJSON<Record<string, MasteryInfo>>("mastery-state.json", {});

  const byTopic: Record<string, number> = {};
  const byMastery: Record<string, number> = { unknown: 0, beginner: 0, intermediate: 0, advanced: 0 };

  for (const node of graph.nodes) {
    const t = node.topic || "general";
    byTopic[t] = (byTopic[t] || 0) + 1;
    const level = mastery[node.id]?.level || "unknown";
    byMastery[level] = (byMastery[level] || 0) + 1;
  }

  // Find most connected concepts
  const connectionCount: Record<string, number> = {};
  for (const edge of graph.edges) {
    connectionCount[edge.from] = (connectionCount[edge.from] || 0) + 1;
    connectionCount[edge.to] = (connectionCount[edge.to] || 0) + 1;
  }

  const hubs = Object.entries(connectionCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({
      concept: graph.nodes.find((n) => n.id === id)?.name || id,
      connections: count,
    }));

  return {
    totalConcepts: graph.nodes.length,
    totalDependencies: graph.edges.length,
    byTopic,
    byMastery,
    hubConcepts: hubs,
  };
}

// Re-export for mastery system
interface MasteryInfo {
  level: "beginner" | "intermediate" | "advanced" | "unknown";
  score: number;
  assessments: number;
  lastAssessed: string;
}
