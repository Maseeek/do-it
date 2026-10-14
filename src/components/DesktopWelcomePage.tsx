import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { BillingPanel } from './BillingPanel';
import { DoLogo } from './DoLogo';

const steps = [
  ['Choose your habits', 'Build a routine that fits your life. Agree on points so both players have a fair chance.'],
  ['Invite your person', 'Share your Duel with a friend or partner. Your routines can be different; your commitment is shared.'],
  ['Show up together', 'Check in, share proof, and follow the weekly leaderboard. Put a real-world reward on the line.'],
];

export function DesktopWelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-zinc-500/20 px-8 py-6">
        <Link href="/" aria-label="Do It home"><DoLogo size="sm" /></Link>
        <nav aria-label="Main navigation" className="flex items-center gap-8 text-sm">
          <a href="#how-it-works" className="text-zinc-500 hover:text-foreground">How it works</a>
          <Link href="/" className="text-zinc-500 hover:text-foreground">Sign in</Link>
          <Link href="/billing" className="font-medium">Membership <ArrowUpRight size={14} className="inline-block" /></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-8">
        <section className="grid items-start gap-16 py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-24 lg:py-28">
          <div>
            <p className="mb-8 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">A little accountability goes a long way.</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.06] tracking-tight lg:text-7xl">Better habits.<br />Built together.</h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-zinc-500">Do It turns your daily habits into a private competition with someone you care about. Pick your routines, keep each other honest, and make showing up count.</p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link href="/billing" className="control control-primary min-h-12 px-6">Choose your membership <ArrowUpRight size={16} /></Link>
              <Link href="/" className="text-sm font-medium">Already playing? Open your Duel</Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-xs text-zinc-500">
              {['Two players', 'Your own habits', 'One shared subscription'].map(text => <span key={text} className="flex items-center gap-2"><Check size={13} />{text}</span>)}
            </div>
          </div>
          <div id="membership" className="scroll-mt-8 lg:pt-2">
            <BillingPanel />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 border-t border-zinc-500/20 py-14 lg:py-20">
          <div className="mb-10 flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Make a commitment. Keep it together.</h2>
            <span className="hidden font-mono text-xs text-zinc-500 lg:block">01 / 02 / 03</span>
          </div>
          <ol className="grid gap-10 lg:grid-cols-3 lg:gap-16">
            {steps.map(([title, description], index) => <li key={title}>
              <p className="mb-5 font-mono text-xs text-zinc-500">0{index + 1}</p>
              <h3 className="mb-3 text-lg font-medium">{title}</h3>
              <p className="max-w-sm text-sm leading-relaxed text-zinc-500">{description}</p>
            </li>)}
          </ol>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-zinc-500/20 px-8 py-8 text-xs text-zinc-500">
        <p>Do It. A private Duel for two.</p>
        <div className="flex gap-6"><Link href="/billing" className="hover:text-foreground">Subscription &amp; billing</Link><Link href="/" className="hover:text-foreground">Open the app</Link></div>
      </footer>
    </div>
  );
}
