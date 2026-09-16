/**
 * RET-4 — dungeon refresher-ийн нэр дэвшилт (T-15; plan.md P-15 · P-18 · §12.4).
 *
 * ⚠ Refresher нь СҮҮЛИЙН АРГА: DM-3-ийн 1–3 эрэмбэд (main → dungeon → side) шинэ
 * нэр дэвшигч байвал хүрэхгүй. Тиймээс тест бүрд «шинэ ажил байхгүй» төлвийг ил
 * барина — эс бөгөөс тест өөрөө өөрийгөө хуурна.
 */
import { describe, expect, it } from 'vitest';
import { pickDailyMission } from '@shared/core/dailyMission.ts';
import { REFRESHER_MIN_DAYS } from '@shared/core/constants.ts';
import type { ContentPack, GameState } from '@shared/types/index.ts';
import { freshState, quest, testPack } from './fixtures.ts';

const pack: ContentPack = testPack({
  quests: [
    quest({ id: 'mq-1', track: 'main', world: 1, xp: 60 }),
    quest({ id: 'dg-1', track: 'dungeon', world: 1, xp: 40, staminaCost: 1 }),
    quest({ id: 'dg-2', track: 'dungeon', world: 1, xp: 40, staminaCost: 1 }),
    // ⚠ Давтагдахгүй: давтагдах side quest нь ҮРГЭЛЖ нэр дэвшигч тул refresher-т
    // ээлж ХЭЗЭЭ Ч ирэхгүй байх байсан — тэр тохиолдлыг доор тусад нь шалгана.
    quest({ id: 'sq-1', track: 'side', world: 1, xp: 20, repeatable: false }),
  ],
});

/** Давтагдах side quest-тэй хувилбар — эрэмбийн тестэд. */
const repeatablePack: ContentPack = testPack({
  quests: [
    quest({ id: 'mq-1', track: 'main', world: 1, xp: 60 }),
    quest({ id: 'dg-1', track: 'dungeon', world: 1, xp: 40, staminaCost: 1 }),
    quest({ id: 'sq-rep', track: 'side', world: 1, xp: 20, repeatable: true }),
  ],
});

/** Бүх шинэ ажил дууссан төлөв — зөвхөн refresher үлдэнэ. */
const exhausted = (over: Partial<GameState> = {}): GameState => ({
  ...freshState(),
  completedMainQuestIds: ['mq-1'],
  completedDungeonIds: ['dg-1', 'dg-2'],
  sideQuestStats: { 'sq-1': { completions: 1, lastCompletedAt: '2026-01-01T09:00:00Z' } },
  ...over,
});

const passedOn = (id: string, date: string | null) => ({ [id]: { lastPassedDate: date } });

/**
 * ⚠ lld.md §6.9 — refresher-ийн шүүлт нь `q.levelRequired <= state.level`-ийг МӨН
 * агуулна, эрэмбэ нь TIERS-ийнхтэй ИЖИЛ (`world → levelRequired → id`). Түвшний
 * шүүлтгүй бол prestige/respec-ийн дараа түвшнээс дээш dungeon санал болгогдож
 * тоглогч ЭХЛҮҮЛЖ ч чадахгүй даалгавар авна.
 */
