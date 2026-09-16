/**
 * A11y сүүлчийн шалгалт — PERSONAL-2-ийн ШИНЭ элемент бүр (T-34; AC VIS-4, VIS-5, VIS-7, VIS-8).
 *
 * ⚠ Шинэ визуал төлөв (rarity · mastery tier · difficulty · guild rank) нь ӨНГӨӨР
 * дангаараа дамжихгүй. Өнгө нь давхарга — хэзээ ч цорын ганц суваг биш.
 * ⚠ Шинэ интерактив элемент бүр `<button>`/`<a>`/`<input>`/`<select>`: `div` +
 * onclick нь гарны хэрэглэгчийг ГАДУУР үлдээнэ, дэлгэц уншигчид ч дуугүй байна.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import axe from 'axe-core';
import { ROUTES } from '../../src/ui/shell.ts';
import { $, $$, go, mount } from '../ui/helpers.ts';

const here = dirname(fileURLToPath(import.meta.url));
const uiDir = join(here, '..', '..', 'src', 'ui');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : full.endsWith('.ts') ? [full] : [];
  });
}

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

beforeEach(() => {
  mount();
});

describe('VIS-7 — every interactive element is a real control (T-34)', () => {
  for (const route of ROUTES) {
    it(`uses only native controls on ${route.label}`, () => {
      go(route.hash);
      expect($$('[onclick]')).toEqual([]);
      // Гарнаас хүрэхгүй болгосон интерактив элемент — чимээгүй хаалт.
      for (const control of $$('button, a[href], input, select, textarea'))
        expect(control.getAttribute('tabindex'), `${route.hash} ${control.tagName}`).not.toBe('-1');
    });
  }

  /**
   * ⚠ Сканнер нь ЭХ КОДЫГ хардаг: дэлгэц дээр «одоо байхгүй» зам маргааш нэмэгдэж
   * болно. Товчийг `components.button` л үүсгэдэг тул click сонсогч тэндээс ГАДНА
   * гарвал `div` + onclick-ийн зам нээгдсэн гэсэн үг.
   */
  it('keeps click handling inside the shared control helpers', () => {
    const offenders = filesUnder(uiDir)
      .filter((file) => !file.endsWith('components.ts'))
      .filter((file) => stripComments(readFileSync(file, 'utf8')).includes("addEventListener('click'"))
      .map((file) => relative(uiDir, file).replace(/\\/g, '/'));
    expect(offenders).toEqual([]);
  });

  it('flags a planted div + onclick', () => {
    document.getElementById('main')!.innerHTML = '<div onclick="go()">fake button</div>';
    expect($$('[onclick]').length).toBe(1);
  });
});

describe('VIS-4 — the new states are readable without colour (T-34)', () => {
  it('states the trophy lock state and its source in words', () => {
    go('#/trophies');
    const card = $('[data-testid="trophy-item"]')!;
    expect(card.textContent).toMatch(/Locked|Unlocked/);
    expect(card.querySelector('.trophy-source')!.textContent).toMatch(/\w{4,}/);
    // Rarity нь өнгөт хүрээ БИШ, текст.
    expect(card.textContent).toMatch(/common|uncommon|rare|epic|legendary/i);
  });

  it('states every mastery level as text on camp and in the skill tree', () => {
    go('#/camp');
    for (const row of $$('[data-testid="camp-mastery"] .mastery-row'))
      expect(row.querySelector('.mastery-lv')!.textContent).toMatch(/Lv \d+/);

    go('#/skills');
    expect($('[data-testid="mastery-detail"]')!.textContent).toMatch(/Level \d+/);
  });

  it('names the boss difficulty and its thresholds in words', () => {
    go('#/forge');
    const row = $('.boss-row')!;
    expect(row.textContent).toMatch(/Standard/);
    expect(row.textContent).toMatch(/Hard/);
    expect(row.textContent).toMatch(/personal best \d+ \/ 60/);
  });

  it('states the guild rank as a number out of four, not a colour band', () => {
    go('#/camp');
    for (const row of $$('[data-testid="camp-guilds"] .guild-row'))
      expect(row.textContent).toMatch(/Rank \d of 4/);
  });

  it('names the currency a skill node is paid in', () => {
    go('#/skills');
    expect($('.skill-card')!.textContent).toMatch(/skill point|mastery point/);
  });
});

describe('VIS-8 — axe finds nothing blocking on the new screens (T-34)', () => {
  for (const hash of ['#/trophies', '#/skills', '#/forge', '#/settings']) {
    it(`reports no critical or serious violation on ${hash}`, async () => {
      go(hash);
      const results = await axe.run(document.body, {
        // jsdom нь бодит өнгө/байрлал тооцдоггүй — контраст нь `contrast.test.ts`-д
        // хүснэгтээс ТООЦОГДОЖ шалгагдана, энд давхардуулахгүй.
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      });
      const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      // ⚠ Trophy Room-д 60+ карт байгаа тул axe-ийн гүйлт удаан — анхдагч 5с
      // хугацаа нь ачаалалтай машин дээр ЧИМЭЭГҮЙ уналт өгдөг (шалгалт биш, таймер).
    }, 30_000);
  }

  it('labels every new form control', () => {
    for (const hash of ['#/trophies', '#/settings', '#/skills']) {
      go(hash);
      for (const control of $$<HTMLInputElement | HTMLSelectElement>('input, select, textarea')) {
        const labelled =
          control.labels?.length ||
          control.getAttribute('aria-label') ||
          control.getAttribute('aria-labelledby');
        expect(labelled, `${hash}: unlabelled ${control.id || control.tagName}`).toBeTruthy();
      }
    }
  });
});

describe('VIS-5 — no horizontal overflow at 360 / 768 / 1280 (T-34)', () => {
  /**
   * ⚠ jsdom нь layout тооцохгүй тул `scrollWidth` нь ҮРГЭЛЖ 0 — тэр шалгалт дангаараа
   * ХООСОН дамжина. Тиймээс хоёр давхар: (а) DOM-д хэвтээ гүйлгэлт үүсгэх ИНЛАЙН
   * хэмжээ байхгүй, (б) `styles.css`-д шалтгаан нь хаалттай (`a11y.test.ts`).
   */
  for (const width of [360, 768, 1280]) {
    it(`keeps every screen free of inline fixed widths at ${width}px`, () => {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
      for (const route of ROUTES) {
        go(route.hash);
        for (const node of $$<HTMLElement>('#main *')) {
          const inline = node.getAttribute('style') ?? '';
          const fixed = /(?<!max-|min-)width:\s*(\d+)px/.exec(inline);
          if (fixed !== null)
            expect(Number(fixed[1]), `${route.hash} ${node.className}`).toBeLessThanOrEqual(width);
        }
        expect(document.body.scrollWidth).toBeLessThanOrEqual(
          Math.max(document.body.clientWidth, width),
        );
      }
    });
  }
});
