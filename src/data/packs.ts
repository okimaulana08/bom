import type { CardDef, PackCardPull, PackDef, PackOpenResult, Rarity } from '../engine/types';
import { CARDS, RARITY_DISMANTLE_DUST } from './cards';

export const BOOSTER_PACKS: PackDef[] = [
  {
    id: 'yggdrasil_overlord_pack',
    name: 'Yggdrasil Sky Overlord Pack',
    subtitle: 'Set 6 • Sylvan Maximum Titan • Mono-Sylvan Fusion',
    price: 100,
    badge: 'NEW SET 6',
    featuredSetId: 'yggdrasil_overlord',
    description:
      'Guaranteed 2+ Set 6 Sylvan cards per pack! Assemble 3-Piece Maximum Yggdrasil (4300 ATK), Sylvan Sovereign Fusion, Titania Empress & Crown of the World-Tree!',
    accentFrom: '#10b981',
    accentTo: '#f59e0b',
    boostedFactions: ['sylvan'],
    boostFusion: true,
    boostAmbush: true,
  },
  {
    id: 'legendary_dragons_pack',
    name: 'Legendary Dragons Pack',
    subtitle: 'Set 7 • Dragias • Azure/Crimson Ultimate • Catalyst #3',
    price: 100,
    badge: 'NEW SET 7',
    featuredSetId: 'legendary_dragons',
    description:
      'Guaranteed 2+ Set 7 Dragon Legends per pack! Hunt Multistrike Dragias, Azure-Eyes Ultimate Trinity, Crimson Meteor Overdragon & Draconic Mirror Fusion!',
    accentFrom: '#ef4444',
    accentTo: '#38bdf8',
    boostedFactions: ['pyroclast', 'cryo_mecha', 'umbra'],
    boostFusion: true,
  },
  {
    id: 'sevens_magicians_pack',
    name: 'Sevens Arcane Magicians Pack',
    subtitle: 'Set 8 • Sevens Road • Dark Paladin • Spell Combo',
    price: 100,
    badge: 'NEW SET 8',
    featuredSetId: 'sevens_magicians',
    description:
      'Guaranteed 2+ Set 8 Spellcaster cards per pack! Command Sevens Road Astral Mage, Obsidian Dark Magus, Sevens Dark Paladin & Prismatic Spell Cylinder!',
    accentFrom: '#7c3aed',
    accentTo: '#ec4899',
    boostedFactions: ['chrono', 'umbra'],
    boostFusion: true,
    boostAmbush: true,
  },
  {
    id: 'supreme_mecha_pack',
    name: 'Supreme Mecha Armada Pack',
    subtitle: 'Set 9 • Magnum Overlord 4400 MAX • Cyber End Dragon',
    price: 100,
    badge: 'NEW SET 9',
    featuredSetId: 'supreme_mecha',
    description:
      'Guaranteed 2+ Set 9 Mecha cards per pack! Deploy 3-Piece Maximum Magnum Overlord Omega (4400 ATK), Cyber Infinity End Dragon & Limiter Overdrive!',
    accentFrom: '#06b6d4',
    accentTo: '#6366f1',
    boostedFactions: ['cryo_mecha', 'pyroclast'],
    boostFusion: true,
    boostAmbush: true,
  },
  {
    id: 'egyptian_gods_pack',
    name: 'Pantheon of the Nile Pack',
    subtitle: 'Set 5 • Egyptian Gods • Horakhty • Pharaoh Relics',
    price: 100,
    badge: 'NEW SET 5',
    featuredSetId: 'egyptian_gods',
    description:
      'Guaranteed 2+ Set 5 Egyptian Gods cards per pack! Summon Osiris, Obelisk, Ra, Creator Fusion Horakhty, Millennium Ankh of Rebirth & Mound of the Bound Creator!',
    accentFrom: '#f59e0b',
    accentTo: '#1d4ed8',
    boostedFactions: ['chrono', 'pyroclast', 'cryo_mecha', 'umbra'],
    boostFusion: true,
    boostAmbush: true,
  },
  {
    id: 'maximum_overlord_pack',
    name: 'Maximum Overlord Pack',
    subtitle: 'Set 4 • 3-Piece Maximum Titan • Rush Legends',
    price: 100,
    badge: 'NEW SET 4',
    featuredSetId: 'maximum',
    description:
      'Guaranteed 2+ Maximum Overlord Titan pieces per pack! Complete 3× Aetherion Dread Emperor [L] + [CORE] + [R] for unstoppable 4200 ATK Maximum Summons!',
    accentFrom: '#f59e0b',
    accentTo: '#a855f7',
    boostedFactions: ['chrono', 'pyroclast', 'cryo_mecha'],
    boostFusion: true,
  },
  {
    id: 'arcana_vault_pack',
    name: 'Arcana & Ambush Vault',
    subtitle: 'Set 3 • 7 Spells • 3 Iconic Traps • Domains',
    price: 100,
    badge: 'NEW SET 3',
    featuredSetId: 'arcana_vault',
    description:
      'Guaranteed 2+ Set 3 Tactical Spell & Trap cards per pack! Hunt Crimson Mirror Force, Aether Reflector, Aether Vessel, Rift Breaker & new Cryo/Umbra Field Domains.',
    accentFrom: '#10b981',
    accentTo: '#e11d48',
    boostedFactions: ['chrono', 'pyroclast', 'cryo_mecha', 'umbra', 'sylvan'],
    boostAmbush: true,
  },
  {
    id: 'dragonic_overdrive',
    name: 'Dragonic Overdrive Pack',
    subtitle: 'Set 2A • Dragons • Solar Fire • Starlight',
    price: 100,
    badge: 'NEW SET 2',
    featuredSetId: 'overdrive',
    description:
      'Guaranteed 2+ Dragonic Overdrive cards per pack! Hunt Supernova Starwyrm, Celestial Canopy Dragon, Solaris Wyrmlord & Dragonheart Relics.',
    accentFrom: '#f97316',
    accentTo: '#facc15',
    boostedFactions: ['pyroclast', 'chrono', 'sylvan'],
    boostFusion: true,
  },
  {
    id: 'cyber_phantom',
    name: 'Cyber Phantom Pack',
    subtitle: 'Set 2B • Cyber-Ninjas • Freeze • Void',
    price: 100,
    badge: 'NEW SET 2',
    featuredSetId: 'phantom',
    description:
      'Guaranteed 2+ Cyber Phantom Protocol cards per pack! Unlock Zero-Kelvin Shinobi, Hellfire Abyss Dragon, Nightshade Empress & Phantom Traps.',
    accentFrom: '#06b6d4',
    accentTo: '#d946ef',
    boostedFactions: ['cryo_mecha', 'umbra'],
    boostFusion: true,
    boostAmbush: true,
  },
  {
    id: 'genesis_rift',
    name: 'Genesis Rift Pack',
    subtitle: 'Set 1 • All Factions • Balanced Fusion',
    price: 100,
    description:
      '5 cards from across all 5 factions with balanced odds for Dual-Faction Fusion Apex bosses. Guaranteed Rare or higher!',
    accentFrom: '#6366f1',
    accentTo: '#ec4899',
    boostedFactions: ['pyroclast', 'cryo_mecha', 'umbra', 'sylvan', 'chrono'],
    boostFusion: true,
  },
  {
    id: 'thermal_core',
    name: 'Thermal Core Pack',
    subtitle: 'Set 1 • Pyroclast • Cryo-Mecha • Fusions',
    price: 100,
    description:
      'Heavy drop boost for Pyroclast, Cryo-Mecha, Relics, and Dual-Faction Fusion bosses like Frostfire Chimera & Wildfire Behemoth.',
    accentFrom: '#ef4444',
    accentTo: '#06b6d4',
    boostedFactions: ['pyroclast', 'cryo_mecha'],
    boostFusion: true,
  },
  {
    id: 'astral_eclipse',
    name: 'Astral Eclipse Pack',
    subtitle: 'Set 1 • Umbra • Sylvan • Chrono • Traps',
    price: 100,
    description:
      'Boosted odds for Umbra Ambush traps, Sylvan Evolution lines, Chrono Catalysts, and Astral Revenant / Eclipse Sovereign.',
    accentFrom: '#9333ea',
    accentTo: '#10b981',
    boostedFactions: ['umbra', 'sylvan', 'chrono'],
    boostAmbush: true,
  },
];

