/** Өдрийн даалгавар сонгогч (lld.md §5.4.6; AC DM-1, DM-2, DM-3, RET-4). */
import type { ContentPack, GameState, QuestDefinition } from '../types/index.ts';
import { REFRESHER_MIN_DAYS } from './constants.ts';
import { daysBetween } from './result.ts';
import { fnv1a } from './rng.ts';

/** Сонголтын эрэмбэ — main хамгийн түрүүнд (AC DM-3). */
const TIERS = ['main', 'dungeon', 'side'] as const;

function eligible(state: GameState, pack: ContentPack): QuestDefinition[] {
  return pack.quests.filter((q) => {
    if (q.track === 'boss' || q.track === 'raid') return false; // AC DM-2
    if (q.levelRequired > state.level) return false;
    if (!q.prerequisites.every((p) => state.completedMainQuestIds.includes(p))) return false;

    if (q.track === 'main') return !state.completedMainQuestIds.includes(q.id);
    if (q.track === 'dungeon') return !state.completedDungeonIds.includes(q.id);
    return q.repeatable || state.sideQuestStats[q.id] === undefined;
  });
}

/**
 * Детерминистик — ижил огноо + ижил төлөв = ижил гаралт (AC DM-1). `Math.random()`
 * ашиглахгүй: `fnv1a(date)`-ийн үлдэгдлээр индекс сонгоно.
 *
 * ⚠ «≥2 нэр дэвшигч» гэдгийг tier тус бүрээр БИШ, БҮХ нэр дэвшигчээр тоолно
 * (AC DM-2-ийн үг) — сүүлчийн боломжит даалгаврыг хасаж `null` буцаахгүй.
 */
export function pickDailyMission(state: GameState, date: string, pack: ContentPack): string | null {
  let pool = eligible(state, pack);

  const previous = state.dailyMission?.questId;
  if (pool.length >= 2 && previous !== undefined && pool.some((q) => q.id === previous))
    pool = pool.filter((q) => q.id !== previous);

  for (const tier of TIERS) {
    const tierPool = pool
      .filter((q) => q.track === tier)
      .sort((a, b) => a.world - b.world || a.levelRequired - b.levelRequired || (a.id < b.id ? -1 : 1));
    if (tierPool.length === 0) continue;
    return tierPool[fnv1a(date) % tierPool.length]!.id;
  }

  // AC RET-4 — refresher нь СҮҮЛИЙН АРГА: дээрх гурван эрэмбэд шинэ ажил байхгүй
  // үед л ээлж ирнэ (plan.md §12.4 — байрлал нь ЭНЭ, `return null`-ийн ӨМНӨ).
  let refresher = refresherCandidates(state, date, pack);
  // ⚠ lld.md §6.9 (T-15) — өчигдрийнхийг МӨН хасна: TIERS-ийн `previous` шүүлт нь
  // үндсэн pool дээр л ажилладаг байсан тул refresher нь хоёр өдөр дараалан ижил
  // dungeon гаргаж чаддаг байв. Сүүлчийн нэр дэвшигчийг хасахгүй — DM-2-ийн дүрэм.
  if (refresher.length >= 2 && previous !== undefined)
    refresher = refresher.filter((q) => q.id !== previous);
  if (refresher.length > 0) return refresher[fnv1a(date) % refresher.length]!.id;

  return null; // AC DM-3 — UI «Rest day» харуулна.
}

/**
 * ≥14 тоглоомын өдрийн өмнө тэнцсэн dungeon-ууд (AC RET-4).
 *
 * ⚠ Огноо нь `dungeonStats[id].lastPassedDate`-ээс (plan.md P-15). `null` нь
 * «хэзээ тэнцсэн нь тодорхойгүй» гэсэн үг — нэр дэвшихГҮЙ: хуучин save-д огноо
 * байхгүй тул зохиовол migration-ий дараа өдөр бүр refresher гарна.
 * ⚠ `daysBetween` нь UTC хуанлийн зөрүү (P-18) — `Date.now()` дуудагдахгүй тул
 * детерминизмын хориг зөрчигдөхгүй.
 * ⚠ lld.md §6.9 — `levelRequired` шүүлт нь үндсэн pool-ынхтой ИЖИЛ: respec/prestige
 * нь түвшин буулгадаггүй ч түвшний хаалга контентоор өсөж болно, тэгвэл тоглогч
 * эхлүүлж ч чадахгүй даалгавар авна. Эрэмбэ нь мөн TIERS-ийнхтэй ижил
 * (`world → levelRequired → id`) — бүтэн эрэмбэ тул пакетын дараалал нөлөөлөхгүй.
 */
function refresherCandidates(state: GameState, date: string, pack: ContentPack): QuestDefinition[] {
  return pack.quests
    .filter((q) => q.track === 'dungeon')
    .filter((q) => q.levelRequired <= state.level)
    .filter((q) => state.completedDungeonIds.includes(q.id))
    .filter((q) => {
      const last = state.dungeonStats[q.id]?.lastPassedDate;
      return last !== undefined && last !== null && daysBetween(last, date) >= REFRESHER_MIN_DAYS;
    })
    .sort((a, b) => a.world - b.world || a.levelRequired - b.levelRequired || (a.id < b.id ? -1 : 1));
}
