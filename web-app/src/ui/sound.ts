/**
 * Дууны дохио (lld.md §7.8 A11Y-5).
 *
 * ⚠ Дуу нь НЭМЭЛТ давхарга — мэдээлэл ЗӨВХӨН дуугаар дамжихгүй: ижил зүйл
 * `aria-live` мэдэгдэл ба дэлгэцийн текстээр үргэлж гарна.
 * ⚠ Хэрэглэгчийн товшилтоос өмнө `AudioContext` үүсгэх нь хөтөчид хориотой —
 * тиймээс эхний event дээр залхуу үүсгэж, бүтэлгүйтвэл ЧИМЭЭГҮЙ өнгөрнө.
 */
import type { DomainEvent, DomainEventType } from '@shared/types/index.ts';

/** §7.8 A11Y-5 — ЯГ дөрөв. Нэмэх бол LLD-ээс эхэлнэ. */
export const CUE_EVENTS = ['LEVEL_UP', 'QUEST_COMPLETED', 'DUNGEON_PASSED', 'ACHIEVEMENT_UNLOCKED'] as const;

const TONE_HZ: Record<(typeof CUE_EVENTS)[number], number> = {
  LEVEL_UP: 880,
  QUEST_COMPLETED: 660,
  DUNGEON_PASSED: 740,
  ACHIEVEMENT_UNLOCKED: 990,
};

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

const isCue = (type: DomainEventType): type is (typeof CUE_EVENTS)[number] =>
  (CUE_EVENTS as readonly string[]).includes(type);

/** `events$`-д бүртгэх сонсогч үүсгэнэ. `enabled` нь ДУУДАХ бүрд шинээр уншигдана. */
export function createSoundCues(enabled: () => boolean): (events: DomainEvent[]) => void {
  return (events) => {
    if (!enabled()) return;
    for (const event of events) {
      if (!isCue(event.type)) continue;
      const audio = context();
      if (audio === null) return;
      try {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(TONE_HZ[event.type], audio.currentTime);
        // 120ms богино дохио — тоглоомын үйл явцыг таслахгүй.
        gain.gain.setValueAtTime(0.06, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 0.12);
      } catch {
        // Дуу бол нэмэлт — алдаа нь тоглоомыг зогсоохгүй.
        return;
      }
    }
  };
}
