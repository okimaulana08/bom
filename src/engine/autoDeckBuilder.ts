import type { CardDef, DuelistSkillId, Faction } from './types';

export type AutoBuildStrategy =
  | 'auto'
  | 'balanced'
  | 'aggro'
  | 'control'
  | 'fusion'
  | 'maximum';

export type ResolvedAutoBuildStrategy = Exclude<AutoBuildStrategy, 'auto'>;

export interface AutoBuildOptions {
  strategy: AutoBuildStrategy;
  focusFaction?: Faction | 'auto';
  fillRemaining?: boolean;
  lockedMain?: string[];
  lockedRift?: string[];
  seed?: number;
}

export interface FusionCoverageEntry {
  cardId: string;
  name: string;
  recipeSummary: string;
  copies: number;
  materialCounts: { label: string; count: number }[];
  status: 'optimal' | 'playable' | 'tight';
}

export interface AutoBuildSimulation {
  trials: number;
  playableTurn1Rate: number;
  strongOpeningRate: number;
  brickRate: number;
  fusionReadyRate: number | null;
  maximumNearRate: number | null;
  autoTunedSwaps: number;
}

export interface AutoBuildReport {
  grade: 'S+' | 'S' | 'A+' | 'A' | 'B';
  synergyScore: number;
  resolvedStrategy: ResolvedAutoBuildStrategy;
  strategyLabel: string;
  primaryFactions: Faction[];
  suggestedName: string;
  recommendedSkillId: DuelistSkillId;
  recommendedSkillReason: string;
  curve: {
    lowMonsters: number;
    midMonsters: number;
    highMonsters: number;
    spells: number;
    catalysts: number;
    domains: number;
    traps: number;
    relics: number;
  };
  simulation: AutoBuildSimulation;
  fusionCoverage: FusionCoverageEntry[];
  hasCompleteMaximumSet: boolean;
  highlights: string[];
  warnings: string[];
}

export interface AutoBuildResult {
  ok: boolean;
  error?: string;
  mainDeck: string[];
  riftDeck: string[];
  report: AutoBuildReport;
}

const ALL_FACTIONS: Faction[] = ['pyroclast', 'cryo_mecha', 'umbra', 'sylvan', 'chrono'];

const FACTION_DISPLAY: Record<Faction, string> = {
  pyroclast: 'Pyroclast',
  cryo_mecha: 'Cryo-Mecha',
  umbra: 'Umbra',
  sylvan: 'Sylvan',
  chrono: 'Chrono',
};

const STRATEGY_LABELS: Record<ResolvedAutoBuildStrategy, string> = {
  balanced: 'Balanced Rush Tempo',
  aggro: 'Aggro Burn Rush',
  control: 'Fortress Control & Trap',
  fusion: 'Fusion Overload',
  maximum: 'Maximum Overlord Titan',
};

const MAX_MAIN_DECK = 30;
const MAX_RIFT_DECK = 5;
const MAX_COPIES = 3;

interface DiscoveredMaximumSet {
  setId: string;
  leftId: string;
  centerId: string;
  rightId: string;
  pieceIds: [string, string, string];
  factions: Faction[];
  maxAtk: number;
  title: string;
}

function discoverMaximumSets(registry: Record<string, CardDef>): DiscoveredMaximumSet[] {
  const bySet = new Map<string, { left?: CardDef; center?: CardDef; right?: CardDef }>();
  for (const def of Object.values(registry)) {
    if (!def.maximumSetId || !def.maximumPiece || def.isToken) continue;
    const entry = bySet.get(def.maximumSetId) ?? {};
    entry[def.maximumPiece] = def;
    bySet.set(def.maximumSetId, entry);
  }
  const sets: DiscoveredMaximumSet[] = [];
  for (const [setId, entry] of bySet.entries()) {
    if (entry.left && entry.center && entry.right) {
      const factions = Array.from(
        new Set<Faction>([entry.left.faction, entry.center.faction, entry.right.faction])
      );
      sets.push({
        setId,
        leftId: entry.left.id,
        centerId: entry.center.id,
        rightId: entry.right.id,
        pieceIds: [entry.left.id, entry.center.id, entry.right.id],
        factions,
        maxAtk: entry.center.maximumAtk ?? 4200,
        title: entry.center.name.replace(/\s*\[CORE\]\s*$/i, ''),
      });
    }
  }
  return sets;
}

function getOwnedMaximumSets(
  collection: Record<string, number>,
  registry: Record<string, CardDef>
): DiscoveredMaximumSet[] {
  return discoverMaximumSets(registry).filter((s) =>
    s.pieceIds.every((id) => ownedCap(collection, id) >= 1)
  );
}

function findCompleteMaximumSetInDeck(
  mainDeck: string[],
  registry: Record<string, CardDef>
): DiscoveredMaximumSet | null {
  for (const s of discoverMaximumSets(registry)) {
    if (s.pieceIds.every((id) => mainDeck.includes(id))) return s;
  }
  return null;
}

interface SlotBlueprint {
  lowMonsters: number;
  midMonsters: number;
  highMonsters: number;
  catalysts: number;
  domains: number;
  spells: number;
  traps: number;
  relics: number;
}

const STRATEGY_BLUEPRINTS: Record<ResolvedAutoBuildStrategy, SlotBlueprint> = {
  balanced: {
    lowMonsters: 13,
    midMonsters: 3,
    highMonsters: 2,
    catalysts: 2,
    domains: 1,
    spells: 4,
    traps: 4,
    relics: 1,
  },
  aggro: {
    lowMonsters: 14,
    midMonsters: 3,
    highMonsters: 2,
    catalysts: 2,
    domains: 1,
    spells: 4,
    traps: 2,
    relics: 2,
  },
  control: {
    lowMonsters: 12,
    midMonsters: 3,
    highMonsters: 2,
    catalysts: 2,
    domains: 1,
    spells: 4,
    traps: 5,
    relics: 1,
  },
  fusion: {
    lowMonsters: 13,
    midMonsters: 3,
    highMonsters: 1,
    catalysts: 3,
    domains: 1,
    spells: 5,
    traps: 3,
    relics: 1,
  },
  maximum: {
    lowMonsters: 13,
    midMonsters: 2,
    highMonsters: 2,
    catalysts: 2,
    domains: 1,
    spells: 5,
    traps: 4,
    relics: 1,
  },
};

type CardRole =
  | 'low_monster'
  | 'mid_monster'
  | 'high_monster'
  | 'catalyst'
  | 'domain'
  | 'spell'
  | 'trap'
  | 'relic'
  | 'fusion';

function getCardRole(def: CardDef): CardRole {
  if (def.type === 'fusion_apex') return 'fusion';
  if (def.type === 'vanguard') {
    if (def.level <= 4) return 'low_monster';
    if (def.level <= 6) return 'mid_monster';
    return 'high_monster';
  }
  if (def.type === 'ambush') return 'trap';
  if (def.type === 'relic') return 'relic';
  if (def.arcanaSubtype === 'fusion_catalyst') return 'catalyst';
  if (def.arcanaSubtype === 'domain') return 'domain';
  return 'spell';
}

function getAllEffects(def: CardDef) {
  return [
    ...(def.onPlay ?? []),
    ...(def.onSummon ?? []),
    ...(def.onFlip ?? []),
    ...(def.onAttack ?? []),
    ...(def.onDeath ?? []),
    ...(def.onResonate ?? []),
    ...(def.endOfTurn ?? []),
    ...(def.ambushEffects ?? []),
    ...(def.evolvedData?.onEvolve ?? []),
    ...(def.evolvedData?.onAttack ?? []),
    ...(def.evolvedData?.endOfTurn ?? []),
    ...(def.maximumOnAttack ?? []),
  ];
}

