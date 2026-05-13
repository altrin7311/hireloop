# CLAUDE.md — HireLoop

You are building **HireLoop**, a production-grade AI job application agent.
Read this file fully at the start of every session before touching any code.
This is your single source of truth.

---

## What HireLoop Does

HireLoop automates job applications end-to-end:

1. User uploads their CV (PDF), cover letter, GitHub URL, LinkedIn URL, and any `.md`/`.txt` supporting docs
2. User completes a one-time pre-apply questionnaire (tone, preferences, exclusions)
3. User pastes a job posting URL or text
4. HireLoop runs a multi-agent pipeline:
   - Extracts job requirements
   - Retrieves the most relevant chunks from user documents via RAG
   - Generates a tailored CV and cover letter
   - Runs a QA pass to verify no hallucinated skills
5. User reviews a side-by-side diff of original vs tailored content
6. User confirms → HireLoop auto-fills and submits the application via browser automation

---

## Tech Stack (do not deviate without a comment explaining why)

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Best full-stack React, native streaming, RSC |
| Language | TypeScript (strict mode) | Type safety across the entire codebase |
| Styling | Tailwind CSS v4 + shadcn/ui | Best DX, production-quality components |
| Animations | Framer Motion | Streaming reveal, transitions |
| Server state | TanStack Query v5 | Caching, background refetch, optimistic UI |
| Client state | Zustand | Lightweight, no boilerplate |
| Forms | React Hook Form + Zod | Type-safe forms and validation |
| AI SDK | Vercel AI SDK + Anthropic SDK | Best streaming/agent DX |
| LLM | claude-sonnet-4-20250514 | Best instruction following and JSON output |
| Agent framework | LangGraph.js | Stateful multi-agent workflows |
| Embeddings | Voyage AI (voyage-3) | Outperforms OpenAI for document retrieval |
| Vector DB | Pinecone Serverless | Production-grade managed vector search |
| Document parsing | LlamaParse | Best PDF parsing for RAG (handles tables, complex layouts) |
| Database | Supabase (PostgreSQL) | DB + Auth + Storage + Realtime in one |
| ORM | Drizzle ORM | Type-safe, lightweight, best Supabase DX |
| Auth | Supabase Auth | Native Supabase integration, row-level security |
| File storage | Supabase Storage | Scoped to user, encrypted, easy CDN |
| Background jobs | Trigger.dev v3 | Best Next.js background jobs, type-safe |
| Browser automation | Stagehand (by Browserbase) | AI-native Playwright wrapper for form filling |
| Observability | Langfuse | LLM call tracing, prompt versioning, cost tracking |
| Error monitoring | Sentry | Production error tracking |
| Testing | Vitest + Playwright | Unit + E2E |
| Deployment | Vercel + Supabase cloud | Best-in-class Next.js deployment |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── profile/             # Document upload + questionnaire
│   │   │   └── page.tsx
│   │   ├── jobs/                # Job queue
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Generation + review screen
│   │   └── history/             # Application log
│   │       └── page.tsx
│   └── api/
│       ├── documents/
│       │   └── route.ts         # Upload + trigger ingestion job
│       ├── jobs/
│       │   └── route.ts         # Analyse job posting
│       ├── generate/
│       │   └── route.ts         # Streaming generation endpoint
│       ├── apply/
│       │   └── route.ts         # Submit application
│       └── webhooks/
│           └── trigger/
│               └── route.ts     # Trigger.dev webhook receiver
├── components/
│   ├── ui/                      # shadcn auto-generated, do not edit manually
│   ├── upload/
│   │   ├── dropzone.tsx
│   │   └── file-status.tsx
│   ├── questionnaire/
│   │   ├── question-card.tsx
│   │   └── progress-bar.tsx
│   ├── generation/
│   │   ├── agent-timeline.tsx   # Live agent progress (streaming)
│   │   ├── cv-diff.tsx          # Side-by-side diff viewer
│   │   └── stream-output.tsx    # Streaming text reveal
│   └── applications/
│       ├── application-card.tsx
│       └── status-badge.tsx
├── lib/
│   ├── ai/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts
│   │   │   ├── job-analyst.ts
│   │   │   ├── relevancy.ts
│   │   │   ├── cv-writer.ts
│   │   │   ├── cover-letter-writer.ts
│   │   │   └── qa-checker.ts
│   │   ├── prompts/             # Versioned prompt templates
│   │   │   ├── job-analyst.v1.ts
│   │   │   ├── cv-writer.v1.ts
│   │   │   ├── cover-letter.v1.ts
│   │   │   └── qa-checker.v1.ts
│   │   └── tools/               # Claude tool definitions (typed)
│   ├── rag/
│   │   ├── ingestion/
│   │   │   ├── parse.ts         # LlamaParse wrapper
│   │   │   └── extract.ts       # GitHub + LinkedIn extractors
│   │   ├── chunking/
│   │   │   └── strategies.ts    # Section-aware chunking per file type
│   │   ├── embeddings/
│   │   │   └── voyage.ts        # Voyage AI embedding wrapper
│   │   └── retrieval/
│   │       ├── search.ts        # Pinecone similarity search
│   │       └── rerank.ts        # Cohere reranker (post-retrieval)
│   ├── browser/
│   │   ├── apply.ts             # Stagehand application automation
│   │   └── extract.ts           # Job posting scraper
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema
│   │   └── queries/
│   │       ├── documents.ts
│   │       ├── applications.ts
│   │       └── users.ts
│   ├── queue/
│   │   ├── ingest-document.ts   # Trigger.dev: parse + chunk + embed
│   │   ├── generate-application.ts
│   │   └── submit-application.ts
│   └── validation/
│       └── schemas.ts           # All Zod schemas
├── hooks/
│   ├── use-stream.ts            # Vercel AI SDK streaming hook
│   ├── use-upload.ts
│   └── use-application.ts
├── stores/
│   ├── user-profile.store.ts    # Questionnaire answers + preferences
│   └── generation.store.ts      # Active generation state
└── types/
    ├── agents.ts
    ├── documents.ts
    └── applications.ts
