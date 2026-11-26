import type { DeckList, DuelistSkillId, Faction } from '../engine/types';

function expand(entries: Array<[string, number]>): string[] {
  const out: string[] = [];
  for (const [id, count] of entries) {
    for (let i = 0; i < count; i++) out.push(id);
  }
  return out;
}

/**
 * Starter Deck: Thermal Rift Vanguard (30 Main + 3 Rift)
 * Pyroclast + Cryo-Mecha + Chrono splash — immediately showcases
 * Evolution, Guard Stance, Relics, Ambush Traps, Resonate, Contact Fusion & Fusion Catalyst!
 */
export const STARTER_DECK: DeckList = {
  id: 'starter_thermal_rift',
  name: 'Thermal Rift Vanguard',
  description:
    'Rush Duel ready! Pyroclast & Cryo-Mecha monsters backed by Ignis Rex, 2× Polymerization, Set 3 Spells/Traps & 4 Fusion Apex bosses.',
  isStarter: true,
  featuredFaction: 'pyroclast',
  mainDeck: expand([
    ['pyro_hatchling', 3],
    ['pyro_cinder_acolyte', 2],
    ['pyro_magma_lancer', 2],
    ['pyro_slag_golem', 3],
    ['pyro_inferno_sovereign', 1],
    ['cryo_frost_drone', 3],
    ['cryo_aegis_walker', 2],
    ['cryo_rail_sniper', 2],
    ['chrono_star_initiate', 2],
    ['chrono_polymerization', 2],
    ['pyro_ember_bolt', 2],
    ['pyro_magma_edge', 2],
    ['chrono_aether_vessel', 1],
    ['chrono_rift_breaker', 1],
    ['chrono_aether_reflector', 1],
    ['cryo_mirror_wall', 1],
  ]), // Total = 20 Monsters + 10 Spells/Traps = 30
  riftDeck: [
    'fusion_frostfire_chimera',
    'fusion_frostfire_chimera',
    'fusion_glacial_chronolith',
    'fusion_supernova_starwyrm',
  ],
};

export interface AiArchetype {
  id: string;
  name: string;
  title: string;
  faction: Faction;
  description: string;
  portrait: string;
  skillId?: DuelistSkillId;
  mainDeck: string[];
  riftDeck: string[];
}

