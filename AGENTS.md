# AGENTS.md — HireLoop Agent Architecture

This document defines every AI agent in HireLoop, their inputs, outputs,
the prompts they use, and how they connect. This is the technical spec —
CLAUDE.md is the operational guide.

---

## Overview: The Pipeline

```
User Input (job URL + user docs)
         ↓
  [JobAnalystAgent]        → Extracts structured requirements from job posting
         ↓
  [RelevancyAgent]         → RAG: retrieves top-N user doc chunks per requirement
         ↓
  ┌──────┴──────┐
  ↓             ↓
[CVWriterAgent] [CoverLetterAgent]   → Run in parallel
  ↓             ↓
  └──────┬──────┘
         ↓
  [QACheckerAgent]         → Validates no hallucinated skills, checks tone
         ↓
  [Output]                 → Structured CV JSON + cover letter text → User review
```

All agents are orchestrated by `src/lib/ai/agents/orchestrator.ts` using
LangGraph.js for stateful graph execution with typed edges and nodes.

---

## Agent Definitions

---

### 1. JobAnalystAgent

**File:** `src/lib/ai/agents/job-analyst.ts`
**Prompt:** `src/lib/ai/prompts/job-analyst.v1.ts`

**Purpose:** Extract structured requirements from a raw job description.
This is the foundation — every downstream agent depends on its output.

**Input:**
```typescript
interface JobAnalystInput {
  rawJobDescription: string  // scraped or pasted job text
  jobUrl?: string
}
```

**Output:**
```typescript
interface JobAnalysis {
  roleTitle: string
  company: string
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'principal'
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  responsibilities: string[]
  companyTone: 'formal' | 'casual' | 'technical' | 'mission-driven'
  keyPhrases: string[]        // exact phrases to mirror in application
  redFlags: string[]          // things to avoid mentioning
  estimatedMatchDifficulty: 'low' | 'medium' | 'high'
  reasoning: string           // why it scored the difficulty it did
}
```

**Prompt strategy:**
- Temperature: 0.1 (deterministic extraction)
- Structured output via `tool_use` with JSON schema
- Instruction to extract `keyPhrases` verbatim — these get injected into CV/CL

---

### 2. RelevancyAgent

**File:** `src/lib/ai/agents/relevancy.ts`
**No LLM call** — pure vector search + reranking

**Purpose:** For each job requirement, retrieve the most relevant chunks
from the user's embedded documents. This is the RAG step.

**Input:**
```typescript
interface RelevancyInput {
  jobAnalysis: JobAnalysis
  userId: string
  topK: number  // default: 8
}
```

**Output:**
```typescript
interface RelevancyOutput {
  experienceChunks: DocumentChunk[]   // ranked by relevance to role
  skillsChunks: DocumentChunk[]
  projectChunks: DocumentChunk[]
  educationChunks: DocumentChunk[]
  overallMatchScore: number           // 0–100
  matchBreakdown: {
    mustHave: number    // % of must-haves covered
    niceToHave: number
  }
}
```

**Retrieval strategy:**
1. Embed the `mustHaveSkills` array as a single query (not the full JD)
2. Search Pinecone namespace = `userId`
3. Filter by `chunkType` for each section (experience, skills, etc.)
4. Post-retrieval: rerank with Cohere `rerank-v3.5` for precision
5. Return top-K per section with cosine similarity scores

**Match score threshold:**
- < 40: Show warning "Low match — consider skipping this application"
- 40–70: Proceed with caveats
- > 70: Full generation, no warning

---

### 3. CVWriterAgent

**File:** `src/lib/ai/agents/cv-writer.ts`
**Prompt:** `src/lib/ai/prompts/cv-writer.v1.ts`

**Purpose:** Rewrite and tailor the user's CV sections for this specific role.
Uses only content present in the retrieved chunks — never invents anything.

**Input:**
```typescript
interface CVWriterInput {
  relevancyOutput: RelevancyOutput
  jobAnalysis: JobAnalysis
  userPreferences: UserPreferences  // from questionnaire
  originalCVText: string            // full original for diff comparison
}
```

