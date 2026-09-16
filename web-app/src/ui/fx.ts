/**
 * Juice-ийн ГАНЦ хаалга (T-28; AC FX-1…FX-7; lld.md §9.3).
 *
 * ⚠ Анимац эхлүүлэх БУСАД зам БАЙХГҮЙ: `fx-` классын нэр энэ файлаас ГАДНА
 * `src/ui/**`-д гарвал `tests/ui/fx.test.ts` УНАНА. Хоёр дахь зам үүсвэл
 * `reducedMotion`-ийн хамгаалалт чимээгүй тойрогдоно.
 * ⚠ `announce` нь `motionOff`/`soundOff`-оос ҮЛ ХАМААРНА — анимац, дуу хоёулаа
 * НЭМЭЛТ давхарга, мэдээлэл нь үргэлж текстээр гарна (FX-6).
 * ⚠ `sound.ts` нь энэ бүртгэлээс `CUE_EVENTS`-ээ ГАРГАНА — хоёр дахь жагсаалт үлдэхгүй.
 */
import type { DomainEvent } from '@shared/types/index.ts';
import { announce } from './components.ts';

/** FX-7 — зэрэг ажиллах анимацийн дээд тоо; илүү нь ТОВЧИЛНО (текст гарсаар байна). */
export const MAX_CONCURRENT_FX = 3;
/** FX-4 — анимацийн дээд үргэлжлэл; `styles.css`-ийн хугацаанууд үүнээс хэтрэхгүй. */
export const FX_DURATION_MS = 300;

type EventData = Record<string, unknown> | undefined;

export type FxRow = {
  cls: string;
  hz: number;
  /** `aria-live`-д очих өгүүлбэр. ⚠ Талбар дутсан ч УНАХГҮЙ — дуурайлт/хуучин event. */
  text: (data: EventData) => string;
};

const value = (data: EventData, key: string): string => {
  const raw = data?.[key];
  return raw === undefined || raw === null ? '' : String(raw);
};

/** lld.md §9.3.1 — `FX-1`-ийн бүрэн байдлын ЭХ. ЯГ 12 мөр. */
export const FX_REGISTRY: Record<string, FxRow> = {
  LEVEL_UP: {
    cls: 'fx-levelup',
    hz: 880,
    text: (d) => `Level ${value(d, 'level')} — you are now ${value(d, 'rank')}.`,
  },
  QUEST_COMPLETED: {
    cls: 'fx-claim',
    hz: 660,
    text: (d) => `Quest complete: ${value(d, 'title')}.`,
  },
  SIDE_QUEST_COMPLETED: {
    cls: 'fx-side',
    hz: 620,
    text: (d) => `Side quest done: ${value(d, 'title')} — ${value(d, 'completions')} time(s) total.`,
  },
  DUNGEON_PASSED: {
    cls: 'fx-pass',
    hz: 740,
    text: (d) => `Dungeon passed — ${value(d, 'correct')} of ${value(d, 'total')} correct.`,
  },
  DUNGEON_FAILED: {
    cls: 'fx-fail',
    hz: 320,
    text: (d) => `Dungeon not passed. Next step: ${value(d, 'nextStep')}`,
  },
  ACHIEVEMENT_UNLOCKED: {
    cls: 'fx-achieve',
    hz: 990,
    text: (d) => `Achievement unlocked: ${value(d, 'title')}.`,
  },
  // VIS-4 — rarity нь ТЕКСТЭЭР, өнгө дангаараа биш.
  LOOT_DROPPED: {
    cls: 'fx-loot',
    hz: 1040,
    text: (d) => `Loot found: ${value(d, 'title')} (${value(d, 'rarity')}).`,
  },
  BOSS_ATTEMPT_LOGGED: {
    cls: 'fx-boss',
    hz: 700,
    text: (d) => {
      const head = `Attempt logged — ${value(d, 'tier')} tier, ${value(d, 'total')} of 60 on ${value(d, 'difficulty')}.`;
      const coaching = value(d, 'message');
      // AC BS-3 — унасан оролдлогын дасгалжуулах мессеж нь мэдэгдэлд БАС орно.
      return coaching === '' ? head : `${head} ${coaching}`;
    },
  },
  STREAK_EXTENDED: {
    cls: 'fx-streak',
    hz: 820,
    text: (d) => `Streak extended to ${value(d, 'current')} day(s).`,
  },
  MASTERY_LEVEL_UP: {
    cls: 'fx-mastery',
    hz: 900,
    text: (d) => `${value(d, 'tag')} mastery reached level ${value(d, 'level')}.`,
  },
  REPUTATION_GAINED: {
    cls: 'fx-rep',
    hz: 580,
    text: (d) => `Reputation with ${value(d, 'guildId')} is now rank ${value(d, 'rank')}.`,
  },
  CHAIN_COMPLETED: {
    cls: 'fx-chain',
    hz: 960,
    text: (d) => `Chain complete: ${value(d, 'chainId')} — ${value(d, 'bonusXp')} bonus XP.`,
  },
};

