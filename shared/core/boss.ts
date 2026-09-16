/** Boss үнэлгээ ба дасгалжуулах мессеж (lld.md §5.4.10; AC BS-1…4, BSX-2…6). */
import type {
  BossAttempt,
  BossScores,
  ContentPack,
  DifficultyTier,
  DomainEvent,
  GameState,
} from '../types/index.ts';
import { evaluateAchievements } from './achievements.ts';
import {
  BOSS_CATEGORIES,
  BOSS_CATEGORY_LABELS,
  BOSS_CATEGORY_TAGS,
  BOSS_TIERS,
  HARD_BOSS_TIERS,
} from './constants.ts';
import { addXp } from './progression.ts';
import { appendReplay } from './replayLog.ts';
import { ok, reject, type Ctx, type DomainResult } from './result.ts';

export type BossInput = {
  bossId: string;
  scores: BossScores;
  /** ⚠ Оролдлого тутамд, тоглогчид БИШ (AC BSX-2). Байхгүй бол `standard`. */
  difficulty?: DifficultyTier;
};
export type BossTier = BossAttempt['tier'];

const DIFFICULTIES: readonly DifficultyTier[] = ['standard', 'hard'];

/**
 * Нийт оноог tier болгоно. Hard mode-ийн босго нь `HARD_BOSS_TIERS` — тэр нь
 * `ceil(BOSS_TIERS × 1.15)`-ээр ТООЦОГДСОН (AC BSX-2), энд гараар бичигдээгүй.
 */
export function tierFor(total: number, difficulty: DifficultyTier = 'standard'): BossTier {
  const table = difficulty === 'hard' ? HARD_BOSS_TIERS : BOSS_TIERS;
  if (total >= table.mastery) return 'mastery';
  if (total >= table.advanced) return 'advanced';
  if (total >= table.mvp) return 'mvp';
  return 'failed';
}

/**
 * `(bossId, difficulty)` бүлгийн ХАМГИЙН ӨНДӨР оноо (AC BSX-3; plan.md P-2).
 *
 * ⚠ ГАРГАГДАНА — `personalBests` талбар БАЙХГҮЙ. «Хэзээ ч буурахгүй» шинж нь
 * `max`-ийн шинж болж өөрөө батлагдана: муу оролдлого нэмэгдэх нь дээдийг хөдөлгөхгүй.
 */
export function personalBest(state: GameState, bossId: string, difficulty: DifficultyTier): number {
  let best = 0;
  for (const a of state.bossAttempts)
    if (a.bossId === bossId && a.difficulty === difficulty && a.total > best) best = a.total;
  return best;
}

/**
 * AC BS-3 — формат нь ЯГ энэ өгүүлбэр. «Failed» гэж ганцаар хэлэхийг хориглоно:
 * тоглогч дараагийн ажиллагаатай алхмыг уншина.
 * ⚠ Difficulty нь зөвлөмжийг ӨӨРЧЛӨХГҮЙ (AC BSX-5) — сул тал нь онооноос гарна,
 * хүндрэлээс биш.
 */
export function coachingMessage(scores: BossScores, pack: ContentPack, _state: GameState): string {
  // Тэнцвэл `BOSS_CATEGORIES`-ийн дарааллаар эхнийх — тогтвортой сонголт.
  let weakest: (typeof BOSS_CATEGORIES)[number] = BOSS_CATEGORIES[0];
  for (const category of BOSS_CATEGORIES) if (scores[category] < scores[weakest]) weakest = category;

  const tag = BOSS_CATEGORY_TAGS[weakest];
  const byTag = (want: string) =>
    pack.quests
      .filter((q) => q.track === 'side' && q.tags.some((t) => t === want))
      .sort((a, b) => a.world - b.world || (a.id < b.id ? -1 : 1))[0];

  const recommended =
    byTag(tag) ??
    (weakest === 'visualCraft' ? byTag('vfx') : undefined) ??
    pack.quests.filter((q) => q.track === 'side').sort((a, b) => (a.id < b.id ? -1 : 1))[0];

  const title = recommended?.title ?? 'any side quest';
  return `Attempt logged. Weakest category: ${BOSS_CATEGORY_LABELS[weakest]}. Recommended side quest: ${title}.`;
}

