/**
 * RET-7 — амжилтын шинэ предикатууд (T-17; plan.md P-23).
 *
 * ⚠ `ref` БАЙХГҮЙ = «ДУРЫН НЭГ» (нийлбэр БИШ). Энэ ялгаа нь чимээгүй эвдэрдэг
 * төрлийнх: нийлбэр гэж уншвал 7 track-ийн 1-1 prestige нь «3 удаа prestige»-ийг
 * хангах байсан. Тиймээс доор ХОЁУЛАНГ нь ил тулгав.
 */
import { describe, expect, it } from 'vitest';
import { evaluateAchievements } from '@shared/core/achievements.ts';
import { REP_THRESHOLDS } from '@shared/core/constants.ts';
import type { AchievementDefinition, ContentPack, GameState } from '@shared/types/index.ts';
import { freshState, testPack } from './fixtures.ts';

const def = (predicate: AchievementDefinition['predicate'], id = 'ach-x'): AchievementDefinition =>
  ({ id, title: 'A', description: 'd', predicate }) as AchievementDefinition;

const packOf = (...defs: AchievementDefinition[]): ContentPack =>
  testPack({ achievements: defs as unknown as ContentPack['achievements'] });

const earns = (state: GameState, predicate: AchievementDefinition['predicate']): boolean =>
  evaluateAchievements(state, packOf(def(predicate))).ids.includes('ach-x');

const track = (over: Partial<GameState['mastery'][string]> & { tag: string }): GameState['mastery'] => ({
  ...freshState().mastery,
  [over.tag]: { ...freshState().mastery[over.tag]!, ...over },
});

describe('RET-7 — masteryLevel (T-17)', () => {
  it('is satisfied when the named track reaches the level', () => {
    const state = { ...freshState(), mastery: track({ tag: 'audio', level: 5 }) };
    expect(earns(state, { kind: 'masteryLevel', value: 5, ref: 'audio' })).toBe(true);
  });

  it('is not satisfied one level short', () => {
    const state = { ...freshState(), mastery: track({ tag: 'audio', level: 4 }) };
    expect(earns(state, { kind: 'masteryLevel', value: 5, ref: 'audio' })).toBe(false);
  });

  it('does not accept a different track reaching the level', () => {
    const state = { ...freshState(), mastery: track({ tag: 'vfx', level: 9 }) };
    expect(earns(state, { kind: 'masteryLevel', value: 5, ref: 'audio' })).toBe(false);
  });

  it('accepts any one track when no ref is given', () => {
    const state = { ...freshState(), mastery: track({ tag: 'vfx', level: 7 }) };
    expect(earns(state, { kind: 'masteryLevel', value: 7 })).toBe(true);
  });
});

describe('RET-7 — prestigeCount (T-17)', () => {
  it('counts laps on the named track', () => {
    const state = { ...freshState(), mastery: track({ tag: 'blender', prestigeCount: 3 }) };
    expect(earns(state, { kind: 'prestigeCount', value: 3, ref: 'blender' })).toBe(true);
    expect(earns(state, { kind: 'prestigeCount', value: 4, ref: 'blender' })).toBe(false);
  });

  /** ⚠ `ref` байхгүй нь «дурын НЭГ track», бүх track-ийн НИЙЛБЭР БИШ. */
  it('does not add laps across tracks when no ref is given', () => {
    let mastery = freshState().mastery;
    for (const tag of ['audio', 'vfx', 'blender'] as const)
      mastery = { ...mastery, [tag]: { ...mastery[tag]!, prestigeCount: 1 } };
    const state = { ...freshState(), mastery };
    expect(earns(state, { kind: 'prestigeCount', value: 1 })).toBe(true);
    expect(earns(state, { kind: 'prestigeCount', value: 3 })).toBe(false);
  });
});

