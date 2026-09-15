import { describe, expect, it } from 'vitest';
import { pickDailyMission } from '@shared/core/dailyMission.ts';
import { freshState, quest, testPack } from './fixtures.ts';

const pack = testPack({
  quests: [
    quest({ id: 'm-1', track: 'main', world: 1 }),
    quest({ id: 'm-2', track: 'main', world: 2, prerequisites: ['m-1'] }),
    quest({ id: 'd-1', track: 'dungeon', world: 1 }),
    quest({ id: 's-1', track: 'side', world: 1, repeatable: true }),
    quest({ id: 's-2', track: 'side', world: 1, repeatable: true }),
    quest({ id: 'b-1', track: 'boss', type: 'boss', world: 1 }),
    quest({ id: 'r-1', track: 'raid', type: 'raid', world: 1 }),
  ],
});

describe('pickDailyMission (T-11)', () => {
  it('returns the same mission for the same date and state (DM-1)', () => {
    const state = freshState();
    expect(pickDailyMission(state, '2026-03-10', pack)).toBe(pickDailyMission(state, '2026-03-10', pack));
  });

  it('never selects a boss or raid (DM-2)', () => {
    for (let d = 1; d <= 28; d++) {
      const date = `2026-03-${String(d).padStart(2, '0')}`;
      const picked = pickDailyMission(freshState(), date, pack);
      expect(picked).not.toBe('b-1');
      expect(picked).not.toBe('r-1');
    }
  });

  it('prefers main quests over dungeons and side quests (DM-3)', () => {
    expect(pickDailyMission(freshState(), '2026-03-10', pack)).toBe('m-1');
  });

  it('falls through to a dungeon when no main quest is available (DM-3)', () => {
    const state = freshState({ completedMainQuestIds: ['m-1', 'm-2'] });
    expect(pickDailyMission(state, '2026-03-10', pack)).toBe('d-1');
  });

  it('falls through to a side quest when mains and dungeons are done (DM-3)', () => {
    const state = freshState({ completedMainQuestIds: ['m-1', 'm-2'], completedDungeonIds: ['d-1'] });
    expect(pickDailyMission(state, '2026-03-10', pack)).toMatch(/^s-/);
  });

  it('returns null when nothing is left to do (DM-3)', () => {
    const state = freshState({
      completedMainQuestIds: ['m-1', 'm-2'],
      completedDungeonIds: ['d-1'],
    });
    const soloSide = testPack({ quests: pack.quests.filter((q) => q.track !== 'side') });
    expect(pickDailyMission(state, '2026-03-10', soloSide)).toBeNull();
  });

  it('skips quests gated by level (DM-3)', () => {
    const gated = testPack({ quests: [quest({ id: 'm-hi', track: 'main', levelRequired: 8 })] });
    expect(pickDailyMission(freshState(), '2026-03-10', gated)).toBeNull();
  });

  it('skips quests whose prerequisites are unmet (DM-3)', () => {
    const gated = testPack({ quests: [quest({ id: 'm-2', track: 'main', prerequisites: ['m-1'] })] });
    expect(pickDailyMission(freshState(), '2026-03-10', gated)).toBeNull();
  });

  it('does not repeat yesterday’s mission while other candidates exist (DM-2)', () => {
    const state = freshState({
      completedMainQuestIds: ['m-1', 'm-2'],
      completedDungeonIds: ['d-1'],
      dailyMission: { questId: 's-1', date: '2026-03-09' },
    });
    expect(pickDailyMission(state, '2026-03-10', pack)).toBe('s-2');
  });

  it('repeats the only candidate rather than returning null (DM-2)', () => {
    const only = testPack({ quests: [quest({ id: 's-1', track: 'side', repeatable: true })] });
    const state = freshState({ dailyMission: { questId: 's-1', date: '2026-03-09' } });
    expect(pickDailyMission(state, '2026-03-10', only)).toBe('s-1');
  });

  it('ignores a non-repeatable side quest already completed (DM-3)', () => {
    const once = testPack({ quests: [quest({ id: 's-once', track: 'side', repeatable: false })] });
    const state = freshState({ sideQuestStats: { 's-once': { completions: 1, lastCompletedAt: null } } });
    expect(pickDailyMission(state, '2026-03-10', once)).toBeNull();
  });

  it('varies across dates rather than pinning one quest forever (DM-1)', () => {
    const state = freshState({ completedMainQuestIds: ['m-1', 'm-2'], completedDungeonIds: ['d-1'] });
    const picks = new Set(
      Array.from({ length: 28 }, (_, i) =>
        pickDailyMission(state, `2026-03-${String(i + 1).padStart(2, '0')}`, pack),
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
