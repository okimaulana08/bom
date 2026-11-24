import type {
  AmbushTrigger,
  BoardUnit,
  CardDef,
  CardEffect,
  DuelState,
  PlayerId,
  Stance,
} from './types';
import {
  findFaceDownAmbush,
  findUnitById,
  getActiveUnits,
  getDomainBonuses,
  getEffectiveAtk,
  getEnemy,
  getFaceUpUnits,
  getFirstOpenVanguardSlot,
  nextId,
  pushEvent,
} from './utils';

export interface EffectContext {
  sourceOwner: PlayerId;
  sourceUnitId?: string;
  targetUnitId?: string;
  targetPlayer?: PlayerId;
  attackerUnitId?: string;
  voidCardId?: string;
  isSpellDamage?: boolean;
}

export interface AmbushResolution {
  triggered: boolean;
  ambushCardId?: string;
  attackNegated?: boolean;
  spellCountered?: boolean;
}

export function checkWinnerInPlace(state: DuelState): void {
  if (state.winner) return;
  const pLp = state.players.player.lp;
  const oLp = state.players.opponent.lp;
  if (oLp <= 0 && pLp <= 0) {
    state.winner = state.activePlayer;
    state.phase = 'game_over';
    state.winReason = 'Simultaneous LP collapse — active duelist prevails!';
    pushEvent(state, 'game_over', state.winReason, { actor: state.winner });
  } else if (oLp <= 0) {
    state.winner = 'player';
    state.phase = 'game_over';
    state.winReason = `${state.players.opponent.name} reached 0 LP!`;
    pushEvent(state, 'game_over', state.winReason, { actor: 'player' });
  } else if (pLp <= 0) {
    state.winner = 'opponent';
    state.phase = 'game_over';
    state.winReason = `${state.players.player.name} reached 0 LP!`;
    pushEvent(state, 'game_over', state.winReason, { actor: 'opponent' });
  }
}

export function drawCardsInPlace(
  state: DuelState,
  owner: PlayerId,
  count: number,
  registry: Record<string, CardDef>,
  allowPartial = false
): void {
  const player = state.players[owner];
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      // Rush Draw partial safety: if deck ran out mid-refill after drawing >=1 card, stop cleanly!
      if (allowPartial && i > 0) {
        return;
      }
      // Deck-out LP collapse (Yu-Gi-Oh! rule)
      player.lp = 0;
      pushEvent(
        state,
        'damage_lp',
        `${player.name} cannot draw — Deck Out!`,
        { actor: owner, targetPlayer: owner, amount: player.maxLp }
      );
      checkWinnerInPlace(state);
      return;
    }
    const cardId = player.deck.shift()!;
    if (player.hand.length >= 9) {
      player.voidPile.push(cardId);
      const def = registry[cardId];
      pushEvent(
        state,
        'draw',
        `${player.name}'s hand is full — ${def?.name ?? cardId} overflows into the Void.`,
        { actor: owner, cardId }
      );
      continue;
    }
    const hc = { instanceId: nextId(state, 'hc'), cardId };
    player.hand.push(hc);
    pushEvent(state, 'draw', `${player.name} draws a card.`, {
      actor: owner,
      cardId: owner === 'player' ? cardId : undefined,
    });
  }
}

export function createBoardUnit(
  state: DuelState,
  owner: PlayerId,
  cardDef: CardDef,
  slot: 0 | 1 | 2,
  stance: Stance = 'attack',
  faceDown = false
): BoardUnit {
  const atk = cardDef.atk ?? 1000;
  const def = cardDef.def ?? 1000;
  const keywords = [...cardDef.keywords];
  return {
    instanceId: nextId(state, 'unit'),
    cardId: cardDef.id,
    owner,
    slot,
    stance,
    faceDown,
    isEvolved: false,
    currentAtk: atk,
    currentDef: def,
    keywords,
    wardActive: keywords.includes('Ward'),
    frozenTurns: 0,
    attacksThisTurn: 0,
    maxAttacksThisTurn: keywords.includes('Swift') ? 2 : 1,
    hasChangedPositionThisTurn: false,
    summonedTurn: state.players[owner].turnsTaken,
    evolvedTurn: null,
    killsThisMatch: 0,
    survivedTurns: 0,
    wonDefenseThisMatch: false,
    attachedRelics: [],
    innateEvolveReady: false,
  };
}

