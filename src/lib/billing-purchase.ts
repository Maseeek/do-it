import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BillingError, purchaseViewSchema, requireFreshAttempt, type BillingState } from './billing-model';
export { purchaseViewSchema } from './billing-model';
export const purchaseStateSchema = z.object({
  id: z.string().uuid(), accountId: z.string(),
  attempt: z.object({ id: z.string().uuid(), priceId: z.string(), createdAt: z.number(), sessionId: z.string().nullable() }).nullable(),
  claimed: z.object({ userId: z.string().uuid(), duelId: z.string().uuid() }).nullable(),
});
export type PurchaseState = z.infer<typeof purchaseStateSchema>;
export type PurchaseView = z.infer<typeof purchaseViewSchema>;
export type PurchaseReceipt = {
  id: string; status: string | null; url: string | null; paid: boolean;
  customerId: string | null; email: string | null;
  subscription: BillingState['subscription'];
};
export interface PurchaseContext {
  state: PurchaseState;
  save(state: PurchaseState): Promise<void>;
  create(priceId: string, attemptId: string): Promise<PurchaseReceipt>;
  retrieve(): Promise<PurchaseReceipt>;
}

export function purchaseToken() { return randomBytes(32).toString('hex'); }
export function purchaseTokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function emptyPurchaseState(accountId: string): PurchaseState {
  return { id: randomUUID(), accountId, attempt: null, claimed: null };
}
async function save(ctx: PurchaseContext, state: PurchaseState) {
  await ctx.save(state);
  ctx.state = state;
}
export function receiptPaid(receipt: PurchaseReceipt) {
  return receipt.status === 'complete' && receipt.paid && !!receipt.customerId && !!receipt.email &&
    receipt.subscription?.status === 'active';
}
const stripeCustomerSchema = z.union([z.string(), z.object({ id: z.string(), deleted: z.boolean().optional() })]);
const stripePurchaseSchema = z.object({
  id: z.string(), mode: z.string().nullable(), status: z.string().nullable(), url: z.string().nullable(),
  livemode: z.boolean(), payment_status: z.string(), client_reference_id: z.string().nullable(),
  metadata: z.object({ app: z.string(), purchase_id: z.string(), attempt_id: z.string() }),
  customer: stripeCustomerSchema.nullable(), customer_details: z.object({ email: z.string().nullable() }).nullable(),
  subscription: z.union([z.string(), z.object({
    id: z.string(), status: z.string(), livemode: z.boolean(), customer: stripeCustomerSchema,
    metadata: z.object({ app: z.string(), purchase_id: z.string() }),
    trial_start: z.number().nullable(), cancel_at_period_end: z.boolean(),
    items: z.object({ data: z.array(z.object({ price: z.object({ id: z.string() }), quantity: z.number().nullable().optional(), current_period_end: z.number().optional() })) }),
  })]).nullable(),
});
function customerId(customer: z.infer<typeof stripeCustomerSchema> | null) {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  return customer.deleted ? null : customer.id;
}
// This data is always retrieved by our server from Stripe, never accepted as
// a browser receipt. Validate the payment's mode and every stored binding.
export function parsePurchaseReceipt(raw: unknown, state: PurchaseState, livemode: boolean): PurchaseReceipt {
  const parsed = stripePurchaseSchema.safeParse(raw);
  if (!parsed.success) throw new BillingError('Membership payment details could not be verified.', 503);
  const session = parsed.data;
  if (session.livemode !== livemode || session.mode !== 'subscription' || session.metadata.app !== 'do-it' ||
      session.metadata.purchase_id !== state.id || session.metadata.attempt_id !== state.attempt?.id || session.client_reference_id !== state.id ||
      (state.attempt?.sessionId && state.attempt.sessionId !== session.id)) {
    throw new BillingError('The payment does not match this membership attempt.', 403);
  }
  const customer = customerId(session.customer);
  const sub = session.subscription;
  let subscription: PurchaseReceipt['subscription'] = null;
  if (sub && typeof sub !== 'string') {
    const item = sub.items.data[0];
    if (sub.livemode !== livemode || customerId(sub.customer) !== customer ||
        sub.metadata.app !== 'do-it' || sub.metadata.purchase_id !== state.id || sub.items.data.length !== 1 ||
        item?.price.id !== state.attempt?.priceId || item.quantity !== 1 || sub.trial_start !== null) {
      throw new BillingError('The subscription does not match this membership attempt.', 403);
    }
    subscription = { id: sub.id, status: sub.status, priceId: item.price.id, periodEnd: item.current_period_end ?? null, cancelAtPeriodEnd: sub.cancel_at_period_end };
  }
  return {
    id: session.id, status: session.status, url: session.url, paid: session.payment_status === 'paid',
    customerId: customer, email: session.customer_details?.email ?? null, subscription,
  };
}
export async function purchaseView(ctx: PurchaseContext): Promise<PurchaseView> {
  if (ctx.state.claimed) return { status: 'claimed', url: null };
  if (!ctx.state.attempt) return { status: 'none', url: null };
  // A failed create is retried using its durable idempotency key by POST.
  if (!ctx.state.attempt.sessionId) return { status: 'pending', url: null };
  const receipt = await ctx.retrieve();
  if (receiptPaid(receipt)) return { status: 'paid', url: null };
  if (receipt.status === 'open') return { status: 'open', url: receipt.url };
  return { status: receipt.status === 'expired' ? 'expired' : 'pending', url: null };
}
export async function startPurchase(ctx: PurchaseContext, priceId: string) {
  const view = await purchaseView(ctx);
  if (view.status === 'open' && view.url) return view.url;
  if (view.status === 'claimed' || view.status === 'paid' || (view.status === 'pending' && ctx.state.attempt?.sessionId)) {
    throw new BillingError('Your payment is being confirmed or is already complete. Continue membership setup.');
  }
  if (view.status === 'expired') await save(ctx, { ...ctx.state, attempt: null });
  const attempt = ctx.state.attempt ?? { id: randomUUID(), priceId, createdAt: Date.now(), sessionId: null };
  requireFreshAttempt(attempt.createdAt);
  await save(ctx, { ...ctx.state, attempt });
  const receipt = await ctx.create(attempt.priceId, attempt.id);
  await save(ctx, { ...ctx.state, attempt: { ...attempt, sessionId: receipt.id } });
  if (receipt.status !== 'open' || !receipt.url) throw new BillingError('Your payment is being confirmed. Refresh membership in a moment.');
  return receipt.url;
}
export function requirePurchaseIdentity(receipt: PurchaseReceipt, user: { email?: string; email_confirmed_at?: string }) {
  if (!receiptPaid(receipt)) throw new BillingError('Payment has not been confirmed yet. Refresh membership in a moment.');
  // Possession of a browser token alone is insufficient. Verify the checkout
  // email through Supabase authentication before assigning the subscription.
  if (!user.email_confirmed_at || !user.email || user.email.toLowerCase() !== receipt.email?.toLowerCase()) {
    throw new BillingError('Sign in with the verified email you used at Stripe Checkout to activate membership.', 403);
  }
}
