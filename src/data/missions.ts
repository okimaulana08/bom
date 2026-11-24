import type { PlayerProfile } from '../engine/types';
import { CARDS } from './cards';

export interface DuelistRankTier {
  id: string;
  name: string;
  minRp: number;
  accentFrom: string;
  accentTo: string;
  borderClass: string;
  textClass: string;
  glow: string;
}

export const DUELIST_RANKS: DuelistRankTier[] = [
  {
    id: 'bronze',
    name: 'Bronze Initiate',
    minRp: 0,
    accentFrom: '#cd7f32',
    accentTo: '#78350f',
    borderClass: 'border-amber-600/80',
    textClass: 'text-amber-400',
    glow: 'rgba(217, 119, 6, 0.45)',
  },
  {
    id: 'silver',
    name: 'Silver Striker',
    minRp: 200,
    accentFrom: '#e2e8f0',
    accentTo: '#64748b',
    borderClass: 'border-slate-300/80',
    textClass: 'text-slate-200',
    glow: 'rgba(203, 213, 225, 0.48)',
  },
  {
    id: 'gold',
    name: 'Gold Tactician',
    minRp: 500,
    accentFrom: '#fef08a',
    accentTo: '#d97706',
    borderClass: 'border-amber-300/90',
    textClass: 'text-amber-200',
    glow: 'rgba(251, 191, 36, 0.58)',
  },
  {
    id: 'platinum',
    name: 'Platinum Warden',
    minRp: 900,
    accentFrom: '#67e8f9',
    accentTo: '#0284c7',
    borderClass: 'border-cyan-300/90',
    textClass: 'text-cyan-200',
    glow: 'rgba(34, 211, 238, 0.62)',
  },
  {
    id: 'diamond',
    name: 'Diamond Archon',
    minRp: 1400,
    accentFrom: '#e879f9',
    accentTo: '#4f46e5',
    borderClass: 'border-fuchsia-300/90',
    textClass: 'text-fuchsia-200',
    glow: 'rgba(217, 70, 239, 0.65)',
  },
  {
    id: 'sovereign',
    name: 'Rift Sovereign',
    minRp: 2000,
    accentFrom: '#fde047',
    accentTo: '#ec4899',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-100',
    glow: 'rgba(253, 224, 71, 0.8)',
  },
];

export interface RankProgressInfo {
  rp: number;
  current: DuelistRankTier;
  next: DuelistRankTier | null;
  progressPct: number;
}

export function getDuelistRank(profile: Pick<PlayerProfile, 'stats' | 'completedChapters' | 'hasChampionBadge'>): RankProgressInfo {
  const rp =
    profile.stats.duelsWon * 100 +
    profile.completedChapters.length * 150 +
    profile.stats.fusionsExecuted * 25 +
    profile.stats.evolutionsTriggered * 15 +
    (profile.hasChampionBadge ? 300 : 0);

  let currentIdx = 0;
  for (let i = 0; i < DUELIST_RANKS.length; i++) {
    if (rp >= DUELIST_RANKS[i].minRp) {
      currentIdx = i;
    }
  }
  const current = DUELIST_RANKS[currentIdx];
  const next = DUELIST_RANKS[currentIdx + 1] ?? null;
  const progressPct = next
    ? Math.min(100, Math.round(((rp - current.minRp) / (next.minRp - current.minRp)) * 100))
    : 100;

  return { rp, current, next, progressPct };
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  category: 'combat' | 'mastery' | 'collection' | 'campaign';
  target: number;
  rewardCoins: number;
  rewardDust: number;
  getProgress: (profile: PlayerProfile) => number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'first_win',
    title: 'First Blood',
    description: 'Win your very first Speed Duel in Campaign or Quick Duel.',
    category: 'combat',
    target: 1,
    rewardCoins: 120,
    rewardDust: 30,
    getProgress: (p) => p.stats.duelsWon,
  },
  {
    id: 'win_5',
    title: 'Rift Duelist Veteran',
    description: 'Achieve 5 total duel victories.',
    category: 'combat',
    target: 5,
    rewardCoins: 250,
    rewardDust: 60,
    getProgress: (p) => p.stats.duelsWon,
  },
  {
    id: 'win_12',
    title: 'Arena Conqueror',
    description: 'Achieve 12 total duel victories across any mode.',
    category: 'combat',
    target: 12,
    rewardCoins: 400,
    rewardDust: 150,
    getProgress: (p) => p.stats.duelsWon,
  },
  {
    id: 'fusion_3',
    title: 'Rift Synthesizer',
    description: 'Summon 3 Fusion Apex monsters (Contact or Catalyst Fusion).',
    category: 'mastery',
    target: 3,
    rewardCoins: 180,
    rewardDust: 80,
    getProgress: (p) => p.stats.fusionsExecuted,
  },
  {
    id: 'evolve_3',
    title: 'Awakened Conduit',
    description: 'Trigger 3 Awakened Evolutions during duels.',
    category: 'mastery',
    target: 3,
    rewardCoins: 180,
    rewardDust: 80,
    getProgress: (p) => p.stats.evolutionsTriggered,
  },
  {
    id: 'trap_3',
    title: 'Master of Ambush',
    description: 'Spring 3 face-down Ambush Traps against your rivals.',
    category: 'mastery',
    target: 3,
    rewardCoins: 160,
    rewardDust: 60,
    getProgress: (p) => p.stats.trapsTriggered ?? 0,
  },
  {
    id: 'heavy_hit_2000',
    title: 'Overwhelming Strike',
    description: 'Inflict 2000 or more LP damage in a single attack or spell.',
    category: 'combat',
    target: 2000,
    rewardCoins: 200,
    rewardDust: 80,
    getProgress: (p) => p.stats.maxSingleHitDamage ?? 0,
  },
  {
    id: 'packs_5',
    title: 'Booster Vault Seeker',
    description: 'Rip open 5 Booster Packs in the Rift Booster Vault.',
    category: 'collection',
    target: 5,
    rewardCoins: 150,
    rewardDust: 100,
    getProgress: (p) => p.stats.packsOpened,
  },
  {
    id: 'collect_30',
    title: 'Grand Archivist',
    description: 'Collect at least 30 unique cards in your Card Codex.',
    category: 'collection',
    target: 30,
    rewardCoins: 250,
    rewardDust: 120,
    getProgress: (p) => CARDS.filter((c) => (p.collection[c.id] ?? 0) > 0).length,
  },
  {
    id: 'clear_campaign',
    title: 'Timeline Defier',
    description: 'Defeat all 5 Story Campaign Bosses including Chrono Archon Zero.',
    category: 'campaign',
    target: 5,
    rewardCoins: 500,
    rewardDust: 250,
    getProgress: (p) => p.completedChapters.length,
  },
];

export function countClaimableMissions(profile: PlayerProfile): number {
  const claimed = new Set(profile.claimedMissions ?? []);
  return MISSIONS.filter(
    (m) => !claimed.has(m.id) && m.getProgress(profile) >= m.target
  ).length;
}
