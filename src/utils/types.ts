// ============================================
// Core Types for Study Companion MCP
// ============================================

export interface Phase {
  id: string;
  name: string;
  monthRange: [number, number];
  description: string;
  topics: Topic[];
  deliverables: string[];
  projects: Project[];
}

export interface Topic {
  id: string;
  name: string;
  phase: string;
  priority: "critical" | "high" | "medium" | "low";
  subtopics: string[];
  status: "not_started" | "in_progress" | "completed" | "needs_review";
  completedDate?: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  phase: string;
  description: string;
  milestones: Milestone[];
  status: "not_started" | "in_progress" | "completed";
  githubRepo?: string;
  startedDate?: string;
  completedDate?: string;
}

export interface Milestone {
  id: string;
  description: string;
  completed: boolean;
  completedDate?: string;
}

export interface DailyPlan {
  date: string;
  dayType: "weekday" | "weekend";
  currentPhase: string;
  blocks: StudyBlock[];
  revisionsdue: RevisionItem[];
  paperToRead?: PaperEntry;
  projectTask?: string;
}

export interface StudyBlock {
  duration: number; // minutes
  activity: "reading" | "implementation" | "math" | "project" | "paper" | "revision" | "blog";
  topic: string;
  description: string;
}

export interface RevisionItem {
  id: string;
  topic: string;
  concept: string;
  lastReviewed: string;
  nextReview: string;
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  difficulty: "easy" | "medium" | "hard" | "forgot";
}

export interface PaperEntry {
  id: string;
  title: string;
  authors: string[];
  url?: string;
  phase: string;
  status: "queued" | "reading" | "completed" | "needs_revisit";
  priority: number;
  notes?: string;
  keyInsights?: string[];
  architectureNotes?: {
    input?: string;
    representation?: string;
    latentSpace?: string;
    objective?: string;
    uncertaintyModel?: string;
  };
  addedDate: string;
  completedDate?: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  topic: string;
  tags: string[];
  timestamp: string;
  type: "insight" | "question" | "connection" | "implementation_note" | "mistake" | "breakthrough";
  relatedTopics?: string[];
  embedding?: number[]; // for future vector search
}

export interface ProgressSnapshot {
  date: string;
  currentPhase: string;
  topicsCompleted: number;
  topicsTotal: number;
  projectsCompleted: number;
  projectsTotal: number;
  papersRead: number;
  totalStudyHours: number;
  streak: number;
  weeklyHours: number[];
}

export interface StudySession {
  id: string;
  date: string;
  startTime: string;
  duration: number; // minutes
  phase: string;
  activity: string;
  topic: string;
  notes?: string;
  productivity: 1 | 2 | 3 | 4 | 5;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  sessionsCount: number;
  topicsAdvanced: string[];
  revisionsCompleted: number;
  papersRead: string[];
  insights: string[];
  nextWeekFocus: string[];
  streakDays: number;
}
