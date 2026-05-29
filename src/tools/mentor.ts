import { loadJSON, saveJSON } from "../utils/storage.js";
import { STUDY_PHASES } from "../data/study-plan.js";

interface MentorGuidance {
  projectId: string;
  currentMilestone: string;
  guidance: string;
  resources: string[];
  commonMistakes: string[];
  nextSteps: string[];
}

// Knowledge base for project mentoring
const PROJECT_GUIDANCE: Record<string, Record<string, MentorGuidance>> = {
  "vae-from-scratch": {
    "vae-1": {
      projectId: "vae-from-scratch",
      currentMilestone: "Basic autoencoder working",
      guidance: "Start with a simple deterministic autoencoder. Use a small MLP encoder (784→256→128→latent_dim) and symmetric decoder. Use MSE or BCE loss. Train on MNIST first.",
      resources: [
        "PyTorch autoencoder tutorial",
        "Kingma & Welling 2013 (VAE paper)",
        "Understanding Autoencoders blog posts",
      ],
      commonMistakes: [
        "Using too large a latent dimension (start with 2D for visualization)",
        "Not normalizing inputs to [0,1]",
        "Using wrong loss function (BCE needs sigmoid output)",
      ],
      nextSteps: [
        "Get training loss decreasing smoothly",
        "Visualize reconstructions",
        "Then move to variational version",
      ],
    },
    "vae-2": {
      projectId: "vae-from-scratch",
      currentMilestone: "Add variational inference",
      guidance: "Add the reparameterization trick: encoder outputs mu and log_var, sample z = mu + std * epsilon. Loss = reconstruction + beta * KL divergence. Start with beta=1.",
      resources: [
        "Kingma & Welling 2013",
        "Tutorial on Variational Autoencoders (Carl Doersch)",
        "PyTorch VAE example in official repo",
      ],
      commonMistakes: [
        "Forgetting to use log_var (not var directly) for numerical stability",
        "KL vanishing: decoder too powerful, ignores latent code",
        "Not understanding reparameterization trick purpose (gradient flow)",
      ],
      nextSteps: [
        "Verify KL loss is non-zero but not too large",
        "Compare reconstructions with deterministic AE",
        "Try different beta values",
      ],
    },
    "vae-3": {
      projectId: "vae-from-scratch",
      currentMilestone: "Train on MNIST/Fashion-MNIST",
      guidance: "Train both datasets. Use batch size 128, Adam optimizer lr=1e-3. Train for 50+ epochs. Monitor both losses separately. Try latent dimensions: 2, 10, 20.",
      resources: [
        "torchvision datasets documentation",
        "Weights & Biases for experiment tracking",
      ],
      commonMistakes: [
        "Not monitoring reconstruction and KL separately",
        "Training too few epochs",
        "Not trying different latent dimensions",
      ],
      nextSteps: [
        "Get good reconstructions on both datasets",
        "Save model checkpoints",
        "Prepare for visualization",
      ],
    },
    "vae-4": {
      projectId: "vae-from-scratch",
      currentMilestone: "Latent space visualization and interpolation",
      guidance: "With 2D latent space: scatter plot colored by class. With higher dims: use t-SNE/UMAP. Implement latent interpolation between two points. Generate new samples by sampling from prior.",
      resources: [
        "matplotlib/seaborn for 2D plots",
        "UMAP library for high-dim visualization",
        "Latent space arithmetic (like word2vec analogy)",
      ],
      commonMistakes: [
        "Not using 2D latent for initial visualization",
        "Interpolating in data space instead of latent space",
        "Forgetting that generation = decode(sample from N(0,1))",
      ],
      nextSteps: [
        "Create publication-quality figures",
        "Try latent arithmetic (e.g., digit 1 + style of digit 7)",
        "Document findings clearly",
      ],
    },
    "vae-5": {
      projectId: "vae-from-scratch",
      currentMilestone: "Conditional VAE implementation",
      guidance: "Condition on class label. Concatenate one-hot label to both encoder input and decoder input. This lets you generate specific classes. Important for understanding CPA later (conditioning on perturbation type).",
      resources: [
        "CVAE paper (Sohn et al. 2015)",
        "Connection to CPA: conditioning on perturbation = CVAE idea",
      ],
      commonMistakes: [
        "Not conditioning both encoder AND decoder",
        "Using wrong dimensionality for condition vector",
        "Not seeing the connection to perturbation prediction",
      ],
      nextSteps: [
        "Generate specific digits on command",
        "This is exactly the principle behind scGen/CPA",
        "Write README connecting this to perturbation biology",
      ],
    },
  },
  "gnn-from-scratch": {
    "gnn-1": {
      projectId: "gnn-from-scratch",
      currentMilestone: "GCN implementation + node classification",
      guidance: "Implement Kipf & Welling GCN. Core: H^(l+1) = σ(D̃^(-1/2) Ã D̃^(-1/2) H^(l) W^(l)). Use Cora/Citeseer dataset. Start with PyTorch Geometric for data loading, but implement the layer yourself.",
      resources: [
        "Kipf & Welling 2016 (Semi-supervised Classification with GCNs)",
        "PyTorch Geometric documentation",
        "Stanford CS224W materials",
      ],
      commonMistakes: [
        "Forgetting self-loops (Ã = A + I)",
        "Wrong normalization (symmetric vs row normalization)",
        "Not using sparse operations for large graphs",
      ],
      nextSteps: [
        "Achieve >80% accuracy on Cora",
        "Understand message passing interpretation",
        "Visualize node embeddings",
      ],
    },
    "gnn-2": {
      projectId: "gnn-from-scratch",
      currentMilestone: "GAT implementation",
      guidance: "Implement attention mechanism over neighbors. Each edge gets an attention weight computed from source and target features. Multi-head attention averages/concatenates heads.",
      resources: [
        "Veličković et al. 2017 (GAT paper)",
        "Attention mechanism visualization",
      ],
      commonMistakes: [
        "Not applying LeakyReLU to attention coefficients",
        "Forgetting masked attention (only attend to neighbors)",
        "Not implementing multi-head properly",
      ],
      nextSteps: [
        "Compare accuracy with GCN on same dataset",
        "Visualize attention weights",
        "Understand when attention helps vs uniform aggregation",
      ],
    },
    "gnn-4": {
      projectId: "gnn-from-scratch",
      currentMilestone: "Molecular property prediction",
      guidance: "Use MoleculeNet datasets (ESOL, FreeSolv, lipophilicity). Molecules as graphs: atoms=nodes, bonds=edges. This is DIRECTLY relevant to chemCPA and drug perturbation prediction.",
      resources: [
        "MoleculeNet benchmark",
        "RDKit for molecular featurization",
        "OGB (Open Graph Benchmark) molecular datasets",
        "chemCPA paper (Lotfollahi) for motivation",
      ],
      commonMistakes: [
        "Not including edge features (bond type matters)",
        "Using wrong readout (sum vs mean pooling)",
        "Not proper train/test splitting for molecules",
      ],
      nextSteps: [
        "Achieve competitive results on at least one dataset",
        "This directly connects to your target lab's work",
        "Document the bio connection in your README",
      ],
    },
  },
};

