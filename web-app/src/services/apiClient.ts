/**
 * Сүлжээний ЦОРЫН ГАНЦ хаалга (lld.md §7.2). `ui/**` дотор `fetch` хориотой —
 * `architecture.test.ts` шалгана.
 *
 * ⚠ Сервер унтарсан ч апп бүрэн ажиллана (AC BE-7): бүх дуудлага алдааг ШИДЭХГҮЙ,
 * `{ ok:false }` буцаана.
 */
import type { Action, ActionBatchResponse, ContentPack, SavePayload } from '@shared/types/index.ts';

export type ApiResult<T> =
  | { ok: true; value: T; etag?: string }
  | { ok: false; status: number; code?: string; offline: boolean; retryAfterSeconds?: number };

export type Credentials = { playerId: string; token: string };

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch) {
  async function call<T>(
    path: string,
    init: RequestInit & { token?: string } = {},
  ): Promise<ApiResult<T>> {
    const headers = new Headers(init.headers);
    if (init.token) headers.set('authorization', `Bearer ${init.token}`);
    if (init.body !== undefined) headers.set('content-type', 'application/json');

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers });
    } catch {
      // Сүлжээгүй — апп локал домэйнээр үргэлжилнэ (AC BE-7).
      return { ok: false, status: 0, offline: true };
    }

    if (response.status === 304) return { ok: true, value: undefined as T };

    const text = await response.text();
    const parsed = text.length > 0 ? safeJson(text) : undefined;

    if (!response.ok) {
      const code = typeof parsed === 'object' && parsed !== null ? (parsed as { code?: string }).code : undefined;
      // 429 дээр `Retry-After`-гүйгээр дахин илгээх нь яг тэр хаалгыг дахин цохино.
      const retry = retryAfterSeconds(response.headers.get('retry-after'));
      return {
        ok: false,
        status: response.status,
        offline: false,
        ...(code === undefined ? {} : { code }),
        ...(retry === undefined ? {} : { retryAfterSeconds: retry }),
      };
    }

    const etag = response.headers.get('etag');
    return etag === null
      ? { ok: true, value: parsed as T }
      : { ok: true, value: parsed as T, etag };
  }

  return {
    health: () => call<{ status: string; version: string; contentVersion?: string }>('/api/health'),

    createPlayer: () => call<Credentials>('/api/players', { method: 'POST' }),

    getContentPack: (etag?: string) =>
      call<ContentPack>('/api/content/pack', {
        headers: etag === undefined ? {} : { 'if-none-match': etag },
      }),

    getSave: (creds: Credentials) =>
      call<SavePayload>(`/api/players/${creds.playerId}/save`, { token: creds.token }),

    putSave: (creds: Credentials, payload: SavePayload, ifMatch: string) =>
      call<{ updatedAt: string; etag: string }>(`/api/players/${creds.playerId}/save`, {
        method: 'PUT',
        token: creds.token,
        headers: { 'if-match': ifMatch },
        body: JSON.stringify(payload),
      }),

    // ⚠ `ifMatch` нь заавал: сервер нь бидний мэдэж буй хувилбар дээр л үйлдлийг
    // хэрэглэнэ (lld.md §7.6 алхам 3). Өөр төхөөрөмж завсарт бичсэн бол 409 ирнэ.
    postActions: (creds: Credentials, actions: Action[], ifMatch = '*') =>
      call<ActionBatchResponse>(`/api/players/${creds.playerId}/actions`, {
        method: 'POST',
        token: creds.token,
        headers: { 'if-match': ifMatch },
        body: JSON.stringify({ actions }),
      }),

    createTransferCode: (creds: Credentials) =>
      call<{ code: string; expiresAt: string }>(`/api/players/${creds.playerId}/transfer-code`, {
        method: 'POST',
        token: creds.token,
      }),

    redeemTransferCode: (code: string) =>
      call<Credentials>('/api/transfer/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
  };
}

/** `Retry-After` нь секунд эсвэл HTTP-огноо байж болно — хоёуланг нь секунд болгоно. */
function retryAfterSeconds(header: string | null): number | undefined {
  if (header === null) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
