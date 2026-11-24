import { describe, expect, it } from 'vitest';
import { CARDS, CARD_MAP } from './cards';
import { AI_ARCHETYPES, STARTER_DECK } from './decks';
import { CAMPAIGN_CHAPTERS } from './campaign';
import { BOOSTER_PACKS, rollBoosterPack } from './packs';
import { DUELIST_SKILLS } from './skills';
import { SPIRE_BLESSINGS, SPIRE_FLOORS } from './spire';
import { createDuel, submitMulligan } from '../engine/rules';

describe('Card Database, Decks, Campaign & Booster Packs Integrity', () => {
  it('contains 91 unique cards across all 5 factions, 5 types, and all 6 sets (incl. Set 5 Egyptian Gods)', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(91);
    expect(DUELIST_SKILLS.length).toBe(5);
    expect(SPIRE_FLOORS.length).toBe(5);
    expect(SPIRE_BLESSINGS.length).toBe(6);

    const maximumCards = CARDS.filter((c) => c.setId === 'maximum');
    expect(maximumCards.length).toBe(3);
    expect(maximumCards.map((c) => c.maximumPiece).sort()).toEqual(['center', 'left', 'right']);

    const egyptianCards = CARDS.filter((c) => c.setId === 'egyptian_gods');
    expect(egyptianCards.length).toBe(12);
    expect(egyptianCards.filter((c) => c.rarity === 'mythic').length).toBe(4);
    expect(egyptianCards.some((c) => c.id === 'egypt_osiris_sky_dragon')).toBe(true);
    expect(egyptianCards.some((c) => c.id === 'egypt_obelisk_tormentor')).toBe(true);
    expect(egyptianCards.some((c) => c.id === 'egypt_ra_sun_phoenix')).toBe(true);
    expect(egyptianCards.some((c) => c.id === 'egypt_fusion_horakhty')).toBe(true);

    const ids = new Set(CARDS.map((c) => c.id));
    expect(ids.size).toBe(CARDS.length);

    const factions = new Set(CARDS.map((c) => c.faction));
    expect(factions.size).toBe(5);

    const types = new Set(CARDS.map((c) => c.type));
    expect(types.size).toBe(5);

    const overdriveCards = CARDS.filter((c) => c.setId === 'overdrive');
    const phantomCards = CARDS.filter((c) => c.setId === 'phantom');
    const arcanaVaultCards = CARDS.filter((c) => c.setId === 'arcana_vault');
    expect(overdriveCards.length).toBe(9);
    expect(phantomCards.length).toBe(9);
    expect(arcanaVaultCards.length).toBe(10);
    expect(arcanaVaultCards.filter((c) => c.type === 'arcana').length).toBe(7);
    expect(arcanaVaultCards.filter((c) => c.type === 'ambush').length).toBe(3);
    expect(
      arcanaVaultCards.filter((c) => c.type === 'arcana' && c.arcanaSubtype === 'domain').length
    ).toBe(2);

    const vanguards = CARDS.filter((c) => c.type === 'vanguard');
    const evolvable = vanguards.filter((c) => Boolean(c.evolvedData));
    expect(evolvable.length / vanguards.length).toBeGreaterThanOrEqual(0.45);

    const dualFusions = CARDS.filter(
      (c) => c.type === 'fusion_apex' && Boolean(c.secondaryFaction)
    );
    expect(dualFusions.length).toBeGreaterThanOrEqual(10);
  });

  it('has valid 30-card main decks and <=5-card rift decks for starter and all AI bosses', () => {
    const decksToCheck = [
      STARTER_DECK,
      ...AI_ARCHETYPES.map((a) => ({
        name: a.name,
        mainDeck: a.mainDeck,
        riftDeck: a.riftDeck,
      })),
    ];

    for (const d of decksToCheck) {
      expect(d.mainDeck.length, `${d.name} mainDeck size`).toBe(30);
      expect(d.riftDeck.length, `${d.name} riftDeck size`).toBeLessThanOrEqual(5);
      for (const cid of d.mainDeck) {
        expect(CARD_MAP[cid], `Missing main card ${cid} in ${d.name}`).toBeDefined();
        expect(CARD_MAP[cid].type).not.toBe('fusion_apex');
      }
      for (const cid of d.riftDeck) {
        expect(CARD_MAP[cid], `Missing rift card ${cid} in ${d.name}`).toBeDefined();
        expect(CARD_MAP[cid].type).toBe('fusion_apex');
      }
    }
  });

  it('validates all 5 campaign chapters and boss modifiers initialize cleanly', () => {
    expect(CAMPAIGN_CHAPTERS.length).toBe(5);
    for (const ch of CAMPAIGN_CHAPTERS) {
      expect(CARD_MAP[ch.rewardCardId]).toBeDefined();
      const duel = createDuel(
        {
          playerName: 'Hero',
          opponentName: ch.bossName,
          playerDeck: STARTER_DECK.mainDeck,
          playerRiftDeck: STARTER_DECK.riftDeck,
          opponentDeck: ch.deck,
          opponentRiftDeck: ch.riftDeck,
          opponentStartLp: ch.bossLp,
          opponentStartEvoOrbs: ch.bossEvoOrbs,
          bossModifier: ch.bossModifier,
          chapterId: ch.id,
          seed: ch.id * 101,
        },
        CARD_MAP
      );
      const started = submitMulligan(duel, [], CARD_MAP);
      expect(started.ok).toBe(true);
    }
  });

  it('rolls 5-card booster packs with guaranteed Rare+ and auto-dismantles excess copies', () => {
    const maxedCollection: Record<string, number> = {};
    for (const c of CARDS) maxedCollection[c.id] = 3;

    for (const pack of BOOSTER_PACKS) {
      const { result } = rollBoosterPack(pack, maxedCollection);
      expect(result.pulls.length).toBe(5);
      // Highest rarity sorted to last slot must be Rare+
      expect(['rare', 'epic', 'mythic']).toContain(result.pulls[4].rarity);
      expect(result.pulls.every((p) => p.autoDismantled)).toBe(true);
      expect(result.totalDustGained).toBeGreaterThan(0);
      if (pack.featuredSetId) {
        const featuredCount = result.pulls.filter(
          (p) => CARD_MAP[p.cardId]?.setId === pack.featuredSetId
        ).length;
        expect(featuredCount, `${pack.name} must guarantee >=2 themed expansion cards`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