describe('RET-4 — the refresher pool obeys the same level gate as the main pool (§6.9)', () => {
  const gatedPack: ContentPack = testPack({
    quests: [
      quest({ id: 'mq-1', track: 'main', world: 1, xp: 60 }),
      quest({ id: 'dg-low', track: 'dungeon', world: 1, xp: 40, staminaCost: 1, levelRequired: 1 }),
      quest({ id: 'dg-high', track: 'dungeon', world: 1, xp: 40, staminaCost: 1, levelRequired: 9 }),
    ],
  });
  const done = (over: Partial<GameState> = {}): GameState => ({
    ...freshState(),
    completedMainQuestIds: ['mq-1'],
    completedDungeonIds: ['dg-low', 'dg-high'],
    ...over,
  });

  it('never nominates a dungeon above the player level', () => {
    const state = done({ level: 1, dungeonStats: passedOn('dg-high', '2026-01-01') });
    expect(pickDailyMission(state, '2026-06-01', gatedPack)).toBeNull();
  });

  it('still nominates the same dungeon once the player reaches its level', () => {
    const state = done({ level: 9, dungeonStats: passedOn('dg-high', '2026-01-01') });
    expect(pickDailyMission(state, '2026-06-01', gatedPack)).toBe('dg-high');
  });

  it('picks the same dungeon no matter what order the pack lists them in', () => {
    // Эрэмбэ (`world → levelRequired → id`) нь БҮТЭН тул пакетын массивын дараалал
    // сонголтод нөлөөлөхгүй. Эрэмбэгүй бол `fnv1a(date) % n` нь өөр зүйл заана.
    const quests = [
      quest({ id: 'dg-a', track: 'dungeon', world: 2, xp: 40, staminaCost: 1, levelRequired: 1 }),
      quest({ id: 'dg-b', track: 'dungeon', world: 1, xp: 40, staminaCost: 1, levelRequired: 5 }),
      quest({ id: 'dg-c', track: 'dungeon', world: 1, xp: 40, staminaCost: 1, levelRequired: 2 }),
    ];
    const state: GameState = {
      ...freshState(),
      level: 9,
      completedDungeonIds: ['dg-a', 'dg-b', 'dg-c'],
      dungeonStats: {
        'dg-a': { lastPassedDate: '2026-01-01' },
        'dg-b': { lastPassedDate: '2026-01-01' },
        'dg-c': { lastPassedDate: '2026-01-01' },
      },
    };
    const pickAll = (list: typeof quests): (string | null)[] =>
      Array.from({ length: 12 }, (_, d) =>
        pickDailyMission(state, `2026-06-${String(d + 1).padStart(2, '0')}`, testPack({ quests: list })),
      );
    expect(pickAll([...quests].reverse())).toEqual(pickAll(quests));
    expect(new Set(pickAll(quests))).toEqual(new Set(['dg-a', 'dg-b', 'dg-c']));
  });
});

describe('RET-4 — a long-untouched dungeon becomes a candidate (T-15)', () => {
  it('keeps the minimum at fourteen game days', () => {
    expect(REFRESHER_MIN_DAYS).toBe(14);
  });

  it('does not nominate at thirteen days', () => {
    const state = exhausted({ dungeonStats: passedOn('dg-1', '2026-03-01') });
    expect(pickDailyMission(state, '2026-03-14', pack)).toBeNull();
  });

  it('nominates at exactly fourteen days', () => {
    const state = exhausted({ dungeonStats: passedOn('dg-1', '2026-03-01') });
    expect(pickDailyMission(state, '2026-03-15', pack)).toBe('dg-1');
  });

  it('nominates well past the threshold', () => {
    const state = exhausted({ dungeonStats: passedOn('dg-1', '2026-01-01') });
    expect(pickDailyMission(state, '2026-06-01', pack)).toBe('dg-1');
  });

  /** ⚠ P-15 — `null` = «хэзээ тэнцсэн нь тодорхойгүй» → нэр дэвшихГҮЙ. */
  it('never nominates a dungeon whose pass date is unknown', () => {
    const state = exhausted({ dungeonStats: passedOn('dg-1', null) });
    expect(pickDailyMission(state, '2026-12-31', pack)).toBeNull();
  });

  it('never nominates a dungeon with no stats entry at all', () => {
    const state = exhausted({ dungeonStats: {} });
    expect(pickDailyMission(state, '2026-12-31', pack)).toBeNull();
  });

  it('never nominates a dungeon that was never completed', () => {
    const state = exhausted({
      completedDungeonIds: ['dg-2'],
      dungeonStats: passedOn('dg-1', '2026-01-01'),
    });
    // dg-1 нь дуусаагүй тул ЭНГИЙН нэр дэвшигч — refresher биш; DM-3-ийн 2 дахь эрэмбэ.
    expect(pickDailyMission(state, '2026-06-01', pack)).toBe('dg-1');
  });
});

