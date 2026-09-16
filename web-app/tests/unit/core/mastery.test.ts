/**
 * MST-1 · MST-3 — mastery track хөдөлгүүр (T-08).
 *
 * ⚠ Хамгийн эмзэг амлалт: XP нь ЗӨВХӨН заасан track-д очно. Нэвчилт нь тоглогчийн
 * хувьд мэдэгдэхгүй атлаа бүх prestige, capstone, амжилтын тооллыг хазайлгана —
 * тиймээс тест бүрд БУСАД 6 track-ийг бүтнээр тулгана.
 */
import { describe, expect, it } from 'vitest';
import { addMasteryXp, earnedMasteryPoints, prestigeMastery, trackOf } from '@shared/core/mastery.ts';
import { levelFor } from '@shared/core/progression.ts';
import {
  MASTERY_MAX_LEVEL,
  MASTERY_PRESTIGE_LEVEL,
  SKILL_TAGS,
  XP_THRESHOLDS,
} from '@shared/core/constants.ts';
import type { GameState, SkillTag } from '@shared/types/index.ts';
import { freshState } from './fixtures.ts';

const withTrack = (tag: SkillTag, over: { xp?: number; level?: number; prestigeCount?: number }): GameState => {
  const base = freshState();
  return {
    ...base,
    mastery: { ...base.mastery, [tag]: { ...base.mastery[tag]!, ...over } },
  };
};

const others = (state: GameState, tag: SkillTag) =>
  Object.fromEntries(Object.entries(state.mastery).filter(([k]) => k !== tag));

describe('MST-1 — a track levels on the same xp table as the character (T-08)', () => {
  it('starts every track at level 1 with no xp', () => {
    const state = freshState();
    expect(Object.keys(state.mastery)).toHaveLength(SKILL_TAGS.length);
    for (const tag of SKILL_TAGS) expect(state.mastery[tag]).toEqual({ tag, xp: 0, level: 1, prestigeCount: 0 });
  });

  it.each(SKILL_TAGS)('uses the character xp thresholds for %s', (tag) => {
    for (const threshold of XP_THRESHOLDS) {
      const { state } = addMasteryXp(freshState(), [tag], threshold);
      expect(state.mastery[tag]!.level).toBe(levelFor(threshold));
    }
  });

  it('caps a track at level 10 no matter how much xp arrives', () => {
    const { state } = addMasteryXp(freshState(), ['vfx'], 1_000_000);
    expect(state.mastery.vfx!.level).toBe(MASTERY_MAX_LEVEL);
  });

  it('adds the awarded xp to every tag the content carries — not a split share (A4)', () => {
    const { state } = addMasteryXp(freshState(), ['audio', 'storytelling'], 60);
    expect(state.mastery.audio!.xp).toBe(60);
    expect(state.mastery.storytelling!.xp).toBe(60);
  });

  it('never leaks xp into a track that was not named', () => {
    const before = freshState();
    const { state } = addMasteryXp(before, ['blender'], 900);
    expect(others(state, 'blender')).toEqual(others(before, 'blender'));
  });

  it('is a no-op for zero or negative xp', () => {
    const before = freshState();
    expect(addMasteryXp(before, ['blender'], 0).state.mastery).toEqual(before.mastery);
    expect(addMasteryXp(before, ['blender'], -50).state.mastery).toEqual(before.mastery);
    expect(addMasteryXp(before, [], 100).state.mastery).toEqual(before.mastery);
  });

  it('never mutates the state it was handed', () => {
    const before = freshState();
    addMasteryXp(before, ['audio'], 500);
    expect(before.mastery.audio!.xp).toBe(0);
  });
});

describe('MST-4 — a mastery level-up grants exactly one mastery point (T-08)', () => {
  it('grants one point per level crossed', () => {
    const { state, events } = addMasteryXp(freshState(), ['animation'], XP_THRESHOLDS[2]!);
    const gained = levelFor(XP_THRESHOLDS[2]!) - 1;
    expect(state.masteryPoints).toBe(gained);
    expect(events.filter((e) => e.type === 'MASTERY_LEVEL_UP')).toHaveLength(gained);
  });

  it('emits one MASTERY_LEVEL_UP per level with the tag and new level', () => {
    const { events } = addMasteryXp(freshState(), ['audio'], XP_THRESHOLDS[1]!);
    const levels = events
      .filter((e) => e.type === 'MASTERY_LEVEL_UP')
      .map((e) => [e.data?.tag, e.data?.level]);
    expect(levels).toEqual([
      ['audio', 2],
      ['audio', 3],
    ]);
  });

  it('emits no level-up event when the level does not change', () => {
    const { events } = addMasteryXp(freshState(), ['audio'], 10);
    expect(events).toEqual([]);
  });

  it('accumulates points across separate tracks', () => {
    let state = freshState();
    state = addMasteryXp(state, ['audio'], XP_THRESHOLDS[0]!).state;
    state = addMasteryXp(state, ['vfx'], XP_THRESHOLDS[0]!).state;
    expect(state.masteryPoints).toBe(2);
  });

  /** ⚠ P-20 — олдсон НИЙТ нь хадгалагдахгүй, ГАРГАГДАНА. */
  it('derives the earned total from levels and prestige counts', () => {
    const state = withTrack('blender', { level: 4, prestigeCount: 2 });
    expect(earnedMasteryPoints(state)).toBe(3 + 2 * 9);
  });

  it('keeps remainder + spent = earned when nothing has been spent', () => {
    const { state } = addMasteryXp(freshState(), ['cinematography'], XP_THRESHOLDS[3]!);
    expect(state.masteryPoints).toBe(earnedMasteryPoints(state));
  });
});

