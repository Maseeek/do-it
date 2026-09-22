'use client';

import React, { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Habit, HabitCategory, PlayerId, Stake, StakePeriod, CheckIn, Player } from '@/lib/types';
import { HabitIcon } from './HabitIcon';
import { ProofGalleryModal } from './ProofGalleryModal';
import { HabitHeatmap } from './HabitHeatmap';
import { TrophyCabinet } from './TrophyCabinet';
import { formatFriendlyDate, getMonthKey, getTodayDateString, getWeekKey } from '@/lib/date-utils';
import {
  Camera,
  Check,
  ClipboardCopy,
  Cloud,
  Download,
  Flame,
  Gift,
  Plus,
  RotateCcw,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserCheck,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

export function VaultView() {
  const {
    activePlayer,
    maciekSummary,
    myrnaSummary,
    habits,
    checkIns,
    players,
    addHabit,
    updateHabit,
    deleteHabit,
    stakes,
    addStake,
    updateStake,
    deleteStake,
    switchProfile,
    selectProfile,
    resetToDefaults,
    updateSupabaseConfig,
    soundEnabled,
    setSoundEnabled,
    exportStateToJson,
    importStateFromJson,
    activeWeeklyStake,
  } = useStore();

  const [activeSection, setActiveSection] = useState<'karma' | 'badges' | 'stakes' | 'proofs' | 'habits' | 'settings'>('karma');
  const [proofFilter, setProofFilter] = useState<'all' | 'maciek' | 'myrna'>('all');
  const [selectedVaultProof, setSelectedVaultProof] = useState<{
    checkIn: CheckIn;
    habit: Habit;
    player: Player;
  } | null>(null);

  // Scorecard copy alert
  const [copiedScorecard, setCopiedScorecard] = useState(false);
  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const openEditStakeModal = (stake: Stake) => {
    setEditingStake(stake);
    setStakePeriod(stake.period);
    setStakeTitle(stake.title);
    setStakeDesc(stake.description);
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

  // JSON Export Handler
  const handleExportJson = () => {
    const jsonStr = exportStateToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `do-it-backup-${getTodayDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON Import Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importStateFromJson(content);
      if (res.success) {
        setImportStatus({ message: 'Backup restored successfully!', isError: false });
      } else {
        setImportStatus({ message: res.error || 'Failed to restore backup', isError: true });
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Copy Weekly Scorecard
  const handleCopyScorecard = () => {
    const today = getTodayDateString();
    const weekKey = getWeekKey(today);
    const leader =
      maciekSummary.weekly > myrnaSummary.weekly
        ? 'Maciek ⚡'
        : myrnaSummary.weekly > maciekSummary.weekly
        ? 'Myrna ✨'
        : 'Tied 🤝';
    const delta = Math.abs(maciekSummary.weekly - myrnaSummary.weekly);

    const scorecard = `⚡ DO IT — COUPLES HABIT SCORECARD ⚡
Week: ${weekKey} (${today})
━━━━━━━━━━━━━━━━━━
Maciek ⚡: ${maciekSummary.weekly} pts (${maciekSummary.currentStreak}d streak)
Myrna ✨: ${myrnaSummary.weekly} pts (${myrnaSummary.currentStreak}d streak)
Leader: ${leader} (+${delta} pts)
Active Stake: ${activeWeeklyStake ? activeWeeklyStake.title : 'None set'}
━━━━━━━━━━━━━━━━━━
Lifetime Karma: Maciek ${maciekSummary.karma} | Myrna ${myrnaSummary.karma}`;

    navigator.clipboard.writeText(scorecard).then(() => {
      setCopiedScorecard(true);
      setTimeout(() => setCopiedScorecard(false), 3000);
    });
  };

  const STAKE_PRESETS = [
    { title: 'Sunday Dinner Date 🍕', description: 'Winner chooses favorite restaurant, loser pays.' },
    { title: 'Breakfast in Bed for a Week ☕', description: 'Loser prepares coffee & breakfast every morning.' },
    { title: 'Full Body Massage 💆‍♂️', description: '60-minute relaxing massage given by the loser.' },
    { title: 'Cinema & Takeaway Night 🎬', description: 'Winner picks the movie, cuisine, and snacks.' },
    { title: 'Spa & Thermal Bath Day 🧖‍♀️', description: 'Grand monthly reward: Luxury relaxation day.' },
  ];

  return (
    <div className="space-y-4 pb-24">
      {/* Sub-nav switcher: 6 sections */}
      <div className="flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSection('karma')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'karma' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Karma
        </button>
        <button
          onClick={() => setActiveSection('badges')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'badges' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Badges 🏆
        </button>
        <button
          onClick={() => setActiveSection('stakes')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'stakes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Stakes
        </button>
        <button
          onClick={() => setActiveSection('proofs')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'proofs' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Proofs
        </button>
        <button
          onClick={() => setActiveSection('habits')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'habits' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Habits
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'settings' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Settings
        </button>
      </div>

      {/* KARMA STATS & HEATMAP */}
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

          {/* 12-Week Consistency Matrix */}
          <HabitHeatmap />

          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
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

      {/* TROPHY CABINET & BADGES */}
      {activeSection === 'badges' && <TrophyCabinet />}

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
                    <div className="flex items-start gap-3 flex-1 min-w-0">
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

                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                            stake.period === 'monthly'
                              ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {stake.period} Wager
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5 truncate">{stake.title}</h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{stake.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditStakeModal(stake)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
                        title="Edit wager"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteStake(stake.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 transition-colors"
                        title="Delete wager"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

      {/* PROOF VAULT */}
      {activeSection === 'proofs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-white">Proof Gallery</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Clean Space photo evidence & accountability
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs font-mono">
              <button
                onClick={() => setProofFilter('all')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  proofFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setProofFilter('maciek')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  proofFilter === 'maciek' ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ⚡ Maciek
              </button>
              <button
                onClick={() => setProofFilter('myrna')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  proofFilter === 'myrna' ? 'bg-pink-500/20 text-pink-300' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ✨ Myrna
              </button>
            </div>
          </div>

          {/* List of check-ins with proof */}
          {(() => {
            const proofCheckIns = checkIns
              .filter((c) => (c.proofUrls && c.proofUrls.length > 0) || c.proofUrl)
              .filter((c) => proofFilter === 'all' || c.playerId === proofFilter)
              .sort(
                (a, b) =>
                  new Date(b.completedAt || b.date).getTime() -
                  new Date(a.completedAt || a.date).getTime()
              );

            if (proofCheckIns.length === 0) {
              return (
                <div className="rounded-2xl border border-zinc-800 bg-[#0c0d10] p-8 text-center text-zinc-400">
                  <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">No proof photos found</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Upload photos when checking in Clean Space to view them in the gallery.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {proofCheckIns.map((ci) => {
                  const habit = habits.find((h) => h.id === ci.habitId);
                  const player = players[ci.playerId];
                  const photos =
                    ci.proofUrls && ci.proofUrls.length > 0
                      ? ci.proofUrls
                      : ci.proofUrl
                      ? [ci.proofUrl]
                      : [];

                  if (!habit || !player || photos.length === 0) return null;

                  return (
                    <div
                      key={ci.id}
                      className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{player.avatar}</span>
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {player.name} • {habit.title}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {formatFriendlyDate(ci.date)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedVaultProof({ checkIn: ci, habit, player })}
                          className="text-[10px] font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2.5 py-0.5 rounded-full transition-colors flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3 text-emerald-400" />
                          <span>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>
                        </button>
                      </div>

                      {/* Photo thumbnails grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => setSelectedVaultProof({ checkIn: ci, habit, player })}
                            className="relative rounded-xl overflow-hidden aspect-video border border-zinc-800 hover:border-zinc-500 transition-colors group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo}
                              alt={`${player.name}'s proof photo ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-mono px-1 rounded">
                              #{pIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono mb-2">
              Device Profile Identity
            </h3>
            <p className="text-xs text-zinc-400 mb-3">
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

          {/* Tactile Audio Sound Engine */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  )}
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                    Tactile Audio Sound Engine
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Synthesized mechanical clicks and victory fanfare
                </p>
              </div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-colors ${
                  soundEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>
          </div>

          {/* Weekly Scorecard Export */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                  Weekly Duel Scorecard
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Copy formatted summary for iMessage / WhatsApp
                </p>
              </div>
              <button
                onClick={handleCopyScorecard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white hover:bg-zinc-800 transition-colors"
              >
                {copiedScorecard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                <span>{copiedScorecard ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Backup & Restore Sovereignty */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4 space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                Data Sovereignty & Backups
              </h3>
              <p className="text-[11px] text-zinc-400">
                Export or import full JSON data between devices
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>
            </div>

            {importStatus && (
              <p
                className={`text-xs font-mono ${
                  importStatus.isError ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {importStatus.message}
              </p>
            )}
          </div>

          {/* iOS Shortcuts & Automations Info */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                iOS Shortcuts & Siri Automation
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You can trigger quick logging from an iOS Shortcut widget or Siri by opening the app URL.
              PWA installation supports full standalone execution.
            </p>
          </div>

          {/* Supabase Cloud Sync */}
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
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
          <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
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
              <h3 className="text-sm font-bold text-white">
                {editingStake ? `Edit ${editingStake.period === 'monthly' ? 'Monthly' : 'Weekly'} Wager` : 'Set New Wager / Stake'}
              </h3>
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

              <div className="flex items-center gap-2 pt-2">
                {editingStake && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteStake(editingStake.id);
                      setIsStakeModalOpen(false);
                    }}
                    className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                    title="Delete this wager"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
                  {editingStake ? 'Update Wager' : 'Save Wager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vault Proof Gallery Lightbox Modal */}
      {selectedVaultProof && (
        <ProofGalleryModal
          isOpen={selectedVaultProof !== null}
          onClose={() => setSelectedVaultProof(null)}
          playerName={selectedVaultProof.player.name}
          playerAvatar={selectedVaultProof.player.avatar}
          habitTitle={selectedVaultProof.habit.title}
          images={
            selectedVaultProof.checkIn.proofUrls && selectedVaultProof.checkIn.proofUrls.length > 0
              ? selectedVaultProof.checkIn.proofUrls
              : selectedVaultProof.checkIn.proofUrl
              ? [selectedVaultProof.checkIn.proofUrl]
              : []
          }
          date={selectedVaultProof.checkIn.date}
          completedAt={selectedVaultProof.checkIn.completedAt}
        />
      )}
    </div>
  );
}
