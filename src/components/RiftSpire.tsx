import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Crown,
  Flame,
  Heart,
  Layers,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import type { DuelistSkillId, SpireBlessingId } from '../engine/types';
import { CARD_MAP } from '../data/cards';
import { DUELIST_SKILLS, getSkillDef } from '../data/skills';
import {
  getSpireFloorEnemy,
  SPIRE_BLESSING_MAP,
  SPIRE_FLOORS,
  type SpireBlessingDef,
} from '../data/spire';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';
import { Card } from './Card';

interface RiftSpireProps {
  onBack: () => void;
  onLaunchFloor: (floor: number) => void;
}

const BlessingIcon: React.FC<{ kind: SpireBlessingDef['icon'] }> = ({ kind }) => {
  switch (kind) {
    case 'sword':
      return <Swords className="w-5 h-5" />;
    case 'shield':
      return <Shield className="w-5 h-5" />;
    case 'sparkles':
      return <Sparkles className="w-5 h-5" />;
    case 'zap':
      return <Zap className="w-5 h-5" />;
    case 'layers':
      return <Layers className="w-5 h-5" />;
    case 'trap':
      return <Flame className="w-5 h-5" />;
  }
};

export const RiftSpire: React.FC<RiftSpireProps> = ({ onBack, onLaunchFloor }) => {
  const {
    decks,
    activeDeckId,
    selectedSkillId,
    setSelectedSkill,
    spireRun,
    stats,
    startSpireRun,
    pickSpireDraftCard,
    pickSpireBlessing,
    advanceSpireFloor,
    abandonSpireRun,
  } = useProfileStore();

  const validDecks = decks.filter((d) => d.mainDeck.length === 30);
  const [chosenDeckId, setChosenDeckId] = useState(
    validDecks.some((d) => d.id === activeDeckId)
      ? activeDeckId
      : validDecks[0]?.id ?? decks[0].id
  );

  const activeSkill = getSkillDef(selectedSkillId);
  const currentFloorEnemy = spireRun ? getSpireFloorEnemy(spireRun.floor) : null;
  const draft = spireRun?.pendingDraft ?? null;

  const handleSelectSkill = (id: DuelistSkillId) => {
    soundEngine.uiClick();
    setSelectedSkill(id);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#050713] text-slate-100 p-4 sm:p-6 flex flex-col">
      {/* Atmospheric Spire Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img
          src="/assets/cards/chrono_dragon_spire.jpg"
          alt=""
          className="w-full h-full object-cover opacity-20 blur-[2px] scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 25%, rgba(88,28,135,0.42), rgba(5,7,19,0.96) 78%)',
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-fuchsia-500/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              onBack();
            }}
            className="game-panel clip-chamfer-sm px-3 py-2 text-xs font-display font-bold text-slate-200 hover:border-cyan-400 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> LOBBY
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-display font-extrabold uppercase tracking-[0.25em] text-amber-300">
              <Crown className="w-3.5 h-3.5" /> Roguelike Survival Tower
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-200 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              Rift Spire Ascension
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="game-panel clip-chamfer-sm px-3 py-1.5 border-amber-400/50 flex items-center gap-1.5 text-xs">
            <Trophy className="w-4 h-4 text-amber-300" />
            <span className="text-slate-400">Spire Clears:</span>
            <strong className="font-mono-num text-amber-200">{stats.spireClears ?? 0}</strong>
          </div>
          {spireRun?.active && (
            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                abandonSpireRun();
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-950/70 border border-rose-500/55 text-rose-200 text-xs font-bold hover:bg-rose-900/70 cursor-pointer"
            >
              Reset Run
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-6xl w-full mx-auto flex-1 py-6 space-y-6">
        {/* ================= STATE 1: SPIRE CLEARED VICTORY ================= */}
        {spireRun?.completed && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="game-panel-gold clip-chamfer p-6 sm:p-8 text-center max-w-2xl mx-auto space-y-4"
          >
            <Crown className="w-14 h-14 text-amber-300 mx-auto drop-shadow-[0_0_24px_rgba(251,191,36,0.9)]" />
            <h2 className="font-display text-3xl font-black text-amber-200">
              RIFT SPIRE CONQUERED!
            </h2>
            <p className="text-sm text-slate-200">
              You defeated all 5 Floors with {spireRun.blessings.length} Aether Blessings and a{' '}
              {spireRun.deck.length}-card Run Deck, earning <strong>+350 Coins</strong> &amp;{' '}
              <strong>+150 Aether Dust</strong>!
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {spireRun.blessings.map((bid) => {
                const b = SPIRE_BLESSING_MAP[bid];
                return b ? (
                  <span
                    key={bid}
                    className={`px-3 py-1 rounded-lg border text-xs font-bold ${b.colorClass}`}
                  >
                    ★ {b.name}
                  </span>
                ) : null;
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                abandonSpireRun();
              }}
              className="mt-4 clip-skew-btn px-7 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 text-white font-display font-extrabold text-sm tracking-wider cursor-pointer"
            >
              START NEW SPIRE RUN
            </button>
          </motion.div>
        )}

        {/* ================= STATE 2: POST-VICTORY DRAFT (CARD + BLESSING) ================= */}
        {spireRun?.active && draft && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 clip-skew-btn px-4 py-1 bg-emerald-950/90 border border-emerald-400/70 text-emerald-200 text-xs font-extrabold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> Floor {spireRun.floor} Cleared — Spire Draft Rewards!
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-white">
                Draft 1 Bonus Card &amp; 1 Permanent Aether Blessing
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Resting between floors also restores +1500 LP before Floor {spireRun.floor + 1}!
              </p>
            </div>

            {/* Draft Part 1: 1 of 3 Rare+ Cards */}
            <div className="game-panel clip-chamfer-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm sm:text-base font-bold text-cyan-300 uppercase tracking-wider">
                  1. Draft Bonus Card into Your Spire Deck
                </h3>
                {draft.pickedCard && (
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Card Added!
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {draft.cardChoices.map((cid) => {
                  const card = CARD_MAP[cid];
                  if (!card) return null;
                  return (
                    <div key={cid} className="flex flex-col items-center gap-2">
                      <Card card={card} size="md" interactiveTilt />
                      <button
                        type="button"
                        disabled={draft.pickedCard}
                        onClick={() => {
                          soundEngine.relicAttach();
                          pickSpireDraftCard(cid);
                        }}
                        className="clip-skew-btn px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-display font-bold text-xs disabled:opacity-35 cursor-pointer"
                      >
                        + ADD TO RUN DECK
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Draft Part 2: 1 of 3 Permanent Blessings */}
            <div className="game-panel clip-chamfer-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm sm:text-base font-bold text-amber-300 uppercase tracking-wider">
                  2. Choose Permanent Aether Blessing
                </h3>
                {draft.pickedBlessing && (
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Blessing Bound!
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {draft.blessingChoices.map((bid: SpireBlessingId) => {
                  const b = SPIRE_BLESSING_MAP[bid];
                  if (!b) return null;
                  const alreadyOwned = spireRun.blessings.includes(bid);
                  return (
                    <button
                      key={bid}
                      type="button"
                      disabled={draft.pickedBlessing}
                      onClick={() => {
                        soundEngine.evolve();
                        pickSpireBlessing(bid);
                      }}
                      className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer disabled:opacity-45 hover:scale-[1.02] ${b.colorClass}`}
                    >
                      <div className="flex items-center gap-2 font-display font-extrabold text-sm">
                        <BlessingIcon kind={b.icon} />
                        <span>{b.name}</span>
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-90 mt-1">
                        {b.tagline} {alreadyOwned ? '(Owned)' : ''}
                      </div>
                      <p className="text-xs text-slate-200/90 mt-1.5 leading-snug">
                        {b.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                disabled={!draft.pickedCard || !draft.pickedBlessing}
                onClick={() => {
                  soundEngine.uiClick();
                  advanceSpireFloor();
                }}
                className="shine-sweep clip-skew-btn px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 text-white font-display font-black text-base tracking-wider shadow-[0_0_32px_rgba(245,158,11,0.5)] disabled:opacity-35 cursor-pointer"
              >
                ASCEND TO FLOOR {spireRun.floor + 1} (+1500 LP REST) →
              </button>
            </div>
          </div>
        )}

        {/* ================= STATE 3: ACTIVE SPIRE FLOOR MAP & CHALLENGE ================= */}
        {spireRun?.active && !draft && currentFloorEnemy && (
          <div className="space-y-5">
            {/* 5-Floor Ascension Track */}
            <div className="grid grid-cols-5 gap-2">
              {SPIRE_FLOORS.map((f) => {
                const isCleared = f.floor < spireRun.floor;
                const isCurrent = f.floor === spireRun.floor;
                return (
                  <div
                    key={f.floor}
                    className={`rounded-xl p-2.5 border text-center transition-all ${
                      isCurrent
                        ? 'bg-fuchsia-950/65 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                        : isCleared
                        ? 'bg-emerald-950/45 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-950/70 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="text-[10px] font-display font-extrabold uppercase tracking-wider">
                      {f.isBoss ? '★ BOSS' : `FL ${f.floor}`}
                    </div>
                    <div className="text-xs font-bold truncate mt-0.5 text-white">
                      {f.enemyName.split(',')[0]}
                    </div>
                    <div className="text-[10px] font-mono-num text-amber-300 mt-0.5">
                      {isCleared ? 'CLEARED' : `${f.enemyLp} LP`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Run Status + Next Floor Rival */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Your Spire Status & Blessings */}
              <div className="lg:col-span-5 game-panel clip-chamfer-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-extrabold uppercase tracking-wider text-cyan-300">
                    Your Spire Run Status
                  </span>
                  <span className="font-mono-num text-xs text-slate-300">
                    {spireRun.deck.length} Main • {spireRun.riftDeck.length} Rift
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-400/55 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-emerald-300 fill-emerald-400/40" />
                    <span className="text-xs font-bold text-emerald-100">Carry-Over LP</span>
                  </div>
                  <span className="font-mono-num font-black text-lg text-white">
                    {spireRun.currentLp} / {spireRun.maxLp}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-500/45 flex items-center gap-3">
                  <img
                    src={activeSkill.portrait}
                    alt={activeSkill.duelistName}
                    className="w-11 h-11 rounded-lg object-cover object-top border border-amber-400/70"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                      Equipped Skill • {activeSkill.triggerHint}
                    </div>
                    <div className="font-display font-bold text-sm text-white truncate">
                      {activeSkill.skillName}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold mb-2">
                    Active Aether Blessings ({spireRun.blessings.length})
                  </div>
                  {spireRun.blessings.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Clear Floor 1 to draft your first permanent Aether Blessing!
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {spireRun.blessings.map((bid) => {
                        const b = SPIRE_BLESSING_MAP[bid];
                        if (!b) return null;
                        return (
                          <div
                            key={bid}
                            className={`px-3 py-2 rounded-lg border text-xs ${b.colorClass}`}
                          >
                            <div className="font-bold">★ {b.name} — {b.tagline}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Current Floor Boss Card */}
              <div className="lg:col-span-7 game-panel-gold clip-chamfer p-5 sm:p-6 flex flex-col justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <img
                    src={currentFloorEnemy.portrait}
                    alt={currentFloorEnemy.enemyName}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover object-top border-2 border-amber-400 shadow-[0_0_32px_rgba(251,191,36,0.45)]"
                  />
                  <div className="text-center sm:text-left space-y-1.5">
                    <div className="text-xs font-display font-extrabold uppercase tracking-widest text-amber-300">
                      {currentFloorEnemy.title}
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl font-black text-white">
                      {currentFloorEnemy.enemyName}
                    </h2>
                    <div className="text-xs text-cyan-300 font-bold">
                      {currentFloorEnemy.enemyTitle} • {currentFloorEnemy.enemyLp} LP • AI:{' '}
                      <span className="uppercase">{currentFloorEnemy.difficulty}</span>
                    </div>
                    <div className="text-xs text-amber-200 font-bold pt-1">
                      Reward: +{currentFloorEnemy.rewardCoins} Coins
                      {currentFloorEnemy.isBoss ? ' + 150 Aether Dust!' : ' + Bonus Card & Blessing Draft!'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.uiClick();
                    onLaunchFloor(spireRun.floor);
                  }}
                  className="shine-sweep w-full py-4 clip-skew-btn bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white font-display font-black text-base tracking-widest shadow-[0_0_32px_rgba(249,115,22,0.55)] flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer"
                >
                  <Swords className="w-5 h-5" />
                  CHALLENGE FLOOR {spireRun.floor}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STATE 4: START NEW SPIRE RUN SETUP ================= */}
        {(!spireRun || (!spireRun.active && !spireRun.completed)) && (
          <div className="space-y-6">
            <div className="game-panel clip-chamfer-sm p-5 border-fuchsia-500/40">
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Climb <strong className="text-amber-300">5 escalating floors</strong> with carry-over LP.
                After each victory, draft <strong className="text-cyan-300">1 bonus Rare/Epic/Mythic card</strong>{' '}
                into your run deck and bind <strong className="text-fuchsia-300">1 permanent Aether Blessing</strong>{' '}
                to build unstoppable Rush Duel synergies!
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Pick Starting Deck */}
              <div className="game-panel clip-chamfer-sm p-4 space-y-2.5">
                <div className="text-xs font-display font-extrabold uppercase tracking-wider text-cyan-300">
                  1. Choose Starting Deck
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {validDecks.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        soundEngine.uiClick();
                        setChosenDeckId(d.id);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        chosenDeckId === d.id
                          ? 'bg-cyan-950/60 border-cyan-400 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-display font-bold text-sm">{d.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {d.mainDeck.length} Main • {d.riftDeck.length} Rift Fusion
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pick Duelist Skill Avatar */}
              <div className="game-panel clip-chamfer-sm p-4 space-y-2.5">
                <div className="text-xs font-display font-extrabold uppercase tracking-wider text-amber-300">
                  2. Equip Duelist Character Skill (1/Duel)
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {DUELIST_SKILLS.map((sk) => {
                    const selected = activeSkill.id === sk.id;
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => handleSelectSkill(sk.id)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                          selected
                            ? `${sk.borderColor} bg-indigo-950/65 text-white`
                            : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={sk.portrait}
                          alt={sk.duelistName}
                          className="w-10 h-10 rounded-lg object-cover object-top shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{sk.skillName}</span>
                            <span className="text-[9px] font-normal text-amber-300">
                              ({sk.triggerHint})
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-300 leading-snug line-clamp-2">
                            {sk.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  soundEngine.fusion();
                  startSpireRun(chosenDeckId);
                }}
                className="shine-sweep clip-skew-btn px-10 py-4 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-amber-500 text-white font-display font-black text-base tracking-widest shadow-[0_0_36px_rgba(192,38,211,0.55)] flex items-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <Crown className="w-5 h-5" />
                ENTER RIFT SPIRE (FLOOR 1–5)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
