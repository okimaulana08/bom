import type {
  AmbushTrigger,
  BoardUnit,
  CardDef,
  DuelState,
  MaterialChoice,
  PlayCardOptions,
  PlayerId,
} from '../engine/types';
import {
  canContactFuse,
  canEvolveUnit,
  canUnitAttack,
  declareAttack,
  endTurn,
  enterBattlePhase,
  evolveUnit,
  executeContactFusion,
  playCard,
  soulBurn,
  toggleStance,
} from '../engine/rules';
import {
  findFaceDownAmbush,
  findUnitById,
  findValidFusionCombos,
  getActiveUnits,
  getEffectiveAtk,
  getEffectiveDef,
  getFaceUpUnits,
  getFirstOpenArcaneSlot,
  getFirstOpenVanguardSlot,
  getRequiredTributes,
} from '../engine/utils';

export type AiAction =
  | { kind: 'contact_fusion'; fusionCardId: string; materials: MaterialChoice[] }
  | { kind: 'play_card'; handInstanceId: string; options: PlayCardOptions }
  | { kind: 'evolve'; unitInstanceId: string }
  | { kind: 'soul_burn'; handInstanceId: string }
  | { kind: 'toggle_stance'; unitInstanceId: string }
  | { kind: 'enter_battle' }
  | {
      kind: 'attack';
      attackerInstanceId: string;
      target: { kind: 'unit'; instanceId: string } | { kind: 'lp' };
    }
  | { kind: 'end_turn' };

function unitThreatScore(
  state: DuelState,
  unit: BoardUnit,
  registry: Record<string, CardDef>
): number {
  if (unit.faceDown) return 1400;
  const atk = getEffectiveAtk(state, unit, registry);
  const def = getEffectiveDef(state, unit, registry);
  let score = Math.max(atk, def * 0.85);
  if (unit.keywords.includes('Lethal')) score += 450;
  if (unit.keywords.includes('Drain')) score += 300;
  if (unit.keywords.includes('Pierce')) score += 250;
  if (unit.keywords.includes('Swift')) score += 400;
  if (unit.isEvolved) score += 350;
  return score;
}

function chooseCatalystFusion(
  state: DuelState,
  registry: Record<string, CardDef>,
  catalystInstanceId: string
): { fusionCardId: string; materials: MaterialChoice[] } | null {
  const opp = state.players.opponent;
  let best: { fusionCardId: string; materials: MaterialChoice[]; score: number } | null = null;

  for (const fusionId of opp.riftDeck) {
    const def = registry[fusionId];
    if (!def) continue;
    const combos = findValidFusionCombos(state, 'opponent', fusionId, true, registry).filter(
      (combo) => !combo.some((m) => m.instanceId === catalystInstanceId)
    );
    for (const combo of combos) {
      let score = (def.atk ?? 2500) + (def.def ?? 2000) * 0.4;
      for (const m of combo) {
        if (m.source === 'hand') score += 600;
        if (registry[m.cardId]?.keywords.includes('Resonate')) score += 500;
        if (m.source === 'field') {
          const u = opp.vanguard.find((v) => v?.instanceId === m.instanceId);
          if (u && (u.isEvolved || u.currentAtk >= 2400)) score -= 1400;
        }
      }
      if (!best || score > best.score) {
        best = { fusionCardId: fusionId, materials: combo, score };
      }
    }
  }
  return best && best.score >= 2200
    ? { fusionCardId: best.fusionCardId, materials: best.materials }
    : null;
}

