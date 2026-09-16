import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@shared/save/version.ts';
import { MIGRATIONS, runMigrations } from '@shared/save/migrations.ts';
import { loadState, newGame, toPayload } from '@shared/save/serialize.ts';
import { exportSave, importSave } from '@shared/core/saves.ts';
import type { GameState } from '@shared/types/index.ts';

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

/**
 * SVX-3 — export → import round-trip (T-07).
 *
 * ⚠ «Дугуй аялал» нь ЗӨВХӨН JSON задарсныг БИШ, шинэ талбар БҮРИЙН утга бүтнээр
 * буцаж ирснийг шалгана: нэг талбар унтарвал тоглогч mastery/rep/chain-ээ чимээгүй
 * алдана.
 */
describe('SVX-3 — a save survives the round trip with every v2 field (T-07)', () => {
  const rich = (): GameState => ({
    ...newGame(),
    xp: 1200,
    level: 4,
    coins: 90,
    skillPoints: 2,
    masteryPoints: 3,
    completedMainQuestIds: ['mq-first-cut'],
    completedDungeonIds: ['dg-timeline-basics'],
    unlockedSkillIds: ['sk-edit-fundamentals'],
    inventory: ['loot-golden-razor'],
    achievementIds: ['ach-first-light'],
    completedChainIds: ['chain-first-week'],
    respecAt: '2026-03-01T09:00:00Z',
    dungeonStats: { 'dg-timeline-basics': { lastPassedDate: '2026-03-02' } },
    mastery: {
      ...newGame().mastery,
      audio: { tag: 'audio', xp: 640, level: 3, prestigeCount: 1 },
    },
    reputation: Object.fromEntries(
      Object.keys(newGame().reputation).map((id, i) => [id, i * 7]),
    ),
    replayLog: [
      { at: '2026-03-02T10:00:00Z', kind: 'boss', refId: 'boss-strange-room', outcome: 'passed' },
    ],
    campLayout: { slots: { ...newGame().campLayout.slots, title: 'cos-title-first-light' } },
    settings: { reducedMotion: true, soundEnabled: false, colorBlindSafe: true, soundVolume: 0.25 },
    bossAttempts: [
      {
        bossId: 'boss-strange-room',
        at: '2026-03-02T10:00:00Z',
        scores: { story: 9, editing: 9, camera: 9, visualCraft: 9, animation: 8, audioPost: 8 },
        total: 52,
        tier: 'mastery',
        difficulty: 'hard',
      },
    ],
  });

  it('returns a byte-for-byte equal state', () => {
    const before = rich();
    const result = importSave(exportSave(before, '2026-03-03T09:00:00Z'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toEqual(before);
  });

  it.each([
    'mastery',
    'masteryPoints',
    'reputation',
    'replayLog',
    'campLayout',
    'completedChainIds',
    'respecAt',
    'dungeonStats',
  ])('preserves %s exactly', (field) => {
    const before = rich();
    const result = importSave(exportSave(before, '2026-03-03T09:00:00Z'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.state as unknown as Record<string, unknown>)[field]).toEqual(
      (before as unknown as Record<string, unknown>)[field],
    );
  });

  it('preserves both new settings fields', () => {
    const result = importSave(exportSave(rich(), '2026-03-03T09:00:00Z'));
    expect(result.ok && result.state.settings.colorBlindSafe).toBe(true);
    expect(result.ok && result.state.settings.soundVolume).toBe(0.25);
  });

  it('preserves the difficulty on a logged boss attempt', () => {
    const result = importSave(exportSave(rich(), '2026-03-03T09:00:00Z'));
    expect(result.ok && result.state.bossAttempts[0]!.difficulty).toBe('hard');
  });

  it('stays human readable — a player can open the file and recognise it (SV-4)', () => {
    const text = exportSave(rich(), '2026-03-03T09:00:00Z');
    expect(text).toContain('\n  ');
    expect(JSON.parse(text).schemaVersion).toBe(2);
  });

  /** ⚠ v1 хэлбэрийн ЭКСПОРТ файл нь `MIGRATIONS[2]`-оор дамжиж орно (SVX-1). */
  it('imports a v1 export file through the v2 migration', () => {
    const v1 = {
      schemaVersion: 1,
      updatedAt: '2026-02-01T09:00:00Z',
      state: {
        schemaVersion: 1,
        xp: 300,
        level: 2,
        stamina: 6,
        maxStamina: 10,
        coins: 40,
        skillPoints: 1,
        combo: 1,
        streak: { current: 2, best: 4, lastQualifiedDate: '2026-01-31' },
        completedMainQuestIds: ['mq-first-cut'],
        sideQuestStats: {},
        completedDungeonIds: ['dg-timeline-basics'],
        unlockedSkillIds: [],
        inventory: [],
        achievementIds: [],
        bossAttempts: [],
        dailyMission: null,
        projects: [],
        settings: { reducedMotion: false, soundEnabled: true },
      },
    };

    const result = importSave(JSON.stringify(v1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migratedFrom).toBe(1);
    expect(result.state.xp).toBe(300);
    expect(result.state.completedMainQuestIds).toEqual(['mq-first-cut']);
    expect(result.state.dungeonStats).toEqual({ 'dg-timeline-basics': { lastPassedDate: null } });
    expect(Object.keys(result.state.mastery)).toHaveLength(7);
    expect(result.state.settings.soundVolume).toBe(1);
  });

  it('refuses a save from a future schema version instead of guessing (SV-5)', () => {
    const future = JSON.stringify({ ...toPayload(rich(), '2026-03-03T09:00:00Z'), schemaVersion: 99 });
    const result = importSave(JSON.stringify({ ...JSON.parse(future), state: { ...rich(), schemaVersion: 99 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too-new');
  });
});
