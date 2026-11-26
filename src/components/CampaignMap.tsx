import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Crown,
  Heart,
  Lock,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import type { CampaignChapter } from '../engine/types';
import { CAMPAIGN_CHAPTERS } from '../data/campaign';
import { FACTIONS } from '../data/factions';
import { CARD_MAP } from '../data/cards';
import { getSkillDef } from '../data/skills';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';
import { Card } from './Card';

interface CampaignMapProps {
  onBack: () => void;
  onStartChapter: (chapter: CampaignChapter, deckId: string) => void;
}

const NODE_OFFSETS = ['lg:translate-y-8', 'lg:-translate-y-8', 'lg:translate-y-6', 'lg:-translate-y-8', 'lg:translate-y-0'];

export const CampaignMap: React.FC<CampaignMapProps> = ({ onBack, onStartChapter }) => {
  const { completedChapters, hasChampionBadge, decks, activeDeckId, setActiveDeck } =
    useProfileStore();

  const [selectedChapter, setSelectedChapter] = useState<CampaignChapter | null>(null);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [activeSeason, setActiveSeason] = useState<1 | 2>(() =>
    completedChapters.includes(5) ? 2 : 1
  );

  const seasonChapters = CAMPAIGN_CHAPTERS.filter((ch) => (ch.season ?? 1) === activeSeason);

  const validDecks = decks.filter((d) => d.mainDeck.length === 30);
  const chosenDeckId = validDecks.some((d) => d.id === activeDeckId)
    ? activeDeckId
    : validDecks[0]?.id ?? decks[0]?.id;

  // Ch.1 (Season 1 start) and Ch.6 (Season 2 entry gate) are unlocked immediately so players can challenge either saga!
  const isUnlocked = (chapterId: number) =>
    chapterId === 1 || chapterId === 6 || completedChapters.includes(chapterId - 1);

  const openChapter = (ch: CampaignChapter) => {
    if (!isUnlocked(ch.id)) return;
    soundEngine.uiClick();
    setSelectedChapter(ch);
    setDialogueStep(0);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#04050c] text-slate-100 p-4 sm:p-6 flex flex-col">
      {/* Illustrated Cosmic Rift World Map Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img
          src="/assets/cards/fusion_astral_revenant.jpg"
          alt=""
          className="w-full h-full object-cover opacity-20 blur-[2px] scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(30,27,75,0.55) 0%, rgba(4,5,14,0.95) 85%)',
          }}
        />
      </div>

      {/* Top Game HUD Header */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-500/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              onBack();
            }}
            className="game-panel clip-chamfer-sm px-3.5 py-2 hover:border-cyan-400 text-slate-200 flex items-center gap-1.5 text-xs font-display font-bold tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> LOBBY
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-200 via-white to-amber-300 bg-clip-text text-transparent">
              RIFT CHRONICLE
            </h1>
            <p className="text-[11px] text-slate-300/80 uppercase tracking-[0.2em]">
              10 Dimensional Bosses (Season 1 &amp; Season 2) • Boss Skills • Mythic Bounties
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Season 1 / Season 2 Switcher */}
          <div className="flex rounded-xl bg-slate-950/90 border border-indigo-400/50 p-0.5 text-xs font-display font-extrabold">
            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                setActiveSeason(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeSeason === 1
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              S1: Genesis (1–5)
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.uiClick();
                setActiveSeason(2);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeSeason === 2
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 text-white shadow'
                  : 'text-amber-300 hover:text-amber-200'
              }`}
            >
              ★ S2: Legends (6–10)
            </button>
          </div>

          <div className="game-panel clip-chamfer-sm px-3.5 py-1.5 text-xs font-mono-num font-bold text-cyan-200">
            REALMS CLEARED: {completedChapters.length} / {CAMPAIGN_CHAPTERS.length}
          </div>
          {hasChampionBadge && (
            <div className="game-panel-gold clip-chamfer-sm px-3.5 py-1.5 text-xs font-extrabold text-amber-200 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-300" />
              RIFT CHAMPION
            </div>
          )}
        </div>
      </div>

      {/* STAGGERED DIMENSIONAL RIFT CONSTELLATION MAP */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex-1 py-10 flex flex-col justify-center">
        <div className="relative">
          {/* Glowing Winding SVG Energy Conduit Path (Desktop) */}
          <svg
            viewBox="0 0 1100 220"
            preserveAspectRatio="none"
            className="hidden lg:block pointer-events-none absolute top-14 left-6 right-6 w-[calc(100%-3rem)] h-52 z-0"
            fill="none"
          >
            <defs>
              <linearGradient id="riftPathGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="75%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <path
              d="M70 155 C190 155, 220 45, 310 45 C420 45, 460 150, 550 150 C650 150, 700 45, 795 45 C895 45, 930 110, 1030 110"
              stroke="url(#riftPathGrad)"
              strokeWidth="4"
              strokeDasharray="12 8"
              strokeOpacity="0.7"
            />
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10 items-start">
            {seasonChapters.map((ch, idx) => {
              const unlocked = isUnlocked(ch.id);
              const cleared = completedChapters.includes(ch.id);
              const faction = FACTIONS[ch.faction];
              const rewardCard = CARD_MAP[ch.rewardCardId];
              const chCode = ch.id < 10 ? `CH.0${ch.id}` : `CH.${ch.id}`;

              return (
                <motion.div
                  key={ch.id}
                  whileHover={unlocked ? { y: -8, scale: 1.03 } : {}}
                  onClick={() => openChapter(ch)}
                  className={`flex flex-col items-center text-center transition-all ${NODE_OFFSETS[idx % NODE_OFFSETS.length]} ${
                    unlocked ? 'cursor-pointer' : 'opacity-55 cursor-not-allowed'
                  }`}
                >
                  {/* Floating Hexagonal Boss Portal Medallion */}
                  <div className="relative mb-3">
                    {unlocked && !cleared && (
                      <div
                        className="absolute -inset-2 rounded-full blur-lg opacity-65 animate-pulse"
                        style={{ backgroundColor: faction.primaryHex }}
                      />
                    )}
                    <div
                      className="relative w-32 h-36 clip-hex p-[3.5px] shadow-2xl"
                      style={{
                        background: unlocked
                          ? `linear-gradient(180deg, #fef08a 0%, ${faction.primaryHex} 55%, #0f172a 100%)`
                          : '#334155',
                      }}
                    >
                      <div className="w-full h-full clip-hex bg-slate-950 overflow-hidden relative">
                        <img
                          src={ch.portrait}
                          alt={ch.bossName}
                          className={`w-full h-full object-cover object-top ${
                            !unlocked ? 'grayscale brightness-45' : ''
                          }`}
                        />
                        {!unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Lock className="w-7 h-7 text-slate-300" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chapter Status Pill */}
                    <span
                      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap clip-skew-btn px-3 py-0.5 text-[9px] font-extrabold tracking-widest uppercase shadow-lg ${
                        cleared
                          ? 'bg-emerald-500 text-slate-950'
                          : unlocked
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cleared ? '★ CLEARED' : unlocked ? `${chCode} • DUEL` : `${chCode} LOCKED`}
                    </span>
                  </div>

                  {/* Chamfered Boss Plaque */}
                  <div className="w-full game-panel clip-chamfer-sm p-3 mt-1 border-slate-700/80 hover:border-cyan-400/70">
                    <div className="font-display font-extrabold text-sm text-white leading-tight">
                      {ch.bossName}
                    </div>
                    <div className={`text-[10px] font-bold uppercase mt-0.5 ${faction.textColor}`}>
                      {faction.name} • {ch.bossLp} LP
                    </div>
                    {ch.bossSkillId && (
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/75 border border-amber-400/50 text-[9px] font-bold text-amber-200">
                        <Sparkles className="w-2.5 h-2.5" /> Skill: {getSkillDef(ch.bossSkillId).skillName}
                      </div>
                    )}

                    <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-500/35 text-[10px] text-slate-300 leading-snug text-left">
                      <span className="text-rose-300 font-extrabold uppercase block text-[9px]">
                        Rule: {ch.modifierTitle}
                      </span>
                      {ch.modifierDescription}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-amber-300 font-mono-num font-bold">
                        <Coins className="w-3.5 h-3.5" /> {ch.rewardCoins}
                      </span>
                      <span className="text-[10px] font-bold text-fuchsia-300 truncate max-w-[115px]">
                        {cleared ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Claimed
                          </span>
                        ) : (
                          `★ ${rewardCard?.name}`
                        )}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRE-DUEL DIALOGUE THEATER MODAL */}
      {selectedChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl game-panel clip-chamfer border-indigo-400/60 shadow-[0_0_75px_rgba(99,102,241,0.35)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-300">
                  {selectedChapter.title}
                </div>
                <h2 className="font-display text-xl font-extrabold text-white">
                  {selectedChapter.bossName} — {selectedChapter.bossTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChapter(null)}
                className="game-panel clip-chamfer-sm p-2 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-48 h-52 clip-hex p-[3.5px] bg-gradient-to-b from-amber-300 via-indigo-500 to-fuchsia-600 shadow-2xl">
                  <img
                    src={selectedChapter.portrait}
                    alt={selectedChapter.bossName}
                    className="w-full h-full clip-hex object-cover object-top"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-mono-num">
                  <span className="clip-chamfer-sm px-3 py-1 bg-rose-950/80 border border-rose-500/60 text-rose-200 flex items-center gap-1 font-bold">
                    <Heart className="w-3.5 h-3.5" /> {selectedChapter.bossLp} LP
                  </span>
                  <span className="clip-chamfer-sm px-3 py-1 bg-amber-950/80 border border-amber-500/60 text-amber-200 flex items-center gap-1 font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> {selectedChapter.bossEvoOrbs} Evo Orbs
                  </span>
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col justify-between gap-4">
                <div>
                  <div className="clip-chamfer-sm bg-slate-900/95 border border-indigo-400/50 p-4 min-h-[92px] flex flex-col justify-between">
                    <p className="text-sm text-slate-100 leading-relaxed italic">
                      “{selectedChapter.dialogue.preDuel[dialogueStep]}”
                    </p>
                    {dialogueStep < selectedChapter.dialogue.preDuel.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setDialogueStep((s) => s + 1)}
                        className="self-end mt-2 text-xs font-extrabold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                      >
                        NEXT LINE ➔
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3 clip-chamfer-sm bg-slate-950/90 border border-slate-800 p-3">
                    {CARD_MAP[selectedChapter.rewardCardId] && (
                      <Card
                        card={CARD_MAP[selectedChapter.rewardCardId]}
                        size="xs"
                        interactiveTilt={false}
                      />
                    )}
                    <div className="text-xs space-y-1">
                      <div className="text-amber-300 font-extrabold uppercase tracking-wider text-[10px]">
                        First-Clear Bounty
                      </div>
                      <div className="font-display font-bold text-white text-sm">
                        {CARD_MAP[selectedChapter.rewardCardId]?.name}
                      </div>
                      <div className="text-amber-200 font-mono-num font-bold">
                        +{selectedChapter.rewardCoins} Aether Coins
                      </div>
                      <div className="text-[11px] text-rose-300">
                        Boss Rule: {selectedChapter.modifierDescription}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                      Select Your Duel Deck
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                      {validDecks.map((d) => {
                        const isChosen = d.id === chosenDeckId;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              soundEngine.uiClick();
                              setActiveDeck(d.id);
                            }}
                            className={`flex-1 min-w-[140px] text-left clip-chamfer-sm px-2.5 py-1.5 border transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-cyan-950/75 border-cyan-300 text-white shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-cyan-400/60'
                            }`}
                          >
                            <div className="font-display font-bold text-[11px] truncate">
                              {d.name}
                            </div>
                            <div className="text-[9.5px] font-mono-num text-cyan-300/90">
                              {d.mainDeck.length} Main • {d.riftDeck.length} Rift
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.summon();
                      onStartChapter(selectedChapter, chosenDeckId);
                    }}
                    className="relative overflow-hidden shine-sweep w-full py-3.5 clip-skew-btn bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 border border-amber-200/80 text-white font-display font-extrabold text-sm tracking-widest shadow-[0_0_30px_rgba(249,115,22,0.55)] hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Swords className="w-4 h-4" /> ENTER RIFT DUEL!
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
