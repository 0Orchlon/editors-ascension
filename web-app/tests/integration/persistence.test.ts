/** Persistence ба sync (T-36, T-37, T-49; AC SV-2, SV-3, SV-6, BE-7, BE-12). */
import { describe, expect, it, vi } from 'vitest';
import { buildPack } from '@shared/content/index.ts';
import { exportSave } from '@shared/core/saves.ts';
import { newGame } from '@shared/save/serialize.ts';
import type { Action, GameState } from '@shared/types/index.ts';
import { createApp } from '../../src/app/createGame.ts';
import { createActionQueue, QUEUE_KEY } from '../../src/services/actionQueue.ts';
import { createApiClient } from '../../src/services/apiClient.ts';
import { createPersistence, SAVE_KEY } from '../../src/services/persistence.ts';
import { createSync } from '../../src/services/sync.ts';
import { memoryStorage, offlineFetch } from '../ui/helpers.ts';

const at = '2026-03-10T09:00:00Z';
const claimPayload = { questId: 'mq-first-cut', checkedConditions: [0, 1, 2] };

describe('persistence (T-36; SV-2, SV-3, SV-6)', () => {
  it('debounces writes rather than writing on every keystroke (SV-6)', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const persistence = createPersistence(storage, () => at, 500);

    persistence.scheduleWrite(newGame());
    persistence.scheduleWrite({ ...newGame(), xp: 10 });
    expect(storage.getItem(SAVE_KEY)).toBeNull();

    vi.advanceTimersByTime(500);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).state.xp).toBe(10);
    vi.useRealTimers();
  });

  it('flush writes immediately for pagehide (SV-6)', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const persistence = createPersistence(storage, () => at);
    persistence.scheduleWrite({ ...newGame(), xp: 42 });
    persistence.flush();
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).state.xp).toBe(42);
    vi.useRealTimers();
  });

  it('exposes the last saved time for the UI (SV-3)', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const persistence = createPersistence(storage, () => at);
    expect(persistence.lastSavedAt()).toBeNull();
    persistence.scheduleWrite(newGame());
    persistence.flush();
    expect(persistence.lastSavedAt()).toBe(at);
    vi.useRealTimers();
  });

  /** ⚠ AC SV-2 — гэмтсэн save нь апп-ыг унагаахгүй БА хуулбар нь УСТАХГҮЙ. */
  it('recovers from a corrupt save and keeps a backup copy (SV-2)', () => {
    const corrupt = '{"state": broken';
    const storage = memoryStorage({ [SAVE_KEY]: corrupt });
    const persistence = createPersistence(storage, () => at);

    const loaded = persistence.load();
    expect(loaded.state).toEqual(newGame());
    expect(loaded.warning).toContain('backup');

    const kept = Object.entries(storage.dump()).find(([k]) => k.startsWith('ea.save.corrupt.'));
    expect(kept?.[1]).toBe(corrupt);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('survives a full quest → xp → save → reload cycle (SV-3)', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const first = createApp({ storage, fetchImpl: offlineFetch, now: () => at });
    const result = first.game.dispatch('claimQuest', claimPayload);
    expect(result.rejected).toBeUndefined();
    vi.advanceTimersByTime(600);

    const second = createApp({ storage, fetchImpl: offlineFetch, now: () => at });
    expect(second.game.state$.getState().xp).toBe(60);
    expect(second.game.state$.getState().completedMainQuestIds).toEqual(['mq-first-cut']);
    vi.useRealTimers();
  });
});

describe('export / import (T-38; SV-4, SV-5)', () => {
  it('round-trips through export and import', () => {
    const storage = memoryStorage();
    const app = createApp({ storage, fetchImpl: offlineFetch, now: () => at });
    app.game.dispatch('claimQuest', claimPayload);
    const text = app.game.exportSave();

    const fresh = createApp({ storage: memoryStorage(), fetchImpl: offlineFetch, now: () => at });
    expect(fresh.game.importSave(text)).toEqual({ ok: true });
    expect(fresh.game.state$.getState().xp).toBe(60);
  });

  /** ⚠ AC SV-5 — татгалзсан импорт нь ОДООГИЙН прогрессыг УСТГАХГҮЙ. */
  it('leaves the current state untouched when the import is rejected (SV-5)', () => {
    const storage = memoryStorage();
    const app = createApp({ storage, fetchImpl: offlineFetch, now: () => at });
    app.game.dispatch('claimQuest', claimPayload);
    const before = app.game.state$.getState();

    for (const bad of ['not json at all', '[1,2,3]', brokenSave()]) {
      const result = app.game.importSave(bad);
      expect(result.ok).toBe(false);
      expect(app.game.state$.getState()).toEqual(before);
    }
  });
});

