import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Hand, ShieldAlert, Zap } from 'lucide-react';
import type { PendingTrapPrompt } from '../store/duelStore';
import { CARD_MAP } from '../data/cards';
import { Card } from './Card';

interface TrapPromptModalProps {
  prompt: PendingTrapPrompt | null;
  onResolve: (activate: boolean) => void;
}

export const TrapPromptModal: React.FC<TrapPromptModalProps> = ({ prompt, onResolve }) => {
  if (!prompt) return null;

  const trapDef = CARD_MAP[prompt.trapCardId];
  const rivalDef = prompt.rivalCardId ? CARD_MAP[prompt.rivalCardId] : null;
  if (!trapDef) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-2xl game-panel clip-chamfer border-2 border-fuchsia-400/85 shadow-[0_0_80px_rgba(217,70,239,0.5)] overflow-hidden my-auto"
        >
          {/* Dramatic Trap Alert Header */}
          <div className="relative px-4 sm:px-6 py-3.5 bg-gradient-to-r from-fuchsia-950 via-purple-900/90 to-rose-950 border-b border-fuchsia-400/60 text-center">
            <div className="inline-flex items-center gap-1.5 clip-skew-btn px-3 py-0.5 bg-fuchsia-500/25 border border-fuchsia-300/70 text-[10px] font-display font-extrabold tracking-[0.26em] text-fuchsia-200 uppercase mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              Chain Response Window
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black italic tracking-wider bg-gradient-to-r from-fuchsia-200 via-white to-amber-200 bg-clip-text text-transparent">
              ACTIVATE TRAP CARD?
            </h2>
          </div>

          {/* Trigger Context */}
          <div className="px-4 sm:px-6 pt-4 pb-2 text-center">
            <div className="inline-block clip-chamfer-sm px-3.5 py-1.5 bg-rose-950/75 border border-rose-400/60 text-xs sm:text-sm font-bold text-rose-100">
              {prompt.headline}
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300">{prompt.detail}</p>
          </div>

          {/* Card Matchup Showcase */}
          <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {rivalDef && (
              <>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9.5px] font-display font-bold uppercase tracking-widest text-rose-300">
                    Rival Trigger
                  </span>
                  <Card card={rivalDef} size="sm" />
                </div>
                <ArrowRight className="w-6 h-6 text-fuchsia-300 rotate-90 sm:rotate-0 shrink-0 animate-pulse" />
              </>
            )}

            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9.5px] font-display font-bold uppercase tracking-widest text-fuchsia-300">
                Your Set Ambush Trap
              </span>
              <div className="relative">
                <div className="pointer-events-none absolute -inset-2 rounded-xl bg-fuchsia-500/25 blur-md animate-pulse" />
                <div className="relative">
                  <Card card={trapDef} size="md" playableGlow />
                </div>
              </div>
            </div>
          </div>

          {/* Trap Effect Summary Box */}
          <div className="mx-4 sm:mx-6 mb-4 clip-chamfer-sm bg-slate-950/90 border border-fuchsia-500/40 px-3.5 py-2.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
              {trapDef.name} Effect
            </div>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{trapDef.effectText}</p>
          </div>

          {/* Decision Buttons */}
          <div className="px-4 sm:px-6 pb-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onResolve(true)}
              className="w-full sm:w-auto relative overflow-hidden shine-sweep clip-skew-btn px-7 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-amber-500 border-2 border-amber-200 text-white font-display font-extrabold text-xs sm:text-sm tracking-wider shadow-[0_0_28px_rgba(217,70,239,0.75)] hover:scale-[1.03] active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-amber-200 text-amber-100" />
              ACTIVATE TRAP!
            </button>

            <button
              type="button"
              onClick={() => onResolve(false)}
              className="w-full sm:w-auto clip-skew-btn px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-500/80 text-slate-200 font-display font-bold text-xs sm:text-sm tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Hand className="w-4 h-4 text-cyan-300" />
              HOLD (SAVE FOR LATER)
            </button>
          </div>

          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/90 text-center text-[10px] text-slate-400">
            Hold keeps your face-down Trap armed for a bigger threat. Switch{' '}
            <strong className="text-fuchsia-300">TRAP: MANUAL / AUTO</strong> anytime from the top
            bar.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
