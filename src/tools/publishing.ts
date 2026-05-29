import { loadJSON, saveJSON } from "../utils/storage.js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================
// v3.3 — Publishing Strategy & Conference Intelligence
// Conference tracking, publication readiness, co-author strategy,
// ecosystem visibility, notification integration
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

// --- Types ---

interface ConferenceEntry {
  id: string;
  name: string;
  fullName: string;
  tier: "S" | "A" | "B";
  type: "conference" | "journal" | "workshop";
  url: string;
  typical_deadline_month: number | null;
  typical_conference_month: number | null;
  deadlines: Record<string, string>;
  topics: string[];
  strategic_fit: string;
  your_entry_path: string[];
  workshop_targets: string[];
  difficulty: string;
  phase_target: string;
}

interface ConferencesData {
  conferences: ConferenceEntry[];
  publication_timeline: Record<string, any>;
  first_paper_strategies: any[];
}

interface PublishingStrategyData {
  target_researchers: TargetResearcher[];
  coauthor_strategy: Record<string, any>;
  ecosystems: EcosystemEntry[];
  key_insight: string;
}

interface TargetResearcher {
  id: string;
  name: string;
  role: string;
  lab: string;
  focus: string[];
  key_papers: string[];
  alignment: string;
  collaboration_strategy: string;
  contact_readiness_criteria: string[];
  urls: Record<string, string>;
}

interface EcosystemEntry {
  id: string;
  name: string;
  url: string;
  description: string;
  connected_to: string[];
  contribution_targets: string[];
  priority: string;
  status: string;
  contributions: any[];
}

interface PublicationProgress {
  currentPhase: string;
  papers: PaperDraft[];
  submissions: Submission[];
  ecosystemContributions: EcosystemContribution[];
}

interface PaperDraft {
  id: string;
  title: string;
  strategy: string;
  targetVenue: string;
  status: "idea" | "planning" | "implementing" | "writing" | "submitted" | "revision" | "accepted" | "rejected";
  coauthors: string[];
  startDate: string;
  lastUpdated: string;
  notes: string;
}

interface Submission {
  paperId: string;
  venue: string;
  submittedDate: string;
  status: "submitted" | "under_review" | "revision_requested" | "accepted" | "rejected";
  reviewNotes?: string;
  decision?: string;
}

interface EcosystemContribution {
  ecosystem: string;
  type: "pr" | "issue" | "review" | "documentation" | "feature" | "bug_fix";
  repo: string;
  description: string;
  url?: string;
  date: string;
  status: "open" | "merged" | "closed";
}

// --- Loaders ---

function loadConferences(): ConferencesData {
  const filePath = join(DATA_DIR, "conferences.json");
  if (!existsSync(filePath)) return { conferences: [], publication_timeline: {}, first_paper_strategies: [] };
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return { conferences: [], publication_timeline: {}, first_paper_strategies: [] };
  }
}

function loadPublishingStrategy(): PublishingStrategyData {
  const filePath = join(DATA_DIR, "publishing-strategy.json");
  if (!existsSync(filePath)) return { target_researchers: [], coauthor_strategy: {}, ecosystems: [], key_insight: "" };
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return { target_researchers: [], coauthor_strategy: {}, ecosystems: [], key_insight: "" };
  }
}

function loadPublicationProgress(): PublicationProgress {
  return loadJSON<PublicationProgress>("publication-progress.json", {
    currentPhase: "phase1_0_6_months",
    papers: [],
    submissions: [],
    ecosystemContributions: [],
  });
}

function savePublicationProgress(progress: PublicationProgress): void {
  saveJSON("publication-progress.json", progress);
}

// ============================================
// 1. Conference Tracking & Deadlines
// ============================================

