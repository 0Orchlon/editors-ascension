/**
 * `contracts.yaml → ActionType` ба `shared/core`-ийн хоорондох ГАНЦ гүүр (lld.md §5.4.11).
 *
 * ⚠ Клиент, сервер ХОЁУЛАА энэ функцийг дуудна — дүрмийн ганц хувилбар (AC BE-10).
 * Шинэ `ActionType` нэмэхэд доорх `switch` нь `never` шалгалтаар typecheck-ийг УНАГААНА.
 */
import type { Action, ActionType, DomainEvent, GameState, MilestoneKey } from '../types/index.ts';
import { validateActionPayload } from '../validate/index.ts';
import { attemptBoss } from './boss.ts';
import { pickDailyMission } from './dailyMission.ts';
import { attemptDungeon } from './dungeons.ts';
import { resolveEncounter } from './encounters.ts';
import { unlockSkill } from './progression.ts';
import { completeMilestone, createProject, updateProject } from './projects.ts';
import { claimQuest } from './quests.ts';
import { ok, reject, type Ctx, type DomainResult } from './result.ts';
import { rest } from './stamina.ts';

const KNOWN_TYPES: readonly ActionType[] = [
  'claimQuest',
  'rest',
  'unlockSkill',
  'dungeonAttempt',
  'projectCreate',
  'projectMilestone',
  'projectUpdate',
  'bossAttempt',
  'rollDailyMission',
  'resolveEncounter',
  'updateSettings',
];

export function applyAction(state: GameState, action: Action, ctx: Ctx): DomainResult {
  if (!KNOWN_TYPES.includes(action.type))
    return reject('INVALID_INPUT', `unsupported action type ${action.type}`);

  // Хоёр дахь шалгалт: контрактын `payload` нээлттэй объект тул төрөл тус бүрээр (lld.md §6.5).
  const issues = validateActionPayload(action.type, action.payload ?? {});
  if (issues.length) return reject('INVALID_INPUT', issues.map((i) => `${i.field}: ${i.message}`).join('; '));

  const payload = (action.payload ?? {}) as Record<string, unknown>;
  // Үйлдэл нь өөрийн `at`-ыг авчирна — сервер ба клиент ижил цагаар тооцно.
  const actionCtx: Ctx = { ...ctx, at: action.at };

  switch (action.type) {
    case 'claimQuest':
      return claimQuest(
        state,
        { questId: String(payload.questId), checkedConditions: (payload.checkedConditions as number[]) ?? [] },
        actionCtx,
      );

    case 'rest':
      return rest(state);

    case 'unlockSkill':
      return unlockSkill(state, String(payload.skillId), actionCtx.pack);

    case 'dungeonAttempt':
      return attemptDungeon(
        state,
        { dungeonId: String(payload.dungeonId), answers: (payload.answers as number[]) ?? [] },
        actionCtx,
      );

    case 'projectCreate':
      return createProject(state, { title: String(payload.title) }, actionCtx);

    case 'projectMilestone':
      return completeMilestone(
        state,
        { projectId: String(payload.projectId), key: payload.key as MilestoneKey },
        actionCtx,
      );

    case 'projectUpdate':
      return updateProject(state, { ...payload, projectId: String(payload.projectId) }, actionCtx);

    case 'bossAttempt':
      return attemptBoss(
        state,
        { bossId: String(payload.bossId), scores: payload.scores as never },
        actionCtx,
      );

    case 'rollDailyMission': {
      const date = String(payload.date);
      const questId = pickDailyMission(state, date, actionCtx.pack);
      const dailyMission = questId === null ? null : { questId, date };
      const events: DomainEvent[] = [{ type: 'DAILY_MISSION_ROLLED', data: { questId, date } }];
      return ok({ ...state, dailyMission }, events);
    }

    case 'resolveEncounter':
      return resolveEncounter(state, String(payload.encounterId), actionCtx);

    case 'updateSettings': {
      // Зөвхөн ирсэн талбарыг солино — бусад тохиргоо хэвээр.
      const settings = {
        reducedMotion:
          typeof payload.reducedMotion === 'boolean' ? payload.reducedMotion : state.settings.reducedMotion,
        soundEnabled:
          typeof payload.soundEnabled === 'boolean' ? payload.soundEnabled : state.settings.soundEnabled,
      };
      return ok({ ...state, settings }, [{ type: 'SETTINGS_UPDATED', data: settings }]);
    }

    default: {
      // Шинэ `ActionType` нэмэхэд typecheck ЭНД унана — диспетчер дутуу үлдэхгүй.
      const exhaustive: never = action.type;
      return reject('INVALID_INPUT', `unsupported action type ${String(exhaustive)}`);
    }
  }
}
