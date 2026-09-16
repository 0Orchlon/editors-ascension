/**
 * Cosmetic-ийн нээлт ба camp layout (AC COS-2, COS-4, RET-8; plan.md P-1 · P-25 · §12.5).
 *
 * ⚠ P-1 — «нээгдсэн эсэх» нь ХАДГАЛАГДАХГҮЙ: `unlockSource`-ийг төлвөөс үнэлж
 * ГАРГАЖ авна. `unlockedCosmeticIds` талбар нэмэх нь ижил баримтын хоёр дахь эх
 * сурвалж болж чимээгүй салалт үүсгэнэ.
 * ⚠ spec.md D-6 — cosmetic нь тоглоомын тоон нөлөөгүй; `campLayout`-ыг домэйн
 * дүрэм УНШИХГҮЙ (зөвхөн энэ модуль бичнэ, UI уншина).
 */
import type {
  ContentPack,
  CosmeticItem,
  CosmeticSlot,
  GameState,
  SkillTag,
} from '../types/index.ts';
import { COSMETIC_SLOTS } from './constants.ts';
import { trackOf } from './mastery.ts';
import { rankOf } from './reputation.ts';
import { ok, reject, type DomainResult } from './result.ts';

/** `bossTier`-ийн эрэмбэ — «доогуур биш» гэсэн утгатай (achievements.ts-тэй ижил дүрэм). */
const TIER_RANK = { failed: 0, mvp: 1, advanced: 2, mastery: 3 } as const;

const isSlot = (key: string): key is CosmeticSlot =>
  (COSMETIC_SLOTS as readonly string[]).includes(key);

/**
 * Нээлтийн үнэлгээний хүснэгт (plan.md §12.5). Танихгүй `kind` нь «нээгдээгүй» —
 * хүчингүй контент нь шагналыг ЧӨЛӨӨЛӨХГҮЙ (лавлагааны бүрэн байдлыг `[C]` хаалга барина).
 */
export function isUnlocked(state: GameState, item: CosmeticItem, _pack: ContentPack): boolean {
  const { kind, refId, value } = item.unlockSource;

  switch (kind) {
    case 'quest':
      return (
        state.completedMainQuestIds.includes(refId) ||
        state.completedDungeonIds.includes(refId) ||
        state.sideQuestStats[refId] !== undefined
      );
    case 'boss': {
      const needed = TIER_RANK[String(value) as keyof typeof TIER_RANK];
      if (needed === undefined) return false;
      return state.bossAttempts.some((a) => a.bossId === refId && TIER_RANK[a.tier] >= needed);
    }
    case 'achievement':
      return state.achievementIds.includes(refId);
    case 'guildRank':
      return rankOf(state.reputation[refId] ?? 0) >= Number(value);
    case 'mastery':
      return trackOf(state, refId as SkillTag).level >= Number(value);
    default:
      return false;
  }
}

/** Тухайн төлөвт нээгдсэн БҮХ cosmetic (Trophy Room-ийн эх — AC COS-3). */
export function unlockedCosmetics(state: GameState, pack: ContentPack): CosmeticItem[] {
  return pack.cosmetics.filter((item) => isUnlocked(state, item, pack));
}

/**
 * Camp-ийн эмхлэн байрлуулалт (AC COS-4).
 *
 * ⚠ ЯГ 6 түлхүүртэй БҮТЭН объект хүлээж авна — хэсэгчилсэн засвар БАЙХГҮЙ (P-25):
 * хагас объект нь «дутуу түлхүүр» ба «хоосон болгосон» хоёрыг ялгах боломжгүй болгоно.
 * ⚠ Нээгдээгүй зүйлийг зүүх нь `PREREQ_NOT_MET` — эс бөгөөс Trophy Room-ийн утга үгүй болно.
 */
export function setCampLayout(
  state: GameState,
  slots: Record<string, string | null>,
  pack: ContentPack,
): DomainResult {
  const keys = Object.keys(slots);
  if (keys.length !== COSMETIC_SLOTS.length || !keys.every(isSlot))
    return reject(
      'INVALID_INPUT',
      `campLayout needs exactly these slots: ${COSMETIC_SLOTS.join(', ')}`,
    );

  const next: Record<string, string | null> = {};
  for (const slot of COSMETIC_SLOTS) {
    const id = slots[slot] ?? null;
    if (id === null) {
      next[slot] = null;
      continue;
    }

    const item = pack.cosmetics.find((c) => c.id === id);
    if (item === undefined) return reject('INVALID_INPUT', `unknown cosmetic ${id}`);
    if (item.slot !== slot) return reject('INVALID_INPUT', `${id} belongs in the ${item.slot} slot`);
    if (!isUnlocked(state, item, pack)) return reject('PREREQ_NOT_MET', `${id} is not unlocked yet`);
    next[slot] = id;
  }

  return ok({ ...state, campLayout: { slots: next as GameState['campLayout']['slots'] } });
}
