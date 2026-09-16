/**
 * SKL-2 · SKL-3 · SKL-4 · MST-4 — skill tree v2 (T-14; plan.md P-3 · P-19 · P-20).
 *
 * ⚠ H-1 (plan.md §7) хариугүй тул P-3-ийн АНХДАГЧ уншилтаар: tier-1 = 1 `skillPoints`,
 * tier-2/3 = 1 mastery point. `masteryPoints` нь ГЛОБАЛ үлдэгдэл тул «тухайн track-ийн
 * оноо» гэдгийг «тэр track дор хаяж нэг оноо ГАРГАСАН байх» (level ≥ 2) гэж уншив —
 * өөр уншилт гарвал ЗӨВХӨН энэ файл ба `skillTree.ts` өөрчлөгдөнө.
 */
import { describe, expect, it } from 'vitest';
import { capstoneGaps, costCurrency, respecTree } from '@shared/core/skillTree.ts';
import { unlockSkill } from '@shared/core/progression.ts';
import { earnedMasteryPoints } from '@shared/core/mastery.ts';
import { RESPEC_COOLDOWN_DAYS } from '@shared/core/constants.ts';
import type { ContentPack, GameState, SkillDefinition } from '@shared/types/index.ts';
import { freshState, quest, testPack } from './fixtures.ts';

const skill = (over: Partial<SkillDefinition> & { id: string }): SkillDefinition =>
  ({
    title: 'S',
    description: 'd',
    cost: 1,
    prerequisites: [],
    track: 'audio',
    tier: 1,
    ...over,
  }) as SkillDefinition;

const SKILLS = [
  skill({ id: 'a1', tier: 1 }),
  skill({ id: 'a1b', tier: 1 }),
  skill({ id: 'a2', tier: 2, prerequisites: ['a1'] }),
  skill({ id: 'a3', tier: 3, prerequisites: ['a2'] }),
  skill({ id: 'b1', tier: 1, track: 'vfx' }),
  skill({ id: 'b2', tier: 2, track: 'vfx', prerequisites: ['b1'] }),
];

const pack: ContentPack = testPack({
  skills: SKILLS as unknown as ContentPack['skills'],
  quests: [
    quest({ id: 'boss-audio', track: 'boss', type: 'boss', world: 1, xp: 100, tags: ['audio'] }),
  ],
});

const withMastery = (tag: string, level: number, over: Partial<GameState> = {}): GameState => {
  const base = freshState();
  return {
    ...base,
    mastery: { ...base.mastery, [tag]: { ...base.mastery[tag]!, level } },
    ...over,
  };
};

const attempt = (bossId: string, tier: string) =>
  ({
    bossId,
    at: '2026-03-10T09:00:00Z',
    scores: { story: 0, editing: 0, camera: 0, visualCraft: 0, animation: 0, audioPost: 0 },
    total: 0,
    tier,
    difficulty: 'standard',
  }) as unknown as GameState['bossAttempts'][number];

