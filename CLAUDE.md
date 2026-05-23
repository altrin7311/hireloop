# CLAUDE.md — HireLoop
# STATUS: FINAL LOCKED SPEC — do not deviate without explicit instruction

Read this fully at the start of every session. This is your single source of truth.

---

## What HireLoop Is

HireLoop is a **precision job application agent** — the explicit counter to spray-and-pray bots.
It submits fewer applications than competitors, but each one is tailored, human-sounding,
and sent through behaviour that avoids platform detection.

Core positioning: "5 perfect applications beat 500 generic ones."

---

## What It Does

1. User uploads CV (PDF), cover letter, GitHub URL, LinkedIn URL, optional .md/.txt docs
2. User completes a one-time questionnaire (tone, preferences, exclusions, industry)
3. HireLoop scrapes job listings from all 5 platforms on a schedule
4. Each listing is scored for match AND checked for ghost job signals
5. Ghost jobs are auto-skipped before any AI generation is triggered
6. User browses the ranked Job Feed and either applies manually or enables Precision Auto-Apply
7. A 5-agent AI pipeline generates a tailored CV + cover letter using a hybrid LLM strategy
8. User reviews output with a side-by-side diff, edits inline, confirms
9. The Stealth Engine submits the application via Selenium — with human-like behaviour
10. Application is logged; user manually marks interview callbacks in the dashboard

---

## Tech Stack (FINAL — do not change)

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, streaming, RSC |
| Language | TypeScript strict | Type safety everywhere |
| Styling | Tailwind CSS v4 + shadcn/ui | Speed + quality |
| Animations | Framer Motion | Streaming reveals, transitions |
| Server state | TanStack Query v5 | Caching, optimistic UI |
| Client state | Zustand | Lightweight, no boilerplate |
| Forms | React Hook Form + Zod | Type-safe forms |
| AI SDK | Anthropic SDK (direct) | One provider, simple billing |
| LLM — extraction | claude-haiku-4-5 | Cheap, fast: scraping, classification, ghost detection |
| LLM — writing | claude-sonnet-4-6 | Quality: CV, cover letter, custom answers |
| Agent framework | LangGraph.js | Stateful multi-agent graph |
| Embeddings | Voyage AI (voyage-3) | Best for document retrieval |
| Vector DB | Pinecone Serverless | Production-grade managed search |
| Document parsing | LlamaParse | Best PDF parsing for RAG |
| Database | Supabase (PostgreSQL) | DB + Auth + Storage + Realtime |
| ORM | Drizzle ORM | Type-safe, lightweight |
| Auth | Supabase Auth | Native integration + RLS |
| File storage | Supabase Storage | User-scoped, encrypted |
| Payments | Stripe (one-time purchases) | Credit pack purchases |
| Background jobs | Trigger.dev v3 | Scraping cron + job queues |
| Browser automation | Python + Selenium | Separate microservice — builder proficient in it |
| Automation stealth | undetected-chromedriver | Anti-detection, human behaviour mimicry |
| Observability | Langfuse | LLM tracing, prompt versioning, cost tracking |
| Error monitoring | Sentry | Production error tracking |
| Testing | Vitest + Playwright | Unit + E2E |
| Deployment | Vercel (Next.js) + Railway (Python) | Best-in-class for each |

---

## Architecture: Two Services

### Service 1 — Next.js App (TypeScript)
All frontend, all API routes, all AI agents, all database logic.
Deployed on Vercel.

### Service 2 — Automation Microservice (Python + FastAPI)
ONLY responsible for:
- Selenium scraping of job listings (LinkedIn, Indeed, Greenhouse, Lever, Workday)
- Selenium form filling and application submission
- Stealth Engine logic (delays, human behaviour, health monitoring)

Communicates with Service 1 via REST API.
Deployed on Railway.

---

## Design System — Topaz Palette (LOCKED)

```
--hl-bg:             #F5FFFE   (page background — cool white)
--hl-surface:        #E0F9FA   (card tints, tag backgrounds)
--hl-surface-raised: #FFFFFF   (elevated cards, modals)
--hl-border:         #B2EDEC   (default border)
--hl-border-subtle:  #D4F5F5   (dividers)
--hl-accent:         #00B8D9   (primary buttons, badges, active states)
--hl-accent-hover:   #0097B2   (hover)
--hl-accent-light:   #E0F9FA   (tint backgrounds)
--hl-text-primary:   #0C1A1C   (headings, body)
--hl-text-secondary: #5A9EA8   (labels, meta)
--hl-text-tertiary:  #8ABCC4   (placeholders, timestamps)
--hl-warning-bg:     #FFF5E0
--hl-warning-text:   #A05E00
--hl-warning-border: #FFDEA0
```

Logo mark: 32×32px square, bg #00B8D9, rounded-lg, "HL" font-extrabold white.
Light mode default. Dark mode toggle available.

---

## Monetisation — Credit-Based "Job-Pack" Model

