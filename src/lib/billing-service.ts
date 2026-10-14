import { randomUUID } from 'node:crypto';
import { BillingError, blocksNewSubscription, requireBillingOwner, requireFreshAttempt, type BillingState } from './billing-model';

type Subscription = NonNullable<BillingState['subscription']> & { created: number };
type CheckoutSession = { id: string; status: string | null; url: string | null; subscriptionId: string | null };
export interface BillingGateway {
  createCustomer(duelId: string, ownerId: string, key: string): Promise<string>;
  listSubscriptions(customer: string): Promise<Subscription[]>;
  retrieveCheckout(id: string): Promise<CheckoutSession>;
  createCheckout(customer: string, duelId: string, priceId: string, key: string): Promise<CheckoutSession>;
  createPortal(customer: string): Promise<string>;
}
export interface BillingContext {
  duelId: string;
  ownerId: string;
  state: BillingState;
  gateway: BillingGateway;
  save(state: BillingState): Promise<void>;
}
async function persist(ctx: BillingContext, state: BillingState) {
  await ctx.save(state);
  ctx.state = state;
}

// Read canonical Stripe state while holding the same fenced database lease
// used by Checkout. Never apply an event's possibly obsolete snapshot.
export async function reconcileBilling(ctx: BillingContext) {
  if (!ctx.state.customer) return;
  const subscriptions = await ctx.gateway.listSubscriptions(ctx.state.customer.id);
  const blocking = subscriptions.filter(s => blocksNewSubscription(s.status));
  if (blocking.length > 1) throw new BillingError('Multiple subscriptions need reconciliation. Contact support.');
  const latest = blocking[0] ?? subscriptions.sort((a, b) => b.created - a.created)[0];
  const subscription = latest ? {
    id: latest.id, status: latest.status, priceId: latest.priceId,
    periodEnd: latest.periodEnd, cancelAtPeriodEnd: latest.cancelAtPeriodEnd,
  } : null;
  await persist(ctx, { ...ctx.state, subscription });
}

export async function startCheckout(ctx: BillingContext, userId: string, priceId: string) {
  requireBillingOwner(userId, ctx.ownerId);
  if (ctx.state.customer && ctx.state.customer.ownerId !== userId) {
    throw new BillingError('Billing ownership needs reconciliation. Contact support.', 403);
  }
  if (!ctx.state.customer) {
    const attempt = ctx.state.customerAttempt ?? { id: randomUUID(), createdAt: Date.now() };
    requireFreshAttempt(attempt.createdAt);
    await persist(ctx, { ...ctx.state, customerAttempt: attempt });
    const id = await ctx.gateway.createCustomer(ctx.duelId, userId, `duel-customer:${ctx.duelId}:${attempt.id}`);
    await persist(ctx, { ...ctx.state, customer: { id, ownerId: userId }, customerAttempt: null });
  }
  const customer = ctx.state.customer;
  if (!customer) throw new Error('Customer was not saved.');
  await reconcileBilling(ctx);
  if (ctx.state.subscription && blocksNewSubscription(ctx.state.subscription.status)) {
    throw new BillingError('This Duel already has a subscription. Manage it in billing.');
  }
  if (ctx.state.checkout?.sessionId) {
    const session = await ctx.gateway.retrieveCheckout(ctx.state.checkout.sessionId);
    if (session.status === 'open' && session.url) return session.url;
    const completedTerminalSubscription = session.status === 'complete' && session.subscriptionId &&
      session.subscriptionId === ctx.state.subscription?.id && !blocksNewSubscription(ctx.state.subscription.status);
    if (session.status !== 'expired' && !completedTerminalSubscription) {
      // A completed Checkout must never become a fresh purchase, even while
      // an asynchronous payment or webhook is still catching up.
      throw new BillingError('Checkout is being confirmed. Refresh billing in a moment.');
    }
    await persist(ctx, { ...ctx.state, checkout: null });
  }
  const attempt = ctx.state.checkout ?? { id: randomUUID(), priceId, createdAt: Date.now(), sessionId: null };
  requireFreshAttempt(attempt.createdAt);
  // Retry the same price and parameters after a timeout, even if another tab
  // selected a different plan. Stripe idempotency rejects changed parameters.
  await persist(ctx, { ...ctx.state, checkout: attempt });
  const session = await ctx.gateway.createCheckout(customer.id, ctx.duelId, attempt.priceId, `duel-checkout:${ctx.duelId}:${attempt.id}`);
  await persist(ctx, { ...ctx.state, checkout: { ...attempt, sessionId: session.id } });
  if (session.status !== 'open' || !session.url) throw new BillingError('Checkout is being confirmed. Refresh billing in a moment.');
  return session.url;
}

export async function openPortal(ctx: BillingContext, userId: string) {
  requireBillingOwner(userId, ctx.ownerId);
  if (!ctx.state.customer || ctx.state.customer.ownerId !== userId) throw new BillingError('No billing account is available.', 403);
  return ctx.gateway.createPortal(ctx.state.customer.id);
}
