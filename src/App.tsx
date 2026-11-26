import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CampaignChapter, DuelConfig } from './engine/types';
import { CARD_MAP } from './data/cards';
import { STARTER_DECK, type AiArchetype } from './data/decks';
import { useProfileStore } from './store/profileStore';
import { useDuelStore } from './store/duelStore';
import { soundEngine } from './audio/soundEngine';
import { Card } from './components/Card';
import { MainMenu, type ScreenId } from './components/MainMenu';
import { CampaignMap } from './components/CampaignMap';
import { QuickDuelSetup } from './components/QuickDuelSetup';
import { PackShop } from './components/PackShop';
import { DeckBuilder } from './components/DeckBuilder';
import { CardCodex } from './components/CardCodex';
import { RulesGuide } from './components/RulesGuide';
import { DuelBoard } from './components/DuelBoard';
import { RiftSpire } from './components/RiftSpire';
import { getSpireFloorEnemy } from './data/spire';

interface ActiveMatchMeta {
  config: DuelConfig;
  portrait: string;
  returnTo: ScreenId;
}

const SPLASH_SESSION_KEY = 'aetherbound_splash_seen_v1';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenId>('menu');
  const [lastMatch, setLastMatch] = useState<ActiveMatchMeta | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const hasShowcase = new URLSearchParams(window.location.search).has('showcase');
      if (hasShowcase) return false;
      if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return false;
      return true;
    } catch {
      return false;
    }
  });

  const decks = useProfileStore((s) => s.decks);
  const selectedSkillId = useProfileStore((s) => s.selectedSkillId ?? 'volcanic_ignition');
  const spireRun = useProfileStore((s) => s.spireRun);
  const soundEnabled = useProfileStore((s) => s.soundEnabled);
  const startDuel = useDuelStore((s) => s.startDuel);
  const exitDuel = useDuelStore((s) => s.exitDuel);

  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (!showSplash) return;
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      // Ignore storage quota / privacy errors
    }
    const timer = setTimeout(() => setShowSplash(false), 1150);
    return () => clearTimeout(timer);
  }, [showSplash]);

  const showcaseParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('showcase')
      : null;

  if (showcaseParam) {
    const sampleIds =
      showcaseParam === 'samples'
        ? [
            { label: 'MONSTER (VANGUARD)', id: 'pyro_sky_dragoon' },
            { label: 'SPELL (ARCANA)', id: 'pyro_dragon_roar' },
            { label: 'TRAP (AMBUSH)', id: 'umbra_phantom_matrix' },
            { label: 'FUSION APEX', id: 'fusion_supernova_starwyrm' },
          ]
        : [{ label: CARD_MAP[showcaseParam]?.type.toUpperCase() ?? 'CARD', id: showcaseParam }];

    return (
      <div className="min-h-screen w-full bg-[#050712] flex items-center justify-center p-8 gap-8 flex-wrap">
        {sampleIds.map((item) => {
          const card = CARD_MAP[item.id];
          if (!card) return null;
          return (
            <div key={item.id} className="flex flex-col items-center gap-3">
              <span className="font-display font-extrabold text-xs tracking-[0.25em] uppercase text-amber-300">
                {item.label}
              </span>
              <Card card={card} size="lg" interactiveTilt={false} />
            </div>
          );
        })}
      </div>
    );
  }

  const launchMatch = (meta: ActiveMatchMeta) => {
    setLastMatch(meta);
    startDuel(meta.config, meta.portrait);
    setScreen('duel');
  };

  const handleStartCampaignChapter = (chapter: CampaignChapter, deckId: string) => {
    const deck = decks.find((d) => d.id === deckId) ?? STARTER_DECK;
    launchMatch({
      config: {
        playerName: 'Rift Duelist',
        opponentName: chapter.bossName,
        playerDeck: deck.mainDeck,
        playerRiftDeck: deck.riftDeck,
        playerDeckId: deck.id,
        playerDeckName: deck.name,
        opponentDeck: chapter.deck,
        opponentRiftDeck: chapter.riftDeck,
        opponentStartLp: chapter.bossLp,
        opponentStartEvoOrbs: chapter.bossEvoOrbs,
        bossModifier: chapter.bossModifier,
        playerSkillId: selectedSkillId,
        opponentSkillId: chapter.bossSkillId ?? null,
        chapterId: chapter.id,
        aiDifficulty: chapter.aiDifficulty,
      },
      portrait: chapter.portrait,
      returnTo: 'campaign',
    });
  };

  const handleStartQuickDuel = (params: {
    deckId: string;
    archetype: AiArchetype;
    difficulty: 'initiate' | 'grandmaster';
  }) => {
    const deck = decks.find((d) => d.id === params.deckId) ?? STARTER_DECK;
    launchMatch({
      config: {
        playerName: 'Rift Duelist',
        opponentName: params.archetype.name,
        playerDeck: deck.mainDeck,
        playerRiftDeck: deck.riftDeck,
        playerDeckId: deck.id,
        playerDeckName: deck.name,
        opponentDeck: params.archetype.mainDeck,
        opponentRiftDeck: params.archetype.riftDeck,
        playerSkillId: selectedSkillId,
        opponentSkillId:
          params.difficulty === 'grandmaster' ? (params.archetype.skillId ?? null) : null,
        aiDifficulty: params.difficulty,
      },
      portrait: params.archetype.portrait,
      returnTo: 'quick_duel',
    });
  };

  const handleLaunchSpireFloor = (floor: number) => {
    const run = spireRun;
    if (!run || !run.active) return;
    const enemy = getSpireFloorEnemy(floor);
    launchMatch({
      config: {
        playerName: 'Spire Challenger',
        opponentName: enemy.enemyName,
        playerDeck: run.deck,
        playerRiftDeck: run.riftDeck,
        playerDeckId: 'rift_spire_draft',
        playerDeckName: 'Rift Spire Draft Deck',
        playerStartLp: run.currentLp,
        playerSkillId: selectedSkillId,
        playerBlessings: run.blessings,
        spireFloor: floor,
        opponentDeck: enemy.deck,
        opponentRiftDeck: enemy.riftDeck,
        opponentStartLp: enemy.enemyLp,
        bossModifier: enemy.bossModifier,
        aiDifficulty: enemy.difficulty,
      },
      portrait: enemy.portrait,
      returnTo: 'spire',
    });
  };

  const handleExitDuel = () => {
    exitDuel();
    setScreen(lastMatch?.returnTo ?? 'menu');
  };

  const handleRematch = () => {
    if (!lastMatch) return;
    launchMatch({
      ...lastMatch,
      config: { ...lastMatch.config, seed: Date.now() },
    });
  };

  const renderScreen = () => {
    if (screen === 'duel') {
      return <DuelBoard onExit={handleExitDuel} onRematch={handleRematch} />;
    }
    if (screen === 'campaign') {
      return (
        <CampaignMap
          onBack={() => setScreen('menu')}
          onStartChapter={handleStartCampaignChapter}
        />
      );
    }
    if (screen === 'spire') {
      return (
        <RiftSpire
          onBack={() => setScreen('menu')}
          onLaunchFloor={handleLaunchSpireFloor}
        />
      );
    }
    if (screen === 'quick_duel') {
      return (
        <QuickDuelSetup
          onBack={() => setScreen('menu')}
          onLaunch={handleStartQuickDuel}
        />
      );
    }
    if (screen === 'shop') {
      return <PackShop onBack={() => setScreen('menu')} />;
    }
    if (screen === 'deck_builder') {
      return <DeckBuilder onBack={() => setScreen('menu')} />;
    }
    if (screen === 'codex') {
      return <CardCodex onBack={() => setScreen('menu')} />;
    }
    if (screen === 'rules') {
      return <RulesGuide onBack={() => setScreen('menu')} />;
    }
    return <MainMenu onNavigate={setScreen} />;
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#04050c] overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 0.988 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.012 }}
          transition={{ duration: 0.19, ease: 'easeOut' }}
          className="min-h-[100dvh] w-full"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {/* GLOSSY PWA SPLASH INTRO (ONCE PER SESSION, TAP TO SKIP) */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="aetherbound-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={() => setShowSplash(false)}
            className="fixed inset-0 z-[100] bg-[#03040b] flex flex-col items-center justify-center p-6 cursor-pointer select-none overflow-hidden"
          >
            {/* Radiant ambient backdrop */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, rgba(56,189,248,0.22) 0%, rgba(168,85,247,0.16) 34%, rgba(3,4,11,0.98) 72%)',
              }}
            />

            {/* Spinning Astrolabe Emblem */}
            <div className="relative flex items-center justify-center">
              <svg
                viewBox="0 0 240 240"
                className="w-56 h-56 sm:w-64 sm:h-64 opacity-50 animate-spin-slow"
                fill="none"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="14 8"
                />
                <circle cx="120" cy="120" r="88" stroke="#38bdf8" strokeWidth="1.2" />
                <polygon points="120,16 210,172 30,172" stroke="#c084fc" strokeWidth="1.2" />
                <polygon points="120,224 210,68 30,68" stroke="#38bdf8" strokeWidth="1.2" />
              </svg>

              <motion.div
                initial={{ scale: 0.65, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 210, damping: 16 }}
                className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-[3px] shadow-[0_0_65px_rgba(251,191,36,0.6)]"
                style={{
                  background:
                    'linear-gradient(135deg, #fde047 0%, #f59e0b 35%, #38bdf8 70%, #c084fc 100%)',
                }}
              >
                <img
                  src="/icons/icon-192.png"
                  alt="Aetherbound: Rift Duel"
                  className="w-full h-full rounded-[21px] object-cover"
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.16, duration: 0.35 }}
              className="mt-5 text-center relative z-10"
            >
              <div className="font-display text-2xl sm:text-4xl font-extrabold tracking-[0.26em] bg-gradient-to-b from-white via-cyan-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
                AETHERBOUND
              </div>
              <div className="mt-1 flex items-center justify-center gap-3">
                <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-amber-400" />
                <span className="font-display text-xs sm:text-sm font-extrabold tracking-[0.42em] text-amber-300 uppercase">
                  RIFT DUEL
                </span>
                <span className="h-[1px] w-10 bg-gradient-to-l from-transparent to-amber-400" />
              </div>

              {/* Glossy Loading Progress Bar */}
              <div className="mt-6 w-48 sm:w-56 h-1.5 mx-auto rounded-full bg-slate-900 border border-indigo-500/40 overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.95, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 shadow-[0_0_12px_#38bdf8]"
                />
              </div>
              <div className="mt-2 text-[9.5px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Initializing Rift Arena...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
