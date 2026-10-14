'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { useMultiplayer } from '@/lib/multiplayer';
import { billingRequest, purchaseViewSchema } from '@/lib/billing-client';
import { MembershipOffer } from './MembershipOffer';

type Purchase = z.infer<typeof purchaseViewSchema>;

export function PurchaseSetup({ result, children }: { result?: string; children: ReactNode }) {
  const { user, duel, loading } = useMultiplayer();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setChecking(true);
    setError(null);
    try {
      const next = purchaseViewSchema.parse(await billingRequest('purchase'));
      if (current === sequence.current) setPurchase(next);
    } catch (caught) {
      if (current === sequence.current) setError(caught instanceof Error ? caught.message : 'Could not check your payment.');
    } finally { if (current === sequence.current) setChecking(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const current = sequence;
    return () => { current.current++; };
  }, [refresh]);

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      z.object({ claimed: z.literal(true) }).parse(await billingRequest('purchase/claim', {}));
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not connect your membership.'); }
    finally { setBusy(false); }
  }

  if (loading || checking && !purchase) return <p role="status" className="py-10 text-center text-sm text-zinc-500">Checking your membership…</p>;
  if (purchase?.status === 'claimed' && user && duel) return <>{children}</>;
  if (purchase?.status === 'paid') {
    const owner = !!user && duel?.owner_id === user.id;
    return <section className="rounded-2xl border border-zinc-500/20 p-8 space-y-6">
      <div><CheckCircle2 size={28} className="mb-4 text-emerald-600" /><p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">Step 02 / Your account</p><h2 className="text-3xl font-semibold tracking-tight">Membership paid.<br />Let’s make it yours.</h2><p className="mt-4 text-sm leading-relaxed text-zinc-500">Your payment is confirmed. Sign in with the same email you used at Stripe, create your Duel, then connect your membership. Your partner is included.</p></div>
      {error && <p role="alert" className="text-sm text-amber-600">{error}</p>}
      {!user || !duel ? <Link href="/?membership=setup" className="control control-primary min-h-12">Set up your account <ArrowRight size={16} /></Link> : owner ? <button type="button" disabled={busy || checking} onClick={() => void claim()} className="control control-primary min-h-12 disabled:opacity-50">{busy ? 'Connecting membership…' : 'Connect membership to your Duel'}<ArrowRight size={16} /></button> : <p className="text-sm text-zinc-500">You have joined someone else’s Duel. Its owner manages the membership. Contact support before connecting another subscription.</p>}
    </section>;
  }
  if (purchase?.status === 'pending' || result === 'success' && (!purchase || purchase.status !== 'claimed')) {
    return <section className="rounded-2xl border border-zinc-500/20 p-8 space-y-5"><p className="text-xs uppercase tracking-widest text-zinc-500">Checking payment</p><h2 className="text-2xl font-semibold">A moment for your membership.</h2><p role="status" className="text-sm leading-relaxed text-zinc-500">We’re waiting for Stripe to confirm your payment. Returning to this page does not confirm a subscription.</p>{error && <p role="alert" className="text-sm text-amber-600">{error}</p>}<button disabled={checking} type="button" onClick={() => void refresh()} className="control min-h-12">{checking ? 'Checking…' : 'Check payment status'}</button><Link href="/welcome" className="block text-xs text-zinc-500">Back to membership</Link></section>;
  }
  if (user && duel) return <>{children}</>;
  return <div className="space-y-5">
    {result === 'canceled' && <p role="status" className="text-sm text-zinc-500">Checkout wasn’t completed. You can resume your membership purchase below.</p>}
    {purchase?.status === 'claimed' && <p role="status" className="text-sm text-zinc-500">This purchase is already connected to a Duel. <Link href="/" className="underline">Sign in to your existing account.</Link></p>}
    <MembershipOffer />
  </div>;
}
