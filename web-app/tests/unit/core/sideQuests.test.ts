import { describe, expect, it } from 'vitest';
import { DEFAULT_REPEAT_XP_MULTIPLIER } from '@shared/core/constants.ts';
import { sideQuestXp } from '@shared/core/sideQuests.ts';

describe('sideQuestXp (T-09)', () => {
  /**
   * ⚠ lld.md §5.4.4 — `spec.md SQ-2`-ийн жишээ (`…,4,4,4`) нь n=4 дээр арифметик
   * алдаатай. ТОМЬЁО эрх бүхий: max(ceil(40*0.1), floor(40*0.5^3)) = max(4,5) = 5.
   */
  it('decays by the multiplier and floors at 10% of base (SQ-2, SQ-5)', () => {
    const got = [1, 2, 3, 4, 5, 6].map((n) => sideQuestXp(40, n));
    expect(got).toEqual([40, 20, 10, 5, 4, 4]);
  });

  it('never drops below the 10% floor no matter how many repeats', () => {
    expect(sideQuestXp(40, 50)).toBe(4);
    expect(sideQuestXp(100, 99)).toBe(10);
  });

  it('rounds the floor up so a cheap quest still pays at least 1 xp', () => {
    expect(sideQuestXp(5, 99)).toBe(1);
    expect(sideQuestXp(1, 99)).toBe(1);
  });

  it('honours a per-quest multiplier override', () => {
    expect(sideQuestXp(100, 2, 0.25)).toBe(25);
    expect(sideQuestXp(100, 2)).toBe(100 * DEFAULT_REPEAT_XP_MULTIPLIER);
  });

  it('treats the first completion as full price', () => {
    expect(sideQuestXp(37, 1)).toBe(37);
  });

  it('clamps a nonsensical completion index to the first completion', () => {
    expect(sideQuestXp(40, 0)).toBe(40);
    expect(sideQuestXp(40, -3)).toBe(40);
  });
});
