/**
 * Офлайн үйлдлийн дараалал (lld.md §7.6; AC BE-7, BE-12).
 *
 * ⚠ `actionId` нь дарааллын түлхүүр — давтан илгээхэд сервер `replayed` гэж хариулж
 * XP давхарлахгүй. Тиймээс амжилттай илгээхээс ӨМНӨ элемент хасагдахгүй.
 */
import type { Action } from '@shared/types/index.ts';
import type { Storage } from './persistence.ts';

export const QUEUE_KEY = 'ea.queue.v1';
/** Нэг хүсэлтэд явуулах дээд хэмжээ — контрактын `ActionBatchRequest` 50-аар тасалсан. */
export const MAX_BATCH = 50;

export function createActionQueue(storage: Storage) {
  const read = (): Action[] => {
    const raw = storage.getItem(QUEUE_KEY);
    if (raw === null) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Action[]) : [];
    } catch {
      // Гэмтсэн дараалал нь апп-ыг зогсоохгүй — хоосон гэж үзнэ.
      return [];
    }
  };

  const write = (actions: Action[]): void => storage.setItem(QUEUE_KEY, JSON.stringify(actions));

  return {
    enqueue(action: Action): void {
      const actions = read();
      // Ижил actionId хоёр удаа дараалалд орохгүй.
      if (actions.some((a) => a.actionId === action.actionId)) return;
      actions.push(action);
      write(actions);
    },
    peekAll: read,
    peekBatch: (): Action[] => read().slice(0, MAX_BATCH),
    dropUpTo(actionIds: string[]): void {
      const done = new Set(actionIds);
      write(read().filter((a) => !done.has(a.actionId)));
    },
    clear(): void {
      write([]);
    },
    size: (): number => read().length,
  };
}

export type ActionQueue = ReturnType<typeof createActionQueue>;
