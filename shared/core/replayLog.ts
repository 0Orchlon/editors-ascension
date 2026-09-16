/**
 * Тоглолтын түүхийн ГАНЦ бичигч (AC SVX-2; plan.md P-10).
 *
 * ⚠ 500-ийн FIFO таслалт нь ЗӨВХӨН энд байна. Дуудагч тус бүрд хуулбарлавал нэг нь
 * таслалтыг мартаж save хязгааргүй хавдана — хожим олдох төрлийн зөрчил.
 * ⚠ Энэ ажилд дуудагч нь ГАНЦ: `boss.ts → attemptBoss` (plan.md P-24). `kind`-ийн
 * бусад утга нь схем эвдэлгүй хожим дүүргэгдэх зай.
 * ⚠ spec.md D-6 — `replayLog` нь ямар ч нээлт, XP, оноонд НӨЛӨӨЛӨХГҮЙ.
 */
import type { GameState, ReplayLogEntry } from '../types/index.ts';
import { REPLAY_LOG_CAP } from './constants.ts';

/** Цэвэр: төлвийг мутацлахгүй, шинэ `GameState` буцаана. */
export function appendReplay(state: GameState, entry: ReplayLogEntry): GameState {
  const next = [...state.replayLog, entry];
  // Хамгийн ХУУЧИН нь хасагдана — тоглогчийн сүүлийн үеийн түүх үргэлж үлдэнэ.
  const trimmed = next.length > REPLAY_LOG_CAP ? next.slice(next.length - REPLAY_LOG_CAP) : next;
  return { ...state, replayLog: trimmed };
}