function chooseContactFusion(
  state: DuelState,
  registry: Record<string, CardDef>
): { fusionCardId: string; materials: MaterialChoice[] } | null {
  const opp = state.players.opponent;
  let best: { fusionCardId: string; materials: MaterialChoice[]; score: number } | null = null;

  for (const fusionId of opp.riftDeck) {
    if (!canContactFuse(state, 'opponent', fusionId, registry)) continue;
    const def = registry[fusionId];
    const combos = findValidFusionCombos(state, 'opponent', fusionId, false, registry);
    for (const combo of combos) {
      const materialAtkSum = combo.reduce((sum, m) => {
        const u = opp.vanguard.find((v) => v?.instanceId === m.instanceId);
        return sum + (u ? u.currentAtk + (u.isEvolved ? 700 : 0) : 0);
      }, 0);
      const bossVal = (def.atk ?? 2600) + 900;
      let score = bossVal - materialAtkSum;
      for (const m of combo) {
        if (registry[m.cardId]?.keywords.includes('Resonate')) score += 450;
      }
      if (!best || score > best.score) {
        best = { fusionCardId: fusionId, materials: combo, score };
      }
    }
  }
  return best && best.score > 0
    ? { fusionCardId: best.fusionCardId, materials: best.materials }
    : null;
}