function hasEffectKind(def: CardDef, kinds: string[]): boolean {
  const effects = getAllEffects(def);
  return effects.some((e) => kinds.includes(e.kind));
}

function ownedCap(collection: Record<string, number>, cardId: string): number {
  return Math.min(MAX_COPIES, Math.max(0, Math.floor(collection[cardId] ?? 0)));
}

function countById(list: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of list) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

function countVanguardsByFaction(
  mainDeck: string[],
  registry: Record<string, CardDef>
): Record<Faction, number> {
  const res: Record<Faction, number> = {
    pyroclast: 0,
    cryo_mecha: 0,
    umbra: 0,
    sylvan: 0,
    chrono: 0,
  };
  for (const id of mainDeck) {
    const def = registry[id];
    if (!def || def.type !== 'vanguard') continue;
    res[def.faction] += 1;
  }
  return res;
}

export function hasOwnedMaximumSet(
  collection: Record<string, number>,
  registry: Record<string, CardDef>
): boolean {
  return getOwnedMaximumSets(collection, registry).length > 0;
}

/** Check how well a Fusion Apex's recipe is supported by the Main Deck's Vanguard factions. */
function evaluateFusionSupport(
  fusionDef: CardDef,
  factionCounts: Record<Faction, number>
): {
  feasible: boolean;
  status: 'optimal' | 'playable' | 'tight';
  supportScore: number;
  materialCounts: { label: string; count: number }[];
} {
  const recipe = fusionDef.fusionRecipe;
  if (!recipe || recipe.materials.length < 2) {
    return { feasible: false, status: 'tight', supportScore: 0, materialCounts: [] };
  }

  // Case 1: Wildcard distinct-faction fusion (e.g., Aether Sovereign)
  if (recipe.distinctFactions) {
    const sorted = ALL_FACTIONS.map((f) => ({ f, count: factionCounts[f] })).sort(
      (a, b) => b.count - a.count
    );
    const activeFactions = sorted.filter((x) => x.count >= 3);
    const topTwoSum = (sorted[0]?.count ?? 0) + (sorted[1]?.count ?? 0);
    const feasible = activeFactions.length >= 2 && topTwoSum >= 10;
    const status: 'optimal' | 'playable' | 'tight' =
      (sorted[1]?.count ?? 0) >= 6
        ? 'optimal'
        : (sorted[1]?.count ?? 0) >= 4
        ? 'playable'
        : 'tight';
    return {
      feasible,
      status,
      supportScore: feasible ? Math.min(100, topTwoSum * 6 + (sorted[1]?.count ?? 0) * 4) : 0,
      materialCounts: sorted.slice(0, 2).map((x) => ({
        label: FACTION_DISPLAY[x.f],
        count: x.count,
      })),
    };
  }

  // Count how many materials of each required faction the recipe asks for
  const reqByFaction = new Map<Faction, number>();
  for (const m of recipe.materials) {
    if (!m.faction) continue;
    reqByFaction.set(m.faction, (reqByFaction.get(m.faction) ?? 0) + 1);
  }

  // Case 2: Mono-faction pair (e.g., Eclipse Sovereign: 2 Umbra)
  if (reqByFaction.size === 1) {
    const [reqFaction, reqCount] = Array.from(reqByFaction.entries())[0];
    const have = factionCounts[reqFaction] ?? 0;
    const minNeeded = reqCount * 3; // 6 for 2-material mono fusion
    const feasible = have >= minNeeded;
    const status: 'optimal' | 'playable' | 'tight' =
      have >= 10 ? 'optimal' : have >= 8 ? 'playable' : 'tight';
    return {
      feasible,
      status,
      supportScore: feasible ? Math.min(100, have * 8.5) : 0,
      materialCounts: [{ label: FACTION_DISPLAY[reqFaction], count: have }],
    };
  }

  // Case 3: Dual-faction recipe (e.g., 1 Pyroclast + 1 Cryo-Mecha)
  let minHave = Infinity;
  let totalHave = 0;
  const materialCounts: { label: string; count: number }[] = [];
  for (const [f] of reqByFaction.entries()) {
    const have = factionCounts[f] ?? 0;
    minHave = Math.min(minHave, have);
    totalHave += have;
    materialCounts.push({ label: FACTION_DISPLAY[f], count: have });
  }

  const feasible = minHave >= 4;
  const status: 'optimal' | 'playable' | 'tight' =
    minHave >= 6 ? 'optimal' : minHave >= 5 ? 'playable' : 'tight';

  return {
    feasible,
    status,
    supportScore: feasible ? Math.min(100, minHave * 10 + totalHave * 2.5) : 0,
    materialCounts,
  };
}

