'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Stake, StakePeriod } from '@/lib/types';
import { getMonthKey, getTodayDateString, getWeekKey } from '@/lib/date-utils';
import { Award, CheckCircle2, Gift, Plus, Sparkles, Trophy, X } from 'lucide-react';

export function StakesView() {
  const { stakes, addStake, updateStake } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStake, setEditingStake] = useState<Stake | null>(null);

  // Form state
  const [period, setPeriod] = useState<StakePeriod>('weekly');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const activeStakes = stakes.filter((s) => s.status === 'active');
  const pastStakes = stakes.filter((s) => s.status !== 'active');

  const openNewStakeModal = (defaultPeriod: StakePeriod = 'weekly') => {
    setEditingStake(null);
    setPeriod(defaultPeriod);
    setTitle('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditStakeModal = (stake: Stake) => {
    setEditingStake(stake);
    setPeriod(stake.period);
    setTitle(stake.title);
    setDescription(stake.description);
    setIsModalOpen(true);
  };

  const handleSaveStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const today = getTodayDateString();
    const periodKey = period === 'weekly' ? getWeekKey(today) : getMonthKey(today);

    if (editingStake) {
      updateStake({
        ...editingStake,
        title,
        description,
        period,
      });
    } else {
      addStake({
        period,
        periodKey,
        title,
        description,
        status: 'active',
        dueDate: today,
      });
    }

    setIsModalOpen(false);
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
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Active Stakes & Wagers</h2>
          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
            What you are fighting for this week and month
          </p>
        </div>

        <button
          onClick={() => openNewStakeModal('weekly')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Set Stake
        </button>
      </div>

      {/* Active Stakes List */}
      <div className="space-y-3">
        {activeStakes.map((stake) => (
          <div
            key={stake.id}
            className={`rounded-2xl border p-4.5 transition-all ${
              stake.period === 'monthly'
                ? 'bg-gradient-to-b from-[#161219] to-[#0d0e11] border-pink-500/20 shadow-md'
                : 'bg-gradient-to-b from-[#12141a] to-[#0c0d10] border-zinc-800/90 shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                        stake.period === 'monthly'
                          ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {stake.period} Prize
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1.5">{stake.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{stake.description}</p>
                </div>
              </div>

              <button
                onClick={() => openEditStakeModal(stake)}
                className="text-[11px] font-mono text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preset Ideas */}
      <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            Quick Wager Ideas
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {STAKE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTitle(preset.title);
                setDescription(preset.description);
                setIsModalOpen(true);
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

      {/* Claimed Stakes Hall of Fame */}
      {pastStakes.length > 0 && (
        <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              Hall of Fame (Past Claimed Stakes)
            </h3>
          </div>

          <div className="space-y-2">
            {pastStakes.map((stake) => (
              <div
                key={stake.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <div className="font-medium text-white">{stake.title}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Won by {stake.winnerId === 'maciek' ? 'Maciek ⚡' : 'Myrna ✨'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase">Claimed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stake Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">
                {editingStake ? 'Edit Stake' : 'Set New Stake / Wager'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                    onClick={() => setPeriod('weekly')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      period === 'weekly'
                        ? 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('monthly')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      period === 'monthly'
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Winner chooses restaurant, loser buys dinner!"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-medium hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200"
                >
                  Save Stake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
