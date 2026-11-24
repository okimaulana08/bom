import type {
  BacklineCard,
  BoardUnit,
  CardDef,
  DuelConfig,
  DuelState,
  DuelistSkillId,
  EngineResult,
  MaterialChoice,
  PlayCardOptions,
  PlayerDuelState,
  PlayerId,
  SpireBlessingId,
} from './types';
import {
  checkWinnerInPlace,
  createBoardUnit,
  damageLpInPlace,
  destroyUnitInPlace,
  drawCardsInPlace,
  flipUnitFaceUpInPlace,
  healLpInPlace,
  resolveEffectsInPlace,
  triggerAmbushInPlace,
  triggerResonateInPlace,
} from './effects';
import {
  cloneDuelState,
  findUnitById,
  findValidFusionCombos,
  getActiveUnits,
  getDomainBonuses,
  getEffectiveAtk,
  getEffectiveDef,
  getEnemy,
  getFirstOpenArcaneSlot,
  getFirstOpenVanguardSlot,
  getRequiredTributes,
  nextId,
  nextRandom,
  pushEvent,
  shuffleArray,
  validateFusionMaterials,
} from './utils';

export const DEFAULT_LP = 8000;
export const RUSH_UNLIMITED_SUMMONS = 99;
export const RUSH_DRAW_HAND_TARGET = 5;

function createPlayerState(
  id: PlayerId,
  name: string,
  deck: string[],
  riftDeck: string[],
  startLp: number,
  startEvoOrbs: number,
  bossModifier: PlayerDuelState['bossModifier'],
  skillId: DuelistSkillId | null = null,
  blessings: SpireBlessingId[] = []
): PlayerDuelState {
  return {
    id,
    name,
    lp: startLp,
    maxLp: startLp,
    normalSummonsLeft: RUSH_UNLIMITED_SUMMONS,
    evoOrbs: startEvoOrbs,
    maxEvoOrbs: startEvoOrbs,
    evolvedThisTurn: false,
    soulBurnUsedThisTurn: false,
    turnsTaken: 0,
    deck: [...deck],
    hand: [],
    riftDeck: [...riftDeck],
    vanguard: [null, null, null],
    arcane: [null, null],
    voidPile: [],
    mulliganDone: false,
    bossModifier,
    skillId,
    skillUsed: false,
    blessings: [...blessings],
  };
}

export function createDuel(
  config: DuelConfig,
  registry: Record<string, CardDef>
): DuelState {
  const seed = config.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const bossMod = config.bossModifier ?? 'none';
  const playerBlessings = config.playerBlessings ?? [];

  const basePlayerLp = config.playerStartLp ?? DEFAULT_LP;
  const bonusPlayerLp =
    config.playerStartLp === undefined && playerBlessings.includes('blessing_iron_aegis')
      ? 1000
      : 0;
  const startPlayerOrbs = 2 + (playerBlessings.includes('blessing_evo_mastery') ? 1 : 0);

  const oppLp =
    config.opponentStartLp ?? (bossMod === 'chrono_archon_boss' ? 10000 : DEFAULT_LP);
  const oppOrbs =
    config.opponentStartEvoOrbs ?? (bossMod === 'chrono_archon_boss' ? 3 : 2);

  const state: DuelState = {
    turnNumber: 0,
    activePlayer: 'player',
    phase: 'mulligan',
    winner: null,
    winReason: null,
    players: {
      player: createPlayerState(
        'player',
        config.playerName,
        config.playerDeck,
        config.playerRiftDeck,
        basePlayerLp + bonusPlayerLp,
        startPlayerOrbs,
        'none',
        config.playerSkillId ?? null,
        playerBlessings
      ),
      opponent: createPlayerState(
        'opponent',
        config.opponentName,
        config.opponentDeck,
        config.opponentRiftDeck,
        oppLp,
        oppOrbs,
        bossMod,
        null,
        []
      ),
    },
    log: [],
    recentEvents: [],
    nextUid: 1,
    rngState: seed || 1337,
    chapterId: config.chapterId ?? null,
    spireFloor: config.spireFloor ?? null,
    aiDifficulty: config.aiDifficulty ?? 'initiate',
    fusionsPerformed: 0,
    evolutionsPerformed: 0,
    maximumsPerformed: 0,
  };

  state.players.player.deck = shuffleArray(state, state.players.player.deck);
  state.players.opponent.deck = shuffleArray(state, state.players.opponent.deck);

  const playerOpeningDraw = playerBlessings.includes('blessing_rush_draw') ? 6 : 5;
  drawCardsInPlace(state, 'player', playerOpeningDraw, registry);
  drawCardsInPlace(state, 'opponent', 5, registry);

  // Apply Rift Spire Player Blessings (Opening Board / Hand Relics)
  if (playerBlessings.includes('blessing_fusion_spark') && registry['chrono_polymerization']) {
    if (state.players.player.hand.length < 9) {
      state.players.player.hand.push({
        instanceId: nextId(state, 'hc'),
        cardId: 'chrono_polymerization',
      });
    }
  }
  if (playerBlessings.includes('blessing_trap_ambush')) {
    const trapPool = ['cryo_mirror_wall', 'chrono_aether_reflector', 'umbra_shadow_snare'].filter(
      (id) => Boolean(registry[id])
    );
    if (trapPool.length > 0) {
      const picked = trapPool[Math.floor(nextRandom(state) * trapPool.length)];
      state.players.player.arcane[0] = {
        instanceId: nextId(state, 'arc'),
        cardId: picked,
        owner: 'player',
        slot: 0,
        kind: 'ambush',
        faceDown: true,
        setTurn: 0,
      };
    }
  }

  // Boss Modifiers
  if (bossMod === 'pyro_hatchling_start') {
    const hatchling = registry['pyro_hatchling'];
    if (hatchling) {
      const unit = createBoardUnit(state, 'opponent', hatchling, 1, 'defense', false);
      unit.summonedTurn = 0;
      state.players.opponent.vanguard[1] = unit;
      pushEvent(
        state,
        'boss_modifier',
        `Boss Rule — Cinder Vanguard: ${config.opponentName} starts with Pyroclast Hatchling in Defense Position (900 DEF)!`,
        { actor: 'opponent', cardId: hatchling.id }
      );
    }
  } else if (bossMod === 'umbra_ambush_start') {
    const ambushPool = ['umbra_shadow_snare', 'umbra_void_counter'].filter((id) =>
      Boolean(registry[id])
    );
    if (ambushPool.length > 0) {
      const chosenId = ambushPool[Math.floor(nextRandom(state) * ambushPool.length)];
      const trap: BacklineCard = {
        instanceId: nextId(state, 'arc'),
        cardId: chosenId,
        owner: 'opponent',
        slot: 0,
        kind: 'ambush',
        faceDown: true,
        setTurn: 0,
      };
      state.players.opponent.arcane[0] = trap;
      pushEvent(
        state,
        'boss_modifier',
        `Boss Rule — Shadow Prep: ${config.opponentName} begins with a hidden Ambush Trap set!`,
        { actor: 'opponent' }
      );
    }
  } else if (bossMod === 'cryo_guard_armor') {
    pushEvent(
      state,
      'boss_modifier',
      `Boss Rule — Aegis Protocol: All of ${config.opponentName}'s Defense Position monsters gain +300 DEF.`,
      { actor: 'opponent' }
    );
  } else if (bossMod === 'sylvan_turn2_ramp') {
    pushEvent(
      state,
      'boss_modifier',
      `Boss Rule — Verdant Surge: ${config.opponentName} gains +1 Evo Orb and draws +1 bonus card on Turn 2.`,
      { actor: 'opponent' }
    );
  } else if (bossMod === 'chrono_archon_boss') {
    pushEvent(
      state,
      'boss_modifier',
      `Boss Rule — Sovereign of Time: ${config.opponentName} begins with 10000 LP and 3 Evo Orbs!`,
      { actor: 'opponent' }
    );
  }

  state.recentEvents = [];
  return state;
}