**Output:**
```typescript
interface TailoredCV {
  summary: string               // 2-3 sentence professional summary
  experience: ExperienceItem[]  // reordered + reworded for this role
  skills: {
    featured: string[]          // must-haves the user has — listed first
    additional: string[]        // nice-to-haves + other relevant skills
  }
  projects: ProjectItem[]       // most relevant 2-3 projects
  education: EducationItem[]    // unchanged unless there's a reason
  removedSections: string[]     // what was cut and why (for QA agent)
  writingNotes: string          // internal notes for QA agent
}
```

**Prompt strategy:**
- Temperature: 0.4 (some creativity for wording, not factual invention)
- XML context blocks: `<job_requirements>`, `<retrieved_experience>`, `<key_phrases>`
- Explicit instruction: "You may only reference skills, technologies, and experiences present in `<retrieved_experience>`. Do not invent."
- Instruction to mirror `keyPhrases` from job analysis naturally in the text
- Streamed output — frontend shows words appearing in real time

---

### 4. CoverLetterAgent

**File:** `src/lib/ai/agents/cover-letter-writer.ts`
**Prompt:** `src/lib/ai/prompts/cover-letter.v1.ts`

**Purpose:** Write a tailored, human-sounding cover letter.
Runs in parallel with CVWriterAgent.

**Input:**
```typescript
interface CoverLetterInput {
  jobAnalysis: JobAnalysis
  relevancyOutput: RelevancyOutput
  userPreferences: UserPreferences
  userAlwaysEmphasize: string[]   // from questionnaire
  userNeverMention: string[]      // from questionnaire
}
```

**Output:** `string` — plain text, 3 paragraphs max

**Paragraph structure:**
1. Hook + why this company specifically (uses `companyTone` from analysis)
2. Top 2-3 most relevant achievements from retrieved chunks
3. Forward-looking close — what the user will contribute

**Prompt strategy:**
- Temperature: 0.7 (more creative)
- Banned words list injected: "passionate", "synergy", "innovative", "leverage", "rockstar", "ninja", "guru"
- If `companyTone === 'mission-driven'` → inject mission language
- If `companyTone === 'technical'` → lead with technical achievement, not soft skills
- Stream output like CVWriterAgent

---

### 5. QACheckerAgent

**File:** `src/lib/ai/agents/qa-checker.ts`
**Prompt:** `src/lib/ai/prompts/qa-checker.v1.ts`

**Purpose:** Validate all generated content. Catch hallucinated skills, tone
mismatches, and anything the user said to never mention.

**Input:**
```typescript
interface QAInput {
  tailoredCV: TailoredCV
  coverLetter: string
  originalChunks: DocumentChunk[]  // source of truth for fact-checking
  jobAnalysis: JobAnalysis
  userPreferences: UserPreferences
}
```

**Output:**
```typescript
interface QAReport {
  approved: boolean
  issues: {
    type: 'hallucination' | 'tone' | 'forbidden-content' | 'weak-match'
    severity: 'blocker' | 'warning'
    description: string
    location: string  // e.g. "CV experience section, bullet 3"
    suggestion: string
  }[]
  overallQualityScore: number  // 0–100
  approvedForSubmission: boolean
}
```

**Checks performed:**
1. **Hallucination check**: every skill/technology in the CV must appear in `originalChunks`
2. **Forbidden content check**: `userNeverMention` items must not appear
3. **Tone check**: cover letter tone must match `jobAnalysis.companyTone`
4. **Key phrase coverage**: at least 60% of `keyPhrases` must appear naturally
5. **Blocker rule**: if any `severity === 'blocker'` issue exists → do not allow submission

---

## Orchestrator

**File:** `src/lib/ai/agents/orchestrator.ts`

Uses **LangGraph.js** to define the pipeline as a typed state graph.

