import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { emptyBillingState } from './billing-model';
import { emptyPurchaseState, parsePurchaseReceipt, purchaseToken, purchaseTokenHash, purchaseView, requirePurchaseIdentity, startPurchase, type PurchaseContext, type PurchaseReceipt } from './billing-purchase';

const paid: PurchaseReceipt = {
  id: 'cs_membership', status: 'complete', url: null, paid: true, customerId: 'cus_membership', email: 'buyer@example.com',
  subscription: { id: 'sub_membership', status: 'active', priceId: 'price_monthly', periodEnd: 123, cancelAtPeriodEnd: false },
};
function fixture() {
  let receipt: PurchaseReceipt = { ...paid, status: 'open', url: 'https://checkout.stripe.com/pay/test', paid: false, subscription: null };
  let fail = false;
  const calls: { price: string; attempt: string }[] = [];
  const ctx: PurchaseContext = {
    state: emptyPurchaseState('acct_membership'),
    async save(next) { ctx.state = structuredClone(next); },
    async retrieve() { return receipt; },
    async create(price, attempt) {
      assert.equal(ctx.state.attempt?.id, attempt, 'intent saved before Stripe side effect');
      calls.push({ price, attempt });
      if (fail) throw new Error('Stripe response lost');
      return receipt;
    },
  };
  return { ctx, calls, receipt(value: PurchaseReceipt) { receipt = value; }, fail(value: boolean) { fail = value; } };
}

describe('payment before signup', () => {
  it('uses an unguessable token and stores only its digest', () => {
    const token = purchaseToken();
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(token, purchaseToken());
    assert.notEqual(token, purchaseTokenHash(token));
    assert.equal(purchaseTokenHash(token), purchaseTokenHash(token));
  });
  it('creates Checkout without an account or Duel, and resumes the same session', async () => {
    const f = fixture();
    assert.deepEqual(await purchaseView(f.ctx), { status: 'none', url: null });
    const url = await startPurchase(f.ctx, 'price_monthly');
    assert.equal(await startPurchase(f.ctx, 'different_price'), url);
    assert.equal(f.calls.length, 1);
  });
  it('recovers a lost Stripe response with the original durable key and price', async () => {
    const f = fixture(); f.fail(true);
    await assert.rejects(startPurchase(f.ctx, 'price_monthly'), /Stripe response lost/);
    assert.deepEqual(await purchaseView(f.ctx), { status: 'pending', url: null });
    f.fail(false);
    await startPurchase(f.ctx, 'changed_price');
    assert.deepEqual(f.calls[0], f.calls[1]);
  });
  it('does not create another subscription after completed or unpaid Checkout', async () => {
    for (const paidFlag of [true, false]) {
      const f = fixture(); await startPurchase(f.ctx, 'price_monthly'); f.receipt({ ...paid, paid: paidFlag });
      assert.equal((await purchaseView(f.ctx)).status, paidFlag ? 'paid' : 'pending');
      await assert.rejects(startPurchase(f.ctx, 'price_monthly'), /already complete/);
      assert.equal(f.calls.length, 1);
    }
  });
  it('only restarts an expired checkout and never reuses a pruned idempotency attempt', async () => {
    const f = fixture(); await startPurchase(f.ctx, 'price_monthly');
    f.receipt({ ...paid, status: 'expired', paid: false });
    await assert.rejects(startPurchase(f.ctx, 'price_monthly'), /being confirmed/);
    assert.equal(f.calls.length, 2);
    assert.notEqual(f.calls[0].attempt, f.calls[1].attempt);
    const lost = fixture(); lost.fail(true);
    await assert.rejects(startPurchase(lost.ctx, 'price_monthly'));
    assert.ok(lost.ctx.state.attempt);
    lost.ctx.state.attempt.createdAt = Date.now() - 24 * 60 * 60 * 1000;
    await assert.rejects(startPurchase(lost.ctx, 'price_monthly'), /reconciliation/);
    assert.equal(lost.calls.length, 1);
  });
  it('requires a paid active receipt and a verified matching authenticated email', () => {
    const user = { email: 'BUYER@example.com', email_confirmed_at: '2026-10-14' };
    assert.doesNotThrow(() => requirePurchaseIdentity(paid, user));
    assert.throws(() => requirePurchaseIdentity(paid, { email: paid.email ?? '' }), /verified email/);
    assert.throws(() => requirePurchaseIdentity(paid, { ...user, email: 'other@example.com' }), /verified email/);
    for (const receipt of [
      { ...paid, paid: false }, { ...paid, status: 'open' }, { ...paid, customerId: null },
      { ...paid, email: null }, { ...paid, subscription: null },
      { ...paid, subscription: paid.subscription && { ...paid.subscription, status: 'trialing' } },
      { ...paid, subscription: paid.subscription && { ...paid.subscription, status: 'past_due' } },
    ]) assert.throws(() => requirePurchaseIdentity(receipt, user), /not been confirmed/);
  });
  it('rejects receipts for a different mode, product, attempt, price, customer or trial', () => {
    const state = emptyPurchaseState('acct_membership');
    state.attempt = { id: state.id, priceId: 'price_monthly', sessionId: 'cs_membership', createdAt: Date.now() };
    const sub = {
      id: 'sub_membership', status: 'active', livemode: false, customer: 'cus_membership', trial_start: null,
      cancel_at_period_end: false, metadata: { app: 'do-it', purchase_id: state.id },
      items: { data: [{ price: { id: 'price_monthly' }, quantity: 1, current_period_end: 123 }] },
    };
    const session = {
      id: 'cs_membership', mode: 'subscription', status: 'complete', url: null, livemode: false, payment_status: 'paid',
      client_reference_id: state.id, metadata: { app: 'do-it', purchase_id: state.id, attempt_id: state.attempt.id },
      customer: 'cus_membership', customer_details: { email: 'buyer@example.com' }, subscription: sub,
    };
    assert.deepEqual(parsePurchaseReceipt(session, state, false), paid);
    for (const tampered of [
      { ...session, id: 'cs_different' }, { ...session, livemode: true }, { ...session, mode: 'payment' },
      { ...session, metadata: { ...session.metadata, app: 'other-product' } },
      { ...session, metadata: { ...session.metadata, purchase_id: 'other-purchase' } },
      { ...session, metadata: { ...session.metadata, attempt_id: 'other-attempt' } },
      { ...session, client_reference_id: 'other-purchase' },
      { ...session, subscription: { ...sub, customer: 'cus_different' } },
      { ...session, subscription: { ...sub, livemode: true } },
      { ...session, subscription: { ...sub, trial_start: 123 } },
      { ...session, subscription: { ...sub, metadata: { ...sub.metadata, app: 'other-product' } } },
      { ...session, subscription: { ...sub, metadata: { ...sub.metadata, purchase_id: 'other-purchase' } } },
      { ...session, subscription: { ...sub, items: { data: [{ ...sub.items.data[0], quantity: 2 }] } } },
      { ...session, subscription: { ...sub, items: { data: [{ ...sub.items.data[0], price: { id: 'wrong-price' } }] } } },
      { ...session, subscription: { ...sub, items: { data: [] } } },
    ]) assert.throws(() => parsePurchaseReceipt(tampered, state, false), /does not match/);
  });
  it('blocks repurchase after claim', async () => {
    const f = fixture(); f.ctx.state.claimed = { userId: 'owner', duelId: 'duel' };
    assert.deepEqual(await purchaseView(f.ctx), { status: 'claimed', url: null });
    await assert.rejects(startPurchase(f.ctx, 'price_monthly'), /already complete/);
    assert.equal(f.calls.length, 0);
  });
});