const PACKABLE_CARDS = CARDS.filter((c) => !c.isToken && !c.isExclusive);

function pickWeightedCard(pool: CardDef[], pack: PackDef): CardDef {
  const weights = pool.map((card) => {
    let w = 1;
    if (pack.featuredSetId && card.setId === pack.featuredSetId) {
      w *= 4.5;
    }
    if (
      pack.boostedFactions.includes(card.faction) ||
      (card.secondaryFaction && pack.boostedFactions.includes(card.secondaryFaction))
    ) {
      w *= 2.6;
    }
    if (pack.boostFusion && card.type === 'fusion_apex') {
      w *= 2.1;
    }
    if (pack.boostAmbush && (card.type === 'ambush' || card.type === 'arcana')) {
      w *= 1.85;
    }
    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function rollRarity(guaranteedRarePlus: boolean): Rarity {
  const r = Math.random();
  if (guaranteedRarePlus) {
    // Slot 5: 16% Mythic, 30% Epic, 54% Rare
    if (r < 0.16) return 'mythic';
    if (r < 0.46) return 'epic';
    return 'rare';
  }
  // Slots 1-4: 4% Mythic, 12% Epic, 28% Rare, 56% Common
  if (r < 0.04) return 'mythic';
  if (r < 0.16) return 'epic';
  if (r < 0.44) return 'rare';
  return 'common';
}

export function rollBoosterPack(
  pack: PackDef,
  currentCollection: Record<string, number>
): { result: PackOpenResult; nextCollection: Record<string, number> } {
  const nextCollection = { ...currentCollection };
  const pulls: PackCardPull[] = [];
  let totalDustGained = 0;

  for (let slot = 0; slot < 5; slot++) {
    const guaranteedRare = slot === 4;
    const forceFeaturedSet = Boolean(pack.featuredSetId && slot >= 3);
    const rarity = rollRarity(guaranteedRare);

    let pool: CardDef[];
    if (forceFeaturedSet && pack.featuredSetId) {
      const setCards = PACKABLE_CARDS.filter((c) => c.setId === pack.featuredSetId);
      const setByRarity = setCards.filter((c) => c.rarity === rarity);
      pool = setByRarity.length > 0 ? setByRarity : setCards;
    } else {
      pool = PACKABLE_CARDS.filter((c) => c.rarity === rarity);
    }
    if (pool.length === 0) pool = PACKABLE_CARDS;

    const card = pickWeightedCard(pool, pack);

    const ownedBefore = nextCollection[card.id] ?? 0;
    const isNew = ownedBefore === 0;
    let autoDismantled = false;
    let dustGained = 0;

    if (ownedBefore >= 3) {
      autoDismantled = true;
      dustGained = RARITY_DISMANTLE_DUST[card.rarity];
      totalDustGained += dustGained;
    } else {
      nextCollection[card.id] = ownedBefore + 1;
    }

    pulls.push({
      cardId: card.id,
      rarity: card.rarity,
      isNew,
      autoDismantled,
      dustGained,
    });
  }

  // Sort pulls so highest rarity sits at slot 4 (dramatic climax!)
  const rank: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, mythic: 3 };
  pulls.sort((a, b) => rank[a.rarity] - rank[b.rarity]);

  return {
    result: {
      packId: pack.id,
      pulls,
      totalDustGained,
    },
    nextCollection,
  };
}
