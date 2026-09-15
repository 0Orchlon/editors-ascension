import { describe, it, expect } from 'vitest';
import {
  validateGameState,
  validateSavePayload,
  validateContentPack,
  validateAction,
} from '@shared/validate/index.ts';
import { newGame } from '@shared/save/serialize.ts';

const at = '2026-09-15T10:00:00.000Z';

describe('shared/validate (T-04)', () => {
  it('accepts a fresh game state', () => {
    expect(validateGameState(newGame())).toEqual([]);
  });

  it('rejects a non-object', () => {
    expect(validateGameState(null).length).toBeGreaterThan(0);
    expect(validateGameState(42).length).toBeGreaterThan(0);
  });

  it('rejects negative xp and non-integer xp with a JSON pointer field (D-3)', () => {
    const neg = validateGameState({ ...newGame(), xp: -1 });
    expect(neg.map((i) => i.field)).toContain('/xp');
    const frac = validateGameState({ ...newGame(), xp: 1.5 });
    expect(frac.map((i) => i.field)).toContain('/xp');
  });

  it('rejects unknown properties (additionalProperties:false)', () => {
    const issues = validateGameState({ ...newGame(), hacked: true });
    expect(issues.map((i) => i.field)).toContain('/hacked');
  });

  it('reports every failing field, not just the first', () => {
    const issues = validateGameState({ ...newGame(), xp: -1, stamina: -2, level: 0 });
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });

  it('reports a missing required key', () => {
    const s: Record<string, unknown> = { ...newGame() };
    delete s.streak;
    expect(validateGameState(s).map((i) => i.field)).toContain('/streak');
  });

  it('validates nested pointers', () => {
    const s = newGame();
    s.projects = [
      {
        id: 'p1',
        title: 'T',
        createdAt: at,
        notes: '',
        nextAction: '',
        selfScore: 99,
        milestones: [],
      } as never,
    ];
    const fields = validateGameState(s).map((i) => i.field);
    expect(fields).toContain('/projects/0/selfScore');
  });

  it('validates save payloads and rejects a bad schemaVersion', () => {
    expect(validateSavePayload({ schemaVersion: 1, updatedAt: at, state: newGame() })).toEqual([]);
    expect(
      validateSavePayload({ schemaVersion: 0, updatedAt: at, state: newGame() }).length,
    ).toBeGreaterThan(0);
  });

  it('validates actions', () => {
    const ok = {
      actionId: '11111111-2222-4333-8444-555555555555',
      type: 'rest',
      at,
      payload: {},
    };
    expect(validateAction(ok)).toEqual([]);
    expect(validateAction({ ...ok, type: 'nope' }).length).toBeGreaterThan(0);
  });

  it('rejects an empty content pack (minItems on achievements/encounters)', () => {
    const issues = validateContentPack({
      version: '1',
      quests: [],
      dungeons: [],
      skills: [],
      achievements: [],
      encounters: [],
      loot: [],
    });
    expect(issues.map((i) => i.field)).toContain('/achievements');
    expect(issues.map((i) => i.field)).toContain('/encounters');
  });
});
