'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Habit, HabitCategory, PlayerId, Stake, StakePeriod } from '@/lib/types';
import { HabitIcon } from './HabitIcon';
import { getMonthKey, getTodayDateString, getWeekKey } from '@/lib/date-utils';
import {
  Award,
  CheckCircle2,
  Cloud,
  Flame,
  Gift,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';

export function VaultView() {
  const {
    activePlayer,
    maciekSummary,
    myrnaSummary,
    habits,
    addHabit,
    updateHabit,
    deleteHabit,
    stakes,
    addStake,
    updateStake,
    switchProfile,
    selectProfile,
    resetToDefaults,
    updateSupabaseConfig,
  } = useStore();

  const [activeSection, setActiveSection] = useState<'karma' | 'stakes' | 'habits' | 'settings'>('karma');

  // Habit modal
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Form state for habits
  const [targetPlayer, setTargetPlayer] = useState<PlayerId>(activePlayer?.id || 'maciek');
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitCategory, setHabitCategory] = useState<HabitCategory>('physical');
  const [habitPoints, setHabitPoints] = useState(25);
  const [habitIcon, setHabitIcon] = useState('Activity');
  const [requiresProof, setRequiresProof] = useState(false);
  const [isQuantitative, setIsQuantitative] = useState(false);

  // Stake modal
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [editingStake, setEditingStake] = useState<Stake | null>(null);
  const [stakePeriod, setStakePeriod] = useState<StakePeriod>('weekly');
  const [stakeTitle, setStakeTitle] = useState('');
  const [stakeDesc, setStakeDesc] = useState('');

  // Supabase settings
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [sbSaved, setSbSaved] = useState(false);

  // Handlers for habits
  const openNewHabitModal = () => {
    setEditingHabit(null);
    setTargetPlayer(activePlayer?.id || 'maciek');
    setHabitTitle('');
    setHabitDesc('');
    setHabitCategory('physical');
    setHabitPoints(25);
    setHabitIcon('Activity');
    setRequiresProof(false);
    setIsQuantitative(false);
    setIsHabitModalOpen(true);
  };

  const openEditHabitModal = (h: Habit) => {
    setEditingHabit(h);
    setTargetPlayer(h.playerId);
    setHabitTitle(h.title);
    setHabitDesc(h.description);
    setHabitCategory(h.category);
    setHabitPoints(h.points);
    setHabitIcon(h.iconName);
    setRequiresProof(!!h.requiresProof);
    setIsQuantitative(!!h.isQuantitative);
    setIsHabitModalOpen(true);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    if (editingHabit) {
      updateHabit({
        ...editingHabit,
        playerId: targetPlayer,
        title: habitTitle,
        description: habitDesc,
        category: habitCategory,
        points: Number(habitPoints),
        iconName: habitIcon,
        requiresProof,
        isQuantitative,
      });
    } else {
      addHabit({
        playerId: targetPlayer,
        title: habitTitle,
        description: habitDesc,
        category: habitCategory,
        points: Number(habitPoints),
        iconName: habitIcon,
        requiresProof,
        isQuantitative,
        order: 99,
        isActive: true,
      });
    }

    setIsHabitModalOpen(false);
  };

  // Handlers for stakes
  const openNewStakeModal = (period: StakePeriod = 'weekly') => {
    setEditingStake(null);
    setStakePeriod(period);
    setStakeTitle('');
    setStakeDesc('');
    setIsStakeModalOpen(true);
  };

  const handleSaveStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeTitle.trim()) return;

    const today = getTodayDateString();
    const periodKey = stakePeriod === 'weekly' ? getWeekKey(today) : getMonthKey(today);

    if (editingStake) {
      updateStake({
        ...editingStake,
        title: stakeTitle,
        description: stakeDesc,
        period: stakePeriod,
      });
    } else {
      addStake({
        period: stakePeriod,
        periodKey,
        title: stakeTitle,
        description: stakeDesc,
        status: 'active',
        dueDate: today,
      });
    }

    setIsStakeModalOpen(false);
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig({
      url: sbUrl,
      anonKey: sbKey,
      enabled: !!(sbUrl && sbKey),
    });
    setSbSaved(true);
    setTimeout(() => setSbSaved(false), 3000);
  };

  const STAKE_PRESETS = [
    { title: 'Sunday Dinner Date 🍕', description: 'Winner chooses favorite restaurant, loser pays.' },
    { title: 'Breakfast in Bed for a Week ☕', description: 'Loser prepares coffee & breakfast every morning.' },
    { title: 'Full Body Massage 💆‍♂️', description: '60-minute relaxing massage given by the loser.' },
    { title: 'Cinema & Takeaway Night 🎬', description: 'Winner picks the movie, cuisine, and snacks.' },
    { title: 'Spa & Thermal Bath Day 🧖‍♀️', description: 'Grand monthly reward: Luxury relaxation day.' },
  ];

  return (
    <div className="space-y-5 pb-24">
      {/* Sub-nav switcher */}
      <div className="flex p-1 rounded-xl bg-zinc-900 border border-zinc-800">
        <button
          onClick={() => setActiveSection('karma')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            activeSection === 'karma' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Karma
        </button>
        <button
          onClick={() => setActiveSection('stakes')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            activeSection === 'stakes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Stakes
        </button>
        <button
          onClick={() => setActiveSection('habits')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            activeSection === 'habits' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Habits
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            activeSection === 'settings' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Settings
        </button>
      </div>

      {/* KARMA STATS */}
      {activeSection === 'karma' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Maciek */}
            <div className="rounded-2xl bg-[#0e1013] border border-blue-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-zinc-300">Maciek</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {maciekSummary.karma.toLocaleString()}
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Lifetime Karma</span>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Current Streak</span>
                  <span className="text-amber-400 flex items-center gap-1 font-bold">
                    <Flame className="w-3 h-3" />
                    {maciekSummary.currentStreak}d
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Week Consistency</span>
                  <span className="text-white font-medium">{maciekSummary.completionRateWeekly}%</span>
                </div>
              </div>
            </div>

            {/* Myrna */}
            <div className="rounded-2xl bg-[#0e1013] border border-pink-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-zinc-300">Myrna</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {myrnaSummary.karma.toLocaleString()}
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Lifetime Karma</span>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Current Streak</span>
                  <span className="text-amber-400 flex items-center gap-1 font-bold">
                    <Flame className="w-3 h-3" />
                    {myrnaSummary.currentStreak}d
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Week Consistency</span>
                  <span className="text-white font-medium">{myrnaSummary.completionRateWeekly}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono mb-2">
              Non-Spendable Lifetime Karma
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every habit completed awards permanent Karma. While your weekly and monthly scores reset
              to determine who wins dinner dates and wagers, your Karma stands as a testament to your
              long-term discipline and never diminishes.
            </p>
          </div>
        </div>
      )}

      {/* STAKES & WAGERS */}
      {activeSection === 'stakes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-white">Stakes & Rewards</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Wagers for the weekly and monthly duels
              </p>
            </div>
            <button
              onClick={() => openNewStakeModal('weekly')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Set Wager
            </button>
          </div>

          {/* Active stakes list */}
          <div className="space-y-2.5">
            {stakes
              .filter((s) => s.status === 'active')
              .map((stake) => (
                <div
                  key={stake.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    stake.period === 'monthly'
                      ? 'bg-gradient-to-b from-[#161219] to-[#0d0e11] border-pink-500/20 shadow-md'
                      : 'bg-gradient-to-b from-[#12141a] to-[#0c0d10] border-zinc-800/90 shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                          stake.period === 'monthly'
                            ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {stake.period === 'monthly' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : (
                          <Trophy className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                            stake.period === 'monthly'
                              ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {stake.period} Wager
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">{stake.title}</h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{stake.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Wager Presets */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-zinc-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Preset Stakes Ideas
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {STAKE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setStakeTitle(preset.title);
                    setStakeDesc(preset.description);
                    setIsStakeModalOpen(true);
                  }}
                  className="text-left p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900 transition-all text-xs group"
                >
                  <div className="font-semibold text-zinc-200 group-hover:text-white">
                    {preset.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HABIT MANAGER */}
      {activeSection === 'habits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-white">Habit Parity & Goals</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Adjust points & habits as your goals evolve
              </p>
            </div>
            <button
              onClick={openNewHabitModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Habit
            </button>
          </div>

          {/* Grouped by player */}
          {(['maciek', 'myrna'] as PlayerId[]).map((pId) => {
            const playerHabits = habits.filter((h) => h.playerId === pId);
            const totalPoints = playerHabits.reduce((acc, h) => acc + h.points, 0);

            return (
              <div key={pId} className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                  <span className={`text-xs font-bold font-mono uppercase ${
                    pId === 'maciek' ? 'text-blue-400' : 'text-pink-400'
                  }`}>
                    {pId === 'maciek' ? '⚡ Maciek' : '✨ Myrna'} Habits
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                    Total: {totalPoints} pts / day
                  </span>
                </div>

                <div className="space-y-1.5">
                  {playerHabits.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <HabitIcon name={h.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="font-medium text-white truncate">{h.title}</div>
                          <div className="text-[10px] text-zinc-400 font-mono capitalize">
                            {h.category.replace('_', ' ')} • +{h.points} pts
                            {h.weeklyTargetDays ? ` • ${h.weeklyTargetDays}x/wk` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditHabitModal(h)}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteHabit(h.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SETTINGS */}
      {activeSection === 'settings' && (
        <div className="space-y-4">
          {/* Active Profile Switcher */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono mb-2">
              Device Profile Identity
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Current active player on this device:{' '}
              <span className="text-white font-bold">{activePlayer?.name}</span>
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => selectProfile(activePlayer?.id === 'maciek' ? 'myrna' : 'maciek')}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Switch to {activePlayer?.id === 'maciek' ? 'Myrna ✨' : 'Maciek ⚡'}
              </button>
              <button
                onClick={switchProfile}
                className="px-3 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Supabase Cloud Sync */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4.5">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Supabase Real-Time Cloud Sync
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              Connect to your free Supabase PostgreSQL database for real-time live synchronization
              across both your phones. (Optional: runs locally offline without this).
            </p>

            <form onSubmit={handleSaveSupabase} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Anon API Key
                </label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 transition-colors"
              >
                {sbSaved ? '✓ Cloud Sync Saved!' : 'Save Supabase Credentials'}
              </button>
            </form>
          </div>

          {/* Reset Baseline Data */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-white">Reset Default Habits & Data</div>
                <div className="text-[11px] text-zinc-500">Restore factory baseline seed state</div>
              </div>
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habit Modal */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">
                {editingHabit ? 'Edit Habit' : 'Create New Habit'}
              </h3>
              <button
                onClick={() => setIsHabitModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Assign To Player
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetPlayer('maciek')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      targetPlayer === 'maciek'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    ⚡ Maciek
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPlayer('myrna')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      targetPlayer === 'myrna'
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    ✨ Myrna
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Habit Title
                </label>
                <input
                  type="text"
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g. Read Books"
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={habitDesc}
                  onChange={(e) => setHabitDesc(e.target.value)}
                  placeholder="e.g. 1 point per page read"
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                    Points (Max)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={habitPoints}
                    onChange={(e) => setHabitPoints(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={habitCategory}
                    onChange={(e) => setHabitCategory(e.target.value as HabitCategory)}
                    className="w-full px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-500"
                  >
                    <option value="foundation">Foundation</option>
                    <option value="physical">Physical</option>
                    <option value="cardio">Cardio</option>
                    <option value="mind">Mind</option>
                    <option value="intellect">Intellect</option>
                    <option value="skills">Skills</option>
                    <option value="deep_work">Deep Work</option>
                    <option value="language">Language</option>
                    <option value="nutrition">Nutrition</option>
                    <option value="environment">Environment</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reqProof"
                    checked={requiresProof}
                    onChange={(e) => setRequiresProof(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-800 text-blue-500 focus:ring-0"
                  />
                  <label htmlFor="reqProof" className="text-xs text-zinc-300">
                    Require photo proof upload on check-in
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isQuant"
                    checked={isQuantitative}
                    onChange={(e) => setIsQuantitative(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-800 text-blue-500 focus:ring-0"
                  />
                  <label htmlFor="isQuant" className="text-xs text-zinc-300">
                    Quantitative (1 pt per unit, e.g. pages read)
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsHabitModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-medium hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stake Modal */}
      {isStakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Set New Wager / Stake</h3>
              <button
                onClick={() => setIsStakeModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStake} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Timeframe
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStakePeriod('weekly')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      stakePeriod === 'weekly'
                        ? 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setStakePeriod('monthly')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      stakePeriod === 'monthly'
                        ? 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    Monthly (Grand Prize)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Stake / Reward Title
                </label>
                <input
                  type="text"
                  value={stakeTitle}
                  onChange={(e) => setStakeTitle(e.target.value)}
                  placeholder="e.g. Sunday Dinner Date 🍕"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Terms & Stakes
                </label>
                <textarea
                  value={stakeDesc}
                  onChange={(e) => setStakeDesc(e.target.value)}
                  rows={2}
                  placeholder="Winner chooses restaurant, loser buys dinner!"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStakeModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-medium hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200"
                >
                  Save Wager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
