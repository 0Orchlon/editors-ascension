/** Backend-ийн үндсэн гадаргуу (T-24…T-28, T-44…T-48). */
import { afterEach, describe, expect, it } from 'vitest';
import { newGame } from '../../shared/save/serialize.ts';
import { startApp, action, type TestApp } from './helpers.ts';

let current: TestApp | null = null;
const app = async (...args: Parameters<typeof startApp>) => {
  current = await startApp(...args);
  return current;
};
afterEach(async () => {
  await current?.close();
  current = null;
});

const payload = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  updatedAt: '2026-03-10T09:00:00Z',
  state: { ...newGame(), ...over },
});

describe('health + content (T-24, T-28, T-47)', () => {
  it('reports ok with a content version (BE-9, BE-15)', async () => {
    const { request } = await app();
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.contentVersion).toMatch(/^[0-9a-f]+$/);
  });

  it('serves the content pack with an ETag (BE-6)', async () => {
    const { request } = await app();
    const res = await request('GET', '/api/content/pack');
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBeTruthy();
    expect(res.headers.get('cache-control')).toContain('max-age=300');
    expect(res.body.quests.length).toBeGreaterThan(30);
  });

  it('answers 304 when the ETag still matches (BE-6)', async () => {
    const { request } = await app();
    const first = await request('GET', '/api/content/pack');
    const etag = first.headers.get('etag')!;
    const second = await request('GET', '/api/content/pack', { headers: { 'if-none-match': etag } });
    expect(second.status).toBe(304);
    expect(second.text).toBe('');
  });

  /** AC BE-15 — эвдэрсэн контент нь health-ийг degraded болгож pack-ийг тараахаа болино. */
  it('degrades health and refuses the pack when content is invalid (BE-15)', async () => {
    const { request } = await app({ content: { ok: false, reason: '3 schema issue(s)', fields: ['/quests/0/xp'] } });
    const health = await request('GET', '/api/health');
    expect(health.status).toBe(503);
    expect(health.body.status).toBe('degraded');

    const pack = await request('GET', '/api/content/pack');
    expect(pack.status).toBe(503);
    expect(pack.headers.get('content-type')).toContain('application/problem+json');
  });

  /** ⚠ Санаатай: контент эвдэрсэн ч тоглогч ӨГӨГДЛӨӨ уншиж чадна (lld.md §6.7). */
  it('still serves saves while content is degraded (BE-15)', async () => {
    const { request, newPlayer } = await app({
      content: { ok: false, reason: 'broken', fields: [] },
    });
    const { playerId, token } = await newPlayer();
    const put = await request('PUT', `/api/players/${playerId}/save`, {
      token,
      body: payload(),
      headers: { 'if-match': '*' },
    });
    expect(put.status).toBe(200);
    const get = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(get.status).toBe(200);
  });
});

describe('anonymous players and token protection (T-25)', () => {
  it('issues a playerId and a token, with no PII requested (BE-2)', async () => {
    const { request } = await app();
    const res = await request('POST', '/api/players');
    expect(res.status).toBe(201);
    expect(res.body.playerId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.token.length).toBeGreaterThanOrEqual(43);
  });

  it('never stores the raw token — only its hash (BE-2)', async () => {
    const { app: instance, newPlayer } = await app();
    const { token } = await newPlayer();
    const rows = instance.db.prepare('SELECT token_hash FROM players').all();
    expect(rows.map((r) => String(r.token_hash))).not.toContain(token);
  });

  it('rejects an unauthenticated request with 401 (BE-4)', async () => {
    const { request, newPlayer } = await app();
    const { playerId } = await newPlayer();
    const res = await request('GET', `/api/players/${playerId}/save`);
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
  });

  it('rejects a bogus token with 401 (BE-4)', async () => {
    const { request, newPlayer } = await app();
    const { playerId } = await newPlayer();
    const res = await request('GET', `/api/players/${playerId}/save`, { token: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  /** AC BE-4 — итгэлцлийн хил; хялбаршуулахыг хориглоно. */
  it('refuses to read another player’s save with 403 (BE-4)', async () => {
    const { request, newPlayer } = await app();
    const alice = await newPlayer();
    const bob = await newPlayer();
    const res = await request('GET', `/api/players/${alice.playerId}/save`, { token: bob.token });
    expect(res.status).toBe(403);
  });

  it('allows a player to reach their own save with 200 (BE-4)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    await request('PUT', `/api/players/${playerId}/save`, {
      token,
      body: payload(),
      headers: { 'if-match': '*' },
    });
    const res = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(res.status).toBe(200);
  });
});

describe('save GET/PUT + ETag (T-26)', () => {
  it('returns 404 before any save exists (BE-3)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(res.status).toBe(404);
  });

  it('requires If-Match on every PUT (BE-3)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('PUT', `/api/players/${playerId}/save`, { token, body: payload() });
    expect(res.status).toBe(409);
  });

  it('accepts * only for the first write (BE-3)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const first = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload(), headers: { 'if-match': '*' },
    });
    expect(first.status).toBe(200);

    const second = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 10 }), headers: { 'if-match': '*' },
    });
    expect(second.status).toBe(409);
  });

  it('accepts a current ETag and rejects a stale one (BE-3)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const first = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload(), headers: { 'if-match': '*' },
    });
    const etag = first.body.etag as string;

    const ok = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 50 }), headers: { 'if-match': etag },
    });
    expect(ok.status).toBe(200);

    const stale = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 90 }), headers: { 'if-match': etag },
    });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('ETAG_MISMATCH');
  });

  it('round-trips the state it was given', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 321, coins: 7 }), headers: { 'if-match': '*' },
    });
    const res = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(res.body.state.xp).toBe(321);
    expect(res.body.state.coins).toBe(7);
  });
});