export function getConferenceDeadlines(tier?: string, withinDays?: number): object {
  const data = loadConferences();
  const now = new Date();
  const cutoff = withinDays ? new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000) : null;

  let conferences = data.conferences;
  if (tier) {
    conferences = conferences.filter((c) => c.tier === tier.toUpperCase());
  }

  // Collect all upcoming deadlines
  const upcoming: Array<{
    conference: string;
    tier: string;
    type: string;
    date: string;
    daysUntil: number;
    strategicFit: string;
  }> = [];

  for (const conf of conferences) {
    for (const [deadlineType, dateStr] of Object.entries(conf.deadlines)) {
      const deadline = new Date(dateStr);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysUntil < -30) continue; // skip long-past deadlines
      if (cutoff && deadline > cutoff) continue;

      upcoming.push({
        conference: conf.name,
        tier: conf.tier,
        type: deadlineType.replace(/_/g, " "),
        date: dateStr,
        daysUntil,
        strategicFit: conf.strategic_fit,
      });
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  // Separate into urgent, upcoming, and future
  const urgent = upcoming.filter((d) => d.daysUntil >= 0 && d.daysUntil <= 14);
  const soon = upcoming.filter((d) => d.daysUntil > 14 && d.daysUntil <= 60);
  const future = upcoming.filter((d) => d.daysUntil > 60);
  const passed = upcoming.filter((d) => d.daysUntil < 0);

  return {
    title: "Conference Deadline Tracker",
    urgent: urgent.length > 0 ? urgent : "No urgent deadlines",
    comingSoon: soon.slice(0, 10),
    future: future.slice(0, 10),
    recentlyPassed: passed.slice(0, 5),
    totalTracked: conferences.length,
  };
}

export function getConferenceInfo(conferenceId: string): object {
  const data = loadConferences();
  const conf = data.conferences.find((c) => c.id === conferenceId.toLowerCase());
  if (!conf) {
    return {
      error: `Conference "${conferenceId}" not found.`,
      available: data.conferences.map((c) => ({ id: c.id, name: c.name, tier: c.tier })),
    };
  }

  const now = new Date();
  const deadlinesWithStatus = Object.entries(conf.deadlines).map(([type, dateStr]) => {
    const deadline = new Date(dateStr);
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return {
      type: type.replace(/_/g, " "),
      date: dateStr,
      daysUntil,
      status: daysUntil < 0 ? "passed" : daysUntil <= 14 ? "urgent" : "upcoming",
    };
  });

  return {
    id: conf.id,
    name: conf.name,
    fullName: conf.fullName,
    tier: conf.tier,
    type: conf.type,
    url: conf.url,
    difficulty: conf.difficulty,
    phaseTarget: conf.phase_target,
    topics: conf.topics,
    strategicFit: conf.strategic_fit,
    yourEntryPath: conf.your_entry_path,
    workshopTargets: conf.workshop_targets,
    deadlines: deadlinesWithStatus,
  };
}

export function getConferencesByTier(): object {
  const data = loadConferences();

  const tiers: Record<string, any[]> = { S: [], A: [], B: [] };
  for (const conf of data.conferences) {
    tiers[conf.tier]?.push({
      id: conf.id,
      name: conf.name,
      fullName: conf.fullName,
      type: conf.type,
      difficulty: conf.difficulty,
      phaseTarget: conf.phase_target,
      strategicFit: conf.strategic_fit,
    });
  }

  return {
    title: "Conference & Journal Tiers for AI + Computational Biology",
    tierS: {
      label: "Tier S — Highest Strategic Value (trajectory-changing)",
      venues: tiers.S,
    },
    tierA: {
      label: "Tier A — Extremely Important",
      venues: tiers.A,
    },
    tierB: {
      label: "Tier B — Specialized But Valuable",
      venues: tiers.B,
    },
    totalVenues: data.conferences.length,
  };
}

// ============================================
// 2. Publication Strategy & Readiness
// ============================================