describe('SKL-2 — two currencies, split by tier (T-14; plan.md P-3)', () => {
  it('charges a skill point for tier 1 and a mastery point for tier 2 and 3', () => {
    expect(costCurrency(SKILLS[0]!)).toBe('skillPoints');
    expect(costCurrency(SKILLS[2]!)).toBe('masteryPoints');
    expect(costCurrency(SKILLS[3]!)).toBe('masteryPoints');
  });

  it('spends a skill point on a tier-1 node and leaves mastery points alone (PRG-5)', () => {
    const state = { ...freshState(), skillPoints: 1, masteryPoints: 3 };
    const result = unlockSkill(state, 'a1', pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.skillPoints).toBe(0);
    expect(result.state.masteryPoints).toBe(3);
    expect(result.state.unlockedSkillIds).toEqual(['a1']);
  });

  it('spends a mastery point on a tier-2 node and leaves skill points alone', () => {
    const state = withMastery('audio', 2, { skillPoints: 4, masteryPoints: 1, unlockedSkillIds: ['a1'] });
    const result = unlockSkill(state, 'a2', pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.masteryPoints).toBe(0);
    expect(result.state.skillPoints).toBe(4);
  });

  it('rejects INSUFFICIENT_SKILL_POINTS when the right currency is empty', () => {
    const noSp = unlockSkill({ ...freshState(), skillPoints: 0 }, 'a1', pack);
    expect(noSp.ok).toBe(false);
    if (!noSp.ok) expect(noSp.reason).toBe('INSUFFICIENT_SKILL_POINTS');

    const noMp = unlockSkill(
      withMastery('audio', 2, { skillPoints: 9, masteryPoints: 0, unlockedSkillIds: ['a1'] }),
      'a2',
      pack,
    );
    expect(noMp.ok).toBe(false);
    if (!noMp.ok) expect(noMp.reason).toBe('INSUFFICIENT_SKILL_POINTS');
  });

  /** ⚠ Track нь оноо гаргаагүй байхад глобал үлдэгдлээр төлөх нь модны утгыг үгүйсгэнэ. */
  it('rejects PREREQ_NOT_MET when the track itself has earned no mastery point', () => {
    const state = withMastery('audio', 1, { masteryPoints: 5, unlockedSkillIds: ['a1'] });
    const result = unlockSkill(state, 'a2', pack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('PREREQ_NOT_MET');
      expect(result.detail).toMatch(/audio/);
    }
  });

  it('keeps the PRG-5 check order: unknown → already → prereq → currency', () => {
    expect((unlockSkill(freshState(), 'nope', pack) as { reason: string }).reason).toBe('INVALID_INPUT');
    expect(
      (unlockSkill({ ...freshState(), unlockedSkillIds: ['a1'] }, 'a1', pack) as { reason: string }).reason,
    ).toBe('ALREADY_COMPLETED');
    expect(
      (unlockSkill({ ...freshState(), skillPoints: 0 }, 'a2', pack) as { reason: string }).reason,
    ).toBe('PREREQ_NOT_MET');
  });
});

describe('SKL-2 — a capstone names every missing condition (T-14)', () => {
  const ready = (): GameState =>
    withMastery('audio', 8, {
      unlockedSkillIds: ['a1', 'a1b', 'a2'],
      bossAttempts: [attempt('boss-audio', 'advanced')],
      masteryPoints: 1,
    });

  it('reports no gaps when all three conditions hold', () => {
    expect(capstoneGaps(ready(), SKILLS[3]!, pack)).toEqual([]);
  });

  it('reports no gaps for a node that is not a capstone', () => {
    expect(capstoneGaps(freshState(), SKILLS[0]!, pack)).toEqual([]);
  });

  /** 2³ хослол — татгалзлын мессеж нь ЯГ дутсан нөхцөлийг нэрлэх ёстой. */
  it.each([
    [false, false, false, 3],
    [true, false, false, 2],
    [false, true, false, 2],
    [false, false, true, 2],
    [true, true, false, 1],
    [true, false, true, 1],
    [false, true, true, 1],
    [true, true, true, 0],
  ])('mastery=%s tier1=%s boss=%s leaves %i gaps', (mastery, tier1, boss, count) => {
    const state = withMastery('audio', mastery ? 8 : 7, {
      unlockedSkillIds: tier1 ? ['a1', 'a1b', 'a2'] : ['a2'],
      bossAttempts: boss ? [attempt('boss-audio', 'advanced')] : [],
    });
    const gaps = capstoneGaps(state, SKILLS[3]!, pack);
    expect(gaps).toHaveLength(count);
    if (!mastery) expect(gaps.join(' ')).toMatch(/mastery level 8/);
    if (!tier1) expect(gaps.join(' ')).toMatch(/tier-1/);
    if (!boss) expect(gaps.join(' ')).toMatch(/advanced/);
  });

  it('does not accept an mvp attempt as the advanced requirement', () => {
    const state = withMastery('audio', 8, {
      unlockedSkillIds: ['a1', 'a1b', 'a2'],
      bossAttempts: [attempt('boss-audio', 'mvp')],
    });
    expect(capstoneGaps(state, SKILLS[3]!, pack).join(' ')).toMatch(/advanced/);
  });

  it('blocks the unlock and names the gap in the rejection detail', () => {
    const state = withMastery('audio', 7, { unlockedSkillIds: ['a1', 'a1b', 'a2'], masteryPoints: 1 });
    const result = unlockSkill(state, 'a3', pack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('PREREQ_NOT_MET');
      expect(result.detail).toMatch(/mastery level 8/);
    }
  });

  it('allows the unlock once every gap is closed, spending a mastery point', () => {
    const result = unlockSkill(ready(), 'a3', pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.masteryPoints).toBe(0);
    expect(result.state.unlockedSkillIds).toContain('a3');
  });
});

