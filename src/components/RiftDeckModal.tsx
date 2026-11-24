import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Layers, Sparkles, X } from 'lucide-react';
import type { DuelState, MaterialChoice } from '../engine/types';
import { CARD_MAP } from '../data/cards';
import { getCardArtPresentation } from '../data/cardArtStyle';
import {
  collectCandidateMaterials,
  findValidFusionCombos,
  validateFusionMaterials,
} from '../engine/utils';
import { Card } from './Card';

interface RiftDeckModalProps {
  duel: DuelState;
  mode: 'contact' | 'catalyst';
  catalystHandId?: string;
  onClose: () => void;
  onConfirmContact: (fusionCardId: string, materials: MaterialChoice[]) => void;
  onConfirmCatalyst: (
    catalystHandId: string,
    fusionCardId: string,
    materials: MaterialChoice[]
  ) => void;
}

export const RiftDeckModal: React.FC<RiftDeckModalProps> = ({
  duel,
  mode,
  catalystHandId,
  onClose,
  onConfirmContact,
  onConfirmCatalyst,
}) => {
  const player = duel.players.player;
  const allowHand = mode === 'catalyst';

  const uniqueRiftCards = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of player.riftDeck) {
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return Array.from(map.entries());
  }, [player.riftDeck]);

  const [selectedFusionId, setSelectedFusionId] = useState<string | null>(
    uniqueRiftCards[0]?.[0] ?? null
  );
  const [chosenMaterials, setChosenMaterials] = useState<MaterialChoice[]>([]);

  const selectedDef = selectedFusionId ? CARD_MAP[selectedFusionId] : null;

  const candidates = useMemo(() => {
    return collectCandidateMaterials(duel, 'player', allowHand, CARD_MAP).filter(
      (c) => c.instanceId !== catalystHandId
    );
  }, [duel, allowHand, catalystHandId]);

  const validCombosForSelected = useMemo(() => {
    if (!selectedFusionId) return [];
    return findValidFusionCombos(duel, 'player', selectedFusionId, allowHand, CARD_MAP).filter(
      (combo) => !combo.some((m) => m.instanceId === catalystHandId)
    );
  }, [duel, selectedFusionId, allowHand, catalystHandId]);

  const isCurrentSelectionValid = useMemo(() => {
    if (!selectedDef) return false;
    if (duel.activePlayer !== 'player' || duel.phase !== 'main') return false;
    const freesField = chosenMaterials.some((m) => m.source === 'field');
    const hasOpenSlot = player.vanguard.some((v) => v === null);
    if (!freesField && !hasOpenSlot) return false;
    return validateFusionMaterials(selectedDef, chosenMaterials, CARD_MAP);
  }, [selectedDef, player.vanguard, duel.activePlayer, duel.phase, chosenMaterials]);

  const toggleMaterial = (mat: MaterialChoice) => {
    const exists = chosenMaterials.some((m) => m.instanceId === mat.instanceId);
    if (exists) {
      setChosenMaterials((prev) => prev.filter((m) => m.instanceId !== mat.instanceId));
    } else {
      const need = selectedDef?.fusionRecipe?.materials.length ?? 2;
      setChosenMaterials((prev) =>
        prev.length >= need ? [...prev.slice(1), mat] : [...prev, mat]
      );
    }
  };

  const autoPickFirstValid = () => {
    if (validCombosForSelected[0]) {
      setChosenMaterials(validCombosForSelected[0]);
    }
  };

  const handleSummon = () => {
    if (!selectedFusionId || !isCurrentSelectionValid) return;
    if (mode === 'contact') {
      onConfirmContact(selectedFusionId, chosenMaterials);
    } else if (catalystHandId) {
      onConfirmCatalyst(catalystHandId, selectedFusionId, chosenMaterials);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto game-panel clip-chamfer border-fuchsia-500/50 shadow-[0_0_60px_rgba(192,38,211,0.3)] p-5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-fuchsia-300 font-display text-xl font-bold">
              <Layers className="w-5 h-5" />
              {mode === 'catalyst'
                ? 'FUSION SPELL — RIFT POLYMERIZATION'
                : 'RIFT DECK — CONTACT FUSION'}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'catalyst'
                ? 'Special Summon a Fusion Apex by sending matching materials from Hand and/or Field to the Void!'
                : 'Contact Fusion: Tribute matching monsters on your Field to Special Summon (uses 0 Normal Summons)!'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {uniqueRiftCards.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            No Fusion Apex monsters remaining in your Rift Deck.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
            <div className="lg:col-span-7">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Available Fusion Apex Monsters ({player.riftDeck.length})
              </div>
              <div className="flex flex-wrap gap-3">
                {uniqueRiftCards.map(([cid, count]) => {
                  const def = CARD_MAP[cid];
                  if (!def) return null;
                  const combos = findValidFusionCombos(
                    duel,
                    'player',
                    cid,
                    allowHand,
                    CARD_MAP
                  ).filter((c) => !c.some((m) => m.instanceId === catalystHandId));
                  const ready =
                    combos.length > 0 && duel.activePlayer === 'player' && duel.phase === 'main';

                  return (
                    <div key={cid} className="relative">
                      <Card
                        card={def}
                        size="md"
                        selected={selectedFusionId === cid}
                        playableGlow={ready}
                        onClick={() => {
                          setSelectedFusionId(cid);
                          setChosenMaterials([]);
                        }}
                      />
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-slate-950 border border-fuchsia-400/70 text-[10px] font-bold text-fuchsia-200">
                        ×{count}
                      </div>
                      {ready && (
                        <div className="mt-1 text-center text-[10px] font-bold text-emerald-300 tracking-wide">
                          READY TO FUSE
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between rounded-xl bg-slate-950/80 border border-slate-800 p-4">
              {selectedDef ? (
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold text-white">
                        {selectedDef.name}
                      </h3>
                      <span className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-fuchsia-950 border border-fuchsia-500/50 text-fuchsia-200 font-bold">
                        SPECIAL SUMMON
                      </span>
                    </div>

                    <div className="mt-2 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs">
                      <span className="text-indigo-300 font-semibold">Materials: </span>
                      <span className="text-slate-100">{selectedDef.fusionRecipe?.summary}</span>
                    </div>

                    <div className="flex items-center justify-between mt-4 mb-2">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        Select Materials ({chosenMaterials.length}/
                        {selectedDef.fusionRecipe?.materials.length ?? 2})
                      </span>
                      {validCombosForSelected.length > 0 && (
                        <button
                          type="button"
                          onClick={autoPickFirstValid}
                          className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" /> Auto-Select
                        </button>
                      )}
                    </div>

                    {candidates.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-800 rounded-lg">
                        No eligible Vanguards available{' '}
                        {allowHand ? 'in Hand or on Field' : 'on your Field'}.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {candidates.map((mat) => {
                          const mDef = CARD_MAP[mat.cardId];
                          const isPicked = chosenMaterials.some(
                            (m) => m.instanceId === mat.instanceId
                          );
                          return (
                            <button
                              key={mat.instanceId}
                              type="button"
                              onClick={() => toggleMaterial(mat)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                isPicked
                                  ? 'bg-fuchsia-950/70 border-fuchsia-400 text-white'
                                  : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={getCardArtPresentation(mDef).src}
                                  alt={mDef.name}
                                  className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">{mDef.name}</div>
                                  <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                                    <span>{mDef.faction.replace('_', '-')}</span>
                                    <span>•</span>
                                    <span
                                      className={
                                        mat.source === 'field'
                                          ? 'text-amber-300'
                                          : 'text-cyan-300'
                                      }
                                    >
                                      {mat.source === 'field' ? 'On Field' : 'In Hand'}
                                    </span>
                                    {mDef.keywords.includes('Resonate') && (
                                      <span className="text-indigo-300 font-semibold">
                                        ★ Resonate
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isPicked && (
                                <CheckCircle2 className="w-4 h-4 text-fuchsia-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={!isCurrentSelectionValid}
                      onClick={handleSummon}
                      className={`w-full py-2.5 clip-skew-btn font-display font-bold tracking-wider text-sm transition-all flex items-center justify-center gap-2 ${
                        isCurrentSelectionValid
                          ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-[0_0_25px_rgba(217,70,239,0.55)] hover:brightness-110 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      FUSION SUMMON!
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
