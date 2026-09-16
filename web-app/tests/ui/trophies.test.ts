/**
 * Trophy Room (T-30; AC COS-3, COS-4).
 *
 * ⚠ COS-3 — БҮХ cosmetic харагдана, нээгдээгүй нь ч. Нуух нь тоглогчид «юу
 * хийвэл юу нээгдэх»-ийг далдалж, зорилго тавих боломжийг устгана.
 * ⚠ Нээгдээгүй элемент бүр эх сурвалжаа ТЕКСТЭЭР хэлнэ — өнгө, дүрс дангаараа биш.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { newGame } from '@shared/save/serialize.ts';
import { buildPack } from '@shared/content/index.ts';
import type { GameState } from '@shared/types/index.ts';
import { createGameService } from '../../src/services/gameService.ts';
import { renderTrophies } from '../../src/ui/screens/trophies.ts';
import { buildShell, ROUTES } from '../../src/ui/shell.ts';
import { $, $$, go, mount } from './helpers.ts';

const pack = buildPack();

function mountTrophies(patch: Partial<GameState> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  buildShell(document.getElementById('app')!);
  const game = createGameService({ pack, initial: { ...newGame(), ...patch } });
  const rerender = (): void => {
    document.getElementById('main')!.replaceChildren(renderTrophies(game, rerender));
  };
  rerender();
  return { game };
}

describe('COS-3 — every cosmetic is listed, locked or not (T-30)', () => {
  beforeEach(() => mountTrophies());

  it('lists the whole catalogue, not only what is unlocked', () => {
    expect($$('[data-testid="trophy-item"]').length).toBe(pack.cosmetics.length);
    expect(pack.cosmetics.length).toBeGreaterThanOrEqual(60);
  });

  it('tells a locked item what unlocks it, in words', () => {
    const locked = $$('[data-testid="trophy-item"][data-unlocked="no"]');
    expect(locked.length).toBeGreaterThan(0);
    for (const item of locked) {
      const source = item.querySelector('.trophy-source');
      expect(source, `${item.getAttribute('data-cosmetic-id')} has no unlock text`).not.toBeNull();
      expect(source!.textContent!.length).toBeGreaterThan(10);
    }
  });

  it('states locked and unlocked with words, never colour alone (VIS-4)', () => {
    for (const item of $$('[data-testid="trophy-item"]'))
      expect(item.textContent).toMatch(/Unlocked|Locked/);
  });

  it('groups the catalogue by slot so a player can find a frame', () => {
    expect($$('.trophy-slot-group').length).toBe(6);
  });
});

describe('COS-4 — camp layout is arranged here (T-30)', () => {
  it('offers one labelled control per slot', () => {
    mountTrophies();
    const selects = $$<HTMLSelectElement>('select[data-slot]');
    expect(selects).toHaveLength(6);
    for (const select of selects) expect(select.labels?.length).toBeGreaterThan(0);
  });

  it('never offers a locked cosmetic for equipping', () => {
    mountTrophies();
    const ids = $$<HTMLSelectElement>('select[data-slot]')
      .flatMap((s) => [...s.options].map((o) => o.value))
      .filter((v) => v !== '');
    expect(ids).toEqual([]);
  });

  it('equips an unlocked cosmetic and keeps it in the save state', () => {
    // `mastery` нээлттэй нэг frame — түвшин 5 хүрсэн track.
    const item = pack.cosmetics.find(
      (c) => c.unlockSource.kind === 'mastery' && c.slot === 'avatarFrame',
    )!;
    const tag = item.unlockSource.refId as 'video-editing';
    const base = newGame();
    const { game } = mountTrophies({
      mastery: { ...base.mastery, [tag]: { tag, xp: 1750, level: 6, prestigeCount: 0 } },
    });

    const select = $<HTMLSelectElement>(`select[data-slot="${item.slot}"]`)!;
    expect([...select.options].map((o) => o.value)).toContain(item.id);

    select.value = item.id;
    select.dispatchEvent(new Event('change'));
    expect(game.state$.getState().campLayout.slots[item.slot]).toBe(item.id);
  });
});

describe('the trophy room is a real route (T-30)', () => {
  it('is the ninth screen in the shell navigation', () => {
    expect(ROUTES).toHaveLength(9);
    expect(ROUTES.some((r) => r.hash === '#/trophies')).toBe(true);
  });

  it('is reachable from the keyboard through the nav', () => {
    mount();
    const link = $$<HTMLAnchorElement>('#nav a').find((a) => a.getAttribute('href') === '#/trophies');
    expect(link).toBeDefined();
    go('#/trophies');
    expect($('#screen-title')!.textContent).toMatch(/Trophy Room/i);
  });
});
