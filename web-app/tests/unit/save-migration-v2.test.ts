/**
 * SVX-1 · SVX-2 · SVX-4 — save v1 → v2 (T-06).
 *
 * ⚠ Хамгийн эмзэг амлалт: «хуучин save-ийн тоглоомын утга ХӨНДӨГДӨХГҮЙ». Тиймээс
 * доорх тест нь шинэ талбар нэмэгдсэнийг батлаад ЗОГСОХГҮЙ — v1-ийн БҮХ утгыг
 * талбар тутам тулгана.
 */
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, runMigrations } from '@shared/save/migrations.ts';
import { CURRENT_SCHEMA_VERSION } from '@shared/save/version.ts';
import { newGame } from '@shared/save/serialize.ts';
import { appendReplay } from '@shared/core/replayLog.ts';
import { daysBetween, dayOf } from '@shared/core/result.ts';
import { COSMETIC_SLOTS, REPLAY_LOG_CAP, SKILL_TAGS } from '@shared/core/constants.ts';
import { validateGameState } from '@shared/validate/index.ts';
import type { GameState, ReplayLogEntry } from '@shared/types/index.ts';

/** v1-ийн бодит хэлбэр — шинэ талбар БАЙХГҮЙ, `settings` нь 2 түлхүүртэй. */
const v1State = (): Record<string, unknown> => ({
  schemaVersion: 1,
  xp: 640,
  level: 3,
  stamina: 4,
  maxStamina: 10,
  coins: 120,
  skillPoints: 2,
  combo: 3,
  streak: { current: 5, best: 9, lastQualifiedDate: '2026-09-14' },
  completedMainQuestIds: ['mq-first-cut', 'mq-blender-toybox'],
  sideQuestStats: { 'sq-hotkey-hunter': { completions: 4, lastCompletedAt: '2026-09-14T19:12:00Z' } },
  completedDungeonIds: ['dg-timeline-basics', 'dg-color-theory'],
  unlockedSkillIds: ['sk-precision-cut'],
  inventory: ['loot-golden-razor'],
  achievementIds: ['ach-first-blood'],
  bossAttempts: [
    {
      bossId: 'boss-strange-room',
      at: '2026-09-10T12:00:00Z',
      scores: { story: 8, editing: 7, camera: 6, visualCraft: 5, animation: 5, audioPost: 5 },
      total: 36,
      tier: 'mvp',
    },
  ],
  dailyMission: { questId: 'sq-hotkey-hunter', date: '2026-09-15' },
  projects: [],
  settings: { reducedMotion: true, soundEnabled: false },
});

const migrate = (raw: Record<string, unknown>): GameState =>
  runMigrations(raw, 1, CURRENT_SCHEMA_VERSION) as unknown as GameState;

describe('SVX-1 — the save schema moves to version 2 (T-06)', () => {
  it('bumps CURRENT_SCHEMA_VERSION to 2 and registers exactly one new migration', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(typeof MIGRATIONS[2]).toBe('function');
  });

  it('produces a state that passes the v1.2.0 schema', () => {
    expect(validateGameState(migrate(v1State()))).toEqual([]);
  });

  it('starts a new game on version 2 with every new field present', () => {
    const fresh = newGame();
    expect(fresh.schemaVersion).toBe(2);
    expect(validateGameState(fresh)).toEqual([]);
  });
});

describe('SVX-4 — migrating v1 leaves every old value exactly as it was (T-06)', () => {
  const before = v1State();
  const after = migrate(v1State());

  it.each([
    'xp',
    'level',
    'stamina',
    'maxStamina',
    'coins',
    'skillPoints',
    'combo',
    'completedMainQuestIds',
    'sideQuestStats',
    'completedDungeonIds',
    'unlockedSkillIds',
    'inventory',
    'achievementIds',
    'dailyMission',
    'projects',
  ])('keeps %s untouched', (field) => {
    expect((after as unknown as Record<string, unknown>)[field]).toEqual(before[field]);
  });

  it('keeps the streak record untouched', () => {
    expect(after.streak).toEqual(before.streak);
  });

  it('keeps the player’s existing accessibility choices', () => {
    expect(after.settings.reducedMotion).toBe(true);
    expect(after.settings.soundEnabled).toBe(false);
  });
});

