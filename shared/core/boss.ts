/** Boss үнэлгээ ба дасгалжуулах мессеж (lld.md §5.4.10; AC BS-1…4). */
import type { BossAttempt, BossScores, ContentPack, DomainEvent, GameState } from '../types/index.ts';
import { evaluateAchievements } from './achievements.ts';
import {
  BOSS_CATEGORIES,
  BOSS_CATEGORY_LABELS,
  BOSS_CATEGORY_TAGS,
  BOSS_TIERS,
} from './constants.ts';
import { addXp } from './progression.ts';
import { ok, reject, type Ctx, type DomainResult } from './result.ts';

export type BossInput = { bossId: string; scores: BossScores };
export type BossTier = BossAttempt['tier'];

export function tierFor(total: number): BossTier {
  if (total >= BOSS_TIERS.mastery) return 'mastery';
  if (total >= BOSS_TIERS.advanced) return 'advanced';
  if (total >= BOSS_TIERS.mvp) return 'mvp';
  return 'failed';
}

/**
 * AC BS-3 — формат нь ЯГ энэ өгүүлбэр. «Failed» гэж ганцаар хэлэхийг хориглоно:
 * тоглогч дараагийн ажиллагаатай алхмыг уншина.
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

/** Оролдлого бүр — тэнцсэн эсэхээс үл хамааран — түүхэнд бичигдэнэ (AC BS-4). */
export function attemptBoss(state: GameState, input: BossInput, ctx: Ctx): DomainResult {
  const boss = ctx.pack.quests.find((q) => q.id === input.bossId);
  if (!boss || (boss.track !== 'boss' && boss.track !== 'raid'))
    return reject('INVALID_INPUT', `unknown boss ${input.bossId}`);

  for (const category of BOSS_CATEGORIES) {
    const score = input.scores[category];
    if (!Number.isInteger(score) || score < 0 || score > 10)
      return reject('INVALID_INPUT', `${category} must be an integer in 0..10`);
  }

  const total = BOSS_CATEGORIES.reduce((sum, c) => sum + input.scores[c], 0);
  const tier = tierFor(total);
  const attempt: BossAttempt = { bossId: boss.id, at: ctx.at, scores: input.scores, total, tier };

  const events: DomainEvent[] = [
    {
      type: 'BOSS_ATTEMPT_LOGGED',
      data: {
        bossId: boss.id,
        total,
        tier,
        // AC BS-3 — унасан үед дасгалжуулах мессеж; тэнцсэн үед шаардлагагүй.
        ...(tier === 'failed' ? { message: coachingMessage(input.scores, ctx.pack, state) } : {}),
      },
    },
  ];

  let next: GameState = { ...state, bossAttempts: [...state.bossAttempts, attempt] };

  if (tier !== 'failed' && !state.completedMainQuestIds.includes(boss.id)) {
    const awarded = addXp(next, boss.xp);
    if (!awarded.ok) return awarded;
    next = { ...awarded.state, completedMainQuestIds: [...awarded.state.completedMainQuestIds, boss.id] };
    events.push({ type: 'BOSS_PASSED', data: { bossId: boss.id, tier, total } });
    events.push(...awarded.events);
  } else if (tier !== 'failed') {
    // Дахин тэнцэх нь 0 XP (AC BS-2).
    events.push({ type: 'BOSS_PASSED', data: { bossId: boss.id, tier, total } });
  }

  const earned = evaluateAchievements(next, ctx.pack);
  if (earned.ids.length) {
    next = { ...next, achievementIds: [...next.achievementIds, ...earned.ids] };
    events.push(...earned.events);
  }

  return ok(next, events);
}
