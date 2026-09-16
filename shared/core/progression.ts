/** XP, түвшин, ранк, skill point (lld.md §5.4.1; AC PRG-1…6). */
import type { ContentPack, DomainEvent, GameState } from '../types/index.ts';
import { RANK_NAMES, XP_THRESHOLDS } from './constants.ts';
import { capstoneGaps, costCurrency } from './skillTree.ts';
import { ok, reject, type DomainResult } from './result.ts';

/** `1 + |{t ∈ XP_THRESHOLDS : t ≤ xp}|`, дээд тал нь 10 (AC PRG-1). */
export function levelFor(xp: number): number {
  let level = 1;
  for (const threshold of XP_THRESHOLDS) if (xp >= threshold) level++;
  return Math.min(level, RANK_NAMES.length);
}

/** AC PRG-2 — PRD §7-ийн жагсаалт. */
export function rankName(level: number): string {
  return RANK_NAMES[Math.min(Math.max(level, 1), RANK_NAMES.length) - 1]!;
}

/** Дараагийн түвшин хүртэлх XP; 10-р түвшинд `null`. */
export function xpToNextLevel(xp: number): number | null {
  const next = XP_THRESHOLDS.find((t) => xp < t);
  return next === undefined ? null : next - xp;
}

export function addXp(state: GameState, amount: number): DomainResult {
  if (!Number.isInteger(amount) || amount < 0) return reject('INVALID_INPUT');
  if (amount === 0) return ok(state);

  const xp = state.xp + amount;
  const level = levelFor(xp);
  const gained = level - state.level;
  const skillPoints = state.skillPoints + gained;

  const events: DomainEvent[] = [{ type: 'XP_GAINED', data: { amount, total: xp } }];
  for (let i = 1; i <= gained; i++) {
    const newLevel = state.level + i;
    events.push({ type: 'LEVEL_UP', data: { level: newLevel, rank: rankName(newLevel) } });
    events.push({ type: 'SKILL_POINT_GAINED', data: { total: state.skillPoints + i } });
  }

  return ok({ ...state, xp, level, skillPoints }, events);
}

/**
 * AC PRG-5 — шалгах ДАРААЛАЛ нь ГЭРЭЭ (lld.md §5.4.1): танихгүй → аль хэдийн →
 * урьдчилсан нөхцөл → валют. Тоглогч хоёр удаа татгалзалт уншихгүй.
 *
 * ⚠ v1.2.0 — ҮНЭ нь `1` ХЭВЭЭР (SKL-5), ВАЛЮТ нь tier-ээр хуваагдана (plan.md P-3):
 * tier-1 = `skillPoints`, tier-2/3 = mastery point. Capstone (tier-3) нь нэмэлт
 * гурван нөхцөлтэй — татгалзлын мессеж нь АЛЬ нь дутсаныг НЭРЛЭНЭ (SKL-2).
 */
export function unlockSkill(state: GameState, skillId: string, pack: ContentPack): DomainResult {
  const skill = pack.skills.find((s) => s.id === skillId);
  if (!skill) return reject('INVALID_INPUT', `unknown skill ${skillId}`);
  if (state.unlockedSkillIds.includes(skillId)) return reject('ALREADY_COMPLETED');
  if (!skill.prerequisites.every((p) => state.unlockedSkillIds.includes(p)))
    return reject('PREREQ_NOT_MET');

  const gaps = capstoneGaps(state, skill, pack);
  if (gaps.length > 0) return reject('PREREQ_NOT_MET', gaps.join('; '));

  const currency = costCurrency(skill);
  if (currency === 'masteryPoints') {
    // ⚠ Track нь дор хаяж нэг оноо ГАРГАСАН байх ёстой (plan.md P-3-ийн уншилт —
    // `skillTree.ts`-ийн толгойд тайлбарласан). Эс бөгөөс өөр модны оноогоор
    // энэ модыг бүрэн нээх боломж үүсч мод тус бүрийн утга алдагдана.
    const level = state.mastery[skill.track]?.level ?? 0;
    if (level < 2)
      return reject(
        'PREREQ_NOT_MET',
        `${skill.track} mastery must reach level 2 before its tier-${skill.tier} nodes open`,
      );
  }

  if (state[currency] < skill.cost) return reject('INSUFFICIENT_SKILL_POINTS');

  return ok(
    {
      ...state,
      [currency]: state[currency] - skill.cost,
      unlockedSkillIds: [...state.unlockedSkillIds, skillId],
    },
    [{ type: 'SKILL_UNLOCKED', data: { skillId, title: skill.title, currency } }],
  );
}
