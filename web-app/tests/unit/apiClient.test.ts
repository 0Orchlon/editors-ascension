/**
 * Сүлжээний хаалга (lld.md §7.2, §6.10).
 *
 * ⚠ `problem+json`-ийн `actionId`/`detail` нь ХАЯГДАЖ болохгүй: §7.6 алхам 4-т
 * зөвхөн татгалзсан үйлдлийг хасах ба тоглогчид шалтгааныг хэлэх мэдээлэл нь тэр.
 */
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../src/services/apiClient.ts';

const creds = { playerId: '11111111-1111-4111-8111-111111111111', token: 'tok' };
const problem = (body: Record<string, unknown>, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/problem+json' } });

describe('apiClient — problem+json', () => {
  it('422 дээр `actionId` ба `detail`-ыг дуудагч руу дамжуулна', async () => {
    const fetchImpl = vi.fn(async () =>
      problem(
        {
          type: 'about:blank#INSUFFICIENT_STAMINA',
          title: 'Unprocessable Content',
          status: 422,
          code: 'INSUFFICIENT_STAMINA',
          detail: 'Not enough stamina for this run.',
          actionId: '22222222-2222-4222-8222-222222222222',
        },
        422,
      ),
    ) as unknown as typeof fetch;

    const result = await createApiClient('', fetchImpl).postActions(creds, [], '*');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INSUFFICIENT_STAMINA');
    expect(result.actionId).toBe('22222222-2222-4222-8222-222222222222');
    expect(result.detail).toBe('Not enough stamina for this run.');
  });

  it('талбар байхгүй бол `undefined` — хоосон мөр биш', async () => {
    const fetchImpl = vi.fn(async () =>
      problem({ type: 'about:blank#INVALID_INPUT', title: 'x', status: 422, code: 'INVALID_INPUT' }, 422),
    ) as unknown as typeof fetch;

    const result = await createApiClient('', fetchImpl).postActions(creds, [], '*');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.actionId).toBeUndefined();
    expect(result.detail).toBeUndefined();
  });
});
