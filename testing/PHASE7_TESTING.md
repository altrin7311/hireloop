# Phase 7 — Stripe credit packs + dashboard

## 0. Environment

Fill these in `.env.local` with test-mode keys:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is currently only loaded into the client
bundle — it is not used by any current component, but Phase 8 will need it for
Stripe Elements. Set it now to avoid an extra Docker rebuild later.

The webhook secret comes from `stripe listen` (step 2 below).

## 1. Start everything

```bash
# Terminal 1 — Python automation (still needed for the apply flow).
cd automation && source venv/bin/activate && uvicorn main:app --port 8000 --reload

# Terminal 2 — Next.js.
pnpm dev
```

## 2. Stripe CLI — forward webhooks to localhost

Install: `brew install stripe/stripe-cli/stripe` (or
https://docs.stripe.com/stripe-cli).

```bash
stripe login                          # one-off
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints `Ready! Your webhook signing secret is whsec_XXXX…`. Copy that
value into `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart `pnpm dev`.

## 3. Buy a pack in test mode

1. Sign in → `/dashboard/settings`.
2. Banner shows current credits.
3. Click **Buy credits** on **The Interviewer**.
4. Stripe-hosted checkout opens with `customer_email` prefilled.
5. Card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
6. Complete payment → redirected to `/dashboard/settings?success=true`.
7. Banner: "Purchase complete — your credits should appear in a few seconds."
8. Within ~3s the credit pill in the navbar refreshes (custom event +
   polling).

## 4. Verifying in the DB

```sql
SELECT balance, total_purchased FROM user_credits WHERE user_id = '<USER_ID>';

SELECT amount, type, stripe_payment_id, created_at
FROM credit_transactions
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC
LIMIT 5;
```

Expect: balance bumped by 20/60/120, `total_purchased` incremented by the same
amount, and a `purchase` row with the Stripe `pi_*` ID. Re-running
`stripe trigger checkout.session.completed` will NOT double-credit thanks to
the `stripe_payment_id` idempotency check in
`src/app/api/stripe/webhook/route.ts`.

## 5. Failure paths to verify

- Cancel the checkout → redirected to `?cancelled=true` → banner only, no
  txn row, balance unchanged.
- Force a webhook error: temporarily change `STRIPE_WEBHOOK_SECRET` to a bogus
  value, run a purchase → webhook returns 400 → Stripe CLI retries → restore
  the real secret → next retry succeeds → exactly one credit grant.
- Pull the Python automation service down → /api/apply still refuses to
  decrement credits (re-confirms the Phase 6 invariant).

## 6. Dashboard stats sanity check

`/dashboard` reads from `applications` + `user_credits`. Right after the first
real submission you should see:

- `Total submitted` → 1
- `Submitted this week` → 1
- 30-day bar chart with one bar today
- Match-score distribution bucket matching the submitted app
- Recent applications table row

## 7. Final type/lint check

```bash
pnpm typecheck
```

Should print only `$ tsc --noEmit` (no errors).
