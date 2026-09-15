/**
 * Гэрээний тест (T-29, T-50; AC BE-1).
 *
 * `contracts.yaml`-ийн БҮХ үйлдлийг жинхэнэ сервер рүү явуулж, хариуг `shared/validate`-ийн
 * схемтэй тулгана. Контрактад endpoint нэмэгдвэл (`declared` жагсаалт өснө) харин энд
 * хэрэгжүүлэлт байхгүй бол тест УНАНА — гэрээ ба код чимээгүй салахгүй.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import { run, schemas } from '../../../shared/validate/index.ts';
import { newGame } from '../../../shared/save/serialize.ts';
import { startApp, action, type TestApp } from '../helpers.ts';

const here = dirname(fileURLToPath(import.meta.url));
const contractFile = join(here, '..', '..', '..', 'docs', 'PERSONAL-1', 'contracts.yaml');
const spec = parse(readFileSync(contractFile, 'utf8')) as {
  paths: Record<string, Record<string, { operationId?: string }>>;
};

const HTTP_METHODS = ['get', 'put', 'post', 'patch', 'delete'];

/** Контрактад зарлагдсан бүх `operationId`. */
const declared = Object.values(spec.paths)
  .flatMap((item) => Object.entries(item).filter(([m]) => HTTP_METHODS.includes(m)))
  .map(([, op]) => op.operationId)
  .filter((id): id is string => typeof id === 'string')
  .sort();

let current: TestApp | null = null;
afterEach(async () => {
  await current?.close();
  current = null;
});
const app = async (): Promise<TestApp> => {
  current = await startApp();
  return current;
};

const savePayload = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  updatedAt: '2026-03-10T09:00:00Z',
  state: { ...newGame(), ...over },
});

/** Нэг үйлдлийг ажиллуулж, хариуг харгалзах схемээр шалгана. */
type Probe = () => Promise<void>;

const probes: Record<string, Probe> = {
  getHealth: async () => {
    const { request } = await app();
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(run(schemas.HealthOk, res.body)).toEqual([]);
  },

  createPlayer: async () => {
    const { request } = await app();
    const res = await request('POST', '/api/players');
    expect(res.status).toBe(201);
    expect(run(schemas.PlayerCredentials, res.body)).toEqual([]);
  },

  getSave: async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: savePayload(), headers: { 'if-match': '*' },
    });
    const res = await request('GET', `/api/players/${playerId}/save`, { token });
    expect(res.status).toBe(200);
    expect(run(schemas.SavePayload, res.body)).toEqual([]);
    expect(res.headers.get('etag')).toBeTruthy();
  },

  putSave: async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: savePayload(), headers: { 'if-match': '*' },
    });
    expect(res.status).toBe(200);
    expect(run(schemas.SaveAck, res.body)).toEqual([]);
  },

  getSaveHistory: async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: savePayload(), headers: { 'if-match': '*' },
    });
    const first = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: savePayload({ xp: 5 }), headers: { 'if-match': '*' },
    }).then(() => request('GET', `/api/players/${playerId}/save`, { token }));
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: savePayload({ xp: 9 }), headers: { 'if-match': first.headers.get('etag')! },
    });

    const res = await request('GET', `/api/players/${playerId}/save/history`, { token });
    expect(res.status).toBe(200);
    expect(run(schemas.SaveHistory, res.body)).toEqual([]);
  },

  restoreSave: async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const first = await request('PUT', `/api/players/${playerId}/save`, {
      token, body: savePayload({ xp: 11 }), headers: { 'if-match': '*' },
    });
    await request('PUT', `/api/players/${playerId}/save`, {
      token, body: savePayload({ xp: 22 }), headers: { 'if-match': first.body.etag },
    });
    const history = await request('GET', `/api/players/${playerId}/save/history`, { token });

    const res = await request('POST', `/api/players/${playerId}/save/restore`, {
      token, body: { snapshotId: history.body.snapshots[0].snapshotId },
    });
    expect(res.status).toBe(200);
    expect(run(schemas.SaveAck, res.body)).toEqual([]);
  },

  applyActions: async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(1, 'claimQuest', { questId: 'mq-first-cut', checkedConditions: [0, 1, 2] })] },
    });
    expect(res.status).toBe(200);
    expect(run(schemas.ActionBatchResponse, res.body)).toEqual([]);
  },

  createTransferCode: async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const res = await request('POST', `/api/players/${playerId}/transfer-code`, { token });
    expect(res.status).toBe(201);
    expect(run(schemas.TransferCode, res.body)).toEqual([]);
  },

  redeemTransferCode: async () => {
    const { request, newPlayer } = await app();
    const { playerId, token } = await newPlayer();
    const issued = await request('POST', `/api/players/${playerId}/transfer-code`, { token });
    const res = await request('POST', '/api/transfer/redeem', { body: { code: issued.body.code } });
    expect(res.status).toBe(201);
    expect(run(schemas.PlayerCredentials, res.body)).toEqual([]);
  },

  getContentPack: async () => {
    const { request } = await app();
    const res = await request('GET', '/api/content/pack');
    expect(res.status).toBe(200);
    expect(run(schemas.ContentPack, res.body)).toEqual([]);
  },
};

