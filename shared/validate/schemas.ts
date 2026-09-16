/**
 * `contracts.yaml → components.schemas`-ийн DSL хувилбар (lld.md §5.1, §5.2).
 *
 * ⚠ Энэ файл нь ГАРААР бичигдсэн тул контрактаас салж болзошгүй.
 * Хамгаалалт: `web-app/tests/unit/contract-parity.test.ts` — зөрвөл тест УНАНА.
 */
import { anyObj, arr, bool, enom, int, lit, nullable, num, obj, rec, str, union } from './dsl.ts';

const uuid = () =>
  str({ pattern: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/ });
const dateTime = () => str({ pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/ });
const date = () => str({ pattern: /^\d{4}-\d{2}-\d{2}$/ });
const uri = () => str({ pattern: /^https?:\/\/\S+$/ });

// ───────────────────────────────────────────────── алдаа (RFC 9457)

export const RejectionReason = enom([
  'INSUFFICIENT_STAMINA',
  'PREREQ_NOT_MET',
  'LEVEL_TOO_LOW',
  'ALREADY_COMPLETED',
  'NOT_REPEATABLE',
  'INSUFFICIENT_SKILL_POINTS',
  'INVALID_INPUT',
  /** ⚠ v1.2.0-д нэмэгдсэн ЯГ НЭГ код (spec.md D-5; plan.md §13.3). */
  'RESPEC_ON_COOLDOWN',
] as const);

export const Problem = obj(
  {
    type: str(),
    title: str(),
    status: int({ min: 400, max: 599 }),
    detail: str(),
    instance: str(),
    code: str(),
    actionId: uuid(),
    errors: arr(obj({ field: str(), message: str() })),
  },
  { optional: ['detail', 'instance', 'code', 'actionId', 'errors'] },
);

// ───────────────────────────────────────────────────────────── ops

export const HealthOk = obj({ status: lit('ok'), version: str(), contentVersion: str() });
export const HealthDegraded = obj({ status: lit('degraded'), version: str(), reason: str() });

// ───────────────────────────────────────────────────────── players

export const PlayerCredentials = obj({ playerId: uuid(), token: str({ min: 43 }) });

// ─────────────────────────────────────────────── домэйн төлөв

/**
 * Сурах домэйны 7 tag. ⚠ ЭНД тодорхойлогдох шалтгаан: `MasteryTrack` (домэйн төлөв)
 * нь үүнийг лавлана — контентын хэсэгт тодорхойлвол хэрэглэхээс ХОЙНО гарна.
 */
export const SkillTag = enom([
  'video-editing',
  'blender',
  'animation',
  'cinematography',
  'audio',
  'vfx',
  'storytelling',
] as const);

export const BossScores = obj({
  story: int({ min: 0, max: 10 }),
  editing: int({ min: 0, max: 10 }),
  camera: int({ min: 0, max: 10 }),
  visualCraft: int({ min: 0, max: 10 }),
  animation: int({ min: 0, max: 10 }),
  audioPost: int({ min: 0, max: 10 }),
});

export const MilestoneKey = enom([
  'concept',
  'brief',
  'storyboard',
  'assets',
  'animation',
  'render',
  'editAudioColor',
  'review',
  'finalExport',
  'portfolio',
] as const);

export const ProjectState = obj(
  {
    id: str(),
    title: str({ min: 1, max: 120 }),
    createdAt: dateTime(),
    completedAt: nullable(dateTime()),
    notes: str({ max: 4000 }),
    nextAction: str({ max: 500 }),
    evidenceRef: nullable(str({ max: 500 })),
    selfScore: nullable(int({ min: 0, max: 10 })),
    milestones: arr(
      obj(
        { key: MilestoneKey, done: bool(), completedAt: nullable(dateTime()) },
        { optional: ['completedAt'] },
      ),
      { min: 10, max: 10 },
    ),
  },
  { optional: ['completedAt', 'evidenceRef', 'selfScore'] },
);

// ───────────────────────────────────────── v1.2.0 — гүнзгийрүүлэлтийн схемүүд

