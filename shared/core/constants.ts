/**
 * `contracts.yaml → ProgressionConstants`-ийн ЦОРЫН ГАНЦ TypeScript хувилбар (lld.md §4).
 * ⚠ Эдгээр тоог `web-app/src/**` эсвэл `server/src/**` дотор ДАХИН бичих нь
 * `architecture.test.ts`-ийг УНАГААНА (AC BE-10).
 */
export const XP_THRESHOLDS = [100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500] as const;

export const RANK_NAMES = [
  'Recruit',
  'Apprentice',
  'Cadet',
  'Editor',
  'Animator',
  'Specialist',
  'Director',
  'Cinematic Artist',
  'Senior Generalist',
  'Cinematic Master',
] as const;

export const MAX_STAMINA = 10;
export const REST_AMOUNT = 3;
export const PROJECT_MILESTONE_XP = 25;
export const DEFAULT_REPEAT_XP_MULTIPLIER = 0.5;
export const SIDE_QUEST_XP_FLOOR_RATIO = 0.1;
export const DUNGEON_PASS_RATIO = 0.7;
export const BOSS_TIERS = { mvp: 35, advanced: 45, mastery: 52 } as const;

/** ⚠ A-LLD-2 — эх шаардлагад БАЙХГҮЙ, загварын шатны сонголт. */
export const ENCOUNTER_CHANCE = 0.25;
/** ⚠ A-LLD-2 — эх шаардлагад БАЙХГҮЙ, загварын шатны сонголт. */
export const LOOT_CHANCE = 0.35;

export const MILESTONE_KEYS = [
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
] as const;

export const BOSS_CATEGORIES = [
  'story',
  'editing',
  'camera',
  'visualCraft',
  'animation',
  'audioPost',
] as const;

/** Boss ангиллын харагдах нэр (AC BS-3-ийн мессежийн формат). */
export const BOSS_CATEGORY_LABELS = {
  story: 'Story',
  editing: 'Editing',
  camera: 'Camera',
  visualCraft: 'Visual Craft',
  animation: 'Animation',
  audioPost: 'Audio/Post',
} as const;

/** Boss ангилал → сурах домэйны tag (AC BS-3-ийн зөвлөмж). */
export const BOSS_CATEGORY_TAGS = {
  story: 'storytelling',
  editing: 'video-editing',
  camera: 'cinematography',
  visualCraft: 'blender',
  animation: 'animation',
  audioPost: 'audio',
} as const;

export const SKILL_TAGS = [
  'video-editing',
  'blender',
  'animation',
  'cinematography',
  'audio',
  'vfx',
  'storytelling',
] as const;

// ───────────────────────────── v1.2.0 — гүнзгийрүүлэлтийн тогтмолууд (plan.md §12)

export const GUILD_COUNT = 4;
/**
 * Guild id-ийн ЦОРЫН ГАНЦ хувилбар (lld.md §5.3 · A-LLD2-2).
 *
 * ⚠ `MIGRATIONS[2]` нь `reputation`-ийн 4 түлхүүрийг ЭНДЭЭС үүсгэнэ — `guilds.json`-ийг
 * ШУУД импортолбол `shared/save` нь `shared/content`-оос хамаарч давхаргын чиглэл эргэнэ.
 * ⚠ Зөвхөн `id` тогтмол; guild-ийн ХАРАГДАХ нэр (`title`) нь контентод хэвээр (P-13 · H-2)
 * тул хүн нэрийг солиход код хөндөгдөхгүй. Хоёрын зөрүүг `[C]` дүрэм C-07 хаана.
 */
export const GUILD_IDS = ['guild-cut', 'guild-form', 'guild-frame', 'guild-signal'] as const;
/** AC BSX-2 — hard mode-ийн босго нь ЭНЭ коэффициентээр ТООЦОГДОНО. */
export const HARD_MODE_MULTIPLIER = 1.15;
export const MASTERY_MAX_LEVEL = 10;
/**
 * AC MST-3. `MASTERY_MAX_LEVEL`-тэй тэнцүү боловч ТУСДАА тогтмол: «дээд түвшин» ба
 * «prestige-ийн босго» нь өөр шийдвэрүүд (contracts.yaml v1.2.0).
 */
export const MASTERY_PRESTIGE_LEVEL = 10;
export const RESPEC_COOLDOWN_DAYS = 7;
/** AC RET-4 — dungeon refresher-ийн нэр дэвшилтийн доод хугацаа (тоглоомын өдөр). */
export const REFRESHER_MIN_DAYS = 14;
export const REPLAY_LOG_CAP = 500;
export const REP_THRESHOLDS = [10, 25, 50, 100] as const;
/** plan.md P-16 (хүний баталгааны цэг H-5) — `repAward(track, n)`-ийн суурь. */
export const REP_BASE = { main: 3, boss: 3, dungeon: 2, side: 2 } as const;

/**
 * AC BSX-2 — hard mode-ийн босго. ⚠ ТООЦОГДОНО, гараар бичигдэхгүй: `BOSS_TIERS`
 * өөрчлөгдвөл энэ нь автоматаар дагана. Одоогийн утга `{mvp: 41, advanced: 52,
 * mastery: 60}`.
 *
 * ⚠ Мэдэгдэж буй үр дагавар: `BossScores`-ийн дээд нийлбэр нь ЯГ 60 тул hard
 * mode-ийн `mastery` нь ТӨГС оноо шаардана (plan.md §12.2 — спекийн тоо хэвээр).
 */
export const HARD_BOSS_TIERS = {
  mvp: Math.ceil(BOSS_TIERS.mvp * HARD_MODE_MULTIPLIER),
  advanced: Math.ceil(BOSS_TIERS.advanced * HARD_MODE_MULTIPLIER),
  mastery: Math.ceil(BOSS_TIERS.mastery * HARD_MODE_MULTIPLIER),
} as const;

export const COSMETIC_SLOTS = [
  'avatarFrame',
  'campBanner',
  'title',
  'campDecoration',
  'uiAccent',
  'badgeFrame',
] as const;
