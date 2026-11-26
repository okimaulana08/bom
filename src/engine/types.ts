export type Faction = 'pyroclast' | 'cryo_mecha' | 'umbra' | 'sylvan' | 'chrono';

export type CardSetId =
  | 'genesis'
  | 'overdrive'
  | 'phantom'
  | 'arcana_vault'
  | 'maximum'
  | 'egyptian_gods'
  | 'yggdrasil_overlord'
  | 'legendary_dragons'
  | 'sevens_magicians'
  | 'supreme_mecha';

export type DuelistSkillId =
  | 'volcanic_ignition'
  | 'absolute_aegis'
  | 'void_resurrection'
  | 'canopy_awakening'
  | 'destiny_draw';

export type SpireBlessingId =
  | 'blessing_vanguard_might'
  | 'blessing_iron_aegis'
  | 'blessing_evo_mastery'
  | 'blessing_rush_draw'
  | 'blessing_fusion_spark'
  | 'blessing_trap_ambush';

export type MaximumPieceRole = 'left' | 'center' | 'right';

export type CardType = 'vanguard' | 'fusion_apex' | 'arcana' | 'ambush' | 'relic';

export type ArcanaSubtype = 'instant' | 'domain' | 'fusion_catalyst';

export type Rarity = 'common' | 'rare' | 'epic' | 'mythic';

export type Keyword =
  | 'Swift'
  | 'Pierce'
  | 'Ward'
  | 'Lethal'
  | 'Resonate'
  | 'Drain'
  | 'Rush';

export type Stance = 'attack' | 'defense';

export type PlayerId = 'player' | 'opponent';

export type TurnPhase = 'mulligan' | 'draw' | 'main' | 'battle' | 'end' | 'game_over';

export type AmbushTrigger = 'on_summon' | 'on_attack' | 'on_evolve' | 'on_spell';

export type EffectTargetMode =
  | 'none'
  | 'friendly_unit'
  | 'enemy_unit'
  | 'any_unit'
  | 'enemy_or_face'
  | 'void_vanguard';

export interface CardEffect {
  kind:
    | 'damage_enemy_lp'
    | 'destroy_unit'
    | 'destroy_unit_if_atk_le'
    | 'destroy_all_enemies'
    | 'destroy_all_enemies_atk_le'
    | 'destroy_or_burn'
    | 'debuff_unit'
    | 'debuff_all_enemies'
    | 'heal_lp'
    | 'draw'
    | 'buff_unit'
    | 'buff_all_friendly'
    | 'freeze_unit'
    | 'freeze_all_enemies'
    | 'bounce_unit'
    | 'revive_vanguard'
    | 'extra_normal_summon'
    | 'grant_keyword'
    | 'negate_attack'
    | 'counter_spell'
    | 'destroy_attacker'
    | 'debuff_attacker'
    | 'reflect_attacker_atk'
    | 'destroy_all_enemy_attackers'
    | 'destroy_enemy_backrow'
    | 'pay_lp'
    | 'recover_void_to_hand'
    | 'fusion_catalyst'
    | 'gain_evo_orb';
  amount?: number;
  atkThreshold?: number;
  atkDelta?: number;
  defDelta?: number;
  keyword?: Keyword;
  maxLevel?: number;
  factionFilter?: Faction;
}

export interface InnateEvolveCondition {
  type: 'defeat_enemy' | 'survive_turn' | 'win_defense';
  description: string;
}

export interface EvolvedForm {
  name: string;
  title: string;
  atk: number;
  def: number;
  keywords: Keyword[];
  art?: string;
  effectText: string;
  onEvolve?: CardEffect[];
  onAttack?: CardEffect[];
  endOfTurn?: CardEffect[];
  innateCondition?: InnateEvolveCondition;
}

export interface FusionMaterialReq {
  faction?: Faction;
  label: string;
}

export interface FusionRecipe {
  materials: FusionMaterialReq[];
  distinctFactions?: boolean;
  summary: string;
}

export interface RelicBonus {
  atk: number;
  def: number;
  keywords?: Keyword[];
}

export interface DomainBonus {
  friendlyAtk?: number;
  friendlyDef?: number;
  endTurnHeal?: number;
  endTurnBurn?: number;
  spellBurnBonus?: number;
}

