/**
 * Skill tree v2 — capstone, respec, mastery point зарцуулалт
 * (AC SKL-2, SKL-3, SKL-4, MST-4; plan.md P-3 · P-19 · P-20).
 *
 * ⚠ **H-1 (plan.md §7) хариугүй** тул P-3-ийн АНХДАГЧ уншилтаар хэрэгжив:
 * tier-1 = 1 `skillPoints` (PRG-5-ийн зам хэвээр), tier-2/tier-3 = 1 mastery point.
 * `masteryPoints` нь ГЛОБАЛ үлдэгдэл (P-20) тул «тухайн track-ийн mastery point»
 * гэдгийг «тэр track дор хаяж НЭГ оноо ГАРГАСАН байх» (`level ≥ 2`) гэж уншив —
 * эс бөгөөс өөр track-ийн оноогоор хөрш модыг бүрэн нээх боломж үүсч мод тус бүрийн
 * утга алдагдана. Өөр уншилт гарвал ЗӨВХӨН энэ модуль ба түүний тест өөрчлөгдөнө.
 */
import type { ContentPack, GameState, SkillDefinition, SkillTag } from '../types/index.ts';
import { RESPEC_COOLDOWN_DAYS, SKILL_TAGS } from './constants.ts';
import { trackOf } from './mastery.ts';
import { dayOf, daysBetween, ok, reject, type DomainResult } from './result.ts';

export type Currency = 'skillPoints' | 'masteryPoints';

/** Capstone-ийн mastery босго (AC SKL-2 — спекийн тоо). */
const CAPSTONE_MASTERY_LEVEL = 8;
/** Capstone-д шаардагдах boss оролдлогын доод эрэмбэ. */
const TIER_RANK = { failed: 0, mvp: 1, advanced: 2, mastery: 3 } as const;
const CAPSTONE_BOSS_TIER: keyof typeof TIER_RANK = 'advanced';

const isTag = (tag: string): tag is SkillTag => (SKILL_TAGS as readonly string[]).includes(tag);

/** tier-1 → `skillPoints`; tier-2/3 → mastery point (plan.md P-3). */
export function costCurrency(skill: SkillDefinition): Currency {
  return skill.tier === 1 ? 'skillPoints' : 'masteryPoints';
}

/**
 * Capstone-ийн ДУТСАН нөхцөлүүд (AC SKL-2). ХООСОН = нээж болно.
 *
 * ⚠ Мессежүүд нь татгалзлын ЭХ: тоглогч «яагаад болохгүй байна»-г ТААХГҮЙ, уншина.
 * ⚠ Capstone нь зөвхөн cosmetic үр дүнтэй (spec.md D-6) — XP, stamina, нээлтэд
 * нөлөөгүй; энэ функц зөвхөн НЭЭХ эрхийг шалгана.
 */
export function capstoneGaps(state: GameState, skill: SkillDefinition, pack: ContentPack): string[] {
  if (skill.tier !== 3) return [];

  const gaps: string[] = [];
  const track = skill.track;

  const level = trackOf(state, track).level;
  if (level < CAPSTONE_MASTERY_LEVEL)
    gaps.push(`${track} needs mastery level ${CAPSTONE_MASTERY_LEVEL} — it is at ${level}`);

  const tierOne = pack.skills.filter((s) => s.track === track && s.tier === 1);
  const missing = tierOne.filter((s) => !state.unlockedSkillIds.includes(s.id));
  if (missing.length > 0)
    gaps.push(`every tier-1 node in this tree must be unlocked — missing: ${missing.map((s) => s.title).join(', ')}`);

  // Track-д харгалзах boss нь тухайн tag-ийг агуулсан boss quest.
  const bosses = pack.quests.filter((q) => q.track === 'boss' && q.tags.some((t) => t === track));
  const reached = state.bossAttempts.some(
    (a) => bosses.some((b) => b.id === a.bossId) && TIER_RANK[a.tier] >= TIER_RANK[CAPSTONE_BOSS_TIER],
  );
  if (!reached)
    gaps.push(`log an ${CAPSTONE_BOSS_TIER} tier attempt or better on the ${track} boss`);

  return gaps;
}

/**
 * Node-ийг нээхэд ДУТСАН нөхцөлүүд — capstone-ийнхыг ч агуулна. ХООСОН = нээж болно.
 *
 * ⚠ Энэ функц нь `state.mastery`-г УНШИХ ЦОРЫН ГАНЦ зөвшөөрөгдсөн зам (AC SKL-2 —
 * `MasteryTrack`-ийн гэрээнд нэрлэсэн үл хамаарах зүйл). `progression.ts` нь mastery-г
 * ШУУД уншихгүй, үүнийг дуудна: `architecture.test.ts`-ийн хүчний хоригийн сканнер
 * (D-6 · MST-5) прогрессийн модулиудад mastery-ийн уншилт олдвол УНАНА.
 */
export function unlockGaps(state: GameState, skill: SkillDefinition, pack: ContentPack): string[] {
  const gaps = capstoneGaps(state, skill, pack);

  if (costCurrency(skill) === 'masteryPoints') {
    const level = trackOf(state, skill.track).level;
    if (level < 2)
      gaps.unshift(`${skill.track} mastery must reach level 2 before its tier-${skill.tier} nodes open`);
  }

  return gaps;
}

/**
 * Нэг модны зарцуулсан оноог төлсөн ВАЛЮТААРАА яг бүтнээр буцааж, тухайн модны бүх
 * unlock-ийг тэглэнэ (AC SKL-3).
 *
 * ⚠ Cooldown нь ГЛОБАЛ (`respecAt` ганц талбар — P-19 · H-6): нэг модыг respec
 * хийхэд БҮХ модны 7 өдрийн тоолуур эхэлнэ. Мод тутмын хувилбар нь нэг өдөрт
 * 7 respec зөвшөөрч cooldown-ийн зорилгыг үгүйсгэх байв.
 */
export function respecTree(
  state: GameState,
  track: SkillTag,
  at: string,
  pack: ContentPack,
): DomainResult {
  if (!isTag(track)) return reject('INVALID_INPUT', `unknown track ${String(track)}`);

  if (state.respecAt !== null) {
    const waited = daysBetween(dayOf(state.respecAt), dayOf(at));
    if (waited < RESPEC_COOLDOWN_DAYS)
      return reject(
        'RESPEC_ON_COOLDOWN',
        `respec is available ${RESPEC_COOLDOWN_DAYS - waited} day(s) from now`,
      );
  }

  const inTree = pack.skills.filter(
    (s) => s.track === track && state.unlockedSkillIds.includes(s.id),
  );
  if (inTree.length === 0) return reject('PREREQ_NOT_MET', `nothing is unlocked in the ${track} tree`);

  const refundSkillPoints = inTree.filter((s) => costCurrency(s) === 'skillPoints').length;
  const refundMasteryPoints = inTree.length - refundSkillPoints;
  const cleared = new Set(inTree.map((s) => s.id));

  return ok({
    ...state,
    skillPoints: state.skillPoints + refundSkillPoints,
    masteryPoints: state.masteryPoints + refundMasteryPoints,
    unlockedSkillIds: state.unlockedSkillIds.filter((id) => !cleared.has(id)),
    respecAt: at,
  });
}
