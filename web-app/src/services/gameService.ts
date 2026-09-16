/**
 * UI-д зориулсан ГАНЦ хаалга (lld.md §7.2; AC UI-3, D-1).
 *
 * ⚠ `ui/**` нь `@shared/core/**`-ыг ШУУД импортлохгүй — `architecture.test.ts` УНАНА.
 * Домэйн энд дуудагдаж, UI-д зөвхөн харагдах хэлбэр (`*View`) гарна.
 */
import { applyAction } from '@shared/core/apply.ts';
import { levelFor, rankName, xpToNextLevel } from '@shared/core/progression.ts';
import { sideQuestXp } from '@shared/core/sideQuests.ts';
import { personalBest, tierFor } from '@shared/core/boss.ts';
import { createRng, fnv1a } from '@shared/core/rng.ts';
import {
  BOSS_CATEGORIES,
  BOSS_CATEGORY_LABELS,
  BOSS_TIERS,
  HARD_BOSS_TIERS,
  MILESTONE_KEYS,
  SKILL_TAGS,
  XP_THRESHOLDS,
} from '@shared/core/constants.ts';
import { rankOf } from '@shared/core/reputation.ts';
import { trackOf } from '@shared/core/mastery.ts';
import { isUnlocked } from '@shared/core/cosmetics.ts';
import { costCurrency, unlockGaps, type Currency } from '@shared/core/skillTree.ts';
import { COSMETIC_SLOTS, MASTERY_PRESTIGE_LEVEL, RESPEC_COOLDOWN_DAYS } from '@shared/core/constants.ts';
import { dayOf, daysBetween } from '@shared/core/result.ts';
import { exportSave, importSave } from '@shared/core/saves.ts';
import type {
  Action,
  ActionType,
  SkillTag,
  AchievementDefinition,
  ContentPack,
  CosmeticItem,
  CosmeticSlot,
  DifficultyTier,
  DomainEvent,
  DungeonDefinition,
  GameState,
  ProjectState,
  QuestDefinition,
  RejectionReason,
  SkillDefinition,
} from '@shared/types/index.ts';
import type { Issue } from '@shared/validate/dsl.ts';
import { createStore, type Store } from './store.ts';

/** Татгалзлын кодыг хүний өгүүлбэр болгоно (§7.7). */
const REJECTION_TEXT: Record<string, string> = {
  parse: 'That file is not a save file — it could not be read as JSON.',
  schema: 'That save file does not match this game’s save format.',
  'too-new': 'That save came from a newer version of the game. Update first, then import.',
};
import type { Persistence } from './persistence.ts';

export type QuestCardView = {
  id: string;
  title: string;
  summary: string;
  world: number;
  track: QuestDefinition['track'];
  tags: readonly string[];
  estimatedMinutes: number;
  staminaCost: number;
  /** Side quest-д дараагийн гүйцэтгэлийн XP (буурлыг ил харуулна — AC SQ-2). */
  xp: number;
  baseXp: number;
  completions: number;
  completed: boolean;
  locked: boolean;
  /** Түгжээтэй бол ЯАГААД — тоглогч таах шаардлагагүй (AC MQ-4). */
  lockReason: string | null;
  victoryConditions: readonly string[];
  deliverables: readonly string[];
  stretchGoals: readonly string[];
  reflectionPrompt: string;
  description: string;
  tutorialRefs: QuestDefinition['tutorialRefs'];
};

export type DungeonCardView = {
  id: string;
  title: string;
  conceptGoal: string;
  estimatedMinutes: number;
  xp: number;
  tags: readonly string[];
  completed: boolean;
  tutorialRefs: DungeonDefinition['tutorialRefs'];
  questions: DungeonDefinition['questions'];
};

