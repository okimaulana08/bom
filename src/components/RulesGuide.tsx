import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Flame,
  Layers,
  Shield,
  Sparkles,
  Star,
  Swords,
} from 'lucide-react';
import { KEYWORDS } from '../data/keywords';
import { FACTIONS, FACTION_LIST } from '../data/factions';
import { soundEngine } from '../audio/soundEngine';

interface RulesGuideProps {
  onBack: () => void;
}

export const RulesGuide: React.FC<RulesGuideProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen w-full bg-[#060812] text-slate-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              onBack();
            }}
            className="game-panel clip-chamfer-sm px-3 py-2 hover:border-cyan-400/60 text-slate-200 flex items-center gap-1.5 text-xs font-display font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> LOBBY
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Speed Duel Rules &amp; Codex Manual
            </h1>
            <p className="text-xs text-slate-400">
              4000 LP • Classic Level ★ &amp; Tribute Summoning • ATK vs DEF Battle • Rift Fusion &amp; Evolution!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="game-panel clip-chamfer-sm p-5 space-y-2">
            <h2 className="font-display text-lg font-bold text-amber-300 flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-300" /> Level ★ &amp; Summoning Rules
            </h2>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>
                <strong className="text-white">Normal Summon / Set (1/Turn):</strong> Summon a
                monster face-up in <strong>Attack Position</strong> OR Set it face-down in{' '}
                <strong>Defense Position</strong>!
              </li>
              <li>
                <strong className="text-cyan-300">Tributes:</strong> ★1–4 need <strong>0 Tributes</strong>;
                ★5–6 require <strong>1 Tribute</strong>; ★7–8 require <strong>2 Tributes</strong> from
                your field.
              </li>
              <li>
                <strong className="text-orange-300">Soul Burn (1/Turn):</strong> Discard 1 card from
                hand to the Void to gain <strong>+1 Extra Normal Summon</strong> immediately (triggers{' '}
                <strong>Resonate</strong>!).
              </li>
              <li>
                <strong className="text-emerald-300">Spells &amp; Special Summons:</strong> Arcana
                Spells, Relics, Traps, Rift Fusions, and Void Revivals cost <strong>0 mana</strong>!
              </li>
            </ul>
          </section>

          <section className="game-panel clip-chamfer-sm p-5 space-y-2">
            <h2 className="font-display text-lg font-bold text-rose-300 flex items-center gap-2">
              <Swords className="w-5 h-5" /> ATK vs ATK &amp; ATK vs DEF Battle
            </h2>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>
                <strong className="text-white">No Summoning Sickness!</strong> Newly summoned Attack
                Position monsters attack immediately (going first skips Turn 1 Battle Phase for fairness).
              </li>
              <li>
                <strong className="text-amber-300">Attack vs Attack:</strong> Lower ATK monster is
                destroyed, and the <strong>ATK difference hits its owner&apos;s LP</strong>! Ties
                destroy both.
              </li>
              <li>
                <strong className="text-cyan-300">Attack vs Defense:</strong> ATK &gt; DEF destroys
                the defender (0 LP damage unless <strong>Pierce</strong>). ATK &lt; DEF deals{' '}
                <strong>DEF - ATK Recoil Damage</strong> to the attacker&apos;s LP!
              </li>
              <li>
                <strong className="text-emerald-300">Direct Attack:</strong> When the opponent controls{' '}
                <strong>0 monsters</strong>, strike their <strong>4000 LP</strong> directly!
              </li>
            </ul>
          </section>

          <section className="game-panel-gold clip-chamfer-sm p-5 space-y-2">
            <h2 className="font-display text-lg font-bold text-amber-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Card Evolution (Awakening)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Face-up Vanguards with a golden <strong className="text-amber-200">★ Spark</strong> can
              ascend into an Awakened Form! Starting your <strong>Turn 3</strong>, spend{' '}
              <strong>1 Evo Orb</strong> (or fulfill the card&apos;s free <em>Innate Condition</em>) to
              Evolve in-place — keeping all attached <strong>Relics</strong>, boosting ATK/DEF, and
              firing dramatic <em>On Evolve</em> effects!
            </p>
          </section>

          <section className="game-panel clip-chamfer-sm border-fuchsia-500/45 p-5 space-y-2">
            <h2 className="font-display text-lg font-bold text-fuchsia-300 flex items-center gap-2">
              <Layers className="w-5 h-5" /> Rift Fusion (Extra Deck)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              House up to 5 <strong>Fusion Apex</strong> bosses in your Rift Deck and Special Summon
              them anytime during Main Phase (uses 0 Normal Summons!):
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">Contact Fusion:</strong> Open Rift Deck and tribute
                matching monsters from your <strong>Field</strong>.
              </li>
              <li>
                <strong className="text-cyan-300">Fusion Spell:</strong> Cast{' '}
                <em>Rift Polymerization</em> or <em>Aether Convergence</em> to fuse from{' '}
                <strong>Hand and/or Field</strong>!
              </li>
            </ul>
          </section>
        </div>

        <div className="game-panel clip-chamfer-sm border-purple-500/40 p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div>
            <h3 className="font-display text-sm font-bold text-purple-300 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4" /> Face-Down Traps, FLIP &amp; Domains
            </h3>
            <p className="leading-relaxed">
              Set <strong>Ambush Traps</strong> face-down in your Spell/Trap Zone; starting the next
              turn they auto-trigger on enemy Attack, Summon, Spell, or Evolution! Monsters Set
              face-down flip face-up when attacked or Flip Summoned, triggering <strong>FLIP</strong>{' '}
              effects!
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-orange-300 flex items-center gap-1.5 mb-1">
              <Flame className="w-4 h-4" /> Relics (Equip Spells) &amp; Victory
            </h3>
            <p className="leading-relaxed">
              Attach <strong>Relics</strong> to face-up monsters for huge ATK/DEF boosts and keywords
              (persists through Evolution!). Drop your rival from <strong>4000 LP to 0 LP</strong> to
              win Coins and Mythic rewards!
            </p>
          </div>
        </div>

        <div className="game-panel clip-chamfer-sm p-5">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-cyan-300" /> Keyword Glossary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(KEYWORDS).map((kw) => (
              <div
                key={kw.id}
                className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 text-xs"
              >
                <span
                  className={`inline-block px-2 py-0.5 rounded border font-bold text-[11px] mb-1.5 ${kw.colorClass}`}
                >
                  {kw.name}
                </span>
                <p className="text-slate-300 leading-snug">{kw.shortDesc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="game-panel clip-chamfer-sm p-5">
          <h2 className="font-display text-lg font-bold text-white mb-3">The 5 Rift Factions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {FACTION_LIST.map((fId) => {
              const f = FACTIONS[fId];
              return (
                <div
                  key={f.id}
                  className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 text-xs"
                >
                  <div className={`font-display font-bold text-sm ${f.textColor}`}>{f.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{f.tagline}</div>
                  <div className="text-[11px] text-slate-200 font-semibold mt-2">{f.playstyle}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
