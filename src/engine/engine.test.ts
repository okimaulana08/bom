import { describe, expect, it } from 'vitest';
import {
  canEvolveUnit,
  createDuel,
  declareAttack,
  endTurn,
  evolveUnit,
  executeContactFusion,
  playCard,
  soulBurn,
  submitMulligan,
  toggleStance,
} from './rules';
import type { CardDef } from './types';

const TEST_REGISTRY: Record<string, CardDef> = {
  pyro_hatchling: {
    id: 'pyro_hatchling',
    name: 'Pyroclast Hatchling',
    faction: 'pyroclast',
    type: 'vanguard',
    rarity: 'common',
    level: 3,
    atk: 1300,
    def: 900,
    keywords: ['Swift'],
    effectText: 'Swift.',
    lore: 'Test card.',
    art: '/assets/cards/pyro_hatchling.svg',
    evolvedData: {
      name: 'Ignis Skywyrm',
      title: 'Awakened Wyrm',
      atk: 2300,
      def: 1600,
      keywords: ['Swift', 'Pierce'],
      effectText: 'On Evolve: Deal 600 LP damage.',
      onEvolve: [{ kind: 'damage_enemy_lp', amount: 600 }],
      innateCondition: {
        type: 'defeat_enemy',
        description: 'Destroy an enemy monster to evolve for free.',
      },
    },
  },
  pyro_bruiser: {
    id: 'pyro_bruiser',
    name: 'Obsidian Bruiser',
    faction: 'pyroclast',
    type: 'vanguard',
    rarity: 'common',
    level: 4,
    atk: 1900,
    def: 1100,
    keywords: ['Pierce'],
    effectText: 'Pierce.',
    lore: 'Beater.',
    art: '/assets/cards/pyro_slag_golem.svg',
  },
  pyro_boss: {
    id: 'pyro_boss',
    name: 'Ignis Rex',
    faction: 'pyroclast',
    type: 'vanguard',
    rarity: 'mythic',
    level: 6,
    atk: 2500,
    def: 2000,
    keywords: ['Pierce'],
    effectText: 'Level 6 (1 Tribute).',
    lore: 'Tribute boss.',
    art: '/assets/cards/pyro_inferno_sovereign.jpg',
  },
  cryo_sentry: {
    id: 'cryo_sentry',
    name: 'Frost-Bit Drone',
    faction: 'cryo_mecha',
    type: 'vanguard',
    rarity: 'common',
    level: 2,
    atk: 800,
    def: 1900,
    keywords: ['Resonate'],
    effectText: 'FLIP: Draw 1. Resonate: Draw 1.',
    lore: 'Test cryo wall.',
    art: '/assets/cards/cryo_frost_drone.svg',
    onFlip: [{ kind: 'draw', amount: 1 }],
    onResonate: [{ kind: 'draw', amount: 1 }],
  },
  frostfire_chimera: {
    id: 'frostfire_chimera',
    name: 'Frostfire Chimera',
    faction: 'pyroclast',
    secondaryFaction: 'cryo_mecha',
    type: 'fusion_apex',
    rarity: 'mythic',
    level: 8,
    atk: 2800,
    def: 2400,
    keywords: ['Pierce', 'Ward'],
    effectText: 'On Summon: Destroy enemy monsters <=1800 ATK.',
    lore: 'Dual faction boss.',
    art: '/assets/cards/fusion_frostfire_chimera.jpg',
    onSummon: [{ kind: 'destroy_all_enemies_atk_le', atkThreshold: 1800 }],
    fusionRecipe: {
      materials: [
        { faction: 'pyroclast', label: '1 Pyroclast' },
        { faction: 'cryo_mecha', label: '1 Cryo-Mecha' },
      ],
      summary: '1 Pyroclast + 1 Cryo-Mecha',
    },
  },
  relic_blade: {
    id: 'relic_blade',
    name: 'Searing Fangblade',
    faction: 'pyroclast',
    type: 'relic',
    rarity: 'rare',
    level: 0,
    keywords: [],
    targetMode: 'friendly_unit',
    effectText: 'Equip: +600 ATK, +200 DEF, Pierce.',
    lore: 'Test relic.',
    art: '/assets/cards/pyro_magma_edge.svg',
    relicBonus: { atk: 600, def: 200, keywords: ['Pierce'] },
  },
  umbra_shadow_snare: {
    id: 'umbra_shadow_snare',
    name: 'Shadow Snare',
    faction: 'umbra',
    type: 'ambush',
    rarity: 'rare',
    level: 0,
    keywords: [],
    ambushTrigger: 'on_attack',
    effectText: 'Trap (On Attack): Destroy attacking monster.',
    lore: 'Sakuretsu trap.',
    art: '/assets/cards/umbra_shadow_snare.svg',
    ambushEffects: [{ kind: 'destroy_attacker' }],
  },
  umbra_void_counter: {
    id: 'umbra_void_counter',
    name: 'Nullify Rift',
    faction: 'umbra',
    type: 'ambush',
    rarity: 'epic',
    level: 0,
    keywords: [],
    ambushTrigger: 'on_spell',
    effectText: 'Counter Trap (On Spell): Negate enemy Arcana.',
    lore: 'Counter trap.',
    art: '/assets/cards/umbra_void_counter.svg',
    ambushEffects: [{ kind: 'counter_spell' }],
  },
  pyro_bolt: {
    id: 'pyro_bolt',
    name: 'Ember Lance',
    faction: 'pyroclast',
    type: 'arcana',
    arcanaSubtype: 'instant',
    rarity: 'common',
    level: 0,
    keywords: [],
    targetMode: 'enemy_or_face',
    effectText: 'Deal 800 LP damage or destroy <=1800 ATK.',
    lore: 'Burn spell.',
    art: '/assets/cards/pyro_ember_bolt.svg',
    onPlay: [{ kind: 'destroy_or_burn', atkThreshold: 1800, amount: 800 }],
  },
  test_rift_breaker: {
    id: 'test_rift_breaker',
    name: 'Rift Breaker',
    faction: 'chrono',
    type: 'arcana',
    arcanaSubtype: 'instant',
    rarity: 'rare',
    level: 0,
    keywords: [],
    targetMode: 'none',
    effectText: 'Destroy enemy backrow; if >=1 destroyed, draw 1.',
    lore: 'Backrow wipe.',
    art: '/assets/cards/chrono_rift_breaker.jpg',
    onPlay: [{ kind: 'destroy_enemy_backrow', amount: 1 }],
  },
  test_aether_vessel: {
    id: 'test_aether_vessel',
    name: 'Aether Vessel',
    faction: 'chrono',
    type: 'arcana',
    arcanaSubtype: 'instant',
    rarity: 'epic',
    level: 0,
    keywords: [],
    targetMode: 'none',
    effectText: 'Pay 500 LP, draw 2.',
    lore: 'Draw engine.',
    art: '/assets/cards/chrono_aether_vessel.jpg',
    onPlay: [
      { kind: 'pay_lp', amount: 500 },
      { kind: 'draw', amount: 2 },
    ],
  },
  test_void_reclaim: {
    id: 'test_void_reclaim',
    name: 'Void Reclaim',
    faction: 'umbra',
    type: 'arcana',
    arcanaSubtype: 'instant',
    rarity: 'rare',
    level: 0,
    keywords: [],
    targetMode: 'none',
    effectText: 'Recover strongest monster from Void to Hand + heal 600 LP.',
    lore: 'Void recovery.',
    art: '/assets/cards/umbra_void_reclaim.jpg',
    onPlay: [
      { kind: 'recover_void_to_hand' },
      { kind: 'heal_lp', amount: 600 },
    ],
  },
  test_eclipse_domain: {
    id: 'test_eclipse_domain',
    name: 'Eclipse Sanctum',
    faction: 'umbra',
    type: 'arcana',
    arcanaSubtype: 'domain',
    rarity: 'epic',
    level: 0,
    keywords: [],
    targetMode: 'none',
    effectText: 'Domain: +300 ATK; EoT drain 300 LP.',
    lore: 'Umbra domain.',
    art: '/assets/cards/umbra_eclipse_sanctum.jpg',
    domainBonus: { friendlyAtk: 300, endTurnHeal: 300, endTurnBurn: 300 },
  },
  test_aether_reflector: {
    id: 'test_aether_reflector',
    name: 'Aether Reflector',
    faction: 'chrono',
    type: 'ambush',
    rarity: 'epic',
    level: 0,
    keywords: [],
    ambushTrigger: 'on_attack',
    effectText: 'Negate attack & reflect ATK damage (max 2200).',
    lore: 'Magic Cylinder.',
    art: '/assets/cards/chrono_aether_reflector.jpg',
    ambushEffects: [{ kind: 'reflect_attacker_atk', amount: 2200 }],
  },
  test_mirror_force: {
    id: 'test_mirror_force',
    name: 'Crimson Mirror Force',
    faction: 'pyroclast',
    type: 'ambush',
    rarity: 'mythic',
    level: 0,
    keywords: [],
    ambushTrigger: 'on_attack',
    effectText: 'Negate attack & destroy all Attack Position enemy monsters.',
    lore: 'Mirror Force.',
    art: '/assets/cards/pyro_mirror_force.jpg',
    ambushEffects: [{ kind: 'destroy_all_enemy_attackers' }],
  },
  test_dimensional_banish: {
    id: 'test_dimensional_banish',
    name: 'Dimensional Banish',
    faction: 'cryo_mecha',
    type: 'ambush',
    rarity: 'epic',
    level: 0,
    keywords: [],
    ambushTrigger: 'on_summon',
    effectText: 'Bounce newly summoned enemy monster & draw 1.',
    lore: 'Summon trap.',
    art: '/assets/cards/cryo_dimensional_banish.jpg',
    ambushEffects: [
      { kind: 'bounce_unit' },
      { kind: 'draw', amount: 1 },
    ],
  },
  fusion_no_ward: {
    id: 'fusion_no_ward',
    name: 'Test Fusion Apex',
    faction: 'pyroclast',
    secondaryFaction: 'cryo_mecha',
    type: 'fusion_apex',
    rarity: 'mythic',
    level: 8,
    atk: 2600,
    def: 2100,
    keywords: ['Pierce'],
    effectText: 'Fusion without Ward for bounce testing.',
    lore: 'Test fusion.',
    art: '/assets/cards/fusion_frostfire_chimera.jpg',
    fusionRecipe: {
      materials: [
        { faction: 'pyroclast', label: '1 Pyroclast' },
        { faction: 'cryo_mecha', label: '1 Cryo-Mecha' },
      ],
      summary: '1 Pyroclast + 1 Cryo-Mecha',
    },
  },
};

