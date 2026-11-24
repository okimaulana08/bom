import { create } from 'zustand';
import type {
  DuelConfig,
  DuelEvent,
  DuelState,
  Faction,
  MaterialChoice,
  PlayCardOptions,
  PlayerId,
} from '../engine/types';
import {
  createDuel,
  declareAttack,
  endTurn,
  enterBattlePhase,
  evolveUnit,
  executeContactFusion,
  playCard,
  soulBurn,
  submitMulligan,
  toggleStance,
} from '../engine/rules';
import { CARD_MAP } from '../data/cards';
import { getChapter } from '../data/campaign';
import { findUnitById } from '../engine/utils';
import {
  type AiAction,
  applyAiAction,
  decideNextAiAction,
  inspectAiActionTrapPrompt,
  type TrapPromptInfo,
} from '../ai/aiAgent';
import { soundEngine } from '../audio/soundEngine';
import { type MatchRewardSummary, useProfileStore } from './profileStore';

export interface CutInBanner {
  id: string;
  kind: 'evolve' | 'fusion' | 'ambush' | 'ace_summon';
  title: string;
  subtitle: string;
  cardId: string;
  faction?: Faction;
  materialCardIds?: string[];
  materialFactions?: Faction[];
  atk?: number;
  def?: number;
  actor: PlayerId;
}

export type VfxAnchor =
  | { kind: 'slot'; owner: PlayerId; slot: 0 | 1 | 2 }
  | { kind: 'lp'; owner: PlayerId }
  | { kind: 'center' };

export interface CanvasFxCommand {
  id: string;
  kind:
    | 'projectile'
    | 'explosion'
    | 'summon_rune'
    | 'tribute_beam'
    | 'heal_burst'
    | 'spell_burst'
    | 'final_blow';
  faction: Faction;
  from?: VfxAnchor;
  to: VfxAnchor;
  intensity?: number;
}

export interface DamageFlash {
  id: string;
  target: PlayerId;
  amount: number;
  severity: 'light' | 'heavy' | 'critical' | 'lethal';
}

export interface SummonBurst {
  id: string;
  owner: PlayerId;
  slot: 0 | 1 | 2;
  faction: Faction;
  isAce: boolean;
}

export interface PhaseBanner {
  id: string;
  title: string;
  subtitle: string;
  tone: 'player' | 'opponent' | 'battle';
}

export interface SlashEffect {
  id: string;
  targetSlot?: { owner: PlayerId; slot: 0 | 1 | 2 };
  targetPlayer?: PlayerId;
  kind: 'slash' | 'shatter';
}

export interface PendingTrapPrompt extends TrapPromptInfo {
  action: AiAction;
}

export interface FloatingVfx {
  id: string;
  targetInstanceId?: string;
  targetPlayer?: PlayerId;
  text: string;
  tone: 'damage' | 'heal' | 'buff' | 'info';
}

export interface AttackLunge {
  id: string;
  attackerId: string;
  targetId?: string;
  targetPlayer?: PlayerId;
}

export interface PendingTribute {
  handInstanceId: string;
  cardId: string;
  summonMode: 'attack' | 'defense';
  required: number;
  selectedIds: string[];
}

interface DuelStore {
  duel: DuelState | null;
  opponentPortrait: string;
  bossDialogue: string | null;
  bossLowLpTriggered: boolean;
  selectedHandId: string | null;
  selectedAttackerId: string | null;
  pendingTribute: PendingTribute | null;
  pendingTrapPrompt: PendingTrapPrompt | null;
  inspectCard: { cardId: string; isEvolved: boolean } | null;
  riftModal: { open: boolean; mode: 'contact' | 'catalyst'; catalystHandId?: string };
  cutIn: CutInBanner | null;
  phaseBanner: PhaseBanner | null;
  slashEffects: SlashEffect[];
  canvasFxQueue: CanvasFxCommand[];
  damageFlash: DamageFlash | null;
  summonBursts: SummonBurst[];
  floatingVfx: FloatingVfx[];
  attackLunge: AttackLunge | null;
  screenShakeKey: number;
  screenShakeIntensity: 1 | 2 | 3;
  winnerModalReady: boolean;
  aiThinking: boolean;
  toast: string | null;
  rewardSummary: MatchRewardSummary | null;

  startDuel: (config: DuelConfig, opponentPortrait: string) => void;
  exitDuel: () => void;
  confirmMulligan: (swapIds: string[]) => void;
  selectHandCard: (instanceId: string | null) => void;
  selectAttacker: (unitInstanceId: string | null) => void;
  startTributeSelection: (
    handInstanceId: string,
    cardId: string,
    required: number,
    summonMode: 'attack' | 'defense'
  ) => void;
  toggleTributeUnit: (unitInstanceId: string) => void;
  cancelTribute: () => void;
  resolveTrapPrompt: (activate: boolean) => void;
  setInspectCard: (cardId: string, isEvolved?: boolean) => void;
  openRiftModal: (mode: 'contact' | 'catalyst', catalystHandId?: string) => void;
  closeRiftModal: () => void;
  dismissCutIn: () => void;
  dismissPhaseBanner: () => void;
  clearToast: () => void;
  notifyToast: (msg: string) => void;

