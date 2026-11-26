import { beforeEach, describe, expect, it } from 'vitest';
import { useProfileStore } from './profileStore';
import { CARD_MAP } from '../data/cards';
import { STARTER_DECK } from '../data/decks';
import { CAMPAIGN_CHAPTERS } from '../data/campaign';
import { countClaimableMissions, getDuelistRank } from '../data/missions';
import {
  createDuel,
  endTurn,
  evolveUnit,
  playCard,
  submitMulligan,
} from '../engine/rules';

describe('End-to-End Progression, Economy, Crafting, Campaign & Duel Flow', () => {
  beforeEach(() => {
    useProfileStore.getState().resetProfile();
  });

  it('completes full loop: open packs -> craft card -> edit deck -> clear campaign -> unlock exclusive Sovereign', () => {
    const store = useProfileStore.getState();

    // 1. Verify starting state: 600 Coins + complete Starter Deck unlocked
    expect(store.coins).toBe(600);
    expect(store.decks.length).toBe(1);
    expect(store.decks[0].mainDeck.length).toBe(30);
    expect(store.collection['fusion_frostfire_chimera']).toBe(2);

    // 2. Open 2 Booster Packs (Thermal Core & Astral Eclipse) -> 600 -> 400 Coins
    const pack1 = useProfileStore.getState().openPack('thermal_core');
    expect(pack1.ok).toBe(true);
    expect(pack1.result?.pulls.length).toBe(5);
    const pack2 = useProfileStore.getState().openPack('astral_eclipse');
    expect(pack2.ok).toBe(true);
    expect(useProfileStore.getState().coins).toBe(400);
    expect(useProfileStore.getState().stats.packsOpened).toBe(2);

    // 3. Exclusive Aether Sovereign cannot be crafted before beating Chapter 5
    const blockedCraft = useProfileStore.getState().craftCard('fusion_aether_sovereign');
    expect(blockedCraft.ok).toBe(false);

    // 4. Craft a missing Common card with starting Dust (120 Dust -> 80 Dust)
    const craftRes = useProfileStore.getState().craftCard('sylvan_spirit_fox');
    expect(craftRes.ok).toBe(true);
    expect(useProfileStore.getState().collection['sylvan_spirit_fox']).toBeGreaterThanOrEqual(1);

    // 5. Save a custom edited deck
    useProfileStore.getState().saveDeck({
      id: 'custom_test_deck',
      name: 'My Rift Striker',
      mainDeck: [...STARTER_DECK.mainDeck],
      riftDeck: [...STARTER_DECK.riftDeck],
    });
    expect(useProfileStore.getState().decks.some((d) => d.id === 'custom_test_deck')).toBe(true);

    // 6. Win Campaign Chapter 1 -> 250 Coins + Mythic Ignis Rex unlocked
    const ch1Reward = useProfileStore.getState().recordDuelResult({
      won: true,
      chapterId: 1,
      fusionsPerformed: 1,
      evolutionsPerformed: 1,
    });
    expect(ch1Reward.coinsEarned).toBe(250);
    expect(ch1Reward.bonusCardId).toBe('pyro_inferno_sovereign');
    expect(useProfileStore.getState().completedChapters).toContain(1);
    expect(useProfileStore.getState().collection['pyro_inferno_sovereign']).toBeGreaterThanOrEqual(
      1
    );

    // 7. Win Campaign Chapter 5 -> 600 Coins + Exclusive Aether Sovereign + Champion Badge!
    const ch5Reward = useProfileStore.getState().recordDuelResult({
      won: true,
      chapterId: 5,
      fusionsPerformed: 2,
      evolutionsPerformed: 2,
    });
    expect(ch5Reward.coinsEarned).toBe(600);
    expect(ch5Reward.bonusCardId).toBe('fusion_aether_sovereign');
    expect(ch5Reward.championBadgeEarned).toBe(true);
    expect(useProfileStore.getState().hasChampionBadge).toBe(true);
    expect(useProfileStore.getState().collection['fusion_aether_sovereign']).toBe(1);

    // 8. Quick Duel Loss still awards 35 Coins
    const coinsBeforeLoss = useProfileStore.getState().coins;
    const lossReward = useProfileStore.getState().recordDuelResult({
      won: false,
      chapterId: null,
      fusionsPerformed: 0,
      evolutionsPerformed: 0,
    });
    expect(lossReward.coinsEarned).toBe(35);
    expect(useProfileStore.getState().coins).toBe(coinsBeforeLoss + 35);
  });

  it('executes Fusion Catalyst from hand + Evolution in a live Chapter 1 duel using real 48-card database', () => {
    const ch1 = CAMPAIGN_CHAPTERS[0];
    // Deterministic deck guaranteed to draw Rift Polymerization + Pyro + Cryo + Evolvable Vanguard
    const stackedDeck = [
      'pyro_hatchling',
      'cryo_frost_drone',
      'chrono_polymerization',
      'cryo_aegis_walker',
      'pyro_magma_edge',
      ...STARTER_DECK.mainDeck.slice(5),
    ];

    let state = createDuel(
      {
        playerName: 'Champion',
        opponentName: ch1.bossName,
        playerDeck: stackedDeck,
        playerRiftDeck: ['fusion_frostfire_chimera'],
        opponentDeck: ch1.deck,
        opponentRiftDeck: ch1.riftDeck,
        bossModifier: ch1.bossModifier,
        chapterId: 1,
        seed: 12345,
      },
      CARD_MAP
    );

    // Verify Chapter 1 Boss Modifier deployed Pyroclast Hatchling on Kael's board
    expect(state.players.opponent.vanguard[1]?.cardId).toBe('pyro_hatchling');

    state = submitMulligan(state, [], CARD_MAP).state;

    // Inject known cards cleanly for deterministic catalyst & evolve verification
    state.players.player.hand = [
      { instanceId: 'h_pyro', cardId: 'pyro_hatchling' },
      { instanceId: 'h_cryo', cardId: 'cryo_frost_drone' },
      { instanceId: 'h_poly', cardId: 'chrono_polymerization' },
      { instanceId: 'h_walker', cardId: 'cryo_aegis_walker' },
    ];

    // Turn 1 (2 Aether): Cast Rift Polymerization using 2 materials straight from Hand!
    const fuseRes = playCard(
      state,
      'player',
      'h_poly',
      {
        fusionCardId: 'fusion_frostfire_chimera',
        fusionMaterials: [
          { source: 'hand', instanceId: 'h_pyro', cardId: 'pyro_hatchling' },
          { source: 'hand', instanceId: 'h_cryo', cardId: 'cryo_frost_drone' },
        ],
      },
      CARD_MAP
    );
    expect(fuseRes.ok).toBe(true);
    state = fuseRes.state;

    // Frostfire Chimera (7/7) summoned, destroyed Kael's 2/2 Hatchling via On Summon 2 AoE, and Frost-Bit Drone Resonate drew 1 card!
    expect(state.players.player.vanguard[0]?.cardId).toBe('fusion_frostfire_chimera');
    expect(state.players.opponent.vanguard[1]).toBeNull();
    expect(state.fusionsPerformed).toBe(1);

    // Advance to Turn 2, summon Aegis Strider MK-II, advance to Turn 3 -> Innate Free Evolve triggers!
    state = endTurn(state, 'player', CARD_MAP).state;
    state = endTurn(state, 'opponent', CARD_MAP).state;

    const sumWalker = playCard(state, 'player', 'h_walker', { slot: 1 }, CARD_MAP);
    expect(sumWalker.ok).toBe(true);
    state = sumWalker.state;

    state = endTurn(state, 'player', CARD_MAP).state;
    state = endTurn(state, 'opponent', CARD_MAP).state;

    const walker = state.players.player.vanguard[1]!;
    expect(walker.innateEvolveReady).toBe(true);

    const evoRes = evolveUnit(state, 'player', walker.instanceId, CARD_MAP);
    expect(evoRes.ok).toBe(true);
    expect(evoRes.state.players.player.vanguard[1]?.isEvolved).toBe(true);
    // Free innate evolution preserved both Evo Orbs!
    expect(evoRes.state.players.player.evoOrbs).toBe(2);
    expect(evoRes.state.evolutionsPerformed).toBe(1);
  });

  it('tracks Duelist Rank, claims Mission rewards, toggles Duel Speed & round-trips JSON Save Backup', () => {
    const store = useProfileStore.getState();
    store.resetProfile();

    expect(getDuelistRank(useProfileStore.getState()).current.id).toBe('bronze');
    expect(useProfileStore.getState().duelSpeed).toBe(1);

    // Toggle Duel Speed 1x -> 2x
    store.toggleDuelSpeed();
    expect(useProfileStore.getState().duelSpeed).toBe(2);

    // Win Chapter 1 with 1 Fusion, 1 Trap & a 2400 LP strike
    store.recordDuelResult({
      won: true,
      chapterId: 1,
      fusionsPerformed: 1,
      evolutionsPerformed: 0,
      trapsTriggered: 1,
      maxSingleHitDamage: 2400,
    });

    const afterWin = useProfileStore.getState();
    expect(getDuelistRank(afterWin).current.id).toBe('silver'); // 100 + 150 + 25 = 275 RP
    expect(countClaimableMissions(afterWin)).toBeGreaterThanOrEqual(2); // first_win + heavy_hit_2000

    const coinsBeforeClaim = afterWin.coins;
    const claimRes = store.claimMission('first_win');
    expect(claimRes.ok).toBe(true);
    expect(useProfileStore.getState().coins).toBe(coinsBeforeClaim + (claimRes.coinsGained ?? 0));

    // Double-claim rejected
    expect(store.claimMission('first_win').ok).toBe(false);

    // Export -> Reset -> Import restores exact Coins, Rank & Claimed Missions!
    const backupJson = store.exportSaveJson();
    const expectedCoins = useProfileStore.getState().coins;

    store.resetProfile();
    expect(useProfileStore.getState().coins).toBe(600);
    expect(useProfileStore.getState().claimedMissions?.length).toBe(0);

    // Rejects malformed JSON
    expect(store.importSaveJson('{bad json').ok).toBe(false);

    // Restores valid JSON
    const restoreRes = store.importSaveJson(backupJson);
    expect(restoreRes.ok).toBe(true);
    expect(useProfileStore.getState().coins).toBe(expectedCoins);
    expect(useProfileStore.getState().claimedMissions).toContain('first_win');
    expect(useProfileStore.getState().duelSpeed).toBe(2);
  });

  it('supports Daily Free Pack (1/day), Royal Prismatic Foil Craft, Skills & 5-Floor Rift Spire Draft Run', () => {
    const store = useProfileStore.getState();
    store.resetProfile();

    // 1. Daily Free Pack opens for 0 Coins once, then locks for the rest of today!
    expect(store.canClaimDailyFreePack()).toBe(true);
    const coinsBefore = store.coins;
    const freeRes = store.openPack('maximum_overlord_pack', true);
    expect(freeRes.ok).toBe(true);
    expect(useProfileStore.getState().coins).toBe(coinsBefore);
    expect(useProfileStore.getState().canClaimDailyFreePack()).toBe(false);
    expect(useProfileStore.getState().openPack('maximum_overlord_pack', true).ok).toBe(false);

    // 2. Royal Prismatic Foil upgrade costs 80 Dust (120 -> 40)
    const dustBefore = useProfileStore.getState().dust;
    const foilRes = useProfileStore.getState().craftRoyalFoil('pyro_hatchling');
    expect(foilRes.ok).toBe(true);
    expect(useProfileStore.getState().royalFoils?.['pyro_hatchling']).toBe(true);
    expect(useProfileStore.getState().dust).toBe(dustBefore - 80);

    // 3. Duelist Skill selection & Tutorial flag
    store.setSelectedSkill('destiny_draw');
    store.completeTutorial();
    expect(useProfileStore.getState().selectedSkillId).toBe('destiny_draw');
    expect(useProfileStore.getState().tutorialCompleted).toBe(true);

    // 4. Rift Spire Run: Start -> Win Floor 1 -> Draft Card + Blessing -> Ascend to Floor 2!
    store.startSpireRun(STARTER_DECK.id);
    expect(useProfileStore.getState().spireRun?.floor).toBe(1);
    expect(useProfileStore.getState().spireRun?.deck.length).toBe(30);

    useProfileStore.getState().recordDuelResult({
      won: true,
      chapterId: null,
      spireFloor: 1,
      remainingPlayerLp: 5500,
      fusionsPerformed: 1,
      evolutionsPerformed: 0,
      maximumsPerformed: 1,
    });

    const afterWin = useProfileStore.getState().spireRun!;
    expect(afterWin.pendingDraft).toBeTruthy();
    expect(afterWin.pendingDraft!.cardChoices.length).toBe(3);
    expect(afterWin.pendingDraft!.blessingChoices.length).toBe(3);

    store.pickSpireDraftCard(afterWin.pendingDraft!.cardChoices[0]);
    store.pickSpireBlessing(afterWin.pendingDraft!.blessingChoices[0]);
    store.advanceSpireFloor();

    const floor2Run = useProfileStore.getState().spireRun!;
    expect(floor2Run.floor).toBe(2);
    expect(floor2Run.deck.length).toBe(31);
    expect(floor2Run.blessings.length).toBe(1);
    expect(floor2Run.currentLp).toBeGreaterThanOrEqual(7000); // 5500 + 1500 rest heal!
  });

  it('tracks 7-Day Login Streak rewards and Per-Deck Winrate & Match History', () => {
    const store = useProfileStore.getState();
    store.resetProfile();

    // 1. Claim Day 1 Login Streak (+150 Coins) and block duplicate same-day claim
    expect(store.canClaimDailyLogin()).toBe(true);
    expect(store.getNextLoginDay()).toBe(1);
    const coinsBefore = store.coins;
    const day1 = store.claimDailyLogin();
    expect(day1.ok).toBe(true);
    expect(day1.day).toBe(1);
    expect(day1.coinsGained).toBe(150);
    expect(useProfileStore.getState().coins).toBe(coinsBefore + 150);
    expect(useProfileStore.getState().canClaimDailyLogin()).toBe(false);
    expect(useProfileStore.getState().claimDailyLogin().ok).toBe(false);

    // 2. Record 2 wins & 1 loss for Starter Deck -> verify Deck Winrate & Match History
    useProfileStore.getState().recordDuelResult({
      won: true,
      chapterId: 6,
      remainingPlayerLp: 6200,
      fusionsPerformed: 1,
      evolutionsPerformed: 1,
      maximumsPerformed: 0,
      deckId: STARTER_DECK.id,
      deckName: STARTER_DECK.name,
      opponentName: 'Pharaoh Atem-Ra',
      turns: 5,
    });
    useProfileStore.getState().recordDuelResult({
      won: false,
      chapterId: null,
      remainingPlayerLp: 0,
      fusionsPerformed: 0,
      evolutionsPerformed: 0,
      deckId: STARTER_DECK.id,
      deckName: STARTER_DECK.name,
      opponentName: 'Commander Nail-Omega',
      turns: 7,
    });

    const after = useProfileStore.getState();
    expect(after.deckRecords?.[STARTER_DECK.id]?.wins).toBe(1);
    expect(after.deckRecords?.[STARTER_DECK.id]?.losses).toBe(1);
    expect(after.matchHistory?.length).toBe(2);
    expect(after.matchHistory?.[0].opponentName).toBe('Commander Nail-Omega');
    expect(after.matchHistory?.[1].opponentName).toBe('Pharaoh Atem-Ra');
    expect(after.completedChapters).toContain(6);
  });
});
