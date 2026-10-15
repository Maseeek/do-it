'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { useMultiplayer } from '@/lib/multiplayer';
import { billingRequest, openStripeCheckout, purchaseViewSchema } from '@/lib/billing-client';

const included = [
  ['Two players, one membership', 'Your partner joins at no extra cost.'],
  ['Habits that fit both of you', 'Different routines. A fair, shared Duel.'],
  ['A reason to keep showing up', 'Check-ins, proof, and a weekly leaderboard.'],
];

export function MembershipOffer() {
  const { user, duel, loading } = useMultiplayer();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guest = !!user && !!duel && duel.owner_id !== user.id;

  async function startMembership() {
    setBusy(true);
    setError(null);
    try {
      if (user && duel) {
        openStripeCheckout(await billingRequest('checkout', { plan: 'monthly' }));
        return;
      }
      // Establish the HttpOnly purchase cookie before creating a Checkout so
      // a lost response can safely resume the same purchase on the next click.
      const purchase = purchaseViewSchema.parse(await billingRequest('purchase'));
      if (purchase.status === 'paid' || purchase.status === 'claimed') {
        router.push('/billing');
        return;
      }
      openStripeCheckout(await billingRequest('purchase', { plan: 'monthly' }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open Checkout. Please retry.');
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="membership-title" className="rounded-[20px] border border-[#dce1d9] dark:border-[#2a342d] bg-white dark:bg-[#181e1a] p-8 text-[#19231e] dark:text-[#eef2ee] shadow-[0_12px_40px_-24px_rgba(30,50,40,0.25)] dark:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.6)] lg:p-10 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#57675b] dark:text-[#8ea293]">Do It membership</p>
        <span className="rounded-full bg-[#edf3ed] dark:bg-[#202c23] px-3 py-1 text-[11px] font-medium text-[#386347] dark:text-[#82be91]">For two people</span>
      </div>
      <h2 id="membership-title" className="mt-6 text-2xl font-semibold tracking-tight text-[#19231e] dark:text-[#f4f7f4]">One commitment. Both of you.</h2>
      <div className="mt-7 flex items-baseline gap-2">
        <span className="text-[64px] font-semibold leading-none tracking-[-0.06em] text-[#19231e] dark:text-[#f4f7f4]">$15</span>
        <span className="text-sm text-[#657067] dark:text-[#95a498]">USD / month</span>
      </div>
      <p className="mt-3 text-sm text-[#657067] dark:text-[#95a498]">One monthly subscription covers both players.</p>
      <div className="my-8 h-px bg-[#e7eae4] dark:bg-[#263129]" />
      <ul className="space-y-5">
        {included.map(([title, description]) => <li key={title} className="flex gap-3">
          <Check size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-[#427853] dark:text-[#68a77a]" />
          <div><p className="text-sm font-medium text-[#19231e] dark:text-[#eef2ee]">{title}</p><p className="mt-1 text-xs leading-relaxed text-[#657067] dark:text-[#95a498]">{description}</p></div>
        </li>)}
      </ul>
      <div className="mt-9">
        {guest ? <Link href="/billing" className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#264e37] dark:bg-[#2f5e43] px-5 py-3.5 text-sm font-semibold text-[#fff] hover:bg-[#1f402d] dark:hover:bg-[#386e4f] transition-colors">View your shared membership <ArrowRight size={17} /></Link> :
          <button type="button" onClick={() => void startMembership()} disabled={busy || loading} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#264e37] dark:bg-[#2f5e43] px-5 py-3.5 text-sm font-semibold text-[#fff] transition-colors hover:bg-[#1f402d] dark:hover:bg-[#386e4f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#264e37] disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Opening secure Checkout…' : 'Start your membership'}{!busy && <ArrowRight size={17} />}
          </button>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">{error}</p>}
        <p className="mt-4 text-center text-xs text-[#657067] dark:text-[#95a498]">Billed monthly. Cancel through your billing portal.</p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#849087] dark:text-[#7d8f80]"><LockKeyhole size={11} />Secure checkout with <span className="font-semibold text-[#59675f] dark:text-[#95a498]">stripe</span></p>
      </div>
      <div className="mt-7 border-t border-[#e7eae4] dark:border-[#263129] pt-5 text-center">
        <p className="text-xs leading-relaxed text-[#657067] dark:text-[#95a498]">Pay first. Then set up your account and invite your person.</p>
        <p className="mt-2 text-[11px] text-[#849087] dark:text-[#7d8f80]">$15 charged today. No free trial.</p>
      </div>
    </section>
  );
}
