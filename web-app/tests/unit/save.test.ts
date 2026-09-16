import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@shared/save/version.ts';
import { MIGRATIONS, runMigrations } from '@shared/save/migrations.ts';
import { loadState, newGame, toPayload } from '@shared/save/serialize.ts';

const at = '2026-09-15T10:00:00.000Z';

describe('save schema version + migration registry (T-05)', () => {
  it('starts a new game at the current version with full stamina (STA-1)', () => {
    const s = newGame();
    expect(s.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(Number.isInteger(s.schemaVersion)).toBe(true);
    expect([s.stamina, s.maxStamina]).toEqual([10, 10]);
  });

  it('carries a v1 fixture through unchanged (SV-1)', () => {
    const r = loadState(toPayload(newGame(), at));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state).toEqual(newGame());
      expect(r.migratedFrom).toBeUndefined();
    }
  });

  it('rejects an unknown future version with a specific reason (SV-1)', () => {
    const r = loadState({ ...newGame(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 });
    expect(r).toEqual({ ok: false, reason: 'too-new' });
  });

  it('rejects unparseable input without throwing (SV-2)', () => {
    for (const bad of ['nope', null, {}]) {
      const r = loadState(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('parse');
    }
  });

  it('reports schema issues instead of loading a broken state', () => {
    const r = loadState({ ...newGame(), xp: -5 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('schema');
      expect(r.issues?.map((i) => i.field)).toContain('/xp');
    }
  });

  /**
   * ⚠ v1.2.0-д бүртгэл ХООСОН БИШ: `MIGRATIONS[2]` бий. Дүрэм өөрчлөгдөөгүй —
   * «хоосон/дэмий migration бичихгүй» (plan.md P-6). Тиймээс шалгалт нь
   * «бүртгэл хоосон» гэснээс «бүртгэгдсэн бүхэн төлвийг ҮНЭХЭЭР өөрчилдөг»
   * болж хөрвөв: no-op migration нь хувилбарыг ахиулаад юу ч хийхгүй, тэр нь
   * P-6-ийн хориглосон зүйл.
   */
  it('ships no empty migrations (plan.md P-6)', () => {
    const noop: string[] = [];
    for (const [version, migration] of Object.entries(MIGRATIONS)) {
      const before = { schemaVersion: Number(version) - 1 };
      if (JSON.stringify(migration({ ...before })) === JSON.stringify(before)) noop.push(version);
    }
    expect(noop).toEqual([]);
    expect(Object.keys(MIGRATIONS)).toEqual(['2']);
  });

  it('runs a registry chain in order and stamps the target version', () => {
    const registry = {
      1: (s: Record<string, unknown>) => ({ ...s, steps: [...((s.steps as string[]) ?? []), 'v1'] }),
    };
    const out = runMigrations({ schemaVersion: 0 }, 0, 1, registry);
    expect(out).toEqual({ schemaVersion: 1, steps: ['v1'] });
  });

  it('throws when a migration step is missing (programmer error, not bad data)', () => {
    expect(() => runMigrations({ schemaVersion: 0 }, 0, 1, {})).toThrow(/missing migration/);
  });
});
