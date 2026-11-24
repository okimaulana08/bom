import type { BossModifierId, SpireBlessingId } from '../engine/types';
import { CARDS } from './cards';
import { AI_ARCHETYPES } from './decks';

export interface SpireBlessingDef {
  id: SpireBlessingId;
  name: string;
  tagline: string;
  description: string;
  icon: 'sword' | 'shield' | 'sparkles' | 'zap' | 'layers' | 'trap';
  colorClass: string;
}

export const SPIRE_BLESSINGS: SpireBlessingDef[] = [
  {
    id: 'blessing_vanguard_might',
    name: 'Titan Fury Sigil',
    tagline: 'Permanent +300 ATK',
    description: 'All your monsters permanently gain +300 ATK during every Rift Spire duel.',
    icon: 'sword',
    colorClass: 'border-orange-400/75 bg-orange-950/55 text-orange-200',
  },
  {
    id: 'blessing_iron_aegis',
    name: 'Permafrost Bulwark',
    tagline: '+400 DEF & +1000 Max LP',
    description: 'All your monsters gain +400 DEF and your Spire Run Max LP increases by +1000.',
    icon: 'shield',
    colorClass: 'border-cyan-400/75 bg-cyan-950/55 text-cyan-200',
  },
  {
    id: 'blessing_evo_mastery',
    name: 'Awakened Prism',
    tagline: '+1 Evo Orb • Turn 2 Evolve',
    description: 'Begin every Spire duel with +1 extra Evo Orb and unlock Evolution early on Turn 2!',
    icon: 'sparkles',
    colorClass: 'border-amber-400/75 bg-amber-950/55 text-amber-200',
  },
  {
    id: 'blessing_rush_draw',
    name: 'Starlight Overclock',
    tagline: '6-Card Opener & +400 LP/Turn',
    description: 'Start every Spire duel with 6 cards in hand and heal +400 LP every Draw Phase!',
    icon: 'zap',
    colorClass: 'border-emerald-400/75 bg-emerald-950/55 text-emerald-200',
  },
  {
    id: 'blessing_fusion_spark',
    name: 'Catalyst Resonance',
    tagline: 'Free Rift Polymerization',
    description: 'Start every Spire duel with 1 bonus Rift Polymerization already in your hand!',
    icon: 'layers',
    colorClass: 'border-fuchsia-400/75 bg-fuchsia-950/55 text-fuchsia-200',
  },
  {
    id: 'blessing_trap_ambush',
    name: 'Phantom Backrow',
    tagline: 'Opening Face-Down Trap',
    description: 'Start every Spire duel with a random Ambush Trap already armed on your backrow!',
    icon: 'trap',
    colorClass: 'border-rose-400/75 bg-rose-950/55 text-rose-200',
  },
];

export const SPIRE_BLESSING_MAP: Record<SpireBlessingId, SpireBlessingDef> = Object.fromEntries(
  SPIRE_BLESSINGS.map((b) => [b.id, b])
) as Record<SpireBlessingId, SpireBlessingDef>;

export interface SpireFloorDef {
  floor: number;
  title: string;
  enemyName: string;
  enemyTitle: string;
  portrait: string;
  enemyLp: number;
  difficulty: 'initiate' | 'grandmaster';
  bossModifier: BossModifierId;
  archetypeIndex: number;
  rewardCoins: number;
  isBoss?: boolean;
}

export const SPIRE_FLOORS: SpireFloorDef[] = [
  {
    floor: 1,
    title: 'Floor 1 • Cinder Outpost',
    enemyName: 'Kael, Spire Scout',
    enemyTitle: 'Pyroclast Vanguard',
    portrait: '/assets/portraits/boss_kael.jpg',
    enemyLp: 5500,
    difficulty: 'initiate',
    bossModifier: 'none',
    archetypeIndex: 0,
    rewardCoins: 60,
  },
  {
    floor: 2,
    title: 'Floor 2 • Glacial Checkpoint',
    enemyName: 'Warden Vex-09',
    enemyTitle: 'Cryo-Mecha Bastion',
    portrait: '/assets/portraits/boss_vex09.jpg',
    enemyLp: 6500,
    difficulty: 'initiate',
    bossModifier: 'cryo_guard_armor',
    archetypeIndex: 1,
    rewardCoins: 80,
  },
  {
    floor: 3,
    title: 'Floor 3 • Neon Phantom Vault',
    enemyName: 'Syndicate Vex-Nyx',
    enemyTitle: 'Cyber Phantom Elite',
    portrait: '/assets/portraits/boss_nyx.jpg',
    enemyLp: 7200,
    difficulty: 'grandmaster',
    bossModifier: 'umbra_ambush_start',
    archetypeIndex: 6,
    rewardCoins: 110,
  },
  {
    floor: 4,
    title: 'Floor 4 • Dragonic Summit',
    enemyName: 'Solaris Kael, Dragon Lord',
    enemyTitle: 'Overdrive Warden',
    portrait: '/assets/portraits/boss_kael.jpg',
    enemyLp: 8000,
    difficulty: 'grandmaster',
    bossModifier: 'none',
    archetypeIndex: 5,
    rewardCoins: 140,
  },
  {
    floor: 5,
    title: 'Floor 5 • Apex of the Rift Spire',
    enemyName: 'Chrono Archon Zero',
    enemyTitle: 'Spire Apex Sovereign',
    portrait: '/assets/portraits/boss_archon_zero.jpg',
    enemyLp: 9500,
    difficulty: 'grandmaster',
    bossModifier: 'chrono_archon_boss',
    archetypeIndex: 4,
    rewardCoins: 350,
    isBoss: true,
  },
];

export function getSpireFloorEnemy(floor: number) {
  const def = SPIRE_FLOORS.find((f) => f.floor === floor) ?? SPIRE_FLOORS[0];
  const arch = AI_ARCHETYPES[def.archetypeIndex] ?? AI_ARCHETYPES[0];
  return { ...def, deck: arch.mainDeck, riftDeck: arch.riftDeck };
}

export function rollSpireCardChoices(): string[] {
  const pool = CARDS.filter(
    (c) =>
      !c.isToken &&
      !c.isExclusive &&
      c.type !== 'fusion_apex' &&
      (c.rarity === 'rare' || c.rarity === 'epic' || c.rarity === 'mythic')
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((c) => c.id);
}

export function rollSpireBlessingChoices(owned: SpireBlessingId[]): SpireBlessingId[] {
  const remaining = SPIRE_BLESSINGS.filter((b) => !owned.includes(b.id));
  const pool = remaining.length >= 3 ? remaining : SPIRE_BLESSINGS;
  return [...pool]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((b) => b.id);
}