```typescript
// State shared across all agents
interface PipelineState {
  jobInput: JobAnalystInput
  jobAnalysis?: JobAnalysis
  relevancyOutput?: RelevancyOutput
  tailoredCV?: TailoredCV
  coverLetter?: string
  qaReport?: QAReport
  errors: string[]
  status: 'pending' | 'analysing' | 'retrieving' | 'generating' | 'qa' | 'complete' | 'failed'
  streamEvents: StreamEvent[]   // pushed to frontend SSE
}

// Graph nodes (each node = one agent)
const graph = new StateGraph(PipelineState)
  .addNode('job-analyst', jobAnalystNode)
  .addNode('relevancy', relevancyNode)
  .addNode('cv-writer', cvWriterNode)
  .addNode('cover-letter', coverLetterNode)
  .addNode('qa-checker', qaCheckerNode)
  .addEdge('job-analyst', 'relevancy')
  .addEdge('relevancy', 'cv-writer')   // parallel
  .addEdge('relevancy', 'cover-letter') // parallel
  .addEdge(['cv-writer', 'cover-letter'], 'qa-checker')  // join
  .addConditionalEdges('qa-checker', qaRouting)  // approve or retry
```

**Stream events** emitted to frontend via Server-Sent Events:
```typescript
type StreamEvent =
  | { type: 'agent:start'; agent: string }
  | { type: 'agent:complete'; agent: string; durationMs: number }
  | { type: 'content:delta'; field: string; text: string }
  | { type: 'qa:issue'; issue: QAIssue }
  | { type: 'pipeline:complete'; matchScore: number }
  | { type: 'pipeline:error'; message: string }
```

---

## RAG Pipeline

**Ingestion flow** (runs as Trigger.dev background job after upload):

```
File Upload → Supabase Storage
     ↓
LlamaParse → Structured text + metadata
     ↓
Section-aware chunking (by file type)
     ↓
Voyage AI voyage-3 → 1024-dim embeddings
     ↓
Pinecone upsert (namespace = userId)
     ↓
Drizzle: store chunk metadata in Supabase
```

**Retrieval flow** (runs inside RelevancyAgent):

```
Job requirements → Voyage AI embedding
     ↓
Pinecone query (top-20, namespace = userId)
     ↓
Cohere rerank-v3.5 (top-8 per section)
     ↓
Return ranked chunks to orchestrator
```

---

## Prompt Versioning

Every prompt file exports:
```typescript
export const PROMPT_VERSION = 'v1.0'
export const PROMPT_NAME = 'job-analyst'

export function buildPrompt(input: JobAnalystInput): string {
  return `...`
}
```

The Langfuse trace logs `PROMPT_NAME` + `PROMPT_VERSION` on every call.
When changing a prompt: bump version, log what changed, keep old version
as a comment for A/B reference.

---

## Questionnaire — Pre-Apply Data Collection

Collected once, stored in Supabase, injected into every generation.

```typescript
interface UserPreferences {
  // Role targeting
  targetRoles: string[]           // e.g. ['Senior Backend Engineer', 'Staff Engineer']
  targetLocations: string[]       // e.g. ['Remote', 'Dubai', 'London']
  seniorityLevel: string
  targetIndustries: string[]
  excludeCompanies: string[]

  // Generation preferences
  tonePreference: 'formal' | 'conversational' | 'technical'
  alwaysEmphasize: string[]       // e.g. ['Led team of 8', 'Shipped to 2M users']
  neverMention: string[]          // e.g. ['employment gap Jun-Dec 2024']
  
  // Application preferences
  salaryExpectation?: string
  noticePeriod: string
  workAuthorization: boolean
  requiresSponsorship: boolean
  
  // Personal
  preferredName: string           // how to sign the cover letter
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
}
```

---

## Error Handling Strategy

Every agent wraps its LLM call in a retry handler:

```typescript
// Max 2 retries with exponential backoff
// On retry: inject error context into prompt ("Previous attempt returned malformed JSON: ...")
// On final failure: emit pipeline:error event, save partial output as draft
```

QA failures with only `warning` severity → allow submission with user acknowledgement
QA failures with `blocker` severity → block submission, show specific issues, offer re-generation