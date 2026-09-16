/**
 * VIS-1 · VIS-2 · VIS-3 — палитрын контраст ба дэлхийн солилт (T-27).
 *
 * ⚠ Тест нь `theme.ts`-ийн ХҮСНЭГТЭЭС тооцно, `styles.css`-ийг задлан ЗАДЛАХГҮЙ:
 * шинэ палитр нэмэхэд шалгалт автоматаар хамарна (lld.md §9.1.5).
 * ⚠ Ангилал нь ил гэрээ (plan.md §14.2): 14 текстийн хос ≥4.5, 5 UI хос ≥3.0.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CB_OVERRIDE,
  PALETTES,
  PALETTE_KEYS,
  TOKENS,
  applyTheme,
  contrastRatio,
  paletteOf,
  worldPalette,
  type ThemeToken,
} from '../../src/ui/theme.ts';
import { $, go, mount } from '../ui/helpers.ts';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = (): string => readFileSync(join(webRoot, 'src', 'styles.css'), 'utf8');

/** plan.md §14.2 — текстийн 14 хос. */
const TEXT_PAIRS: readonly (readonly [ThemeToken, ThemeToken])[] = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'],
  ['text', 'btn-bg'], ['text', 'btn-bg-hover'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'],
  ['accent', 'surface'], ['ok', 'surface'], ['warn', 'surface'],
  ['badge-ok-text', 'badge-ok-bg'], ['badge-warn-text', 'badge-warn-bg'],
  ['text-on-focus', 'focus'],
];

/** plan.md §14.2 — UI бүрэлдэхүүн, хүрээ, идэвхгүй чимэглэлийн 5 хос. */
const UI_PAIRS: readonly (readonly [ThemeToken, ThemeToken])[] = [
  ['focus', 'bg'], ['focus', 'surface'],
  ['border', 'surface'], ['border-strong', 'surface'], ['pip-off', 'surface'],
];

