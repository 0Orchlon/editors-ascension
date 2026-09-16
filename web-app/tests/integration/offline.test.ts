/**
 * Сервергүй ба сүлжээгүй нөхцөл (T-35; AC OFF-1, OFF-5, OFF-6).
 *
 * ⚠ Энэ файл нь PERSONAL-1-ийн BE-7-г ШИНЭ системүүдээР өргөтгөнө: mastery ·
 * guild rep · trophy room · hard mode · skill tree v2 нь сервергүйгээр БҮРЭН ажиллана.
 * ⚠ «Ажилладаг» гэдэг нь «унадаггүй» биш: төлөв ӨӨРЧЛӨГДӨЖ, ТЕКСТЭЭР харагдаж,
 * локал дараалалд хадгалагдана.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildPack } from '@shared/content/index.ts';
import { exportSave } from '@shared/core/saves.ts';
import { newGame } from '@shared/save/serialize.ts';
import type { GameState } from '@shared/types/index.ts';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { QUEUE_KEY } from '../../src/services/actionQueue.ts';
import { SAVE_KEY } from '../../src/services/persistence.ts';
import { ROUTES } from '../../src/ui/shell.ts';
import { $, $$, go, mount } from '../ui/helpers.ts';

const rejections: unknown[] = [];
const onRejection = (reason: unknown): void => void rejections.push(reason);

/** ⚠ Бүх `fetch` УНАНА — сервер унтарсан ч, сүлжээ тасарсан ч ижил зам. */
const deadNetwork: typeof fetch = () => Promise.reject(new Error('network down'));

beforeEach(() => {
  rejections.length = 0;
  process.on('unhandledRejection', onRejection);
});

afterEach(() => {
  process.off('unhandledRejection', onRejection);
});

const pack = buildPack();

/** Бэлтгэсэн төлвийг ХАДГАЛАЛТААР дамжуулна — апп ердийн ачаалалтын замаараа уншина. */
const seedOf = (patch: Partial<GameState>): Record<string, string> => ({
  [SAVE_KEY]: exportSave({ ...newGame(), ...patch }, '2026-03-10T09:00:00.000Z'),
});

/** Дараалалд орсон үйлдлийн төрлүүд. */
const queued = (dump: Record<string, string>): string[] =>
  JSON.parse(dump[QUEUE_KEY] ?? '[]').map((a: { type: string }) => a.type);

function claimFirstAvailable(): void {
  go('#/quests');
  const trigger = $$<HTMLButtonElement>('.quest-card button').find((b) => !b.disabled)!;
  trigger.click();
  for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
    box.click();
    box.dispatchEvent(new Event('change'));
  }
  $$<HTMLButtonElement>('.modal button').find((b) => b.textContent === 'Claim victory')!.click();
}

describe('OFF-1 — every screen works with no server at all (T-35)', () => {
  it('renders all nine screens', () => {
    mount({}, deadNetwork);
    for (const route of ROUTES) {
      go(route.hash);
      expect($('#screen-title')!.textContent!.length, route.hash).toBeGreaterThan(0);
    }
  });

  it('says so in words that progress is kept on this device', () => {
    mount({}, deadNetwork);
    expect($('[data-testid="sync-status"]')!.textContent).toMatch(/Offline|saved on this device/);
  });

  it('raises no unhandled rejection while the network keeps failing', async () => {
    const { storage } = mount({}, deadNetwork);
    claimFirstAvailable();
    // Дарааллын түлхэлт нь async — microtask ба таймерын ээлжийг өгнө.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(rejections).toEqual([]);
    expect(queued(storage.dump())).toContain('claimQuest');
  });
});

