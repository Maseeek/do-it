import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { MembershipOffer } from './MembershipOffer';

export function DesktopWelcomePage() {
  return (
    <div className="min-h-screen bg-[#f6f6f0] text-[#19231e]">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-8 py-8 lg:px-12">
        <Link href="/welcome" aria-label="Do It home" className="text-[27px] font-bold tracking-[-0.08em]">do it<span className="text-[#598764]">.</span></Link>
        <nav aria-label="Main navigation" className="flex items-center gap-7 text-xs text-[#627064]">
          <a href="#how-it-works" className="hover:text-[#19231e]">How it works</a>
          <Link href="/billing" className="hover:text-[#19231e]">Manage membership</Link>
          <Link href="/" className="flex items-center gap-1.5 font-medium text-[#19231e]">Sign in <ArrowUpRight size={13} /></Link>
        </nav>
      </header>
      <main className="mx-auto max-w-[1200px] px-8 lg:px-12">
        <section className="grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-24 lg:pb-24 lg:pt-14">
          <div className="pb-4">
            <p className="mb-7 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6b786d]">Small habits. Shared commitment.</p>
            <h1 className="font-serif text-5xl leading-[1.07] tracking-[-0.04em] lg:text-[72px]">Better habits.<br />Someone in<br />your corner.</h1>
            <p className="mt-7 max-w-[370px] text-[16px] leading-[1.8] text-[#627064]">Make a commitment with a friend or partner. Choose your habits, check in every day, and give each other a reason to keep going.</p>
            <div className="mt-10 flex items-center gap-3">
              <div aria-hidden="true" className="flex -space-x-2"><span className="flex size-10 items-center justify-center rounded-full border-[3px] border-[#f6f6f0] bg-[#d6e4d3] text-xs font-medium text-[#3f6947]">You</span><span className="flex size-10 items-center justify-center rounded-full border-[3px] border-[#f6f6f0] bg-[#e6dfcd] text-xs font-medium text-[#74674f]">+1</span></div>
              <p className="text-xs text-[#627064]">A private Duel for two.<br /><span className="mt-1 inline-block text-[#19231e]">Your routines. Your person.</span></p>
            </div>
            <div id="how-it-works" className="mt-12 border-t border-[#dce1d9] pt-7">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#849087]">Start in three steps</p>
              <ol className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                <li className="font-medium text-[#264e37]"><span className="mr-1.5 font-mono text-[#849087]">01</span>Membership</li>
                <li className="text-[#627064]"><span className="mr-1.5 font-mono text-[#849087]">02</span>Your account</li>
                <li className="text-[#627064]"><span className="mr-1.5 font-mono text-[#849087]">03</span>Your Duel</li>
              </ol>
            </div>
          </div>
          <div id="membership"><MembershipOffer /></div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-[#dce1d9] px-8 py-7 text-[11px] text-[#849087] lg:px-12">
        <p>Do It. Show up for yourself. And each other.</p>
        <Link href="/billing" className="hover:text-[#19231e]">Membership &amp; billing</Link>
      </footer>
    </div>
  );
}