export function flipUnitFaceUpInPlace(
  state: DuelState,
  unit: BoardUnit,
  registry: Record<string, CardDef>
): void {
  if (!unit.faceDown) return;
  unit.faceDown = false;
  const def = registry[unit.cardId];
  pushEvent(
    state,
    'flip',
    `${def?.name ?? unit.cardId} flips face-up (${unit.currentAtk}/${unit.currentDef})!`,
    {
      actor: unit.owner,
      cardId: unit.cardId,
      targetInstanceId: unit.instanceId,
    }
  );
  if (def?.onFlip?.length) {
    resolveEffectsInPlace(
      state,
      def.onFlip,
      { sourceOwner: unit.owner, sourceUnitId: unit.instanceId },
      registry
    );
  }
}

export function consumeWardIfEnemyEffect(
  state: DuelState,
  unit: BoardUnit,
  effectOwner: PlayerId,
  registry: Record<string, CardDef>
): boolean {
  if (!unit.faceDown && unit.owner !== effectOwner && unit.wardActive) {
    unit.wardActive = false;
    const def = registry[unit.cardId];
    const name = unit.isEvolved && def?.evolvedData ? def.evolvedData.name : def?.name ?? unit.cardId;
    pushEvent(state, 'ward_break', `${name}'s Ward negated the enemy effect!`, {
      actor: unit.owner,
      cardId: unit.cardId,
      targetInstanceId: unit.instanceId,
    });
    return true;
  }
  return false;
}

export function destroyUnitInPlace(
  state: DuelState,
  unit: BoardUnit,
  registry: Record<string, CardDef>,
  reason?: string
): void {
  const ownerState = state.players[unit.owner];
  if (ownerState.vanguard[unit.slot]?.instanceId !== unit.instanceId) return;

  ownerState.vanguard[unit.slot] = null;
  const def = registry[unit.cardId];
  if (!def?.isToken) {
    ownerState.voidPile.push(unit.cardId);
  }
  for (const relicId of unit.attachedRelics) {
    ownerState.voidPile.push(relicId);
  }

  // Maximum Mode rule: all 3 linked segments share one unified Titan body — destroying any piece sends all 3 to Void!
  if (unit.isMaximumMode && unit.maximumSetId) {
    for (let s = 0; s < 3; s++) {
      const sibling = ownerState.vanguard[s];
      if (sibling && sibling.isMaximumMode && sibling.maximumSetId === unit.maximumSetId) {
        ownerState.vanguard[s] = null;
        ownerState.voidPile.push(sibling.cardId);
        for (const rId of sibling.attachedRelics) {
          ownerState.voidPile.push(rId);
        }
      }
    }
  }

  const displayName =
    unit.isEvolved && def?.evolvedData ? def.evolvedData.name : def?.name ?? unit.cardId;
  pushEvent(
    state,
    'destroy',
    reason ?? `${displayName} is destroyed and sent to the Void!`,
    {
      actor: unit.owner,
      cardId: unit.cardId,
      targetInstanceId: unit.instanceId,
    }
  );

  if (def?.onDeath && def.onDeath.length > 0) {
    resolveEffectsInPlace(
      state,
      def.onDeath,
      { sourceOwner: unit.owner, sourceUnitId: unit.instanceId },
      registry
    );
  }
}

export function damageLpInPlace(
  state: DuelState,
  targetPlayer: PlayerId,
  amount: number,
  sourceOwner: PlayerId,
  label?: string
): number {
  if (amount <= 0) return 0;
  const target = state.players[targetPlayer];
  target.lp = Math.max(0, target.lp - amount);
  pushEvent(
    state,
    'damage_lp',
    label ?? `${target.name} takes ${amount} LP damage!`,
    {
      actor: sourceOwner,
      targetPlayer,
      amount,
    }
  );
  checkWinnerInPlace(state);
  return amount;
}

export function healLpInPlace(
  state: DuelState,
  targetPlayer: PlayerId,
  amount: number
): number {
  if (amount <= 0) return 0;
  const target = state.players[targetPlayer];
  target.lp = Math.min(target.maxLp + 2000, target.lp + amount);
  pushEvent(state, 'heal_lp', `${target.name} restores +${amount} LP.`, {
    actor: targetPlayer,
    targetPlayer,
    amount,
  });
  return amount;
}

