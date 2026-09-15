/** Санамсаргүй тохиолдол (lld.md §5.4.7; AC ENC-1, ENC-2). */
import type { DomainEvent, EncounterDefinition, GameState } from '../types/index.ts';
import { ENCOUNTER_CHANCE } from './constants.ts';
import { ok, reject, type Ctx, type DomainResult } from './result.ts';
import { weightedPick } from './rng.ts';

/** Тохиолдол шийдвэрлэсний cosmetic шагнал (A-LLD-2 — эх шаардлагад заагаагүй). */
const ENCOUNTER_COINS = 3;

/**
 * Нэг дуудалтад ХАМГИЙН ИХДЭЭ нэг тохиолдол (AC ENC-2). RNG-г яг хоёр удаа хэрэглэнэ:
 * гарах эсэх → аль нь. Гарахгүй үед ч хоёр дахь дуудалт хийхгүй — дараалал тогтвортой.
 */
export function maybeEncounter(_state: GameState, ctx: Ctx): DomainEvent[] {
  if (ctx.rng() >= ENCOUNTER_CHANCE) return [];

  const roll = ctx.rng();
  const picked = weightedPick<EncounterDefinition>(ctx.pack.encounters, (e) => e.weight, roll);
  if (!picked) return [];

  return [
    {
      type: 'ENCOUNTER_TRIGGERED',
      data: {
        encounterId: picked.id,
        title: picked.title,
        body: picked.body,
        callToAction: picked.callToAction,
      },
    },
  ];
}

/** Тоглогч тохиолдлыг хаах — cosmetic coin, XP/stamina ХӨНДӨХГҮЙ (AC EC-1). */
export function resolveEncounter(state: GameState, encounterId: string, ctx: Ctx): DomainResult {
  const found = ctx.pack.encounters.find((e) => e.id === encounterId);
  if (!found) return reject('INVALID_INPUT', `unknown encounter ${encounterId}`);

  return ok({ ...state, coins: state.coins + ENCOUNTER_COINS }, [
    { type: 'COINS_GAINED', data: { amount: ENCOUNTER_COINS } },
  ]);
}