export interface CardDef {
  id: string;
  name: string;
  setId?: CardSetId;
  faction: Faction;
  secondaryFaction?: Faction;
  type: CardType;
  arcanaSubtype?: ArcanaSubtype;
  rarity: Rarity;
  /** Monster Level (1-8). 1-4 = 0 Tributes, 5-6 = 1 Tribute, 7-8 = 2 Tributes. 0 for Spells/Traps/Relics. */
  level: number;
  atk?: number;
  def?: number;
  keywords: Keyword[];
  targetMode?: EffectTargetMode;
  ambushTrigger?: AmbushTrigger;
  effectText: string;
  lore: string;
  art: string;
  isToken?: boolean;
  isExclusive?: boolean;
  onPlay?: CardEffect[];
  onSummon?: CardEffect[];
  onFlip?: CardEffect[];
  onAttack?: CardEffect[];
  onDeath?: CardEffect[];
  onResonate?: CardEffect[];
  endOfTurn?: CardEffect[];
  ambushEffects?: CardEffect[];
  relicBonus?: RelicBonus;
  domainBonus?: DomainBonus;
  evolvedData?: EvolvedForm;
  fusionRecipe?: FusionRecipe;
  maximumSetId?: string;
  maximumPiece?: MaximumPieceRole;
  maximumAtk?: number;
  maximumKeywords?: Keyword[];
  maximumEffectText?: string;
  maximumOnAttack?: CardEffect[];
}

export interface HandCard {
  instanceId: string;
  cardId: string;
}

export interface BoardUnit {
  instanceId: string;
  cardId: string;
  owner: PlayerId;
  slot: 0 | 1 | 2;
  stance: Stance;
  faceDown: boolean;
  isEvolved: boolean;
  currentAtk: number;
  currentDef: number;
  keywords: Keyword[];
  wardActive: boolean;
  frozenTurns: number;
  attacksThisTurn: number;
  maxAttacksThisTurn: number;
  hasChangedPositionThisTurn: boolean;
  summonedTurn: number;
  evolvedTurn: number | null;
  killsThisMatch: number;
  survivedTurns: number;
  wonDefenseThisMatch: boolean;
  attachedRelics: string[];
  innateEvolveReady: boolean;
  maximumSetId?: string;
  maximumPiece?: MaximumPieceRole;
  isMaximumMode?: boolean;
}

export interface BacklineCard {
  instanceId: string;
  cardId: string;
  owner: PlayerId;
  slot: 0 | 1;
  kind: 'ambush' | 'domain';
  faceDown: boolean;
  setTurn: number;
}

export type BossModifierId =
  | 'none'
  | 'pyro_hatchling_start'
  | 'cryo_guard_armor'
  | 'umbra_ambush_start'
  | 'sylvan_turn2_ramp'
  | 'chrono_archon_boss'
  | 'pharaoh_pyramid_start'
  | 'dragon_rush_fury'
  | 'orbital_overlord_boss';

export interface PlayerDuelState {
  id: PlayerId;
  name: string;
  lp: number;
  maxLp: number;
  normalSummonsLeft: number;
  evoOrbs: number;
  maxEvoOrbs: number;
  evolvedThisTurn: boolean;
  soulBurnUsedThisTurn: boolean;
  turnsTaken: number;
  deck: string[];
  hand: HandCard[];
  riftDeck: string[];
  vanguard: [BoardUnit | null, BoardUnit | null, BoardUnit | null];
  arcane: [BacklineCard | null, BacklineCard | null];
  voidPile: string[];
  mulliganDone: boolean;
  bossModifier: BossModifierId;
  skillId: DuelistSkillId | null;
  skillUsed: boolean;
  blessings: SpireBlessingId[];
}

export type DuelEventType =
  | 'draw'
  | 'summon'
  | 'set_monster'
  | 'flip'
  | 'evolve'
  | 'fusion'
  | 'maximum'
  | 'skill'
  | 'ambush'
  | 'spell'
  | 'relic'
  | 'domain'
  | 'attack'
  | 'damage_lp'
  | 'heal_lp'
  | 'destroy'
  | 'freeze'
  | 'bounce'
  | 'soul_burn'
  | 'resonate'
  | 'stance'
  | 'ward_break'
  | 'turn_start'
  | 'boss_modifier'
  | 'game_over';

export interface DuelEvent {
  id: string;
  type: DuelEventType;
  actor?: PlayerId;
  cardId?: string;
  secondaryCardIds?: string[];
  sourceInstanceId?: string;
  targetInstanceId?: string;
  targetPlayer?: PlayerId;
  amount?: number;
  text: string;
  turn: number;
}

export interface DuelConfig {
  playerName: string;
  opponentName: string;
  playerDeck: string[];
  playerRiftDeck: string[];
  playerDeckId?: string;
  playerDeckName?: string;
  opponentDeck: string[];
  opponentRiftDeck: string[];
  playerStartLp?: number;
  opponentStartLp?: number;
  opponentStartEvoOrbs?: number;
  bossModifier?: BossModifierId;
  playerSkillId?: DuelistSkillId | null;
  opponentSkillId?: DuelistSkillId | null;
  playerBlessings?: SpireBlessingId[];
  spireFloor?: number;
  chapterId?: number;
  aiDifficulty?: 'initiate' | 'grandmaster';
  seed?: number;
}

