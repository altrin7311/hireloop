# HireLoop

> **Status: currently under development.**

HireLoop is a **precision job application agent** — the explicit counter to
spray-and-pray bots. It submits fewer applications than competitors, but each
one is tailored, human-sounding, and sent through behaviour designed to avoid
platform detection.

> _"5 perfect applications beat 500 generic ones."_

---

## What it does

1. **Upload your story** — CV (PDF), cover letter, GitHub URL, LinkedIn URL,
   optional Markdown/text docs.
2. **One-time questionnaire** — tone, target roles, exclusions, salary range,
   work authorization.
3. **Continuous scraping** — pulls listings from LinkedIn, Indeed, Greenhouse,
   Lever, and Workday on a schedule.
4. **Ghost-job detection** — each listing is checked against five heuristics
   (stale post, duplicate, hiring freeze, etc.) **before** any AI work runs.
5. **Match scoring** — each surviving listing is scored against your uploaded
   documents using cosine similarity over Google embeddings (pgvector).
6. **AI tailoring** — a five-agent LangGraph pipeline generates a tailored CV
   and cover letter using a hybrid Claude Haiku / Sonnet strategy.
7. **Review & confirm** — side-by-side diff with inline edits before anything
   is submitted.
8. **Stealth submission** — a Python + Selenium microservice submits the
   application with human-like behaviour (typing speed, reading delays,
   randomised gaps, allowed-hours guards).
9. **Track callbacks** — manually mark interview status and watch the
   conversion rate per platform and per match-score band.

---

## Architecture

Two services:

| Service | Stack | Hosting | Responsibility |
|---|---|---|---|
| `src/` | Next.js 15 + TypeScript + Drizzle + Supabase | Vercel | UI, auth, RAG, AI pipeline, API routes. |
| `automation/` | Python + FastAPI + Selenium + undetected-chromedriver | Railway | Scraping, Stealth Engine, form filling. |

The Next.js app calls the Python service over REST with a shared
`X-API-Key` header.

---

## Tech stack

- **Frontend:** Next.js 15 (App Router), Tailwind v4, shadcn/ui, Framer Motion
- **State:** TanStack Query v5, Zustand, React Hook Form + Zod
- **AI:** Anthropic SDK (Claude Haiku for extraction; Claude Sonnet for writing), LangGraph.js
- **RAG:** Google `gemini-embedding-001` (768-dim) → Supabase Postgres + pgvector
- **Document parsing:** `pdfjs-dist` (server-only, via `serverExternalPackages`)
- **Database:** Supabase Postgres + Drizzle ORM
- **Auth + storage:** Supabase Auth + Storage (row-level security on every table)
- **Payments:** Stripe (credit packs, no subscription)
- **Background jobs:** Trigger.dev v3
- **Automation:** Python 3.11+, FastAPI, Selenium 4, undetected-chromedriver
- **Observability:** Langfuse (LLM tracing), Sentry (errors)
- **Testing:** Vitest + Playwright

---

## Monetisation

Credit-based. Credits never expire. **1 credit = 1 successful submission.**

| Plan | Price | Credits |
|---|---|---|
| Free Kick | $0 | 2 (granted on email verification) |
| The Interviewer | $15 | 20 |
| The Power Hunter | $35 | 60 |
| The Career Pivot | $60 | 120 |

Credits are debited **only** on confirmed submission from the Python service —
failed submissions are free.

---

## Build phases

- [x] Phase 1 — Scaffold + auth + DB schema + design tokens + Resume Health Check
- [x] Phase 2 — Document ingestion pipeline (PDF/MD/TXT → chunks → embeddings → pgvector)
- [x] Phase 3 — Python scraping service + Stealth Engine + ghost detection + `/api/jobs` integration
- [ ] Phase 4 — Job Feed UI (cards, filters, match scores, auto-apply toggle)
- [ ] Phase 5 — Five-agent LangGraph generation pipeline with streaming + diff view
- [ ] Phase 6 — Real Selenium form filling + credit decrement on submission
- [ ] Phase 7 — Stripe credit packs + callback tracking dashboard
- [ ] Phase 8 — Production hardening (rate limiting, Langfuse, Sentry, tests, deploy)

---

## Running with Docker

Both services come up with one command (Next.js on 3000, Python automation on 8000):

```bash
docker compose --env-file .env.local up --build
```

`--env-file .env.local` is required so Compose can resolve `NEXT_PUBLIC_*`
build args from your local secrets file. Next.js inlines those values into
the client bundle at **build** time — they cannot be injected at runtime.

`.env.local` (Next.js) and `automation/.env` (Python) must exist at repo paths.
Neither is baked into the image; runtime envs are passed via `env_file`.

## Running locally

### Next.js (Terminal 1)

```bash
pnpm install
cp .env.example .env.local
# fill in Supabase keys, Google embedding key, GROQ_API_KEY, AUTOMATION_API_KEY
pnpm dev
```

### Python automation service (Terminal 2)

```bash
cd automation
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --port 8000 --reload
```

See [`automation/README.md`](./automation/README.md) for endpoint details and
known limitations.

---

## Non-negotiables

1. TypeScript strict everywhere — no `any`.
2. All LLM calls traced via Langfuse.
3. Credits deducted **only** on confirmed submission from the Python service.
4. Stealth Engine rate limits are hardcoded — never user-configurable.
5. Ghost jobs auto-skipped — no AI generation wasted on them.
6. Never submit without explicit user confirmation in manual mode.
7. All user documents are PII — RLS on every table, never logged.
