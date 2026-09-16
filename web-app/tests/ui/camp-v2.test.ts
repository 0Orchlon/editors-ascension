/**
 * Camp v2 — mastery мини bar ба guild rank (T-29; AC VIS-6, MST-6).
 *
 * ⚠ VIS-6 — БҮГД НЭГ дэлгэцэнд: rank/XP · stamina · streak · өдрийн даалгавар ·
 * дараагийн төслийн үйлдэл + 7 track + guild rank. Хоёр дахь дэлгэц рүү явуулах нь
 * «нэг харцаар харах» шаардлагыг үгүйсгэнэ.
 * ⚠ VIS-4 — түвшин, зэрэглэл нь ТЕКСТЭЭР давхарлагдана, өнгө дангаараа биш.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { $, $$, go, mount } from './helpers.ts';

beforeEach(() => {
  mount();
  go('#/camp');
});

describe('MST-6 — the seven mastery tracks are visible at camp (T-29)', () => {
  it('lists one mini bar per track', () => {
    const rows = $$('[data-testid="camp-mastery"] .mastery-row');
    expect(rows).toHaveLength(7);
  });

  it('names every track and states its level as text (VIS-4)', () => {
    for (const row of $$('[data-testid="camp-mastery"] .mastery-row')) {
      expect(row.querySelector('.mastery-tag')!.textContent!.length).toBeGreaterThan(2);
      expect(row.querySelector('.mastery-lv')!.textContent).toMatch(/Lv \d+/);
    }
  });

  it('exposes each bar to assistive technology with its own label', () => {
    for (const bar of $$('[data-testid="camp-mastery"] [role="progressbar"]')) {
      expect(bar.getAttribute('aria-valuetext')).toMatch(/XP/);
      expect(bar.getAttribute('aria-label')!.length).toBeGreaterThan(3);
    }
  });

  it('shows a prestige star only once a track has prestiged', () => {
    // Шинэ тоглогчид prestige байхгүй — тэмдэг ч гарахгүй (хоосон од бол шуугиан).
    expect($$('[data-testid="camp-mastery"] .mastery-prestige')).toEqual([]);
  });
});

describe('RET-5 — guild standing is readable at camp (T-29)', () => {
  it('lists every guild with its rank in words', () => {
    const rows = $$('[data-testid="camp-guilds"] .guild-row');
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.textContent).toMatch(/Rank \d of 4/);
  });

  it('states the reputation total as a number, not only as a bar', () => {
    for (const row of $$('[data-testid="camp-guilds"] .guild-row'))
      expect(row.textContent).toMatch(/\d+ rep/);
  });

  it('marks placeholder guild names so they are not mistaken for final content', () => {
    expect($('[data-testid="camp-guilds"]')!.textContent).toMatch(/placeholder/i);
  });
});

describe('VIS-6 — camp still holds the PERSONAL-1 blocks (UI-2)', () => {
  for (const id of ['camp-identity', 'camp-stamina', 'camp-daily', 'camp-streak', 'camp-project']) {
    it(`keeps ${id} on the same screen`, () => {
      expect($(`[data-testid="${id}"]`)).not.toBeNull();
    });
  }

  it('reaches the trophy room from camp without leaving the flow', () => {
    const link = $$<HTMLAnchorElement>('a').find((a) => a.getAttribute('href') === '#/trophies');
    expect(link).toBeDefined();
  });
});
