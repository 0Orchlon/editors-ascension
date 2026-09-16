/**
 * Side quest chain (AC RET-2, RET-3; plan.md P-21 · §12.4).
 *
 * ⚠ Явцын ШИНЭ талбар БАЙХГҮЙ (P-21): дараалал нь `sideQuestStats[stepId].lastCompletedAt`-аас
 * ГАРГАГДАНА. Тусдаа `chainProgress` талбар нь ижил баримтын хоёр дахь эх сурвалж
 * болох бөгөөд нэг нь мартагдана (PERSONAL-1 P-2-ийн алдаа).
 * ⚠ Дууссан chain нь `completedChainIds`-д БАЙНГА үлдэнэ — `bonusXp` дахин олгогдохгүй,
 * давтагдах side quest-ийг дахин дуусгасан ч.
 */
import type { ContentPack, DomainEvent, GameState, SideQuestChain } from '../types/index.ts';
import { addXp } from './progression.ts';

export type ChainOutcome = { state: GameState; events: DomainEvent[] };

/**
 * Chain дууссан эсэх: 4 алхам бүгд бүртгэлтэй БА `lastCompletedAt` нь алхмын
 * дарааллаар БУУРАХГҮЙ.
 *
 * ⚠ Огноогүй (`null`) бичлэг нь дарааллыг НОТЛОХ боломжгүй тул дуусаагүй гэж
 * үзнэ — «дуусаагүй» нь худал шагналаас хямд өртөгтэй.
 * ⚠ Ижил өдөр дууссан хоёр алхам нь зөрчил БИШ (`≥` харьцаа) — тоглогч нэг
 * суулгаанд хоёр алхмыг дуусгаж болно.
 * ⚠ lld.md §6.3 — мөрийн лексикографик эрэмбэ нь ЗӨВХӨН ижил бүсийн (`Z`) ISO-8601
 * дээр цаг хугацааны эрэмбэтэй таарна. `schemas.ts`-ийн `dateTime()` regex нь
 * `+07:00` офсетыг ЗӨВШӨӨРДӨГ тул import/crafted action-ийн замаар офсеттой мөр
 * орж ирж чадна: `2026-03-11T01:00:00+07:00` нь бодитоор `2026-03-10T18:00Z` —
 * мөрөөр «том», агшнаар «бага». Тийм мөр нь дарааллыг НОТЛОХ боломжгүй тул
 * chain дуусахгүй (буруу дуусгахаас дуусгахгүй нь аюулгүй).
 */
const isUtcIso = (at: string): boolean => at.endsWith('Z');

function completedInOrder(state: GameState, chain: SideQuestChain): boolean {
  let previous = '';
  for (const step of chain.steps) {
    const at = state.sideQuestStats[step]?.lastCompletedAt;
    if (at === undefined || at === null) return false;
    if (!isUtcIso(at)) return false;
    if (at < previous) return false;
    previous = at;
  }
  return true;
}

/**
 * `bonusXp`-ийн тааз: тухайн `chain.world`-ийн main quest-үүдийн ХАМГИЙН БАГА `xp`
 * (AC RET-3). Контентын хаалга (`[C]` RET-3) үүнийг аль хэдийн барьдаг; домэйн нь
 * ХОЁР ДАХЬ хамгаалалт — хүчингүй пакет орж ирвэл чимээгүй хэтрүүлэхгүй.
 */
function bonusWithinCeiling(chain: SideQuestChain, pack: ContentPack): boolean {
  const here = pack.quests.filter((q) => q.track === 'main' && q.world === chain.world).map((q) => q.xp);
  if (here.length === 0) return false;
  return chain.bonusXp <= Math.min(...here);
}

/**
 * Side quest claim-ийн ДАРАА дуудагдана (`claimQuest`-ийн `4b` алхам — plan.md §13.2).
 * ⚠ `DomainResult` БИШ: татгалзах шалтгаан байхгүй, дуудагчийн урсгалыг таслахгүй.
 */
export function evaluateChains(state: GameState, pack: ContentPack): ChainOutcome {
  if (pack.chains.length === 0) return { state, events: [] };

  let next = state;
  const events: DomainEvent[] = [];
  const completed: string[] = [];

  for (const chain of pack.chains) {
    if (next.completedChainIds.includes(chain.id)) continue;
    if (!completedInOrder(next, chain)) continue;
    if (!bonusWithinCeiling(chain, pack)) continue;

    const awarded = addXp(next, chain.bonusXp);
    // `addXp` нь зөвхөн хүчингүй тоонд татгалздаг; схем `bonusXp ≥ 1` шаардсан тул
    // энэ нь хүчингүй пакетын шинж — бонусыг алгасаж үлдсэн chain-ийг үргэлжлүүлнэ.
    if (!awarded.ok) continue;

    next = awarded.state;
    events.push(...awarded.events);
    events.push({ type: 'CHAIN_COMPLETED', data: { chainId: chain.id, bonusXp: chain.bonusXp } });
    completed.push(chain.id);
  }

  if (completed.length === 0) return { state, events: [] };
  return { state: { ...next, completedChainIds: [...next.completedChainIds, ...completed] }, events };
}
