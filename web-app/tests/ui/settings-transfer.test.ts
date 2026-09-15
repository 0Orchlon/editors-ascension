/**
 * Settings дэлгэцийн серверийн зам (lld.md §7.4 мөр 8, §7.7; AC BE-14, SV-4).
 *
 * ⚠ Энд шалгаж буй зүйл нь «товч байна уу» биш — товч НЬ СЕРВЕР РҮҮ ХҮРЭХ эсэх.
 * Өмнөх хувилбарт «Create a transfer code» нь зөвхөн текст тавьдаг хуурмаг байв.
 */
import { describe, expect, it, vi } from 'vitest';
import { newGame } from '@shared/save/serialize.ts';
import type { GameState } from '@shared/types/index.ts';
import { renderSettings } from '../../src/ui/screens/settings.ts';
import type { GameService } from '../../src/services/gameService.ts';
import type { Sync } from '../../src/services/sync.ts';
import { buildShell } from '../../src/ui/shell.ts';

type StubSync = {
  createTransferCode: ReturnType<typeof vi.fn>;
  redeemTransferCode: ReturnType<typeof vi.fn>;
  pushFullSave: ReturnType<typeof vi.fn>;
  credentials: () => { playerId: string; token: string } | null;
  status: () => 'synced';
};

function stubSync(over: Partial<StubSync> = {}): StubSync {
  return {
    createTransferCode: vi.fn(async () => ({ code: 'K7QM-2X4T-9BRH', expiresAt: '2026-01-01T00:15:00.000Z' })),
    redeemTransferCode: vi.fn(async () => true),
    pushFullSave: vi.fn(async () => true),
    credentials: () => ({ playerId: 'p1', token: 't1' }),
    status: () => 'synced' as const,
    ...over,
  };
}

function stubGame(over: Record<string, unknown> = {}): GameService {
  const state: GameState = newGame();
  return {
    state$: { getState: () => state, setState: () => undefined, subscribe: () => () => undefined },
    dispatch: vi.fn(() => ({ events: [] })),
    exportSave: () => '{}',
    importSave: vi.fn(() => ({ ok: true as const })),
    view: {
      settings: () => state.settings,
      lastSavedAt: () => '2026-01-01T00:00:00.000Z',
    },
    ...over,
  } as unknown as GameService;
}

function mountSettings(sync: StubSync, game: GameService = stubGame()) {
  document.body.innerHTML = '<div id="app"></div>';
  buildShell(document.getElementById('app') as HTMLElement);
  const screen = renderSettings({ game, sync: sync as unknown as Sync, rerender: () => undefined });
  document.getElementById('main')?.replaceChildren(screen);
  return screen;
}

const byText = (label: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('Settings — шилжүүлэх код (AC BE-14)', () => {
  it('«Create a transfer code» нь серверээс код АВЧ харуулна', async () => {
    const sync = stubSync();
    mountSettings(sync);
    byText('Create a transfer code')?.click();
    await flush();
    expect(sync.createTransferCode).toHaveBeenCalledTimes(1);
    expect(document.getElementById('main')?.textContent).toContain('K7QM-2X4T-9BRH');
  });

  it('код авах бүтэлгүйтвэл шалтгааныг ХЭЛНЭ, чимээгүй өнгөрөхгүй', async () => {
    const sync = stubSync({ createTransferCode: vi.fn(async () => null) });
    mountSettings(sync);
    byText('Create a transfer code')?.click();
    await flush();
    expect(document.getElementById('main')?.textContent).toMatch(/could not|offline|server/i);
  });

  it('оруулсан кодыг redeem хийж төлвийг татна', async () => {
    const sync = stubSync();
    mountSettings(sync);
    const input = document.getElementById('redeem-code') as HTMLInputElement;
    input.value = 'K7QM-2X4T-9BRH';
    byText('Use this code')?.click();
    await flush();
    expect(sync.redeemTransferCode).toHaveBeenCalledWith('K7QM-2X4T-9BRH');
  });

  it('татгалзсан код нь тоглогчид ЯЛГААГҮЙ мессеж өгнө', async () => {
    const sync = stubSync({ redeemTransferCode: vi.fn(async () => false) });
    mountSettings(sync);
    const input = document.getElementById('redeem-code') as HTMLInputElement;
    input.value = 'K7QM-2X4T-9BRH';
    byText('Use this code')?.click();
    await flush();
    expect(document.getElementById('main')?.textContent).toMatch(/not work|expired|already/i);
  });
});

describe('Settings — import нь серверт бүтнээр тавигдана (§7.7)', () => {
  it('амжилттай import → pushFullSave', async () => {
    const sync = stubSync();
    mountSettings(sync);
    const area = document.getElementById('import-text') as HTMLTextAreaElement;
    area.value = '{"schemaVersion":1}';
    byText('Import pasted save')?.click();
    await flush();
    expect(sync.pushFullSave).toHaveBeenCalledTimes(1);
  });

  it('татгалзсан import → сервер рүү ЮУ Ч явахгүй', async () => {
    const sync = stubSync();
    const game = stubGame({ importSave: vi.fn(() => ({ ok: false as const, reason: 'Save file rejected (bad).' })) });
    mountSettings(sync, game);
    const area = document.getElementById('import-text') as HTMLTextAreaElement;
    area.value = 'garbage';
    byText('Import pasted save')?.click();
    await flush();
    expect(sync.pushFullSave).not.toHaveBeenCalled();
  });
});
