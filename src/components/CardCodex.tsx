import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Layers,
  Lock,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type { CardDef, CardSetId, CardType, Faction, Rarity } from '../engine/types';
import { CARDS, RARITY_CRAFT_COST, RARITY_DISMANTLE_DUST } from '../data/cards';
import { FACTIONS, FACTION_LIST } from '../data/factions';
import { KEYWORDS } from '../data/keywords';
import { ROYAL_FOIL_CRAFT_COST, useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';
import { haptics } from '../utils/haptics';
import { Card } from './Card';
import { RollingNumber } from './RollingNumber';

const CODEX_SET_OPTIONS: { id: CardSetId | 'all'; label: string; short: string }[] = [
  { id: 'all', label: `All Sets (${CARDS.length} Cards)`, short: `All Sets (${CARDS.length})` },
  { id: 'genesis', label: 'Set 1: Genesis Rift (48)', short: 'Set 1: Genesis' },
  { id: 'overdrive', label: 'Set 2A: Dragonic Overdrive (9)', short: 'Set 2A: Overdrive' },
  { id: 'phantom', label: 'Set 2B: Cyber Phantom (9)', short: 'Set 2B: Phantom' },
  { id: 'arcana_vault', label: 'Set 3: Arcana & Ambush Vault (10)', short: 'Set 3: Arcana' },
  { id: 'maximum', label: 'Set 4: Maximum Overlord (3)', short: 'Set 4: Maximum' },
  { id: 'egyptian_gods', label: 'Set 5: Pantheon of the Nile (12)', short: 'Set 5: Nile Gods' },
  { id: 'yggdrasil_overlord', label: 'Set 6: Yggdrasil Sky Overlord (12)', short: 'Set 6: Yggdrasil' },
  { id: 'legendary_dragons', label: 'Set 7: Legendary Dragons (12)', short: 'Set 7: Dragons' },
  { id: 'sevens_magicians', label: 'Set 8: Sevens Arcane Magicians (12)', short: 'Set 8: Magicians' },
  { id: 'supreme_mecha', label: 'Set 9: Supreme Mecha Armada (12)', short: 'Set 9: Mecha' },
];

interface CardCodexProps {
  onBack: () => void;
}

export const CardCodex: React.FC<CardCodexProps> = ({ onBack }) => {
  const { collection, dust, hasChampionBadge, royalFoils, craftCard, craftRoyalFoil, dismantleCard } =
    useProfileStore();

  const [search, setSearch] = useState('');
  const [setFilter, setSetFilter] = useState<CardSetId | 'all'>('all');
  const [faction, setFaction] = useState<Faction | 'all'>('all');
  const [type, setType] = useState<CardType | 'all'>('all');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [onlyEvolve, setOnlyEvolve] = useState(false);
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [inspecting, setInspecting] = useState<CardDef | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const uniqueOwnedCount = useMemo(
    () => CARDS.filter((c) => (collection[c.id] ?? 0) > 0).length,
    [collection]
  );

  const filtered = useMemo(() => {
    return CARDS.filter((c) => {
      const cardSet: CardSetId = c.setId ?? 'genesis';
      if (setFilter !== 'all' && cardSet !== setFilter) return false;
      if (faction !== 'all' && c.faction !== faction && c.secondaryFaction !== faction)
        return false;
      if (type !== 'all' && c.type !== type) return false;
      if (rarity !== 'all' && c.rarity !== rarity) return false;
      if (onlyEvolve && !c.evolvedData) return false;
      if (
        search.trim() &&
        !`${c.name} ${c.effectText} ${c.lore} ${c.evolvedData?.name ?? ''}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [setFilter, faction, type, rarity, onlyEvolve, search]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2400);
  };

  const handleCraft = (card: CardDef) => {
    const res = craftCard(card.id);
    if (!res.ok) {
      showNotice(res.error ?? 'Cannot craft card.');
      return;
    }
    soundEngine.evolve();
    showNotice(`Crafted 1× ${card.name}!`);
  };

  const handleDismantle = (card: CardDef) => {
    const res = dismantleCard(card.id);
    if (!res.ok) {
      showNotice(res.error ?? 'Cannot dismantle.');
      return;
    }
    soundEngine.soulBurn();
    showNotice(`Dismantled 1× ${card.name} for +${res.dustGained} Aether Dust!`);
  };

  return (
    <div className="min-h-screen w-full bg-[#060812] text-slate-100 p-4 sm:p-6 flex flex-col">
      {/* Header */}
      <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
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
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-cyan-300 via-purple-300 to-amber-300 bg-clip-text text-transparent">
              Aetherbound Card Codex
            </h1>
            <p className="text-xs text-slate-400">
              Inspect 3D holographic cards, preview Awakened Evolutions, and craft missing cards with Aether Dust.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs">
            <span className="text-slate-400">Collection: </span>
            <strong className="text-cyan-300 font-mono-num">
              {uniqueOwnedCount}/{CARDS.length}
            </strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-fuchsia-950/60 border border-fuchsia-400/50 flex items-center gap-2 text-xs">
            <Wand2 className="w-4 h-4 text-fuchsia-300" />
            <RollingNumber value={dust} className="font-mono-num font-extrabold text-fuchsia-200" />
            <span className="text-fuchsia-300/80">Dust</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl w-full mx-auto py-4 flex flex-wrap items-center gap-2 border-b border-slate-800/80">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards or evolutions..."
            className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-white focus:border-cyan-400 outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setFaction('all')}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
            faction === 'all'
              ? 'bg-slate-200 text-slate-950 border-white'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
        >
          All
        </button>
        {FACTION_LIST.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFaction(f)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
              faction === f
                ? FACTIONS[f].badgeBg
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {FACTIONS[f].name}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            soundEngine.uiClick();
            haptics.tap();
            setSetPickerOpen(true);
          }}
          className="rounded-lg bg-slate-900 hover:bg-amber-950/50 border border-amber-400/55 px-2.5 py-1.5 text-xs font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>
            {CODEX_SET_OPTIONS.find((o) => o.id === setFilter)?.short ?? `All Sets (${CARDS.length})`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-amber-300/80 shrink-0" />
        </button>

        {/* Type Filter Pills */}
        <div className="inline-flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'all', label: 'All Types' },
              { id: 'vanguard', label: 'Monster' },
              { id: 'fusion_apex', label: 'Fusion' },
              { id: 'arcana', label: 'Spell' },
              { id: 'ambush', label: 'Trap' },
              { id: 'relic', label: 'Equip' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                haptics.tap();
                setType(t.id as CardType | 'all');
              }}
              className={`px-2 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                type === t.id
                  ? 'bg-cyan-950/85 border-cyan-400 text-cyan-100'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Rarity Filter Pills */}
        <div className="inline-flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'all', label: 'All Rarity', activeClass: 'bg-slate-200 text-slate-950 border-white' },
              { id: 'common', label: 'Common', activeClass: 'bg-slate-700 text-white border-slate-400' },
              { id: 'rare', label: 'Rare', activeClass: 'bg-sky-950 text-sky-200 border-sky-400' },
              { id: 'epic', label: 'Epic', activeClass: 'bg-purple-950 text-purple-200 border-purple-400' },
              { id: 'mythic', label: 'Mythic', activeClass: 'bg-amber-950 text-amber-200 border-amber-400' },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                haptics.tap();
                setRarity(r.id as Rarity | 'all');
              }}
              className={`px-2 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                rarity === r.id
                  ? r.activeClass
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setOnlyEvolve((v) => !v);
          }}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${
            onlyEvolve
              ? 'bg-amber-950/80 border-amber-400 text-amber-200'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Evolvable
        </button>
      </div>

      {/* CUSTOM SET PICKER DRAWER (REPLACES RAW NATIVE <select>) */}
      {setPickerOpen && (
        <div
          onClick={() => setSetPickerOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[82dvh] game-panel rounded-t-3xl sm:rounded-none sm:clip-chamfer border-t-2 sm:border border-amber-400/70 flex flex-col overflow-hidden safe-pb"
          >
            <div className="px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-amber-950/65 to-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                  Filter by Card Expansion Set
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSetPickerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto space-y-1.5">
              {CODEX_SET_OPTIONS.map((opt) => {
                const isSelected = setFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.uiClick();
                      haptics.tap();
                      setSetFilter(opt.id);
                      setSetPickerOpen(false);
                    }}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/65 border-amber-300 text-amber-100'
                        : 'bg-slate-950/85 border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="max-w-7xl w-full mx-auto py-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
        {filtered.map((card) => {
          const owned = collection[card.id] ?? 0;
          return (
            <div key={card.id} className="flex flex-col items-center gap-2">
              <Card
                card={card}
                size="md"
                locked={owned === 0}
                onClick={() => {
                  soundEngine.uiClick();
                  setInspecting(card);
                }}
              />
              <div className="flex items-center gap-2 text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-full border font-mono-num font-bold ${
                    owned > 0
                      ? 'bg-slate-900 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  {owned}/3 Owned
                </span>
                {card.evolvedData && (
                  <span className="text-amber-300 font-bold text-[10px]">★ EVO</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full 3D Foil Inspection & Crafting Modal */}
      {inspecting && (
        <div
          onClick={() => setInspecting(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl bg-[#0a0d1c] border border-indigo-500/50 shadow-2xl p-6 relative"
          >
            <button
              type="button"
              onClick={() => setInspecting(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Large 3D Tilt Card + Base/Evolved Toggle */}
              <div className="md:col-span-5 flex flex-col items-center pb-4">
                <Card
                  key={inspecting.id}
                  card={inspecting}
                  size="lg"
                  showEvolvedToggle={Boolean(inspecting.evolvedData)}
                  interactiveTilt
                />
              </div>

              {/* Metadata, Keywords, Lore & Crafting */}
              <div className="md:col-span-7 space-y-3">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-cyan-300 font-bold">
                    {FACTIONS[inspecting.faction].name}
                    {inspecting.secondaryFaction
                      ? ` × ${FACTIONS[inspecting.secondaryFaction].name}`
                      : ''}{' '}
                    • {inspecting.rarity}
                  </div>
                  <h2 className="font-display text-2xl font-extrabold text-white">
                    {inspecting.name}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {inspecting.effectText}
                  </p>
                </div>

                {inspecting.fusionRecipe && (
                  <div className="rounded-xl bg-fuchsia-950/35 border border-fuchsia-500/45 p-3 text-xs">
                    <div className="font-bold text-fuchsia-300 flex items-center gap-1.5 text-[11px] uppercase">
                      <Layers className="w-3.5 h-3.5" /> Rift Fusion Recipe
                    </div>
                    <p className="text-white mt-1">{inspecting.fusionRecipe.summary}</p>
                  </div>
                )}

                {inspecting.evolvedData && (
                  <div className="rounded-xl bg-amber-950/35 border border-amber-500/45 p-3 text-xs">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase">
                      <Sparkles className="w-3.5 h-3.5" /> Awakened Form: {inspecting.evolvedData.name} (
                      {inspecting.evolvedData.atk} ATK / {inspecting.evolvedData.def} DEF)
                    </div>
                    <p className="text-slate-200 mt-1">{inspecting.evolvedData.effectText}</p>
                    {inspecting.evolvedData.innateCondition && (
                      <p className="text-emerald-300 mt-1 text-[11px]">
                        Innate Free Evolve: {inspecting.evolvedData.innateCondition.description}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-400 italic border-l-2 border-indigo-500/50 pl-3">
                  “{inspecting.lore}”
                </p>

                {/* Keywords */}
                {inspecting.keywords.length > 0 && (
                  <div className="space-y-1">
                    {inspecting.keywords.map((kw) => (
                      <div key={kw} className="text-[11px] text-slate-300">
                        <strong className="text-cyan-300">{kw}:</strong> {KEYWORDS[kw].shortDesc}
                      </div>
                    ))}
                  </div>
                )}

                {/* Craft / Dismantle Controls */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs">
                    Owned:{' '}
                    <strong className="font-mono-num text-white">
                      {collection[inspecting.id] ?? 0} / 3
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {inspecting.isExclusive && !hasChampionBadge ? (
                      <span className="px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Clear Campaign Ch.5 to Unlock
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={
                            (collection[inspecting.id] ?? 0) >= 3 ||
                            dust < RARITY_CRAFT_COST[inspecting.rarity]
                          }
                          onClick={() => handleCraft(inspecting)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          Craft ({RARITY_CRAFT_COST[inspecting.rarity]} Dust)
                        </button>
                        <button
                          type="button"
                          disabled={(collection[inspecting.id] ?? 0) <= 0}
                          onClick={() => handleDismantle(inspecting)}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-400 text-slate-300 hover:text-rose-200 font-bold text-xs flex items-center gap-1 disabled:opacity-35 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />+
                          {RARITY_DISMANTLE_DUST[inspecting.rarity]}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Royal Prismatic Foil Upgrade */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  {royalFoils?.[inspecting.id] ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 via-amber-400/25 to-cyan-400/20 border border-amber-300/75 text-amber-200 text-xs font-extrabold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      ✦ ROYAL PRISMATIC FOIL ACTIVE!
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        (collection[inspecting.id] ?? 0) <= 0 || dust < ROYAL_FOIL_CRAFT_COST
                      }
                      onClick={() => {
                        const res = craftRoyalFoil(inspecting.id);
                        if (!res.ok) {
                          showNotice(res.error ?? 'Cannot craft Royal Foil.');
                          return;
                        }
                        soundEngine.fusion();
                        showNotice(`✦ Upgraded ${inspecting.name} to Royal Prismatic Foil!`);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 disabled:opacity-35 cursor-pointer shadow-[0_0_16px_rgba(251,191,36,0.4)]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      ✦ Craft Royal Prismatic Foil ({ROYAL_FOIL_CRAFT_COST} Dust)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-indigo-950/95 border border-fuchsia-400 text-fuchsia-100 text-xs font-semibold shadow-2xl">
          {notice}
        </div>
      )}
    </div>
  );
};
