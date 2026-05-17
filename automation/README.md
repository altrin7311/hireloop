# HireLoop Automation Service

Python microservice — Selenium scraping, Stealth Engine rate limiting, and
form-filling for the HireLoop Next.js app. Deploys separately (Railway).

## Endpoints

All endpoints (except `/health`) require an `X-API-Key` header matching
`AUTOMATION_API_KEY`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/scrape` | Run scrapers, drop ghost jobs, return listings. |
| `POST` | `/apply` | Stealth-engine-gated submission. Stub for Phase 3. |
| `GET` | `/health` | Liveness probe. |

## Run locally

```bash
cd automation

# 1. virtualenv (recommended)
python3 -m venv .venv
source .venv/bin/activate

# 2. install deps
pip install -r requirements.txt

# 3. copy env
cp .env.example .env
# edit AUTOMATION_API_KEY to match Next.js .env.local

# 4. start the API
uvicorn automation.main:app --port 8000 --reload
```

Smoke-test from the project root:

```bash
curl -s http://localhost:8000/health
# → {"status":"ok","version":"1.0.0"}

curl -s -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: devsecret123" \
  -d '{"platforms":["greenhouse"],"query":"engineer","greenhouse_slugs":["stripe"]}'
```

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `AUTOMATION_API_KEY` | _required_ | Shared secret with Next.js. Service refuses requests when unset. |
| `HEADLESS` | `true` | Chrome headless toggle. |
| `STEALTH_STATE_DIR` | `./.stealth_state` | Per-user JSON state for rate-limit tracking. |
| `HIRING_FREEZE_COMPANIES` | _empty_ | Comma-separated company names to treat as ghost-flagged. |
| `LOG_LEVEL` | `INFO` | Standard Python logging level. |

## Stealth Engine

Hardcoded per `CLAUDE.md`. **Do not expose to users.**

| Platform | Max/day | Min gap | Allowed hours (UTC) |
|---|---|---|---|
| LinkedIn | 3 | 60 min | 08:00–19:00 |
| Indeed | 5 | 25 min | 08:00–20:00 |
| Greenhouse | 8 | 10 min | any |
| Lever | 8 | 10 min | any |
| Workday | 6 | 15 min | any |

The `record_application()` function appends a UTC timestamp to a per-user JSON
file. `can_apply()` reads back the last 24h of timestamps and applies a ±30%
jitter on the min-gap before allowing.

## Known limitations (Phase 3)

- **LinkedIn / Indeed**: guest endpoints throttle aggressively. Expect empty
  results during peak hours. Selenium fallback is planned for Phase 6.
- **Workday**: requires the tenant URL up front. A handful of older Workday
  tenants use non-standard CXS paths; those will need bespoke handling.
- **`/apply`** is a stub. It honours the Stealth Engine, returns a placeholder
  PNG screenshot, and records the application — but does **not** drive
  Selenium yet. Phase 6 lands the real submission flow.
- Ghost detection runs **only within the current scrape batch**. Cross-batch
  duplicate-post detection requires persistence (planned).
- State directory is local-only; multi-instance deploys must point
  `STEALTH_STATE_DIR` at a shared volume.
