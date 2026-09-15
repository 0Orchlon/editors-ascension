/**
 * HTTP апп — `node:http` + жижиг router (lld.md §6.1).
 *
 * ⚠ Middleware гинжний ДАРААЛАЛ нь гэрээ:
 *   requestId → logger → bodyLimit(1MB) → rateLimit:global → jsonParse → auth
 *   → rateLimit:perToken → ownership → validate → handler → problemMapper
 * 3-р алхам 5-аас ӨМНӨ (том биеийг санах ойд ачаалахгүй);
 * 7-р алхам 6-ийн ДАРАА (түлхүүр нь token hash, IP хадгалахыг AC BE-2 хориглодог).
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Action, GameState, Issue } from '../../shared/types/index.ts';
import { newGame } from '../../shared/save/serialize.ts';
import {
  validateActionBatch,
  validateRedeemRequest,
  validateRestoreRequest,
  validateSavePayload,
} from '../../shared/validate/index.ts';
import { cleanupExpired, openDb, transact, type Db } from './db/index.ts';
import { listSnapshots, readSave, readSnapshot, snapshot, writeSave } from './db/saves.ts';
import { loadContent, type ContentState } from './content/load.ts';
import { runBatch } from './domain/actionEngine.ts';
import {
  HttpProblem,
  PROBLEM_CONTENT_TYPE,
  bodyTooLarge,
  contentUnavailable,
  etagMismatch,
  forbidden,
  invalidBody,
  notFound,
  rateLimited,
  toProblem,
  transferCodeInvalid,
  unauthorized,
} from './errors/problem.ts';
import { createLogger, shortId, type Sink } from './logging/logger.ts';
import {
  GLOBAL_ANON_KEY,
  GLOBAL_ANON_LIMIT,
  PER_TOKEN_LIMIT,
  createRateLimiter,
} from './middleware/rateLimit.ts';
import {
  newPlayerId,
  newToken,
  newTransferCode,
  normalizeTransferCode,
  sha256,
} from './auth/tokens.ts';

export const SERVER_VERSION = '1.1.0';
const MAX_BODY_BYTES = 1_048_576;
const TRANSFER_TTL_MS = 15 * 60_000;

export type AppOptions = {
  dbFile?: string;
  db?: Db;
  content?: ContentState;
  /** Тест цагийг шахна — `Date.now()` шууд дуудахгүй. */
  now?: () => string;
  logSink?: Sink;
};

type Ctx = {
  req: http.IncomingMessage;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  rawBody: string;
  playerId?: string;
  tokenHash?: string;
};

type Handler = (ctx: Ctx) => Reply | Promise<Reply>;
type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

type Route = {
  method: string;
  pattern: string;
  auth: boolean;
  globalLimit?: boolean;
  validate?: (v: unknown) => Issue[];
  handler: Handler;
};

