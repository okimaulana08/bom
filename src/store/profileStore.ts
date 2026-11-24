import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DeckList,
  DuelistSkillId,
  PackOpenResult,
  PlayerProfile,
  SpireBlessingId,
} from '../engine/types';
import { CARD_MAP, RARITY_CRAFT_COST, RARITY_DISMANTLE_DUST } from '../data/cards';
import { buildStarterCollection, STARTER_DECK } from '../data/decks';
import { BOOSTER_PACKS, rollBoosterPack } from '../data/packs';
import { getChapter } from '../data/campaign';
import { MISSIONS } from '../data/missions';
import {
  getSpireFloorEnemy,
  rollSpireBlessingChoices,
  rollSpireCardChoices,
} from '../data/spire';

export const ROYAL_FOIL_CRAFT_COST = 80;

export function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export interface MatchRewardSummary {
  coinsEarned: number;
  dustEarned?: number;
  bonusCardId?: string;
  firstClearBonus: boolean;
  championBadgeEarned: boolean;
  spireCleared?: boolean;
}

interface ProfileStore extends PlayerProfile {
  openPack: (
    packId: string,
    useFreeDaily?: boolean
  ) => { ok: boolean; error?: string; result?: PackOpenResult };
  canClaimDailyFreePack: () => boolean;
  craftCard: (cardId: string) => { ok: boolean; error?: string };
  craftRoyalFoil: (cardId: string) => { ok: boolean; error?: string };
  dismantleCard: (cardId: string) => { ok: boolean; error?: string; dustGained?: number };
  saveDeck: (deck: DeckList) => void;
  deleteDeck: (deckId: string) => void;
  setActiveDeck: (deckId: string) => void;
  setSelectedSkill: (skillId: DuelistSkillId) => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  startSpireRun: (deckId: string) => void;
  pickSpireDraftCard: (cardId: string) => void;
  pickSpireBlessing: (blessingId: SpireBlessingId) => void;
  advanceSpireFloor: () => void;
  abandonSpireRun: () => void;
  toggleSound: () => void;
  toggleBgm: () => void;
  toggleTrapPromptMode: () => void;
  toggleDuelSpeed: () => void;
  claimMission: (missionId: string) => {
    ok: boolean;
    error?: string;
    coinsGained?: number;
    dustGained?: number;
  };
  exportSaveJson: () => string;
  importSaveJson: (raw: string) => { ok: boolean; error?: string };
  recordDuelResult: (params: {
    won: boolean;
    chapterId: number | null;
    spireFloor?: number | null;
    remainingPlayerLp?: number;
    fusionsPerformed: number;
    evolutionsPerformed: number;
    maximumsPerformed?: number;
    trapsTriggered?: number;
    maxSingleHitDamage?: number;
  }) => MatchRewardSummary;
  resetProfile: () => void;
}

