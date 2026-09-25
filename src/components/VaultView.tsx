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
  Download,
  ExternalLink,
  Flame,
  Plus,
  RefreshCw,
  RotateCcw,
  Sliders,
  Trash2,
  Upload,
  UserCheck,
  Volume2,
  VolumeX,
  X,
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
    wearableConfig,
    syncGoogleHealth,
    testAppleHealthSync,
    disconnectGoogleHealth,
  } = useStore();

  const [activeSection, setActiveSection] = useState<
    'karma' | 'badges' | 'stakes' | 'proofs' | 'habits' | 'wearables' | 'settings'
  >('karma');
  const [proofFilter, setProofFilter] = useState<'all' | 'maciek' | 'myrna'>('all');
  const [selectedVaultProof, setSelectedVaultProof] = useState<{
    checkIn: CheckIn;
    habit: Habit;
    player: Player;
  } | null>(null);

  // Wearables state
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [googleSyncMsg, setGoogleSyncMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [appleSyncMsg, setAppleSyncMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showAppleGuide, setShowAppleGuide] = useState(false);

  // Auto-switch to wearables tab if redirected from Google OAuth
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('wearable_connected') === 'google' || params.get('connected') === 'google') {
        setActiveSection('wearables');
        setGoogleSyncMsg({ text: 'Google Health connected', isError: false });
      } else if (params.get('wearable_error')) {
        setActiveSection('wearables');
        setGoogleSyncMsg({
          text: `Connection notice: ${params.get('wearable_error')}`,
          isError: true,
        });
      }
    }
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importStateFromJson(content);
      if (res.success) {
        setImportStatus({ message: 'Backup restored', isError: false });
      } else {
        setImportStatus({ message: res.error || 'Restore failed', isError: true });
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyScorecard = () => {
    const today = getTodayDateString();
    const weekKey = getWeekKey(today);
    const leader =
      maciekSummary.weekly > myrnaSummary.weekly
        ? 'Maciek'
        : myrnaSummary.weekly > maciekSummary.weekly
        ? 'Myrna'
        : 'Tied';
    const delta = Math.abs(maciekSummary.weekly - myrnaSummary.weekly);

    const scorecard = `DO IT — Weekly Scorecard (${weekKey})
Maciek: ${maciekSummary.weekly} pts (${maciekSummary.currentStreak}d streak)
Myrna: ${myrnaSummary.weekly} pts (${myrnaSummary.currentStreak}d streak)
Leader: ${leader} (+${delta} pts)
Active Wager: ${activeWeeklyStake ? activeWeeklyStake.title : 'None'}
Karma: Maciek ${maciekSummary.karma} | Myrna ${myrnaSummary.karma}`;

    navigator.clipboard.writeText(scorecard).then(() => {
      setCopiedScorecard(true);
      setTimeout(() => setCopiedScorecard(false), 2500);
    });
  };

  const SECTIONS = [
    { id: 'karma', label: 'Karma' },
    { id: 'badges', label: 'Badges' },
    { id: 'stakes', label: 'Wagers' },
    { id: 'proofs', label: 'Proofs' },
    { id: 'habits', label: 'Habits' },
    { id: 'wearables', label: 'Health' },
    { id: 'settings', label: 'Settings' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Apple Segmented Control Bar */}
      <div className="flex p-1 rounded-full bg-[#1c1c1e] border border-white/[0.08] overflow-x-auto no-scrollbar">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeSection === sec.id
                ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* KARMA STATS & HEATMAP */}
      {activeSection === 'karma' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Maciek */}
            <div className="rounded-2xl bg-[#1c1c1e] border border-blue-500/20 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-zinc-300">Maciek</span>
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
                <span className="text-xs font-semibold text-zinc-300">Myrna</span>
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

          {/* 12-Week Heatmap */}
          <HabitHeatmap />
        </div>
      )}

      {/* TROPHY CABINET & BADGES */}
      {activeSection === 'badges' && <TrophyCabinet />}

      {/* STAKES & WAGERS */}
      {activeSection === 'stakes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-300">Active Wagers</span>
            <button
              onClick={() => openNewStakeModal('weekly')}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          <div className="space-y-2">
            {stakes
              .filter((s) => s.status === 'active')
              .map((stake) => (
                <div
                  key={stake.id}
                  className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">
                      {stake.period} Wager
                    </span>
                    <h4 className="text-sm font-semibold text-white mt-0.5 truncate">{stake.title}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{stake.description}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditStakeModal(stake)}
                      className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Edit wager"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteStake(stake.id)}
                      className="p-1.5 rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                      title="Delete wager"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* PROOF VAULT */}
      {activeSection === 'proofs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-300">Clean Space Proofs</span>

            <div className="flex items-center gap-1 bg-[#1c1c1e] border border-white/[0.08] p-0.5 rounded-full text-xs">
              <button
                onClick={() => setProofFilter('all')}
                className={`px-2.5 py-0.5 rounded-full transition-colors ${
                  proofFilter === 'all' ? 'bg-[#2c2c2e] text-white font-medium' : 'text-zinc-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setProofFilter('maciek')}
                className={`px-2.5 py-0.5 rounded-full transition-colors ${
                  proofFilter === 'maciek' ? 'bg-blue-500/20 text-blue-300 font-medium' : 'text-zinc-400'
                }`}
              >
                Maciek
              </button>
              <button
                onClick={() => setProofFilter('myrna')}
                className={`px-2.5 py-0.5 rounded-full transition-colors ${
                  proofFilter === 'myrna' ? 'bg-pink-500/20 text-pink-300 font-medium' : 'text-zinc-400'
                }`}
              >
                Myrna
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
                <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-8 text-center text-zinc-400">
                  <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">No proof photos uploaded</p>
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
                      className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-3.5 space-y-2"
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
                            onClick={() => setSelectedVaultProof({ checkIn: ci, habit, player })}
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
      )}

      {/* HABIT MANAGER */}
      {activeSection === 'habits' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-300">Habits</span>
            <button
              onClick={openNewHabitModal}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          {(['maciek', 'myrna'] as PlayerId[]).map((pId) => {
            const playerHabits = habits.filter((h) => h.playerId === pId);
            const totalPoints = playerHabits.reduce((acc, h) => acc + h.points, 0);

            return (
              <div key={pId} className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className={`text-xs font-semibold ${
                    pId === 'maciek' ? 'text-blue-400' : 'text-pink-400'
                  }`}>
                    {pId === 'maciek' ? 'Maciek' : 'Myrna'}
                  </span>
                  <span className="text-[11px] text-zinc-400 tabular-nums">
                    {totalPoints} pts / day
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
                          <div className="font-medium text-white truncate">{h.title}</div>
                          <div className="text-[10px] text-zinc-400 capitalize">
                            +{h.points} pts {h.weeklyTargetDays ? `· ${h.weeklyTargetDays}x/wk` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditHabitModal(h)}
                          className="p-1 rounded text-zinc-400 hover:text-white"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteHabit(h.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400"
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

      {/* WEARABLES & HEALTH */}
      {activeSection === 'wearables' && (
        <div className="space-y-3">
          {/* Maciek: Google Health */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Maciek · Google Health</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Automated workout and sleep tracking</div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                wearableConfig?.googleConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
              }`}>
                {wearableConfig?.googleConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {googleSyncMsg && (
              <div className={`p-2.5 rounded-xl text-xs ${
                googleSyncMsg.isError ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
              }`}>
                {googleSyncMsg.text}
              </div>
            )}

            <div className="flex gap-2">
              {!wearableConfig?.googleConnected ? (
                <>
                  <a
                    href="/api/auth/google"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Connect Google</span>
                  </a>
                  <button
                    onClick={async () => {
                      setIsSyncingGoogle(true);
                      setGoogleSyncMsg(null);
                      const res = await syncGoogleHealth(true);
                      setIsSyncingGoogle(false);
                      setGoogleSyncMsg({ text: res.message, isError: !res.success });
                    }}
                    disabled={isSyncingGoogle}
                    className="px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
                  >
                    Test Sync
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      setIsSyncingGoogle(true);
                      setGoogleSyncMsg(null);
                      const res = await syncGoogleHealth(false);
                      setIsSyncingGoogle(false);
                      setGoogleSyncMsg({ text: res.message, isError: !res.success });
                    }}
                    disabled={isSyncingGoogle}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-400 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
                    <span>Sync Today</span>
                  </button>
                  <button
                    onClick={() => {
                      disconnectGoogleHealth();
                      setGoogleSyncMsg({ text: 'Disconnected', isError: false });
                    }}
                    className="px-3 py-2 rounded-xl border border-white/[0.08] text-xs text-zinc-400 hover:text-red-400"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Myrna: Apple Health */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Myrna · Apple Health</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Automated iOS Shortcuts webhook</div>
              </div>
              <span className="text-[10px] font-medium text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">
                Ready
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/api/sync/apple-health`
                    : 'https://do-it-app.vercel.app/api/sync/apple-health'
                }
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-zinc-300 text-[11px] font-mono select-all"
              />
              <button
                onClick={() => {
                  const url = `${window.location.origin}/api/sync/apple-health`;
                  navigator.clipboard.writeText(url).then(() => {
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors flex items-center gap-1"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {appleSyncMsg && (
              <div className={`p-2 rounded-xl text-xs ${
                appleSyncMsg.isError ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
              }`}>
                {appleSyncMsg.text}
              </div>
            )}

            {/* Test buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={async () => {
                  setAppleSyncMsg(null);
                  const res = await testAppleHealthSync('sleep', 8.5);
                  setAppleSyncMsg({ text: res.message, isError: !res.success });
                }}
                className="py-1.5 px-2 rounded-xl bg-[#2c2c2e] text-[11px] font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                Sleep 8.5h
              </button>
              <button
                onClick={async () => {
                  setAppleSyncMsg(null);
                  const res = await testAppleHealthSync('running', 5.0);
                  setAppleSyncMsg({ text: res.message, isError: !res.success });
                }}
                className="py-1.5 px-2 rounded-xl bg-[#2c2c2e] text-[11px] font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                5km Run
              </button>
              <button
                onClick={async () => {
                  setAppleSyncMsg(null);
                  const res = await testAppleHealthSync('gym', 50);
                  setAppleSyncMsg({ text: res.message, isError: !res.success });
                }}
                className="py-1.5 px-2 rounded-xl bg-[#2c2c2e] text-[11px] font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                Gym
              </button>
            </div>

            {/* Guide toggle */}
            <div className="pt-1 border-t border-white/[0.06]">
              <button
                onClick={() => setShowAppleGuide(!showAppleGuide)}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                {showAppleGuide ? 'Hide Shortcuts Guide' : 'How to setup iOS Shortcut'}
              </button>

              {showAppleGuide && (
                <div className="mt-2 p-3 rounded-xl bg-[#2c2c2e] text-xs text-zinc-300 space-y-1.5">
                  <p>1. Open Shortcuts app on iPhone &rarr; Automation tab &rarr; New Automation.</p>
                  <p>2. Trigger: When wake-up alarm stops or workout ends.</p>
                  <p>3. Action: &ldquo;Get Contents of URL&rdquo; (POST to webhook URL with JSON: <code>&#123;&quot;player&quot;: &quot;myrna&quot;, &quot;metric&quot;: &quot;sleep&quot;, &quot;value&quot;: 8.5&#125;</code>).</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeSection === 'settings' && (
        <div className="space-y-3">
          {/* Active Profile */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Active Profile</div>
              <div className="text-xs text-zinc-400 mt-0.5">{activePlayer?.name}</div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => selectProfile(activePlayer?.id === 'maciek' ? 'myrna' : 'maciek')}
                className="px-3 py-1.5 rounded-full bg-[#2c2c2e] border border-white/[0.08] text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                Switch to {activePlayer?.id === 'maciek' ? 'Myrna' : 'Maciek'}
              </button>
              <button
                onClick={switchProfile}
                className="px-3 py-1.5 rounded-full border border-white/[0.08] text-xs text-zinc-400 hover:text-white"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
              <span className="text-xs font-semibold text-white">Sound Effects</span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-[#2c2c2e] border-white/[0.08] text-zinc-500'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Scorecard Copy */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Scorecard Summary</div>
              <div className="text-[11px] text-zinc-400">Copy text for messages</div>
            </div>
            <button
              onClick={handleCopyScorecard}
              className="px-3 py-1.5 rounded-full bg-[#2c2c2e] border border-white/[0.08] text-xs font-medium text-white hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
            >
              {copiedScorecard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
              <span>{copiedScorecard ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Backup / Export */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-2.5">
            <div className="text-xs font-semibold text-white">Data Backup</div>
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
                className="flex-1 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-xs font-medium text-white hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Backup</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-xs font-medium text-white hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Backup</span>
              </button>
            </div>
            {importStatus && (
              <p className={`text-xs ${importStatus.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                {importStatus.message}
              </p>
            )}
          </div>

          {/* Supabase Sync */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
            <div className="text-xs font-semibold text-white">Cloud Sync (Supabase)</div>
            <form onSubmit={handleSaveSupabase} className="space-y-2">
              <input
                type="url"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-1.5 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              />
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="Anon API Key"
                className="w-full px-3 py-1.5 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
              >
                {sbSaved ? 'Saved' : 'Save Credentials'}
              </button>
            </form>
          </div>

          {/* Reset */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Reset Habits & Data</div>
              <div className="text-[11px] text-zinc-500">Restore default seed state</div>
            </div>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1.5 rounded-full border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Habit Modal (Apple Sheet style) */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <button onClick={() => setIsHabitModalOpen(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetPlayer('maciek')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    targetPlayer === 'maciek'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold'
                      : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                  }`}
                >
                  Maciek
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPlayer('myrna')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    targetPlayer === 'myrna'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 font-semibold'
                      : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                  }`}
                >
                  Myrna
                </button>
              </div>

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
                  </select>
                </div>
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
                  onClick={() => setIsHabitModalOpen(false)}
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

      {/* Stake Modal (Apple Sheet style) */}
      {isStakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {editingStake ? 'Edit Wager' : 'New Wager'}
              </h3>
              <button onClick={() => setIsStakeModalOpen(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStake} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStakePeriod('weekly')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    stakePeriod === 'weekly'
                      ? 'bg-zinc-700 text-white border-zinc-600 font-semibold'
                      : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setStakePeriod('monthly')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    stakePeriod === 'monthly'
                      ? 'bg-zinc-700 text-white border-zinc-600 font-semibold'
                      : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                  }`}
                >
                  Monthly
                </button>
              </div>

              <input
                type="text"
                value={stakeTitle}
                onChange={(e) => setStakeTitle(e.target.value)}
                placeholder="Title (e.g. Sunday Dinner Date)"
                className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <textarea
                value={stakeDesc}
                onChange={(e) => setStakeDesc(e.target.value)}
                rows={2}
                placeholder="Terms and stakes"
                className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsStakeModalOpen(false)}
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
