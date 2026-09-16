/** Домэйн функцийн нийтлэг хэлбэр (spec.md D-2, lld.md §5.4). */
import type { ContentPack, DomainEvent, GameState, RejectionReason } from '../types/index.ts';

export type DomainResult =
  | { ok: true; state: GameState; events: DomainEvent[] }
  /** ⚠ `state` БУЦАХГҮЙ — дуудагч өмнөх төлвийг хэвээр хадгална (AC BE-11). */
  | { ok: false; reason: RejectionReason; detail?: string };

export type Ctx = {
  pack: ContentPack;
  /** ISO-8601 — `Date.now()`-ийн ОРОНД (plan.md P-5). */
  at: string;
  /** [0,1) — `Math.random()`-ийн ОРОНД. */
  rng: () => number;
};

export const ok = (state: GameState, events: DomainEvent[] = []): DomainResult => ({
  ok: true,
  state,
  events,
});

export const reject = (reason: RejectionReason, detail?: string): DomainResult =>
  detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };

/** `at` (ISO-8601) → `YYYY-MM-DD` (UTC — A-LLD-6). */
export const dayOf = (at: string): string => at.slice(0, 10);

/**
 * Хоёр тоглоомын өдрийн хоорондох БҮХЭЛ өдрийн зөрүү (plan.md P-18).
 *
 * ⚠ `dayOf`-ийн хажууд, шинэ модуль үүсгэхгүй: `SKL-3` (7 өдөр) ба `RET-4`
 * (14 өдөр) хоёулаа ижил тооллыг шаарддаг — хоёр газар өөрөөр тоолвол нэг нь
 * цагийн бүсэд унана.
 * ⚠ Цаг УНШИХГҮЙ: оролт нь ХОЁУЛАА `YYYY-MM-DD`. `Date.parse` нь UTC тэмдэгттэй
 * мөрийг л задалдаг тул детерминизмын хориг зөрчигдөхгүй (`Date.now` дуудагдаагүй).
 * ⚠ Сөрөг утга нь `b` нь `a`-аас ӨМНӨ гэсэн үг — «хугацаа гүйцсэн эсэх»-ийг
 * дуудагч шийднэ.
 */
export const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
