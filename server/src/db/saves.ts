/** Save ба snapshot хадгалалт (lld.md §6.4, §6.8; AC BE-3, BE-13). */
import { createHash, randomUUID } from 'node:crypto';
import type { GameState } from '../../../shared/types/index.ts';
import type { Db } from './index.ts';

export type SaveRow = { stateJson: string; updatedAt: string; etag: string; schemaVersion: number };

export const etagFor = (stateJson: string): string =>
  `"${createHash('sha256').update(stateJson, 'utf8').digest('hex').slice(0, 16)}"`;

export function readSave(db: Db, playerId: string): SaveRow | null {
  const row = db
    .prepare('SELECT state_json, updated_at, etag, schema_version FROM saves WHERE player_id = ?')
    .get(playerId);
  if (!row) return null;
  return {
    stateJson: String(row.state_json),
    updatedAt: String(row.updated_at),
    etag: String(row.etag),
    schemaVersion: Number(row.schema_version),
  };
}

export function writeSave(db: Db, playerId: string, state: GameState, at: string): SaveRow {
  const stateJson = JSON.stringify(state);
  const etag = etagFor(stateJson);
  db.prepare(
    `INSERT INTO saves (player_id, schema_version, state_json, updated_at, etag)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET
       schema_version = excluded.schema_version,
       state_json     = excluded.state_json,
       updated_at     = excluded.updated_at,
       etag           = excluded.etag`,
  ).run(playerId, state.schemaVersion, stateJson, at, etag);
  return { stateJson, updatedAt: at, etag, schemaVersion: state.schemaVersion };
}

export type SnapshotReason = 'put' | 'actions' | 'restore';

/** Сүүлийн 10-ыг үлдээж хуучныг устгана (AC BE-13). */
export function snapshot(
  db: Db,
  playerId: string,
  stateJson: string,
  schemaVersion: number,
  reason: SnapshotReason,
  at: string,
): string {
  const snapshotId = randomUUID();
  db.prepare(
    `INSERT INTO save_snapshots (snapshot_id, player_id, schema_version, state_json, created_at, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(snapshotId, playerId, schemaVersion, stateJson, at, reason);
  trimSnapshots(db, playerId, 10);
  return snapshotId;
}

/**
 * ⚠ `ORDER BY created_at DESC, snapshot_id DESC` — нэг миллисекундэд хоёр snapshot
 * үүсвэл дараалал тодорхойгүй болж тест тогтворгүй болно.
 */
export function trimSnapshots(db: Db, playerId: string, keep = 10): void {
  db.prepare(
    `DELETE FROM save_snapshots
     WHERE player_id = ? AND snapshot_id NOT IN (
       SELECT snapshot_id FROM save_snapshots WHERE player_id = ?
       ORDER BY created_at DESC, snapshot_id DESC LIMIT ?
     )`,
  ).run(playerId, playerId, keep);
}

export function listSnapshots(db: Db, playerId: string) {
  return db
    .prepare(
      `SELECT snapshot_id, created_at, schema_version, reason FROM save_snapshots
       WHERE player_id = ? ORDER BY created_at DESC, snapshot_id DESC LIMIT 10`,
    )
    .all(playerId)
    .map((r) => ({
      snapshotId: String(r.snapshot_id),
      createdAt: String(r.created_at),
      schemaVersion: Number(r.schema_version),
      reason: String(r.reason) as SnapshotReason,
    }));
}

export function readSnapshot(db: Db, playerId: string, snapshotId: string) {
  const row = db
    .prepare('SELECT state_json, schema_version FROM save_snapshots WHERE snapshot_id = ? AND player_id = ?')
    .get(snapshotId, playerId);
  if (!row) return null;
  return { stateJson: String(row.state_json), schemaVersion: Number(row.schema_version) };
}