export const AI_ARCHETYPES: AiArchetype[] = [
  {
    id: 'ai_pyro_blitz',
    name: 'Kael, Cinder Striker',
    title: 'Pyroclast Aggro',
    faction: 'pyroclast',
    description: 'Relentless Swift & Pierce assault with direct burn and Wildfire Behemoth.',
    portrait: '/assets/portraits/boss_kael.jpg',
    mainDeck: expand([
      ['pyro_hatchling', 3],
      ['pyro_cinder_acolyte', 3],
      ['pyro_magma_lancer', 3],
      ['pyro_slag_golem', 3],
      ['pyro_inferno_sovereign', 1],
      ['pyro_ember_bolt', 2],
      ['pyro_caldera_domain', 2],
      ['pyro_magma_edge', 1],
      ['pyro_cinder_burst', 1],
      ['sylvan_spirit_fox', 3],
      ['sylvan_briar_warden', 3],
      ['sylvan_tempest_griffin', 3],
      ['chrono_polymerization', 2],
    ]),
    riftDeck: ['fusion_wildfire_behemoth', 'fusion_wildfire_behemoth'],
  },
  {
    id: 'ai_cryo_bastion',
    name: 'Warden Vex-09',
    title: 'Cryo-Mecha Fortress',
    faction: 'cryo_mecha',
    description: 'Armored Guard walls, Freeze lockouts, and Glacial Chronolith control.',
    portrait: '/assets/portraits/boss_vex09.jpg',
    mainDeck: expand([
      ['cryo_frost_drone', 3],
      ['cryo_aegis_walker', 3],
      ['cryo_rail_sniper', 3],
      ['cryo_glacier_mech', 3],
      ['cryo_valkyrie_zero', 1],
      ['cryo_absolute_lock', 3],
      ['cryo_aegis_plate', 2],
      ['cryo_mirror_wall', 3],
      ['chrono_star_initiate', 3],
      ['chrono_clock_angel', 2],
      ['chrono_time_slip', 2],
      ['chrono_polymerization', 2],
    ]),
    riftDeck: ['fusion_glacial_chronolith', 'fusion_glacial_chronolith'],
  },
  {
    id: 'ai_umbra_eclipse',
    name: 'Nyx, Void Whisper',
    title: 'Umbra Ambush & Void',
    faction: 'umbra',
    description: 'Face-down Ambush traps, Lethal assassins, Drain attrition, and Eclipse Sovereign.',
    portrait: '/assets/portraits/boss_nyx.jpg',
    mainDeck: expand([
      ['umbra_wisp', 3],
      ['umbra_shade_blade', 3],
      ['umbra_soul_reaper', 3],
      ['umbra_dread_knight', 3],
      ['umbra_nyx_avatar', 1],
      ['umbra_void_revival', 2],
      ['umbra_cursed_scythe', 2],
      ['umbra_shadow_snare', 3],
      ['umbra_void_counter', 2],
      ['chrono_star_initiate', 3],
      ['chrono_clock_angel', 3],
      ['chrono_polymerization', 2],
    ]),
    riftDeck: ['fusion_eclipse_sovereign', 'fusion_astral_revenant', 'fusion_eclipse_sovereign'],
  },
  {
    id: 'ai_sylvan_ascension',
    name: 'Archdruid Lyra',
    title: 'Sylvan Ramp & Evolve',
    faction: 'sylvan',
    description: 'Rapid Aether expansion, Sanctuary healing, and Evolution snowballs.',
    portrait: '/assets/portraits/boss_lyra.jpg',
    mainDeck: expand([
      ['sylvan_spirit_fox', 3],
      ['sylvan_briar_warden', 3],
      ['sylvan_tempest_griffin', 3],
      ['sylvan_bloom_druid', 3],
      ['sylvan_gaia_stag', 2],
      ['sylvan_aether_bloom', 3],
      ['sylvan_sanctuary', 2],
      ['sylvan_thorn_trap', 2],
      ['cryo_frost_drone', 3],
      ['cryo_aegis_walker', 2],
      ['pyro_magma_lancer', 2],
      ['chrono_polymerization', 2],
    ]),
    riftDeck: ['fusion_verdant_tempest', 'fusion_wildfire_behemoth'],
  },
  {
    id: 'ai_chrono_convergence',
    name: 'Chrono Archon Zero',
    title: 'Multi-Faction Rift Fusion',
    faction: 'chrono',
    description: 'High-velocity card draw, Resonate loops, and multi-faction Apex Fusions.',
    portrait: '/assets/portraits/boss_archon_zero.jpg',
    mainDeck: expand([
      ['chrono_star_initiate', 3],
      ['chrono_clock_angel', 3],
      ['chrono_rift_weaver', 3],
      ['chrono_polymerization', 2],
      ['chrono_convergence', 2],
      ['chrono_time_slip', 2],
      ['chrono_starlight_nexus', 1],
      ['pyro_hatchling', 3],
      ['pyro_cinder_acolyte', 2],
      ['cryo_frost_drone', 3],
      ['cryo_rail_sniper', 2],
      ['umbra_shade_blade', 2],
      ['umbra_shadow_snare', 2],
    ]),
    riftDeck: [
      'fusion_aether_sovereign',
      'fusion_frostfire_chimera',
      'fusion_astral_revenant',
      'fusion_glacial_chronolith',
    ],
  },
  {
    id: 'ai_dragonic_overdrive',
    name: 'Solaris Kael, Dragon Lord',
    title: 'Dragonic Overdrive (Set 2A)',
    faction: 'pyroclast',
    description:
      'Explosive Dragon Tribute ramp, Swift/Pierce ignition buffs, and Supernova Starwyrm / Celestial Canopy Dragon Fusions!',
    portrait: '/assets/portraits/boss_kael.jpg',
    mainDeck: expand([
      ['pyro_solar_whelp', 3],
      ['pyro_sky_dragoon', 3],
      ['pyro_hatchling', 3],
      ['pyro_inferno_sovereign', 1],
      ['pyro_dragon_roar', 2],
      ['pyro_wyrm_crest', 2],
      ['pyro_ember_bolt', 2],
      ['chrono_star_drake', 3],
      ['chrono_star_initiate', 2],
      ['chrono_dragon_spire', 2],
      ['chrono_polymerization', 2],
      ['sylvan_emerald_wyvern', 2],
      ['sylvan_spirit_fox', 3],
    ]),
    riftDeck: [
      'fusion_supernova_starwyrm',
      'fusion_celestial_canopy',
      'fusion_wildfire_behemoth',
      'fusion_supernova_starwyrm',
    ],
  },
  {
    id: 'ai_cyber_phantom',
    name: 'Syndicate Vex-Nyx',
    title: 'Cyber Phantom Protocol (Set 2B)',
    faction: 'cryo_mecha',
    description:
      'Cyber-ninja Freeze & FLIP bounce control backed by Phantom Mirror Traps and Zero-Kelvin Shinobi / Hellfire Abyss Fusions!',
    portrait: '/assets/portraits/boss_vex09.jpg',
    mainDeck: expand([
      ['cryo_neon_ronin', 3],
      ['cryo_holo_decoy', 3],
      ['cryo_rail_sniper', 2],
      ['cryo_system_override', 2],
      ['cryo_mirror_wall', 2],
      ['umbra_cyber_kunoichi', 3],
      ['umbra_null_hacker', 2],
      ['umbra_wisp', 2],
      ['umbra_phantom_matrix', 3],
      ['umbra_shadow_snare', 2],
      ['pyro_solar_whelp', 2],
      ['sylvan_spirit_fox', 2],
      ['chrono_polymerization', 2],
    ]),
    riftDeck: [
      'fusion_zerokelvin_shinobi',
      'fusion_hellfire_abyss',
      'fusion_nightshade_queen',
      'fusion_zerokelvin_shinobi',
    ],
  },
  {
    id: 'ai_egyptian_gods',
    name: 'Pharaoh Atem-Ra',
    title: 'Egyptian Gods (Set 5)',
    faction: 'chrono',
    description:
      'Commands Osiris, Obelisk & Ra backed by Millennium Ankh revivals, Pyramid Domain & Creator Fusion Horakhty!',
    portrait: '/assets/cards/egypt_ra_sun_phoenix.jpg',
    skillId: 'destiny_draw',
    mainDeck: expand([
      ['egypt_ra_disciple', 3],
      ['egypt_anubis_jackal', 3],
      ['egypt_horus_falcon', 2],
      ['egypt_sphinx_guardian', 2],
      ['egypt_osiris_sky_dragon', 1],
      ['egypt_obelisk_tormentor', 1],
      ['egypt_ra_sun_phoenix', 1],
      ['chrono_star_initiate', 3],
      ['chrono_clock_angel', 2],
      ['chrono_polymerization', 2],
      ['egypt_millennium_ankh', 2],
      ['egypt_pyramid_domain', 2],
      ['egypt_millennium_rod', 2],
      ['egypt_pharaoh_judgment', 2],
      ['chrono_aether_vessel', 2],
    ]),
    riftDeck: ['egypt_fusion_horakhty', 'egypt_fusion_horakhty', 'fusion_aether_sovereign'],
  },
  {
    id: 'ai_yggdrasil_maximum',
    name: 'Empress Titania',
    title: 'Yggdrasil Maximum (Set 6)',
    faction: 'sylvan',
    description:
      'Assembles the 4300 ATK 3-Piece Yggdrasil Maximum Titan with rapid draw, Canopy Healing & Sylvan Sovereign Fusion!',
    portrait: '/assets/cards/ygg_verdant_empress.jpg',
    skillId: 'canopy_awakening',
    mainDeck: expand([
      ['ygg_sky_emperor_l', 2],
      ['ygg_sky_emperor_c', 2],
      ['ygg_sky_emperor_r', 2],
      ['ygg_seedling_sprite', 3],
      ['ygg_petal_valkyrie', 3],
      ['ygg_ancient_treant', 2],
      ['ygg_verdant_empress', 1],
      ['sylvan_spirit_fox', 3],
      ['sylvan_tempest_griffin', 2],
      ['ygg_world_bloom', 2],
      ['ygg_canopy_crown', 2],
      ['ygg_worldtree_domain', 2],
      ['ygg_root_snare', 2],
      ['chrono_polymerization', 2],
    ]),
    riftDeck: ['ygg_fusion_worldtree', 'ygg_fusion_worldtree', 'fusion_celestial_canopy'],
  },
  {
    id: 'ai_legendary_dragons',
    name: 'Dragonmaster Luke',
    title: 'Legendary Dragons (Set 7)',
    faction: 'pyroclast',
    description:
      'Double-striking Multistrike Dragias, Azure-Eyes Frost Dragon, Crimson Meteor & Draconic Mirror Fusion!',
    portrait: '/assets/cards/drag_multistrike_dragias.jpg',
    skillId: 'volcanic_ignition',
    mainDeck: expand([
      ['drag_multistrike_dragias', 2],
      ['drag_azure_eyes', 2],
      ['drag_crimson_eyes', 1],
      ['drag_spark_whelp', 3],
      ['drag_frost_wyvern', 3],
      ['drag_eclipse_drake', 2],
      ['pyro_solar_whelp', 3],
      ['pyro_sky_dragoon', 2],
      ['cryo_rail_sniper', 2],
      ['drag_mirror_fusion', 2],
      ['chrono_convergence', 2],
      ['drag_burst_stream', 2],
      ['drag_fang_relic', 2],
      ['drag_roar_ambush', 2],
    ]),
    riftDeck: [
      'drag_fusion_crimson_meteor',
      'drag_fusion_azure_ultimate',
      'fusion_frostfire_chimera',
      'fusion_supernova_starwyrm',
    ],
  },
  {
    id: 'ai_sevens_magicians',
    name: 'Archmage Yuga-Vex',
    title: 'Sevens Magicians (Set 8)',
    faction: 'umbra',
    description:
      'Sevens Road Astral Mage & Obsidian Dark Magus backed by Sevens Dark Paladin, Thousand Blades & Spell Cylinder!',
    portrait: '/assets/cards/mag_sevens_archmage.jpg',
    skillId: 'void_resurrection',
    mainDeck: expand([
      ['mag_sevens_archmage', 2],
      ['mag_dark_sorcerer', 2],
      ['mag_starlight_apprentice', 2],
      ['mag_chrono_acolyte', 3],
      ['mag_shadow_witch', 3],
      ['mag_time_sage', 2],
      ['umbra_shade_blade', 3],
      ['chrono_rift_weaver', 2],
      ['chrono_convergence', 2],
      ['chrono_polymerization', 1],
      ['mag_thousand_knives', 2],
      ['mag_arcane_circle', 2],
      ['mag_grimoire_relic', 2],
      ['mag_magic_cylinder', 2],
    ]),
    riftDeck: [
      'mag_fusion_dark_paladin',
      'mag_fusion_dark_paladin',
      'mag_fusion_astral_witch',
      'fusion_eclipse_sovereign',
    ],
  },
  {
    id: 'ai_supreme_mecha',
    name: 'Commander Nail-Omega',
    title: 'Supreme Mecha (Set 9)',
    faction: 'cryo_mecha',
    description:
      'Deploys the 4400 ATK Magnum Overlord Omega Maximum Titan, Cyber Infinity End Dragon & Limiter Overdrive!',
    portrait: '/assets/cards/mech_magnum_overlord_c.jpg',
    skillId: 'absolute_aegis',
    mainDeck: expand([
      ['mech_magnum_overlord_l', 2],
      ['mech_magnum_overlord_c', 2],
      ['mech_magnum_overlord_r', 2],
      ['mech_cyber_proto', 3],
      ['mech_cyber_viper', 3],
      ['mech_rail_titan', 3],
      ['mech_fortress_carrier', 2],
      ['cryo_frost_drone', 3],
      ['mech_limiter_overdrive', 2],
      ['mech_repair_factory', 2],
      ['mech_plasma_thruster', 2],
      ['mech_emp_barrier', 2],
      ['chrono_polymerization', 2],
    ]),
    riftDeck: ['mech_fusion_cyber_end', 'mech_fusion_cyber_end', 'fusion_frostfire_chimera'],
  },
];

export function buildStarterCollection(): Record<string, number> {
  const collection: Record<string, number> = {};
  for (const id of STARTER_DECK.mainDeck) {
    collection[id] = (collection[id] ?? 0) + 1;
  }
  for (const id of STARTER_DECK.riftDeck) {
    collection[id] = (collection[id] ?? 0) + 1;
  }
  // Include 1 playable complete 3-Piece Maximum Titan set so players can test Maximum Summon right away!
  collection['max_aether_emperor_l'] = Math.max(collection['max_aether_emperor_l'] ?? 0, 1);
  collection['max_aether_emperor_c'] = Math.max(collection['max_aether_emperor_c'] ?? 0, 1);
  collection['max_aether_emperor_r'] = Math.max(collection['max_aether_emperor_r'] ?? 0, 1);
  return collection;
}