describe('RET-4 — the refresher is the last resort (T-15)', () => {
  it('prefers an unfinished main quest over a stale dungeon', () => {
    const state = exhausted({
      completedMainQuestIds: [],
      dungeonStats: passedOn('dg-1', '2026-01-01'),
    });
    expect(pickDailyMission(state, '2026-06-01', pack)).toBe('mq-1');
  });

  it('prefers a repeatable side quest over a stale dungeon', () => {
    const state = exhausted({
      sideQuestStats: {},
      dungeonStats: passedOn('dg-1', '2026-01-01'),
    });
    // Давтагдах side quest нь ҮРГЭЛЖ нэр дэвшигч — refresher-т ээлж ирэхгүй.
    expect(pickDailyMission(state, '2026-06-01', repeatablePack)).toBe('sq-rep');
  });
});

describe('DM-1 — determinism survives the new branch (T-15)', () => {
  it('returns the same answer for the same input, twice', () => {
    const state = exhausted({
      dungeonStats: { ...passedOn('dg-1', '2026-01-01'), ...passedOn('dg-2', '2026-01-02') },
    });
    const first = pickDailyMission(state, '2026-06-01', pack);
    expect(pickDailyMission(state, '2026-06-01', pack)).toBe(first);
    expect(['dg-1', 'dg-2']).toContain(first);
  });

  it('varies the pick with the date, not with the call', () => {
    const state = exhausted({
      dungeonStats: { ...passedOn('dg-1', '2026-01-01'), ...passedOn('dg-2', '2026-01-02') },
    });
    const picks = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04'].map((d) =>
      pickDailyMission(state, d, pack),
    );
    expect(picks.every((p) => p === 'dg-1' || p === 'dg-2')).toBe(true);
    // Хоёр дахин дуудахад ижил гарна — сонголт нь ЗӨВХӨН огнооноос хамаарна.
    expect(picks).toEqual(
      ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04'].map((d) => pickDailyMission(state, d, pack)),
    );
  });

  it('still returns null when nothing at all qualifies', () => {
    const state = exhausted({ dungeonStats: passedOn('dg-1', '2026-06-01') });
    expect(pickDailyMission(state, '2026-06-02', pack)).toBeNull();
  });
});

/**
 * `lld.md §6.9`-ийн T-15-д нэрлэгдсэн шаардлага — кодод байгаагүй.
 *
 * `previous` шүүлт нь зөвхөн ҮНДСЭН pool-д хэрэглэгдэж байсан тул refresher нь
 * өчигдрийнхтэй ижил dungeon-ыг дахин гаргаж, тоглогч хоёр өдөр дараалан ижил
 * зүйл харах боломжтой байв. TIERS-ийн зан төлөвтэй НЭГЭН ИЖИЛ байх ёстой.
 */
describe('RET-4 — the refresher drops yesterday’s mission too (§6.9 T-15)', () => {
  const stale = {
    ...passedOn('dg-1', '2026-01-01'),
    ...passedOn('dg-2', '2026-01-02'),
  };

  it('never repeats yesterday when two refresher candidates exist', () => {
    for (const previous of ['dg-1', 'dg-2']) {
      const state = exhausted({
        dungeonStats: stale,
        dailyMission: { questId: previous, date: '2026-05-31' },
      });
      for (const date of ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04'])
        expect(pickDailyMission(state, date, pack)).not.toBe(previous);
    }
  });

  /** ⚠ Сүүлчийн нэр дэвшигчийг хасах нь «Rest day» болгоно — DM-2-ийн ижил дүрэм. */
  it('still returns the only candidate when it is also yesterday’s', () => {
    const state = exhausted({
      dungeonStats: passedOn('dg-1', '2026-01-01'),
      dailyMission: { questId: 'dg-1', date: '2026-05-31' },
    });
    expect(pickDailyMission(state, '2026-06-01', pack)).toBe('dg-1');
  });
});
