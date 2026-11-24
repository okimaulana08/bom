import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Crown, Layers, Shield, Sparkles, Swords } from 'lucide-react';
import type { Faction } from '../engine/types';
import type { CutInBanner } from '../store/duelStore';
import { CARD_MAP } from '../data/cards';
import { getCardArtPresentation } from '../data/cardArtStyle';
import { Card } from './Card';

interface FusionOverlayProps {
  cutIn: CutInBanner | null;
  onDismiss: () => void;
}

const FACTION_HEX: Record<Faction, { main: string; light: string; border: string; bg: string }> = {
  pyroclast: {
    main: '#f97316',
    light: '#fef08a',
    border: 'border-orange-400',
    bg: 'from-orange-950/90 via-red-900/75 to-amber-950/90',
  },
  cryo_mecha: {
    main: '#38bdf8',
    light: '#e0f2fe',
    border: 'border-cyan-300',
    bg: 'from-cyan-950/90 via-sky-900/75 to-indigo-950/90',
  },
  umbra: {
    main: '#c026d3',
    light: '#f5d0fe',
    border: 'border-fuchsia-400',
    bg: 'from-purple-950/90 via-fuchsia-950/80 to-slate-950/90',
  },
  chrono: {
    main: '#818cf8',
    light: '#fef08a',
    border: 'border-indigo-300',
    bg: 'from-indigo-950/90 via-blue-950/80 to-amber-950/85',
  },
  sylvan: {
    main: '#10b981',
    light: '#d9f99d',
    border: 'border-emerald-300',
    bg: 'from-emerald-950/90 via-teal-900/75 to-slate-950/90',
  },
};

const SPEED_RAY_ANGLES = Array.from({ length: 24 }, (_, i) => i * 15);

const SpeedLinesBackdrop: React.FC<{ color: string; opacity?: number }> = ({
  color,
  opacity = 0.28,
}) => (
  <motion.svg
    viewBox="0 0 1000 1000"
    initial={{ rotate: 0, scale: 1.15, opacity: 0 }}
    animate={{ rotate: 18, scale: 1, opacity }}
    transition={{ duration: 1.8, ease: 'easeOut' }}
    className="pointer-events-none absolute w-[150vmax] h-[150vmax]"
    fill="none"
  >
    {SPEED_RAY_ANGLES.map((deg, idx) => (
      <polygon
        key={deg}
        points="500,500 492,0 508,0"
        fill={color}
        opacity={idx % 2 === 0 ? 0.85 : 0.4}
        transform={`rotate(${deg} 500 500)`}
      />
    ))}
  </motion.svg>
);