describe('OFF-1 — the PERSONAL-2 systems all run offline (T-35)', () => {
  it('grows mastery and guild reputation from a claim', () => {
    mount({}, deadNetwork);
    go('#/camp');
    const before = $('[data-testid="camp-mastery"]')!.textContent;
    const repBefore = $('[data-testid="camp-guilds"]')!.textContent;

    claimFirstAvailable();

    go('#/camp');
    expect($('[data-testid="camp-mastery"]')!.textContent).not.toBe(before);
    expect($('[data-testid="camp-guilds"]')!.textContent).not.toBe(repBefore);
  });

  it('opens the trophy room and lists the whole catalogue', () => {
    mount({}, deadNetwork);
    go('#/trophies');
    expect($$('[data-testid="trophy-item"]').length).toBeGreaterThanOrEqual(60);
  });

  it('logs a hard mode boss attempt and keeps the personal best', () => {
    const boss = pack.quests.find((q) => q.id === 'boss-rough-cut-trial')!;
    const { storage } = mount(
      seedOf({ level: 10, xp: 7500, completedMainQuestIds: [...boss.prerequisites] }),
      deadNetwork,
    );
    go('#/forge');

    const attempt = $$<HTMLButtonElement>(`.boss-row[data-boss-id="${boss.id}"] button`).find(
      (b) => b.textContent?.includes('attempt'),
    );
    expect(attempt, 'no boss is reachable — the offline path would be untested').toBeDefined();
    attempt!.click();
    const select = $<HTMLSelectElement>('.modal select[data-testid="boss-difficulty"]')!;
    select.value = 'hard';
    select.dispatchEvent(new Event('change'));
    for (const slider of $$<HTMLInputElement>('.modal input[type="range"]')) {
      slider.value = '7';
      slider.dispatchEvent(new Event('input'));
    }
    $$<HTMLButtonElement>('.modal button').find((b) => b.textContent === 'Log attempt')!.click();

    expect(
      $(`.boss-row[data-boss-id="${boss.id}"] [data-testid="boss-best-hard"]`)!.textContent,
    ).toMatch(/42/);
    expect(queued(storage.dump())).toContain('bossAttempt');
  });

  it('unlocks a skill node offline and keeps it in the save', () => {
    const { storage } = mount(seedOf({ skillPoints: 2 }), deadNetwork);
    go('#/skills');
    const unlock = $$<HTMLButtonElement>('.skill-card button').find(
      (b) => b.textContent === 'Unlock' && !b.disabled,
    );
    expect(unlock, 'no tier-1 node is unlockable offline').toBeDefined();
    unlock!.click();

    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(storage.dump()[SAVE_KEY]!).state.unlockedSkillIds).toHaveLength(1);
    expect(queued(storage.dump())).toContain('unlockSkill');
  });
});

describe('OFF-5 — save, export and import never need the network (T-35)', () => {
  it('writes the save to local storage after a claim', () => {
    const { storage } = mount({}, deadNetwork);
    claimFirstAvailable();
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(storage.dump()[SAVE_KEY]!).state.xp).toBeGreaterThan(0);
  });

  it('round-trips an export through the import box', () => {
    const { storage } = mount({}, deadNetwork);
    claimFirstAvailable();
    window.dispatchEvent(new Event('pagehide'));
    const exported = storage.dump()[SAVE_KEY]!;

    // Шинэ төхөөрөмж — хоосон хадгалалт, тасарсан сүлжээ.
    mount({}, deadNetwork);
    go('#/settings');
    ($('#import-text') as HTMLTextAreaElement).value = exported;
    $$<HTMLButtonElement>('button').find((b) => b.textContent === 'Import pasted save')!.click();

    // ⚠ Баталгаа нь `toast-host`-д — `main` нь импортын дараа ДАХИН зурагдаж,
    // дотор нь бичсэн мессеж алга болдог (энэ тест тэр чимээгүй алдагдлыг барив).
    expect(document.getElementById('toast-host')!.textContent).toMatch(/imported/i);
    go('#/camp');
    expect($('[data-testid="camp-identity"]')!.textContent).toMatch(/\d+ \/ \d+ XP/);
  });
});

describe('OFF-6 — nothing personal is ever asked for (T-35)', () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? files(full) : full.endsWith('.ts') ? [full] : [];
    });

  it('has no sign-up, password or e-mail field anywhere in the UI', () => {
    mount({}, deadNetwork);
    for (const route of ROUTES) {
      go(route.hash);
      expect($$('input[type="password"]'), route.hash).toEqual([]);
      expect($$('input[type="email"]'), route.hash).toEqual([]);
      expect(document.getElementById('main')!.textContent).not.toMatch(/sign in|sign up|create an account/i);
    }
  });

  it('never names a personal field in the source either', () => {
    const banned = /\b(password|e-?mail|firstName|lastName|phoneNumber)\b/i;
    const offenders = files(srcDir).filter((file) => banned.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