export function getPublicationStrategy(): object {
  const data = loadConferences();
  const strategy = loadPublishingStrategy();
  const progress = loadPublicationProgress();
  const plannerState = loadJSON<any>("planner-state.json", {});
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});

  // Assess current readiness
  const completedTopics = plannerState.completedTopics?.length || 0;
  const totalHours = plannerState.totalStudyHours || 0;
  const masteredConcepts = Object.values(mastery).filter((m: any) => m.level === "advanced" || m.level === "expert").length;
  const papersWritten = progress.papers.length;
  const contributions = progress.ecosystemContributions.length;

  // Determine phase
  let recommendedPhase = "phase1_0_6_months";
  if (totalHours > 500 && completedTopics > 15 && masteredConcepts > 10) {
    recommendedPhase = "phase3_1_2_years";
  } else if (totalHours > 200 && completedTopics > 8 && masteredConcepts > 5) {
    recommendedPhase = "phase2_6_12_months";
  }

  const timeline = data.publication_timeline[recommendedPhase] || {};

  return {
    title: "Publication Strategy Dashboard",
    currentPhase: recommendedPhase.replace(/_/g, " "),
    readinessMetrics: {
      studyHours: totalHours,
      completedTopics,
      masteredConcepts,
      papersInProgress: papersWritten,
      ecosystemContributions: contributions,
    },
    phaseGuidance: timeline,
    strategies: data.first_paper_strategies.map((s) => ({
      name: s.name,
      description: s.description,
      difficulty: s.difficulty,
      timeEstimate: s.time_estimate,
      recommended: s.recommended,
    })),
    keyInsight: strategy.key_insight,
    nextActions: getPublishingNextActions(recommendedPhase, progress, contributions),
  };
}

function getPublishingNextActions(phase: string, progress: PublicationProgress, contributions: number): string[] {
  const actions: string[] = [];

  if (phase === "phase1_0_6_months") {
    actions.push("Focus on learning — NO publication pressure yet");
    actions.push("Start reproducing key papers (scGen, CPA, scVI)");
    actions.push("Write blog posts about what you learn");
    actions.push("Set up a clean GitHub portfolio");
    if (contributions === 0) actions.push("Make your first open-source contribution to scverse/scanpy");
  } else if (phase === "phase2_6_12_months") {
    actions.push("Target NeurIPS/ICLR workshop paper (ML4H, LMRL)");
    actions.push("Post a preprint on arXiv");
    if (progress.papers.length === 0) actions.push("Start drafting your first paper — use 'start_paper_draft'");
    actions.push("Increase open-source contributions to become visible");
  } else {
    actions.push("Target strong first-author paper at ISMB/Bioinformatics/RECOMB");
    actions.push("Identify co-author candidates from target labs");
    actions.push("Submit to workshops of tier-S conferences");
  }

  return actions;
}

// ============================================
// 3. Paper Draft Tracking
// ============================================

export function startPaperDraft(
  title: string,
  strategy: string,
  targetVenue: string,
  coauthors: string[] = [],
  notes: string = ""
): object {
  const progress = loadPublicationProgress();
  const today = new Date().toISOString().split("T")[0];

  const draft: PaperDraft = {
    id: `draft-${Date.now()}`,
    title,
    strategy,
    targetVenue,
    status: "idea",
    coauthors,
    startDate: today,
    lastUpdated: today,
    notes,
  };

  progress.papers.push(draft);
  savePublicationProgress(progress);

  return {
    success: true,
    draftId: draft.id,
    title,
    strategy,
    targetVenue,
    message: `Paper draft created. Update status with update_paper_draft as you progress: idea → planning → implementing → writing → submitted.`,
  };
}

