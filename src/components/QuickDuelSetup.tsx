import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain, Shield, Sparkles, Swords } from 'lucide-react';
import { AI_ARCHETYPES, type AiArchetype } from '../data/decks';
import { FACTIONS } from '../data/factions';
import { DUELIST_SKILLS, getSkillDef } from '../data/skills';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';

interface QuickDuelSetupProps {
  onBack: () => void;
  onLaunch: (params: {
    deckId: string;
    archetype: AiArchetype;
    difficulty: 'initiate' | 'grandmaster';
  }) => void;
}

export const QuickDuelSetup: React.FC<QuickDuelSetupProps> = ({ onBack, onLaunch }) => {
  const { decks, activeDeckId, setActiveDeck, selectedSkillId, setSelectedSkill, deckRecords } =
    useProfileStore();
  const activeSkill = getSkillDef(selectedSkillId);
  const validDecks = decks.filter((d) => d.mainDeck.length === 30);

  const [selectedDeckId, setSelectedDeckId] = useState(
    validDecks.some((d) => d.id === activeDeckId)
      ? activeDeckId
      : validDecks[0]?.id ?? decks[0].id
  );
  const [selectedArchetype, setSelectedArchetype] = useState<AiArchetype>(AI_ARCHETYPES[0]);
  const [difficulty, setDifficulty] = useState<'initiate' | 'grandmaster'>('initiate');

  return (
    <div className="min-h-screen w-full bg-[#060812] text-slate-100 p-4 sm:p-6 flex flex-col">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              onBack();
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400/60 text-slate-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Menu
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Quick Duel Arena
            </h1>
            <p className="text-xs text-slate-400">
              Win to earn 100–150 Aether Coins (losses still grant 35 Coins).
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto py-6 space-y-6">
        {/* Step 1: Your Deck & AI Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4">
            <div className="text-xs uppercase tracking-wider text-cyan-300 font-bold mb-2">
              1. Choose Your Deck
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validDecks.map((d) => {
                const rec = deckRecords?.[d.id];
                const tot = rec ? rec.wins + rec.losses : 0;
                const wr = tot > 0 && rec ? Math.round((rec.wins / tot) * 100) : null;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      soundEngine.uiClick();
                      setSelectedDeckId(d.id);
                      setActiveDeck(d.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedDeckId === d.id
                        ? 'bg-cyan-950/50 border-cyan-400 text-white'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display font-bold text-sm truncate">{d.name}</div>
                      {tot > 0 && rec && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono-num text-[10px] font-bold text-emerald-300 shrink-0">
                          {rec.wins}W-{rec.losses}L • {wr}%
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {d.mainDeck.length} Main Cards • {d.riftDeck.length} Rift Fusion Apex
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2">
                2. Select AI Difficulty
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.uiClick();
                    setDifficulty('initiate');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    difficulty === 'initiate'
                      ? 'bg-emerald-950/50 border-emerald-400 text-white'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <Shield className="w-5 h-5 text-emerald-300 mb-1.5" />
                  <div className="font-display font-bold text-sm">Initiate</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Balanced pacing, great for testing new Fusion combos.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.uiClick();
                    setDifficulty('grandmaster');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    difficulty === 'grandmaster'
                      ? 'bg-rose-950/50 border-rose-400 text-white'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <Brain className="w-5 h-5 text-rose-300 mb-1.5" />
                  <div className="font-display font-bold text-sm">Grandmaster</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Baits Ambush traps, optimizes Soul Burn, lethal &amp; Ward counters.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2.5: Choose Duelist Skill (1/Duel) */}
        <div className="rounded-2xl bg-slate-950/90 border border-amber-500/35 p-4">
          <div className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Duelist Character Skill (1/Duel):{' '}
            <span className="text-white">{activeSkill.skillName}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {DUELIST_SKILLS.map((sk) => {
              const isPicked = activeSkill.id === sk.id;
              return (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => {
                    soundEngine.uiClick();
                    setSelectedSkill(sk.id);
                  }}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isPicked
                      ? `${sk.borderColor} bg-indigo-950/75 text-white shadow-[0_0_16px_rgba(251,191,36,0.25)]`
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={sk.portrait}
                    alt={sk.duelistName}
                    className="w-9 h-9 rounded-lg object-cover object-top shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-[11px] text-white truncate">
                      {sk.skillName}
                    </div>
                    <div className="text-[9.5px] text-amber-300/90 truncate">{sk.triggerHint}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-300">{activeSkill.description}</p>
        </div>

        {/* Step 3: Opponent Archetype */}
        <div>
          <div className="text-xs uppercase tracking-wider text-fuchsia-300 font-bold mb-2.5">
            3. Choose Rival Archetype
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {AI_ARCHETYPES.map((arch) => {
              const faction = FACTIONS[arch.faction];
              const isSelected = selectedArchetype.id === arch.id;
              return (
                <motion.button
                  key={arch.id}
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    soundEngine.uiClick();
                    setSelectedArchetype(arch);
                  }}
                  className={`text-left rounded-xl border p-2.5 transition-all cursor-pointer flex items-center gap-3 lg:flex-col lg:items-stretch lg:gap-2 ${
                    isSelected
                      ? 'bg-indigo-950/65 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                      : 'bg-slate-950/85 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={arch.portrait}
                    alt={arch.name}
                    className="w-16 h-16 sm:w-18 sm:h-18 lg:w-full lg:h-28 xl:h-32 rounded-lg object-cover object-top border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[9.5px] font-extrabold uppercase tracking-wider truncate ${faction.textColor}`}>
                      {arch.title}
                    </div>
                    <div className="font-display font-bold text-sm text-white leading-tight mt-0.5 truncate">
                      {arch.name}
                    </div>
                    {difficulty === 'grandmaster' && arch.skillId && (
                      <div className="text-[9.5px] font-bold text-amber-300 mt-0.5 truncate">
                        ★ Skill: {getSkillDef(arch.skillId).skillName}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 lg:line-clamp-3 leading-snug">
                      {arch.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Launch Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              soundEngine.summon();
              onLaunch({
                deckId: selectedDeckId,
                archetype: selectedArchetype,
                difficulty,
              });
            }}
            className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 text-white font-display font-extrabold text-base tracking-wider shadow-[0_0_32px_rgba(99,102,241,0.55)] hover:brightness-110 flex items-center gap-2 cursor-pointer"
          >
            <Swords className="w-5 h-5" /> START RIFT DUEL
          </button>
        </div>
      </div>
    </div>
  );
};
