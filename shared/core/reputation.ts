/**
 * Guild reputation (AC RET-5, RET-6; plan.md §12.3).
 *
 * ⚠ Rep нь ЗӨВХӨН ӨСНӨ: бууралт, зарцуулалт, хугацаа дуусалт БАЙХГҮЙ. Тиймээс
 * «буурахгүй» шинж нь кодын хэлбэрээс шууд гарна — хаана ч хасах үйлдэл байхгүй.
 * ⚠ spec.md D-6 · RET-6 — rep нь ЗӨВХӨН cosmetic цол/туг нээнэ. Ямар ч нээлт, XP,
 * stamina rep уншихгүй; `web-app/tests/architecture.test.ts` сканнердаж хамгаална.
 * ⚠ tag → guild зураглал нь КОНТЕНТООС (`Ctx.pack.guilds`, plan.md P-13) — кодод
 * хатуу бичих нь guild-ийн нэр солиход домэйныг эвдэнэ.
 */
import type { ContentPack, DomainEvent, GameState, SkillTag } from '../types/index.ts';
import { DEFAULT_REPEAT_XP_MULTIPLIER, REP_BASE, REP_THRESHOLDS } from './constants.ts';

/** Контентын `track` — rep-ийн суурь ЭНЭ хүснэгтээс (plan.md P-16 · хүний цэг H-5). */
export type RepTrack = keyof typeof REP_BASE;

export type ReputationOutcome = { state: GameState; events: DomainEvent[] };

/** Tag-ийг эзэмших guild-ийн id; эзэнгүй tag бол `null`. */
export function guildFor(tag: SkillTag, pack: ContentPack): string | null {
  return pack.guilds.find((g) => (g.tags as readonly string[]).includes(tag))?.id ?? null;
}

/**
 * `rankOf(rep)` = `REP_THRESHOLDS`-оос rep-ээс хэтрэхгүй босгуудын тоо → `0..4`.
 * ⚠ Зэрэглэл нь ЗӨВХӨН cosmetic — ямар ч контентыг нээхгүй (RET-6).
 */
export function rankOf(rep: number): number {
  return REP_THRESHOLDS.filter((t) => rep >= t).length;
}

/**
 * `n` дэх гүйцэтгэлийн олголт: `floor(REP_BASE[track] × m^(n−1))` (plan.md §12.3).
 *
 * ⚠ `0` нь «олгохгүй» гэсэн үг: side quest-ийн хуваарь нь `2 · 1 · 0 · 0 …` —
 * grind нь тэгд нийлж SQ-4-ийн anti-grind таазтай нийцнэ.
 */
export function repAward(
  track: RepTrack,
  completionIndex: number,
  multiplier: number = DEFAULT_REPEAT_XP_MULTIPLIER,
): number {
  const n = Math.max(1, Math.floor(completionIndex));
  return Math.floor(REP_BASE[track] * multiplier ** (n - 1));
}

/**
 * Контентын `tags`-т харгалзах guild-үүдэд rep олгоно.
 *
 * ⚠ `DomainResult` БИШ: татгалзах шалтгаан байхгүй (`claimQuest`-ийн 4a алхам —
 * plan.md §13.2). Хоёр tag нэг guild-д харгалзвал олголт НЭГ л удаа бичигдэнэ.
 */
export function grantReputation(
  state: GameState,
  tags: readonly SkillTag[],
  track: RepTrack,
  completionIndex: number,
  pack: ContentPack,
  multiplier?: number,
): ReputationOutcome {
  const amount = repAward(track, completionIndex, multiplier);
  if (amount <= 0) return { state, events: [] };

  const guildIds = new Set<string>();
  for (const tag of tags) {
    const guild = guildFor(tag, pack);
    // Эзэнгүй tag нь шинэ бичлэг ЗОХИОХГҮЙ — rep-ийн түлхүүр нь guilds.json-оос.
    if (guild !== null) guildIds.add(guild);
  }
  if (guildIds.size === 0) return { state, events: [] };

  const reputation = { ...state.reputation };
  const events: DomainEvent[] = [];
  for (const guildId of guildIds) {
    const total = (reputation[guildId] ?? 0) + amount;
    reputation[guildId] = total;
    events.push({
      type: 'REPUTATION_GAINED',
      data: { guildId, amount, total, rank: rankOf(total) },
    });
  }

  return { state: { ...state, reputation }, events };
}
