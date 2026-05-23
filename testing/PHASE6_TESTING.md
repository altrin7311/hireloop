# Phase 6 — testing the Selenium submit + credit-decrement flow

This is a local checklist for verifying the end-to-end "Confirm & Apply" path
without paying a credit at a real ATS.

## 0. One-off setup

```bash
# 1. Apply the new contact-fields migration.
node -e "
import('postgres').then(({default:p})=>{
  require('dotenv').config({path:'.env.local'});
  const sql=require('fs').readFileSync('drizzle/0003_user_preferences_contact.sql','utf8');
  const c=p(process.env.DATABASE_URL,{prepare:false});
  c.unsafe(sql).then(()=>{console.log('ok');return c.end();});
});
" 2>&1 | tail -2

# 2. Make sure the Python deps are installed (adds reportlab + selenium toolchain).
cd automation
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
```

Confirm `automation/.env` has both:

```
DRY_RUN=true
FAST_MODE=true
```

`DRY_RUN=true` makes the filler stop just before clicking submit — every other
step (browser open, field discovery, file upload, screenshot) runs for real.

## 1. Headless script test (no browser session needed)

```bash
# Terminal 1 — Python service.
cd automation
source venv/bin/activate
uvicorn main:app --port 8000 --reload

# Terminal 2 — drives the same code path as POST /api/apply.
pnpm tsx scripts/test-apply.ts
```

Expect:
- "credits before: N"
- A Python response with `success: true` and `dry_run: true`
- A screenshot written to `/tmp/test-apply-*.png`
- "✅ balance N → N-1"

If `success: false`, the script asserts the balance **did not change** and
exits 0 — that confirms the no-debit-on-failure invariant.

## 2. Browser test

```bash
# Same Terminal 1 (Python service still running).

# Terminal 2 — Next.js.
pnpm dev
```

Then in the browser:

1. Sign in → /dashboard/feed.
2. Top-right shows `N credits` pill — click it to open the history modal.
3. Click any job → "Review & Apply" → wait for the 5-agent pipeline to finish.
4. Click **Confirm & Apply** → confirmation modal lists current balance.
5. Click **Submit application** → "Submitting application…" spinner.
6. Result modal renders the live page screenshot. Banner says "Submitted
   (dry run)" and credits remaining decremented by 1.
7. The credits pill in the navbar updates without a refresh (custom event).

## 3. Verifying in Supabase

After a successful test:

```sql
-- Credit was debited exactly once.
SELECT balance FROM user_credits WHERE user_id = '<USER_ID>';

-- A 'spend' row was inserted linked to the application.
SELECT amount, type, application_id, created_at
FROM credit_transactions
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC
LIMIT 5;

-- Application moved from 'generated' → 'submitted' with a timestamp.
SELECT id, submission_status, submitted_at, credits_used
FROM applications
WHERE id = '<APPLICATION_ID>';
```

Failure case checklist (rate-limited, Python down, submit button missing):

- `applications.submission_status` MUST still be `generated`.
- `credit_transactions` MUST NOT have a new `spend` row.
- `user_credits.balance` MUST be unchanged.

## 4. Going live (DO NOT do this in dev)

In production:

1. `automation/.env`: `DRY_RUN=false`, `FAST_MODE=false`.
2. `HEADLESS=true`.
3. Cap your test account's `user_credits.balance` low (e.g. 1) so a single
   misfire can't burn through a pack.
4. Watch the screenshot returned by the first real run before submitting a
   second.
