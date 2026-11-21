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

  if (loading || checking && !purchase) return <p role="status" className="py-10 text-center text-label text-muted">Checking your membership…</p>;
  if (purchase?.status === 'claimed' && user && duel) return <>{children}</>;
  if (purchase?.status === 'paid') {
    const owner = !!user && duel?.owner_id === user.id;
    return <section className="surface p-6 flex flex-col gap-6">
      <div><CheckCircle2 size={28} className="mb-4 text-emerald-600 dark:text-emerald-400" /><p className="mb-2 text-eyebrow text-muted">Step 02 / Your account</p><h2 className="text-title-lg">Membership paid.<br />Let’s make it yours.</h2><p className="mt-3 text-body text-secondary">Your payment is confirmed. Sign in with the same email you used at Stripe, create your Duel, then connect your membership. Your partner is included.</p></div>
      {error && <p role="alert" className="text-label text-amber-600 dark:text-amber-400">{error}</p>}
      {!user || !duel ? <Link href="/?membership=setup" className="control control-primary w-full">Set up your account <ArrowRight size={16} /></Link> : owner ? <button type="button" disabled={busy || checking} onClick={() => void claim()} className="control control-primary w-full">{busy ? 'Connecting membership…' : 'Connect membership to your Duel'}<ArrowRight size={16} /></button> : <p className="text-body text-secondary">You have joined someone else’s Duel. Its owner manages the membership. Contact support before connecting another subscription.</p>}
    </section>;
  }
  if (purchase?.status === 'pending' || result === 'success' && (!purchase || purchase.status !== 'claimed')) {
    return <section className="surface p-6 flex flex-col gap-4"><p className="text-eyebrow text-muted">Checking payment</p><h2 className="text-title">A moment for your membership.</h2><p role="status" className="text-body text-secondary">We’re waiting for Stripe to confirm your payment. Returning to this page does not confirm a subscription.</p>{error && <p role="alert" className="text-label text-amber-600 dark:text-amber-400">{error}</p>}<button disabled={checking} type="button" onClick={() => void refresh()} className="control w-full">{checking ? 'Checking…' : 'Check payment status'}</button><Link href="/welcome" className="flex min-h-11 items-center justify-center text-label text-secondary hover:text-foreground">Back to membership</Link></section>;
  }
  if (user && duel) return <>{children}</>;
  return <div className="flex flex-col gap-4">
    {result === 'canceled' && <p role="status" className="text-label text-secondary">Checkout wasn’t completed. You can resume your membership purchase below.</p>}
    {purchase?.status === 'claimed' && <p role="status" className="text-label text-secondary">This purchase is already connected to a Duel. <Link href="/" className="underline">Sign in to your existing account.</Link></p>}
    <MembershipOffer />
  </div>;
}