export function decideNextAiAction(
  state: DuelState,
  registry: Record<string, CardDef>
): AiAction {
  if (state.winner || state.activePlayer !== 'opponent') {
    return { kind: 'end_turn' };
  }

  const opp = state.players.opponent;
  const player = state.players.player;
  const isGrandmaster = state.aiDifficulty === 'grandmaster';
  const enemyUnits = getActiveUnits(state, 'player');
  const myUnits = getActiveUnits(state, 'opponent');
  const myFaceUp = getFaceUpUnits(state, 'opponent');

  // =================== MAIN PHASE DECISIONS ===================
  if (state.phase === 'main') {
    // 1. Immediate burn lethal check
    for (const hc of opp.hand) {
      const d = registry[hc.cardId];
      if (d?.type === 'arcana' && d.arcanaSubtype === 'instant') {
        const burn = d.onPlay?.find(
          (e) => e.kind === 'destroy_or_burn' || e.kind === 'damage_enemy_lp'
        );
        if (burn && (burn.amount ?? 0) >= player.lp) {
          return {
            kind: 'play_card',
            handInstanceId: hc.instanceId,
            options: { targetPlayer: 'player' },
          };
        }
      }
    }

    // 2. Fusion Catalyst Spell from Hand (Special Summon!)
    // On Initiate difficulty, hold back Fusions until AI's Turn 3+ so new players aren't OTK'd on Turn 2!
    if (isGrandmaster || opp.turnsTaken >= 3) {
      for (const hc of opp.hand) {
        const d = registry[hc.cardId];
        if (d?.arcanaSubtype === 'fusion_catalyst') {
          const chosen = chooseCatalystFusion(state, registry, hc.instanceId);
          if (chosen) {
            return {
              kind: 'play_card',
              handInstanceId: hc.instanceId,
              options: {
                fusionCardId: chosen.fusionCardId,
                fusionMaterials: chosen.materials,
              },
            };
          }
        }
      }

      // 3. Contact Fusion from Field (Special Summon!)
      const contact = chooseContactFusion(state, registry);
      if (contact) {
        return {
          kind: 'contact_fusion',
          fusionCardId: contact.fusionCardId,
          materials: contact.materials,
        };
      }
    }

    // 4. Evolution (Turn 3+ or Free Innate)
    if (!opp.evolvedThisTurn) {
      let bestEvo: { unitId: string; score: number } | null = null;
      for (const u of myFaceUp) {
        const check = canEvolveUnit(state, 'opponent', u.instanceId, registry);
        if (!check.eligible) continue;
        const d = registry[u.cardId];
        if (!d?.evolvedData) continue;
        let score =
          (d.evolvedData.atk - (d.atk ?? 0)) +
          (check.freeInnate ? 1200 : 0) +
          (d.rarity === 'mythic' ? 600 : 0);
        if (!isGrandmaster && !check.freeInnate && opp.evoOrbs === 1 && opp.turnsTaken < 5) {
          score -= 700;
        }
        if (!bestEvo || score > bestEvo.score) {
          bestEvo = { unitId: u.instanceId, score };
        }
      }
      if (bestEvo && bestEvo.score >= 700) {
        return { kind: 'evolve', unitInstanceId: bestEvo.unitId };
      }
    }

    // 5. Free Arcana Spells (Domains, Revival, Double Summon, Removal/Bounce/Freeze)
    const openVanguard = getFirstOpenVanguardSlot(state, 'opponent');
    const openArcane = getFirstOpenArcaneSlot(state, 'opponent');

    for (const hc of opp.hand) {
      const d = registry[hc.cardId];
      if (!d) continue;

      if (d.type === 'arcana' && d.arcanaSubtype === 'domain' && openArcane !== null) {
        const already = opp.arcane.some((a) => a?.cardId === d.id);
        if (!already) {
          return { kind: 'play_card', handInstanceId: hc.instanceId, options: { slot: openArcane } };
        }
      }

      if (d.type === 'arcana' && d.arcanaSubtype === 'instant') {
        const payLpEff = d.onPlay?.find((e) => e.kind === 'pay_lp');
        if (payLpEff) {
          const cost = payLpEff.amount ?? 500;
          if (opp.lp > cost + 500 && opp.hand.length <= 6 && opp.deck.length >= 2) {
            return { kind: 'play_card', handInstanceId: hc.instanceId, options: {} };
          }
          continue;
        }
        if (d.onPlay?.some((e) => e.kind === 'destroy_enemy_backrow')) {
          if (player.arcane.some((a) => a !== null)) {
            return { kind: 'play_card', handInstanceId: hc.instanceId, options: {} };
          }
          continue;
        }
        if (d.onPlay?.some((e) => e.kind === 'recover_void_to_hand')) {
          const hasVoidMonster = opp.voidPile.some((cid) => registry[cid]?.type === 'vanguard');
          if ((hasVoidMonster && opp.hand.length < 8) || opp.lp <= 1600) {
            return { kind: 'play_card', handInstanceId: hc.instanceId, options: {} };
          }
          continue;
        }
        if (d.onPlay?.some((e) => e.kind === 'destroy_all_enemies_atk_le')) {
          const wipeEff = d.onPlay.find((e) => e.kind === 'destroy_all_enemies_atk_le')!;
          const thresh = wipeEff.atkThreshold ?? 1800;
          const killable = enemyUnits.filter(
            (u) => u.faceDown || getEffectiveAtk(state, u, registry) <= thresh
          );
          if (killable.length >= 2 || (killable.length === 1 && enemyUnits.length >= 1)) {
            return { kind: 'play_card', handInstanceId: hc.instanceId, options: {} };
          }
          continue;
        }
        if (d.onPlay?.some((e) => e.kind === 'revive_vanguard')) {
          const hasVoidTarget = opp.voidPile.some((cid) => {
            const vd = registry[cid];
            return vd?.type === 'vanguard' && vd.level <= 6;
          });
          if (openVanguard !== null && hasVoidTarget) {
            return { kind: 'play_card', handInstanceId: hc.instanceId, options: {} };
          }
        } else if (d.onPlay?.some((e) => e.kind === 'extra_normal_summon')) {
          if (opp.hand.length < 8) {
            return { kind: 'play_card', handInstanceId: hc.instanceId, options: {} };
          }
        } else if (d.targetMode === 'friendly_unit') {
          if (myFaceUp.length > 0) {
            const host = [...myFaceUp].sort((a, b) => b.currentAtk - a.currentAtk)[0];
            return {
              kind: 'play_card',
              handInstanceId: hc.instanceId,
              options: { targetInstanceId: host.instanceId },
            };
          }
        } else if (d.targetMode === 'enemy_unit' || d.targetMode === 'enemy_or_face') {
          // On Initiate AI's very first turn, avoid nuking the player's only opening monster immediately
          if (!isGrandmaster && opp.turnsTaken === 1 && enemyUnits.length <= 1) {
            continue;
          }
          const sortedEnemies = [...enemyUnits].sort(
            (a, b) => unitThreatScore(state, b, registry) - unitThreatScore(state, a, registry)
          );
          const target =
            (isGrandmaster ? sortedEnemies.find((e) => !e.wardActive) : sortedEnemies[0]) ??
            sortedEnemies[0];
          if (target) {
            return {
              kind: 'play_card',
              handInstanceId: hc.instanceId,
              options: { targetInstanceId: target.instanceId },
            };
          } else if (d.targetMode === 'enemy_or_face') {
            return {
              kind: 'play_card',
              handInstanceId: hc.instanceId,
              options: { targetPlayer: 'player' },
            };
          }
        }
      }
    }

    // 6. Rush Duel Unlimited Normal Summon / Tribute Summon / Face-Down Defense Set
    // Initiate AI caps opening board to 2 monsters & skips Turn-2 Tributes so early turns feel fair!
    const initiateBoardCapHit = !isGrandmaster && opp.turnsTaken === 1 && myUnits.length >= 2;
    if (opp.normalSummonsLeft > 0 && !initiateBoardCapHit) {
      const playerMaxAtk = enemyUnits.reduce(
        (m, u) => Math.max(m, u.faceDown ? 1300 : getEffectiveAtk(state, u, registry)),
        0
      );

      let bestSummon: {
        handInstanceId: string;
        options: PlayCardOptions;
        score: number;
      } | null = null;

      // Sort friendly units ascending by value for potential Tributes (Resonate preferred!)
      const tribPool = [...myUnits].sort((a, b) => {
        const resA = registry[a.cardId]?.keywords.includes('Resonate') ? -600 : 0;
        const resB = registry[b.cardId]?.keywords.includes('Resonate') ? -600 : 0;
        return a.currentAtk + resA - (b.currentAtk + resB);
      });

      for (const hc of opp.hand) {
        const d = registry[hc.cardId];
        if (!d || d.type !== 'vanguard') continue;
        const reqTribs = getRequiredTributes(d);

        if (reqTribs === 0) {
          if (openVanguard === null) continue;
          const atk = d.atk ?? 1000;
          const def = d.def ?? 1000;
          const preferSet =
            (def >= atk + 400 && (Boolean(d.onFlip?.length) || opp.bossModifier === 'cryo_guard_armor')) ||
            (playerMaxAtk > atk && def > atk);
          let score = Math.max(atk, def);
          if (d.onSummon?.some((e) => e.kind === 'extra_normal_summon')) score += 500;
          if (d.onSummon?.some((e) => e.kind === 'draw')) score += 450;
          if (d.onSummon?.some((e) => e.kind === 'freeze_unit') && enemyUnits.length > 0)
            score += 450;
          if (!bestSummon || score > bestSummon.score) {
            bestSummon = {
              handInstanceId: hc.instanceId,
              options: {
                slot: openVanguard,
                summonMode: preferSet ? 'defense' : 'attack',
              },
              score,
            };
          }
        } else if (tribPool.length >= reqTribs && (isGrandmaster || opp.turnsTaken >= 2)) {
          const picked = tribPool.slice(0, reqTribs);
          const sacrificedAtk = Math.max(...picked.map((u) => u.currentAtk));
          const bossAtk = d.atk ?? 2200;
          // Only Tribute Summon when meaningfully upgrading board presence!
          if (bossAtk >= sacrificedAtk + 400) {
            const score = bossAtk + 600 - sacrificedAtk * 0.4;
            if (!bestSummon || score > bestSummon.score) {
              bestSummon = {
                handInstanceId: hc.instanceId,
                options: {
                  summonMode: 'attack',
                  tributeInstanceIds: picked.map((u) => u.instanceId),
                },
                score,
              };
            }
          }
        }
      }

      if (bestSummon) {
        return {
          kind: 'play_card',
          handInstanceId: bestSummon.handInstanceId,
          options: bestSummon.options,
        };
      }
    }

    // 7. Soul Burn (Rush Duel: Discard 1 -> Draw 1 + Resonate!) — Grandmaster AI hand cycling
    if (isGrandmaster && !opp.soulBurnUsedThisTurn && opp.hand.length >= 2 && opp.deck.length >= 4) {
      const discardOrder = opp.hand
        .map((hc) => {
          const d = registry[hc.cardId]!;
          let val = 0;
          if (d.keywords.includes('Resonate')) val += 10;
          if (d.type === 'vanguard' && d.level >= 7 && myUnits.length < 2) val += 6;
          if (d.rarity === 'mythic' || d.arcanaSubtype === 'fusion_catalyst') val -= 8;
          return { hc, val };
        })
        .sort((a, b) => b.val - a.val);

      if (discardOrder[0] && discardOrder[0].val >= 6) {
        return { kind: 'soul_burn', handInstanceId: discardOrder[0].hc.instanceId };
      }
    }

    // 8. Equip Relics to strongest face-up Attack monster
    for (const hc of opp.hand) {
      const d = registry[hc.cardId];
      if (d?.type === 'relic' && myFaceUp.length > 0) {
        const host = [...myFaceUp].sort((a, b) => b.currentAtk - a.currentAtk)[0];
        return {
          kind: 'play_card',
          handInstanceId: hc.instanceId,
          options: { targetInstanceId: host.instanceId },
        };
      }
    }

    // 9. Set Face-Down Ambush Traps
    if (openArcane !== null) {
      const trap = opp.hand.find((hc) => registry[hc.cardId]?.type === 'ambush');
      if (trap) {
        return { kind: 'play_card', handInstanceId: trap.instanceId, options: { slot: openArcane } };
      }
    }

    // 10. Position changes for monsters from previous turns
    const playerBestAtk = enemyUnits.reduce(
      (m, u) => Math.max(m, u.faceDown ? 1200 : getEffectiveAtk(state, u, registry)),
      0
    );
    for (const u of myUnits) {
      if (
        u.summonedTurn === opp.turnsTaken ||
        u.hasChangedPositionThisTurn ||
        u.attacksThisTurn > 0 ||
        u.frozenTurns > 0
      ) {
        continue;
      }
      const effAtk = getEffectiveAtk(state, u, registry);
      const effDef = getEffectiveDef(state, u, registry);
      if (u.faceDown && (enemyUnits.length === 0 || effAtk > playerBestAtk || Boolean(registry[u.cardId]?.onFlip?.length))) {
        return { kind: 'toggle_stance', unitInstanceId: u.instanceId };
      }
      if (!u.faceDown && u.stance === 'defense' && (enemyUnits.length === 0 || effAtk > playerBestAtk)) {
        return { kind: 'toggle_stance', unitInstanceId: u.instanceId };
      }
      if (!u.faceDown && u.stance === 'attack' && playerBestAtk > effAtk && effDef >= playerBestAtk) {
        return { kind: 'toggle_stance', unitInstanceId: u.instanceId };
      }
    }

    // Enter Battle Phase if allowed (turn > 1) and any unit can attack!
    if (state.turnNumber > 1) {
      const anyCanAttack = myUnits.some((u) => {
        const c = canUnitAttack(state, u, registry);
        return c.canAttackUnits || c.canAttackLp;
      });
      if (anyCanAttack) {
        return { kind: 'enter_battle' };
      }
    }

    return { kind: 'end_turn' };
  }

  // =================== BATTLE PHASE DECISIONS ===================
  if (state.phase === 'battle') {
    const attackers = myUnits.filter((u) => {
      const c = canUnitAttack(state, u, registry);
      return c.canAttackUnits || c.canAttackLp;
    });
    if (attackers.length === 0) {
      return { kind: 'end_turn' };
    }

    const playerHasFaceDownTrap = player.arcane.some((a) => a?.kind === 'ambush' && a.faceDown);
    const ordered = [...attackers].sort((a, b) => {
      const sa = getEffectiveAtk(state, a, registry);
      const sb = getEffectiveAtk(state, b, registry);
      return isGrandmaster && playerHasFaceDownTrap ? sa - sb : sb - sa;
    });

    for (const attacker of ordered) {
      const chk = canUnitAttack(state, attacker, registry);
      const myAtk = getEffectiveAtk(state, attacker, registry);

      if (chk.canAttackLp) {
        return {
          kind: 'attack',
          attackerInstanceId: attacker.instanceId,
          target: { kind: 'lp' },
        };
      }

      if (chk.canAttackUnits) {
        let bestTarget: { id: string; score: number } | null = null;
        for (const e of enemyUnits) {
          let score = -1000;
          if (e.faceDown) {
            // Attack face-down defense cautiously if ATK >= 1500 or Lethal
            score = myAtk >= 1500 || attacker.keywords.includes('Lethal') ? 700 + myAtk * 0.2 : -200;
          } else if (e.stance === 'attack') {
            const eAtk = getEffectiveAtk(state, e, registry);
            if (myAtk > eAtk) {
              score = 1200 + (myAtk - eAtk) + eAtk * 0.4;
            } else if (myAtk === eAtk && eAtk >= 2000) {
              score = 350;
            } else if (attacker.keywords.includes('Lethal') && eAtk > myAtk + 400) {
              score = 600;
            }
          } else {
            const eDef = getEffectiveDef(state, e, registry);
            if (myAtk > eDef) {
              score = 950 + (attacker.keywords.includes('Pierce') ? myAtk - eDef : 0);
            } else if (attacker.keywords.includes('Lethal') && eDef >= 2000) {
              score = 400;
            }
          }
          if (!bestTarget || score > bestTarget.score) {
            bestTarget = { id: e.instanceId, score };
          }
        }
        if (bestTarget && bestTarget.score > 0) {
          return {
            kind: 'attack',
            attackerInstanceId: attacker.instanceId,
            target: { kind: 'unit', instanceId: bestTarget.id },
          };
        }
      }
    }

    return { kind: 'end_turn' };
  }

  return { kind: 'end_turn' };
}

