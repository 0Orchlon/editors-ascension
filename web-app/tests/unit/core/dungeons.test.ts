import { describe, expect, it } from 'vitest';
import { attemptDungeon, openTutorial } from '@shared/core/dungeons.ts';
import type { DungeonDefinition } from '@shared/types/index.ts';
import { freshState, quest, quietCtx, testPack } from './fixtures.ts';

const question = (id: string, correctIndex: number) => ({
  id,
  prompt: `p-${id}`,
  options: ['a', 'b', 'c'],
  correctIndex,
  explanation: `Because ${id} works this way.`,
});

const dungeon = (over: Partial<DungeonDefinition>): DungeonDefinition =>
  ({
    id: 'dg',
    title: 'D',
    conceptGoal: 'Understand cuts',
    estimatedMinutes: 20,
    xp: 30,
    tags: ['video-editing'],
    tutorialRefs: [{ title: 't', url: 'https://example.com/t', minutes: 8 }],
    questions: [question('q1', 0)],
    ...over,
  }) as DungeonDefinition;

/** 10 асуулт — 70% хилийг бутархайгүй шалгах боломж өгнө. */
const tenQuestions = Array.from({ length: 10 }, (_, i) => question(`q${i}`, 0));

const pack = testPack({
  dungeons: [
    dungeon({ id: 'dg-1' }),
    dungeon({ id: 'dg-10', questions: tenQuestions, tags: ['blender'] }),
  ],
  quests: [
    quest({ id: 'sq-blender', track: 'side', tags: ['blender'], title: 'Blender Drill' }),
    quest({ id: 'sq-edit', track: 'side', tags: ['video-editing'], title: 'Edit Drill' }),
  ],
});

const answersWith = (correct: number): number[] =>
  Array.from({ length: 10 }, (_, i) => (i < correct ? 0 : 1));

describe('openTutorial (T-10)', () => {
  it('grants no xp and does not change the state (DG-2)', () => {
    const before = freshState();
    const result = openTutorial(before, 'dg-1', pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.xp).toBe(0);
    expect(result.state).toEqual(before);
  });

  it('rejects an unknown dungeon', () => {
    expect(openTutorial(freshState(), 'nope', pack).ok).toBe(false);
  });
});

describe('attemptDungeon (T-10)', () => {
  it('rejects an answer count that does not match the questions', () => {
    const r = attemptDungeon(freshState(), { dungeonId: 'dg-10', answers: [0] }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('fails just below the 70% mastery bar (DG-3)', () => {
    const r = attemptDungeon(freshState(), { dungeonId: 'dg-10', answers: answersWith(6) }, quietCtx(pack));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.events.map((e) => e.type)).toContain('DUNGEON_FAILED');
    expect(r.state.xp).toBe(0);
    expect(r.state.completedDungeonIds).toEqual([]);
  });

  it('passes exactly at the 70% mastery bar (DG-3)', () => {
    const r = attemptDungeon(freshState(), { dungeonId: 'dg-10', answers: answersWith(7) }, quietCtx(pack));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.events.map((e) => e.type)).toContain('DUNGEON_PASSED');
    expect(r.state.xp).toBe(30);
    expect(r.state.completedDungeonIds).toEqual(['dg-10']);
  });

  it('awards zero xp when re-passing an already cleared dungeon (DG-3)', () => {
    const state = freshState({ completedDungeonIds: ['dg-10'] });
    const r = attemptDungeon(state, { dungeonId: 'dg-10', answers: answersWith(10) }, quietCtx(pack));
    expect(r.ok && r.state.xp).toBe(0);
    expect(r.ok && r.events.map((e) => e.type)).toContain('DUNGEON_PASSED');
    expect(r.ok && r.events.map((e) => e.type)).not.toContain('XP_GAINED');
  });

  /** AC DG-4 — унах нь ТАТГАЛЗАЛ БИШ: хязгааргүй дахин оролдоно. */
  it('reports a failure as ok:true so retries stay unlimited (DG-4)', () => {
    const r = attemptDungeon(freshState(), { dungeonId: 'dg-10', answers: answersWith(0) }, quietCtx(pack));
    expect(r.ok).toBe(true);
  });

  it('explains every wrong answer instead of only saying "Failed" (DG-4)', () => {
    const r = attemptDungeon(freshState(), { dungeonId: 'dg-10', answers: answersWith(6) }, quietCtx(pack));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const failure = r.events.find((e) => e.type === 'DUNGEON_FAILED');
    const wrong = failure?.data?.wrong as { questionId: string; chosen: number; correct: number; explanation: string }[];
    expect(wrong).toHaveLength(4);
    for (const item of wrong) {
      expect(item.explanation.length).toBeGreaterThan(0);
      expect(item.chosen).not.toBe(item.correct);
    }
  });

  it('recommends a concrete next step on failure (DG-4)', () => {
    const r = attemptDungeon(freshState(), { dungeonId: 'dg-10', answers: answersWith(0) }, quietCtx(pack));
    const failure = r.ok ? r.events.find((e) => e.type === 'DUNGEON_FAILED') : undefined;
    expect(failure?.data?.nextStep).toBe('Blender Drill');
  });

  it('falls back to the concept goal when no side quest matches the tag (DG-4)', () => {
    const lonely = testPack({ dungeons: [dungeon({ id: 'dg-x', tags: ['vfx'] })], quests: [] });
    const r = attemptDungeon(freshState(), { dungeonId: 'dg-x', answers: [1] }, quietCtx(lonely));
    const failure = r.ok ? r.events.find((e) => e.type === 'DUNGEON_FAILED') : undefined;
    expect(String(failure?.data?.nextStep)).toContain('Understand cuts');
  });

  it('leaves the state untouched after a failed attempt (DG-4)', () => {
    const before = freshState();
    const r = attemptDungeon(before, { dungeonId: 'dg-10', answers: answersWith(0) }, quietCtx(pack));
    expect(r.ok && r.state).toEqual(before);
  });

  it('advances the streak only on a pass (ACH-2)', () => {
    const passed = attemptDungeon(freshState(), { dungeonId: 'dg-10', answers: answersWith(7) }, quietCtx(pack));
    expect(passed.ok && passed.state.streak.current).toBe(1);
  });
});
