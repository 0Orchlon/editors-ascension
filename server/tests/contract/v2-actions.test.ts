/**
 * QX-2 · QX-4 · OFF-7 — серверийн тал дээрх v1.2.0-ийн гэрээ (T-26).
 *
 * ⚠ Домэйн дүрэм сервер талд ДАХИН бичигдээгүй: доорх бүх хүлээлт нь
 * `shared/core/apply.ts`-ийн зан төлөвөөс гарна (AC BE-10). Сервер нь тээвэр,
 * эрх бүхий байдал, тууштай байдлыг л нэмнэ.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { actionId, startApp, type TestApp } from '../helpers.ts';
import { buildPack } from '../../../shared/content/index.ts';
import { loadContent } from '../../src/content/load.ts';
import { schemas, validateGameState } from '../../../shared/validate/index.ts';
import type { Action, ActionType, DomainEventType } from '../../../shared/types/index.ts';

let running: TestApp | null = null;
afterEach(async () => {
  await running?.close();
  running = null;
});

const start = async (): Promise<TestApp> => {
  running = await startApp();
  return running;
};

const at = '2026-03-10T09:00:00.000Z';
const action = (n: number, type: ActionType, payload: Record<string, unknown>): Action =>
  ({ actionId: actionId(n), type, at, payload }) as Action;

const EMPTY_SLOTS = {
  avatarFrame: null,
  campBanner: null,
  title: null,
  campDecoration: null,
  uiAccent: null,
  badgeFrame: null,
};

describe('OFF-7 — the server runs the same three new actions (T-26)', () => {
  it('accepts setCampLayout and returns the authoritative state', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();

    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(1, 'setCampLayout', { slots: EMPTY_SLOTS })] },
    });

    expect(response.status).toBe(200);
    expect(response.body.results[0].status).toBe('applied');
    expect(response.body.state.campLayout.slots).toEqual(EMPTY_SLOTS);
    expect(validateGameState(response.body.state)).toEqual([]);
  });

  it('rejects prestigeMastery below level 10 with the domain reason, not a 500', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();

    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(2, 'prestigeMastery', { tag: 'audio' })] },
    });

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(response.body.code).toBe('PREREQ_NOT_MET');
  });

  it('rejects respecTree with nothing unlocked, and never with a new error code', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();

    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(3, 'respecTree', { track: 'audio' })] },
    });

    expect(response.status).toBe(422);
    // ⚠ v1.2.0-д ЯГ нэг шинэ код нэмэгдсэн (`RESPEC_ON_COOLDOWN`); бусад бүх
    // татгалзал одоогийн 7 кодод багтана (plan.md §13.3).
    expect(schemas.RejectionReason.meta.enum).toContain(response.body.code);
  });

  it('rejects a malformed new payload as INVALID_INPUT before touching the save', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();

    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(4, 'prestigeMastery', { tag: 'not-a-tag' })] },
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('INVALID_INPUT');
  });

  it('carries the optional bossAttempt difficulty through to the authoritative state', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();
    const scores = { story: 9, editing: 9, camera: 9, visualCraft: 9, animation: 9, audioPost: 9 };
    const bossId = buildPack().quests.find((q) => q.track === 'boss' && q.world === 1)!.id;

    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(5, 'bossAttempt', { bossId, scores, difficulty: 'hard' })] },
    });

    expect(response.status).toBe(200);
    expect(response.body.state.bossAttempts[0].difficulty).toBe('hard');
  });

  /** ⚠ BE-13 — v1.1.0-ийн дараалалд хадгалагдсан үйлдэл (difficulty-гүй) эвдрэхгүй. */
  it('still accepts a bossAttempt with no difficulty at all', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();
    const scores = { story: 9, editing: 9, camera: 9, visualCraft: 9, animation: 9, audioPost: 9 };
    const bossId = buildPack().quests.find((q) => q.track === 'boss' && q.world === 1)!.id;

    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(6, 'bossAttempt', { bossId, scores })] },
    });

    expect(response.status).toBe(200);
    expect(response.body.state.bossAttempts[0].difficulty).toBe('standard');
  });

  it('accepts the two new settings fields through updateSettings', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();

    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: { actions: [action(7, 'updateSettings', { colorBlindSafe: true, soundVolume: 0 })] },
    });

    expect(response.status).toBe(200);
    expect(response.body.state.settings).toMatchObject({ colorBlindSafe: true, soundVolume: 0 });
  });

  it('emits only event types the contract declares (QX-2)', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();
    const declared = new Set(schemas.DomainEventType.meta.enum as DomainEventType[]);

    const quest = buildPack().quests.find((q) => q.track === 'main' && q.levelRequired === 1)!;
    const response = await app.request('POST', `/api/players/${playerId}/actions`, {
      token,
      body: {
        actions: [
          action(8, 'claimQuest', {
            questId: quest.id,
            checkedConditions: quest.victoryConditions.map((_, i) => i),
          }),
        ],
      },
    });

    expect(response.status).toBe(200);
    const emitted = response.body.results[0].events.map((e: { type: string }) => e.type);
    expect(emitted.filter((t: DomainEventType) => !declared.has(t))).toEqual([]);
    // Roll-up нь сервер дээр ч ажиллана — домэйн НЭГ хувилбартай (BE-10).
    expect(emitted).toContain('REPUTATION_GAINED');
  });

  it('keeps the new state fields valid after a replayed batch (BE-12)', async () => {
    const app = await start();
    const { playerId, token } = await app.newPlayer();
    const body = { actions: [action(9, 'setCampLayout', { slots: EMPTY_SLOTS })] };

    const first = await app.request('POST', `/api/players/${playerId}/actions`, { token, body });
    const second = await app.request('POST', `/api/players/${playerId}/actions`, { token, body });

    expect(first.body.results[0].status).toBe('applied');
    expect(second.body.results[0].status).toBe('replayed');
    expect(validateGameState(second.body.state)).toEqual([]);
  });
});

describe('QX-4 — the content pack stays small enough to ship (T-26)', () => {
  it('serves the whole pack in well under 2 MB', async () => {
    const app = await start();
    const response = await app.request('GET', '/api/content/pack');

    expect(response.status).toBe(200);
    const bytes = Buffer.byteLength(response.text, 'utf8');
    expect(bytes, `content pack is ${bytes} bytes`).toBeLessThan(2_000_000);
    // Хоосон/таслагдсан хариу нь «жижиг» гэж тоологдож болохгүй.
    expect(bytes).toBeGreaterThan(50_000);
  });

  it('includes the three new collections in the served pack', async () => {
    const app = await start();
    const response = await app.request('GET', '/api/content/pack');

    expect(response.body.guilds).toHaveLength(4);
    expect(response.body.chains.length).toBeGreaterThanOrEqual(3);
    expect(response.body.cosmetics.length).toBeGreaterThanOrEqual(60);
  });

  /**
   * ⚠ BE-15 — хүчингүй контент нь health-ийг 503 болгоно, чимээгүй ажиллахгүй.
   * Энд ЯГ v1.2.0-ийн шинэ шаардлагыг унагаав: guilds/chains/cosmetics-гүй пакет.
   */
  it('reports degraded health when the new collections are missing', async () => {
    const withoutV2 = { ...buildPack() } as Record<string, unknown>;
    for (const key of ['guilds', 'chains', 'cosmetics']) delete withoutV2[key];
    const content = loadContent(withoutV2 as never);
    expect(content.ok).toBe(false);

    running = await startApp({ content });
    const response = await running.request('GET', '/api/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
  });

  it('serves a healthy status with the real pack', async () => {
    const app = await start();
    const response = await app.request('GET', '/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