function createInitialProfile(): PlayerProfile {
  return {
    coins: 600,
    dust: 120, // Enough for an immediate rare craft or Royal Foil upgrade, plus 600 Coins = 6 packs!
    collection: buildStarterCollection(),
    decks: [STARTER_DECK],
    activeDeckId: STARTER_DECK.id,
    completedChapters: [],
    claimedChapterRewards: [],
    claimedMissions: [],
    hasChampionBadge: false,
    soundEnabled: true,
    bgmEnabled: true,
    trapPromptMode: 'manual',
    duelSpeed: 1,
    selectedSkillId: 'volcanic_ignition',
    lastFreePackDate: null,
    royalFoils: {},
    tutorialCompleted: false,
    spireRun: null,
    stats: {
      duelsWon: 0,
      duelsLost: 0,
      packsOpened: 0,
      fusionsExecuted: 0,
      evolutionsTriggered: 0,
      trapsTriggered: 0,
      maxSingleHitDamage: 0,
      spireClears: 0,
      maximumsSummoned: 0,
    },
  };
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      ...createInitialProfile(),

      canClaimDailyFreePack: () => {
        const last = get().lastFreePackDate;
        return last !== getTodayDateKey();
      },

      openPack: (packId, useFreeDaily = false) => {
        const pack = BOOSTER_PACKS.find((p) => p.id === packId);
        if (!pack) return { ok: false, error: 'Pack not found.' };
        const state = get();
        const today = getTodayDateKey();
        const isFree = useFreeDaily && state.lastFreePackDate !== today;
        if (useFreeDaily && !isFree) {
          return { ok: false, error: 'Daily Free Pack already claimed today! Come back tomorrow.' };
        }
        if (!isFree && state.coins < pack.price) {
          return { ok: false, error: `Requires ${pack.price} Aether Coins.` };
        }
        const { result, nextCollection } = rollBoosterPack(pack, state.collection);
        set({
          coins: isFree ? state.coins : state.coins - pack.price,
          lastFreePackDate: isFree ? today : state.lastFreePackDate,
          dust: state.dust + result.totalDustGained,
          collection: nextCollection,
          stats: {
            ...state.stats,
            packsOpened: state.stats.packsOpened + 1,
          },
        });
        return { ok: true, result };
      },

      craftRoyalFoil: (cardId) => {
        const card = CARD_MAP[cardId];
        if (!card) return { ok: false, error: 'Card not found.' };
        const state = get();
        if ((state.collection[cardId] ?? 0) <= 0) {
          return { ok: false, error: 'You must own at least 1 copy before upgrading to Royal Foil.' };
        }
        if (state.royalFoils?.[cardId]) {
          return { ok: false, error: 'This card is already Royal Prismatic Foil!' };
        }
        if (state.dust < ROYAL_FOIL_CRAFT_COST) {
          return { ok: false, error: `Requires ${ROYAL_FOIL_CRAFT_COST} Aether Dust.` };
        }
        set({
          dust: state.dust - ROYAL_FOIL_CRAFT_COST,
          royalFoils: {
            ...(state.royalFoils ?? {}),
            [cardId]: true,
          },
        });
        return { ok: true };
      },

      setSelectedSkill: (skillId) => set({ selectedSkillId: skillId }),
      completeTutorial: () => set({ tutorialCompleted: true }),
      resetTutorial: () => set({ tutorialCompleted: false }),

      startSpireRun: (deckId) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === deckId) ?? STARTER_DECK;
        set({
          spireRun: {
            active: true,
            floor: 1,
            currentLp: 8000,
            maxLp: 8000,
            deck: [...deck.mainDeck],
            riftDeck: [...deck.riftDeck],
            blessings: [],
            pendingDraft: null,
            completed: false,
          },
        });
      },

      pickSpireDraftCard: (cardId) => {
        const run = get().spireRun;
        if (!run?.pendingDraft || run.pendingDraft.pickedCard) return;
        set({
          spireRun: {
            ...run,
            deck: [...run.deck, cardId],
            pendingDraft: {
              ...run.pendingDraft,
              pickedCard: true,
            },
          },
        });
      },

      pickSpireBlessing: (blessingId) => {
        const run = get().spireRun;
        if (!run?.pendingDraft || run.pendingDraft.pickedBlessing) return;
        const alreadyHas = run.blessings.includes(blessingId);
        const nextBlessings = alreadyHas ? run.blessings : [...run.blessings, blessingId];
        const lpBonus = !alreadyHas && blessingId === 'blessing_iron_aegis' ? 1000 : 0;
        set({
          spireRun: {
            ...run,
            maxLp: run.maxLp + lpBonus,
            currentLp: Math.min(run.maxLp + lpBonus, run.currentLp + lpBonus),
            blessings: nextBlessings,
            pendingDraft: {
              ...run.pendingDraft,
              pickedBlessing: true,
            },
          },
        });
      },

      advanceSpireFloor: () => {
        const run = get().spireRun;
        if (!run || !run.active) return;
        const healedLp = Math.min(run.maxLp, run.currentLp + 1500);
        set({
          spireRun: {
            ...run,
            floor: Math.min(5, run.floor + 1),
            currentLp: healedLp,
            pendingDraft: null,
          },
        });
      },

      abandonSpireRun: () => set({ spireRun: null }),

      craftCard: (cardId) => {
        const card = CARD_MAP[cardId];
        if (!card) return { ok: false, error: 'Card not found.' };
        const state = get();
        if (card.isExclusive && !state.hasChampionBadge) {
          return {
            ok: false,
            error: 'Defeat Chrono Archon Zero in Campaign Chapter 5 to unlock this exclusive card!',
          };
        }
        const owned = state.collection[cardId] ?? 0;
        if (owned >= 3) {
          return { ok: false, error: 'You already own the maximum 3 copies.' };
        }
        const cost = RARITY_CRAFT_COST[card.rarity];
        if (state.dust < cost) {
          return { ok: false, error: `Requires ${cost} Aether Dust.` };
        }
        set({
          dust: state.dust - cost,
          collection: {
            ...state.collection,
            [cardId]: owned + 1,
          },
        });
        return { ok: true };
      },

      dismantleCard: (cardId) => {
        const card = CARD_MAP[cardId];
        if (!card) return { ok: false, error: 'Card not found.' };
        const state = get();
        const owned = state.collection[cardId] ?? 0;
        if (owned <= 0) return { ok: false, error: 'No copies owned.' };
        const dustGained = RARITY_DISMANTLE_DUST[card.rarity];
        const nextCol = { ...state.collection };
        if (owned === 1) delete nextCol[cardId];
        else nextCol[cardId] = owned - 1;
        set({
          dust: state.dust + dustGained,
          collection: nextCol,
        });
        return { ok: true, dustGained };
      },

      saveDeck: (deck) => {
        const state = get();
        const exists = state.decks.some((d) => d.id === deck.id);
        const decks = exists
          ? state.decks.map((d) => (d.id === deck.id ? deck : d))
          : [...state.decks, deck];
        set({ decks, activeDeckId: deck.id });
      },

      deleteDeck: (deckId) => {
        const state = get();
        const target = state.decks.find((d) => d.id === deckId);
        if (!target || target.isStarter) return;
        const decks = state.decks.filter((d) => d.id !== deckId);
        const activeDeckId =
          state.activeDeckId === deckId ? decks[0]?.id ?? STARTER_DECK.id : state.activeDeckId;
        set({ decks, activeDeckId });
      },

      setActiveDeck: (deckId) => set({ activeDeckId: deckId }),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleBgm: () => set((s) => ({ bgmEnabled: !(s.bgmEnabled ?? true) })),
      toggleTrapPromptMode: () =>
        set((s) => ({
          trapPromptMode: (s.trapPromptMode ?? 'manual') === 'manual' ? 'auto' : 'manual',
        })),
      toggleDuelSpeed: () =>
        set((s) => ({
          duelSpeed: (s.duelSpeed ?? 1) === 1 ? 2 : 1,
        })),

      claimMission: (missionId) => {
        const state = get();
        const mission = MISSIONS.find((m) => m.id === missionId);
        if (!mission) return { ok: false, error: 'Mission not found.' };
        const claimed = state.claimedMissions ?? [];
        if (claimed.includes(missionId)) {
          return { ok: false, error: 'Reward already claimed.' };
        }
        if (mission.getProgress(state) < mission.target) {
          return { ok: false, error: 'Mission not completed yet.' };
        }
        set({
          coins: state.coins + mission.rewardCoins,
          dust: state.dust + mission.rewardDust,
          claimedMissions: [...claimed, missionId],
        });
        return {
          ok: true,
          coinsGained: mission.rewardCoins,
          dustGained: mission.rewardDust,
        };
      },

      exportSaveJson: () => {
        const s = get();
        const payload: PlayerProfile = {
          coins: s.coins,
          dust: s.dust,
          collection: s.collection,
          decks: s.decks,
          activeDeckId: s.activeDeckId,
          completedChapters: s.completedChapters,
          claimedChapterRewards: s.claimedChapterRewards,
          claimedMissions: s.claimedMissions ?? [],
          hasChampionBadge: s.hasChampionBadge,
          soundEnabled: s.soundEnabled,
          bgmEnabled: s.bgmEnabled ?? true,
          trapPromptMode: s.trapPromptMode ?? 'manual',
          duelSpeed: s.duelSpeed ?? 1,
          stats: s.stats,
        };
        return JSON.stringify({ version: 1, game: 'aetherbound-rift-duel', profile: payload }, null, 2);
      },

      importSaveJson: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          const candidate: Partial<PlayerProfile> =
            parsed && typeof parsed === 'object' && parsed.profile ? parsed.profile : parsed;
          if (
            !candidate ||
            typeof candidate.coins !== 'number' ||
            typeof candidate.dust !== 'number' ||
            !candidate.collection ||
            typeof candidate.collection !== 'object' ||
            !Array.isArray(candidate.decks) ||
            candidate.decks.length === 0
          ) {
            return { ok: false, error: 'Save JSON is missing required profile fields.' };
          }

          const defaults = createInitialProfile();
          set({
            ...defaults,
            ...candidate,
            stats: {
              ...defaults.stats,
              ...(candidate.stats ?? {}),
            },
            claimedMissions: Array.isArray(candidate.claimedMissions)
              ? candidate.claimedMissions
              : [],
            duelSpeed: candidate.duelSpeed === 2 ? 2 : 1,
          });
          return { ok: true };
        } catch {
          return { ok: false, error: 'Invalid JSON format. Please check your backup file.' };
        }
      },

      recordDuelResult: ({
        won,
        chapterId,
        spireFloor = null,
        remainingPlayerLp,
        fusionsPerformed,
        evolutionsPerformed,
        maximumsPerformed = 0,
        trapsTriggered = 0,
        maxSingleHitDamage = 0,
      }) => {
        const state = get();
        let coinsEarned = won ? 100 + Math.floor(Math.random() * 51) : 35;
        let dustEarned = 0;
        let bonusCardId: string | undefined;
        let firstClearBonus = false;
        let championBadgeEarned = false;
        let spireCleared = false;

        const nextCompleted = [...state.completedChapters];
        const nextClaimed = [...state.claimedChapterRewards];
        const nextCollection = { ...state.collection };
        let nextDust = state.dust;
        let nextChampion = state.hasChampionBadge;
        let nextSpireRun = state.spireRun ?? null;
        let nextSpireClears = state.stats.spireClears ?? 0;

        if (spireFloor !== null && nextSpireRun && nextSpireRun.active) {
          const floorDef = getSpireFloorEnemy(spireFloor);
          if (won) {
            coinsEarned = floorDef.rewardCoins;
            if (spireFloor >= 5) {
              spireCleared = true;
              dustEarned = 150;
              nextDust += dustEarned;
              nextSpireClears += 1;
              nextSpireRun = {
                ...nextSpireRun,
                active: false,
                completed: true,
                pendingDraft: null,
              };
            } else {
              const carryLp = Math.max(2500, remainingPlayerLp ?? nextSpireRun.currentLp);
              nextSpireRun = {
                ...nextSpireRun,
                currentLp: Math.min(nextSpireRun.maxLp, carryLp),
                pendingDraft: {
                  cardChoices: rollSpireCardChoices(),
                  blessingChoices: rollSpireBlessingChoices(nextSpireRun.blessings),
                  pickedCard: false,
                  pickedBlessing: false,
                },
              };
            }
          } else {
            nextSpireRun = null;
          }
        } else if (won && chapterId !== null) {
          const chapter = getChapter(chapterId);
          if (chapter) {
            if (!nextCompleted.includes(chapterId)) {
              nextCompleted.push(chapterId);
            }
            if (!nextClaimed.includes(chapterId)) {
              nextClaimed.push(chapterId);
              firstClearBonus = true;
              coinsEarned = chapter.rewardCoins;
              bonusCardId = chapter.rewardCardId;
              const owned = nextCollection[bonusCardId] ?? 0;
              if (owned >= 3) {
                const c = CARD_MAP[bonusCardId];
                nextDust += c ? RARITY_DISMANTLE_DUST[c.rarity] : 250;
              } else {
                nextCollection[bonusCardId] = owned + 1;
              }
              if (chapter.grantsChampionBadge) {
                nextChampion = true;
                championBadgeEarned = true;
              }
            }
          }
        }

        set({
          coins: state.coins + coinsEarned,
          dust: nextDust,
          collection: nextCollection,
          completedChapters: nextCompleted,
          claimedChapterRewards: nextClaimed,
          hasChampionBadge: nextChampion,
          spireRun: nextSpireRun,
          stats: {
            ...state.stats,
            duelsWon: state.stats.duelsWon + (won ? 1 : 0),
            duelsLost: state.stats.duelsLost + (won ? 0 : 1),
            fusionsExecuted: state.stats.fusionsExecuted + fusionsPerformed,
            evolutionsTriggered: state.stats.evolutionsTriggered + evolutionsPerformed,
            trapsTriggered: (state.stats.trapsTriggered ?? 0) + trapsTriggered,
            maxSingleHitDamage: Math.max(
              state.stats.maxSingleHitDamage ?? 0,
              maxSingleHitDamage
            ),
            spireClears: nextSpireClears,
            maximumsSummoned: (state.stats.maximumsSummoned ?? 0) + maximumsPerformed,
          },
        });

        return {
          coinsEarned,
          dustEarned: dustEarned > 0 ? dustEarned : undefined,
          bonusCardId,
          firstClearBonus,
          championBadgeEarned,
          spireCleared,
        };
      },

      resetProfile: () => set(createInitialProfile()),
    }),
    {
      name: 'aetherbound-rift-duel-profile-v1',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as PlayerProfile | undefined;
        if (!state) return createInitialProfile();
        const starterCol = buildStarterCollection();
        const mergedCol = { ...(state.collection ?? {}) };
        if (version < 3) {
          for (const [cid, qty] of Object.entries(starterCol)) {
            mergedCol[cid] = Math.max(mergedCol[cid] ?? 0, qty);
          }
        }
        const updatedDecks =
          version < 2
            ? (state.decks ?? []).map((d) => (d.id === STARTER_DECK.id ? STARTER_DECK : d))
            : state.decks ?? [STARTER_DECK];
        if (!updatedDecks.some((d) => d.id === STARTER_DECK.id)) {
          updatedDecks.unshift(STARTER_DECK);
        }
        return {
          ...createInitialProfile(),
          ...state,
          collection: mergedCol,
          decks: updatedDecks,
          selectedSkillId: state.selectedSkillId ?? 'volcanic_ignition',
          royalFoils: state.royalFoils ?? {},
          lastFreePackDate: state.lastFreePackDate ?? null,
          tutorialCompleted: state.tutorialCompleted ?? false,
          spireRun: state.spireRun ?? null,
        };
      },
    }
  )
);
