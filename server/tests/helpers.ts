/** Серверийн тестийн туслах — бодит HTTP хүсэлтээр дамжуулж гинжийг бүтнээр шалгана. */
import { createApp, type AppOptions } from '../src/app.ts';
import type { LogRecord } from '../src/logging/logger.ts';

export type TestApp = {
  base: string;
  logs: LogRecord[];
  close: () => Promise<void>;
  app: ReturnType<typeof createApp>;
  request: (
    method: string,
    path: string,
    init?: { body?: unknown; token?: string; headers?: Record<string, string> },
  ) => Promise<{ status: number; headers: Headers; body: any; text: string }>;
  newPlayer: () => Promise<{ playerId: string; token: string }>;
};

export async function startApp(options: AppOptions = {}): Promise<TestApp> {
  const logs: LogRecord[] = [];
  const app = createApp({ logSink: (r) => logs.push(r), ...options });
  const port = await app.listen(0);
  const base = `http://127.0.0.1:${port}`;

  const request: TestApp['request'] = async (method, path, init = {}) => {
    const headers: Record<string, string> = { ...init.headers };
    if (init.token) headers.authorization = `Bearer ${init.token}`;
    if (init.body !== undefined) headers['content-type'] = 'application/json';

    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      ...(init.body === undefined
        ? {}
        : { body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body) }),
    });
    const text = await response.text();
    let body: unknown;
    try {
      body = text.length ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    return { status: response.status, headers: response.headers, body, text };
  };

  return {
    base,
    logs,
    app,
    request,
    close: () => app.close(),
    async newPlayer() {
      const created = await request('POST', '/api/players');
      return created.body as { playerId: string; token: string };
    },
  };
}

/** UUID v4 хэлбэртэй тогтвортой actionId — контрактын `uuid` хэв шаардана. */
export function actionId(n: number): string {
  const hex = n.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

export const action = (n: number, type: string, payload: Record<string, unknown>, at = '2026-03-10T09:00:00Z') => ({
  actionId: actionId(n),
  type,
  at,
  payload,
});
