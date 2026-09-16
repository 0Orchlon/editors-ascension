/**
 * Амжилтын предикат үнэлгээ (lld.md §5.4.8; AC ACH-1, RET-7).
 *
 * ⚠ v1.2.0-д 5 шинэ `kind` нэмэгдэв (plan.md P-23). Заавал биш `ref` нь «аль guild /
 * аль boss / аль track» гэдгийг заана; БАЙХГҮЙ бол «ДУРЫН НЭГ» гэсэн утгатай —
 * бүх track/guild/boss-ийн нийлбэр БИШ.
 * ⚠ Хувийн дээд амжилт нь хоёр difficulty-гийн НЭГДСЭН багц дээрх max (P-23):
 * `total` нь хоёуланд нь ижил 0..60 хуваарьтай тул харьцуулах боломжтой.
 */
import type { AchievementDefinition, ContentPack, DomainEvent, GameState } from '../types/index.ts';
import { rankOf } from './reputation.ts';

/** `bossTier` предикатын эрэмбэ — тэнцүү БИШ, «доогуур биш» гэсэн утгатай. */
const TIER_RANK = { failed: 0, mvp: 1, advanced: 2, mastery: 3 } as const;

function satisfied(state: GameState, def: AchievementDefinition): boolean {
  const { kind, value, ref } = def.predicate;

  if (kind === 'bossTier') {
    const needed = TIER_RANK[value as keyof typeof TIER_RANK];
    if (needed === undefined) return false;
    return state.bossAttempts.some((a) => TIER_RANK[a.tier] >= needed);
  }

  const threshold = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(threshold)) return false;

  switch (kind) {
    case 'masteryLevel': {
      const tracks = Object.values(state.mastery).filter((t) => ref === undefined || t.tag === ref);
      return tracks.some((t) => t.level >= threshold);
    }
    case 'prestigeCount': {
      const tracks = Object.values(state.mastery).filter((t) => ref === undefined || t.tag === ref);
      return tracks.some((t) => t.prestigeCount >= threshold);
    }
    case 'guildRank': {
      const values = Object.entries(state.reputation)
        .filter(([id]) => ref === undefined || id === ref)
        .map(([, rep]) => rep);
      return values.some((rep) => rankOf(rep) >= threshold);
    }
    case 'bossPersonalBest': {
      // ⚠ Хоёр difficulty НЭГДСЭН — `hard`-аар авсан өндөр оноо мөн тоологдоно.
      const attempts = state.bossAttempts.filter((a) => ref === undefined || a.bossId === ref);
      return attempts.some((a) => a.total >= threshold);
    }
    case 'chainsCompleted':
      return state.completedChainIds.length >= threshold;
    case 'level':
      return state.level >= threshold;
    case 'totalXp':
      return state.xp >= threshold;
    case 'mainQuestsCompleted':
      return state.completedMainQuestIds.length >= threshold;
    case 'sideQuestCompletions':
      return (
        Object.values(state.sideQuestStats).reduce((sum, s) => sum + s.completions, 0) >= threshold
      );
    case 'dungeonsCompleted':
      return state.completedDungeonIds.length >= threshold;
    case 'projectsCompleted':
      return state.projects.filter((p) => p.completedAt).length >= threshold;
    case 'streakDays':
      return state.streak.best >= threshold;
    default:
      return false;
  }
}

/**
 * Төлөв өөрчлөгдөх бүрд ажиллана. Аль хэдийн эзэмшсэн id дахин олгогдохгүй —
 * `ACHIEVEMENT_UNLOCKED` нэг л удаа гарна (AC ACH-1).
 */
export function evaluateAchievements(
  state: GameState,
  pack: ContentPack,
): { ids: string[]; events: DomainEvent[] } {
  const ids: string[] = [];
  const events: DomainEvent[] = [];

  for (const def of pack.achievements) {
    if (state.achievementIds.includes(def.id)) continue;
    if (!satisfied(state, def)) continue;
    ids.push(def.id);
    events.push({
      type: 'ACHIEVEMENT_UNLOCKED',
      data: { achievementId: def.id, title: def.title },
    });
  }

  return { ids, events };
}