```

---

## Environment Variables Required

```bash
# AI
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=

# Vector DB
PINECONE_API_KEY=
PINECONE_INDEX=hireloop-docs

# Document Parsing
LLAMA_CLOUD_API_KEY=

# Database + Auth + Storage
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Background Jobs
TRIGGER_SECRET_KEY=

# Browser Automation
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=

# Reranking (optional, improves RAG)
COHERE_API_KEY=

# Monitoring
SENTRY_DSN=
```

---

## Critical Rules for Claude Code

### Code Quality
- All code in TypeScript strict mode — no `any`, no `as unknown`
- Every function must have explicit return types
- Use Zod for all runtime validation — never trust unvalidated external data
- Error boundaries on every major UI section
- All async functions must handle errors — never unhandled promise rejections

### AI Calls
- All LLM calls go through `src/lib/ai/` — never call Anthropic SDK directly from routes
- Always trace calls via Langfuse: `const trace = langfuse.trace({ name: 'agent-name' })`
- Log every token count and prompt version used
- Default model: `claude-sonnet-4-20250514` — do not change without a comment
- Always stream responses — never wait for full completion before showing UI

### Database
- Every Supabase query uses the server client from `@/lib/db`
- Row Level Security is enabled on all tables — never use `service_role` key in client-side code
- All schema changes go through Drizzle migrations — never ALTER TABLE manually

### Security
- No secrets in code, `.env.local` only
- Sanitize all extracted document text before injecting into prompts
- All API routes require Supabase auth session verification
- RLS policies: users can only read/write their own rows

### Testing
- Every new agent function needs a Vitest unit test
- Every new API route needs at least one integration test
- Playwright E2E covers the full generation flow

### Working Style
- Work through tasks autonomously — only surface blockers, not progress updates
- After each major task: run `pnpm typecheck` and `pnpm lint` — fix all errors before moving on
- Never leave TODO comments — either implement it or create a GitHub issue comment
- Commit message format: `feat(scope): description` / `fix(scope): description`

---

## Current Phase

> Update this section at the start of each session to reflect what's done.

- [ ] Phase 1: Project scaffold + auth + DB schema
- [ ] Phase 2: Document ingestion pipeline (upload → parse → chunk → embed)
- [ ] Phase 3: Multi-agent generation pipeline
- [ ] Phase 4: Application auto-fill (Stagehand)
- [ ] Phase 5: UI polish + streaming generation view
- [ ] Phase 6: Observability + error handling + tests