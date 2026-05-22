import type { DocumentChunk, UserPreferences } from "@/lib/db/schema";

export const GROQ_MODEL = "llama-3.3-70b-versatile" as const;
export const GROQ_STRUCTURED_MODEL = "openai/gpt-oss-120b" as const;

export type PipelineStatus =
  | "pending"
  | "analysing"
  | "retrieving"
  | "writing"
  | "qa"
  | "complete"
  | "failed";

export type CompanyTone = "formal" | "casual" | "technical" | "mission-driven";

export interface JobAnalysis {
  roleTitle: string;
  company: string;
  seniority: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  companyTone: CompanyTone;
  keyPhrases: string[];
  reasoning: string;
}

export interface TailoredCVExperience {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface TailoredCVProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface TailoredCVSkills {
  featured: string[];
  additional: string[];
}

export interface TailoredCV {
  summary: string;
  experience: TailoredCVExperience[];
  skills: TailoredCVSkills;
  projects: TailoredCVProject[];
  removedSections: string[];
  writingNotes: string;
}

export interface QAIssue {
  type: string;
  severity: "blocker" | "warning";
  description: string;
  suggestion: string;
}

export interface QAReport {
  approved: boolean;
  issues: QAIssue[];
  qualityScore: number;
}

export interface PipelineState {
  jobId: string;
  userId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  userPreferences: UserPreferences;
  jobAnalysis?: JobAnalysis;
  relevantChunks?: DocumentChunk[];
  tailoredCV?: TailoredCV;
  coverLetter?: string;
  qaReport?: QAReport;
  errors: string[];
  status: PipelineStatus;
}

export type AgentName =
  | "job-analyst"
  | "relevancy"
  | "cv-writer"
  | "cover-letter"
  | "qa-checker";

export type ContentField = "cv" | "coverLetter";

export type PipelineEvent =
  | { type: "agent:start"; agent: AgentName }
  | { type: "agent:complete"; agent: AgentName; durationMs: number }
  | { type: "agent:error"; agent: AgentName; message: string }
  | { type: "content:delta"; field: ContentField; text?: string; cv?: TailoredCV }
  | {
      type: "pipeline:complete";
      qaReport: QAReport;
      tailoredCV: TailoredCV;
      coverLetter: string;
      applicationId: string;
    }
  | { type: "pipeline:error"; message: string };