function startTurnInPlace(
  state: DuelState,
  owner: PlayerId,
  registry: Record<string, CardDef>
): void {
  if (state.winner) return;

  state.activePlayer = owner;
  state.phase = 'draw';
  state.turnNumber += 1;

  const p = state.players[owner];
  p.turnsTaken += 1;
  p.normalSummonsLeft = RUSH_UNLIMITED_SUMMONS;
  p.evolvedThisTurn = false;
  p.soulBurnUsedThisTurn = false;

  // Chapter 4 Boss Modifier: Sylvan +1 Evo Orb & bonus draw on Turn 2
  if (p.bossModifier === 'sylvan_turn2_ramp' && p.turnsTaken === 2) {
    p.evoOrbs += 1;
    p.maxEvoOrbs = Math.max(p.maxEvoOrbs, p.evoOrbs);
    pushEvent(
      state,
      'boss_modifier',
      `Verdant Surge activates! ${p.name} crystallizes +1 Evo Orb and draws a bonus card!`,
      { actor: owner }
    );
    drawCardsInPlace(state, owner, 1, registry, true);
  }

  // Refresh friendly monsters
  for (const unit of p.vanguard) {
    if (!unit) continue;
    unit.attacksThisTurn = 0;
    unit.maxAttacksThisTurn = unit.keywords.includes('Swift') ? 2 : 1;
    unit.hasChangedPositionThisTurn = false;
    if (unit.frozenTurns > 0) {
      unit.frozenTurns = Math.max(0, unit.frozenTurns - 1);
    }
    unit.survivedTurns += 1;
    const def = registry[unit.cardId];
    if (
      !unit.faceDown &&
      !unit.isEvolved &&
      def?.evolvedData?.innateCondition?.type === 'survive_turn' &&
      unit.survivedTurns >= 1
    ) {
      unit.innateEvolveReady = true;
    }
  }

  pushEvent(
    state,
    'turn_start',
    `Turn ${state.turnNumber} — ${p.name}'s Turn${
      state.turnNumber === 1 ? ' (No Battle Phase on Turn 1)' : ''
    }${p.turnsTaken === 3 ? ' • EVO ORBS UNLOCKED!' : ''}`,
    { actor: owner }
  );

  // Official Yu-Gi-Oh! Rush Duel Draw Rule:
  // Turn 1 starts with 5 cards (skips draw); every subsequent turn draws until 5 cards in hand (min 1 if already >=5)!
  if (state.turnNumber > 1) {
    const rushDrawCount = Math.max(1, RUSH_DRAW_HAND_TARGET - p.hand.length);
    drawCardsInPlace(state, owner, rushDrawCount, registry, true);
    if (p.blessings.includes('blessing_rush_draw')) {
      healLpInPlace(state, owner, 400);
    }
  }

  if (!state.winner) {
    state.phase = 'main';
  }
}

