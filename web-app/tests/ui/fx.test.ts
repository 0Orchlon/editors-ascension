/**
 * Juice давхарга — `fx.ts`-ийн ГАНЦ хаалга (T-28; AC FX-1…FX-7).
 *
 * ⚠ Бүртгэл нь `FX-1`-ийн бүрэн байдлын ЭХ: мөр хасахад энэ файл УНАНА.
 * ⚠ Анимац нь мэдээллийн цорын ганц хэлбэр БИШ — `announce` нь `reducedMotion`,
 * `soundEnabled`-ээс ҮЛ ХАМААРНА (FX-6).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DomainEvent } from '@shared/types/index.ts';
import { FX_REGISTRY, MAX_CONCURRENT_FX, play } from '../../src/ui/fx.ts';
import { $, mount } from './helpers.ts';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

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
}

const event = (type: string, data: Record<string, unknown> = {}): DomainEvent =>
  ({ type, data } as DomainEvent);

const LOUD = { reducedMotion: false, soundEnabled: true, soundVolume: 0.6 };

beforeEach(() => {
  (globalThis as Record<string, unknown>).AudioContext = StubContext;
  started.length = 0;
  mount();
});

/** lld.md §9.3.1 — ЯГ эдгээр 12. */
const EXPECTED = [
  'LEVEL_UP', 'QUEST_COMPLETED', 'SIDE_QUEST_COMPLETED', 'DUNGEON_PASSED', 'DUNGEON_FAILED',
  'ACHIEVEMENT_UNLOCKED', 'LOOT_DROPPED', 'BOSS_ATTEMPT_LOGGED', 'STREAK_EXTENDED',
  'MASTERY_LEVEL_UP', 'REPUTATION_GAINED', 'CHAIN_COMPLETED',
];

describe('FX-1 — the registry is complete (T-28)', () => {
  it('registers exactly the twelve designed events', () => {
    expect(Object.keys(FX_REGISTRY).sort()).toEqual([...EXPECTED].sort());
  });

  it('gives every row an animation class, a frequency and announcement text', () => {
    for (const [type, row] of Object.entries(FX_REGISTRY)) {
      expect(row.cls, type).toMatch(/^fx-/);
      expect(row.hz, type).toBeGreaterThan(100);
      expect(typeof row.text, type).toBe('function');
    }
  });

  it('bites when a row is dropped from the registry', () => {
    const shrunk = Object.keys(FX_REGISTRY).filter((k) => k !== 'CHAIN_COMPLETED');
    expect(shrunk.sort()).not.toEqual([...EXPECTED].sort());
  });
});

describe('FX-6 — every event speaks, animation is never the only channel', () => {
  for (const type of EXPECTED) {
    it(`announces ${type}`, () => {
      const result = play([event(type, {
        level: 3, rank: 'Cadet', title: 'Rough Cut', completions: 2, correct: 4, total: 5,
        nextStep: 'Re-read the notes', rarity: 'rare', tier: 'mvp', difficulty: 'hard',
        current: 4, tag: 'blender', guildId: 'guild-form', chainId: 'chain-first-week',
        bonusXp: 40, message: 'Attempt logged.',
      })], () => LOUD);
      expect(result.announced).toHaveLength(1);
      expect(result.announced[0]!.length).toBeGreaterThan(0);
      expect($('#announcer')!.textContent).toBe(result.announced[0]);
    });
  }

  it('still announces when both motion and sound are off (FX-2, FX-3)', () => {
    const result = play([event('LEVEL_UP', { level: 2, rank: 'Apprentice' })], () => ({
      reducedMotion: true, soundEnabled: false, soundVolume: 0,
    }));
    expect(result.announced).toHaveLength(1);
    expect(result.animated).toBe(0);
    expect(started).toHaveLength(0);
  });

  it('ignores an event that has no registry row', () => {
    const result = play([event('COINS_GAINED', { coins: 5 })], () => LOUD);
    expect(result.announced).toEqual([]);
  });
});

