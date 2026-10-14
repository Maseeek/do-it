# Stripe billing setup

The welcome page at `/welcome` presents the confirmed $15/month membership before any account form. New Players go to Stripe Checkout first, then create an account and a Duel at `/billing`. Returning Players can manage their existing subscription in `/billing` and Settings. One subscription belongs to a Duel; the owner pays, and both Players see its status. Prices come from Stripe, so the site does not invent a price or trial.

## Confirmed live plan

The owner selected `price_1Sr6z31NPX0knP17OFmNZKMj`, verified with Stripe as an active USD 15/month recurring membership for both Players, with no trial. It belongs to Do It Standard (`prod_TokUo6PF3QMje6`) on account `acct_1SoBvQ1NPX0knP17` (account name: Nothing But Net). Use this monthly price and leave the annual price empty. These live IDs require a matching live API credential; they cannot be used with a test credential.

## Configure the deployment

1. Select the Stripe account for Do It, starting in a sandbox. The owner has confirmed the Do It product in the live Nothing But Net account; use only that product, not its separate basketball analytics product.
2. For live billing, reuse the confirmed Do It product and monthly price above; its `app=do-it` metadata is configured. For sandbox testing, create a separate equivalent product/price in the sandbox with the same metadata. Use a quantity of one for both Players. No trial is configured by this integration.
3. Apply [supabase/billing.sql](../../supabase/billing.sql) in the SQL Editor for the Supabase project used by this deployment. This additive migration creates server-only billing tables and fenced lease functions. Run it once, then apply [supabase/billing-purchase.sql](../../supabase/billing-purchase.sql) to enable payment before account setup.
4. Set these environment variables in the hosting project's environment settings. Keep secret values out of Git and browser code.

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server API credential for the chosen sandbox/account. A restricted key needs account read, price/product read, customer read/write, subscription read, Checkout Session read/write, and customer portal session write permissions. |
| `STRIPE_ACCOUNT_ID` | The chosen Stripe `acct_...` ID, verified against the API credential. |
| `STRIPE_PRICE_MONTHLY` | Monthly recurring `price_...` ID; omit if only annual is offered. |
| `STRIPE_PRICE_ANNUAL` | Annual recurring `price_...` ID; omit if only monthly is offered. |
| `STRIPE_WEBHOOK_SECRET` | The `whsec_...` signing secret of this deployment's webhook destination. |
| `STRIPE_PORTAL_CONFIGURATION` | Optional `bpc_...` portal configuration ID. Otherwise Stripe uses the default. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role credential for the existing Supabase project. |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing public Supabase credential. |
| `NEXT_PUBLIC_APP_URL` | Canonical app origin; HTTPS is required for live billing. |
| `BILLING_LIVE_ENABLED` | Keep `false` during sandbox testing. Set `true` only to activate live Checkout. |

5. Configure the [customer portal](https://dashboard.stripe.com/settings/billing/portal) to allow payment-method changes, invoice access and cancellation. Configure plan changes only if intended.
6. Create a [webhook destination](https://dashboard.stripe.com/webhooks) pointing to `https://YOUR_DOMAIN/api/billing/webhook`, for the same Stripe account and mode as the API credential. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`
   - `invoice.paid`
   - `invoice.payment_failed`
7. Redeploy after setting the variables. For local testing, run `stripe listen --forward-to localhost:3000/api/billing/webhook` and use that CLI listener's signing secret locally.

## Verify before live activation

Open `/welcome` in a fresh browser with no account and choose membership. Complete Stripe Checkout with a sandbox payment method. `/billing` must confirm payment from Stripe before showing account setup. Sign up with the same email used at Checkout, verify that email, create your Duel, and connect the membership. Also test the existing signed-in Duel owner flow. Confirm both Players see the active subscription, the guest cannot buy or manage billing, and the owner can open the portal. Test canceled Checkout, failed payment, subscription cancellation and duplicate clicks. An open Checkout resumes its original plan; finish or let it expire before changing plans. Success URL parameters do not grant or confirm membership.

For production, create separate live prices, keys and webhook destination, confirm their currency and amount, configure the public HTTPS origin, then enable `BILLING_LIVE_ENABLED=true`. Sandbox and live billing are stored separately. Stripe MCP authorization is for agent setup; it does not replace the deployed app's API credential or webhook signing secret.

## Payment before account setup

Anonymous Checkout uses a random secret in an HttpOnly, SameSite browser cookie. Only its hash is stored in `billing_purchases`. The browser receives this cookie before a Checkout is created, so lost responses can resume the same Stripe attempt. Cookie state is isolated per sandbox/live mode. No names, habits or account form precede purchase; Stripe collects the email and payment details needed to charge the subscription.

The return page checks the canonical Stripe session and active paid subscription. Account activation requires both the original browser cookie and a Supabase-verified email matching the Stripe checkout email. Creating the Duel returns to `/billing`, where the Player connects the purchased membership. Claiming both records is atomic and fenced. A success URL or email alone cannot claim payment. Do not clear browser storage before connecting membership; if the token is lost, contact support with the Stripe receipt rather than buying again.

## Rollout and recovery

This is an additive payment rollout. It records subscription status but does **not** yet restrict habit access or change existing Supabase habit/check-in policies. Existing offline access and history remain available. A subscription-only launch needs a separate server/database access-policy change; a client paywall is not authorization.

Billing serializes operations per Duel and mode using fenced database leases. Stripe idempotency keys and saved attempts protect retries after lost API responses. Webhooks reconcile current Stripe state rather than applying stale event snapshots. If an uncertain attempt is older than 23 hours, checkout stops for support reconciliation instead of risking a duplicate charge. Inspect the saved attempt and matching Stripe customer/session, and repair the saved state only after establishing its actual outcome. Do not clear an uncertain attempt blindly.

The billing foreign keys prevent deleting a Duel with financial records. Any future Duel-deletion or replacement flow needs an explicit billing cancellation and retention policy.

Reference: [Stripe subscriptions with Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions), [webhook signatures](https://docs.stripe.com/webhooks/signatures), [customer portal](https://docs.stripe.com/customer-management/configure-portal).
