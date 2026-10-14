import 'server-only';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { BillingError, billingStateSchema, emptyBillingState, subscriptionEntitled, type BillingPlan } from './billing-model';
import { reconcileBilling, type BillingContext, type BillingGateway } from './billing-service';

export function billingConfig() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const accountId = process.env.STRIPE_ACCOUNT_ID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || !signingSecret || !accountId || !url || !anon || !service || !appUrl) {
    throw new BillingError('Membership payments are not available yet. Please try again later.', 503);
  }
  const origin = new URL(appUrl).origin;
  const livemode = /^(sk|rk)_live_/.test(secret);
  if (!/^(sk|rk)_(live|test)_/.test(secret)) throw new BillingError('Billing key is invalid.', 503);
  if (livemode && !origin.startsWith('https://')) throw new BillingError('Live billing requires HTTPS.', 503);
  return { secret, signingSecret, accountId, url, anon, service, origin, livemode };
}
export type BillingConfig = ReturnType<typeof billingConfig>;
export function billingStripe(config: BillingConfig) {
  return new Stripe(config.secret, { timeout: 20000, maxNetworkRetries: 1 });
}
export function billingDatabase(config: BillingConfig) {
  return createClient(config.url, config.service, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function verifyBillingAccount(stripe: Stripe, config: BillingConfig) {
  const account = await stripe.accounts.retrieve(null);
  if (account.id !== config.accountId) throw new BillingError('Billing account configuration does not match.', 503);
}
const duelSchema = z.object({ id: z.string().uuid(), owner_id: z.string().uuid(), guest_id: z.string().uuid().nullable() });
export async function billingMember(request: Request, config: BillingConfig) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new BillingError('Sign in to manage billing.', 401);
  const auth = createClient(config.url, config.anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user || user.is_anonymous) throw new BillingError('Sign in to manage billing.', 401);
  const db = billingDatabase(config);
  const result = await db.from('duels').select('id,owner_id,guest_id')
    .or(`owner_id.eq.${user.id},guest_id.eq.${user.id}`).maybeSingle();
  if (result.error) throw new Error('Duel lookup failed.');
  const duel = duelSchema.safeParse(result.data);
  if (!duel.success) throw new BillingError('Create or join a Duel before subscribing.', 409);
  return { user, duel: duel.data };
}

export async function configuredPlans(stripe: Stripe, config: BillingConfig) {
  if (config.livemode && process.env.BILLING_LIVE_ENABLED !== 'true') throw new BillingError('Live billing has not been activated.', 503);
  await verifyBillingAccount(stripe, config);
  const ids: [BillingPlan, string | undefined][] = [
    ['monthly', process.env.STRIPE_PRICE_MONTHLY], ['annual', process.env.STRIPE_PRICE_ANNUAL],
  ];
  const plans = await Promise.all(ids.filter((entry): entry is [BillingPlan, string] => !!entry[1]).map(async ([plan, id]) => {
    const price = await stripe.prices.retrieve(id, { expand: ['product'] });
    const product = price.product;
    if (!price.active || price.livemode !== config.livemode || price.unit_amount === null || price.unit_amount <= 0 ||
        price.billing_scheme !== 'per_unit' || price.recurring?.usage_type !== 'licensed' || price.recurring.interval_count !== 1 ||
        price.recurring.interval !== (plan === 'monthly' ? 'month' : 'year') || price.transform_quantity ||
        !['usd', 'gbp', 'eur'].includes(price.currency) ||
        typeof product === 'string' || product.deleted || !product.active || product.metadata.app !== 'do-it') {
      throw new BillingError('The configured price is not a Do It subscription.', 503);
    }
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency }).format(price.unit_amount / 100);
    return { plan, id, label: `${amount}/${plan === 'monthly' ? 'month' : 'year'} for both players` };
  }));
  if (!plans.length) throw new BillingError('Subscription pricing is not available yet.', 503);
  return plans;
}

