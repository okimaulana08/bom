import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DeckList, PackOpenResult, PlayerProfile } from '../engine/types';
import { CARD_MAP, RARITY_CRAFT_COST, RARITY_DISMANTLE_DUST } from '../data/cards';
import { buildStarterCollection, STARTER_DECK } from '../data/decks';
import { BOOSTER_PACKS, rollBoosterPack } from '../data/packs';
import { getChapter } from '../data/campaign';
import { MISSIONS } from '../data/missions';

export interface MatchRewardSummary {
  coinsEarned: number;
  bonusCardId?: string;
  firstClearBonus: boolean;
  championBadgeEarned: boolean;
}

interface ProfileStore extends PlayerProfile {
  openPack: (packId: string) => { ok: boolean; error?: string; result?: PackOpenResult };
  craftCard: (cardId: string) => { ok: boolean; error?: string };
  dismantleCard: (cardId: string) => { ok: boolean; error?: string; dustGained?: number };
  saveDeck: (deck: DeckList) => void;
  deleteDeck: (deckId: string) => void;
  setActiveDeck: (deckId: string) => void;
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
    fusionsPerformed: number;
    evolutionsPerformed: number;
    trapsTriggered?: number;
    maxSingleHitDamage?: number;
  }) => MatchRewardSummary;
  resetProfile: () => void;
}

function createInitialProfile(): PlayerProfile {
  return {
    coins: 600,
    dust: 120, // Enough for an immediate rare craft experiment too, plus 600 Coins = 6 packs!
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
    stats: {
      duelsWon: 0,
      duelsLost: 0,
      packsOpened: 0,
      fusionsExecuted: 0,
      evolutionsTriggered: 0,
      trapsTriggered: 0,
      maxSingleHitDamage: 0,
    },
  };
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      ...createInitialProfile(),

      openPack: (packId) => {
        const pack = BOOSTER_PACKS.find((p) => p.id === packId);
        if (!pack) return { ok: false, error: 'Pack not found.' };
        const state = get();
        if (state.coins < pack.price) {
          return { ok: false, error: `Requires ${pack.price} Aether Coins.` };
        }
        const { result, nextCollection } = rollBoosterPack(pack, state.collection);
        set({
          coins: state.coins - pack.price,
          dust: state.dust + result.totalDustGained,
          collection: nextCollection,
          stats: {
            ...state.stats,
            packsOpened: state.stats.packsOpened + 1,
          },
        });
        return { ok: true, result };
      },

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
        fusionsPerformed,
        evolutionsPerformed,
        trapsTriggered = 0,
        maxSingleHitDamage = 0,
      }) => {
        const state = get();
        let coinsEarned = won ? 100 + Math.floor(Math.random() * 51) : 35;
        let bonusCardId: string | undefined;
        let firstClearBonus = false;
        let championBadgeEarned = false;

        const nextCompleted = [...state.completedChapters];
        const nextClaimed = [...state.claimedChapterRewards];
        const nextCollection = { ...state.collection };
        let nextDust = state.dust;
        let nextChampion = state.hasChampionBadge;

        if (won && chapterId !== null) {
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
          },
        });

        return {
          coinsEarned,
          bonusCardId,
          firstClearBonus,
          championBadgeEarned,
        };
      },

      resetProfile: () => set(createInitialProfile()),
    }),
    {
      name: 'aetherbound-rift-duel-profile-v1',
    }
  )
);