/** `LootItem`-тэй ИЖИЛ enum — `CosmeticItem` мөн үүнийг ашиглана (plan.md §11.2). */
export const Rarity = enom(['common', 'rare', 'epic', 'legendary'] as const);

/** Оролдлого тутмын хүндрэл, тоглогчид БИШ (AC BSX-2). */
export const DifficultyTier = enom(['standard', 'hard'] as const);

export const CosmeticSlot = enom([
  'avatarFrame',
  'campBanner',
  'title',
  'campDecoration',
  'uiAccent',
  'badgeFrame',
] as const);

export const CosmeticUnlockSource = obj(
  {
    kind: enom(['quest', 'boss', 'achievement', 'guildRank', 'mastery'] as const),
    refId: str(),
    value: union(int(), str()),
  },
  { optional: ['value'] },
);

/**
 * ⚠ ЯГ 6 түлхүүр, бүгд ЗААВАЛ (plan.md P-25) — `rec()` БИШ. Хэсэгчилсэн засвар
 * байхгүй тул `setCampLayout` нь бүтэн объект хүлээж авна.
 */
export const CampLayoutSlots = obj({
  avatarFrame: nullable(str()),
  campBanner: nullable(str()),
  title: nullable(str()),
  campDecoration: nullable(str()),
  uiAccent: nullable(str()),
  badgeFrame: nullable(str()),
});

export const CampLayout = obj({ slots: CampLayoutSlots });

export const MasteryTrack = obj({
  tag: SkillTag,
  xp: int({ min: 0 }),
  level: int({ min: 1, max: 10 }),
  /** ⚠ AC MST-3 — ХЭЗЭЭ Ч буурахгүй. */
  prestigeCount: int({ min: 0 }),
});

/** ⚠ Энэ хувилбарт ЗӨВХӨН `kind: 'boss'` бичигдэнэ (plan.md P-24). */
export const ReplayLogEntry = obj({
  at: dateTime(),
  kind: enom(['quest', 'sideQuest', 'dungeon', 'boss', 'chain'] as const),
  refId: str(),
  outcome: enom(['passed', 'failed'] as const),
});

export const BossAttempt = obj({
  bossId: str(),
  at: dateTime(),
  scores: BossScores,
  total: int({ min: 0, max: 60 }),
  tier: enom(['failed', 'mvp', 'advanced', 'mastery'] as const),
  difficulty: DifficultyTier,
});

export const GameState = obj({
  schemaVersion: int({ min: 1 }),
  xp: int({ min: 0 }),
  level: int({ min: 1, max: 10 }),
  stamina: int({ min: 0 }),
  maxStamina: lit(10),
  coins: int({ min: 0 }),
  skillPoints: int({ min: 0 }),
  combo: int({ min: 0 }),
  streak: obj({
    current: int({ min: 0 }),
    best: int({ min: 0 }),
    lastQualifiedDate: nullable(date()),
  }),
  completedMainQuestIds: arr(str(), { unique: true }),
  sideQuestStats: rec(
    obj({ completions: int({ min: 1 }), lastCompletedAt: nullable(dateTime()) }),
  ),
  completedDungeonIds: arr(str(), { unique: true }),
  unlockedSkillIds: arr(str(), { unique: true }),
  inventory: arr(str(), { unique: true }),
  achievementIds: arr(str(), { unique: true }),
  bossAttempts: arr(BossAttempt),
  dailyMission: nullable(obj({ questId: str(), date: date() })),
  projects: arr(ProjectState),
  settings: obj({
    reducedMotion: bool(),
    soundEnabled: bool(),
    colorBlindSafe: bool(),
    soundVolume: num({ min: 0, max: 1 }),
  }),

  // ── v2-ийн дельта — ЯГ 10 өөрчлөлт (plan.md §11.1).
  /** 7 бичлэг, түлхүүр нь `SkillTag`. */
  mastery: rec(MasteryTrack),
  /** ⚠ ҮЛДЭГДЭЛ, олдсон нийт БИШ (plan.md P-20). */
  masteryPoints: int({ min: 0 }),
  /** 4 бичлэг, түлхүүр нь `GuildDefinition.id`. ⚠ ЗӨВХӨН өснө. */
  reputation: rec(int({ min: 0 })),
  /** ⚠ 500 FIFO таслалт — бичигч нь `appendReplay` ГАНЦААРАА (plan.md P-10). */
  replayLog: arr(ReplayLogEntry, { max: 500 }),
  /** ⚠ Цэвэр UI төлөв — домэйн дүрэм УНШИХГҮЙ (spec.md D-6). */
  campLayout: CampLayout,
  completedChainIds: arr(str(), { unique: true }),
  /** ⚠ ГАНЦ талбар, мод тутам БИШ (plan.md P-19 · H-6). */
  respecAt: nullable(dateTime()),
  /** `lastPassedDate: null` = refresher-т нэр дэвшихгүй (plan.md P-15). */
  dungeonStats: rec(obj({ lastPassedDate: nullable(date()) })),
});

