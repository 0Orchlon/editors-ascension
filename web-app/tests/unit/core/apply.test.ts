import { describe, expect, it } from 'vitest';
import { applyAction } from '@shared/core/apply.ts';
import { schemas } from '@shared/validate/index.ts';
import type { Action, ActionType } from '@shared/types/index.ts';
import { freshState, quest, quietCtx, testPack } from './fixtures.ts';

const pack = testPack({
  quests: [
    quest({ id: 'q-a', xp: 50, staminaCost: 2 }),
    quest({ id: 'b-1', track: 'boss', type: 'boss', xp: 200 }),
    quest({ id: 's-1', track: 'side', repeatable: true }),
  ],
  dungeons: [
    {
      id: 'dg-1',
      title: 'D',
      conceptGoal: 'c',
      estimatedMinutes: 10,
      xp: 20,
      tags: ['blender'],
      tutorialRefs: [{ title: 't', url: 'https://example.com', minutes: 5 }],
      questions: [{ id: 'q1', prompt: 'p', options: ['a', 'b'], correctIndex: 0, explanation: 'e' }],
    },
  ] as never,
  // ⚠ v1.2.0 — `track` ба `tier` нь гэрээнд ЗААВАЛ (SKL-1); tier-1 тул `skillPoints`.
  skills: [
    { id: 'sk-a', title: 'A', description: 'd', cost: 1, prerequisites: [], track: 'video-editing', tier: 1 },
  ] as never,
});
const ctx = quietCtx(pack);

const action = (type: ActionType, payload: Record<string, unknown>): Action =>
  ({
    actionId: '00000000-0000-4000-8000-000000000000',
    type,
    at: ctx.at,
    payload,
  }) as Action;