describe('RET-7 — guildRank (T-17)', () => {
  const withRep = (rep: Record<string, number>): GameState => ({ ...freshState(), reputation: rep });

  it.each([
    [REP_THRESHOLDS[0]! - 1, 1, false],
    [REP_THRESHOLDS[0]!, 1, true],
    [REP_THRESHOLDS[2]!, 3, true],
    [REP_THRESHOLDS[2]! - 1, 3, false],
    [REP_THRESHOLDS[3]!, 4, true],
  ])('rep %i meets rank %i → %s', (rep, rank, expected) => {
    expect(earns(withRep({ 'g-a': rep }), { kind: 'guildRank', value: rank, ref: 'g-a' })).toBe(expected);
  });

  it('does not accept another guild reaching the rank', () => {
    const state = withRep({ 'g-a': 0, 'g-b': 100 });
    expect(earns(state, { kind: 'guildRank', value: 4, ref: 'g-a' })).toBe(false);
  });

  it('accepts any guild when no ref is given', () => {
    const state = withRep({ 'g-a': 0, 'g-b': 100 });
    expect(earns(state, { kind: 'guildRank', value: 4 })).toBe(true);
  });
});

describe('RET-7 — bossPersonalBest (T-17)', () => {
  const attempt = (bossId: string, total: number, difficulty: 'standard' | 'hard') =>
    ({
      bossId,
      at: '2026-03-10T09:00:00Z',
      scores: { story: 0, editing: 0, camera: 0, visualCraft: 0, animation: 0, audioPost: 0 },
      total,
      tier: 'failed',
      difficulty,
    }) as unknown as GameState['bossAttempts'][number];

  it('is satisfied when the named boss was scored at or above the threshold', () => {
    const state = { ...freshState(), bossAttempts: [attempt('boss-a', 52, 'standard')] };
    expect(earns(state, { kind: 'bossPersonalBest', value: 52, ref: 'boss-a' })).toBe(true);
    expect(earns(state, { kind: 'bossPersonalBest', value: 53, ref: 'boss-a' })).toBe(false);
  });

  /** ⚠ P-23 — хоёр difficulty НЭГДСЭН багц: hard-аар авсан оноо мөн тоологдоно. */
  it('unions both difficulties', () => {
    const state = {
      ...freshState(),
      bossAttempts: [attempt('boss-a', 10, 'standard'), attempt('boss-a', 55, 'hard')],
    };
    expect(earns(state, { kind: 'bossPersonalBest', value: 55, ref: 'boss-a' })).toBe(true);
  });

  it('does not accept a different boss', () => {
    const state = { ...freshState(), bossAttempts: [attempt('boss-b', 60, 'standard')] };
    expect(earns(state, { kind: 'bossPersonalBest', value: 60, ref: 'boss-a' })).toBe(false);
    expect(earns(state, { kind: 'bossPersonalBest', value: 60 })).toBe(true);
  });
});

describe('RET-7 — chainsCompleted (T-17)', () => {
  it.each([
    [[], 1, false],
    [['c1'], 1, true],
    [['c1', 'c2'], 3, false],
    [['c1', 'c2', 'c3'], 3, true],
  ])('%j chains meets a threshold of %i → %s', (chains, value, expected) => {
    const state = { ...freshState(), completedChainIds: chains as string[] };
    expect(earns(state, { kind: 'chainsCompleted', value })).toBe(expected);
  });
});

describe('ACH-1 — the old guarantees survive the new kinds (T-17)', () => {
  it('never awards the same achievement twice', () => {
    const state = {
      ...freshState(),
      completedChainIds: ['c1'],
      achievementIds: ['ach-x'],
    };
    const result = evaluateAchievements(state, packOf(def({ kind: 'chainsCompleted', value: 1 })));
    expect(result.ids).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('awards several at once and names each in its event', () => {
    const state = { ...freshState(), completedChainIds: ['c1'], mastery: track({ tag: 'audio', level: 3 }) };
    const pack = packOf(
      def({ kind: 'chainsCompleted', value: 1 }, 'ach-chain'),
      def({ kind: 'masteryLevel', value: 3, ref: 'audio' }, 'ach-mastery'),
    );
    const result = evaluateAchievements(state, pack);
    expect(result.ids.sort()).toEqual(['ach-chain', 'ach-mastery']);
    expect(result.events.every((e) => e.type === 'ACHIEVEMENT_UNLOCKED')).toBe(true);
  });

  it('ignores an unknown predicate kind instead of throwing', () => {
    const state = freshState();
    expect(earns(state, { kind: 'vibes', value: 1 } as never)).toBe(false);
  });
});
