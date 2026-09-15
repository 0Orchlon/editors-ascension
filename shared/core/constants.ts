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
