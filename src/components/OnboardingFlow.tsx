'use client';

import React, { useState } from 'react';
import {
  Users,
  Scale,
  Trophy,
  CreditCard,
  Rocket,
  Check,
  Copy,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { BillingPanel } from './BillingPanel';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '@/lib/multiplayer';
import { DoLogo } from './DoLogo';

export interface OnboardingFlowProps {
  onComplete?: (duelConfig: DuelConfiguration) => void;
  onCancel?: () => void;
  className?: string;
}

export interface HabitItem {
  id: string;
  title: string;
  points: number;
  category: string;
}

export interface DuelConfiguration {
  playerOneName: string;
  playerTwoName: string;
  inviteCode: string;
  playerOneHabits: HabitItem[];
  playerTwoHabits: HabitItem[];
  weeklyStake: string;
}

const DEFAULT_HABITS_P1: HabitItem[] = [
  { id: 'p1_1', title: 'Early Rise (06:30 AM)', points: 40, category: 'foundation' },
  { id: 'p1_2', title: 'Strength Training / Gym', points: 70, category: 'physical' },
  { id: 'p1_3', title: 'Deep Work Sprint (90m)', points: 80, category: 'deep_work' },
  { id: 'p1_4', title: 'Read 20 Pages', points: 50, category: 'intellect' },
];

const DEFAULT_HABITS_P2: HabitItem[] = [
  { id: 'p2_1', title: 'Morning Mobility & Yoga', points: 40, category: 'physical' },
  { id: 'p2_2', title: 'Outdoor 5km Run', points: 70, category: 'cardio' },
  { id: 'p2_3', title: 'Deep Focus & Creative Studio', points: 80, category: 'deep_work' },
  { id: 'p2_4', title: 'Language Study & Journaling', points: 50, category: 'intellect' },
];

const PRESET_STAKES = [
  'Sunday Dinner at a favorite restaurant (Loser pays & reserves)',
  'Cook dinner every night for a full week',
  'Sunday breakfast in bed with pour-over coffee',
  'Take over all weekend house chores & cleaning',
  'Surprise specialty coffee bag & pastry run',
];

export function OnboardingFlow({ onComplete, onCancel, className = '' }: OnboardingFlowProps) {
  const router = useRouter();
  const { duel } = useMultiplayer();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Players
  const [playerOneName, setPlayerOneName] = useState('Maciek');
  const [playerTwoName, setPlayerTwoName] = useState('Myrna');
  const inviteCode = duel?.invite_code ?? '';
  const [copiedLink, setCopiedLink] = useState(false);

  // Step 2: Habits
  const [p1Habits, setP1Habits] = useState<HabitItem[]>(DEFAULT_HABITS_P1);
  const [p2Habits, setP2Habits] = useState<HabitItem[]>(DEFAULT_HABITS_P2);
  const [newP1Title, setNewP1Title] = useState('');
  const [newP1Points, setNewP1Points] = useState(40);
  const [newP2Title, setNewP2Title] = useState('');
  const [newP2Points, setNewP2Points] = useState(40);

  // Step 3: Stake
  const [selectedStake, setSelectedStake] = useState(PRESET_STAKES[0]);
  const [customStake, setCustomStake] = useState('');

  // Step 4: Subscription

  // Computed par totals
  const p1TotalPoints = p1Habits.reduce((acc, h) => acc + h.points, 0);
  const p2TotalPoints = p2Habits.reduce((acc, h) => acc + h.points, 0);
  const isParBalanced = p1TotalPoints === 240 && p2TotalPoints === 240;

  const effectiveStake = customStake.trim() || selectedStake;
  const inviteUrl = !inviteCode ? '' : typeof window !== 'undefined' 
    ? `${window.location.origin}/?invite=${inviteCode}`
    : `https://do-it.app/?invite=${inviteCode}`;

  const copyInviteToClipboard = async () => {
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep === 1 ? 2 : currentStep === 2 ? 3 : currentStep === 3 ? 4 : 5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep === 5 ? 4 : currentStep === 4 ? 3 : currentStep === 3 ? 2 : 1);
    }
  };

  const handleFinish = () => {
    const config: DuelConfiguration = {
      playerOneName,
      playerTwoName,
      inviteCode,
      playerOneHabits: p1Habits,
      playerTwoHabits: p2Habits,
      weeklyStake: effectiveStake,
    };
    if (onComplete) {
      onComplete(config);
    } else {
      router.push('/billing');
    }
  };

  const stepLabels = [
    { num: 1, title: 'Roster', icon: Users },
    { num: 2, title: 'Habit Parity', icon: Scale },
    { num: 3, title: 'The Stake', icon: Trophy },
    { num: 4, title: 'Membership', icon: CreditCard },
    { num: 5, title: 'Launch', icon: Rocket },
  ] satisfies { num: 1 | 2 | 3 | 4 | 5; title: string; icon: typeof Users }[];

  return (
    <div className={`w-full max-w-4xl mx-auto rounded-3xl border border-zinc-200/90 dark:border-white/10 bg-white/95 dark:bg-zinc-950/80 backdrop-blur-2xl text-zinc-900 dark:text-zinc-100 p-8 lg:p-12 shadow-2xl transition-colors ${className}`}>
      {/* Top Header & Step Progress Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-zinc-200 dark:border-white/10 gap-4">
        <div className="flex items-center gap-3">
          <DoLogo size="sm" />
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Duel Genesis Wizard &bull; Step {currentStep} of 5
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
              {currentStep === 1 && 'Establish the Two-Player Tenancy'}
              {currentStep === 2 && 'Calibrate 240 Daily Par'}
              {currentStep === 3 && 'Declare the Sunday Wager'}
              {currentStep === 4 && 'Duo-Seat Membership Pass'}
              {currentStep === 5 && 'Confirm & Launch the Duel'}
            </h2>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto">
          {stepLabels.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => isCompleted && setCurrentStep(s.num)}
                disabled={!isCompleted && !isActive}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold shadow'
                    : isCompleted
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    : 'bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Contents */}
      <div className="py-8 min-h-[420px]">
        {/* STEP 1: THE TWO PLAYERS */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Do It is strictly a two-player arena. No solo trackers, no public feeds, and no social clutter.
                You are setting up an isolated Duel bounded between you and your rival/partner.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Player 1 Card */}
              <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-zinc-900/60 border border-blue-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <div className="text-xs font-mono uppercase text-blue-700 dark:text-blue-400 font-semibold">Player 1 (You)</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Owner Slot</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                    Host
                  </span>
                </div>

                <div>
                  <label htmlFor="p1-name" className="block text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Display Name
                  </label>
                  <input
                    id="p1-name"
                    type="text"
                    value={playerOneName}
                    onChange={(e) => setPlayerOneName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Player 2 Card */}
              <div className="p-6 rounded-2xl bg-purple-50/50 dark:bg-zinc-900/60 border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <div className="text-xs font-mono uppercase text-purple-700 dark:text-purple-400 font-semibold">Player 2 (Partner)</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Guest Slot</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                    Opponent
                  </span>
                </div>

                <div>
                  <label htmlFor="p2-name" className="block text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Partner / Rival Name
                  </label>
                  <input
                    id="p2-name"
                    type="text"
                    value={playerTwoName}
                    onChange={(e) => setPlayerTwoName(e.target.value)}
                    placeholder="Partner name"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Cryptographic Invite Link Card */}
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  One-Use Cryptographic Pair Link
                </span>
                <span className="text-xs font-mono text-zinc-500">Code: {inviteCode}</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex-1 w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 font-mono text-xs text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 truncate">
                  {inviteUrl || 'Create your Duel after signing in to get a real invitation link.'}
                </div>
                <button
                  disabled={!inviteUrl}
                  onClick={copyInviteToClipboard}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Link
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Send this link to your partner. When they open it on their browser, their seat in this Duel is instantaneously bound.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: HABIT PARITY CALIBRATION */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                  Both players do NOT need the same lifestyle. Player 1 can run 10k while Player 2 practices piano.
                  The rule of the engine: <span className="text-zinc-950 dark:text-white font-semibold">Each player must calibrate exactly 240 Daily Par</span>.
                </p>
              </div>
              <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono text-xs self-start md:self-auto ${
                isParBalanced ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400'
              }`}>
                {isParBalanced ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Par Balanced (240 / 240)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400" /> Adjust to 240 Par each
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player 1 Habits */}
              <div className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{playerOneName}&apos;s Daily Routine</h3>
                    <div className="text-xs font-mono text-zinc-400">Target: 240 pts</div>
                  </div>
                  <div className={`text-sm font-mono font-bold px-2.5 py-1 rounded-lg ${
                    p1TotalPoints === 240 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {p1TotalPoints} / 240
                  </div>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {p1Habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-white/5 text-xs shadow-xs"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{habit.title}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-zinc-600 dark:text-zinc-400">{habit.points} pts</span>
                        <button
                          onClick={() => setP1Habits((prev) => prev.filter((h) => h.id !== habit.id))}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          aria-label={`Remove ${habit.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Habit */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newP1Title}
                    onChange={(e) => setNewP1Title(e.target.value)}
                    placeholder="Add custom habit..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={newP1Points}
                    onChange={(e) => setNewP1Points(Number(e.target.value))}
                    step={5}
                    min={5}
                    max={120}
                    className="w-16 px-2 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono text-center"
                  />
                  <button
                    onClick={() => {
                      if (!newP1Title.trim()) return;
                      setP1Habits((prev) => [
                        ...prev,
                        { id: `custom_${Date.now()}`, title: newP1Title.trim(), points: newP1Points, category: 'deep_work' },
                      ]);
                      setNewP1Title('');
                    }}
                    className="p-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors"
                    aria-label="Add habit"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Player 2 Habits */}
              <div className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{playerTwoName}&apos;s Daily Routine</h3>
                    <div className="text-xs font-mono text-zinc-400">Target: 240 pts</div>
                  </div>
                  <div className={`text-sm font-mono font-bold px-2.5 py-1 rounded-lg ${
                    p2TotalPoints === 240 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {p2TotalPoints} / 240
                  </div>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {p2Habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-white/5 text-xs shadow-xs"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{habit.title}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-zinc-600 dark:text-zinc-400">{habit.points} pts</span>
                        <button
                          onClick={() => setP2Habits((prev) => prev.filter((h) => h.id !== habit.id))}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          aria-label={`Remove ${habit.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Habit */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newP2Title}
                    onChange={(e) => setNewP2Title(e.target.value)}
                    placeholder="Add custom habit..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={newP2Points}
                    onChange={(e) => setNewP2Points(Number(e.target.value))}
                    step={5}
                    min={5}
                    max={120}
                    className="w-16 px-2 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono text-center"
                  />
                  <button
                    onClick={() => {
                      if (!newP2Title.trim()) return;
                      setP2Habits((prev) => [
                        ...prev,
                        { id: `custom_${Date.now()}`, title: newP2Title.trim(), points: newP2Points, category: 'physical' },
                      ]);
                      setNewP2Title('');
                    }}
                    className="p-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors"
                    aria-label="Add habit"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: THE SUNDAY STAKE */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Consistency needs skin in the game. Every Sunday at 23:59:59 local time, the Leaderboard locks.
                Whoever trails in the weekly score must fulfill the agreed stake.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {PRESET_STAKES.map((stake) => {
                const isSelected = selectedStake === stake && !customStake;
                return (
                  <button
                    key={stake}
                    onClick={() => {
                      setSelectedStake(stake);
                      setCustomStake('');
                    }}
                    className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-white font-medium shadow-sm'
                        : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <span>{stake}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <label htmlFor="custom-stake-input" className="block text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1.5">
                Or Write a Custom Mutual Wager
              </label>
              <input
                id="custom-stake-input"
                type="text"
                value={customStake}
                onChange={(e) => setCustomStake(e.target.value)}
                placeholder="e.g. Loser washes both cars and cleans the garage..."
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* STEP 4: DUO-SEAT MEMBERSHIP PASS */}
        {currentStep === 4 && <BillingPanel />}

        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-md">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight">Your Duel preview is ready</h3>
              <p className="text-xs text-zinc-400 mt-1">
                These choices are a preview. Sign in to create your Duel and review billing before purchasing.
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-1">
                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Tenants</div>
                <div className="text-sm font-bold text-zinc-950 dark:text-white truncate">{playerOneName} vs {playerTwoName}</div>
                <div className="text-[11px] text-zinc-500">2-Player Parity Tenancy</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-1">
                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Daily Par Calibration</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">240 Par Equal Target</div>
                <div className="text-[11px] text-zinc-500">{p1Habits.length} habits vs {p2Habits.length} habits</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-1">
                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Sunday Stake</div>
                <div className="text-sm font-bold text-amber-800 dark:text-amber-400 truncate">{effectiveStake}</div>
                <div className="text-[11px] text-zinc-500">Settles Sunday 23:59</div>
              </div>
            </div>

            {/* Share link reminder */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold text-zinc-950 dark:text-white">Partner Link:</span> {inviteUrl || 'Create your Duel after signing in to get a real invitation link.'}
              </div>
              <button
                disabled={!inviteUrl}
                  onClick={copyInviteToClipboard}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-mono text-xs flex items-center gap-1.5 transition-all self-stretch sm:self-auto justify-center"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-white/10">
        <div>
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            onCancel && (
              <button
                onClick={onCancel}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors font-medium"
              >
                Exit
              </button>
            )
          )}
        </div>

        <div>
          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-md"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-emerald-600/20"
            >
              Continue to account and billing <Rocket className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