  playSelectedCard: (handInstanceId: string, options?: PlayCardOptions) => boolean;
  triggerSoulBurn: (handInstanceId: string) => boolean;
  triggerStanceToggle: (unitInstanceId: string) => boolean;
  triggerEvolution: (unitInstanceId: string) => boolean;
  triggerContactFusion: (fusionCardId: string, materials: MaterialChoice[]) => boolean;
  triggerCatalystFusion: (
    catalystHandId: string,
    fusionCardId: string,
    materials: MaterialChoice[]
  ) => boolean;
  triggerAttack: (
    attackerId: string,
    target: { kind: 'unit'; instanceId: string } | { kind: 'lp' }
  ) => boolean;
  goToBattlePhase: () => void;
  finishPlayerTurn: () => void;
}

let aiTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let cutInTimer: ReturnType<typeof setTimeout> | null = null;
let phaseBannerTimer: ReturnType<typeof setTimeout> | null = null;
let dialogueTimer: ReturnType<typeof setTimeout> | null = null;
let damageFlashTimer: ReturnType<typeof setTimeout> | null = null;
let winnerModalTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (aiTimer) clearTimeout(aiTimer);
  if (toastTimer) clearTimeout(toastTimer);
  if (cutInTimer) clearTimeout(cutInTimer);
  if (phaseBannerTimer) clearTimeout(phaseBannerTimer);
  if (dialogueTimer) clearTimeout(dialogueTimer);
  if (damageFlashTimer) clearTimeout(damageFlashTimer);
  if (winnerModalTimer) clearTimeout(winnerModalTimer);
  aiTimer = null;
  toastTimer = null;
  cutInTimer = null;
  phaseBannerTimer = null;
  dialogueTimer = null;
  damageFlashTimer = null;
  winnerModalTimer = null;
}

function resolveUnitSlot(
  instanceId: string | undefined,
  nextState: DuelState,
  prevState?: DuelState | null
): { owner: PlayerId; slot: 0 | 1 | 2 } | undefined {
  if (!instanceId) return undefined;
  const inNext = findUnitById(nextState, instanceId);
  if (inNext) return { owner: inNext.owner, slot: inNext.slot };
  if (prevState) {
    const inPrev = findUnitById(prevState, instanceId);
    if (inPrev) return { owner: inPrev.owner, slot: inPrev.slot };
  }
  return undefined;
}

function resolveUnitFaction(
  instanceId: string | undefined,
  nextState: DuelState,
  prevState?: DuelState | null
): Faction {
  if (!instanceId) return 'chrono';
  const found = findUnitById(nextState, instanceId) ?? (prevState ? findUnitById(prevState, instanceId) : null);
  if (!found) return 'chrono';
  return CARD_MAP[found.unit.cardId]?.faction ?? 'chrono';
}