describe('FX-2 — reduced motion turns animation fully off', () => {
  it('adds no animation class when the setting is on', () => {
    play([event('LEVEL_UP', { level: 2, rank: 'Apprentice' })], () => ({ ...LOUD, reducedMotion: true }));
    expect($('#main')!.className).not.toMatch(/fx-/);
  });

  it('adds the class when motion is allowed', () => {
    play([event('LEVEL_UP', { level: 2, rank: 'Apprentice' })], () => LOUD);
    expect($('#main')!.className).toContain('fx-levelup');
  });
});

describe('FX-3 — one gate for sound', () => {
  it('creates no oscillator when sound is disabled', () => {
    play([event('LEVEL_UP', {})], () => ({ ...LOUD, soundEnabled: false }));
    expect(started).toHaveLength(0);
  });

  it('creates no oscillator at volume zero', () => {
    play([event('LEVEL_UP', {})], () => ({ ...LOUD, soundVolume: 0 }));
    expect(started).toHaveLength(0);
  });

  it('plays the registry frequency when sound is on', () => {
    play([event('MASTERY_LEVEL_UP', { tag: 'blender', level: 3 })], () => LOUD);
    expect(started).toEqual([FX_REGISTRY.MASTERY_LEVEL_UP!.hz]);
  });
});

describe('FX-7 — concurrent animations are capped, text is not', () => {
  it('runs at most three animations for eight simultaneous events', () => {
    const events = EXPECTED.slice(0, 8).map((t) => event(t, { level: 2, rank: 'Cadet', title: 'X' }));
    const result = play(events, () => LOUD);
    expect(result.animated).toBe(MAX_CONCURRENT_FX);
    expect(result.announced).toHaveLength(8);
  });

  it('announces all eight messages in the live region', () => {
    const events = EXPECTED.slice(0, 8).map((t) => event(t, { level: 2, rank: 'Cadet', title: 'X' }));
    const result = play(events, () => LOUD);
    for (const message of result.announced) expect($('#announcer')!.textContent).toContain(message);
  });
});

describe('FX-4 · FX-5 — the stylesheet keeps animation cheap and short (T-28)', () => {
  const css = readFileSync(join(webRoot, 'src', 'styles.css'), 'utf8');

  it('animates only transform and opacity inside every keyframe block', () => {
    const offenders: string[] = [];
    for (const match of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\n\})/g)) {
      const body = match[2]!;
      for (const decl of body.matchAll(/([a-z-]+)\s*:/g)) {
        const property = decl[1]!;
        if (property !== 'transform' && property !== 'opacity') offenders.push(`${match[1]} → ${property}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps every animation shorthand at or below 300ms', () => {
    const durations = [...css.matchAll(/animation:\s*[\w-]+\s+(\d+)ms/g)].map((m) => Number(m[1]));
    expect(durations.length).toBeGreaterThan(0);
    expect(durations.filter((d) => d > 300)).toEqual([]);
  });

  it('declares a class for every registry row', () => {
    for (const row of Object.values(FX_REGISTRY)) expect(css).toContain(`.${row.cls}`);
  });
});

describe('FX-3 — fx.ts is the only place that starts an animation (T-28)', () => {
  const filesUnder = (dir: string): string[] => {
    let out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
      else if (full.endsWith('.ts')) out.push(full);
    }
    return out;
  };

  it('finds fx- class names in no other ui module', () => {
    const offenders = filesUnder(join(webRoot, 'src', 'ui'))
      .filter((f) => !f.endsWith('fx.ts'))
      .filter((f) => /['"`]fx-/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(webRoot, ''));
    expect(offenders).toEqual([]);
  });

  it('scans a non-empty set and fx.ts itself does carry the names', () => {
    expect(filesUnder(join(webRoot, 'src', 'ui')).length).toBeGreaterThan(3);
    expect(readFileSync(join(webRoot, 'src', 'ui', 'fx.ts'), 'utf8')).toMatch(/['"]fx-/);
  });
});
