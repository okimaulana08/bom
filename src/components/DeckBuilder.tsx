import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookMarked,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Crown,
  Flame,
  Layers,
  Minus,
  Plus,
  Save,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import type { CardDef, CardSetId, CardType, DeckList, Faction } from '../engine/types';
import {
  autoBuildDeck,
  hasOwnedMaximumSet,
  type AutoBuildStrategy,
} from '../engine/autoDeckBuilder';
import { CARDS, CARD_MAP, RARITY_CRAFT_COST } from '../data/cards';
import { getCardArtPresentation } from '../data/cardArtStyle';
import { AI_ARCHETYPES, STARTER_DECK } from '../data/decks';
import { FACTIONS, FACTION_LIST } from '../data/factions';
import { getSkillDef } from '../data/skills';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';
import { Card } from './Card';

function encodeDeckCode(name: string, mainDeck: string[], riftDeck: string[]): string {
  const payload = JSON.stringify({ n: name, m: mainDeck, r: riftDeck });
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `ABRD:${btoa(binary)}`;
}

function decodeDeckCode(
  code: string
): { ok: true; name: string; mainDeck: string[]; riftDeck: string[] } | { ok: false; error: string } {
  try {
    const trimmed = code.trim();
    const rawB64 = trimmed.startsWith('ABRD:') ? trimmed.slice(5) : trimmed;
    const binary = atob(rawB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.m) || !Array.isArray(parsed.r)) {
      return { ok: false, error: 'Invalid Deck Code structure.' };
    }
    const name = typeof parsed.n === 'string' && parsed.n.trim() ? parsed.n.trim() : 'Imported Rift Deck';
    return { ok: true, name, mainDeck: parsed.m, riftDeck: parsed.r };
  } catch {
    return { ok: false, error: 'Could not decode Deck Code. Make sure you copied the full ABRD:... code!' };
  }
}

