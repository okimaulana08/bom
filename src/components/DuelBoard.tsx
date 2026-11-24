import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  Coins,
  Crosshair,
  Crown,
  Eye,
  FastForward,
  Flame,
  Heart,
  Info,
  Layers,
  LogOut,
  Music,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  ScrollText,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Swords,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useDuelStore } from '../store/duelStore';
import { useProfileStore } from '../store/profileStore';
import { CARD_MAP } from '../data/cards';
import { getCardArtPresentation } from '../data/cardArtStyle';
import { KEYWORDS } from '../data/keywords';
import { getChapter } from '../data/campaign';
import { canEvolveUnit, canUnitAttack } from '../engine/rules';
import {
  getActiveUnits,
  getEffectiveAtk,
  getEffectiveDef,
  getRequiredTributes,
} from '../engine/utils';
import { soundEngine } from '../audio/soundEngine';
import { Card } from './Card';
import { HandTray } from './HandTray';
import { RiftDeckModal } from './RiftDeckModal';
import { FusionOverlay } from './FusionOverlay';
import {
  DamageVignetteOverlay,
  FlipRevealWrapper,
  FloatingBadgeList,
  ImpactSlashOverlay,
  PhaseBannerOverlay,
  RollingLpCounter,
  ScreenShakeWrapper,
  SummonSlotFlash,
} from './CombatVFX';
import { BattlefieldFXCanvas } from './BattlefieldFXCanvas';
import { VoidModal } from './VoidModal';
import { TrapPromptModal } from './TrapPromptModal';

interface DuelBoardProps {
  onExit: () => void;
  onRematch: () => void;
}