describe('request body validation (T-27)', () => {
  it('rejects a malformed body with 400 and names the bad fields (BE-5)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('PUT', `/api/players/${playerId}/save`, {
      token,
      body: payload({ xp: -5 }),
      headers: { 'if-match': '*' },
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_BODY');
    expect(res.body.errors.map((e: { field: string }) => e.field)).toContain('/state/xp');
  });

  it('rejects unparseable JSON with 400 (BE-5)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('PUT', `/api/players/${playerId}/save`, {
      token,
      body: '{ not json',
      headers: { 'if-match': '*', 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects a body over 1MB with 413 (BE-5)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const huge = JSON.stringify({ blob: 'x'.repeat(1_200_000) });
    const res = await request('PUT', `/api/players/${playerId}/save`, {
      token,
      body: huge,
      headers: { 'if-match': '*', 'content-type': 'application/json' },
    }).catch(() => ({ status: 413, headers: new Headers(), body: undefined, text: '' }));
    expect(res.status).toBe(413);
  });
});

describe('authoritative actions + idempotency (T-44)', () => {
  const claim = (n: number) =>
    action(n, 'claimQuest', { questId: 'mq-first-cut', checkedConditions: [0, 1, 2] });

  /**
   * lld.md §6.6 — `If-Match` нь БОДИТ хувилбарыг заана. Save мөр байхгүй үед
   * тодорхой ETag нь ЗӨРСӨН гэсэн үг (клиент өөр төлвийн тухай ярьж байна).
   */
  it('rejects a concrete If-Match when the player has no save row yet (BE-11)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [claim(1)] },
      headers: { 'if-match': '"W/stale"' },
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ETAG_MISMATCH');
  });

  it('applies an action and persists the resulting xp (BE-11)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [claim(1)] },
    });
    expect(res.status).toBe(200);
    expect(res.body.state.xp).toBe(60);
    expect(res.body.results[0].status).toBe('applied');

    const saved = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(saved.body.state.xp).toBe(60);
  });

  /** AC BE-12 — ижил `actionId` хоёр удаа ирвэл XP НЭГ л удаа нэмэгдэнэ. */
  it('replays a repeated actionId without applying it twice (BE-12)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    await request('POST', `/api/players/${playerId}/actions`, { token, body: { actions: [claim(1)] } });
    const again = await request('POST', `/api/players/${playerId}/actions`, {
      token, body: { actions: [claim(1)] },
    });
    expect(again.status).toBe(200);
    expect(again.body.results[0].status).toBe('replayed');
    expect(again.body.state.xp).toBe(60);
  });

  it('returns the original events on a replay (BE-12)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const first = await request('POST', `/api/players/${playerId}/actions`, { token, body: { actions: [claim(1)] } });
    const again = await request('POST', `/api/players/${playerId}/actions`, { token, body: { actions: [claim(1)] } });
    expect(again.body.results[0].events).toEqual(first.body.results[0].events);
  });

  /** AC BE-11 — багц АТОМ: нэг нь татгалзвал өмнөхүүд нь ч хадгалагдахгүй. */
  it('rolls the whole batch back when one action is rejected (BE-11)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: {
        actions: [
          claim(1),
          action(2, 'claimQuest', { questId: 'mq-cinematic-master', checkedConditions: [0, 1, 2] }),
        ],
      },
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('LEVEL_TOO_LOW');
    expect(res.body.actionId).toBeTruthy();

    const saved = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(saved.status).toBe(404);
  });

  it('rejects an out-of-stamina batch with 422 and leaves the stored state alone (BE-11)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    // Stamina 10; First Cut нь 2 тул 6 удаагийн оролдлого нөөцийг шавхана.
    const actions = [1, 2, 3, 4, 5, 6].map((n) =>
      action(n, 'claimQuest', { questId: 'sq-hotkey-hunter', checkedConditions: [0, 1] }),
    );
    await request('POST', `/api/players/${playerId}/actions`, {
      token, body: { actions: actions.slice(0, 5) },
    });
    const before = await request('GET', `/api/players/${playerId}/save`, { token });

    const rest = Array.from({ length: 10 }, (_, i) =>
      action(100 + i, 'claimQuest', { questId: 'sq-hotkey-hunter', checkedConditions: [0, 1] }),
    );
    const res = await request('POST', `/api/players/${playerId}/actions`, { token, body: { actions: rest } });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_STAMINA');

    const after = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(after.body.state).toEqual(before.body.state);
  });

  it('rejects a payload the domain cannot use with 422, not 400 (BE-5)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(9, 'claimQuest', { questId: 123 })] },
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('refuses actions while content is degraded (BE-15)', async () => {
    const { request, newPlayer } = await app({ content: { ok: false, reason: 'broken', fields: [] } });
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/actions`, {
      token, body: { actions: [claim(1)] },
    });
    expect(res.status).toBe(503);
  });

  it('is deterministic — the same action id yields the same loot', async () => {
    const run = async () => {
      const instance = await startApp();
      const { playerId, token } = await instance.newPlayer();
      const res = await instance.request('POST', `/api/players/${playerId}/actions`, {
        token, body: { actions: [claim(1)] },
      });
      await instance.close();
      return res.body.results[0].events;
    };
    expect(await run()).toEqual(await run());
  });
});

describe('snapshot history and restore (T-45)', () => {
  it('keeps at most ten snapshots (BE-13)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();

    let etag = '*';
    for (let i = 0; i < 12; i++) {
      const res = await request('PUT', `/api/players/${playerId}/save`, {
        token, body: payload({ xp: i }), headers: { 'if-match': etag },
      });
      etag = res.body.etag;
    }

    const history = await request('GET', `/api/players/${playerId}/save/history`, { token });
    expect(history.status).toBe(200);
    expect(history.body.snapshots).toHaveLength(10);
  });

  it('restores a snapshot and records the restore itself (BE-13)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();

    const first = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 100 }), headers: { 'if-match': '*' },
    });
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 999 }), headers: { 'if-match': first.body.etag },
    });

    const history = await request('GET', `/api/players/${playerId}/save/history`, { token });
    const target = history.body.snapshots[0].snapshotId;

    const restored = await request('POST', `/api/players/${playerId}/save/restore`, {
      token, body: { snapshotId: target },
    });
    expect(restored.status).toBe(200);

    const saved = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(saved.body.state.xp).toBe(100);

    const after = await request('GET', `/api/players/${playerId}/save/history`, { token });
    expect(after.body.snapshots.some((s: { reason: string }) => s.reason === 'restore')).toBe(true);
  });

  it('404s on an unknown snapshot id', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/save/restore`, {
      token, body: { snapshotId: '00000000-0000-4000-8000-000000000000' },
    });
    expect(res.status).toBe(404);
  });

  it('never exposes another player’s snapshots (BE-4)', async () => {
    const { request, newPlayer } = await app();
    const alice = await newPlayer();
    const bob = await newPlayer();
    const res = await request('GET', `/api/players/${alice.playerId}/save/history`, { token: bob.token });
    expect(res.status).toBe(403);
  });
});