export interface TrapPromptInfo {
  trapCardId: string;
  trigger: AmbushTrigger;
  rivalCardId?: string;
  headline: string;
  detail: string;
}

/**
 * Checks whether the upcoming AI action would trigger a player's armed face-down Ambush Trap.
 * Used in Manual Trap Mode to pause and ask the player: "ACTIVATE TRAP CARD?" vs "HOLD".
 */
export function inspectAiActionTrapPrompt(
  state: DuelState,
  action: AiAction,
  registry: Record<string, CardDef>
): TrapPromptInfo | null {
  const opp = state.players.opponent;

  if (action.kind === 'attack') {
    const trap = findFaceDownAmbush(state, 'player', 'on_attack', registry);
    if (!trap) return null;
    const atkFound = findUnitById(state, action.attackerInstanceId);
    const atkUnit = atkFound?.unit;
    const atkDef = atkUnit ? registry[atkUnit.cardId] : undefined;
    const atkName =
      atkUnit?.isEvolved && atkDef?.evolvedData
        ? atkDef.evolvedData.name
        : atkDef?.name ?? 'Enemy Monster';
    const atkVal = atkUnit ? getEffectiveAtk(state, atkUnit, registry) : 0;

    return {
      trapCardId: trap.cardId,
      trigger: 'on_attack',
      rivalCardId: atkUnit?.cardId,
      headline: `${opp.name} Declares an Attack!`,
      detail:
        action.target.kind === 'lp'
          ? `${atkName} (${atkVal} ATK) is launching a DIRECT ATTACK on your LP!`
          : `${atkName} (${atkVal} ATK) is attacking your monster!`,
    };
  }

  if (action.kind === 'evolve') {
    const trap = findFaceDownAmbush(state, 'player', 'on_evolve', registry);
    if (!trap) return null;
    const found = findUnitById(state, action.unitInstanceId);
    const def = found ? registry[found.unit.cardId] : undefined;
    return {
      trapCardId: trap.cardId,
      trigger: 'on_evolve',
      rivalCardId: found?.unit.cardId,
      headline: `${opp.name} Triggers Evolution!`,
      detail: `${def?.name ?? 'Monster'} is ascending into ${def?.evolvedData?.name ?? 'its Awakened Form'}!`,
    };
  }

  if (action.kind === 'contact_fusion') {
    const trap = findFaceDownAmbush(state, 'player', 'on_summon', registry);
    if (!trap) return null;
    const fDef = registry[action.fusionCardId];
    return {
      trapCardId: trap.cardId,
      trigger: 'on_summon',
      rivalCardId: action.fusionCardId,
      headline: `${opp.name} Fusion Summons!`,
      detail: `${fDef?.name ?? 'Fusion Apex'} (${fDef?.atk ?? 2500} ATK) is descending onto the field!`,
    };
  }

  if (action.kind === 'play_card') {
    const hc = opp.hand.find((h) => h.instanceId === action.handInstanceId);
    const def = hc ? registry[hc.cardId] : undefined;
    if (!def) return null;

    if (def.type === 'vanguard' && action.options.summonMode !== 'defense') {
      const trap = findFaceDownAmbush(state, 'player', 'on_summon', registry);
      if (!trap) return null;
      return {
        trapCardId: trap.cardId,
        trigger: 'on_summon',
        rivalCardId: def.id,
        headline: `${opp.name} Summons a Monster!`,
        detail: `${def.name} (${def.atk} ATK / ${def.def} DEF) is entering in Attack Position!`,
      };
    }

    if (def.type === 'arcana' || def.type === 'relic') {
      const spellTrap = findFaceDownAmbush(state, 'player', 'on_spell', registry);
      if (spellTrap) {
        return {
          trapCardId: spellTrap.cardId,
          trigger: 'on_spell',
          rivalCardId: def.id,
          headline: `${opp.name} Activates an Arcana Spell!`,
          detail: `${def.name}: ${def.effectText}`,
        };
      }
      if (def.arcanaSubtype === 'fusion_catalyst' && action.options.fusionCardId) {
        const summonTrap = findFaceDownAmbush(state, 'player', 'on_summon', registry);
        if (summonTrap) {
          const fDef = registry[action.options.fusionCardId];
          return {
            trapCardId: summonTrap.cardId,
            trigger: 'on_summon',
            rivalCardId: action.options.fusionCardId,
            headline: `${opp.name} Fusion Summons via ${def.name}!`,
            detail: `${fDef?.name ?? 'Fusion Apex'} (${fDef?.atk ?? 2500} ATK) is descending onto the field!`,
          };
        }
      }
      return null;
    }
  }

  return null;
}

export function applyAiAction(
  state: DuelState,
  action: AiAction,
  registry: Record<string, CardDef>,
  skipAmbushFor?: PlayerId
): DuelState {
  switch (action.kind) {
    case 'contact_fusion':
      return executeContactFusion(
        state,
        'opponent',
        action.fusionCardId,
        action.materials,
        registry,
        skipAmbushFor
      ).state;
    case 'play_card':
      return playCard(
        state,
        'opponent',
        action.handInstanceId,
        action.options,
        registry,
        skipAmbushFor
      ).state;
    case 'evolve':
      return evolveUnit(state, 'opponent', action.unitInstanceId, registry, skipAmbushFor).state;
    case 'soul_burn':
      return soulBurn(state, 'opponent', action.handInstanceId, registry).state;
    case 'toggle_stance':
      return toggleStance(state, 'opponent', action.unitInstanceId, registry).state;
    case 'enter_battle':
      return enterBattlePhase(state, 'opponent').state;
    case 'attack':
      return declareAttack(
        state,
        'opponent',
        action.attackerInstanceId,
        action.target,
        registry,
        skipAmbushFor
      ).state;
    case 'end_turn':
      return endTurn(state, 'opponent', registry).state;
  }
}