export function updatePaperDraft(
  draftId: string,
  updates: {
    status?: string;
    title?: string;
    targetVenue?: string;
    coauthors?: string[];
    notes?: string;
  }
): object {
  const progress = loadPublicationProgress();
  const draft = progress.papers.find((p) => p.id === draftId);
  if (!draft) return { error: `Draft "${draftId}" not found.` };

  if (updates.status) draft.status = updates.status as PaperDraft["status"];
  if (updates.title) draft.title = updates.title;
  if (updates.targetVenue) draft.targetVenue = updates.targetVenue;
  if (updates.coauthors) draft.coauthors = updates.coauthors;
  if (updates.notes) draft.notes = updates.notes;
  draft.lastUpdated = new Date().toISOString().split("T")[0];

  savePublicationProgress(progress);

  return { success: true, draft };
}

export function getPaperDrafts(): object {
  const progress = loadPublicationProgress();

  return {
    totalDrafts: progress.papers.length,
    byStatus: {
      idea: progress.papers.filter((p) => p.status === "idea").length,
      planning: progress.papers.filter((p) => p.status === "planning").length,
      implementing: progress.papers.filter((p) => p.status === "implementing").length,
      writing: progress.papers.filter((p) => p.status === "writing").length,
      submitted: progress.papers.filter((p) => p.status === "submitted").length,
      accepted: progress.papers.filter((p) => p.status === "accepted").length,
    },
    papers: progress.papers.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      targetVenue: p.targetVenue,
      strategy: p.strategy,
      coauthors: p.coauthors,
      lastUpdated: p.lastUpdated,
    })),
  };
}

// ============================================
// 4. Co-Author & Researcher Targeting
// ============================================

export function getTargetResearchers(alignment?: string): object {
  const strategy = loadPublishingStrategy();
  let researchers = strategy.target_researchers;

  if (alignment) {
    researchers = researchers.filter((r) =>
      r.alignment === alignment || r.alignment.includes(alignment)
    );
  }

  return {
    title: "Target Researchers & Collaboration Strategy",
    researchers: researchers.map((r) => ({
      name: r.name,
      role: r.role,
      lab: r.lab,
      focus: r.focus,
      alignment: r.alignment,
      keyPapers: r.key_papers,
      strategy: r.collaboration_strategy,
      readinessCriteria: r.contact_readiness_criteria,
    })),
    coauthorStrategy: strategy.coauthor_strategy,
    keyInsight: "PhD students and postdocs in top labs are your actual entry points, NOT the PIs directly.",
  };
}

export function checkOutreachReadiness(researcherId: string): object {
  const strategy = loadPublishingStrategy();
  const researcher = strategy.target_researchers.find((r) => r.id === researcherId);
  if (!researcher) {
    return {
      error: `Researcher "${researcherId}" not found.`,
      available: strategy.target_researchers.map((r) => ({ id: r.id, name: r.name })),
    };
  }

  const progress = loadPublicationProgress();
  const plannerState = loadJSON<any>("planner-state.json", {});
  const papers = loadJSON<any[]>("papers.json", []);

  // Check each criterion
  const criteriaResults = researcher.contact_readiness_criteria.map((criterion) => {
    // Heuristic checks based on data
    let met = false;
    let evidence = "Not enough data to assess";

    if (criterion.toLowerCase().includes("reproduced")) {
      const completedPapers = papers.filter((p: any) => p.status === "completed").length;
      met = completedPapers >= 2;
      evidence = `${completedPapers} papers completed`;
    } else if (criterion.toLowerCase().includes("published") || criterion.toLowerCase().includes("preprint")) {
      const publishedPapers = progress.papers.filter((p) => p.status === "accepted" || p.status === "submitted");
      met = publishedPapers.length >= 1;
      evidence = `${publishedPapers.length} papers published/submitted`;
    } else if (criterion.toLowerCase().includes("contributor") || criterion.toLowerCase().includes("contribut")) {
      const contribs = progress.ecosystemContributions.filter((c) => c.status === "merged").length;
      met = contribs >= 3;
      evidence = `${contribs} merged contributions`;
    } else if (criterion.toLowerCase().includes("github") || criterion.toLowerCase().includes("repo")) {
      met = false;
      evidence = "Check your GitHub manually";
    }

    return { criterion, met, evidence };
  });

  const readyCount = criteriaResults.filter((c) => c.met).length;
  const totalCriteria = criteriaResults.length;
  const readinessScore = totalCriteria > 0 ? Math.round((readyCount / totalCriteria) * 100) : 0;

  return {
    researcher: researcher.name,
    lab: researcher.lab,
    alignment: researcher.alignment,
    readinessScore: `${readinessScore}%`,
    ready: readinessScore >= 75,
    criteria: criteriaResults,
    strategy: researcher.collaboration_strategy,
    recommendation: readinessScore >= 75
      ? "You're ready to reach out! Start with a substantive email showing your work."
      : readinessScore >= 50
      ? "Almost there. Focus on the unmet criteria before reaching out."
      : "Not ready yet. Focus on building substance first — rushing outreach wastes the opportunity.",
  };
}