describe('SKL-3 — respec refunds exactly what was paid (T-14)', () => {
  const spent = (): GameState =>
    withMastery('audio', 3, {
      unlockedSkillIds: ['a1', 'a1b', 'a2', 'b1'],
      skillPoints: 0,
      masteryPoints: 0,
      respecAt: null,
    });

  it('returns two skill points and one mastery point for the audio tree', () => {
    const result = respecTree(spent(), 'audio', '2026-03-10T09:00:00Z', pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.skillPoints).toBe(2);
    expect(result.state.masteryPoints).toBe(1);
  });

  it('clears only that tree’s unlocks', () => {
    const result = respecTree(spent(), 'audio', '2026-03-10T09:00:00Z', pack);
    expect(result.ok && result.state.unlockedSkillIds).toEqual(['b1']);
  });

  it('stamps respecAt so the cooldown starts', () => {
    const result = respecTree(spent(), 'audio', '2026-03-10T09:00:00Z', pack);
    expect(result.ok && result.state.respecAt).toBe('2026-03-10T09:00:00Z');
  });

  it('rejects PREREQ_NOT_MET when the tree has nothing unlocked', () => {
    const result = respecTree(spent(), 'storytelling', '2026-03-10T09:00:00Z', pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('PREREQ_NOT_MET');
  });

  it('rejects an unknown track as INVALID_INPUT', () => {
    const result = respecTree(spent(), 'not-a-track' as never, '2026-03-10T09:00:00Z', pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_INPUT');
  });

  /** ⚠ P-19 · H-6 — cooldown нь ГЛОБАЛ: нэг модыг respec хийхэд БҮГД хүлээнэ. */
  it.each([
    [RESPEC_COOLDOWN_DAYS - 1, false],
    [RESPEC_COOLDOWN_DAYS, true],
    [RESPEC_COOLDOWN_DAYS + 30, true],
  ])('after %i days the respec is allowed: %s', (days, allowed) => {
    const day = String(10 + days).padStart(2, '0');
    const state = { ...spent(), respecAt: '2026-03-10T09:00:00Z' };
    const result = respecTree(state, 'audio', `2026-03-${day}T09:00:00Z`, pack);
    expect(result.ok).toBe(allowed);
    if (!result.ok) expect(result.reason).toBe('RESPEC_ON_COOLDOWN');
  });

  it('leaves the state exactly as it was while on cooldown', () => {
    const before = { ...spent(), respecAt: '2026-03-10T09:00:00Z' };
    const result = respecTree(before, 'audio', '2026-03-16T09:00:00Z', pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect('state' in result).toBe(false);
    expect(before.unlockedSkillIds).toEqual(['a1', 'a1b', 'a2', 'b1']);
  });

  it('applies the cooldown across trees, not per tree (P-19 · H-6)', () => {
    const first = respecTree(spent(), 'audio', '2026-03-10T09:00:00Z', pack);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = respecTree(first.state, 'vfx', '2026-03-11T09:00:00Z', pack);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('RESPEC_ON_COOLDOWN');
  });
});

describe('MST-4 — remainder + spent = earned, always (T-14; plan.md P-20)', () => {
  const spentPoints = (state: GameState): number =>
    state.unlockedSkillIds
      .map((id) => pack.skills.find((s) => s.id === id))
      .filter((s): s is SkillDefinition => s !== undefined && s.tier >= 2).length;

  it('holds after unlocking and after respeccing', () => {
    let state = withMastery('audio', 3, { masteryPoints: 2, skillPoints: 2, unlockedSkillIds: ['a1'] });
    expect(state.masteryPoints + spentPoints(state)).toBe(earnedMasteryPoints(state));

    const unlocked = unlockSkill(state, 'a2', pack);
    expect(unlocked.ok).toBe(true);
    if (!unlocked.ok) return;
    state = unlocked.state;
    expect(state.masteryPoints + spentPoints(state)).toBe(earnedMasteryPoints(state));

    const respecced = respecTree(state, 'audio', '2026-03-10T09:00:00Z', pack);
    expect(respecced.ok).toBe(true);
    if (!respecced.ok) return;
    expect(respecced.state.masteryPoints + spentPoints(respecced.state)).toBe(
      earnedMasteryPoints(respecced.state),
    );
  });
});