export function stripeGateway(stripe: Stripe, config: BillingConfig): BillingGateway {
  return {
    async createCustomer(duelId, ownerId, key) {
      const customer = await stripe.customers.create({ metadata: { app: 'do-it', duel_id: duelId, owner_id: ownerId } }, { idempotencyKey: key });
      return customer.id;
    },
    async listSubscriptions(customer) {
      const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 }).autoPagingToArray({ limit: 1000 });
      return subscriptions.map(s => ({
        id: s.id, status: s.status, created: s.created,
        priceId: s.items.data[0]?.price.id ?? '',
        periodEnd: s.items.data[0]?.current_period_end ?? null,
        cancelAtPeriodEnd: s.cancel_at_period_end,
      }));
    },
    async retrieveCheckout(id) {
      const s = await stripe.checkout.sessions.retrieve(id);
      return { id: s.id, status: s.status, url: s.url, subscriptionId: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null };
    },
    async createCheckout(customer, duelId, priceId, key) {
      const s = await stripe.checkout.sessions.create({
        mode: 'subscription', customer, client_reference_id: duelId,
        line_items: [{ price: priceId, quantity: 1 }],
        // No trial is promised or configured. Stripe shows the actual total.
        subscription_data: { metadata: { app: 'do-it', duel_id: duelId }, billing_mode: { type: 'flexible' } },
        metadata: { app: 'do-it', duel_id: duelId },
        success_url: `${config.origin}/billing?result=success`,
        cancel_url: `${config.origin}/billing?result=canceled`,
      }, { idempotencyKey: key });
      return { id: s.id, status: s.status, url: s.url, subscriptionId: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null };
    },
    async createPortal(customer) {
      const session = await stripe.billingPortal.sessions.create({
        customer, return_url: `${config.origin}/billing`,
        ...(process.env.STRIPE_PORTAL_CONFIGURATION ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION } : {}),
      });
      return session.url;
    },
  };
}

export async function withBillingLease<T>(config: BillingConfig, stripe: Stripe, duelId: string, ownerId: string, work: (ctx: BillingContext, leaseToken: string) => Promise<T>, eventId?: string) {
  const db = billingDatabase(config);
  const token = randomUUID();
  const params = { p_duel: duelId, p_live: config.livemode, p_token: token };
  const acquired = await db.rpc('billing_acquire', { ...params, p_initial: emptyBillingState(config.accountId) });
  if (acquired.error) throw new Error('Billing storage is unavailable.');
  if (!acquired.data) throw new BillingError('Billing is busy. Please retry in a moment.');
  try {
    const state = billingStateSchema.parse(acquired.data);
    if (state.accountId !== config.accountId) throw new BillingError('Billing account needs reconciliation.', 503);
    const ctx: BillingContext = { duelId, ownerId, state, gateway: stripeGateway(stripe, config), async save(next) {
      const saved = await db.rpc('billing_save', { ...params, p_state: next, p_event: eventId ?? null });
      if (saved.error) throw new Error('Billing state could not be saved.');
    } };
    return await work(ctx, token);
  } finally {
    const released = await db.rpc('billing_release', params);
    if (released.error) console.error('billing_lease_release_failed');
  }
}

export async function billingSummary(request: Request, config: BillingConfig, stripe: Stripe) {
  const { user, duel } = await billingMember(request, config);
  await verifyBillingAccount(stripe, config);
  const existing = await billingDatabase(config).from('duel_billing').select('duel_id').eq('duel_id', duel.id).eq('livemode', config.livemode).maybeSingle();
  if (existing.error) throw new Error('Billing lookup failed.');
  if (!existing.data) return {
    owner: user.id === duel.owner_id, status: 'none', subscribed: false,
    cancelAtPeriodEnd: false, periodEnd: null, hasCustomer: false, checkoutPending: false,
  };
  return withBillingLease(config, stripe, duel.id, duel.owner_id, async ctx => {
    await reconcileBilling(ctx);
    const sub = ctx.state.subscription;
    return {
      owner: user.id === duel.owner_id, status: sub?.status ?? 'none', subscribed: subscriptionEntitled(sub?.status ?? ''),
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false, periodEnd: sub?.periodEnd ?? null,
      hasCustomer: !!ctx.state.customer, checkoutPending: !!ctx.state.checkout && !sub,
    };
  });
}

export function billingResponseError(error: unknown) {
  if (error instanceof BillingError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  // Stripe/Supabase errors may contain customer data. Do not log raw objects.
  console.error('billing_request_failed', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({ error: 'Billing could not complete this request. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
