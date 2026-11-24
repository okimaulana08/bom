import type {
  BacklineCard,
  BoardUnit,
  CardDef,
  DomainBonus,
  DuelEvent,
  DuelEventType,
  DuelState,
  Faction,
  MaterialChoice,
  PlayerId,
} from './types';

export function getEnemy(playerId: PlayerId): PlayerId {
  return playerId === 'player' ? 'opponent' : 'player';
}

export function cloneDuelState(state: DuelState): DuelState {
  return structuredClone(state);
}

/** Mulberry32 deterministic PRNG */
export function nextRandom(state: DuelState): number {
  let t = (state.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffleArray<T>(state: DuelState, items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function nextId(state: DuelState, prefix: string): string {
  state.nextUid += 1;
  return `${prefix}_${state.nextUid}`;
}

export function pushEvent(
  state: DuelState,
  type: DuelEventType,
  text: string,
  extra: Partial<Omit<DuelEvent, 'id' | 'type' | 'text' | 'turn'>> = {}
): DuelEvent {
  const ev: DuelEvent = {
    id: nextId(state, 'ev'),
    type,
    text,
    turn: state.turnNumber,
    ...extra,
  };
  state.log.push(ev);
  state.recentEvents.push(ev);
  return ev;
}

/** Classic Yu-Gi-Oh! Tribute requirements: Lv 1-4 = 0, Lv 5-6 = 1, Lv 7+ = 2 */
export function getRequiredTributes(def: CardDef): number {
  if (def.type !== 'vanguard') return 0;
  if (def.level >= 7) return 2;
  if (def.level >= 5) return 1;
  return 0;
}

export function getDomainBonuses(
  state: DuelState,
  owner: PlayerId,
  registry: Record<string, CardDef>
): Required<DomainBonus> {
  const totals: Required<DomainBonus> = {
    friendlyAtk: 0,
    friendlyDef: 0,
    endTurnHeal: 0,
    endTurnBurn: 0,
    spellBurnBonus: 0,
  };
  for (const card of state.players[owner].arcane) {
    if (!card || card.kind !== 'domain' || card.faceDown) continue;
    const def = registry[card.cardId];
    if (!def?.domainBonus) continue;
    totals.friendlyAtk += def.domainBonus.friendlyAtk ?? 0;
    totals.friendlyDef += def.domainBonus.friendlyDef ?? 0;
    totals.endTurnHeal += def.domainBonus.endTurnHeal ?? 0;
    totals.endTurnBurn += def.domainBonus.endTurnBurn ?? 0;
    totals.spellBurnBonus += def.domainBonus.spellBurnBonus ?? 0;
  }
  return totals;
}

export function getEffectiveAtk(
  state: DuelState,
  unit: BoardUnit,
  registry: Record<string, CardDef>
): number {
  const domain = getDomainBonuses(state, unit.owner, registry);
  const blessingBonus = state.players[unit.owner].blessings.includes('blessing_vanguard_might')
    ? 300
    : 0;
  return Math.max(0, unit.currentAtk + domain.friendlyAtk + blessingBonus);
}

export function getEffectiveDef(
  state: DuelState,
  unit: BoardUnit,
  registry: Record<string, CardDef>
): number {
  const domain = getDomainBonuses(state, unit.owner, registry);
  const bossDefBonus =
    unit.stance === 'defense' && state.players[unit.owner].bossModifier === 'cryo_guard_armor'
      ? 300
      : 0;
  const blessingBonus = state.players[unit.owner].blessings.includes('blessing_iron_aegis')
    ? 400
    : 0;
  return Math.max(0, unit.currentDef + domain.friendlyDef + bossDefBonus + blessingBonus);
}

export function findUnitById(
  state: DuelState,
  instanceId: string
): { unit: BoardUnit; owner: PlayerId; slot: 0 | 1 | 2 } | null {
  for (const owner of ['player', 'opponent'] as PlayerId[]) {
    for (let i = 0; i < 3; i++) {
      const unit = state.players[owner].vanguard[i];
      if (unit && unit.instanceId === instanceId) {
        return { unit, owner, slot: i as 0 | 1 | 2 };
      }
    }
  }
  return null;
}

export function getFirstOpenVanguardSlot(
  state: DuelState,
  owner: PlayerId
): (0 | 1 | 2) | null {
  const slots = state.players[owner].vanguard;
  for (let i = 0; i < 3; i++) {
    if (slots[i] === null) return i as 0 | 1 | 2;
  }
  return null;
}

export function getFirstOpenArcaneSlot(
  state: DuelState,
  owner: PlayerId
): (0 | 1) | null {
  const slots = state.players[owner].arcane;
  for (let i = 0; i < 2; i++) {
    if (slots[i] === null) return i as 0 | 1;
  }
  return null;
}

export function getActiveUnits(state: DuelState, owner: PlayerId): BoardUnit[] {
  return state.players[owner].vanguard.filter((u): u is BoardUnit => u !== null);
}

export function getFaceUpUnits(state: DuelState, owner: PlayerId): BoardUnit[] {
  return state.players[owner].vanguard.filter(
    (u): u is BoardUnit => u !== null && !u.faceDown
  );
}

export function getUnitFactions(def: CardDef): Faction[] {
  return def.secondaryFaction ? [def.faction, def.secondaryFaction] : [def.faction];
}

export function validateFusionMaterials(
  fusionDef: CardDef,
  chosen: MaterialChoice[],
  registry: Record<string, CardDef>
): boolean {
  const recipe = fusionDef.fusionRecipe;
  if (!recipe) return false;
  if (chosen.length !== recipe.materials.length) return false;

  const seen = new Set<string>();
  for (const c of chosen) {
    if (seen.has(c.instanceId)) return false;
    seen.add(c.instanceId);
    const def = registry[c.cardId];
    if (!def || (def.type !== 'vanguard' && def.type !== 'fusion_apex')) {
      return false;
    }
  }

  if (recipe.distinctFactions && chosen.length >= 2) {
    const primaryFactions = new Set(chosen.map((c) => registry[c.cardId]?.faction));
    if (primaryFactions.size < chosen.length) return false;
  }

  const reqs = recipe.materials;
  const used = new Array<boolean>(chosen.length).fill(false);

  function match(reqIdx: number): boolean {
    if (reqIdx >= reqs.length) return true;
    const req = reqs[reqIdx];
    for (let i = 0; i < chosen.length; i++) {
      if (used[i]) continue;
      const def = registry[chosen[i].cardId];
      if (!def) continue;
      const factions = getUnitFactions(def);
      if (!req.faction || factions.includes(req.faction)) {
        used[i] = true;
        if (match(reqIdx + 1)) return true;
        used[i] = false;
      }
    }
    return false;
  }

  return match(0);
}

export function collectCandidateMaterials(
  state: DuelState,
  owner: PlayerId,
  allowHand: boolean,
  registry: Record<string, CardDef>
): MaterialChoice[] {
  const candidates: MaterialChoice[] = [];
  for (const unit of state.players[owner].vanguard) {
    if (!unit) continue;
    candidates.push({
      source: 'field',
      instanceId: unit.instanceId,
      cardId: unit.cardId,
    });
  }
  if (allowHand) {
    for (const hc of state.players[owner].hand) {
      const def = registry[hc.cardId];
      if (def && (def.type === 'vanguard' || def.type === 'fusion_apex')) {
        candidates.push({
          source: 'hand',
          instanceId: hc.instanceId,
          cardId: hc.cardId,
        });
      }
    }
  }
  return candidates;
}

export function findValidFusionCombos(
  state: DuelState,
  owner: PlayerId,
  fusionCardId: string,
  allowHand: boolean,
  registry: Record<string, CardDef>
): MaterialChoice[][] {
  const fusionDef = registry[fusionCardId];
  if (!fusionDef?.fusionRecipe) return [];
  const need = fusionDef.fusionRecipe.materials.length;
  const candidates = collectCandidateMaterials(state, owner, allowHand, registry);
  if (candidates.length < need) return [];

  const openSlot = getFirstOpenVanguardSlot(state, owner);
  const results: MaterialChoice[][] = [];

  function combine(start: number, picked: MaterialChoice[]) {
    if (picked.length === need) {
      const freesFieldSlot = picked.some((p) => p.source === 'field');
      if (!freesFieldSlot && openSlot === null) return;
      if (validateFusionMaterials(fusionDef, picked, registry)) {
        results.push([...picked]);
      }
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      picked.push(candidates[i]);
      combine(i + 1, picked);
      picked.pop();
    }
  }

  combine(0, []);
  return results;
}

/** Yu-Gi-Oh! rule: Set Ambush Traps can trigger starting the turn AFTER they are set! */
export function findFaceDownAmbush(
  state: DuelState,
  owner: PlayerId,
  trigger: string,
  registry: Record<string, CardDef>
): BacklineCard | null {
  for (const card of state.players[owner].arcane) {
    if (!card || card.kind !== 'ambush' || !card.faceDown) continue;
    if (card.setTurn >= state.turnNumber) continue;
    const def = registry[card.cardId];
    if (def?.ambushTrigger === trigger) {
      return card;
    }
  }
  return null;
}
