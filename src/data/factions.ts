import type { Faction } from '../engine/types';

export interface FactionMeta {
  id: Faction;
  name: string;
  tagline: string;
  playstyle: string;
  primaryHex: string;
  secondaryHex: string;
  borderGradient: string;
  badgeBg: string;
  textColor: string;
  glowShadow: string;
}

export const FACTIONS: Record<Faction, FactionMeta> = {
  pyroclast: {
    id: 'pyroclast',
    name: 'Pyroclast',
    tagline: 'Volcanic Fury & Searing Strike',
    playstyle: 'Aggro • Burn • Pierce',
    primaryHex: '#ef4444',
    secondaryHex: '#f97316',
    borderGradient: 'from-red-600 via-orange-500 to-amber-500',
    badgeBg: 'bg-red-950/80 border-red-500/60 text-red-200',
    textColor: 'text-red-400',
    glowShadow: '0 0 24px rgba(239, 68, 68, 0.45)',
  },
  cryo_mecha: {
    id: 'cryo_mecha',
    name: 'Cryo-Mecha',
    tagline: 'Glacial Steel & Absolute Defense',
    playstyle: 'Armor • Freeze • Guard Synergy',
    primaryHex: '#06b6d4',
    secondaryHex: '#94a3b8',
    borderGradient: 'from-cyan-400 via-sky-500 to-slate-300',
    badgeBg: 'bg-cyan-950/80 border-cyan-400/60 text-cyan-200',
    textColor: 'text-cyan-300',
    glowShadow: '0 0 24px rgba(6, 182, 212, 0.45)',
  },
  umbra: {
    id: 'umbra',
    name: 'Umbra',
    tagline: 'Shadow Blades & Void Pacts',
    playstyle: 'Ambush Traps • Void Revival • Lethal',
    primaryHex: '#9333ea',
    secondaryHex: '#ec4899',
    borderGradient: 'from-purple-600 via-fuchsia-600 to-violet-900',
    badgeBg: 'bg-purple-950/80 border-purple-500/60 text-purple-200',
    textColor: 'text-purple-300',
    glowShadow: '0 0 24px rgba(147, 51, 234, 0.48)',
  },
  sylvan: {
    id: 'sylvan',
    name: 'Sylvan',
    tagline: 'Ancient Groves & Radiant Awakening',
    playstyle: 'Aether Ramp • Healing • Evolution',
    primaryHex: '#10b981',
    secondaryHex: '#eab308',
    borderGradient: 'from-emerald-500 via-teal-400 to-amber-400',
    badgeBg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200',
    textColor: 'text-emerald-300',
    glowShadow: '0 0 24px rgba(16, 185, 129, 0.45)',
  },
  chrono: {
    id: 'chrono',
    name: 'Chrono',
    tagline: 'Starlight Threads & Rift Convergence',
    playstyle: 'Card Draw • Bounce • Fusion Combos',
    primaryHex: '#6366f1',
    secondaryHex: '#38bdf8',
    borderGradient: 'from-indigo-500 via-blue-400 to-violet-400',
    badgeBg: 'bg-indigo-950/80 border-indigo-400/60 text-indigo-200',
    textColor: 'text-indigo-300',
    glowShadow: '0 0 24px rgba(99, 102, 241, 0.48)',
  },
};

export const FACTION_LIST: Faction[] = [
  'pyroclast',
  'cryo_mecha',
  'umbra',
  'sylvan',
  'chrono',
];
