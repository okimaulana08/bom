import React, { useEffect, useState } from 'react';
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

interface ActiveMatchMeta {
  config: DuelConfig;
  portrait: string;
  returnTo: ScreenId;
}

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenId>('menu');
  const [lastMatch, setLastMatch] = useState<ActiveMatchMeta | null>(null);

  const decks = useProfileStore((s) => s.decks);
  const soundEnabled = useProfileStore((s) => s.soundEnabled);
  const startDuel = useDuelStore((s) => s.startDuel);
  const exitDuel = useDuelStore((s) => s.exitDuel);

  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

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
        opponentDeck: chapter.deck,
        opponentRiftDeck: chapter.riftDeck,
        opponentStartLp: chapter.bossLp,
        opponentStartEvoOrbs: chapter.bossEvoOrbs,
        bossModifier: chapter.bossModifier,
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
        opponentDeck: params.archetype.mainDeck,
        opponentRiftDeck: params.archetype.riftDeck,
        aiDifficulty: params.difficulty,
      },
      portrait: params.archetype.portrait,
      returnTo: 'quick_duel',
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

export default App;
