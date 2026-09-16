/**
 * Skills дэлгэц v2 (T-31; AC MST-6, SKL-2, SKL-3).
 *
 * ⚠ SKL-2 — capstone түгжээтэй бол АЛЬ нөхцөл дутсаныг НЭРЛЭНЭ. «Locked» гэж
 * ганцаар бичих нь тоглогчийг таах байдалд үлдээнэ.
 * ⚠ SKL-3 — respec-ийн cooldown нь товчийг чимээгүй идэвхгүй болгохгүй: үлдсэн
 * хоногийг ТЕКСТЭЭР хэлнэ.
 */
import { describe, expect, it } from 'vitest';
import { newGame } from '@shared/save/serialize.ts';
import { buildPack } from '@shared/content/index.ts';
import type { GameState } from '@shared/types/index.ts';
import { createGameService } from '../../src/services/gameService.ts';
import { renderSkills } from '../../src/ui/screens/skills.ts';
import { buildShell } from '../../src/ui/shell.ts';

const pack = buildPack();
const NOW = '2026-03-10T09:00:00.000Z';

function mountSkills(patch: Partial<GameState> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  buildShell(document.getElementById('app')!);
  const game = createGameService({ pack, initial: { ...newGame(), ...patch }, now: () => NOW });
  const rerender = (): void => {
    document.getElementById('main')!.replaceChildren(renderSkills(game, rerender));
  };
  rerender();
  return { game };
}

const $ = <T extends Element = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string): T[] => [...document.querySelectorAll<T>(sel)];
const mainText = (): string => document.getElementById('main')!.textContent ?? '';

describe('track tabs (T-31; MST-6)', () => {
  it('offers one tab per mastery track', () => {
    mountSkills();
    expect($$('[data-testid="track-tab"]')).toHaveLength(7);
  });

  it('shows only the selected track’s nodes', () => {
    mountSkills();
    const tab = $$<HTMLButtonElement>('[data-testid="track-tab"]').find((b) => b.dataset.track === 'blender')!;
    tab.click();
    const shown = $$('.skill-card').map((c) => c.getAttribute('data-track'));
    expect(shown.length).toBeGreaterThan(0);
    expect([...new Set(shown)]).toEqual(['blender']);
  });

  it('marks the selected tab for assistive technology, not only with colour', () => {
    mountSkills();
    const tabs = $$<HTMLButtonElement>('[data-testid="track-tab"]');
    tabs[2]!.click();
    const selected = $$<HTMLButtonElement>('[data-testid="track-tab"]').filter(
      (b) => b.getAttribute('aria-pressed') === 'true',
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]!.dataset.track).toBe(tabs[2]!.dataset.track);
  });
});

describe('node cost and tier are explicit (T-31; SKL-2)', () => {
  it('names the currency each node is paid in', () => {
    mountSkills();
    const tierOne = $$('.skill-card').find((c) => c.getAttribute('data-tier') === '1')!;
    expect(tierOne.textContent).toMatch(/skill point/);

    const tab = $$<HTMLButtonElement>('[data-testid="track-tab"]')[0]!;
    tab.click();
    const higher = $$('.skill-card').find((c) => c.getAttribute('data-tier') !== '1')!;
    expect(higher.textContent).toMatch(/mastery point/);
  });

  it('shows the mastery point balance, not only skill points', () => {
    mountSkills({ masteryPoints: 3 });
    expect($('[data-testid="skill-points"]')!.textContent).toMatch(/Mastery points available: 3/);
  });
});

describe('capstone gaps are named (T-31; SKL-2)', () => {
  it('lists every missing condition on a locked capstone', () => {
    mountSkills();
    const capstone = $$('.skill-card').find((c) => c.getAttribute('data-tier') === '3')!;
    const gaps = [...capstone.querySelectorAll('.capstone-gap')].map((g) => g.textContent ?? '');
    expect(gaps.length).toBeGreaterThanOrEqual(3);
    expect(gaps.join(' ')).toMatch(/mastery level/);
    expect(gaps.join(' ')).toMatch(/tier-1/);
    expect(gaps.join(' ')).toMatch(/boss/);
  });
});

describe('respec (T-31; SKL-3)', () => {
  const unlockedTrack = pack.skills.find((s) => s.tier === 1)!;

  it('disables respec with a readable reason while the cooldown runs', () => {
    mountSkills({
      unlockedSkillIds: [unlockedTrack.id],
      respecAt: '2026-03-06T09:00:00.000Z',
    });
    const tab = $$<HTMLButtonElement>('[data-testid="track-tab"]').find(
      (b) => b.dataset.track === unlockedTrack.track,
    )!;
    tab.click();
    const respec = $<HTMLButtonElement>('[data-testid="respec-button"]')!;
    expect(respec.disabled).toBe(true);
    expect(mainText()).toMatch(/3 day/);
  });

  it('refunds the tree once the cooldown has passed', () => {
    const { game } = mountSkills({
      unlockedSkillIds: [unlockedTrack.id],
      respecAt: '2026-03-01T09:00:00.000Z',
      skillPoints: 0,
    });
    const tab = $$<HTMLButtonElement>('[data-testid="track-tab"]').find(
      (b) => b.dataset.track === unlockedTrack.track,
    )!;
    tab.click();
    const respec = $<HTMLButtonElement>('[data-testid="respec-button"]')!;
    expect(respec.disabled).toBe(false);
    respec.click();

    const state = game.state$.getState();
    expect(state.unlockedSkillIds).toEqual([]);
    expect(state.skillPoints).toBe(1);
  });
});

describe('mastery detail and prestige (T-31; MST-6)', () => {
  it('shows level, xp and prestige count for the selected track', () => {
    mountSkills();
    const panel = $('[data-testid="mastery-detail"]')!;
    expect(panel.textContent).toMatch(/Level \d/);
    expect(panel.textContent).toMatch(/XP/);
  });

  it('hides the prestige button below level 10', () => {
    const base = newGame();
    mountSkills({
      mastery: { ...base.mastery, 'video-editing': { tag: 'video-editing', xp: 5500, level: 9, prestigeCount: 0 } },
    });
    $$<HTMLButtonElement>('[data-testid="track-tab"]').find((b) => b.dataset.track === 'video-editing')!.click();
    expect($('[data-testid="prestige-button"]')).toBeNull();
  });

  it('offers prestige at level 10 and resets the track when used', () => {
    const base = newGame();
    const { game } = mountSkills({
      mastery: { ...base.mastery, 'video-editing': { tag: 'video-editing', xp: 7500, level: 10, prestigeCount: 0 } },
    });
    $$<HTMLButtonElement>('[data-testid="track-tab"]').find((b) => b.dataset.track === 'video-editing')!.click();
    const prestige = $<HTMLButtonElement>('[data-testid="prestige-button"]')!;
    expect(prestige).not.toBeNull();
    prestige.click();

    const track = game.state$.getState().mastery['video-editing']!;
    expect(track).toMatchObject({ level: 1, xp: 0, prestigeCount: 1 });
  });
});