export function createApp(options: AppOptions = {}) {
  const now = options.now ?? (() => new Date().toISOString());
  const db = options.db ?? openDb(options.dbFile ?? ':memory:', now());
  const content = options.content ?? loadContent();
  const log = createLogger(options.logSink);
  const limiter = createRateLimiter();

  cleanupExpired(db, now());

  const routes: Route[] = [
    {
      method: 'GET',
      pattern: '/api/health',
      auth: false,
      handler: () =>
        content.ok
          ? { status: 200, body: { status: 'ok', version: SERVER_VERSION, contentVersion: content.version } }
          : // AC BE-15 — контент хүчингүй бол health нь degraded.
            { status: 503, body: { status: 'degraded', version: SERVER_VERSION, reason: content.reason } },
    },

    {
      method: 'GET',
      pattern: '/api/content/pack',
      auth: false,
      handler: (ctx) => {
        if (!content.ok) throw contentUnavailable(content.reason);
        const headers = {
          etag: content.etag,
          'cache-control': 'public, max-age=300, must-revalidate',
        };
        if (ctx.req.headers['if-none-match'] === content.etag) return { status: 304, headers };
        return { status: 200, body: JSON.parse(content.body), headers };
      },
    },

    {
      method: 'POST',
      pattern: '/api/players',
      auth: false,
      globalLimit: true,
      handler: () => {
        const playerId = newPlayerId();
        const token = newToken();
        db.prepare('INSERT INTO players (player_id, token_hash, created_at) VALUES (?, ?, ?)').run(
          playerId,
          sha256(token),
          now(),
        );
        // ⚠ Түүхий token ЗӨВХӨН энэ нэг хариунд гарна.
        return { status: 201, body: { playerId, token } };
      },
    },

    {
      method: 'GET',
      pattern: '/api/players/:playerId/save',
      auth: true,
      handler: (ctx) => {
        const row = readSave(db, ctx.params.playerId!);
        if (row === null) throw notFound('no save for this player');
        return {
          status: 200,
          headers: { etag: row.etag },
          body: { schemaVersion: row.schemaVersion, updatedAt: row.updatedAt, state: JSON.parse(row.stateJson) },
        };
      },
    },

    {
      method: 'PUT',
      pattern: '/api/players/:playerId/save',
      auth: true,
      validate: validateSavePayload,
      handler: (ctx) => {
        const ifMatch = ctx.req.headers['if-match'];
        if (typeof ifMatch !== 'string' || ifMatch.length === 0)
          throw new HttpProblem({ status: 409, code: 'ETAG_MISMATCH', detail: 'If-Match is required' });

        const playerId = ctx.params.playerId!;
        const payload = ctx.body as { state: GameState };

        return transact(db, () => {
          const row = readSave(db, playerId);
          // `*` нь ЗӨВХӨН анхны бичилтэд; мөр байгаа бол зөрчил (lld.md §6.4).
          if (ifMatch === '*') {
            if (row !== null) throw etagMismatch();
          } else if (row === null || row.etag !== ifMatch) {
            throw etagMismatch();
          }

          if (row !== null) snapshot(db, playerId, row.stateJson, row.schemaVersion, 'put', now());
          const written = writeSave(db, playerId, payload.state, now());
          return {
            status: 200,
            headers: { etag: written.etag },
            body: { updatedAt: written.updatedAt, etag: written.etag },
          };
        });
      },
    },

    {
      method: 'POST',
      pattern: '/api/players/:playerId/actions',
      auth: true,
      validate: validateActionBatch,
      handler: (ctx): Reply => {
        if (!content.ok) throw contentUnavailable(content.reason);
        const ifMatch = ctx.req.headers['if-match'];
        const { actions } = ctx.body as { actions: Action[] };
        const outcome = runBatch(
          db,
          ctx.params.playerId!,
          actions,
          content.pack,
          now(),
          typeof ifMatch === 'string' ? ifMatch : undefined,
        );
        return {
          status: 200,
          headers: outcome.etag ? { etag: outcome.etag } : {},
          body: {
            state: outcome.state,
            results: outcome.results,
            updatedAt: outcome.updatedAt,
            etag: outcome.etag,
          },
        };
      },
    },

    {
      method: 'GET',
      pattern: '/api/players/:playerId/save/history',
      auth: true,
      handler: (ctx) => ({ status: 200, body: { snapshots: listSnapshots(db, ctx.params.playerId!) } }),
    },

    {
      method: 'POST',
      pattern: '/api/players/:playerId/save/restore',
      auth: true,
      validate: validateRestoreRequest,
      handler: (ctx) => {
        const playerId = ctx.params.playerId!;
        const { snapshotId } = ctx.body as { snapshotId: string };

        return transact(db, () => {
          const snap = readSnapshot(db, playerId, snapshotId);
          if (snap === null) throw notFound('no such snapshot');

          // Сэргээлт ӨӨРӨӨ буцаагдах боломжтой байх ёстой (lld.md §6.8).
          const current = readSave(db, playerId);
          if (current !== null)
            snapshot(db, playerId, current.stateJson, current.schemaVersion, 'restore', now());

          const state = JSON.parse(snap.stateJson) as GameState;
          const written = writeSave(db, playerId, state, now());
          return {
            status: 200,
            headers: { etag: written.etag },
            body: { updatedAt: written.updatedAt, etag: written.etag },
          };
        });
      },
    },

    {
      method: 'POST',
      pattern: '/api/players/:playerId/transfer-code',
      auth: true,
      handler: (ctx) => {
        const playerId = ctx.params.playerId!;
        const code = newTransferCode();
        const issuedAt = now();
        const expiresAt = new Date(Date.parse(issuedAt) + TRANSFER_TTL_MS).toISOString();

        transact(db, () => {
          // Нэг идэвхтэй код — хуучин ашиглаагүйг хүчингүй болгоно.
          db.prepare('DELETE FROM transfer_codes WHERE player_id = ? AND used_at IS NULL').run(playerId);
          db.prepare(
            'INSERT INTO transfer_codes (code_hash, player_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
          ).run(sha256(normalizeTransferCode(code)), playerId, issuedAt, expiresAt);
        });

        return { status: 201, body: { code, expiresAt } };
      },
    },

    {
      method: 'POST',
      pattern: '/api/transfer/redeem',
      auth: false,
      globalLimit: true,
      validate: validateRedeemRequest,
      handler: (ctx) => {
        const { code } = ctx.body as { code: string };
        const codeHash = sha256(normalizeTransferCode(code));

        return transact(db, () => {
          const row = db
            .prepare('SELECT player_id, expires_at, used_at FROM transfer_codes WHERE code_hash = ?')
            .get(codeHash);

          // ⚠ Гурван бүтэлгүй тохиолдол ИЖИЛ 410 — кодын оршин тогтнол задрахгүй.
          if (!row || row.used_at !== null || String(row.expires_at) <= now()) throw transferCodeInvalid();

          const sourceId = String(row.player_id);
          const playerId = newPlayerId();
          const token = newToken();
          db.prepare('INSERT INTO players (player_id, token_hash, created_at) VALUES (?, ?, ?)').run(
            playerId,
            sha256(token),
            now(),
          );

          // Эх тоглогчийн save УСТАХГҮЙ — шилжүүлэг нь хуулбар.
          const source = readSave(db, sourceId);
          const state = source === null ? newGame() : (JSON.parse(source.stateJson) as GameState);
          writeSave(db, playerId, state, now());

          db.prepare('UPDATE transfer_codes SET used_at = ? WHERE code_hash = ?').run(now(), codeHash);

          // ⚠ Хариунд save-ийн АГУУЛГА орохгүй — зөвхөн шинэ таних тэмдэг.
          return { status: 201, body: { playerId, token } };
        });
      },
    },
  ];

  const matched = (route: Route, method: string, path: string): Record<string, string> | null => {
    if (route.method !== method) return null;
    const want = route.pattern.split('/');
    const got = path.split('/');
    if (want.length !== got.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < want.length; i++) {
      const w = want[i]!;
      if (w.startsWith(':')) params[w.slice(1)] = decodeURIComponent(got[i]!);
      else if (w !== got[i]) return null;
    }
    return params;
  };

  async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method ?? 'GET';

    res.setHeader('x-request-id', requestId);

    let status = 500;
    let routePattern = 'unmatched';

    try {
      const hit = routes.map((r) => ({ r, params: matched(r, method, path) })).find((x) => x.params !== null);
      if (!hit || hit.params === null) throw notFound('no such route');
      const route = hit.r;
      routePattern = route.pattern;

      // 3 — биеийн хязгаар (уншихаас ӨМНӨ таслана).
      const rawBody = await readBody(req);

      // 4 — нэргүй замын глобал хязгаар.
      if (route.globalLimit) {
        const retry = limiter.hit(GLOBAL_ANON_KEY, GLOBAL_ANON_LIMIT, Date.now());
        if (retry !== null) throw rateLimited(retry);
      }

      // 5 — JSON задлалт.
      let body: unknown;
      if (rawBody.length > 0) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          throw invalidBody([{ field: '/', message: 'body is not valid JSON' }]);
        }
      }

      const ctx: Ctx = { req, method, path, params: hit.params, query: url.searchParams, body, rawBody };

      // 6 — таних.
      if (route.auth) {
        const header = req.headers.authorization;
        if (typeof header !== 'string' || !header.startsWith('Bearer ')) throw unauthorized();
        const tokenHash = sha256(header.slice('Bearer '.length).trim());
        const player = db.prepare('SELECT player_id FROM players WHERE token_hash = ?').get(tokenHash);
        if (!player) throw unauthorized();
        ctx.playerId = String(player.player_id);
        ctx.tokenHash = tokenHash;

        // 7 — токен тутмын хязгаар (auth-ийн ДАРАА, түлхүүр нь token hash).
        const retry = limiter.hit(`token:${tokenHash}`, PER_TOKEN_LIMIT, Date.now());
        if (retry !== null) throw rateLimited(retry);

        // 8 — эзэмшил.
        if (ctx.params.playerId !== undefined && ctx.params.playerId !== ctx.playerId) throw forbidden();
      }

      // 9 — биеийн схем.
      if (route.validate) {
        const issues = route.validate(body ?? null);
        if (issues.length > 0) throw invalidBody(issues);
      }

      const reply = await route.handler(ctx);
      status = reply.status;
      send(res, reply.status, reply.body, reply.headers);
    } catch (error) {
      const { body, headers } = toProblem(error, path);
      status = body.status;
      if (!(error instanceof HttpProblem)) {
        log.error('unhandled', { requestId, route: routePattern, status });
      }
      send(res, body.status, body, { ...headers, 'content-type': PROBLEM_CONTENT_TYPE });
    } finally {
      // ⚠ PII-гүй: IP, user-agent, token, save агуулга ОРОХГҮЙ. playerId нь товчилсон.
      log.info('request', {
        requestId,
        method,
        route: routePattern,
        status,
        durMs: Date.now() - startedAt,
      });
    }
  }

  const server = http.createServer((req, res) => {
    void handle(req, res);
  });

  const sockets = new Set<import('node:net').Socket>();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  return {
    server,
    db,
    content,
    handle,
    listen(port: number, host = '127.0.0.1'): Promise<number> {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          const address = server.address();
          resolve(typeof address === 'object' && address ? address.port : port);
        });
      });
    },
    /** Graceful shutdown — идэвхтэй хүсэлт дуустал хүлээж, дараа DB хаана. */
    async close(): Promise<void> {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      for (const socket of sockets) socket.destroy();
      db.close();
    },
  };

  function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          // 1MB-аас давсан биеийг САНАХ ОЙД ачаалахгүй — шууд тасална.
          reject(bodyTooLarge());
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
}

function send(
  res: http.ServerResponse,
  status: number,
  body?: unknown,
  headers: Record<string, string> = {},
): void {
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  if (body === undefined || status === 304) {
    res.writeHead(status);
    res.end();
    return;
  }
  const text = JSON.stringify(body);
  if (!res.hasHeader('content-type')) res.setHeader('content-type', 'application/json');
  res.writeHead(status);
  res.end(text);
}

export { shortId };
