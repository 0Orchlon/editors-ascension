/**
 * MST-2 · MST-6 · RET-5 — mastery · rep · chain-ийг контентын гүйцэтгэлд залгах (T-09).
 *
 * ⚠ ДАРААЛАЛ нь гэрээ (plan.md §13.2): `3a mastery` → `4 бүртгэл` → `4a rep` →
 * `4b chain` → … → `8 амжилт`. Mastery ба rep нь амжилтын үнэлгээнээс ӨМНӨ байх
 * ЁСТОЙ — эс бөгөөс `masteryLevel` · `guildRank` предикаттай амжилт нэг үйлдэл
 * ХОЦРОЖ олгогдоно. Доорх тестүүд тэр дарааллыг ИЛ шалгана.
 */
import { describe, expect, it } from 'vitest';
import { claimQuest } from '@shared/core/quests.ts';
import { attemptDungeon } from '@shared/core/dungeons.ts';
import { attemptBoss } from '@shared/core/boss.ts';
import { sideQuestXp } from '@shared/core/sideQuests.ts';
import { XP_THRESHOLDS } from '@shared/core/constants.ts';
import type { ContentPack, GameState } from '@shared/types/index.ts';
import { freshState, quest, quietCtx, testPack } from './fixtures.ts';

const GUILDS = [
  { id: 'g-cut', title: 'Cut', tags: ['video-editing', 'cinematography'], placeholder: true },
  { id: 'g-form', title: 'Form', tags: ['blender', 'animation'], placeholder: true },
  { id: 'g-story', title: 'Story', tags: ['storytelling'], placeholder: true },
  { id: 'g-signal', title: 'Signal', tags: ['audio', 'vfx'], placeholder: true },
] as unknown as ContentPack['guilds'];

const pack = (over: Partial<ContentPack> = {}): ContentPack =>
  testPack({
    guilds: GUILDS,
    quests: [
      quest({ id: 'mq-1', track: 'main', world: 1, xp: 60, tags: ['audio', 'storytelling'] }),
      quest({ id: 'sq-1', track: 'side', world: 1, xp: 40, repeatable: true, tags: ['audio'] }),
      quest({ id: 'boss-1', track: 'boss', type: 'boss', world: 1, xp: 200, tags: ['storytelling'] }),
    ],
    ...over,
  });

const start = (over: Partial<GameState> = {}): GameState => ({ ...freshState(), stamina: 10, ...over });
const all = ['v1', 'v2'].map((_, i) => i);

describe('MST-2 — finishing content feeds every track it is tagged with (T-09)', () => {
  it('gives each of the two tags the full quest xp — not a split share (A4)', () => {
    const result = claimQuest(start(), { questId: 'mq-1', checkedConditions: all }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.mastery.audio!.xp).toBe(60);
    expect(result.state.mastery.storytelling!.xp).toBe(60);
    // Дүрийн XP нь ӨӨРЧЛӨГДӨӨГҮЙ — PRG-1…PRG-3 хэвээр.
    expect(result.state.xp).toBe(60);
  });

  it('leaves the five untagged tracks untouched', () => {
    const before = start();
    const result = claimQuest(before, { questId: 'mq-1', checkedConditions: all }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const tag of ['blender', 'animation', 'cinematography', 'vfx', 'video-editing'] as const)
      expect(result.state.mastery[tag]).toEqual(before.mastery[tag]);
  });

  /** ⚠ P-17 — mastery-д ОЛГОГДСОН XP очно (SQ-2-ийн бууралтын ДАРААХ утга). */
  it('feeds mastery the awarded xp for a repeated side quest, not the base xp', () => {
    const third = { completions: 2, lastCompletedAt: '2026-03-08T09:00:00Z' };
    const state = start({ sideQuestStats: { 'sq-1': third } });
    const result = claimQuest(state, { questId: 'sq-1', checkedConditions: all }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const awarded = sideQuestXp(40, 3);
    expect(awarded).toBe(10);
    expect(result.state.mastery.audio!.xp).toBe(awarded);
    expect(result.state.xp).toBe(awarded);
  });

  it('feeds mastery when a dungeon is passed for the first time', () => {
    const dungeonPack = testPack({
      guilds: GUILDS,
      dungeons: [
        {
          id: 'dg-1',
          title: 'D',
          conceptGoal: 'learn the thing properly',
          estimatedMinutes: 20,
          xp: 50,
          tags: ['blender'],
          tutorialRefs: [],
          questions: [{ id: 'q1', prompt: 'p', options: ['a', 'b'], correctIndex: 0, explanation: 'e' }],
        },
      ] as unknown as ContentPack['dungeons'],
    });
    const result = attemptDungeon(start(), { dungeonId: 'dg-1', answers: [0] }, quietCtx(dungeonPack));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.mastery.blender!.xp).toBe(50);
  });

  it('feeds mastery when a boss is passed for the first time', () => {
    const scores = { story: 10, editing: 10, camera: 10, visualCraft: 10, animation: 10, audioPost: 10 };
    const result = attemptBoss(start(), { bossId: 'boss-1', scores }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.mastery.storytelling!.xp).toBe(200);
  });

  it('gives no mastery for a failed boss attempt', () => {
    const scores = { story: 1, editing: 1, camera: 1, visualCraft: 1, animation: 1, audioPost: 1 };
    const result = attemptBoss(start(), { bossId: 'boss-1', scores }, quietCtx(pack()));
    expect(result.ok && result.state.mastery.storytelling!.xp).toBe(0);
  });

  it('emits MASTERY_LEVEL_UP inside the claim when a track crosses a threshold', () => {
    const state = start({
      mastery: {
        ...freshState().mastery,
        audio: { tag: 'audio', xp: XP_THRESHOLDS[0]! - 10, level: 1, prestigeCount: 0 },
      },
    });
    const result = claimQuest(state, { questId: 'mq-1', checkedConditions: all }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.some((e) => e.type === 'MASTERY_LEVEL_UP')).toBe(true);
  });
});

