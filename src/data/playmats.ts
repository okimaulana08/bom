import type { PlaymatId } from '../engine/types';

export interface PlaymatDef {
  id: PlaymatId;
  name: string;
  subtitle: string;
  image: string;
  accentHex: string;
  secondaryHex: string;
  vignetteCss: string;
  gridColor: string;
}

export const ARENA_PLAYMATS: PlaymatDef[] = [
  {
    id: 'rift_coliseum',
    name: 'Rift Coliseum',
    subtitle: 'Astral Speed Duel Sanctum',
    image: '/assets/arenas/duel_playmat.jpg',
    accentHex: '#38bdf8',
    secondaryHex: '#c084fc',
    vignetteCss:
      'radial-gradient(ellipse 72% 68% at 50% 50%, rgba(5,7,18,0.16) 0%, rgba(4,6,15,0.68) 72%, rgba(3,4,10,0.93) 100%)',
    gridColor: 'rgba(56, 189, 248, 0.35)',
  },
  {
    id: 'nile_pyramid',
    name: 'Nile Pyramid Sanctum',
    subtitle: 'Pantheon of the Egyptian Gods',
    image: '/assets/cards/egypt_pyramid_domain.jpg',
    accentHex: '#fbbf24',
    secondaryHex: '#f59e0b',
    vignetteCss:
      'radial-gradient(ellipse 72% 68% at 50% 50%, rgba(30,18,4,0.22) 0%, rgba(16,10,4,0.74) 72%, rgba(6,4,2,0.95) 100%)',
    gridColor: 'rgba(251, 191, 36, 0.42)',
  },
  {
    id: 'yggdrasil_sky',
    name: 'Yggdrasil Sky Canopy',
    subtitle: 'Emerald Realm of the Sky Emperor',
    image: '/assets/cards/ygg_worldtree_domain.jpg',
    accentHex: '#34d399',
    secondaryHex: '#fbbf24',
    vignetteCss:
      'radial-gradient(ellipse 72% 68% at 50% 50%, rgba(4,24,18,0.22) 0%, rgba(3,16,12,0.74) 72%, rgba(2,8,8,0.95) 100%)',
    gridColor: 'rgba(52, 211, 153, 0.4)',
  },
  {
    id: 'orbital_mecha',
    name: 'Orbital Mecha Hangar',
    subtitle: 'Cyber-Steel Armada Deck',
    image: '/assets/cards/mech_repair_factory.jpg',
    accentHex: '#22d3ee',
    secondaryHex: '#6366f1',
    vignetteCss:
      'radial-gradient(ellipse 72% 68% at 50% 50%, rgba(4,16,30,0.24) 0%, rgba(4,10,22,0.76) 72%, rgba(2,5,12,0.95) 100%)',
    gridColor: 'rgba(34, 211, 238, 0.42)',
  },
];

export function getPlaymatDef(id?: PlaymatId | null): PlaymatDef {
  return ARENA_PLAYMATS.find((p) => p.id === id) ?? ARENA_PLAYMATS[0];
}
