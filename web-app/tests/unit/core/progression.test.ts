import { describe, expect, it } from 'vitest';
import { RANK_NAMES } from '@shared/core/constants.ts';
import { addXp, levelFor, rankName, unlockSkill, xpToNextLevel } from '@shared/core/progression.ts';
import { newGame } from '@shared/save/serialize.ts';
import type { ContentPack } from '@shared/types/index.ts';

const pack = {
  version: 'test',
  quests: [],
  dungeons: [],
  skills: [
    // ⚠ v1.2.0 — `track` ба `tier` нь гэрээнд ЗААВАЛ (SKL-1). Хоёулаа tier-1 тул
    // төлбөрийн валют нь `skillPoints` ХЭВЭЭР: PRG-5-ийн зам өөрчлөгдөөгүй.
    { id: 'sk-a', title: 'A', description: 'a', cost: 1, prerequisites: [], track: 'video-editing', tier: 1 },
    { id: 'sk-b', title: 'B', description: 'b', cost: 1, prerequisites: ['sk-a'], track: 'video-editing', tier: 1 },
  ],
  achievements: [],
  encounters: [],
  loot: [],
} as unknown as ContentPack;

describe('progression (T-06)', () => {
  it('maps xp to level exactly on the thresholds (PRG-1)', () => {
    const table: [number, number][] = [
      [0, 1],
      [99, 1],
      [100, 2],
      [249, 2],
      [250, 3],
      [7499, 9],
      [7500, 10],
      [999999, 10],
    ];
    for (const [xp, level] of table) expect(levelFor(xp), `xp=${xp}`).toBe(level);
  });

  it('names ranks 1..10 exactly as PRD §7 (PRG-2)', () => {
    expect(RANK_NAMES.length).toBe(10);
    expect(rankName(1)).toBe('Recruit');
    expect(rankName(10)).toBe('Cinematic Master');
    expect(RANK_NAMES.map((_, i) => rankName(i + 1))).toEqual([...RANK_NAMES]);
  });

  it('reports xp remaining to the next level, null at cap', () => {
    expect(xpToNextLevel(0)).toBe(100);
    expect(xpToNextLevel(7500)).toBeNull();
  });

  // ⚠ spec.md PRG-3-ийн хаалтан дахь жишээ ("1000 XP = lvl1→lvl4 = 3 SP") нь PRG-1-ийн
  // босгын хүснэгттэй зөрчилддөг: 1000 XP нь 100·250·500·1000 дөрвөн босгыг давсан тул
  // lvl5, 4 SP. Хүснэгт (PRG-1) эрх бүхий — §10.1-ийн SQ-2-тай ижил төрлийн арифметик алдаа.
  it('grants one skill point per level crossed in a single call (PRG-3)', () => {
    const r = addXp(newGame(), 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.level).toBe(5);
    expect(r.state.skillPoints).toBe(4);
    expect(r.events.filter((e) => e.type === 'LEVEL_UP')).toHaveLength(4);
    expect(r.events.filter((e) => e.type === 'SKILL_POINT_GAINED')).toHaveLength(4);
  });

  it('emits LEVEL_UP on every level gain (PRG-6)', () => {
    const r = addXp(newGame(), 100);
    expect(r.ok && r.events.map((e) => e.type)).toContain('LEVEL_UP');
  });

  it('treats addXp(0) as a no-op and rejects negatives (PRG-4, D-3)', () => {
    const base = newGame();
    const zero = addXp(base, 0);
    expect(zero.ok).toBe(true);
    if (zero.ok) {
      expect(zero.state).toEqual(base);
      expect(zero.events).toEqual([]);
    }
    const neg = addXp(base, -1);
    expect(neg).toEqual({ ok: false, reason: 'INVALID_INPUT' });
    const frac = addXp(base, 1.5);
    expect(frac.ok).toBe(false);
    expect(base.xp).toBe(0);
  });

  it('spends a skill point on unlock and reports every rejection code (PRG-5, D-4)', () => {
    const withSp = { ...newGame(), skillPoints: 2 };

    expect(unlockSkill(withSp, 'nope', pack)).toMatchObject({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(unlockSkill(withSp, 'sk-b', pack)).toEqual({ ok: false, reason: 'PREREQ_NOT_MET' });
    expect(unlockSkill({ ...withSp, skillPoints: 0 }, 'sk-a', pack)).toEqual({
      ok: false,
      reason: 'INSUFFICIENT_SKILL_POINTS',
    });

    const first = unlockSkill(withSp, 'sk-a', pack);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.skillPoints).toBe(1);
    expect(first.state.unlockedSkillIds).toEqual(['sk-a']);
    expect(first.events.map((e) => e.type)).toContain('SKILL_UNLOCKED');

    const again = unlockSkill(first.state, 'sk-a', pack);
    expect(again).toEqual({ ok: false, reason: 'ALREADY_COMPLETED' });
    expect(first.state.skillPoints).toBe(1);
  });
});
