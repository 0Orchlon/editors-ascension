/**
 * Boss UI v2 — hard mode, хувийн дээд амжилт, rematch (T-32; AC BSX-2…BSX-5, VIS-4).
 *
 * ⚠ BSX-2 — хүндрэл нь ОРОЛДЛОГО тутамд сонгогдоно, тоглогчид биш. Босго нь
 * оролдохоос ӨМНӨ харагдана: нуугдсан босго нь оноог тайлбаргүй болгоно.
 * ⚠ BSX-4 — rematch-д cooldown БАЙХГҮЙ. Хүлээлгэх нь дасгалыг шийтгэнэ.
 */
import { describe, expect, it } from 'vitest';
import { newGame } from '@shared/save/serialize.ts';
import { buildPack } from '@shared/content/index.ts';
import type { GameState } from '@shared/types/index.ts';
import { createGameService } from '../../src/services/gameService.ts';
import { renderForge } from '../../src/ui/screens/forge.ts';
import { buildShell } from '../../src/ui/shell.ts';

const pack = buildPack();
const BOSS_ID = 'boss-rough-cut-trial';

function mountForge(patch: Partial<GameState> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  buildShell(document.getElementById('app')!);
  const boss = pack.quests.find((q) => q.id === BOSS_ID)!;
  const game = createGameService({
    pack,
    initial: {
      ...newGame(),
      level: 10,
      xp: 7500,
      stamina: 10,
      completedMainQuestIds: [...boss.prerequisites],
      ...patch,
    },
  });
  const rerender = (): void => {
    document.getElementById('main')!.replaceChildren(renderForge(game, rerender));
  };
  rerender();
  return { game };
}

const $ = <T extends Element = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string): T[] => [...document.querySelectorAll<T>(sel)];
const row = (): HTMLElement => $(`.boss-row[data-boss-id="${BOSS_ID}"]`)!;
const modalButton = (label: string): HTMLButtonElement =>
  $$<HTMLButtonElement>('.modal button').find((b) => b.textContent?.trim() === label)!;

/** Модал дотор бүх ангилалд `score` оноо тавина. */
function scoreAll(score: number): void {
  for (const slider of $$<HTMLInputElement>('.modal input[type="range"]')) {
    slider.value = String(score);
    slider.dispatchEvent(new Event('input'));
  }
}

function openAttempt(difficulty: 'standard' | 'hard'): void {
  $$<HTMLButtonElement>(`.boss-row[data-boss-id="${BOSS_ID}"] button`)
    .find((b) => b.textContent?.includes('attempt') || b.textContent?.includes('Rematch'))!
    .click();
  const select = $<HTMLSelectElement>('.modal select[data-testid="boss-difficulty"]')!;
  select.value = difficulty;
  select.dispatchEvent(new Event('change'));
}

describe('BSX-2 — difficulty is chosen per attempt and its thresholds are visible', () => {
  it('offers both difficulties on every attempt', () => {
    mountForge();
    openAttempt('standard');
    const options = [...$<HTMLSelectElement>('.modal select[data-testid="boss-difficulty"]')!.options];
    expect(options.map((o) => o.value)).toEqual(['standard', 'hard']);
  });

  it('shows the hard thresholds 41 / 52 / 60 before the attempt is logged', () => {
    mountForge();
    openAttempt('hard');
    const text = $('.modal [data-testid="boss-thresholds"]')!.textContent!;
    expect(text).toMatch(/41/);
    expect(text).toMatch(/52/);
    expect(text).toMatch(/60/);
  });

  it('scores the same total against the chosen difficulty', () => {
    mountForge();
    openAttempt('hard');
    scoreAll(8); // 48 — standard бол advanced, hard бол зөвхөн mvp.
    expect($('.modal [data-testid="boss-total"]')!.textContent).toMatch(/mvp/);
  });

  it('separates difficulty with words, never colour alone (VIS-4)', () => {
    mountForge();
    openAttempt('hard');
    scoreAll(10);
    modalButton('Log attempt').click();
    expect(row().textContent).toMatch(/Hard/);
  });
});

describe('BSX-3 — the personal best never drops', () => {
  it('keeps the high score after a worse attempt', () => {
    mountForge();
    openAttempt('standard');
    scoreAll(9); // 54
    modalButton('Log attempt').click();
    const best = row().querySelector('[data-testid="boss-best-standard"]')!.textContent!;
    expect(best).toMatch(/54/);

    openAttempt('standard');
    scoreAll(2); // 12
    modalButton('Log attempt').click();
    expect(row().querySelector('[data-testid="boss-best-standard"]')!.textContent).toMatch(/54/);
  });

  it('tracks standard and hard separately', () => {
    mountForge();
    openAttempt('hard');
    scoreAll(10); // 60
    modalButton('Log attempt').click();
    expect(row().querySelector('[data-testid="boss-best-hard"]')!.textContent).toMatch(/60/);
    expect(row().querySelector('[data-testid="boss-best-standard"]')!.textContent).toMatch(/0/);
  });
});

describe('BSX-4 — rematch has no cooldown', () => {
  it('logs three attempts back to back', () => {
    const { game } = mountForge();
    for (const score of [3, 4, 5]) {
      openAttempt('standard');
      scoreAll(score);
      modalButton('Log attempt').click();
    }
    expect(game.state$.getState().bossAttempts).toHaveLength(3);
    expect(row().textContent).toMatch(/Rematch/);
  });
});

describe('BS-3 — a failed attempt still coaches', () => {
  it('names the weakest category and a side quest to run', () => {
    mountForge();
    openAttempt('standard');
    scoreAll(1);
    modalButton('Log attempt').click();
    expect(document.body.textContent).toMatch(/Weakest category:/);
    expect(document.body.textContent).toMatch(/Recommended side quest:/);
  });
});