describe('applyAction (T-08…T-16 bridge)', () => {
  /**
   * lld.md §5.4.11 — `ActionType`-ийн БҮХ утга диспетчерт байх ёстой. Хамаарахгүй
   * төрөл үлдвэл тэр талбар серверээр эрх бүхий болж чадахгүй (plan.md P-9).
   */
  it('dispatches every ActionType declared in the contract', () => {
    const declared = schemas.ActionType.meta.enum as ActionType[];
    for (const type of declared) {
      const result = applyAction(freshState(), action(type, {}), ctx);
      // Буруу payload нь татгалзаж БОЛНО, харин «unknown action» гэж хэлж БОЛОХГҮЙ.
      if (!result.ok) expect(result.detail ?? '').not.toContain('unsupported action');
    }
  });

  it('rejects an action type outside the contract', () => {
    const r = applyAction(freshState(), action('nope' as ActionType, {}), ctx);
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('routes claimQuest to the quest engine', () => {
    const r = applyAction(freshState(), action('claimQuest', { questId: 'q-a', checkedConditions: [0, 1] }), ctx);
    expect(r.ok && r.state.xp).toBe(50);
  });

  it('routes rest to the stamina engine', () => {
    const r = applyAction(freshState({ stamina: 4 }), action('rest', {}), ctx);
    expect(r.ok && r.state.stamina).toBe(7);
  });

  it('routes unlockSkill and spends a skill point', () => {
    const r = applyAction(freshState({ skillPoints: 1 }), action('unlockSkill', { skillId: 'sk-a' }), ctx);
    expect(r.ok && r.state.unlockedSkillIds).toEqual(['sk-a']);
  });

  it('routes dungeonAttempt', () => {
    const r = applyAction(freshState(), action('dungeonAttempt', { dungeonId: 'dg-1', answers: [0] }), ctx);
    expect(r.ok && r.state.completedDungeonIds).toEqual(['dg-1']);
  });

  it('routes the three project actions', () => {
    const created = applyAction(freshState(), action('projectCreate', { title: 'Film' }), ctx);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.state.projects[0]!.id;

    const marked = applyAction(created.state, action('projectMilestone', { projectId: id, key: 'concept' }), ctx);
    expect(marked.ok && marked.state.projects[0]!.milestones[0]!.done).toBe(true);
    if (!marked.ok) return;

    const updated = applyAction(marked.state, action('projectUpdate', { projectId: id, nextAction: 'brief' }), ctx);
    expect(updated.ok && updated.state.projects[0]!.nextAction).toBe('brief');
  });

  it('routes bossAttempt', () => {
    const scores = { story: 9, editing: 9, camera: 9, visualCraft: 9, animation: 9, audioPost: 9 };
    const r = applyAction(freshState(), action('bossAttempt', { bossId: 'b-1', scores }), ctx);
    expect(r.ok && r.state.bossAttempts).toHaveLength(1);
  });

  it('routes rollDailyMission and writes it onto the state', () => {
    const r = applyAction(freshState(), action('rollDailyMission', { date: '2026-03-10' }), ctx);
    expect(r.ok && r.state.dailyMission).toEqual({ questId: 'q-a', date: '2026-03-10' });
    expect(r.ok && r.events.map((e) => e.type)).toContain('DAILY_MISSION_ROLLED');
  });

  it('records a rest day when no mission is available', () => {
    const done = freshState({ completedMainQuestIds: ['q-a'], sideQuestStats: { 's-1': { completions: 1, lastCompletedAt: null } }, completedDungeonIds: ['dg-1'] });
    const noSide = testPack({ quests: pack.quests.filter((q) => q.track !== 'side') });
    const r = applyAction(done, action('rollDailyMission', { date: '2026-03-10' }), quietCtx(noSide));
    expect(r.ok && r.state.dailyMission).toBeNull();
  });

  it('routes resolveEncounter', () => {
    const withEncounter = testPack({
      encounters: [{ id: 'e-1', title: 'T', body: 'b', callToAction: 'c', maxMinutes: 1, weight: 1 }] as never,
    });
    const r = applyAction(freshState(), action('resolveEncounter', { encounterId: 'e-1' }), quietCtx(withEncounter));
    expect(r.ok && r.state.coins).toBeGreaterThan(0);
  });

  it('routes updateSettings and only touches the settings it was given', () => {
    const r = applyAction(freshState(), action('updateSettings', { reducedMotion: true }), ctx);
    // ⚠ v1.2.0 — `settings` нь 4 талбартай (colorBlindSafe · soundVolume нэмэгдэв).
    // «Зөвхөн ирсэн талбарыг солино» дүрэм ХЭВЭЭР: үлдсэн гурав нь анхдагчаараа.
    expect(r.ok && r.state.settings).toEqual({
      reducedMotion: true,
      soundEnabled: true,
      colorBlindSafe: false,
      soundVolume: 1,
    });
    expect(r.ok && r.events.map((e) => e.type)).toContain('SETTINGS_UPDATED');
  });

  it('routes the three new actions to their engines (T-18)', () => {
    const base = freshState();

    // prestigeMastery — level 10 биш тул PREREQ_NOT_MET, «unknown action» БИШ.
    const prestige = applyAction(base, action('prestigeMastery', { tag: 'audio' }), ctx);
    expect(prestige).toMatchObject({ ok: false, reason: 'PREREQ_NOT_MET' });

    // respecTree — модонд юу ч нээгдээгүй тул PREREQ_NOT_MET.
    const respec = applyAction(base, action('respecTree', { track: 'audio' }), ctx);
    expect(respec).toMatchObject({ ok: false, reason: 'PREREQ_NOT_MET' });

    // setCampLayout — 6 үүр бүгд хоосон бол хүчинтэй.
    const slots = {
      avatarFrame: null, campBanner: null, title: null,
      campDecoration: null, uiAccent: null, badgeFrame: null,
    };
    const layout = applyAction(base, action('setCampLayout', { slots }), ctx);
    expect(layout.ok && layout.state.campLayout.slots).toEqual(slots);
  });

  it('rejects a malformed payload for each new action with INVALID_INPUT (T-18)', () => {
    const base = freshState();
    for (const [type, payload] of [
      ['prestigeMastery', { tag: 'not-a-tag' }],
      ['respecTree', { track: 42 }],
      ['setCampLayout', { slots: { hat: null } }],
      ['updateSettings', { soundVolume: 5 }],
      ['bossAttempt', { bossId: 'b-1', scores: {}, difficulty: 'nightmare' }],
    ] as const)
      expect(
        applyAction(base, action(type, payload as Record<string, unknown>), ctx),
      ).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('accepts a bossAttempt without a difficulty — old queued actions still replay (T-18)', () => {
    const scores = { story: 9, editing: 9, camera: 9, visualCraft: 9, animation: 9, audioPost: 9 };
    const r = applyAction(freshState(), action('bossAttempt', { bossId: 'b-1', scores }), ctx);
    expect(r.ok && r.state.bossAttempts[0]!.difficulty).toBe('standard');
  });

  it('carries a hard difficulty through to the domain (T-18)', () => {
    const scores = { story: 9, editing: 9, camera: 9, visualCraft: 9, animation: 9, audioPost: 9 };
    const r = applyAction(
      freshState(),
      action('bossAttempt', { bossId: 'b-1', scores, difficulty: 'hard' }),
      ctx,
    );
    expect(r.ok && r.state.bossAttempts[0]!.difficulty).toBe('hard');
  });

  it('updates the two new settings fields (T-18)', () => {
    const r = applyAction(
      freshState(),
      action('updateSettings', { colorBlindSafe: true, soundVolume: 0 }),
      ctx,
    );
    expect(r.ok && r.state.settings.colorBlindSafe).toBe(true);
    expect(r.ok && r.state.settings.soundVolume).toBe(0);
  });

  it('rejects a malformed payload before touching the state', () => {
    const before = freshState();
    const r = applyAction(before, action('claimQuest', { questId: 42 }), ctx);
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
    expect(before.xp).toBe(0);
  });

  it('is deterministic for a fixed action and seed', () => {
    const run = () => applyAction(freshState(), action('claimQuest', { questId: 'q-a', checkedConditions: [0, 1] }), quietCtx(pack));
    expect(run()).toEqual(run());
  });
});
