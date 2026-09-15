/**
 * Детерминистик санамсаргүй (plan.md P-5). `Math.random()` ХЭЗЭЭ Ч ашиглахгүй —
 * idempotent давталт өөр loot өгвөл `replayed`-ийн баталгаа эвдэрнэ (lld.md §6.6).
 */

/** mulberry32 — 32-бит seed-ээс [0,1) дараалал. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `shared/hash.ts`-ээс дахин экспортлов — контент ба домэйн ижил hash хэрэглэнэ. */
export { fnv1a } from '../hash.ts';

/**
 * Жигнэсэн сонголт. Каталогийг `id`-аар эрэмбэлнэ — файлын дарааллаас ХАМААРАХГҮЙ,
 * тиймээс ижил seed = ижил гаралт (AC ENC-2, EC-2).
 */
export function weightedPick<T extends { id: string }>(
  items: readonly T[],
  weightOf: (item: T) => number,
  roll: number,
): T | null {
  const pool = [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const total = pool.reduce((sum, it) => sum + weightOf(it), 0);
  if (pool.length === 0 || total <= 0) return null;
  let cursor = roll * total;
  for (const item of pool) {
    cursor -= weightOf(item);
    if (cursor < 0) return item;
  }
  return pool[pool.length - 1] ?? null;
}