describe('membership atomic database claims', () => {
  it('fences concurrent operations, rolls back failed claims, and denies client access', async () => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role;
        create table public.duels (id uuid primary key, owner_id uuid not null);`);
      await db.exec(await readFile('supabase/billing.sql', 'utf8'));
      await db.exec(await readFile('supabase/billing-purchase.sql', 'utf8'));
      const owner = '00000000-0000-0000-0000-000000000001';
      const duel = '00000000-0000-0000-0000-000000000002';
      const token = '00000000-0000-0000-0000-000000000003';
      const otherToken = '00000000-0000-0000-0000-000000000004';
      const hash = purchaseTokenHash(purchaseToken());
      const state = emptyPurchaseState('acct_membership');
      await db.query('insert into public.duels values ($1,$2)', [duel, owner]);
      const acquire = (lease: string) => db.query<{ state: unknown }>('select billing_purchase_acquire($1,false,$2,$3) state', [hash, lease, JSON.stringify(state)]);
      assert.ok((await acquire(token)).rows[0].state);
      assert.equal((await acquire(otherToken)).rows[0].state, null);
      await assert.rejects(db.query('select billing_purchase_save($1,false,$2,$3)', [hash, otherToken, JSON.stringify(state)]), /Membership lease expired/);
      await db.query('select billing_acquire($1,false,$2,$3)', [duel, token, JSON.stringify(emptyBillingState('acct_membership'))]);
      const next = { ...emptyBillingState('acct_membership'), customer: { id: 'cus_membership', ownerId: owner }, subscription: paid.subscription };
      const claim = (billingLease: string, user = owner) => db.query('select billing_purchase_claim($1,false,$2,$3,$4,$5,$6)', [hash, token, duel, user, JSON.stringify(next), billingLease]);
      await assert.rejects(claim(otherToken), /Duel billing claim is unavailable/);
      const row = await db.query<{ state: { claimed: unknown } }>('select state from billing_purchases');
      assert.equal(row.rows[0].state.claimed, null, 'failed Duel write rolls purchase claim back');
      await assert.rejects(claim(token, otherToken), /Only the Duel owner/);
      await claim(token);
      await claim(token); // Idempotent after a successfully committed response is lost.
      await assert.rejects(claim(otherToken), /Membership claim is unavailable/);
      const bound = await db.query<{ state: { customer: { id: string } } }>('select state from duel_billing');
      assert.equal(bound.rows[0].state.customer.id, 'cus_membership');
      const secondHash = purchaseTokenHash(purchaseToken());
      const secondDuel = '00000000-0000-0000-0000-000000000005';
      await db.query('insert into duels values ($1,$2)', [secondDuel, owner]);
      await db.query('select billing_purchase_acquire($1,false,$2,$3)', [secondHash, token, JSON.stringify(emptyPurchaseState('acct_membership'))]);
      await db.query('select billing_acquire($1,false,$2,$3)', [secondDuel, token, JSON.stringify(emptyBillingState('acct_membership'))]);
      await assert.rejects(db.query('select billing_purchase_claim($1,false,$2,$3,$4,$5,$2)', [secondHash, token, secondDuel, owner, JSON.stringify(next)]), /duplicate key/);
      const unclaimed = await db.query<{ state: { claimed: unknown } }>('select state from billing_purchases where token_hash=$1', [secondHash]);
      assert.equal(unclaimed.rows[0].state.claimed, null, 'unique customer conflict rolls back second purchase claim');
      await db.exec('set role authenticated');
      await assert.rejects(db.exec('select * from billing_purchases'), /permission denied/);
      await assert.rejects(db.query('select billing_purchase_acquire($1,false,$2,$3)', [hash, token, JSON.stringify(state)]), /permission denied/);
    } finally { await db.close(); }
  });
});
