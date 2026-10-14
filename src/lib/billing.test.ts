import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import Stripe from 'stripe';
import { BillingError, checkoutInputSchema, emptyBillingState, requireFreshAttempt, subscriptionEntitled } from './billing-model';
import { openPortal, reconcileBilling, startCheckout, type BillingContext, type BillingGateway } from './billing-service';
import { billingEventCustomer, verifyBillingEvent } from './billing-webhook';

function fixture() {
  const calls: string[] = [];
  let subscriptions: Awaited<ReturnType<BillingGateway['listSubscriptions']>> = [];
  let checkoutStatus = 'open';
  let failCheckout = false;
  const keys: string[] = [];
  const gateway: BillingGateway = {
    async createCustomer(_duel, _owner, key) { calls.push('customer'); keys.push(key); return 'cus_duel'; },
    async listSubscriptions() { calls.push('list'); return subscriptions; },
    async retrieveCheckout() { calls.push('retrieve'); return { id: 'cs_duel', status: checkoutStatus, url: 'https://checkout.stripe.com/test', subscriptionId: checkoutStatus === 'complete' ? 'sub_1' : null }; },
    async createCheckout(_customer, _duel, price, key) {
      calls.push(`checkout:${price}`); keys.push(key);
      if (failCheckout) throw new Error('API response lost');
      return { id: 'cs_duel', status: checkoutStatus, url: 'https://checkout.stripe.com/test', subscriptionId: null };
    },
    async createPortal(customer) { calls.push(`portal:${customer}`); return 'https://billing.stripe.com/test'; },
  };
  const ctx: BillingContext = { duelId: 'duel', ownerId: 'owner', state: emptyBillingState('acct'), gateway, async save(state) { calls.push('save'); ctx.state = structuredClone(state); } };
  return { ctx, calls, keys, setSubscriptions(value: typeof subscriptions) { subscriptions = value; }, setCheckoutStatus(value: string) { checkoutStatus = value; }, failCheckout(value: boolean) { failCheckout = value; } };
}
const active = { id: 'sub_1', status: 'active', priceId: 'price_m', periodEnd: 123, cancelAtPeriodEnd: false, created: 1 };