Credits are purchased once. They never expire. 1 credit = 1 submitted application.
AI generation (without submission) does not cost credits.

| Plan | Price | Credits | Target User |
|---|---|---|---|
| Free Kick | $0 | 2 | Sceptical user testing quality |
| The Interviewer | $15 | 20 | Active seeker, specific roles |
| The Power Hunter | $35 | 60 | Aggressive seeker, competitive market |
| The Career Pivot | $60 | 120 | Pivoting across multiple industries |

### Credit Rules
- 2 free credits granted on email verification (not just signup — prevents abuse)
- Credits deducted ONLY on successful Selenium form submission (confirmed by the Python service)
- If submission fails: no credit deducted, error logged, user notified
- Credits stored in `user_credits` table with full transaction log
- Stripe Checkout for all purchases (one-time payment, no subscription)

### Landing Page Hook — "Resume Health Check"
Free tool on the public landing page (no account required):
- User pastes their CV text + a job description
- Claude Haiku scores the match, identifies missing keywords, shows 3 improvement suggestions
- CTA: "Apply with 1 credit and let HireLoop rewrite it for you"
- This is the primary acquisition funnel. Build it in Phase 1.

---

## The Stealth Engine (Python Microservice)

All platform limits are hardcoded — not user-configurable.
These protect users from themselves.

