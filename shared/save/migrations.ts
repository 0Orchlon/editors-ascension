/**
 * Migration бүртгэл (AC SV-1, plan.md P-6).
 *
 * Түлхүүр нь ЗОРИЛТОТ хувилбар: `MIGRATIONS[n]` нь `v(n-1) → v(n)` хөрвүүлнэ.
 * ⚠ Хоосон/дэмий migration бичихгүй — v2 гарах үед ЭНД нэмнэ.
 */
export type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Record<number, Migration> = {};

/** `from` хувилбараас `to` хүртэл дараалан хэрэглэнэ. Дутуу migration нь ПРОГРАМЫН алдаа. */
export function runMigrations(
  state: Record<string, unknown>,
  from: number,
  to: number,
  registry: Record<number, Migration> = MIGRATIONS,
): Record<string, unknown> {
  let cur = state;
  for (let v = from + 1; v <= to; v++) {
    const m = registry[v];
    if (!m) throw new Error(`missing migration to schemaVersion ${v}`);
    cur = { ...m(cur), schemaVersion: v };
  }
  return cur;
}
