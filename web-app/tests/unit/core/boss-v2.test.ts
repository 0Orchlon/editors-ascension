/**
 * BSX-2…BSX-6 — boss v2: hard mode, хувийн дээд амжилт, rematch, replay (T-13).
 *
 * ⚠ Hard mode-ийн босго нь ТООЦОГДОНО (`ceil(BOSS_TIERS × 1.15)` = 41/52/60) —
 * тестэд ч гараар бичигдэхгүй, тогтмолоос гарна. Эс бөгөөс `BOSS_TIERS` өөрчлөгдөхөд
 * тест ба код хоёр өөр үнэн болно.
 */
import { describe, expect, it } from 'vitest';
import { attemptBoss, personalBest, tierFor } from '@shared/core/boss.ts';
import { BOSS_TIERS, HARD_BOSS_TIERS, REPLAY_LOG_CAP } from '@shared/core/constants.ts';
import type { BossScores, ContentPack, DifficultyTier, GameState } from '@shared/types/index.ts';
import { freshState, quest, quietCtx, testPack } from './fixtures.ts';

const BOSS_ID = 'boss-test';
const pack: ContentPack = testPack({
  quests: [
    quest({ id: BOSS_ID, track: 'boss', type: 'boss', world: 1, xp: 200, staminaCost: 1, levelRequired: 1 }),
    quest({ id: 'sq-practice', track: 'side', world: 1, xp: 20, repeatable: true, tags: ['storytelling'] }),
  ],
});

/** `total`-ыг 6 ангилалд 0..10-аар тарааж бүрэн оноо болгоно. */
const scoresFor = (total: number): BossScores => {
  const out = { story: 0, editing: 0, camera: 0, visualCraft: 0, animation: 0, audioPost: 0 };
  const keys = Object.keys(out) as (keyof BossScores)[];
  let left = total;
  for (const key of keys) {
    const take = Math.min(10, left);
    out[key] = take;
    left -= take;
  }
  return out;
};

const state = (over: Partial<GameState> = {}): GameState => ({ ...freshState(), stamina: 10, ...over });

const attempt = (total: number, difficulty?: DifficultyTier, from: GameState = state()) =>
  attemptBoss(from, { bossId: BOSS_ID, scores: scoresFor(total), ...(difficulty ? { difficulty } : {}) }, quietCtx(pack));

const TIER_RANK = { failed: 0, mvp: 1, advanced: 2, mastery: 3 } as const;

describe('BSX-2 — hard mode thresholds are computed, not written down (T-13)', () => {
  it('lands on 41 · 52 · 60 for the current standard table', () => {
    expect(HARD_BOSS_TIERS).toEqual({ mvp: 41, advanced: 52, mastery: 60 });
  });

  it('derives each hard threshold from its standard counterpart', () => {
    for (const tier of ['mvp', 'advanced', 'mastery'] as const)
      expect(HARD_BOSS_TIERS[tier]).toBe(Math.ceil(BOSS_TIERS[tier] * 1.15));
  });

  it.each([
    [BOSS_TIERS.mvp - 1, 'failed'],
    [BOSS_TIERS.mvp, 'mvp'],
    [BOSS_TIERS.advanced - 1, 'mvp'],
    [BOSS_TIERS.advanced, 'advanced'],
    [BOSS_TIERS.mastery - 1, 'advanced'],
    [BOSS_TIERS.mastery, 'mastery'],
  ] as const)('standard: total %i is tier %s', (total, tier) => {
    expect(tierFor(total)).toBe(tier);
    expect(tierFor(total, 'standard')).toBe(tier);
  });

  it.each([
    [HARD_BOSS_TIERS.mvp - 1, 'failed'],
    [HARD_BOSS_TIERS.mvp, 'mvp'],
    [HARD_BOSS_TIERS.advanced - 1, 'mvp'],
    [HARD_BOSS_TIERS.advanced, 'advanced'],
    [HARD_BOSS_TIERS.mastery - 1, 'advanced'],
    [HARD_BOSS_TIERS.mastery, 'mastery'],
  ] as const)('hard: total %i is tier %s', (total, tier) => {
    expect(tierFor(total, 'hard')).toBe(tier);
  });

  /**
   * ⚠ Урвуулалт БАЙХГҮЙ: hard-аар авсан tier нь standard-аар ямагт ≥ гарна.
   * 0..60-ийн БҮХ 61 утгаар гүйлгэсэн — нэг хилийн утга ч алгасагдахгүй.
   */
  it('never lets hard mode grade higher than standard, across all 61 totals', () => {
    const inversions: string[] = [];
    for (let total = 0; total <= 60; total++)
      if (TIER_RANK[tierFor(total, 'hard')] > TIER_RANK[tierFor(total, 'standard')])
        inversions.push(`total ${total}`);
    expect(inversions).toEqual([]);
  });

  /** Мэдэгдэж буй үр дагавар (plan.md §12.2): hard `mastery` нь ТӨГС оноо шаардана. */
  it('needs a perfect 60 for hard mastery — the documented consequence', () => {
    expect(HARD_BOSS_TIERS.mastery).toBe(60);
    expect(tierFor(59, 'hard')).toBe('advanced');
    expect(tierFor(60, 'hard')).toBe('mastery');
  });
});

