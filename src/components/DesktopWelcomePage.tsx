'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Scale,
  Users,
  Trophy,
  Activity,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Check,
  Sun,
  Moon,
  Monitor,
  ExternalLink,
} from 'lucide-react';
import {
  HERO_CONTENT,
  DOMAIN_CONCEPTS,
  MANIFESTO,
  FAQ_ITEMS,
} from '@/lib/onboarding-content';
import { ParitySimulator } from '@/components/ParitySimulator';
import { OnboardingFlow, DuelConfiguration } from '@/components/OnboardingFlow';
import { MembershipOffer } from '@/components/MembershipOffer';
import { DoLogo } from '@/components/DoLogo';

export function DesktopWelcomePage() {
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedConceptTab, setSelectedConceptTab] = useState<string>('duel');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // Sync theme with document class and localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDark = document.documentElement.classList.contains('dark');
    setCurrentTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    if (typeof window === 'undefined') return;
    const isDark = document.documentElement.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme_preference', 'dark');
      setCurrentTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme_preference', 'light');
      setCurrentTheme('light');
    }
  }, []);

  // Keyboard shortcut listener ('O' for Onboard, 'Esc' to close modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'o' || e.key === 'O') {
        setShowOnboardingModal((prev) => !prev);
      }
      if (e.key === 'Escape' && showOnboardingModal) {
        setShowOnboardingModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOnboardingModal]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#08090a] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-white/20 font-sans antialiased relative overflow-x-hidden transition-colors duration-150">
      {/* Subtle top hairline gradient */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-400/30 dark:via-white/20 to-transparent" />

      {/* TOP STICKY DESKTOP BAR */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-[#08090a]/80 border-b border-zinc-200/80 dark:border-white/[0.08] transition-colors">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/welcome" className="flex items-center gap-2.5 group">
              <DoLogo size="sm" />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-zinc-950 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                  do.
                </span>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none">
                  Habit Parity Engine
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 pl-6 border-l border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-600 dark:text-zinc-400">
              <a href="#how-it-works" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                Architecture
              </a>
              <a href="#simulator" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                Parity Simulator
              </a>
              <a href="#membership" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                Membership
              </a>
              <a href="#manifesto" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                Anti-Freemium
              </a>
              <a href="#faq" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Toggle theme (currently ${currentTheme})`}
              title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex size-9 items-center justify-center rounded-xl border border-zinc-300 dark:border-white/15 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all active:scale-[0.96]"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
            </button>

            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors hidden sm:inline-block"
            >
              Sign In &rarr;
            </Link>

            <button
              onClick={() => setShowOnboardingModal(true)}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-sm flex items-center gap-1.5"
            >
              <span>Setup Your Duel</span>
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pl-1">Press O</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION - WIDE DESKTOP FOCUS */}
      <section className="relative pt-20 pb-24 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="max-w-3xl">
            {/* Kicker badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-800 dark:text-emerald-400 mb-6 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Two-Player Habit Parity Engine</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.08] text-balance">
              The intimate two-player accountability engine.
            </h1>

            <p className="mt-6 text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed text-pretty font-normal">
              Solo habit trackers fail because nobody notices when you quit. Social feeds fail because public performativity dilutes discipline.
              <span className="text-zinc-900 dark:text-zinc-200 font-medium"> Do It binds two people in an uncheatable weekly habit duel</span>, calibrated to mathematically balanced 240 Daily Par.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowOnboardingModal(true)}
                className="px-8 py-4 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl flex items-center gap-2.5"
              >
                <span>Initialize Your Duel</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#simulator"
                className="px-6 py-4 rounded-2xl bg-white dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-white/10 font-mono text-xs transition-all active:scale-[0.98] flex items-center gap-2 shadow-xs"
              >
                <span>Test Live Simulator Below</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              </a>

              <a
                href="#membership"
                className="px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/40 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-mono text-xs transition-all active:scale-[0.98]"
              >
                Membership &amp; Stripe &rarr;
              </a>
            </div>

            {/* Value Pillars */}
            <div className="mt-14 pt-8 border-t border-zinc-200/80 dark:border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-6">
              {HERO_CONTENT.valuePillars.map((pillar) => (
                <div key={pillar.label} className="space-y-1">
                  <div className="text-xl font-extrabold font-mono text-zinc-950 dark:text-white tracking-tight">
                    {pillar.metric}
                  </div>
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">{pillar.label}</div>
                  <div className="text-[11px] text-zinc-500 font-mono leading-tight">{pillar.context}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: HOW THE TWO-PLAYER HABIT PARITY ENGINE WORKS */}
      <section id="how-it-works" className="py-24 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-2 font-semibold">
                01 &bull; Calibrated Equivalence
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                How two different lives compete on equal ground.
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed font-normal">
              You run marathons; your partner studies medicine. Forcing identical routines destroys consistency.
              Do It standardizes daily difficulty instead.
            </p>
          </div>

          {/* 3 Core Architecture Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: 240 Par */}
            <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 transition-all space-y-4 shadow-sm dark:shadow-none">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">The 240 Daily Par Standard</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Every habit carries an agreed point weight. Both players customize asymmetric commitments that total exactly 240 points daily. Neither player can stack easy micro-habits to inflate scores.
              </p>
              <div className="pt-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                1,680 Weekly Par potential &bull; Zero handicaps
              </div>
            </div>

            {/* Card 2: Telemetry & Photo Verification */}
            <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 transition-all space-y-4 shadow-sm dark:shadow-none">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">Uncheatable Proof Engine</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Checkbox honor systems collapse when fatigue sets in. Do It connects directly to Garmin, Apple Health, and Oura for automatic telemetry verification, alongside instant client-compressed photo proofs.
              </p>
              <div className="pt-2 font-mono text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                Cryptographic timestamping &bull; Client-side privacy
              </div>
            </div>

            {/* Card 3: Sunday Midnight Settlement */}
            <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 transition-all space-y-4 shadow-sm dark:shadow-none">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">Sunday Stakes &amp; Champions Ledger</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Every Sunday at 23:59:59 local time, the Leaderboard resets. The player trailing in weekly score settles the agreed mutual stake (e.g. Sunday dinner date or chore week), forever engraved into the Hall of Champions.
              </p>
              <div className="pt-2 font-mono text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Permanent Karma score &bull; Tangible stakes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: INTERACTIVE PARITY SIMULATOR */}
      <section id="simulator" className="py-24 border-b border-zinc-200/80 dark:border-white/[0.08] bg-zinc-100/60 dark:bg-zinc-950/40 transition-colors">
        <div className="max-w-7xl mx-auto px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono text-purple-700 dark:text-purple-400 uppercase tracking-widest block mb-2 font-semibold">
              02 &bull; Interactive Browser Demonstration
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Experience the Parity Engine live right now.
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Test how two players with vastly different commitments balance out to 240 Par each day.
              Toggle habit check-ins, switch between preset archetypes, and view the live Sunday stake forecast.
            </p>
          </div>

          {/* Embedded Parity Simulator */}
          <div className="rounded-3xl overflow-hidden">
            <ParitySimulator />
          </div>
        </div>
      </section>

      {/* SECTION 3: MEMBERSHIP & STRIPE SUBSCRIPTION */}
      <section id="membership" className="py-24 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <div>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-2 font-semibold">
                03 &bull; Membership &amp; Pricing
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                One membership. Both players.
              </h2>
              <p className="mt-5 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We reject freemium models that sell your data or gate basic accountability behind ad spam.
                One player subscribes, and both participants unlock full access to the Duel.
              </p>

              <div className="mt-8 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-3">
                  <div className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="size-4 stroke-[2.5]" />
                  </div>
                  <span>Your partner or rival joins completely free under your seat.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="size-4 stroke-[2.5]" />
                  </div>
                  <span>Direct telemetry sync for Garmin, Apple Health, and Oura.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="size-4 stroke-[2.5]" />
                  </div>
                  <span>Zero ads, zero data tracking, zero streak-freeze microtransactions.</span>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-white/10 flex items-center gap-4">
                <button
                  onClick={() => setShowOnboardingModal(true)}
                  className="px-6 py-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-md flex items-center gap-2"
                >
                  <span>Interactive Duel Setup</span>
                  <ArrowRight className="size-3.5" />
                </button>
                <Link
                  href="/billing"
                  className="text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                >
                  Manage existing billing &rarr;
                </Link>
              </div>
            </div>

            {/* Embedded Live Membership Offer with Stripe Checkout */}
            <div>
              <MembershipOffer />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE ANTI-FREEMIUM MANIFESTO */}
      <section id="manifesto" className="py-24 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono text-rose-700 dark:text-rose-400 uppercase tracking-widest block mb-2 font-semibold">
              04 &bull; Architectural Philosophy
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-tight">
              Why Do It is a paid subscription &mdash; never freemium.
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              The modern software ecosystem has normalized deceptive freemium habit apps: invasive ad networks,
              dark-pattern push notifications, streak-freeze microtransactions, and user tracking.
              <span className="text-zinc-900 dark:text-zinc-200 font-medium"> We believe serious discipline requires aligned incentives.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {MANIFESTO.principles.map((p) => (
              <div
                key={p.index}
                className="p-8 rounded-3xl bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/[0.08] space-y-4 hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500 font-bold">{p.index}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-white/5">
                    Principle
                  </span>
                </div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">{p.title}</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/10 text-rose-800 dark:text-rose-300">
                    <span className="font-semibold block mb-0.5">The Freemium Pathology:</span>
                    {p.critique}
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <span className="font-semibold block mb-0.5">The Do It Architecture:</span>
                    {p.counterPosition}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: DOMAIN GLOSSARY & UBIQUITOUS LANGUAGE */}
      <section className="py-24 border-b border-zinc-200/80 dark:border-white/[0.08] bg-zinc-100/60 dark:bg-zinc-950/40 transition-colors">
        <div className="max-w-7xl mx-auto px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono text-blue-700 dark:text-blue-400 uppercase tracking-widest block mb-2 font-semibold">
              05 &bull; Ubiquitous Language
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Every word is intentional.
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              In Do It, terminology reflects bounded cryptographic reality. We do not have &apos;Rooms&apos; or &apos;Tasks&apos;.
              Explore the domain entities that govern your duel.
            </p>
          </div>

          {/* Domain tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {DOMAIN_CONCEPTS.map((concept) => (
              <button
                key={concept.id}
                onClick={() => setSelectedConceptTab(concept.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                  selectedConceptTab === concept.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold shadow'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-white/5'
                }`}
              >
                {concept.term}
              </button>
            ))}
          </div>

          {/* Active Concept Display */}
          {(() => {
            const activeConcept = DOMAIN_CONCEPTS.find((c) => c.id === selectedConceptTab) || DOMAIN_CONCEPTS[0];
            return (
              <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-6 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
                  <div>
                    <h3 className="text-2xl font-extrabold text-zinc-950 dark:text-white">{activeConcept.term}</h3>
                    <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">{activeConcept.summary}</div>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/5 uppercase">
                    Category: {activeConcept.category}
                  </span>
                </div>

                <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {activeConcept.definition}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 space-y-1.5">
                    <span className="font-mono text-rose-700 dark:text-rose-400 font-semibold block uppercase text-[10px]">
                      Prohibited / Ambiguous Terms:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeConcept.prohibitedTerms.map((term) => (
                        <span key={term} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono text-[11px]">
                          &times; {term}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 space-y-1.5">
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold block uppercase text-[10px]">
                      Architectural Rationale:
                    </span>
                    <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                      {activeConcept.architecturalRationale}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* SECTION 6: FAQ ACCORDION */}
      <section id="faq" className="py-24 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-2 font-semibold">
              06 &bull; Answers to Crucial Inquiries
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900/30 overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-6 flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/60 dark:border-white/5 animate-in fade-in duration-150">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 bg-zinc-100 dark:bg-[#08090a] border-t border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-500 text-xs transition-colors">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <DoLogo size="sm" />
            <div>
              <span className="text-zinc-900 dark:text-zinc-300 font-bold">do.</span>
              <span className="text-zinc-500 font-mono pl-2">&bull; Two-Player Habit Parity Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Architecture</a>
            <a href="#simulator" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Simulator</a>
            <a href="#membership" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Membership</a>
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Open App</Link>
          </div>

          <div className="font-mono text-[10px] text-zinc-500">
            Crafted for desktop browsers &bull; Zero freemium ad spam
          </div>
        </div>
      </footer>

      {/* ONBOARDING MODAL OVERLAY */}
      {showOnboardingModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-black/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-4xl my-auto">
            <OnboardingFlow
              onCancel={() => setShowOnboardingModal(false)}
              onComplete={(config) => {
                setShowOnboardingModal(false);
                window.location.href = `/?invite=${config.inviteCode}&tab=today`;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DesktopWelcomePage;
