/**
 * Дууны дохио (lld.md §7.8 A11Y-5).
 *
 * ⚠ Дуу нь НЭМЭЛТ давхарга: `soundEnabled:false` ба `AudioContext`-гүй орчинд
 * ямар ч функц алдагдахгүй. Settings-ийн шалгах нүд нь БОДИТ зүйлийг удирдана.
 * ⚠ Мөн «модуль бичигдсэн» биш «апп ТҮҮНИЙГ ДУУДДАГ» эсэхийг шалгана.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent } from '@shared/types/index.ts';
import { CUE_EVENTS, createSoundCues } from '../../src/ui/sound.ts';
import { $, $$, go, mount } from './helpers.ts';

/** ⚠ Модулийн `AudioContext` нь НЭГ удаа үүсээд кэшлэгддэг — тиймээс бүртгэл нь файлын хэмжээнд. */
const started: number[] = [];

class StubContext {
  readonly currentTime = 0;
  readonly destination = {};
  createOscillator() {
    const node = {
      type: 'sine',
      frequency: { value: 0, setValueAtTime(v: number) { node.frequency.value = v; } },
      connect: () => undefined,
      start: () => void started.push(node.frequency.value),
      stop: () => undefined,
    };
    return node;
  }
  createGain() {
    return {
      gain: { value: 0, setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
      connect: () => undefined,
    };
  }
  close() { return Promise.resolve(); }
}

const event = (type: string): DomainEvent => ({ type } as DomainEvent);

beforeEach(() => {
  (globalThis as Record<string, unknown>).AudioContext = StubContext;
  started.length = 0;
});

describe('sound cues (A11Y-5)', () => {
  it('бүртгэлийн 12 event дээр л дуугарна (§9.3.4 — 4 → 12)', () => {
    const cues = createSoundCues(() => true);
    // ⚠ Жагсаалт нь `FX_REGISTRY`-ээс ГАРГАГДАНА — энд гараар бичигдэхгүй.
    expect(CUE_EVENTS).toHaveLength(12);

    cues([...CUE_EVENTS.map(event), event('STAMINA_SPENT'), event('COINS_GAINED')]);

    expect(started).toHaveLength(12);
  });

  it('`soundEnabled:false` үед ЮУ Ч тоглохгүй', () => {
    createSoundCues(() => false)([event('LEVEL_UP')]);
    expect(started).toHaveLength(0);
  });

  it('`AudioContext`-гүй орчинд УНАХГҮЙ', () => {
    delete (globalThis as Record<string, unknown>).AudioContext;
    expect(() => createSoundCues(() => true)([event('LEVEL_UP')])).not.toThrow();
  });

  it('апп нь quest дуусгахад дохиог ДУУДНА', () => {
    mount();
    go('#/quests');
    const open = $$<HTMLButtonElement>('.quest-card button').find(
      (b) => b.textContent?.trim() === 'Claim victory' && !b.disabled,
    )!;
    open.click();
    for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
      box.click();
      box.dispatchEvent(new Event('change'));
    }
    $$<HTMLButtonElement>('.modal button').find((b) => b.textContent?.trim() === 'Claim victory')!.click();

    expect(started.length).toBeGreaterThan(0);
  });

  it('тохиргоог унтраахад апп дуугаа зогсооно', () => {
    mount();
    go('#/settings');
    $<HTMLInputElement>('#set-sound')!.click();

    go('#/quests');
    const open = $$<HTMLButtonElement>('.quest-card button').find(
      (b) => b.textContent?.trim() === 'Claim victory' && !b.disabled,
    )!;
    open.click();
    for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
      box.click();
      box.dispatchEvent(new Event('change'));
    }
    $$<HTMLButtonElement>('.modal button').find((b) => b.textContent?.trim() === 'Claim victory')!.click();

    expect(started).toHaveLength(0);
  });
});
