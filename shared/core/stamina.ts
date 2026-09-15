/** Stamina зарцуулалт ба амралт (lld.md §5.4.2; AC STA-1, STA-2, STA-3). */
import type { GameState } from '../types/index.ts';
import { REST_AMOUNT } from './constants.ts';
import { ok, reject, type DomainResult } from './result.ts';

/**
 * Stamina зарцуулна. Хүрэлцэхгүй бол `INSUFFICIENT_STAMINA` — төлөв БУЦААХГҮЙ
 * тул дуудагч өмнөхөө хэвээр хадгална (AC BE-11).
 */
export function spendStamina(state: GameState, cost: number): DomainResult {
  if (!Number.isInteger(cost) || cost < 0) return reject('INVALID_INPUT');
  if (cost === 0) return ok(state);
  if (state.stamina < cost) return reject('INSUFFICIENT_STAMINA');

  const stamina = state.stamina - cost;
  return ok({ ...state, stamina }, [
    { type: 'STAMINA_SPENT', data: { amount: cost, remaining: stamina } },
  ]);
}

/** `+REST_AMOUNT`, `maxStamina`-аар таслана (AC STA-3). Аль хэдийн дүүрэн бол event гарахгүй. */
export function rest(state: GameState): DomainResult {
  const stamina = Math.min(state.stamina + REST_AMOUNT, state.maxStamina);
  const restored = stamina - state.stamina;
  if (restored === 0) return ok(state);

  return ok({ ...state, stamina }, [
    { type: 'STAMINA_RESTORED', data: { amount: restored, total: stamina } },
  ]);
}
