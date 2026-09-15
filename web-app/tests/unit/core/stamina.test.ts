import { describe, expect, it } from 'vitest';
import { MAX_STAMINA, REST_AMOUNT } from '@shared/core/constants.ts';
import { rest, spendStamina } from '@shared/core/stamina.ts';
import { newGame } from '@shared/save/serialize.ts';

describe('stamina (T-07)', () => {
  it('starts a new game at 10/10 (STA-1)', () => {
    const state = newGame();
    expect(state.stamina).toBe(MAX_STAMINA);
    expect(state.maxStamina).toBe(MAX_STAMINA);
  });

  it('spends stamina and emits STAMINA_SPENT (STA-2)', () => {
    const result = spendStamina(newGame(), 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stamina).toBe(6);
    expect(result.events).toEqual([{ type: 'STAMINA_SPENT', data: { amount: 4, remaining: 6 } }]);
  });

  it('rejects a spend larger than the pool and leaves the state untouched (STA-2)', () => {
    const before = { ...newGame(), stamina: 2 };
    const result = spendStamina(before, 3);
    expect(result).toEqual({ ok: false, reason: 'INSUFFICIENT_STAMINA' });
    // ⚠ AC BE-11 — татгалзал нь төлөв БУЦААХГҮЙ; дуудагчийнх хэвээр.
    expect(before.stamina).toBe(2);
    expect('state' in result).toBe(false);
  });

  it('rejects non-integer or negative costs', () => {
    expect(spendStamina(newGame(), -1).ok).toBe(false);
    expect(spendStamina(newGame(), 1.5).ok).toBe(false);
  });

  it('allows a zero cost spend without an event', () => {
    const result = spendStamina(newGame(), 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stamina).toBe(MAX_STAMINA);
    expect(result.events).toEqual([]);
  });

  it('rests +3 and clamps at maxStamina (STA-3)', () => {
    const low = rest({ ...newGame(), stamina: 5 });
    expect(low.ok && low.state.stamina).toBe(5 + REST_AMOUNT);

    const near = rest({ ...newGame(), stamina: 8 });
    expect(near.ok && near.state.stamina).toBe(10);

    const full = rest({ ...newGame(), stamina: 10 });
    expect(full.ok && full.state.stamina).toBe(10);
  });

  it('reports the amount actually restored, not the nominal +3 (STA-3)', () => {
    const near = rest({ ...newGame(), stamina: 8 });
    expect(near.ok && near.events).toEqual([
      { type: 'STAMINA_RESTORED', data: { amount: 2, total: 10 } },
    ]);
  });

  it('emits no event when resting at full stamina', () => {
    const full = rest({ ...newGame(), stamina: 10 });
    expect(full.ok && full.events).toEqual([]);
  });
});
