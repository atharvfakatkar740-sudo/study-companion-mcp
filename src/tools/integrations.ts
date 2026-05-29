import { loadJSON, saveJSON, loadNotes } from "../utils/storage.js";
import { MemoryEntry } from "../utils/types.js";
import { getResearcherConfig } from "../engine/plan-loader.js";

// ============================================
// v1.3 — External Integrations
// ============================================

// --- GitHub Activity Tracking ---

interface GitHubActivity {
  lastFetched: string;
  contributions: GitHubContribution[];
  repos: GitHubRepo[];
}

interface GitHubContribution {
  date: string;
  type: string;
  repo: string;
  message?: string;
}

interface GitHubRepo {
  name: string;
  description?: string;
  url: string;
  stars: number;
  lastPush: string;
  language?: string;
}

export async function fetchGitHubActivity(username: string): Promise<object> {
  try {
    // Fetch recent events
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=30`);
    if (!eventsRes.ok) {
      return { error: `GitHub API error: ${eventsRes.status} ${eventsRes.statusText}. Check username.` };
    }
    const events = await eventsRes.json() as any[];

    // Fetch repos
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`);
    const repos = await reposRes.json() as any[];

    const contributions: GitHubContribution[] = events
      .filter((e: any) => ["PushEvent", "CreateEvent", "PullRequestEvent", "IssuesEvent"].includes(e.type))
      .map((e: any) => ({
        date: e.created_at,
        type: e.type.replace("Event", ""),
        repo: e.repo?.name || "unknown",
        message: e.type === "PushEvent" ? e.payload?.commits?.[0]?.message : undefined,
      }));

    const repoList: GitHubRepo[] = (repos || []).map((r: any) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      stars: r.stargazers_count,
      lastPush: r.pushed_at,
      language: r.language,
    }));

    const activity: GitHubActivity = {
      lastFetched: new Date().toISOString(),
      contributions,
      repos: repoList,
    };

    saveJSON("github-activity.json", activity);

    // Analysis
    const thisWeek = contributions.filter((c) => {
      const d = new Date(c.date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    });

    const relevantRepos = repoList.filter((r) =>
      r.name.toLowerCase().includes("vae") ||
      r.name.toLowerCase().includes("gnn") ||
      r.name.toLowerCase().includes("cell") ||
      r.name.toLowerCase().includes("bio") ||
      r.name.toLowerCase().includes("graph") ||
      r.description?.toLowerCase().includes("deep learning") ||
      r.description?.toLowerCase().includes("machine learning")
    );

    return {
      username,
      summary: {
        totalRecentActivity: contributions.length,
        thisWeekActivity: thisWeek.length,
        publicRepos: repoList.length,
        relevantMLRepos: relevantRepos.length,
      },
      recentContributions: contributions.slice(0, 10),
      topRepos: repoList.slice(0, 5),
      relevantRepos,
      suggestion: thisWeek.length === 0
        ? "No GitHub activity this week. Even small commits show consistent effort to potential collaborators."
        : `${thisWeek.length} contributions this week. Keep building your public portfolio!`,
    };
  } catch (err: any) {
    return { error: `Failed to fetch GitHub data: ${err.message}` };
  }
}

// --- arXiv Paper Fetching ---

interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  link: string;
  categories: string[];
}

export async function searchArxiv(query: string, maxResults: number = 10): Promise<object> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

    const res = await fetch(url);
    if (!res.ok) {
      return { error: `arXiv API error: ${res.status}` };
    }

    const xml = await res.text();
    const papers = parseArxivXML(xml);

    // Filter for relevance to our domain
    const relevant = papers.filter((p) =>
      p.title.toLowerCase().includes("single-cell") ||
      p.title.toLowerCase().includes("perturbation") ||
      p.title.toLowerCase().includes("variational") ||
      p.title.toLowerCase().includes("graph neural") ||
      p.title.toLowerCase().includes("foundation model") ||
      p.title.toLowerCase().includes("representation learn") ||
      p.summary.toLowerCase().includes("gene expression") ||
      p.summary.toLowerCase().includes("scRNA") ||
      p.categories.some((c) => ["q-bio.GN", "q-bio.QM", "cs.LG", "stat.ML"].includes(c))
    );

    return {
      query,
      totalResults: papers.length,
      papers: papers.map((p) => ({
        title: p.title,
        authors: p.authors.slice(0, 3).join(", ") + (p.authors.length > 3 ? " et al." : ""),
        published: p.published.split("T")[0],
        link: p.link,
        summary: p.summary.slice(0, 200) + "...",
        categories: p.categories,
      })),
      highlightedRelevant: relevant.length > 0 ? relevant.map((p) => ({
        title: p.title,
        link: p.link,
        why: "Matches computational biology / ML keywords relevant to your focus.",
      })) : undefined,
      suggestion: "Use `add_paper` to add interesting papers to your reading queue.",
    };
  } catch (err: any) {
    return { error: `Failed to search arXiv: ${err.message}` };
  }
}

function parseArxivXML(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = [];
  const entries = xml.split("<entry>").slice(1);

  for (const entry of entries) {
    const getTag = (tag: string): string => {
      const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : "";
    };

    const id = getTag("id");
    const title = getTag("title").replace(/\s+/g, " ");
    const summary = getTag("summary").replace(/\s+/g, " ");
    const published = getTag("published");

    // Get authors
    const authorMatches = entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g);
    const authors = [...authorMatches].map((m) => m[1]);

    // Get link
    const linkMatch = entry.match(/href="([^"]*abs[^"]*)"/);
    const link = linkMatch ? linkMatch[1] : id;

    // Get categories
    const catMatches = entry.matchAll(/category[^>]*term="([^"]+)"/g);
    const categories = [...catMatches].map((m) => m[1]);

    papers.push({ id, title, authors, summary, published, link, categories });
  }

  return papers;
}