// ============================================
// 5. Ecosystem Visibility Tracking
// ============================================

export function logEcosystemContribution(
  ecosystem: string,
  type: "pr" | "issue" | "review" | "documentation" | "feature" | "bug_fix",
  repo: string,
  description: string,
  url?: string
): object {
  const progress = loadPublicationProgress();
  const today = new Date().toISOString().split("T")[0];

  const contribution: EcosystemContribution = {
    ecosystem,
    type,
    repo,
    description,
    url,
    date: today,
    status: "open",
  };

  progress.ecosystemContributions.push(contribution);
  savePublicationProgress(progress);

  // Check if this matches a target ecosystem
  const strategy = loadPublishingStrategy();
  const targetEcosystem = strategy.ecosystems.find((e) => e.id === ecosystem.toLowerCase());

  return {
    success: true,
    contribution,
    targetEcosystem: targetEcosystem ? {
      name: targetEcosystem.name,
      priority: targetEcosystem.priority,
      message: `Great! This counts toward your ${targetEcosystem.name} visibility.`,
    } : null,
    totalContributions: progress.ecosystemContributions.length,
  };
}

export function getEcosystemVisibility(): object {
  const strategy = loadPublishingStrategy();
  const progress = loadPublicationProgress();

  const ecosystemStats = strategy.ecosystems.map((eco) => {
    const contribs = progress.ecosystemContributions.filter(
      (c) => c.ecosystem.toLowerCase() === eco.id
    );
    const merged = contribs.filter((c) => c.status === "merged").length;

    return {
      id: eco.id,
      name: eco.name,
      url: eco.url,
      priority: eco.priority,
      description: eco.description,
      connectedTo: eco.connected_to,
      contributionTargets: eco.contribution_targets,
      contributions: contribs.length,
      merged,
      visibility: merged >= 5 ? "high" : merged >= 2 ? "medium" : merged >= 1 ? "low" : "none",
    };
  });

  // Overall contribution summary
  const totalContribs = progress.ecosystemContributions.length;
  const totalMerged = progress.ecosystemContributions.filter((c) => c.status === "merged").length;
  const contributionTypes: Record<string, number> = {};
  for (const c of progress.ecosystemContributions) {
    contributionTypes[c.type] = (contributionTypes[c.type] || 0) + 1;
  }

  return {
    title: "Open-Source Ecosystem Visibility",
    ecosystems: ecosystemStats,
    overall: {
      totalContributions: totalContribs,
      totalMerged: totalMerged,
      contributionTypes,
    },
    recommendations: getEcosystemRecommendations(ecosystemStats),
  };
}

