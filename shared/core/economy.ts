/**
 * Coin ба loot (lld.md §5.4.7; AC EC-1, EC-2).
 *
 * ⚠ Cosmetic хил: `coins` ба `inventory` нь ЗӨВХӨН энэ модульд бичигдэнэ.
 * `progression` · `stamina` · `quests` · `dungeons` эдгээрийг ХӨНДӨХГҮЙ —
 * `architecture.test.ts` сканнердаж шалгана.
 */
import type { DomainEvent, GameState, LootItem } from '../types/index.ts';
import { LOOT_CHANCE } from './constants.ts';
import type { Ctx } from './result.ts';
import { weightedPick } from './rng.ts';

/** Ховордол → унах жин. Ховор зүйл бага тохиолдоно, гэхдээ бүгд cosmetic (AC EC-1). */
const RARITY_WEIGHT = { common: 60, rare: 25, epic: 12, legendary: 3 } as const;

export type Rewards = { coins: number; lootId: string | null; events: DomainEvent[] };

/**
 * Нэг claim-ийн шагнал. RNG-ийг ЯГ энэ дарааллаар хэрэглэнэ: coins → loot гарах эсэх →
 * аль item. Дараалал өөрчлөгдвөл ижил seed өөр үр дүн өгч `replayed`-ийн баталгаа эвдэрнэ.
 */
export function rollRewards(state: GameState, ctx: Ctx): Rewards {
  const coins = 5 + Math.floor(ctx.rng() * 6);
  const events: DomainEvent[] = [{ type: 'COINS_GAINED', data: { amount: coins } }];

  const wantsLoot = ctx.rng() < LOOT_CHANCE;
  const roll = ctx.rng();
  if (!wantsLoot) return { coins, lootId: null, events };

  // AC EC-2 — эзэмшсэн зүйл дахин унахгүй; бүгд эзэмшсэн бол loot гарахгүй.
  const available = ctx.pack.loot.filter((item) => !state.inventory.includes(item.id));
  const picked = weightedPick<LootItem>(available, (item) => RARITY_WEIGHT[item.rarity], roll);
  if (!picked) return { coins, lootId: null, events };

  events.push({
    type: 'LOOT_DROPPED',
    data: { lootId: picked.id, title: picked.title, rarity: picked.rarity },
  });
  return { coins, lootId: picked.id, events };
}

/** Шагналыг төлөвт буулгах цорын ганц бичигч (AC EC-1). */
export function applyRewards(state: GameState, rewards: Rewards): GameState {
  return {
    ...state,
    coins: state.coins + rewards.coins,
    inventory: rewards.lootId === null ? state.inventory : [...state.inventory, rewards.lootId],
  };
}