/**
 * Оролдлого бүр — тэнцсэн эсэхээс үл хамааран — түүхэнд ба replay-д бичигдэнэ
 * (AC BS-4, BSX-6).
 *
 * ⚠ Rematch нь ХЯЗГААРГҮЙ (AC BSX-4): cooldown БАЙХГҮЙ, boss-ийн ердийн
 * `staminaCost`-оос өөр нөөцийн хаалт БАЙХГҮЙ.
 * ⚠ `appendReplay`-ийн дуудлага нь бүх кодын бааз дээр ЭНЭ ГАНЦ газар (plan.md P-24).
 */
export function attemptBoss(state: GameState, input: BossInput, ctx: Ctx): DomainResult {
  const boss = ctx.pack.quests.find((q) => q.id === input.bossId);
  if (!boss || (boss.track !== 'boss' && boss.track !== 'raid'))
    return reject('INVALID_INPUT', `unknown boss ${input.bossId}`);

  const difficulty: DifficultyTier = input.difficulty ?? 'standard';
  if (!DIFFICULTIES.includes(difficulty))
    return reject('INVALID_INPUT', `unknown difficulty ${String(difficulty)}`);

  for (const category of BOSS_CATEGORIES) {
    const score = input.scores[category];
    if (!Number.isInteger(score) || score < 0 || score > 10)
      return reject('INVALID_INPUT', `${category} must be an integer in 0..10`);
  }

  const total = BOSS_CATEGORIES.reduce((sum, c) => sum + input.scores[c], 0);
  const tier = tierFor(total, difficulty);
  const attempt: BossAttempt = {
    bossId: boss.id,
    at: ctx.at,
    scores: input.scores,
    total,
    tier,
    difficulty,
  };

  const events: DomainEvent[] = [
    {
      type: 'BOSS_ATTEMPT_LOGGED',
      data: {
        bossId: boss.id,
        total,
        tier,
        difficulty,
        // AC BSX-3 — UI нь дээд амжилтыг дахин тооцохгүй, эндээс уншина.
        personalBest: Math.max(total, personalBest(state, boss.id, difficulty)),
        // AC BS-3 — унасан үед дасгалжуулах мессеж; тэнцсэн үед шаардлагагүй.
        ...(tier === 'failed' ? { message: coachingMessage(input.scores, ctx.pack, state) } : {}),
      },
    },
  ];

  let next: GameState = { ...state, bossAttempts: [...state.bossAttempts, attempt] };
  // ⚠ Оролдлого бүр (хоёр difficulty-д ч) бичигдэнэ — тэнцсэн эсэхээс үл хамааран.
  next = appendReplay(next, {
    at: ctx.at,
    kind: 'boss',
    refId: boss.id,
    outcome: tier === 'failed' ? 'failed' : 'passed',
  });

  if (tier !== 'failed' && !state.completedMainQuestIds.includes(boss.id)) {
    const awarded = addXp(next, boss.xp);
    if (!awarded.ok) return awarded;
    next = { ...awarded.state, completedMainQuestIds: [...awarded.state.completedMainQuestIds, boss.id] };
    events.push({ type: 'BOSS_PASSED', data: { bossId: boss.id, tier, total, difficulty } });
    events.push(...awarded.events);
  } else if (tier !== 'failed') {
    // Дахин тэнцэх нь 0 XP (AC BS-2) — hard mode ч гэсэн (шагнал нь cosmetic ба дээд амжилт).
    events.push({ type: 'BOSS_PASSED', data: { bossId: boss.id, tier, total, difficulty } });
  }

  const earned = evaluateAchievements(next, ctx.pack);
  if (earned.ids.length) {
    next = { ...next, achievementIds: [...next.achievementIds, ...earned.ids] };
    events.push(...earned.events);
  }

  return ok(next, events);
}
