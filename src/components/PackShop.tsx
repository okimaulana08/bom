import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Coins,
  Crown,
  Eye,
  PackageOpen,
  RotateCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { PackDef, PackOpenResult, Rarity } from '../engine/types';
import { BOOSTER_PACKS } from '../data/packs';
import { CARD_MAP } from '../data/cards';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';
import { Card } from './Card';

interface PackShopProps {
  onBack: () => void;
}

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  mythic: 3,
};

const RARITY_AURA: Record<
  Rarity,
  { ring: string; glow: string; label: string; particleColor: string; burstBorder: string }
> = {
  common: {
    ring: 'border-slate-500/70',
    glow: 'shadow-[0_0_20px_rgba(148,163,184,0.3)]',
    label: 'text-slate-300',
    particleColor: '#cbd5e1',
    burstBorder: 'border-slate-300',
  },
  rare: {
    ring: 'border-sky-400',
    glow: 'shadow-[0_0_32px_rgba(56,189,248,0.85)]',
    label: 'text-sky-300',
    particleColor: '#38bdf8',
    burstBorder: 'border-cyan-300',
  },
  epic: {
    ring: 'border-purple-400',
    glow: 'shadow-[0_0_38px_rgba(192,132,252,0.95)]',
    label: 'text-purple-300',
    particleColor: '#d946ef',
    burstBorder: 'border-fuchsia-300',
  },
  mythic: {
    ring: 'border-amber-300',
    glow: 'shadow-[0_0_52px_rgba(251,191,36,1)]',
    label: 'text-amber-200',
    particleColor: '#fde047',
    burstBorder: 'border-amber-200',
  },
};

const TEAR_SHARDS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const dist = 160 + (i % 4) * 55;
  return {
    id: i,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rot: ((i * 53) % 360) - 180,
    size: 8 + (i % 3) * 5,
  };
});

const CARD_SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 85 + (i % 3) * 32;
  return {
    id: i,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rot: i * 45,
  };
});

