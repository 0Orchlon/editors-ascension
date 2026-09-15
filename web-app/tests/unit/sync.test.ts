/**
 * Sync эвлэрүүлэг (lld.md §7.6, §7.7; AC BE-7, BE-11, BE-12, BE-14).
 *
 * ⚠ Эдгээр тестүүд нь «функц бичигдсэн» биш «функц ДУУДАГДДАГ» гэдгийг барина:
 * өмнөх хувилбарт `pull`, `pushFullSave`, transfer метод бүгд үхмэл байв.
 */
import { describe, expect, it, vi } from 'vitest';
import { newGame } from '@shared/save/serialize.ts';
import type { GameState } from '@shared/types/index.ts';
import { createActionQueue } from '../../src/services/actionQueue.ts';
import type { ApiClient } from '../../src/services/apiClient.ts';
import { createSync, CREDS_KEY, ETAG_KEY, type SyncStatus } from '../../src/services/sync.ts';
import type { Storage } from '../../src/services/persistence.ts';

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const CREDS = { playerId: '11111111-1111-4111-8111-111111111111', token: 'tok' };
const seeded = (extra: Record<string, string> = {}): Storage =>
  memoryStorage({ [CREDS_KEY]: JSON.stringify(CREDS), ...extra });

const action = (id: string) => ({
  actionId: id,
  type: 'rest' as const,
  payload: {},
  at: '2026-01-01T00:00:00.000Z',
  seed: 7,
});

function fakeApi(overrides: Record<string, unknown> = {}): ApiClient {
  return {
    health: vi.fn(),
    createPlayer: vi.fn(async () => ({ ok: true as const, value: CREDS })),
    getContentPack: vi.fn(),
    getSave: vi.fn(async () => ({
      ok: true as const,
      value: { schemaVersion: 1, updatedAt: '2026-01-01T00:00:00.000Z', state: newGame() },
      etag: 'srv',
    })),
    putSave: vi.fn(async () => ({ ok: true as const, value: { updatedAt: 'x', etag: 'put' } })),
    postActions: vi.fn(async () => ({
      ok: true as const,
      value: { state: newGame(), results: [], updatedAt: 'x', etag: 'act' },
    })),
    createTransferCode: vi.fn(async () => ({
      ok: true as const,
      value: { code: 'K7QM-2X4T-9BRH', expiresAt: 'z' },
    })),
    redeemTransferCode: vi.fn(async () => ({ ok: true as const, value: { playerId: 'p2', token: 't2' } })),
    ...overrides,
  } as unknown as ApiClient;
}

function build(opts: { api: ApiClient; storage?: Storage; localUpdatedAt?: () => string | null }) {
  const storage = opts.storage ?? seeded();
  const queue = createActionQueue(storage);
  const states: GameState[] = [];
  const statuses: SyncStatus[] = [];
  const sleeps: number[] = [];
  const notices: string[] = [];
  const sync = createSync({
    api: opts.api,
    queue,
    storage,
    getState: () => newGame(),
    localUpdatedAt: opts.localUpdatedAt ?? ((): string | null => null),
    onState: (s) => void states.push(s),
    onStatus: (s) => void statuses.push(s),
    sleep: async (ms: number) => void sleeps.push(ms),
    onNotice: (text: string) => void notices.push(text),
  });
  return { sync, queue, storage, states, statuses, sleeps, notices };
}

describe('sync — §7.6 алхам 1: хоосон дараалал дээр GET /save', () => {
  it('дараалал хоосон бол серверээс татна', async () => {
    const api = fakeApi();
    const h = build({ api });
    await h.sync.push();
    expect(api.getSave).toHaveBeenCalledTimes(1);
  });

  it('сервер илүү ШИНЭ бол төлвийг тавина', async () => {
    const api = fakeApi();
    const h = build({ api, localUpdatedAt: () => '2025-01-01T00:00:00.000Z' });
    await h.sync.push();
    expect(h.states).toHaveLength(1);
  });

  it('локал илүү шинэ бол төлвийг ДАРАХГҮЙ', async () => {
    const api = fakeApi();
    const h = build({ api, localUpdatedAt: () => '2027-01-01T00:00:00.000Z' });
    await h.sync.push();
    expect(h.states).toHaveLength(0);
  });
});

