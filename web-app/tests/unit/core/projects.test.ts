import { describe, expect, it } from 'vitest';
import { MILESTONE_KEYS, PROJECT_MILESTONE_XP } from '@shared/core/constants.ts';
import { completeMilestone, createProject, updateProject } from '@shared/core/projects.ts';
import { freshState, quietCtx, testPack } from './fixtures.ts';

const pack = testPack();
const ctx = quietCtx(pack);

/** Төслийг үүсгээд бэлэн төлөв буцаана — олон тест ижил эхлэлтэй. */
function withProject() {
  const created = createProject(freshState(), { title: 'Short film' }, ctx);
  if (!created.ok) throw new Error('fixture: createProject failed');
  return { state: created.state, projectId: created.state.projects[0]!.id };
}

describe('createProject (T-14)', () => {
  it('creates the ten milestones in the fixed order, all undone (PJ-1)', () => {
    const { state } = withProject();
    const project = state.projects[0]!;
    expect(project.milestones.map((m) => m.key)).toEqual([...MILESTONE_KEYS]);
    expect(project.milestones.every((m) => !m.done)).toBe(true);
    expect(project.completedAt).toBeNull();
  });

  it('rejects an empty title (PJ-2)', () => {
    expect(createProject(freshState(), { title: '  ' }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });

  it('emits PROJECT_CREATED', () => {
    const r = createProject(freshState(), { title: 'Short film' }, ctx);
    expect(r.ok && r.events.map((e) => e.type)).toContain('PROJECT_CREATED');
  });
});

describe('completeMilestone (T-14)', () => {
  it('awards 25 xp the first time a milestone is marked (PJ-3)', () => {
    const { state, projectId } = withProject();
    const r = completeMilestone(state, { projectId, key: 'concept' }, ctx);
    expect(r.ok && r.state.xp).toBe(PROJECT_MILESTONE_XP);
    expect(r.ok && r.state.projects[0]!.milestones[0]!.done).toBe(true);
    expect(r.ok && r.events.map((e) => e.type)).toContain('PROJECT_MILESTONE_COMPLETED');
  });

  /** AC PJ-3 — «XP нэмэгдэхгүй» гэсэн, «татгалзана» гэсэнгүй (lld.md §5.4.9). */
  it('is a no-op on a second mark — ok:true and no extra xp (PJ-3)', () => {
    const { state, projectId } = withProject();
    const once = completeMilestone(state, { projectId, key: 'concept' }, ctx);
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = completeMilestone(once.state, { projectId, key: 'concept' }, ctx);
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(twice.state.xp).toBe(PROJECT_MILESTONE_XP);
    expect(twice.events).toEqual([]);
  });

  it('rejects an unknown project or milestone key (PJ-2)', () => {
    const { state, projectId } = withProject();
    expect(completeMilestone(state, { projectId: 'nope', key: 'concept' }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(
      completeMilestone(state, { projectId, key: 'not-a-key' as never }, ctx),
    ).toMatchObject({ ok: false, reason: 'INVALID_INPUT' });
  });

  it('completes the project once all ten milestones are done (PJ-4)', () => {
    const { state: start, projectId } = withProject();
    let state = start;
    for (const key of MILESTONE_KEYS) {
      const r = completeMilestone(state, { projectId, key }, ctx);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      state = r.state;
    }
    expect(state.projects[0]!.completedAt).toBe(ctx.at);
    expect(state.xp).toBe(PROJECT_MILESTONE_XP * MILESTONE_KEYS.length);
  });

  it('emits PROJECT_COMPLETED exactly once, on the final milestone (PJ-4)', () => {
    const { state: start, projectId } = withProject();
    let state = start;
    const seen: string[] = [];
    for (const key of MILESTONE_KEYS) {
      const r = completeMilestone(state, { projectId, key }, ctx);
      if (!r.ok) return;
      state = r.state;
      seen.push(...r.events.filter((e) => e.type === 'PROJECT_COMPLETED').map(() => key));
    }
    expect(seen).toEqual(['portfolio']);
  });
});

describe('updateProject (T-14)', () => {
  it('stores notes, next action, evidence and self score (PJ-1)', () => {
    const { state, projectId } = withProject();
    const r = updateProject(
      state,
      { projectId, notes: 'n', nextAction: 'storyboard', evidenceRef: 'drive://x', selfScore: 7 },
      ctx,
    );
    expect(r.ok && r.state.projects[0]).toMatchObject({
      notes: 'n',
      nextAction: 'storyboard',
      evidenceRef: 'drive://x',
      selfScore: 7,
    });
  });

  it('rejects a self score outside 0..10 (PJ-2)', () => {
    const { state, projectId } = withProject();
    expect(updateProject(state, { projectId, selfScore: 11 }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(updateProject(state, { projectId, selfScore: -1 }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });

  it('accepts null to clear the self score (PJ-2)', () => {
    const { state, projectId } = withProject();
    const r = updateProject(state, { projectId, selfScore: null }, ctx);
    expect(r.ok && r.state.projects[0]!.selfScore).toBeNull();
  });

  it('leaves unspecified fields untouched', () => {
    const { state, projectId } = withProject();
    const first = updateProject(state, { projectId, notes: 'keep me' }, ctx);
    if (!first.ok) return;
    const second = updateProject(first.state, { projectId, nextAction: 'render' }, ctx);
    expect(second.ok && second.state.projects[0]!.notes).toBe('keep me');
  });

  it('rejects an unknown project', () => {
    const { state } = withProject();
    expect(updateProject(state, { projectId: 'nope', notes: 'x' }, ctx)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });
});