function makeDeck(cardIds: string[]): string[] {
  const deck: string[] = [];
  while (deck.length < 30) {
    deck.push(cardIds[deck.length % cardIds.length]);
  }
  return deck;
}

describe('Aetherbound: Yu-Gi-Oh! Rush Duel Engine', () => {
  it('initializes 8000 LP, supports Unlimited Turn 1 Rush Summons & Rush Draw to 5, and enforces Turn 1 No-Battle', () => {
    const initial = createDuel(
      {
        playerName: 'Yugi',
        opponentName: 'Kaiba',
        playerDeck: makeDeck(['pyro_bruiser']),
        playerRiftDeck: [],
        opponentDeck: makeDeck(['pyro_hatchling']),
        opponentRiftDeck: [],
        seed: 42,
      },
      TEST_REGISTRY
    );

    expect(initial.players.player.lp).toBe(8000);
    expect(initial.players.opponent.lp).toBe(8000);

    let s = submitMulligan(initial, [], TEST_REGISTRY).state;
    // Going first keeps 5 cards on Turn 1 and gets Unlimited Rush Summons!
    expect(s.players.player.hand.length).toBe(5);
    expect(s.players.player.normalSummonsLeft).toBeGreaterThanOrEqual(99);

    // Summon TWO 1900 ATK Bruisers on Turn 1! (Rush Duel Unlimited Normal Summons)
    s = playCard(s, 'player', s.players.player.hand[0].instanceId, { slot: 0 }, TEST_REGISTRY).state;
    const secondSummon = playCard(s, 'player', s.players.player.hand[0].instanceId, { slot: 1 }, TEST_REGISTRY);
    expect(secondSummon.ok).toBe(true);
    s = secondSummon.state;
    expect(s.players.player.vanguard[0]?.cardId).toBe('pyro_bruiser');
    expect(s.players.player.vanguard[1]?.cardId).toBe('pyro_bruiser');
    expect(s.players.player.hand.length).toBe(3);

    // Still cannot attack on Turn 1!
    const t1Atk = declareAttack(
      s,
      'player',
      s.players.player.vanguard[0]!.instanceId,
      { kind: 'lp' },
      TEST_REGISTRY
    );
    expect(t1Atk.ok).toBe(false);

    // Pass to Opponent Turn 2 -> Opponent summons Hatchling (1300 ATK)
    s = endTurn(s, 'player', TEST_REGISTRY).state;
    expect(s.turnNumber).toBe(2);
    s = playCard(s, 'opponent', s.players.opponent.hand[0].instanceId, { slot: 0 }, TEST_REGISTRY).state;

    // Pass back to Player Turn 3 -> Rush Draw refills player hand from 3 back to 5!
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;
    expect(s.players.player.hand.length).toBe(5);

    // Bruiser (1900) attacks Hatchling (1300) -> kills + 600 Battle Damage (8000 -> 7400)!
    const res = declareAttack(
      s,
      'player',
      s.players.player.vanguard[0]!.instanceId,
      { kind: 'unit', instanceId: s.players.opponent.vanguard[0]!.instanceId },
      TEST_REGISTRY
    );
    expect(res.ok).toBe(true);
    expect(res.state.players.opponent.vanguard[0]).toBeNull();
    expect(res.state.players.opponent.lp).toBe(7400);
  });

  it('handles Unlimited Turn-1 Tribute Chains (★6 = 1 Tribute) & Soul Burn (Cycle +1 Draw + Resonate)', () => {
    const d0 = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Rival',
        playerDeck: makeDeck(['cryo_sentry', 'pyro_boss']),
        playerRiftDeck: [],
        opponentDeck: makeDeck(['cryo_sentry']),
        opponentRiftDeck: [],
        seed: 7,
      },
      TEST_REGISTRY
    );
    let s = submitMulligan(d0, [], TEST_REGISTRY).state;
    s.players.player.hand = [
      { instanceId: 'c1', cardId: 'cryo_sentry' },
      { instanceId: 'c2', cardId: 'cryo_sentry' },
      { instanceId: 'b1', cardId: 'pyro_boss' },
    ];

    // Normal Summon Cryo Sentry (★2) — Rush Duel still allows unlimited further summons!
    s = playCard(s, 'player', 'c1', { slot: 0 }, TEST_REGISTRY).state;
    expect(s.players.player.normalSummonsLeft).toBeGreaterThanOrEqual(99);

    // Soul Burn a second Cryo Sentry -> Discards 1, draws 1 + Resonate draws 1 (net +1 hand)!
    const handBefore = s.players.player.hand.length;
    const burnRes = soulBurn(s, 'player', 'c2', TEST_REGISTRY);
    expect(burnRes.ok).toBe(true);
    s = burnRes.state;
    expect(s.players.player.hand.length).toBe(handBefore + 1); // -1 discard + 1 Soul Burn draw + 1 Resonate draw!

    // Tribute Summon ★6 Ignis Rex (2500 ATK) sacrificing Cryo Sentry on field on the SAME turn!
    const fieldUnit = s.players.player.vanguard[0]!;
    const tribRes = playCard(
      s,
      'player',
      'b1',
      { tributeInstanceIds: [fieldUnit.instanceId] },
      TEST_REGISTRY
    );
    expect(tribRes.ok).toBe(true);
    expect(tribRes.state.players.player.vanguard[0]?.cardId).toBe('pyro_boss');
    // Tributed Cryo Sentry ALSO fired Resonate!
    expect(tribRes.state.recentEvents.some((e) => e.type === 'resonate')).toBe(true);
  });

  it('handles Face-Down Defense Set, FLIP reveal, Recoil LP Damage, and Vex-09 (+300 DEF)', () => {
    const d0 = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Warden Vex-09',
        playerDeck: makeDeck(['pyro_bruiser']),
        playerRiftDeck: [],
        opponentDeck: makeDeck(['cryo_sentry']),
        opponentRiftDeck: [],
        bossModifier: 'cryo_guard_armor',
        seed: 10,
      },
      TEST_REGISTRY
    );
    let s = submitMulligan(d0, [], TEST_REGISTRY).state;
    // Player summons 1900 ATK Bruiser
    s = playCard(s, 'player', s.players.player.hand[0].instanceId, { slot: 0 }, TEST_REGISTRY).state;
    s = endTurn(s, 'player', TEST_REGISTRY).state;

    // Vex-09 Sets Cryo Sentry (1900 DEF + 300 Boss Rule = 2200 DEF!) Face-Down!
    const handBeforeFlip = s.players.opponent.hand.length - 1;
    s = playCard(
      s,
      'opponent',
      s.players.opponent.hand[0].instanceId,
      { slot: 0, summonMode: 'defense' },
      TEST_REGISTRY
    ).state;
    expect(s.players.opponent.vanguard[0]?.faceDown).toBe(true);
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;

    // Player attacks Face-Down Defense: flips face-up (FLIP draws 1!), 1900 ATK vs 2200 DEF -> 300 Recoil LP to Player (8000 -> 7700)!
    const atkRes = declareAttack(
      s,
      'player',
      s.players.player.vanguard[0]!.instanceId,
      { kind: 'unit', instanceId: s.players.opponent.vanguard[0]!.instanceId },
      TEST_REGISTRY
    );
    expect(atkRes.ok).toBe(true);
    expect(atkRes.state.players.opponent.vanguard[0]?.faceDown).toBe(false);
    expect(atkRes.state.players.opponent.hand.length).toBe(handBeforeFlip + 1); // FLIP drew 1!
    expect(atkRes.state.players.player.lp).toBe(7700); // 300 Recoil LP!
  });

  it('evolves monsters on Turn 3 preserving Equip Relics and deals On-Evolve LP burn', () => {
    const d0 = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Rival',
        playerDeck: makeDeck(['pyro_hatchling', 'relic_blade']),
        playerRiftDeck: [],
        opponentDeck: makeDeck(['cryo_sentry']),
        opponentRiftDeck: [],
        seed: 11,
      },
      TEST_REGISTRY
    );
    let s = submitMulligan(d0, [], TEST_REGISTRY).state;

    const hatchCard = s.players.player.hand.find((h) => h.cardId === 'pyro_hatchling')!;
    s = playCard(s, 'player', hatchCard.instanceId, { slot: 0 }, TEST_REGISTRY).state;
    const unitId = s.players.player.vanguard[0]!.instanceId;
    expect(canEvolveUnit(s, 'player', unitId, TEST_REGISTRY).eligible).toBe(false);

    // Equip Relic (+600 ATK, +200 DEF) -> 1900 / 1100
    const relicCard = s.players.player.hand.find((h) => h.cardId === 'relic_blade')!;
    s = playCard(s, 'player', relicCard.instanceId, { targetInstanceId: unitId }, TEST_REGISTRY).state;
    expect(s.players.player.vanguard[0]!.currentAtk).toBe(1900);

    // Advance to Player Turn 3
    s = endTurn(s, 'player', TEST_REGISTRY).state;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;
    s = endTurn(s, 'player', TEST_REGISTRY).state;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;

    expect(canEvolveUnit(s, 'player', unitId, TEST_REGISTRY).eligible).toBe(true);
    const evoRes = evolveUnit(s, 'player', unitId, TEST_REGISTRY);
    expect(evoRes.ok).toBe(true);
    const evolved = evoRes.state.players.player.vanguard[0]!;
    expect(evolved.isEvolved).toBe(true);
    // 1300 -> 2300 (+1000) + Relic 600 = 2900 ATK!
    expect(evolved.currentAtk).toBe(2900);
    expect(evolved.attachedRelics).toContain('relic_blade');
    expect(evoRes.state.players.opponent.lp).toBe(7400); // 600 On-Evolve burn (8000 -> 7400)
  });

  it('executes Dual-Faction Contact Fusion (0 Normal Summon cost) and triggers Traps on next turn', () => {
    const d0 = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Nyx',
        playerDeck: makeDeck(['pyro_hatchling', 'cryo_sentry', 'pyro_bolt']),
        playerRiftDeck: ['frostfire_chimera'],
        opponentDeck: makeDeck(['umbra_shadow_snare', 'umbra_void_counter']),
        opponentRiftDeck: [],
        seed: 55,
      },
      TEST_REGISTRY
    );
    let s = submitMulligan(d0, [], TEST_REGISTRY).state;
    s.players.player.hand = [
      { instanceId: 'p_h1', cardId: 'pyro_hatchling' },
      { instanceId: 'p_c1', cardId: 'cryo_sentry' },
      { instanceId: 'p_b1', cardId: 'pyro_bolt' },
    ];
    s.players.opponent.hand = [
      { instanceId: 'o_t1', cardId: 'umbra_shadow_snare' },
      { instanceId: 'o_t2', cardId: 'umbra_void_counter' },
    ];
    s = playCard(s, 'player', 'p_h1', { slot: 0 }, TEST_REGISTRY).state;
    s = endTurn(s, 'player', TEST_REGISTRY).state;

    // Opponent sets both Shadow Snare & Nullify Rift
    s = playCard(s, 'opponent', 'o_t1', { slot: 0 }, TEST_REGISTRY).state;
    s = playCard(s, 'opponent', 'o_t2', { slot: 1 }, TEST_REGISTRY).state;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;

    // Player Turn 2: Summon Cryo Sentry & Contact Fuse into Frostfire Chimera (2800/2400)
    s = playCard(s, 'player', 'p_c1', { slot: 1 }, TEST_REGISTRY).state;

    const fuseRes = executeContactFusion(
      s,
      'player',
      'frostfire_chimera',
      [
        { source: 'field', instanceId: s.players.player.vanguard[0]!.instanceId, cardId: 'pyro_hatchling' },
        { source: 'field', instanceId: s.players.player.vanguard[1]!.instanceId, cardId: 'cryo_sentry' },
      ],
      TEST_REGISTRY
    );
    expect(fuseRes.ok).toBe(true);
    s = fuseRes.state;
    expect(s.players.player.vanguard[0]?.cardId).toBe('frostfire_chimera');

    // Cast Ember Lance -> countered by Nullify Rift!
    s = playCard(s, 'player', 'p_b1', { targetPlayer: 'opponent' }, TEST_REGISTRY).state;
    expect(s.players.opponent.lp).toBe(8000);

    // Attack with Frostfire Chimera (has Ward!) -> Shadow Snare triggers and breaks Ward instead of destroying Chimera!
    const atkRes = declareAttack(
      s,
      'player',
      s.players.player.vanguard[0]!.instanceId,
      { kind: 'lp' },
      TEST_REGISTRY
    );
    expect(atkRes.ok).toBe(true);
    expect(atkRes.state.players.player.vanguard[0]?.wardActive).toBe(false);
    // Attack continues through Ward for 2800 Direct Damage (8000 -> 5200)!
    expect(atkRes.state.players.opponent.lp).toBe(5200);
  });

  it('allows Flip Summon on the turn AFTER Setting Face-Down Defense', () => {
    const d0 = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Rival',
        playerDeck: makeDeck(['cryo_sentry']),
        playerRiftDeck: [],
        opponentDeck: makeDeck(['cryo_sentry']),
        opponentRiftDeck: [],
        seed: 33,
      },
      TEST_REGISTRY
    );
    let s = submitMulligan(d0, [], TEST_REGISTRY).state;
    s = playCard(
      s,
      'player',
      s.players.player.hand[0].instanceId,
      { slot: 0, summonMode: 'defense' },
      TEST_REGISTRY
    ).state;

    // Cannot change position same turn
    const sameTurn = toggleStance(s, 'player', s.players.player.vanguard[0]!.instanceId, TEST_REGISTRY);
    expect(sameTurn.ok).toBe(false);

    // Next player turn -> Flip Summon to Attack Position & trigger FLIP Draw 1!
    s = endTurn(s, 'player', TEST_REGISTRY).state;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;
    const handBefore = s.players.player.hand.length;
    const flipRes = toggleStance(s, 'player', s.players.player.vanguard[0]!.instanceId, TEST_REGISTRY);
    expect(flipRes.ok).toBe(true);
    expect(flipRes.state.players.player.vanguard[0]?.faceDown).toBe(false);
    expect(flipRes.state.players.player.vanguard[0]?.stance).toBe('attack');
    expect(flipRes.state.players.player.hand.length).toBe(handBefore + 1);
  });

  it('resolves Set 3 Spells: Rift Breaker backrow wipe, Aether Vessel LP cost/guard & Void Reclaim', () => {
    const d0 = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Rival',
        playerDeck: makeDeck(['pyro_bruiser', 'pyro_boss']),
        playerRiftDeck: [],
        opponentDeck: makeDeck(['umbra_shadow_snare', 'test_eclipse_domain']),
        opponentRiftDeck: [],
        seed: 77,
      },
      TEST_REGISTRY
    );
    let s = submitMulligan(d0, [], TEST_REGISTRY).state;
    s = endTurn(s, 'player', TEST_REGISTRY).state;

    // Opponent sets Trap + activates Eclipse Sanctum Domain (triggers EoT 300 LP drain -> player 7700, opp 8300)
    s.players.opponent.hand = [
      { instanceId: 'o_trap', cardId: 'umbra_shadow_snare' },
      { instanceId: 'o_dom', cardId: 'test_eclipse_domain' },
    ];
    s = playCard(s, 'opponent', 'o_trap', { slot: 0 }, TEST_REGISTRY).state;
    s = playCard(s, 'opponent', 'o_dom', { slot: 1 }, TEST_REGISTRY).state;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;
    expect(s.players.player.lp).toBe(7700);
    expect(s.players.opponent.lp).toBe(8300);

    // Player casts Rift Breaker -> wipes BOTH enemy Arcane slots & draws 1!
    s.players.player.hand = [
      { instanceId: 'p_rb', cardId: 'test_rift_breaker' },
      { instanceId: 'p_av', cardId: 'test_aether_vessel' },
      { instanceId: 'p_vr', cardId: 'test_void_reclaim' },
    ];
    s.players.player.voidPile = ['pyro_hatchling', 'pyro_boss'];

    const rbRes = playCard(s, 'player', 'p_rb', {}, TEST_REGISTRY);
    expect(rbRes.ok).toBe(true);
    s = rbRes.state;
    expect(s.players.opponent.arcane[0]).toBeNull();
    expect(s.players.opponent.arcane[1]).toBeNull();
    expect(s.players.opponent.voidPile).toContain('umbra_shadow_snare');
    expect(s.players.opponent.voidPile).toContain('test_eclipse_domain');
    // Hand was 3 -> -1 Rift Breaker + 1 Draw = 3
    expect(s.players.player.hand.length).toBe(3);

    // Player casts Aether Vessel -> pays 500 LP (7700 -> 7200) & draws 2 (3 - 1 + 2 = 4)
    const avRes = playCard(s, 'player', 'p_av', {}, TEST_REGISTRY);
    expect(avRes.ok).toBe(true);
    s = avRes.state;
    expect(s.players.player.lp).toBe(7200);
    expect(s.players.player.hand.length).toBe(4);

    // Aether Vessel must be rejected when LP <= 500
    s.players.player.lp = 500;
    s.players.player.hand.push({ instanceId: 'p_av2', cardId: 'test_aether_vessel' });
    const lowLpRes = playCard(s, 'player', 'p_av2', {}, TEST_REGISTRY);
    expect(lowLpRes.ok).toBe(false);

    // Player casts Void Reclaim -> recovers strongest monster (pyro_boss 2500 ATK) to Hand + heals +600 LP (500 -> 1100)
    const vrRes = playCard(s, 'player', 'p_vr', {}, TEST_REGISTRY);
    expect(vrRes.ok).toBe(true);
    s = vrRes.state;
    expect(s.players.player.lp).toBe(1100);
    expect(s.players.player.hand.some((h) => h.cardId === 'pyro_boss')).toBe(true);
    expect(s.players.player.voidPile).not.toContain('pyro_boss');
  });

  it('resolves Set 3 Traps: Aether Reflector (capped 2200), Crimson Mirror Force & Dimensional Banish', () => {
    const d0 = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Rival',
        playerDeck: makeDeck(['pyro_bruiser', 'cryo_sentry', 'pyro_boss']),
        playerRiftDeck: ['fusion_no_ward'],
        opponentDeck: makeDeck(['test_aether_reflector', 'test_mirror_force', 'test_dimensional_banish']),
        opponentRiftDeck: [],
        seed: 88,
      },
      TEST_REGISTRY
    );
    let s = submitMulligan(d0, [], TEST_REGISTRY).state;

    // Turn 1: Player summons Bruiser (1900 ATK) in ATK & Sets Cryo Sentry in DEF
    s.players.player.hand = [
      { instanceId: 'p1', cardId: 'pyro_bruiser' },
      { instanceId: 'p2', cardId: 'cryo_sentry' },
      { instanceId: 'p3', cardId: 'pyro_hatchling' },
      { instanceId: 'p4', cardId: 'pyro_boss' },
    ];
    s = playCard(s, 'player', 'p1', { slot: 0, summonMode: 'attack' }, TEST_REGISTRY).state;
    s = endTurn(s, 'player', TEST_REGISTRY).state;

    // Turn 2: Opponent sets Aether Reflector & Crimson Mirror Force
    s.players.opponent.hand = [
      { instanceId: 'o_ref', cardId: 'test_aether_reflector' },
      { instanceId: 'o_mf', cardId: 'test_mirror_force' },
    ];
    s = playCard(s, 'opponent', 'o_ref', { slot: 0 }, TEST_REGISTRY).state;
    s = playCard(s, 'opponent', 'o_mf', { slot: 1 }, TEST_REGISTRY).state;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;

    // Turn 3: Player Tribute Summons Ignis Rex (2500 ATK) in slot 0, and sets Cryo Sentry via Soul Burn + extra summon in slot 1 DEF
    const bruiserId = s.players.player.vanguard[0]!.instanceId;
    s = playCard(s, 'player', 'p4', { tributeInstanceIds: [bruiserId] }, TEST_REGISTRY).state;
    // Attack with 2500 ATK Ignis Rex -> Aether Reflector triggers FIRST (slot 0), negates attack, reflects capped 2200 LP!
    const refAtk = declareAttack(
      s,
      'player',
      s.players.player.vanguard[0]!.instanceId,
      { kind: 'lp' },
      TEST_REGISTRY
    );
    expect(refAtk.ok).toBe(true);
    s = refAtk.state;
    expect(s.players.opponent.lp).toBe(8000);
    expect(s.players.player.lp).toBe(5800); // 8000 - 2200 cap!
    expect(s.players.player.vanguard[0]?.cardId).toBe('pyro_boss'); // Ignis Rex survived Reflector

    // Advance to next Player turn -> add 2nd Attack monster & 1 Face-Down DEF monster, then attack into Crimson Mirror Force!
    s = endTurn(s, 'player', TEST_REGISTRY).state;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;
    s.players.player.hand = [
      { instanceId: 'p_atk2', cardId: 'pyro_bruiser' },
      { instanceId: 'p_def1', cardId: 'cryo_sentry' },
    ];
    s = playCard(s, 'player', 'p_atk2', { slot: 1, summonMode: 'attack' }, TEST_REGISTRY).state;
    s = playCard(s, 'player', 'p_def1', { slot: 2, summonMode: 'defense' }, TEST_REGISTRY).state;

    // Attack with Ignis Rex -> Crimson Mirror Force destroys BOTH Attack Position monsters (slots 0 & 1), spares DEF slot 2!
    const mfAtk = declareAttack(
      s,
      'player',
      s.players.player.vanguard[0]!.instanceId,
      { kind: 'lp' },
      TEST_REGISTRY
    );
    expect(mfAtk.ok).toBe(true);
    s = mfAtk.state;
    expect(s.players.opponent.lp).toBe(8000);
    expect(s.players.player.vanguard[0]).toBeNull();
    expect(s.players.player.vanguard[1]).toBeNull();
    expect(s.players.player.vanguard[2]?.cardId).toBe('cryo_sentry');

    // Now test Dimensional Banish against Contact Fusion!
    s = endTurn(s, 'player', TEST_REGISTRY).state;
    s.players.opponent.hand = [{ instanceId: 'o_db', cardId: 'test_dimensional_banish' }];
    s = playCard(s, 'opponent', 'o_db', { slot: 0 }, TEST_REGISTRY).state;
    const oppHandBeforeBanish = s.players.opponent.hand.length;
    s = endTurn(s, 'opponent', TEST_REGISTRY).state;

    // Player summons pyro_hatchling in slot 0 (Wait — Dimensional Banish triggers on_summon! Test on Contact Fusion by setting pyro_hatchling face-down first, or placing on field)
    // Put both fusion materials on field directly via face-down set (doesn't trigger on_summon), then Contact Fuse face-up!
    s.players.player.hand = [{ instanceId: 'p_h_set', cardId: 'pyro_hatchling' }];
    s = playCard(s, 'player', 'p_h_set', { slot: 0, summonMode: 'defense' }, TEST_REGISTRY).state;
    const fuseBanish = executeContactFusion(
      s,
      'player',
      'fusion_no_ward',
      [
        { source: 'field', instanceId: s.players.player.vanguard[0]!.instanceId, cardId: 'pyro_hatchling' },
        { source: 'field', instanceId: s.players.player.vanguard[2]!.instanceId, cardId: 'cryo_sentry' },
      ],
      TEST_REGISTRY
    );
    expect(fuseBanish.ok).toBe(true);
    s = fuseBanish.state;
    // Dimensional Banish bounced Fusion Apex back to Player's Rift Deck & Opponent drew 1 card!
    expect(s.players.player.vanguard.every((v) => v === null)).toBe(true);
    expect(s.players.player.riftDeck).toContain('fusion_no_ward');
    expect(s.players.opponent.hand.length).toBe(oppHandBeforeBanish + 1);
  });
});
