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
    <section aria-label="Duel membership and billing" className="rounded-2xl border border-zinc-500/20 bg-zinc-500/5 p-7 space-y-5 text-foreground">
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Duel membership</p>
        <h2 className="text-2xl font-semibold tracking-tight mt-2">One subscription.<br />Both players.</h2>
        <p className="text-sm leading-relaxed text-zinc-500 mt-3">The Duel owner chooses a plan and pays securely through Stripe. Your partner is included.</p>
      </div>
      {result === 'success' && <p role="status" className="text-sm">{view?.subscribed ? 'Your subscription is confirmed for both players.' : 'You returned from Stripe. We are checking your subscription; this page alone does not confirm payment.'}</p>}
      {result === 'canceled' && <p role="status" className="text-sm">You left Checkout. No new subscription has been confirmed. You can resume the same Checkout below.</p>}
      {plans?.testMode && <p className="text-sm text-amber-500">Sandbox billing. No real money is charged.</p>}
      {loading || checking ? <p role="status" className="text-sm text-zinc-500">Checking billing…</p> : null}
      {error && <p role="alert" className="text-sm text-amber-500">{error}</p>}
      {!loading && !user && <Link className="control control-primary" href="/?tab=today">Sign in and create your Duel</Link>}
      {user && !duel && <Link className="control control-primary" href="/">Create or join a Duel first</Link>}
      {user && duel && !owner && <p className="text-sm">Your Duel owner manages billing. {view?.subscribed ? 'Their subscription covers you too.' : 'No active subscription has been confirmed.'}</p>}
      {view && <div className="text-sm text-zinc-500 space-y-1">
        <p>Subscription: <span className="font-medium text-foreground">{view.status.replaceAll('_', ' ')}</span></p>
        {view.cancelAtPeriodEnd && view.periodEnd && <p>Cancellation scheduled for {new Date(view.periodEnd * 1000).toLocaleDateString()}.</p>}
        {view.checkoutPending && <p>A Checkout is pending. Resume it to review its plan and total.</p>}
      </div>}
      {plans && !subscriptionExists && <div className="space-y-3">
        {plans.plans.map(p => <div key={p.plan} className="rounded-xl border border-zinc-500/20 p-4 space-y-3">
          <h3 className="font-medium">{p.plan === 'monthly' ? 'Monthly membership' : 'Annual membership'}</h3>
          <p className="text-sm text-zinc-500">{p.label}</p>
          {owner && view && <button type="button" disabled={busy || checking} onClick={() => void redirect('checkout', p.plan)} className="control control-primary min-h-11 w-full disabled:opacity-50">
            {busy ? 'Opening Stripe…' : view.checkoutPending ? 'Resume Checkout' : 'Subscribe with Stripe'}
          </button>}
        </div>)}
      </div>}
      {owner && view?.hasCustomer && <button type="button" disabled={busy || checking} onClick={() => void redirect('portal')} className="control min-h-11 disabled:opacity-50">Manage subscription and payment details</button>}
      <button type="button" disabled={busy || checking || loading} onClick={() => void refresh()} className="control min-h-11 disabled:opacity-50">Refresh billing status</button>
      {plans && <p className="text-xs text-zinc-500">Stripe shows the final charge before purchase. No free trial is currently offered.</p>}
      <p className="text-xs leading-relaxed text-zinc-500">Your existing habits and history remain available during the membership rollout.</p>
    </section>
  );
}
