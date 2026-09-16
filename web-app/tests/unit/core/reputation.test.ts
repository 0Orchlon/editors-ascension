/**
 * RET-5 · RET-6 — guild reputation хөдөлгүүр (T-11; plan.md §12.3).
 *
 * ⚠ Rep нь ЗӨВХӨН өснө. Бууралт, зарцуулалт БАЙХГҮЙ — тиймээс «хэзээ ч буурахгүй»
 * шинжийг санамсаргүй дараалал дээр гүйлгэж баталсан тест бий.
 * ⚠ tag → guild зураглал нь КОНТЕНТООС (plan.md P-13) — кодод хатуу бичигдвэл
 * guild-ийн нэр солиход домэйн эвдэрнэ.
 */
import { describe, expect, it } from 'vitest';
import { grantReputation, guildFor, rankOf, repAward } from '@shared/core/reputation.ts';
import { REP_BASE, REP_THRESHOLDS } from '@shared/core/constants.ts';
import { buildPack } from '@shared/content/index.ts';
import type { GameState } from '@shared/types/index.ts';
import { freshState } from './fixtures.ts';

const pack = buildPack();
const base = (): GameState => ({
  ...freshState(),
  reputation: Object.fromEntries(pack.guilds.map((g) => [g.id, 0])),
});

describe('RET-5 — the tag to guild map comes from content (T-11)', () => {
  it('resolves every skill tag to exactly one guild', () => {
    for (const g of pack.guilds) for (const t of g.tags) expect(guildFor(t, pack)).toBe(g.id);
  });

  it('returns null for a tag no guild claims', () => {
    expect(guildFor('not-a-tag' as never, pack)).toBeNull();
  });
});

describe('RET-6 — rank is the count of thresholds passed (T-11)', () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [24, 1],
    [25, 2],
    [49, 2],
    [50, 3],
    [99, 3],
    [100, 4],
    [10_000, 4],
  ])('maps %i rep to rank %i', (rep, rank) => {
    expect(rankOf(rep)).toBe(rank);
  });

  it('never exceeds the number of thresholds', () => {
    expect(rankOf(Number.MAX_SAFE_INTEGER)).toBe(REP_THRESHOLDS.length);
  });
});

describe('RET-5 — the award table (plan.md P-16 · H-5) (T-11)', () => {
  it.each([
    ['main', 1, 3],
    ['boss', 1, 3],
    ['dungeon', 1, 2],
    ['side', 1, 2],
  ] as const)('gives %s content on completion %i an award of %i', (track, n, expected) => {
    expect(repAward(track, n)).toBe(expected);
  });

  /** ⚠ SQ-2-ийн буурах хуваарь: side нь `2 · 1 · 0 · 0 …` — grind тэгд нийлнэ. */
  it('follows the diminishing schedule for repeated side quests', () => {
    expect([1, 2, 3, 4, 5].map((n) => repAward('side', n))).toEqual([2, 1, 0, 0, 0]);
  });

  it('keeps every positive award inside 1..3 (RET-5)', () => {
    const awards: number[] = [];
    for (const track of ['main', 'boss', 'dungeon', 'side'] as const)
      for (let n = 1; n <= 8; n++) awards.push(repAward(track, n));
    expect(awards.filter((a) => a > 0).every((a) => a >= 1 && a <= 3)).toBe(true);
  });

  it('honours a content-specific repeat multiplier', () => {
    // m = 1 бол бууралт байхгүй — давтагдах контентын онцгой тохиолдол.
    expect([1, 2, 3].map((n) => repAward('side', n, 1))).toEqual([2, 2, 2]);
  });

  it('keeps the base table in step with the constant', () => {
    expect(REP_BASE).toEqual({ main: 3, boss: 3, dungeon: 2, side: 2 });
  });
});

describe('RET-5 — granting reputation (T-11)', () => {
  it('credits the guild that owns the tag', () => {
    const guild = guildFor('audio', pack)!;
    const { state, events } = grantReputation(base(), ['audio'], 'main', 1, pack);
    expect(state.reputation[guild]).toBe(3);
    expect(events).toEqual([
      { type: 'REPUTATION_GAINED', data: { guildId: guild, amount: 3, total: 3, rank: 0 } },
    ]);
  });

  it('credits two guilds when the content carries tags from both', () => {
    const { state } = grantReputation(base(), ['audio', 'storytelling'], 'main', 1, pack);
    expect(state.reputation[guildFor('audio', pack)!]).toBe(3);
    expect(state.reputation[guildFor('storytelling', pack)!]).toBe(3);
  });

  it('credits a guild once when two tags of the content share it', () => {
    const shared = pack.guilds.find((g) => g.tags.length >= 2)!;
    const { state, events } = grantReputation(base(), shared.tags.slice(0, 2), 'main', 1, pack);
    expect(state.reputation[shared.id]).toBe(3);
    expect(events).toHaveLength(1);
  });

  /** ⚠ Давтагдахгүй контент нь n = 1 ХЭВЭЭР дуудагдана — дуудагч тоолуурыг дамжуулна. */
  it('gives nothing when the diminishing award reaches zero', () => {
    const before = base();
    const { state, events } = grantReputation(before, ['audio'], 'side', 3, pack);
    expect(state.reputation).toEqual(before.reputation);
    expect(events).toEqual([]);
  });

  it('reports the rank reached in the event', () => {
    const guild = guildFor('audio', pack)!;
    const start = { ...base(), reputation: { ...base().reputation, [guild]: 24 } };
    const { events } = grantReputation(start, ['audio'], 'main', 1, pack);
    expect(events[0]!.data).toEqual({ guildId: guild, amount: 3, total: 27, rank: 2 });
  });

  it('ignores tags that belong to no guild instead of inventing an entry', () => {
    const before = base();
    const { state, events } = grantReputation(before, ['not-a-tag' as never], 'main', 1, pack);
    expect(state.reputation).toEqual(before.reputation);
    expect(events).toEqual([]);
  });

  it('never mutates the state it was handed', () => {
    const before = base();
    grantReputation(before, ['audio'], 'main', 1, pack);
    expect(Object.values(before.reputation).every((v) => v === 0)).toBe(true);
  });

  /** ⚠ «Rep хэзээ ч буурахгүй» — бүх track × 1..6 гүйцэтгэлийн дарааллаар гүйлгэсэн. */
  it('never lowers a reputation value across a long mixed sequence', () => {
    let state = base();
    let previous = { ...state.reputation };
    for (const track of ['main', 'boss', 'dungeon', 'side'] as const)
      for (let n = 1; n <= 6; n++)
        for (const tag of ['audio', 'storytelling', 'blender', 'vfx', 'video-editing'] as const) {
          state = grantReputation(state, [tag], track, n, pack).state;
          for (const [id, value] of Object.entries(state.reputation))
            expect(value).toBeGreaterThanOrEqual(previous[id]!);
          previous = { ...state.reputation };
        }
    expect(Object.values(state.reputation).every((v) => v > 0)).toBe(true);
  });

  it('touches nothing but reputation — no xp, coins, stamina or inventory (D-6)', () => {
    const before = base();
    const { state } = grantReputation(before, ['audio'], 'main', 1, pack);
    expect({ ...state, reputation: before.reputation }).toEqual(before);
  });
});
