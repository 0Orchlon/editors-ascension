/** Цуваалт, ачаалалт, migration (lld.md §5.3; AC SV-1, SV-2, SV-4). */
import type { GameState, Issue, SavePayload } from '../types/index.ts';
import { validateGameState } from '../validate/index.ts';
import {
  defaultCampLayout,
  defaultMastery,
  defaultReputation,
  runMigrations,
  type Migration,
} from './migrations.ts';
import { CURRENT_SCHEMA_VERSION } from './version.ts';

export type LoadResult =
  | { ok: true; state: GameState; migratedFrom?: number }
  | { ok: false; reason: 'parse' | 'schema' | 'too-new'; issues?: Issue[] };

export function newGame(): GameState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    xp: 0,
    level: 1,
    stamina: 10,
    maxStamina: 10,
    coins: 0,
    skillPoints: 0,
    combo: 0,
    streak: { current: 0, best: 0, lastQualifiedDate: null },
    completedMainQuestIds: [],
    sideQuestStats: {},
    completedDungeonIds: [],
    unlockedSkillIds: [],
    inventory: [],
    achievementIds: [],
    bossAttempts: [],
    dailyMission: null,
    projects: [],
    settings: { reducedMotion: false, soundEnabled: true, colorBlindSafe: false, soundVolume: 1 },

    // ⚠ v2 — анхдагч нь `MIGRATIONS[2]`-той ИЖИЛ эхээс гарна (`migrations.ts`),
    // эс бөгөөс шинэ тоглоом ба нүүлгэсэн save хоёр өөр хэлбэртэй болно.
    mastery: defaultMastery() as GameState['mastery'],
    masteryPoints: 0,
    reputation: defaultReputation(),
    replayLog: [],
    campLayout: defaultCampLayout() as GameState['campLayout'],
    completedChainIds: [],
    respecAt: null,
    dungeonStats: {},
  };
}

export function toPayload(state: GameState, at: string): SavePayload {
  return { schemaVersion: state.schemaVersion, updatedAt: at, state };
}

/**
 * Түүхий утгаас төлөв ачаална. `SavePayload` (`{schemaVersion, state}`) болон
 * нүцгэн `GameState` хоёуланг хүлээж авна — export файл ба localStorage нэг замаар орно.
 */
export function loadState(
  raw: unknown,
  registry?: Record<number, Migration>,
): LoadResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return { ok: false, reason: 'parse' };

  const box = raw as Record<string, unknown>;
  const inner =
    typeof box.state === 'object' && box.state !== null ? (box.state as Record<string, unknown>) : box;

  const version = typeof inner.schemaVersion === 'number' ? inner.schemaVersion : undefined;
  if (version === undefined || !Number.isInteger(version) || version < 1)
    return { ok: false, reason: 'parse' };
  if (version > CURRENT_SCHEMA_VERSION) return { ok: false, reason: 'too-new' };

  const migrated =
    version < CURRENT_SCHEMA_VERSION
      ? runMigrations(inner, version, CURRENT_SCHEMA_VERSION, registry)
      : inner;

  const issues = validateGameState(migrated);
  if (issues.length) return { ok: false, reason: 'schema', issues };

  const result: LoadResult = { ok: true, state: migrated as unknown as GameState };
  if (version < CURRENT_SCHEMA_VERSION) result.migratedFrom = version;
  return result;
}
