import React, { useRef, useState } from 'react';
import {
  Crown,
  EyeOff,
  Gem,
  Layers,
  Lock,
  Shield,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Star,
  Swords,
  Wand2,
} from 'lucide-react';
import type { BoardUnit, CardDef, Rarity } from '../engine/types';
import { FACTIONS } from '../data/factions';
import { KEYWORDS } from '../data/keywords';
import { getCardArtPresentation } from '../data/cardArtStyle';
import { getRequiredTributes } from '../engine/utils';

export interface CardProps {
  card: CardDef;
  unit?: BoardUnit;
  effectiveAtk?: number;
  effectiveDef?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  /** Shows a subtle owner peek label under a face-down set monster */
  ownerPeekLabel?: string;
  locked?: boolean;
  forceEvolved?: boolean;
  showEvolvedToggle?: boolean;
  interactiveTilt?: boolean;
  playableGlow?: boolean;
  evolvableGlow?: boolean;
  selected?: boolean;
  targetableGlow?: 'friendly' | 'enemy' | null;
  onClick?: () => void;
  onHover?: (card: CardDef, isEvolved: boolean) => void;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CardProps['size']>, string> = {
  xs: 'w-[96px] h-[136px] text-[8.5px]',
  sm: 'w-[106px] h-[150px] sm:w-[128px] sm:h-[182px] text-[9px] sm:text-[10px]',
  md: 'w-[144px] h-[204px] sm:w-[168px] sm:h-[238px] text-[10px] sm:text-[11px]',
  lg: 'w-[224px] h-[318px] sm:w-[252px] sm:h-[358px] text-[11px] sm:text-xs',
};

const RARITY_STYLES: Record<
  Rarity,
  { label: string; gemColor: string; foilOpacity: string; filigreeColor: string }
> = {
  common: {
    label: 'COMMON',
    gemColor: '#94a3b8',
    foilOpacity: 'opacity-0',
    filigreeColor: 'rgba(203, 213, 225, 0.55)',
  },
  rare: {
    label: 'RARE',
    gemColor: '#38bdf8',
    foilOpacity: 'opacity-25',
    filigreeColor: 'rgba(125, 211, 252, 0.85)',
  },
  epic: {
    label: 'EPIC',
    gemColor: '#c084fc',
    foilOpacity: 'opacity-45',
    filigreeColor: 'rgba(216, 180, 254, 0.92)',
  },
  mythic: {
    label: 'MYTHIC',
    gemColor: '#fbbf24',
    foilOpacity: 'opacity-70',
    filigreeColor: 'rgba(253, 224, 71, 0.95)',
  },
};

export const Card: React.FC<CardProps> = ({
  card,
  unit,
  effectiveAtk,
  effectiveDef,
  size = 'md',
  faceDown = false,
  ownerPeekLabel,
  locked = false,
  forceEvolved,
  showEvolvedToggle = false,
  interactiveTilt = true,
  playableGlow = false,
  evolvableGlow = false,
  selected = false,
  targetableGlow = null,
  onClick,
  onHover,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovering: false });
  const [previewEvolved, setPreviewEvolved] = useState(false);

  const isEvolved =
    forceEvolved !== undefined
      ? forceEvolved && Boolean(card.evolvedData)
      : unit
      ? unit.isEvolved
      : previewEvolved && Boolean(card.evolvedData);

  const evo = isEvolved ? card.evolvedData : undefined;
  const primaryFaction = FACTIONS[card.faction];
  const secondaryFaction = card.secondaryFaction ? FACTIONS[card.secondaryFaction] : null;
  const rarityMeta = RARITY_STYLES[card.rarity];
  const artPres = getCardArtPresentation(card, isEvolved);

  const displayName = evo ? evo.name : card.name;
  const displayAtk =
    effectiveAtk ?? (unit ? unit.currentAtk : evo ? evo.atk : card.atk);
  const displayDef =
    effectiveDef ?? (unit ? unit.currentDef : evo ? evo.def : card.def);
  const displayKeywords = unit
    ? unit.keywords
    : evo
    ? Array.from(new Set([...card.keywords, ...evo.keywords, 'Rush' as const]))
    : card.keywords;
  const displayText = evo ? evo.effectText : card.effectText;

