import { describe, expect, it } from 'vitest';
import { maybeEncounter, resolveEncounter } from '@shared/core/encounters.ts';
import { rollRewards } from '@shared/core/economy.ts';
import { createRng } from '@shared/core/rng.ts';
import { newGame } from '@shared/save/serialize.ts';
import type { Ctx } from '@shared/core/result.ts';
import type { ContentPack } from '@shared/types/index.ts';

const pack = {
  version: 'test',
  quests: [],
  dungeons: [],
  skills: [],
  achievements: [],
  encounters: [
    { id: 'enc-b', title: 'B', body: 'b', callToAction: 'do b', maxMinutes: 2, weight: 1 },
    { id: 'enc-a', title: 'A', body: 'a', callToAction: 'do a', maxMinutes: 1, weight: 1 },
  ],
  loot: [
    { id: 'loot-a', title: 'A', rarity: 'common', effect: 'cosmetic' },
    { id: 'loot-b', title: 'B', rarity: 'rare', effect: 'cosmetic' },
  ],
} as unknown as ContentPack;

const ctxWith = (rng: () => number): Ctx => ({ pack, at: '2026-01-01T00:00:00Z', rng });
/** Тогтсон дараалал — хилийн утгыг яг хаана унахыг нь заана. */
const scripted = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('encounters (T-12)', () => {
  it('rolls nothing when the die is above the chance threshold (ENC-2)', () => {
    expect(maybeEncounter(newGame(), ctxWith(scripted([0.99])))).toEqual([]);
  });

  it('emits at most one encounter per call (ENC-2)', () => {
    const events = maybeEncounter(newGame(), ctxWith(scripted([0.01, 0.5])));
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('ENCOUNTER_TRIGGERED');
  });

  it('is deterministic for the same seed (ENC-2)', () => {
    const a = maybeEncounter(newGame(), ctxWith(createRng(42)));
    const b = maybeEncounter(newGame(), ctxWith(createRng(42)));
    expect(a).toEqual(b);
  });

  it('ignores catalogue file order when picking (ENC-2)', () => {
    // enc-a нь файлд ХОЁРДУГААРТ байгаа ч id-аар эрэмбэлбэл эхнийх.
    const events = maybeEncounter(newGame(), ctxWith(scripted([0.01, 0.0])));
    expect(events[0]!.data).toMatchObject({ encounterId: 'enc-a', callToAction: 'do a' });
  });

  it('resolving an unknown encounter is rejected', () => {
    expect(resolveEncounter(newGame(), 'nope', ctxWith(createRng(1))).ok).toBe(false);
  });

  it('resolving a known encounter grants coins only (EC-1)', () => {
    const before = newGame();
    const result = resolveEncounter(before, 'enc-a', ctxWith(createRng(1)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.coins).toBeGreaterThan(before.coins);
    expect(result.state.xp).toBe(before.xp);
    expect(result.state.stamina).toBe(before.stamina);
  });
});

describe('economy (T-12)', () => {
  it('always grants coins in the documented 5..10 band', () => {
    for (const roll of [0, 0.5, 0.999]) {
      const { coins } = rollRewards(newGame(), ctxWith(scripted([roll])));
      expect(coins).toBeGreaterThanOrEqual(5);
      expect(coins).toBeLessThanOrEqual(10);
    }
  });

  it('drops loot when the die is under the loot chance', () => {
    const { lootId, events } = rollRewards(newGame(), ctxWith(scripted([0.5, 0.01, 0.0])));
    expect(lootId).toBe('loot-a');
    expect(events.map((e) => e.type)).toContain('LOOT_DROPPED');
  });

  it('never drops a duplicate that is already in the inventory (EC-2)', () => {
    const held = { ...newGame(), inventory: ['loot-a'] };
    const { lootId } = rollRewards(held, ctxWith(scripted([0.5, 0.01, 0.0])));
    expect(lootId).not.toBe('loot-a');
  });

  it('drops nothing once every item is already owned (EC-2)', () => {
    const held = { ...newGame(), inventory: ['loot-a', 'loot-b'] };
    const { lootId, events } = rollRewards(held, ctxWith(scripted([0.5, 0.01, 0.0])));
    expect(lootId).toBeNull();
    expect(events.map((e) => e.type)).not.toContain('LOOT_DROPPED');
  });

  it('is deterministic for the same seed (EC-2)', () => {
    const a = rollRewards(newGame(), ctxWith(createRng(7)));
    const b = rollRewards(newGame(), ctxWith(createRng(7)));
    expect(a).toEqual(b);
  });
});
