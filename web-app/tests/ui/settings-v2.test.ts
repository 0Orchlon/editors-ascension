/**
 * Settings v2 — `colorBlindSafe`, `soundVolume` (T-33; AC VIS-3, FX-3).
 *
 * ⚠ Тохиргоо нь SAVE-д очно, зөвхөн DOM-д биш: дахин ачаалахад сонголт үлдэхгүй
 * бол «хүртээмжийн горим» гэдэг нэр төдий болно.
 * ⚠ `soundVolume = 0` нь ЧИМЭЭГҮЙ гэсэн үг: oscillator ҮҮСЭХ ЁСГҮЙ, зүгээр л
 * сонсогдохгүй байх биш.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { $, $$, go, mount } from './helpers.ts';

/** `fx.tone`-ийн үүсгэсэн oscillator бүр энд бүртгэгдэнэ. */
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

/** Save-д бичигдсэн тохиргоог уншина — DOM биш, ДИСК нь эх сурвалж. */
function savedSettings(dump: Record<string, string>): Record<string, unknown> {
  const raw = dump['ea.save.v1'];
  expect(raw, 'nothing was written to the save slot').toBeDefined();
  return (JSON.parse(raw!) as { state: { settings: Record<string, unknown> } }).state.settings;
}

/** `pagehide` нь debounce-ыг синхроноор гүйцээнэ (lld.md §7.5). */
const persistNow = (): void => void window.dispatchEvent(new Event('pagehide'));

beforeEach(() => {
  (globalThis as Record<string, unknown>).AudioContext = StubContext;
  started.length = 0;
});

describe('VIS-3 — the colour-blind safe palette is a setting (T-33)', () => {
  it('offers a labelled toggle', () => {
    mount();
    go('#/settings');
    const box = $<HTMLInputElement>('#set-colorblind')!;
    expect(box).not.toBeNull();
    expect(box.labels?.length).toBeGreaterThan(0);
    expect(box.checked).toBe(false);
  });

  it('switches the palette without touching the layout or the text', () => {
    mount();
    go('#/settings');
    const before = document.getElementById('main')!.textContent;
    const box = $<HTMLInputElement>('#set-colorblind')!;
    box.click();
    box.dispatchEvent(new Event('change'));

    expect(document.documentElement.dataset.cb).toBe('1');
    expect(document.getElementById('main')!.textContent).toBe(before);
  });

  it('keeps the choice across a reload', () => {
    const { storage } = mount();
    go('#/settings');
    const box = $<HTMLInputElement>('#set-colorblind')!;
    box.click();
    box.dispatchEvent(new Event('change'));
    persistNow();
    expect(savedSettings(storage.dump()).colorBlindSafe).toBe(true);

    mount(storage.dump());
    go('#/settings');
    expect($<HTMLInputElement>('#set-colorblind')!.checked).toBe(true);
  });
});

describe('FX-3 — sound volume is a slider, and zero means silent (T-33)', () => {
  it('offers a labelled 0..1 control', () => {
    mount();
    go('#/settings');
    const slider = $<HTMLInputElement>('#set-sound-volume')!;
    expect(slider).not.toBeNull();
    expect(slider.type).toBe('range');
    expect(slider.labels?.length).toBeGreaterThan(0);
    expect(slider.value).toBe('100');
  });

  it('stores the volume as a 0..1 number in the save', () => {
    const { storage } = mount();
    go('#/settings');
    const slider = $<HTMLInputElement>('#set-sound-volume')!;
    slider.value = '40';
    slider.dispatchEvent(new Event('change'));
    persistNow();
    expect(savedSettings(storage.dump()).soundVolume).toBeCloseTo(0.4);
  });

  it('creates no oscillator at all once the volume is zero', () => {
    mount();
    go('#/settings');
    const slider = $<HTMLInputElement>('#set-sound-volume')!;
    slider.value = '0';
    slider.dispatchEvent(new Event('change'));
    started.length = 0;

    go('#/camp');
    // Дурын домэйн event — mission roll нь бүртгэлд байхгүй тул claim ашиглана.
    go('#/quests');
    const trigger = $$<HTMLButtonElement>('.quest-card button').find((b) => !b.disabled)!;
    trigger.click();
    for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
      box.click();
      box.dispatchEvent(new Event('change'));
    }
    $$<HTMLButtonElement>('.modal button').find((b) => b.textContent === 'Claim victory')!.click();

    expect(started).toEqual([]);
    // ⚠ Дуу унтарсан ч мэдээлэл алдагдахгүй — текст мэдэгдэл гарсаар байна (FX-6).
    expect($('#announcer')!.textContent!.length).toBeGreaterThan(0);
  });

  it('still plays a cue at full volume — the guard is the setting, not a broken path', () => {
    mount();
    go('#/quests');
    const trigger = $$<HTMLButtonElement>('.quest-card button').find((b) => !b.disabled)!;
    trigger.click();
    for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
      box.click();
      box.dispatchEvent(new Event('change'));
    }
    $$<HTMLButtonElement>('.modal button').find((b) => b.textContent === 'Claim victory')!.click();
    expect(started.length).toBeGreaterThan(0);
  });
});