function scoreCardForStrategy(
  def: CardDef,
  strategy: ResolvedAutoBuildStrategy,
  primaryFactions: Faction[],
  existingCounts: Record<string, number>,
  factionCounts: Record<Faction, number>,
  useMaximumSet: boolean,
  evolvableCount: number
): number {
  const role = getCardRole(def);
  const copiesAlready = existingCounts[def.id] ?? 0;
  const isPrimaryFaction = primaryFactions.includes(def.faction);
  const rarityBonus =
    def.rarity === 'mythic' ? 170 : def.rarity === 'epic' ? 110 : def.rarity === 'rare' ? 55 : 15;

  let score = rarityBonus;

  // Never put standalone Maximum Center Lv8 unless running THAT active Maximum Set
  if (def.maximumPiece === 'center' && (!useMaximumSet || !primaryFactions.includes(def.faction))) {
    return -1500;
  }

  if (role === 'low_monster' || role === 'mid_monster' || role === 'high_monster') {
    const atk = def.atk ?? 0;
    const defStat = def.def ?? 0;

    if (strategy === 'control') {
      score += defStat * 0.52 + atk * 0.36;
    } else if (strategy === 'aggro') {
      score += atk * 0.62 + defStat * 0.22;
    } else {
      score += atk * 0.48 + defStat * 0.34;
    }

    // Faction focus is critical for Fusion Materials + Resonate!
    if (isPrimaryFaction) {
      score += 920;
      // Encourage balanced material counts across primary factions (vital for Dual Fusions!)
      if (primaryFactions.length >= 2) {
        const myCount = factionCounts[def.faction] ?? 0;
        const avgPrimary =
          primaryFactions.reduce((acc, f) => acc + (factionCounts[f] ?? 0), 0) /
          primaryFactions.length;
        if (myCount < avgPrimary) score += 260;
        else if (myCount > avgPrimary + 2) score -= 220;
      }
    } else {
      score -= 480;
    }

    // Evolve capability
    if (def.evolvedData) {
      score += strategy === 'control' ? 280 : 340;
    }

    // Keywords
    if (def.keywords.includes('Ward')) score += strategy === 'control' ? 340 : 230;
    if (def.keywords.includes('Pierce')) score += strategy === 'aggro' ? 330 : 210;
    if (def.keywords.includes('Swift')) score += strategy === 'aggro' ? 340 : 220;
    if (def.keywords.includes('Lethal')) score += strategy === 'control' ? 320 : 260;
    if (def.keywords.includes('Drain')) score += 240;
    if (def.keywords.includes('Resonate')) {
      score += isPrimaryFaction ? 250 : 40;
    }

    // Effects
    if (hasEffectKind(def, ['draw', 'extra_normal_summon'])) {
      score += strategy === 'maximum' || strategy === 'fusion' ? 420 : 300;
    }
    if (hasEffectKind(def, ['destroy_unit', 'destroy_unit_if_atk_le', 'destroy_all_enemies_atk_le'])) {
      score += 290;
    }
    if (hasEffectKind(def, ['freeze_unit', 'freeze_all_enemies'])) {
      score += strategy === 'control' || strategy === 'maximum' ? 360 : 210;
    }
    if (hasEffectKind(def, ['bounce_unit'])) score += 250;
    if (hasEffectKind(def, ['revive_vanguard'])) score += 310;
    if (hasEffectKind(def, ['buff_all_friendly'])) {
      score += strategy === 'aggro' || strategy === 'balanced' ? 290 : 180;
    }
    if (hasEffectKind(def, ['damage_enemy_lp'])) {
      score += strategy === 'aggro' ? 280 : 140;
    }
    if (hasEffectKind(def, ['heal_lp'])) {
      score += strategy === 'control' || strategy === 'maximum' ? 230 : 120;
    }
    if (hasEffectKind(def, ['gain_evo_orb'])) score += 270;

    // Anti-brick penalty for duplicate Tribute monsters
    if (role === 'high_monster' && copiesAlready >= 1) score -= 420;
    if (role === 'mid_monster' && copiesAlready >= 2) score -= 240;
  } else if (role === 'catalyst') {
    // Aether Convergence draws 1 card after fusion, making it strictly stronger than Polymerization
    score += hasEffectKind(def, ['draw']) ? 1650 : 1380;
    if (copiesAlready >= 2 && strategy !== 'fusion') score -= 220;
  } else if (role === 'domain') {
    score += 780;
    if (isPrimaryFaction) score += 260;
    if (def.id === 'chrono_starlight_nexus') {
      score += strategy === 'fusion' || strategy === 'maximum' ? 520 : 300;
    } else if (def.id === 'pyro_caldera_domain') {
      score += strategy === 'aggro' ? 520 : 220;
    } else if (def.id === 'cryo_permafrost_citadel') {
      score += strategy === 'control' || strategy === 'maximum' ? 520 : 210;
    } else if (def.id === 'umbra_eclipse_sanctum') {
      score += primaryFactions.includes('umbra') || strategy === 'aggro' ? 460 : 200;
    } else if (def.id === 'sylvan_sanctuary') {
      score += strategy === 'control' || strategy === 'balanced' ? 420 : 220;
    } else if (def.id === 'chrono_dragon_spire') {
      score += strategy === 'aggro' || strategy === 'balanced' || strategy === 'fusion' ? 440 : 220;
    } else if (def.id === 'egypt_pyramid_domain') {
      score += strategy === 'balanced' || strategy === 'control' || strategy === 'fusion' || strategy === 'maximum' ? 500 : 340;
    } else if (def.id === 'ygg_worldtree_domain') {
      score += primaryFactions.includes('sylvan') || strategy === 'control' || strategy === 'maximum' ? 520 : 280;
    } else if (def.id === 'mag_arcane_circle') {
      score += primaryFactions.includes('chrono') || primaryFactions.includes('umbra') || strategy === 'aggro' ? 500 : 300;
    } else if (def.id === 'mech_repair_factory') {
      score += primaryFactions.includes('cryo_mecha') || strategy === 'maximum' ? 520 : 260;
    }
    // Domains stay on backline — never clutter with duplicates
    if (copiesAlready >= 1) score -= 900;
  } else if (role === 'spell') {
    score += 760;
    if (isPrimaryFaction) score += 110;

    if (hasEffectKind(def, ['draw'])) {
      score += strategy === 'maximum' || strategy === 'fusion' ? 560 : 390;
    }
    if (hasEffectKind(def, ['extra_normal_summon'])) {
      // Repurposed to Rush Draw +1 in Full Rush Duel
      score += strategy === 'maximum' || strategy === 'fusion' ? 430 : 320;
    }
    if (hasEffectKind(def, ['destroy_all_enemies_atk_le', 'destroy_all_enemies'])) {
      score += 460;
    }
    if (hasEffectKind(def, ['destroy_enemy_backrow'])) {
      score += strategy === 'aggro' || strategy === 'balanced' ? 420 : 310;
    }
    if (hasEffectKind(def, ['destroy_or_burn'])) {
      score += strategy === 'aggro' ? 420 : 300;
    }
    if (hasEffectKind(def, ['bounce_unit'])) score += 370;
    if (hasEffectKind(def, ['freeze_all_enemies'])) {
      score += strategy === 'control' || strategy === 'maximum' ? 480 : 310;
    }
    if (hasEffectKind(def, ['freeze_unit'])) {
      score += strategy === 'control' ? 350 : 210;
    }
    if (hasEffectKind(def, ['recover_void_to_hand'])) {
      // Huge in Maximum (recover discarded/destroyed Emperor piece!) & Fusion!
      score += strategy === 'maximum' ? 560 : strategy === 'fusion' ? 380 : 280;
    }
    if (hasEffectKind(def, ['revive_vanguard'])) {
      score += primaryFactions.includes('umbra') || strategy === 'fusion' ? 430 : 300;
    }
    if (hasEffectKind(def, ['gain_evo_orb'])) {
      score += evolvableCount >= 5 ? 410 : 180;
    }
    if (hasEffectKind(def, ['buff_unit', 'grant_keyword'])) {
      score += strategy === 'aggro' ? 410 : 220;
    }
    // Slight variety encouragement for 3rd copy of situational spells
    if (copiesAlready >= 2) score -= 180;
    if (def.id === 'chrono_aether_vessel' && copiesAlready >= 2) score -= 140; // Pay 1000 LP
  } else if (role === 'trap') {
    score += 800;
    if (isPrimaryFaction) score += 90;
    if (hasEffectKind(def, ['destroy_all_enemy_attackers'])) score += 620; // Mirror Force
    if (hasEffectKind(def, ['reflect_attacker_atk'])) {
      score += strategy === 'aggro' || strategy === 'control' ? 540 : 460;
    }
    if (hasEffectKind(def, ['negate_attack']) && hasEffectKind(def, ['draw'])) score += 500;
    if (hasEffectKind(def, ['counter_spell'])) score += 450;
    if (hasEffectKind(def, ['bounce_unit']) && hasEffectKind(def, ['draw'])) score += 440;
    if (hasEffectKind(def, ['destroy_attacker'])) score += 420;
    if (hasEffectKind(def, ['negate_attack', 'freeze_unit'])) {
      score += strategy === 'control' || strategy === 'maximum' ? 390 : 280;
    }
    if (hasEffectKind(def, ['damage_enemy_lp'])) {
      score += strategy === 'aggro' ? 360 : 230;
    }
    if (hasEffectKind(def, ['heal_lp'])) {
      score += strategy === 'control' || strategy === 'maximum' ? 280 : 180;
    }
    if (copiesAlready >= 2) score -= 180;
  } else if (role === 'relic') {
    score += 700;
    if (isPrimaryFaction) score += 120;
    const atkB = def.relicBonus?.atk ?? 0;
    const defB = def.relicBonus?.def ?? 0;
    if (strategy === 'control') {
      score += defB * 0.7 + atkB * 0.35;
    } else {
      score += atkB * 0.72 + defB * 0.25;
    }
    if (def.relicBonus?.keywords?.includes('Ward')) score += strategy === 'control' ? 260 : 160;
    if (def.relicBonus?.keywords?.includes('Pierce')) score += strategy === 'aggro' ? 240 : 150;
    if (def.relicBonus?.keywords?.includes('Drain')) score += 200;
    if (copiesAlready >= 1) score -= 240;
  }

  return score;
}

function scoreFusionApex(
  def: CardDef,
  strategy: ResolvedAutoBuildStrategy,
  supportScore: number
): number {
  let score = supportScore * 12 + (def.atk ?? 0) * 0.45 + (def.def ?? 0) * 0.25;
  if (def.rarity === 'mythic') score += 240;
  if (strategy === 'aggro') {
    if (def.keywords.includes('Pierce') || def.keywords.includes('Swift')) score += 280;
    if (hasEffectKind(def, ['damage_enemy_lp', 'buff_all_friendly'])) score += 220;
  } else if (strategy === 'control') {
    if (def.keywords.includes('Ward') || def.keywords.includes('Drain')) score += 280;
    if (hasEffectKind(def, ['freeze_all_enemies', 'destroy_all_enemies', 'destroy_unit'])) score += 250;
  } else {
    if (hasEffectKind(def, ['destroy_all_enemies', 'destroy_all_enemies_atk_le', 'draw'])) score += 260;
  }
  return score;
}

