import type { Keyword } from '../engine/types';

export interface KeywordMeta {
  id: Keyword;
  name: string;
  shortDesc: string;
  colorClass: string;
}

export const KEYWORDS: Record<Keyword, KeywordMeta> = {
  Swift: {
    id: 'Swift',
    name: 'Swift',
    shortDesc: 'Double Strike: Can declare up to 2 attacks per Battle Phase (at most 1 Direct Attack on LP).',
    colorClass: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
  },
  Rush: {
    id: 'Rush',
    name: 'Awakened',
    shortDesc: 'Ascended via Evolution: retains all attached Relics and gains upgraded ATK, DEF, and On-Evolve power.',
    colorClass: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/50',
  },
  Pierce: {
    id: 'Pierce',
    name: 'Pierce',
    shortDesc: 'When attacking a Defense Position monster with ATK > DEF, inflicts the difference as Battle Damage to enemy LP.',
    colorClass: 'bg-red-500/20 text-red-200 border-red-400/50',
  },
  Ward: {
    id: 'Ward',
    name: 'Ward',
    shortDesc: 'Negates the first enemy Arcana Spell or Ambush Trap that targets or affects this monster.',
    colorClass: 'bg-sky-500/20 text-sky-200 border-sky-400/50',
  },
  Lethal: {
    id: 'Lethal',
    name: 'Lethal',
    shortDesc: 'Destroys the opposing monster after battle calculation, even if this monster had lower ATK.',
    colorClass: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/50',
  },
  Resonate: {
    id: 'Resonate',
    name: 'Resonate',
    shortDesc: 'Triggers a bonus Void echo effect when Tributed, used as Fusion material, or discarded via Soul Burn.',
    colorClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/50',
  },
  Drain: {
    id: 'Drain',
    name: 'Drain',
    shortDesc: 'Restores your Life Points equal to Battle Damage inflicted (or +400 LP when destroying a monster).',
    colorClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
  },
};
