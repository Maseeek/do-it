'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Habit, HabitCategory, PlayerId, CheckIn, Player } from '@/lib/types';
import { HabitIcon } from './HabitIcon';
import { ProofGalleryModal } from './ProofGalleryModal';
import { HabitHeatmap } from './HabitHeatmap';
import { TrophyCabinet } from './TrophyCabinet';
import { formatFriendlyDate, getTodayDateString, getWeekKey } from '@/lib/date-utils';
import { SettingsView } from './SettingsView';
import {
  Activity,
  Check,
  ClipboardCopy,
  Clock,
  Download,
  Dumbbell,
  ExternalLink,
  Flame,
  Moon,
  Plus,
  RefreshCw,
  RotateCcw,
  Share2,
  Sliders,
  Trash2,
  Upload,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticSuccess } from '@/lib/haptic-utils';
import { shareScorecardImage } from '@/lib/scorecard-image';
import { useMultiplayer } from '@/lib/multiplayer';
import { HabitOnboarding } from './HabitOnboarding';
import { weeklyPointPotential } from '@/lib/habit-catalog';

export function VaultView({ initialSection = 'stats' }: { initialSection?: 'stats' | 'habits' | 'settings' }) {
  const multiplayer = useMultiplayer();
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
  } = useStore();

  const [activeTab, setActiveTab] = useState<'stats' | 'habits' | 'settings'>(initialSection);
  const [proofFilter, setProofFilter] = useState<'all' | 'maciek' | 'myrna'>('all');
  const [selectedVaultProof, setSelectedVaultProof] = useState<{
    checkIn: CheckIn;
    habit: Habit;
    player: Player;
  } | null>(null);

  // Habit modal
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [habitFormError, setHabitFormError] = useState<string | null>(null);
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
  const [weeklyTargetDays, setWeeklyTargetDays] = useState<number | undefined>(undefined);

  const openEditHabitModal = (h: Habit) => {
    if (multiplayer.configured && h.playerId !== multiplayer.slot) return;
    soundEngine.playClick();
    hapticLight();
    setEditingHabit(h);
    setHabitFormError(null);
    setTargetPlayer(h.playerId);
    setHabitTitle(h.title);
    setHabitDesc(h.description);
    setHabitCategory(h.category);
    setHabitPoints(h.points);
    setHabitIcon(h.iconName);
    setRequiresProof(!!h.requiresProof);
    setIsQuantitative(!!h.isQuantitative);
    setWeeklyTargetDays(h.weeklyTargetDays);
    setIsHabitModalOpen(true);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;
    if (multiplayer.configured && targetPlayer !== multiplayer.slot) return;

    const partnerTotal = weeklyPointPotential(habits.filter(habit => habit.playerId !== targetPlayer));
    const nextTotal = weeklyPointPotential(habits.filter(habit => habit.playerId === targetPlayer).map(habit => habit.id === editingHabit?.id ? { ...habit, points: Number(habitPoints), weeklyTargetDays, frequency: weeklyTargetDays ? 'weekly' : 'daily' } : habit));
    if (partnerTotal > 0 && nextTotal !== partnerTotal) {
      setHabitFormError(`This would change your weekly potential to ${nextTotal} points. Use Edit plan to match your partner’s ${partnerTotal} points.`);
      return;
    }
    if (isQuantitative && Number(habitPoints) > (editingHabit?.maxQuantity || 25) * (editingHabit?.pointsPerUnit || 1)) {
      setHabitFormError('Quantity habits cannot award more than their configured quantity allows.');
      return;
    }

    soundEngine.playCheck();
    hapticSuccess();
    const finalWeeklyTarget = weeklyTargetDays && weeklyTargetDays > 0 ? weeklyTargetDays : undefined;

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
        ...(isQuantitative ? { maxQuantity: editingHabit?.maxQuantity || 25, pointsPerUnit: editingHabit?.pointsPerUnit || 1, quantityUnit: editingHabit?.quantityUnit || "pages" } : {}),
        weeklyTargetDays: finalWeeklyTarget,
        frequency: finalWeeklyTarget ? 'weekly' : 'daily',
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
        ...(isQuantitative ? { maxQuantity: 25, pointsPerUnit: 1, quantityUnit: "pages" } : {}),
        weeklyTargetDays: finalWeeklyTarget,
        frequency: finalWeeklyTarget ? 'weekly' : 'daily',
        order: 99,
        isActive: true,
      });
    }

    setIsHabitModalOpen(false);
  };

  if (showPlanner) return <HabitOnboarding onDone={() => setShowPlanner(false)} />;

  return (
    <div className="space-y-6">
      <div><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Built day by day</p><h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Your vault.</h1><p className="text-sm text-zinc-400 mt-2">Your progress, your habits, your space.</p></div>
      {/* 3-Option Apple Segmented Control */}
      <div role="tablist" aria-label="Vault sections" className="flex p-1 rounded-full bg-[#1c1c1e] border border-white/[0.08]">
        {[
          { id: 'stats', label: 'Stats' },
          { id: 'habits', label: 'Habits' },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              if (activeTab !== tab.id) {
                soundEngine.playClick();
                hapticLight();
                setActiveTab(tab.id as 'stats' | 'habits' | 'settings');
              }
            }}
            className={`flex-1 min-h-10 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. STATS TAB: Karma + Consistency + Badges + Proofs */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Karma Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Maciek */}
            <div className="rounded-2xl bg-[#1c1c1e] border border-blue-500/20 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-zinc-300">{players.maciek.name}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
                {maciekSummary.karma.toLocaleString()}
              </div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Karma</span>

              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-zinc-400">Streak</span>
                <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                  <Flame className="w-3 h-3" />
                  {maciekSummary.currentStreak}d
                </span>
              </div>
            </div>

            {/* Myrna */}
            <div className="rounded-2xl bg-[#1c1c1e] border border-pink-500/20 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-xs font-semibold text-zinc-300">{players.myrna.name}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
                {myrnaSummary.karma.toLocaleString()}
              </div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Karma</span>

              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-zinc-400">Streak</span>
                <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                  <Flame className="w-3 h-3" />
                  {myrnaSummary.currentStreak}d
                </span>
              </div>
            </div>
          </div>

          {/* 12-Week Consistency Matrix */}
          <HabitHeatmap />

          {/* Trophy Cabinet & Badges */}
          <TrophyCabinet />

          {/* Proof Gallery */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Clean Space Proofs</span>

              <div role="tablist" aria-label="Filter clean space proofs" className="flex items-center gap-1 bg-[#2c2c2e] p-0.5 rounded-full text-xs">
                <button
                  role="tab"
                  aria-selected={proofFilter === 'all'}
                  onClick={() => {
                    if (proofFilter !== 'all') {
                      soundEngine.playClick();
                      hapticLight();
                      setProofFilter('all');
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                    proofFilter === 'all' ? 'bg-[#3a3a3c] text-white font-medium' : 'text-zinc-400'
                  }`}
                >
                  All
                </button>
                <button
                  role="tab"
                  aria-selected={proofFilter === 'maciek'}
                  onClick={() => {
                    if (proofFilter !== 'maciek') {
                      soundEngine.playClick();
                      hapticLight();
                      setProofFilter('maciek');
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                    proofFilter === 'maciek' ? 'bg-blue-500/20 text-blue-300 font-medium' : 'text-zinc-400'
                  }`}
                >
                  {players.maciek.name}
                </button>
                <button
                  role="tab"
                  aria-selected={proofFilter === 'myrna'}
                  onClick={() => {
                    if (proofFilter !== 'myrna') {
                      soundEngine.playClick();
                      hapticLight();
                      setProofFilter('myrna');
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                    proofFilter === 'myrna' ? 'bg-pink-500/20 text-pink-300 font-medium' : 'text-zinc-400'
                  }`}
                >
                  {players.myrna.name}
                </button>
              </div>
            </div>

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
                  <div className="text-center py-4 text-xs text-zinc-500">
                    No proof photos uploaded yet.
                  </div>
                );
              }

              return (
                <div className="space-y-3 pt-1">
                  {proofCheckIns.slice(0, 6).map((ci) => {
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
                        className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">
                            {player.name} · {habit.title}
                          </span>
                          <span className="text-zinc-400 text-[11px]">
                            {formatFriendlyDate(ci.date)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {photos.map((photo, pIdx) => (
                            <button
                              key={pIdx}
                              aria-label={`View proof photo ${pIdx + 1} for ${player.name} ${habit.title}`}
                              onClick={() => {
                                soundEngine.playClick();
                                hapticLight();
                                setSelectedVaultProof({ checkIn: ci, habit, player });
                              }}
                              className="relative rounded-xl overflow-hidden aspect-video border border-white/[0.08] hover:border-zinc-400 transition-colors"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo}
                                alt="Proof preview"
                                className="w-full h-full object-cover"
                              />
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
        </div>
      )}

      {/* 2. HABITS TAB: Configure habits */}
      {activeTab === 'habits' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Your point plan</div><p className="text-xs text-zinc-400 mt-1">{weeklyPointPotential(habits.filter(habit => habit.playerId === activePlayer?.id))} possible points per week</p></div><button onClick={() => setShowPlanner(true)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black whitespace-nowrap">Edit plan</button></div>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-300">Habits</span>
            <button
              onClick={() => setShowPlanner(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          {(['maciek', 'myrna'] as PlayerId[]).map((pId) => {
            const playerHabits = habits.filter((h) => h.playerId === pId);
            const totalPoints = weeklyPointPotential(playerHabits);

            return (
              <div key={pId} className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className={`text-xs font-semibold ${
                    pId === 'maciek' ? 'text-blue-400' : 'text-pink-400'
                  }`}>
                    {players[pId].name}
                  </span>
                  <span className="text-[11px] text-zinc-400 tabular-nums">
                    {totalPoints} pts/week possible
                  </span>
                </div>

                <div className="space-y-1.5">
                  {playerHabits.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-zinc-400">
                          <HabitIcon name={h.iconName} className="w-3.5 h-3.5" />
                        </span>
                        <div className="truncate">
                          <div className={`font-medium truncate ${h.isActive ? 'text-white' : 'text-zinc-500'}`}>{h.title}{!h.isActive ? ' · paused' : ''}</div>
                          <div className="text-[10px] text-zinc-400 capitalize">
                            +{h.points} pts {h.weeklyTargetDays ? `· ${h.weeklyTargetDays}x/wk` : ''}
                          </div>
                        </div>
                      </div>

                      {(!multiplayer.configured || pId === multiplayer.slot) && <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditHabitModal(h)}
                          aria-label={`Edit ${h.title}`}
                          className="p-1 rounded text-zinc-400 hover:text-white"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (h.isActive && weeklyPointPotential(habits.filter(habit => habit.playerId !== pId)) > 0) {
                              setShowPlanner(true);
                              return;
                            }
                            if (confirm(`Delete habit "${h.title}"?`)) {
                              soundEngine.playClick();
                              hapticLight();
                              deleteHabit(h.id);
                            }
                          }}
                          aria-label={`Delete ${h.title}`}
                          className="p-1 rounded text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'settings' && <SettingsView onOpenHabitPlanner={() => setShowPlanner(true)} />}

      {/* Habit Modal */}
      {isHabitModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            setIsHabitModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="habit-modal-title"
            className="w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="habit-modal-title" className="text-sm font-semibold text-white">
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsHabitModalOpen(false);
                }}
                aria-label="Close habit dialog"
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-3">
              {habitFormError && <p role="alert" className="text-xs text-amber-300">{habitFormError}</p>}
              {!multiplayer.configured && <div role="radiogroup" aria-label="Target player" className="flex gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={targetPlayer === 'maciek'}
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setTargetPlayer('maciek');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    targetPlayer === 'maciek'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold'
                      : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                  }`}
                >
                  {players.maciek.name}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={targetPlayer === 'myrna'}
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setTargetPlayer('myrna');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    targetPlayer === 'myrna'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 font-semibold'
                      : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                  }`}
                >
                  {players.myrna.name}
                </button>
              </div>}

              <input
                type="text"
                value={habitTitle}
                onChange={(e) => setHabitTitle(e.target.value)}
                placeholder="Title (e.g. Read Books)"
                className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <input
                type="text"
                value={habitDesc}
                onChange={(e) => setHabitDesc(e.target.value)}
                placeholder="Description"
                className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Points</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={habitPoints}
                    onChange={(e) => setHabitPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Category</label>
                  <select
                    value={habitCategory}
                    onChange={(e) => setHabitCategory(e.target.value as HabitCategory)}
                    className="w-full px-2 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
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
                    <option value="finance">Finance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Weekly Target (optional, e.g. 3 or 4 days/wk)</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  placeholder="Daily (leave blank or 0)"
                  value={weeklyTargetDays ?? ''}
                  onChange={(e) => setWeeklyTargetDays(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="space-y-2 pt-1 text-xs text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresProof}
                    onChange={(e) => setRequiresProof(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-blue-500"
                  />
                  <span>Require photo proof</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isQuantitative}
                    onChange={(e) => setIsQuantitative(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-blue-500"
                  />
                  <span>Quantitative (pages)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setIsHabitModalOpen(false);
                  }}
                  className="flex-1 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-medium hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
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
