import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  DamageFlash,
  FloatingVfx,
  PhaseBanner,
  SlashEffect,
  SummonBurst,
} from '../store/duelStore';
import { soundEngine } from '../audio/soundEngine';

interface FloatingBadgeListProps {
  items: FloatingVfx[];
}

export const FloatingBadgeList: React.FC<FloatingBadgeListProps> = ({ items }) => {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-40 overflow-visible">
      <AnimatePresence>
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12, scale: 0.65 }}
            animate={{ opacity: 1, y: -34 - idx * 18, scale: 1.18 }}
            exit={{ opacity: 0, y: -64, scale: 0.9 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className={`absolute font-mono-num font-extrabold text-xl drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] px-2.5 py-0.5 rounded-lg border ${
              item.tone === 'damage'
                ? 'bg-rose-950/95 border-rose-400 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.75)]'
                : item.tone === 'heal'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.65)]'
                : item.tone === 'buff'
                ? 'bg-amber-950/95 border-amber-400 text-amber-200'
                : 'bg-cyan-950/95 border-cyan-300 text-cyan-200'
            }`}
          >
            {item.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ScreenShakeWrapperProps {
  shakeKey: number;
  intensity?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}

export const ScreenShakeWrapper: React.FC<ScreenShakeWrapperProps> = ({
  shakeKey,
  intensity = 1,
  children,
  className = '',
}) => {
  const amp = intensity === 3 ? 17 : intensity === 2 ? 10 : 5;
  const yAmp = intensity === 3 ? 11 : intensity === 2 ? 6 : 3;

  return (
    <motion.div
      key={shakeKey}
      initial={shakeKey > 0 ? { x: 0, y: 0 } : false}
      animate={
        shakeKey > 0
          ? {
              x: [0, -amp, amp, -amp * 0.72, amp * 0.65, -amp * 0.35, amp * 0.2, 0],
              y: [0, yAmp, -yAmp, yAmp * 0.65, -yAmp * 0.5, yAmp * 0.2, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{ duration: intensity === 3 ? 0.55 : 0.4, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface DamageVignetteOverlayProps {
  flash: DamageFlash | null;
}

export const DamageVignetteOverlay: React.FC<DamageVignetteOverlayProps> = ({ flash }) => {
  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="pointer-events-none fixed inset-0 z-[45] overflow-hidden"
        >
          {/* Pulsing Crimson/Gold Edge Impact Vignette */}
          <motion.div
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: flash.severity === 'lethal' ? 1.15 : 0.58, ease: 'easeOut' }}
            className="absolute inset-0"
            style={{
              background:
                flash.target === 'player'
                  ? flash.severity === 'lethal' || flash.severity === 'critical'
                    ? 'radial-gradient(ellipse at center, rgba(244,63,94,0.12) 32%, rgba(225,29,72,0.58) 78%, rgba(136,19,55,0.9) 100%)'
                    : 'radial-gradient(ellipse at center, transparent 48%, rgba(225,29,72,0.42) 100%)'
                  : flash.severity === 'lethal'
                  ? 'radial-gradient(ellipse at center, rgba(254,240,138,0.22) 25%, rgba(249,115,22,0.48) 76%, rgba(225,29,72,0.75) 100%)'
                  : 'radial-gradient(ellipse at center, transparent 58%, rgba(251,146,60,0.28) 100%)',
            }}
          />

          {/* Heavy / Critical / Lethal Corner Impact Fracture Lines */}
          {flash.severity !== 'light' && (
            <motion.svg
              viewBox="0 0 1000 600"
              preserveAspectRatio="none"
              initial={{ opacity: 0.9, scale: 1.03 }}
              animate={{ opacity: 0, scale: 1 }}
              transition={{ duration: flash.severity === 'lethal' ? 1.1 : 0.52 }}
              className="absolute inset-0 w-full h-full"
              fill="none"
            >
              <path
                d="M 0 0 L 125 90 L 95 145 L 210 185 M 125 90 L 195 62"
                stroke={flash.target === 'player' ? '#fb7185' : '#fde047'}
                strokeWidth={flash.severity === 'lethal' ? 4 : 2.5}
              />
              <path
                d="M 1000 0 L 865 95 L 910 155 L 795 190 M 865 95 L 800 58"
                stroke={flash.target === 'player' ? '#fb7185' : '#fde047'}
                strokeWidth={flash.severity === 'lethal' ? 4 : 2.5}
              />
              <path
                d="M 0 600 L 145 505 L 115 445 L 225 415"
                stroke={flash.target === 'player' ? '#f43f5e' : '#fb923c'}
                strokeWidth={flash.severity === 'lethal' ? 4 : 2.5}
              />
              <path
                d="M 1000 600 L 860 498 L 905 442 L 785 410"
                stroke={flash.target === 'player' ? '#f43f5e' : '#fb923c'}
                strokeWidth={flash.severity === 'lethal' ? 4 : 2.5}
              />
            </motion.svg>
          )}

          {/* Epic Anime FINAL BLOW Banner on LP -> 0 */}
          {flash.severity === 'lethal' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.15, times: [0, 0.14, 0.78, 1] }}
                className="w-full py-6 bg-gradient-to-r from-transparent via-rose-950/95 via-50% to-transparent border-y-4 border-amber-300 shadow-[0_0_90px_rgba(251,191,36,0.9)] flex flex-col items-center justify-center"
              >
                <motion.span
                  initial={{ letterSpacing: '0.6em', opacity: 0 }}
                  animate={{ letterSpacing: '0.32em', opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="font-display text-xs sm:text-sm font-black text-amber-300 uppercase"
                >
                  LP SHATTERED • -{flash.amount} LP
                </motion.span>
                <motion.h2
                  initial={{ scale: 2.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="font-display text-4xl sm:text-7xl font-black italic tracking-widest bg-gradient-to-r from-amber-100 via-yellow-300 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_6px_28px_rgba(244,63,94,0.95)]"
                >
                  FINAL BLOW!
                </motion.h2>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface SummonSlotFlashProps {
  bursts: SummonBurst[];
}

export const SummonSlotFlash: React.FC<SummonSlotFlashProps> = ({ bursts }) => {
  if (bursts.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ scale: 0.4, opacity: 0.95 }}
            animate={{ scale: b.isAce ? 1.85 : 1.45, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.58, ease: 'easeOut' }}
            className={`absolute w-28 h-28 rounded-full border-4 ${
              b.faction === 'pyroclast'
                ? 'border-orange-400 shadow-[0_0_32px_#f97316]'
                : b.faction === 'cryo_mecha'
                ? 'border-cyan-300 shadow-[0_0_32px_#38bdf8]'
                : b.faction === 'umbra'
                ? 'border-fuchsia-400 shadow-[0_0_32px_#d946ef]'
                : b.faction === 'sylvan'
                ? 'border-emerald-300 shadow-[0_0_32px_#34d399]'
                : 'border-amber-300 shadow-[0_0_32px_#fbbf24]'
            }`}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface FlipRevealWrapperProps {
  faceDown: boolean;
  children: React.ReactNode;
}

export const FlipRevealWrapper: React.FC<FlipRevealWrapperProps> = ({ faceDown, children }) => {
  const prevFaceDown = useRef(faceDown);
  const [flipKey, setFlipKey] = useState(0);

  useEffect(() => {
    if (prevFaceDown.current && !faceDown) {
      setFlipKey((k) => k + 1);
    }
    prevFaceDown.current = faceDown;
  }, [faceDown]);

  return (
    <motion.div
      key={flipKey}
      initial={flipKey > 0 ? { rotateY: 180, scale: 1.12 } : false}
      animate={{ rotateY: 0, scale: 1 }}
      transition={{ duration: 0.36, ease: 'easeOut' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
};

interface RollingLpCounterProps {
  value: number;
  className?: string;
}

export const RollingLpCounter: React.FC<RollingLpCounterProps> = ({ value, className = '' }) => {
  const [displayed, setDisplayed] = useState(value);
  const [flash, setFlash] = useState<'none' | 'damage' | 'heal'>('none');
  const currentRef = useRef(value);

  useEffect(() => {
    const startVal = currentRef.current;
    if (startVal === value) return;

    const isHeal = value > startVal;
    setFlash(isHeal ? 'heal' : 'damage');

    const durationMs = 460;
    const startTime = performance.now();
    let lastTickTime = 0;
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const raw = startVal + (value - startVal) * eased;
      const nextVal = t >= 1 ? value : Math.round(raw / 10) * 10;

      currentRef.current = nextVal;
      setDisplayed(nextVal);

      if (t < 1 && now - lastTickTime >= 62) {
        soundEngine.lpTick(isHeal);
        lastTickTime = now;
      }

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        soundEngine.lpTick(isHeal);
        setTimeout(() => setFlash('none'), 180);
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [value]);

  const flashClass =
    flash === 'damage'
      ? 'text-rose-300 scale-110 drop-shadow-[0_0_12px_rgba(244,63,94,0.95)]'
      : flash === 'heal'
      ? 'text-emerald-300 scale-110 drop-shadow-[0_0_12px_rgba(52,211,153,0.95)]'
      : '';

  return (
    <span className={`inline-block transition-all duration-150 ${className} ${flashClass}`}>
      {displayed}
    </span>
  );
};

interface PhaseBannerOverlayProps {
  banner: PhaseBanner | null;
}

export const PhaseBannerOverlay: React.FC<PhaseBannerOverlayProps> = ({ banner }) => {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
        >
          {/* Full-width sweeping anime band */}
          <motion.div
            initial={{ scaleY: 0.1, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0.1, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`relative w-full py-4 sm:py-5 border-y-2 backdrop-blur-md shadow-[0_0_60px_rgba(0,0,0,0.85)] ${
              banner.tone === 'battle'
                ? 'bg-gradient-to-r from-transparent via-amber-950/92 via-50% to-transparent border-amber-400/90'
                : banner.tone === 'opponent'
                ? 'bg-gradient-to-r from-transparent via-rose-950/92 via-50% to-transparent border-rose-400/90'
                : 'bg-gradient-to-r from-transparent via-cyan-950/92 via-50% to-transparent border-cyan-300/90'
            }`}
          >
            {/* Glowing laser accent rails */}
            <div
              className={`absolute inset-x-0 top-0 h-[2px] ${
                banner.tone === 'battle'
                  ? 'bg-gradient-to-r from-transparent via-amber-300 to-transparent'
                  : banner.tone === 'opponent'
                  ? 'bg-gradient-to-r from-transparent via-rose-400 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-cyan-300 to-transparent'
              }`}
            />

            <motion.div
              initial={{ x: -90, opacity: 0, scale: 0.92 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 110, opacity: 0 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center text-center px-4"
            >
              <span
                className={`text-[10px] sm:text-xs font-display font-extrabold tracking-[0.35em] uppercase ${
                  banner.tone === 'battle'
                    ? 'text-amber-300'
                    : banner.tone === 'opponent'
                    ? 'text-rose-300'
                    : 'text-cyan-300'
                }`}
              >
                {banner.subtitle}
              </span>
              <h2
                className={`font-display text-3xl sm:text-5xl font-black italic tracking-widest drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] ${
                  banner.tone === 'battle'
                    ? 'bg-gradient-to-r from-amber-200 via-orange-300 to-rose-400 bg-clip-text text-transparent'
                    : banner.tone === 'opponent'
                    ? 'bg-gradient-to-r from-rose-200 via-red-300 to-fuchsia-300 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-cyan-100 via-sky-300 to-indigo-300 bg-clip-text text-transparent'
                }`}
              >
                {banner.title}
              </h2>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ImpactSlashOverlayProps {
  effects: SlashEffect[];
}

const SHARD_VECTORS = [
  { x: -46, y: -38, rot: -45 },
  { x: 48, y: -32, rot: 52 },
  { x: -52, y: 24, rot: -110 },
  { x: 46, y: 36, rot: 120 },
  { x: 0, y: -56, rot: 20 },
  { x: 6, y: 52, rot: 165 },
];

export const ImpactSlashOverlay: React.FC<ImpactSlashOverlayProps> = ({ effects }) => {
  if (effects.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        {effects.map((fx) =>
          fx.kind === 'slash' ? (
            <motion.div
              key={fx.id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.55, 1.15, 1.25, 1.35] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <svg
                viewBox="0 0 140 140"
                className="w-36 h-36 overflow-visible drop-shadow-[0_0_16px_rgba(251,146,60,0.95)]"
              >
                <defs>
                  <linearGradient id={`slash_${fx.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
                    <stop offset="45%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="70%" stopColor="#f97316" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 16 124 Q 72 64 126 14"
                  stroke={`url(#slash_${fx.id})`}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={180}
                  fill="none"
                  initial={{ strokeDashoffset: 180 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
                <motion.path
                  d="M 24 118 Q 72 64 120 20"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={160}
                  fill="none"
                  initial={{ strokeDashoffset: 160 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key={fx.id}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.58, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {/* Expanding shatter shockwave ring */}
              <motion.div
                initial={{ scale: 0.25, opacity: 1 }}
                animate={{ scale: 1.75, opacity: 0 }}
                transition={{ duration: 0.48, ease: 'easeOut' }}
                className="w-24 h-24 rounded-full border-4 border-amber-300 shadow-[0_0_28px_rgba(244,63,94,0.95)]"
              />
              {/* Flying crystalline shatter shards */}
              {SHARD_VECTORS.map((vec, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                  animate={{
                    x: vec.x,
                    y: vec.y,
                    scale: 0.25,
                    rotate: vec.rot,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.52, ease: 'easeOut' }}
                  className="absolute w-3.5 h-3.5 bg-gradient-to-br from-amber-200 via-rose-400 to-fuchsia-500 clip-diamond shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                />
              ))}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};
