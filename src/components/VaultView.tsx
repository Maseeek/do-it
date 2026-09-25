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
  ExternalLink,
  Flame,
  Gift,
  Plus,
  RefreshCw,
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
  Watch,
  X,
  Zap,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticMedium } from '@/lib/haptic-utils';

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
        setGoogleSyncMsg({ text: 'Google Health connected successfully! ⚡', isError: false });
      } else if (params.get('wearable_error')) {
        setActiveSection('wearables');
        setGoogleSyncMsg({
          text: `Google connection notice: ${params.get('wearable_error')}`,
          isError: true,
        });
      }
    }
  }, []);

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
    soundEngine.playClick();
    hapticLight();
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
    soundEngine.playClick();
    hapticLight();
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
    soundEngine.playClick();
    hapticMedium();

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
    soundEngine.playClick();
    hapticLight();
    setEditingStake(null);
    setStakePeriod(period);
    setStakeTitle('');
    setStakeDesc('');
    setIsStakeModalOpen(true);
  };

  const openEditStakeModal = (stake: Stake) => {
    soundEngine.playClick();
    hapticLight();
    setEditingStake(stake);
    setStakePeriod(stake.period);
    setStakeTitle(stake.title);
    setStakeDesc(stake.description);
    setIsStakeModalOpen(true);
  };

  const handleSaveStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeTitle.trim()) return;
    soundEngine.playClick();
    hapticMedium();

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
    soundEngine.playClick();
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
    soundEngine.playClick();
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
        soundEngine.playFanfare();
        setImportStatus({ message: 'Backup restored successfully! ⚡', isError: false });
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
    soundEngine.playClick();
    hapticLight();
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

  const handleSectionTabClick = (
    sec: 'karma' | 'badges' | 'stakes' | 'proofs' | 'habits' | 'wearables' | 'settings'
  ) => {
    soundEngine.playClick();
    hapticLight();
    setActiveSection(sec);
  };

  const STAKE_PRESETS = [
    { title: 'Sunday Dinner Date 🍕', description: 'Winner chooses favorite restaurant, loser pays.' },
    { title: 'Breakfast in Bed for a Week ☕', description: 'Loser prepares coffee & breakfast every morning.' },
    { title: 'Full Body Massage 💆‍♂️', description: '60-minute relaxing massage given by the loser.' },
    { title: 'Cinema & Takeaway Night 🎬', description: 'Winner picks the movie, cuisine, and snacks.' },
    { title: 'Spa & Thermal Bath Day 🧖‍♀️', description: 'Grand monthly reward: Luxury relaxation day.' },
  ];

  return (
    <div className="space-y-3.5 pb-24">
      {/* Sub-nav switcher */}
      <div className="flex p-1 rounded-2xl glass-panel bg-zinc-900/60 border border-white/[0.08] overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => handleSectionTabClick('karma')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'karma'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Karma ⚡
        </button>
        <button
          onClick={() => handleSectionTabClick('badges')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'badges'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Badges 🏆
        </button>
        <button
          onClick={() => handleSectionTabClick('stakes')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'stakes'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Stakes 🍕
        </button>
        <button
          onClick={() => handleSectionTabClick('proofs')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'proofs'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Proofs 📸
        </button>
        <button
          onClick={() => handleSectionTabClick('habits')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'habits'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Habits ⚙️
        </button>
        <button
          onClick={() => handleSectionTabClick('wearables')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'wearables'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Wearables ⌚
        </button>
        <button
          onClick={() => handleSectionTabClick('settings')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 ${
            activeSection === 'settings'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Settings 🎛️
        </button>
      </div>

      {/* 1. KARMA STATS & HEATMAP */}
      {activeSection === 'karma' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            {/* Maciek Karma Card */}
            <div className="rounded-2xl glass-card border border-blue-500/25 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-zinc-200">Maciek</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-white relative z-10">
                {maciekSummary.karma.toLocaleString()}
              </div>
              <span className="text-[10px] font-mono text-blue-400/80 font-bold uppercase tracking-wider relative z-10">
                LIFETIME KARMA
              </span>

              <div className="mt-3.5 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] font-mono relative z-10">
                <div className="flex justify-between text-zinc-400">
                  <span>Streak</span>
                  <span className="text-amber-400 flex items-center gap-1 font-bold">
                    <Flame className="w-3 h-3" />
                    {maciekSummary.currentStreak}d
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Week Consistency</span>
                  <span className="text-white font-semibold">{maciekSummary.completionRateWeekly}%</span>
                </div>
              </div>
            </div>

            {/* Myrna Karma Card */}
            <div className="rounded-2xl glass-card border border-pink-500/25 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-zinc-200">Myrna</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-white relative z-10">
                {myrnaSummary.karma.toLocaleString()}
              </div>
              <span className="text-[10px] font-mono text-pink-400/80 font-bold uppercase tracking-wider relative z-10">
                LIFETIME KARMA
              </span>

              <div className="mt-3.5 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] font-mono relative z-10">
                <div className="flex justify-between text-zinc-400">
                  <span>Streak</span>
                  <span className="text-amber-400 flex items-center gap-1 font-bold">
                    <Flame className="w-3 h-3" />
                    {myrnaSummary.currentStreak}d
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Week Consistency</span>
                  <span className="text-white font-semibold">{myrnaSummary.completionRateWeekly}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 12-Week Consistency Matrix */}
          <HabitHeatmap />

          <div className="rounded-2xl glass-card border border-white/[0.08] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono mb-1.5">
              Permanent Discipline Karma
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every habit completed awards permanent Karma. While weekly and monthly scores reset
              to decide dinner dates and stakes, your Karma stands as a testament to your
              long-term discipline and never diminishes.
            </p>
          </div>
        </div>
      )}

      {/* 2. TROPHY CABINET & BADGES */}
      {activeSection === 'badges' && <TrophyCabinet />}

      {/* 3. STAKES & WAGERS */}
      {activeSection === 'stakes' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-white">Stakes & Rewards</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Wagers for weekly and monthly duels
              </p>
            </div>
            <button
              onClick={() => openNewStakeModal('weekly')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm active:scale-95"
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
                  className={`rounded-2xl border p-4 transition-all shadow-md ${
                    stake.period === 'monthly'
                      ? 'bg-gradient-to-b from-[#18121a] to-[#0c0d10] border-pink-500/25'
                      : 'bg-gradient-to-b from-[#181410] to-[#0c0d10] border-amber-500/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                          stake.period === 'monthly'
                            ? 'bg-pink-500/15 border-pink-500/30 text-pink-400'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
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
                          className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
                            stake.period === 'monthly'
                              ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {stake.period} Wager
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5 truncate">{stake.title}</h4>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{stake.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditStakeModal(stake)}
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                        title="Edit wager"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          deleteStake(stake.id);
                        }}
                        className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                        title="Delete wager"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Preset Wagers */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                Preset Stakes Ideas
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {STAKE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    soundEngine.playClick();
                    setStakeTitle(preset.title);
                    setStakeDesc(preset.description);
                    setIsStakeModalOpen(true);
                  }}
                  className="text-left p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] hover:border-white/20 hover:bg-zinc-850 transition-all text-xs group"
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

      {/* 4. PROOF VAULT */}
      {activeSection === 'proofs' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-white">Proof Gallery</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Clean Space photo evidence & accountability
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-white/[0.08] p-0.5 rounded-xl text-xs font-mono">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setProofFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  proofFilter === 'all' ? 'bg-white/[0.1] text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setProofFilter('maciek');
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  proofFilter === 'maciek' ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ⚡ Maciek
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setProofFilter('myrna');
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  proofFilter === 'myrna' ? 'bg-pink-500/20 text-pink-300 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
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
                <div className="rounded-2xl border border-white/[0.08] glass-card p-8 text-center text-zinc-400">
                  <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No proof photos found</p>
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
                      className="rounded-2xl glass-card border border-white/[0.08] p-4 space-y-2.5 shadow-sm"
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
                          onClick={() => {
                            soundEngine.playClick();
                            setSelectedVaultProof({ checkIn: ci, habit, player });
                          }}
                          className="text-[10px] font-mono text-zinc-300 hover:text-white bg-zinc-900 border border-white/[0.08] hover:border-zinc-500 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
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
                            onClick={() => {
                              soundEngine.playClick();
                              setSelectedVaultProof({ checkIn: ci, habit, player });
                            }}
                            className="relative rounded-xl overflow-hidden aspect-video border border-white/[0.08] hover:border-zinc-400 transition-colors group focus:outline-none"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo}
                              alt={`${player.name}'s proof photo ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[8px] font-mono px-1 rounded">
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

      {/* 5. HABIT MANAGER */}
      {activeSection === 'habits' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-white">Habit Parity & Goals</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Adjust points & habits as your goals evolve
              </p>
            </div>
            <button
              onClick={openNewHabitModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm active:scale-95"
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
              <div key={pId} className="rounded-2xl glass-card border border-white/[0.08] p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className={`text-xs font-bold font-mono uppercase ${
                    pId === 'maciek' ? 'text-blue-400' : 'text-pink-400'
                  }`}>
                    {pId === 'maciek' ? '⚡ Maciek' : '✨ Myrna'} Habits
                  </span>
                  <span className="text-[11px] font-mono text-zinc-300 font-semibold bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                    Total: {totalPoints} pts / day
                  </span>
                </div>

                <div className="space-y-1.5">
                  {playerHabits.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-xs hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                          <HabitIcon name={h.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-white truncate">{h.title}</div>
                          <div className="text-[10px] text-zinc-400 font-mono capitalize">
                            {h.category.replace('_', ' ')} • +{h.points} pts
                            {h.weeklyTargetDays ? ` • ${h.weeklyTargetDays}x/wk` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditHabitModal(h)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                          title="Edit habit"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            deleteHabit(h.id);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/[0.05]"
                          title="Delete habit"
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

      {/* 6. WEARABLES & INTEGRATIONS */}
      {activeSection === 'wearables' && (
        <div className="space-y-3.5">
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Watch className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Wearables & Automated Sync
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Automated 1-tap and background check-ins directly from Google Health (Maciek) and Apple Health (Myrna).
            </p>
          </div>

          {/* MACIEK: GOOGLE HEALTH */}
          <div className="rounded-2xl glass-card border border-blue-500/20 p-4 space-y-3.5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-100 font-mono">
                    Maciek: Google Health
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Google Cloud Platform OAuth 2.0 REST API sync for sleep and workouts.
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border bg-zinc-900 border-white/[0.08]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    wearableConfig?.googleConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                  }`}
                />
                <span className={wearableConfig?.googleConnected ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                  {wearableConfig?.googleConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            {/* Habit Triggers Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-xs">
                <div className="text-[10px] text-zinc-400 font-mono uppercase font-semibold">Sleep (8+ Hrs)</div>
                <div className="text-white font-bold mt-0.5">+50 pts</div>
                <div className="text-[10px] text-zinc-500 mt-1">activityType: 72 (Sleep)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-xs">
                <div className="text-[10px] text-zinc-400 font-mono uppercase font-semibold">Gym & Strength</div>
                <div className="text-white font-bold mt-0.5">+40 pts</div>
                <div className="text-[10px] text-zinc-500 mt-1">activityType: 97 (Weights)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-xs">
                <div className="text-[10px] text-zinc-400 font-mono uppercase font-semibold">Basketball / Run</div>
                <div className="text-white font-bold mt-0.5">+30 pts</div>
                <div className="text-[10px] text-zinc-500 mt-1">activityType: 8 & 10</div>
              </div>
            </div>

            {/* Feedback Message */}
            {googleSyncMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-mono border ${
                  googleSyncMsg.isError
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {googleSyncMsg.text}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {!wearableConfig?.googleConnected ? (
                <>
                  <a
                    href="/api/auth/google"
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Connect Google Cloud OAuth</span>
                  </a>
                  <button
                    onClick={async () => {
                      soundEngine.playClick();
                      setIsSyncingGoogle(true);
                      setGoogleSyncMsg(null);
                      const res = await syncGoogleHealth(true);
                      setIsSyncingGoogle(false);
                      setGoogleSyncMsg({ text: res.message, isError: !res.success });
                    }}
                    disabled={isSyncingGoogle}
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    {isSyncingGoogle ? 'Simulating...' : '⚡ Test Sync (Demo)'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      soundEngine.playClick();
                      setIsSyncingGoogle(true);
                      setGoogleSyncMsg(null);
                      const res = await syncGoogleHealth(false);
                      setIsSyncingGoogle(false);
                      setGoogleSyncMsg({ text: res.message, isError: !res.success });
                    }}
                    disabled={isSyncingGoogle}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
                    <span>{isSyncingGoogle ? 'Syncing...' : 'Sync Today From Google'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      soundEngine.playClick();
                      setIsSyncingGoogle(true);
                      setGoogleSyncMsg(null);
                      const res = await syncGoogleHealth(true);
                      setIsSyncingGoogle(false);
                      setGoogleSyncMsg({ text: res.message, isError: !res.success });
                    }}
                    disabled={isSyncingGoogle}
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    ⚡ Test Sync
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      disconnectGoogleHealth();
                      setGoogleSyncMsg({ text: 'Google Health disconnected.', isError: false });
                    }}
                    className="px-3 py-2 rounded-xl border border-white/[0.08] text-xs font-mono text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>

            {wearableConfig?.googleLastSync && (
              <p className="text-[10px] font-mono text-zinc-500">
                Last checked: {wearableConfig.googleLastSync}
              </p>
            )}
          </div>

          {/* MYRNA: APPLE HEALTH */}
          <div className="rounded-2xl glass-card border border-pink-500/20 p-4 space-y-3.5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-100 font-mono">
                    Myrna: Apple Health (iOS Shortcuts)
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Background webhook ingestion triggered natively by iPhone Apple Health Automations.
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border bg-zinc-900 border-white/[0.08] text-pink-400">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                <span className="font-semibold">Ready</span>
              </div>
            </div>

            {/* Webhook URL Endpoint Box */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                Ingestion Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/api/sync/apple-health`
                      : 'https://do-it-app.vercel.app/api/sync/apple-health'
                  }
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-300 font-mono text-[11px] focus:outline-none select-all"
                />
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    const url = `${window.location.origin}/api/sync/apple-health`;
                    navigator.clipboard.writeText(url).then(() => {
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2500);
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-white hover:bg-zinc-800 transition-colors"
                >
                  {copiedWebhook ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ClipboardCopy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedWebhook ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Feedback Message */}
            {appleSyncMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-mono border ${
                  appleSyncMsg.isError
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {appleSyncMsg.text}
              </div>
            )}

            {/* Instant Test Simulator */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                Instant Shortcut Simulator (Test from Web)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={async () => {
                    soundEngine.playClick();
                    setAppleSyncMsg(null);
                    const res = await testAppleHealthSync('sleep', 8.5);
                    setAppleSyncMsg({ text: res.message, isError: !res.success });
                  }}
                  className="py-2 px-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="font-semibold text-white">🌙 Sleep 8.5h</div>
                  <div className="text-[10px] text-zinc-400">+50 pts to Myrna</div>
                </button>
                <button
                  onClick={async () => {
                    soundEngine.playClick();
                    setAppleSyncMsg(null);
                    const res = await testAppleHealthSync('running', 5.0);
                    setAppleSyncMsg({ text: res.message, isError: !res.success });
                  }}
                  className="py-2 px-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="font-semibold text-white">🏃‍♀️ 5km Run</div>
                  <div className="text-[10px] text-zinc-400">+30 pts to Myrna</div>
                </button>
                <button
                  onClick={async () => {
                    soundEngine.playClick();
                    setAppleSyncMsg(null);
                    const res = await testAppleHealthSync('gym', 50);
                    setAppleSyncMsg({ text: res.message, isError: !res.success });
                  }}
                  className="py-2 px-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="font-semibold text-white">🏋️‍♀️ Gym Session</div>
                  <div className="text-[10px] text-zinc-400">+40 pts to Myrna</div>
                </button>
              </div>
            </div>

            {/* Collapsible iOS Setup Guide */}
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setShowAppleGuide(!showAppleGuide)}
                className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-white py-1"
              >
                <span>{showAppleGuide ? '▼ Hide 60-Second iPhone Guide' : '▶ 60-Second iPhone Setup Guide'}</span>
                <span className="text-[10px] text-pink-400 font-mono">No App Store App Needed</span>
              </button>

              {showAppleGuide && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-2 text-xs text-zinc-300">
                  <div className="flex gap-2">
                    <span className="font-mono text-pink-400 font-bold">1.</span>
                    <p>Open Apple&apos;s built-in <strong>Shortcuts</strong> app on Myrna&apos;s iPhone.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-pink-400 font-bold">2.</span>
                    <p>Tap <strong>Automation</strong> tab &rarr; tap <strong>+</strong> (New Automation).</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-pink-400 font-bold">3.</span>
                    <p>Select trigger: <strong>When waking up alarm is stopped</strong> (or Workout ends).</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-pink-400 font-bold">4.</span>
                    <div>
                      <p>Add action: <strong>Get Contents of URL</strong>:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-zinc-400">
                        <li>URL: Paste the webhook URL above</li>
                        <li>Method: <code>POST</code></li>
                        <li>Request Body: <code>JSON</code> with fields:
                          <code className="block mt-0.5 text-zinc-300 font-mono bg-black/50 p-1.5 rounded-md">
                            &#123;&quot;player&quot;: &quot;myrna&quot;, &quot;metric&quot;: &quot;sleep&quot;, &quot;value&quot;: 8.5&#125;
                          </code>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-400 pt-1 font-semibold">
                    ✓ Every morning when her alarm rings or run finishes, her points are automatically credited!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. SETTINGS */}
      {activeSection === 'settings' && (
        <div className="space-y-3.5">
          {/* Active Profile Switcher */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono mb-2">
              Device Profile Identity
            </h3>
            <p className="text-xs text-zinc-400 mb-3">
              Current active player on this device:{' '}
              <span className="text-white font-bold">{activePlayer?.name}</span>
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  selectProfile(activePlayer?.id === 'maciek' ? 'myrna' : 'maciek');
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-medium text-white hover:bg-white/[0.15] transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Switch to {activePlayer?.id === 'maciek' ? 'Myrna ✨' : 'Maciek ⚡'}
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  switchProfile();
                }}
                className="px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-xs text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Tactile Audio Sound Engine */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  )}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                    Tactile Audio Sound Engine
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Synthesized mechanical clicks and victory fanfare
                </p>
              </div>

              <button
                onClick={() => {
                  const nextState = !soundEnabled;
                  setSoundEnabled(nextState);
                  if (nextState) soundEngine.playCheck();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-colors ${
                  soundEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold'
                    : 'bg-zinc-900 border-white/[0.08] text-zinc-500'
                }`}
              >
                {soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>
          </div>

          {/* Weekly Scorecard Export */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                  Weekly Duel Scorecard
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Copy formatted summary for iMessage / WhatsApp
                </p>
              </div>
              <button
                onClick={handleCopyScorecard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-white hover:bg-zinc-800 transition-colors shadow-xs"
              >
                {copiedScorecard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                <span>{copiedScorecard ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Backup & Restore Sovereignty */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4 space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  fileInputRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>
            </div>

            {importStatus && (
              <p
                className={`text-xs font-mono font-semibold ${
                  importStatus.isError ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {importStatus.message}
              </p>
            )}
          </div>

          {/* iOS Shortcuts & Automations Info */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                iOS Shortcuts & Siri Automation
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You can trigger quick logging from an iOS Shortcut widget or Siri by opening the app URL.
              PWA installation supports full standalone execution.
            </p>
          </div>

          {/* Supabase Cloud Sync */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                Supabase Real-Time Cloud Sync
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              Connect to your free Supabase PostgreSQL database for real-time live synchronization
              across both your phones. (Optional: runs locally offline without this).
            </p>

            <form onSubmit={handleSaveSupabase} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-semibold">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-semibold">
                  Anon API Key
                </label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white text-xs font-medium hover:bg-white/[0.15] transition-colors shadow-xs"
              >
                {sbSaved ? '✓ Cloud Sync Saved!' : 'Save Supabase Credentials'}
              </button>
            </form>
          </div>

          {/* Reset Baseline Data */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Reset Default Habits & Data</div>
                <div className="text-[11px] text-zinc-500">Restore factory baseline seed state</div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all habits and check-ins to default factory data?')) {
                    soundEngine.playClick();
                    resetToDefaults();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-xs font-mono text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-2xl glass-panel bg-zinc-950 border border-white/[0.1] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white font-mono">
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
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-semibold">
                  Assign To Player
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setTargetPlayer('maciek');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      targetPlayer === 'maciek'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    ⚡ Maciek
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setTargetPlayer('myrna');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      targetPlayer === 'myrna'
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 font-bold'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    ✨ Myrna
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-semibold">
                  Habit Title
                </label>
                <input
                  type="text"
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g. Read Books"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-semibold">
                  Description
                </label>
                <input
                  type="text"
                  value={habitDesc}
                  onChange={(e) => setHabitDesc(e.target.value)}
                  placeholder="e.g. 1 point per page read"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-semibold">
                    Points (Max)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={habitPoints}
                    onChange={(e) => setHabitPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-semibold">
                    Category
                  </label>
                  <select
                    value={habitCategory}
                    onChange={(e) => setHabitCategory(e.target.value as HabitCategory)}
                    className="w-full px-2 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
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
                    className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-0"
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
                    className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-0"
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
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-2xl glass-panel bg-zinc-950 border border-white/[0.1] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white font-mono">
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
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                  Timeframe
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setStakePeriod('weekly');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-medium border transition-colors ${
                      stakePeriod === 'weekly'
                        ? 'bg-white/[0.12] text-white border-white/20 font-bold'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setStakePeriod('monthly');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-medium border transition-colors ${
                      stakePeriod === 'monthly'
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 font-bold'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    Monthly (Grand Prize)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                  Stake / Reward Title
                </label>
                <input
                  type="text"
                  value={stakeTitle}
                  onChange={(e) => setStakeTitle(e.target.value)}
                  placeholder="e.g. Sunday Dinner Date 🍕"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                  Terms & Stakes
                </label>
                <textarea
                  value={stakeDesc}
                  onChange={(e) => setStakeDesc(e.target.value)}
                  rows={2}
                  placeholder="Winner chooses restaurant, loser buys dinner!"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                {editingStake && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      deleteStake(editingStake.id);
                      setIsStakeModalOpen(false);
                    }}
                    className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                    title="Delete this wager"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsStakeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 shadow-sm"
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