/** Deterministic Mulberry32 PRNG for reproducible opening-hand simulations. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canHandSatisfyAnyFusion(
  seenCards: CardDef[],
  riftFusions: CardDef[]
): boolean {
  const hasCatalyst = seenCards.some((c) => c.arcanaSubtype === 'fusion_catalyst');
  if (!hasCatalyst) return false;
  const vanguards = seenCards.filter((c) => c.type === 'vanguard');
  if (vanguards.length < 2) return false;

  for (const fus of riftFusions) {
    const recipe = fus.fusionRecipe;
    if (!recipe || recipe.materials.length < 2) continue;
    if (recipe.distinctFactions) {
      const uniq = new Set(vanguards.map((v) => v.faction));
      if (uniq.size >= recipe.materials.length) return true;
      continue;
    }
    const reqFactions = recipe.materials.map((m) => m.faction).filter(Boolean) as Faction[];
    if (reqFactions.length === 2) {
      if (reqFactions[0] === reqFactions[1]) {
        if (vanguards.filter((v) => v.faction === reqFactions[0]).length >= 2) return true;
      } else {
        const hasA = vanguards.some((v) => v.faction === reqFactions[0]);
        const hasB = vanguards.some((v) => v.faction === reqFactions[1]);
        if (hasA && hasB) return true;
      }
    }
  }
  return false;
}

export function simulateDeckConsistency(
  mainDeck: string[],
  riftDeck: string[],
  registry: Record<string, CardDef>,
  seed = 1337,
  trials = 250
): AutoBuildSimulation {
  if (mainDeck.length === 0) {
    return {
      trials,
      playableTurn1Rate: 0,
      strongOpeningRate: 0,
      brickRate: 100,
      fusionReadyRate: null,
      maximumNearRate: null,
      autoTunedSwaps: 0,
    };
  }

  const rng = mulberry32(seed);
  const defs = mainDeck.map((id) => registry[id]).filter(Boolean);
  const riftDefs = riftDeck.map((id) => registry[id]).filter(Boolean);
  const completeMax = findCompleteMaximumSetInDeck(mainDeck, registry);
  const hasMaximum = Boolean(completeMax);

  let playableT1 = 0;
  let strongOpen = 0;
  let bricks = 0;
  let fusionReady = 0;
  let maxNear = 0;

  const indices = defs.map((_, i) => i);

  for (let t = 0; t < trials; t++) {
    // Fisher-Yates shuffle on index copy (only need first 12 elements)
    const deck = indices.slice();
    const drawLimit = Math.min(deck.length, 12);
    for (let i = 0; i < drawLimit; i++) {
      const j = i + Math.floor(rng() * (deck.length - i));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }

    const hand5 = deck.slice(0, Math.min(5, deck.length)).map((idx) => defs[idx]);
    const lowCount = hand5.filter((c) => c.type === 'vanguard' && c.level <= 4).length;
    const backrowCount = hand5.filter(
      (c) => c.type === 'arcana' || c.type === 'ambush' || c.type === 'relic'
    ).length;

    if (lowCount >= 1) {
      playableT1 += 1;
      if (lowCount >= 2 || (lowCount >= 1 && backrowCount >= 1)) {
        strongOpen += 1;
      }
    } else {
      bricks += 1;
    }

    if (riftDefs.length > 0) {
      const seen9 = deck.slice(0, Math.min(9, deck.length)).map((idx) => defs[idx]);
      if (canHandSatisfyAnyFusion(seen9, riftDefs)) {
        fusionReady += 1;
      }
    }

    if (hasMaximum) {
      const seen10 = deck.slice(0, Math.min(10, deck.length)).map((idx) => defs[idx]);
      const piecesSeen = new Set(
        seen10.filter((c) => c.maximumPiece).map((c) => c.maximumPiece)
      );
      if (piecesSeen.size >= 2) {
        maxNear += 1;
      }
    }
  }

  return {
    trials,
    playableTurn1Rate: Math.round((playableT1 / trials) * 100),
    strongOpeningRate: Math.round((strongOpen / trials) * 100),
    brickRate: Math.round((bricks / trials) * 100),
    fusionReadyRate: riftDefs.length > 0 ? Math.round((fusionReady / trials) * 100) : null,
    maximumNearRate: hasMaximum ? Math.round((maxNear / trials) * 100) : null,
    autoTunedSwaps: 0,
  };
}

interface CandidateBuild {
  mainDeck: string[];
  riftDeck: string[];
  strategy: ResolvedAutoBuildStrategy;
  primaryFactions: Faction[];
  fusionCoverage: FusionCoverageEntry[];
  hasCompleteMaximumSet: boolean;
  activeMaxSetTitle?: string;
  activeMaxAtk?: number;
  simulation: AutoBuildSimulation;
  synergyScore: number;
  rawQuality: number;
  warnings: string[];
}

function selectPlayableRiftDeck(
  mainDeck: string[],
  lockedRift: string[],
  strategy: ResolvedAutoBuildStrategy,
  collection: Record<string, number>,
  registry: Record<string, CardDef>
): { riftDeck: string[]; coverage: FusionCoverageEntry[] } {
  const factionCounts = countVanguardsByFaction(mainDeck, registry);
  const catalystCount = mainDeck.filter(
    (id) => registry[id]?.arcanaSubtype === 'fusion_catalyst'
  ).length;

  const riftDeck: string[] = [...lockedRift];
  const usedCounts = countById(riftDeck);

  if (catalystCount > 0 && riftDeck.length < MAX_RIFT_DECK) {
    const ownedFusions = Object.values(registry).filter(
      (c) => c.type === 'fusion_apex' && !c.isToken && ownedCap(collection, c.id) > 0
    );

    const ranked = ownedFusions
      .map((fus) => {
        const sup = evaluateFusionSupport(fus, factionCounts);
        return {
          def: fus,
          sup,
          score: sup.feasible ? scoreFusionApex(fus, strategy, sup.supportScore) : -1,
        };
      })
      .filter((x) => x.sup.feasible)
      .sort((a, b) => b.score - a.score);

    // First pass: add 1 copy of each distinct feasible fusion (broadest toolbox!)
    for (const item of ranked) {
      if (riftDeck.length >= MAX_RIFT_DECK) break;
      const cur = usedCounts[item.def.id] ?? 0;
      const cap = ownedCap(collection, item.def.id);
      if (cur === 0 && cur < cap) {
        riftDeck.push(item.def.id);
        usedCounts[item.def.id] = cur + 1;
      }
    }

    // Second pass: double up on strongest feasible fusions up to max 5 slots
    for (const item of ranked) {
      if (riftDeck.length >= MAX_RIFT_DECK) break;
      const cap = ownedCap(collection, item.def.id);
      const maxPerFusion = ranked.length >= 3 ? 2 : 3;
      while (riftDeck.length < MAX_RIFT_DECK && (usedCounts[item.def.id] ?? 0) < Math.min(cap, maxPerFusion)) {
        riftDeck.push(item.def.id);
        usedCounts[item.def.id] = (usedCounts[item.def.id] ?? 0) + 1;
      }
    }
  }

  // Build transparent coverage report for every unique Fusion in Rift Deck
  const uniqueCounts = countById(riftDeck);
  const coverage: FusionCoverageEntry[] = [];
  for (const [id, copies] of Object.entries(uniqueCounts)) {
    const def = registry[id];
    if (!def) continue;
    const sup = evaluateFusionSupport(def, factionCounts);
    coverage.push({
      cardId: id,
      name: def.name,
      recipeSummary: def.fusionRecipe?.summary ?? '2 Vanguards',
      copies,
      materialCounts: sup.materialCounts,
      status: sup.feasible ? sup.status : 'tight',
    });
  }

  return { riftDeck, coverage };
}

function buildSingleCandidate(
  strategy: ResolvedAutoBuildStrategy,
  primaryFactions: Faction[],
  collection: Record<string, number>,
  registry: Record<string, CardDef>,
  lockedMain: string[],
  lockedRift: string[],
  seed: number
): CandidateBuild {
  const allMainOwned = Object.values(registry).filter(
    (c) => c.type !== 'fusion_apex' && !c.isToken && ownedCap(collection, c.id) > 0
  );

  const ownedMaxSets = getOwnedMaximumSets(collection, registry);
  const matchingMaxSet =
    strategy === 'maximum' && ownedMaxSets.length > 0
      ? [...ownedMaxSets].sort((a, b) => {
          const covA = a.factions.filter((f) => primaryFactions.includes(f)).length / a.factions.length;
          const covB = b.factions.filter((f) => primaryFactions.includes(f)).length / b.factions.length;
          const coreA = primaryFactions.includes(registry[a.centerId]?.faction) ? 1 : 0;
          const coreB = primaryFactions.includes(registry[b.centerId]?.faction) ? 1 : 0;
          return coreB - coreA || covB - covA || b.maxAtk - a.maxAtk;
        })[0]
      : null;
  const canRunMaximum = ownedMaxSets.length > 0;
  const useMaximumSet = Boolean(matchingMaxSet);
  const activeMaxPieceSet = new Set<string>(matchingMaxSet ? matchingMaxSet.pieceIds : []);

  const mainDeck: string[] = [...lockedMain];
  const lockedCount = lockedMain.length;
  const usedCounts = countById(mainDeck);

  const canAdd = (cardId: string): boolean => {
    if (mainDeck.length >= MAX_MAIN_DECK) return false;
    const cap = ownedCap(collection, cardId);
    return (usedCounts[cardId] ?? 0) < cap;
  };

  const addCard = (cardId: string): boolean => {
    if (!canAdd(cardId)) return false;
    mainDeck.push(cardId);
    usedCounts[cardId] = (usedCounts[cardId] ?? 0) + 1;
    return true;
  };

  // Step 1: If running Maximum Titan strategy, lock in 1-2 complete sets of the matching Titan's [L]/[CORE]/[R]!
  if (matchingMaxSet) {
    const completeSetsOwned = Math.min(
      ownedCap(collection, matchingMaxSet.leftId),
      ownedCap(collection, matchingMaxSet.centerId),
      ownedCap(collection, matchingMaxSet.rightId)
    );
    const targetSets = Math.min(2, completeSetsOwned);
    for (let s = 0; s < targetSets; s++) {
      for (const pieceId of matchingMaxSet.pieceIds) {
        if ((usedCounts[pieceId] ?? 0) < s + 1) {
          addCard(pieceId);
        }
      }
    }
  }

  // Step 2: Determine whether Fusion Catalysts are actually useful for this faction set & collection
  const ownedCatalysts = allMainOwned.filter((c) => c.arcanaSubtype === 'fusion_catalyst');
  const totalCatalystCopies = ownedCatalysts.reduce((sum, c) => sum + ownedCap(collection, c.id), 0);

  // Check if player owns at least 1 Fusion Apex potentially compatible with primaryFactions (or lockedRift)
  const ownedFusions = Object.values(registry).filter(
    (c) => c.type === 'fusion_apex' && !c.isToken && ownedCap(collection, c.id) > 0
  );
  const hypotheticalCounts: Record<Faction, number> = {
    pyroclast: primaryFactions.includes('pyroclast') ? 7 : 0,
    cryo_mecha: primaryFactions.includes('cryo_mecha') ? 7 : 0,
    umbra: primaryFactions.includes('umbra') ? 7 : 0,
    sylvan: primaryFactions.includes('sylvan') ? 7 : 0,
    chrono: primaryFactions.includes('chrono') ? 7 : 0,
  };
  const hasCompatibleFusion =
    lockedRift.length > 0 ||
    ownedFusions.some((f) => evaluateFusionSupport(f, hypotheticalCounts).feasible);

  const blueprint: SlotBlueprint = { ...STRATEGY_BLUEPRINTS[strategy] };
  if (!hasCompatibleFusion || totalCatalystCopies === 0) {
    const freed = blueprint.catalysts;
    blueprint.catalysts = 0;
    blueprint.lowMonsters += Math.ceil(freed / 2);
    blueprint.spells += Math.floor(freed / 2);
  }

  // Helper to pick best card matching allowed roles
  const pickNextBest = (allowedRoles: CardRole[]): string | null => {
    const factionCounts = countVanguardsByFaction(mainDeck, registry);
    const evolvableCount = mainDeck.filter((id) => Boolean(registry[id]?.evolvedData)).length;

    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const def of allMainOwned) {
      if (!canAdd(def.id)) continue;
      const role = getCardRole(def);
      if (!allowedRoles.includes(role)) continue;

      const s = scoreCardForStrategy(
        def,
        strategy,
        primaryFactions,
        usedCounts,
        factionCounts,
        useMaximumSet,
        evolvableCount
      );
      if (s > bestScore) {
        bestScore = s;
        bestId = def.id;
      }
    }

    return bestScore > -1000 ? bestId : null;
  };

  const countRole = (role: CardRole): number =>
    mainDeck.filter((id) => {
      const d = registry[id];
      return d ? getCardRole(d) === role : false;
    }).length;

  const fillBucket = (role: CardRole, target: number) => {
    let guard = 0;
    while (mainDeck.length < MAX_MAIN_DECK && countRole(role) < target && guard < 35) {
      guard += 1;
      const next = pickNextBest([role]);
      if (!next) break;
      addCard(next);
    }
  };

  // Step 3: Fill buckets in strict priority order (Core Low Monsters -> Catalysts -> Traps -> Spells -> Mid/High -> Domain -> Relic)
  fillBucket('low_monster', blueprint.lowMonsters);
  fillBucket('catalyst', blueprint.catalysts);
  fillBucket('domain', blueprint.domains);
  fillBucket('trap', blueprint.traps);
  fillBucket('spell', blueprint.spells);
  fillBucket('mid_monster', blueprint.midMonsters);
  fillBucket('high_monster', blueprint.highMonsters);
  fillBucket('relic', blueprint.relics);

  // Step 4: Fill any remaining slots (if player had sparse copies in a bucket) prioritizing playable low monsters & spells
  let safety = 0;
  while (mainDeck.length < MAX_MAIN_DECK && safety < 40) {
    safety += 1;
    const next =
      pickNextBest(['low_monster', 'spell', 'trap']) ??
      pickNextBest(['mid_monster', 'relic', 'domain', 'high_monster']) ??
      pickNextBest(['catalyst']);
    if (!next) break;
    addCard(next);
  }

  // Step 5: Match Rift Deck strictly to actual Main Deck materials
  let { riftDeck, coverage } = selectPlayableRiftDeck(
    mainDeck,
    lockedRift,
    strategy,
    collection,
    registry
  );

  // Step 6: Dead Catalyst Cleanup — if Rift Deck ended up empty, replace unlocked Fusion Catalysts!
  if (riftDeck.length === 0) {
    for (let i = mainDeck.length - 1; i >= lockedCount; i--) {
      const id = mainDeck[i];
      if (registry[id]?.arcanaSubtype === 'fusion_catalyst') {
        mainDeck.splice(i, 1);
        usedCounts[id] = Math.max(0, (usedCounts[id] ?? 1) - 1);
        const replacement =
          pickNextBest(['low_monster', 'spell', 'trap']) ??
          pickNextBest(['mid_monster', 'relic']);
        if (replacement) addCard(replacement);
      }
    }
  }

  // Step 7: Run deterministic 250-trial Opening Hand simulation + Auto-Tune anti-brick swaps!
  let simulation = simulateDeckConsistency(mainDeck, riftDeck, registry, seed, 250);
  let autoTunedSwaps = 0;

  while (simulation.brickRate > 12 && autoTunedSwaps < 4 && mainDeck.length === MAX_MAIN_DECK) {
    // Find an unlocked non-Maximum high/mid monster or relic to swap for an owned low monster
    const swapIdx = (() => {
      for (const targetRole of ['high_monster', 'relic', 'mid_monster', 'domain'] as CardRole[]) {
        for (let i = mainDeck.length - 1; i >= lockedCount; i--) {
          const id = mainDeck[i];
          if (useMaximumSet && activeMaxPieceSet.has(id)) {
            continue;
          }
          const d = registry[id];
          if (d && getCardRole(d) === targetRole) return i;
        }
      }
      return -1;
    })();

    if (swapIdx === -1) break;

    const removedId = mainDeck[swapIdx];
    mainDeck.splice(swapIdx, 1);
    usedCounts[removedId] = Math.max(0, (usedCounts[removedId] ?? 1) - 1);

    const lowPick = pickNextBest(['low_monster']);
    if (!lowPick) {
      // Revert if no low monster available
      mainDeck.splice(swapIdx, 0, removedId);
      usedCounts[removedId] = (usedCounts[removedId] ?? 0) + 1;
      break;
    }

    addCard(lowPick);
    autoTunedSwaps += 1;
    ({ riftDeck, coverage } = selectPlayableRiftDeck(
      mainDeck,
      lockedRift,
      strategy,
      collection,
      registry
    ));
    simulation = simulateDeckConsistency(mainDeck, riftDeck, registry, seed + autoTunedSwaps, 250);
  }
  simulation.autoTunedSwaps = autoTunedSwaps;

  // Step 8: Compute transparent Synergy Score (0-100) + raw quality for comparing candidates
  const finalFactionCounts = countVanguardsByFaction(mainDeck, registry);
  const lowCount = countRole('low_monster');
  const midCount = countRole('mid_monster');
  const highCount = countRole('high_monster');
  const catalystCount = countRole('catalyst');
  const trapCount = countRole('trap');
  const spellCount = countRole('spell') + catalystCount + countRole('domain');
  const totalVanguards = lowCount + midCount + highCount;

  // Component A: Consistency (0-30)
  const consistencyPts = Math.min(30, (simulation.playableTurn1Rate / 100) * 30);

  // Component B: Rush Curve Health (0-20)
  let curvePts = 20;
  if (lowCount < 10) curvePts -= (10 - lowCount) * 3;
  if (lowCount > 16) curvePts -= (lowCount - 16) * 2;
  if (highCount > 4) curvePts -= (highCount - 4) * 4;
  if (spellCount < 4) curvePts -= (4 - spellCount) * 2;
  if (trapCount < 2) curvePts -= (2 - trapCount) * 2;
  curvePts = Math.max(4, Math.min(20, curvePts));

  // Component C: Fusion & Maximum Engine Cohesion (0-25)
  let enginePts = 12;
  if (riftDeck.length > 0 && catalystCount > 0) {
    const optimalFusions = coverage.filter((c) => c.status === 'optimal').length;
    const playableFusions = coverage.filter((c) => c.status === 'playable').length;
    enginePts = Math.min(
      25,
      10 +
        optimalFusions * 4.5 +
        playableFusions * 3 +
        Math.min(3, catalystCount) * 2 +
        ((simulation.fusionReadyRate ?? 0) / 100) * 5
    );
  }
  const finalMaxSet = findCompleteMaximumSetInDeck(mainDeck, registry);
  const hasCompleteMaxInDeck = Boolean(finalMaxSet);
  if (hasCompleteMaxInDeck) {
    enginePts = Math.min(25, enginePts + 7);
  }

  // Component D: Faction Focus & Card Quality (0-25)
  const primaryVanguards = primaryFactions.reduce(
    (sum, f) => sum + (finalFactionCounts[f] ?? 0),
    0
  );
  const focusRatio = totalVanguards > 0 ? primaryVanguards / totalVanguards : 0;
  const evolvableCount = mainDeck.filter((id) => Boolean(registry[id]?.evolvedData)).length;
  const mythicEpicCount = mainDeck.filter((id) => {
    const r = registry[id]?.rarity;
    return r === 'mythic' || r === 'epic';
  }).length;
  const qualityPts = Math.min(
    25,
    focusRatio * 14 + Math.min(6, evolvableCount * 0.75) + Math.min(5, mythicEpicCount * 0.7)
  );

  // Strategy alignment bonus so 'auto' picks the genuinely strongest deck for user's collection
  let strategyBonus = 0;
  if (strategy === 'fusion' && riftDeck.length >= 3 && catalystCount >= 2) strategyBonus += 4;
  if (strategy === 'maximum' && hasCompleteMaxInDeck) strategyBonus += 3;
  if (strategy === 'control' && trapCount >= 4) strategyBonus += 2;
  if (strategy === 'aggro' && lowCount >= 13) strategyBonus += 2;

  const synergyScore = Math.max(
    45,
    Math.min(99, Math.round(consistencyPts + curvePts + enginePts + qualityPts))
  );
  const rawQuality = consistencyPts + curvePts + enginePts + qualityPts + strategyBonus + (riftDeck.length * 0.6);

  const warnings: string[] = [];
  if (mainDeck.length < MAX_MAIN_DECK) {
    warnings.push(
      `Koleksi baru cukup untuk ${mainDeck.length}/30 kartu Main Deck — buka Booster Pack atau craft kartu untuk melengkapi.`
    );
  }
  if (totalCatalystCopies === 0 && ownedFusions.length > 0) {
    warnings.push(
      'Koleksi belum memiliki Fusion Catalyst (Rift Polymerization / Aether Convergence), sehingga Rift Deck dikosongkan agar tidak ada kartu mati.'
    );
  }
  if (strategy === 'maximum' && !canRunMaximum) {
    warnings.push(
      'Belum ada set Maximum Titan yang lengkap ([L], [CORE], [R]) — deck dirakit sebagai Rush Tempo sampai ke-3 bagian dimiliki.'
    );
  }

  return {
    mainDeck,
    riftDeck,
    strategy,
    primaryFactions,
    fusionCoverage: coverage,
    hasCompleteMaximumSet: hasCompleteMaxInDeck,
    activeMaxSetTitle: finalMaxSet?.title,
    activeMaxAtk: finalMaxSet?.maxAtk,
    simulation,
    synergyScore,
    rawQuality,
    warnings,
  };
}

function chooseRecommendedSkill(
  candidate: CandidateBuild,
  registry: Record<string, CardDef>
): { id: DuelistSkillId; reason: string } {
  const factionCounts = countVanguardsByFaction(candidate.mainDeck, registry);
  const evolvableCount = candidate.mainDeck.filter((id) => Boolean(registry[id]?.evolvedData)).length;
  const topFaction = [...candidate.primaryFactions].sort(
    (a, b) => (factionCounts[b] ?? 0) - (factionCounts[a] ?? 0)
  )[0];

  if (candidate.hasCompleteMaximumSet) {
    return {
      id: 'destiny_draw',
      reason: 'Langsung menarik bagian Maximum Emperor atau Fusion Catalyst dari Deck ke tangan.',
    };
  }
  if (candidate.strategy === 'fusion' && candidate.riftDeck.length >= 2) {
    return {
      id: 'destiny_draw',
      reason: 'Menarik Rift Polymerization / Ace langsung dari Deck untuk combo Fusion konsisten.',
    };
  }
  if (candidate.strategy === 'aggro' || topFaction === 'pyroclast') {
    return {
      id: 'volcanic_ignition',
      reason: '+500 ATK ke seluruh board + 500 Burn Damage untuk menutup duel Rush lebih cepat.',
    };
  }
  if (candidate.strategy === 'control' || topFaction === 'cryo_mecha') {
    return {
      id: 'absolute_aegis',
      reason: 'Freeze boss lawan + grant Ward & +400 DEF agar pertahanan tembokmu tak tertembus.',
    };
  }
  if (topFaction === 'umbra') {
    return {
      id: 'void_resurrection',
      reason: 'Bangkitkan kembali monster terkuat dari Void langsung ke arena + pulihkan +600 LP.',
    };
  }
  if (topFaction === 'sylvan' || evolvableCount >= 8) {
    return {
      id: 'canopy_awakening',
      reason: 'Buka Evo Orb lebih cepat di Turn 2 + ekstra +1 Orb & +1000 LP untuk monster Evo.',
    };
  }
  return {
    id: 'destiny_draw',
    reason: 'Fleksibel menarik Ace / Fusion Spell saat momen krusial Rush Duel.',
  };
}

function scoreGrade(score: number): AutoBuildReport['grade'] {
  if (score >= 92) return 'S+';
  if (score >= 85) return 'S';
  if (score >= 78) return 'A+';
  if (score >= 70) return 'A';
  return 'B';
}

function generateCandidateFactionSets(
  strategy: ResolvedAutoBuildStrategy,
  focusFaction: Faction | 'auto',
  lockedMain: string[],
  lockedRift: string[],
  collection: Record<string, number>,
  registry: Record<string, CardDef>
): Faction[][] {
  // Maximum strategy dynamically derives faction candidates from ALL owned complete 3-piece Maximum Titans!
  const ownedMaxSets = getOwnedMaximumSets(collection, registry);
  if (strategy === 'maximum' && ownedMaxSets.length > 0) {
    // If user explicitly picked a focusFaction that owns a dedicated Maximum CORE, lock onto those Titan(s) first!
    const coreMatches =
      focusFaction !== 'auto'
        ? ownedMaxSets.filter((ms) => registry[ms.centerId]?.faction === focusFaction)
        : [];
    const targetMaxSets = coreMatches.length > 0 ? coreMatches : ownedMaxSets;

    const sets: Faction[][] = [];
    for (const ms of targetMaxSets) {
      if (focusFaction === 'auto' || ms.factions.includes(focusFaction)) {
        sets.push(ms.factions);
        if (ms.factions.length === 1) {
          // Also allow pairing mono-Maximum with Chrono for extra Draw/Catalyst support
          if (ms.factions[0] !== 'chrono') sets.push([ms.factions[0], 'chrono']);
        }
      }
    }
    if (sets.length > 0) return sets;
    return [[focusFaction as Faction, ...ownedMaxSets[0].factions.slice(0, 2)]];
  }

  // If user locked Rift Fusions, extract their required factions first!
  const requiredByLockedRift = new Set<Faction>();
  for (const id of lockedRift) {
    const recipe = registry[id]?.fusionRecipe;
    if (!recipe) continue;
    for (const m of recipe.materials) {
      if (m.faction) requiredByLockedRift.add(m.faction);
    }
  }

  // Also check dominant factions already locked in Main Deck
  const lockedFactions = countVanguardsByFaction(lockedMain, registry);
  const topLockedFactions = ALL_FACTIONS.filter((f) => lockedFactions[f] > 0).sort(
    (a, b) => lockedFactions[b] - lockedFactions[a]
  );

  // Build all 10 dual-faction pairs + all 5 mono-faction sets (every faction now has Mono-Faction Fusion Apexes!)
  const allSets: Faction[][] = [];
  for (let i = 0; i < ALL_FACTIONS.length; i++) {
    for (let j = i + 1; j < ALL_FACTIONS.length; j++) {
      allSets.push([ALL_FACTIONS[i], ALL_FACTIONS[j]]);
    }
  }
  for (const f of ALL_FACTIONS) {
    allSets.push([f]);
  }

  // Filter by focusFaction if explicitly chosen
  let filtered =
    focusFaction !== 'auto'
      ? allSets.filter((pair) => pair.includes(focusFaction))
      : allSets;

  if (focusFaction !== 'auto' && !filtered.some((s) => s.length === 1 && s[0] === focusFaction)) {
    filtered.push([focusFaction]);
  }

  // Prioritize sets that cover locked Rift Fusions or locked Main Deck factions
  if (requiredByLockedRift.size > 0 || topLockedFactions.length > 0) {
    filtered = [...filtered].sort((a, b) => {
      const scoreSet = (set: Faction[]) => {
        let s = 0;
        for (const req of requiredByLockedRift) {
          if (set.includes(req)) s += 50;
        }
        for (const f of topLockedFactions.slice(0, 2)) {
          if (set.includes(f)) s += lockedFactions[f] * 6;
        }
        return s;
      };
      return scoreSet(b) - scoreSet(a);
    });
    return filtered.slice(0, 5);
  }

  // Rank sets by owned vanguard + owned matching fusion depth so we only evaluate strong pairs
  const ownedVanguardsByFaction: Record<Faction, number> = {
    pyroclast: 0,
    cryo_mecha: 0,
    umbra: 0,
    sylvan: 0,
    chrono: 0,
  };
  for (const card of Object.values(registry)) {
    if (card.type === 'vanguard' && !card.isToken) {
      ownedVanguardsByFaction[card.faction] += ownedCap(collection, card.id);
    }
  }

  return filtered
    .sort((a, b) => {
      const sumA = a.reduce((acc, f) => acc + ownedVanguardsByFaction[f], 0);
      const sumB = b.reduce((acc, f) => acc + ownedVanguardsByFaction[f], 0);
      return sumB - sumA;
    })
    .slice(0, 7);
}

/**
 * Pure TypeScript Smart Auto-Build Deck Optimizer for Aetherbound: Rift Duel.
 * Evaluates owned cards, Fusion recipes, Maximum set integrity, Rush Duel curve,
 * and deterministic 250-trial opening hand consistency to build a legal, cohesive deck.
 */