describe('RET-5 — reputation lands inside the same claim (T-09)', () => {
  it('credits the guilds of both tags on a main quest claim', () => {
    const result = claimQuest(start(), { questId: 'mq-1', checkedConditions: all }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.reputation['g-signal']).toBe(3);
    expect(result.state.reputation['g-story']).toBe(3);
  });

  it('follows the diminishing schedule for a repeated side quest', () => {
    let state = start();
    const awards: number[] = [];
    for (let i = 0; i < 3; i++) {
      const result = claimQuest(state, { questId: 'sq-1', checkedConditions: all }, quietCtx(pack()));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      awards.push((result.state.reputation['g-signal'] ?? 0) - (state.reputation['g-signal'] ?? 0));
      state = { ...result.state, stamina: 10 };
    }
    // `2 · 1 · 0` — grind нь тэгд нийлнэ (plan.md §12.3).
    expect(awards).toEqual([2, 1, 0]);
  });

  it('emits REPUTATION_GAINED before ACHIEVEMENT_UNLOCKED in the event stream', () => {
    const achievementPack = pack({
      achievements: [
        {
          id: 'ach-rep',
          title: 'Rep',
          description: 'Reach rank 0 with a guild.',
          predicate: { kind: 'guildRank', value: 1, ref: 'g-story' },
        },
      ] as unknown as ContentPack['achievements'],
    });
    const state = start({ reputation: { 'g-cut': 0, 'g-form': 0, 'g-story': 9, 'g-signal': 0 } });
    const result = claimQuest(state, { questId: 'mq-1', checkedConditions: all }, quietCtx(achievementPack));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const types = result.events.map((e) => e.type);
    // ⚠ Rep нь амжилтын үнэлгээнээс ӨМНӨ гарсан тул амжилт нэг үйлдэл хоцроогүй.
    expect(types.indexOf('REPUTATION_GAINED')).toBeLessThan(types.indexOf('ACHIEVEMENT_UNLOCKED'));
    expect(result.state.achievementIds).toContain('ach-rep');
  });

  it('emits MASTERY_LEVEL_UP before ACHIEVEMENT_UNLOCKED in the event stream', () => {
    const achievementPack = pack({
      achievements: [
        {
          id: 'ach-mastery',
          title: 'Mastery',
          description: 'Reach mastery level 2 in audio.',
          predicate: { kind: 'masteryLevel', value: 2, ref: 'audio' },
        },
      ] as unknown as ContentPack['achievements'],
    });
    const state = start({
      mastery: {
        ...freshState().mastery,
        audio: { tag: 'audio', xp: XP_THRESHOLDS[0]! - 10, level: 1, prestigeCount: 0 },
      },
    });
    const result = claimQuest(state, { questId: 'mq-1', checkedConditions: all }, quietCtx(achievementPack));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const types = result.events.map((e) => e.type);
    expect(types.indexOf('MASTERY_LEVEL_UP')).toBeLessThan(types.indexOf('ACHIEVEMENT_UNLOCKED'));
    expect(result.state.achievementIds).toContain('ach-mastery');
  });

  /**
   * lld.md §7.1 — алхам `3` (бүртгэл) нь алхам `3a` (mastery)-аас ӨМНӨ.
   *
   * ⚠ Яагаад дараалал нь гэрээ вэ: event урсгал нь FX ба `aria-live`-ийн ЦОРЫН ГАНЦ
   * эх (§9.3). «Mastery Lv 2!» гэж эхэлж дараа нь «Quest complete» гэж уншуулах нь
   * шалтгаан-үр дагаврыг эргүүлж, дэлгэц хардаггүй тоглогчийг төөрөгдүүлнэ.
   * Төлөвт нөлөөгүй тул зөвхөн индексийн тест л энэ зөрүүг барина.
   */
  it('emits QUEST_COMPLETED before MASTERY_LEVEL_UP (§7.1 step 3 → 3a)', () => {
    const state = start({
      mastery: {
        ...freshState().mastery,
        audio: { tag: 'audio', xp: XP_THRESHOLDS[0]! - 10, level: 1, prestigeCount: 0 },
      },
    });
    const result = claimQuest(state, { questId: 'mq-1', checkedConditions: all }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const types = result.events.map((e) => e.type);
    expect(types).toContain('MASTERY_LEVEL_UP');
    expect(types.indexOf('QUEST_COMPLETED')).toBeLessThan(types.indexOf('MASTERY_LEVEL_UP'));
  });

  /** §7.1 — XP нь бүртгэлээс ӨМНӨ (алхам 2 → 3): «+40 XP» дараа нь «Quest complete». */
  it('emits XP_GAINED before QUEST_COMPLETED (§7.1 step 2 → 3)', () => {
    const result = claimQuest(start(), { questId: 'mq-1', checkedConditions: all }, quietCtx(pack()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const types = result.events.map((e) => e.type);
    expect(types.indexOf('XP_GAINED')).toBeLessThan(types.indexOf('QUEST_COMPLETED'));
  });
});

describe('RET-2 — a chain closes inside the claim that finished its last step (T-09)', () => {
  const steps = ['sq-a', 'sq-b', 'sq-c', 'sq-d'];
  const chainPack = testPack({
    guilds: GUILDS,
    quests: [
      quest({ id: 'mq-w1', track: 'main', world: 1, xp: 60 }),
      ...steps.map((id) => quest({ id, track: 'side', world: 1, xp: 30, repeatable: true, tags: ['audio'] })),
    ],
    chains: [
      { id: 'chain-1', title: 'Chain', world: 1, steps, bonusXp: 40 },
    ] as unknown as ContentPack['chains'],
  });

  it('awards the bonus on the fourth step and records the chain', () => {
    let state = start({ stamina: 10 });
    for (const [i, id] of steps.entries()) {
      const at = `2026-03-1${i}T09:00:00Z`;
      const result = claimQuest(state, { questId: id, checkedConditions: all }, quietCtx(chainPack, at));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = { ...result.state, stamina: 10 };
      if (i < steps.length - 1) expect(state.completedChainIds).toEqual([]);
    }
    expect(state.completedChainIds).toEqual(['chain-1']);
    // 4 × 30 XP + 40 бонус.
    expect(state.xp).toBe(160);
  });

  it('does not award the bonus twice when the last step is repeated', () => {
    let state = start({ stamina: 10 });
    for (const [i, id] of steps.entries())
      state = {
        ...(claimQuest(state, { questId: id, checkedConditions: all }, quietCtx(chainPack, `2026-03-1${i}T09:00:00Z`)) as { state: GameState }).state,
        stamina: 10,
      };
    const before = state.xp;
    const again = claimQuest(state, { questId: 'sq-d', checkedConditions: all }, quietCtx(chainPack, '2026-03-20T09:00:00Z'));
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    // Зөвхөн буурсан side quest XP нэмэгдэнэ — бонус дахин ОРООГҮЙ.
    expect(again.state.xp).toBe(before + sideQuestXp(30, 2));
    expect(again.state.completedChainIds).toEqual(['chain-1']);
  });
});

describe('P-15 — a dungeon pass stamps the date the refresher needs (T-09)', () => {
  const dungeonPack = testPack({
    guilds: GUILDS,
    dungeons: [
      {
        id: 'dg-1',
        title: 'D',
        conceptGoal: 'learn the thing properly',
        estimatedMinutes: 20,
        xp: 50,
        tags: ['blender'],
        tutorialRefs: [],
        questions: [{ id: 'q1', prompt: 'p', options: ['a', 'b'], correctIndex: 0, explanation: 'e' }],
      },
    ] as unknown as ContentPack['dungeons'],
  });

  it('writes lastPassedDate on the first pass', () => {
    const result = attemptDungeon(start(), { dungeonId: 'dg-1', answers: [0] }, quietCtx(dungeonPack, '2026-03-10T09:00:00Z'));
    expect(result.ok && result.state.dungeonStats['dg-1']).toEqual({ lastPassedDate: '2026-03-10' });
  });

  it('refreshes lastPassedDate on a later pass even though the xp is zero', () => {
    const first = attemptDungeon(start(), { dungeonId: 'dg-1', answers: [0] }, quietCtx(dungeonPack, '2026-03-10T09:00:00Z'));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = attemptDungeon(first.state, { dungeonId: 'dg-1', answers: [0] }, quietCtx(dungeonPack, '2026-04-02T09:00:00Z'));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.state.dungeonStats['dg-1']).toEqual({ lastPassedDate: '2026-04-02' });
    expect(second.state.xp).toBe(first.state.xp);
  });

  it('writes nothing when the attempt failed', () => {
    const result = attemptDungeon(start(), { dungeonId: 'dg-1', answers: [1] }, quietCtx(dungeonPack));
    expect(result.ok && result.state.dungeonStats).toEqual({});
  });
});
