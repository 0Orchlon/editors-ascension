/** SQLite холболт (lld.md §6.2; AC BE-8). Нативе build шаардахгүй — Node-ийн суурин. */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runSchemaMigrations } from './migrations.ts';

export type Db = DatabaseSync;

export function openDb(file: string, at: string = new Date().toISOString()): Db {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  // WAL нь уншилт/бичилтийг зэрэгцүүлнэ; busy_timeout нь түр түгжээг дахин оролдоно.
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  runSchemaMigrations(db, at);
  return db;
}

/** `BEGIN IMMEDIATE` — бичих түгжээг шууд авна, эхний бичилт хүртэл хүлээхгүй. */
export function transact<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Хадгалалтын цэвэрлэгээ (plan.md P-10). Асах үед ба өдөрт нэг удаа.
 * Хугацаа нь ӨГӨГДӨНӨ — `Date.now()`-ийг дуудагч шийднэ, тест цагийг шахаж чадна.
 */
export function cleanupExpired(db: Db, now: string): { actions: number; codes: number } {
  const ms = Date.parse(now);
  const actionCutoff = new Date(ms - 90 * 86_400_000).toISOString();
  const codeCutoff = new Date(ms - 86_400_000).toISOString();

  const actions = db.prepare('DELETE FROM action_log WHERE applied_at < ?').run(actionCutoff);
  const codes = db.prepare('DELETE FROM transfer_codes WHERE expires_at < ?').run(codeCutoff);

  return { actions: Number(actions.changes), codes: Number(codes.changes) };
}
