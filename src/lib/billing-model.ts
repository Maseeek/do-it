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
  plans: z.array(z.object({ plan: z.enum(['monthly', 'annual']), label: z.string() })),
});

export class BillingError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
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