export function triggerResonateInPlace(
  state: DuelState,
  owner: PlayerId,
  cardId: string,
  registry: Record<string, CardDef>
): void {
  const def = registry[cardId];
  if (!def || !def.keywords.includes('Resonate') || !def.onResonate?.length) return;
  pushEvent(state, 'resonate', `${def.name}'s Resonate echoes from the Void!`, {
    actor: owner,
    cardId,
  });
  resolveEffectsInPlace(state, def.onResonate, { sourceOwner: owner }, registry);
}

export function triggerAmbushInPlace(
  state: DuelState,
  defender: PlayerId,
  trigger: AmbushTrigger,
  context: Partial<EffectContext>,
  registry: Record<string, CardDef>,
  skipAmbushFor?: PlayerId
): AmbushResolution {
  if (skipAmbushFor === defender) return { triggered: false };
  const ambush = findFaceDownAmbush(state, defender, trigger, registry);
  if (!ambush) return { triggered: false };

  const def = registry[ambush.cardId];
  if (!def) return { triggered: false };

  state.players[defender].arcane[ambush.slot] = null;
  state.players[defender].voidPile.push(ambush.cardId);

  pushEvent(
    state,
    'ambush',
    `TRAP ACTIVATED! ${state.players[defender].name}'s ${def.name} springs!`,
    {
      actor: defender,
      cardId: ambush.cardId,
      targetInstanceId: context.targetUnitId ?? context.attackerUnitId,
    }
  );

  const res: AmbushResolution = {
    triggered: true,
    ambushCardId: ambush.cardId,
    attackNegated: false,
    spellCountered: false,
  };

  for (const eff of def.ambushEffects ?? []) {
    if (eff.kind === 'negate_attack') {
      res.attackNegated = true;
      pushEvent(state, 'ambush', `${def.name} negates the attack!`, {
        actor: defender,
        cardId: ambush.cardId,
      });
    } else if (eff.kind === 'counter_spell') {
      res.spellCountered = true;
      pushEvent(state, 'ambush', `${def.name} negates and destroys the Arcana spell!`, {
        actor: defender,
        cardId: ambush.cardId,
      });
    } else if (eff.kind === 'destroy_attacker') {
      const targetId = context.attackerUnitId ?? context.targetUnitId;
      if (targetId) {
        const found = findUnitById(state, targetId);
        if (found && !consumeWardIfEnemyEffect(state, found.unit, defender, registry)) {
          destroyUnitInPlace(state, found.unit, registry, `${def.name} destroys the attacker!`);
          res.attackNegated = true;
        }
      }
    } else if (eff.kind === 'debuff_attacker') {
      const targetId = context.attackerUnitId ?? context.targetUnitId;
      if (targetId) {
        const found = findUnitById(state, targetId);
        if (found && !consumeWardIfEnemyEffect(state, found.unit, defender, registry)) {
          const atkDrop = eff.atkDelta !== undefined ? Math.abs(eff.atkDelta) : (eff.amount ?? 700);
          const defDrop = eff.defDelta !== undefined ? Math.abs(eff.defDelta) : 0;
          found.unit.currentAtk = Math.max(0, found.unit.currentAtk - atkDrop);
          if (defDrop > 0) {
            found.unit.currentDef = Math.max(0, found.unit.currentDef - defDrop);
          }
          pushEvent(
            state,
            'ambush',
            `${def.name} drains ${atkDrop} ATK${defDrop > 0 ? ` / ${defDrop} DEF` : ''} from the attacker!`,
            { actor: defender, targetInstanceId: found.unit.instanceId }
          );
        }
      }
    } else if (eff.kind === 'reflect_attacker_atk') {
      res.attackNegated = true;
      const targetId = context.attackerUnitId ?? context.targetUnitId;
      if (targetId) {
        const found = findUnitById(state, targetId);
        if (found) {
          const atkVal = getEffectiveAtk(state, found.unit, registry);
          const cap = eff.amount ?? 2200;
          const reflected = Math.min(cap, Math.max(0, atkVal));
          const attackerOwner = found.owner;
          pushEvent(
            state,
            'ambush',
            `${def.name} negates the attack and mirrors ${reflected} ATK back!`,
            {
              actor: defender,
              cardId: ambush.cardId,
              targetInstanceId: found.unit.instanceId,
            }
          );
          damageLpInPlace(
            state,
            attackerOwner,
            reflected,
            defender,
            `${def.name} reflects ${reflected} LP damage back at ${state.players[attackerOwner].name}!`
          );
        }
      }
    } else if (eff.kind === 'destroy_all_enemy_attackers') {
      res.attackNegated = true;
      const attackersOwner = getEnemy(defender);
      const atkUnits = getActiveUnits(state, attackersOwner).filter(
        (u) => !u.faceDown && u.stance === 'attack'
      );
      pushEvent(
        state,
        'ambush',
        `${def.name} erupts — negating the assault and engulfing all Attack Position foes!`,
        { actor: defender, cardId: ambush.cardId }
      );
      for (const u of atkUnits) {
        if (!consumeWardIfEnemyEffect(state, u, defender, registry)) {
          destroyUnitInPlace(
            state,
            u,
            registry,
            `${def.name} incinerates ${registry[u.cardId]?.name ?? 'enemy monster'}!`
          );
        }
      }
    } else {
      resolveEffectsInPlace(
        state,
        [eff],
        {
          sourceOwner: defender,
          targetUnitId: context.targetUnitId ?? context.attackerUnitId,
          attackerUnitId: context.attackerUnitId,
        },
        registry
      );
    }
  }

  return res;
}

