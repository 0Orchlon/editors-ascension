/** Export / import ба гэмтэл сэргээлт (lld.md §5.3; AC SV-1, SV-2, SV-4, SV-5). */
import type { GameState } from '../types/index.ts';
import { runMigrations, type Migration } from '../save/migrations.ts';
import { loadState, newGame, toPayload, type LoadResult } from '../save/serialize.ts';
import { validateGameState } from '../validate/index.ts';
import { CURRENT_SCHEMA_VERSION } from '../save/version.ts';
import { fnv1a } from './rng.ts';

/** Хүн уншиж чадахаар — тоглогч өөрийн save-аа нээж хараад итгэх боломжтой (AC SV-4). */
export function exportSave(state: GameState, at: string): string {
  return JSON.stringify(toPayload(state, at), null, 2);
}

/**
 * Файл эсвэл текстээс save уншина. Татгалзвал дуудагч ОДООГИЙН төлвөө хэвээр
 * үлдээнэ — `LoadResult` нь `state` буцаахгүй (AC SV-5).
 */
export function importSave(
  text: string,
  registry?: Record<number, Migration>,
  targetVersion: number = CURRENT_SCHEMA_VERSION,
): LoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse' };
  }

  // Тестийн/ирээдүйн зорилтот хувилбар — үндсэн замд `CURRENT_SCHEMA_VERSION`.
  if (targetVersion !== CURRENT_SCHEMA_VERSION) return loadAtVersion(raw, targetVersion, registry);
  return loadState(raw, registry);
}

/** `loadState`-ийн хувилбар — зорилтот схемийн дугаарыг гаднаас авна (migration тест). */
function loadAtVersion(
  raw: unknown,
  targetVersion: number,
  registry?: Record<number, Migration>,
): LoadResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, reason: 'parse' };
  const box = raw as Record<string, unknown>;
  const inner =
    typeof box.state === 'object' && box.state !== null ? (box.state as Record<string, unknown>) : box;

  const version = typeof inner.schemaVersion === 'number' ? inner.schemaVersion : undefined;
  if (version === undefined || !Number.isInteger(version) || version < 1) return { ok: false, reason: 'parse' };
  if (version > targetVersion) return { ok: false, reason: 'too-new' };

  const migrated = version < targetVersion ? runMigrations(inner, version, targetVersion, registry) : inner;

  // Migration-ийн дараа схем нь ирээдүйн хувилбарынх — зөвхөн одоогийнхыг шалгана.
  if (targetVersion === CURRENT_SCHEMA_VERSION) {
    const issues = validateGameState(migrated);
    if (issues.length) return { ok: false, reason: 'schema', issues };
  }

  const result: LoadResult = { ok: true, state: migrated as unknown as GameState };
  if (version < targetVersion) result.migratedFrom = version;
  return result;
}

export type BootResult = {
  state: GameState;
  outcome: 'loaded' | 'migrated' | 'new' | 'recovered';
  /** Гэмтсэн түүхий байт — дуудагч тусад нь хадгалж, ЗӨВХӨН дараа нь дарж бичнэ (AC SV-2). */
  corruptPayload?: string;
  corruptKey?: string;
};

/**
 * Апп асахад дуудагдана. Гэмтсэн save нь апп-ыг УНАГААХГҮЙ: хуучин байтыг
 * `save.corrupt.<hash>` түлхүүрт хадгалахаар буцааж, шинэ тоглоом эхлүүлнэ (AC SV-2).
 */
export function loadOrNewGame(raw: string | null, registry?: Record<number, Migration>): BootResult {
  if (raw === null || raw.trim() === '') return { state: newGame(), outcome: 'new' };

  const result = importSave(raw, registry);
  if (result.ok)
    return {
      state: result.state,
      outcome: result.migratedFrom === undefined ? 'loaded' : 'migrated',
    };

  return {
    state: newGame(),
    outcome: 'recovered',
    corruptPayload: raw,
    // Түлхүүр нь агуулгаас гаралтай — `Date.now()` домэйнд хориотой (plan.md P-5).
    corruptKey: `save.corrupt.${fnv1a(raw).toString(16)}`,
  };
}