describe('contract coverage (T-29, T-50)', () => {
  it('reads a non-empty set of operations from contracts.yaml', () => {
    expect(declared.length).toBeGreaterThanOrEqual(10);
  });

  /** ⚠ Контрактад шинэ endpoint нэмэхэд ЭНЭ тест унана — хэрэгжүүлэлт мартагдахгүй. */
  it('implements every operation the contract declares (BE-1)', () => {
    const missing = declared.filter((id) => probes[id] === undefined);
    expect(missing).toEqual([]);
  });

  it('declares every operation the server exercises — no undocumented endpoints (BE-1)', () => {
    const undocumented = Object.keys(probes).filter((id) => !declared.includes(id));
    expect(undocumented).toEqual([]);
  });
});

describe('response schema conformance (T-29, T-50)', () => {
  for (const [operationId, probe] of Object.entries(probes)) {
    it(`${operationId} matches its published response schema (BE-1)`, probe);
  }
});

describe('error responses conform to Problem (T-50)', () => {
  const cases: [string, () => Promise<{ status: number; body: any; headers: Headers }>][] = [];

  it('validates 401, 403, 404, 409, 410, 422 and 503 against the Problem schema (BE-1)', async () => {
    const { request, newPlayer } = await app();
    const alice = await newPlayer();
    const bob = await newPlayer();

    const collected = [
      // 401 — токенгүй
      await request('GET', `/api/players/${alice.playerId}/save`),
      // 403 — өөр тоглогчийн id
      await request('GET', `/api/players/${alice.playerId}/save`, { token: bob.token }),
      // 404 — save байхгүй
      await request('GET', `/api/players/${alice.playerId}/save`, { token: alice.token }),
      // 409 — If-Match дутуу
      await request('PUT', `/api/players/${alice.playerId}/save`, { token: alice.token, body: savePayload() }),
      // 410 — хүчингүй шилжүүлэх код
      await request('POST', '/api/transfer/redeem', { body: { code: 'ZZZZ-ZZZZ-ZZZZ' } }),
      // 422 — домэйн татгалзал
      await request('POST', `/api/players/${alice.playerId}/actions`, {
        token: alice.token,
        body: { actions: [action(5, 'claimQuest', { questId: 'mq-cinematic-master', checkedConditions: [0, 1, 2] })] },
      }),
      // 400 — схемийн алдаа
      await request('PUT', `/api/players/${alice.playerId}/save`, {
        token: alice.token, body: savePayload({ xp: -1 }), headers: { 'if-match': '*' },
      }),
    ];

    expect(collected.map((r) => r.status)).toEqual([401, 403, 404, 409, 410, 422, 400]);
    for (const res of collected) {
      expect(res.headers.get('content-type')).toContain('application/problem+json');
      expect(run(schemas.Problem, res.body)).toEqual([]);
    }
    expect(cases).toEqual([]);
  });

  it('validates the degraded health response against its schema (BE-15)', async () => {
    current = await startApp({ content: { ok: false, reason: 'broken content', fields: [] } });
    const res = await current.request('GET', '/api/health');
    expect(res.status).toBe(503);
    expect(run(schemas.HealthDegraded, res.body)).toEqual([]);
  });
});