export function resolveEffectsInPlace(
  state: DuelState,
  effects: CardEffect[],
  ctx: EffectContext,
  registry: Record<string, CardDef>
): void {
  const owner = ctx.sourceOwner;
  const enemy = getEnemy(owner);
  const spellBonus = ctx.isSpellDamage
    ? getDomainBonuses(state, owner, registry).spellBurnBonus
    : 0;

  for (const eff of effects) {
    if (state.winner) return;

    switch (eff.kind) {
      case 'damage_enemy_lp': {
        const amt = (eff.amount ?? 500) + spellBonus;
        damageLpInPlace(state, enemy, amt, owner);
        break;
      }

      case 'destroy_or_burn': {
        if (ctx.targetUnitId) {
          const found = findUnitById(state, ctx.targetUnitId);
          if (found) {
            if (!consumeWardIfEnemyEffect(state, found.unit, owner, registry)) {
              const threshold = eff.atkThreshold ?? 9999;
              const effAtk = getEffectiveAtk(state, found.unit, registry);
              if (found.unit.faceDown || effAtk <= threshold) {
                destroyUnitInPlace(state, found.unit, registry);
              } else {
                found.unit.currentAtk = Math.max(0, found.unit.currentAtk - (eff.amount ?? 800));
                pushEvent(
                  state,
                  'spell',
                  `Searing blast strips -${eff.amount ?? 800} ATK!`,
                  { actor: owner, targetInstanceId: found.unit.instanceId }
                );
              }
            }
            break;
          }
        }
        damageLpInPlace(state, ctx.targetPlayer ?? enemy, (eff.amount ?? 800) + spellBonus, owner);
        break;
      }

      case 'destroy_unit': {
        let target = ctx.targetUnitId ? findUnitById(state, ctx.targetUnitId)?.unit : undefined;
        if (!target) {
          const enemies = getActiveUnits(state, enemy);
          enemies.sort(
            (a, b) => getEffectiveAtk(state, b, registry) - getEffectiveAtk(state, a, registry)
          );
          target = enemies[0];
        }
        if (target && !consumeWardIfEnemyEffect(state, target, owner, registry)) {
          destroyUnitInPlace(state, target, registry);
        }
        break;
      }

      case 'destroy_unit_if_atk_le': {
        let target = ctx.targetUnitId ? findUnitById(state, ctx.targetUnitId)?.unit : undefined;
        if (!target) {
          const enemies = getActiveUnits(state, enemy);
          enemies.sort(
            (a, b) => getEffectiveAtk(state, b, registry) - getEffectiveAtk(state, a, registry)
          );
          target = enemies[0];
        }
        if (target && !consumeWardIfEnemyEffect(state, target, owner, registry)) {
          const threshold = eff.atkThreshold ?? 2000;
          if (target.faceDown || getEffectiveAtk(state, target, registry) <= threshold) {
            destroyUnitInPlace(state, target, registry);
          } else {
            target.currentAtk = Math.max(0, target.currentAtk - 800);
            pushEvent(state, 'spell', `Target resisted destruction but lost -800 ATK!`, {
              actor: owner,
              targetInstanceId: target.instanceId,
            });
          }
        }
        break;
      }

      case 'destroy_all_enemies': {
        for (const u of [...getActiveUnits(state, enemy)]) {
          if (!consumeWardIfEnemyEffect(state, u, owner, registry)) {
            destroyUnitInPlace(state, u, registry);
          }
        }
        break;
      }

      case 'destroy_all_enemies_atk_le': {
        const threshold = eff.atkThreshold ?? 1800;
        const survivorDrop = eff.atkDelta !== undefined ? Math.abs(eff.atkDelta) : 500;
        for (const u of [...getActiveUnits(state, enemy)]) {
          if (consumeWardIfEnemyEffect(state, u, owner, registry)) continue;
          if (u.faceDown || getEffectiveAtk(state, u, registry) <= threshold) {
            destroyUnitInPlace(state, u, registry);
          } else {
            u.currentAtk = Math.max(0, u.currentAtk - survivorDrop);
            pushEvent(
              state,
              'spell',
              `Shockwave scorches surviving monster for -${survivorDrop} ATK!`,
              { actor: owner, targetInstanceId: u.instanceId }
            );
          }
        }
        break;
      }

      case 'destroy_enemy_backrow': {
        const oppArcane = state.players[enemy].arcane;
        let destroyed = 0;
        for (let i = 0; i < oppArcane.length; i++) {
          const back = oppArcane[i];
          if (!back) continue;
          oppArcane[i] = null;
          state.players[enemy].voidPile.push(back.cardId);
          destroyed++;
          const bDef = registry[back.cardId];
          pushEvent(
            state,
            'destroy',
            `${bDef?.name ?? 'Backrow card'} in the enemy Arcane Zone is shattered into the Void!`,
            { actor: owner, cardId: back.cardId }
          );
        }
        if (destroyed === 0) {
          pushEvent(state, 'spell', `No enemy Spell, Trap, or Domain cards to shatter.`, {
            actor: owner,
          });
        } else if ((eff.amount ?? 0) > 0) {
          drawCardsInPlace(state, owner, eff.amount!, registry);
        }
        break;
      }

      case 'pay_lp': {
        const cost = eff.amount ?? 500;
        damageLpInPlace(
          state,
          owner,
          cost,
          owner,
          `${state.players[owner].name} sacrifices ${cost} LP!`
        );
        break;
      }

      case 'recover_void_to_hand': {
        const voidPile = state.players[owner].voidPile;
        let pickIdx = -1;
        if (ctx.voidCardId) {
          pickIdx = voidPile.findIndex(
            (cid) => cid === ctx.voidCardId && registry[cid]?.type === 'vanguard'
          );
        }
        if (pickIdx === -1) {
          let bestAtk = -1;
          voidPile.forEach((cid, idx) => {
            const d = registry[cid];
            if (d?.type === 'vanguard' && (d.atk ?? 0) > bestAtk) {
              bestAtk = d.atk ?? 0;
              pickIdx = idx;
            }
          });
        }
        if (pickIdx !== -1) {
          const [recoveredId] = voidPile.splice(pickIdx, 1);
          const def = registry[recoveredId];
          if (state.players[owner].hand.length < 9) {
            state.players[owner].hand.push({
              instanceId: nextId(state, 'hc'),
              cardId: recoveredId,
            });
            pushEvent(
              state,
              'spell',
              `${state.players[owner].name} reclaims ${def?.name ?? recoveredId} from the Void to Hand!`,
              { actor: owner, cardId: recoveredId }
            );
          } else {
            voidPile.push(recoveredId);
            pushEvent(
              state,
              'spell',
              `${state.players[owner].name}'s hand is full — cannot reclaim ${def?.name ?? recoveredId}.`,
              { actor: owner }
            );
          }
        } else {
          pushEvent(state, 'spell', `No Monster in the Void to reclaim.`, { actor: owner });
        }
        break;
      }

      case 'debuff_unit': {
        let target = ctx.targetUnitId ? findUnitById(state, ctx.targetUnitId)?.unit : undefined;
        if (!target) {
          const enemies = getFaceUpUnits(state, enemy);
          enemies.sort((a, b) => b.currentAtk - a.currentAtk);
          target = enemies[0];
        }
        if (target && !consumeWardIfEnemyEffect(state, target, owner, registry)) {
          const atkD = eff.atkDelta ?? -600;
          const defD = eff.defDelta ?? -600;
          target.currentAtk = Math.max(0, target.currentAtk + atkD);
          target.currentDef = Math.max(0, target.currentDef + defD);
          pushEvent(state, 'spell', `Enemy monster loses ${Math.abs(atkD)} ATK!`, {
            actor: owner,
            targetInstanceId: target.instanceId,
          });
        }
        break;
      }

      case 'debuff_all_enemies': {
        const atkD = eff.atkDelta ?? -500;
        const defD = eff.defDelta ?? -500;
        for (const u of getActiveUnits(state, enemy)) {
          if (consumeWardIfEnemyEffect(state, u, owner, registry)) continue;
          u.currentAtk = Math.max(0, u.currentAtk + atkD);
          u.currentDef = Math.max(0, u.currentDef + defD);
        }
        pushEvent(
          state,
          'spell',
          `Shockwave weakens all enemy monsters by ${Math.abs(atkD)} ATK/DEF!`,
          { actor: owner }
        );
        break;
      }

      case 'heal_lp': {
        healLpInPlace(state, owner, eff.amount ?? 600);
        break;
      }

      case 'draw': {
        drawCardsInPlace(state, owner, eff.amount ?? 1, registry);
        break;
      }

      case 'buff_unit': {
        let target = ctx.targetUnitId ? findUnitById(state, ctx.targetUnitId)?.unit : undefined;
        if (!target && ctx.sourceUnitId) {
          target = findUnitById(state, ctx.sourceUnitId)?.unit;
        }
        if (!target) target = getFaceUpUnits(state, owner)[0];
        if (target) {
          const atkD = eff.atkDelta ?? 400;
          const defD = eff.defDelta ?? 400;
          target.currentAtk = Math.max(0, target.currentAtk + atkD);
          target.currentDef = Math.max(0, target.currentDef + defD);
          if (eff.keyword) {
            if (!target.keywords.includes(eff.keyword)) {
              target.keywords.push(eff.keyword);
            }
            if (eff.keyword === 'Ward') target.wardActive = true;
            if (eff.keyword === 'Swift') target.maxAttacksThisTurn = Math.max(target.maxAttacksThisTurn, 2);
          }
          const def = registry[target.cardId];
          pushEvent(
            state,
            'spell',
            `${def?.name ?? 'Monster'} surges +${atkD} ATK / +${defD} DEF!`,
            { actor: owner, targetInstanceId: target.instanceId }
          );
        }
        break;
      }

      case 'buff_all_friendly': {
        const atkD = eff.atkDelta ?? 400;
        const defD = eff.defDelta ?? 400;
        for (const u of getFaceUpUnits(state, owner)) {
          u.currentAtk = Math.max(0, u.currentAtk + atkD);
          u.currentDef = Math.max(0, u.currentDef + defD);
          if (eff.keyword && !u.keywords.includes(eff.keyword)) {
            u.keywords.push(eff.keyword);
            if (eff.keyword === 'Ward') u.wardActive = true;
          }
        }
        pushEvent(
          state,
          'spell',
          `All face-up friendly monsters gain +${atkD} ATK / +${defD} DEF!`,
          { actor: owner }
        );
        break;
      }

      case 'freeze_unit': {
        let target = ctx.targetUnitId ? findUnitById(state, ctx.targetUnitId)?.unit : undefined;
        if (!target) {
          const enemies = getActiveUnits(state, enemy).filter((u) => u.frozenTurns === 0);
          enemies.sort((a, b) => b.currentAtk - a.currentAtk);
          target = enemies[0];
        }
        if (target && !consumeWardIfEnemyEffect(state, target, owner, registry)) {
          target.frozenTurns = Math.max(target.frozenTurns, eff.amount ?? 1);
          const def = registry[target.cardId];
          pushEvent(state, 'freeze', `${target.faceDown ? 'Set Monster' : def?.name ?? 'Unit'} is Frozen!`, {
            actor: owner,
            targetInstanceId: target.instanceId,
          });
        }
        break;
      }

      case 'freeze_all_enemies': {
        for (const u of getActiveUnits(state, enemy)) {
          if (!consumeWardIfEnemyEffect(state, u, owner, registry)) {
            u.frozenTurns = Math.max(u.frozenTurns, eff.amount ?? 1);
          }
        }
        pushEvent(state, 'freeze', `Glacial surge freezes all enemy monsters!`, { actor: owner });
        break;
      }

      case 'bounce_unit': {
        let target = ctx.targetUnitId ? findUnitById(state, ctx.targetUnitId)?.unit : undefined;
        if (!target) {
          const enemies = getActiveUnits(state, enemy);
          enemies.sort((a, b) => b.currentAtk - a.currentAtk);
          target = enemies[0];
        }
        if (target && !consumeWardIfEnemyEffect(state, target, owner, registry)) {
          const tOwner = state.players[target.owner];
          tOwner.vanguard[target.slot] = null;
          for (const relicId of target.attachedRelics) {
            tOwner.voidPile.push(relicId);
          }
          const def = registry[target.cardId];
          if (def?.type === 'fusion_apex') {
            tOwner.riftDeck.push(target.cardId);
          } else if (!def?.isToken && tOwner.hand.length < 9) {
            tOwner.hand.push({ instanceId: nextId(state, 'hc'), cardId: target.cardId });
          } else if (!def?.isToken) {
            tOwner.voidPile.push(target.cardId);
          }
          pushEvent(
            state,
            'bounce',
            `${target.faceDown ? 'Set Monster' : def?.name ?? 'Monster'} returns to ${
              def?.type === 'fusion_apex' ? 'the Rift Deck' : "its owner's hand"
            }!`,
            { actor: owner, cardId: target.cardId, targetInstanceId: target.instanceId }
          );
        }
        break;
      }

      case 'revive_vanguard': {
        const slot = getFirstOpenVanguardSlot(state, owner);
        if (slot === null) break;
        const voidPile = state.players[owner].voidPile;
        const maxLv = eff.maxLevel ?? 8;
        let pickIdx = -1;
        if (ctx.voidCardId) {
          pickIdx = voidPile.findIndex((cid) => {
            const d = registry[cid];
            return cid === ctx.voidCardId && d?.type === 'vanguard' && d.level <= maxLv;
          });
        }
        if (pickIdx === -1) {
          let bestAtk = -1;
          voidPile.forEach((cid, idx) => {
            const d = registry[cid];
            if (d?.type === 'vanguard' && d.level <= maxLv && (d.atk ?? 0) > bestAtk) {
              bestAtk = d.atk ?? 0;
              pickIdx = idx;
            }
          });
        }
        if (pickIdx !== -1) {
          const [revivedId] = voidPile.splice(pickIdx, 1);
          const def = registry[revivedId];
          if (def) {
            const unit = createBoardUnit(state, owner, def, slot, 'attack', false);
            if (eff.keyword && !unit.keywords.includes(eff.keyword)) {
              unit.keywords.push(eff.keyword);
              if (eff.keyword === 'Swift') unit.maxAttacksThisTurn = 2;
            }
            state.players[owner].vanguard[slot] = unit;
            pushEvent(
              state,
              'summon',
              `Special Summon! ${def.name} (${def.atk}/${def.def}) rises from the Void!`,
              { actor: owner, cardId: revivedId, targetInstanceId: unit.instanceId }
            );
          }
        }
        break;
      }

      case 'extra_normal_summon': {
        // In Rush Duel (Unlimited Summons), Rush Surge effects draw bonus cards for momentum!
        const amt = eff.amount ?? 1;
        pushEvent(
          state,
          'spell',
          `Rush Surge! ${state.players[owner].name} draws +${amt} bonus card${amt > 1 ? 's' : ''}!`,
          { actor: owner, amount: amt }
        );
        drawCardsInPlace(state, owner, amt, registry, true);
        break;
      }

      case 'grant_keyword': {
        if (!eff.keyword) break;
        const target =
          (ctx.targetUnitId ? findUnitById(state, ctx.targetUnitId)?.unit : undefined) ??
          (ctx.sourceUnitId ? findUnitById(state, ctx.sourceUnitId)?.unit : undefined);
        if (target && !target.keywords.includes(eff.keyword)) {
          target.keywords.push(eff.keyword);
          if (eff.keyword === 'Ward') target.wardActive = true;
          if (eff.keyword === 'Swift') target.maxAttacksThisTurn = Math.max(target.maxAttacksThisTurn, 2);
        }
        break;
      }

      case 'gain_evo_orb': {
        const p = state.players[owner];
        p.evoOrbs += eff.amount ?? 1;
        p.maxEvoOrbs = Math.max(p.maxEvoOrbs, p.evoOrbs);
        pushEvent(state, 'spell', `${p.name} crystallizes +${eff.amount ?? 1} Evo Orb!`, {
          actor: owner,
        });
        break;
      }

      default:
        break;
    }
  }
}