// ─────────────────────────────────────────────────────── saves

export const SavePayload = obj({
  schemaVersion: int({ min: 1 }),
  updatedAt: dateTime(),
  state: GameState,
});

export const SaveAck = obj({ updatedAt: dateTime(), etag: str() });
export const RestoreRequest = obj({ snapshotId: uuid() });

export const SnapshotRef = obj({
  snapshotId: uuid(),
  createdAt: dateTime(),
  schemaVersion: int({ min: 1 }),
  reason: enom(['put', 'actions', 'restore'] as const),
});

export const SaveHistory = obj({ snapshots: arr(SnapshotRef, { max: 10 }) });

// ───────────────────────────────────────────────────── actions

export const ActionType = enom([
  'claimQuest',
  'rest',
  'unlockSkill',
  'dungeonAttempt',
  'projectCreate',
  'projectMilestone',
  'projectUpdate',
  'bossAttempt',
  'rollDailyMission',
  'resolveEncounter',
  'updateSettings',
  // ⚠ v1.2.0 — ЯГ ГУРАВ (plan.md P-7). Тоглогчийн ИЛ сонголтууд; mastery XP · rep ·
  // chain bonus нь ОДОО байгаа action-уудын дотоод үр дагавар тул шинэ action шаардахгүй.
  'prestigeMastery',
  'respecTree',
  'setCampLayout',
] as const);

export const Action = obj(
  {
    actionId: uuid(),
    type: ActionType,
    at: dateTime(),
    seed: int({ min: 0 }),
    payload: anyObj(),
  },
  { optional: ['seed'] },
);

export const ActionBatchRequest = obj({ actions: arr(Action, { min: 1, max: 50 }) });

export const DomainEventType = enom([
  'XP_GAINED',
  'LEVEL_UP',
  'SKILL_POINT_GAINED',
  'SKILL_UNLOCKED',
  'STAMINA_SPENT',
  'STAMINA_RESTORED',
  'QUEST_COMPLETED',
  'SIDE_QUEST_COMPLETED',
  'DUNGEON_PASSED',
  'DUNGEON_FAILED',
  'COINS_GAINED',
  'LOOT_DROPPED',
  'ACHIEVEMENT_UNLOCKED',
  'STREAK_EXTENDED',
  'STREAK_RESET',
  'COMBO_CHANGED',
  'PROJECT_CREATED',
  'PROJECT_MILESTONE_COMPLETED',
  'PROJECT_COMPLETED',
  'BOSS_ATTEMPT_LOGGED',
  'BOSS_PASSED',
  'ENCOUNTER_TRIGGERED',
  'DAILY_MISSION_ROLLED',
  'SETTINGS_UPDATED',
  // ⚠ v1.2.0 — ЯГ ДӨРӨВ (plan.md P-8).
  'MASTERY_LEVEL_UP',
  'MASTERY_PRESTIGED',
  'REPUTATION_GAINED',
  'CHAIN_COMPLETED',
] as const);

