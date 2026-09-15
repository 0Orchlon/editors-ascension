/** Өдрийн даалгавар сонгогч (lld.md §5.4.6; AC DM-1, DM-2, DM-3). */
import type { ContentPack, GameState, QuestDefinition } from '../types/index.ts';
import { fnv1a } from './rng.ts';

/** Сонголтын эрэмбэ — main хамгийн түрүүнд (AC DM-3). */
const TIERS = ['main', 'dungeon', 'side'] as const;

function eligible(state: GameState, pack: ContentPack): QuestDefinition[] {
  return pack.quests.filter((q) => {
    if (q.track === 'boss' || q.track === 'raid') return false; // AC DM-2
    if (q.levelRequired > state.level) return false;
    if (!q.prerequisites.every((p) => state.completedMainQuestIds.includes(p))) return false;

    if (q.track === 'main') return !state.completedMainQuestIds.includes(q.id);
    if (q.track === 'dungeon') return !state.completedDungeonIds.includes(q.id);
    return q.repeatable || state.sideQuestStats[q.id] === undefined;
  });
}

/**
 * Детерминистик — ижил огноо + ижил төлөв = ижил гаралт (AC DM-1). `Math.random()`
 * ашиглахгүй: `fnv1a(date)`-ийн үлдэгдлээр индекс сонгоно.
 *
 * ⚠ «≥2 нэр дэвшигч» гэдгийг tier тус бүрээр БИШ, БҮХ нэр дэвшигчээр тоолно
 * (AC DM-2-ийн үг) — сүүлчийн боломжит даалгаврыг хасаж `null` буцаахгүй.
 */
export function pickDailyMission(state: GameState, date: string, pack: ContentPack): string | null {
  let pool = eligible(state, pack);

  const previous = state.dailyMission?.questId;
  if (pool.length >= 2 && previous !== undefined && pool.some((q) => q.id === previous))
    pool = pool.filter((q) => q.id !== previous);

  for (const tier of TIERS) {
    const tierPool = pool
      .filter((q) => q.track === tier)
      .sort((a, b) => a.world - b.world || a.levelRequired - b.levelRequired || (a.id < b.id ? -1 : 1));
    if (tierPool.length === 0) continue;
    return tierPool[fnv1a(date) % tierPool.length]!.id;
  }

  return null; // AC DM-3 — UI «Rest day» харуулна.
}