describe('sync — §7.6 алхам 3: POST /actions нь If-Match илгээнэ', () => {
  it('сүүлд мэдэгдэж буй etag-ийг дагуулна', async () => {
    const api = fakeApi();
    const h = build({ api, storage: seeded({ [ETAG_KEY]: 'W/"7"' }) });
    h.queue.enqueue(action('aaaaaaaa-0000-4000-8000-000000000001'));
    await h.sync.push();
    expect(api.postActions).toHaveBeenCalledWith(CREDS, expect.any(Array), 'W/"7"');
  });

  it('409 дээр GET /save хийж дахин илгээнэ (§7.6 алхам 4)', async () => {
    let attempt = 0;
    const api = fakeApi({
      postActions: vi.fn(async () => {
        attempt += 1;
        return attempt === 1
          ? { ok: false as const, status: 409, offline: false }
          : { ok: true as const, value: { state: newGame(), results: [], updatedAt: 'x', etag: 'act2' } };
      }),
    });
    const h = build({ api });
    h.queue.enqueue(action('aaaaaaaa-0000-4000-8000-000000000002'));
    await h.sync.push();
    expect(api.getSave).toHaveBeenCalledTimes(1);
    expect(api.postActions).toHaveBeenCalledTimes(2);
    expect(h.storage.getItem(ETAG_KEY)).toBe('act2');
  });
});

describe('sync — §7.6: 429 дээр Retry-After хүлээнэ', () => {
  it('заасан секундын дараа дахин илгээнэ', async () => {
    let attempt = 0;
    const api = fakeApi({
      postActions: vi.fn(async () => {
        attempt += 1;
        return attempt === 1
          ? { ok: false as const, status: 429, offline: false, retryAfterSeconds: 2 }
          : { ok: true as const, value: { state: newGame(), results: [], updatedAt: 'x', etag: 'act' } };
      }),
    });
    const h = build({ api });
    h.queue.enqueue(action('aaaaaaaa-0000-4000-8000-000000000003'));
    await h.sync.push();
    expect(h.sleeps).toEqual([2000]);
    expect(api.postActions).toHaveBeenCalledTimes(2);
  });
});

describe('sync — §7.6 статусын багц', () => {
  it('зөвхөн LLD-ийн дөрвөн утга гарна', async () => {
    const api = fakeApi();
    const h = build({ api });
    h.queue.enqueue(action('aaaaaaaa-0000-4000-8000-000000000004'));
    await h.sync.push();
    for (const s of h.statuses) expect(['offline', 'syncing', 'synced', 'error']).toContain(s);
    expect(h.statuses).toContain('syncing');
    expect(h.sync.status()).toBe('synced');
  });

  it('серверийн алдаа нь error, сүлжээгүй нь offline', async () => {
    const api = fakeApi({
      postActions: vi.fn(async () => ({ ok: false as const, status: 500, offline: false })),
    });
    const h = build({ api });
    h.queue.enqueue(action('aaaaaaaa-0000-4000-8000-000000000005'));
    await h.sync.push();
    expect(h.sync.status()).toBe('error');
  });
});

describe('sync — §7.6 алхам 5: гэмтсэн дараалал нь бүтэн PUT болно', () => {
  it('JSON задрахгүй дараалал дээр pushFullSave явна', async () => {
    const api = fakeApi();
    const storage = seeded({ 'ea.queue.v1': '{{{ not json' });
    const h = build({ api, storage });
    await h.sync.push();
    expect(api.putSave).toHaveBeenCalledTimes(1);
  });
});