export type FxSettings = { reducedMotion: boolean; soundEnabled: boolean; soundVolume: number };
export type FxOutcome = { announced: string[]; animated: number };

type AudioCtor = new () => AudioContext;

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (ctx !== null) return ctx;
  const Ctor = (globalThis as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }).AudioContext
    ?? (globalThis as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (Ctor === undefined) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * Богино синтезийн дохио — аудио ФАЙЛ, сүлжээний хүсэлт БАЙХГҮЙ (AC OFF-2).
 * ⚠ Алдаа нь тоглоомыг зогсоохгүй: дуу бол нэмэлт давхарга.
 */
export function tone(hz: number, volume: number): void {
  if (volume <= 0) return;
  const audio = context();
  if (audio === null) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, audio.currentTime);
    // 120ms богино дохио — тоглоомын үйл явцыг таслахгүй.
    gain.gain.setValueAtTime(0.06 * Math.min(1, volume), audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.12);
  } catch {
    return;
  }
}

/**
 * Идэвхтэй анимацийн тоо нь DOM-оос УНШИГДАНА, модулийн тоолуураас БИШ (FX-7).
 * ⚠ Тоолуур хадгалвал таймер ажиллахгүй үлдсэн нөхцөлд (хуудас далд, тест) тоо нь
 * гацаж, дараагийн бүх анимац чимээгүй унтардаг. DOM бол ганц үнэн.
 */
function animate(cls: string): boolean {
  const host = document.getElementById('main');
  if (host === null) return false;
  const running = [...host.classList].filter((c) => c.startsWith('fx-')).length;
  if (running >= MAX_CONCURRENT_FX) return false;
  host.classList.add(cls);
  setTimeout(() => host.classList.remove(cls), FX_DURATION_MS);
  return true;
}

/** Системийн сонголт. ⚠ jsdom-д `matchMedia` байхгүй байж болно — уналт БАЙХГҮЙ. */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

/**
 * Event-ийн багцыг ГАНЦ хаалгаар нэвтрүүлнэ (plan.md P-5).
 *
 * ⚠ Мэдэгдэл нь НЭГ `aria-live` бичилтээр нийлж гарна: дэлгэц уншигч нь дараалсан
 * бичилтүүдийн эхнийхийг нь тасалдаг тул 8 event-ийн 8 мессеж бүгд сонсогдох ёстой.
 */
export function play(events: readonly DomainEvent[], settings: () => FxSettings): FxOutcome {
  const s = settings();
  const motionOff = s.reducedMotion || prefersReducedMotion();
  const soundOff = !s.soundEnabled || s.soundVolume <= 0;

  const announced: string[] = [];
  let animated = 0;

  for (const event of events) {
    const row = FX_REGISTRY[event.type];
    if (row === undefined) continue;

    announced.push(row.text(event.data as EventData));
    if (!motionOff && animate(row.cls)) animated += 1;
    if (!soundOff) tone(row.hz, s.soundVolume);
  }

  if (announced.length > 0) announce(announced.join(' '));
  return { announced, animated };
}