function getEcosystemRecommendations(stats: any[]): string[] {
  const recs: string[] = [];

  const critical = stats.filter((s) => s.priority === "critical" && s.visibility === "none");
  if (critical.length > 0) {
    recs.push(`Start contributing to ${critical.map((s) => s.name).join(", ")} — these are critical for your visibility.`);
  }

  const noContribs = stats.filter((s) => s.contributions === 0);
  if (noContribs.length === stats.length) {
    recs.push("No contributions yet! Start with documentation fixes or small bug reports — low friction, high visibility.");
  }

  const highPriority = stats.filter((s) => s.priority === "high" && s.contributions === 0);
  if (highPriority.length > 0) {
    recs.push(`Consider contributing to: ${highPriority.map((s) => s.name).join(", ")}`);
  }

  if (recs.length === 0) {
    recs.push("You're building visibility across ecosystems. Keep it up and aim for deeper contributions (features, not just fixes).");
  }

  return recs;
}

// ============================================
// 6. Conference Notification Scheduler
// ============================================

export function getConferenceAlerts(): object {
  const data = loadConferences();
  const now = new Date();

  const alerts: Array<{
    level: "critical" | "warning" | "info";
    conference: string;
    tier: string;
    deadline: string;
    date: string;
    daysUntil: number;
    action: string;
  }> = [];

  for (const conf of data.conferences) {
    for (const [type, dateStr] of Object.entries(conf.deadlines)) {
      const deadline = new Date(dateStr);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysUntil < 0) continue;

      if (daysUntil <= 7) {
        alerts.push({
          level: "critical",
          conference: conf.name,
          tier: conf.tier,
          deadline: type.replace(/_/g, " "),
          date: dateStr,
          daysUntil,
          action: `${conf.name} ${type.replace(/_/g, " ")} deadline in ${daysUntil} days! Decide NOW if you're submitting.`,
        });
      } else if (daysUntil <= 30) {
        alerts.push({
          level: "warning",
          conference: conf.name,
          tier: conf.tier,
          deadline: type.replace(/_/g, " "),
          date: dateStr,
          daysUntil,
          action: `${conf.name} ${type.replace(/_/g, " ")} deadline in ${daysUntil} days. Start preparing if you plan to submit.`,
        });
      } else if (daysUntil <= 90 && type.includes("paper") && conf.tier === "S") {
        alerts.push({
          level: "info",
          conference: conf.name,
          tier: conf.tier,
          deadline: type.replace(/_/g, " "),
          date: dateStr,
          daysUntil,
          action: `${conf.name} ${type.replace(/_/g, " ")} in ${daysUntil} days. Good time to start a project targeting this venue.`,
        });
      }
    }
  }

  alerts.sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    title: "Conference Alerts",
    criticalAlerts: alerts.filter((a) => a.level === "critical"),
    warnings: alerts.filter((a) => a.level === "warning"),
    upcoming: alerts.filter((a) => a.level === "info"),
    totalAlerts: alerts.length,
  };
}

// ============================================
// 7. First Paper Strategy Advisor
// ============================================

