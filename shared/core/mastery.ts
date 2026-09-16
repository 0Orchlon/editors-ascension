/**
 * Mastery track хөдөлгүүр (AC MST-1, MST-3, MST-4; plan.md §12.1).
 *
 * ⚠ Track тутмын түвшин нь дүрийн XP-тэй ИЖИЛ `XP_THRESHOLDS` хүснэгтээр тооцогдоно —
 * тусдаа босго БАЙХГҮЙ (AC MST-1). `levelFor`-ыг ДАХИН бичихгүй, `progression.ts`-ээс
 * дуудна: хоёр хувилбар нь тоглогчийн харах түвшинг серверийнхээс салгана.
 * ⚠ AC MST-5 · spec.md D-6 — mastery нь XP · stamina · coin · loot · quest/dungeon-ийн
 * нээлтэд НӨЛӨӨЛӨХГҮЙ. Цорын ганц үл хамаарах зүйл нь tier-2/3 skill node (AC SKL-2),
 * тэр нь `skillTree.ts`-д. Энэ модуль өөр төлөв ХӨНДӨХГҮЙ.
 */
import type { DomainEvent, GameState, MasteryTrack, SkillTag } from '../types/index.ts';
import { MASTERY_MAX_LEVEL, MASTERY_PRESTIGE_LEVEL, SKILL_TAGS } from './constants.ts';
import { levelFor } from './progression.ts';
import { ok, reject, type DomainResult } from './result.ts';

export type MasteryOutcome = { state: GameState; events: DomainEvent[] };

const isTag = (tag: string): tag is SkillTag => (SKILL_TAGS as readonly string[]).includes(tag);

/**
 * Track-ийн уншилтын ЦОРЫН ГАНЦ зам (lld.md §4.2 A-LLD2-1 · §6.10).
 *
 * ⚠ `rec()` нь түлхүүрийн БҮРЭН байдлыг шалгадаггүй тул уншигч бүр `?? 0` гэж
 * дотроо анхдагч бичвэл зан төлөв нь файл тутамд чимээгүй сална. Байхгүй түлхүүрт
 * `{ xp: 0, level: 1, prestigeCount: 0 }` буцаана — «хараахан ахиагүй» нь level 1,
 * level 0 БИШ (`earnedMasteryPoints`-ийн `level − 1` томьёо үүнээс хамаарна).
 */
export function trackOf(state: GameState, tag: SkillTag): MasteryTrack {
  return state.mastery[tag] ?? { tag, xp: 0, level: 1, prestigeCount: 0 };
}

/**
 * Олдсон НИЙТ mastery point (plan.md P-20). ⚠ Хадгалагдахгүй — ГАРГАГДАНА:
 * `masteryPoints` нь ҮЛДЭГДЭЛ тул хоёр тоог зэрэг хадгалбал салалт үүснэ.
 * Prestige нь level 10 → 1 (−9) болгож `prestigeCount`-ыг +1 (+9) болгодог тул
 * нийт ХӨДӨЛӨХГҮЙ — өмнө олсон оноо буцаагдахгүй (AC MST-3).
 */
export function earnedMasteryPoints(state: GameState): number {
  let total = 0;
  for (const tag of SKILL_TAGS) {
    const track = trackOf(state, tag);
    total += track.level - 1 + track.prestigeCount * 9;
  }
  return total;
}

/**
 * Контентын `tags` дэх track БҮРД тухайн XP-ийг БҮТНЭЭР нэмнэ (spec.md A4 — хуваахгүй).
 *
 * ⚠ `DomainResult` БИШ: татгалзах шалтгаан байхгүй тул дуудагчийн урсгалыг таслахгүй
 * (`claimQuest` нь үүнийг 3a алхамд дууддаг — plan.md §13.2).
 */
export function addMasteryXp(
  state: GameState,
  tags: readonly SkillTag[],
  amount: number,
): MasteryOutcome {
  if (!Number.isFinite(amount) || amount <= 0 || tags.length === 0) return { state, events: [] };

  const events: DomainEvent[] = [];
  const mastery = { ...state.mastery };
  let masteryPoints = state.masteryPoints;

  // Ижил tag хоёр удаа бичигдсэн контент нь XP-ийг хоёр дахин авах ёсгүй.
  for (const tag of new Set(tags)) {
    const track = trackOf(state, tag);

    /**
     * ⚠ Дээд түвшинд XP ЦАРЦАНА (lld.md §6.1-ийн хилийн шийдвэр). Эс бөгөөс `xp` нь
     * хязгааргүй өсөж, `prestigeMastery` нь `xp ← 0` бичихэд тоглогч харагдахгүй
     * хуримтлалаа алдана — «алдсан» мэдрэмж нь MST-3-ийн амлалтыг эвдэнэ.
     */
    if (track.level >= MASTERY_MAX_LEVEL) continue;

    const xp = track.xp + amount;
    const level = Math.min(levelFor(xp), MASTERY_MAX_LEVEL);
    // ⚠ Тархалтгүй, ил талбарууд: `{ ...track, … }` нь `architecture.test.ts`-ийн
    // «бичих хориг» сканнерт прогрессийн бичилтээс ялгагдахгүй олдвор үлдээнэ.
    mastery[tag] = { tag, xp, level, prestigeCount: track.prestigeCount };

    for (let next = track.level + 1; next <= level; next++) {
      masteryPoints += 1;
      events.push({ type: 'MASTERY_LEVEL_UP', data: { tag, level: next, masteryPoints } });
    }
  }

  return { state: { ...state, mastery, masteryPoints }, events };
}

/**
 * Track-ийг дахин эхлүүлнэ (AC MST-3). Зөвхөн дээд түвшинд: `xp = 0`, `level = 1`,
 * `prestigeCount + 1`. Бусад track ХӨНДӨГДӨХГҮЙ, `masteryPoints` БУУРАХГҮЙ.
 */
export function prestigeMastery(state: GameState, tag: SkillTag): DomainResult {
  if (!isTag(tag)) return reject('INVALID_INPUT', `unknown skill tag ${String(tag)}`);
  const track = trackOf(state, tag);
  if (track.level !== MASTERY_PRESTIGE_LEVEL)
    return reject(
      'PREREQ_NOT_MET',
      `prestige needs ${tag} at level ${MASTERY_PRESTIGE_LEVEL} — it is at level ${track.level}`,
    );

  const prestigeCount = track.prestigeCount + 1;
  return ok(
    { ...state, mastery: { ...state.mastery, [tag]: { tag, xp: 0, level: 1, prestigeCount } } },
    [{ type: 'MASTERY_PRESTIGED', data: { tag, prestigeCount } }],
  );
}