describe('offline queue and reconciliation (T-49; BE-7, BE-12)', () => {
  it('queues every action while offline and keeps them (BE-7)', async () => {
    const storage = memoryStorage();
    const app = createApp({ storage, fetchImpl: offlineFetch, now: () => at });

    app.game.dispatch('claimQuest', claimPayload);
    app.game.dispatch('rest', {});
    await app.kick();

    const queued = JSON.parse(storage.getItem(QUEUE_KEY)!) as Action[];
    expect(queued.map((a) => a.type)).toEqual(['claimQuest', 'rest']);
    // Офлайн байхад ч тоглоом БҮРЭН ажилласан.
    expect(app.game.state$.getState().xp).toBe(60);
  });

  it('never queues an action the domain rejected (BE-7)', () => {
    const storage = memoryStorage();
    const app = createApp({ storage, fetchImpl: offlineFetch, now: () => at });
    const result = app.game.dispatch('claimQuest', { questId: 'mq-cinematic-master', checkedConditions: [0, 1, 2] });
    expect(result.rejected).toBe('LEVEL_TOO_LOW');
    expect(storage.getItem(QUEUE_KEY)).toBeNull();
  });

  it('sends the queue once when the connection returns and adopts the server state', async () => {
    const storage = memoryStorage();
    const seen: Action[][] = [];
    const serverState: GameState = { ...newGame(), xp: 999, level: 5 };

    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      if (Array.isArray(body.actions)) {
        seen.push(body.actions);
        return jsonResponse({
          state: serverState,
          results: body.actions.map((a: Action) => ({ actionId: a.actionId, status: 'applied', events: [] })),
          updatedAt: at,
          etag: '"abc"',
        });
      }
      // Дараалал хоосон үед sync нь `GET /save` хийнэ (lld.md §7.6 алхам 1).
      if (String(url).endsWith('/save')) {
        return jsonResponse({ schemaVersion: serverState.schemaVersion, updatedAt: at, state: serverState });
      }
      return jsonResponse({ playerId: 'p1', token: 't'.repeat(43) }, 201);
    }) as unknown as typeof fetch;

    const app = createApp({ storage, fetchImpl, now: () => at });
    app.game.dispatch('claimQuest', claimPayload);
    await app.kick();
    await app.kick();

    // Нэг үйлдэл НЭГ л удаа явсан — XP давхарлаагүй.
    expect(seen.flat().filter((a) => a.type === 'claimQuest')).toHaveLength(1);
    // Серверийн төлөв ЭРХ БҮХИЙ.
    expect(app.game.state$.getState().xp).toBe(999);
    expect(JSON.parse(storage.getItem(QUEUE_KEY)!)).toEqual([]);
  });

  it('drops actions the server rejects with 422 so the queue cannot jam', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      if (Array.isArray(body.actions))
        return jsonResponse({ status: 422, code: 'INSUFFICIENT_STAMINA', title: 'x', type: 'about:blank' }, 422);
      return jsonResponse({ playerId: 'p1', token: 't'.repeat(43) }, 201);
    }) as unknown as typeof fetch;

    const app = createApp({ storage, fetchImpl, now: () => at });
    app.game.dispatch('claimQuest', claimPayload);
    await app.kick();
    expect(JSON.parse(storage.getItem(QUEUE_KEY)!)).toEqual([]);
  });

  it('does not lose the queue when the server is unreachable', async () => {
    const storage = memoryStorage();
    const app = createApp({ storage, fetchImpl: offlineFetch, now: () => at });
    app.game.dispatch('claimQuest', claimPayload);
    await app.kick();
    expect(JSON.parse(storage.getItem(QUEUE_KEY)!)).toHaveLength(1);
    expect(app.sync.status()).toBe('offline');
  });

  it('ignores a corrupt queue instead of crashing', () => {
    const storage = memoryStorage({ [QUEUE_KEY]: '{ broken' });
    const queue = createActionQueue(storage);
    expect(queue.peekAll()).toEqual([]);
  });

  it('never enqueues the same actionId twice (BE-12)', () => {
    const storage = memoryStorage();
    const queue = createActionQueue(storage);
    const action = { actionId: 'a-1', type: 'rest', at, payload: {} } as unknown as Action;
    queue.enqueue(action);
    queue.enqueue(action);
    expect(queue.size()).toBe(1);
  });
});

describe('api client resilience (T-37; BE-7)', () => {
  it('reports offline instead of throwing when the network is down', async () => {
    const api = createApiClient('', offlineFetch);
    const result = await api.health();
    expect(result).toEqual({ ok: false, status: 0, offline: true });
  });

  it('surfaces the problem code on an error response', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ status: 409, code: 'ETAG_MISMATCH', title: 'c', type: 'about:blank' }, 409)) as typeof fetch;
    const api = createApiClient('', fetchImpl);
    const result = await api.getSave({ playerId: 'p', token: 't' });
    expect(result).toMatchObject({ ok: false, status: 409, code: 'ETAG_MISMATCH' });
  });

  it('does not create a player when the server is unreachable', async () => {
    const storage = memoryStorage();
    const sync = createSync({
      api: createApiClient('', offlineFetch),
      queue: createActionQueue(storage),
      storage,
      getState: () => newGame(),
      onState: () => undefined,
    });
    expect(await sync.ensurePlayer()).toBeNull();
    expect(sync.status()).toBe('offline');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json', etag: '"abc"' },
  });
}

function brokenSave(): string {
  const parsed = JSON.parse(exportSave(newGame(), at));
  parsed.state.level = 99;
  return JSON.stringify(parsed);
}

// Контент пакет ачаалагдаж байгааг батална — тестүүд бодит контент дээр ажиллана.
it('builds a real content pack for these tests', () => {
  expect(buildPack().quests.length).toBeGreaterThan(38);
});