export async function fetchResearcherPapers(researcherName?: string): Promise<object> {
  const config = getResearcherConfig();
  if (researcherName) {
    const researcher = config.researchers.find(
      (r) => r.name.toLowerCase().includes(researcherName.toLowerCase())
    );
    if (researcher?.arxiv_query) {
      return searchArxiv(researcher.arxiv_query, 15);
    }
    return searchArxiv(`au:${researcherName}`, 15);
  }
  // Default: fetch papers for the first researcher in config
  const primary = config.researchers[0];
  if (primary?.arxiv_query) {
    return searchArxiv(primary.arxiv_query, 15);
  }
  return { error: "No researchers configured. Add researchers to data/researchers.json" };
}

// Backward compatibility alias
export async function fetchLotfollahiPapers(): Promise<object> {
  return fetchResearcherPapers("Lotfollahi");
}

// --- Blog Post Drafting ---

export function draftBlogPost(topic: string, style: "tutorial" | "paper-breakdown" | "concept-explanation" | "implementation-walkthrough" = "concept-explanation"): object {
  const memories = loadJSON<MemoryEntry[]>("memory.json", []);
  const topicMemories = memories.filter((m) =>
    m.topic.toLowerCase().includes(topic.toLowerCase()) ||
    m.content.toLowerCase().includes(topic.toLowerCase()) ||
    m.tags.some((t) => t.toLowerCase().includes(topic.toLowerCase()))
  );

  const notes = loadNotes(topic.toLowerCase().replace(/\s+/g, "-"));

  const templates: Record<string, object> = {
    "tutorial": {
      title: `Building ${topic}: A Hands-On Tutorial`,
      structure: [
        "## Introduction\n- What are we building and why?",
        "## Prerequisites\n- What the reader should know",
        "## Setup\n- Environment, dependencies",
        "## Core Implementation\n- Step-by-step code",
        "## Results & Visualization\n- What we achieved",
        "## Key Takeaways\n- Main lessons",
        "## Next Steps\n- Where to go from here",
      ],
    },
    "paper-breakdown": {
      title: `Paper Breakdown: Understanding ${topic}`,
      structure: [
        "## TL;DR\n- One-paragraph summary",
        "## The Problem\n- What gap does this address?",
        "## Key Innovation\n- What's new here?",
        "## Architecture\n- Input → Representation → Latent → Objective",
        "## Results\n- Main findings",
        "## Connection to My Work\n- How this relates to my research direction",
        "## Critical Analysis\n- Strengths and limitations",
      ],
    },
    "concept-explanation": {
      title: `${topic}: An Intuitive Explanation`,
      structure: [
        "## The Intuition\n- Plain English explanation",
        "## Why It Matters\n- Real-world relevance",
        "## The Math\n- Core formulation (keep it accessible)",
        "## Visual Example\n- Diagram or visualization idea",
        "## Implementation Notes\n- Key code patterns",
        "## Common Misconceptions\n- What people get wrong",
        "## Further Reading\n- Resources for going deeper",
      ],
    },
    "implementation-walkthrough": {
      title: `Implementing ${topic} from Scratch in PyTorch`,
      structure: [
        "## Goal\n- What we're building",
        "## Architecture Overview\n- High-level diagram",
        "## Data Preparation\n- Input format and preprocessing",
        "## Model Code\n- Core implementation with explanations",
        "## Training Loop\n- Loss function, optimizer, monitoring",
        "## Experiments\n- What I tried and learned",
        "## Results\n- Metrics, visualizations",
        "## Lessons Learned\n- Mistakes and insights",
      ],
    },
  };

  const template = templates[style] || templates["concept-explanation"];

  // Auto-populate from memories
  const insights = topicMemories
    .filter((m) => m.type === "insight")
    .map((m) => `- ${m.content}`)
    .slice(0, 5);

  const mistakes = topicMemories
    .filter((m) => m.type === "mistake")
    .map((m) => `- ${m.content}`)
    .slice(0, 3);

  const connections = topicMemories
    .filter((m) => m.type === "connection")
    .map((m) => `- ${m.content}`)
    .slice(0, 3);

  return {
    draft: template,
    autoContent: {
      fromMemory: {
        insights: insights.length > 0 ? insights : ["(No insights saved for this topic yet - use save_insight to build content)"],
        mistakes: mistakes.length > 0 ? mistakes : [],
        connections: connections.length > 0 ? connections : [],
      },
      fromNotes: notes ? `Found existing notes (${notes.length} chars) — use as source material.` : "No topic notes found.",
      relatedMemories: topicMemories.length,
    },
    writingTips: [
      "Write for your future self explaining to a colleague",
      "Include code snippets that actually run",
      "Add diagrams (even ASCII art counts)",
      "Connect to your target domain (single-cell biology)",
      "End with 'what I'd do differently next time'",
    ],
    publishingOptions: [
      "GitHub README (easiest, most discoverable)",
      "dev.to / Medium (broader audience)",
      "Personal blog (build your brand)",
      "Twitter/X thread (visibility, engagement)",
    ],
  };
}
