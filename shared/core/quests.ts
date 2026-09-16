/** Quest claim хөдөлгүүр (lld.md §5.4.3; AC MQ-3…6, PRG-6, D-1, D-2). */
import type { DomainEvent, GameState, QuestDefinition } from '../types/index.ts';
import { evaluateAchievements } from './achievements.ts';
import { evaluateChains } from './chains.ts';
import { addMasteryXp } from './mastery.ts';
import { grantReputation, type RepTrack } from './reputation.ts';
import { applyRewards, rollRewards } from './economy.ts';
import { maybeEncounter } from './encounters.ts';
import { addXp } from './progression.ts';
import { ok, reject, type Ctx, type DomainResult } from './result.ts';
import { sideQuestXp } from './sideQuests.ts';
import { spendStamina } from './stamina.ts';
import { qualifyDay } from './streak.ts';

export type ClaimInput = { questId: string; checkedConditions: number[] };

/** `victoryConditions`-ийн БҮХ индекс тэмдэглэгдсэн эсэх (AC MQ-6). */
function checklistComplete(quest: QuestDefinition, checked: number[]): boolean {
  const needed = quest.victoryConditions.length;
  const marked = new Set(checked.filter((i) => Number.isInteger(i) && i >= 0 && i < needed));
  return marked.size === needed && checked.every((i) => Number.isInteger(i) && i >= 0 && i < needed);
}

/**
 * Quest-ийг ил claim хийнэ — автоматаар дуусгахгүй (AC MQ-6).
 *
 * ⚠ Шалгах ДАРААЛАЛ нь гэрээ (lld.md §5.4.3): бүтцийн саад (түвшин, урьдчилсан нөхцөл,
 * checklist) нь нөөцийн саадаас (stamina) ӨМНӨ гарна — тоглогч хоёр удаа татгалзалт
 * уншихгүй.
 */
export function claimQuest(state: GameState, input: ClaimInput, ctx: Ctx): DomainResult {
  const quest = ctx.pack.quests.find((q) => q.id === input.questId);
  if (!quest) return reject('INVALID_INPUT', `unknown quest ${input.questId}`);
  if (quest.track === 'boss' || quest.track === 'raid')
    return reject('INVALID_INPUT', 'boss and raid tracks are claimed through bossAttempt');

  if (quest.levelRequired > state.level) return reject('LEVEL_TOO_LOW');
  if (!quest.prerequisites.every((p) => state.completedMainQuestIds.includes(p)))
    return reject('PREREQ_NOT_MET');

  const priorCompletions = state.sideQuestStats[quest.id]?.completions ?? 0;
  if (quest.track === 'main' && state.completedMainQuestIds.includes(quest.id))
    return reject('ALREADY_COMPLETED');
  if (quest.track === 'dungeon' && state.completedDungeonIds.includes(quest.id))
    return reject('ALREADY_COMPLETED');
  if (quest.track === 'side' && !quest.repeatable && priorCompletions > 0)
    return reject('NOT_REPEATABLE');

  if (!checklistComplete(quest, input.checkedConditions))
    return reject('INVALID_INPUT', 'every victory condition must be checked before claiming');

  // 1 — stamina (цорын ганц үлдсэн татгалзал).
  const spent = spendStamina(state, quest.staminaCost);
  if (!spent.ok) return spent;
  const events: DomainEvent[] = [...spent.events];
  let next = spent.state;

  // 2-3 — XP.
  const xpAward =
    quest.track === 'side'
      ? sideQuestXp(quest.xp, priorCompletions + 1, quest.repeatXpMultiplier)
      : quest.xp;
  const awarded = addXp(next, xpAward);
  if (!awarded.ok) return awarded;
  next = awarded.state;
  events.push(...awarded.events);

  // 3a — mastery roll-up. ⚠ ОЛГОГДСОН XP очно (plan.md P-17), контентын суурь XP БИШ:
  // давталтад суурь XP өгвөл mastery нь SQ-4-ийн anti-grind таазыг тойрч гарна.
  // ⚠ Байрлал нь амжилтын үнэлгээнээс ӨМНӨ — эс бөгөөс `masteryLevel` предикаттай
  // амжилт нэг үйлдэл ХОЦРОЖ олгогдоно (plan.md §13.2).
  const mastery = addMasteryXp(next, quest.tags, xpAward);
  next = mastery.state;
  events.push(...mastery.events);

  // 4 — бүртгэл.
  if (quest.track === 'main') {
    next = { ...next, completedMainQuestIds: [...next.completedMainQuestIds, quest.id] };
    events.push({ type: 'QUEST_COMPLETED', data: { questId: quest.id, title: quest.title } });
  } else if (quest.track === 'dungeon') {
    next = { ...next, completedDungeonIds: [...next.completedDungeonIds, quest.id] };
    events.push({ type: 'QUEST_COMPLETED', data: { questId: quest.id, title: quest.title } });
  } else {
    next = {
      ...next,
      sideQuestStats: {
        ...next.sideQuestStats,
        [quest.id]: { completions: priorCompletions + 1, lastCompletedAt: ctx.at },
      },
    };
    events.push({
      type: 'SIDE_QUEST_COMPLETED',
      data: { questId: quest.id, title: quest.title, completions: priorCompletions + 1 },
    });
  }

  // 4a — guild reputation (амжилтын үнэлгээнээс ӨМНӨ — plan.md §13.2).
  const completionIndex = quest.track === 'side' ? priorCompletions + 1 : 1;
  const reputation = grantReputation(
    next,
    quest.tags,
    quest.track as RepTrack,
    completionIndex,
    ctx.pack,
    quest.repeatXpMultiplier,
  );
  next = reputation.state;
  events.push(...reputation.events);

  // 4b — side quest chain. Дараалал нь `sideQuestStats`-аас гаргагдана (plan.md P-21)
  // тул ДЭЭРХ бүртгэлийн ДАРАА дуудагдах ёстой.
  const chains = evaluateChains(next, ctx.pack);
  next = chains.state;
  events.push(...chains.events);

  // 5 — streak ба combo.
  const day = qualifyDay(next, ctx.at);
  next = { ...next, streak: day.streak, combo: day.combo };
  events.push(...day.events);

  // 6 — cosmetic шагнал (coins, loot).
  const rewards = rollRewards(next, ctx);
  next = applyRewards(next, rewards);
  events.push(...rewards.events);

  // 7 — санамсаргүй тохиолдол, хамгийн ихдээ нэг (AC ENC-2).
  events.push(...maybeEncounter(next, ctx));

  // 8 — амжилт (эцсийн төлөв дээр).
  const earned = evaluateAchievements(next, ctx.pack);
  if (earned.ids.length) {
    next = { ...next, achievementIds: [...next.achievementIds, ...earned.ids] };
    events.push(...earned.events);
  }

  return ok(next, events);
}
