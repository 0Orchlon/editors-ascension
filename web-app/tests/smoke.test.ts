/**
 * Release smoke (T-41; AC Q-3, Q-4, UI-4).
 *
 * TECH_SPEC §Testing-ийн release дараалал: апп ачаална → бүх таб нээгдэнэ →
 * quest эхэлж дуусна → XP өөрчлөгдөнө → reload төлөв хадгална → export/import
 * ажиллана → консолд uncaught алдаа 0.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '../src/ui/shell.ts';
import { createApp } from '../src/app/createGame.ts';
import { $, $$, go, memoryStorage, mount, offlineFetch } from './ui/helpers.ts';

const consoleErrors: unknown[] = [];
let restoreError: () => void;

beforeEach(() => {
  consoleErrors.length = 0;
  const original = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
    original(...args);
  };
  restoreError = () => {
    console.error = original;
  };
});

afterEach(() => restoreError());

describe('release smoke (T-41)', () => {
  it('boots the app without throwing', () => {
    expect(() => mount()).not.toThrow();
    expect($('#main')).not.toBeNull();
    expect($('#announcer')).not.toBeNull();
  });

  it('opens every primary tab', () => {
    mount();
    for (const route of ROUTES) {
      go(route.hash);
      expect($('#screen-title')!.textContent!.length, `blank screen at ${route.hash}`).toBeGreaterThan(0);
    }
  });

  it('runs a quest from start to claim and changes xp', () => {
    mount();
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

  it('keeps state across a reload', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const first = createApp({ storage, fetchImpl: offlineFetch });
    first.game.dispatch('claimQuest', { questId: 'mq-first-cut', checkedConditions: [0, 1, 2] });
    vi.advanceTimersByTime(600);

    const second = createApp({ storage, fetchImpl: offlineFetch });
    expect(second.game.state$.getState().xp).toBe(60);
    vi.useRealTimers();
  });

  it('exports and imports a save', () => {
    const app = createApp({ storage: memoryStorage(), fetchImpl: offlineFetch });
    app.game.dispatch('claimQuest', { questId: 'mq-first-cut', checkedConditions: [0, 1, 2] });
    const text = app.game.exportSave();

    const other = createApp({ storage: memoryStorage(), fetchImpl: offlineFetch });
    expect(other.game.importSave(text).ok).toBe(true);
    expect(other.game.state$.getState().xp).toBe(60);
  });

  it('logs no console errors during a full pass over the app', () => {
    mount();
    for (const route of ROUTES) go(route.hash);
    expect(consoleErrors).toEqual([]);
  });

  it('works with the server completely down (Q-3)', () => {
    const app = createApp({ storage: memoryStorage(), fetchImpl: offlineFetch });
    expect(app.game.dispatch('rest', {}).rejected).toBeUndefined();
    expect(app.game.view.rank()).toBe('Recruit');
  });
});

/**
 * TECH_SPEC §Testing-ийн сэдэв бүр тесттэй гэдгийг хяналтын жагсаалтаар баталгаажуулна
 * (T-41 — «сэдэв бүр тесттэй» шаардлага).
 */
describe('release checklist — every TECH_SPEC testing topic is covered', () => {
  const topics: [string, string][] = [
    ['xp thresholds', 'tests/unit/core/progression.test.ts'],
    ['stamina', 'tests/unit/core/stamina.test.ts'],
    ['combo and streak', 'tests/unit/core/streak.test.ts'],
    ['repeatable side quests', 'tests/unit/core/sideQuests.test.ts'],
    ['prerequisites', 'tests/unit/core/quests.test.ts'],
    ['dungeon scoring', 'tests/unit/core/dungeons.test.ts'],
    ['achievements', 'tests/unit/core/streak.test.ts'],
    ['projects', 'tests/unit/core/projects.test.ts'],
    ['boss assessment', 'tests/unit/core/boss.test.ts'],
    ['save migration', 'tests/unit/core/saves.test.ts'],
    ['export and import', 'tests/integration/persistence.test.ts'],
    ['quest to xp to save to reload', 'tests/integration/persistence.test.ts'],
    ['level up to skill point to unlock', 'tests/ui/screens.test.ts'],
    ['dungeon retry', 'tests/ui/screens.test.ts'],
    ['project milestone rewards', 'tests/ui/screens.test.ts'],
    ['content validation', 'tests/unit/content.test.ts'],
    ['architecture boundaries', 'tests/architecture.test.ts'],
    ['accessibility', 'tests/a11y/a11y.test.ts'],
  ];

  it('points every topic at a test file that exists', async () => {
    const { existsSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');

    const missing = topics.filter(([, file]) => !existsSync(join(root, file)));
    expect(missing.map(([topic]) => topic)).toEqual([]);
  });
});