| Platform | Max/day | Min gap | Hours (job's local timezone) |
|---|---|---|---|
| LinkedIn | 3 | 60 min | 08:00–19:00 |
| Indeed | 5 | 25 min | 08:00–20:00 |
| Greenhouse | 8 | 10 min | Any |
| Lever | 8 | 10 min | Any |
| Workday | 6 | 15 min | Any |

Human behaviour rules (all randomised):
- Reads the job page for 30–90s before touching the form
- Types at 120–180 WPM with random micro-pauses (not instant fill)
- Randomises gap between applications by ±30% of minimum
- Prefers Tuesday–Thursday when recruiters are most active
- Random mouse movement before clicking submit

Health monitoring:
- CAPTCHA detected → pause platform for 24h, push notification to user
- 2 failed submissions in a row → pause + flag for manual review
- Unusual response pattern → back off for 6h, log incident

---

## Ghost Job Detection (auto-skip before any AI generation)

Run by Claude Haiku. A job is flagged as ghost if 2+ signals match:

1. Posted more than 60 days ago with no update
2. Same job title posted 3+ times by same company in 30 days
3. Job description is a near-duplicate of another active listing (>85% similarity)
4. Company has a hiring freeze flag (sourced from layoffs.fyi or similar)
5. "Easy Apply" on LinkedIn with 500+ applicants and posted >30 days ago

Auto-skipped jobs are logged with reason. User can view skipped jobs and override.

---

## Interview Callback Tracking

Stored in `applications` table: `interview_status` field.
Values: `pending` | `rejected` | `interview_scheduled` | `offer` | `ghosted`

User marks status manually via the dashboard (we cannot auto-detect this).

Dashboard shows:
- Total applications sent
- Interview rate % (interviews ÷ total)
- Breakdown by platform (which platform converts best)
- Breakdown by match score band (do 80%+ matches actually get more interviews?)
- 30-day trend chart

This data becomes the product's proof of quality over time.

---

## Database Schema (Supabase + Drizzle)

### Core tables

```sql
-- User credits
user_credits (
  id uuid primary key,
  user_id uuid references auth.users unique,
  balance integer default 2,
  total_purchased integer default 0,
  updated_at timestamptz
)

-- Credit transactions
credit_transactions (
  id uuid primary key,
  user_id uuid references auth.users,
  amount integer,              -- positive = purchase, negative = spend
  type text,                   -- 'purchase' | 'spend' | 'refund' | 'signup_bonus'
  application_id uuid,         -- null for purchases
  stripe_payment_id text,      -- null for non-purchases
  created_at timestamptz
)

-- User preferences (questionnaire)
user_preferences (
  id uuid primary key,
  user_id uuid references auth.users unique,
  target_roles text[],
  target_locations text[],
  seniority_level text,
  industries text[],
  exclude_companies text[],
  tone_preference text,
  always_emphasize text[],
  never_mention text[],
  salary_expectation text,
  notice_period text,
  work_authorization boolean,
  requires_sponsorship boolean,
  preferred_name text
)

-- Document chunks (RAG)
document_chunks (
  id uuid primary key,
  user_id uuid references auth.users,
  source_file text,
  chunk_type text,
  chunk_index integer,
  content text,
  word_count integer,
  pinecone_id text unique,
  file_type text,
  uploaded_at timestamptz
)

-- Job listings (scraped)
job_listings (
  id uuid primary key,
  platform text,
  external_id text,
  title text,
  company text,
  location text,
  remote boolean,
  salary_min integer,
  salary_max integer,
  description text,
  application_url text,
  posted_at timestamptz,
  scraped_at timestamptz,
  is_ghost boolean default false,
  ghost_reason text,
  applicant_count integer,
  unique(platform, external_id)
)

-- Per-user job match scores
user_job_scores (
  id uuid primary key,
  user_id uuid references auth.users,
  job_id uuid references job_listings,
  match_score integer,         -- 0-100
  matched_skills text[],
  missing_skills text[],
  scored_at timestamptz,
  unique(user_id, job_id)
)

-- Applications
applications (
  id uuid primary key,
  user_id uuid references auth.users,
  job_id uuid references job_listings,
  tailored_cv jsonb,
  cover_letter text,
  qa_report jsonb,
  match_score integer,
  submitted_at timestamptz,
  submission_status text,      -- 'pending' | 'submitted' | 'failed'
  interview_status text,       -- 'pending' | 'rejected' | 'interview_scheduled' | 'offer' | 'ghosted'
  credits_used integer default 1,
  platform text,
  notes text
)
```

---

## Project Structure

```
hireloop/
├── src/                          # Next.js app (TypeScript)
│   ├── app/
│   │   ├── (marketing)/          # Public pages
│   │   │   ├── page.tsx          # Landing page + Resume Health Check
│   │   │   ├── pricing/
│   │   │   └── sign-in / sign-up/
│   │   ├── (dashboard)/          # Protected app
│   │   │   ├── feed/             # Job Feed
│   │   │   ├── jobs/[id]/        # Generation + review
│   │   │   ├── applications/     # History + callback tracking
│   │   │   ├── profile/          # Docs + questionnaire
│   │   │   └── settings/         # Credits, account
│   │   └── api/
│   │       ├── documents/
│   │       ├── jobs/
│   │       ├── generate/         # Streaming SSE
│   │       ├── apply/            # Calls Python service
│   │       ├── credits/
│   │       ├── stripe/
│   │       └── webhooks/
│   ├── lib/
│   │   ├── ai/agents/            # 5 LangGraph agents
│   │   ├── ai/prompts/           # Versioned prompt templates
│   │   ├── rag/                  # Voyage + Pinecone pipeline
│   │   ├── db/                   # Drizzle schema + queries
│   │   ├── stripe/               # Payment helpers
│   │   └── validation/           # Zod schemas
│   └── components/
│       ├── ui/                   # shadcn
│       ├── feed/                 # Job cards, filters
│       ├── generation/           # Agent timeline, diff, stream
│       ├── applications/         # History, callback tracker
│       └── upload/               # File dropzone
│
├── automation/                   # Python microservice
│   ├── main.py                   # FastAPI app
│   ├── scrapers/
│   │   ├── linkedin.py
│   │   ├── indeed.py
│   │   ├── greenhouse.py
│   │   ├── lever.py
│   │   └── workday.py
│   ├── stealth/
│   │   ├── engine.py             # Rate limits, delays, health monitoring
│   │   └── browser.py            # undetected-chromedriver setup
│   ├── filler/
│   │   └── apply.py              # Form filling logic
│   └── requirements.txt
│
├── CLAUDE.md                     # This file
├── AGENTS.md                     # Agent architecture
└── .cursor/rules/                # All .mdc files
```

---

## Environment Variables

```bash
# Anthropic (both models, one key)
ANTHROPIC_API_KEY=

# RAG
VOYAGE_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=hireloop-docs

# Document parsing
LLAMA_CLOUD_API_KEY=

# Database + Auth + Storage
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Background jobs
TRIGGER_SECRET_KEY=

# Observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
SENTRY_DSN=

# Python microservice URL
AUTOMATION_SERVICE_URL=http://localhost:8000
AUTOMATION_API_KEY=           # Shared secret between Next.js and Python service
```

---

## Build Phases

- [ ] Phase 1: Scaffold + auth + DB schema + Topaz design tokens + Resume Health Check on landing page
- [ ] Phase 2: Document ingestion pipeline (upload → LlamaParse → chunk → embed → Pinecone)
- [ ] Phase 3: Python scraping service (all 5 platforms + ghost detection + Stealth Engine)
- [ ] Phase 4: Job Feed UI (cards, filters, match scores, auto-apply toggle)
- [ ] Phase 5: AI generation pipeline (5 agents, LangGraph, streaming, diff view)
- [ ] Phase 6: Selenium form filling + credit decrement on submission
- [ ] Phase 7: Stripe credit packs + dashboard (interview tracking, callback rate)
- [ ] Phase 8: Production hardening (rate limiting, Langfuse, Sentry, tests, deploy)

---

## Non-Negotiables

1. TypeScript strict everywhere — no `any`
2. All LLM calls traced via Langfuse
3. Credits deducted ONLY on confirmed submission from Python service
4. Stealth Engine rate limits are hardcoded — never user-configurable
5. Ghost jobs auto-skipped — no AI generation wasted on them
6. Never submit without user confirmation (manual mode)
7. All user documents are PII — RLS on all tables, never logged
8. Always make a testing file for each phase and put it in testing folder

## Design Reference
design-reference/hireloop - contains all the reference files for the design replicate this ALWAYS
