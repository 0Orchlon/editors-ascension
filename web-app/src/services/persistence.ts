/**
 * localStorage persistence (lld.md §7.5; AC SV-2, SV-3, SV-6).
 *
 * ⚠ Апп ХЭЗЭЭ Ч гэмтсэн save-аас болж унахгүй, БА гэмтсэн хуулбар УСТГАГДАХГҮЙ:
 * тоглогчийн ажлыг чимээгүй алдах нь энэ системийн хамгийн муу бүтэлгүйтэл.
 */
import { exportSave, loadOrNewGame } from '@shared/core/saves.ts';
import type { GameState } from '@shared/types/index.ts';

export const SAVE_KEY = 'ea.save.v1';
export const LAST_SAVED_KEY = 'ea.save.lastAt';
const DEBOUNCE_MS = 500;

export type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadOutcome = { state: GameState; warning?: string };

export function createPersistence(
  storage: Storage,
  now: () => string = () => new Date().toISOString(),
  debounceMs: number = DEBOUNCE_MS,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: GameState | null = null;
  let lastSaved: string | null = storage.getItem(LAST_SAVED_KEY);

  const writeNow = (state: GameState): void => {
    const at = now();
    storage.setItem(SAVE_KEY, exportSave(state, at));
    storage.setItem(LAST_SAVED_KEY, at);
    lastSaved = at;
  };

  return {
    load(): LoadOutcome {
      const raw = storage.getItem(SAVE_KEY);
      const result = loadOrNewGame(raw);

      if (result.outcome === 'recovered' && result.corruptPayload !== undefined) {
        // ⚠ Гэмтсэн байтыг ХАДГАЛНА — дарж бичих нь тоглогчийн ажлыг устгана.
        // ⚠ Түлхүүр нь аппын нэрийн оронд байх ЁСТОЙ — цэвэрлэгээ ба тест хоёулаа
        // `ea.save.corrupt.*`-аар хайдаг (lld.md §7.5).
        const backupKey = `ea.${result.corruptKey ?? `save.corrupt.${Date.now()}`}`;
        storage.setItem(backupKey, result.corruptPayload);
        storage.removeItem(SAVE_KEY);
        return {
          state: result.state,
          warning: 'Save could not be read. A backup copy was kept and a new game was started.',
        };
      }

      return { state: result.state };
    },

    /** 500ms trailing debounce — түлхүүр дарах болгонд бичихгүй (AC SV-6). */
    scheduleWrite(state: GameState): void {
      pending = state;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (pending !== null) writeNow(pending);
        pending = null;
      }, debounceMs);
    },

    /** `visibilitychange`/`pagehide` дээр — `beforeunload` нь мобайл дээр найдваргүй. */
    flush(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (pending !== null) {
        writeNow(pending);
        pending = null;
      }
    },

    lastSavedAt: (): string | null => lastSaved,
  };
}

export type Persistence = ReturnType<typeof createPersistence>;
