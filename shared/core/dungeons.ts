/** Study Dungeon — tutorial ба mastery шалгалт (lld.md §5.4.5; AC DG-2, DG-3, DG-4). */
import type { ContentPack, DomainEvent, GameState, SkillTag } from '../types/index.ts';
import { evaluateAchievements } from './achievements.ts';
import { addMasteryXp } from './mastery.ts';
import { grantReputation } from './reputation.ts';
import { applyRewards, rollRewards } from './economy.ts';
import { addXp } from './progression.ts';
import { dayOf, ok, reject, type Ctx, type DomainResult } from './result.ts';
import { qualifyDay } from './streak.ts';

export type DungeonInput = { dungeonId: string; answers: number[] };

/**
 * `completedDungeonIds` ба `dungeonStats`-ыг ХАМТ бичих ЦОРЫН ГАНЦ зам (lld.md §6.8 · Δ-1).
 *
 * ⚠ Хоёр зам, нэг талбар: `attemptDungeon` ба `quests.ts`-ийн `track: 'dungeon'`
 * quest хоёулаа dungeon дуусгадаг. Хоёрын аль нэг нь `dungeonStats`-ыг бичихээ
 * мартвал `RET-4`-ийн refresher нь тухайн dungeon-ыг ХЭЗЭЭ Ч нэр дэвшүүлэхгүй —
 * тестээр барихад бэрх, чимээгүй алдаа. Сканнер (`architecture.test.ts`) нь
 * `dungeonStats:` бичилтийг зөвхөн ЭНЭ файл ба `saves.ts`-д зөвшөөрнө.
 * ⚠ `lastPassedDate` нь дахин тэнцэх БҮРД шинэчлэгдэнэ (XP 0 байсан ч): refresher нь
 * «хамгийн сүүлд хэзээ хүрсэн»-ийг хэмждэг, «анх хэзээ»-г биш (P-15).
 */
export function markDungeonPassed(state: GameState, dungeonId: string, at: string): GameState {
  const completedDungeonIds = state.completedDungeonIds.includes(dungeonId)
    ? state.completedDungeonIds
    : [...state.completedDungeonIds, dungeonId];
  return {
    ...state,
    completedDungeonIds,
    dungeonStats: { ...state.dungeonStats, [dungeonId]: { lastPassedDate: dayOf(at) } },
  };
}

type WrongAnswer = { questionId: string; chosen: number; correct: number; explanation: string };

/**
 * Tutorial нээх. Төлөв ӨӨРЧЛӨГДӨХГҮЙ, XP олгогдохгүй (AC DG-2).
 * Домэйнд байгаа шалтгаан: тэр амлалтыг МАШИНААР шалгах боломж (lld.md §5.4.5).
 */
export function openTutorial(state: GameState, dungeonId: string, pack: ContentPack): DomainResult {
  const dungeon = pack.dungeons.find((d) => d.id === dungeonId);
  if (!dungeon) return reject('INVALID_INPUT', `unknown dungeon ${dungeonId}`);
  return ok(state);
}

/**
 * Хамгийн олон буруу хариулт өгсөн tag-тай side quest-ийг зөвлөнө; олдохгүй бол
 * dungeon-ийн `conceptGoal`-ийг дахин үзэхийг санал болгоно (AC DG-4).
 */
function nextStepFor(tags: readonly SkillTag[], conceptGoal: string, pack: ContentPack): string {
  const candidates = pack.quests
    .filter((q) => q.track === 'side' && q.tags.some((t) => tags.includes(t)))
    .sort((a, b) => a.world - b.world || (a.id < b.id ? -1 : 1));
  return candidates[0]?.title ?? `Review the tutorials for: ${conceptGoal}`;
}

/**
 * Mastery оролдлого. УНАХ нь татгалзал БИШ — `ok:true` буцаана, тоглогч хязгааргүй
 * дахин оролдоно (AC DG-4). Тэнцэх нөхцөл нь бүхэл тооны арифметик (хөвөгч цэгийн
 * дугуйрлын алдаагүй): `correct * 10 >= total * 7`.
 */
export function attemptDungeon(state: GameState, input: DungeonInput, ctx: Ctx): DomainResult {
  const dungeon = ctx.pack.dungeons.find((d) => d.id === input.dungeonId);
  if (!dungeon) return reject('INVALID_INPUT', `unknown dungeon ${input.dungeonId}`);
  if (input.answers.length !== dungeon.questions.length)
    return reject('INVALID_INPUT', 'one answer per question is required');

  const wrong: WrongAnswer[] = [];
  let correct = 0;
  dungeon.questions.forEach((q, i) => {
    const chosen = input.answers[i]!;
    if (chosen === q.correctIndex) correct++;
    else wrong.push({ questionId: q.id, chosen, correct: q.correctIndex, explanation: q.explanation });
  });

  const passed = correct * 10 >= dungeon.questions.length * 7;

  if (!passed) {
    const wrongTags = dungeon.tags;
    return ok(state, [
      {
        type: 'DUNGEON_FAILED',
        data: {
          dungeonId: dungeon.id,
          correct,
          total: dungeon.questions.length,
          wrong,
          nextStep: nextStepFor(wrongTags, dungeon.conceptGoal, ctx.pack),
        },
      },
    ]);
  }

  const events: DomainEvent[] = [
    { type: 'DUNGEON_PASSED', data: { dungeonId: dungeon.id, correct, total: dungeon.questions.length } },
  ];

  // Дахин тэнцэх нь 0 XP (AC DG-3) — давтан бөглөх нь grind болохгүй.
  if (state.completedDungeonIds.includes(dungeon.id))
    return ok(markDungeonPassed(state, dungeon.id, ctx.at), events);

  const awarded = addXp(state, dungeon.xp);
  if (!awarded.ok) return awarded;
  let next: GameState = markDungeonPassed(awarded.state, dungeon.id, ctx.at);
  events.push(...awarded.events);

  // Mastery ба rep нь амжилтын үнэлгээнээс ӨМНӨ (plan.md §13.2).
  const mastery = addMasteryXp(next, dungeon.tags, dungeon.xp);
  next = mastery.state;
  events.push(...mastery.events);

  const reputation = grantReputation(next, dungeon.tags, 'dungeon', 1, ctx.pack);
  next = reputation.state;
  events.push(...reputation.events);

  const day = qualifyDay(next, ctx.at);
  next = { ...next, streak: day.streak, combo: day.combo };
  events.push(...day.events);

  const rewards = rollRewards(next, ctx);
  next = applyRewards(next, rewards);
  events.push(...rewards.events);

  const earned = evaluateAchievements(next, ctx.pack);
  if (earned.ids.length) {
    next = { ...next, achievementIds: [...next.achievementIds, ...earned.ids] };
    events.push(...earned.events);
  }

  return ok(next, events);
}
