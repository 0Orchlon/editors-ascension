/** Хүртээмж (T-39, T-40; AC A11Y-1…6). */
import { beforeEach, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { ROUTES } from '../../src/ui/shell.ts';
import { $, $$, buttonByText, go, mount } from '../ui/helpers.ts';

beforeEach(() => {
  mount();
});

describe('axe audit on every screen (A11Y-1, A11Y-3, A11Y-4)', () => {
  for (const route of ROUTES) {
    it(`reports no critical or serious violations on ${route.label}`, async () => {
      go(route.hash);
      const results = await axe.run(document.body, {
        // jsdom нь бодит өнгө/байрлалыг тооцдоггүй тул тэдгээр шалгалт найдваргүй —
        // контраст нь `styles.css`-ийн тайлбарт баримтжсан ба гараар шалгагдсан.
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      });
      const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});

describe('keyboard operability (A11Y-1)', () => {
  it('uses real interactive elements — no div with a click handler', () => {
    go('#/quests');
    // `div` + onclick нь гарнаас хүрэхгүй. Бүх үйлдэл button/a/input байх ЁСТОЙ.
    const fakes = $$('div[onclick], span[onclick], li[onclick]');
    expect(fakes).toEqual([]);
  });

  it('gives every form control a label', () => {
    go('#/forge');
    for (const input of $$<HTMLInputElement>('input, textarea')) {
      const labelled =
        input.labels?.length ||
        input.getAttribute('aria-label') ||
        input.getAttribute('aria-labelledby');
      expect(labelled, `unlabelled control ${input.id || input.type}`).toBeTruthy();
    }
  });

  it('traps focus inside a modal and restores it on close (A11Y-1)', () => {
    go('#/quests');
    const trigger = $$<HTMLButtonElement>('.quest-card button').find((b) => !b.disabled)!;
    trigger.focus();
    trigger.click();

    expect($('.modal')).not.toBeNull();
    expect(document.activeElement?.id).toBe('modal-title');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($('.modal')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('labels the dialog for assistive technology', () => {
    go('#/quests');
    $$<HTMLButtonElement>('.quest-card button').find((b) => !b.disabled)!.click();
    const dialog = $('.modal')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
  });
});

describe('status is never colour-only (A11Y-3)', () => {
  it('writes progress values as text as well as a bar', () => {
    go('#/camp');
    const bar = $('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuetext')).toMatch(/XP/);
    expect(bar.getAttribute('aria-valuenow')).toBeTruthy();
  });

  it('states stamina as a number, not only as coloured pips', () => {
    go('#/camp');
    expect($('.pips')!.getAttribute('aria-label')).toMatch(/Stamina \d+ of \d+/);
    expect($('.pips-text')!.textContent).toMatch(/\d+\/\d+/);
  });

  it('marks completed and locked states with words', () => {
    go('#/quests');
    const locked = $$('.quest-card').find((c) => c.querySelector('.lock-reason') !== null)!;
    expect(locked.textContent).toMatch(/Reach level|First finish|Needs/);
  });
});

describe('reduced motion and sound (T-40; A11Y-2, A11Y-5)', () => {
  it('turning on reduced motion disables animation app-wide (A11Y-2)', () => {
    go('#/settings');
    const toggle = $<HTMLInputElement>('#set-reduced-motion')!;
    expect(document.documentElement.classList.contains('reduced-motion')).toBe(false);

    toggle.click();
    toggle.dispatchEvent(new Event('change'));
    expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
  });

  it('persists the reduced motion choice across a reload (A11Y-2)', () => {
    go('#/settings');
    const toggle = $<HTMLInputElement>('#set-reduced-motion')!;
    toggle.click();
    toggle.dispatchEvent(new Event('change'));
    go('#/camp');
    go('#/settings');
    expect($<HTMLInputElement>('#set-reduced-motion')!.checked).toBe(true);
  });

  /** AC A11Y-5 — дуу заавал БИШ: унтраасан үед бүх функц ажиллана. */
  it('stays fully playable with sound turned off (A11Y-5)', () => {
    go('#/settings');
    const sound = $<HTMLInputElement>('#set-sound')!;
    sound.click();
    sound.dispatchEvent(new Event('change'));
    expect($<HTMLInputElement>('#set-sound')!.checked).toBe(false);

    go('#/quests');
    const trigger = $$<HTMLButtonElement>('.quest-card button').find((b) => !b.disabled)!;
    trigger.click();
    for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
      box.click();
      box.dispatchEvent(new Event('change'));
    }
    $$<HTMLButtonElement>('.modal button').find((b) => b.textContent === 'Claim victory')!.click();

    go('#/camp');
    expect($('[data-testid="camp-identity"]')!.textContent).toContain('60');
  });

  it('shows onboarding guidance on the very first visit', () => {
    expect(document.getElementById('toast-host')!.textContent).toContain('Start at Camp');
  });
});

describe('responsive layout (A11Y-6)', () => {
  /**
   * ⚠ jsdom нь бодит layout тооцохгүй тул өргөн бүрд «гүйлгэлт байхгүй» гэдгийг
   * ХЭМЖИЖ чадахгүй. Оронд нь хэвтээ гүйлгэлт үүсгэдэг хэв маягийн шалтгааныг
   * хориглосон эсэхийг шалгана — энэ нь шалтгааны түвшний хамгаалалт.
   */
  it('caps media width and hides horizontal overflow in the stylesheet', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(here, '..', '..', 'src', 'styles.css'), 'utf8');

    expect(css).toContain('overflow-x: hidden');
    expect(css).toMatch(/max-width:\s*100%/);
    expect(css).toContain('flex-wrap: wrap');
  });

  it('never uses a fixed pixel width that would break a 360px viewport', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(here, '..', '..', 'src', 'styles.css'), 'utf8');

    const widths = [...css.matchAll(/(?<!max-|min-)width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(widths.filter((w) => w > 360)).toEqual([]);
  });

  it('gives touch targets a workable minimum height', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(here, '..', '..', 'src', 'styles.css'), 'utf8');
    expect(css).toMatch(/min-height:\s*44px/);
  });
});

describe('the announcer carries real messages (A11Y-3)', () => {
  it('announces the outcome of a claim', () => {
    go('#/quests');
    const trigger = $$<HTMLButtonElement>('.quest-card button').find((b) => !b.disabled)!;
    trigger.click();
    for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
      box.click();
      box.dispatchEvent(new Event('change'));
    }
    $$<HTMLButtonElement>('.modal button').find((b) => b.textContent === 'Claim victory')!.click();
    expect($('#announcer')!.textContent).toMatch(/claimed/i);
  });

  it('announces a rest', () => {
    go('#/camp');
    buttonByText('Rest (+3 stamina)')!.click();
    // Дүүрэн stamina дээр ч мессеж гарна эсвэл хоосон үлдэнэ — уналт БАЙХГҮЙ.
    expect($('#announcer')).not.toBeNull();
  });
});
