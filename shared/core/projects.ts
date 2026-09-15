/** Project Forge (lld.md §5.4.9; AC PJ-1, PJ-2, PJ-3, PJ-4). */
import type { DomainEvent, GameState, MilestoneKey, ProjectState } from '../types/index.ts';
import { evaluateAchievements } from './achievements.ts';
import { MILESTONE_KEYS, PROJECT_MILESTONE_XP } from './constants.ts';
import { addXp } from './progression.ts';
import { fnv1a } from './rng.ts';
import { ok, reject, type Ctx, type DomainResult } from './result.ts';

/** Төслийн id нь `ctx`-ээс гаралтай — `Date.now()`/`Math.random()` домэйнд хориотой. */
function projectId(title: string, at: string, existing: number): string {
  return `pj-${fnv1a(`${title}|${at}|${existing}`).toString(16)}`;
}

export function createProject(state: GameState, input: { title: string }, ctx: Ctx): DomainResult {
  const title = input.title.trim();
  if (title.length === 0 || title.length > 120) return reject('INVALID_INPUT', 'title is required');

  const project: ProjectState = {
    id: projectId(title, ctx.at, state.projects.length),
    title,
    createdAt: ctx.at,
    completedAt: null,
    notes: '',
    nextAction: '',
    evidenceRef: null,
    selfScore: null,
    // AC PJ-1 — 10 milestone ЯГ энэ дарааллаар.
    milestones: MILESTONE_KEYS.map((key) => ({ key, done: false, completedAt: null })),
  };

  return ok({ ...state, projects: [...state.projects, project] }, [
    { type: 'PROJECT_CREATED', data: { projectId: project.id, title } },
  ]);
}

/**
 * ⚠ Дахин тэмдэглэхэд `ok:true` + event-гүй буцаана, `ALREADY_COMPLETED` БИШ:
 * AC PJ-3 нь «XP нэмэгдэхгүй» гэсэн, «татгалзана» гэсэнгүй (lld.md §5.4.9).
 */
export function completeMilestone(
  state: GameState,
  input: { projectId: string; key: MilestoneKey },
  ctx: Ctx,
): DomainResult {
  const index = state.projects.findIndex((p) => p.id === input.projectId);
  if (index === -1) return reject('INVALID_INPUT', `unknown project ${input.projectId}`);
  if (!MILESTONE_KEYS.includes(input.key)) return reject('INVALID_INPUT', `unknown milestone ${input.key}`);

  const project = state.projects[index]!;
  const milestone = project.milestones.find((m) => m.key === input.key);
  if (!milestone) return reject('INVALID_INPUT', `milestone ${input.key} missing from project`);
  if (milestone.done) return ok(state);

  const milestones = project.milestones.map((m) =>
    m.key === input.key ? { ...m, done: true, completedAt: ctx.at } : m,
  );
  const allDone = milestones.every((m) => m.done);
  const updated: ProjectState = {
    ...project,
    milestones,
    completedAt: allDone ? ctx.at : project.completedAt,
  };

  const awarded = addXp(state, PROJECT_MILESTONE_XP);
  if (!awarded.ok) return awarded;

  let next: GameState = {
    ...awarded.state,
    projects: state.projects.map((p, i) => (i === index ? updated : p)),
  };
  const events: DomainEvent[] = [
    { type: 'PROJECT_MILESTONE_COMPLETED', data: { projectId: project.id, key: input.key } },
    ...awarded.events,
  ];
  if (allDone) events.push({ type: 'PROJECT_COMPLETED', data: { projectId: project.id, title: project.title } });

  const earned = evaluateAchievements(next, ctx.pack);
  if (earned.ids.length) {
    next = { ...next, achievementIds: [...next.achievementIds, ...earned.ids] };
    events.push(...earned.events);
  }

  return ok(next, events);
}

export type ProjectUpdate = {
  projectId: string;
  notes?: string;
  nextAction?: string;
  evidenceRef?: string | null;
  selfScore?: number | null;
};

export function updateProject(state: GameState, input: ProjectUpdate, _ctx: Ctx): DomainResult {
  const index = state.projects.findIndex((p) => p.id === input.projectId);
  if (index === -1) return reject('INVALID_INPUT', `unknown project ${input.projectId}`);

  if (input.selfScore !== undefined && input.selfScore !== null) {
    // AC PJ-2 — 0..10-ийн гадна эсвэл бүхэл биш бол татгалзана.
    if (!Number.isInteger(input.selfScore) || input.selfScore < 0 || input.selfScore > 10)
      return reject('INVALID_INPUT', 'selfScore must be an integer in 0..10');
  }
  if (input.notes !== undefined && input.notes.length > 4000)
    return reject('INVALID_INPUT', 'notes too long');
  if (input.nextAction !== undefined && input.nextAction.length > 500)
    return reject('INVALID_INPUT', 'nextAction too long');

  const project = state.projects[index]!;
  const updated: ProjectState = {
    ...project,
    notes: input.notes ?? project.notes,
    nextAction: input.nextAction ?? project.nextAction,
    evidenceRef: input.evidenceRef === undefined ? project.evidenceRef : input.evidenceRef,
    selfScore: input.selfScore === undefined ? project.selfScore : input.selfScore,
  };

  return ok({ ...state, projects: state.projects.map((p, i) => (i === index ? updated : p)) });
}