describe('MST-3 — prestige only at level 10, and it never takes points back (T-08)', () => {
  it('resets xp and level, and raises prestigeCount', () => {
    const state = withTrack('storytelling', { xp: 9000, level: MASTERY_PRESTIGE_LEVEL });
    const result = prestigeMastery(state, 'storytelling');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.mastery.storytelling).toEqual({
      tag: 'storytelling',
      xp: 0,
      level: 1,
      prestigeCount: 1,
    });
  });

  it('emits MASTERY_PRESTIGED with the tag and the new count', () => {
    const state = withTrack('storytelling', { xp: 9000, level: 10, prestigeCount: 2 });
    const result = prestigeMastery(state, 'storytelling');
    expect(result.ok && result.events).toEqual([
      { type: 'MASTERY_PRESTIGED', data: { tag: 'storytelling', prestigeCount: 3 } },
    ]);
  });

  it.each([1, 5, 9])('rejects PREREQ_NOT_MET at level %i and leaves the state untouched', (level) => {
    const state = withTrack('vfx', { xp: 1000, level });
    const result = prestigeMastery(state, 'vfx');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('PREREQ_NOT_MET');
    // ⚠ `ok:false` үед `state` БУЦАХГҮЙ — дуудагч өмнөхөө хэвээр хадгална.
    expect('state' in result).toBe(false);
  });

  it('rejects an unknown tag as INVALID_INPUT', () => {
    const result = prestigeMastery(freshState(), 'not-a-tag' as SkillTag);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_INPUT');
  });

  it('leaves the other six tracks untouched', () => {
    const before = withTrack('audio', { xp: 9000, level: 10 });
    const result = prestigeMastery(before, 'audio');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(others(result.state, 'audio')).toEqual(others(before, 'audio'));
  });

  it('never lowers prestigeCount and never refunds earned points', () => {
    const before = withTrack('audio', { xp: 9000, level: 10, prestigeCount: 4 });
    const earnedBefore = earnedMasteryPoints(before);
    const result = prestigeMastery(before, 'audio');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.mastery.audio!.prestigeCount).toBe(5);
    expect(result.state.masteryPoints).toBe(before.masteryPoints);
    // Prestige нь level 10 → 1 болгоно (−9) ба prestigeCount +1 (+9): нийт ХӨДӨЛӨХГҮЙ.
    expect(earnedMasteryPoints(result.state)).toBe(earnedBefore);
  });

  it('can prestige the same track repeatedly, counting every lap', () => {
    let state = withTrack('vfx', { xp: 9000, level: 10 });
    for (let lap = 1; lap <= 3; lap++) {
      const result = prestigeMastery(state, 'vfx');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.mastery.vfx!.prestigeCount).toBe(lap);
      state = { ...result.state, mastery: { ...result.state.mastery, vfx: { ...result.state.mastery.vfx!, xp: 9000, level: 10 } } };
    }
  });
});

/**
 * Хянагчийн барьсан зөрүү — `lld.md §6.1`-ийн ХИЛИЙН хоёр шийдвэр кодод байгаагүй.
 */
describe('§6.1 — level 10 freezes xp, and trackOf is the single read path', () => {
  it('stops accumulating xp once a track is at MASTERY_MAX_LEVEL', () => {
    const capped = withTrack('audio', { xp: XP_THRESHOLDS[XP_THRESHOLDS.length - 1]!, level: MASTERY_MAX_LEVEL });
    const after = addMasteryXp(capped, ['audio'], 5000);

    expect(after.state.mastery.audio!.xp).toBe(capped.mastery.audio!.xp);
    expect(after.state.mastery.audio!.level).toBe(MASTERY_MAX_LEVEL);
    expect(after.events).toEqual([]);
    expect(after.state.masteryPoints).toBe(capped.masteryPoints);
  });

  it('never reports a level above the cap even when a single award crosses many thresholds', () => {
    const after = addMasteryXp(freshState(), ['vfx'], 100_000);
    expect(after.state.mastery.vfx!.level).toBe(MASTERY_MAX_LEVEL);
    expect(after.state.masteryPoints).toBe(MASTERY_MAX_LEVEL - 1);
  });

  it('lets prestige restart a frozen track without the player losing banked points (MST-3)', () => {
    const capped = withTrack('audio', { xp: XP_THRESHOLDS[XP_THRESHOLDS.length - 1]!, level: MASTERY_MAX_LEVEL });
    const before = earnedMasteryPoints(capped);
    const after = prestigeMastery(capped, 'audio');
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(earnedMasteryPoints(after.state)).toBe(before);
  });

  it('trackOf returns a default track for a key the state has never seen (A-LLD2-1)', () => {
    const bare = { ...freshState(), mastery: {} } as unknown as GameState;
    expect(trackOf(bare, 'blender')).toEqual({ tag: 'blender', xp: 0, level: 1, prestigeCount: 0 });
  });

  it('trackOf returns the stored track when it exists', () => {
    const state = withTrack('blender', { xp: 300, level: 3, prestigeCount: 1 });
    expect(trackOf(state, 'blender')).toEqual({ tag: 'blender', xp: 300, level: 3, prestigeCount: 1 });
  });

});
