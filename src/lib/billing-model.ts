import { z } from 'zod';

export const billingStateSchema = z.object({
  accountId: z.string(),
  customer: z.object({ id: z.string(), ownerId: z.string() }).nullable(),
  customerAttempt: z.object({ id: z.string(), createdAt: z.number() }).nullable(),
  checkout: z.object({ id: z.string(), priceId: z.string(), createdAt: z.number(), sessionId: z.string().nullable() }).nullable(),
  subscription: z.object({
    id: z.string(), status: z.string(), priceId: z.string(),
    periodEnd: z.number().nullable(), cancelAtPeriodEnd: z.boolean(),
  }).nullable(),
});
export type BillingState = z.infer<typeof billingStateSchema>;
export type BillingPlan = 'monthly' | 'annual';
export const checkoutInputSchema = z.object({ plan: z.enum(['monthly', 'annual']) }).strict();
export const purchaseViewSchema = z.object({
  status: z.enum(['none', 'open', 'pending', 'paid', 'claimed', 'expired']),
  url: z.string().nullable(),
});
export const billingViewSchema = z.object({
  owner: z.boolean(), status: z.string(), subscribed: z.boolean(),
  cancelAtPeriodEnd: z.boolean(), periodEnd: z.number().nullable(),
  hasCustomer: z.boolean(), checkoutPending: z.boolean(),
});
export const billingPlansSchema = z.object({
  testMode: z.boolean(),
  plans: z.array(z.object({
    plan: z.enum(['monthly', 'annual']),
    label: z.string(),
    amount: z.string().optional(),
    currency: z.string().optional(),
  })),
});

export class BillingError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}

export function parseBillingConfig(env: Record<string, string | undefined>) {
  const secret = env.STRIPE_SECRET_KEY?.trim();
  const signingSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  const accountId = env.STRIPE_ACCOUNT_ID?.trim();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  if (!secret || !signingSecret || !accountId || !url || !anon || !service || !appUrl) {
    throw new BillingError('Membership payments are not available yet. Please try again later.', 503);
  }
  let origin: string;
  try { origin = new URL(appUrl).origin; }
  catch { throw new BillingError('App URL configuration is invalid.', 503); }
  const livemode = /^(sk|rk)_live_/.test(secret);
  if (!/^(sk|rk)_(live|test)_/.test(secret)) throw new BillingError('Billing key is invalid.', 503);
  if (livemode && !origin.startsWith('https://')) throw new BillingError('Live billing requires HTTPS.', 503);
  return { secret, signingSecret, accountId, url, anon, service, origin, livemode };
}
export type BillingConfig = ReturnType<typeof parseBillingConfig>;

export type BillingSurface = 'duel' | 'paid' | 'pending' | 'offer';
export function resolveBillingSurface({
  hasDuel,
  purchaseStatus,
  result,
}: {
  hasDuel: boolean;
  purchaseStatus: z.infer<typeof purchaseViewSchema>['status'] | null;
  result?: string;
}): BillingSurface {
  if (purchaseStatus === 'paid') return 'paid';
  if (purchaseStatus === 'pending') return 'pending';
  if (hasDuel) return 'duel';
  if (result === 'success' && purchaseStatus !== 'claimed') return 'pending';
  return 'offer';
}

export function emptyBillingState(accountId: string): BillingState {
  return { accountId, customer: null, customerAttempt: null, checkout: null, subscription: null };
}

// Unpaid, paused and incomplete subscriptions must be managed, not duplicated.
export function blocksNewSubscription(status: string) {
  return status !== 'canceled' && status !== 'incomplete_expired';
}
export function subscriptionEntitled(status: string) {
  return status === 'active' || status === 'trialing';
}
export function requireBillingOwner(userId: string, ownerId: string) {
  if (userId !== ownerId) throw new BillingError('Only the Duel owner can manage billing.', 403);
}
export function requireFreshAttempt(createdAt: number, now = Date.now()) {
  // Stripe may prune idempotency keys after 24h. Never create a second object
  // when an older API response was lost and its outcome is still unknown.
  if (now - createdAt >= 23 * 60 * 60 * 1000) {
    throw new BillingError('Billing needs reconciliation before retrying. Contact support.');
  }
}
