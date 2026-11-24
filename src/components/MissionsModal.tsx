import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CheckCircle2, Coins, Crown, Flame, Sparkles, Trophy, Wand2, X } from 'lucide-react';
import { DUELIST_RANKS, getDuelistRank, MISSIONS, type MissionDef } from '../data/missions';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';

interface MissionsModalProps {
  open: boolean;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({ open, onClose }) => {
  const profile = useProfileStore();
  const [tab, setTab] = useState<'missions' | 'ranks'>('missions');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!open) return null;

  const rankInfo = getDuelistRank(profile);
  const claimedSet = new Set(profile.claimedMissions ?? []);

  const sortedMissions = [...MISSIONS].sort((a, b) => {
    const aClaimed = claimedSet.has(a.id);
    const bClaimed = claimedSet.has(b.id);
    const aReady = !aClaimed && a.getProgress(profile) >= a.target;
    const bReady = !bClaimed && b.getProgress(profile) >= b.target;
    if (aReady !== bReady) return aReady ? -1 : 1;
    if (aClaimed !== bClaimed) return aClaimed ? 1 : -1;
    return 0;
  });

  const handleClaim = (m: MissionDef) => {
    const res = profile.claimMission(m.id);
    if (res.ok) {
      soundEngine.revealRarity('epic');
      setToastMsg(
        `Claimed "${m.title}"! +${res.coinsGained} Coins & +${res.dustGained} Aether Dust!`
      );
      setTimeout(() => setToastMsg(null), 2800);
    }
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-md p-3 sm:p-5"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[88vh] game-panel clip-chamfer border-amber-400/65 shadow-[0_0_75px_rgba(251,191,36,0.3)] flex flex-col overflow-hidden"
        >
          {/* Header with Rank Crest */}
          <div className="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/60 via-slate-950 to-indigo-950/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 clip-hex p-[2px] flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${rankInfo.current.accentFrom}, ${rankInfo.current.accentTo})`,
                  boxShadow: `0 0 24px ${rankInfo.current.glow}`,
                }}
              >
                <div className="w-full h-full clip-hex bg-slate-950 flex items-center justify-center">
                  <Trophy className={`w-5 h-5 ${rankInfo.current.textClass}`} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-extrabold text-base sm:text-lg text-white tracking-wider uppercase">
                    Missions &amp; Duelist Rank
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded bg-slate-900 border ${rankInfo.current.borderClass} ${rankInfo.current.textClass} text-[10px] font-display font-extrabold uppercase`}
                  >
                    {rankInfo.current.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {rankInfo.rp} RP •{' '}
                  {rankInfo.next
                    ? `${rankInfo.next.minRp - rankInfo.rp} RP to ${rankInfo.next.name}`
                    : 'Maximum Rank Achieved — True Rift Sovereign!'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                setTab('missions');
              }}
              className={`flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'missions'
                  ? 'text-amber-200 border-b-2 border-amber-400 bg-amber-950/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4" /> Missions ({claimedSet.size}/{MISSIONS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                setTab('ranks');
              }}
              className={`flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'ranks'
                  ? 'text-cyan-200 border-b-2 border-cyan-400 bg-cyan-950/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crown className="w-4 h-4" /> Rank Ladder ({rankInfo.rp} RP)
            </button>
          </div>

          {toastMsg && (
            <div className="mx-5 mt-3 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              {toastMsg}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {tab === 'missions' ? (
              sortedMissions.map((m) => {
                const rawProg = m.getProgress(profile);
                const clamped = Math.min(m.target, rawProg);
                const pct = Math.min(100, Math.round((clamped / m.target) * 100));
                const isClaimed = claimedSet.has(m.id);
                const canClaim = !isClaimed && rawProg >= m.target;

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      canClaim
                        ? 'bg-gradient-to-r from-amber-950/55 via-slate-900/90 to-fuchsia-950/45 border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.22)]'
                        : isClaimed
                        ? 'bg-slate-950/50 border-slate-800/80 opacity-65'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-extrabold text-sm text-white">
                          {m.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] uppercase font-bold text-slate-400">
                          {m.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                      <div className="mt-2 flex items-center gap-2.5">
                        <div className="flex-1 h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isClaimed
                                ? 'bg-emerald-500'
                                : canClaim
                                ? 'bg-gradient-to-r from-amber-400 to-fuchsia-400'
                                : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[11px] font-bold text-slate-300 shrink-0">
                          {clamped}/{m.target}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2 text-[11px] font-mono-num font-bold">
                        <span className="flex items-center gap-1 text-amber-300">
                          <Coins className="w-3.5 h-3.5" /> +{m.rewardCoins}
                        </span>
                        <span className="flex items-center gap-1 text-fuchsia-300">
                          <Wand2 className="w-3.5 h-3.5" /> +{m.rewardDust}
                        </span>
                      </div>

                      {isClaimed ? (
                        <span className="px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> CLAIMED
                        </span>
                      ) : canClaim ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(m)}
                          className="relative overflow-hidden shine-sweep clip-skew-btn px-4 py-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500 text-slate-950 font-display font-extrabold text-xs tracking-wider shadow-[0_0_18px_rgba(251,191,36,0.75)] hover:brightness-110 cursor-pointer"
                        >
                          CLAIM!
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-bold">
                          IN PROGRESS
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-4">
                {/* RP Formula Breakdown */}
                <div className="rounded-xl bg-slate-950/90 border border-cyan-500/35 p-4 text-xs text-slate-300 space-y-1.5">
                  <div className="font-display font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-300" /> How Rank Points (RP) Work
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono-num text-[11px]">
                    <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <div className="text-slate-400">Duel Win</div>
                      <div className="text-emerald-300 font-extrabold">+100 RP</div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <div className="text-slate-400">Chapter Clear</div>
                      <div className="text-cyan-300 font-extrabold">+150 RP</div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <div className="text-slate-400">Rift Fusion</div>
                      <div className="text-fuchsia-300 font-extrabold">+25 RP</div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <div className="text-slate-400">Champion Badge</div>
                      <div className="text-amber-300 font-extrabold">+300 RP</div>
                    </div>
                  </div>
                </div>

                {/* 6 Tiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DUELIST_RANKS.map((tier) => {
                    const reached = rankInfo.rp >= tier.minRp;
                    const isCurrent = rankInfo.current.id === tier.id;
                    return (
                      <div
                        key={tier.id}
                        className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                          isCurrent
                            ? `bg-slate-900/95 ${tier.borderClass} shadow-lg`
                            : reached
                            ? 'bg-slate-950/85 border-slate-700'
                            : 'bg-slate-950/45 border-slate-800/80 opacity-55'
                        }`}
                        style={isCurrent ? { boxShadow: `0 0 26px ${tier.glow}` } : undefined}
                      >
                        <div
                          className="w-11 h-11 clip-hex p-[2px] shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${tier.accentFrom}, ${tier.accentTo})`,
                          }}
                        >
                          <div className="w-full h-full clip-hex bg-slate-950 flex items-center justify-center">
                            <Trophy className={`w-4 h-4 ${tier.textClass}`} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-display font-extrabold text-sm ${tier.textClass}`}>
                              {tier.name}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[8.5px] font-black uppercase">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div className="font-mono-num text-[11px] text-slate-400">
                            Requires {tier.minRp} RP
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
