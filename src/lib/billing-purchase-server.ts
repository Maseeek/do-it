import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { z } from 'zod';
import { BillingError, emptyBillingState, requireBillingOwner } from './billing-model';
import { billingDatabase, billingMember, verifyBillingAccount, withBillingLease, type BillingConfig } from './billing-server';
import { emptyPurchaseState, parsePurchaseReceipt, purchaseStateSchema, purchaseToken, purchaseTokenHash, requirePurchaseIdentity, type PurchaseContext, type PurchaseReceipt } from './billing-purchase';

const COOKIE = 'do_it_purchase';
export async function purchaseBrowser(config: BillingConfig, create = false) {
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) throw new BillingError('Open membership on the browser where you started payment.', 409);
    token = purchaseToken();
    jar.set(COOKIE, token, {
      httpOnly: true, sameSite: 'lax', secure: config.origin.startsWith('https://'), path: '/', maxAge: 30 * 24 * 60 * 60,
    });
  }
  return purchaseTokenHash(token);
}
export function requirePurchaseOrigin(request: Request, config: BillingConfig) {
  if (request.headers.get('origin') !== config.origin) throw new BillingError('Open membership on this site to continue.', 403);
}

async function canonicalReceipt(stripe: Stripe, config: BillingConfig, ctx: PurchaseContext, sessionId: string): Promise<PurchaseReceipt> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
  return parsePurchaseReceipt(session, ctx.state, config.livemode);
}

export async function withPurchaseLease<T>(config: BillingConfig, stripe: Stripe, hash: string, work: (ctx: PurchaseContext, leaseToken: string) => Promise<T>) {
  const db = billingDatabase(config);
  const token = randomUUID();
  const params = { p_hash: hash, p_live: config.livemode, p_token: token };
  const acquired = await db.rpc('billing_purchase_acquire', { ...params, p_initial: emptyPurchaseState(config.accountId) });
  if (acquired.error) throw new Error('Membership storage is unavailable.');
  if (!acquired.data) throw new BillingError('Membership is busy. Please retry in a moment.');
  try {
    const state = purchaseStateSchema.parse(acquired.data);
    if (state.accountId !== config.accountId) throw new BillingError('Membership account needs reconciliation.', 503);
    const ctx: PurchaseContext = {
      state,
      async save(next) {
        const saved = await db.rpc('billing_purchase_save', { ...params, p_state: next });
        if (saved.error) throw new Error('Membership could not be saved.');
      },
      async create(priceId, attemptId) {
        const s = await stripe.checkout.sessions.create({
          mode: 'subscription', client_reference_id: state.id,
          line_items: [{ price: priceId, quantity: 1 }],
          metadata: { app: 'do-it', purchase_id: state.id, attempt_id: attemptId },
          subscription_data: { metadata: { app: 'do-it', purchase_id: state.id }, billing_mode: { type: 'flexible' } },
          success_url: `${config.origin}/billing?result=success`, cancel_url: `${config.origin}/billing?result=canceled`,
        }, { idempotencyKey: `membership:${state.id}:${attemptId}` });
        // The response may be from a completed session on an idempotent retry.
        return canonicalReceipt(stripe, config, ctx, s.id);
      },
      async retrieve() {
        const id = ctx.state.attempt?.sessionId;
        if (!id) throw new BillingError('Payment has not started.');
        return canonicalReceipt(stripe, config, ctx, id);
      },
    };
    return await work(ctx, token);
  } finally {
    const released = await db.rpc('billing_purchase_release', params);
    if (released.error) console.error('billing_purchase_release_failed');
  }
}

export async function claimPurchase(request: Request, config: BillingConfig, stripe: Stripe, hash: string) {
  const { user, duel } = await billingMember(request, config);
  requireBillingOwner(user.id, duel.owner_id);
  await verifyBillingAccount(stripe, config);
  await withPurchaseLease(config, stripe, hash, async (purchase, purchaseLease) => {
    if (purchase.state.claimed) {
      if (purchase.state.claimed.userId !== user.id || purchase.state.claimed.duelId !== duel.id) {
        throw new BillingError('This membership has already been activated.', 403);
      }
      return;
    }
    const receipt = await purchase.retrieve();
    requirePurchaseIdentity(receipt, user);
    const customerId = receipt.customerId;
    if (!customerId || !receipt.subscription) throw new BillingError('Payment is still being confirmed.');
    await withBillingLease(config, stripe, duel.id, user.id, async (billing, billingLease) => {
      // Never move a purchased membership onto another existing billing account.
      if (billing.state.customer || billing.state.customerAttempt || billing.state.checkout || billing.state.subscription) {
        throw new BillingError('This Duel already has billing. Contact support to attach this payment.');
      }
      const next = {
        ...emptyBillingState(config.accountId), customer: { id: customerId, ownerId: user.id }, subscription: receipt.subscription,
      };
      // Atomically save both rows. Database function checks the Duel owner and
      // fences both leases so retries cannot attach a purchase to two Duels.
      const db = billingDatabase(config);
      const result = await db.rpc('billing_purchase_claim', {
        p_hash: hash, p_live: config.livemode, p_token: purchaseLease,
        p_duel: duel.id, p_user: user.id, p_state: next, p_billing_token: billingLease,
      });
      if (result.error) throw new Error('Membership activation could not be saved.');
    });
  });
  (await cookies()).delete(COOKIE);
}

export async function reconcilePurchaseEvent(event: Stripe.Event, stripe: Stripe, config: BillingConfig) {
  if (!event.type.startsWith('checkout.session.')) return;
  const parsed = z.object({ id: z.string(), metadata: z.object({ app: z.literal('do-it'), purchase_id: z.string().uuid(), attempt_id: z.string().uuid() }) }).safeParse(event.data.object);
  if (!parsed.success) return;
  const object = parsed.data;
  const row = await billingDatabase(config).from('billing_purchases').select('token_hash')
    .eq('livemode', config.livemode).eq('state->>id', object.metadata.purchase_id).maybeSingle();
  if (row.error) throw new Error('Membership webhook lookup failed.');
  if (!row.data) return;
  const { token_hash: hash } = z.object({ token_hash: z.string() }).parse(row.data);
  await verifyBillingAccount(stripe, config);
  await withPurchaseLease(config, stripe, hash, async ctx => {
    if (ctx.state.claimed || ctx.state.attempt?.id !== object.metadata.attempt_id) return;
    if (ctx.state.attempt.sessionId && ctx.state.attempt.sessionId !== object.id) throw new Error('Membership session binding changed.');
    // Retrieve canonical Stripe data before binding a lost create response.
    await canonicalReceipt(stripe, config, ctx, object.id);
    await ctx.save({ ...ctx.state, attempt: { ...ctx.state.attempt, sessionId: object.id } });
  });
}
