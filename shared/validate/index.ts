/** Экспортлогдох validator-ууд (lld.md §5.1). Клиент ба сервер ИЖИЛ функцийг дуудна. */
import { arr, bool, int, num, obj, run, str, type Issue } from './dsl.ts';
import * as S from './schemas.ts';
import type { ActionType } from '../types/index.ts';

export type { Issue };
export { run };
export * as schemas from './schemas.ts';

export const validateGameState = (v: unknown): Issue[] => run(S.GameState, v);
export const validateSavePayload = (v: unknown): Issue[] => run(S.SavePayload, v);
export const validateContentPack = (v: unknown): Issue[] => run(S.ContentPack, v);
export const validateAction = (v: unknown): Issue[] => run(S.Action, v);
export const validateActionBatch = (v: unknown): Issue[] => run(S.ActionBatchRequest, v);
export const validateRestoreRequest = (v: unknown): Issue[] => run(S.RestoreRequest, v);
export const validateRedeemRequest = (v: unknown): Issue[] => run(S.RedeemRequest, v);
export const validateProblem = (v: unknown): Issue[] => run(S.Problem, v);

/**
 * Үйлдлийн `payload` нь контрактад нээлттэй объект — ХОЁР ДАХЬ шалгалт (lld.md §6.5).
 * Унавал 422 `INVALID_INPUT` (400 БИШ: бие нь контрактын хэлбэрт нийцсэн).
 */
const PAYLOADS = {
  claimQuest: obj({ questId: str({ min: 1 }), checkedConditions: arr(int({ min: 0 })) }),
  rest: obj({}),
  unlockSkill: obj({ skillId: str({ min: 1 }) }),
  dungeonAttempt: obj({ dungeonId: str({ min: 1 }), answers: arr(int({ min: 0 })) }),
  projectCreate: obj({ title: str({ min: 1, max: 120 }) }),
  projectMilestone: obj({ projectId: str({ min: 1 }), key: S.MilestoneKey }),
  projectUpdate: obj(
    {
      projectId: str({ min: 1 }),
      notes: str({ max: 4000 }),
      nextAction: str({ max: 500 }),
      evidenceRef: str({ max: 500 }),
      selfScore: int({ min: 0, max: 10 }),
    },
    { optional: ['notes', 'nextAction', 'evidenceRef', 'selfScore'] },
  ),
  // ⚠ `difficulty` нь СОНГОЛТТОЙ — v1.1.0-ийн офлайн дараалалд хадгалагдсан
  // үйлдэл серверт хожим хүрэхэд эвдрэхгүй (plan.md §13.1, BE-13).
  bossAttempt: obj(
    { bossId: str({ min: 1 }), scores: S.BossScores, difficulty: S.DifficultyTier },
    { optional: ['difficulty'] },
  ),
  rollDailyMission: obj({ date: str({ pattern: /^\d{4}-\d{2}-\d{2}$/ }) }),
  resolveEncounter: obj({ encounterId: str({ min: 1 }) }),
  updateSettings: obj(
    {
      reducedMotion: bool(),
      soundEnabled: bool(),
      colorBlindSafe: bool(),
      soundVolume: num({ min: 0, max: 1 }),
    },
    { optional: ['reducedMotion', 'soundEnabled', 'colorBlindSafe', 'soundVolume'] },
  ),
  // ── v1.2.0-ийн гурван шинэ action (plan.md P-7 · §13.1)
  prestigeMastery: obj({ tag: S.SkillTag }),
  respecTree: obj({ track: S.SkillTag }),
  /** ⚠ ЯГ 6 түлхүүртэй БҮТЭН объект — хэсэгчилсэн засвар БАЙХГҮЙ (plan.md P-25). */
  setCampLayout: obj({ slots: S.CampLayoutSlots }),
} satisfies Record<ActionType, unknown>;

export function validateActionPayload(type: ActionType, v: unknown): Issue[] {
  const schema = PAYLOADS[type];
  if (!schema) return [{ field: '/type', message: `unknown action type ${type}` }];
  return run(schema, v);
}
