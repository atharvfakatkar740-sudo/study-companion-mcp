import {
  getStudyPlan,
  getStudyPhases,
  getPlanMeta,
  savePlan,
  snapshotPlan,
  getPlanHistory,
  reloadPlan,
  getResearcherConfig,
} from "../engine/plan-loader.js";

// ============================================
// Plan Management Tools — CRUD for study plans
// ============================================

export function getPlanInfo(): object {
  const meta = getPlanMeta();
  const phases = getStudyPhases();
  const totalTopics = phases.reduce((s, p) => s + p.topics.length, 0);
  const totalProjects = phases.reduce((s, p) => s + p.projects.length, 0);

  return {
    meta,
    summary: {
      phases: phases.length,
      totalTopics,
      totalProjects,
      phaseNames: phases.map((p) => p.name),
    },
    message: "Plan loaded from data/study-plan.json. Edit the JSON file and use reload_plan to apply changes.",
  };
}

export function reloadStudyPlan(): object {
  try {
    reloadPlan();
    // Force re-load to validate
    const meta = getPlanMeta();
    const phases = getStudyPhases();
    return {
      success: true,
      message: "Plan reloaded from disk successfully.",
      plan: meta.name,
      version: meta.version,
      phases: phases.length,
    };
  } catch (err: any) {
    return { error: `Failed to reload plan: ${err.message}` };
  }
}

export function validatePlan(): object {
  try {
    reloadPlan(); // Clear cache
    const plan = getStudyPlan();
    const phases = plan.phases;

    const warnings: string[] = [];

    // Check for duplicate IDs
    const topicIds = phases.flatMap((p) => p.topics.map((t) => t.id));
    const dupTopics = topicIds.filter((id, i) => topicIds.indexOf(id) !== i);
    if (dupTopics.length > 0) warnings.push(`Duplicate topic IDs: ${dupTopics.join(", ")}`);

    const projectIds = phases.flatMap((p) => p.projects.map((pr) => pr.id));
    const dupProjects = projectIds.filter((id, i) => projectIds.indexOf(id) !== i);
    if (dupProjects.length > 0) warnings.push(`Duplicate project IDs: ${dupProjects.join(", ")}`);

    // Check phase month ranges
    for (let i = 0; i < phases.length - 1; i++) {
      const current = phases[i];
      const next = phases[i + 1];
      if (current.monthRange[1] > next.monthRange[0] + 1) {
        warnings.push(`Phase overlap: ${current.id} ends at month ${current.monthRange[1]}, ${next.id} starts at month ${next.monthRange[0]}`);
      }
    }

    // Check topic-phase references
    for (const phase of phases) {
      for (const topic of phase.topics) {
        if (topic.phase !== phase.id) {
          warnings.push(`Topic '${topic.id}' has phase '${topic.phase}' but is under phase '${phase.id}'`);
        }
      }
      for (const project of phase.projects) {
        if (project.phase !== phase.id) {
          warnings.push(`Project '${project.id}' has phase '${project.phase}' but is under phase '${phase.id}'`);
        }
      }
    }

    return {
      valid: true,
      schema: "PASSED",
      warnings: warnings.length > 0 ? warnings : "No warnings",
      stats: {
        phases: phases.length,
        topics: topicIds.length,
        projects: projectIds.length,
        milestones: phases.flatMap((p) => p.projects.flatMap((pr) => pr.milestones)).length,
      },
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function addPhaseToPlan(
  id: string,
  name: string,
  monthStart: number,
  monthEnd: number,
  description: string
): object {
  try {
    const plan = getStudyPlan();
    if (plan.phases.some((p) => p.id === id)) {
      return { error: `Phase '${id}' already exists.` };
    }

    snapshotPlan("pre-add-phase");

    plan.phases.push({
      id,
      name,
      monthRange: [monthStart, monthEnd],
      description,
      topics: [],
      deliverables: [],
      projects: [],
    });

    savePlan(plan);
    return { success: true, message: `Phase '${name}' added.`, totalPhases: plan.phases.length };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function addTopicToPlan(
  phaseId: string,
  topicId: string,
  name: string,
  priority: "critical" | "high" | "medium" | "low",
  subtopics: string[]
): object {
  try {
    const plan = getStudyPlan();
    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) return { error: `Phase '${phaseId}' not found.` };
    if (phase.topics.some((t) => t.id === topicId)) {
      return { error: `Topic '${topicId}' already exists in phase '${phaseId}'.` };
    }

    snapshotPlan("pre-add-topic");

    phase.topics.push({
      id: topicId,
      name,
      phase: phaseId,
      priority,
      subtopics,
      status: "not_started",
    });

    savePlan(plan);
    return { success: true, message: `Topic '${name}' added to phase '${phase.name}'.` };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function addProjectToPlan(
  phaseId: string,
  projectId: string,
  name: string,
  description: string,
  milestones: Array<{ id: string; description: string }>
): object {
  try {
    const plan = getStudyPlan();
    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) return { error: `Phase '${phaseId}' not found.` };

    snapshotPlan("pre-add-project");

    phase.projects.push({
      id: projectId,
      name,
      phase: phaseId,
      description,
      milestones: milestones.map((m) => ({ ...m, completed: false })),
      status: "not_started",
    });

    savePlan(plan);
    return { success: true, message: `Project '${name}' added to phase '${phase.name}'.` };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function snapshotCurrentPlan(label?: string): object {
  try {
    const filename = snapshotPlan(label);
    return { success: true, message: `Plan snapshot saved: ${filename}` };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function listPlanSnapshots(): object {
  const history = getPlanHistory();
  return {
    snapshots: history,
    total: history.length,
    message: history.length > 0
      ? "Use snapshot filenames to restore previous versions manually."
      : "No snapshots yet. Use snapshot_plan to create one.",
  };
}

export function exportPlanAsMarkdown(): object {
  const phases = getStudyPhases();
  const meta = getPlanMeta();

  let md = `# ${meta.name}\n\n`;
  md += `**Version:** ${meta.version} | **Created:** ${meta.created}\n`;
  if (meta.target) md += `**Target:** ${meta.target}\n`;
  md += `\n---\n\n`;

  for (const phase of phases) {
    md += `## ${phase.name}\n\n`;
    md += `*Months ${phase.monthRange[0]}-${phase.monthRange[1]}* — ${phase.description}\n\n`;

    if (phase.topics.length > 0) {
      md += `### Topics\n\n`;
      for (const t of phase.topics) {
        md += `- **${t.name}** [${t.priority}] — ${t.subtopics.join(", ")}\n`;
      }
      md += "\n";
    }

    if (phase.projects.length > 0) {
      md += `### Projects\n\n`;
      for (const p of phase.projects) {
        md += `- **${p.name}**: ${p.description}\n`;
        for (const m of p.milestones) {
          md += `  - ${m.completed ? "✅" : "⬜"} ${m.description}\n`;
        }
      }
      md += "\n";
    }

    if (phase.deliverables.length > 0) {
      md += `### Deliverables\n\n`;
      for (const d of phase.deliverables) {
        md += `- ${d}\n`;
      }
      md += "\n";
    }
  }

  return { markdown: md, characterCount: md.length };
}

export function getResearchersInfo(): object {
  const config = getResearcherConfig();
  return {
    researchers: config.researchers,
    searchRecommendations: config.search_recommendations || [],
    suggestedQueries: config.suggested_arxiv_queries || [],
    message: "Edit data/researchers.json to add/remove researchers and search recommendations.",
  };
}