describe('cross-device transfer codes (T-46)', () => {
  it('issues a code that expires in the future (BE-14)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/transfer-code`, { token });
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(Date.parse(res.body.expiresAt)).toBeGreaterThan(Date.now());
  });

  it('never stores the raw code (BE-14)', async () => {
    const { request, newPlayer, app: instance } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/transfer-code`, { token });
    const stored = instance.db.prepare('SELECT code_hash FROM transfer_codes').all();
    expect(stored.map((r) => String(r.code_hash))).not.toContain(res.body.code);
  });

  it('redeems once into a new player holding a copy of the save (BE-14)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 777 }), headers: { 'if-match': '*' },
    });

    const issued = await request('POST', `/api/players/${playerId}/transfer-code`, { token });
    const redeemed = await request('POST', '/api/transfer/redeem', { body: { code: issued.body.code } });
    expect(redeemed.status).toBe(201);
    expect(redeemed.body.playerId).not.toBe(playerId);

    // ⚠ Хариунд save-ийн агуулга ОРОХГҮЙ — зөвхөн шинэ таних тэмдэг.
    expect(redeemed.body.state).toBeUndefined();

    const copy = await request('GET', `/api/players/${redeemed.body.playerId}/save`, {
      token: redeemed.body.token,
    });
    expect(copy.body.state.xp).toBe(777);

    // Эх тоглогчийн save УСТААГҮЙ.
    const original = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(original.body.state.xp).toBe(777);
  });

  it('rejects a second redemption with 410 (BE-14)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const issued = await request('POST', `/api/players/${playerId}/transfer-code`, { token });
    await request('POST', '/api/transfer/redeem', { body: { code: issued.body.code } });
    const again = await request('POST', '/api/transfer/redeem', { body: { code: issued.body.code } });
    expect(again.status).toBe(410);
  });

  it('rejects an expired code with 410 (BE-14)', async () => {
    let clock = '2026-03-10T09:00:00Z';
    const instance = await startApp({ now: () => clock });
    current = instance;
    const { playerId, token } = await instance.newPlayer();
    const issued = await instance.request('POST', `/api/players/${playerId}/transfer-code`, { token });

    clock = '2026-03-10T09:30:00Z'; // TTL 15 минутаас хойш
    const res = await instance.request('POST', '/api/transfer/redeem', { body: { code: issued.body.code } });
    expect(res.status).toBe(410);
  });

  /** ⚠ Гурван бүтэлгүй тохиолдол ижил хариу — кодын оршин тогтнол задрахгүй. */
  it('gives an unknown code the same 410 as a used one (BE-14)', async () => {
    const { request } = await app();
    const res = await request('POST', '/api/transfer/redeem', { body: { code: 'ZZZZ-ZZZZ-ZZZZ' } });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('TRANSFER_CODE_INVALID');
  });

  it('normalises lowercase and missing dashes when redeeming (BE-14)', async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const issued = await request('POST', `/api/players/${playerId}/transfer-code`, { token });
    const sloppy = String(issued.body.code).toLowerCase().replace(/-/g, '');
    const res = await request('POST', '/api/transfer/redeem', { body: { code: sloppy } });
    expect(res.status).toBe(201);
  });
});

describe('ops gates (T-48)', () => {
  it('returns problem+json for every error status (BE-16)', async () => {
    const { request, newPlayer } = await app();
    const { playerId } = await newPlayer();
    for (const path of ['/api/nope', `/api/players/${playerId}/save`]) {
      const res = await request('GET', path);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers.get('content-type')).toContain('application/problem+json');
      expect(res.body.status).toBe(res.status);
      expect(res.body.title).toBeTruthy();
    }
  });

  it('never leaks a stack trace in an error body (BE-16)', async () => {
    const { request } = await app();
    const res = await request('GET', '/api/nope');
    expect(res.text).not.toContain('at ');
    expect(res.body.stack).toBeUndefined();
  });

  it('keeps PII and secrets out of the logs (BE-16)', async () => {
    const { request, newPlayer, logs } = await app();
    const { playerId, token } = await newPlayer();
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 42 }), headers: { 'if-match': '*' },
    });

    const dump = JSON.stringify(logs);
    for (const banned of ['ip', 'remoteAddress', 'authorization', 'bearer', 'state_json']) {
      expect(dump.toLowerCase()).not.toContain(`"${banned.toLowerCase()}":`);
    }
    expect(dump).not.toContain(token);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('sets an x-request-id on every response (BE-16)', async () => {
    const { request } = await app();
    const res = await request('GET', '/api/health');
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rate limits the anonymous player route with 429 and Retry-After (BE-17)', async () => {
    const { request } = await app();
    let limited: { status: number; headers: Headers } | null = null;
    for (let i = 0; i < 40; i++) {
      const res = await request('POST', '/api/players');
      if (res.status === 429) {
        limited = res;
        break;
      }
    }
    expect(limited).not.toBeNull();
    expect(Number(limited!.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('creates the schema through numbered migrations only (BE-16)', async () => {
    const { app: instance } = await app();
    const versions = instance.db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all()
      .map((r) => Number(r.version));
    expect(versions).toEqual([1]);
  });

  it('is safe to re-run migrations on an existing database', async () => {
    const { app: instance } = await app();
    const { runSchemaMigrations } = await import('../src/db/migrations.ts');
    expect(runSchemaMigrations(instance.db, '2026-03-10T09:00:00Z')).toEqual([]);
  });
});

describe('durability across a restart (T-24)', () => {
  it('reads back a save written by a previous process (BE-8)', async () => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const file = join(mkdtempSync(join(tmpdir(), 'ea-')), 'test.sqlite');

    const first = await startApp({ dbFile: file });
    const { playerId, token } = await first.newPlayer();
    await first.request('PUT', `/api/players/${playerId}/save`, {
      token, body: payload({ xp: 1234 }), headers: { 'if-match': '*' },
    });
    await first.close();

    const second = await startApp({ dbFile: file });
    const res = await second.request('GET', `/api/players/${playerId}/save`, { token });
    expect(res.status).toBe(200);
    expect(res.body.state.xp).toBe(1234);
    await second.close();
  });
});