export const DomainEvent = obj(
  { type: DomainEventType, data: anyObj() },
  { optional: ['data'] },
);

export const ActionResult = obj({
  actionId: uuid(),
  status: enom(['applied', 'replayed'] as const),
  events: arr(DomainEvent),
});

export const ActionBatchResponse = obj({
  state: GameState,
  results: arr(ActionResult),
  updatedAt: dateTime(),
  etag: str(),
});

// ────────────────────────────────────────────────────── transfer

const TRANSFER_CODE_RE =
  /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}-?[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}-?[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}$/;

export const TransferCodeString = str({ pattern: TRANSFER_CODE_RE });
export const TransferCode = obj({ code: TransferCodeString, expiresAt: dateTime() });
export const RedeemRequest = obj({ code: TransferCodeString });

// ─────────────────────────────────────────────────────── контент

export const TutorialRef = obj({ title: str({ min: 1 }), url: uri(), minutes: int({ min: 1 }) });

export const QuestDefinition = obj(
  {
    id: str({ pattern: /^[a-z0-9-]+$/ }),
    track: enom(['main', 'side', 'dungeon', 'boss', 'raid'] as const),
    world: int({ min: 1, max: 5 }),
    levelRequired: int({ min: 1, max: 10 }),
    type: enom(['training', 'mission', 'boss', 'raid', 'final'] as const),
    title: str({ min: 1 }),
    summary: str({ min: 1 }),
    description: str({ min: 1 }),
    estimatedMinutes: int({ min: 1 }),
    staminaCost: int({ min: 1, max: 6 }),
    xp: int({ min: 1 }),
    tags: arr(SkillTag, { min: 1 }),
    prerequisites: arr(str()),
    tutorialRefs: arr(TutorialRef),
    deliverables: arr(str(), { min: 1 }),
    victoryConditions: arr(str(), { min: 1 }),
    stretchGoals: arr(str(), { min: 1 }),
    reflectionPrompt: str({ min: 1 }),
    repeatable: bool(),
    repeatXpMultiplier: num({ exclusiveMin: 0, max: 1 }),
  },
  { optional: ['repeatXpMultiplier'] },
);

export const DungeonDefinition = obj({
  id: str(),
  title: str({ min: 1 }),
  conceptGoal: str({ min: 1 }),
  estimatedMinutes: int({ min: 1 }),
  xp: int({ min: 1 }),
  tags: arr(SkillTag, { min: 1 }),
  tutorialRefs: arr(TutorialRef, { min: 1, max: 3 }),
  questions: arr(
    obj({
      id: str(),
      prompt: str({ min: 1 }),
      options: arr(str(), { min: 2 }),
      correctIndex: int({ min: 0 }),
      explanation: str({ min: 1 }),
    }),
    { min: 1 },
  ),
});

export const AchievementDefinition = obj({
  id: str(),
  title: str({ min: 1 }),
  description: str({ min: 1 }),
  predicate: obj({
    kind: enom([
      'level',
      'totalXp',
      'mainQuestsCompleted',
      'sideQuestCompletions',
      'dungeonsCompleted',
      'projectsCompleted',
      'bossTier',
      'streakDays',
      // ⚠ v1.2.0 — 5 шинэ kind (plan.md P-23).
      'masteryLevel',
      'prestigeCount',
      'guildRank',
      'bossPersonalBest',
      'chainsCompleted',
    ] as const),
    value: union(int(), str()),
    /** «Аль guild / аль boss / аль track» — БАЙХГҮЙ бол «дурын нэг» (plan.md P-23). */
    ref: str(),
  }, { optional: ['ref'] }),
});

export const EncounterDefinition = obj(
  {
    id: str(),
    title: str({ min: 1 }),
    body: str({ min: 1 }),
    callToAction: str({ min: 1 }),
    maxMinutes: int({ min: 1, max: 2 }),
    weight: num({ exclusiveMin: 0 }),
  },
  { optional: ['maxMinutes'] },
);

export const LootItem = obj({
  id: str(),
  title: str({ min: 1 }),
  rarity: Rarity,
  effect: lit('cosmetic'),
});