export const FusionOverlay: React.FC<FusionOverlayProps> = ({ cutIn, onDismiss }) => {
  const card = cutIn ? CARD_MAP[cutIn.cardId] : null;
  const faction: Faction = cutIn?.faction ?? card?.faction ?? 'chrono';
  const theme = FACTION_HEX[faction];

  const mat1Faction: Faction = cutIn?.materialFactions?.[0] ?? 'pyroclast';
  const mat2Faction: Faction = cutIn?.materialFactions?.[1] ?? 'cryo_mecha';
  const artPres = card ? getCardArtPresentation(card) : null;

  return (
    <AnimatePresence>
      {cutIn && card && (
        <motion.div
          key={cutIn.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-md cursor-pointer overflow-hidden"
        >
          {/* ================= 1. MULTI-STAGE RIFT FUSION VORTEX ================= */}
          {cutIn.kind === 'fusion' && (
            <>
              <SpeedLinesBackdrop color={theme.light} opacity={0.22} />

              {/* Dual-Faction Swirling Galaxy Rings */}
              <motion.div
                initial={{ scale: 0.15, rotate: 0, opacity: 0.95 }}
                animate={{ scale: 1.75, rotate: 420, opacity: 0.6 }}
                transition={{ duration: 2.1, ease: 'easeOut' }}
                className="pointer-events-none absolute w-[640px] h-[640px] rounded-full border-[5px] border-dashed"
                style={{
                  borderColor: FACTION_HEX[mat1Faction].main,
                  boxShadow: `0 0 110px ${FACTION_HEX[mat1Faction].main}`,
                }}
              />
              <motion.div
                initial={{ scale: 1.9, rotate: 0, opacity: 0.8 }}
                animate={{ scale: 0.55, rotate: -480, opacity: 0.9 }}
                transition={{ duration: 1.85, ease: 'easeInOut' }}
                className="pointer-events-none absolute w-[460px] h-[460px] rounded-full border-[5px]"
                style={{
                  borderColor: FACTION_HEX[mat2Faction].main,
                  boxShadow: `0 0 95px ${FACTION_HEX[mat2Faction].main}`,
                }}
              />
              <motion.div
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.2, 2.2, 2.8], opacity: [0, 0.9, 0] }}
                transition={{ delay: 0.55, duration: 0.7, ease: 'easeOut' }}
                className="pointer-events-none absolute w-[360px] h-[360px] rounded-full border-4 border-white shadow-[0_0_90px_#ffffff]"
              />

              {/* Singularity Whiteout Flash at Convergence */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.92, 0] }}
                transition={{ delay: 0.54, duration: 0.45, ease: 'easeOut' }}
                className="pointer-events-none fixed inset-0 z-30 bg-white"
              />
            </>
          )}

          {/* ================= 2. MYTHIC / BOSS ACE SUMMON CUT-IN ================= */}
          {cutIn.kind === 'ace_summon' && artPres && (
            <>
              <SpeedLinesBackdrop color={theme.main} opacity={0.26} />
              {/* Diagonal Master-Duel Parallax Artwork Band */}
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: '0%', opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.34, ease: 'easeOut' }}
                className={`pointer-events-none absolute inset-x-0 h-60 sm:h-72 -skew-y-3 border-y-4 ${theme.border} bg-gradient-to-r ${theme.bg} overflow-hidden shadow-[0_0_90px_rgba(0,0,0,0.95)]`}
              >
                <motion.img
                  src={artPres.src}
                  alt=""
                  initial={{ scale: 1.55, x: -70, opacity: 0.35 }}
                  animate={{ scale: 1.25, x: 40, opacity: 0.52 }}
                  transition={{ duration: 1.45, ease: 'easeOut' }}
                  className="w-full h-full object-cover object-top mix-blend-luminosity"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, rgba(4,5,12,0.95) 0%, ${theme.main}44 50%, rgba(4,5,12,0.95) 100%)`,
                  }}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.35 }}
                className="pointer-events-none fixed inset-0 z-30 bg-white"
              />
            </>
          )}

          {/* ================= 3. EVOLUTION PILLAR OF LIGHT ================= */}
          {cutIn.kind === 'evolve' && (
            <>
              <SpeedLinesBackdrop color="#fde047" opacity={0.24} />
              {/* Vertical Sky-to-Earth Golden Pillar */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 1.35, 0.85], opacity: [0, 0.95, 0.65] }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-y-0 w-72 sm:w-96"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.35) 22%, rgba(254,249,195,0.85) 50%, rgba(251,191,36,0.35) 78%, transparent 100%)',
                }}
              />
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1.8, opacity: [0, 0.85, 0.45] }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="pointer-events-none absolute w-[540px] h-[540px] rounded-full blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(254,240,138,0.65) 0%, rgba(245,158,11,0.28) 45%, transparent 72%)',
                }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.78, 0] }}
                transition={{ delay: 0.16, duration: 0.38 }}
                className="pointer-events-none fixed inset-0 z-30 bg-amber-100"
              />
            </>
          )}

          {/* ================= 4. TRAP ACTIVATION + CHAIN LINK RING ================= */}
          {cutIn.kind === 'ambush' && (
            <>
              <SpeedLinesBackdrop color="#f43f5e" opacity={0.22} />
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.26 }}
                className="pointer-events-none absolute inset-x-0 h-56 bg-gradient-to-r from-transparent via-fuchsia-900/45 to-transparent border-y-2 border-fuchsia-400/80"
              />
              {/* Spinning Neon Chain Link Ring */}
              <motion.div
                initial={{ scale: 0.3, rotate: -90, opacity: 0 }}
                animate={{ scale: 1.15, rotate: 90, opacity: 0.9 }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
                className="pointer-events-none absolute w-[370px] h-[370px] rounded-full border-4 border-dashed border-fuchsia-400 shadow-[0_0_70px_rgba(217,70,239,0.85)]"
              />
            </>
          )}

          {/* ================= CENTRAL SHOWCASE STAGE ================= */}
          <div
            className="relative z-20 flex flex-col items-center gap-3.5 px-4 sm:px-6"
            style={{ perspective: 1100 }}
          >
            {/* Header Badge & Title */}
            <motion.div
              initial={{ y: -36, scale: 0.72, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="text-center"
            >
              <div
                className={`inline-flex items-center gap-2 clip-skew-btn px-4 py-1 border text-[11px] font-display font-extrabold tracking-[0.26em] uppercase mb-1.5 ${
                  cutIn.kind === 'maximum'
                    ? 'bg-gradient-to-r from-amber-600/95 via-fuchsia-700/95 to-cyan-600/95 border-amber-200 text-white shadow-[0_0_24px_rgba(251,191,36,0.85)]'
                    : cutIn.kind === 'skill'
                    ? 'bg-indigo-950/95 border-amber-300 text-amber-200'
                    : cutIn.kind === 'fusion'
                    ? 'bg-fuchsia-950/90 border-fuchsia-300 text-fuchsia-100'
                    : cutIn.kind === 'evolve'
                    ? 'bg-amber-950/90 border-amber-300 text-amber-100'
                    : cutIn.kind === 'ace_summon'
                    ? `bg-slate-950/90 ${theme.border} text-white`
                    : 'bg-rose-950/90 border-fuchsia-400 text-fuchsia-100'
                }`}
              >
                {cutIn.kind === 'maximum' && <Crown className="w-3.5 h-3.5 text-amber-200" />}
                {cutIn.kind === 'skill' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                {cutIn.kind === 'fusion' && <Layers className="w-3.5 h-3.5" />}
                {cutIn.kind === 'evolve' && <Sparkles className="w-3.5 h-3.5" />}
                {cutIn.kind === 'ace_summon' && <Crown className="w-3.5 h-3.5 text-amber-300" />}
                {cutIn.kind === 'ambush' && <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />}
                {cutIn.kind === 'maximum'
                  ? '3-PIECE CONVERGENCE • RUSH MAXIMUM'
                  : cutIn.kind === 'skill'
                  ? 'DUELIST SIGNATURE SKILL'
                  : cutIn.kind === 'ambush'
                  ? 'CHAIN LINK 1 • TRAP'
                  : cutIn.actor === 'player'
                  ? 'YOUR SIGNATURE PLAY'
                  : 'RIVAL SIGNATURE PLAY'}
              </div>

              <h2
                className={`font-display text-3xl sm:text-5xl font-black italic tracking-wider drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] ${
                  cutIn.kind === 'maximum'
                    ? 'bg-gradient-to-r from-amber-200 via-white to-fuchsia-300 bg-clip-text text-transparent'
                    : cutIn.kind === 'skill'
                    ? 'bg-gradient-to-r from-amber-200 via-cyan-200 to-amber-300 bg-clip-text text-transparent'
                    : cutIn.kind === 'fusion'
                    ? 'bg-gradient-to-r from-cyan-200 via-white to-fuchsia-300 bg-clip-text text-transparent'
                    : cutIn.kind === 'evolve'
                    ? 'bg-gradient-to-r from-yellow-100 via-amber-300 to-orange-400 bg-clip-text text-transparent'
                    : cutIn.kind === 'ace_summon'
                    ? 'bg-gradient-to-r from-amber-100 via-white to-cyan-200 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200 bg-clip-text text-transparent'
                }`}
              >
                {cutIn.title}
              </h2>
              <p className="text-slate-100 font-bold tracking-wide text-sm sm:text-lg mt-0.5 drop-shadow">
                {cutIn.subtitle}
              </p>
            </motion.div>

            {/* Skill Duelist Portrait OR 3-Piece Maximum Formation OR Fusion/Ace Reveal */}
            {cutIn.kind === 'skill' && cutIn.portrait ? (
              <motion.div
                initial={{ scale: 0.72, opacity: 0, x: -60 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="relative my-2"
              >
                <div
                  className="pointer-events-none absolute -inset-4 rounded-full blur-2xl opacity-75"
                  style={{ backgroundColor: theme.main }}
                />
                <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-white to-cyan-400 shadow-2xl">
                  <img
                    src={cutIn.portrait}
                    alt={cutIn.subtitle}
                    className="w-full h-full rounded-full object-cover object-top"
                  />
                </div>
              </motion.div>
            ) : cutIn.kind === 'maximum' ? (
              <div className="flex items-center justify-center gap-2 sm:gap-4 relative my-1">
                {cutIn.materialCardIds?.[0] && CARD_MAP[cutIn.materialCardIds[0]] && (
                  <motion.div
                    initial={{ x: -120, opacity: 0, rotate: -14 }}
                    animate={{ x: 0, opacity: 1, rotate: -4 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                  >
                    <Card card={CARD_MAP[cutIn.materialCardIds[0]]} size="sm" interactiveTilt={false} />
                  </motion.div>
                )}
                <motion.div
                  initial={{ scale: 0.4, opacity: 0, y: -30 }}
                  animate={{ scale: 1.08, opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 15 }}
                  className="relative z-10"
                >
                  <div className="pointer-events-none absolute -inset-4 rounded-2xl blur-xl opacity-85 bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400" />
                  <div className="relative">
                    <Card card={card} size="md" interactiveTilt={false} />
                  </div>
                </motion.div>
                {cutIn.materialCardIds?.[1] && CARD_MAP[cutIn.materialCardIds[1]] && (
                  <motion.div
                    initial={{ x: 120, opacity: 0, rotate: 14 }}
                    animate={{ x: 0, opacity: 1, rotate: 4 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                  >
                    <Card card={CARD_MAP[cutIn.materialCardIds[1]]} size="sm" interactiveTilt={false} />
                  </motion.div>
                )}
              </div>
            ) : (
            <div className="flex items-center justify-center gap-4 relative my-1">
              {cutIn.kind === 'fusion' &&
                cutIn.materialCardIds?.[0] &&
                CARD_MAP[cutIn.materialCardIds[0]] && (
                  <motion.div
                    initial={{ x: -200, y: -70, opacity: 1, scale: 0.9, rotate: -28 }}
                    animate={{ x: 85, y: 10, opacity: 0, scale: 0.15, rotate: 240 }}
                    transition={{ duration: 0.62, ease: 'easeIn' }}
                    className="hidden sm:block pointer-events-none absolute -left-44"
                  >
                    <Card
                      card={CARD_MAP[cutIn.materialCardIds[0]]}
                      size="sm"
                      interactiveTilt={false}
                    />
                  </motion.div>
                )}

              <motion.div
                initial={
                  cutIn.kind === 'fusion'
                    ? { scale: 0.15, opacity: 0, rotateY: 220 }
                    : cutIn.kind === 'ambush'
                    ? { scale: 0.72, opacity: 0, rotateY: 180 }
                    : cutIn.kind === 'ace_summon'
                    ? { scale: 1.55, opacity: 0, y: -45 }
                    : { scale: 0.55, opacity: 0, y: 35 }
                }
                animate={{ scale: 1.06, opacity: 1, rotateY: 0, y: 0 }}
                transition={{
                  delay: cutIn.kind === 'fusion' ? 0.56 : 0.08,
                  type: 'spring',
                  stiffness: 215,
                  damping: 16,
                }}
                className="relative"
              >
                {/* Glowing Backplate Aura */}
                <div
                  className="pointer-events-none absolute -inset-4 rounded-2xl blur-xl opacity-75"
                  style={{ backgroundColor: theme.main }}
                />
                <div className="relative">
                  <Card
                    card={card}
                    size="lg"
                    forceEvolved={cutIn.kind === 'evolve'}
                    interactiveTilt={false}
                  />
                </div>
              </motion.div>

              {cutIn.kind === 'fusion' &&
                cutIn.materialCardIds?.[1] &&
                CARD_MAP[cutIn.materialCardIds[1]] && (
                  <motion.div
                    initial={{ x: 200, y: 70, opacity: 1, scale: 0.9, rotate: 28 }}
                    animate={{ x: -85, y: -10, opacity: 0, scale: 0.15, rotate: -240 }}
                    transition={{ duration: 0.62, ease: 'easeIn' }}
                    className="hidden sm:block pointer-events-none absolute -right-44"
                  >
                    <Card
                      card={CARD_MAP[cutIn.materialCardIds[1]]}
                      size="sm"
                      interactiveTilt={false}
                    />
                  </motion.div>
                )}
            </div>
            )}

            {/* Metallic ATK / DEF Slam Nameplate */}
            {cutIn.atk !== undefined && cutIn.def !== undefined && (
              <motion.div
                initial={{ scale: 1.6, opacity: 0, y: 18 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  delay: cutIn.kind === 'fusion' ? 0.82 : 0.24,
                  type: 'spring',
                  stiffness: 320,
                  damping: 18,
                }}
                className="flex items-center gap-3 clip-skew-btn px-6 py-1.5 bg-slate-950/92 border-2 border-amber-300/80 shadow-[0_0_28px_rgba(251,191,36,0.45)]"
              >
                <div className="flex items-center gap-1.5 font-mono-num font-black text-base sm:text-xl text-amber-200">
                  <Swords className="w-4 h-4 text-orange-400" />
                  <span>{cutIn.atk}</span>
                  <span className="text-[10px] text-amber-400/80 font-display">ATK</span>
                </div>
                <span className="text-slate-600 font-bold">/</span>
                <div className="flex items-center gap-1.5 font-mono-num font-black text-base sm:text-xl text-cyan-200">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>{cutIn.def}</span>
                  <span className="text-[10px] text-cyan-400/80 font-display">DEF</span>
                </div>
              </motion.div>
            )}

            <span className="text-[10px] text-slate-400 uppercase tracking-[0.25em]">
              Click anywhere to skip
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