export function autoBuildDeck(
  collection: Record<string, number>,
  registry: Record<string, CardDef>,
  options: AutoBuildOptions
): AutoBuildResult {
  const focusFaction = options.focusFaction ?? 'auto';
  const seed = options.seed ?? 1337;

  // Sanitize locked cards if Smart Auto-Fill mode is enabled
  const lockedMain: string[] = [];
  const lockedRift: string[] = [];
  if (options.fillRemaining) {
    const used: Record<string, number> = {};
    for (const id of options.lockedMain ?? []) {
      const def = registry[id];
      if (!def || def.type === 'fusion_apex' || def.isToken) continue;
      const cur = used[id] ?? 0;
      if (lockedMain.length < MAX_MAIN_DECK && cur < ownedCap(collection, id)) {
        lockedMain.push(id);
        used[id] = cur + 1;
      }
    }
    for (const id of options.lockedRift ?? []) {
      const def = registry[id];
      if (!def || def.type !== 'fusion_apex' || def.isToken) continue;
      const cur = used[id] ?? 0;
      if (lockedRift.length < MAX_RIFT_DECK && cur < ownedCap(collection, id)) {
        lockedRift.push(id);
        used[id] = cur + 1;
      }
    }
  }

  const totalOwnedMain = Object.values(registry)
    .filter((c) => c.type !== 'fusion_apex' && !c.isToken)
    .reduce((sum, c) => sum + ownedCap(collection, c.id), 0);

  if (totalOwnedMain === 0) {
    return {
      ok: false,
      error: 'Koleksi kartu masih kosong — buka Booster Pack terlebih dahulu.',
      mainDeck: [],
      riftDeck: [],
      report: {
        grade: 'B',
        synergyScore: 0,
        resolvedStrategy: 'balanced',
        strategyLabel: STRATEGY_LABELS.balanced,
        primaryFactions: ['pyroclast', 'cryo_mecha'],
        suggestedName: 'Rift Starter',
        recommendedSkillId: 'volcanic_ignition',
        recommendedSkillReason: 'Default Rush Skill.',
        curve: {
          lowMonsters: 0,
          midMonsters: 0,
          highMonsters: 0,
          spells: 0,
          catalysts: 0,
          domains: 0,
          traps: 0,
          relics: 0,
        },
        simulation: simulateDeckConsistency([], [], registry, seed, 100),
        fusionCoverage: [],
        hasCompleteMaximumSet: false,
        highlights: [],
        warnings: ['Tidak ada kartu dimiliki di koleksi.'],
      },
    };
  }

  const canMax = hasOwnedMaximumSet(collection, registry);
  const strategiesToTest: ResolvedAutoBuildStrategy[] =
    options.strategy === 'auto'
      ? canMax
        ? ['balanced', 'aggro', 'control', 'fusion', 'maximum']
        : ['balanced', 'aggro', 'control', 'fusion']
      : [options.strategy];

  let best: CandidateBuild | null = null;

  for (const strat of strategiesToTest) {
    const factionSets = generateCandidateFactionSets(
      strat,
      focusFaction,
      lockedMain,
      lockedRift,
      collection,
      registry
    );

    for (let idx = 0; idx < factionSets.length; idx++) {
      const candidate = buildSingleCandidate(
        strat,
        factionSets[idx],
        collection,
        registry,
        lockedMain,
        lockedRift,
        seed + idx * 17
      );
      if (!best || candidate.rawQuality > best.rawQuality) {
        best = candidate;
      }
    }
  }

  // Guaranteed non-null since totalOwnedMain > 0 and strategiesToTest.length >= 1
  const winner = best!;

  // Sort final Main Deck cleanly (Monsters Lv1->8, then Spells/Catalysts/Domains, then Traps, then Relics)
  const roleOrder: Record<CardRole, number> = {
    low_monster: 1,
    mid_monster: 2,
    high_monster: 3,
    catalyst: 4,
    domain: 5,
    spell: 6,
    trap: 7,
    relic: 8,
    fusion: 9,
  };
  const sortedMain = [...winner.mainDeck].sort((a, b) => {
    const da = registry[a];
    const db = registry[b];
    if (!da || !db) return a.localeCompare(b);
    const ra = roleOrder[getCardRole(da)];
    const rb = roleOrder[getCardRole(db)];
    return ra - rb || da.level - db.level || da.name.localeCompare(db.name);
  });

  const sortedRift = [...winner.riftDeck].sort((a, b) => {
    const da = registry[a];
    const db = registry[b];
    if (!da || !db) return a.localeCompare(b);
    return (db.atk ?? 0) - (da.atk ?? 0) || da.name.localeCompare(db.name);
  });

  // Compute final curve breakdown
  let lowMonsters = 0;
  let midMonsters = 0;
  let highMonsters = 0;
  let catalysts = 0;
  let domains = 0;
  let instantSpells = 0;
  let traps = 0;
  let relics = 0;

  for (const id of sortedMain) {
    const def = registry[id];
    if (!def) continue;
    switch (getCardRole(def)) {
      case 'low_monster':
        lowMonsters += 1;
        break;
      case 'mid_monster':
        midMonsters += 1;
        break;
      case 'high_monster':
        highMonsters += 1;
        break;
      case 'catalyst':
        catalysts += 1;
        break;
      case 'domain':
        domains += 1;
        break;
      case 'spell':
        instantSpells += 1;
        break;
      case 'trap':
        traps += 1;
        break;
      case 'relic':
        relics += 1;
        break;
    }
  }

  const skillRec = chooseRecommendedSkill(winner, registry);

  // Build crisp synergy highlights
  const factionNames = winner.primaryFactions.map((f) => FACTION_DISPLAY[f]).join(' × ');
  const highlights: string[] = [];

  highlights.push(
    `Core faksi ${factionNames} (${lowMonsters} Vanguard ★1–4 + ${midMonsters + highMonsters} Tribute) untuk combo Rush & Resonate stabil.`
  );

  if (sortedRift.length > 0 && catalysts > 0) {
    const optimalCount = winner.fusionCoverage.filter((c) => c.status === 'optimal').length;
    highlights.push(
      `${sortedRift.length} Rift Fusion Apex aktif (${optimalCount} resep optimal) didukung ${catalysts}× Fusion Catalyst — siap Fusion ${winner.simulation.fusionReadyRate ?? 0}% di 3 turn awal.`
    );
  }

  if (winner.hasCompleteMaximumSet) {
    const titanLabel = winner.activeMaxSetTitle ?? 'Maximum Titan';
    const titanAtk = winner.activeMaxAtk ?? 4200;
    highlights.push(
      `Set penuh ${titanLabel} [L]/[CORE]/[R] (${titanAtk} MAXIMUM ATK) terpasang bersama kartu Draw & perlindungan Trap.`
    );
  }

  highlights.push(
    `Simulasi ${winner.simulation.trials}× opening hand: ${winner.simulation.playableTurn1Rate}% langsung playable Turn 1 (Brick risk hanya ${winner.simulation.brickRate}%).`
  );

  if (options.fillRemaining && lockedMain.length > 0) {
    highlights.push(
      `Smart Fill mempertahankan ${lockedMain.length} kartu pilihanmu dan melengkapi ${sortedMain.length - lockedMain.length} slot sisanya secara sinergis.`
    );
  }

  if (winner.simulation.autoTunedSwaps > 0) {
    highlights.push(
      `Auto-Tuner menukar ${winner.simulation.autoTunedSwaps} kartu berat ke Vanguard ★1–4 agar opening hand anti-brick.`
    );
  }

  const shortStratTag: Record<ResolvedAutoBuildStrategy, string> = {
    balanced: 'Rush',
    aggro: 'Blitz',
    control: 'Aegis',
    fusion: 'Fusion',
    maximum: 'Maximum',
  };
  const suggestedName = winner.hasCompleteMaximumSet
    ? `${winner.activeMaxSetTitle ?? 'Maximum Overlord'} Max`
    : `${winner.primaryFactions.slice(0, 2).map((f) => FACTION_DISPLAY[f].split('-')[0]).join(' × ')} ${shortStratTag[winner.strategy]}`;

  return {
    ok: true,
    mainDeck: sortedMain,
    riftDeck: sortedRift,
    report: {
      grade: scoreGrade(winner.synergyScore),
      synergyScore: winner.synergyScore,
      resolvedStrategy: winner.strategy,
      strategyLabel: STRATEGY_LABELS[winner.strategy],
      primaryFactions: winner.primaryFactions,
      suggestedName,
      recommendedSkillId: skillRec.id,
      recommendedSkillReason: skillRec.reason,
      curve: {
        lowMonsters,
        midMonsters,
        highMonsters,
        spells: instantSpells + catalysts + domains,
        catalysts,
        domains,
        traps,
        relics,
      },
      simulation: winner.simulation,
      fusionCoverage: winner.fusionCoverage,
      hasCompleteMaximumSet: winner.hasCompleteMaximumSet,
      highlights,
      warnings: winner.warnings,
    },
  };
}