describe('Duel billing security and recovery', () => {
  it('rejects guest Checkout and portal before calling Stripe or saving anything', async () => {
    const f = fixture();
    await assert.rejects(startCheckout(f.ctx, 'guest', 'price_m'), (e: unknown) => e instanceof BillingError && e.status === 403);
    await assert.rejects(openPortal(f.ctx, 'guest'), (e: unknown) => e instanceof BillingError && e.status === 403);
    assert.deepEqual(f.calls, []);
  });
  it('rejects arbitrary prices and customer IDs in client input', () => {
    assert.equal(checkoutInputSchema.safeParse({ plan: 'monthly', priceId: 'cheap', customer: 'other' }).success, false);
    assert.equal(checkoutInputSchema.safeParse({ plan: 'monthly' }).success, true);
  });
  it('saves intent before side effects and reuses an open Checkout', async () => {
    const f = fixture();
    await startCheckout(f.ctx, 'owner', 'price_m');
    await startCheckout(f.ctx, 'owner', 'price_a');
    assert.equal(f.calls.filter(c => c === 'customer').length, 1);
    assert.deepEqual(f.calls.filter(c => c.startsWith('checkout:')), ['checkout:price_m']);
    assert.equal(f.calls[f.calls.indexOf('customer') - 1], 'save');
    assert.equal(f.calls[f.calls.indexOf('checkout:price_m') - 1], 'save');
  });
  it('recovers a lost API response with identical key and price across retries', async () => {
    const f = fixture(); f.failCheckout(true);
    await assert.rejects(startCheckout(f.ctx, 'owner', 'price_m'), /API response lost/);
    const pending = f.ctx.state.checkout;
    assert.ok(pending);
    f.failCheckout(false);
    await startCheckout(f.ctx, 'owner', 'price_a');
    assert.deepEqual(f.calls.filter(c => c.startsWith('checkout:')), ['checkout:price_m', 'checkout:price_m']);
    assert.equal(f.keys[1], f.keys[2]);
    assert.equal(f.ctx.state.checkout?.id, pending.id);
  });
  it('blocks repeat purchase for active, past due, unpaid, paused and incomplete subscriptions', async () => {
    for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']) {
      const f = fixture(); f.setSubscriptions([{ ...active, status }]);
      await assert.rejects(startCheckout(f.ctx, 'owner', 'price_m'), /already has a subscription/);
      assert.equal(f.calls.some(c => c.startsWith('checkout:')), false);
    }
  });
  it('never starts a fresh purchase when Checkout is complete but payment is pending', async () => {
    const f = fixture();
    await startCheckout(f.ctx, 'owner', 'price_m'); f.setCheckoutStatus('complete');
    await assert.rejects(startCheckout(f.ctx, 'owner', 'price_m'), /being confirmed/);
    assert.equal(f.calls.filter(c => c.startsWith('checkout:')).length, 1);
  });
  it('allows a new Checkout only after Stripe confirms the old one expired', async () => {
    const f = fixture(); await startCheckout(f.ctx, 'owner', 'price_m');
    const oldId = f.ctx.state.checkout?.id;
    f.ctx.gateway.retrieveCheckout = async () => ({ id: 'cs_duel', status: 'expired', url: null, subscriptionId: null });
    await startCheckout(f.ctx, 'owner', 'price_a');
    assert.notEqual(f.ctx.state.checkout?.id, oldId);
    assert.equal(f.ctx.state.checkout?.priceId, 'price_a');
  });
  it('old subscription events reconcile canonical state, preserving newer replacement subscriptions', async () => {
    const f = fixture();
    f.ctx.state.customer = { id: 'cus_duel', ownerId: 'owner' };
    f.ctx.state.subscription = { ...active, status: 'canceled' };
    f.setSubscriptions([{ ...active, status: 'canceled' }, { ...active, id: 'sub_new', created: 2 }]);
    await reconcileBilling(f.ctx); await reconcileBilling(f.ctx);
    assert.equal(f.ctx.state.subscription?.id, 'sub_new');
    assert.equal(f.ctx.state.subscription?.status, 'active');
  });
  it('allows subscribing again after the prior completed Checkout subscription is canceled', async () => {
    const f = fixture(); await startCheckout(f.ctx, 'owner', 'price_m');
    f.setCheckoutStatus('complete'); f.setSubscriptions([{ ...active, status: 'canceled' }]);
    f.ctx.gateway.createCheckout = async () => ({ id: 'cs_new', status: 'open', url: 'https://checkout.stripe.com/new', subscriptionId: null });
    assert.equal(await startCheckout(f.ctx, 'owner', 'price_a'), 'https://checkout.stripe.com/new');
  });
  it('fails safely on multiple subscriptions rather than selling another', async () => {
    const f = fixture(); f.setSubscriptions([active, { ...active, id: 'sub_duplicate' }]);
    await assert.rejects(startCheckout(f.ctx, 'owner', 'price_m'), /Multiple subscriptions/);
    assert.equal(f.calls.some(c => c.startsWith('checkout:')), false);
  });
  it('does not charge when a durable save fails before an API operation', async () => {
    const f = fixture(); f.ctx.save = async () => { throw new Error('database unavailable'); };
    await assert.rejects(startCheckout(f.ctx, 'owner', 'price_m'), /database unavailable/);
    assert.deepEqual(f.calls, []);
  });
  it('refuses old uncertain attempts after the Stripe idempotency retention window', () => {
    assert.throws(() => requireFreshAttempt(0, 24 * 60 * 60 * 1000), /reconciliation/);
  });
  it('rejects changed billing ownership and never opens another customer portal', async () => {
    const f = fixture(); f.ctx.state.customer = { id: 'cus_other', ownerId: 'former_owner' };
    await assert.rejects(startCheckout(f.ctx, 'owner', 'price_m'), /ownership/);
    await assert.rejects(openPortal(f.ctx, 'owner'), /No billing account/);
    assert.deepEqual(f.calls, []);
  });
  it('grants subscription entitlement only for active or trialing; cancellation at period end stays active', () => {
    assert.equal(subscriptionEntitled('active'), true);
    for (const status of ['past_due', 'unpaid', 'canceled', 'incomplete', 'paused']) assert.equal(subscriptionEntitled(status), false);
  });
});

