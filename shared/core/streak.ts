/** Өдрийн streak ба combo (lld.md §5.4.8; AC ACH-2). */
import type { DomainEvent, GameState } from '../types/index.ts';
import { dayOf } from './result.ts';

/** `YYYY-MM-DD`-ийн өмнөх өдөр (UTC — A-LLD-6). */
function previousDay(day: string): string {
  const ms = Date.parse(`${day}T00:00:00Z`);
  return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

export type StreakOutcome = {
  streak: GameState['streak'];
  combo: number;
  events: DomainEvent[];
};

/**
 * Quest/dungeon дуусгах бүрд дуудагдана.
 *
 * ⚠ A-LLD-1 — `combo` = тухайн идэвхтэй өдрийн claim-ийн тоо. ЗӨВХӨН UI-д харагдана,
 * XP · stamina · unlock-д НӨЛӨӨЛӨХГҮЙ.
 */
export function qualifyDay(state: GameState, at: string): StreakOutcome {
  const day = dayOf(at);
  const { current, best, lastQualifiedDate } = state.streak;
  const events: DomainEvent[] = [];

  let nextCurrent: number;
  let nextCombo: number;

  if (lastQualifiedDate === day) {
    nextCurrent = current;
    nextCombo = state.combo + 1;
  } else if (lastQualifiedDate !== null && lastQualifiedDate === previousDay(day)) {
    nextCurrent = current + 1;
    nextCombo = 1;
    events.push({ type: 'STREAK_EXTENDED', data: { current: nextCurrent } });
  } else {
    if (current > 0) events.push({ type: 'STREAK_RESET', data: { previous: current } });
    nextCurrent = 1;
    nextCombo = 1;
    events.push({ type: 'STREAK_EXTENDED', data: { current: 1 } });
  }

  events.push({ type: 'COMBO_CHANGED', data: { combo: nextCombo } });

  return {
    // AC ACH-2 — `best` ХЭЗЭЭ Ч буурахгүй.
    streak: { current: nextCurrent, best: Math.max(best, nextCurrent), lastQualifiedDate: day },
    combo: nextCombo,
    events,
  };
}
