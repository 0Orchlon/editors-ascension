/** Домэйн тестийн хуваалцсан fixture — контентоос ХАМААРАЛГҮЙ (T-08…T-15). */
import type { ContentPack, GameState, QuestDefinition } from '@shared/types/index.ts';
import type { Ctx } from '@shared/core/result.ts';
import { newGame } from '@shared/save/serialize.ts';

export const quest = (over: Partial<QuestDefinition>): QuestDefinition =>
  ({
    id: 'q',
    track: 'main',
    world: 1,
    levelRequired: 1,
    type: 'mission',
    title: 'Q',
    summary: 's',
    description: 'd',
    estimatedMinutes: 30,
    staminaCost: 2,
    xp: 50,
    tags: ['video-editing'],
    prerequisites: [],
    tutorialRefs: [],
    deliverables: ['d'],
    victoryConditions: ['v1', 'v2'],
    stretchGoals: ['s'],
    reflectionPrompt: 'r',
    repeatable: false,
    ...over,
  }) as QuestDefinition;

export const testPack = (over: Partial<ContentPack> = {}): ContentPack =>
  ({
    version: 'test',
    quests: [],
    dungeons: [],
    skills: [],
    achievements: [],
    encounters: [],
    loot: [],
    ...over,
  }) as unknown as ContentPack;

/** RNG-гүй ctx — тохиолдол ба loot ХЭЗЭЭ Ч гарахгүй тул шагнал тестэд саад болохгүй. */
export const quietCtx = (pack: ContentPack, at = '2026-03-10T09:00:00Z'): Ctx => ({
  pack,
  at,
  rng: () => 0.999,
});

/** Тогтсон дараалалтай RNG — хилийн утгыг яг заана. */
export const scriptedCtx = (pack: ContentPack, values: number[], at = '2026-03-10T09:00:00Z'): Ctx => {
  let i = 0;
  return { pack, at, rng: () => values[i++ % values.length]! };
};

export const freshState = (over: Partial<GameState> = {}): GameState => ({ ...newGame(), ...over });
