/**
 * Дугаарласан schema migration (lld.md §6.2; AC BE-16).
 *
 * ⚠ Гараар `CREATE TABLE` дуудахгүй — схем нь ЗӨВХӨН энэ жагсаалтаар үүснэ.
 * Шинэ өөрчлөлт нь ШИНЭ дугаар нэмнэ, хуучныг засахгүй (нийтлэгдсэн DB-д аль хэдийн
 * хэрэглэгдсэн байна).
 */
import type { DatabaseSync } from 'node:sqlite';

export type SchemaMigration = { version: number; sql: string };

export const MIGRATIONS: SchemaMigration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE players (
        player_id   TEXT PRIMARY KEY,
        token_hash  TEXT NOT NULL UNIQUE,
        created_at  TEXT NOT NULL
      );
      CREATE TABLE saves (
        player_id      TEXT PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
        schema_version INTEGER NOT NULL,
        state_json     TEXT NOT NULL,
        updated_at     TEXT NOT NULL,
        etag           TEXT NOT NULL
      );
      CREATE TABLE save_snapshots (
        snapshot_id    TEXT PRIMARY KEY,
        player_id      TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
        schema_version INTEGER NOT NULL,
        state_json     TEXT NOT NULL,
        created_at     TEXT NOT NULL,
        reason         TEXT NOT NULL CHECK (reason IN ('put','actions','restore'))
      );
      CREATE INDEX ix_snapshots_player ON save_snapshots(player_id, created_at DESC);
      CREATE TABLE action_log (
        player_id   TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
        action_id   TEXT NOT NULL,
        applied_at  TEXT NOT NULL,
        events_json TEXT NOT NULL,
        PRIMARY KEY (player_id, action_id)
      );
      CREATE INDEX ix_action_log_age ON action_log(applied_at);
      CREATE TABLE transfer_codes (
        code_hash  TEXT PRIMARY KEY,
        player_id  TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at    TEXT
      );
      CREATE INDEX ix_transfer_player ON transfer_codes(player_id);
    `,
  },
];

/** Хэрэглэгдээгүй migration-уудыг дарааллаар нь ажиллуулна. Дахин дуудахад аюулгүй. */
export function runSchemaMigrations(db: DatabaseSync, at: string): number[] {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');

  const done = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => Number(r.version)),
  );
  const applied: number[] = [];

  for (const migration of [...MIGRATIONS].sort((a, b) => a.version - b.version)) {
    if (done.has(migration.version)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        at,
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    applied.push(migration.version);
  }

  return applied;
}
