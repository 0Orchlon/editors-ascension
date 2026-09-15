import { describe, expect, it } from 'vitest';
import { attemptBoss, coachingMessage, tierFor } from '@shared/core/boss.ts';
import type { BossScores } from '@shared/types/index.ts';
import { freshState, quest, quietCtx, testPack } from './fixtures.ts';

const scores = (over: Partial<BossScores> = {}): BossScores => ({
  story: 6,
  editing: 6,
  camera: 6,
  visualCraft: 6,
  animation: 6,
  audioPost: 6,
  ...over,
});

/**
 * Нийлбэрийг `total` болгох онооны багц — үлдэгдлийг нэг нэгээр тарааж
 * ангилал бүрийг 0..10-д багтаана (AC BS-1-ийн хязгаар).
 */
const totalling = (total: number): BossScores => {
  const base = Math.floor(total / 6);
  const out = scores({ story: base, editing: base, camera: base, visualCraft: base, animation: base, audioPost: base });
  let rest = total - base * 6;
  for (const key of ['audioPost', 'animation', 'visualCraft', 'camera', 'editing', 'story'] as const) {
    if (rest === 0) break;
    out[key] += 1;
    rest -= 1;
  }
  return out;
};

const pack = testPack({
  quests: [
    quest({ id: 'b-1', track: 'boss', type: 'boss', xp: 200, world: 3 }),
    quest({ id: 'sq-cam', track: 'side', tags: ['cinematography'], title: 'Camera Copycat', world: 1 }),
    quest({ id: 'sq-story', track: 'side', tags: ['storytelling'], title: 'Three-Cut Story', world: 1 }),
    quest({ id: 'sq-blender', track: 'side', tags: ['blender'], title: 'Material Duel', world: 1 }),
  ],
});
const ctx = quietCtx(pack);

describe('tierFor (T-15)', () => {
  it('maps totals onto the documented tier boundaries (BS-2)', () => {
    const table: [number, string][] = [
      [0, 'failed'],
      [34, 'failed'],
      [35, 'mvp'],
      [44, 'mvp'],
      [45, 'advanced'],
      [51, 'advanced'],
      [52, 'mastery'],
      [60, 'mastery'],
    ];
    for (const [total, tier] of table) expect(tierFor(total)).toBe(tier);
  });
});

describe('attemptBoss (T-15)', () => {
  it('rejects a score outside 0..10 or a non-integer (BS-1)', () => {
    expect(attemptBoss(freshState(), { bossId: 'b-1', scores: scores({ story: 11 }) }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(attemptBoss(freshState(), { bossId: 'b-1', scores: scores({ story: -1 }) }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(attemptBoss(freshState(), { bossId: 'b-1', scores: scores({ story: 5.5 }) }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });

  it('rejects an unknown boss id', () => {
    expect(attemptBoss(freshState(), { bossId: 'nope', scores: scores() }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });

  it('logs every attempt, pass or fail (BS-4)', () => {
    const failed = attemptBoss(freshState(), { bossId: 'b-1', scores: totalling(20) }, ctx);
    expect(failed.ok && failed.state.bossAttempts).toHaveLength(1);
    expect(failed.ok && failed.state.bossAttempts[0]).toMatchObject({ bossId: 'b-1', total: 20, tier: 'failed' });
    expect(failed.ok && failed.events.map((e) => e.type)).toContain('BOSS_ATTEMPT_LOGGED');
  });

  it('awards the boss xp on a pass and records the completion (BS-2)', () => {
    const r = attemptBoss(freshState(), { bossId: 'b-1', scores: totalling(52) }, ctx);
    expect(r.ok && r.state.xp).toBe(200);
    expect(r.ok && r.state.completedMainQuestIds).toContain('b-1');
    expect(r.ok && r.events.map((e) => e.type)).toContain('BOSS_PASSED');
  });

  it('awards zero xp when passing an already cleared boss (BS-2)', () => {
    const state = freshState({ completedMainQuestIds: ['b-1'] });
    const r = attemptBoss(state, { bossId: 'b-1', scores: totalling(55) }, ctx);
    expect(r.ok && r.state.xp).toBe(0);
    expect(r.ok && r.state.bossAttempts).toHaveLength(1);
  });

  it('changes nothing but the attempt log on a failure (BS-4)', () => {
    const before = freshState();
    const r = attemptBoss(before, { bossId: 'b-1', scores: totalling(10) }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.xp).toBe(before.xp);
    expect(r.state.stamina).toBe(before.stamina);
    expect(r.state.completedMainQuestIds).toEqual([]);
  });

  it('attaches the coaching message to a failed attempt (BS-3)', () => {
    const r = attemptBoss(freshState(), { bossId: 'b-1', scores: totalling(10) }, ctx);
    const logged = r.ok ? r.events.find((e) => e.type === 'BOSS_ATTEMPT_LOGGED') : undefined;
    expect(String(logged?.data?.message)).toMatch(/^Attempt logged\. Weakest category: /);
  });
});

describe('coachingMessage (T-15)', () => {
  /** AC BS-3 — формат нь ЯГ энэ; өөрчлөгдвөл UI-ийн амлалт эвдэрнэ. */
  it('uses the exact required sentence shape (BS-3)', () => {
    const msg = coachingMessage(scores({ camera: 1 }), pack, freshState());
    expect(msg).toBe('Attempt logged. Weakest category: Camera. Recommended side quest: Camera Copycat.');
  });

  it('never says only "Failed" (BS-3)', () => {
    const msg = coachingMessage(scores({ story: 0 }), pack, freshState());
    expect(msg).not.toBe('Failed');
    expect(msg).toContain('Recommended side quest:');
  });

  it('picks the lowest-scoring category', () => {
    const msg = coachingMessage(scores({ story: 2, camera: 9 }), pack, freshState());
    expect(msg).toContain('Weakest category: Story');
  });

  it('breaks ties in the documented category order', () => {
    const msg = coachingMessage(scores({ story: 3, camera: 3 }), pack, freshState());
    expect(msg).toContain('Weakest category: Story');
  });

  it('maps visualCraft to a blender side quest with its display name', () => {
    const msg = coachingMessage(scores({ visualCraft: 0 }), pack, freshState());
    expect(msg).toBe('Attempt logged. Weakest category: Visual Craft. Recommended side quest: Material Duel.');
  });
});