export function getProjectGuidance(projectId: string, milestoneId?: string): object {
  const state = loadJSON<Record<string, string[]>>("milestones-completed.json", {});
  const phase = STUDY_PHASES.find((p) => p.projects.some((pr) => pr.id === projectId));
  const project = phase?.projects.find((p) => p.id === projectId);

  if (!project) return { error: `Project '${projectId}' not found.` };

  // Find current milestone (first incomplete one)
  const completedMilestones = state[projectId] || [];
  const currentMilestone = milestoneId ||
    project.milestones.find((m) => !completedMilestones.includes(m.id))?.id;

  if (!currentMilestone) {
    return { message: `Project '${projectId}' is complete! Congratulations!`, project: project.name };
  }

  const guidance = PROJECT_GUIDANCE[projectId]?.[currentMilestone];

  if (!guidance) {
    const milestone = project.milestones.find((m) => m.id === currentMilestone);
    return {
      project: project.name,
      currentMilestone: milestone?.description || currentMilestone,
      guidance: "No specific guidance template for this milestone yet. Break it into sub-tasks and tackle one at a time.",
      progress: `${completedMilestones.length}/${project.milestones.length} milestones done`,
    };
  }

  return {
    project: project.name,
    ...guidance,
    progress: `${completedMilestones.length}/${project.milestones.length} milestones done`,
    completedMilestones: completedMilestones.map((id) =>
      project.milestones.find((m) => m.id === id)?.description || id
    ),
  };
}

