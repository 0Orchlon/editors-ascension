import { describe, expect, it } from 'vitest';
import { exportSave, importSave, loadOrNewGame } from '@shared/core/saves.ts';
import { CURRENT_SCHEMA_VERSION } from '@shared/save/version.ts';
import type { Migration } from '@shared/save/migrations.ts';
import { newGame } from '@shared/save/serialize.ts';
import { freshState } from './fixtures.ts';

const at = '2026-03-10T09:00:00Z';

describe('exportSave / importSave (T-16)', () => {
  it('round-trips a state without losing anything (SV-4)', () => {
    const state = freshState({ xp: 320, level: 3, coins: 40, inventory: ['loot-a'] });
    const result = importSave(exportSave(state, at));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toEqual(state);
  });

  it('writes the schema version into the exported file (SV-1)', () => {
    const parsed = JSON.parse(exportSave(newGame(), at));
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.updatedAt).toBe(at);
  });

  it('produces human-readable JSON so a player can inspect their own save', () => {
    expect(exportSave(newGame(), at)).toContain('\n');
  });

  it('rejects text that is not JSON at all (SV-5)', () => {
    expect(importSave('not json {')).toMatchObject({ ok: false, reason: 'parse' });
  });

  it('rejects JSON that is not a save shape (SV-5)', () => {
    expect(importSave('[1,2,3]')).toMatchObject({ ok: false, reason: 'parse' });
  });

  it('rejects a save whose state violates the schema (SV-5)', () => {
    const broken = JSON.parse(exportSave(newGame(), at));
    broken.state.xp = -5;
    const result = importSave(JSON.stringify(broken));
    expect(result).toMatchObject({ ok: false, reason: 'schema' });
    if (result.ok) return;
    expect(result.issues?.length).toBeGreaterThan(0);
  });

  it('refuses a save written by a newer version of the game (SV-1)', () => {
    const future = JSON.parse(exportSave(newGame(), at));
    future.schemaVersion = CURRENT_SCHEMA_VERSION + 1;
    future.state.schemaVersion = CURRENT_SCHEMA_VERSION + 1;
    expect(importSave(JSON.stringify(future))).toMatchObject({ ok: false, reason: 'too-new' });
  });

  it('runs registered migrations on an older save (SV-1)', () => {
    const old = { ...newGame(), schemaVersion: 1, xp: 10 };
    const registry: Record<number, Migration> = {
      2: (s) => ({ ...s, xp: Number(s.xp) * 2 }),
    };
    const raw = JSON.stringify({ schemaVersion: 1, updatedAt: at, state: { ...old, schemaVersion: 1 } });
    const result = importSave(raw, registry, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.xp).toBe(20);
    expect(result.migratedFrom).toBe(1);
  });
});

describe('loadOrNewGame (T-16)', () => {
  it('loads a healthy save unchanged (SV-2)', () => {
    const state = freshState({ xp: 700, level: 4 });
    const out = loadOrNewGame(exportSave(state, at));
    expect(out.outcome).toBe('loaded');
    expect(out.state).toEqual(state);
  });

  it('starts a new game when there is no save yet', () => {
    const out = loadOrNewGame(null);
    expect(out.outcome).toBe('new');
    expect(out.state).toEqual(newGame());
  });

  /** AC SV-2 — гэмтсэн save нь апп-ыг УНАГААХГҮЙ. */
  it('recovers from a corrupt save instead of crashing (SV-2)', () => {
    const out = loadOrNewGame('{"half written');
    expect(out.outcome).toBe('recovered');
    expect(out.state).toEqual(newGame());
  });

  it('hands back the corrupt bytes so they can be quarantined, not dropped (SV-2)', () => {
    const corrupt = '{"half written';
    const out = loadOrNewGame(corrupt);
    expect(out.corruptPayload).toBe(corrupt);
    expect(out.corruptKey).toMatch(/^save\.corrupt\./);
  });

  it('recovers from a schema-invalid save too (SV-2)', () => {
    const broken = JSON.parse(exportSave(newGame(), at));
    broken.state.level = 99;
    const out = loadOrNewGame(JSON.stringify(broken));
    expect(out.outcome).toBe('recovered');
    expect(out.state).toEqual(newGame());
  });

  it('never reports a corrupt payload on a healthy load', () => {
    const out = loadOrNewGame(exportSave(newGame(), at));
    expect(out.corruptPayload).toBeUndefined();
  });
});
