/**
 * RET-2 · RET-3 — side quest chain хөдөлгүүр (T-12; plan.md P-21 · §12.4).
 *
 * ⚠ Явцын ШИНЭ талбар БАЙХГҮЙ: дараалал нь `sideQuestStats[stepId].lastCompletedAt`-аас
 * ГАРГАГДАНА. Тиймээс тест нь тэр талбарыг шууд зохиож бүх дарааллыг шалгана.
 */
import { describe, expect, it } from 'vitest';
import { evaluateChains } from '@shared/core/chains.ts';
import type { ContentPack, GameState, SideQuestChain } from '@shared/types/index.ts';
import { freshState, quest, testPack } from './fixtures.ts';

const STEPS = ['sq-a', 'sq-b', 'sq-c', 'sq-d'] as const;

const chain = (over: Partial<SideQuestChain> = {}): SideQuestChain => ({
  id: 'chain-one',
  title: 'Chain One',
  world: 1,
  steps: [...STEPS],
  bonusXp: 40,
  ...over,
});

const packWith = (chains: SideQuestChain[]): ContentPack =>
  testPack({
    quests: [
      quest({ id: 'mq-w1', track: 'main', world: 1, xp: 60 }),
      ...STEPS.map((id) => quest({ id, track: 'side', world: 1, xp: 30, repeatable: true })),
    ],
    chains,
  });

/** `at` нь алхмын дарааллаар өсөх — RET-2-ийн «чанд дараалал»-ын хэвийн тохиолдол. */
const doneAt = (ids: readonly string[], days: readonly number[]): GameState['sideQuestStats'] =>
  Object.fromEntries(
    ids.map((id, i) => [
      id,
      { completions: 1, lastCompletedAt: `2026-03-${String(10 + days[i]!).padStart(2, '0')}T09:00:00Z` },
    ]),
  );

const withStats = (stats: GameState['sideQuestStats']): GameState => ({
  ...freshState(),
  sideQuestStats: stats,
});

describe('RET-2 — a chain completes only in strict order (T-12)', () => {
  it('awards the bonus once when all four steps were done in order', () => {
    const state = withStats(doneAt(STEPS, [0, 1, 2, 3]));
    const { state: next, events } = evaluateChains(state, packWith([chain()]));

    expect(next.completedChainIds).toEqual(['chain-one']);
    expect(next.xp).toBe(40);
    expect(events.filter((e) => e.type === 'CHAIN_COMPLETED')).toEqual([
      { type: 'CHAIN_COMPLETED', data: { chainId: 'chain-one', bonusXp: 40 } },
    ]);
  });

  it('accepts two steps finished on the same day — the order is not violated', () => {
    const state = withStats(doneAt(STEPS, [0, 0, 1, 1]));
    const { state: next } = evaluateChains(state, packWith([chain()]));
    expect(next.completedChainIds).toEqual(['chain-one']);
  });

  it('does not complete when a step is missing (1 → 2 → 4)', () => {
    const state = withStats(doneAt(['sq-a', 'sq-b', 'sq-d'], [0, 1, 2]));
    const { state: next, events } = evaluateChains(state, packWith([chain()]));
    expect(next.completedChainIds).toEqual([]);
    expect(events).toEqual([]);
    expect(next.xp).toBe(0);
  });

  it('does not complete when the steps were finished out of order', () => {
    // sq-c нь sq-b-ээс ӨМНӨ дууссан — дараалал зөрчигдсөн.
    const state = withStats(doneAt(STEPS, [0, 3, 1, 4]));
    const { state: next } = evaluateChains(state, packWith([chain()]));
    expect(next.completedChainIds).toEqual([]);
  });

  /** ⚠ Огноогүй бичлэг нь дарааллыг НОТЛОХ боломжгүй — бонус олгогдохгүй. */
  it('does not complete when a step has no completion timestamp', () => {
    const stats = doneAt(STEPS, [0, 1, 2, 3]);
    stats['sq-c'] = { completions: 1, lastCompletedAt: null };
    const { state: next } = evaluateChains(withStats(stats), packWith([chain()]));
    expect(next.completedChainIds).toEqual([]);
  });

  it('emits exactly one CHAIN_COMPLETED even if evaluated twice', () => {
    const pack = packWith([chain()]);
    const first = evaluateChains(withStats(doneAt(STEPS, [0, 1, 2, 3])), pack);
    const second = evaluateChains(first.state, pack);
    expect(first.events).toHaveLength(2); // XP_GAINED + CHAIN_COMPLETED
    expect(second.events).toEqual([]);
    expect(second.state.xp).toBe(40);
    expect(second.state.completedChainIds).toEqual(['chain-one']);
  });

  it('never awards the bonus again after the last step is repeated', () => {
    const pack = packWith([chain()]);
    const first = evaluateChains(withStats(doneAt(STEPS, [0, 1, 2, 3])), pack);
    const repeated: GameState = {
      ...first.state,
      sideQuestStats: {
        ...first.state.sideQuestStats,
        'sq-d': { completions: 2, lastCompletedAt: '2026-04-01T09:00:00Z' },
      },
    };
    const again = evaluateChains(repeated, pack);
    expect(again.state.xp).toBe(40);
    expect(again.events).toEqual([]);
  });

  it('completes several chains in one evaluation', () => {
    const other = chain({ id: 'chain-two', steps: ['sq-a', 'sq-b', 'sq-c', 'sq-d'], bonusXp: 10 });
    const state = withStats(doneAt(STEPS, [0, 1, 2, 3]));
    const { state: next } = evaluateChains(state, packWith([chain(), other]));
    expect(next.completedChainIds.sort()).toEqual(['chain-one', 'chain-two']);
    expect(next.xp).toBe(50);
  });

  it('never mutates the state it was handed', () => {
    const state = withStats(doneAt(STEPS, [0, 1, 2, 3]));
    evaluateChains(state, packWith([chain()]));
    expect(state.completedChainIds).toEqual([]);
    expect(state.xp).toBe(0);
  });

  it('is a no-op for a pack with no chains', () => {
    const state = withStats(doneAt(STEPS, [0, 1, 2, 3]));
    const { state: next, events } = evaluateChains(state, packWith([]));
    expect(next).toBe(state);
    expect(events).toEqual([]);
  });
});

describe('RET-3 — the bonus respects the world ceiling (T-12)', () => {
  it('refuses a bonus above the cheapest main quest of the chain world', () => {
    // ⚠ Контентын хаалга (`[C]` RET-3) нь үүнийг барина; домэйн нь ХОЁР ДАХЬ хамгаалалт:
    // хүчингүй пакет орж ирвэл bonus олгохоос татгалзана, чимээгүй хэтрүүлэхгүй.
    const state = withStats(doneAt(STEPS, [0, 1, 2, 3]));
    const { state: next, events } = evaluateChains(state, packWith([chain({ bonusXp: 500 })]));
    expect(next.completedChainIds).toEqual([]);
    expect(events).toEqual([]);
    expect(next.xp).toBe(0);
  });

  it('accepts a bonus exactly at the ceiling', () => {
    const state = withStats(doneAt(STEPS, [0, 1, 2, 3]));
    const { state: next } = evaluateChains(state, packWith([chain({ bonusXp: 60 })]));
    expect(next.completedChainIds).toEqual(['chain-one']);
    expect(next.xp).toBe(60);
  });

  it('refuses a chain whose world has no main quest to set a ceiling', () => {
    const state = withStats(doneAt(STEPS, [0, 1, 2, 3]));
    const { state: next } = evaluateChains(state, packWith([chain({ world: 5 })]));
    expect(next.completedChainIds).toEqual([]);
  });
});