export function submitMulligan(
  prevState: DuelState,
  swapInstanceIds: string[],
  registry: Record<string, CardDef>
): EngineResult {
  if (prevState.phase !== 'mulligan') {
    return { state: prevState, ok: false, error: 'Mulligan phase already finished.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];

  const p = state.players.player;
  const swapSet = new Set(swapInstanceIds);
  const returned: string[] = [];
  p.hand = p.hand.filter((hc) => {
    if (swapSet.has(hc.instanceId)) {
      returned.push(hc.cardId);
      return false;
    }
    return true;
  });
  if (returned.length > 0) {
    p.deck.push(...returned);
    p.deck = shuffleArray(state, p.deck);
    drawCardsInPlace(state, 'player', returned.length, registry);
  }
  p.mulliganDone = true;

  // AI smart mulligan: redraw high-level Tribute bricks (Lv >= 5) if holding > 1
  const o = state.players.opponent;
  const aiReturned: string[] = [];
  o.hand = o.hand.filter((hc) => {
    const def = registry[hc.cardId];
    if (def && def.type === 'vanguard' && def.level >= 5) {
      aiReturned.push(hc.cardId);
      return false;
    }
    return true;
  });
  if (aiReturned.length > 0) {
    o.deck.push(...aiReturned);
    o.deck = shuffleArray(state, o.deck);
    drawCardsInPlace(state, 'opponent', aiReturned.length, registry);
  }
  o.mulliganDone = true;

  startTurnInPlace(state, 'player', registry);
  return { state, ok: true };
}

function executeFusionInPlace(
  state: DuelState,
  owner: PlayerId,
  fusionCardId: string,
  materials: MaterialChoice[],
  registry: Record<string, CardDef>,
  preferredSlot?: number,
  skipAmbushFor?: PlayerId
): { ok: boolean; error?: string } {
  const player = state.players[owner];
  const enemy = getEnemy(owner);
  const riftIdx = player.riftDeck.indexOf(fusionCardId);
  if (riftIdx === -1) {
    return { ok: false, error: 'Fusion Apex is not in your Rift Deck.' };
  }
  const fusionDef = registry[fusionCardId];
  if (!fusionDef || fusionDef.type !== 'fusion_apex') {
    return { ok: false, error: 'Invalid Fusion Apex card.' };
  }
  if (!validateFusionMaterials(fusionDef, materials, registry)) {
    return { ok: false, error: 'Selected materials do not satisfy the Fusion recipe.' };
  }

  for (const m of materials) {
    if (m.source === 'field') {
      const found = findUnitById(state, m.instanceId);
      if (!found || found.owner !== owner || found.unit.cardId !== m.cardId) {
        return { ok: false, error: 'A selected field material is no longer available.' };
      }
    } else {
      const hasHand = player.hand.some(
        (h) => h.instanceId === m.instanceId && h.cardId === m.cardId
      );
      if (!hasHand) {
        return { ok: false, error: 'A selected hand material is no longer available.' };
      }
    }
  }

  let freedSlot: (0 | 1 | 2) | null = null;
  const materialCardIds: string[] = [];

  for (const m of materials) {
    materialCardIds.push(m.cardId);
    if (m.source === 'field') {
      const found = findUnitById(state, m.instanceId);
      if (found) {
        if (freedSlot === null) freedSlot = found.slot;
        player.vanguard[found.slot] = null;
        const mDef = registry[found.unit.cardId];
        if (!mDef?.isToken) player.voidPile.push(found.unit.cardId);
        for (const relicId of found.unit.attachedRelics) {
          player.voidPile.push(relicId);
        }
      }
    } else {
      const idx = player.hand.findIndex((h) => h.instanceId === m.instanceId);
      if (idx !== -1) {
        player.hand.splice(idx, 1);
        player.voidPile.push(m.cardId);
      }
    }
  }

  const targetSlot =
    preferredSlot !== undefined &&
    preferredSlot >= 0 &&
    preferredSlot <= 2 &&
    player.vanguard[preferredSlot] === null
      ? (preferredSlot as 0 | 1 | 2)
      : freedSlot ?? getFirstOpenVanguardSlot(state, owner);

  if (targetSlot === null) {
    return { ok: false, error: 'No Monster Zone available for Fusion Apex.' };
  }

  player.riftDeck.splice(riftIdx, 1);
  const apexUnit = createBoardUnit(state, owner, fusionDef, targetSlot, 'attack', false);
  player.vanguard[targetSlot] = apexUnit;

  if (owner === 'player') {
    state.fusionsPerformed += 1;
  }

  pushEvent(
    state,
    'fusion',
    `RIFT FUSION! ${player.name} Special Summons ${fusionDef.name} (${fusionDef.atk}/${fusionDef.def})!`,
    {
      actor: owner,
      cardId: fusionDef.id,
      secondaryCardIds: materialCardIds,
      targetInstanceId: apexUnit.instanceId,
    }
  );

  for (const mId of materialCardIds) {
    triggerResonateInPlace(state, owner, mId, registry);
  }

  triggerAmbushInPlace(
    state,
    enemy,
    'on_summon',
    { targetUnitId: apexUnit.instanceId },
    registry,
    skipAmbushFor
  );

  const stillAlive = findUnitById(state, apexUnit.instanceId);
  if (stillAlive && fusionDef.onSummon?.length) {
    resolveEffectsInPlace(
      state,
      fusionDef.onSummon,
      { sourceOwner: owner, sourceUnitId: apexUnit.instanceId },
      registry
    );
  }

  checkWinnerInPlace(state);
  return { ok: true };
}

export function canContactFuse(
  state: DuelState,
  owner: PlayerId,
  fusionCardId: string,
  registry: Record<string, CardDef>
): boolean {
  if (state.winner || state.activePlayer !== owner || state.phase !== 'main') {
    return false;
  }
  const p = state.players[owner];
  if (!p.riftDeck.includes(fusionCardId)) return false;
  const def = registry[fusionCardId];
  if (!def || def.type !== 'fusion_apex') return false;
  return findValidFusionCombos(state, owner, fusionCardId, false, registry).length > 0;
}

export function executeContactFusion(
  prevState: DuelState,
  owner: PlayerId,
  fusionCardId: string,
  materials: MaterialChoice[],
  registry: Record<string, CardDef>,
  skipAmbushFor?: PlayerId
): EngineResult {
  if (prevState.winner || prevState.activePlayer !== owner || prevState.phase !== 'main') {
    return { state: prevState, ok: false, error: 'Contact Fusion is only allowed during Main Phase.' };
  }
  if (materials.some((m) => m.source !== 'field')) {
    return { state: prevState, ok: false, error: 'Contact Fusion requires materials on your Field.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];

  const res = executeFusionInPlace(
    state,
    owner,
    fusionCardId,
    materials,
    registry,
    undefined,
    skipAmbushFor
  );
  if (!res.ok) {
    return { state: prevState, ok: false, error: res.error };
  }
  return { state, ok: true };
}

export function playCard(
  prevState: DuelState,
  owner: PlayerId,
  handInstanceId: string,
  options: PlayCardOptions,
  registry: Record<string, CardDef>,
  skipAmbushFor?: PlayerId
): EngineResult {
  if (prevState.winner) {
    return { state: prevState, ok: false, error: 'Duel has already ended.' };
  }
  if (prevState.activePlayer !== owner || prevState.phase !== 'main') {
    return { state: prevState, ok: false, error: 'Cards can only be played during your Main Phase.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  const player = state.players[owner];
  const enemy = getEnemy(owner);

  const handIdx = player.hand.findIndex((h) => h.instanceId === handInstanceId);
  if (handIdx === -1) {
    return { state: prevState, ok: false, error: 'Card not found in hand.' };
  }
  const handCard = player.hand[handIdx];
  const def = registry[handCard.cardId];
  if (!def) {
    return { state: prevState, ok: false, error: 'Unknown card definition.' };
  }

  // 1. VANGUARD NORMAL SUMMON OR FACE-DOWN DEFENSE SET (With ★5-8 Tributes!)
  if (def.type === 'vanguard') {
    if (player.normalSummonsLeft <= 0) {
      return {
        state: prevState,
        ok: false,
        error: 'Normal Summon already used this turn! (Use Soul Burn or Sylvan effects for an Extra Summon.)',
      };
    }

    const reqTributes = getRequiredTributes(def);
    const chosenTributes = options.tributeInstanceIds ?? [];
    if (chosenTributes.length !== reqTributes) {
      return {
        state: prevState,
        ok: false,
        error: `Level ★${def.level} requires ${reqTributes} Tribute monster${reqTributes > 1 ? 's' : ''} on your field!`,
      };
    }

    // Validate distinct friendly tributes
    const uniqueTribs = new Set(chosenTributes);
    if (uniqueTribs.size !== reqTributes) {
      return { state: prevState, ok: false, error: 'Select distinct monsters to Tribute.' };
    }
    const tribUnits: Array<{ unit: BoardUnit; slot: 0 | 1 | 2 }> = [];
    for (const tid of chosenTributes) {
      const found = findUnitById(state, tid);
      if (!found || found.owner !== owner) {
        return { state: prevState, ok: false, error: 'Invalid Tribute monster.' };
      }
      tribUnits.push({ unit: found.unit, slot: found.slot });
    }

    // Free tributed slots first so even a full 3-monster field can Tribute Summon!
    let freedSlot: (0 | 1 | 2) | null = null;
    const tributedCardIds: string[] = [];
    for (const t of tribUnits) {
      if (freedSlot === null) freedSlot = t.slot;
      player.vanguard[t.slot] = null;
      tributedCardIds.push(t.unit.cardId);
      if (!registry[t.unit.cardId]?.isToken) {
        player.voidPile.push(t.unit.cardId);
      }
      for (const rId of t.unit.attachedRelics) {
        player.voidPile.push(rId);
      }
    }

    const slot =
      options.slot !== undefined &&
      options.slot >= 0 &&
      options.slot <= 2 &&
      player.vanguard[options.slot] === null
        ? (options.slot as 0 | 1 | 2)
        : freedSlot ?? getFirstOpenVanguardSlot(state, owner);
    if (slot === null) {
      return { state: prevState, ok: false, error: 'All 3 Monster Zones are full.' };
    }

    const isSetDefense = options.summonMode === 'defense';
    // Rush Duel rule: Unlimited Normal Summons / Sets per turn (bounded by 3 Monster Zones & Tributes)
    player.hand.splice(handIdx, 1);

    const unit = createBoardUnit(
      state,
      owner,
      def,
      slot,
      isSetDefense ? 'defense' : 'attack',
      isSetDefense
    );
    player.vanguard[slot] = unit;

    if (isSetDefense) {
      pushEvent(
        state,
        'set_monster',
        `${player.name} Sets a monster face-down in Defense Position${
          reqTributes > 0 ? ` (Tributed ${reqTributes})` : ''
        }.`,
        {
          actor: owner,
          cardId: owner === 'player' ? def.id : undefined,
          targetInstanceId: unit.instanceId,
        }
      );
    } else {
      pushEvent(
        state,
        'summon',
        `${reqTributes > 0 ? 'Tribute Summon! ' : ''}${player.name} summons ${def.name} (${def.atk}/${def.def}) in Attack Position!`,
        {
          actor: owner,
          cardId: def.id,
          targetInstanceId: unit.instanceId,
        }
      );
    }

    // Trigger Resonate on any Tributed monsters!
    for (const tcId of tributedCardIds) {
      triggerResonateInPlace(state, owner, tcId, registry);
    }

    // Face-Up Summons trigger enemy on_summon Ambush & own onSummon effects
    if (!isSetDefense) {
      triggerAmbushInPlace(
        state,
        enemy,
        'on_summon',
        { targetUnitId: unit.instanceId },
        registry,
        skipAmbushFor
      );

      if (findUnitById(state, unit.instanceId) && def.onSummon?.length) {
        resolveEffectsInPlace(
          state,
          def.onSummon,
          {
            sourceOwner: owner,
            sourceUnitId: unit.instanceId,
            targetUnitId: options.targetInstanceId,
            targetPlayer: options.targetPlayer,
            voidCardId: options.voidCardId,
          },
          registry
        );
      }
    }

    checkWinnerInPlace(state);
    return { state, ok: true };
  }

  // 2. RELIC (EQUIP SPELL)
  if (def.type === 'relic') {
    const targetFound = options.targetInstanceId
      ? findUnitById(state, options.targetInstanceId)
      : null;
    if (!targetFound || targetFound.owner !== owner || targetFound.unit.faceDown) {
      return {
        state: prevState,
        ok: false,
        error: 'Select a face-up friendly monster to equip this Relic.',
      };
    }

    player.hand.splice(handIdx, 1);

    const ambushRes = triggerAmbushInPlace(state, enemy, 'on_spell', {}, registry, skipAmbushFor);
    if (ambushRes.spellCountered) {
      player.voidPile.push(def.id);
      checkWinnerInPlace(state);
      return { state, ok: true };
    }

    const unit = targetFound.unit;
    unit.attachedRelics.push(def.id);
    if (def.relicBonus) {
      unit.currentAtk += def.relicBonus.atk;
      unit.currentDef += def.relicBonus.def;
      for (const kw of def.relicBonus.keywords ?? []) {
        if (!unit.keywords.includes(kw)) {
          unit.keywords.push(kw);
          if (kw === 'Ward') unit.wardActive = true;
          if (kw === 'Swift') unit.maxAttacksThisTurn = Math.max(unit.maxAttacksThisTurn, 2);
        }
      }
    }

    const uDef = registry[unit.cardId];
    const uName =
      unit.isEvolved && uDef?.evolvedData ? uDef.evolvedData.name : uDef?.name ?? unit.cardId;
    pushEvent(state, 'relic', `${def.name} equips to ${uName}!`, {
      actor: owner,
      cardId: def.id,
      targetInstanceId: unit.instanceId,
    });

    checkWinnerInPlace(state);
    return { state, ok: true };
  }

  // 3. AMBUSH TRAP (SET FACE-DOWN)
  if (def.type === 'ambush') {
    const slot =
      options.slot !== undefined &&
      options.slot >= 0 &&
      options.slot <= 1 &&
      player.arcane[options.slot] === null
        ? (options.slot as 0 | 1)
        : getFirstOpenArcaneSlot(state, owner);
    if (slot === null) {
      return { state: prevState, ok: false, error: 'Both Spell & Trap Zones are full.' };
    }

    player.hand.splice(handIdx, 1);
    player.arcane[slot] = {
      instanceId: nextId(state, 'arc'),
      cardId: def.id,
      owner,
      slot,
      kind: 'ambush',
      faceDown: true,
      setTurn: state.turnNumber,
    };

    pushEvent(
      state,
      'spell',
      `${player.name} sets a face-down Ambush Trap in Arcane Zone ${slot + 1}.`,
      {
        actor: owner,
        cardId: owner === 'player' ? def.id : undefined,
      }
    );
    return { state, ok: true };
  }

  // 4. ARCANA SPELLS (DOMAIN, FUSION CATALYST, INSTANT)
  if (def.type === 'arcana') {
    if (def.arcanaSubtype === 'domain') {
      let slot =
        options.slot !== undefined && options.slot >= 0 && options.slot <= 1
          ? (options.slot as 0 | 1)
          : getFirstOpenArcaneSlot(state, owner);
      if (slot === null) {
        const domainIdx = player.arcane.findIndex((c) => c?.kind === 'domain');
        if (domainIdx === -1) {
          return { state: prevState, ok: false, error: 'Both Arcane Zones are full.' };
        }
        slot = domainIdx as 0 | 1;
      }

      player.hand.splice(handIdx, 1);

      const ambushRes = triggerAmbushInPlace(state, enemy, 'on_spell', {}, registry, skipAmbushFor);
      if (ambushRes.spellCountered) {
        player.voidPile.push(def.id);
        checkWinnerInPlace(state);
        return { state, ok: true };
      }

      const existing = player.arcane[slot];
      if (existing) player.voidPile.push(existing.cardId);

      player.arcane[slot] = {
        instanceId: nextId(state, 'arc'),
        cardId: def.id,
        owner,
        slot,
        kind: 'domain',
        faceDown: false,
        setTurn: state.turnNumber,
      };

      pushEvent(state, 'domain', `${player.name} activates Domain: ${def.name}!`, {
        actor: owner,
        cardId: def.id,
      });

      if (def.onPlay?.length) {
        resolveEffectsInPlace(state, def.onPlay, { sourceOwner: owner }, registry);
      }
      checkWinnerInPlace(state);
      return { state, ok: true };
    }

    if (def.arcanaSubtype === 'fusion_catalyst') {
      if (!options.fusionCardId || !options.fusionMaterials) {
        return {
          state: prevState,
          ok: false,
          error: 'Select a Rift Deck Fusion Apex and matching materials.',
        };
      }
      const fusionDef = registry[options.fusionCardId];
      if (!fusionDef || !validateFusionMaterials(fusionDef, options.fusionMaterials, registry)) {
        return { state: prevState, ok: false, error: 'Invalid Fusion materials selected.' };
      }

      player.hand.splice(handIdx, 1);
      player.voidPile.push(def.id);

      pushEvent(state, 'spell', `${player.name} activates ${def.name}!`, {
        actor: owner,
        cardId: def.id,
      });

      const ambushRes = triggerAmbushInPlace(state, enemy, 'on_spell', {}, registry, skipAmbushFor);
      if (ambushRes.spellCountered) {
        checkWinnerInPlace(state);
        return { state, ok: true };
      }

      const fuseRes = executeFusionInPlace(
        state,
        owner,
        options.fusionCardId,
        options.fusionMaterials,
        registry,
        undefined,
        skipAmbushFor
      );
      if (!fuseRes.ok) {
        return { state: prevState, ok: false, error: fuseRes.error };
      }

      if (def.onPlay?.length) {
        resolveEffectsInPlace(state, def.onPlay, { sourceOwner: owner }, registry);
      }
      checkWinnerInPlace(state);
      return { state, ok: true };
    }

    // Instant Arcana Spell
    const payLpEff = def.onPlay?.find((e) => e.kind === 'pay_lp');
    if (payLpEff && player.lp <= (payLpEff.amount ?? 500)) {
      return {
        state: prevState,
        ok: false,
        error: `Requires more than ${payLpEff.amount ?? 500} LP to activate ${def.name}!`,
      };
    }
    if (
      def.targetMode === 'enemy_unit' &&
      (!options.targetInstanceId || findUnitById(state, options.targetInstanceId)?.owner !== enemy)
    ) {
      return { state: prevState, ok: false, error: 'Select an enemy monster target.' };
    }
    if (
      def.targetMode === 'friendly_unit' &&
      (!options.targetInstanceId || findUnitById(state, options.targetInstanceId)?.owner !== owner)
    ) {
      return { state: prevState, ok: false, error: 'Select a friendly monster target.' };
    }
    if (def.targetMode === 'any_unit' && !options.targetInstanceId) {
      return { state: prevState, ok: false, error: 'Select a monster target.' };
    }

    player.hand.splice(handIdx, 1);
    player.voidPile.push(def.id);

    pushEvent(state, 'spell', `${player.name} activates Spell: ${def.name}!`, {
      actor: owner,
      cardId: def.id,
      targetInstanceId: options.targetInstanceId,
      targetPlayer: options.targetPlayer,
    });

    const ambushRes = triggerAmbushInPlace(state, enemy, 'on_spell', {}, registry, skipAmbushFor);
    if (ambushRes.spellCountered) {
      checkWinnerInPlace(state);
      return { state, ok: true };
    }

    if (def.onPlay?.length) {
      resolveEffectsInPlace(
        state,
        def.onPlay,
        {
          sourceOwner: owner,
          targetUnitId: options.targetInstanceId,
          targetPlayer: options.targetPlayer,
          voidCardId: options.voidCardId,
          isSpellDamage: true,
        },
        registry
      );
    }

    checkWinnerInPlace(state);
    return { state, ok: true };
  }

  return { state: prevState, ok: false, error: 'This card cannot be played from hand.' };
}

/** Soul Burn (1/Turn — Rush Duel): Discard 1 card to Void → Draw 1 fresh card + trigger Resonate! */
export function soulBurn(
  prevState: DuelState,
  owner: PlayerId,
  handInstanceId: string,
  registry: Record<string, CardDef>
): EngineResult {
  if (prevState.winner || prevState.activePlayer !== owner || prevState.phase !== 'main') {
    return { state: prevState, ok: false, error: 'Soul Burn is only available during Main Phase.' };
  }
  const p = prevState.players[owner];
  if (p.soulBurnUsedThisTurn) {
    return { state: prevState, ok: false, error: 'Soul Burn can only be used once per turn.' };
  }
  const idx = p.hand.findIndex((h) => h.instanceId === handInstanceId);
  if (idx === -1) {
    return { state: prevState, ok: false, error: 'Card not found in hand.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  const player = state.players[owner];
  const [discarded] = player.hand.splice(idx, 1);
  player.voidPile.push(discarded.cardId);
  player.soulBurnUsedThisTurn = true;

  const def = registry[discarded.cardId];
  pushEvent(
    state,
    'soul_burn',
    `Soul Burn! ${player.name} cycles ${def?.name ?? discarded.cardId} into the Void and draws 1 card!`,
    { actor: owner, cardId: discarded.cardId, amount: 1 }
  );

  drawCardsInPlace(state, owner, 1, registry, true);
  triggerResonateInPlace(state, owner, discarded.cardId, registry);
  checkWinnerInPlace(state);
  return { state, ok: true };
}

/** Yu-Gi-Oh! Battle Position Change / Flip Summon (cannot change position on the turn summoned!) */
export function toggleStance(
  prevState: DuelState,
  owner: PlayerId,
  unitInstanceId: string,
  registry: Record<string, CardDef>
): EngineResult {
  if (prevState.winner || prevState.activePlayer !== owner || prevState.phase !== 'main') {
    return { state: prevState, ok: false, error: 'Battle Position can only be changed during Main Phase.' };
  }
  const found = findUnitById(prevState, unitInstanceId);
  if (!found || found.owner !== owner) {
    return { state: prevState, ok: false, error: 'Friendly monster not found.' };
  }
  if (found.unit.isMaximumMode) {
    return {
      state: prevState,
      ok: false,
      error: 'Maximum Mode Titans cannot be switched to Defense Position!',
    };
  }
  if (found.unit.summonedTurn === prevState.players[owner].turnsTaken) {
    return {
      state: prevState,
      ok: false,
      error: 'Cannot change Battle Position on the same turn a monster was summoned or set.',
    };
  }
  if (found.unit.attacksThisTurn > 0) {
    return { state: prevState, ok: false, error: 'Cannot change Battle Position after attacking.' };
  }
  if (found.unit.hasChangedPositionThisTurn) {
    return { state: prevState, ok: false, error: 'Battle Position already changed this turn.' };
  }
  if (found.unit.frozenTurns > 0) {
    return { state: prevState, ok: false, error: 'Frozen monsters cannot change position.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  const u = findUnitById(state, unitInstanceId)!.unit;
  u.hasChangedPositionThisTurn = true;

  if (u.faceDown) {
    // Flip Summon to Face-Up Attack Position!
    u.stance = 'attack';
    flipUnitFaceUpInPlace(state, u, registry);
  } else {
    u.stance = u.stance === 'attack' ? 'defense' : 'attack';
    const def = registry[u.cardId];
    const name = u.isEvolved && def?.evolvedData ? def.evolvedData.name : def?.name ?? u.cardId;
    pushEvent(
      state,
      'stance',
      `${name} shifts to ${u.stance === 'defense' ? 'Defense Position' : 'Attack Position'}!`,
      { actor: owner, cardId: u.cardId, targetInstanceId: u.instanceId }
    );
  }

  checkWinnerInPlace(state);
  return { state, ok: true };
}

export function canEvolveUnit(
  state: DuelState,
  owner: PlayerId,
  unitInstanceId: string,
  registry: Record<string, CardDef>
): { eligible: boolean; freeInnate: boolean; reason?: string } {
  if (state.winner || state.activePlayer !== owner || state.phase !== 'main') {
    return { eligible: false, freeInnate: false, reason: 'Only during Main Phase.' };
  }
  const player = state.players[owner];
  if (player.evolvedThisTurn) {
    return { eligible: false, freeInnate: false, reason: 'Max 1 Evolution per turn.' };
  }
  const found = findUnitById(state, unitInstanceId);
  if (!found || found.owner !== owner) {
    return { eligible: false, freeInnate: false, reason: 'Friendly monster not found.' };
  }
  const unit = found.unit;
  if (unit.faceDown) {
    return { eligible: false, freeInnate: false, reason: 'Flip monster face-up before Evolving.' };
  }
  if (unit.isEvolved) {
    return { eligible: false, freeInnate: false, reason: 'Already Awakened.' };
  }
  const def = registry[unit.cardId];
  if (!def?.evolvedData) {
    return { eligible: false, freeInnate: false, reason: 'No Awakened Form.' };
  }
  if (unit.innateEvolveReady) {
    return { eligible: true, freeInnate: true };
  }
  const evoUnlockTurn = player.blessings.includes('blessing_evo_mastery') ? 2 : 3;
  if (player.turnsTaken < evoUnlockTurn) {
    return { eligible: false, freeInnate: false, reason: `Evo Orbs unlock on Turn ${evoUnlockTurn}.` };
  }
  if (player.evoOrbs <= 0) {
    return { eligible: false, freeInnate: false, reason: 'No Evo Orbs left.' };
  }
  return { eligible: true, freeInnate: false };
}

export function evolveUnit(
  prevState: DuelState,
  owner: PlayerId,
  unitInstanceId: string,
  registry: Record<string, CardDef>,
  skipAmbushFor?: PlayerId
): EngineResult {
  const check = canEvolveUnit(prevState, owner, unitInstanceId, registry);
  if (!check.eligible) {
    return { state: prevState, ok: false, error: check.reason ?? 'Cannot Evolve.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  const player = state.players[owner];
  const enemy = getEnemy(owner);
  const unit = findUnitById(state, unitInstanceId)!.unit;
  const def = registry[unit.cardId]!;
  const evo = def.evolvedData!;

  if (!check.freeInnate) {
    player.evoOrbs -= 1;
  }
  player.evolvedThisTurn = true;

  // Preserve Relics & buffs by adding the base -> evolved stat delta
  const atkGain = evo.atk - (def.atk ?? 0);
  const defGain = evo.def - (def.def ?? 0);
  unit.currentAtk = Math.max(0, unit.currentAtk + atkGain);
  unit.currentDef = Math.max(0, unit.currentDef + defGain);

  const merged = new Set([...unit.keywords, ...evo.keywords, 'Rush' as const]);
  unit.keywords = Array.from(merged);
  if (evo.keywords.includes('Ward')) unit.wardActive = true;
  if (unit.keywords.includes('Swift')) unit.maxAttacksThisTurn = 2;

  unit.isEvolved = true;
  unit.evolvedTurn = player.turnsTaken;
  unit.innateEvolveReady = false;
  unit.stance = 'attack';

  if (owner === 'player') {
    state.evolutionsPerformed += 1;
  }

  pushEvent(
    state,
    'evolve',
    `EVOLUTION! ${def.name} ascends into ${evo.name} (${unit.currentAtk}/${unit.currentDef})!`,
    {
      actor: owner,
      cardId: unit.cardId,
      targetInstanceId: unit.instanceId,
    }
  );

  triggerAmbushInPlace(
    state,
    enemy,
    'on_evolve',
    { targetUnitId: unit.instanceId },
    registry,
    skipAmbushFor
  );

  if (findUnitById(state, unit.instanceId) && evo.onEvolve?.length) {
    resolveEffectsInPlace(
      state,
      evo.onEvolve,
      { sourceOwner: owner, sourceUnitId: unit.instanceId },
      registry
    );
  }

  checkWinnerInPlace(state);
  return { state, ok: true };
}

/** Yu-Gi-Oh! Attack Eligibility: No Summoning Sickness! Only Global Turn 1 skips Battle Phase! */
export function canUnitAttack(
  state: DuelState,
  unit: BoardUnit,
  registry: Record<string, CardDef>
): { canAttackUnits: boolean; canAttackLp: boolean; reason?: string } {
  if (state.winner || state.activePlayer !== unit.owner) {
    return { canAttackUnits: false, canAttackLp: false, reason: 'Not your turn.' };
  }
  if (state.turnNumber <= 1) {
    return {
      canAttackUnits: false,
      canAttackLp: false,
      reason: 'Player going first skips Battle Phase on Turn 1 (Rush Duel Rule).',
    };
  }
  if (state.phase !== 'main' && state.phase !== 'battle') {
    return { canAttackUnits: false, canAttackLp: false, reason: 'Cannot attack right now.' };
  }
  if (unit.isMaximumMode && unit.maximumPiece !== 'center') {
    return {
      canAttackUnits: false,
      canAttackLp: false,
      reason: 'Attack using the Maximum Mode Center Core!',
    };
  }
  if (unit.faceDown || unit.stance !== 'attack') {
    return {
      canAttackUnits: false,
      canAttackLp: false,
      reason: 'Defense Position monsters cannot attack.',
    };
  }
  if (unit.attacksThisTurn >= unit.maxAttacksThisTurn) {
    return { canAttackUnits: false, canAttackLp: false, reason: 'Already attacked this turn.' };
  }
  if (unit.frozenTurns > 0) {
    return { canAttackUnits: false, canAttackLp: false, reason: 'Monster is Frozen.' };
  }
  if (getEffectiveAtk(state, unit, registry) <= 0) {
    return { canAttackUnits: false, canAttackLp: false, reason: '0 ATK monsters cannot attack.' };
  }

  const enemy = getEnemy(unit.owner);
  const enemyUnits = getActiveUnits(state, enemy);
  const canAttackUnits = enemyUnits.length > 0;
  // Official Yu-Gi-Oh! Direct Attack: only when opponent controls ZERO monsters!
  // Plus Swift double-attack only allows 1 direct LP attack per turn for balance
  const canAttackLp = enemyUnits.length === 0 && unit.attacksThisTurn === 0;
  return { canAttackUnits, canAttackLp };
}

export function enterBattlePhase(prevState: DuelState, owner: PlayerId): EngineResult {
  if (prevState.winner || prevState.activePlayer !== owner || prevState.phase !== 'main') {
    return { state: prevState, ok: false, error: 'Cannot enter Battle Phase right now.' };
  }
  if (prevState.turnNumber <= 1) {
    return {
      state: prevState,
      ok: false,
      error: 'Turn 1 (Going First) skips Battle Phase — press END TURN!',
    };
  }
  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  state.phase = 'battle';
  return { state, ok: true };
}

export function declareAttack(
  prevState: DuelState,
  owner: PlayerId,
  attackerInstanceId: string,
  target: { kind: 'unit'; instanceId: string } | { kind: 'lp' },
  registry: Record<string, CardDef>,
  skipAmbushFor?: PlayerId
): EngineResult {
  if (prevState.winner || prevState.activePlayer !== owner) {
    return { state: prevState, ok: false, error: 'Not your turn.' };
  }
  if (prevState.turnNumber <= 1) {
    return { state: prevState, ok: false, error: 'Cannot attack on Turn 1 (going first).' };
  }
  if (prevState.phase !== 'main' && prevState.phase !== 'battle') {
    return { state: prevState, ok: false, error: 'Cannot attack in this phase.' };
  }

  const foundAtk = findUnitById(prevState, attackerInstanceId);
  if (!foundAtk || foundAtk.owner !== owner) {
    return { state: prevState, ok: false, error: 'Attacker not found.' };
  }
  const check = canUnitAttack(prevState, foundAtk.unit, registry);
  if (target.kind === 'lp' && !check.canAttackLp) {
    return {
      state: prevState,
      ok: false,
      error:
        getActiveUnits(prevState, getEnemy(owner)).length > 0
          ? 'Clear all enemy monsters before attacking LP directly!'
          : check.reason ?? 'Cannot declare a Direct Attack.',
    };
  }
  if (target.kind === 'unit' && !check.canAttackUnits) {
    return { state: prevState, ok: false, error: check.reason ?? 'Monster cannot attack.' };
  }

  const enemy = getEnemy(owner);
  if (target.kind === 'unit') {
    const foundDef = findUnitById(prevState, target.instanceId);
    if (!foundDef || foundDef.owner !== enemy) {
      return { state: prevState, ok: false, error: 'Invalid enemy target.' };
    }
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  state.phase = 'battle';

  const attacker = findUnitById(state, attackerInstanceId)!.unit;
  attacker.attacksThisTurn += 1;

  const atkDef = registry[attacker.cardId];
  const atkName =
    attacker.isEvolved && atkDef?.evolvedData
      ? atkDef.evolvedData.name
      : atkDef?.name ?? attacker.cardId;

  pushEvent(
    state,
    'attack',
    target.kind === 'lp'
      ? `${atkName} declares a DIRECT ATTACK on ${state.players[enemy].name}!`
      : `${atkName} declares an attack!`,
    {
      actor: owner,
      cardId: attacker.cardId,
      sourceInstanceId: attacker.instanceId,
      targetInstanceId: target.kind === 'unit' ? target.instanceId : undefined,
      targetPlayer: target.kind === 'lp' ? enemy : undefined,
    }
  );

  // 1. Enemy on_attack Ambush Trap
  const ambushRes = triggerAmbushInPlace(
    state,
    enemy,
    'on_attack',
    { attackerUnitId: attacker.instanceId },
    registry,
    skipAmbushFor
  );

  const attackerAlive = findUnitById(state, attacker.instanceId);
  if (
    ambushRes.attackNegated ||
    !attackerAlive ||
    attackerAlive.unit.frozenTurns > 0 ||
    state.winner
  ) {
    checkWinnerInPlace(state);
    return { state, ok: true };
  }

  // 2. Attacker onAttack triggers (including Maximum Mode On-Attack!)
  const onAttackEffects = [
    ...(atkDef?.onAttack ?? []),
    ...(attacker.isEvolved ? atkDef?.evolvedData?.onAttack ?? [] : []),
    ...(attacker.isMaximumMode && atkDef?.maximumOnAttack ? atkDef.maximumOnAttack : []),
  ];
  if (onAttackEffects.length > 0) {
    resolveEffectsInPlace(
      state,
      onAttackEffects,
      {
        sourceOwner: owner,
        sourceUnitId: attacker.instanceId,
        targetUnitId: target.kind === 'unit' ? target.instanceId : undefined,
        targetPlayer: enemy,
      },
      registry
    );
  }

  const postTriggerAtk = findUnitById(state, attacker.instanceId)?.unit;
  if (!postTriggerAtk || state.winner) {
    checkWinnerInPlace(state);
    return { state, ok: true };
  }

  const myAtk = getEffectiveAtk(state, postTriggerAtk, registry);
  const attackerLethal = postTriggerAtk.keywords.includes('Lethal');
  const attackerPierce = postTriggerAtk.keywords.includes('Pierce');
  const attackerDrain = postTriggerAtk.keywords.includes('Drain');

  // 3A. DIRECT ATTACK ON LP
  if (target.kind === 'lp') {
    const dealt = damageLpInPlace(
      state,
      enemy,
      myAtk,
      owner,
      `DIRECT ATTACK! ${atkName} inflicts ${myAtk} Battle Damage!`
    );
    if (dealt > 0 && attackerDrain) {
      healLpInPlace(state, owner, dealt);
    }
    checkWinnerInPlace(state);
    return { state, ok: true };
  }

  // 3B. YU-GI-OH! BATTLE CALCULATION (ATK vs ATK or ATK vs DEF)
  const defender = findUnitById(state, target.instanceId)?.unit;
  if (!defender) {
    checkWinnerInPlace(state);
    return { state, ok: true };
  }

  // Flip face-down Defense monster face-up before damage calculation!
  if (defender.faceDown) {
    flipUnitFaceUpInPlace(state, defender, registry);
    if (!findUnitById(state, postTriggerAtk.instanceId) || !findUnitById(state, defender.instanceId) || state.winner) {
      checkWinnerInPlace(state);
      return { state, ok: true };
    }
  }

  const defCard = registry[defender.cardId];
  const defName =
    defender.isEvolved && defCard?.evolvedData
      ? defCard.evolvedData.name
      : defCard?.name ?? defender.cardId;
  const defenderLethal = defender.keywords.includes('Lethal');
  const defenderDrain = defender.keywords.includes('Drain');

  const markAttackerKill = () => {
    postTriggerAtk.killsThisMatch += 1;
    if (
      !postTriggerAtk.isEvolved &&
      atkDef?.evolvedData?.innateCondition?.type === 'defeat_enemy'
    ) {
      postTriggerAtk.innateEvolveReady = true;
    }
  };

  if (defender.stance === 'attack') {
    // ===== ATTACK POSITION vs ATTACK POSITION =====
    const oppAtk = getEffectiveAtk(state, defender, registry);

    if (myAtk > oppAtk) {
      const diff = myAtk - oppAtk;
      destroyUnitInPlace(state, defender, registry, `${atkName} destroys ${defName} in battle!`);
      markAttackerKill();
      const dealt = damageLpInPlace(
        state,
        enemy,
        diff,
        owner,
        `Battle Damage! ${state.players[enemy].name} takes ${diff} LP damage!`
      );
      if (attackerDrain) healLpInPlace(state, owner, Math.max(dealt, 400));
      if (defenderLethal && findUnitById(state, postTriggerAtk.instanceId)) {
        destroyUnitInPlace(
          state,
          postTriggerAtk,
          registry,
          `${defName}'s Lethal counter destroys ${atkName}!`
        );
      }
    } else if (myAtk === oppAtk) {
      destroyUnitInPlace(state, defender, registry, `Mutual clash! ${defName} is destroyed!`);
      destroyUnitInPlace(state, postTriggerAtk, registry, `Mutual clash! ${atkName} is destroyed!`);
    } else {
      const diff = oppAtk - myAtk;
      destroyUnitInPlace(
        state,
        postTriggerAtk,
        registry,
        `${defName} overpowers and destroys ${atkName}!`
      );
      const dealt = damageLpInPlace(
        state,
        owner,
        diff,
        enemy,
        `Counter Battle Damage! ${state.players[owner].name} takes ${diff} LP damage!`
      );
      if (defenderDrain) healLpInPlace(state, enemy, Math.max(dealt, 400));
      if (attackerLethal && findUnitById(state, defender.instanceId)) {
        destroyUnitInPlace(
          state,
          defender,
          registry,
          `${atkName}'s Lethal strike takes ${defName} down with it!`
        );
      }
    }
  } else {
    // ===== ATTACK POSITION vs DEFENSE POSITION =====
    const oppDef = getEffectiveDef(state, defender, registry);

    if (myAtk > oppDef) {
      const diff = myAtk - oppDef;
      destroyUnitInPlace(
        state,
        defender,
        registry,
        `${atkName} shatters ${defName}'s Defense (${oppDef} DEF)!`
      );
      markAttackerKill();
      if (attackerPierce && diff > 0) {
        const dealt = damageLpInPlace(
          state,
          enemy,
          diff,
          owner,
          `PIERCING DAMAGE! ${state.players[enemy].name} takes ${diff} LP damage!`
        );
        if (attackerDrain && dealt > 0) healLpInPlace(state, owner, dealt);
      } else if (attackerDrain) {
        healLpInPlace(state, owner, 400);
      }
    } else if (myAtk === oppDef) {
      pushEvent(
        state,
        'stance',
        `${defName} holds the line (${myAtk} ATK vs ${oppDef} DEF) — no monsters destroyed!`,
        { actor: enemy, targetInstanceId: defender.instanceId }
      );
      if (attackerLethal) {
        destroyUnitInPlace(state, defender, registry, `${atkName}'s Lethal breaks through!`);
        markAttackerKill();
      }
    } else {
      const recoil = oppDef - myAtk;
      defender.wonDefenseThisMatch = true;
      if (
        !defender.isEvolved &&
        defCard?.evolvedData?.innateCondition?.type === 'win_defense'
      ) {
        defender.innateEvolveReady = true;
      }
      damageLpInPlace(
        state,
        owner,
        recoil,
        enemy,
        `DEFENSE RECOIL! ${defName} (${oppDef} DEF) repels ${atkName} for ${recoil} LP damage!`
      );
      if (attackerLethal && findUnitById(state, defender.instanceId)) {
        destroyUnitInPlace(state, defender, registry, `${atkName}'s Lethal venom destroys ${defName}!`);
        markAttackerKill();
      }
    }
  }

  checkWinnerInPlace(state);
  return { state, ok: true };
}

export function endTurn(
  prevState: DuelState,
  owner: PlayerId,
  registry: Record<string, CardDef>
): EngineResult {
  if (prevState.winner || prevState.activePlayer !== owner) {
    return { state: prevState, ok: false, error: 'Cannot end turn right now.' };
  }
  if (prevState.phase !== 'main' && prevState.phase !== 'battle') {
    return { state: prevState, ok: false, error: 'Cannot end turn during this phase.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  state.phase = 'end';

  const enemy = getEnemy(owner);

  for (const unit of [...getActiveUnits(state, owner)]) {
    if (unit.faceDown || !findUnitById(state, unit.instanceId)) continue;
    const def = registry[unit.cardId];
    const eot = [
      ...(def?.endOfTurn ?? []),
      ...(unit.isEvolved ? def?.evolvedData?.endOfTurn ?? [] : []),
    ];
    if (eot.length > 0) {
      resolveEffectsInPlace(
        state,
        eot,
        { sourceOwner: owner, sourceUnitId: unit.instanceId },
        registry
      );
    }
  }

  const domain = getDomainBonuses(state, owner, registry);
  if (domain.endTurnHeal > 0) {
    healLpInPlace(state, owner, domain.endTurnHeal);
  }
  if (domain.endTurnBurn > 0) {
    damageLpInPlace(
      state,
      enemy,
      domain.endTurnBurn,
      owner,
      `Domain burn inflicts ${domain.endTurnBurn} LP damage!`
    );
  }

  checkWinnerInPlace(state);
  if (!state.winner) {
    startTurnInPlace(state, enemy, registry);
  }

  return { state, ok: true };
}

/* ============================================================================
 * DUELIST CHARACTER SKILLS (1/DUEL — YU-GI-OH! DUEL LINKS STYLE)
 * ============================================================================ */

export function canActivateSkill(
  state: DuelState,
  owner: PlayerId,
  registry: Record<string, CardDef>
): { eligible: boolean; reason?: string } {
  if (state.winner || state.activePlayer !== owner || state.phase !== 'main') {
    return { eligible: false, reason: 'Skills activate during your Main Phase.' };
  }
  const p = state.players[owner];
  if (!p.skillId) return { eligible: false, reason: 'No Duelist Skill equipped.' };
  if (p.skillUsed) return { eligible: false, reason: 'Skill already used this Duel.' };

  switch (p.skillId) {
    case 'volcanic_ignition':
      if (p.lp > 6000 && p.turnsTaken < 2) {
        return { eligible: false, reason: 'Unlocks on Turn 2+ or LP ≤ 6000.' };
      }
      return { eligible: true };
    case 'absolute_aegis':
      if (p.turnsTaken < 2) {
        return { eligible: false, reason: 'Unlocks starting your Turn 2.' };
      }
      return { eligible: true };
    case 'void_resurrection': {
      const hasVoidMonster = p.voidPile.some((cid) => registry[cid]?.type === 'vanguard');
      if (!hasVoidMonster) {
        return { eligible: false, reason: 'Requires at least 1 Monster in your Void.' };
      }
      return { eligible: true };
    }
    case 'canopy_awakening':
      if (p.turnsTaken < 2) {
        return { eligible: false, reason: 'Unlocks starting your Turn 2.' };
      }
      return { eligible: true };
    case 'destiny_draw':
      if (p.lp > 5500 && p.turnsTaken < 3) {
        return { eligible: false, reason: 'Unlocks on Turn 3+ or LP ≤ 5500.' };
      }
      if (p.deck.length === 0) {
        return { eligible: false, reason: 'Deck is empty.' };
      }
      return { eligible: true };
  }
}

export function activateDuelistSkill(
  prevState: DuelState,
  owner: PlayerId,
  registry: Record<string, CardDef>
): EngineResult {
  const chk = canActivateSkill(prevState, owner, registry);
  if (!chk.eligible) {
    return { state: prevState, ok: false, error: chk.reason ?? 'Skill not ready.' };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  const p = state.players[owner];
  const skillId = p.skillId!;
  p.skillUsed = true;

  switch (skillId) {
    case 'volcanic_ignition': {
      pushEvent(
        state,
        'skill',
        `SKILL ACTIVATED — VOLCANIC IGNITION! All friendly monsters surge +500 ATK & scorch 500 enemy LP!`,
        { actor: owner, cardId: 'pyro_inferno_sovereign' }
      );
      resolveEffectsInPlace(
        state,
        [
          { kind: 'buff_all_friendly', atkDelta: 500, defDelta: 200 },
          { kind: 'damage_enemy_lp', amount: 500 },
        ],
        { sourceOwner: owner },
        registry
      );
      break;
    }

    case 'absolute_aegis': {
      pushEvent(
        state,
        'skill',
        `SKILL ACTIVATED — ABSOLUTE AEGIS! Strongest foe is Frozen & all allies gain +400 DEF + Ward!`,
        { actor: owner, cardId: 'cryo_valkyrie_zero' }
      );
      resolveEffectsInPlace(
        state,
        [
          { kind: 'freeze_unit', amount: 1 },
          { kind: 'buff_all_friendly', atkDelta: 0, defDelta: 400, keyword: 'Ward' },
        ],
        { sourceOwner: owner },
        registry
      );
      break;
    }

    case 'void_resurrection': {
      pushEvent(
        state,
        'skill',
        `SKILL ACTIVATED — VOID RESURRECTION! Rising from the Abyss + +600 LP!`,
        { actor: owner, cardId: 'umbra_nyx_avatar' }
      );
      const openSlot = getFirstOpenVanguardSlot(state, owner);
      if (openSlot !== null) {
        resolveEffectsInPlace(
          state,
          [
            { kind: 'revive_vanguard', maxLevel: 8 },
            { kind: 'heal_lp', amount: 600 },
          ],
          { sourceOwner: owner },
          registry
        );
      } else {
        resolveEffectsInPlace(
          state,
          [
            { kind: 'recover_void_to_hand' },
            { kind: 'heal_lp', amount: 800 },
          ],
          { sourceOwner: owner },
          registry
        );
      }
      break;
    }

    case 'canopy_awakening': {
      pushEvent(
        state,
        'skill',
        `SKILL ACTIVATED — CANOPY AWAKENING! +1 Evo Orb, +1000 LP & early Awakening unlocked!`,
        { actor: owner, cardId: 'sylvan_gaia_stag' }
      );
      if (!p.blessings.includes('blessing_evo_mastery')) {
        p.blessings.push('blessing_evo_mastery');
      }
      resolveEffectsInPlace(
        state,
        [
          { kind: 'gain_evo_orb', amount: 1 },
          { kind: 'heal_lp', amount: 1000 },
        ],
        { sourceOwner: owner },
        registry
      );
      break;
    }

    case 'destiny_draw': {
      // Pull strongest ace / Polymerization / Maximum piece straight from Deck + draw 1!
      let bestIdx = 0;
      let bestScore = -1;
      p.deck.forEach((cid, idx) => {
        const d = registry[cid];
        if (!d) return;
        let score = (d.atk ?? 0) + (d.rarity === 'mythic' ? 1200 : d.rarity === 'epic' ? 500 : 0);
        if (d.arcanaSubtype === 'fusion_catalyst') score += 2600;
        if (d.maximumPiece) score += 2400;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      });
      const [pulledId] = p.deck.splice(bestIdx, 1);
      if (pulledId && p.hand.length < 9) {
        p.hand.push({ instanceId: nextId(state, 'hc'), cardId: pulledId });
      }
      const pulledName = registry[pulledId]?.name ?? 'Ace Card';
      pushEvent(
        state,
        'skill',
        `SKILL ACTIVATED — DESTINY DRAW! ${p.name} draws ${pulledName} straight from fate + 1 bonus card!`,
        { actor: owner, cardId: pulledId }
      );
      drawCardsInPlace(state, owner, 1, registry, true);
      break;
    }
  }

  checkWinnerInPlace(state);
  return { state, ok: true };
}

/* ============================================================================
 * MAXIMUM SUMMON (3-PIECE TITAN — YU-GI-OH! RUSH DUEL SIGNATURE MECHANIC)
 * ============================================================================ */

export interface MaximumSetReady {
  maximumSetId: string;
  leftHandId: string;
  centerHandId: string;
  rightHandId: string;
  centerCardId: string;
  maximumAtk: number;
}

export function findAvailableMaximumSets(
  state: DuelState,
  owner: PlayerId,
  registry: Record<string, CardDef>
): MaximumSetReady[] {
  if (state.winner || state.activePlayer !== owner || state.phase !== 'main') return [];
  const hand = state.players[owner].hand;
  const bySet = new Map<
    string,
    { left?: string; center?: string; right?: string; centerCardId?: string; maxAtk?: number }
  >();

  for (const hc of hand) {
    const def = registry[hc.cardId];
    if (!def?.maximumSetId || !def.maximumPiece) continue;
    const entry = bySet.get(def.maximumSetId) ?? {};
    if (def.maximumPiece === 'left' && !entry.left) entry.left = hc.instanceId;
    if (def.maximumPiece === 'center' && !entry.center) {
      entry.center = hc.instanceId;
      entry.centerCardId = def.id;
      entry.maxAtk = def.maximumAtk ?? 4200;
    }
    if (def.maximumPiece === 'right' && !entry.right) entry.right = hc.instanceId;
    bySet.set(def.maximumSetId, entry);
  }

  const ready: MaximumSetReady[] = [];
  for (const [maximumSetId, entry] of bySet.entries()) {
    if (entry.left && entry.center && entry.right && entry.centerCardId) {
      ready.push({
        maximumSetId,
        leftHandId: entry.left,
        centerHandId: entry.center,
        rightHandId: entry.right,
        centerCardId: entry.centerCardId,
        maximumAtk: entry.maxAtk ?? 4200,
      });
    }
  }
  return ready;
}

export function executeMaximumSummon(
  prevState: DuelState,
  owner: PlayerId,
  maximumSetId: string,
  registry: Record<string, CardDef>,
  skipAmbushFor?: PlayerId
): EngineResult {
  const ready = findAvailableMaximumSets(prevState, owner, registry).find(
    (m) => m.maximumSetId === maximumSetId
  );
  if (!ready) {
    return {
      state: prevState,
      ok: false,
      error: 'Hold all 3 Maximum pieces ([L] + [CORE] + [R]) in Hand to Maximum Summon!',
    };
  }

  const state = cloneDuelState(prevState);
  state.recentEvents = [];
  const p = state.players[owner];
  const enemy = getEnemy(owner);

  // Official Rush Duel Maximum Summon rule: clear existing friendly field monsters to Void first!
  const clearedCardIds: string[] = [];
  for (let s = 0; s < 3; s++) {
    const existing = p.vanguard[s];
    if (existing) {
      p.vanguard[s] = null;
      clearedCardIds.push(existing.cardId);
      if (!registry[existing.cardId]?.isToken) {
        p.voidPile.push(existing.cardId);
      }
      for (const rId of existing.attachedRelics) {
        p.voidPile.push(rId);
      }
    }
  }

  // Pull [L], [CORE], [R] from hand
  const idsToPull = new Set([ready.leftHandId, ready.centerHandId, ready.rightHandId]);
  const pulled = p.hand.filter((h) => idsToPull.has(h.instanceId));
  p.hand = p.hand.filter((h) => !idsToPull.has(h.instanceId));

  const leftHc = pulled.find((h) => h.instanceId === ready.leftHandId)!;
  const centerHc = pulled.find((h) => h.instanceId === ready.centerHandId)!;
  const rightHc = pulled.find((h) => h.instanceId === ready.rightHandId)!;

  const leftDef = registry[leftHc.cardId]!;
  const centerDef = registry[centerHc.cardId]!;
  const rightDef = registry[rightHc.cardId]!;

  const maxAtk = centerDef.maximumAtk ?? 4200;
  const maxKeywords = centerDef.maximumKeywords ?? ['Pierce', 'Ward'];

  const leftUnit = createBoardUnit(state, owner, leftDef, 0, 'attack', false);
  const centerUnit = createBoardUnit(state, owner, centerDef, 1, 'attack', false);
  const rightUnit = createBoardUnit(state, owner, rightDef, 2, 'attack', false);

  for (const [u, role] of [
    [leftUnit, 'left'],
    [centerUnit, 'center'],
    [rightUnit, 'right'],
  ] as const) {
    u.isMaximumMode = true;
    u.maximumSetId = maximumSetId;
    u.maximumPiece = role;
    u.currentAtk = maxAtk;
    u.currentDef = 0; // Authentic Rush Duel: Maximum Monsters have no DEF in Maximum Mode!
    u.keywords = [...maxKeywords];
    u.wardActive = maxKeywords.includes('Ward');
    u.maxAttacksThisTurn = maxKeywords.includes('Swift') ? 2 : 1;
  }

  p.vanguard[0] = leftUnit;
  p.vanguard[1] = centerUnit;
  p.vanguard[2] = rightUnit;

  if (owner === 'player') {
    state.maximumsPerformed += 1;
  }

  pushEvent(
    state,
    'maximum',
    `MAXIMUM SUMMON!! ${p.name} unites [L] + [CORE] + [R] into ${centerDef.name} (${maxAtk} MAXIMUM ATK)!`,
    {
      actor: owner,
      cardId: centerDef.id,
      secondaryCardIds: [leftDef.id, rightDef.id],
      targetInstanceId: centerUnit.instanceId,
    }
  );

  for (const cId of clearedCardIds) {
    triggerResonateInPlace(state, owner, cId, registry);
  }

  // Enemy on_summon Ambush may attempt to react against Center Core (Ward blocks the first one!)
  triggerAmbushInPlace(
    state,
    enemy,
    'on_summon',
    { targetUnitId: centerUnit.instanceId },
    registry,
    skipAmbushFor
  );

  const stillAlive = findUnitById(state, centerUnit.instanceId);
  if (stillAlive && centerDef.onSummon?.length) {
    resolveEffectsInPlace(
      state,
      centerDef.onSummon,
      { sourceOwner: owner, sourceUnitId: centerUnit.instanceId },
      registry
    );
  }

  checkWinnerInPlace(state);
  return { state, ok: true };
}
