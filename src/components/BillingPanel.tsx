'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useMultiplayer } from '@/lib/multiplayer';
import { billingRequest, openStripeCheckout } from '@/lib/billing-client';
import { PurchaseSetup } from './PurchaseSetup';
import { billingPlansSchema, billingViewSchema, type BillingPlan } from '@/lib/billing-model';

type Plans = z.infer<typeof billingPlansSchema>;
type View = z.infer<typeof billingViewSchema>;
export function BillingPanel({ result }: { result?: string }) {
  return <PurchaseSetup result={result}><DuelBillingPanel result={result} /></PurchaseSetup>;
}

function DuelBillingPanel({ result }: { result?: string }) {
  const { user, duel, loading } = useMultiplayer();
  const [plans, setPlans] = useState<Plans | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const refreshSequence = useRef(0);
  const userId = user?.id;
  const duelId = duel?.id;
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    setChecking(true);
    setError(null);
    try {
      const [nextPlans, nextView] = await Promise.allSettled([
        billingRequest('plans').then(json => billingPlansSchema.parse(json)),
        userId && duelId ? billingRequest('status').then(json => billingViewSchema.parse(json)) : Promise.resolve(null),
      ]);
      if (sequence !== refreshSequence.current) return;
      setPlans(nextPlans.status === 'fulfilled' ? nextPlans.value : null);
      setView(nextView.status === 'fulfilled' ? nextView.value : null);
      const failed = nextView.status === 'rejected' ? nextView.reason : nextPlans.status === 'rejected' ? nextPlans.reason : null;
      if (failed) throw failed;
    } catch (caught) { if (sequence === refreshSequence.current) setError(caught instanceof Error ? caught.message : 'Billing is unavailable.'); }
    finally { if (sequence === refreshSequence.current) setChecking(false); }
  }, [userId, duelId]);
  useEffect(() => {
    if (!loading) void refresh();
    const sequence = refreshSequence;
    return () => { sequence.current++; };
  }, [loading, refresh]);

  async function redirect(action: 'checkout' | 'portal', plan?: BillingPlan) {
    setBusy(true);
    setError(null);
    try {
      openStripeCheckout(await billingRequest(action, plan ? { plan } : {}));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not open Stripe.'); setBusy(false); }
  }
  const owner = !!user && duel?.owner_id === user.id;
  const subscriptionExists = view && !['none', 'canceled', 'incomplete_expired'].includes(view.status);
  return (
    <section aria-label="Duel membership and billing" className="surface surface-pad flex flex-col gap-4 text-foreground">
      <div>
        <p className="text-eyebrow text-muted">Duel membership</p>
        <h2 className="text-title mt-2">One subscription. Both players.</h2>
        <p className="text-body text-secondary mt-1.5">The Duel owner chooses a plan and pays securely through Stripe. Your partner is included.</p>
      </div>
      {result === 'success' && <p role="status" className="text-body">{view?.subscribed ? 'Your subscription is confirmed for both players.' : 'You returned from Stripe. We are checking your subscription; this page alone does not confirm payment.'}</p>}
      {result === 'canceled' && <p role="status" className="text-body">You left Checkout. No new subscription has been confirmed. You can resume the same Checkout below.</p>}
      {plans?.testMode && <p className="text-label text-amber-600 dark:text-amber-400">Sandbox billing. No real money is charged.</p>}
      {loading || checking ? <p role="status" className="text-label text-muted">Checking billing…</p> : null}
      {error && <p role="alert" className="text-label text-amber-600 dark:text-amber-400">{error}</p>}
      {!loading && !user && <Link className="control control-primary" href="/?tab=today">Sign in and create your Duel</Link>}
      {user && !duel && <Link className="control control-primary" href="/">Create or join a Duel first</Link>}
      {user && duel && !owner && <p className="text-body">Your Duel owner manages billing. {view?.subscribed ? 'Their subscription covers you too.' : 'No active subscription has been confirmed.'}</p>}
      {view && <dl className="text-label space-y-1">
        <div className="flex justify-between gap-3"><dt className="text-secondary font-normal">Subscription</dt><dd className="font-medium text-foreground capitalize">{view.status.replaceAll('_', ' ')}</dd></div>
        {view.cancelAtPeriodEnd && view.periodEnd && <div className="text-secondary">Cancellation scheduled for {new Date(view.periodEnd * 1000).toLocaleDateString()}.</div>}
        {view.checkoutPending && <div className="text-secondary">A Checkout is pending. Resume it to review its plan and total.</div>}
      </dl>}
      {plans && !subscriptionExists && <ul className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
        {plans.plans.map(p => <li key={p.plan} className="p-4 flex flex-col gap-3">
          <div>
            <h3 className="text-headline">{p.plan === 'monthly' ? 'Monthly membership' : 'Annual membership'}</h3>
            <p className="text-label text-secondary font-normal mt-0.5">{p.label}</p>
          </div>
          {owner && view && <button type="button" disabled={busy || checking} onClick={() => void redirect('checkout', p.plan)} className="control control-primary w-full">
            {busy ? 'Opening Stripe…' : view.checkoutPending ? 'Resume Checkout' : 'Subscribe with Stripe'}
          </button>}
        </li>)}
      </ul>}
      <div className="flex flex-wrap gap-2">
        {owner && view?.hasCustomer && <button type="button" disabled={busy || checking} onClick={() => void redirect('portal')} className="control">Manage subscription and payment details</button>}
        <button type="button" disabled={busy || checking || loading} onClick={() => void refresh()} className="control">Refresh billing status</button>
      </div>
      <div className="space-y-1 text-caption text-muted">
        {plans && <p>Stripe shows the final charge before purchase. No free trial is currently offered.</p>}
        <p>Your existing habits and history remain available during the membership rollout.</p>
      </div>
    </section>
  );
}
