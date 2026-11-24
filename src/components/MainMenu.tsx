import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  ChevronRight,
  Coins,
  Crown,
  Hammer,
  HardDrive,
  HelpCircle,
  Map,
  PackageOpen,
  Plus,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { CARDS, CARD_MAP } from '../data/cards';
import { CAMPAIGN_CHAPTERS } from '../data/campaign';
import { FACTIONS } from '../data/factions';
import { countClaimableMissions, getDuelistRank } from '../data/missions';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';
import { Card } from './Card';
import { MissionsModal } from './MissionsModal';
import { SaveBackupModal } from './SaveBackupModal';

export type ScreenId =
  | 'menu'
  | 'campaign'
  | 'quick_duel'
  | 'shop'
  | 'deck_builder'
  | 'codex'
  | 'rules'
  | 'duel';

interface MainMenuProps {
  onNavigate: (screen: ScreenId) => void;
}

const LOBBY_LEADERS = [
  {
    id: 'archon',
    name: 'Chrono Archon Zero',
    title: 'Sovereign of Timelines',
    faction: 'chrono' as const,
    portrait: '/assets/portraits/boss_archon_zero.jpg',
    backdrop: '/assets/cards/fusion_aether_sovereign.jpg',
    quote: 'Five factions converge inside the Rift. Forge your deck and defy destiny.',
  },
  {
    id: 'kael',
    name: 'Kael, Cinder Striker',
    title: 'Caldera Duel Champion',
    faction: 'pyroclast' as const,
    portrait: '/assets/portraits/boss_kael.jpg',
    backdrop: '/assets/cards/pyro_inferno_sovereign.jpg',
    quote: 'Chain unlimited Rush Summons, Tribute combos & Fusions to shatter 8000 LP!',
  },
  {
    id: 'vex',
    name: 'Warden Vex-09',
    title: 'Permafrost Sentinel',
    faction: 'cryo_mecha' as const,
    portrait: '/assets/portraits/boss_vex09.jpg',
    backdrop: '/assets/cards/fusion_glacial_chronolith.jpg',
    quote: 'Optimal defense achieved. Set Defense Position inflicts brutal Recoil LP damage.',
  },
  {
    id: 'nyx',
    name: 'Nyx, Void Whisper',
    title: 'Matriarch of Shadows',
    faction: 'umbra' as const,
    portrait: '/assets/portraits/boss_nyx.jpg',
    backdrop: '/assets/cards/fusion_eclipse_sovereign.jpg',
    quote: 'A single face-down Ambush can shatter even the mightiest Fusion Apex.',
  },
  {
    id: 'lyra',
    name: 'Archdruid Lyra',
    title: 'Keeper of Evo Orbs',
    faction: 'sylvan' as const,
    portrait: '/assets/portraits/boss_lyra.jpg',
    backdrop: '/assets/cards/fusion_verdant_tempest.jpg',
    quote: 'Wait for Turn 3—when Evo Orbs ignite, your Vanguards awaken with Rush!',
  },
];

