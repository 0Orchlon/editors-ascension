/**
 * Дууны дохио (lld.md §7.8 A11Y-5 · §9.3.4).
 *
 * ⚠ Дуу нь НЭМЭЛТ давхарга — мэдээлэл ЗӨВХӨН дуугаар дамжихгүй: ижил зүйл
 * `aria-live` мэдэгдэл ба дэлгэцийн текстээр үргэлж гарна.
 * ⚠ `CUE_EVENTS` ба давтамжууд нь `fx.ts`-ийн `FX_REGISTRY`-ээс ГАРГАГДАНА
 * (T-28 · `FX-3`-ийн «ганц хамгаалалт») — хоёр дахь жагсаалт үлдэхгүй. Энэ модуль
 * `fx.ts` руу л ханддаг, эсрэгээрээ БИШ: мөчлөг үүсвэл бүртгэл TDZ-д унана.
 * ⚠ Хэрэглэгчийн товшилтоос өмнө `AudioContext` үүсгэх нь хөтөчид хориотой —
 * тиймээс эхний event дээр залхуу үүсгэж, бүтэлгүйтвэл ЧИМЭЭГҮЙ өнгөрнө (`fx.tone`).
 */
import type { DomainEvent, DomainEventType } from '@shared/types/index.ts';
import { FX_REGISTRY, tone } from './fx.ts';

/** §9.3.4 — бүртгэлээс гаргагдана: 4 → 12. Нэмэх бол `FX_REGISTRY`-ээс эхэлнэ. */
export const CUE_EVENTS = Object.keys(FX_REGISTRY) as readonly DomainEventType[];

/** `events$`-д бүртгэх сонсогч үүсгэнэ. `enabled` нь ДУУДАХ бүрд шинээр уншигдана. */
export function createSoundCues(enabled: () => boolean): (events: DomainEvent[]) => void {
  return (events) => {
    if (!enabled()) return;
    for (const event of events) {
      const row = FX_REGISTRY[event.type];
      if (row !== undefined) tone(row.hz, 1);
    }
  };
}