export const DuelBoard: React.FC<DuelBoardProps> = ({ onExit, onRematch }) => {
  const {
    duel,
    opponentPortrait,
    bossDialogue,
    selectedHandId,
    selectedAttackerId,
    pendingTribute,
    pendingTrapPrompt,
    inspectCard,
    riftModal,
    cutIn,
    phaseBanner,
    slashEffects,
    canvasFxQueue,
    damageFlash,
    summonBursts,
    floatingVfx,
    attackLunge,
    screenShakeKey,
    screenShakeIntensity,
    winnerModalReady,
    aiThinking,
    toast,
    rewardSummary,
    confirmMulligan,
    selectHandCard,
    selectAttacker,
    startTributeSelection,
    toggleTributeUnit,
    cancelTribute,
    resolveTrapPrompt,
    setInspectCard,
    openRiftModal,
    closeRiftModal,
    dismissCutIn,
    notifyToast,
    playSelectedCard,
    triggerSoulBurn,
    triggerStanceToggle,
    triggerEvolution,
    triggerContactFusion,
    triggerCatalystFusion,
    triggerAttack,
    goToBattlePhase,
    finishPlayerTurn,
  } = useDuelStore();

  const soundEnabled = useProfileStore((s) => s.soundEnabled);
  const toggleSound = useProfileStore((s) => s.toggleSound);
  const bgmEnabled = useProfileStore((s) => s.bgmEnabled ?? true);
  const toggleBgm = useProfileStore((s) => s.toggleBgm);
  const trapPromptMode = useProfileStore((s) => s.trapPromptMode ?? 'manual');
  const toggleTrapPromptMode = useProfileStore((s) => s.toggleTrapPromptMode);
  const duelSpeed = useProfileStore((s) => s.duelSpeed ?? 1);
  const toggleDuelSpeed = useProfileStore((s) => s.toggleDuelSpeed);

  const [mulliganSwaps, setMulliganSwaps] = useState<string[]>([]);
  const [sideTab, setSideTab] = useState<'inspect' | 'log'>('inspect');
  const [desktopDrawerOpen, setDesktopDrawerOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileBarDismissedKey, setMobileBarDismissedKey] = useState<string | null>(null);
  const [voidModalOwner, setVoidModalOwner] = useState<'player' | 'opponent' | null>(null);

  const chapter = duel?.chapterId ? getChapter(duel.chapterId) : undefined;

  const selectedHandCard = useMemo(() => {
    if (!duel || !selectedHandId) return null;
    const hc = duel.players.player.hand.find((h) => h.instanceId === selectedHandId);
    return hc ? { hc, def: CARD_MAP[hc.cardId] } : null;
  }, [duel, selectedHandId]);

  const selectedAttackerUnit = useMemo(() => {
    if (!duel || !selectedAttackerId) return null;
    return duel.players.player.vanguard.find((u) => u?.instanceId === selectedAttackerId) ?? null;
  }, [duel, selectedAttackerId]);

  if (!duel) return null;

  const player = duel.players.player;
  const opponent = duel.players.opponent;
  const isPlayerTurn = duel.activePlayer === 'player' && !duel.winner;
  const isMain = isPlayerTurn && duel.phase === 'main';
  const isBattle = isPlayerTurn && duel.phase === 'battle';
  const isTurnOneNoBattle = duel.turnNumber <= 1;

  const myActiveUnits = getActiveUnits(duel, 'player');
  const enemyActiveUnits = getActiveUnits(duel, 'opponent');

  const readyAttackers = player.vanguard.filter((u): u is NonNullable<typeof u> => {
    if (!u || !isPlayerTurn) return false;
    const chk = canUnitAttack(duel, u, CARD_MAP);
    return chk.canAttackUnits || chk.canAttackLp;
  });

  const attackerCheck = selectedAttackerUnit
    ? canUnitAttack(duel, selectedAttackerUnit, CARD_MAP)
    : null;
  const selectedAttackerAtk = selectedAttackerUnit
    ? getEffectiveAtk(duel, selectedAttackerUnit, CARD_MAP)
    : 0;

  const needsFriendlyTarget =
    isMain &&
    !pendingTribute &&
    selectedHandCard &&
    (selectedHandCard.def.type === 'relic' || selectedHandCard.def.targetMode === 'friendly_unit');
  const needsEnemyTarget =
    (isMain &&
      !pendingTribute &&
      selectedHandCard &&
      (selectedHandCard.def.targetMode === 'enemy_unit' ||
        selectedHandCard.def.targetMode === 'enemy_or_face' ||
        selectedHandCard.def.targetMode === 'any_unit')) ||
    Boolean(selectedAttackerUnit && attackerCheck?.canAttackUnits);
  const canTargetEnemyFace =
    (isMain && !pendingTribute && selectedHandCard?.def.targetMode === 'enemy_or_face') ||
    Boolean(selectedAttackerUnit && attackerCheck?.canAttackLp);
  const needsVanguardSlot =
    isMain &&
    !pendingTribute &&
    selectedHandCard?.def.type === 'vanguard' &&
    player.normalSummonsLeft > 0 &&
    getRequiredTributes(selectedHandCard.def) === 0;
  const needsArcaneSlot =
    isMain &&
    !pendingTribute &&
    selectedHandCard &&
    (selectedHandCard.def.type === 'ambush' || selectedHandCard.def.arcanaSubtype === 'domain');

  const directStrikeDamageLabel = selectedAttackerUnit
    ? selectedAttackerAtk
    : selectedHandCard?.def.onPlay?.[0]?.amount ?? 800;

  const initiateMonsterSummon = (handInstanceId: string, mode: 'attack' | 'defense', slot?: number) => {
    const hc = player.hand.find((h) => h.instanceId === handInstanceId);
    if (!hc) return;
    const def = CARD_MAP[hc.cardId];
    if (!def || def.type !== 'vanguard') return;

    if (player.normalSummonsLeft <= 0) {
      notifyToast('Monster Zones full — Tribute or Fusion Summon!');
      return;
    }

    const req = getRequiredTributes(def);
    if (req > 0) {
      if (myActiveUnits.length < req) {
        notifyToast(`Level ★${def.level} requires ${req} Tribute monster${req > 1 ? 's' : ''} on your field!`);
        return;
      }
      soundEngine.uiClick();
      startTributeSelection(handInstanceId, def.id, req, mode);
      return;
    }

    playSelectedCard(handInstanceId, { slot, summonMode: mode });
  };

  const handleHandCardClick = (instanceId: string) => {
    const hc = player.hand.find((h) => h.instanceId === instanceId);
    if (!hc) return;
    const def = CARD_MAP[hc.cardId];
    setInspectCard(def.id, false);
    if (!isMain) return;

    if (selectedHandId === instanceId) {
      if (def.type === 'vanguard') {
        initiateMonsterSummon(instanceId, 'attack');
        return;
      }
      if (def.arcanaSubtype === 'fusion_catalyst') {
        openRiftModal('catalyst', instanceId);
        return;
      }
      if (
        def.type === 'ambush' ||
        def.arcanaSubtype === 'domain' ||
        !def.targetMode ||
        def.targetMode === 'none'
      ) {
        playSelectedCard(instanceId);
        return;
      }
      selectHandCard(null);
      return;
    }

    selectHandCard(instanceId);
  };

  const handleEmptyVanguardClick = (slot: number) => {
    if (needsVanguardSlot && selectedHandCard) {
      initiateMonsterSummon(selectedHandCard.hc.instanceId, 'attack', slot);
    }
  };

  const handleEmptyArcaneClick = (slot: number) => {
    if (needsArcaneSlot && selectedHandCard) {
      playSelectedCard(selectedHandCard.hc.instanceId, { slot });
    }
  };

  const handleFriendlyUnitClick = (unitId: string) => {
    const unit = player.vanguard.find((u) => u?.instanceId === unitId);
    if (!unit) return;
    const def = CARD_MAP[unit.cardId];
    setInspectCard(unit.cardId, unit.isEvolved);

    // Tribute Selection Mode!
    if (pendingTribute) {
      soundEngine.uiClick();
      toggleTributeUnit(unitId);
      return;
    }

    if (needsFriendlyTarget && selectedHandCard) {
      playSelectedCard(selectedHandCard.hc.instanceId, { targetInstanceId: unitId });
      return;
    }

    if (isMain || isBattle) {
      const check = canUnitAttack(duel, unit, CARD_MAP);
      if (check.canAttackUnits || check.canAttackLp) {
        if (selectedAttackerId === unitId) {
          selectAttacker(null);
          return;
        }
        soundEngine.uiClick();
        selectAttacker(unitId);
      } else {
        selectAttacker(null);
        if (isTurnOneNoBattle) {
          notifyToast('Rush Duel Rule: Going First skips Turn 1 Battle Phase — press END TURN!');
        } else if (unit.faceDown) {
          notifyToast(`${def.name} is Set Face-Down — Flip Summon it next turn to attack!`);
        } else if (unit.stance === 'defense') {
          notifyToast(`${def.name} is in Defense Position — switch to ATK Position to attack!`);
        } else if (unit.attacksThisTurn >= unit.maxAttacksThisTurn) {
          notifyToast(`${def.name} has already attacked this turn.`);
        } else if (unit.frozenTurns > 0) {
          notifyToast(`${def.name} is Frozen and cannot attack this turn.`);
        }
      }
    }
  };

  const handleQuickAttackButton = (unitId: string) => {
    const unit = player.vanguard.find((u) => u?.instanceId === unitId);
    if (!unit) return;
    const chk = canUnitAttack(duel, unit, CARD_MAP);
    if (chk.canAttackLp && enemyActiveUnits.length === 0) {
      triggerAttack(unitId, { kind: 'lp' });
      return;
    }
    soundEngine.uiClick();
    selectAttacker(selectedAttackerId === unitId ? null : unitId);
  };

  const handleEnemyUnitClick = (unitId: string) => {
    const unit = opponent.vanguard.find((u) => u?.instanceId === unitId);
    if (!unit) return;
    if (!unit.faceDown) {
      setInspectCard(unit.cardId, unit.isEvolved);
    }

    if (selectedAttackerUnit && attackerCheck?.canAttackUnits) {
      triggerAttack(selectedAttackerUnit.instanceId, { kind: 'unit', instanceId: unitId });
      return;
    }

    if (
      isMain &&
      !pendingTribute &&
      selectedHandCard &&
      (selectedHandCard.def.targetMode === 'enemy_unit' ||
        selectedHandCard.def.targetMode === 'enemy_or_face' ||
        selectedHandCard.def.targetMode === 'any_unit')
    ) {
      playSelectedCard(selectedHandCard.hc.instanceId, { targetInstanceId: unitId });
    }
  };

  const handleEnemyFaceClick = () => {
    if (selectedAttackerUnit && attackerCheck?.canAttackLp) {
      triggerAttack(selectedAttackerUnit.instanceId, { kind: 'lp' });
      return;
    }
    if (isMain && !pendingTribute && selectedHandCard?.def.targetMode === 'enemy_or_face') {
      playSelectedCard(selectedHandCard.hc.instanceId, { targetPlayer: 'opponent' });
    }
  };

  const handleBattleButtonClick = () => {
    if (isTurnOneNoBattle) {
      notifyToast('Yu-Gi-Oh! Turn 1 Rule: First player skips Battle Phase. Set Traps & press END TURN!');
      return;
    }
    if (readyAttackers.length === 0) {
      notifyToast('No Attack Position monster ready! Summon a monster in ATK Position first.');
      return;
    }
    goToBattlePhase();
    if (readyAttackers.length >= 1) {
      selectAttacker(readyAttackers[0].instanceId);
    }
  };

  const toggleMulliganSwap = (id: string) => {
    setMulliganSwaps((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const inspectedDef = inspectCard ? CARD_MAP[inspectCard.cardId] : null;
  const inspectedKeywords = inspectedDef
    ? Array.from(
        new Set([
          ...inspectedDef.keywords,
          ...(inspectedDef.evolvedData?.keywords ?? []),
        ])
      )
    : [];

  const helperBanner = (() => {
    if (duel.winner) return null;
    if (aiThinking) return `${opponent.name} is plotting their move...`;
    if (pendingTribute) {
      const cardName = CARD_MAP[pendingTribute.cardId]?.name ?? 'Monster';
      return `TRIBUTE SUMMON ${cardName}: Tap ${pendingTribute.required - pendingTribute.selectedIds.length} friendly monster(s) on your field!`;
    }
    if (selectedAttackerUnit) {
      const atkName =
        selectedAttackerUnit.isEvolved && CARD_MAP[selectedAttackerUnit.cardId]?.evolvedData
          ? CARD_MAP[selectedAttackerUnit.cardId].evolvedData!.name
          : CARD_MAP[selectedAttackerUnit.cardId]?.name ?? 'Monster';
      return attackerCheck?.canAttackLp
        ? `${atkName} (${selectedAttackerAtk} ATK) — Press DIRECT ATTACK!`
        : `${atkName} (${selectedAttackerAtk} ATK) — Tap an Enemy Monster to battle!`;
    }
    if (selectedHandCard) {
      const d = selectedHandCard.def;
      if (d.type === 'vanguard') {
        const req = getRequiredTributes(d);
        if (player.normalSummonsLeft <= 0)
          return `Monster Zones full — Tribute or Fusion Summon!`;
        if (req > 0)
          return `★${d.level} ${d.name} needs ${req} Tribute(s) — tap TRIB(${req}) or SET above the card!`;
        return `Tap SUMMON (ATK), SET (Face-Down DEF), or a glowing Monster Zone!`;
      }
      if (d.type === 'relic') return `Tap a face-up friendly monster to equip ${d.name}.`;
      if (d.type === 'ambush')
        return `Tap a Spell/Trap Zone (or tap ${d.name} again) to Set Face-Down!`;
      if (d.arcanaSubtype === 'domain')
        return `Tap an Arcane Zone (or tap ${d.name} again) to activate Field Domain!`;
      if (d.arcanaSubtype === 'fusion_catalyst')
        return `Tap "Cast ${d.name}" to Fusion Summon from Hand & Field!`;
      if (d.targetMode === 'enemy_unit') return `Tap an Enemy Monster to activate ${d.name}.`;
      if (d.targetMode === 'enemy_or_face')
        return `Tap an Enemy Monster OR press DIRECT STRIKE for ${d.name}!`;
      return `Tap "Cast ${d.name}" or tap card again to activate!`;
    }
    if (isTurnOneNoBattle && isMain) {
      return 'TURN 1 RUSH DUEL — Summon/Set as many monsters as you like, then press END TURN (Battle begins Turn 2)!';
    }
    if (isBattle) {
      return readyAttackers.length > 0
        ? `BATTLE PHASE — Tap ⚔ ATTACK on any glowing monster (${readyAttackers.length} ready)!`
        : 'All attacks finished — tap END TURN!';
    }
    return null;
  })();

  const handleToggleSound = () => {
    toggleSound();
    soundEngine.setEnabled(!soundEnabled);
  };

  const handleToggleBgm = () => {
    const next = !bgmEnabled;
    toggleBgm();
    soundEngine.setBgmEnabled(next);
    if (next && duel.phase !== 'mulligan' && !duel.winner) {
      soundEngine.startBgm(
        player.lp <= 2500 || opponent.lp <= 2500 ? 'climax' : 'normal'
      );
    }
    notifyToast(next ? 'Duel BGM: ON (Adaptive Climax Synth)' : 'Duel BGM: MUTED');
  };

  // Detect any active face-up Field Domain on either player's Arcane zones for live weather FX
  const activeDomain = (() => {
    const allBackrow = [...player.arcane, ...opponent.arcane];
    for (const slot of allBackrow) {
      if (slot && slot.kind === 'domain' && !slot.faceDown) {
        const d = CARD_MAP[slot.cardId];
        if (d) return d;
      }
    }
    return null;
  })();

  const isClimaxTension =
    !duel.winner && (player.lp <= 2500 || opponent.lp <= 2500);

  const renderInspectorContent = () => (
    <>
      <div className="flex border-b border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => setSideTab('inspect')}
          className={`flex-1 py-2.5 text-[11px] font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
            sideTab === 'inspect'
              ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Inspect
        </button>
        <button
          type="button"
          onClick={() => setSideTab('log')}
          className={`flex-1 py-2.5 text-[11px] font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
            sideTab === 'log'
              ? 'text-indigo-300 border-b-2 border-indigo-400 bg-indigo-950/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" /> Log ({duel.log.length})
        </button>
      </div>

      {sideTab === 'inspect' ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4">
          {inspectedDef ? (
            <>
              <div className="pb-4">
                <Card
                  key={inspectedDef.id}
                  card={inspectedDef}
                  size="lg"
                  showEvolvedToggle={Boolean(inspectedDef.evolvedData)}
                />
              </div>

              {inspectedDef.fusionRecipe && (
                <div className="w-full game-panel clip-chamfer-sm border-fuchsia-500/45 p-3 text-xs">
                  <div className="font-bold text-fuchsia-300 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                    <Layers className="w-3.5 h-3.5" /> Rift Fusion Materials
                  </div>
                  <p className="text-slate-100 mt-1 font-medium">
                    {inspectedDef.fusionRecipe.summary}
                  </p>
                </div>
              )}

              {inspectedDef.evolvedData && (
                <div className="w-full game-panel-gold clip-chamfer-sm p-3 text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                    <Sparkles className="w-3.5 h-3.5" /> Awakened Evolution
                  </div>
                  <p className="text-amber-100 mt-1 font-bold">
                    {inspectedDef.evolvedData.name} ({inspectedDef.evolvedData.atk} ATK /{' '}
                    {inspectedDef.evolvedData.def} DEF)
                  </p>
                  <p className="text-slate-300 mt-1 leading-relaxed text-[11px]">
                    {inspectedDef.evolvedData.effectText}
                  </p>
                  {inspectedDef.evolvedData.innateCondition && (
                    <p className="text-emerald-300 mt-1 text-[11px] font-semibold">
                      ★ Free Innate: {inspectedDef.evolvedData.innateCondition.description}
                    </p>
                  )}
                </div>
              )}

              <div className="w-full game-panel clip-chamfer-sm p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Lore Archive
                </div>
                <p className="text-xs text-slate-300 italic mt-1 leading-relaxed">
                  “{inspectedDef.lore}”
                </p>
              </div>

              {inspectedKeywords.length > 0 && (
                <div className="w-full space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Keywords
                  </div>
                  {inspectedKeywords.map((kw) => (
                    <div
                      key={kw}
                      className="rounded-lg bg-slate-900/85 border border-slate-800 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="font-bold text-cyan-300">{kw}: </span>
                      <span className="text-slate-300">{KEYWORDS[kw].shortDesc}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-500 mt-10 text-center">
              Hover or tap any card to inspect ATK/DEF, lore, keywords, and Awakened Evolution.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {[...duel.log].reverse().map((ev) => (
            <div
              key={ev.id}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] border ${
                ev.type === 'fusion'
                  ? 'bg-fuchsia-950/45 border-fuchsia-500/50 text-fuchsia-100'
                  : ev.type === 'evolve'
                  ? 'bg-amber-950/45 border-amber-500/50 text-amber-100'
                  : ev.type === 'ambush'
                  ? 'bg-rose-950/45 border-rose-500/50 text-rose-100'
                  : ev.type === 'turn_start'
                  ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-200 font-semibold'
                  : 'bg-slate-900/75 border-slate-800/80 text-slate-300'
              }`}
            >
              <span className="text-[9px] text-slate-500 font-mono-num mr-1.5">
                T{ev.turn}
              </span>
              {ev.text}
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen w-full flex bg-[#04050c] text-slate-100 overflow-x-hidden relative select-none">
      {/* DEDICATED SPEED DUEL TEMPLE PLAYMAT BACKDROP */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src="/assets/arenas/duel_playmat.jpg"
          alt=""
          className="w-full h-full object-cover opacity-70 scale-[1.01]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 72% 68% at 50% 50%, rgba(5,7,18,0.18) 0%, rgba(4,6,15,0.68) 72%, rgba(3,4,10,0.92) 100%)',
          }}
        />
      </div>

      {/* MAIN BATTLEFIELD STAGE */}
      <ScreenShakeWrapper
        shakeKey={screenShakeKey}
        intensity={screenShakeIntensity}
        className="flex-1 flex flex-col justify-between relative z-10 min-w-0 px-2 sm:px-4 py-2.5"
      >
        {/* TOP: RIVAL MEDALLION HUD */}
        <div className="flex flex-wrap items-center justify-between gap-2 relative z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div
                className="w-11 h-11 sm:w-13 sm:h-13 clip-hex p-[2px] shadow-[0_0_20px_rgba(244,63,94,0.55)]"
                style={{
                  background: 'linear-gradient(180deg, #fda4af, #e11d48, #4c0519)',
                }}
              >
                <img
                  src={opponentPortrait}
                  alt={opponent.name}
                  className="w-full h-full clip-hex object-cover object-top"
                />
              </div>
              {aiThinking && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 animate-ping" />
              )}
            </div>

            <div className="game-panel clip-chamfer-sm px-2.5 sm:px-3.5 py-1 border-rose-500/45 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-xs sm:text-sm text-white truncate max-w-[140px] sm:max-w-none">
                  {opponent.name}
                </span>
                {chapter && (
                  <span
                    className="hidden sm:inline-block clip-skew-btn px-2 py-0.5 bg-rose-950/90 border border-rose-400/60 text-[9px] font-extrabold text-rose-200 uppercase"
                    title={chapter.modifierDescription}
                  >
                    ★ {chapter.modifierTitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-[9.5px] sm:text-[10px] text-slate-400 font-mono-num">
                <span>H <strong className="text-slate-100">{opponent.hand.length}</strong></span>
                <span>D <strong className="text-slate-100">{opponent.deck.length}</strong></span>
                <span>R <strong className="text-fuchsia-300">{opponent.riftDeck.length}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.uiClick();
                    setVoidModalOwner('opponent');
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 -my-0.5 rounded bg-purple-950/60 border border-purple-500/45 hover:border-fuchsia-400 text-purple-200 hover:text-white cursor-pointer transition-colors"
                  title="Inspect Rival's Void Pile (Graveyard)"
                >
                  <Eye className="w-2.5 h-2.5 text-fuchsia-300" />
                  V <strong className="text-white">{opponent.voidPile.length}</strong>
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {bossDialogue && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute left-12 top-14 z-40 max-w-xs sm:max-w-sm game-panel clip-chamfer-sm border-rose-400/80 px-3.5 py-2 text-xs text-rose-100 shadow-2xl italic"
              >
                “{bossDialogue}”
              </motion.div>
            )}
          </AnimatePresence>

          {/* RIVAL 4000 LP CRYSTAL + CONTROLS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono-num">
              <div className="game-panel clip-chamfer-sm px-2.5 py-1 border-amber-500/40 text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {opponent.evoOrbs}
              </div>
            </div>

            <button
              type="button"
              data-vfx-anchor="lp-opponent"
              onClick={handleEnemyFaceClick}
              className={`relative clip-chamfer-sm px-3 sm:px-4 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                canTargetEnemyFace
                  ? 'bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 border-amber-200 shadow-[0_0_28px_rgba(244,63,94,0.95)] animate-pulse cursor-pointer scale-105'
                  : 'bg-gradient-to-b from-rose-950/90 to-slate-950 border-rose-500/60 cursor-default'
              }`}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300 fill-rose-500/50" />
              <div className="text-left leading-none">
                <div className="font-mono-num font-extrabold text-base sm:text-xl text-white">
                  <RollingLpCounter value={opponent.lp} />
                </div>
                <div className="text-[8px] font-bold text-rose-200/75 uppercase tracking-wider">
                  LP
                </div>
              </div>
              <FloatingBadgeList
                items={floatingVfx.filter((f) => f.targetPlayer === 'opponent')}
              />
              <ImpactSlashOverlay
                effects={slashEffects.filter((fx) => fx.targetPlayer === 'opponent')}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                toggleTrapPromptMode();
                notifyToast(
                  trapPromptMode === 'manual'
                    ? 'Trap Mode: AUTO — Set Traps activate automatically.'
                    : 'Trap Mode: MANUAL — Choose Activate or Hold when a Trap triggers!'
                );
              }}
              className={`game-panel clip-chamfer-sm px-2 sm:px-2.5 py-1.5 text-[9.5px] sm:text-[10px] font-display font-extrabold tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-colors ${
                trapPromptMode === 'manual'
                  ? 'border-fuchsia-400/80 text-fuchsia-200 bg-fuchsia-950/45 shadow-[0_0_12px_rgba(217,70,239,0.35)]'
                  : 'border-slate-700 text-slate-400 hover:text-cyan-200'
              }`}
              title={
                trapPromptMode === 'manual'
                  ? 'Manual Trap Mode: Ask Activate or Hold when rival triggers your Trap'
                  : 'Auto Trap Mode: Set Traps trigger automatically'
              }
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                TRAP: {trapPromptMode === 'manual' ? 'MANUAL' : 'AUTO'}
              </span>
              <span className="sm:hidden">{trapPromptMode === 'manual' ? 'MAN' : 'AUTO'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                toggleDuelSpeed();
                notifyToast(
                  duelSpeed === 1
                    ? 'Duel Speed: 2x TURBO — Faster AI turns & cut-ins!'
                    : 'Duel Speed: 1x NORMAL'
                );
              }}
              className={`game-panel clip-chamfer-sm px-2 py-1.5 text-[10px] font-mono-num font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                duelSpeed === 2
                  ? 'border-amber-400/80 text-amber-200 bg-amber-950/45 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                  : 'border-slate-700 text-slate-300 hover:text-cyan-200'
              }`}
              title="Toggle Duel Speed (1x Normal / 2x Turbo)"
            >
              <FastForward className="w-3.5 h-3.5" />
              {duelSpeed}x
            </button>

            <button
              type="button"
              onClick={handleToggleBgm}
              className={`game-panel clip-chamfer-sm p-2 cursor-pointer transition-colors relative ${
                bgmEnabled && soundEnabled
                  ? isClimaxTension
                    ? 'border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                    : 'text-cyan-300 border-cyan-500/45'
                  : 'text-slate-500 border-slate-800'
              }`}
              title={
                bgmEnabled
                  ? isClimaxTension
                    ? 'Duel BGM: CLIMAX MODE (LP ≤ 2500) — Click to Mute'
                    : 'Duel BGM: ON — Click to Mute'
                  : 'Duel BGM: OFF — Click to Enable'
              }
            >
              <Music className={`w-4 h-4 ${bgmEnabled && soundEnabled && isClimaxTension ? 'animate-pulse' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleToggleSound}
              className="game-panel clip-chamfer-sm p-2 text-slate-200 hover:text-cyan-300 cursor-pointer"
              title="Toggle Master Audio & SFX"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSideTab('inspect');
                  setMobileSheetOpen(true);
                } else {
                  setDesktopDrawerOpen((v) => !v);
                }
              }}
              className="game-panel clip-chamfer-sm px-2 py-2 text-cyan-200 hover:text-cyan-100 border-cyan-500/45 flex items-center gap-1 cursor-pointer"
              title="Inspect Card / Battle Log"
            >
              <Info className="w-4 h-4 lg:hidden" />
              <span className="text-[9.5px] font-display font-extrabold tracking-wider uppercase lg:hidden">
                INFO
              </span>
              <span className="hidden lg:inline-flex">
                {desktopDrawerOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={onExit}
              className="game-panel clip-chamfer-sm p-2 text-slate-200 hover:text-rose-300 cursor-pointer"
              title="Leave Duel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CENTER PLAYMAT */}
        <div className="flex-1 relative flex items-center justify-center my-1.5">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 via-50% to-transparent" />
            <svg
              viewBox="0 0 400 400"
              className="absolute w-[300px] h-[300px] sm:w-[430px] sm:h-[430px] opacity-[0.16] animate-spin-slow"
              fill="none"
            >
              <circle cx="200" cy="200" r="185" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="12 8" />
              <circle cx="200" cy="200" r="145" stroke="#c084fc" strokeWidth="1.2" />
              <polygon points="200,25 350,285 50,285" stroke="#fbbf24" strokeWidth="1" />
              <polygon points="200,375 350,115 50,115" stroke="#38bdf8" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center justify-center gap-2 sm:pr-24">
            {/* LIVE ACTIVE FIELD DOMAIN WEATHER PILL */}
            {activeDomain && (
              <div className="inline-flex items-center gap-1.5 clip-chamfer-sm px-3 py-0.5 bg-slate-950/85 border border-cyan-400/50 text-[9.5px] font-display font-bold tracking-widest uppercase text-cyan-200 shadow-lg">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                FIELD DOMAIN: <span className="text-white">{activeDomain.name}</span>
              </div>
            )}

            {/* DIRECT ATTACK BANNER RIGHT ABOVE ENEMY BOARD */}
            <AnimatePresence>
              {canTargetEnemyFace && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.85, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleEnemyFaceClick}
                  className="relative overflow-hidden shine-sweep clip-skew-btn px-6 py-2 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 border-2 border-amber-200 text-white font-display font-extrabold text-xs sm:text-sm tracking-wider shadow-[0_0_32px_rgba(244,63,94,0.9)] hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer z-30"
                >
                  <Crosshair className="w-4 h-4 animate-spin-slow" />
                  DIRECT ATTACK {opponent.name.split(',')[0].toUpperCase()} (-
                  {directStrikeDamageLabel} LP)!
                </motion.button>
              )}
            </AnimatePresence>

            {/* OPPONENT SPELL/TRAP ZONES (2) */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3">
              {[0, 1].map((slot) => {
                const back = opponent.arcane[slot];
                const def = back ? CARD_MAP[back.cardId] : null;
                return (
                  <div
                    key={`opp_arc_${slot}`}
                    className="w-32 sm:w-36 h-10 sm:h-11 clip-chamfer-sm border border-purple-500/30 bg-slate-950/70 flex items-center justify-center px-1.5 shadow-inner"
                  >
                    {!back ? (
                      <span className="text-[8.5px] sm:text-[9px] text-slate-600 font-display tracking-widest uppercase">
                        Trap / Spell {slot + 1}
                      </span>
                    ) : back.faceDown ? (
                      <div className="w-full h-full clip-chamfer-sm bg-gradient-to-r from-purple-950 via-fuchsia-950 to-purple-950 border border-fuchsia-400/80 flex items-center justify-center gap-1 shadow-[0_0_14px_rgba(217,70,239,0.5)]">
                        <AlertCircle className="w-3 h-3 text-fuchsia-300 animate-pulse" />
                        <span className="text-[8.5px] font-extrabold tracking-widest text-fuchsia-200 uppercase">
                          Trap Set
                        </span>
                      </div>
                    ) : def ? (
                      <button
                        type="button"
                        onMouseEnter={() => setInspectCard(def.id, false)}
                        onClick={() => setInspectCard(def.id, false)}
                        className="w-full h-full clip-chamfer-sm bg-indigo-950/85 border border-cyan-400/70 flex items-center gap-1.5 px-1.5 text-left cursor-pointer"
                      >
                        <img
                          src={getCardArtPresentation(def).src}
                          alt={def.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold text-cyan-200 truncate">
                            {def.name}
                          </div>
                        </div>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* OPPONENT MONSTER ZONES (3) */}
            <div className="flex items-center justify-center gap-2 sm:gap-5">
              {[0, 1, 2].map((slot) => {
                const unit = opponent.vanguard[slot];
                const def = unit ? CARD_MAP[unit.cardId] : null;
                const isLunging = attackLunge?.attackerId === unit?.instanceId;
                const unitFloats = unit
                  ? floatingVfx.filter((f) => f.targetInstanceId === unit.instanceId)
                  : [];

                // Authentic Yu-Gi-Oh! ATK vs ATK / ATK vs DEF Battle Preview!
                let battleBadge: { text: string; style: string } | null = null;
                if (unit && selectedAttackerUnit && attackerCheck?.canAttackUnits) {
                  if (unit.faceDown) {
                    battleBadge = {
                      text: 'FLIP & ATTACK',
                      style: 'from-indigo-600 to-cyan-500 border-cyan-200',
                    };
                  } else if (unit.stance === 'attack') {
                    const eAtk = getEffectiveAtk(duel, unit, CARD_MAP);
                    if (selectedAttackerAtk > eAtk) {
                      battleBadge = {
                        text: `KILL! -${selectedAttackerAtk - eAtk} LP`,
                        style: 'from-emerald-600 to-amber-500 border-amber-200',
                      };
                    } else if (selectedAttackerAtk === eAtk) {
                      battleBadge = {
                        text: 'CLASH (BOTH DIE)',
                        style: 'from-amber-600 to-orange-600 border-amber-200',
                      };
                    } else {
                      battleBadge = {
                        text: `DANGER -${eAtk - selectedAttackerAtk} LP`,
                        style: 'from-rose-700 to-red-900 border-rose-300',
                      };
                    }
                  } else {
                    const eDef = getEffectiveDef(duel, unit, CARD_MAP);
                    if (selectedAttackerAtk > eDef) {
                      const hasPierce = selectedAttackerUnit.keywords.includes('Pierce');
                      battleBadge = {
                        text: hasPierce
                          ? `PIERCE -${selectedAttackerAtk - eDef} LP`
                          : 'SHATTER DEF!',
                        style: 'from-emerald-600 to-cyan-500 border-cyan-200',
                      };
                    } else if (selectedAttackerAtk === eDef) {
                      battleBadge = {
                        text: 'DRAW (0 DMG)',
                        style: 'from-slate-700 to-slate-600 border-slate-300',
                      };
                    } else {
                      battleBadge = {
                        text: `RECOIL -${eDef - selectedAttackerAtk} LP`,
                        style: 'from-rose-700 to-red-900 border-rose-300',
                      };
                    }
                  }
                }

                return (
                  <div
                    key={`opp_van_${slot}`}
                    data-vfx-anchor={`slot-opponent-${slot}`}
                    className="relative w-[110px] h-[156px] sm:w-[136px] sm:h-[190px] clip-chamfer border border-rose-500/30 bg-gradient-to-b from-rose-950/20 via-slate-950/65 to-slate-950/80 flex items-center justify-center shadow-[inset_0_0_24px_rgba(244,63,94,0.12)]"
                  >
                    {!unit || !def ? (
                      <div className="flex flex-col items-center opacity-35">
                        <div className="w-9 h-9 clip-diamond border border-rose-400/50 flex items-center justify-center">
                          <span className="font-mono-num text-[9px] text-rose-300">
                            0{slot + 1}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        key={unit.instanceId}
                        initial={{ y: -42, scale: 1.22, opacity: 0 }}
                        animate={
                          isLunging
                            ? { y: 42, scale: 1.09, opacity: 1 }
                            : { y: 0, scale: 1, opacity: 1 }
                        }
                        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                        className="relative"
                      >
                        <FlipRevealWrapper faceDown={unit.faceDown}>
                          <Card
                            card={def}
                            unit={unit}
                            effectiveAtk={getEffectiveAtk(duel, unit, CARD_MAP)}
                            effectiveDef={getEffectiveDef(duel, unit, CARD_MAP)}
                            size="sm"
                            targetableGlow={needsEnemyTarget ? 'enemy' : null}
                            onClick={() => handleEnemyUnitClick(unit.instanceId)}
                            onHover={(c, ev) => setInspectCard(c.id, ev)}
                          />
                        </FlipRevealWrapper>

                        {!unit.faceDown && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundEngine.uiClick();
                              setInspectCard(unit.cardId, unit.isEvolved);
                              setSideTab('inspect');
                              setMobileSheetOpen(true);
                            }}
                            className="lg:hidden absolute -bottom-2 -right-2 z-40 w-6 h-6 rounded-full bg-slate-950/95 border border-cyan-400/90 text-cyan-200 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.65)] cursor-pointer"
                            title={`Inspect ${def?.name ?? 'Monster'}`}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {needsEnemyTarget && (
                          <button
                            type="button"
                            onClick={() => handleEnemyUnitClick(unit.instanceId)}
                            className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap clip-skew-btn px-2.5 py-0.5 bg-gradient-to-r border text-white font-extrabold text-[8.5px] shadow-xl flex items-center gap-1 cursor-pointer animate-bounce ${
                              battleBadge?.style ?? 'from-rose-600 to-amber-500 border-amber-200'
                            }`}
                          >
                            <Crosshair className="w-3 h-3" />
                            {battleBadge?.text ?? 'TARGET'}
                          </button>
                        )}

                        <FloatingBadgeList items={unitFloats} />
                      </motion.div>
                    )}

                    <SummonSlotFlash
                      bursts={summonBursts.filter(
                        (b) => b.owner === 'opponent' && b.slot === slot
                      )}
                    />
                    <ImpactSlashOverlay
                      effects={slashEffects.filter(
                        (fx) => fx.targetSlot?.owner === 'opponent' && fx.targetSlot.slot === slot
                      )}
                    />
                  </div>
                );
              })}
            </div>

            {/* MIDLINE HELPER / CANCEL / QUICK CAST STRIP */}
            <div className="min-h-[30px] flex flex-wrap items-center justify-center gap-2 px-2">
              {helperBanner && (
                <div className="clip-chamfer-sm px-3.5 py-1 bg-slate-950/95 border border-cyan-400/60 text-[10.5px] sm:text-xs text-cyan-100 font-semibold shadow-xl text-center">
                  {helperBanner}
                </div>
              )}

              {pendingTribute && (
                <button
                  type="button"
                  onClick={cancelTribute}
                  className="clip-chamfer-sm px-3 py-1 bg-rose-950 border border-rose-400 text-rose-100 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancel Tribute
                </button>
              )}

              {selectedAttackerUnit && (
                <button
                  type="button"
                  onClick={() => selectAttacker(null)}
                  className="clip-chamfer-sm px-2.5 py-1 bg-slate-900 border border-slate-600 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}

              {isMain &&
                !pendingTribute &&
                selectedHandCard &&
                selectedHandCard.def.arcanaSubtype === 'fusion_catalyst' && (
                  <button
                    type="button"
                    onClick={() => openRiftModal('catalyst', selectedHandCard.hc.instanceId)}
                    className="clip-skew-btn shine-sweep relative overflow-hidden px-4 py-1 bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-display font-bold text-xs shadow-[0_0_20px_rgba(217,70,239,0.7)] flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    CAST {selectedHandCard.def.name}
                  </button>
                )}

              {isMain &&
                !pendingTribute &&
                selectedHandCard &&
                selectedHandCard.def.type === 'arcana' &&
                selectedHandCard.def.arcanaSubtype === 'instant' &&
                (!selectedHandCard.def.targetMode ||
                  selectedHandCard.def.targetMode === 'none') && (
                  <button
                    type="button"
                    onClick={() => playSelectedCard(selectedHandCard.hc.instanceId)}
                    className="clip-skew-btn px-4 py-1 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-display font-bold text-xs shadow-lg hover:brightness-110 cursor-pointer"
                  >
                    CAST {selectedHandCard.def.name}
                  </button>
                )}
            </div>

            {/* PLAYER MONSTER ZONES (3) */}
            <div className="flex items-start justify-center gap-2 sm:gap-5">
              {[0, 1, 2].map((slot) => {
                const unit = player.vanguard[slot];
                const def = unit ? CARD_MAP[unit.cardId] : null;
                const isLunging = attackLunge?.attackerId === unit?.instanceId;
                const evoCheck = unit
                  ? canEvolveUnit(duel, 'player', unit.instanceId, CARD_MAP)
                  : { eligible: false, freeInnate: false };
                const atkChk = unit
                  ? canUnitAttack(duel, unit, CARD_MAP)
                  : { canAttackUnits: false, canAttackLp: false };
                const canAtk =
                  isPlayerTurn && !pendingTribute && (atkChk.canAttackUnits || atkChk.canAttackLp);
                const canChangePos =
                  isMain &&
                  !pendingTribute &&
                  unit &&
                  unit.summonedTurn < player.turnsTaken &&
                  unit.attacksThisTurn === 0 &&
                  !unit.hasChangedPositionThisTurn &&
                  unit.frozenTurns === 0;
                const unitFloats = unit
                  ? floatingVfx.filter((f) => f.targetInstanceId === unit.instanceId)
                  : [];
                const isSelectedAttacker = selectedAttackerId === unit?.instanceId;
                const isPickedTribute =
                  Boolean(unit) && Boolean(pendingTribute?.selectedIds.includes(unit!.instanceId));
                const unitEffAtk = unit ? getEffectiveAtk(duel, unit, CARD_MAP) : 0;
                const unitEffDef = unit ? getEffectiveDef(duel, unit, CARD_MAP) : 0;

                return (
                  <div key={`pl_van_${slot}`} className="flex flex-col items-center">
                    <div
                      data-vfx-anchor={`slot-player-${slot}`}
                      onClick={() => !unit && handleEmptyVanguardClick(slot)}
                      className={`relative w-[110px] h-[156px] sm:w-[136px] sm:h-[190px] clip-chamfer border flex items-center justify-center transition-all ${
                        !unit && needsVanguardSlot
                          ? 'border-cyan-300 bg-cyan-900/35 shadow-[0_0_24px_rgba(34,211,238,0.6),inset_0_0_24px_rgba(34,211,238,0.35)] cursor-pointer hover:bg-cyan-800/45'
                          : 'border-cyan-500/30 bg-gradient-to-t from-cyan-950/20 via-slate-950/65 to-slate-950/80 shadow-[inset_0_0_24px_rgba(56,189,248,0.12)]'
                      }`}
                    >
                      {!unit || !def ? (
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-9 h-9 clip-diamond border flex items-center justify-center ${
                              needsVanguardSlot
                                ? 'border-cyan-300 bg-cyan-500/20 animate-pulse'
                                : 'border-cyan-500/30 opacity-40'
                            }`}
                          >
                            <span className="font-mono-num text-[9px] text-cyan-200">
                              {needsVanguardSlot ? '+' : `0${slot + 1}`}
                            </span>
                          </div>
                          {needsVanguardSlot && (
                            <span className="mt-1 text-[8.5px] font-extrabold uppercase tracking-widest text-cyan-200 animate-pulse">
                              SUMMON
                            </span>
                          )}
                        </div>
                      ) : (
                        <motion.div
                          key={unit.instanceId}
                          initial={{ y: -46, scale: 1.24, opacity: 0 }}
                          animate={
                            isLunging
                              ? { y: -44, scale: 1.1, opacity: 1 }
                              : isSelectedAttacker || isPickedTribute
                              ? { y: -8, scale: 1.04, opacity: 1 }
                              : { y: 0, scale: 1, opacity: 1 }
                          }
                          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                          className="relative"
                        >
                          <FlipRevealWrapper faceDown={unit.faceDown}>
                            <Card
                              card={def}
                              unit={unit}
                              effectiveAtk={unitEffAtk}
                              effectiveDef={unitEffDef}
                              ownerPeekLabel={
                                unit.faceDown ? `${def.name} (${unitEffDef} DEF)` : undefined
                              }
                              size="sm"
                              selected={isSelectedAttacker || isPickedTribute}
                              playableGlow={canAtk && !selectedAttackerId && !pendingTribute}
                              evolvableGlow={evoCheck.eligible && !pendingTribute}
                              targetableGlow={
                                pendingTribute || needsFriendlyTarget ? 'friendly' : null
                              }
                              onClick={() => handleFriendlyUnitClick(unit.instanceId)}
                              onHover={(c, ev) => setInspectCard(c.id, ev)}
                            />
                          </FlipRevealWrapper>

                          {pendingTribute && (
                            <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap clip-skew-btn px-2.5 py-0.5 bg-amber-400 text-slate-950 font-extrabold text-[9px] shadow-lg animate-bounce">
                              {isPickedTribute ? '✓ SELECTED' : '★ TAP TO TRIBUTE'}
                            </div>
                          )}

                          {unit.attacksThisTurn >= unit.maxAttacksThisTurn && (
                            <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-600 text-[8px] font-bold text-slate-400">
                              ATTACKED
                            </div>
                          )}

                          <FloatingBadgeList items={unitFloats} />
                        </motion.div>
                      )}

                      <SummonSlotFlash
                        bursts={summonBursts.filter(
                          (b) => b.owner === 'player' && b.slot === slot
                        )}
                      />
                      <ImpactSlashOverlay
                        effects={slashEffects.filter(
                          (fx) => fx.targetSlot?.owner === 'player' && fx.targetSlot.slot === slot
                        )}
                      />
                    </div>

                    {/* DEDICATED UNIT ACTION BAR BELOW PEDESTAL */}
                    {unit && !pendingTribute && (
                      <div className="mt-2 min-h-[24px] flex flex-wrap items-center justify-center gap-1 max-w-[138px]">
                        {canAtk && (
                          <button
                            type="button"
                            onClick={() => handleQuickAttackButton(unit.instanceId)}
                            className={`clip-skew-btn px-2.5 py-0.5 font-extrabold text-[9px] tracking-wide flex items-center gap-0.5 shadow-lg cursor-pointer transition-transform hover:scale-105 ${
                              isSelectedAttacker
                                ? 'bg-amber-300 text-slate-950'
                                : 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 text-white shadow-[0_0_14px_rgba(249,115,22,0.75)]'
                            }`}
                          >
                            <Swords className="w-2.5 h-2.5" />
                            {atkChk.canAttackLp && enemyActiveUnits.length === 0
                              ? `HIT LP (-${unitEffAtk})`
                              : isSelectedAttacker
                              ? 'PICK TARGET'
                              : 'ATTACK'}
                          </button>
                        )}

                        {evoCheck.eligible && (
                          <button
                            type="button"
                            onClick={() => triggerEvolution(unit.instanceId)}
                            className="clip-skew-btn px-2 py-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-extrabold text-[9px] shadow-[0_0_14px_rgba(251,191,36,0.9)] flex items-center gap-0.5 hover:scale-105 transition-transform cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {evoCheck.freeInnate ? 'FREE EVO' : 'EVOLVE'}
                          </button>
                        )}

                        {canChangePos && (
                          <button
                            type="button"
                            onClick={() => triggerStanceToggle(unit.instanceId)}
                            className="clip-chamfer-sm px-2 py-0.5 bg-slate-900 border border-cyan-400/75 text-cyan-200 hover:bg-cyan-400 hover:text-slate-950 font-bold text-[8.5px] flex items-center gap-0.5 cursor-pointer transition-colors"
                          >
                            {unit.faceDown ? (
                              <>
                                <Eye className="w-2.5 h-2.5" /> FLIP SUMMON
                              </>
                            ) : unit.stance === 'attack' ? (
                              <>
                                <Shield className="w-2.5 h-2.5" /> TO DEF
                              </>
                            ) : (
                              <>
                                <Swords className="w-2.5 h-2.5" /> TO ATK
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.uiClick();
                            setInspectCard(unit.cardId, unit.isEvolved);
                            setSideTab('inspect');
                            setMobileSheetOpen(true);
                          }}
                          className="lg:hidden clip-chamfer-sm px-1.5 py-0.5 bg-slate-900/95 border border-cyan-400/75 text-cyan-200 font-bold text-[8.5px] flex items-center gap-0.5 cursor-pointer"
                          title={`Inspect ${def?.name ?? 'Monster'}`}
                        >
                          <Info className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PLAYER SPELL/TRAP ZONES (2) */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3">
              {[0, 1].map((slot) => {
                const back = player.arcane[slot];
                const def = back ? CARD_MAP[back.cardId] : null;
                return (
                  <div
                    key={`pl_arc_${slot}`}
                    onClick={() => !back && handleEmptyArcaneClick(slot)}
                    className={`w-36 sm:w-40 h-10 sm:h-11 clip-chamfer-sm border flex items-center justify-center px-1.5 transition-all ${
                      !back && needsArcaneSlot
                        ? 'border-fuchsia-400 bg-fuchsia-950/45 shadow-[0_0_20px_rgba(217,70,239,0.65)] cursor-pointer'
                        : 'border-indigo-500/35 bg-slate-950/70'
                    }`}
                  >
                    {!back ? (
                      <span
                        className={`text-[8.5px] sm:text-[9px] font-display uppercase tracking-widest ${
                          needsArcaneSlot
                            ? 'text-fuchsia-200 font-extrabold animate-pulse'
                            : 'text-slate-600'
                        }`}
                      >
                        {needsArcaneSlot ? '+ Set Trap/Domain' : `Trap / Spell ${slot + 1}`}
                      </span>
                    ) : def ? (
                      <button
                        type="button"
                        onMouseEnter={() => setInspectCard(def.id, false)}
                        onClick={() => setInspectCard(def.id, false)}
                        className={`w-full h-full clip-chamfer-sm border flex items-center gap-1.5 px-1.5 text-left cursor-pointer ${
                          back.kind === 'ambush'
                            ? 'bg-purple-950/85 border-fuchsia-400/75'
                            : 'bg-emerald-950/75 border-emerald-400/75'
                        }`}
                      >
                        <img
                          src={getCardArtPresentation(def).src}
                          alt={def.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold text-white truncate">{def.name}</div>
                          <div className="text-[7.5px] uppercase text-fuchsia-200/80">
                            {back.kind === 'ambush' ? 'Trap Set' : 'Field Domain'}
                          </div>
                        </div>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DESKTOP RIGHT-FLANK PHASE & TURN ORB */}
          <div className="hidden sm:flex flex-col items-center gap-2 absolute right-1 lg:right-3 top-1/2 -translate-y-1/2 z-30">
            <div className="game-panel clip-chamfer-sm px-3 py-1 text-center border-indigo-400/50">
              <div className="text-[8px] uppercase tracking-[0.22em] text-slate-400">Turn</div>
              <div className="font-mono-num text-base font-extrabold text-cyan-200 leading-none">
                {Math.max(1, duel.turnNumber)}
              </div>
            </div>

            {isMain && (
              <button
                type="button"
                onClick={handleBattleButtonClick}
                className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  !isTurnOneNoBattle && readyAttackers.length > 0
                    ? 'bg-gradient-to-b from-amber-500 via-orange-600 to-rose-700 border-amber-200 shadow-[0_0_26px_rgba(245,158,11,0.8)] hover:scale-105 animate-pulse'
                    : 'bg-slate-900/85 border-slate-700 text-slate-500 hover:border-slate-500'
                }`}
              >
                <Swords className="w-5 h-5" />
                <span className="font-display font-extrabold text-[10px] tracking-wider mt-0.5">
                  BATTLE
                </span>
                <span className="text-[7.5px] font-mono-num font-bold opacity-90">
                  {isTurnOneNoBattle ? 'T1 LOCK' : `${readyAttackers.length} RDY`}
                </span>
              </button>
            )}

            <button
              type="button"
              disabled={!isPlayerTurn}
              onClick={finishPlayerTurn}
              className={`relative overflow-hidden w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                isPlayerTurn
                  ? 'shine-sweep bg-gradient-to-b from-cyan-500 via-indigo-600 to-purple-800 border-cyan-200 shadow-[0_0_32px_rgba(56,189,248,0.75)] hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gradient-to-b from-rose-950 to-slate-950 border-rose-500/60 cursor-not-allowed'
              }`}
            >
              <span className="font-display font-extrabold text-xs tracking-wider text-white text-center leading-tight px-2">
                {isPlayerTurn ? 'END\nTURN' : 'RIVAL\nTURN'}
              </span>
              <span className="text-[8px] uppercase tracking-widest text-cyan-200/90 mt-1">
                {!isPlayerTurn ? 'Wait' : isBattle ? 'Battle' : 'Main'}
              </span>
            </button>
          </div>
        </div>

        {/* MOBILE PHASE BAR */}
        <div className="flex sm:hidden items-center justify-between gap-2 px-1 py-1">
          <span className="font-mono-num text-[11px] font-extrabold text-cyan-300">
            T{Math.max(1, duel.turnNumber)} •{' '}
            {isBattle ? 'BATTLE' : isMain ? 'MAIN' : 'RIVAL TURN'}
          </span>
          <div className="flex items-center gap-1.5">
            {isMain && (
              <button
                type="button"
                onClick={handleBattleButtonClick}
                className={`clip-skew-btn px-3 py-1.5 font-display font-extrabold text-[11px] flex items-center gap-1 cursor-pointer ${
                  !isTurnOneNoBattle && readyAttackers.length > 0
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_16px_rgba(245,158,11,0.7)]'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Swords className="w-3 h-3" />
                {isTurnOneNoBattle ? 'T1 LOCK' : `BATTLE (${readyAttackers.length})`}
              </button>
            )}
            <button
              type="button"
              disabled={!isPlayerTurn}
              onClick={finishPlayerTurn}
              className="clip-skew-btn px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-display font-extrabold text-[11px] disabled:opacity-45 cursor-pointer"
            >
              END TURN
            </button>
          </div>
        </div>

        {/* MOBILE LIVE CARD DESCRIPTION BAR (ALWAYS READABLE DURING MAIN, BATTLE & RIVAL TURN) */}
        <AnimatePresence>
          {inspectedDef &&
            mobileBarDismissedKey !== `${inspectedDef.id}_${inspectCard?.isEvolved ? 'ev' : 'base'}` && (
            <motion.div
              key={`${inspectedDef.id}_${inspectCard?.isEvolved ? 'ev' : 'base'}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
              className="lg:hidden mx-1 my-1 rounded-xl bg-[#070b18]/95 border border-cyan-400/65 shadow-[0_0_24px_rgba(34,211,238,0.22)] px-2.5 py-2 flex items-start gap-2.5"
            >
              <img
                src={getCardArtPresentation(inspectedDef, inspectCard?.isEvolved).src}
                alt={inspectedDef.name}
                onClick={() => {
                  setSideTab('inspect');
                  setMobileSheetOpen(true);
                }}
                className="w-11 h-14 rounded-lg object-cover border border-cyan-300/50 shrink-0 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-display font-extrabold text-xs text-white leading-tight truncate max-w-[165px]">
                    {inspectCard?.isEvolved && inspectedDef.evolvedData
                      ? inspectedDef.evolvedData.name
                      : inspectedDef.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-600/80 text-[8.5px] font-bold uppercase tracking-wider text-cyan-200">
                    {inspectedDef.type === 'arcana'
                      ? inspectedDef.arcanaSubtype === 'domain'
                        ? 'FIELD SPELL'
                        : 'SPELL'
                      : inspectedDef.type === 'ambush'
                      ? 'TRAP'
                      : inspectedDef.type === 'relic'
                      ? 'EQUIP'
                      : inspectedDef.type === 'fusion_apex'
                      ? `FUSION ★${inspectedDef.level}`
                      : `★${inspectedDef.level}`}
                  </span>
                  {(inspectedDef.atk !== undefined || inspectedDef.def !== undefined) && (
                    <span className="font-mono-num text-[10px] font-extrabold text-amber-300">
                      ATK{' '}
                      {inspectCard?.isEvolved && inspectedDef.evolvedData
                        ? inspectedDef.evolvedData.atk
                        : inspectedDef.atk ?? 0}{' '}
                      / DEF{' '}
                      {inspectCard?.isEvolved && inspectedDef.evolvedData
                        ? inspectedDef.evolvedData.def
                        : inspectedDef.def ?? 0}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[11px] leading-snug text-slate-100">
                  {inspectCard?.isEvolved && inspectedDef.evolvedData
                    ? inspectedDef.evolvedData.effectText
                    : inspectedDef.effectText}
                </p>

                {inspectedKeywords.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {inspectedKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-400/45 text-[8.5px] font-bold text-cyan-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.uiClick();
                    setSideTab('inspect');
                    setMobileSheetOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-cyan-950/90 border border-cyan-400/70 text-[9px] font-extrabold uppercase tracking-wider text-cyan-200 cursor-pointer"
                >
                  Detail
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMobileBarDismissedKey(
                      `${inspectedDef.id}_${inspectCard?.isEvolved ? 'ev' : 'base'}`
                    )
                  }
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PLAYER RESOURCE BAR (8000 LP • RUSH SUMMONS • EVO ORBS • SOUL BURN) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 sm:px-2">
          <div className="relative flex items-center gap-1.5 sm:gap-2">
            {/* Player LP */}
            <div
              data-vfx-anchor="lp-player"
              className="relative clip-chamfer-sm px-3 py-1 bg-gradient-to-b from-emerald-950/90 to-slate-950 border-2 border-emerald-400/70 flex items-center gap-1.5"
            >
              <Heart className="w-4 h-4 text-emerald-300 fill-emerald-400/40" />
              <div className="leading-none">
                <div className="font-mono-num font-extrabold text-base sm:text-lg text-white">
                  <RollingLpCounter value={player.lp} />
                </div>
                <div className="text-[7.5px] font-bold text-emerald-200/80 uppercase tracking-wider">
                  LP
                </div>
              </div>
              <ImpactSlashOverlay
                effects={slashEffects.filter((fx) => fx.targetPlayer === 'player')}
              />
            </div>

            {/* Rush Duel Unlimited Summons Indicator */}
            <div
              className={`game-panel clip-chamfer-sm px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold ${
                isMain
                  ? 'border-amber-400/75 text-amber-200'
                  : 'border-slate-700 text-slate-400'
              }`}
              title="Rush Duel Rule: Unlimited Normal Summons / Sets per turn (★1-4 free, ★5-6 = 1 Tribute, ★7-8 = 2 Tributes) + Draw up to 5 cards every Draw Phase!"
            >
              <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span className="font-mono-num font-extrabold text-sm leading-none">∞</span>
              <span className="text-[9.5px] uppercase tracking-wider">
                Rush Summon
              </span>
            </div>

            <FloatingBadgeList
              items={floatingVfx.filter((f) => f.targetPlayer === 'player')}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className={`game-panel clip-chamfer-sm px-2.5 py-1 flex items-center gap-1.5 text-xs font-bold ${
                player.turnsTaken >= 3 && player.evoOrbs > 0
                  ? 'border-amber-400/80 text-amber-200'
                  : 'border-slate-700 text-slate-400'
              }`}
              title="Evo Orbs unlock on your Turn 3 (max 1 Evolution per turn)."
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <div className="flex items-center gap-1">
                {Array.from({ length: player.maxEvoOrbs }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-3 h-3 clip-diamond ${
                      idx < player.evoOrbs
                        ? player.turnsTaken >= 3
                          ? 'bg-amber-300 shadow-[0_0_10px_#fbbf24]'
                          : 'bg-amber-700/60'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              {player.turnsTaken < 3 && (
                <span className="text-[9px] text-amber-300/80">T3</span>
              )}
            </div>

            <div
              className={`game-panel clip-chamfer-sm px-2.5 py-1 text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                !player.soulBurnUsedThisTurn && isMain
                  ? 'border-orange-400/70 text-orange-200'
                  : 'border-slate-800 text-slate-500'
              }`}
              title="Soul Burn (1/Turn): Discard 1 hand card to Void → Draw 1 fresh card + trigger Resonate!"
            >
              <Flame className="w-3 h-3" />
              {player.soulBurnUsedThisTurn ? 'Cycled' : 'Soul Burn'}
            </div>
          </div>
        </div>

        {/* FULL-WIDTH RESPONSIVE HAND TRAY */}
        <HandTray
          duel={duel}
          selectedHandId={selectedHandId}
          onSelectCard={handleHandCardClick}
          onSummonMonster={(id, mode) => initiateMonsterSummon(id, mode)}
          onSoulBurn={(id) => triggerSoulBurn(id)}
          onOpenRiftDeck={() => openRiftModal('contact')}
          onOpenVoid={() => {
            soundEngine.uiClick();
            setVoidModalOwner('player');
          }}
          onHoverCard={(c, ev) => setInspectCard(c.id, ev)}
          onInspectCard={(cardId) => {
            soundEngine.uiClick();
            setInspectCard(cardId, false);
            setSideTab('inspect');
            setMobileSheetOpen(true);
          }}
        />
      </ScreenShakeWrapper>

      {/* DESKTOP INSPECTOR DRAWER */}
      {desktopDrawerOpen && (
        <aside className="hidden lg:flex w-[308px] xl:w-[336px] shrink-0 bg-[#070914]/95 border-l border-indigo-500/30 flex-col relative z-20 max-h-screen shadow-2xl">
          {renderInspectorContent()}
        </aside>
      )}

      {/* MOBILE SLIDE-UP INSPECTOR SHEET */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <div
            onClick={() => setMobileSheetOpen(false)}
            className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg h-[82vh] bg-[#080b18] border-t-2 border-cyan-400/60 rounded-t-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
                <span className="font-display font-bold text-xs tracking-wider text-cyan-300 uppercase">
                  Card Inspector &amp; Battle Log
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-900 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderInspectorContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] text-center clip-chamfer-sm px-4 py-2 bg-slate-950/95 border border-amber-400/85 text-amber-100 text-xs font-bold shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MULLIGAN OVERLAY */}
      {duel.phase === 'mulligan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl game-panel clip-chamfer border-cyan-400/55 shadow-[0_0_70px_rgba(34,211,238,0.28)] p-4 sm:p-6 text-center my-auto"
          >
            <div className="inline-flex items-center gap-2 clip-skew-btn px-4 py-1 bg-cyan-950/90 border border-cyan-400/60 text-cyan-200 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest mb-2">
              8000 LP Rush Duel • Unlimited Summons • Draw to 5
            </div>
            <h2 className="font-display text-xl sm:text-3xl font-extrabold text-white">
              Prepare Your Opening Duel Hand
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Swap out ★5–8 Tribute monsters if you lack low-level ★1–4 monsters to Summon first!
            </p>

            {chapter && (
              <div className="mt-3 inline-flex items-center gap-2 clip-chamfer-sm px-3.5 py-1.5 bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200">
                <strong>{chapter.bossName}:</strong> {chapter.modifierDescription}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {player.hand.map((hc) => {
                const def = CARD_MAP[hc.cardId];
                const marked = mulliganSwaps.includes(hc.instanceId);
                return (
                  <div key={hc.instanceId} className="relative">
                    <div className={marked ? 'opacity-50 scale-95 transition-all' : 'transition-all'}>
                      <Card
                        card={def}
                        size="sm"
                        selected={marked}
                        onClick={() => toggleMulliganSwap(hc.instanceId)}
                      />
                    </div>
                    {marked && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="clip-skew-btn px-3 py-1 bg-amber-400 text-slate-950 font-extrabold text-[10px] tracking-wider shadow-lg">
                          REDRAW
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  soundEngine.uiClick();
                  confirmMulligan(mulliganSwaps);
                  setMulliganSwaps([]);
                }}
                className="relative overflow-hidden shine-sweep clip-skew-btn px-8 py-3 bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 text-white font-display font-extrabold text-xs sm:text-sm tracking-wider shadow-[0_0_30px_rgba(56,189,248,0.55)] hover:brightness-110 cursor-pointer"
              >
                {mulliganSwaps.length > 0
                  ? `SWAP ${mulliganSwaps.length} CARD${mulliganSwaps.length > 1 ? 'S' : ''} & DUEL!`
                  : 'KEEP HAND & BEGIN DUEL!'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {riftModal.open && (
        <RiftDeckModal
          duel={duel}
          mode={riftModal.mode}
          catalystHandId={riftModal.catalystHandId}
          onClose={closeRiftModal}
          onConfirmContact={(fid, mats) => triggerContactFusion(fid, mats)}
          onConfirmCatalyst={(catId, fid, mats) => triggerCatalystFusion(catId, fid, mats)}
        />
      )}

      <BattlefieldFXCanvas
        commands={canvasFxQueue}
        activeDomainFaction={activeDomain?.faction ?? null}
      />
      <DamageVignetteOverlay flash={damageFlash} />
      <FusionOverlay cutIn={cutIn} onDismiss={dismissCutIn} />
      <PhaseBannerOverlay banner={phaseBanner} />
      <TrapPromptModal prompt={pendingTrapPrompt} onResolve={resolveTrapPrompt} />
      <VoidModal
        duel={duel}
        owner={voidModalOwner}
        onChangeOwner={setVoidModalOwner}
        onClose={() => setVoidModalOwner(null)}
        onInspectCard={(cardId) => setInspectCard(cardId, false)}
      />

      {duel.winner && winnerModalReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-xl game-panel clip-chamfer p-6 text-center shadow-2xl ${
              duel.winner === 'player'
                ? 'border-amber-400/80 shadow-[0_0_75px_rgba(251,191,36,0.38)]'
                : 'border-rose-500/70 shadow-[0_0_65px_rgba(244,63,94,0.35)]'
            }`}
          >
            <div className="flex justify-center mb-3">
              <div className="w-20 h-20 clip-hex p-[2.5px] bg-gradient-to-b from-amber-300 to-indigo-600">
                <img
                  src={opponentPortrait}
                  alt={opponent.name}
                  className="w-full h-full clip-hex object-cover"
                />
              </div>
            </div>

            <h2
              className={`font-display text-4xl font-extrabold tracking-wider ${
                duel.winner === 'player'
                  ? 'bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent'
                  : 'text-rose-400'
              }`}
            >
              {duel.winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{duel.winReason}</p>

            {chapter && (
              <p className="mt-3 px-4 py-2 clip-chamfer-sm bg-slate-900/90 border border-slate-800 text-xs text-slate-200 italic">
                “
                {duel.winner === 'player'
                  ? chapter.dialogue.victory
                  : chapter.dialogue.defeat}
                ”
              </p>
            )}

            {rewardSummary && (
              <div className="mt-5 clip-chamfer-sm bg-slate-950/90 border border-slate-800 p-4 space-y-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                  Duel Rewards
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="game-panel-gold clip-chamfer-sm px-4 py-2 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-300" />
                    <span className="font-mono-num text-xl font-extrabold text-amber-200">
                      +{rewardSummary.coinsEarned}
                    </span>
                    <span className="text-xs text-amber-300/80">Coins</span>
                  </div>
                  {rewardSummary.championBadgeEarned && (
                    <div className="clip-chamfer-sm px-4 py-2 bg-fuchsia-950/70 border border-fuchsia-400/70 flex items-center gap-2 text-fuchsia-200 font-bold text-xs">
                      <Crown className="w-5 h-5 text-amber-300" />
                      Rift Champion Badge!
                    </div>
                  )}
                </div>

                {rewardSummary.bonusCardId && CARD_MAP[rewardSummary.bonusCardId] && (
                  <div className="pt-2 flex flex-col items-center">
                    <div className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      CHAPTER CLEAR MYTHIC UNLOCKED!
                    </div>
                    <Card
                      card={CARD_MAP[rewardSummary.bonusCardId]}
                      size="md"
                      interactiveTilt
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRematch}
                className="clip-skew-btn px-6 py-2.5 bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 font-display font-bold text-xs tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> REMATCH
              </button>
              <button
                type="button"
                onClick={onExit}
                className="clip-skew-btn px-7 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-display font-bold text-xs tracking-wider hover:brightness-110 cursor-pointer"
              >
                CONTINUE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