export interface DuelState {
  turnNumber: number;
  activePlayer: PlayerId;
  phase: TurnPhase;
  winner: PlayerId | null;
  winReason: string | null;
  players: Record<PlayerId, PlayerDuelState>;
  log: DuelEvent[];
  recentEvents: DuelEvent[];
  nextUid: number;
  rngState: number;
  chapterId: number | null;
  spireFloor: number | null;
  aiDifficulty: 'initiate' | 'grandmaster';
  fusionsPerformed: number;
  evolutionsPerformed: number;
  maximumsPerformed: number;
}

export interface MaterialChoice {
  source: 'field' | 'hand';
  instanceId: string;
  cardId: string;
}

export interface PlayCardOptions {
  slot?: number;
  /** 'attack' = Normal Summon Face-Up ATK, 'defense' = Normal Set Face-Down DEF */
  summonMode?: 'attack' | 'defense';
  /** Unit instanceIds on your field to Tribute for Level 5-8 Vanguards */
  tributeInstanceIds?: string[];
  targetInstanceId?: string;
  targetPlayer?: PlayerId;
  voidCardId?: string;
  fusionCardId?: string;
  fusionMaterials?: MaterialChoice[];
}

export interface EngineResult {
  state: DuelState;
  ok: boolean;
  error?: string;
}

/* Progression, Deckbuilding, Campaign & Shop Types */

export interface DeckList {
  id: string;
  name: string;
  description?: string;
  mainDeck: string[];
  riftDeck: string[];
  isStarter?: boolean;
  featuredFaction?: Faction;
}

export interface CampaignDialogue {
  preDuel: string[];
  onBossLowLp: string;
  onPlayerFusion: string;
  onPlayerEvolve: string;
  onBossAce: string;
  victory: string;
  defeat: string;
}

export interface CampaignChapter {
  id: number;
  season?: 1 | 2;
  title: string;
  subtitle: string;
  bossName: string;
  bossTitle: string;
  faction: Faction;
  portrait: string;
  bossLp: number;
  bossEvoOrbs: number;
  bossModifier: BossModifierId;
  bossSkillId?: DuelistSkillId;
  modifierTitle: string;
  modifierDescription: string;
  aiDifficulty: 'initiate' | 'grandmaster';
  deck: string[];
  riftDeck: string[];
  rewardCoins: number;
  rewardCardId: string;
  grantsChampionBadge?: boolean;
  dialogue: CampaignDialogue;
}

export interface PackDef {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  description: string;
  accentFrom: string;
  accentTo: string;
  boostedFactions: Faction[];
  boostFusion?: boolean;
  boostAmbush?: boolean;
  featuredSetId?: CardSetId;
  badge?: string;
}

export interface PackCardPull {
  cardId: string;
  rarity: Rarity;
  isNew: boolean;
  autoDismantled: boolean;
  dustGained: number;
}

export interface PackOpenResult {
  packId: string;
  pulls: PackCardPull[];
  totalDustGained: number;
}

export interface SpireRunState {
  active: boolean;
  floor: number; // 1..5
  currentLp: number;
  maxLp: number;
  deck: string[];
  riftDeck: string[];
  blessings: SpireBlessingId[];
  pendingDraft?: {
    cardChoices: string[];
    blessingChoices: SpireBlessingId[];
    pickedCard: boolean;
    pickedBlessing: boolean;
  } | null;
  completed?: boolean;
}

export interface PlayerStats {
  duelsWon: number;
  duelsLost: number;
  packsOpened: number;
  fusionsExecuted: number;
  evolutionsTriggered: number;
  trapsTriggered?: number;
  maxSingleHitDamage?: number;
  spireClears?: number;
  maximumsSummoned?: number;
}

export interface DeckRecord {
  wins: number;
  losses: number;
  lastPlayedAt?: string;
}

export interface MatchHistoryEntry {
  id: string;
  date: string;
  mode: 'quick_duel' | 'campaign' | 'spire';
  deckId: string;
  deckName: string;
  opponentName: string;
  won: boolean;
  turns: number;
  remainingLp: number;
  fusions: number;
  maximums: number;
}

export interface PlayerProfile {
  coins: number;
  dust: number;
  collection: Record<string, number>;
  decks: DeckList[];
  activeDeckId: string;
  completedChapters: number[];
  claimedChapterRewards: number[];
  claimedMissions?: string[];
  hasChampionBadge: boolean;
  soundEnabled: boolean;
  bgmEnabled?: boolean;
  trapPromptMode?: 'manual' | 'auto';
  duelSpeed?: 1 | 2;
  selectedSkillId?: DuelistSkillId;
  lastFreePackDate?: string | null;
  loginStreak?: number;
  lastLoginClaimDate?: string | null;
  deckRecords?: Record<string, DeckRecord>;
  matchHistory?: MatchHistoryEntry[];
  royalFoils?: Record<string, boolean>;
  tutorialCompleted?: boolean;
  spireRun?: SpireRunState | null;
  stats: PlayerStats;
}
