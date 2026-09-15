import { describe, expect, it } from 'vitest';
import { claimQuest } from '@shared/core/quests.ts';
import { freshState, quest, quietCtx, scriptedCtx, testPack } from './fixtures.ts';

const pack = testPack({
  quests: [
    quest({ id: 'q-a', xp: 50, staminaCost: 2 }),
    quest({ id: 'q-b', prerequisites: ['q-a'], world: 2, xp: 80 }),
    quest({ id: 'q-lv', levelRequired: 5 }),
    quest({ id: 'q-boss', track: 'boss', type: 'boss' }),
    quest({ id: 'q-side', track: 'side', xp: 40, repeatable: true, staminaCost: 1 }),
    quest({ id: 'q-once', track: 'side', xp: 30, repeatable: false, staminaCost: 1 }),
  ],
  achievements: [
    { id: 'a-first', title: 'First', description: 'd', predicate: { kind: 'mainQuestsCompleted', value: 1 } },
  ] as never,
});

/** Бүх `victoryConditions`-ийн индекс — claim-ийн ил байдлын шаардлага (AC MQ-6). */
const allConditions = [0, 1];

describe('claimQuest (T-08)', () => {
  it('awards xp, spends stamina and records the completion (MQ-3)', () => {
    const result = claimQuest(freshState(), { questId: 'q-a', checkedConditions: allConditions }, quietCtx(pack));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.xp).toBe(50);
    expect(result.state.stamina).toBe(8);
    expect(result.state.completedMainQuestIds).toEqual(['q-a']);
    expect(result.events.map((e) => e.type)).toEqual(
      expect.arrayContaining(['STAMINA_SPENT', 'XP_GAINED', 'QUEST_COMPLETED']),
    );
  });

  it('rejects an unknown quest id', () => {
    const r = claimQuest(freshState(), { questId: 'nope', checkedConditions: [] }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('refuses boss and raid tracks — those go through bossAttempt', () => {
    const r = claimQuest(freshState(), { questId: 'q-boss', checkedConditions: allConditions }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('rejects when the level requirement is not met (MQ-4)', () => {
    const r = claimQuest(freshState(), { questId: 'q-lv', checkedConditions: allConditions }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'LEVEL_TOO_LOW' });
  });

  it('rejects when a prerequisite is missing (MQ-4)', () => {
    const r = claimQuest(freshState(), { questId: 'q-b', checkedConditions: allConditions }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'PREREQ_NOT_MET' });
  });

  it('rejects a main quest already completed (MQ-3)', () => {
    const state = freshState({ completedMainQuestIds: ['q-a'] });
    const r = claimQuest(state, { questId: 'q-a', checkedConditions: allConditions }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'ALREADY_COMPLETED' });
  });

  it('rejects a non-repeatable side quest done once (SQ-2)', () => {
    const state = freshState({ sideQuestStats: { 'q-once': { completions: 1, lastCompletedAt: null } } });
    const r = claimQuest(state, { questId: 'q-once', checkedConditions: allConditions }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'NOT_REPEATABLE' });
  });

  it('refuses a claim whose victory checklist is incomplete (MQ-6)', () => {
    const r = claimQuest(freshState(), { questId: 'q-a', checkedConditions: [0] }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('refuses a claim that checks an index that does not exist (MQ-6)', () => {
    const r = claimQuest(freshState(), { questId: 'q-a', checkedConditions: [0, 1, 2] }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('rejects when stamina is short and leaves the state untouched (STA-2, D-2)', () => {
    const before = freshState({ stamina: 1 });
    const r = claimQuest(before, { questId: 'q-a', checkedConditions: allConditions }, quietCtx(pack));
    expect(r).toMatchObject({ ok: false, reason: 'INSUFFICIENT_STAMINA' });
    expect(before.stamina).toBe(1);
    expect(before.xp).toBe(0);
  });

  /** lld.md §5.4.3 — бүтцийн саад нь нөөцийн саадаас ӨМНӨ гарна. */
  it('reports the structural blocker before the resource blocker', () => {
    const state = freshState({ stamina: 0 });
    const r = claimQuest(state, { questId: 'q-lv', checkedConditions: allConditions }, quietCtx(pack));
    expect(r).toMatchObject({ reason: 'LEVEL_TOO_LOW' });
  });

  it('decays xp on repeat side quest completions (SQ-2)', () => {
    const state = freshState({ sideQuestStats: { 'q-side': { completions: 1, lastCompletedAt: null } } });
    const r = claimQuest(state, { questId: 'q-side', checkedConditions: allConditions }, quietCtx(pack));
    expect(r.ok && r.state.xp).toBe(20);
    expect(r.ok && r.state.sideQuestStats['q-side']).toEqual({
      completions: 2,
      lastCompletedAt: '2026-03-10T09:00:00Z',
    });
  });

  it('emits LEVEL_UP and grants a skill point when the claim crosses a threshold (PRG-6)', () => {
    const state = freshState({ xp: 80 });
    const r = claimQuest(state, { questId: 'q-a', checkedConditions: allConditions }, quietCtx(pack));
    expect(r.ok && r.state.level).toBe(2);
    expect(r.ok && r.state.skillPoints).toBe(1);
    expect(r.ok && r.events.map((e) => e.type)).toContain('LEVEL_UP');
  });

  it('advances the streak on a successful claim (ACH-2)', () => {
    const r = claimQuest(freshState(), { questId: 'q-a', checkedConditions: allConditions }, quietCtx(pack));
    expect(r.ok && r.state.streak).toEqual({
      current: 1,
      best: 1,
      lastQualifiedDate: '2026-03-10',
    });
  });

  it('grants cosmetic coins that never alter xp or stamina (EC-1)', () => {
    const r = claimQuest(freshState(), { questId: 'q-a', checkedConditions: allConditions }, quietCtx(pack));
    expect(r.ok && r.state.coins).toBeGreaterThan(0);
    expect(r.ok && r.state.xp).toBe(50);
  });

  it('awards achievements earned by the claim (ACH-1)', () => {
    const r = claimQuest(freshState(), { questId: 'q-a', checkedConditions: allConditions }, quietCtx(pack));
    expect(r.ok && r.state.achievementIds).toContain('a-first');
  });

  it('triggers at most one encounter per claim (ENC-2)', () => {
    const ctx = scriptedCtx(pack, [0.5, 0.5, 0.5, 0.0, 0.0]);
    const r = claimQuest(freshState(), { questId: 'q-a', checkedConditions: allConditions }, ctx);
    const encounters = r.ok ? r.events.filter((e) => e.type === 'ENCOUNTER_TRIGGERED') : [];
    expect(encounters.length).toBeLessThanOrEqual(1);
  });

  it('is deterministic — the same seed produces the same result', () => {
    const run = () =>
      claimQuest(freshState(), { questId: 'q-a', checkedConditions: allConditions }, scriptedCtx(pack, [0.1, 0.2, 0.3]));
    expect(run()).toEqual(run());
  });
});
