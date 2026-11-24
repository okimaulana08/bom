import React from 'react';
import { Eye, Flame, Layers, Shield, Sparkles, Swords } from 'lucide-react';
import type { CardDef, DuelState } from '../engine/types';
import { CARD_MAP } from '../data/cards';
import { canContactFuse } from '../engine/rules';
import { getActiveUnits, getRequiredTributes } from '../engine/utils';
import { Card } from './Card';

interface HandTrayProps {
  duel: DuelState;
  selectedHandId: string | null;
  onSelectCard: (instanceId: string) => void;
  onSummonMonster: (instanceId: string, mode: 'attack' | 'defense') => void;
  onSoulBurn: (instanceId: string) => void;
  onOpenRiftDeck: () => void;
  onOpenVoid: () => void;
  onHoverCard: (card: CardDef, isEvolved: boolean) => void;
}

export const HandTray: React.FC<HandTrayProps> = ({
  duel,
  selectedHandId,
  onSelectCard,
  onSummonMonster,
  onSoulBurn,
  onOpenRiftDeck,
  onOpenVoid,
  onHoverCard,
}) => {
  const player = duel.players.player;
  const isPlayerMain = duel.activePlayer === 'player' && duel.phase === 'main' && !duel.winner;
  const myBoardCount = getActiveUnits(duel, 'player').length;

  const anyFusionReady = player.riftDeck.some((fid) =>
    canContactFuse(duel, 'player', fid, CARD_MAP)
  );

  const count = player.hand.length;

  return (
    <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-2 px-1 sm:px-3 pt-1 pb-2">
      {/* MOBILE COMPACT UTILITY STRIP */}
      <div className="flex md:hidden items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={onOpenRiftDeck}
          className={`flex items-center gap-2 clip-chamfer-sm px-3 py-1.5 border text-xs font-display font-extrabold cursor-pointer ${
            anyFusionReady
              ? 'bg-gradient-to-r from-fuchsia-700 to-indigo-700 border-fuchsia-300 text-white shadow-[0_0_18px_rgba(217,70,239,0.75)] animate-pulse'
              : 'game-panel border-indigo-400/50 text-fuchsia-200'
          }`}
        >
          <Layers className="w-4 h-4 text-fuchsia-300" />
          <span>RIFT DECK ({player.riftDeck.length})</span>
          {anyFusionReady && (
            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-extrabold">
              FUSE!
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-mono-num">
          <div className="game-panel clip-chamfer-sm px-2.5 py-1 border-cyan-500/40 text-cyan-200">
            DECK <strong className="text-white">{player.deck.length}</strong>
          </div>
          <button
            type="button"
            onClick={onOpenVoid}
            className="game-panel clip-chamfer-sm px-2.5 py-1 border-purple-500/55 hover:border-fuchsia-400 text-purple-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            title="Open Your Void Pile (Graveyard)"
          >
            <Eye className="w-3 h-3 text-fuchsia-300" />
            VOID <strong className="text-white">{player.voidPile.length}</strong>
          </button>
        </div>
      </div>

      {/* DESKTOP LEFT: Rift Fusion Portal Orb */}
      <button
        type="button"
        onClick={onOpenRiftDeck}
        className={`hidden md:flex shrink-0 group relative flex-col items-center justify-center w-26 h-26 lg:w-28 lg:h-28 rounded-full border-2 transition-all cursor-pointer overflow-hidden ${
          anyFusionReady
            ? 'bg-gradient-to-b from-fuchsia-900/95 via-purple-950 to-indigo-950 border-fuchsia-300 shadow-[0_0_32px_rgba(217,70,239,0.85)] animate-pulse'
            : 'bg-gradient-to-b from-slate-900/95 to-indigo-950/90 border-indigo-400/50 hover:border-fuchsia-400/80 shadow-xl'
        }`}
        title="Open Rift Deck (Contact Fusion — 0 Normal Summons!)"
      >
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-35 animate-spin-slow text-fuchsia-300"
          fill="none"
        >
          <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6" />
          <polygon points="50,10 88,50 50,90 12,50" stroke="#38bdf8" strokeWidth="1.2" />
        </svg>
        <Layers
          className={`w-5 h-5 relative z-10 ${
            anyFusionReady ? 'text-fuchsia-200' : 'text-indigo-300'
          }`}
        />
        <span className="mt-0.5 relative z-10 font-display text-[10px] font-extrabold tracking-widest text-white">
          RIFT DECK
        </span>
        <span className="relative z-10 font-mono-num text-[11px] text-fuchsia-300 font-extrabold">
          {player.riftDeck.length} APEX
        </span>
        {anyFusionReady && (
          <span className="mt-0.5 relative z-10 px-2 py-0.5 rounded-full bg-fuchsia-500 text-[8px] font-extrabold text-white tracking-wider">
            FUSE!
          </span>
        )}
      </button>

      {/* CENTER: FULL-WIDTH SWIPEABLE HAND ON MOBILE + CURVED ARC FAN ON DESKTOP */}
      <div className="w-full md:flex-1 min-w-0 overflow-x-auto scrollbar-none">
        <div className="flex items-end justify-start md:justify-center gap-2 sm:gap-2.5 md:-space-x-3 md:hover:space-x-1.5 transition-all duration-200 px-4 pt-12 pb-3 w-max md:w-auto mx-auto">
          {player.hand.map((hc, idx) => {
            const def = CARD_MAP[hc.cardId];
            if (!def) return null;
            const reqTributes = getRequiredTributes(def);
            const canPlayNow =
              isPlayerMain &&
              (def.type !== 'vanguard' ||
                (player.normalSummonsLeft > 0 &&
                  (reqTributes === 0 ? myBoardCount < 3 : myBoardCount >= reqTributes)));

            const isSelected = selectedHandId === hc.instanceId;
            const hasResonate = def.keywords.includes('Resonate');

            const mid = (count - 1) / 2;
            const offset = idx - mid;
            const fanRot = isSelected ? 0 : Math.max(-8, Math.min(8, offset * 2.2));
            const fanDrop = isSelected ? 0 : Math.abs(offset) * 3;

            return (
              <div
                key={hc.instanceId}
                className={`relative shrink-0 transition-all duration-200 ${
                  isSelected
                    ? '-translate-y-4 z-40'
                    : 'hover:-translate-y-4 hover:z-40 z-10'
                }`}
              >
                <div
                  className="md:[transform:var(--fan-tf)] transition-transform duration-200 hover:!transform-none"
                  style={
                    {
                      '--fan-tf': isSelected
                        ? 'none'
                        : `translateY(${fanDrop}px) rotate(${fanRot}deg)`,
                    } as React.CSSProperties
                  }
                >
                  <Card
                    card={def}
                    size="sm"
                    selected={isSelected}
                    playableGlow={canPlayNow}
                    onClick={() => onSelectCard(hc.instanceId)}
                    onHover={onHoverCard}
                  />
                </div>

                {/* FLOATING YU-GI-OH! ACTION PILLS ABOVE SELECTED CARD */}
                {isSelected && isPlayerMain && (
                  <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 whitespace-nowrap">
                    {def.type === 'vanguard' && canPlayNow && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSummonMonster(hc.instanceId, 'attack');
                          }}
                          className="clip-skew-btn px-2.5 py-1 bg-gradient-to-r from-amber-500 to-rose-600 border border-amber-200 text-white font-extrabold text-[9.5px] shadow-lg flex items-center gap-0.5 hover:brightness-110 cursor-pointer"
                          title={
                            reqTributes > 0
                              ? `Tribute ${reqTributes} monster(s) to Summon in Attack Position`
                              : 'Normal Summon in Attack Position'
                          }
                        >
                          <Swords className="w-3 h-3" />
                          {reqTributes > 0 ? `TRIB(${reqTributes})` : 'SUMMON'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSummonMonster(hc.instanceId, 'defense');
                          }}
                          className="clip-skew-btn px-2 py-1 bg-gradient-to-r from-cyan-600 to-indigo-700 border border-cyan-200 text-white font-extrabold text-[9.5px] shadow-lg flex items-center gap-0.5 hover:brightness-110 cursor-pointer"
                          title="Set Face-Down in Defense Position"
                        >
                          <Shield className="w-3 h-3" /> SET
                        </button>
                      </>
                    )}

                    {!player.soulBurnUsedThisTurn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSoulBurn(hc.instanceId);
                        }}
                        className="clip-skew-btn px-2 py-1 bg-gradient-to-r from-orange-600 to-amber-400 border border-amber-100 text-slate-950 font-extrabold text-[9.5px] shadow-lg flex items-center gap-0.5 hover:brightness-110 cursor-pointer"
                        title="Soul Burn (1/Turn): Discard into Void → Draw 1 fresh card + trigger Resonate!"
                      >
                        <Flame className="w-3 h-3" />
                        CYCLE +1
                        {hasResonate && <Sparkles className="w-2.5 h-2.5" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {player.hand.length === 0 && (
            <div className="py-10 px-6 text-xs text-slate-500 italic">No cards in hand</div>
          )}
        </div>
      </div>

      {/* DESKTOP RIGHT: Deck & Void Stacks */}
      <div className="hidden md:flex shrink-0 flex-col gap-1.5 w-24 text-center">
        <div className="game-panel clip-chamfer-sm px-2.5 py-2 border-cyan-500/45">
          <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-300/80">
            Deck
          </div>
          <div className="font-mono-num text-lg font-extrabold text-white leading-tight">
            {player.deck.length}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenVoid}
          className="game-panel clip-chamfer-sm px-2.5 py-1.5 border-purple-500/55 hover:border-fuchsia-400 hover:bg-purple-950/60 transition-colors cursor-pointer group"
          title="View Your Void Pile (Graveyard)"
        >
          <div className="text-[9px] font-bold uppercase tracking-widest text-purple-300/90 group-hover:text-fuchsia-200 flex items-center justify-center gap-1">
            <Eye className="w-2.5 h-2.5" /> Void
          </div>
          <div className="font-mono-num text-base font-extrabold text-purple-100 leading-tight">
            {player.voidPile.length}
          </div>
        </button>
      </div>
    </div>
  );
};