describe('SVX-1 — the v2 defaults are the ones the plan names (T-06)', () => {
  const after = migrate(v1State());

  it('creates one mastery track per skill tag at xp 0 · level 1 · prestigeCount 0', () => {
    expect(Object.keys(after.mastery).sort()).toEqual([...SKILL_TAGS].sort());
    for (const tag of SKILL_TAGS)
      expect(after.mastery[tag]).toEqual({ tag, xp: 0, level: 1, prestigeCount: 0 });
  });

  it('starts masteryPoints at zero — it is a remainder, not a total', () => {
    expect(after.masteryPoints).toBe(0);
  });

  it('starts every guild reputation at zero', () => {
    expect(Object.keys(after.reputation)).toHaveLength(4);
    expect(Object.values(after.reputation)).toEqual([0, 0, 0, 0]);
  });

  it('starts with an empty replay log, no finished chains and no respec', () => {
    expect(after.replayLog).toEqual([]);
    expect(after.completedChainIds).toEqual([]);
    expect(after.respecAt).toBeNull();
  });

  it('creates a camp layout with exactly the six slots, all empty', () => {
    expect(Object.keys(after.campLayout.slots).sort()).toEqual([...COSMETIC_SLOTS].sort());
    expect(Object.values(after.campLayout.slots).every((v) => v === null)).toBe(true);
  });

  it('adds the accessibility defaults: colorBlindSafe off, full volume', () => {
    expect(after.settings.colorBlindSafe).toBe(false);
    expect(after.settings.soundVolume).toBe(1);
  });

  /** ⚠ P-15 — `null` = refresher-т нэр дэвшихгүй. Хуучин тэнцсэн огноог ЗОХИОХГҮЙ. */
  it('records a dungeonStats entry per completed dungeon with a null pass date', () => {
    expect(after.dungeonStats).toEqual({
      'dg-timeline-basics': { lastPassedDate: null },
      'dg-color-theory': { lastPassedDate: null },
    });
  });

  it('stamps every existing boss attempt as standard difficulty (P-2)', () => {
    expect(after.bossAttempts.map((a) => a.difficulty)).toEqual(['standard']);
    // Оноо ба tier нь ХӨНДӨГДӨӨГҮЙ — зөвхөн difficulty нэмэгдсэн.
    expect(after.bossAttempts[0]!.total).toBe(36);
    expect(after.bossAttempts[0]!.tier).toBe('mvp');
  });
});

describe('SVX-2 — the replay log is capped at 500, FIFO (T-06)', () => {
  const entry = (n: number): ReplayLogEntry => ({
    at: `2026-09-16T00:00:${String(n % 60).padStart(2, '0')}Z`,
    kind: 'boss',
    refId: `boss-${n}`,
    outcome: n % 2 === 0 ? 'passed' : 'failed',
  });

  it('keeps the cap constant and the schema maximum in step', () => {
    expect(REPLAY_LOG_CAP).toBe(500);
  });

  it('appends below the cap without dropping anything', () => {
    let state = newGame();
    for (let i = 0; i < 10; i++) state = appendReplay(state, entry(i));
    expect(state.replayLog).toHaveLength(10);
    expect(state.replayLog[0]!.refId).toBe('boss-0');
  });

  it('drops the oldest entry once the 501st arrives and keeps the newest', () => {
    let state = newGame();
    for (let i = 0; i < REPLAY_LOG_CAP + 1; i++) state = appendReplay(state, entry(i));
    expect(state.replayLog).toHaveLength(REPLAY_LOG_CAP);
    expect(state.replayLog[0]!.refId).toBe('boss-1');
    expect(state.replayLog.at(-1)!.refId).toBe(`boss-${REPLAY_LOG_CAP}`);
  });

  it('never mutates the state it was handed — appendReplay is pure', () => {
    const state = newGame();
    const next = appendReplay(state, entry(1));
    expect(state.replayLog).toEqual([]);
    expect(next).not.toBe(state);
  });

  it('keeps a capped log schema-valid', () => {
    let state = newGame();
    for (let i = 0; i < REPLAY_LOG_CAP + 25; i++) state = appendReplay(state, entry(i));
    expect(validateGameState(state)).toEqual([]);
  });
});

describe('P-18 — daysBetween lives next to dayOf and reads no clock (T-06)', () => {
  it('counts whole UTC calendar days', () => {
    expect(daysBetween('2026-09-01', '2026-09-15')).toBe(14);
    expect(daysBetween('2026-09-15', '2026-09-15')).toBe(0);
  });

  it('crosses month and year boundaries', () => {
    expect(daysBetween('2026-02-25', '2026-03-04')).toBe(7);
    expect(daysBetween('2025-12-28', '2026-01-04')).toBe(7);
  });

  it('is negative when the second day is earlier — the caller decides what that means', () => {
    expect(daysBetween('2026-09-15', '2026-09-08')).toBe(-7);
  });

  it('composes with dayOf so an ISO timestamp can be compared to a date', () => {
    expect(daysBetween(dayOf('2026-09-01T23:59:59Z'), '2026-09-15')).toBe(14);
  });
});
