import { describe, expect, it } from 'vitest';
import { CARD_MAP } from '../data/cards';
import { STARTER_DECK } from '../data/decks';
import { CAMPAIGN_CHAPTERS } from '../data/campaign';
import { createDuel, endTurn, playCard, submitMulligan } from '../engine/rules';
import {
  type AiAction,
  applyAiAction,
  decideNextAiAction,
  inspectAiActionTrapPrompt,
} from './aiAgent';

describe('Heuristic AI Opponent & Full-Match Stress Simulation', () => {
  it('executes complete AI turns without stalling across all 10 campaign bosses (incl. Season 2 Skills & Maximum)', () => {
    for (const ch of CAMPAIGN_CHAPTERS) {
      let state = createDuel(
        {
          playerName: 'Tester',
          opponentName: ch.bossName,
          playerDeck: STARTER_DECK.mainDeck,
          playerRiftDeck: STARTER_DECK.riftDeck,
          opponentDeck: ch.deck,
          opponentRiftDeck: ch.riftDeck,
          opponentStartLp: ch.bossLp,
          opponentStartEvoOrbs: ch.bossEvoOrbs,
          bossModifier: ch.bossModifier,
          opponentSkillId: ch.bossSkillId ?? null,
          chapterId: ch.id,
          aiDifficulty: ch.aiDifficulty,
          seed: ch.id * 777,
        },
        CARD_MAP
      );

      state = submitMulligan(state, [], CARD_MAP).state;
      let aiSteps = 0;

      // Simulate up to 14 rounds where player passes and AI plays full turns until winning
      for (let round = 0; round < 14 && !state.winner; round++) {
        if (state.activePlayer === 'player') {
          state = endTurn(state, 'player', CARD_MAP).state;
        }
        let guardLoop = 0;
        while (!state.winner && state.activePlayer === 'opponent' && guardLoop < 30) {
          const action = decideNextAiAction(state, CARD_MAP);
          state = applyAiAction(state, action, CARD_MAP);
          guardLoop += 1;
          aiSteps += 1;
        }
        expect(guardLoop, `AI infinite loop in Chapter ${ch.id}`).toBeLessThan(30);
      }

      expect(aiSteps).toBeGreaterThanOrEqual(3);
      // Against an AFK player, every boss AI must win within 14 rounds!
      expect(state.winner, `Boss ${ch.bossName} should defeat AFK player`).toBe('opponent');
    }
  });

  it('detects Manual Trap prompts and supports Activate vs Hold (skipAmbushFor)', () => {
    let state = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Rival',
        playerDeck: STARTER_DECK.mainDeck,
        playerRiftDeck: STARTER_DECK.riftDeck,
        opponentDeck: STARTER_DECK.mainDeck,
        opponentRiftDeck: STARTER_DECK.riftDeck,
        seed: 42,
      },
      CARD_MAP
    );
    state = submitMulligan(state, [], CARD_MAP).state;

    // Give player an on_attack Trap (umbra_shadow_snare) & on_spell Trap (umbra_void_counter)
    state.players.player.hand = [
      { instanceId: 'trap_atk', cardId: 'umbra_shadow_snare' },
      { instanceId: 'trap_spl', cardId: 'umbra_void_counter' },
    ];
    state = playCard(state, 'player', 'trap_atk', { slot: 0 }, CARD_MAP).state;
    state = playCard(state, 'player', 'trap_spl', { slot: 1 }, CARD_MAP).state;
    expect(state.players.player.arcane[0]?.cardId).toBe('umbra_shadow_snare');

    // End player turn so Traps become armed on Opponent Turn 2
    state = endTurn(state, 'player', CARD_MAP).state;
    state.players.opponent.hand = [
      { instanceId: 'opp_m1', cardId: 'pyro_hatchling' },
      { instanceId: 'opp_s1', cardId: 'pyro_ember_bolt' },
    ];

    // 1. Rival casts an Arcana Spell -> inspectAiActionTrapPrompt detects umbra_void_counter
    const spellAction: AiAction = {
      kind: 'play_card',
      handInstanceId: 'opp_s1',
      options: { targetPlayer: 'player' },
    };
    const spellPrompt = inspectAiActionTrapPrompt(state, spellAction, CARD_MAP);
    expect(spellPrompt).not.toBeNull();
    expect(spellPrompt?.trapCardId).toBe('umbra_void_counter');
    expect(spellPrompt?.trigger).toBe('on_spell');

    // Choosing HOLD (skipAmbushFor = 'player') lets the spell resolve & preserves the face-down trap!
    const afterHoldSpell = applyAiAction(state, spellAction, CARD_MAP, 'player');
    expect(afterHoldSpell.players.player.arcane[1]?.cardId).toBe('umbra_void_counter');
    expect(afterHoldSpell.players.player.lp).toBeLessThan(8000);

    // Choosing ACTIVATE (skipAmbushFor = undefined) negates the spell & consumes the trap!
    const afterActivateSpell = applyAiAction(state, spellAction, CARD_MAP);
    expect(afterActivateSpell.players.player.arcane[1]).toBeNull();
    expect(afterActivateSpell.players.player.lp).toBe(8000);

    // 2. Rival summons monster & attacks -> inspectAiActionTrapPrompt detects umbra_shadow_snare
    let sAtk = playCard(state, 'opponent', 'opp_m1', { slot: 0 }, CARD_MAP).state;
    const oppUnitId = sAtk.players.opponent.vanguard[0]!.instanceId;
    const atkAction: AiAction = {
      kind: 'attack',
      attackerInstanceId: oppUnitId,
      target: { kind: 'lp' },
    };
    const atkPrompt = inspectAiActionTrapPrompt(sAtk, atkAction, CARD_MAP);
    expect(atkPrompt).not.toBeNull();
    expect(atkPrompt?.trapCardId).toBe('umbra_shadow_snare');
    expect(atkPrompt?.trigger).toBe('on_attack');

    // HOLD keeps trap armed and takes LP damage
    const afterHoldAtk = applyAiAction(sAtk, atkAction, CARD_MAP, 'player');
    expect(afterHoldAtk.players.player.arcane[0]?.cardId).toBe('umbra_shadow_snare');
    expect(afterHoldAtk.players.player.lp).toBeLessThan(8000);

    // ACTIVATE destroys the attacking monster & prevents LP damage
    const afterActAtk = applyAiAction(sAtk, atkAction, CARD_MAP);
    expect(afterActAtk.players.player.arcane[0]).toBeNull();
    expect(afterActAtk.players.opponent.vanguard[0]).toBeNull();
    expect(afterActAtk.players.player.lp).toBe(8000);
  });

  it('triggers AI 3-Piece Maximum Summon and Boss Duelist Skill on Grandmaster difficulty', () => {
    let state = createDuel(
      {
        playerName: 'Tester',
        opponentName: 'Commander Nail-Omega',
        playerDeck: STARTER_DECK.mainDeck,
        playerRiftDeck: STARTER_DECK.riftDeck,
        opponentDeck: STARTER_DECK.mainDeck,
        opponentRiftDeck: STARTER_DECK.riftDeck,
        opponentSkillId: 'canopy_awakening',
        aiDifficulty: 'grandmaster',
        seed: 99,
      },
      CARD_MAP
    );
    state = submitMulligan(state, [], CARD_MAP).state;
    state = endTurn(state, 'player', CARD_MAP).state;
    state.players.opponent.turnsTaken = 2;
    state.players.opponent.hand = [
      { instanceId: 'm_l', cardId: 'mech_magnum_overlord_l' },
      { instanceId: 'm_c', cardId: 'mech_magnum_overlord_c' },
      { instanceId: 'm_r', cardId: 'mech_magnum_overlord_r' },
    ];

    const maxAct = decideNextAiAction(state, CARD_MAP);
    expect(maxAct.kind).toBe('maximum_summon');
    state = applyAiAction(state, maxAct, CARD_MAP);
    expect(state.players.opponent.vanguard[1]?.isMaximumMode).toBe(true);
    expect(state.players.opponent.vanguard[1]?.currentAtk).toBe(4400);

    const skillAct = decideNextAiAction(state, CARD_MAP);
    expect(skillAct.kind).toBe('activate_skill');
    state = applyAiAction(state, skillAct, CARD_MAP);
    expect(state.players.opponent.skillUsed).toBe(true);
  });
});
