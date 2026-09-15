/** Өдрийн streak ба combo (lld.md §5.4.8; AC ACH-2). */
import type { DomainEvent, GameState } from '../types/index.ts';
import { dayOf } from './result.ts';

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * `YYYY-MM-DD`-ийн өмнөх өдөр (UTC — A-LLD-6).
 *
 * ⚠ `Date` ашиглахгүй: `shared/core` нь цагийн API-гүй байх ёстой (plan.md P-5,
 * `architecture.test.ts` шалгана). Энэ нь цэвэр календарийн арифметик.
 */
function previousDay(day: string): string {
  let [y, m, d] = day.split('-').map(Number) as [number, number, number];
  d -= 1;
  if (d === 0) {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    d = m === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[m - 1]!;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
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