export const useDuelStore = create<DuelStore>((set, get) => {
  const showToast = (msg: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2800);
  };

  const speedMult = () => ((useProfileStore.getState().duelSpeed ?? 1) === 2 ? 0.52 : 1);

  const showPhaseBanner = (banner: PhaseBanner) => {
    if (phaseBannerTimer) clearTimeout(phaseBannerTimer);
    set({ phaseBanner: banner });
    phaseBannerTimer = setTimeout(() => {
      if (get().phaseBanner?.id === banner.id) {
        set({ phaseBanner: null });
      }
    }, Math.round(1150 * speedMult()));
  };

  const sayBossLine = (line: string) => {
    if (dialogueTimer) clearTimeout(dialogueTimer);
    set({ bossDialogue: line });
    dialogueTimer = setTimeout(() => set({ bossDialogue: null }), 4200);
  };

  const processEvents = (nextState: DuelState, prevState?: DuelState | null) => {
    const events: DuelEvent[] = nextState.recentEvents;
    const newFloats: FloatingVfx[] = [];
    const newSlashes: SlashEffect[] = [];
    const newCanvasFx: CanvasFxCommand[] = [];
    const newSummonBursts: SummonBurst[] = [];
    let shakeIntensity: 0 | 1 | 2 | 3 = 0;
    let newCutIn: CutInBanner | null = null;
    let newPhaseBanner: PhaseBanner | null = null;
    let newDamageFlash: DamageFlash | null = null;
    let lunge: AttackLunge | null = null;
    let lastAttackFaction: Faction | null = null;
    let hadLethalBlow = false;

    const raiseShake = (lvl: 1 | 2 | 3) => {
      if (lvl > shakeIntensity) shakeIntensity = lvl;
    };

    const chapter = nextState.chapterId ? getChapter(nextState.chapterId) : undefined;

    for (const ev of events) {
      switch (ev.type) {
        case 'turn_start': {
          const isPlayer = ev.actor === 'player';
          soundEngine.turnSweep(isPlayer);
          newPhaseBanner = {
            id: ev.id,
            title: isPlayer ? 'YOUR TURN' : "RIVAL'S TURN",
            subtitle: `TURN ${Math.max(1, nextState.turnNumber)} • ${
              isPlayer ? 'MAIN PHASE' : nextState.players.opponent.name.toUpperCase()
            }`,
            tone: isPlayer ? 'player' : 'opponent',
          };
          break;
        }
        case 'draw':
          soundEngine.cardDraw();
          break;
        case 'set_monster':
          soundEngine.shieldBlock();
          break;
        case 'flip': {
          soundEngine.spellCast();
          const fSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);
          const fFaction = resolveUnitFaction(ev.targetInstanceId, nextState, prevState);
          if (fSlot) {
            newCanvasFx.push({
              id: `${ev.id}_flip_rune`,
              kind: 'summon_rune',
              faction: fFaction,
              to: { kind: 'slot', owner: fSlot.owner, slot: fSlot.slot },
              intensity: 1,
            });
          }
          newFloats.push({
            id: ev.id,
            targetInstanceId: ev.targetInstanceId,
            text: 'FLIP!',
            tone: 'buff',
          });
          break;
        }
        case 'summon': {
          const def = ev.cardId ? CARD_MAP[ev.cardId] : undefined;
          const isAce = Boolean(def && (def.rarity === 'mythic' || def.level >= 7));
          soundEngine.summonSlam(isAce);

          const sumSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);
          const faction: Faction = def?.faction ?? 'chrono';

          if (sumSlot) {
            newSummonBursts.push({
              id: `${ev.id}_burst`,
              owner: sumSlot.owner,
              slot: sumSlot.slot,
              faction,
              isAce,
            });
            newCanvasFx.push({
              id: `${ev.id}_rune`,
              kind: 'summon_rune',
              faction,
              to: { kind: 'slot', owner: sumSlot.owner, slot: sumSlot.slot },
              intensity: isAce ? 2 : 1,
            });

            // Detect Tributed units from prevState to fire golden Tribute Soul Beams!
            if (prevState && ev.actor) {
              const prevVanguard = prevState.players[ev.actor].vanguard;
              const nextUnitIds = new Set(
                nextState.players[ev.actor].vanguard
                  .filter((u): u is NonNullable<typeof u> => Boolean(u))
                  .map((u) => u.instanceId)
              );
              prevVanguard.forEach((prevU, idx) => {
                if (prevU && !nextUnitIds.has(prevU.instanceId)) {
                  newCanvasFx.push({
                    id: `${ev.id}_trib_${idx}`,
                    kind: 'tribute_beam',
                    faction,
                    from: { kind: 'slot', owner: ev.actor!, slot: idx as 0 | 1 | 2 },
                    to: { kind: 'slot', owner: sumSlot.owner, slot: sumSlot.slot },
                    intensity: 2,
                  });
                }
              });
            }
          }

          if (isAce && def) {
            raiseShake(2);
            if (!newCutIn) {
              newCutIn = {
                id: ev.id,
                kind: 'ace_summon',
                title: 'ACE SUMMON!',
                subtitle: def.name,
                cardId: def.id,
                faction: def.faction,
                atk: def.atk,
                def: def.def,
                actor: ev.actor ?? 'player',
              };
            }
          }

          if (ev.actor === 'opponent' && def && chapter) {
            if (def.rarity === 'mythic' || def.type === 'fusion_apex') {
              sayBossLine(chapter.dialogue.onBossAce);
            }
          }
          break;
        }
        case 'spell':
        case 'domain': {
          soundEngine.spellCast();
          const def = ev.cardId ? CARD_MAP[ev.cardId] : undefined;
          const faction: Faction = def?.faction ?? 'chrono';
          const targetSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);
          newCanvasFx.push({
            id: `${ev.id}_spell`,
            kind: 'spell_burst',
            faction,
            to: targetSlot
              ? { kind: 'slot', owner: targetSlot.owner, slot: targetSlot.slot }
              : ev.targetPlayer
              ? { kind: 'lp', owner: ev.targetPlayer }
              : { kind: 'center' },
            intensity: ev.type === 'domain' ? 2 : 1,
          });
          break;
        }
        case 'relic': {
          soundEngine.relicAttach();
          const def = ev.cardId ? CARD_MAP[ev.cardId] : undefined;
          const targetSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);
          if (targetSlot) {
            newCanvasFx.push({
              id: `${ev.id}_relic`,
              kind: 'summon_rune',
              faction: def?.faction ?? 'chrono',
              to: { kind: 'slot', owner: targetSlot.owner, slot: targetSlot.slot },
              intensity: 1,
            });
          }
          break;
        }
        case 'soul_burn':
          soundEngine.soulBurn();
          newFloats.push({
            id: ev.id,
            targetPlayer: ev.actor,
            text: '+1 SUMMON',
            tone: 'buff',
          });
          break;
        case 'evolve': {
          soundEngine.evolve();
          raiseShake(2);
          const def = ev.cardId ? CARD_MAP[ev.cardId] : undefined;
          const evoSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);
          if (evoSlot) {
            newCanvasFx.push({
              id: `${ev.id}_evo_rune`,
              kind: 'summon_rune',
              faction: def?.faction ?? 'chrono',
              to: { kind: 'slot', owner: evoSlot.owner, slot: evoSlot.slot },
              intensity: 2,
            });
          }
          if (def?.evolvedData) {
            newCutIn = {
              id: ev.id,
              kind: 'evolve',
              title: 'AWAKENED EVOLUTION!',
              subtitle: `${def.name} → ${def.evolvedData.name}`,
              cardId: def.id,
              faction: def.faction,
              atk: def.evolvedData.atk,
              def: def.evolvedData.def,
              actor: ev.actor ?? 'player',
            };
          }
          if (ev.actor === 'player' && chapter) {
            sayBossLine(chapter.dialogue.onPlayerEvolve);
          }
          break;
        }
        case 'fusion': {
          soundEngine.fusion();
          raiseShake(3);
          const def = ev.cardId ? CARD_MAP[ev.cardId] : undefined;
          const fuseSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);
          if (fuseSlot && def) {
            newSummonBursts.push({
              id: `${ev.id}_fburst`,
              owner: fuseSlot.owner,
              slot: fuseSlot.slot,
              faction: def.faction,
              isAce: true,
            });
            newCanvasFx.push({
              id: `${ev.id}_frune`,
              kind: 'summon_rune',
              faction: def.faction,
              to: { kind: 'slot', owner: fuseSlot.owner, slot: fuseSlot.slot },
              intensity: 3,
            });
          }
          if (def) {
            const matFactions = (ev.secondaryCardIds ?? [])
              .map((mid) => CARD_MAP[mid]?.faction)
              .filter((f): f is Faction => Boolean(f));
            newCutIn = {
              id: ev.id,
              kind: 'fusion',
              title: 'RIFT FUSION!',
              subtitle: def.name,
              cardId: def.id,
              faction: def.faction,
              materialCardIds: ev.secondaryCardIds,
              materialFactions: matFactions,
              atk: def.atk,
              def: def.def,
              actor: ev.actor ?? 'player',
            };
          }
          if (ev.actor === 'player' && chapter) {
            sayBossLine(chapter.dialogue.onPlayerFusion);
          }
          break;
        }
        case 'ambush': {
          soundEngine.ambush();
          raiseShake(2);
          const def = ev.cardId ? CARD_MAP[ev.cardId] : undefined;
          if (def && !newCutIn) {
            newCutIn = {
              id: ev.id,
              kind: 'ambush',
              title: 'TRAP ACTIVATED!',
              subtitle: def.name,
              cardId: def.id,
              faction: def.faction,
              actor: ev.actor ?? 'opponent',
            };
          }
          break;
        }
        case 'attack': {
          const atkFaction = resolveUnitFaction(ev.sourceInstanceId, nextState, prevState);
          lastAttackFaction = atkFaction;
          soundEngine.elementalAttack(atkFaction);

          const srcSlot = resolveUnitSlot(ev.sourceInstanceId, nextState, prevState);
          const targetSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);

          if (ev.sourceInstanceId) {
            lunge = {
              id: ev.id,
              attackerId: ev.sourceInstanceId,
              targetId: ev.targetInstanceId,
              targetPlayer: ev.targetPlayer,
            };
          }

          const toAnchor: VfxAnchor = targetSlot
            ? { kind: 'slot', owner: targetSlot.owner, slot: targetSlot.slot }
            : ev.targetPlayer
            ? { kind: 'lp', owner: ev.targetPlayer }
            : { kind: 'center' };

          newCanvasFx.push({
            id: `${ev.id}_proj`,
            kind: 'projectile',
            faction: atkFaction,
            from: srcSlot
              ? { kind: 'slot', owner: srcSlot.owner, slot: srcSlot.slot }
              : { kind: 'center' },
            to: toAnchor,
            intensity: 2,
          });

          if (targetSlot) {
            newSlashes.push({
              id: `${ev.id}_slash`,
              targetSlot,
              kind: 'slash',
            });
          } else if (ev.targetPlayer) {
            newSlashes.push({
              id: `${ev.id}_slash`,
              targetPlayer: ev.targetPlayer,
              kind: 'slash',
            });
          }
          break;
        }
        case 'destroy': {
          const deadSlot = resolveUnitSlot(ev.targetInstanceId, nextState, prevState);
          const deadFaction = resolveUnitFaction(ev.targetInstanceId, nextState, prevState);
          soundEngine.elementalImpact(deadFaction, true);
          raiseShake(1);
          if (deadSlot) {
            newSlashes.push({
              id: `${ev.id}_shatter`,
              targetSlot: deadSlot,
              kind: 'shatter',
            });
            newCanvasFx.push({
              id: `${ev.id}_boom`,
              kind: 'explosion',
              faction: lastAttackFaction ?? deadFaction,
              to: { kind: 'slot', owner: deadSlot.owner, slot: deadSlot.slot },
              intensity: 2,
            });
          }
          break;
        }
        case 'damage_lp': {
          const amt = ev.amount ?? 0;
          const target = ev.targetPlayer ?? 'opponent';
          const isLethal = Boolean(nextState.winner && nextState.players[target].lp <= 0);
          const severity: DamageFlash['severity'] = isLethal
            ? 'lethal'
            : amt >= 2000
            ? 'critical'
            : amt >= 1000
            ? 'heavy'
            : 'light';

          if (isLethal) {
            hadLethalBlow = true;
            soundEngine.finalBlow();
            raiseShake(3);
            newCanvasFx.push({
              id: `${ev.id}_final`,
              kind: 'final_blow',
              faction: lastAttackFaction ?? 'pyroclast',
              to: { kind: 'lp', owner: target },
              intensity: 3,
            });
          } else {
            soundEngine.elementalImpact(lastAttackFaction ?? 'pyroclast', amt >= 1000);
            if (amt >= 2000) raiseShake(3);
            else if (amt >= 1000) raiseShake(2);
            else raiseShake(1);
            newCanvasFx.push({
              id: `${ev.id}_lphit`,
              kind: 'explosion',
              faction: lastAttackFaction ?? 'pyroclast',
              to: { kind: 'lp', owner: target },
              intensity: amt >= 1500 ? 2 : 1,
            });
          }

          newDamageFlash = {
            id: ev.id,
            target,
            amount: amt,
            severity,
          };

          newFloats.push({
            id: ev.id,
            targetPlayer: target,
            text: `-${amt} LP`,
            tone: 'damage',
          });
          break;
        }
        case 'heal_lp':
          if (ev.targetPlayer) {
            newCanvasFx.push({
              id: `${ev.id}_heal`,
              kind: 'heal_burst',
              faction: 'sylvan',
              to: { kind: 'lp', owner: ev.targetPlayer },
              intensity: 1,
            });
          }
          newFloats.push({
            id: ev.id,
            targetPlayer: ev.targetPlayer,
            text: `+${ev.amount} LP`,
            tone: 'heal',
          });
          break;
        case 'ward_break':
          soundEngine.shieldBlock();
          newFloats.push({
            id: ev.id,
            targetInstanceId: ev.targetInstanceId,
            text: 'WARD!',
            tone: 'info',
          });
          break;
        case 'freeze':
          soundEngine.elementalImpact('cryo_mecha', false);
          newFloats.push({
            id: ev.id,
            targetInstanceId: ev.targetInstanceId,
            text: 'FROZEN',
            tone: 'info',
          });
          break;
        case 'resonate':
          soundEngine.spellCast();
          break;
        default:
          break;
      }
    }

    // Dynamic Adaptive BGM tension escalation when either player enters Pinch LP (<= 2500)
    if (!nextState.winner) {
      const lowLp =
        nextState.players.player.lp <= 2500 || nextState.players.opponent.lp <= 2500;
      soundEngine.setBgmTension(lowLp ? 'climax' : 'normal');
    }

    if (
      chapter &&
      !get().bossLowLpTriggered &&
      nextState.players.opponent.lp > 0 &&
      nextState.players.opponent.lp <= Math.floor(nextState.players.opponent.maxLp * 0.45)
    ) {
      set({ bossLowLpTriggered: true });
      sayBossLine(chapter.dialogue.onBossLowLp);
    }

    if (nextState.winner && !get().rewardSummary) {
      const won = nextState.winner === 'player';
      const trapsTriggered = nextState.log.filter(
        (e) => e.type === 'ambush' && e.actor === 'player'
      ).length;
      const maxSingleHitDamage = nextState.log.reduce((max, e) => {
        if (e.type === 'damage_lp' && e.targetPlayer === 'opponent') {
          return Math.max(max, e.amount ?? 0);
        }
        return max;
      }, 0);

      const summary = useProfileStore.getState().recordDuelResult({
        won,
        chapterId: nextState.chapterId,
        fusionsPerformed: nextState.fusionsPerformed,
        evolutionsPerformed: nextState.evolutionsPerformed,
        trapsTriggered,
        maxSingleHitDamage,
      });

      if (hadLethalBlow) {
        // Give the Final Blow Supernova & LP rolling to 0 a dramatic beat before showing Victory/Defeat modal!
        set({ rewardSummary: summary, winnerModalReady: false });
        if (winnerModalTimer) clearTimeout(winnerModalTimer);
        winnerModalTimer = setTimeout(() => {
          if (won) soundEngine.victory();
          else soundEngine.defeat();
          set({ winnerModalReady: true });
        }, 1200);
      } else {
        if (won) soundEngine.victory();
        else soundEngine.defeat();
        set({ rewardSummary: summary, winnerModalReady: true });
      }
    }

    if (newFloats.length > 0) {
      set((s) => ({ floatingVfx: [...s.floatingVfx, ...newFloats] }));
      const ids = new Set(newFloats.map((f) => f.id));
      setTimeout(() => {
        set((s) => ({
          floatingVfx: s.floatingVfx.filter((f) => !ids.has(f.id)),
        }));
      }, 1350);
    }

    if (newSlashes.length > 0) {
      set((s) => ({ slashEffects: [...s.slashEffects, ...newSlashes] }));
      const ids = new Set(newSlashes.map((f) => f.id));
      setTimeout(() => {
        set((s) => ({
          slashEffects: s.slashEffects.filter((f) => !ids.has(f.id)),
        }));
      }, 650);
    }

    if (newCanvasFx.length > 0) {
      set((s) => ({ canvasFxQueue: [...s.canvasFxQueue, ...newCanvasFx] }));
      const ids = new Set(newCanvasFx.map((f) => f.id));
      setTimeout(() => {
        set((s) => ({
          canvasFxQueue: s.canvasFxQueue.filter((f) => !ids.has(f.id)),
        }));
      }, 1400);
    }

    if (newSummonBursts.length > 0) {
      set((s) => ({ summonBursts: [...s.summonBursts, ...newSummonBursts] }));
      const ids = new Set(newSummonBursts.map((f) => f.id));
      setTimeout(() => {
        set((s) => ({
          summonBursts: s.summonBursts.filter((f) => !ids.has(f.id)),
        }));
      }, 850);
    }

    if (newDamageFlash) {
      if (damageFlashTimer) clearTimeout(damageFlashTimer);
      const flashId = newDamageFlash.id;
      const dur = newDamageFlash.severity === 'lethal' ? 1250 : 620;
      set({ damageFlash: newDamageFlash });
      damageFlashTimer = setTimeout(() => {
        if (get().damageFlash?.id === flashId) {
          set({ damageFlash: null });
        }
      }, dur);
    }

    if (lunge) {
      set({ attackLunge: lunge });
      const lungeId = lunge.id;
      setTimeout(() => {
        if (get().attackLunge?.id === lungeId) {
          set({ attackLunge: null });
        }
      }, 420);
    }

    if (shakeIntensity > 0) {
      set((s) => ({
        screenShakeKey: s.screenShakeKey + 1,
        screenShakeIntensity: shakeIntensity as 1 | 2 | 3,
      }));
    }

    if (newCutIn && !hadLethalBlow) {
      if (cutInTimer) clearTimeout(cutInTimer);
      set({ cutIn: newCutIn });
      const baseDur =
        newCutIn.kind === 'fusion'
          ? 2450
          : newCutIn.kind === 'evolve'
          ? 1850
          : 1550;
      cutInTimer = setTimeout(() => {
        set({ cutIn: null });
      }, Math.round(baseDur * speedMult()));
    }

    if (newPhaseBanner && !nextState.winner) {
      showPhaseBanner(newPhaseBanner);
    }

    return Boolean(newCutIn && !hadLethalBlow);
  };

  const scheduleAiLoop = (delayMs = 700) => {
    if (aiTimer) clearTimeout(aiTimer);
    const current = get().duel;
    if (!current || current.winner || current.activePlayer !== 'opponent') {
      set({ aiThinking: false });
      return;
    }

    set({ aiThinking: true });
    aiTimer = setTimeout(() => {
      const s = get().duel;
      if (!s || s.winner || s.activePlayer !== 'opponent') {
        set({ aiThinking: false });
        return;
      }

      const action = decideNextAiAction(s, CARD_MAP);
      const trapMode = useProfileStore.getState().trapPromptMode ?? 'manual';

      if (trapMode === 'manual') {
        const prompt = inspectAiActionTrapPrompt(s, action, CARD_MAP);
        if (prompt) {
          soundEngine.trapPrompt();
          set({
            pendingTrapPrompt: { ...prompt, action },
            aiThinking: false,
          });
          return;
        }
      }

      if (action.kind === 'enter_battle') {
        soundEngine.turnSweep(false);
        showPhaseBanner({
          id: `opp_battle_${Date.now()}`,
          title: 'BATTLE PHASE!',
          subtitle: `${s.players.opponent.name.toUpperCase()} PREPARES TO STRIKE`,
          tone: 'battle',
        });
      }

      const next = applyAiAction(s, action, CARD_MAP);
      set({ duel: next });
      const hadCutIn = processEvents(next, s);

      if (!next.winner && next.activePlayer === 'opponent') {
        scheduleAiLoop(hadCutIn ? 1950 : action.kind === 'enter_battle' ? 680 : 720);
      } else {
        set({ aiThinking: false });
      }
    }, Math.round(delayMs * speedMult()));
  };

  return {
    duel: null,
    opponentPortrait: '/assets/portraits/boss_kael.jpg',
    bossDialogue: null,
    bossLowLpTriggered: false,
    selectedHandId: null,
    selectedAttackerId: null,
    pendingTribute: null,
    pendingTrapPrompt: null,
    inspectCard: null,
    riftModal: { open: false, mode: 'contact' },
    cutIn: null,
    phaseBanner: null,
    slashEffects: [],
    canvasFxQueue: [],
    damageFlash: null,
    summonBursts: [],
    floatingVfx: [],
    attackLunge: null,
    screenShakeKey: 0,
    screenShakeIntensity: 1,
    winnerModalReady: false,
    aiThinking: false,
    toast: null,
    rewardSummary: null,

    startDuel: (config, opponentPortrait) => {
      clearTimers();
      const profile = useProfileStore.getState();
      soundEngine.setEnabled(profile.soundEnabled);
      soundEngine.setBgmEnabled(profile.bgmEnabled ?? true);
      soundEngine.stopBgm();
      const initial = createDuel(config, CARD_MAP);
      set({
        duel: initial,
        opponentPortrait,
        bossDialogue: null,
        bossLowLpTriggered: false,
        selectedHandId: null,
        selectedAttackerId: null,
        pendingTribute: null,
        pendingTrapPrompt: null,
        inspectCard: initial.players.player.hand[0]
          ? { cardId: initial.players.player.hand[0].cardId, isEvolved: false }
          : null,
        riftModal: { open: false, mode: 'contact' },
        cutIn: null,
        phaseBanner: null,
        slashEffects: [],
        canvasFxQueue: [],
        damageFlash: null,
        summonBursts: [],
        floatingVfx: [],
        attackLunge: null,
        screenShakeIntensity: 1,
        winnerModalReady: false,
        aiThinking: false,
        toast: null,
        rewardSummary: null,
      });
    },

    exitDuel: () => {
      clearTimers();
      soundEngine.stopBgm();
      set({
        duel: null,
        selectedHandId: null,
        selectedAttackerId: null,
        pendingTribute: null,
        pendingTrapPrompt: null,
        cutIn: null,
        phaseBanner: null,
        slashEffects: [],
        canvasFxQueue: [],
        damageFlash: null,
        summonBursts: [],
        winnerModalReady: false,
        rewardSummary: null,
        aiThinking: false,
      });
    },

    confirmMulligan: (swapIds) => {
      const s = get().duel;
      if (!s) return;
      const res = submitMulligan(s, swapIds, CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Mulligan failed.');
        return;
      }
      soundEngine.startBgm('normal');
      set({ duel: res.state });
      processEvents(res.state, s);
    },

    selectHandCard: (instanceId) =>
      set({ selectedHandId: instanceId, selectedAttackerId: null, pendingTribute: null }),

    selectAttacker: (unitInstanceId) =>
      set({ selectedAttackerId: unitInstanceId, selectedHandId: null, pendingTribute: null }),

    startTributeSelection: (handInstanceId, cardId, required, summonMode) =>
      set({
        pendingTribute: { handInstanceId, cardId, required, summonMode, selectedIds: [] },
        selectedHandId: handInstanceId,
        selectedAttackerId: null,
      }),

    toggleTributeUnit: (unitInstanceId) => {
      const pt = get().pendingTribute;
      if (!pt) return;
      const exists = pt.selectedIds.includes(unitInstanceId);
      const nextSelected = exists
        ? pt.selectedIds.filter((id) => id !== unitInstanceId)
        : [...pt.selectedIds, unitInstanceId];

      if (nextSelected.length >= pt.required) {
        // Immediately complete the Tribute Summon!
        get().playSelectedCard(pt.handInstanceId, {
          summonMode: pt.summonMode,
          tributeInstanceIds: nextSelected.slice(0, pt.required),
        });
        set({ pendingTribute: null });
      } else {
        set({ pendingTribute: { ...pt, selectedIds: nextSelected } });
      }
    },

    cancelTribute: () => set({ pendingTribute: null }),

    resolveTrapPrompt: (activate) => {
      const prompt = get().pendingTrapPrompt;
      const s = get().duel;
      if (!prompt || !s) {
        set({ pendingTrapPrompt: null });
        return;
      }

      soundEngine.uiClick();
      set({ pendingTrapPrompt: null });

      const next = applyAiAction(
        s,
        prompt.action,
        CARD_MAP,
        activate ? undefined : 'player'
      );
      set({ duel: next });
      const hadCutIn = processEvents(next, s);

      if (!next.winner && next.activePlayer === 'opponent') {
        scheduleAiLoop(hadCutIn ? 1950 : prompt.action.kind === 'enter_battle' ? 680 : 720);
      } else {
        set({ aiThinking: false });
      }
    },

    setInspectCard: (cardId, isEvolved = false) =>
      set({ inspectCard: { cardId, isEvolved } }),

    openRiftModal: (mode, catalystHandId) => {
      soundEngine.uiClick();
      set({
        riftModal: { open: true, mode, catalystHandId },
        selectedHandId: null,
        selectedAttackerId: null,
        pendingTribute: null,
      });
    },

    closeRiftModal: () => set({ riftModal: { open: false, mode: 'contact' } }),
    dismissCutIn: () => set({ cutIn: null }),
    dismissPhaseBanner: () => set({ phaseBanner: null }),
    clearToast: () => set({ toast: null }),
    notifyToast: (msg) => showToast(msg),

    playSelectedCard: (handInstanceId, options = {}) => {
      const s = get().duel;
      if (!s) return false;
      const res = playCard(s, 'player', handInstanceId, options, CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Cannot play card.');
        return false;
      }
      set({
        duel: res.state,
        selectedHandId: null,
        selectedAttackerId: null,
        pendingTribute: null,
      });
      processEvents(res.state, s);
      return true;
    },

    triggerSoulBurn: (handInstanceId) => {
      const s = get().duel;
      if (!s) return false;
      const res = soulBurn(s, 'player', handInstanceId, CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Cannot use Soul Burn.');
        return false;
      }
      set({ duel: res.state, selectedHandId: null, pendingTribute: null });
      processEvents(res.state, s);
      return true;
    },

    triggerStanceToggle: (unitInstanceId) => {
      const s = get().duel;
      if (!s) return false;
      const res = toggleStance(s, 'player', unitInstanceId, CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Cannot change Battle Position.');
        return false;
      }
      soundEngine.shieldBlock();
      set({ duel: res.state, selectedAttackerId: null });
      processEvents(res.state, s);
      return true;
    },

    triggerEvolution: (unitInstanceId) => {
      const s = get().duel;
      if (!s) return false;
      const res = evolveUnit(s, 'player', unitInstanceId, CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Cannot Evolve this monster.');
        return false;
      }
      set({ duel: res.state, selectedAttackerId: null, selectedHandId: null });
      processEvents(res.state, s);
      return true;
    },

    triggerContactFusion: (fusionCardId, materials) => {
      const s = get().duel;
      if (!s) return false;
      const res = executeContactFusion(s, 'player', fusionCardId, materials, CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Contact Fusion failed.');
        return false;
      }
      set({
        duel: res.state,
        riftModal: { open: false, mode: 'contact' },
        selectedHandId: null,
        selectedAttackerId: null,
      });
      processEvents(res.state, s);
      return true;
    },

    triggerCatalystFusion: (catalystHandId, fusionCardId, materials) => {
      const s = get().duel;
      if (!s) return false;
      const res = playCard(
        s,
        'player',
        catalystHandId,
        { fusionCardId, fusionMaterials: materials },
        CARD_MAP
      );
      if (!res.ok) {
        showToast(res.error ?? 'Fusion Catalyst failed.');
        return false;
      }
      set({
        duel: res.state,
        riftModal: { open: false, mode: 'contact' },
        selectedHandId: null,
        selectedAttackerId: null,
      });
      processEvents(res.state, s);
      return true;
    },

    triggerAttack: (attackerId, target) => {
      const s = get().duel;
      if (!s) return false;
      const res = declareAttack(s, 'player', attackerId, target, CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Invalid attack.');
        return false;
      }
      set({ duel: res.state, selectedAttackerId: null, selectedHandId: null });
      processEvents(res.state, s);
      return true;
    },

    goToBattlePhase: () => {
      const s = get().duel;
      if (!s) return;
      const res = enterBattlePhase(s, 'player');
      if (!res.ok) {
        showToast(res.error ?? 'Cannot enter Battle Phase.');
        return;
      }
      soundEngine.turnSweep(true);
      set({ duel: res.state, selectedHandId: null, pendingTribute: null });
      showPhaseBanner({
        id: `player_battle_${Date.now()}`,
        title: 'BATTLE PHASE!',
        subtitle: 'SELECT YOUR VANGUARD TO STRIKE',
        tone: 'battle',
      });
    },

    finishPlayerTurn: () => {
      const s = get().duel;
      if (!s || s.activePlayer !== 'player' || s.winner) return;
      soundEngine.uiClick();
      const res = endTurn(s, 'player', CARD_MAP);
      if (!res.ok) {
        showToast(res.error ?? 'Cannot end turn.');
        return;
      }
      set({
        duel: res.state,
        selectedHandId: null,
        selectedAttackerId: null,
        pendingTribute: null,
      });
      processEvents(res.state, s);
      if (!res.state.winner && res.state.activePlayer === 'opponent') {
        scheduleAiLoop(1050);
      }
    },
  };
});