export type SkillNodeView = SkillDefinition & {
  unlocked: boolean;
  affordable: boolean;
  lockReason: string | null;
  /** tier-1 = `skillPoints`, tier-2/3 = mastery point (plan.md P-3) — UI үнийг ТААХГҮЙ. */
  currency: Currency;
  /**
   * Дутсан нөхцөлүүд, capstone-ийнх ч (AC SKL-2). ⚠ `shared/core`-оос ГАРНА:
   * UI ижил дүрмийг хоёр дахь удаа бичих нь татгалзал ба тайлбарыг салгана.
   */
  gaps: readonly string[];
};

/** AC SKL-3 — respec-ийн ГЛОБАЛ cooldown (plan.md P-19). */
export type RespecStatus = { available: boolean; daysLeft: number };

export type AchievementView = AchievementDefinition & { earned: boolean; requirement: string };

export type ProjectView = ProjectState & { doneCount: number; nextMilestone: string | null };

/** Camp ба Skills хоёулаа ЭНЭ хэлбэрийг уншина — хоёр тооцоолол үлдэхгүй. */
export type MasteryTrackView = {
  tag: SkillTag;
  label: string;
  level: number;
  xp: number;
  /** Дараагийн түвшний нийт XP; дээд түвшинд `null`. */
  xpToNext: number | null;
  /** Одоогийн түвшний эхлэл — мини bar-ын хувь энэ хоёрын хооронд тооцогдоно. */
  xpFloor: number;
  prestigeCount: number;
};

export type GuildView = {
  id: string;
  title: string;
  rep: number;
  /** `0..4` — ЗӨВХӨН cosmetic (AC RET-6). */
  rank: number;
  placeholder: boolean;
};

/** Trophy Room-ийн мөр (AC COS-3) — нээгдээгүй бүр ЭХ СУРВАЛЖАА текстээр хэлнэ. */
export type TrophyView = {
  id: string;
  title: string;
  slot: CosmeticSlot;
  rarity: CosmeticItem['rarity'];
  unlocked: boolean;
  /** «Юу хийвэл нээгдэх» — нээгдсэн бол «юугаар нээгдсэн». */
  unlockText: string;
};

export type DispatchResult = { events: DomainEvent[]; rejected?: RejectionReason; detail?: string };

export type GameServiceDeps = {
  pack: ContentPack;
  initial: GameState;
  persistence?: Pick<Persistence, 'scheduleWrite' | 'lastSavedAt'>;
  now?: () => string;
  newId?: () => string;
  /** Үйлдэл амжилттай болсны дараа — дараалалд хийх / sync-ийг түлхэх. */
  onAction?: (action: Action, state: GameState) => void;
};

