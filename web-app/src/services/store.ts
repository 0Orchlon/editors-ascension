/** Жижиг pub/sub (lld.md §7.2). Төлөвийн сан НЭМЭХГҮЙ — 20 мөр хангалттай. */
export type Store<T> = {
  getState(): T;
  setState(next: T): void;
  subscribe(fn: (state: T) => void): () => void;
};

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T) => void>();

  return {
    getState: () => state,
    setState(next) {
      state = next;
      for (const listener of [...listeners]) listener(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
