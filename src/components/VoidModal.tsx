import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ghost, Sparkles, X } from 'lucide-react';
import type { DuelState, PlayerId } from '../engine/types';
import { CARD_MAP } from '../data/cards';
import { Card } from './Card';

interface VoidModalProps {
  duel: DuelState;
  owner: PlayerId | null;
  onChangeOwner: (owner: PlayerId) => void;
  onClose: () => void;
  onInspectCard: (cardId: string) => void;
}

export const VoidModal: React.FC<VoidModalProps> = ({
  duel,
  owner,
  onChangeOwner,
  onClose,
  onInspectCard,
}) => {
  if (!owner) return null;

  const activePlayerState = duel.players[owner];
  const cardsNewestFirst = [...activePlayerState.voidPile].reverse();

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[85vh] game-panel clip-chamfer border-purple-400/60 shadow-[0_0_65px_rgba(168,85,247,0.32)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-purple-500/30 bg-gradient-to-r from-purple-950/70 via-slate-950/90 to-indigo-950/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 clip-diamond bg-purple-900/80 border border-purple-400/70 flex items-center justify-center">
                <Ghost className="w-4 h-4 text-purple-200" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-sm sm:text-base text-white tracking-wider uppercase">
                  Void Pile (Graveyard)
                </h3>
                <p className="text-[11px] text-purple-200/80">
                  Newest discarded / destroyed cards appear first • Click any card to inspect
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Close Void Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Owner Switcher Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/70 shrink-0">
            <button
              type="button"
              onClick={() => onChangeOwner('player')}
              className={`flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                owner === 'player'
                  ? 'text-cyan-200 bg-cyan-950/35 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Your Void ({duel.players.player.voidPile.length})
            </button>
            <button
              type="button"
              onClick={() => onChangeOwner('opponent')}
              className={`flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                owner === 'opponent'
                  ? 'text-rose-200 bg-rose-950/35 border-b-2 border-rose-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {duel.players.opponent.name.split(',')[0]}&apos;s Void (
              {duel.players.opponent.voidPile.length})
            </button>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {cardsNewestFirst.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Ghost className="w-10 h-10 text-purple-500/40 mx-auto" />
                <div className="font-display text-sm font-bold text-slate-300">
                  The Void is Empty
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Destroyed monsters, used Spells/Traps, Tributes, and Soul Burn discards rest
                  here.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-center gap-3.5 sm:gap-4">
                {cardsNewestFirst.map((cardId, idx) => {
                  const def = CARD_MAP[cardId];
                  if (!def) return null;
                  const isRevivable = def.type === 'vanguard' && def.level <= 6;
                  const hasResonate = def.keywords.includes('Resonate');

                  return (
                    <div
                      key={`${cardId}_${idx}`}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className="relative">
                        <Card
                          card={def}
                          size="sm"
                          onClick={() => onInspectCard(def.id)}
                          onHover={(c) => onInspectCard(c.id)}
                        />
                        <span className="pointer-events-none absolute -top-2 -left-2 px-1.5 py-0.5 rounded bg-slate-950/95 border border-purple-400/70 font-mono-num text-[9px] font-extrabold text-purple-200 shadow">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap justify-center max-w-[120px]">
                        {isRevivable && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/60 text-[8.5px] font-bold text-emerald-200 uppercase">
                            Revivable
                          </span>
                        )}
                        {hasResonate && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/60 text-[8.5px] font-bold text-amber-200 uppercase flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Resonate
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