export const PackShop: React.FC<PackShopProps> = ({ onBack }) => {
  const { coins, dust, openPack, canClaimDailyFreePack } = useProfileStore();
  const freeDailyReady = canClaimDailyFreePack();

  const [stage, setStage] = useState<'browse' | 'sealed' | 'tearing' | 'reveal'>('browse');
  const [activePack, setActivePack] = useState<PackDef | null>(null);
  const [packResult, setPackResult] = useState<PackOpenResult | null>(null);
  const [revealedSlots, setRevealedSlots] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [slotBurstId, setSlotBurstId] = useState<number[]>([0, 0, 0, 0, 0]);
  const [spotlightRarity, setSpotlightRarity] = useState<{ id: number; rarity: Rarity } | null>(
    null
  );
  const [tearProgress, setTearProgress] = useState(0);
  const [packTilt, setPackTilt] = useState({ rx: 0, ry: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  const highestRarity: Rarity = useMemo(() => {
    if (!packResult) return 'rare';
    let best: Rarity = 'common';
    for (const p of packResult.pulls) {
      if (RARITY_RANK[p.rarity] > RARITY_RANK[best]) best = p.rarity;
    }
    return best;
  }, [packResult]);

  const handlePurchase = (pack: PackDef, useFreeDaily = false) => {
    const res = openPack(pack.id, useFreeDaily);
    if (!res.ok || !res.result) {
      setErrorMsg(res.error ?? 'Not enough Aether Coins!');
      setTimeout(() => setErrorMsg(null), 2400);
      return;
    }
    soundEngine.uiClick();
    setActivePack(pack);
    setPackResult(res.result);
    setRevealedSlots([false, false, false, false, false]);
    setSlotBurstId([0, 0, 0, 0, 0]);
    setSpotlightRarity(null);
    setTearProgress(0);
    setPackTilt({ rx: 0, ry: 0 });
    setStage('sealed');
  };

  const completeTear = () => {
    if (stage !== 'sealed') return;
    soundEngine.packTear();
    if (highestRarity === 'mythic') {
      setTimeout(() => soundEngine.evolve(), 120);
    }
    setTearProgress(100);
    setStage('tearing');
    setTimeout(() => {
      setStage('reveal');
    }, 620);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = Math.max(0, e.clientX - startXRef.current);
    const pct = Math.min(100, Math.round((dx / 170) * 100));
    setTearProgress(pct);
    if (pct >= 86) {
      draggingRef.current = false;
      completeTear();
    }
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    if (tearProgress < 86) setTearProgress(0);
  };

  const handlePackHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setPackTilt({
      rx: (0.5 - py) * 18,
      ry: (px - 0.5) * 22,
    });
  };

  const triggerSpotlight = (rarity: Rarity) => {
    if (rarity === 'epic' || rarity === 'mythic') {
      const id = Date.now() + Math.random();
      setSpotlightRarity({ id, rarity });
      setTimeout(() => {
        setSpotlightRarity((cur) => (cur?.id === id ? null : cur));
      }, rarity === 'mythic' ? 950 : 620);
    }
  };

  const revealSlot = (idx: number) => {
    if (!packResult || revealedSlots[idx]) return;
    const pull = packResult.pulls[idx];
    soundEngine.revealRarity(pull.rarity);
    setRevealedSlots((prev) => prev.map((v, i) => (i === idx ? true : v)));
    setSlotBurstId((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)));
    triggerSpotlight(pull.rarity);
  };

  const revealAll = () => {
    if (!packResult) return;
    packResult.pulls.forEach((pull, idx) => {
      if (!revealedSlots[idx]) {
        setTimeout(() => {
          soundEngine.revealRarity(pull.rarity);
          setRevealedSlots((prev) => prev.map((v, i) => (i === idx ? true : v)));
          setSlotBurstId((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)));
          triggerSpotlight(pull.rarity);
        }, idx * 170);
      }
    });
  };

  const allRevealed = revealedSlots.every(Boolean);

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#04050c] text-slate-100 p-4 sm:p-6 flex flex-col">
      {/* Cosmic Pack Vault Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img
          src="/assets/cards/fusion_frostfire_chimera.jpg"
          alt=""
          className="w-full h-full object-cover opacity-[0.16] blur-[3px] scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 75% 65% at 50% 45%, rgba(88,28,135,0.35) 0%, rgba(4,5,14,0.96) 80%)',
          }}
        />
      </div>

      {/* Full-Screen Prismatic / Mythic Reveal Spotlight Flash */}
      <AnimatePresence>
        {spotlightRarity && (
          <motion.div
            key={spotlightRarity.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: spotlightRarity.rarity === 'mythic' ? 0.9 : 0.55 }}
            className="pointer-events-none fixed inset-0 z-40"
            style={{
              background:
                spotlightRarity.rarity === 'mythic'
                  ? 'radial-gradient(circle at 50% 48%, rgba(254,240,138,0.75) 0%, rgba(217,70,239,0.35) 45%, rgba(56,189,248,0.18) 72%, transparent 100%)'
                  : 'radial-gradient(circle at 50% 48%, rgba(216,180,254,0.52) 0%, rgba(147,51,234,0.22) 55%, transparent 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-500/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              onBack();
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400/60 text-slate-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Menu
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wide bg-gradient-to-r from-amber-200 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              Rift Booster Vault
            </h1>
            <p className="text-xs text-slate-400">
              5 Cards per Pack • Guaranteed Rare or Higher • Excess copies (&gt;3) auto-dismantle into Aether Dust
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-amber-950/50 border border-amber-400/50 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="font-mono-num font-extrabold text-amber-200">{coins}</span>
            <span className="text-[10px] uppercase text-amber-300/80">Coins</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-fuchsia-950/50 border border-fuchsia-400/50 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-fuchsia-300" />
            <span className="font-mono-num font-extrabold text-fuchsia-200">{dust}</span>
            <span className="text-[10px] uppercase text-fuchsia-300/80">Dust</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="relative z-20 max-w-md mx-auto mt-3 px-4 py-2 rounded-xl bg-rose-950/90 border border-rose-400 text-rose-100 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* STAGE 1: BROWSE THEMED PACKS */}
      {stage === 'browse' && (
        <div className="relative z-10 max-w-6xl w-full mx-auto flex-1 flex items-center justify-center py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
            {BOOSTER_PACKS.map((pack) => {
              const canBuy = coins >= pack.price;
              return (
                <motion.div
                  key={pack.id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`game-panel clip-chamfer p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden ${
                    pack.badge ? 'border-amber-400/75 shadow-[0_0_32px_rgba(251,191,36,0.2)]' : ''
                  }`}
                >
                  {pack.badge && (
                    <span className="absolute top-3 right-3 z-20 clip-skew-btn px-3 py-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500 text-slate-950 font-display font-black text-[9.5px] tracking-widest uppercase shadow-[0_0_16px_rgba(251,191,36,0.85)] animate-pulse">
                      ★ {pack.badge}
                    </span>
                  )}

                  {/* Metallic Foil Pack Art Visual */}
                  <div className="flex flex-col items-center">
                    <div
                      className="relative w-48 h-64 rounded-2xl p-[3px] shadow-2xl overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${pack.accentFrom}, #ffffff88, ${pack.accentTo})`,
                      }}
                    >
                      <div
                        className="w-full h-full rounded-[13px] flex flex-col items-center justify-between p-4 relative overflow-hidden"
                        style={{
                          background: `radial-gradient(circle at 50% 30%, ${pack.accentFrom}66, #090b18 75%)`,
                        }}
                      >
                        <div className="w-full h-3 border-b border-dashed border-white/40 flex items-center justify-center text-[8px] tracking-[0.28em] text-white/75 uppercase">
                          {pack.badge ? pack.badge.replace(/^NEW\s+/i, 'EXPANSION ') : 'SEALED FOIL'}
                        </div>

                        <div className="text-center z-10">
                          <div className="w-16 h-16 mx-auto rounded-full bg-white/10 border border-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.28)]">
                            <PackageOpen className="w-8 h-8 text-white" />
                          </div>
                          <div className="mt-3 font-display font-extrabold text-base text-white leading-tight">
                            {pack.name}
                          </div>
                          <div className="mt-1 text-[10px] text-amber-200/90 uppercase tracking-wider font-bold">
                            {pack.featuredSetId ? '2+ Set Cards • 1 Rare+' : '5 Cards • 1 Rare+'}
                          </div>
                        </div>

                        <div className="w-full text-center text-[9px] font-bold tracking-[0.2em] text-white/60 uppercase">
                          Aetherbound TCG
                        </div>

                        <div className="pointer-events-none absolute inset-0 holo-foil opacity-50 mix-blend-screen" />
                      </div>
                    </div>

                    <h2 className="mt-4 font-display text-lg font-bold text-white">
                      {pack.name}
                    </h2>
                    <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                      {pack.subtitle}
                    </div>
                    <p className="mt-2 text-xs text-slate-400 text-center leading-relaxed">
                      {pack.description}
                    </p>
                  </div>

                  {freeDailyReady ? (
                    <button
                      type="button"
                      onClick={() => handlePurchase(pack, true)}
                      className="mt-5 w-full py-3 clip-skew-btn font-display font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 transition-all relative overflow-hidden shine-sweep bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.65)] hover:brightness-110 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      FREE DAILY PACK (0 COINS)!
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={() => handlePurchase(pack, false)}
                      className={`mt-5 w-full py-3 clip-skew-btn font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all relative overflow-hidden ${
                        canBuy
                          ? 'shine-sweep bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 text-white shadow-[0_0_24px_rgba(245,158,11,0.45)] hover:brightness-110 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      BUY &amp; OPEN ({pack.price} Coins)
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* STAGE 2 & 2.5: 3D FOIL PACK TEAR-OPEN + PRISMATIC EXPLOSION */}
      {(stage === 'sealed' || stage === 'tearing') && activePack && (
        <div
          className="relative z-10 max-w-3xl w-full mx-auto flex-1 flex flex-col items-center justify-center py-8 select-none"
          style={{ perspective: 1100 }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-1.5 clip-skew-btn px-3.5 py-0.5 mb-2 bg-slate-900/90 border border-amber-400/50 text-[10px] font-display font-extrabold tracking-[0.25em] uppercase text-amber-200">
              {highestRarity === 'mythic' ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                  PRISMATIC RESONANCE DETECTED!
                </>
              ) : highestRarity === 'epic' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 animate-pulse" />
                  HIGH AETHER ENERGY INSIDE
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  SEALED BOOSTER PACK
                </>
              )}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              {activePack.name}
            </h2>
            <p className="text-xs sm:text-sm text-cyan-300 mt-1">
              Swipe across the metallic top seal — or press the button below — to rip it open!
            </p>
          </motion.div>

          {/* 3D Pack Container */}
          <div className="relative flex items-center justify-center">
            {/* Ambient Rainbow / Gold Halo behind pack if Mythic/Epic inside! */}
            <div
              className={`pointer-events-none absolute -inset-8 rounded-full blur-3xl transition-opacity duration-300 ${
                highestRarity === 'mythic'
                  ? 'opacity-85 animate-pulse'
                  : highestRarity === 'epic'
                  ? 'opacity-65'
                  : 'opacity-40'
              }`}
              style={{
                background:
                  highestRarity === 'mythic'
                    ? 'conic-gradient(from 0deg, #fde047, #f43f5e, #d946ef, #38bdf8, #34d399, #fde047)'
                    : highestRarity === 'epic'
                    ? 'radial-gradient(circle, rgba(217,70,239,0.8), rgba(99,102,241,0.2), transparent)'
                    : `radial-gradient(circle, ${activePack.accentFrom}, transparent)`,
              }}
            />

            {/* Explosive Shards & Light Pillar during Tearing */}
            {stage === 'tearing' && (
              <>
                <motion.div
                  initial={{ scale: 0.2, opacity: 1 }}
                  animate={{ scale: 4.5, opacity: 0 }}
                  transition={{ duration: 0.56, ease: 'easeOut' }}
                  className={`pointer-events-none absolute w-40 h-40 rounded-full border-8 z-30 ${
                    highestRarity === 'mythic'
                      ? 'border-amber-200 shadow-[0_0_120px_#fde047]'
                      : highestRarity === 'epic'
                      ? 'border-fuchsia-300 shadow-[0_0_100px_#d946ef]'
                      : 'border-cyan-300 shadow-[0_0_90px_#38bdf8]'
                  }`}
                />
                {TEAR_SHARDS.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ x: 0, y: 0, scale: 1.2, rotate: 0, opacity: 1 }}
                    animate={{ x: s.x, y: s.y, scale: 0.15, rotate: s.rot, opacity: 0 }}
                    transition={{ duration: 0.58, ease: 'easeOut' }}
                    className="pointer-events-none absolute z-30 clip-diamond"
                    style={{
                      width: s.size,
                      height: s.size,
                      background:
                        highestRarity === 'mythic'
                          ? s.id % 3 === 0
                            ? '#fde047'
                            : s.id % 3 === 1
                            ? '#e879f9'
                            : '#38bdf8'
                          : RARITY_AURA[highestRarity].particleColor,
                      boxShadow: `0 0 12px ${RARITY_AURA[highestRarity].particleColor}`,
                    }}
                  />
                ))}
                {/* Blinding screen whiteout flash */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.95, 0] }}
                  transition={{ duration: 0.58 }}
                  className="pointer-events-none fixed inset-0 z-50"
                  style={{
                    background:
                      highestRarity === 'mythic'
                        ? 'radial-gradient(circle, #ffffff 0%, #fef08a 45%, #d946ef 100%)'
                        : highestRarity === 'epic'
                        ? 'radial-gradient(circle, #ffffff 0%, #e879f9 55%, #6366f1 100%)'
                        : 'radial-gradient(circle, #ffffff 0%, #bae6fd 60%, #0284c7 100%)',
                  }}
                />
              </>
            )}

            <motion.div
              onMouseMove={handlePackHover}
              onMouseLeave={() => setPackTilt({ rx: 0, ry: 0 })}
              animate={
                stage === 'tearing'
                  ? { scale: 1.32, opacity: 0, rotateY: 22 }
                  : {
                      scale: 1 + tearProgress * 0.0012,
                      opacity: 1,
                      rotateX: packTilt.rx,
                      rotateY: packTilt.ry,
                    }
              }
              transition={{ duration: stage === 'tearing' ? 0.38 : 0.18 }}
              className="relative w-64 h-88 rounded-3xl p-[4px] shadow-[0_0_85px_rgba(168,85,247,0.55)]"
              style={{
                background:
                  highestRarity === 'mythic'
                    ? 'linear-gradient(135deg, #fde047, #f43f5e, #d946ef, #38bdf8, #fde047)'
                    : `linear-gradient(135deg, ${activePack.accentFrom}, #ffffff99, ${activePack.accentTo})`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="w-full h-full rounded-[20px] flex flex-col justify-between overflow-hidden relative"
                style={{
                  background: `radial-gradient(circle at 50% 40%, ${activePack.accentFrom}77, #070914 78%)`,
                }}
              >
                {/* Interactive Ripping Foil Top Cap */}
                <motion.div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  animate={{
                    y: tearProgress > 5 ? -(tearProgress * 0.25) : 0,
                    rotate: tearProgress > 5 ? -(tearProgress * 0.16) : 0,
                  }}
                  className="relative h-16 bg-gradient-to-r from-slate-900/95 via-white/25 to-slate-900/95 border-b-2 border-dashed border-amber-300/90 flex items-center justify-center cursor-ew-resize touch-none z-20"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300 via-white to-cyan-300 transition-all opacity-85"
                    style={{ width: `${tearProgress}%` }}
                  />
                  <span className="relative z-10 text-[11px] font-display font-extrabold tracking-[0.22em] text-white uppercase drop-shadow">
                    ➔ SWIPE TO RIP ➔
                  </span>
                </motion.div>

                {/* Light Beam Leaking Through the Tear Seam */}
                {tearProgress > 4 && (
                  <div
                    className="pointer-events-none absolute top-14 left-0 h-4 blur-md z-10"
                    style={{
                      width: `${tearProgress}%`,
                      background:
                        highestRarity === 'mythic'
                          ? 'linear-gradient(90deg, #fde047, #ffffff, #e879f9)'
                          : '#ffffff',
                    }}
                  />
                )}

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
                  <Sparkles
                    className={`w-14 h-14 animate-pulse ${
                      highestRarity === 'mythic' ? 'text-amber-200' : 'text-cyan-200'
                    }`}
                  />
                  <div className="mt-4 font-display text-xl font-extrabold text-white">
                    {activePack.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-300 uppercase tracking-widest">
                    5 Holographic Cards Inside
                  </div>
                  <div className="pointer-events-none absolute inset-0 holo-foil opacity-65 mix-blend-screen" />
                </div>
              </div>
            </motion.div>
          </div>

          <button
            type="button"
            disabled={stage === 'tearing'}
            onClick={completeTear}
            className="mt-8 relative overflow-hidden shine-sweep clip-skew-btn px-9 py-3.5 bg-gradient-to-r from-amber-500 via-fuchsia-600 to-cyan-500 border border-amber-200/80 text-white font-display font-extrabold text-sm tracking-wider shadow-[0_0_32px_rgba(217,70,239,0.65)] hover:brightness-110 cursor-pointer disabled:opacity-50"
          >
            RIP PACK OPEN!
          </button>
        </div>
      )}

      {/* STAGE 3: 5-CARD CINEMATIC AURA REVEAL */}
      {stage === 'reveal' && packResult && activePack && (
        <div className="relative z-10 max-w-6xl w-full mx-auto flex-1 flex flex-col items-center justify-center py-6">
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              {allRevealed ? 'Pack Opening Summary' : 'Tap Each Glowing Aura to Reveal!'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Aura Glow: <span className="text-sky-300 font-semibold">Blue = Rare</span> •{' '}
              <span className="text-purple-300 font-semibold">Purple = Epic</span> •{' '}
              <span className="text-amber-300 font-semibold">Prismatic Gold = Mythic / Fusion</span>
            </p>
          </div>

          <div
            className="flex flex-wrap items-center justify-center gap-5 sm:gap-6"
            style={{ perspective: 1100 }}
          >
            {packResult.pulls.map((pull, idx) => {
              const card = CARD_MAP[pull.cardId];
              const isOpen = revealedSlots[idx];
              const aura = RARITY_AURA[pull.rarity];
              const isHighRarity = pull.rarity === 'epic' || pull.rarity === 'mythic';

              return (
                <motion.div
                  key={`${pull.cardId}_${idx}`}
                  initial={{ y: 42, opacity: 0, scale: 0.78 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.08, type: 'spring', stiffness: 210, damping: 18 }}
                  className="flex flex-col items-center gap-2 relative"
                >
                  {/* Explosive Spark Burst on Reveal! */}
                  <AnimatePresence>
                    {slotBurstId[idx] > 0 && isOpen && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30 overflow-visible">
                        <motion.div
                          key={`ring_${slotBurstId[idx]}`}
                          initial={{ scale: 0.35, opacity: 1 }}
                          animate={{ scale: pull.rarity === 'mythic' ? 2.4 : 1.75, opacity: 0 }}
                          transition={{ duration: 0.62, ease: 'easeOut' }}
                          className={`w-32 h-32 rounded-full border-4 ${aura.burstBorder}`}
                        />
                        {isHighRarity &&
                          CARD_SPARKS.map((sp) => (
                            <motion.div
                              key={sp.id}
                              initial={{ x: 0, y: 0, scale: 1.1, opacity: 1 }}
                              animate={{
                                x: sp.x * (pull.rarity === 'mythic' ? 1.35 : 0.95),
                                y: sp.y * (pull.rarity === 'mythic' ? 1.35 : 0.95),
                                scale: 0.15,
                                rotate: sp.rot,
                                opacity: 0,
                              }}
                              transition={{ duration: 0.68, ease: 'easeOut' }}
                              className="absolute w-3 h-3 clip-diamond"
                              style={{
                                background:
                                  pull.rarity === 'mythic' && sp.id % 2 === 0
                                    ? '#e879f9'
                                    : aura.particleColor,
                                boxShadow: `0 0 12px ${aura.particleColor}`,
                              }}
                            />
                          ))}
                      </div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {!isOpen ? (
                      <motion.button
                        key="back"
                        type="button"
                        whileHover={{ scale: 1.08, y: -8 }}
                        exit={{ rotateY: 90, opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.22 }}
                        onClick={() => revealSlot(idx)}
                        className={`relative rounded-2xl p-1 border-2 ${aura.ring} ${aura.glow} cursor-pointer ${
                          pull.rarity === 'mythic' ? 'animate-pulse' : ''
                        }`}
                      >
                        {pull.rarity === 'mythic' && (
                          <div
                            className="pointer-events-none absolute -inset-2 rounded-2xl opacity-55 blur-md"
                            style={{
                              background:
                                'linear-gradient(135deg, #fde047, #f43f5e, #d946ef, #38bdf8)',
                            }}
                          />
                        )}
                        <div className="relative">
                          <Card card={card} size="md" faceDown />
                        </div>
                        <span
                          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-950 border ${aura.ring} ${aura.label} text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap shadow-lg`}
                        >
                          {pull.rarity === 'mythic' ? '★ MYTHIC ★' : pull.rarity}
                        </span>
                      </motion.button>
                    ) : (
                      <motion.div
                        key="front"
                        initial={{
                          rotateY: -100,
                          opacity: 0,
                          scale: pull.rarity === 'mythic' ? 1.25 : 0.9,
                        }}
                        animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                        className="relative"
                      >
                        {pull.rarity === 'mythic' && (
                          <div
                            className="pointer-events-none absolute -inset-2.5 rounded-2xl blur-lg opacity-75 animate-pulse"
                            style={{
                              background:
                                'linear-gradient(135deg, #fde047, #f43f5e, #c084fc, #38bdf8)',
                            }}
                          />
                        )}
                        <div className="relative">
                          <Card card={card} size="md" interactiveTilt />
                        </div>
                        {pull.rarity === 'mythic' && (
                          <span className="absolute -top-3.5 right-0 z-30 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-fuchsia-400 text-slate-950 font-display font-black text-[9.5px] tracking-wider shadow-[0_0_16px_rgba(251,191,36,0.9)]">
                            ★ MYTHIC!
                          </span>
                        )}
                        {pull.isNew && (
                          <span className="absolute -top-2.5 -left-2 z-30 px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-extrabold text-[10px] shadow-lg">
                            NEW!
                          </span>
                        )}
                        {pull.autoDismantled && (
                          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-fuchsia-950 border border-fuchsia-400 text-fuchsia-200 font-bold text-[10px] shadow-lg">
                            EXTRA → +{pull.dustGained} DUST
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Dust summary if auto-dismantled */}
          {allRevealed && packResult.totalDustGained > 0 && (
            <div className="mt-7 px-4 py-2 rounded-xl bg-fuchsia-950/60 border border-fuchsia-400/60 text-fuchsia-200 text-xs font-bold flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Auto-Dismantled excess copies (&gt;3) for +{packResult.totalDustGained} Aether Dust!
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {!allRevealed && (
              <button
                type="button"
                onClick={revealAll}
                className="relative overflow-hidden shine-sweep clip-skew-btn px-7 py-2.5 bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white font-display font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 cursor-pointer"
              >
                <Eye className="w-4 h-4" /> REVEAL ALL
              </button>
            )}

            {allRevealed && (
              <>
                <button
                  type="button"
                  disabled={coins < activePack.price}
                  onClick={() => handlePurchase(activePack)}
                  className={`clip-skew-btn px-7 py-2.5 font-display font-bold text-xs tracking-wider flex items-center gap-2 ${
                    coins >= activePack.price
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 text-white shadow-lg hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <RotateCw className="w-4 h-4" /> OPEN ANOTHER ({activePack.price} Coins)
                </button>
                <button
                  type="button"
                  onClick={() => setStage('browse')}
                  className="clip-skew-btn px-6 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-400/60 font-display font-bold text-xs tracking-wider cursor-pointer"
                >
                  BACK TO SHOP
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