const MOTES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 19 + 7) % 96}%`,
  top: `${(i * 23 + 22) % 88}%`,
  size: (i % 3) + 2,
  dur: `${5.5 + (i % 5) * 1.4}s`,
  delay: `${(i % 7) * -1.1}s`,
  color: i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#fbbf24' : '#e879f9',
}));

export const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
  const profile = useProfileStore();
  const {
    coins,
    dust,
    collection,
    completedChapters,
    hasChampionBadge,
    stats,
    soundEnabled,
    toggleSound,
  } = profile;

  const [leaderIdx, setLeaderIdx] = useState(0);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const leader = LOBBY_LEADERS[leaderIdx];
  const leaderFaction = FACTIONS[leader.faction];

  const rankInfo = useMemo(() => getDuelistRank(profile), [profile]);
  const claimableMissions = useMemo(() => countClaimableMissions(profile), [profile]);

  const uniqueOwned = useMemo(
    () => CARDS.filter((c) => (collection[c.id] ?? 0) > 0).length,
    [collection]
  );
  const collectionPct = Math.round((uniqueOwned / CARDS.length) * 100);
  const packsReady = Math.floor(coins / 100);
  const duelistLevel = 1 + stats.duelsWon + Math.floor(stats.packsOpened / 2) + completedChapters.length * 2;

  const nextChapter =
    CAMPAIGN_CHAPTERS.find((c) => !completedChapters.includes(c.id)) ??
    CAMPAIGN_CHAPTERS[CAMPAIGN_CHAPTERS.length - 1];

  const go = (target: ScreenId) => {
    soundEngine.setEnabled(soundEnabled);
    soundEngine.uiClick();
    onNavigate(target);
  };

  const leftCard = CARD_MAP['fusion_frostfire_chimera'];
  const rightCard = CARD_MAP['fusion_aether_sovereign'];

  return (
    <div className="min-h-screen lg:h-screen w-full lg:overflow-hidden overflow-x-hidden relative bg-[#04050c] text-slate-100 flex flex-col justify-between select-none">
      {/* ================= LAYER 1: FULL-BLEED ARENA SANCTUM BACKDROP ================= */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Dedicated Bespoke Rift Coliseum Sanctum Backdrop + Leader Accent Layer */}
        <img
          src="/assets/arenas/lobby_sanctum.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80 scale-[1.02]"
        />
        <motion.img
          key={leader.backdrop}
          src={leader.backdrop}
          alt=""
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.14, scale: 1.05 }}
          transition={{ duration: 0.9 }}
          className="absolute inset-0 w-full h-full object-cover blur-[4px] mix-blend-screen"
        />

        {/* Deep Dramatic Coliseum Vignette + Volumetric Light Shafts */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 68% 60% at 50% 48%, ${leaderFaction.primaryHex}28 0%, rgba(7,9,20,0.72) 55%, rgba(3,4,10,0.96) 100%)`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-56"
          style={{
            background:
              'linear-gradient(0deg, rgba(3,4,10,0.98) 0%, rgba(5,7,18,0.78) 45%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-32"
          style={{
            background: 'linear-gradient(180deg, rgba(3,4,10,0.9) 0%, transparent 100%)',
          }}
        />

        {/* Rotating Giant Rift Astrolabe Magic Circle in Center */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 600 600"
            className="w-[540px] h-[540px] sm:w-[680px] sm:h-[680px] opacity-25 animate-spin-slow"
            fill="none"
          >
            <circle cx="300" cy="300" r="275" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="16 10" />
            <circle cx="300" cy="300" r="245" stroke="#fbbf24" strokeWidth="1" />
            <polygon points="300,35 530,432 70,432" stroke="#818cf8" strokeWidth="1.2" />
            <polygon points="300,565 530,168 70,168" stroke="#e879f9" strokeWidth="1.2" />
            <circle cx="300" cy="300" r="150" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="6 8" />
          </svg>
          <svg
            viewBox="0 0 400 400"
            className="absolute w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] opacity-30 animate-spin-reverse"
            fill="none"
          >
            <circle cx="200" cy="200" r="185" stroke="#c084fc" strokeWidth="1.6" strokeDasharray="24 12" />
            <polygon points="200,20 380,200 200,380 20,200" stroke="#38bdf8" strokeWidth="1.4" />
          </svg>
        </div>

        {/* Floating Luminous Aether Motes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {MOTES.map((m) => (
            <span
              key={m.id}
              className="mote absolute rounded-full"
              style={
                {
                  left: m.left,
                  top: m.top,
                  width: `${m.size * 2}px`,
                  height: `${m.size * 2}px`,
                  backgroundColor: m.color,
                  boxShadow: `0 0 12px ${m.color}`,
                  '--mote-dur': m.dur,
                  '--mote-delay': m.delay,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* ================= LAYER 2: TOP MOBILE-GAME HUD BAR ================= */}
      <header className="relative z-20 px-3 sm:px-6 pt-3 flex flex-wrap items-center justify-between gap-2.5">
        {/* TOP-LEFT: Sculpted Duelist Profile & Rank Crest */}
        <button
          type="button"
          onClick={() => {
            soundEngine.uiClick();
            setMissionsOpen(true);
          }}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
          title="View Duelist Rank Ladder & Missions"
        >
          <div className="relative shrink-0">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 clip-hex p-[2.5px] transition-transform group-hover:scale-105"
              style={{
                background: `linear-gradient(180deg, ${rankInfo.current.accentFrom}, ${rankInfo.current.accentTo})`,
                boxShadow: `0 0 24px ${rankInfo.current.glow}`,
              }}
            >
              <img
                src={leader.portrait}
                alt="Avatar"
                className="w-full h-full clip-hex object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-slate-950 border border-amber-400 font-mono-num text-[9px] sm:text-[10px] font-extrabold text-amber-300 shadow">
              LV.{duelistLevel}
            </span>
          </div>

          <div
            className={`game-panel clip-chamfer-sm px-3 sm:px-4 py-1.5 sm:py-2 min-w-[175px] sm:min-w-[250px] border transition-colors ${rankInfo.current.borderClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {hasChampionBadge ? (
                  <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                ) : (
                  <Trophy className={`w-3.5 h-3.5 shrink-0 ${rankInfo.current.textClass}`} />
                )}
                <span
                  className={`font-display font-extrabold text-xs sm:text-sm tracking-wider truncate ${rankInfo.current.textClass}`}
                >
                  {rankInfo.current.name}
                </span>
              </div>
              <span className="font-mono-num text-[10px] font-bold text-emerald-300 shrink-0">
                {stats.duelsWon}W • {rankInfo.rp}RP
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${rankInfo.progressPct}%`,
                    background: `linear-gradient(90deg, ${rankInfo.current.accentFrom}, ${rankInfo.current.accentTo})`,
                  }}
                />
              </div>
              <span className="font-mono-num text-[9.5px] font-bold text-cyan-200 shrink-0">
                {uniqueOwned}/{CARDS.length}
              </span>
            </div>
          </div>
        </button>

        {/* CENTER GAME LOGO CREST (Desktop) */}
        <div className="hidden xl:flex flex-col items-center pointer-events-none">
          <div className="font-display text-2xl font-extrabold tracking-[0.22em] bg-gradient-to-b from-white via-cyan-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            AETHERBOUND
          </div>
          <div className="flex items-center gap-2 -mt-0.5">
            <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-amber-400/80" />
            <span className="text-[10px] font-extrabold tracking-[0.38em] text-amber-300 uppercase">
              RIFT DUEL
            </span>
            <span className="h-[1px] w-10 bg-gradient-to-l from-transparent to-amber-400/80" />
          </div>
        </div>

        {/* TOP-RIGHT: Metallic Beveled Currency Bar & Audio/Rules */}
        <div className="flex items-center gap-2">
          {/* Coins Capsule + Quick Shop + Button */}
          <button
            type="button"
            onClick={() => go('shop')}
            className="game-panel-gold clip-chamfer-sm pl-3 pr-1.5 py-1.5 flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
            title="Open Booster Pack Vault"
          >
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="font-mono-num font-extrabold text-sm text-amber-100">{coins}</span>
            <span className="w-5 h-5 rounded bg-amber-400/90 text-slate-950 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </button>

          {/* Aether Dust Capsule */}
          <button
            type="button"
            onClick={() => go('codex')}
            className="game-panel clip-chamfer-sm px-3 py-1.5 flex items-center gap-1.5 border-fuchsia-500/50 hover:brightness-110 transition-all cursor-pointer"
            title="Craft Cards with Aether Dust in Codex"
          >
            <Wand2 className="w-4 h-4 text-fuchsia-300" />
            <span className="font-mono-num font-extrabold text-sm text-fuchsia-100">{dust}</span>
          </button>

          {/* Missions & Rank Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              setMissionsOpen(true);
            }}
            className={`relative game-panel clip-chamfer-sm px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
              claimableMissions > 0
                ? 'border-amber-400 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
                : 'border-indigo-400/50 text-indigo-200 hover:border-amber-400/70'
            }`}
            title="Open Missions & Duelist Rank Ladder"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline font-display font-extrabold text-xs tracking-wider uppercase">
              Missions
            </span>
            {claimableMissions > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 text-[9px] font-extrabold text-slate-950 animate-pulse">
                {claimableMissions}
              </span>
            )}
          </button>

          {/* Save Data Backup / Restore Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.uiClick();
              setBackupOpen(true);
            }}
            className="game-panel clip-chamfer-sm p-2.5 text-slate-200 hover:text-cyan-300 cursor-pointer"
            title="Backup / Restore Save Data (.JSON)"
          >
            <HardDrive className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              toggleSound();
              soundEngine.setEnabled(!soundEnabled);
            }}
            className="game-panel clip-chamfer-sm p-2.5 text-slate-200 hover:text-cyan-300 cursor-pointer"
            title="Toggle Audio"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ================= LAYER 3: LIVE CENTERPIECE CHARACTER & FLOATING ACE CARDS ================= */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="relative flex items-center justify-center w-full max-w-5xl">
          {/* Left Floating 3D Showcase Card */}
          {leftCard && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="hidden lg:block -mr-10 -rotate-12 hover:rotate-0 hover:scale-105 transition-transform duration-300 z-10"
            >
              <Card
                card={leftCard}
                size="md"
                interactiveTilt
                onClick={() => go('codex')}
              />
            </motion.div>
          )}

          {/* Centerpiece Live-2D Boss/Leader Medallion */}
          <div className="relative flex flex-col items-center z-20">
            <motion.div
              key={leader.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              onClick={() => {
                soundEngine.uiClick();
                setLeaderIdx((i) => (i + 1) % LOBBY_LEADERS.length);
              }}
              className="relative cursor-pointer group animate-breathe"
              title="Click to switch featured Rift Leader"
            >
              {/* Outer Glowing Energy Ring */}
              <div
                className="w-56 h-56 sm:w-72 sm:h-72 rounded-full p-[4px] shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${leaderFaction.primaryHex}, #fef08a 50%, ${leaderFaction.secondaryHex})`,
                  boxShadow: `0 0 65px ${leaderFaction.primaryHex}66`,
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 relative">
                  <img
                    src={leader.portrait}
                    alt={leader.name}
                    className="w-full h-full object-cover object-top scale-105 group-hover:scale-110 transition-transform duration-500"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-20"
                    style={{
                      background:
                        'linear-gradient(0deg, rgba(4,5,14,0.92) 0%, transparent 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Floating Title Ribbon Beneath Portrait */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap clip-skew-btn px-5 py-1.5 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-amber-400/75 shadow-2xl text-center">
                <div className="font-display font-extrabold text-xs sm:text-sm tracking-wider text-amber-200">
                  {leader.name}
                </div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                  {leader.title}
                </div>
              </div>
            </motion.div>

            {/* Voice Quote Subtitle + Leader Switch Dots */}
            <div className="mt-7 max-w-md text-center px-4">
              <p className="text-xs sm:text-sm text-slate-200/95 italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                “{leader.quote}”
              </p>
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                {LOBBY_LEADERS.map((l, idx) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      soundEngine.uiClick();
                      setLeaderIdx(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === leaderIdx
                        ? 'w-7 bg-amber-300 shadow-[0_0_10px_#fbbf24]'
                        : 'w-2 bg-slate-600 hover:bg-slate-400'
                    }`}
                    title={l.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Floating 3D Showcase Card */}
          {rightCard && (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="hidden lg:block -ml-10 rotate-12 hover:rotate-0 hover:scale-105 transition-transform duration-300 z-10"
            >
              <Card
                card={rightCard}
                size="md"
                interactiveTilt
                onClick={() => go('codex')}
              />
            </motion.div>
          )}
        </div>
      </main>

      {/* ================= LAYER 4: BOTTOM MOBILE TCG DOCK & BATTLE LAUNCHERS ================= */}
      <footer className="relative z-20 px-3 sm:px-6 pb-4 pt-2 flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-3">
        {/* BOTTOM-LEFT: Mobile Game Icon Dock */}
        <nav className="grid grid-cols-4 sm:flex sm:items-end gap-1.5 sm:gap-2.5">
          {[
            {
              id: 'deck_builder' as ScreenId,
              label: 'DECKS',
              sub: 'Forge 30+5',
              icon: <Hammer className="w-5 h-5 text-emerald-300" />,
              border: 'border-emerald-400/50 hover:border-emerald-300',
            },
            {
              id: 'codex' as ScreenId,
              label: 'CODEX',
              sub: `${collectionPct}% Owned`,
              icon: <BookOpen className="w-5 h-5 text-cyan-300" />,
              border: 'border-cyan-400/50 hover:border-cyan-300',
            },
            {
              id: 'shop' as ScreenId,
              label: 'SHOP',
              sub: 'Packs',
              icon: <PackageOpen className="w-5 h-5 text-amber-300" />,
              border: 'border-amber-400/60 hover:border-amber-300',
              badge: packsReady > 0 ? `${packsReady}` : undefined,
            },
            {
              id: 'rules' as ScreenId,
              label: 'GUIDE',
              sub: 'Rules',
              icon: <HelpCircle className="w-5 h-5 text-indigo-300" />,
              border: 'border-indigo-400/50 hover:border-indigo-300',
            },
          ].map((btn) => (
            <motion.button
              key={btn.id}
              type="button"
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => go(btn.id)}
              className={`relative game-panel clip-chamfer-sm px-2 sm:px-4 py-2.5 sm:min-w-[108px] flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${btn.border}`}
            >
              {btn.badge && (
                <span className="absolute -top-2 right-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-rose-500 to-amber-500 text-[8.5px] sm:text-[9px] font-extrabold text-white tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.85)] animate-pulse">
                  {btn.badge} PACKS
                </span>
              )}
              {btn.icon}
              <span className="font-display font-extrabold text-[10.5px] sm:text-xs tracking-wider text-white">
                {btn.label}
              </span>
              <span className="text-[8.5px] sm:text-[9px] text-slate-400 leading-none truncate max-w-full">
                {btn.sub}
              </span>
            </motion.button>
          ))}
        </nav>

        {/* BOTTOM-RIGHT: Hero Story Campaign Banner + Giant Glowing BATTLE Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
          {/* STORY CAMPAIGN BANNER with Next Boss Portrait */}
          <motion.button
            type="button"
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => go('campaign')}
            className="game-panel clip-chamfer px-3.5 py-2.5 border-indigo-400/65 hover:border-cyan-300 flex items-center gap-3 text-left cursor-pointer min-w-[250px]"
          >
            <img
              src={nextChapter.portrait}
              alt={nextChapter.bossName}
              className="w-12 h-12 rounded-lg object-cover border-2 border-cyan-400/80 shadow-[0_0_16px_rgba(34,211,238,0.45)] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase text-cyan-300">
                <Map className="w-3 h-3" /> STORY CAMPAIGN
              </div>
              <div className="font-display font-extrabold text-sm text-white truncate">
                CH.{nextChapter.id}: {nextChapter.bossName.split(',')[0]}
              </div>
              <div className="mt-1 flex items-center gap-1">
                {CAMPAIGN_CHAPTERS.map((ch) => (
                  <span
                    key={ch.id}
                    className={`w-3.5 h-1.5 rounded-sm ${
                      completedChapters.includes(ch.id)
                        ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                        : ch.id === nextChapter.id
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
                <span className="text-[10px] text-slate-400 font-mono-num ml-1">
                  {completedChapters.length}/5
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-cyan-300 shrink-0" />
          </motion.button>

          {/* GIANT GLOWING QUICK DUEL / BATTLE BUTTON */}
          <motion.button
            type="button"
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => go('quick_duel')}
            className="relative overflow-hidden shine-sweep clip-skew-btn px-8 sm:px-10 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 border-2 border-amber-200/80 shadow-[0_0_38px_rgba(249,115,22,0.65)] flex items-center justify-center gap-3 cursor-pointer"
          >
            <Swords className="w-6 h-6 text-white drop-shadow" />
            <div className="text-left">
              <div className="font-display font-extrabold text-lg sm:text-xl tracking-[0.14em] text-white leading-none drop-shadow">
                DUEL!
              </div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-amber-100/95 mt-0.5">
                Quick Battle vs AI
              </div>
            </div>
          </motion.button>
        </div>
      </footer>

      <MissionsModal open={missionsOpen} onClose={() => setMissionsOpen(false)} />
      <SaveBackupModal open={backupOpen} onClose={() => setBackupOpen(false)} />
    </div>
  );
};
