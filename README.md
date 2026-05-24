# HireLoop

> **Status:** Phases 1–7 complete. Phase 8 (production hardening) is next.

HireLoop is a **precision job application agent** — the explicit counter to
spray-and-pray bots. It submits fewer applications than competitors, but each
one is tailored, human-sounding, and sent through behaviour designed to avoid
platform detection.

> _"5 perfect applications beat 500 generic ones."_

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Monetisation](#monetisation)
- [Build phases](#build-phases)
- [Running locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [Environment variables](#environment-variables)
- [Project layout](#project-layout)
- [Testing](#testing)
- [Non-negotiables](#non-negotiables)

---

## What it does

1. **Upload your story** — CV (PDF), cover letter, GitHub URL, LinkedIn URL,
   optional Markdown / text docs.
2. **One-time questionnaire** — tone, target roles, exclusions, salary range,
   work authorization.
3. **Continuous scraping** — pulls listings from LinkedIn, Indeed, Greenhouse,
   Lever, and Workday on a schedule.
4. **Ghost-job detection** — each listing is checked against five heuristics
   (stale post, duplicate, hiring freeze, etc.) **before** any AI work runs.
5. **Match scoring** — each surviving listing is scored against your uploaded
   documents using cosine similarity over Google embeddings (pgvector).
6. **AI tailoring** — a five-agent LangGraph pipeline generates a tailored CV
   and cover letter using a hybrid Groq / Anthropic strategy.
7. **Review & confirm** — side-by-side diff with inline edits before anything
   is submitted.
8. **Stealth submission** — a Python + Selenium microservice submits the
   application with human-like behaviour (typing speed, reading delays,
   randomised gaps, allowed-hours guards).
9. **Track callbacks** — manually mark interview status and watch the
   conversion rate per platform and per match-score band.

---

## Architecture

Two services, deployed independently:

| Service          | Stack                                                   | Hosting  | Responsibility                                |
| ---------------- | ------------------------------------------------------- | -------- | --------------------------------------------- |
| `src/`           | Next.js 15, TypeScript, Drizzle, Supabase, Stripe       | Vercel   | UI, auth, RAG, AI pipeline, API routes, billing. |
| `automation/`    | Python, FastAPI, Selenium, undetected-chromedriver      | Railway  | Scraping, Stealth Engine, form filling.       |

The Next.js app calls the Python service over REST with a shared
`X-API-Key` header (`AUTOMATION_API_KEY`).

---

## Tech stack

- **Frontend** — Next.js 15 (App Router), Tailwind v4, shadcn/ui, Framer Motion, Recharts
- **State** — TanStack Query v5, Zustand, React Hook Form + Zod
- **AI** — Groq (`llama-3.3-70b-versatile` streaming, `openai/gpt-oss-120b` structured), Anthropic SDK, LangGraph.js, Vercel AI SDK
- **RAG** — Google `gemini-embedding-001` (768-dim) → Supabase Postgres + pgvector
- **Document parsing** — `pdfjs-dist` (server-only, via `serverExternalPackages`)
- **Database** — Supabase Postgres + Drizzle ORM
- **Auth + storage** — Supabase Auth + Storage (RLS on every table)
- **Payments** — Stripe Checkout (credit packs, one-off purchases)
- **Background jobs** — Trigger.dev v3 _(Phase 8)_
- **Automation** — Python 3.11+, FastAPI, Selenium 4, undetected-chromedriver, ReportLab (CV PDF)
- **Observability** — Langfuse (LLM tracing), Sentry (errors) _(Phase 8)_
- **Testing** — Vitest + Playwright

---

## Monetisation

Credit-based. **Credits never expire.** **1 credit = 1 successful submission.**

| Plan              | Price | Credits | Per-application |
| ----------------- | ----- | ------- | --------------- |
| Free Kick         | $0    | 2       | Granted on email verification |
| The Interviewer   | $15   | 20      | $0.75 |
| The Power Hunter  | $35   | 60      | $0.58 |
| The Career Pivot  | $60   | 120     | $0.50 |

Credits are debited **only** on a confirmed submission from the Python
service. Failed submissions are free.

---

## Build phases

- [x] **Phase 1** — Scaffold, auth, DB schema, design tokens, Resume Health Check
- [x] **Phase 2** — Document ingestion pipeline (PDF / MD / TXT → chunks → embeddings → pgvector)
- [x] **Phase 3** — Python scraping service, Stealth Engine, ghost detection, `/api/jobs` integration
- [x] **Phase 4** — Job Feed UI (cards, filters, match scores, auto-apply toggle)
- [x] **Phase 5** — Five-agent LangGraph generation pipeline with streaming + diff view
- [x] **Phase 6** — Selenium form filling, CV PDF generator, credit decrement on submission
- [x] **Phase 7** — Stripe credit packs, dashboard stats, applications page
- [ ] **Phase 8** — Production hardening (rate limiting, Langfuse, Sentry, tests, deploy)

---

## Running locally

### Next.js (terminal 1)

```bash
pnpm install
cp .env.example .env.local
# Fill in: Supabase keys, GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
#          AUTOMATION_API_KEY, STRIPE_* keys.
pnpm dev
```

### Python automation service (terminal 2)

```bash
cd automation
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --port 8000 --reload
```

### Stripe webhook forwarding (terminal 3 — only when testing checkout)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy whsec_… into .env.local, restart pnpm dev
```

See [`automation/README.md`](./automation/README.md) for endpoint details.

---

## Running with Docker

Both services come up with one command (Next.js on `3000`, Python on `8000`):

```bash
docker compose --env-file .env.local up --build
```

- `--env-file .env.local` is **required** — Compose needs it to resolve the
  `NEXT_PUBLIC_*` build args. Next.js inlines those values into the client
  bundle at **build** time; they cannot be injected at runtime.
- `.env.local` (Next.js) and `automation/.env` (Python) must both exist at
  the paths shown. Neither is baked into the image; runtime envs are passed
  via `env_file`.

More commands (logs, shells, cleanup) in [`commands.md`](./commands.md).

---

## Environment variables

### `.env.local` (Next.js)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase direct PostgreSQL connection (postgres:// …) |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (build-time + client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (build-time + client) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side admin actions (test scripts) |
| `GROQ_API_KEY` | yes | Both `llama-3.3-70b-versatile` and `openai/gpt-oss-120b` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | `gemini-embedding-001` for RAG + match scoring |
| `AUTOMATION_API_KEY` | yes | Shared secret with the Python service |
| `AUTOMATION_SERVICE_URL` | optional | Defaults to `http://localhost:8000` |
| `STRIPE_SECRET_KEY` | for billing | `sk_test_…` in dev |
| `STRIPE_WEBHOOK_SECRET` | for billing | Output of `stripe listen` (`whsec_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | for billing | `pk_test_…` (Phase 8 will use it) |

### `automation/.env` (Python)

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTOMATION_API_KEY` | _required_ | Must match Next.js value |
| `HEADLESS` | `true` | Chromium headless toggle |
| `DRY_RUN` | `true` in dev | Stop before clicking final submit |
| `FAST_MODE` | `true` in dev | Collapse 30–90s read / 2–5s submit delays |
| `STEALTH_STATE_DIR` | `./.stealth_state` | Per-user rate-limit JSON storage |
| `HIRING_FREEZE_COMPANIES` | _empty_ | Comma-separated ghost-flagged company names |
| `LOG_LEVEL` | `INFO` | Standard Python logging level |

---

## Project layout

```
HireLoop/
├── src/                         # Next.js app (TypeScript)
│   ├── app/
│   │   ├── (marketing)/         # Public landing + Resume Health Check
│   │   ├── (auth)/              # Sign in / sign up
│   │   ├── (dashboard)/dashboard/
│   │   │   ├── page.tsx         # Overview stats + charts
│   │   │   ├── feed/            # Job Feed
│   │   │   ├── jobs/[id]/       # 5-agent generation + Confirm & Apply
│   │   │   ├── applications/    # History + filter + preview drawer
│   │   │   ├── profile/         # Docs + questionnaire
│   │   │   └── settings/        # Stripe billing + transaction history
│   │   └── api/
│   │       ├── generate/        # SSE: streams 5-agent pipeline
│   │       ├── apply/           # Calls Python /apply, debits credits
│   │       ├── credits/         # Balance + last-10 transactions
│   │       ├── jobs/            # Scrape + score
│   │       ├── stripe/checkout/ # Create Checkout Session
│   │       ├── stripe/webhook/  # Grant credits on payment success
│   │       └── …
│   ├── components/
│   │   ├── dashboard/           # Shell, navbar, stats charts
│   │   ├── settings/            # Plans & billing UI
│   │   ├── generation/          # Agent timeline, CV diff, apply modal
│   │   ├── applications/        # List + filter + preview drawer
│   │   └── …
│   └── lib/
│       ├── ai/agents/           # job-analyst, relevancy, cv-writer, cover-letter, qa-checker, orchestrator
│       ├── rag/                 # Parse, chunk, embed, search
│       ├── db/                  # Drizzle schema + Supabase clients
│       └── stripe.ts            # Stripe singleton + plan defs
│
├── automation/                  # Python microservice
│   ├── main.py                  # FastAPI app (/scrape, /apply, /health)
│   ├── scrapers/                # LinkedIn, Indeed, Greenhouse, Lever, Workday, ghost detection
│   ├── stealth/                 # Rate limits, human behaviour, undetected-chromedriver setup
│   └── filler/
│       ├── apply.py             # Selenium form filler
│       └── cv_pdf.py            # ReportLab CV → PDF
│
├── drizzle/                     # SQL migrations
├── scripts/                     # tsx test scripts (test-generation, test-apply, …)
├── docker-compose.yml
├── Dockerfile                   # Next.js standalone image
├── CLAUDE.md                    # Locked spec — read first
├── commands.md                  # Copy-paste command reference
├── PHASE6_TESTING.md            # Manual checklist for Selenium + credit debit
├── PHASE7_TESTING.md            # Manual checklist for Stripe + dashboard
└── README.md                    # You are here
```

---

## Testing

```bash
pnpm typecheck                       # tsc --noEmit, must be clean
pnpm tsx scripts/test-generation.ts  # 5-agent pipeline end-to-end
pnpm tsx scripts/test-apply.ts       # /apply with credit-debit assertions
```

Manual flows:

- **Phase 6** — Selenium + credit debit: see [`PHASE6_TESTING.md`](./PHASE6_TESTING.md)
- **Phase 7** — Stripe checkout + webhook: see [`PHASE7_TESTING.md`](./PHASE7_TESTING.md)

---

## Non-negotiables

These rules are inherited from `CLAUDE.md` and must hold in every PR:

1. **TypeScript strict everywhere** — no `any`.
2. **All LLM calls traced via Langfuse** _(Phase 8)_.
3. **Credits deducted only on confirmed submission from the Python service.**
4. **Stealth Engine rate limits are hardcoded** — never user-configurable.
5. **Ghost jobs auto-skipped** — no AI generation wasted on them.
6. **Never submit without explicit user confirmation** in manual mode.
7. **All user documents are PII** — RLS on every table, never logged.
