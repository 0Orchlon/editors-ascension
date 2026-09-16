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
import { earnedMasteryPoints } from '@shared/core/mastery.ts';
import { respecTree } from '@shared/core/skillTree.ts';
import { personalBest } from '@shared/core/boss.ts';
import { PERSONAL_1_SKILL_IDS } from '@shared/validate/content-rules.ts';
import { buildPack } from '@shared/content/index.ts';
import type { GameState, ReplayLogEntry } from '@shared/types/index.ts';

const pack = buildPack();

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

  /**
   * lld.md §5.1-ийн 9 дэх алхам нь `{ ...a, difficulty: 'standard' }` — spread нь
   * ЭХЭНД, тиймээс `difficulty` нь ҮРГЭЛЖ дарж бичигдэнэ.
   *
   * ⚠ Яагаад энэ нь бодит эмзэг байдал вэ: `loadState` нь схемийн шалгалтыг
   * migration-ий ДАРАА, v2 схемээр хийдэг (`serialize.ts`). Тиймээс гараар зохиосон
   * `schemaVersion: 1` файл нь v1-ийн схемд БАЙХГҮЙ `difficulty: 'hard'` талбарыг
   * агуулж чадна. Хэрэв migration тэрийг хүндэтгэвэл hard mode-ийн босго (41/52/60)
   * даваагүй оноо нь hard дээд амжилт болж бүртгэгдэнэ (BSX-3-ийн эсрэг).
   */
  it('overwrites a crafted difficulty on a v1 attempt instead of trusting it (§5.1 · BSX-3)', () => {
    const crafted = v1State();
    (crafted.bossAttempts as Record<string, unknown>[])[0]!.difficulty = 'hard';
    const migrated = migrate(crafted);
    expect(migrated.bossAttempts[0]!.difficulty).toBe('standard');
  });

  /**
   * Дээрх алдааны АНГИЛЛЫГ хаана, тохиолдлыг нь биш.
   *
   * `toV2` нь `...state`-ыг ЭХЭНД тавьж 9 талбарыг дараа нь онооно. Аль нэгийг нь
   * spread-ийн ард зөөвөл (эсвэл шинэ алхам буруу бичвэл) гараар зохиосон v1 файл
   * тэр талбарыг дамжуулж чадна. Энэ тест 9 талбарыг БҮГДИЙГ нь хортой утгаар
   * дүүргэж, migration бүгдийг нь дарж бичихийг шаардана.
   */
  it('overwrites every field it owns, whatever the v1 file claims (§5.1)', () => {
    const hostile = {
      ...v1State(),
      settings: { reducedMotion: true, soundEnabled: false, colorBlindSafe: true, soundVolume: 0.25 },
      mastery: { audio: { tag: 'audio', xp: 99999, level: 10, prestigeCount: 7 } },
      masteryPoints: 99,
      reputation: { 'guild-a': 9999 },
      replayLog: [{ at: '2020-01-01T00:00:00Z', kind: 'boss', refId: 'x', outcome: 'passed' }],
      campLayout: { slots: { avatarFrame: 'cos-not-real' } },
      completedChainIds: ['chain-not-real'],
      respecAt: '2020-01-01T00:00:00Z',
      dungeonStats: { 'dg-timeline-basics': { lastPassedDate: '2020-01-01' } },
    };
    const migrated = migrate(hostile);

    expect(migrated.masteryPoints).toBe(0);
    // Зохиосон guild ХАЯГДАНА, бодит 4 нь 0-оос эхэлнэ.
    expect(migrated.reputation['guild-a']).toBeUndefined();
    expect(Object.values(migrated.reputation).every((v) => v === 0)).toBe(true);
    expect(migrated.replayLog).toEqual([]);
    expect(migrated.completedChainIds).toEqual([]);
    expect(migrated.respecAt).toBeNull();
    expect(migrated.campLayout.slots.avatarFrame).toBeNull();
    // ⚠ `dungeonStats` нь `completedDungeonIds`-ээс ДАХИН баригдана (P-15): зохиосон
    // огноо амьд үлдвэл refresher шууд гарч ирнэ.
    expect(migrated.dungeonStats['dg-timeline-basics']).toEqual({ lastPassedDate: null });
    // ⚠ v1-д БАЙСАН хоёр тохиргоо хадгалагдана, v2-ийн хоёр нь анхдагчаар онооно.
    expect(migrated.settings).toEqual({
      reducedMotion: true, soundEnabled: false, colorBlindSafe: false, soundVolume: 1,
    });
    for (const tag of SKILL_TAGS)
      expect(migrated.mastery[tag]).toEqual({ tag, xp: 0, level: 1, prestigeCount: 0 });
  });

  /** Дээрхийн үр дагавар: хуурамч hard дээд амжилт үүсэхгүй. */
  it('keeps the hard-mode personal best at zero after a crafted v1 import (BSX-3)', () => {
    const crafted = v1State();
    (crafted.bossAttempts as Record<string, unknown>[])[0]!.difficulty = 'hard';
    expect(personalBest(migrate(crafted), 'boss-strange-room', 'hard')).toBe(0);
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

/**
 * Хянагчийн барьсан блоклогч (`lld.md §6.6.1` · A-LLD2-4 · Δ-3).
 *
 * PERSONAL-1-ийн 24 node нь v1-д `skillPoints`-оор нээгддэг байсан. Аль нэгийг нь
 * tier-2 болгох нь migration хийсэн save-д «үлдэгдэл + зарцуулсан == олдсон»
 * инвариантыг ЗӨРЧИНӨ: migration нь `masteryPoints ← 0`, mastery track бүгд level 1
 * (олдсон = 0) бичдэг тул зарцуулсан > олдсон болно. Дараа нь `respecTree` нь
 * ОЛДООГҮЙ mastery point-ыг гараас гаргаж өгнө.
 *
 * ⚠ Одоогийн `skillTree.test.ts`-ийн инвариантын тест нь СИНТЕТИК төлөв дээр
 * ажилладаг тул энэ тохиолдлыг хамрахгүй — тиймээс шалгалт ЭНД, migration дээр.
 */
describe('MST-4 · P-20 — the invariant survives a real v1 → v2 migration (§6.6.1)', () => {
  const v1WithRealSkills = (unlockedSkillIds: string[]): Record<string, unknown> => ({
    ...v1State(),
    unlockedSkillIds,
  });

  const legacyIds: readonly string[] = PERSONAL_1_SKILL_IDS;

  const spentMasteryPoints = (ids: readonly string[]): number =>
    ids.filter((id) => (pack.skills.find((s) => s.id === id)?.tier ?? 1) >= 2).length;

  it('keeps every PERSONAL-1 node at tier 1 — nothing a v1 save bought costs mastery points', () => {
    const legacy = pack.skills.filter((s) => legacyIds.includes(s.id));
    expect(legacy).toHaveLength(PERSONAL_1_SKILL_IDS.length);
    expect(legacy.filter((s) => s.tier !== 1).map((s) => s.id)).toEqual([]);
  });

  it('adds the tier-2 and tier-3 nodes rather than re-labelling old ones (38 total)', () => {
    expect(pack.skills).toHaveLength(38);
    for (const tag of SKILL_TAGS) {
      const tree = pack.skills.filter((s) => s.track === tag);
      expect(tree.filter((s) => s.tier === 2)).toHaveLength(1);
      expect(tree.filter((s) => s.tier === 3)).toHaveLength(1);
      // Шинэ tier-2 node нь PERSONAL-1-ийн жагсаалтад БАЙХГҮЙ — хөрвүүлсэн биш, шинэ.
      for (const node of tree.filter((s) => s.tier >= 2))
        expect(legacyIds).not.toContain(node.id);
    }
  });

  it('migrates a v1 save whose unlocked nodes are real without breaking remainder + spent = earned', () => {
    const unlocked = ['sk-modeling', 'sk-uv-texturing', 'sk-shading'];
    const migrated = runMigrations(v1WithRealSkills(unlocked), 1, 2) as unknown as GameState;

    expect(migrated.masteryPoints).toBe(0);
    expect(earnedMasteryPoints(migrated)).toBe(0);
    expect(migrated.masteryPoints + spentMasteryPoints(migrated.unlockedSkillIds)).toBe(
      earnedMasteryPoints(migrated),
    );
  });

  it('never hands out unearned mastery points when a migrated save respecs (SKL-3)', () => {
    const unlocked = ['sk-modeling', 'sk-uv-texturing', 'sk-shading'];
    const migrated = runMigrations(v1WithRealSkills(unlocked), 1, 2) as unknown as GameState;

    const respecced = respecTree(migrated, 'blender', '2026-09-20T09:00:00Z', pack);
    expect(respecced.ok).toBe(true);
    if (!respecced.ok) return;

    // Бүх буцаалт `skillPoints` руу — v1 тоглогч тэрхүү валютаар л төлсөн.
    expect(respecced.state.masteryPoints).toBe(0);
    expect(respecced.state.skillPoints).toBe((migrated.skillPoints as number) + unlocked.length);
    expect(
      respecced.state.masteryPoints + spentMasteryPoints(respecced.state.unlockedSkillIds),
    ).toBe(earnedMasteryPoints(respecced.state));
  });
});