export function getFirstPaperAdvice(): object {
  const data = loadConferences();
  const plannerState = loadJSON<any>("planner-state.json", {});
  const mastery = loadJSON<Record<string, any>>("mastery-state.json", {});
  const papers = loadJSON<any[]>("papers.json", []);

  const completedPapers = papers.filter((p: any) => p.status === "completed");
  const totalHours = plannerState.totalStudyHours || 0;

  // Assess which strategies are most viable
  const strategies = data.first_paper_strategies.map((s) => {
    let viability = "low";
    const reasons: string[] = [];

    if (s.id === "reproduce-improve") {
      if (completedPapers.length >= 2 && totalHours >= 100) {
        viability = "high";
        reasons.push(`You've read ${completedPapers.length} papers — ready to reproduce`);
      } else if (completedPapers.length >= 1) {
        viability = "medium";
        reasons.push("Read more papers first, then pick one to reproduce");
      } else {
        reasons.push("Read and understand key papers before reproducing");
      }
    } else if (s.id === "gnns-cell-interaction") {
      const gnnMastery = Object.entries(mastery).filter(([k]) => k.includes("gnn") || k.includes("graph"));
      if (gnnMastery.length > 0) {
        viability = "high";
        reasons.push("You have GNN experience — this is your engineering advantage");
      } else {
        viability = "medium";
        reasons.push("Build GNN skills first (PyTorch Geometric tutorials)");
      }
    } else if (s.id === "benchmark-systems") {
      if (completedPapers.length >= 3) {
        viability = "high";
        reasons.push("You know enough papers to do rigorous comparison");
      } else {
        viability = "low";
        reasons.push("Need broader paper knowledge for fair benchmarking");
      }
    } else if (s.id === "foundation-models") {
      viability = totalHours >= 300 ? "medium" : "low";
      reasons.push(totalHours >= 300 ? "You have enough foundation" : "This requires deep expertise — build more first");
    }

    return {
      ...s,
      viability,
      reasons,
    };
  });

  // Sort by viability
  const viabilityOrder = { high: 0, medium: 1, low: 2 };
  strategies.sort((a, b) => (viabilityOrder[a.viability as keyof typeof viabilityOrder] || 2) - (viabilityOrder[b.viability as keyof typeof viabilityOrder] || 2));

  return {
    title: "First Paper Strategy Advisor",
    yourStats: {
      papersRead: completedPapers.length,
      totalStudyHours: totalHours,
      masteredConcepts: Object.values(mastery).filter((m: any) => m.level === "advanced").length,
    },
    strategies,
    recommendation: strategies[0]?.id === "reproduce-improve"
      ? "RECOMMENDED: Reproduce + Improve. This is the BEST route for entering computational biology."
      : `Based on your profile, try: ${strategies[0]?.name}`,
    importantNote: "Your goal is NOT 'publish many papers.' Your goal is 'become visible inside the right research ecosystems.' That means: the right conferences, co-authors, open-source communities, and research themes.",
  };
}

// ============================================
// 8. Publishing Dashboard
// ============================================

export function getPublishingDashboard(): object {
  const strategy = loadPublishingStrategy();
  const progress = loadPublicationProgress();
  const confs = loadConferences();

  // Paper pipeline
  const pipeline = {
    ideas: progress.papers.filter((p) => p.status === "idea"),
    inProgress: progress.papers.filter((p) => ["planning", "implementing", "writing"].includes(p.status)),
    submitted: progress.papers.filter((p) => p.status === "submitted"),
    accepted: progress.papers.filter((p) => p.status === "accepted"),
    rejected: progress.papers.filter((p) => p.status === "rejected"),
  };

  // Ecosystem health
  const ecoHealth = strategy.ecosystems.map((eco) => {
    const contribs = progress.ecosystemContributions.filter((c) => c.ecosystem.toLowerCase() === eco.id);
    return { name: eco.name, contributions: contribs.length, priority: eco.priority };
  });

  // Next deadlines
  const now = new Date();
  const nextDeadlines = confs.conferences
    .flatMap((c) =>
      Object.entries(c.deadlines).map(([type, date]) => ({
        conference: c.name,
        tier: c.tier,
        type,
        date,
        daysUntil: Math.ceil((new Date(date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      }))
    )
    .filter((d) => d.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  // Researcher outreach status
  const outreachStatus = strategy.target_researchers.slice(0, 3).map((r) => ({
    name: r.name,
    lab: r.lab,
    alignment: r.alignment,
    criteriaCount: r.contact_readiness_criteria.length,
  }));

  return {
    title: "Publishing Strategy Dashboard",
    pipeline: {
      ideas: pipeline.ideas.length,
      inProgress: pipeline.inProgress.length,
      submitted: pipeline.submitted.length,
      accepted: pipeline.accepted.length,
      rejected: pipeline.rejected.length,
    },
    activePapers: pipeline.inProgress.map((p) => ({ title: p.title, status: p.status, venue: p.targetVenue })),
    ecosystemHealth: ecoHealth,
    nextDeadlines,
    targetResearchers: outreachStatus,
    currentPhase: progress.currentPhase,
  };
}