interface DeckBuilderProps {
  onBack: () => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ onBack }) => {
  const {
    collection,
    dust,
    decks,
    activeDeckId,
    hasChampionBadge,
    selectedSkillId,
    craftCard,
    saveDeck,
    deleteDeck,
    setActiveDeck,
    setSelectedSkill,
  } = useProfileStore();

  const initialDeck = decks.find((d) => d.id === activeDeckId) ?? decks[0];
  const [editingDeckId, setEditingDeckId] = useState<string>(initialDeck.id);
  const [deckName, setDeckName] = useState<string>(initialDeck.name);
  const [mainDeck, setMainDeck] = useState<string[]>([...initialDeck.mainDeck]);
  const [riftDeck, setRiftDeck] = useState<string[]>([...initialDeck.riftDeck]);

  const [deckTab, setDeckTab] = useState<'main' | 'rift'>('main');
  const [search, setSearch] = useState('');
  const [setFilter, setSetFilter] = useState<CardSetId | 'all'>('all');
  const [factionFilter, setFactionFilter] = useState<Faction | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'spell' | 'low' | 'mid' | 'high'>('all');
  const [onlyEvolvable, setOnlyEvolvable] = useState(false);
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [importCodeText, setImportCodeText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Smart Auto-Build state
  const [autoBuildOpen, setAutoBuildOpen] = useState(false);
  const [autoStrategy, setAutoStrategy] = useState<AutoBuildStrategy>('auto');
  const [autoFocusFaction, setAutoFocusFaction] = useState<Faction | 'auto'>('auto');
  const [autoFillMode, setAutoFillMode] = useState(false);
  const [equipRecommendedSkill, setEquipRecommendedSkill] = useState(true);

  const ownsCompleteMaxSet = useMemo(
    () => hasOwnedMaximumSet(collection, CARD_MAP),
    [collection]
  );

  const canSmartFillCurrent =
    (mainDeck.length > 0 || riftDeck.length > 0) &&
    (mainDeck.length < 30 || riftDeck.length < 5);

  const autoBuildPreview = useMemo(() => {
    if (!autoBuildOpen) return null;
    const useFill = autoFillMode && canSmartFillCurrent;
    return autoBuildDeck(collection, CARD_MAP, {
      strategy: autoStrategy,
      focusFaction: autoFocusFaction,
      fillRemaining: useFill,
      lockedMain: useFill ? mainDeck : undefined,
      lockedRift: useFill ? riftDeck : undefined,
      seed: 1337,
    });
  }, [
    autoBuildOpen,
    collection,
    autoStrategy,
    autoFocusFaction,
    autoFillMode,
    canSmartFillCurrent,
    mainDeck,
    riftDeck,
  ]);

  const openAutoBuildModal = (preferFill = false) => {
    soundEngine.uiClick();
    setAutoFillMode(preferFill && canSmartFillCurrent);
    setAutoBuildOpen(true);
  };

  const applyAutoBuildToCurrent = () => {
    if (!autoBuildPreview?.ok) return;
    setMainDeck([...autoBuildPreview.mainDeck]);
    setRiftDeck([...autoBuildPreview.riftDeck]);
    if (equipRecommendedSkill) {
      setSelectedSkill(autoBuildPreview.report.recommendedSkillId);
    }
    setAutoBuildOpen(false);
    soundEngine.evolve();
    const skillName = getSkillDef(autoBuildPreview.report.recommendedSkillId).skillName;
    notify(
      equipRecommendedSkill
        ? `Auto-Built ${autoBuildPreview.mainDeck.length}/30 + ${autoBuildPreview.riftDeck.length} Rift (${autoBuildPreview.report.grade}) & equipped "${skillName}"! Click Save to keep.`
        : `Auto-Built ${autoBuildPreview.mainDeck.length}/30 + ${autoBuildPreview.riftDeck.length} Rift (${autoBuildPreview.report.grade})! Click Save to keep.`
    );
  };

  const saveAutoBuildAsNewDeck = () => {
    if (!autoBuildPreview?.ok) return;
    const id = `auto_${Date.now()}`;
    const newDeck: DeckList = {
      id,
      name: autoBuildPreview.report.suggestedName,
      mainDeck: [...autoBuildPreview.mainDeck],
      riftDeck: [...autoBuildPreview.riftDeck],
    };
    saveDeck(newDeck);
    loadDeckIntoEditor(newDeck);
    if (equipRecommendedSkill) {
      setSelectedSkill(autoBuildPreview.report.recommendedSkillId);
    }
    setAutoBuildOpen(false);
    soundEngine.evolve();
    notify(
      `Created "${newDeck.name}" (${newDeck.mainDeck.length}/30 + ${newDeck.riftDeck.length} Rift • Grade ${autoBuildPreview.report.grade})!`
    );
  };

  const isStarter = decks.find((d) => d.id === editingDeckId)?.isStarter ?? false;

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const presetTemplates = useMemo(
    () => [
      {
        id: 'preset_starter',
        name: STARTER_DECK.name,
        title: 'Starter Balanced Hybrid',
        faction: 'pyroclast' as Faction,
        description: STARTER_DECK.description ?? 'Balanced Pyro/Cryo/Chrono hybrid.',
        mainDeck: STARTER_DECK.mainDeck,
        riftDeck: STARTER_DECK.riftDeck,
      },
      ...AI_ARCHETYPES.map((a) => ({
        id: a.id,
        name: a.title,
        title: a.name,
        faction: a.faction,
        description: a.description,
        mainDeck: a.mainDeck,
        riftDeck: a.riftDeck,
      })),
    ],
    []
  );

  const buildOwnedSubset = (rawMain: string[], rawRift: string[]) => {
    const used: Record<string, number> = {};
    const nextMain: string[] = [];
    const nextRift: string[] = [];
    let missingMain = 0;
    let missingRift = 0;

    for (const id of rawMain) {
      const def = CARD_MAP[id];
      if (!def || def.type === 'fusion_apex') continue;
      const owned = collection[id] ?? 0;
      const cur = used[id] ?? 0;
      if (nextMain.length < 30 && cur < 3 && cur < owned) {
        nextMain.push(id);
        used[id] = cur + 1;
      } else {
        missingMain += 1;
      }
    }

    for (const id of rawRift) {
      const def = CARD_MAP[id];
      if (!def || def.type !== 'fusion_apex') continue;
      const owned = collection[id] ?? 0;
      const cur = used[id] ?? 0;
      if (nextRift.length < 5 && cur < 3 && cur < owned) {
        nextRift.push(id);
        used[id] = cur + 1;
      } else {
        missingRift += 1;
      }
    }
    return { nextMain, nextRift, missingMain, missingRift };
  };

  const applyTemplate = (tplName: string, rawMain: string[], rawRift: string[]) => {
    const { nextMain, nextRift, missingMain, missingRift } = buildOwnedSubset(rawMain, rawRift);
    const id = `custom_${Date.now()}`;
    const newDeck: DeckList = {
      id,
      name: tplName,
      mainDeck: nextMain,
      riftDeck: nextRift,
    };
    saveDeck(newDeck);
    loadDeckIntoEditor(newDeck);
    setPresetsOpen(false);
    soundEngine.relicAttach();
    const totalMissing = missingMain + missingRift;
    notify(
      totalMissing === 0
        ? `Loaded complete "${tplName}" (${nextMain.length}/30 + ${nextRift.length} Rift)!`
        : `Loaded "${tplName}" (${nextMain.length}/30 owned • ${totalMissing} card${totalMissing > 1 ? 's' : ''} missing — craft or swap!).`
    );
  };

  const handleImportDeckCode = () => {
    const decoded = decodeDeckCode(importCodeText);
    if (!decoded.ok) {
      notify(decoded.error);
      return;
    }
    applyTemplate(decoded.name, decoded.mainDeck, decoded.riftDeck);
    setImportCodeText('');
    setCodeModalOpen(false);
  };

  const currentDeckCode = useMemo(
    () => encodeDeckCode(deckName.trim() || 'Rift Deck', mainDeck, riftDeck),
    [deckName, mainDeck, riftDeck]
  );

  const handleCopyDeckCode = async () => {
    soundEngine.uiClick();
    try {
      await navigator.clipboard.writeText(currentDeckCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
      notify('Deck Code copied to clipboard!');
    } catch {
      notify('Could not auto-copy — select and copy the code manually.');
    }
  };

  const loadDeckIntoEditor = (d: DeckList) => {
    soundEngine.uiClick();
    setEditingDeckId(d.id);
    setDeckName(d.name);
    setMainDeck([...d.mainDeck]);
    setRiftDeck([...d.riftDeck]);
    setActiveDeck(d.id);
  };

  const createNewDeck = () => {
    soundEngine.uiClick();
    const id = `custom_${Date.now()}`;
    const newDeck: DeckList = {
      id,
      name: `Custom Rift Deck ${decks.length}`,
      mainDeck: [],
      riftDeck: [],
    };
    saveDeck(newDeck);
    loadDeckIntoEditor(newDeck);
    notify('Created new blank deck!');
  };

  const cloneCurrentDeck = () => {
    soundEngine.uiClick();
    const id = `custom_${Date.now()}`;
    const cloned: DeckList = {
      id,
      name: `${deckName} Copy`,
      mainDeck: [...mainDeck],
      riftDeck: [...riftDeck],
    };
    saveDeck(cloned);
    loadDeckIntoEditor(cloned);
    notify('Cloned deck!');
  };

  const handleSave = () => {
    const cleanName = deckName.trim() || 'Untitled Rift Deck';
    saveDeck({
      id: editingDeckId,
      name: cleanName,
      mainDeck,
      riftDeck,
      isStarter,
    });
    soundEngine.relicAttach();
    notify(`Saved "${cleanName}"!`);
  };

  const handleDelete = () => {
    if (isStarter) return;
    soundEngine.uiClick();
    deleteDeck(editingDeckId);
    const fallback = decks.find((d) => d.id !== editingDeckId) ?? decks[0];
    if (fallback) loadDeckIntoEditor(fallback);
    notify('Deleted custom deck.');
  };

  const countInDeck = (cardId: string) => {
    const def = CARD_MAP[cardId];
    const list = def?.type === 'fusion_apex' ? riftDeck : mainDeck;
    return list.filter((id) => id === cardId).length;
  };

  const addCardToDeck = (card: CardDef) => {
    const owned = collection[card.id] ?? 0;
    const inDeck = countInDeck(card.id);
    if (inDeck >= owned) {
      notify(`You only own ${owned} cop${owned === 1 ? 'y' : 'ies'} of ${card.name}. Craft more or open packs!`);
      return;
    }
    if (inDeck >= 3) {
      notify('Max 3 copies of any card per deck.');
      return;
    }
    if (card.type === 'fusion_apex') {
      if (riftDeck.length >= 5) {
        notify('Rift Deck is full (max 5 Fusion Apex cards).');
        return;
      }
      setRiftDeck((prev) => [...prev, card.id]);
      setDeckTab('rift');
    } else {
      if (mainDeck.length >= 30) {
        notify('Main Deck is full (30/30). Remove a card first.');
        return;
      }
      setMainDeck((prev) => [...prev, card.id]);
      setDeckTab('main');
    }
    soundEngine.cardDraw();
  };

  const removeCardFromDeck = (cardId: string) => {
    const def = CARD_MAP[cardId];
    if (def?.type === 'fusion_apex') {
      const idx = riftDeck.lastIndexOf(cardId);
      if (idx !== -1) {
        setRiftDeck((prev) => prev.filter((_, i) => i !== idx));
        soundEngine.uiClick();
      }
    } else {
      const idx = mainDeck.lastIndexOf(cardId);
      if (idx !== -1) {
        setMainDeck((prev) => prev.filter((_, i) => i !== idx));
        soundEngine.uiClick();
      }
    }
  };

  const handleInlineCraft = (card: CardDef) => {
    const res = craftCard(card.id);
    if (!res.ok) {
      notify(res.error ?? 'Cannot craft card.');
      return;
    }
    soundEngine.evolve();
    notify(`Crafted 1× ${card.name}!`);
  };

  const filteredCards = useMemo(() => {
    return CARDS.filter((c) => {
      const cardSet: CardSetId = c.setId ?? 'genesis';
      if (setFilter !== 'all' && cardSet !== setFilter) return false;
      if (deckTab === 'rift' && c.type !== 'fusion_apex') return false;
      if (deckTab === 'main' && c.type === 'fusion_apex' && typeFilter !== 'fusion_apex')
        return false;
      if (
        factionFilter !== 'all' &&
        c.faction !== factionFilter &&
        c.secondaryFaction !== factionFilter
      ) {
        return false;
      }
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (levelFilter === 'spell' && c.level !== 0) return false;
      if (levelFilter === 'low' && (c.level < 1 || c.level > 4)) return false;
      if (levelFilter === 'mid' && (c.level < 5 || c.level > 6)) return false;
      if (levelFilter === 'high' && c.level < 7) return false;
      if (onlyEvolvable && !c.evolvedData) return false;
      if (onlyOwned && (collection[c.id] ?? 0) === 0) return false;
      if (
        search.trim() &&
        !`${c.name} ${c.effectText} ${c.keywords.join(' ')}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [
    deckTab,
    setFilter,
    factionFilter,
    typeFilter,
    levelFilter,
    onlyEvolvable,
    onlyOwned,
    search,
    collection,
  ]);

  // Real-time Speed Duel Deck Distribution (★1-4, ★5-6 Trib, ★7+ Boss, Spells, Traps, Equips)
  const deckCurve = useMemo(() => {
    const labels = ['★1–4', '★5–6', '★7+', 'Spell', 'Trap', 'Equip'];
    const buckets = [0, 0, 0, 0, 0, 0];
    for (const id of mainDeck) {
      const c = CARD_MAP[id];
      if (!c) continue;
      if (c.type === 'vanguard') {
        if (c.level <= 4) buckets[0] += 1;
        else if (c.level <= 6) buckets[1] += 1;
        else buckets[2] += 1;
      } else if (c.type === 'arcana') buckets[3] += 1;
      else if (c.type === 'ambush') buckets[4] += 1;
      else if (c.type === 'relic') buckets[5] += 1;
    }
    const maxVal = Math.max(1, ...buckets);
    return { labels, buckets, maxVal };
  }, [mainDeck]);

  // Grouped decklist for display
  const groupedCurrentList = useMemo(() => {
    const source = deckTab === 'main' ? mainDeck : riftDeck;
    const map = new Map<string, number>();
    for (const id of source) map.set(id, (map.get(id) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([id, count]) => ({ card: CARD_MAP[id], count }))
      .filter((x) => Boolean(x.card))
      .sort((a, b) => a.card.level - b.card.level || a.card.name.localeCompare(b.card.name));
  }, [deckTab, mainDeck, riftDeck]);

  const isDeckLegal = mainDeck.length === 30 && riftDeck.length <= 5;

  return (
    <div className="min-h-screen w-full bg-[#060812] text-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
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
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">
              Rift Deck Forge
            </h1>
            <p className="text-[11px] text-slate-400">
              30 Main Deck Cards + up to 5 Rift Deck Fusion Apexes • Mix Factions to unlock Dual Fusions!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-fuchsia-950/60 border border-fuchsia-400/50 flex items-center gap-1.5 text-xs font-bold text-fuchsia-200">
            <Wand2 className="w-3.5 h-3.5" /> {dust} Dust
          </div>
          <select
            value={editingDeckId}
            onChange={(e) => {
              const found = decks.find((d) => d.id === e.target.value);
              if (found) loadDeckIntoEditor(found);
            }}
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.mainDeck.length}/30 • {d.riftDeck.length}R)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createNewDeck}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
          <button
            type="button"
            onClick={cloneCurrentDeck}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Clone
          </button>
          <button
            type="button"
            onClick={() => openAutoBuildModal(false)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 border border-fuchsia-300/70 hover:brightness-110 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_18px_rgba(192,132,252,0.4)] cursor-pointer"
            title="Smart Auto-Build best synergistic deck from your owned cards"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" /> Auto-Build
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              setPresetsOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-400/60 hover:border-amber-300 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Load a 1-Click Faction Archetype Deck Preset"
          >
            <BookMarked className="w-3.5 h-3.5" /> Presets
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              setCodeModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-400/60 hover:border-cyan-300 text-cyan-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Export or Import a Shareable Deck Code (ABRD:...)"
          >
            <Code2 className="w-3.5 h-3.5" /> Deck Code
          </button>
        </div>
      </div>

      {feedback && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-indigo-950/95 border border-cyan-400 text-cyan-100 text-xs font-semibold shadow-2xl">
          {feedback}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* LEFT: COLLECTION BROWSER (8 cols) */}
        <div className="lg:col-span-8 p-3 sm:p-5 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 lg:overflow-y-auto lg:max-h-[calc(100vh-76px)]">
          {/* Filters Toolbar */}
          <div className="space-y-2.5 pb-4 border-b border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cards, effects, keywords..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <select
                value={setFilter}
                onChange={(e) => setSetFilter(e.target.value as CardSetId | 'all')}
                className="rounded-xl bg-slate-900 border border-amber-400/55 px-2.5 py-1.5 text-xs font-bold text-amber-200 cursor-pointer"
              >
                <option value="all">All Sets ({CARDS.length})</option>
                <option value="genesis">Set 1: Genesis</option>
                <option value="overdrive">Set 2A: Dragonic Overdrive</option>
                <option value="phantom">Set 2B: Cyber Phantom</option>
                <option value="arcana_vault">Set 3: Arcana &amp; Ambush Vault</option>
                <option value="maximum">Set 4: Maximum Overlord</option>
                <option value="egyptian_gods">Set 5: Pantheon of the Nile (Egyptian Gods)</option>
              </select>

              {/* Deck Target Tab Toggle */}
              <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setDeckTab('main');
                    if (typeFilter === 'fusion_apex') setTypeFilter('all');
                  }}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${
                    deckTab === 'main' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Main Cards ({mainDeck.length}/30)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeckTab('rift');
                    setTypeFilter('all');
                  }}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer ${
                    deckTab === 'rift' ? 'bg-fuchsia-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Rift Fusion ({riftDeck.length}/5)
                </button>
              </div>
            </div>

            {/* Factions + Type + Cost + Evolve Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setFactionFilter('all')}
                className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                  factionFilter === 'all'
                    ? 'bg-slate-200 text-slate-950 border-white'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                All Factions
              </button>
              {FACTION_LIST.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFactionFilter(f)}
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                    factionFilter === f
                      ? FACTIONS[f].badgeBg
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {FACTIONS[f].name}
                </button>
              ))}

              <span className="mx-1 text-slate-700">|</span>

              {deckTab === 'main' && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as CardType | 'all')}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
                >
                  <option value="all">All Types</option>
                  <option value="vanguard">Vanguard</option>
                  <option value="arcana">Arcana Spell</option>
                  <option value="ambush">Ambush Trap</option>
                  <option value="relic">Relic Equip</option>
                </select>
              )}

              <select
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value as 'all' | 'spell' | 'low' | 'mid' | 'high')
                }
                className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
              >
                <option value="all">Any Level</option>
                <option value="low">★1–4 (0 Tribute)</option>
                <option value="mid">★5–6 (1 Tribute)</option>
                <option value="high">★7+ (2 Tributes / Apex)</option>
                <option value="spell">Spells / Traps / Equips</option>
              </select>

              <button
                type="button"
                onClick={() => setOnlyEvolvable((v) => !v)}
                className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${
                  onlyEvolvable
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <Sparkles className="w-3 h-3" /> Can Evolve
              </button>

              <button
                type="button"
                onClick={() => setOnlyOwned((v) => !v)}
                className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                  onlyOwned
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Owned Only
              </button>
            </div>
          </div>

          {/* Card Grid */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredCards.map((card) => {
              const owned = collection[card.id] ?? 0;
              const inDeck = countInDeck(card.id);
              const craftCost = RARITY_CRAFT_COST[card.rarity];
              const canCraft =
                owned < 3 && dust >= craftCost && (!card.isExclusive || hasChampionBadge);

              return (
                <div
                  key={card.id}
                  className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-slate-950/75 border border-slate-800/80 hover:border-slate-700"
                >
                  <Card
                    card={card}
                    size="md"
                    locked={owned === 0}
                    onClick={() => addCardToDeck(card)}
                  />

                  <div className="w-full flex items-center justify-between text-[11px] px-1">
                    <span className="text-slate-400">
                      Owned:{' '}
                      <strong className={owned > 0 ? 'text-white' : 'text-rose-400'}>
                        {owned}/3
                      </strong>
                    </span>
                    <span className="text-cyan-300 font-bold">In Deck: {inDeck}</span>
                  </div>

                  <div className="w-full flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={inDeck <= 0}
                      onClick={() => removeCardFromDeck(card.id)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer"
                      title="Remove 1 from deck"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={inDeck >= owned || inDeck >= 3}
                      onClick={() => addCardToDeck(card)}
                      className="flex-1 py-1.5 rounded-lg bg-cyan-600/85 hover:bg-cyan-500 text-white font-bold text-[11px] disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
                    >
                      + Add
                    </button>
                    {owned < 3 && (
                      <button
                        type="button"
                        disabled={!canCraft}
                        onClick={() => handleInlineCraft(card)}
                        className="px-2 py-1.5 rounded-lg bg-fuchsia-950/90 border border-fuchsia-500/60 text-fuchsia-200 hover:bg-fuchsia-700 disabled:opacity-40 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                        title={
                          card.isExclusive && !hasChampionBadge
                            ? 'Beat Campaign Ch.5 to unlock'
                            : `Craft 1 copy for ${craftCost} Dust`
                        }
                      >
                        <Wand2 className="w-3 h-3" /> {craftCost}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: DECK SUMMARY & AETHER CURVE (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 bg-[#080b16] flex flex-col justify-between lg:max-h-[calc(100vh-76px)]">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Deck Name & Validation */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                disabled={isStarter}
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-display font-bold text-white disabled:opacity-75 focus:border-cyan-400 outline-none"
              />
              {!isStarter && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900 cursor-pointer"
                  title="Delete Deck"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span
                className={`flex items-center gap-1 font-bold ${
                  isDeckLegal ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isDeckLegal
                  ? 'Duel Legal (30 Main)'
                  : `Need ${Math.max(0, 30 - mainDeck.length)} more Main Deck cards`}
              </span>
              <span className="text-fuchsia-300 font-mono-num font-bold">
                Rift: {riftDeck.length}/5
              </span>
            </div>

            {canSmartFillCurrent && (
              <button
                type="button"
                onClick={() => openAutoBuildModal(true)}
                className="mt-2 w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-violet-950/90 via-fuchsia-950/80 to-cyan-950/90 border border-fuchsia-400/60 hover:border-amber-300 text-fuchsia-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Smart Auto-Fill Sisa Slot ({Math.max(0, 30 - mainDeck.length)} Main •{' '}
                {Math.max(0, 5 - riftDeck.length)} Rift)
              </button>
            )}

            {/* Real-Time Speed Duel Ratio Chart */}
            <div className="mt-3 rounded-xl bg-slate-950/90 border border-slate-800 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                Level &amp; Spell/Trap Ratio (Main Deck)
              </div>
              <div className="grid grid-cols-6 gap-2 items-end h-20 pt-2">
                {deckCurve.buckets.map((count, i) => {
                  const pct = Math.round((count / deckCurve.maxVal) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center h-full justify-end">
                      <span className="text-[10px] font-mono-num text-cyan-300 font-bold mb-0.5">
                        {count}
                      </span>
                      <div className="w-full bg-slate-900 rounded-t-md h-12 flex items-end overflow-hidden border border-slate-800">
                        <div
                          className="w-full bg-gradient-to-t from-amber-600 to-cyan-400 transition-all duration-300"
                          style={{ height: `${count > 0 ? Math.max(12, pct) : 0}%` }}
                        />
                      </div>
                      <span className="text-[9.5px] font-mono-num text-slate-400 mt-1">
                        {deckCurve.labels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decklist Tabs */}
            <div className="mt-3 flex border-b border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDeckTab('main')}
                className={`flex-1 py-2 cursor-pointer ${
                  deckTab === 'main'
                    ? 'text-cyan-300 border-b-2 border-cyan-400'
                    : 'text-slate-400'
                }`}
              >
                Main Deck ({mainDeck.length}/30)
              </button>
              <button
                type="button"
                onClick={() => setDeckTab('rift')}
                className={`flex-1 py-2 cursor-pointer ${
                  deckTab === 'rift'
                    ? 'text-fuchsia-300 border-b-2 border-fuchsia-400'
                    : 'text-slate-400'
                }`}
              >
                Rift Deck ({riftDeck.length}/5)
              </button>
            </div>

            {/* Scrollable Deck Cards List */}
            <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1">
              {groupedCurrentList.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">
                  Click cards on the left to add them to your{' '}
                  {deckTab === 'main' ? 'Main Deck' : 'Rift Deck'}.
                </div>
              ) : (
                groupedCurrentList.map(({ card, count }) => (
                  <div
                    key={card.id}
                    onClick={() => removeCardFromDeck(card.id)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-rose-500/60 cursor-pointer group transition-colors"
                    title="Click to remove 1 copy"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-5 rounded bg-amber-600/90 text-white font-mono-num font-bold text-[10px] flex items-center justify-center shrink-0">
                        {card.level > 0 ? `★${card.level}` : card.type === 'ambush' ? 'T' : 'S'}
                      </span>
                      <img
                        src={getCardArtPresentation(card).src}
                        alt={card.name}
                        className="w-7 h-7 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">
                          {card.name}
                        </div>
                        <div className="text-[9px] uppercase text-slate-400">
                          {FACTIONS[card.faction].name}
                          {card.secondaryFaction
                            ? ` × ${FACTIONS[card.secondaryFaction].name}`
                            : ''}{' '}
                          • {card.type}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono-num text-xs font-extrabold text-cyan-300 group-hover:text-rose-300">
                      ×{count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Save Footer */}
          <div className="pt-3 mt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" /> SAVE DECK TO PROFILE
            </button>
          </div>
        </div>
      </div>

      {/* SMART AUTO-BUILD SYNERGY OPTIMIZER MODAL */}
      {autoBuildOpen && autoBuildPreview && (
        <div
          onClick={() => setAutoBuildOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2.5 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] game-panel clip-chamfer border-fuchsia-400/70 shadow-[0_0_70px_rgba(192,132,252,0.3)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 bg-gradient-to-r from-violet-950/80 via-slate-950 to-cyan-950/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(192,132,252,0.6)]">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-extrabold text-sm sm:text-base text-white uppercase tracking-wider truncate">
                    Smart Auto-Build Synergy Optimizer
                  </h3>
                  <p className="text-[11px] text-slate-300/90">
                    Merakit kombinasi Monster, Spell, Trap, Fusion &amp; Maximum terbaik dari kartu milikmu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoBuildOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Step 1: Mode & Strategy Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Build Mode */}
                <div className="md:col-span-5 rounded-xl bg-slate-950/85 border border-slate-800 p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Mode Penyusunan
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.uiClick();
                        setAutoFillMode(false);
                      }}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                        !autoFillMode
                          ? 'bg-fuchsia-950/80 border-fuchsia-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-extrabold">Build Baru</div>
                      <div className="text-[9.5px] opacity-80">30+5 optimal penuh</div>
                    </button>
                    <button
                      type="button"
                      disabled={!canSmartFillCurrent}
                      onClick={() => {
                        soundEngine.uiClick();
                        setAutoFillMode(true);
                      }}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        autoFillMode && canSmartFillCurrent
                          ? 'bg-cyan-950/80 border-cyan-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-extrabold">Smart Auto-Fill</div>
                      <div className="text-[9.5px] opacity-80">
                        {canSmartFillCurrent
                          ? `Kunci ${mainDeck.length} Main + ${riftDeck.length} Rift`
                          : 'Deck sudah penuh/kosong'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Focus Faction */}
                <div className="md:col-span-7 rounded-xl bg-slate-950/85 border border-slate-800 p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Fokus Faksi (Opsional)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.uiClick();
                        setAutoFocusFaction('auto');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                        autoFocusFaction === 'auto'
                          ? 'bg-amber-400 text-slate-950 border-amber-200'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      Auto Terbaik
                    </button>
                    {FACTION_LIST.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          soundEngine.uiClick();
                          setAutoFocusFaction(f);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          autoFocusFaction === f
                            ? FACTIONS[f].badgeBg
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {FACTIONS[f].name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategy Selector Pills */}
              <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Gaya Main / Strategi Deck
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {(
                    [
                      {
                        id: 'auto',
                        label: 'Auto-Best',
                        sub: 'Skor tertinggi',
                        icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" />,
                      },
                      {
                        id: 'balanced',
                        label: 'Balanced Rush',
                        sub: 'Stabil & fleksibel',
                        icon: <Zap className="w-3.5 h-3.5 text-cyan-300" />,
                      },
                      {
                        id: 'aggro',
                        label: 'Aggro Burn',
                        sub: 'Serang cepat',
                        icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
                      },
                      {
                        id: 'control',
                        label: 'Control Trap',
                        sub: 'DEF & Freeze',
                        icon: <Shield className="w-3.5 h-3.5 text-sky-300" />,
                      },
                      {
                        id: 'fusion',
                        label: 'Fusion Master',
                        sub: 'Rift Apex fokus',
                        icon: <Layers className="w-3.5 h-3.5 text-fuchsia-300" />,
                      },
                      {
                        id: 'maximum',
                        label: 'Maximum Titan',
                        sub: ownsCompleteMaxSet ? '3/3 Siap!' : 'Butuh 3 piece',
                        icon: <Crown className="w-3.5 h-3.5 text-amber-400" />,
                      },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        soundEngine.uiClick();
                        setAutoStrategy(st.id);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        autoStrategy === st.id
                          ? 'bg-gradient-to-br from-fuchsia-950/90 to-indigo-950/90 border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.28)]'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {st.icon}
                        <span className="text-[11px] font-display font-extrabold text-white truncate">
                          {st.label}
                        </span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 mt-0.5 truncate">{st.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Synergy Report Preview */}
              {!autoBuildPreview.ok ? (
                <div className="rounded-xl bg-rose-950/60 border border-rose-500/60 p-4 text-xs text-rose-100">
                  {autoBuildPreview.error}
                </div>
              ) : (
                <>
                  {/* Grade + KPI Strip */}
                  <div className="rounded-xl bg-gradient-to-br from-slate-950 via-indigo-950/45 to-slate-950 border border-indigo-400/45 p-4 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-cyan-500 p-[2px] shadow-[0_0_24px_rgba(251,191,36,0.45)] shrink-0">
                          <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center">
                            <span className="font-display font-black text-xl leading-none bg-gradient-to-b from-amber-200 to-amber-400 bg-clip-text text-transparent">
                              {autoBuildPreview.report.grade}
                            </span>
                            <span className="font-mono-num text-[9px] font-bold text-cyan-300 mt-0.5">
                              {autoBuildPreview.report.synergyScore}/100
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-display font-extrabold text-base sm:text-lg text-white">
                            {autoBuildPreview.report.suggestedName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-400/60 text-[10px] font-bold text-indigo-200">
                              {autoBuildPreview.report.strategyLabel}
                            </span>
                            {autoBuildPreview.report.primaryFactions.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                style={{ backgroundColor: `${FACTIONS[f].primaryHex}cc` }}
                              >
                                {FACTIONS[f].name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 4 Simulation Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
                          <div className="text-[9px] uppercase text-slate-400 font-bold">
                            Turn-1 Playable
                          </div>
                          <div
                            className={`font-mono-num text-sm font-extrabold ${
                              autoBuildPreview.report.simulation.playableTurn1Rate >= 88
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                            }`}
                          >
                            {autoBuildPreview.report.simulation.playableTurn1Rate}%
                          </div>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
                          <div className="text-[9px] uppercase text-slate-400 font-bold">
                            Brick Risk
                          </div>
                          <div
                            className={`font-mono-num text-sm font-extrabold ${
                              autoBuildPreview.report.simulation.brickRate <= 10
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                            }`}
                          >
                            {autoBuildPreview.report.simulation.brickRate}%
                          </div>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
                          <div className="text-[9px] uppercase text-slate-400 font-bold">
                            {autoBuildPreview.report.hasCompleteMaximumSet
                              ? 'Max 2+ Piece'
                              : 'Fusion Ready'}
                          </div>
                          <div className="font-mono-num text-sm font-extrabold text-fuchsia-300">
                            {autoBuildPreview.report.hasCompleteMaximumSet
                              ? `${autoBuildPreview.report.simulation.maximumNearRate ?? 0}%`
                              : autoBuildPreview.report.simulation.fusionReadyRate !== null
                              ? `${autoBuildPreview.report.simulation.fusionReadyRate}%`
                              : '—'}
                          </div>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
                          <div className="text-[9px] uppercase text-slate-400 font-bold">
                            Total Kartu
                          </div>
                          <div className="font-mono-num text-sm font-extrabold text-cyan-300">
                            {autoBuildPreview.mainDeck.length} + {autoBuildPreview.riftDeck.length}R
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Curve Strip */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                      {[
                        { label: '★1–4 Rush', val: autoBuildPreview.report.curve.lowMonsters, cls: 'text-cyan-300' },
                        { label: '★5–6 Trib', val: autoBuildPreview.report.curve.midMonsters, cls: 'text-amber-300' },
                        { label: '★7–8 Boss', val: autoBuildPreview.report.curve.highMonsters, cls: 'text-orange-300' },
                        {
                          label: `Spell (${autoBuildPreview.report.curve.catalysts} Cat)`,
                          val: autoBuildPreview.report.curve.spells,
                          cls: 'text-emerald-300',
                        },
                        { label: 'Ambush Trap', val: autoBuildPreview.report.curve.traps, cls: 'text-rose-300' },
                        { label: 'Relic Equip', val: autoBuildPreview.report.curve.relics, cls: 'text-violet-300' },
                      ].map((b) => (
                        <div
                          key={b.label}
                          className="rounded-lg bg-slate-900/80 border border-slate-800 py-1.5 px-1"
                        >
                          <div className={`font-mono-num text-sm font-extrabold ${b.cls}`}>
                            {b.val}
                          </div>
                          <div className="text-[9.5px] text-slate-400 truncate">{b.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Fusion Coverage + Skill Recommendation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Fusion Material Lock Check */}
                      <div className="rounded-xl bg-slate-950/85 border border-fuchsia-500/30 p-3">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-fuchsia-300 mb-2 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Verifikasi Sinergi Fusion ({autoBuildPreview.riftDeck.length}/5 Rift)
                        </div>
                        {autoBuildPreview.report.fusionCoverage.length === 0 ? (
                          <div className="text-[11px] text-slate-400">
                            Tidak ada Fusion Apex aktif (0 Catalyst atau belum ada pasangan material).
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {autoBuildPreview.report.fusionCoverage.map((fc) => (
                              <div
                                key={fc.cardId}
                                className="flex items-center justify-between gap-2 text-[11px] bg-slate-900/85 border border-slate-800 rounded-lg px-2.5 py-1.5"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-white truncate">
                                    {fc.name}{' '}
                                    <span className="text-fuchsia-300 font-mono-num">
                                      ×{fc.copies}
                                    </span>
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 truncate">
                                    {fc.recipeSummary} •{' '}
                                    {fc.materialCounts
                                      .map((m) => `${m.label}: ${m.count}`)
                                      .join(' / ')}
                                  </div>
                                </div>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                    fc.status === 'optimal'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                                      : fc.status === 'playable'
                                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60'
                                      : 'bg-amber-950 text-amber-300 border border-amber-500/60'
                                  }`}
                                >
                                  {fc.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recommended Duelist Skill + Highlights */}
                      <div className="space-y-2.5">
                        {(() => {
                          const recSkill = getSkillDef(autoBuildPreview.report.recommendedSkillId);
                          const alreadyEquipped = selectedSkillId === recSkill.id;
                          return (
                            <div className="rounded-xl bg-slate-950/85 border border-amber-400/40 p-3">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                                  Rekomendasi Duelist Skill
                                </span>
                                {alreadyEquipped ? (
                                  <span className="text-[10px] font-bold text-emerald-300">
                                    Sudah Dipakai ✓
                                  </span>
                                ) : (
                                  <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-200 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={equipRecommendedSkill}
                                      onChange={(e) => setEquipRecommendedSkill(e.target.checked)}
                                      className="accent-amber-400 cursor-pointer"
                                    />
                                    Equip otomatis
                                  </label>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={recSkill.portrait}
                                  alt={recSkill.duelistName}
                                  className="w-10 h-10 rounded-lg object-cover border border-amber-400/70 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-display font-extrabold text-white truncate">
                                    {recSkill.skillName}{' '}
                                    <span className="text-[10px] font-normal text-amber-200/90">
                                      ({recSkill.duelistName.split(',')[0]})
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                                    {autoBuildPreview.report.recommendedSkillReason}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Synergy Highlights */}
                        <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3 space-y-1.5">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                            Analisis Kombinasi
                          </div>
                          {autoBuildPreview.report.highlights.map((h, i) => (
                            <div key={i} className="text-[11px] text-slate-200 flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{h}</span>
                            </div>
                          ))}
                          {autoBuildPreview.report.warnings.map((w, i) => (
                            <div key={i} className="text-[11px] text-amber-200 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Compact Decklist Preview */}
                    <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Preview Kartu Terpilih ({autoBuildPreview.mainDeck.length} Main •{' '}
                        {autoBuildPreview.riftDeck.length} Rift)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {Array.from(
                          [...autoBuildPreview.mainDeck, ...autoBuildPreview.riftDeck].reduce(
                            (map, id) => map.set(id, (map.get(id) ?? 0) + 1),
                            new Map<string, number>()
                          )
                        ).map(([id, count]) => {
                          const c = CARD_MAP[id];
                          if (!c) return null;
                          const isRift = c.type === 'fusion_apex';
                          return (
                            <div
                              key={id}
                              className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border text-[10.5px] ${
                                isRift
                                  ? 'bg-fuchsia-950/50 border-fuchsia-500/50'
                                  : 'bg-slate-900/90 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`px-1 py-0.5 rounded font-mono-num text-[9px] font-extrabold shrink-0 ${
                                    isRift
                                      ? 'bg-fuchsia-600 text-white'
                                      : c.level > 0
                                      ? 'bg-amber-600/90 text-white'
                                      : c.type === 'ambush'
                                      ? 'bg-rose-600/90 text-white'
                                      : 'bg-emerald-600/90 text-white'
                                  }`}
                                >
                                  {isRift
                                    ? 'FUS'
                                    : c.level > 0
                                    ? `★${c.level}`
                                    : c.type === 'ambush'
                                    ? 'T'
                                    : 'S'}
                                </span>
                                <span className="text-slate-100 font-semibold truncate">
                                  {c.name}
                                </span>
                              </div>
                              <span className="font-mono-num font-extrabold text-cyan-300 shrink-0">
                                ×{count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Apply Actions */}
            <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-950/95 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAutoBuildOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!autoBuildPreview.ok}
                onClick={applyAutoBuildToCurrent}
                className="px-4 py-2 rounded-xl bg-cyan-950/90 border border-cyan-400/70 hover:bg-cyan-900 text-cyan-100 text-xs font-display font-extrabold tracking-wider disabled:opacity-40 cursor-pointer"
              >
                TERAPKAN KE EDITOR
              </button>
              <button
                type="button"
                disabled={!autoBuildPreview.ok}
                onClick={saveAutoBuildAsNewDeck}
                className="clip-skew-btn px-5 py-2 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 hover:brightness-110 text-white text-xs font-display font-extrabold tracking-wider shadow-[0_0_20px_rgba(192,132,252,0.45)] disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                SIMPAN SEBAGAI DECK BARU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-CLICK ARCHETYPE PRESETS MODAL */}
      {presetsOpen && (
        <div
          onClick={() => setPresetsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[85vh] game-panel clip-chamfer border-amber-400/60 flex flex-col overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-gradient-to-r from-amber-950/60 via-slate-950 to-indigo-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-display font-extrabold text-sm sm:text-base text-white uppercase tracking-wider">
                    1-Click Archetype Deck Presets
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Instantly creates a custom deck from cards you own — swap or craft any missing copies!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPresetsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {presetTemplates.map((tpl) => {
                const sub = buildOwnedSubset(tpl.mainDeck, tpl.riftDeck);
                const f = FACTIONS[tpl.faction];
                const isComplete = sub.missingMain === 0 && sub.missingRift === 0;

                return (
                  <div
                    key={tpl.id}
                    className="rounded-xl bg-slate-950/85 border border-slate-800 hover:border-amber-400/60 p-4 flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-extrabold text-sm text-white">
                          {tpl.name}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white"
                          style={{ backgroundColor: `${f.primaryHex}cc` }}
                        >
                          {f.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-cyan-300 font-semibold mt-0.5">
                        {tpl.title}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <span
                        className={`font-mono-num text-[11px] font-bold ${
                          isComplete ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        Owned: {sub.nextMain.length}/30 Main • {sub.nextRift.length}/{tpl.riftDeck.length} Rift
                      </span>
                      <button
                        type="button"
                        onClick={() => applyTemplate(tpl.name, tpl.mainDeck, tpl.riftDeck)}
                        className="clip-skew-btn px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-display font-bold text-xs tracking-wider hover:brightness-110 cursor-pointer"
                      >
                        LOAD PRESET
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EXPORT / IMPORT DECK CODE MODAL */}
      {codeModalOpen && (
        <div
          onClick={() => setCodeModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg game-panel clip-chamfer border-cyan-400/60 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-gradient-to-r from-cyan-950/60 via-slate-950 to-indigo-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-300" />
                <div>
                  <h3 className="font-display font-extrabold text-sm sm:text-base text-white uppercase tracking-wider">
                    Deck Code Export &amp; Import
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Share your deck build or import a code (<code className="text-cyan-300">ABRD:...</code>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-display font-bold uppercase tracking-wider text-cyan-300">
                  Export Current Deck ({deckName})
                </div>
                <textarea
                  readOnly
                  rows={3}
                  value={currentDeckCode}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 font-mono-num text-[11px] text-cyan-200 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleCopyDeckCode}
                  className="w-full clip-skew-btn py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-display font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? 'DECK CODE COPIED!' : 'COPY DECK CODE'}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-xs font-display font-bold uppercase tracking-wider text-amber-300">
                  Import Deck Code
                </div>
                <textarea
                  rows={3}
                  value={importCodeText}
                  onChange={(e) => setImportCodeText(e.target.value)}
                  placeholder="Paste ABRD:... deck code here"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 font-mono-num text-[11px] text-slate-200 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={!importCodeText.trim()}
                  onClick={handleImportDeckCode}
                  className="w-full clip-skew-btn py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-display font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 disabled:opacity-40 cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> IMPORT AS NEW DECK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
