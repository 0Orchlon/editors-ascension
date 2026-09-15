import { describe, expect, it } from 'vitest';
import { evaluateAchievements } from '@shared/core/achievements.ts';
import { qualifyDay } from '@shared/core/streak.ts';
import { newGame } from '@shared/save/serialize.ts';
import type { ContentPack, GameState } from '@shared/types/index.ts';

const withStreak = (over: Partial<GameState['streak']>): GameState => ({
  ...newGame(),
  streak: { current: 0, best: 0, lastQualifiedDate: null, ...over },
});

describe('streak (T-13)', () => {
  it('starts a streak at 1 on the first qualifying day (ACH-2)', () => {
    const { streak, combo, events } = qualifyDay(withStreak({}), '2026-03-10T09:00:00Z');
    expect(streak).toEqual({ current: 1, best: 1, lastQualifiedDate: '2026-03-10' });
    expect(combo).toBe(1);
    expect(events.map((e) => e.type)).toEqual(['STREAK_EXTENDED', 'COMBO_CHANGED']);
  });

  it('extends on consecutive days (ACH-2)', () => {
    const state = withStreak({ current: 3, best: 5, lastQualifiedDate: '2026-03-09' });
    const { streak } = qualifyDay(state, '2026-03-10T23:59:00Z');
    expect(streak).toEqual({ current: 4, best: 5, lastQualifiedDate: '2026-03-10' });
  });

  it('resets to 1 when a day is skipped (ACH-2)', () => {
    const state = withStreak({ current: 6, best: 6, lastQualifiedDate: '2026-03-08' });
    const { streak, events } = qualifyDay(state, '2026-03-10T00:00:00Z');
    expect(streak.current).toBe(1);
    expect(events.map((e) => e.type)).toContain('STREAK_RESET');
  });

  it('never lowers `best` when the current streak resets (ACH-2)', () => {
    const state = withStreak({ current: 9, best: 9, lastQualifiedDate: '2026-01-01' });
    const { streak } = qualifyDay(state, '2026-03-10T00:00:00Z');
    expect(streak.best).toBe(9);
  });

  it('counts a second completion on the same day as combo, not streak (ACH-2)', () => {
    const state = withStreak({ current: 2, best: 4, lastQualifiedDate: '2026-03-10' });
    const { streak, combo, events } = qualifyDay({ ...state, combo: 1 }, '2026-03-10T18:00:00Z');
    expect(streak.current).toBe(2);
    expect(combo).toBe(2);
    expect(events.map((e) => e.type)).toEqual(['COMBO_CHANGED']);
  });

  it('crosses a month boundary correctly', () => {
    const state = withStreak({ current: 1, best: 1, lastQualifiedDate: '2026-02-28' });
    expect(qualifyDay(state, '2026-03-01T00:00:00Z').streak.current).toBe(2);
  });

  it('emits no STREAK_RESET on a first-ever qualifying day', () => {
    const { events } = qualifyDay(withStreak({}), '2026-03-10T09:00:00Z');
    expect(events.map((e) => e.type)).not.toContain('STREAK_RESET');
  });
});

const pack = (over: Partial<ContentPack> = {}): ContentPack =>
  ({
    version: 'test',
    quests: [],
    dungeons: [],
    skills: [],
    achievements: [
      { id: 'a-lv2', title: 'L2', description: 'd', predicate: { kind: 'level', value: 2 } },
      { id: 'a-xp', title: 'XP', description: 'd', predicate: { kind: 'totalXp', value: 500 } },
      { id: 'a-mq', title: 'MQ', description: 'd', predicate: { kind: 'mainQuestsCompleted', value: 2 } },
      { id: 'a-sq', title: 'SQ', description: 'd', predicate: { kind: 'sideQuestCompletions', value: 3 } },
      { id: 'a-dg', title: 'DG', description: 'd', predicate: { kind: 'dungeonsCompleted', value: 1 } },
      { id: 'a-pj', title: 'PJ', description: 'd', predicate: { kind: 'projectsCompleted', value: 1 } },
      { id: 'a-bs', title: 'BS', description: 'd', predicate: { kind: 'bossTier', value: 'advanced' } },
      { id: 'a-st', title: 'ST', description: 'd', predicate: { kind: 'streakDays', value: 7 } },
    ],
    encounters: [],
    loot: [],
    ...over,
  }) as unknown as ContentPack;

describe('achievements (T-13)', () => {
  it('awards nothing on a fresh state (ACH-1)', () => {
    expect(evaluateAchievements(newGame(), pack()).ids).toEqual([]);
  });

  it('evaluates every predicate kind against the state (ACH-1)', () => {
    const state: GameState = {
      ...newGame(),
      level: 2,
      xp: 500,
      completedMainQuestIds: ['q1', 'q2'],
      sideQuestStats: { s1: { completions: 2, lastCompletedAt: null }, s2: { completions: 1, lastCompletedAt: null } },
      completedDungeonIds: ['d1'],
      projects: [{ ...blankProject(), completedAt: '2026-03-10T00:00:00Z' }],
      bossAttempts: [bossAttempt('mastery')],
      streak: { current: 7, best: 7, lastQualifiedDate: '2026-03-10' },
    };
    expect(evaluateAchievements(state, pack()).ids.sort()).toEqual([
      'a-bs', 'a-dg', 'a-lv2', 'a-mq', 'a-pj', 'a-sq', 'a-st', 'a-xp',
    ]);
  });

  it('treats bossTier as a ranked floor, not equality (ACH-1)', () => {
    const below = { ...newGame(), bossAttempts: [bossAttempt('mvp')] };
    const above = { ...newGame(), bossAttempts: [bossAttempt('mastery')] };
    expect(evaluateAchievements(below, pack()).ids).not.toContain('a-bs');
    expect(evaluateAchievements(above, pack()).ids).toContain('a-bs');
  });

  it('never re-awards an achievement already held (ACH-1)', () => {
    const state = { ...newGame(), level: 2, achievementIds: ['a-lv2'] };
    const { ids, events } = evaluateAchievements(state, pack());
    expect(ids).toEqual([]);
    expect(events).toEqual([]);
  });

  it('emits one ACHIEVEMENT_UNLOCKED per newly earned achievement (ACH-1)', () => {
    const { events } = evaluateAchievements({ ...newGame(), level: 2 }, pack());
    expect(events).toEqual([
      { type: 'ACHIEVEMENT_UNLOCKED', data: { achievementId: 'a-lv2', title: 'L2' } },
    ]);
  });
});

function blankProject() {
  return {
    id: 'p1',
    title: 'P',
    createdAt: '2026-03-01T00:00:00Z',
    completedAt: null,
    notes: '',
    nextAction: '',
    evidenceRef: null,
    selfScore: null,
    milestones: [],
  } as unknown as GameState['projects'][number];
}

function bossAttempt(tier: 'failed' | 'mvp' | 'advanced' | 'mastery') {
  return {
    bossId: 'b1',
    at: '2026-03-01T00:00:00Z',
    scores: { story: 5, editing: 5, camera: 5, visualCraft: 5, animation: 5, audioPost: 5 },
    total: 30,
    tier,
  } as GameState['bossAttempts'][number];
}