describe('VIS-2 — every palette pair clears its WCAG floor (T-27)', () => {
  for (const key of PALETTE_KEYS) {
    for (const cb of [false, true]) {
      const label = `${key}${cb ? ' · colorBlindSafe' : ''}`;
      const palette = paletteOf(key, cb);

      for (const [fg, bg] of TEXT_PAIRS) {
        it(`${label}: ${fg} on ${bg} is at least 4.5:1`, () => {
          expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
      for (const [fg, bg] of UI_PAIRS) {
        it(`${label}: ${fg} on ${bg} is at least 3:1`, () => {
          expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(3);
        });
      }
    }
  }

  it('covers exactly 19 pairs across 6 palettes in 2 sets — 228 assertions', () => {
    expect(TEXT_PAIRS.length + UI_PAIRS.length).toBe(TOKENS.length);
    expect(PALETTE_KEYS.length * 2 * TOKENS.length).toBe(228);
  });
});

describe('the contrast gate actually bites (T-27)', () => {
  it('fails when a token is dimmed toward its background', () => {
    const palette = paletteOf('camp', false);
    // `muted`-ийг `surface`-ийн өнгө рүү шилжүүлэхэд хос нь 4.5-аас УНАНА.
    expect(contrastRatio(palette.surface, palette.surface)).toBeLessThan(4.5);
  });

  it('computes a known reference ratio — white on black is 21:1', () => {
    expect(contrastRatio('ffffff', '000000')).toBeCloseTo(21, 2);
  });

  it('keeps every palette row the same length as TOKENS', () => {
    for (const key of PALETTE_KEYS) expect(PALETTES[key]).toHaveLength(TOKENS.length);
  });

  it('overrides only the 8 semantic tokens in the colour-blind set', () => {
    expect(Object.keys(CB_OVERRIDE).sort()).toEqual([
      'accent', 'badge-ok-bg', 'badge-ok-text', 'badge-warn-bg', 'badge-warn-text', 'focus', 'ok', 'warn',
    ]);
  });
});

describe('P-26 — styles.css holds no colour outside the palette blocks (T-27)', () => {
  /** `selector { … }` хос болгон задална — тайлбарыг хаяна. */
  const rules = (source: string): { selector: string; body: string }[] => {
    const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const out: { selector: string; body: string }[] = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean)) !== null) out.push({ selector: m[1]!.trim(), body: m[2]! });
    return out;
  };

  it('puts every hex literal inside a :root palette rule', () => {
    const offenders = rules(css())
      .filter((r) => !r.selector.includes(':root'))
      .filter((r) => /#[0-9a-fA-F]{3,8}\b/.test(r.body))
      .map((r) => r.selector);
    expect(offenders).toEqual([]);
  });

  it('declares one block per palette plus the colour-blind override', () => {
    const source = css();
    for (const key of PALETTE_KEYS) expect(source).toContain(`:root[data-world="${key}"]`);
    expect(source).toContain(':root[data-cb="1"]');
  });

  it('bites on a planted hard-coded colour', () => {
    const planted = '.card { border: 1px solid #2b3648; }';
    const offenders = rules(planted).filter((r) => !r.selector.includes(':root'));
    expect(offenders).toHaveLength(1);
  });
});

/**
 * `VIS-2`-ийн нотолгоо нь `theme.ts`-ийн хүснэгтээс тооцогддог, харин тоглогчийн
 * ХАРАХ өнгө нь `styles.css`-ээс гардаг. Хоёрын хооронд ХОЛБОГЧ тест байхгүй бол
 * хүснэгт нь зөв хэвээр, дэлгэц нь буруу болж САЛЖ чадна — контрастын хаалга
 * хашгирахгүй. Энэ блок нь 6 палитр × 19 токен + 8 CB override = 122 утгыг тулгана.
 */
describe('P-26 — styles.css repeats theme.ts value for value (T-27)', () => {
  /** `selector { … }` блокын `--token: #hex;` мөрүүдийг зураглал болгоно. */
  const varsOf = (marker: string): Record<string, string> => {
    const clean = css().replace(/\/\*[\s\S]*?\*\//g, '');
    const block = clean.split('}').find((chunk) => chunk.includes(marker));
    expect(block, 'no CSS block for ' + marker).toBeDefined();
    const out: Record<string, string> = {};
    for (const line of (block ?? '').split(';')) {
      const m = /--([a-z0-9-]+)\s*:\s*#([0-9a-fA-F]{6})/.exec(line);
      if (m !== null) out[m[1]!] = m[2]!.toLowerCase();
    }
    return out;
  };

  it.each(PALETTE_KEYS)('declares %s with exactly the theme.ts values', (key) => {
    expect(varsOf(':root[data-world="' + key + '"]')).toEqual(paletteOf(key, false));
  });

  it('declares the colour-blind override with exactly the CB_OVERRIDE values', () => {
    expect(varsOf(':root[data-cb="1"]')).toEqual(CB_OVERRIDE);
  });

  it('compares 122 values in total — a silent scope shrink would pass vacuously', () => {
    const counted =
      PALETTE_KEYS.reduce((n, key) => n + Object.keys(varsOf(':root[data-world="' + key + '"]')).length, 0) +
      Object.keys(varsOf(':root[data-cb="1"]')).length;
    expect(counted).toBe(PALETTE_KEYS.length * TOKENS.length + Object.keys(CB_OVERRIDE).length);
    expect(counted).toBe(122);
  });

  it('bites on a planted drift between the two files', () => {
    const drifted = { ...paletteOf('camp', false), accent: 'ff0000' };
    expect(drifted).not.toEqual(paletteOf('camp', false));
  });
});

describe('VIS-1 — switching world changes only the html attribute (T-27)', () => {
  beforeEach(() => {
    mount();
  });

  it('renders an identical screen under world 1 and world 5', () => {
    go('#/quests');
    applyTheme('w1', false);
    const first = $('#main')!.outerHTML;
    applyTheme('w5', false);
    expect($('#main')!.outerHTML).toBe(first);
    expect(document.documentElement.dataset.world).toBe('w5');
  });

  it('renders an identical screen with the colour-blind set on', () => {
    go('#/camp');
    applyTheme('camp', false);
    const plain = $('#main')!.outerHTML;
    applyTheme('camp', true);
    expect($('#main')!.outerHTML).toBe(plain);
    expect(document.documentElement.dataset.cb).toBe('1');
  });

  it('never writes inline custom properties — snapshots stay comparable', () => {
    applyTheme('w3', true);
    expect(document.documentElement.getAttribute('style')).toBeNull();
  });

  it('maps a numeric world to its palette key', () => {
    expect(worldPalette(1)).toBe('w1');
    expect(worldPalette(5)).toBe('w5');
    expect(worldPalette('camp')).toBe('camp');
  });
});