describe('Stripe signed webhook boundary', () => {
  const stripe = new Stripe('sk_test_unit_test');
  const secret = 'whsec_unit_test';
  function signed(body: string, timestamp?: number) {
    return stripe.webhooks.generateTestHeaderString({ payload: body, secret, ...(timestamp ? { timestamp } : {}) });
  }
  const body = JSON.stringify({ id: 'evt_test', type: 'customer.subscription.updated', livemode: false, data: { object: { customer: 'cus_duel' } } });
  it('accepts an authentic raw body and identifies its customer', () => {
    const event = verifyBillingEvent(stripe, body, signed(body), secret, false);
    assert.equal(billingEventCustomer(event), 'cus_duel');
  });
  it('rejects a forged or modified body, missing signature, wrong mode and stale signature', () => {
    assert.throws(() => verifyBillingEvent(stripe, body + ' ', signed(body), secret, false), /signature/);
    assert.throws(() => verifyBillingEvent(stripe, body, '', secret, false), /signature/);
    assert.throws(() => verifyBillingEvent(stripe, body, signed(body), secret, true), /mode/);
    assert.throws(() => verifyBillingEvent(stripe, body, signed(body, Math.floor(Date.now() / 1000) - 600), secret, false), /signature/);
  });
  it('ignores unrelated event types', () => {
    const unrelated = body.replace('customer.subscription.updated', 'customer.created');
    assert.equal(billingEventCustomer(verifyBillingEvent(stripe, unrelated, signed(unrelated), secret, false)), null);
  });
});

describe('Billing database lease and replay protection', () => {
  it('serializes purchases, fences expired workers, and records webhook saves atomically', async () => {
    const db = new PGlite();
    const duel = '00000000-0000-4000-8000-000000000001';
    const first = '00000000-0000-4000-8000-000000000002';
    const second = '00000000-0000-4000-8000-000000000003';
    const initial = JSON.stringify(emptyBillingState('acct_test'));
    try {
      await db.exec(`
        create role anon;
        create role authenticated;
        create role service_role;
        create table public.duels (id uuid primary key);
      `);
      await db.exec(await readFile('supabase/billing.sql', 'utf8'));
      await db.query('insert into public.duels(id) values ($1)', [duel]);
      const acquire = (token: string) => db.query<{ state: unknown }>(
        'select public.billing_acquire($1, false, $2, $3) as state', [duel, token, initial],
      );
      const attempts = await Promise.all([acquire(first), acquire(second)]);
      assert.equal(attempts.filter(result => result.rows[0].state !== null).length, 1);
      const owner = attempts[0].rows[0].state !== null ? first : second;
      const replacement = owner === first ? second : first;
      await db.query('update public.duel_billing set lease_until = clock_timestamp() - interval \'1 second\'');
      await acquire(replacement);
      await assert.rejects(db.query(
        'select public.billing_save($1, false, $2, $3, $4)', [duel, owner, initial, 'evt_stale'],
      ), /Billing lease expired/);
      assert.equal((await db.query('select * from public.billing_events')).rows.length, 0);
      // The expired worker must not release the replacement worker's lock.
      await db.query('select public.billing_release($1, false, $2)', [duel, owner]);
      assert.equal((await acquire(owner)).rows[0].state, null);
      for (let replay = 0; replay < 2; replay++) {
        await db.query('select public.billing_save($1, false, $2, $3, $4)', [duel, replacement, initial, 'evt_valid']);
      }
      assert.equal((await db.query('select * from public.billing_events')).rows.length, 1);
      await db.query('select public.billing_release($1, false, $2)', [duel, replacement]);
      assert.notEqual((await acquire(owner)).rows[0].state, null);
      // Public clients cannot invoke the privileged lease routines or read state.
      await db.exec('set role authenticated');
      await assert.rejects(acquire(owner), /permission denied/);
      await assert.rejects(db.query('select * from public.duel_billing'), /permission denied/);
    } finally {
      await db.close();
    }
  });
});
