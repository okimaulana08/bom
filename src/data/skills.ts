import type { DuelistSkillId, Faction } from '../engine/types';

export interface DuelistSkillDef {
  id: DuelistSkillId;
  duelistName: string;
  duelistTitle: string;
  skillName: string;
  faction: Faction;
  portrait: string;
  triggerHint: string;
  description: string;
  accentGradient: string;
  borderColor: string;
}

export const DUELIST_SKILLS: DuelistSkillDef[] = [
  {
    id: 'volcanic_ignition',
    duelistName: 'Kael, Cinder Striker',
    duelistTitle: 'Pyroclast Champion',
    skillName: 'Volcanic Ignition',
    faction: 'pyroclast',
    portrait: '/assets/portraits/boss_kael.jpg',
    triggerHint: 'Turn 2+ or LP ≤ 6000',
    description:
      '1/Duel (Main Phase): All face-up friendly monsters surge +500 ATK / +200 DEF and inflict 500 Burn Damage to enemy LP!',
    accentGradient: 'from-orange-600 via-red-600 to-amber-500',
    borderColor: 'border-orange-400/80',
  },
  {
    id: 'absolute_aegis',
    duelistName: 'Warden Vex-09',
    duelistTitle: 'Permafrost Sentinel',
    skillName: 'Absolute Aegis',
    faction: 'cryo_mecha',
    portrait: '/assets/portraits/boss_vex09.jpg',
    triggerHint: 'Turn 2+',
    description:
      '1/Duel (Main Phase): Freeze the strongest enemy monster for 1 turn and grant all friendly monsters +400 DEF and Ward!',
    accentGradient: 'from-cyan-600 via-sky-500 to-indigo-600',
    borderColor: 'border-cyan-400/80',
  },
  {
    id: 'void_resurrection',
    duelistName: 'Nyx, Void Whisper',
    duelistTitle: 'Matriarch of Shadows',
    skillName: 'Void Resurrection',
    faction: 'umbra',
    portrait: '/assets/portraits/boss_nyx.jpg',
    triggerHint: '1+ Monster in Void',
    description:
      '1/Duel (Main Phase): Special Summon the strongest Monster from your Void straight to your field (or Hand if full) + restore +600 LP!',
    accentGradient: 'from-purple-700 via-fuchsia-600 to-pink-600',
    borderColor: 'border-fuchsia-400/80',
  },
  {
    id: 'canopy_awakening',
    duelistName: 'Archdruid Lyra',
    duelistTitle: 'Keeper of Evo Orbs',
    skillName: 'Canopy Awakening',
    faction: 'sylvan',
    portrait: '/assets/portraits/boss_lyra.jpg',
    triggerHint: 'Turn 2+',
    description:
      '1/Duel (Main Phase): Crystallize +1 Evo Orb, unlock Evo Orbs immediately (Turn 2!), and restore +1000 LP!',
    accentGradient: 'from-emerald-600 via-teal-500 to-lime-500',
    borderColor: 'border-emerald-400/80',
  },
  {
    id: 'destiny_draw',
    duelistName: 'Chrono Archon Zero',
    duelistTitle: 'Sovereign of Timelines',
    skillName: 'Destiny Draw',
    faction: 'chrono',
    portrait: '/assets/portraits/boss_archon_zero.jpg',
    triggerHint: 'Turn 3+ or LP ≤ 5500',
    description:
      '1/Duel (Main Phase): Pull your strongest Ace, Fusion Spell, or Maximum Piece directly from Deck to Hand + Draw 1 bonus card!',
    accentGradient: 'from-indigo-600 via-violet-500 to-amber-400',
    borderColor: 'border-amber-400/80',
  },
];

export const SKILL_MAP: Record<DuelistSkillId, DuelistSkillDef> = Object.fromEntries(
  DUELIST_SKILLS.map((s) => [s.id, s])
) as Record<DuelistSkillId, DuelistSkillDef>;

export function getSkillDef(id: DuelistSkillId | null | undefined): DuelistSkillDef {
  return (id && SKILL_MAP[id]) || DUELIST_SKILLS[0];
}
