/**
 * Эрх бүхий үйлдлийн хөдөлгүүр (lld.md §6.6; AC BE-11, BE-12).
 *
 * ⚠ Домэйн дүрэм ЭНД БИЧИГДЭХГҮЙ — `shared/core/apply.ts`-ийг дуудна (AC BE-10).
 * Энэ файл нь ГАНЦ гүүр: транзакц, idempotency, snapshot.
 */
import { applyAction } from '../../../shared/core/apply.ts';
import { createRng } from '../../../shared/core/rng.ts';
import { fnv1a } from '../../../shared/hash.ts';
import { newGame } from '../../../shared/save/serialize.ts';
import { validateActionPayload } from '../../../shared/validate/index.ts';
import type { Action, ActionResult, ContentPack, DomainEvent, GameState } from '../../../shared/types/index.ts';
import { transact, type Db } from '../db/index.ts';
import { etagMismatch, domainRejection } from '../errors/problem.ts';
import { readSave, snapshot, writeSave } from '../db/saves.ts';

/** Клиентийн цаг зөрж болно, гэхдээ ирээдүй рүү 5 минутаас хол үйлдэл сэжигтэй. */
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

export type BatchOutcome = {
  state: GameState;
  results: ActionResult[];
  etag: string;
  updatedAt: string;
};

export function runBatch(
  db: Db,
  playerId: string,
  actions: Action[],
  pack: ContentPack,
  now: string,
  ifMatch?: string,
): BatchOutcome {
  return transact(db, () => {
    const row = readSave(db, playerId);
    if (ifMatch !== undefined && ifMatch !== '*' && row !== null && row.etag !== ifMatch)
      throw etagMismatch();

    const before = row === null ? newGame() : (JSON.parse(row.stateJson) as GameState);
    let state = before;
    const results: ActionResult[] = [];
    let appliedCount = 0;

    const priorStmt = db.prepare(
      'SELECT events_json FROM action_log WHERE player_id = ? AND action_id = ?',
    );
    const logStmt = db.prepare(
      'INSERT INTO action_log (player_id, action_id, applied_at, events_json) VALUES (?, ?, ?, ?)',
    );

    for (const action of actions) {
      // AC BE-12 — давтан илгээсэн үйлдэл домэйныг ДАХИН ажиллуулахгүй.
      const prior = priorStmt.get(playerId, action.actionId);
      if (prior) {
        results.push({
          actionId: action.actionId,
          status: 'replayed',
          events: JSON.parse(String(prior.events_json)) as DomainEvent[],
        });
        continue;
      }

      const issues = validateActionPayload(action.type, action.payload ?? {});
      if (issues.length > 0) throw domainRejection('INVALID_INPUT', action.actionId);

      if (Date.parse(action.at) - Date.parse(now) > MAX_CLOCK_SKEW_MS)
        throw domainRejection('INVALID_INPUT', action.actionId);

      // Seed нь клиентээс ирвэл клиент ба сервер ИЖИЛ loot гаргана; эс бөгөөс
      // `actionId`-аас гарсан тогтвортой утга — давтан илгээхэд ижил үр дүн.
      const seed = action.seed ?? fnv1a(action.actionId);
      const result = applyAction(state, action, { pack, at: action.at, rng: createRng(seed) });
      if (!result.ok) throw domainRejection(result.reason, action.actionId);

      state = result.state;
      logStmt.run(playerId, action.actionId, now, JSON.stringify(result.events));
      results.push({ actionId: action.actionId, status: 'applied', events: result.events });
      appliedCount++;
    }

    if (appliedCount === 0) {
      // Бүхэлдээ replayed — snapshot цонхыг хогоор дүүргэхгүй (lld.md §6.6).
      return {
        state: before,
        results,
        etag: row?.etag ?? '',
        updatedAt: row?.updatedAt ?? now,
      };
    }

    if (row !== null) snapshot(db, playerId, row.stateJson, row.schemaVersion, 'actions', now);
    const written = writeSave(db, playerId, state, now);

    return { state, results, etag: written.etag, updatedAt: written.updatedAt };
  });
}