export function createGameService(deps: GameServiceDeps) {
  const { pack } = deps;
  const now = deps.now ?? (() => new Date().toISOString());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const store: Store<GameState> = createStore(deps.initial);
  const eventListeners = new Set<(events: DomainEvent[]) => void>();

  const questById = new Map(pack.quests.map((q) => [q.id, q]));

  function lockReasonFor(quest: QuestDefinition, state: GameState): string | null {
    if (quest.levelRequired > state.level) return `Reach level ${quest.levelRequired} to unlock this.`;
    const missing = quest.prerequisites.filter((p) => !state.completedMainQuestIds.includes(p));
    if (missing.length > 0) {
      const titles = missing.map((id) => questById.get(id)?.title ?? id);
      return `First finish: ${titles.join(', ')}.`;
    }
    if (quest.staminaCost > state.stamina)
      return `Needs ${quest.staminaCost} stamina — you have ${state.stamina}. Rest at camp.`;
    return null;
  }

  function toQuestView(quest: QuestDefinition, state: GameState): QuestCardView {
    const completions = state.sideQuestStats[quest.id]?.completions ?? 0;
    const completed =
      quest.track === 'main' || quest.track === 'boss' || quest.track === 'raid'
        ? state.completedMainQuestIds.includes(quest.id)
        : quest.track === 'dungeon'
          ? state.completedDungeonIds.includes(quest.id)
          : !quest.repeatable && completions > 0;

    const reason = lockReasonFor(quest, state);
    return {
      id: quest.id,
      title: quest.title,
      summary: quest.summary,
      world: quest.world,
      track: quest.track,
      tags: quest.tags,
      estimatedMinutes: quest.estimatedMinutes,
      staminaCost: quest.staminaCost,
      xp:
        quest.track === 'side'
          ? sideQuestXp(quest.xp, completions + 1, quest.repeatXpMultiplier)
          : quest.xp,
      baseXp: quest.xp,
      completions,
      completed,
      locked: !completed && reason !== null,
      lockReason: completed ? null : reason,
      victoryConditions: quest.victoryConditions,
      deliverables: quest.deliverables,
      stretchGoals: quest.stretchGoals,
      reflectionPrompt: quest.reflectionPrompt,
      description: quest.description,
      tutorialRefs: quest.tutorialRefs,
    };
  }

  /** `video-editing` → `Video Editing`. ⚠ UI-ийн текст — домэйн тогтмол БИШ. */
  const TAG_LABELS: Record<string, string> = {
    'video-editing': 'Video Editing',
    blender: 'Blender',
    animation: 'Animation',
    cinematography: 'Cinematography',
    audio: 'Audio',
    vfx: 'VFX',
    storytelling: 'Storytelling',
  };

  const CURRENCY_LABELS: Record<Currency, string> = {
    skillPoints: 'skill point',
    masteryPoints: 'mastery point',
  };

  function requirementText(def: AchievementDefinition): string {
    const { kind, value } = def.predicate;
    const labels: Record<string, string> = {
      level: `Reach level ${value}`,
      totalXp: `Earn ${value} total XP`,
      mainQuestsCompleted: `Complete ${value} main quests`,
      sideQuestCompletions: `Complete ${value} side quests`,
      dungeonsCompleted: `Clear ${value} study dungeons`,
      projectsCompleted: `Finish ${value} projects`,
      bossTier: `Reach boss tier "${value}"`,
      streakDays: `Keep a ${value} day streak`,
    };
    return labels[kind] ?? `${kind}: ${value}`;
  }

  /**
   * AC COS-3 — нээлтийн эх сурвалжийг ӨГҮҮЛБЭР болгоно. ⚠ Домэйн дүрэм ЭНД БИШ:
   * «нээгдсэн эсэх»-ийг `isUnlocked` шийднэ, энэ нь зөвхөн тэр дүрмийг УНШИНА.
   */
  function unlockText(item: CosmeticItem, state: GameState): string {
    const { kind, refId, value } = item.unlockSource;
    const titleOf = (id: string): string =>
      questById.get(id)?.title ?? pack.dungeons.find((d) => d.id === id)?.title ?? id;

    switch (kind) {
      case 'quest':
        return `Finish ${titleOf(refId)}.`;
      case 'boss':
        return `Log a ${String(value)} tier attempt on ${titleOf(refId)}.`;
      case 'achievement':
        return `Earn the achievement “${pack.achievements.find((a) => a.id === refId)?.title ?? refId}”.`;
      // ⚠ lld.md §9.4.2 — «юу хийвэл нээгдэх»-ийн хажууд ОДООГИЙН явцыг МӨН
      // харуулна (COS-3): «rank 3» гэдэг нь тоглогч 1-т байгаа эсэх, 2-т байгаа
      // эсэхээс хамаарч огт өөр зай. Явцтай зорилт л мөрдөгдөнө.
      case 'guildRank':
        return `Reach rank ${String(value)} of 4 with ${pack.guilds.find((g) => g.id === refId)?.title ?? refId} (currently ${String(rankOf(state.reputation[refId] ?? 0))}).`;
      case 'mastery':
        return `Reach ${TAG_LABELS[refId] ?? refId} mastery level ${String(value)} (currently ${String(trackOf(state, refId as SkillTag).level)}).`;
      default:
        return 'This one is unlocked by play — the source is not recorded.';
    }
  }

  const service = {
    state$: store,

    events$(fn: (events: DomainEvent[]) => void): () => void {
      eventListeners.add(fn);
      return () => eventListeners.delete(fn);
    },

    /**
     * lld.md §7.2 — локал домэйнээр УРЬДЧИЛАН хэрэгжүүлнэ. Татгалзвал сервер рүү
     * ОГТ явуулахгүй: ижил дүрэм ажиллаж байгаа тул сервер ч татгалзана.
     */
    dispatch(type: ActionType, payload: Record<string, unknown>): DispatchResult {
      const at = now();
      const action = { actionId: newId(), type, at, payload } as Action;
      const state = store.getState();

      const result = applyAction(state, action, {
        pack,
        at,
        // Seed нь actionId-аас — сервер ижил seed ашиглана, loot зөрөхгүй (AC BE-12).
        rng: createRng(fnv1a(action.actionId)),
      });

      if (!result.ok) {
        const rejected: DispatchResult = { events: [], rejected: result.reason };
        if (result.detail !== undefined) rejected.detail = result.detail;
        return rejected;
      }

      store.setState(result.state);
      deps.persistence?.scheduleWrite(result.state);
      deps.onAction?.(action, result.state);
      for (const listener of [...eventListeners]) listener(result.events);

      return { events: result.events };
    },

    /** Серверээс ирсэн эрх бүхий төлвийг тавина — event дахин гаргахгүй. */
    replaceState(state: GameState): void {
      store.setState(state);
      deps.persistence?.scheduleWrite(state);
    },

    exportSave: (): string => exportSave(store.getState(), now()),

    /** ⚠ Татгалзвал ОДООГИЙН төлөв ХЭВЭЭР үлдэнэ (AC SV-5). */
    importSave(text: string): { ok: true } | { ok: false; reason: string; issues?: Issue[] } {
      const result = importSave(text);
      if (!result.ok) {
        // §7.7 — тоглогч файлынхаа ЮУ нь буруу болохыг мэдэх ёстой.
        const rejected: { ok: false; reason: string; issues?: Issue[] } = {
          ok: false,
          reason: REJECTION_TEXT[result.reason] ?? `Save file rejected (${result.reason}).`,
        };
        if (result.issues !== undefined) rejected.issues = result.issues;
        return rejected;
      }
      store.setState(result.state);
      deps.persistence?.scheduleWrite(result.state);
      return { ok: true };
    },

    view: {
      rank: (): string => rankName(store.getState().level),

      xpProgress(): { current: number; next: number | null; pct: number } {
        const { xp } = store.getState();
        const remaining = xpToNextLevel(xp);
        if (remaining === null) return { current: xp, next: null, pct: 100 };
        const next = xp + remaining;
        const floor = XP_THRESHOLDS.filter((t) => t <= xp).at(-1) ?? 0;
        return { current: xp, next, pct: Math.round(((xp - floor) / (next - floor)) * 100) };
      },

      stamina: () => {
        const { stamina, maxStamina } = store.getState();
        return { current: stamina, max: maxStamina };
      },

      streak: () => store.getState().streak,
      coins: (): number => store.getState().coins,
      skillPoints: (): number => store.getState().skillPoints,
      level: (): number => store.getState().level,
      settings: () => store.getState().settings,
      lastSavedAt: (): string | null => deps.persistence?.lastSavedAt() ?? null,

      questBoard(track: 'main' | 'side'): QuestCardView[] {
        const state = store.getState();
        return pack.quests
          .filter((q) => q.track === track)
          .sort((a, b) => a.world - b.world || (a.id < b.id ? -1 : 1))
          .map((q) => toQuestView(q, state));
      },

      bosses(): QuestCardView[] {
        const state = store.getState();
        return pack.quests
          .filter((q) => q.track === 'boss' || q.track === 'raid')
          .map((q) => toQuestView(q, state));
      },

      dailyMission(): QuestCardView | null {
        const state = store.getState();
        const id = state.dailyMission?.questId;
        if (id === undefined) return null;
        const quest = questById.get(id);
        return quest === undefined ? null : toQuestView(quest, state);
      },

      dungeonList(): DungeonCardView[] {
        const state = store.getState();
        return pack.dungeons.map((d) => ({
          id: d.id,
          title: d.title,
          conceptGoal: d.conceptGoal,
          estimatedMinutes: d.estimatedMinutes,
          xp: d.xp,
          tags: d.tags,
          completed: state.completedDungeonIds.includes(d.id),
          tutorialRefs: d.tutorialRefs,
          questions: d.questions,
        }));
      },

      skillTree(): SkillNodeView[] {
        const state = store.getState();
        return pack.skills.map((skill) => {
          const unlocked = state.unlockedSkillIds.includes(skill.id);
          const missing = skill.prerequisites.filter((p) => !state.unlockedSkillIds.includes(p));
          const currency = costCurrency(skill);
          const affordable = state[currency] >= skill.cost;
          const gaps = unlocked ? [] : unlockGaps(state, skill, pack);
          let lockReason: string | null = null;
          if (!unlocked && missing.length > 0)
            lockReason = `Unlock first: ${missing.map((id) => pack.skills.find((s) => s.id === id)?.title ?? id).join(', ')}.`;
          else if (!unlocked && gaps.length > 0)
            // ⚠ Эхний дутуу нөхцөл нь товч шалтгаан; БҮГД нь `gaps`-д бүтнээрээ.
            lockReason = `${gaps[0]!}.`;
          else if (!unlocked && !affordable)
            lockReason = `Needs ${skill.cost} ${CURRENCY_LABELS[currency]} — you have ${state[currency]}.`;
          return { ...skill, unlocked, affordable, lockReason, currency, gaps };
        });
      },

      masteryPoints: (): number => store.getState().masteryPoints,

      /** Prestige-ийн босго нь домэйнээс — UI 10-ыг дахин бичихгүй (AC BE-10). */
      prestigeLevel: (): number => MASTERY_PRESTIGE_LEVEL,

      /**
       * AC SKL-3 — cooldown нь ГЛОБАЛ: нэг мод respec хийхэд бүгд хүлээнэ.
       * ⚠ Үлдсэн хоног нь домэйнтэй ИЖИЛ тоололтоор (`daysBetween`) — хоёр өөр
       * тоолол нь «товч идэвхтэй ч сервер татгалзлаа» гэсэн байдал үүсгэнэ.
       */
      respecStatus(): RespecStatus {
        const { respecAt } = store.getState();
        if (respecAt === null) return { available: true, daysLeft: 0 };
        const waited = daysBetween(dayOf(respecAt), dayOf(now()));
        const daysLeft = Math.max(0, RESPEC_COOLDOWN_DAYS - waited);
        return { available: daysLeft === 0, daysLeft };
      },

      projects(): ProjectView[] {
        return store.getState().projects.map((p) => ({
          ...p,
          doneCount: p.milestones.filter((m) => m.done).length,
          nextMilestone: p.milestones.find((m) => !m.done)?.key ?? null,
        }));
      },

      milestoneKeys: (): readonly string[] => MILESTONE_KEYS,

      bossCategories: (): { key: string; label: string }[] =>
        BOSS_CATEGORIES.map((key) => ({ key, label: BOSS_CATEGORY_LABELS[key] })),

      /** Домэйны tier функцийг дамжуулна — UI босгыг ДАХИН бичихгүй (AC BE-10). */
      bossTier: (total: number, difficulty: DifficultyTier = 'standard'): string =>
        tierFor(total, difficulty),

      /**
       * AC BSX-2 — hard mode-ийн босго нь ТООЦОГДСОН утга (`ceil(×1.15)`).
       * ⚠ UI нь 41/52/60-ыг бичихгүй: коэффициент өөрчлөгдвөл дэлгэц өөрөө дагана.
       */
      bossThresholds: (difficulty: DifficultyTier): { mvp: number; advanced: number; mastery: number } =>
        difficulty === 'hard' ? { ...HARD_BOSS_TIERS } : { ...BOSS_TIERS },

      /** AC BSX-3 — `(bossId, difficulty)` бүлгийн дээд оноо; ГАРГАГДАНА, хадгалагдахгүй. */
      bossPersonalBest: (bossId: string, difficulty: DifficultyTier): number =>
        personalBest(store.getState(), bossId, difficulty),

      bossAttempts: () => store.getState().bossAttempts,

      achievements(): AchievementView[] {
        const state = store.getState();
        return pack.achievements.map((a) => ({
          ...a,
          earned: state.achievementIds.includes(a.id),
          requirement: requirementText(a),
        }));
      },

      inventory(): { id: string; title: string; rarity: string }[] {
        const held = store.getState().inventory;
        return pack.loot.filter((i) => held.includes(i.id)).map(({ id, title, rarity }) => ({ id, title, rarity }));
      },

      encounter: (id: string) => pack.encounters.find((e) => e.id === id) ?? null,

      levelOf: (xp: number): number => levelFor(xp),

      /** AC MST-6 — 7 track, контентын дарааллаас ҮЛ ХАМААРАН `SKILL_TAGS`-ийн эрэмбээр. */
      masteryTracks(): MasteryTrackView[] {
        const state = store.getState();
        return SKILL_TAGS.map((tag) => {
          // lld.md §4.2 (A-LLD2-1) — анхдагчийн ГАНЦ эх нь `trackOf`, гараар давтахгүй.
          const track = trackOf(state, tag);
          const remaining = xpToNextLevel(track.xp);
          return {
            tag,
            label: TAG_LABELS[tag] ?? tag,
            level: track.level,
            xp: track.xp,
            xpToNext: remaining === null ? null : track.xp + remaining,
            xpFloor: XP_THRESHOLDS.filter((t) => t <= track.xp).at(-1) ?? 0,
            prestigeCount: track.prestigeCount,
          };
        });
      },

      /** AC RET-5 — guild бүрийн rep ба зэрэглэл; нэр нь контентоос. */
      guilds(): GuildView[] {
        const state = store.getState();
        return pack.guilds.map((guild) => {
          const rep = state.reputation[guild.id] ?? 0;
          return {
            id: guild.id,
            title: guild.title,
            rep,
            rank: rankOf(rep),
            placeholder: guild.placeholder === true,
          };
        });
      },

      /** AC COS-3 — БҮХ cosmetic, нээгдээгүй нь ч; эрэмбэ нь `COSMETIC_SLOTS`-ийнх. */
      trophies(): TrophyView[] {
        const state = store.getState();
        return [...pack.cosmetics]
          .sort(
            (a, b) =>
              COSMETIC_SLOTS.indexOf(a.slot) - COSMETIC_SLOTS.indexOf(b.slot) ||
              (a.id < b.id ? -1 : 1),
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            slot: item.slot,
            rarity: item.rarity,
            unlocked: isUnlocked(state, item, pack),
            unlockText: unlockText(item, state),
          }));
      },

      cosmeticSlots: (): readonly CosmeticSlot[] => COSMETIC_SLOTS,

      /** ⚠ Цэвэр UI төлөв (spec.md D-6) — домэйн дүрэм үүнийг УНШИХГҮЙ. */
      campLayout: () => store.getState().campLayout.slots,

      /**
       * Дэлгэцийн палитрыг сонгоно (lld.md §9.2). ⚠ Домэйн БИШ — цэвэр дүрслэл,
       * `D-6`-ийн хүчний хоригт хамаарахгүй: энэ утга ямар ч нээлт, XP-д нөлөөлөхгүй.
       */
      activeWorld(): 1 | 2 | 3 | 4 | 5 {
        const state = store.getState();
        const pending = pack.quests
          .filter((q) => q.track === 'main' && !state.completedMainQuestIds.includes(q.id))
          .map((q) => q.world);
        return (pending.length === 0 ? 5 : Math.min(...pending)) as 1 | 2 | 3 | 4 | 5;
      },
    },
  };

  return service;
}

export type GameService = ReturnType<typeof createGameService>;