describe('BSX-2 — difficulty is per attempt, not per player (T-13)', () => {
  it('defaults to standard when the attempt does not say', () => {
    const result = attempt(BOSS_TIERS.mvp);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.bossAttempts[0]!.difficulty).toBe('standard');
  });

  it('records the difficulty the attempt carried', () => {
    const result = attempt(50, 'hard');
    expect(result.ok && result.state.bossAttempts[0]!.difficulty).toBe('hard');
  });

  it('lets the player alternate difficulty between attempts', () => {
    let current = state();
    for (const difficulty of ['hard', 'standard', 'hard'] as const) {
      const result = attempt(50, difficulty, current);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      current = result.state;
    }
    expect(current.bossAttempts.map((a) => a.difficulty)).toEqual(['hard', 'standard', 'hard']);
  });

  it('grades the same score differently under hard mode', () => {
    const standard = attempt(50);
    const hard = attempt(50, 'hard');
    expect(standard.ok && standard.state.bossAttempts[0]!.tier).toBe('advanced');
    expect(hard.ok && hard.state.bossAttempts[0]!.tier).toBe('mvp');
  });

  it('rejects an unknown difficulty as INVALID_INPUT', () => {
    const result = attemptBoss(
      state(),
      { bossId: BOSS_ID, scores: scoresFor(40), difficulty: 'nightmare' as DifficultyTier },
      quietCtx(pack),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_INPUT');
  });
});

describe('BSX-3 — the personal best is derived and never drops (T-13)', () => {
  it('reads zero when no attempt exists', () => {
    expect(personalBest(state(), BOSS_ID, 'standard')).toBe(0);
  });

  it('is the max total for the (boss, difficulty) pair', () => {
    let current = state();
    for (const total of [30, 55, 42]) {
      const result = attempt(total, 'standard', current);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      current = result.state;
    }
    expect(personalBest(current, BOSS_ID, 'standard')).toBe(55);
  });

  it('keeps the two difficulties in separate buckets', () => {
    let current = state();
    current = (attempt(55, 'standard', current) as { state: GameState }).state;
    current = (attempt(30, 'hard', current) as { state: GameState }).state;
    expect(personalBest(current, BOSS_ID, 'standard')).toBe(55);
    expect(personalBest(current, BOSS_ID, 'hard')).toBe(30);
  });

  it('does not drop after a worse attempt', () => {
    let current = state();
    current = (attempt(58, 'standard', current) as { state: GameState }).state;
    const best = personalBest(current, BOSS_ID, 'standard');
    current = (attempt(3, 'standard', current) as { state: GameState }).state;
    expect(personalBest(current, BOSS_ID, 'standard')).toBe(best);
  });

  it('ignores attempts against other bosses', () => {
    const current = (attempt(55, 'standard') as { state: GameState }).state;
    expect(personalBest(current, 'boss-other', 'standard')).toBe(0);
  });
});

