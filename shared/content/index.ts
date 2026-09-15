/**
 * Контентын пакет угсрагч (lld.md §5.5).
 *
 * ⚠ ЗӨВХӨН өгөгдөл + угсралт. Дүрэм ЭНД байхгүй — дүрэм нь `shared/core/**`-д
 * (`architecture.test.ts` шалгана). Энэ хавтас нь `core`-ыг ИМПОРТЛОХГҮЙ.
 */
import type { ContentPack, DungeonDefinition, QuestDefinition } from '../types/index.ts';
import { fnv1a } from '../hash.ts';

import achievements from './achievements.json' with { type: 'json' };
import dungeons from './dungeons.json' with { type: 'json' };
import encounters from './encounters.json' with { type: 'json' };
import loot from './loot.json' with { type: 'json' };
import mainQuests from './mainQuests.json' with { type: 'json' };
import sideQuests from './sideQuests.json' with { type: 'json' };
import skills from './skills.json' with { type: 'json' };

export const CONTENT_VERSION = '1.0.0';

/**
 * Study Dungeon бүр өдрийн даалгаварт нэр дэвшихийн тулд `track:'dungeon'` quest
 * хэлбэрээр мөн харагдана (lld.md §5.4.6 — сонгогч нь `pack.quests`-ээс шүүнэ).
 * Хоёр газар гараар бичихийн оронд dungeon-оос ГАРГАЖ авна — нэг эх сурвалж.
 */
type DungeonSource = DungeonDefinition & { world: number; levelRequired: number };

function questForDungeon(d: DungeonSource): QuestDefinition {
  return {
    id: d.id,
    track: 'dungeon',
    world: d.world,
    levelRequired: d.levelRequired,
    type: 'training',
    title: d.title,
    summary: d.conceptGoal,
    description: `Study dungeon: ${d.conceptGoal} Work through the linked material, then answer the mastery questions.`,
    estimatedMinutes: d.estimatedMinutes,
    staminaCost: 1,
    xp: d.xp,
    tags: d.tags,
    prerequisites: [],
    tutorialRefs: d.tutorialRefs,
    deliverables: ['Notes or a screenshot showing the concept applied once.'],
    victoryConditions: [
      'You worked through every linked tutorial for this dungeon.',
      'You answered the mastery questions without looking at the answers.',
    ],
    stretchGoals: ['Explain the concept out loud in two sentences without notes.'],
    reflectionPrompt: 'What part of this concept still feels shaky, and what will you try next?',
    repeatable: false,
  } as QuestDefinition;
}

export function buildPack(): ContentPack {
  const dungeonDefs = dungeons as unknown as DungeonSource[];
  return {
    version: CONTENT_VERSION,
    quests: [
      ...(mainQuests as unknown as QuestDefinition[]),
      ...(sideQuests as unknown as QuestDefinition[]),
      ...dungeonDefs.map(questForDungeon),
    ],
    dungeons: dungeonDefs.map(({ world: _w, levelRequired: _l, ...rest }) => rest) as DungeonDefinition[],
    skills: skills as unknown as ContentPack['skills'],
    achievements: achievements as unknown as ContentPack['achievements'],
    encounters: encounters as unknown as ContentPack['encounters'],
    loot: loot as unknown as ContentPack['loot'],
  };
}

/** Түлхүүр эрэмбэлсэн, зайгүй JSON — форматлалт, файлын дарааллаас ХАМААРАХГҮЙ. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** `/content/pack`-ийн ETag ба `/health`-ийн `contentVersion` хоёулаа ЭНЭ утгыг ашиглана. */
export function contentVersion(pack: ContentPack): string {
  return fnv1a(canonicalJson(pack)).toString(16);
}