  const isDualFusion = card.type === 'fusion_apex' && Boolean(secondaryFaction);
  const isPrismatic = Boolean(card.isExclusive);
  const isDefense = unit?.stance === 'defense';
  const isFaceDownUnit = faceDown || Boolean(unit?.faceDown);
  const isFrozen = (unit?.frozenTurns ?? 0) > 0;
  const hasWard = unit ? unit.wardActive : displayKeywords.includes('Ward');
  const reqTributes = getRequiredTributes(card);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 18,
      ry: (px - 0.5) * 18,
      gx: px * 100,
      gy: py * 100,
      hovering: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovering: false });
  };

  const handleMouseEnter = () => {
    if (onHover && (!isFaceDownUnit || ownerPeekLabel)) {
      onHover(card, isEvolved);
    }
  };

  let rimGradient: string;
  if (isPrismatic) {
    rimGradient =
      'linear-gradient(135deg, #fb7185 0%, #fbbf24 25%, #34d399 50%, #22d3ee 75%, #c084fc 100%)';
  } else if (isEvolved) {
    rimGradient =
      'linear-gradient(135deg, #fef08a 0%, #f59e0b 40%, #ffffff 52%, #fbbf24 68%, #b45309 100%)';
  } else if (card.type === 'arcana') {
    // Classic Yu-Gi-Oh! Spell Emerald-Teal metallic frame
    rimGradient =
      'linear-gradient(145deg, #a7f3d0 0%, #10b981 28%, #0f766e 64%, #2dd4bf 100%)';
  } else if (card.type === 'relic') {
    // Equip Spell Emerald-Gold metallic frame
    rimGradient =
      'linear-gradient(145deg, #6ee7b7 0%, #059669 34%, #fbbf24 72%, #fef08a 100%)';
  } else if (card.type === 'ambush') {
    // Classic Yu-Gi-Oh! Trap Crimson-Magenta metallic frame
    rimGradient =
      'linear-gradient(145deg, #fda4af 0%, #e11d48 28%, #9d174d 66%, #f43f5e 100%)';
  } else if (isDualFusion && secondaryFaction) {
    // Signature Dual-Faction Fusion split gradient with rainbow-white prism sheen!
    rimGradient = `linear-gradient(135deg, ${primaryFaction.primaryHex} 0%, ${primaryFaction.primaryHex} 38%, #fde047 46%, #ffffff 50%, #e879f9 54%, ${secondaryFaction.primaryHex} 62%, ${secondaryFaction.primaryHex} 100%)`;
  } else if (card.type === 'fusion_apex') {
    // Pure-Faction Fusion rainbow-violet prism rim
    rimGradient =
      'linear-gradient(135deg, #f43f5e 0%, #fbbf24 25%, #e879f9 50%, #38bdf8 75%, #9333ea 100%)';
  } else {
    rimGradient = `linear-gradient(155deg, ${primaryFaction.primaryHex} 0%, #94a3b8 22%, #1e293b 52%, ${primaryFaction.secondaryHex} 100%)`;
  }

  const outerShadow = selected
    ? 'drop-shadow-[0_0_16px_rgba(34,211,238,0.95)]'
    : targetableGlow === 'enemy'
    ? 'drop-shadow-[0_0_16px_rgba(244,63,94,0.95)]'
    : targetableGlow === 'friendly'
    ? 'drop-shadow-[0_0_16px_rgba(52,211,153,0.95)]'
    : evolvableGlow
    ? 'drop-shadow-[0_0_18px_rgba(251,191,36,0.95)]'
    : playableGlow
    ? 'drop-shadow-[0_0_14px_rgba(56,189,248,0.85)]'
    : 'drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)]';

  if (isFaceDownUnit) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        className={`relative select-none ${SIZE_CLASSES[size]} transition-transform duration-200 ${
          isDefense ? '-rotate-6' : ''
        } ${onClick ? 'cursor-pointer' : ''} ${outerShadow} ${className}`}
      >
        <div
          className="w-full h-full clip-chamfer-sm p-[3px] shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, #fbbf24 0%, #6366f1 48%, #ec4899 100%)',
          }}
        >
          <div className="w-full h-full clip-chamfer-sm bg-[#090b1a] flex flex-col items-center justify-center relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(129,140,248,0.65) 0%, transparent 65%)',
              }}
            />
            <svg
              viewBox="0 0 100 100"
              className="w-16 h-16 text-amber-300/75 animate-spin-slow"
              fill="none"
            >
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1.8" strokeDasharray="6 4" />
              <polygon points="50,12 84,50 50,88 16,50" stroke="#818cf8" strokeWidth="1.8" />
            </svg>
            <div className="absolute w-9 h-9 rounded-full bg-indigo-950 border border-amber-300/80 flex items-center justify-center shadow-[0_0_18px_rgba(251,191,36,0.5)]">
              {isDefense ? (
                <Shield className="w-4 h-4 text-cyan-300" />
              ) : (
                <EyeOff className="w-4 h-4 text-amber-200" />
              )}
            </div>
            <span className="mt-2 font-display text-[8px] tracking-[0.24em] text-amber-200/90 uppercase">
              {isDefense ? 'SET DEFENSE' : 'Aetherbound'}
            </span>
            {ownerPeekLabel && (
              <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-cyan-400/50 text-[8px] font-bold text-cyan-200 max-w-[92%] truncate">
                {ownerPeekLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const showFullBody = size === 'md' || size === 'lg';
  const showCompactKeywords = size === 'sm' || size === 'md' || size === 'lg';
  const filigreeStroke = isEvolved
    ? '#fde047'
    : card.type === 'arcana'
    ? '#6ee7b7'
    : card.type === 'relic'
    ? '#5eead4'
    : card.type === 'ambush'
    ? '#fb7185'
    : rarityMeta.filigreeColor;

  const lowerPanelGradient =
    card.type === 'arcana'
      ? showFullBody
        ? 'linear-gradient(180deg, rgba(4,47,46,0.28) 0%, rgba(4,47,46,0.04) 30%, rgba(4,47,46,0.72) 55%, rgba(3,38,34,0.95) 75%, rgba(2,26,24,0.99) 100%)'
        : 'linear-gradient(180deg, rgba(4,47,46,0.28) 0%, rgba(4,47,46,0.03) 44%, rgba(3,40,36,0.86) 72%, rgba(2,26,24,0.99) 100%)'
      : card.type === 'relic'
      ? showFullBody
        ? 'linear-gradient(180deg, rgba(6,48,42,0.28) 0%, rgba(6,48,42,0.04) 30%, rgba(16,44,36,0.72) 55%, rgba(18,34,24,0.95) 75%, rgba(14,22,14,0.99) 100%)'
        : 'linear-gradient(180deg, rgba(6,48,42,0.28) 0%, rgba(6,48,42,0.03) 44%, rgba(16,40,32,0.86) 72%, rgba(14,22,14,0.99) 100%)'
      : card.type === 'ambush'
      ? showFullBody
        ? 'linear-gradient(180deg, rgba(76,5,36,0.34) 0%, rgba(76,5,36,0.05) 30%, rgba(76,5,36,0.75) 55%, rgba(56,4,28,0.96) 75%, rgba(36,3,20,0.99) 100%)'
        : 'linear-gradient(180deg, rgba(76,5,36,0.34) 0%, rgba(76,5,36,0.04) 44%, rgba(64,5,30,0.88) 72%, rgba(36,3,20,0.99) 100%)'
      : card.type === 'fusion_apex'
      ? showFullBody
        ? 'linear-gradient(180deg, rgba(36,12,64,0.34) 0%, rgba(36,12,64,0.04) 30%, rgba(30,10,56,0.70) 55%, rgba(22,7,44,0.95) 75%, rgba(14,5,30,0.99) 100%)'
        : 'linear-gradient(180deg, rgba(36,12,64,0.32) 0%, rgba(36,12,64,0.03) 44%, rgba(26,8,48,0.85) 72%, rgba(14,5,30,0.99) 100%)'
      : showFullBody
      ? 'linear-gradient(180deg, rgba(4,6,14,0.35) 0%, rgba(4,6,14,0.04) 30%, rgba(5,7,16,0.62) 55%, rgba(5,7,15,0.95) 75%, rgba(4,5,12,0.98) 100%)'
      : 'linear-gradient(180deg, rgba(4,6,14,0.32) 0%, rgba(4,6,14,0.02) 45%, rgba(5,7,16,0.82) 72%, rgba(4,5,12,0.98) 100%)';

  const titleSizeClass = (() => {
    const len = displayName.length;
    if (size === 'lg') {
      if (len >= 22) return 'text-[10.5px] sm:text-[11.5px] tracking-normal';
      if (len >= 17) return 'text-[11.5px] sm:text-[12.5px] tracking-normal';
      return 'text-[13px] sm:text-[14px] tracking-wide';
    }
    if (size === 'md') {
      if (len >= 20) return 'text-[9px] tracking-normal';
      return 'text-[10.5px] tracking-wide';
    }
    return 'text-[8.5px] tracking-normal';
  })();

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      className={`relative select-none perspective-1000 transition-transform duration-200 ${SIZE_CLASSES[size]} ${
        isDefense ? '-rotate-6' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${outerShadow} ${className}`}
    >
      <div
        className={`w-full h-full relative transition-transform duration-150 ease-out ${
          isEvolved ? 'awakened-glow' : ''
        } ${isPrismatic ? 'prism-glow' : ''} ${
          unit &&
          !isFaceDownUnit &&
          (isEvolved || card.rarity === 'mythic' || card.type === 'fusion_apex')
            ? `board-aura-${card.faction}`
            : ''
        }`}
        style={{
          transform: tilt.hovering
            ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.04)`
            : 'rotateX(0deg) rotateY(0deg)',
        }}
      >
        <div
          className={`w-full h-full clip-chamfer-sm p-[3px] relative ${
            (card.type === 'fusion_apex' && !locked) ||
            (unit &&
              !isFaceDownUnit &&
              (isEvolved || card.rarity === 'mythic'))
              ? 'shine-sweep overflow-hidden'
              : ''
          }`}
          style={{ background: rimGradient }}
        >
          <div
            className={`w-full h-full clip-chamfer-sm bg-[#070914] relative overflow-hidden ${
              locked ? 'grayscale brightness-[0.35]' : ''
            }`}
          >
            {/* FULL-BLEED PAINTED ART */}
            <img
              src={artPres.src}
              alt={displayName}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
              style={{
                objectPosition: artPres.objectPosition,
                transform: `scale(${tilt.hovering ? artPres.scale * 1.05 : artPres.scale})`,
                filter: artPres.filter,
              }}
            />

            {artPres.tintOverlay !== 'none' && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: artPres.tintOverlay }}
              />
            )}

            {(card.type === 'arcana' || card.type === 'relic') && (
              <svg
                viewBox="0 0 200 200"
                className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 w-[80%] opacity-35 text-emerald-300"
                fill="none"
              >
                <circle cx="100" cy="100" r="84" stroke="currentColor" strokeWidth="1.8" strokeDasharray="8 5" />
                <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
                <polygon points="100,20 170,140 30,140" stroke="currentColor" strokeWidth="1.4" />
                <polygon points="100,180 170,60 30,60" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            )}
            {card.type === 'ambush' && (
              <svg
                viewBox="0 0 200 200"
                className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 w-[78%] opacity-38 text-rose-400"
                fill="none"
              >
                <polygon points="100,10 190,100 100,190 10,100" stroke="currentColor" strokeWidth="2.2" />
                <polygon points="100,32 168,100 100,168 32,100" stroke="#f472b6" strokeWidth="1.4" strokeDasharray="6 4" />
                <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            )}

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: lowerPanelGradient,
              }}
            />

            {/* ORNATE SVG FILIGREE */}
            <svg
              viewBox="0 0 200 284"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 w-full h-full z-10"
              fill="none"
            >
              <path
                d="M12 4 L188 4 L196 12 L196 272 L188 280 L12 280 L4 272 L4 12 Z"
                stroke={filigreeStroke}
                strokeWidth={card.type === 'arcana' || card.type === 'ambush' ? '1.8' : '1.2'}
                strokeOpacity={card.type === 'arcana' || card.type === 'ambush' ? '0.85' : '0.65'}
              />
              {card.type === 'arcana' && (
                <path
                  d="M16 9 L184 9 L191 16 L191 268 L184 275 L16 275 L9 268 L9 16 Z"
                  stroke="#34d399"
                  strokeWidth="0.9"
                  strokeDasharray="6 4"
                  strokeOpacity="0.65"
                />
              )}
              {card.type === 'ambush' && (
                <path
                  d="M10 156 L190 156 M10 272 L30 252 M190 272 L170 252"
                  stroke="#fb7185"
                  strokeWidth="1.2"
                  strokeOpacity="0.6"
                />
              )}
              <path
                d="M168 9 L190 9 L190 31 M10 253 L10 275 L32 275 M190 253 L190 275 L168 275"
                stroke={filigreeStroke}
                strokeWidth="2.2"
                strokeLinecap="square"
              />
            </svg>

            {/* TOP-RIGHT CREST */}
            <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
              {isEvolved && (
                <span className="clip-skew-btn px-2 py-0.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-slate-950 font-extrabold text-[8px] tracking-wider flex items-center gap-0.5 shadow-lg">
                  <Crown className="w-2.5 h-2.5" /> AWAKENED
                </span>
              )}
              {!isEvolved && card.type === 'fusion_apex' && (
                <span className="clip-skew-btn px-2 py-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-500 to-cyan-500 border border-amber-200/70 text-white font-extrabold text-[8px] tracking-wider flex items-center gap-0.5 shadow-[0_0_12px_rgba(217,70,239,0.75)]">
                  <Layers className="w-2.5 h-2.5" /> FUSION
                </span>
              )}
              {!isEvolved && reqTributes > 0 && (
                <span className="clip-chamfer-sm px-1.5 py-0.5 bg-rose-950/90 border border-rose-400/75 text-rose-200 font-extrabold text-[7.5px]">
                  {reqTributes} TRIB
                </span>
              )}
              {!isEvolved && card.evolvedData && (
                <span className="clip-chamfer-sm px-1 py-0.5 bg-amber-950/90 border border-amber-300/80 text-amber-200 font-extrabold text-[7.5px] flex items-center gap-0.5 shadow">
                  <Sparkles className="w-2.5 h-2.5" />
                </span>
              )}
              {card.type === 'arcana' && (
                <span className="clip-skew-btn px-2.5 py-0.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 border border-emerald-200/80 text-white font-extrabold text-[8px] tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.75)]">
                  {card.arcanaSubtype === 'domain'
                    ? 'DOMAIN'
                    : card.arcanaSubtype === 'fusion_catalyst'
                    ? 'FUSION'
                    : 'SPELL'}
                </span>
              )}
              {card.type === 'ambush' && (
                <span className="clip-skew-btn px-2.5 py-0.5 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 border border-rose-200/80 text-white font-extrabold text-[8px] tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.8)]">
                  TRAP
                </span>
              )}
              {card.type === 'relic' && (
                <span className="clip-skew-btn px-2.5 py-0.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 border border-amber-200/80 text-slate-950 font-extrabold text-[8px] tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                  EQUIP
                </span>
              )}
            </div>

            {/* LIVE BOARD STATUS */}
            {unit && (
              <div className="absolute top-8 left-1.5 right-1.5 z-20 flex flex-col items-start gap-1 pointer-events-none">
                {isDefense && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-400/95 text-slate-950 font-extrabold text-[8px] flex items-center gap-0.5 shadow-[0_0_10px_#22d3ee]">
                    <Shield className="w-2.5 h-2.5" /> DEF POS
                  </span>
                )}
                {hasWard && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/95 text-slate-950 font-extrabold text-[8px] flex items-center gap-0.5 shadow">
                    <Gem className="w-2.5 h-2.5" /> WARD
                  </span>
                )}
                {unit.attachedRelics.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/95 text-slate-950 font-extrabold text-[8px] shadow">
                    +{unit.attachedRelics.length} EQUIP
                  </span>
                )}
              </div>
            )}

            {isFrozen && (
              <div className="absolute inset-0 z-20 bg-cyan-400/25 backdrop-blur-[1px] flex items-center justify-center border-2 border-cyan-300/90">
                <div className="clip-chamfer-sm px-2.5 py-1 bg-cyan-950/95 border border-cyan-300 text-cyan-100 font-extrabold text-[9px] tracking-wider flex items-center gap-1 shadow-xl">
                  <Snowflake className="w-3 h-3" /> FROZEN
                </div>
              </div>
            )}

            {locked && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45">
                <Lock className="w-7 h-7 text-slate-300/90" />
              </div>
            )}

            {/* BOTTOM NAMEPLATE, EFFECT & YU-GI-OH! ATK / DEF BAR */}
            <div
              className={`absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end ${
                size === 'lg'
                  ? 'px-3 pt-4 pb-2.5'
                  : size === 'md'
                  ? 'px-2 pt-3 pb-2'
                  : 'px-1.5 pt-2 pb-1.5'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span
                  className="w-1.5 h-1.5 clip-diamond shrink-0"
                  style={{ backgroundColor: rarityMeta.gemColor }}
                />
                <div
                  className={`font-display font-extrabold text-center truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${
                    isEvolved
                      ? 'text-amber-200'
                      : card.type === 'arcana'
                      ? 'text-emerald-100'
                      : card.type === 'ambush'
                      ? 'text-rose-100'
                      : 'text-white'
                  } ${titleSizeClass}`}
                  title={displayName}
                >
                  {displayName}
                </div>
                <span
                  className="w-1.5 h-1.5 clip-diamond shrink-0"
                  style={{ backgroundColor: rarityMeta.gemColor }}
                />
              </div>

              {showFullBody && (
                <div className="flex items-center justify-center gap-1 text-[8px] uppercase tracking-[0.15em] text-slate-300/90 mt-0.5">
                  <span className={primaryFaction.textColor}>{primaryFaction.name}</span>
                  {secondaryFaction && (
                    <>
                      <span className="text-slate-500">×</span>
                      <span className={secondaryFaction.textColor}>
                        {secondaryFaction.name}
                      </span>
                    </>
                  )}
                </div>
              )}

              {showCompactKeywords && displayKeywords.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-0.5 mt-1">
                  {displayKeywords.slice(0, size === 'sm' ? 2 : 4).map((kw) => (
                    <span
                      key={kw}
                      className={`px-1 py-[1px] rounded border text-[7.5px] font-bold leading-none backdrop-blur-sm ${KEYWORDS[kw].colorClass}`}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {showFullBody && (
                <p
                  className={`mt-1 text-center text-slate-100/95 leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
                    size === 'lg' ? 'text-[10.5px] line-clamp-4' : 'text-[8.5px] line-clamp-3'
                  }`}
                >
                  {displayText}
                </p>
              )}

              {/* YU-GI-OH! ATK / DEF SCULPTED METALLIC FOOTER */}
              {displayAtk !== undefined && displayDef !== undefined ? (
                <div className="mt-1.5 pt-1 border-t border-amber-400/35 flex items-center justify-between gap-1 font-mono-num">
                  <div
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950/90 border ${
                      !isDefense
                        ? 'border-amber-400/75 text-amber-200'
                        : 'border-slate-700 text-slate-400'
                    } ${size === 'lg' ? 'text-xs' : size === 'md' ? 'text-[10px]' : 'text-[8.5px]'} font-extrabold`}
                    title={`ATK: ${displayAtk}`}
                  >
                    <Swords className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span
                      className={
                        unit && displayAtk > (card.atk ?? 0)
                          ? 'text-emerald-300'
                          : unit && displayAtk < (card.atk ?? 0)
                          ? 'text-rose-400'
                          : ''
                      }
                    >
                      {displayAtk}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950/90 border ${
                      isDefense
                        ? 'border-cyan-300 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                        : 'border-slate-700 text-cyan-200/85'
                    } ${size === 'lg' ? 'text-xs' : size === 'md' ? 'text-[10px]' : 'text-[8.5px]'} font-extrabold`}
                    title={`DEF: ${displayDef}`}
                  >
                    <Shield className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span
                      className={
                        unit && displayDef > (card.def ?? 0)
                          ? 'text-emerald-300'
                          : unit && displayDef < (card.def ?? 0)
                          ? 'text-rose-400'
                          : ''
                      }
                    >
                      {displayDef}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className={`mt-1.5 py-0.5 px-2 rounded-md border flex items-center justify-center gap-1 text-[8px] font-display font-extrabold uppercase tracking-widest shadow-inner ${
                    card.type === 'ambush'
                      ? 'bg-rose-950/90 border-rose-400/80 text-rose-200'
                      : card.type === 'relic'
                      ? 'bg-teal-950/90 border-amber-400/80 text-amber-200'
                      : 'bg-emerald-950/90 border-emerald-400/80 text-emerald-200'
                  }`}
                >
                  {card.type === 'ambush' ? (
                    <ShieldAlert className="w-2.5 h-2.5 text-rose-300 shrink-0" />
                  ) : card.type === 'relic' ? (
                    <Swords className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                  ) : (
                    <Wand2 className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
                  )}
                  {card.type === 'ambush'
                    ? `Trap • ${card.ambushTrigger?.replace('on_', 'On ') ?? ''}`
                    : card.type === 'relic'
                    ? 'Equip Spell'
                    : card.arcanaSubtype === 'fusion_catalyst'
                    ? 'Fusion Spell'
                    : card.arcanaSubtype === 'domain'
                    ? 'Field Spell'
                    : 'Arcana Spell'}
                </div>
              )}
            </div>

            {(card.rarity !== 'common' || isEvolved || isPrismatic || card.type === 'fusion_apex') && !locked && (
              <div
                className={`pointer-events-none absolute inset-0 z-10 holo-foil mix-blend-screen ${
                  card.type === 'fusion_apex' || isEvolved || isPrismatic
                    ? 'opacity-75'
                    : rarityMeta.foilOpacity
                }`}
              />
            )}

            {interactiveTilt && tilt.hovering && !locked && (
              <div
                className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay transition-opacity duration-150"
                style={{
                  background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 56%)`,
                }}
              />
            )}
          </div>
        </div>

        {/* TOP-LEFT SCULPTED LEVEL STAR GEM (★1–★9) OR SPELL/TRAP EMBLEM */}
        <div
          className={`absolute -top-1.5 -left-1.5 z-30 clip-hex flex items-center justify-center p-[2px] shadow-xl ${
            size === 'xs'
              ? 'w-6 h-7'
              : size === 'sm'
              ? 'w-7 h-8'
              : size === 'md'
              ? 'w-8 h-9'
              : 'w-10 h-11'
          }`}
          style={{
            background:
              card.type === 'fusion_apex'
                ? 'linear-gradient(180deg, #f5d0fe 0%, #c026d3 55%, #4c1d95 100%)'
                : card.level > 0
                ? 'linear-gradient(180deg, #fef08a 0%, #f59e0b 55%, #78350f 100%)'
                : card.type === 'ambush'
                ? 'linear-gradient(180deg, #fda4af 0%, #e11d48 55%, #881337 100%)'
                : card.type === 'relic'
                ? 'linear-gradient(180deg, #fde047 0%, #10b981 58%, #064e3b 100%)'
                : 'linear-gradient(180deg, #a7f3d0 0%, #10b981 55%, #065f46 100%)',
          }}
          title={
            card.type === 'fusion_apex'
              ? `Fusion Apex ★${card.level} (Special Summon from Rift Deck)`
              : card.level > 0
              ? `Level ★${card.level} (${reqTributes === 0 ? 'No Tribute' : `${reqTributes} Tribute${reqTributes > 1 ? 's' : ''}`})`
              : card.type === 'ambush'
              ? 'Trap Card (Set Face-Down)'
              : card.type === 'relic'
              ? 'Equip Spell (Attach to Monster)'
              : 'Arcana Spell (Free to Cast)'
          }
        >
          <div
            className={`w-full h-full clip-hex flex flex-col items-center justify-center leading-none text-white ${
              card.type === 'ambush'
                ? 'bg-rose-950/95'
                : card.type === 'arcana'
                ? 'bg-emerald-950/95'
                : card.type === 'relic'
                ? 'bg-teal-950/95'
                : 'bg-slate-950/90'
            }`}
          >
            {card.level > 0 ? (
              <>
                <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                <span
                  className={`font-mono-num font-extrabold ${
                    size === 'lg' ? 'text-xs' : size === 'md' ? 'text-[10px]' : 'text-[9px]'
                  }`}
                >
                  {card.level}
                </span>
              </>
            ) : card.type === 'ambush' ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
            ) : card.type === 'relic' ? (
              <Swords className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-emerald-300" />
            )}
          </div>
        </div>
      </div>

      {showEvolvedToggle && card.evolvedData && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewEvolved((v) => !v);
          }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-40 clip-skew-btn px-3.5 py-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 font-extrabold text-[10px] tracking-wider flex items-center gap-1 shadow-[0_0_20px_rgba(251,191,36,0.65)] transition-all whitespace-nowrap cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          {isEvolved ? 'BASE FORM' : 'AWAKENED FORM'}
        </button>
      )}
    </div>
  );
};