describe('BSX-4 · BSX-5 — rematch is unlimited, only stamina gates it (T-13)', () => {
  it('logs ten attempts in a row with no rejection other than stamina', () => {
    let current = state({ stamina: 10 });
    const reasons: string[] = [];
    for (let i = 0; i < 10; i++) {
      const result = attempt(30, 'standard', current);
      if (!result.ok) reasons.push(result.reason);
      else current = result.state;
    }
    expect(reasons).toEqual([]);
    expect(current.bossAttempts).toHaveLength(10);
  });

  it('keeps every attempt in the history, passed or failed (BS-4)', () => {
    let current = state();
    for (const total of [10, 60, 20]) current = (attempt(total, 'standard', current) as { state: GameState }).state;
    expect(current.bossAttempts.map((a) => a.tier)).toEqual(['failed', 'mastery', 'failed']);
  });

  it('awards the boss xp only the first time it is passed (BS-2)', () => {
    const first = attempt(60, 'standard');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.xp).toBe(200);

    const second = attempt(60, 'standard', first.state);
    expect(second.ok && second.state.xp).toBe(200);
  });

  it('keeps the BS-3 coaching format for a failed attempt, in both difficulties', () => {
    for (const difficulty of ['standard', 'hard'] as const) {
      const result = attempt(6, difficulty);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const logged = result.events.find((e) => e.type === 'BOSS_ATTEMPT_LOGGED')!;
      expect(String(logged.data?.message)).toMatch(
        /^Attempt logged\. Weakest category: .+\. Recommended side quest: .+\.$/,
      );
    }
  });

  it('reports the difficulty in the logged event so the UI need not guess', () => {
    const result = attempt(45, 'hard');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const logged = result.events.find((e) => e.type === 'BOSS_ATTEMPT_LOGGED')!;
    expect(logged.data?.difficulty).toBe('hard');
  });
});

describe('BSX-6 — every attempt is written to the replay log (T-13)', () => {
  it('appends one entry per attempt, in either difficulty', () => {
    let current = state();
    current = (attempt(60, 'standard', current) as { state: GameState }).state;
    current = (attempt(10, 'hard', current) as { state: GameState }).state;

    expect(current.replayLog).toHaveLength(2);
    expect(current.replayLog.map((e) => [e.kind, e.refId, e.outcome])).toEqual([
      ['boss', BOSS_ID, 'passed'],
      ['boss', BOSS_ID, 'failed'],
    ]);
  });

  it('stamps the entry with the attempt time', () => {
    const result = attempt(60);
    expect(result.ok && result.state.replayLog[0]!.at).toBe('2026-03-10T09:00:00Z');
  });

  it('marks a hard-mode pass as passed even though standard would grade it higher', () => {
    const result = attempt(HARD_BOSS_TIERS.mvp, 'hard');
    expect(result.ok && result.state.replayLog[0]!.outcome).toBe('passed');
  });

  it('honours the 500 entry cap through appendReplay', () => {
    const existing = Array.from({ length: REPLAY_LOG_CAP }, (_, i) => ({
      at: '2026-01-01T00:00:00Z',
      kind: 'boss' as const,
      refId: `old-${i}`,
      outcome: 'failed' as const,
    }));
    const result = attempt(60, 'standard', state({ replayLog: existing }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.replayLog).toHaveLength(REPLAY_LOG_CAP);
    expect(result.state.replayLog[0]!.refId).toBe('old-1');
    expect(result.state.replayLog.at(-1)!.refId).toBe(BOSS_ID);
  });
});