export const SkillDefinition = obj({
  id: str(),
  title: str({ min: 1 }),
  description: str({ min: 1 }),
  /** ⚠ AC SKL-5 — ХЭМЖЭЭ `1` хэвээр; өөрчлөгдсөн нь төлбөрийн ВАЛЮТ (plan.md P-3). */
  cost: lit(1),
  prerequisites: arr(str()),
  track: SkillTag,
  /** tier-1 → `skillPoints` · tier-2/3 → тухайн track-ийн mastery point (AC SKL-2). */
  tier: int({ min: 1, max: 3 }),
});

export const CosmeticItem = obj({
  id: str({ pattern: /^[a-z0-9-]+$/ }),
  title: str({ min: 1 }),
  slot: CosmeticSlot,
  rarity: Rarity,
  /** ⚠ AC EC-1 хэвээр — тоглоомын тоон нөлөө БАЙХГҮЙ (spec.md D-6). */
  effect: lit('cosmetic'),
  unlockSource: CosmeticUnlockSource,
});

/** ⚠ `placeholder: true` = H-2-ийн ТҮР нэр; бүтэц нэрнээс хамаарахгүй (plan.md P-13). */
export const GuildDefinition = obj({
  id: str({ pattern: /^[a-z0-9-]+$/ }),
  title: str({ min: 1 }),
  tags: arr(SkillTag, { min: 1, unique: true }),
  placeholder: bool(),
});

export const SideQuestChain = obj({
  id: str({ pattern: /^[a-z0-9-]+$/ }),
  title: str({ min: 1 }),
  /** `bonusXp`-ийн тааз нь дэлхийгээс хамаарна (AC RET-3) тул ЗААВАЛ. */
  world: int({ min: 1, max: 5 }),
  steps: arr(str(), { min: 4, max: 4, unique: true }),
  bonusXp: int({ min: 1 }),
});

export const ContentPack = obj({
  version: str(),
  quests: arr(QuestDefinition),
  dungeons: arr(DungeonDefinition),
  /** AC SKL-1 — track тутамд ≥1 tier-1, ≥1 tier-2, ЯГ 1 tier-3. */
  skills: arr(SkillDefinition, { min: 28 }),
  achievements: arr(AchievementDefinition, { min: 40 }),
  encounters: arr(EncounterDefinition, { min: 5 }),
  loot: arr(LootItem),
  /** AC RET-5 — ЯГ 4. */
  guilds: arr(GuildDefinition, { min: 4, max: 4 }),
  chains: arr(SideQuestChain, { min: 3 }),
  cosmetics: arr(CosmeticItem, { min: 60 }),
});

export const ProgressionConstants = obj({
  xpThresholds: arr(int(), { min: 9, max: 9 }),
  rankNames: arr(str(), { min: 10, max: 10 }),
  bossTiers: obj({ mvp: lit(35), advanced: lit(45), mastery: lit(52) }),
  maxStamina: lit(10),
  restAmount: lit(3),
  projectMilestoneXp: lit(25),
  defaultRepeatXpMultiplier: lit(0.5),
  dungeonPassRatio: lit(0.7),
  sideQuestXpFloorRatio: lit(0.1),
  encounterChance: lit(0.25),
  lootChance: lit(0.35),
  // ⚠ `hardBossTiers` ЭНД БАЙХГҮЙ — `ceil(bossTiers[t] × hardModeMultiplier)`-ээр
  // ТООЦОГДОНО (AC BSX-2). Гараар бичих нь хоёр дахь эх сурвалж болно.
  hardModeMultiplier: lit(1.15),
  masteryMaxLevel: lit(10),
  masteryPrestigeLevel: lit(10),
  respecCooldownDays: lit(7),
  refresherMinDays: lit(14),
  replayLogCap: lit(500),
  repThresholds: arr(int(), { min: 4, max: 4 }),
  repBase: obj({ main: lit(3), boss: lit(3), dungeon: lit(2), side: lit(2) }),
  guildCount: lit(4),
});
