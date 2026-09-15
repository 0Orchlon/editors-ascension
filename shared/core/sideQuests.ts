/** Side quest давтан XP буурал (lld.md §5.4.4; AC SQ-2, SQ-5). */
import { DEFAULT_REPEAT_XP_MULTIPLIER, SIDE_QUEST_XP_FLOOR_RATIO } from './constants.ts';

/**
 * `n` дэх гүйцэтгэлийн XP = `max(ceil(base*0.1), floor(base * m^(n-1)))`.
 *
 * ⚠ `spec.md SQ-2`-ийн жишээ дараалал n=4 дээр арифметик алдаатай (lld.md §10.1) —
 * ТОМЬЁО эрх бүхий: base=40 → `40, 20, 10, 5, 4, 4`.
 */
export function sideQuestXp(
  baseXp: number,
  n: number,
  m: number = DEFAULT_REPEAT_XP_MULTIPLIER,
): number {
  const repeat = Math.max(1, Math.floor(n));
  const floor = Math.ceil(baseXp * SIDE_QUEST_XP_FLOOR_RATIO);
  return Math.max(floor, Math.floor(baseXp * m ** (repeat - 1)));
}