export function listProjects(): object {
  const state = loadJSON<Record<string, string[]>>("milestones-completed.json", {});
  const plannerState = loadJSON<{ completedProjects: string[] }>("planner-state.json", { completedProjects: [] });

  const allProjects = STUDY_PHASES.flatMap((phase) =>
    phase.projects.map((p) => {
      const completed = state[p.id] || [];
      return {
        id: p.id,
        name: p.name,
        phase: phase.name,
        description: p.description,
        progress: `${completed.length}/${p.milestones.length}`,
        status: plannerState.completedProjects.includes(p.id)
          ? "completed"
          : completed.length > 0
          ? "in_progress"
          : "not_started",
        milestones: p.milestones.map((m) => ({
          id: m.id,
          description: m.description,
          completed: completed.includes(m.id),
        })),
      };
    })
  );

  return { projects: allProjects, totalProjects: allProjects.length };
}

export function getWeeklyReport(): object {
  const plannerState = loadJSON<{
    totalStudyHours: number;
    streakDays: number;
    completedTopics: string[];
    completedProjects: string[];
  }>("planner-state.json", { totalStudyHours: 0, streakDays: 0, completedTopics: [], completedProjects: [] });

  const revisions = loadJSON<any[]>("revisions.json", []);
  const papers = loadJSON<any[]>("papers.json", []);
  const memories = loadJSON<any[]>("memory.json", []);

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const recentMemories = memories.filter((m: any) => m.timestamp >= weekAgoStr);
  const recentPapers = papers.filter((p: any) => p.completedDate && p.completedDate >= weekAgoStr);

  return {
    summary: {
      totalStudyHours: plannerState.totalStudyHours,
      currentStreak: plannerState.streakDays,
      topicsCompleted: plannerState.completedTopics.length,
      projectsCompleted: plannerState.completedProjects.length,
    },
    thisWeek: {
      insightsRecorded: recentMemories.length,
      papersCompleted: recentPapers.length,
      revisionItemsDue: revisions.filter((r: any) => r.nextReview <= today.toISOString().split("T")[0]).length,
    },
    recommendations: generateRecommendations(plannerState, revisions, papers),
  };
}

function generateRecommendations(state: any, revisions: any[], papers: any[]): string[] {
  const recs: string[] = [];
  const today = new Date().toISOString().split("T")[0];
  const dueRevisions = revisions.filter((r: any) => r.nextReview <= today);

  if (dueRevisions.length > 5) {
    recs.push(`⚠️ You have ${dueRevisions.length} overdue revisions. Prioritize these to maintain retention.`);
  }
  if (state.streakDays >= 7) {
    recs.push(`🔥 ${state.streakDays}-day streak! Consistency is your biggest advantage.`);
  }
  if (state.streakDays === 0) {
    recs.push("Start fresh today. Even 30 minutes compounds over 3 years.");
  }

  const queuedPapers = papers.filter((p: any) => p.status === "queued");
  if (queuedPapers.length > 0 && papers.filter((p: any) => p.status === "reading").length === 0) {
    recs.push(`📄 No paper currently in progress. Start: "${queuedPapers[0].title}"`);
  }

  recs.push("Remember: Labs care about reproducibility, implementation quality, engineering maturity.");

  return recs;
}
