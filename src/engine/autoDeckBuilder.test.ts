import { describe, expect, it } from 'vitest';
import { CARDS, CARD_MAP } from '../data/cards';
import { buildStarterCollection } from '../data/decks';
import { autoBuildDeck, hasOwnedMaximumSet } from './autoDeckBuilder';

function buildFullPlaysetCollection(): Record<string, number> {
  const col: Record<string, number> = {};
  for (const c of CARDS) {
    if (!c.isToken) col[c.id] = 3;
  }
  return col;
}

describe('Smart Auto-Build Deck Optimizer', () => {
  it('builds a strictly legal 30+<=5 deck using only owned starter collection cards', () => {
    const starter = buildStarterCollection();
    const res = autoBuildDeck(starter, CARD_MAP, { strategy: 'auto' });

    expect(res.ok).toBe(true);
    expect(res.mainDeck.length).toBe(30);
    expect(res.riftDeck.length).toBeLessThanOrEqual(5);
    expect(res.riftDeck.length).toBeGreaterThan(0);

    // Every card copy must respect owned collection and max-3 copy rule
    const counts: Record<string, number> = {};
    for (const id of [...res.mainDeck, ...res.riftDeck]) {
      counts[id] = (counts[id] ?? 0) + 1;
      expect(counts[id]).toBeLessThanOrEqual(3);
      expect(counts[id]).toBeLessThanOrEqual(starter[id] ?? 0);
    }

    // No Fusion Apex in Main Deck, only Fusion Apex in Rift Deck
    for (const id of res.mainDeck) {
      expect(CARD_MAP[id]?.type).not.toBe('fusion_apex');
    }
    for (const id of res.riftDeck) {
      expect(CARD_MAP[id]?.type).toBe('fusion_apex');
    }

    // Opening hand consistency should be high (anti-brick)
    expect(res.report.simulation.playableTurn1Rate).toBeGreaterThanOrEqual(80);
    expect(res.report.synergyScore).toBeGreaterThanOrEqual(70);
  });

  it('never leaves dead Fusion Apexes or dead Catalysts when player owns 0 Fusion Catalysts', () => {
    const col = buildFullPlaysetCollection();
    col['chrono_polymerization'] = 0;
    col['chrono_convergence'] = 0;

    const res = autoBuildDeck(col, CARD_MAP, { strategy: 'fusion' });
    expect(res.ok).toBe(true);
    expect(res.mainDeck.length).toBe(30);
    // Without catalysts, Rift Deck must stay empty so there are zero unplayable fusions
    expect(res.riftDeck.length).toBe(0);
    expect(res.report.curve.catalysts).toBe(0);
    expect(res.report.warnings.length).toBeGreaterThan(0);
  });

  it('locks Fusion Apex recipes to matching Main Deck material factions in Fusion Overload mode', () => {
    const col = buildFullPlaysetCollection();
    const res = autoBuildDeck(col, CARD_MAP, {
      strategy: 'fusion',
      focusFaction: 'pyroclast',
    });

    expect(res.ok).toBe(true);
    expect(res.mainDeck.length).toBe(30);
    expect(res.report.curve.catalysts).toBeGreaterThanOrEqual(2);
    expect(res.riftDeck.length).toBeGreaterThanOrEqual(2);
    expect(res.report.primaryFactions).toContain('pyroclast');

    // Every chosen Rift Fusion must have genuine material coverage in Main Deck
    for (const cov of res.report.fusionCoverage) {
      expect(cov.materialCounts.length).toBeGreaterThan(0);
      for (const m of cov.materialCounts) {
        expect(m.count).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('includes complete Maximum Emperor [L]/[CORE]/[R] set only as a whole package', () => {
    const col = buildFullPlaysetCollection();
    expect(hasOwnedMaximumSet(col, CARD_MAP)).toBe(true);

    const maxRes = autoBuildDeck(col, CARD_MAP, { strategy: 'maximum' });
    expect(maxRes.ok).toBe(true);
    expect(maxRes.report.hasCompleteMaximumSet).toBe(true);
    expect(maxRes.mainDeck).toContain('max_aether_emperor_l');
    expect(maxRes.mainDeck).toContain('max_aether_emperor_c');
    expect(maxRes.mainDeck).toContain('max_aether_emperor_r');
    expect(maxRes.report.recommendedSkillId).toBe('destiny_draw');

    // Missing one piece -> must NOT put standalone Lv8 [CORE] brick into the deck
    const partial = buildFullPlaysetCollection();
    partial['max_aether_emperor_r'] = 0;
    const partialRes = autoBuildDeck(partial, CARD_MAP, { strategy: 'maximum' });
    expect(partialRes.ok).toBe(true);
    expect(partialRes.report.hasCompleteMaximumSet).toBe(false);
    expect(partialRes.mainDeck).not.toContain('max_aether_emperor_c');
    expect(partialRes.report.warnings.length).toBeGreaterThan(0);
  });

  it('supports Smart Auto-Fill preserving locked user cards and completing synergistically to 30', () => {
    const col = buildFullPlaysetCollection();
    const lockedMain = [
      'umbra_dread_knight',
      'umbra_dread_knight',
      'umbra_nyx_avatar',
      'umbra_void_revival',
      'umbra_shadow_snare',
    ];
    const lockedRift = ['fusion_eclipse_sovereign'];

    const res = autoBuildDeck(col, CARD_MAP, {
      strategy: 'balanced',
      fillRemaining: true,
      lockedMain,
      lockedRift,
    });

    expect(res.ok).toBe(true);
    expect(res.mainDeck.length).toBe(30);
    expect(res.riftDeck).toContain('fusion_eclipse_sovereign');
    expect(res.mainDeck.filter((id) => id === 'umbra_dread_knight').length).toBeGreaterThanOrEqual(2);
    expect(res.mainDeck).toContain('umbra_nyx_avatar');
    expect(res.mainDeck).toContain('umbra_void_revival');
    expect(res.mainDeck).toContain('umbra_shadow_snare');
    expect(res.report.primaryFactions).toContain('umbra');
  });

  it('adapts curve and skill recommendation accurately between Aggro and Control strategies', () => {
    const col = buildFullPlaysetCollection();

    const aggro = autoBuildDeck(col, CARD_MAP, {
      strategy: 'aggro',
      focusFaction: 'pyroclast',
    });
    const control = autoBuildDeck(col, CARD_MAP, {
      strategy: 'control',
      focusFaction: 'cryo_mecha',
    });

    expect(aggro.ok).toBe(true);
    expect(control.ok).toBe(true);
    expect(aggro.report.recommendedSkillId).toBe('volcanic_ignition');
    expect(control.report.recommendedSkillId).toBe('absolute_aegis');
    expect(control.report.curve.traps).toBeGreaterThanOrEqual(aggro.report.curve.traps);
  });
});