describe('sync — §6.9 шилжүүлэх код', () => {
  it('код үүсгэнэ', async () => {
    const api = fakeApi();
    const h = build({ api });
    const code = await h.sync.createTransferCode();
    expect(api.createTransferCode).toHaveBeenCalledTimes(1);
    expect(code).toEqual({ code: 'K7QM-2X4T-9BRH', expiresAt: 'z' });
  });

  it('код хүлээн авбал шинэ таних тэмдгээр серверийн төлвийг ТАТНА', async () => {
    const api = fakeApi();
    const h = build({ api, storage: seeded({ [ETAG_KEY]: 'old' }) });
    const ok = await h.sync.redeemTransferCode('k7qm2x4t9brh');
    expect(ok).toBe(true);
    expect(JSON.parse(h.storage.getItem(CREDS_KEY) ?? 'null')).toEqual({ playerId: 'p2', token: 't2' });
    // Шинэ төхөөрөмж дээрх локал төлөв ШИНЭ байлаа ч серверийнх ялна.
    expect(h.states).toHaveLength(1);
  });

  it('буруу код нь одоогийн таних тэмдгийг ХЭВЭЭР үлдээнэ', async () => {
    const api = fakeApi({
      redeemTransferCode: vi.fn(async () => ({ ok: false as const, status: 410, offline: false })),
    });
    const h = build({ api });
    const ok = await h.sync.redeemTransferCode('K7QM-2X4T-9BRH');
    expect(ok).toBe(false);
    expect(JSON.parse(h.storage.getItem(CREDS_KEY) ?? 'null')).toEqual(CREDS);
  });
});

/**
 * §7.6 алхам 4 — 422 нь ТУХАЙН нэг үйлдлийн татгалзал.
 *
 * ⚠ Сервер багцыг бүхэлд нь rollback хийдэг (§6.6) тул бүтэн багцыг хаях нь
 * хүчинтэй 49 хүртэлх офлайн үйлдлийг ҮҮРД алдана — чимээгүй алдагдал.
 */
describe('sync — §7.6 алхам 4: 422 нь зөвхөн татгалзсан actionId-г хасна', () => {
  const rejected = '22222222-2222-4222-8222-222222222222';
  const keep = '33333333-3333-4333-8333-333333333333';

  const api422 = () =>
    fakeApi({
      postActions: vi
        .fn()
        .mockResolvedValueOnce({
          ok: false as const,
          status: 422,
          code: 'INSUFFICIENT_STAMINA',
          actionId: rejected,
          offline: false,
        })
        .mockResolvedValue({
          ok: true as const,
          value: { state: newGame(), results: [{ actionId: keep, status: 'applied', events: [] }], updatedAt: 'x', etag: 'act' },
        }),
    });

  it('татгалзсан үйлдлийг хасч, ҮЛДСЭНИЙГ илгээнэ', async () => {
    const api = api422();
    const h = build({ api });
    h.queue.enqueue(action(rejected));
    h.queue.enqueue(action(keep));

    await h.sync.push();

    expect(h.queue.peekAll()).toEqual([]);
    // Хоёр дахь дуудлага нь ҮЛДСЭН үйлдлийг агуулна — багц бүхэлдээ хаягдаагүй.
    const second = (api.postActions as unknown as { mock: { calls: unknown[][] } }).mock.calls[1];
    expect(second).toBeDefined();
    expect((second![1] as { actionId: string }[]).map((a) => a.actionId)).toEqual([keep]);
  });

  it('тоглогчид шалтгааныг хэлнэ', async () => {
    const h = build({ api: api422() });
    h.queue.enqueue(action(rejected));
    h.queue.enqueue(action(keep));

    await h.sync.push();

    expect(h.notices.join(' ')).toContain('INSUFFICIENT_STAMINA');
  });

  it('`actionId`-гүй 422 дээр л бүтэн багцыг хаяна (дараалал гацахгүй)', async () => {
    const api = fakeApi({
      postActions: vi.fn(async () => ({ ok: false as const, status: 422, code: 'INVALID_INPUT', offline: false })),
    });
    const h = build({ api });
    h.queue.enqueue(action(rejected));
    h.queue.enqueue(action(keep));

    await h.sync.push();

    expect(h.queue.peekAll()).toEqual([]);
  });
});
