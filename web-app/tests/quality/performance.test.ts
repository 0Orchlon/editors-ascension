/**
 * Гүйцэтгэл — нэг үйлдлийн зардал контентын хэмжээнд ШУГАМАН (T-36; AC QX-6).
 *
 * ⚠ Хэмжигдэж буй зүйл: `claimQuest` → XP → mastery roll-up → reputation →
 * achievement үнэлгээ → daily mission. Эдгээр нь БҮГД контентын массивыг гүйдэг —
 * хэрэв аль нэг нь квадрат болвол (жишээ нь achievement бүрд quest бүрийг эргүүлбэл)
 * контент өсөхөд тоглоом чимээгүй удаашрах байв.
 * ⚠ Хугацаа нь машинаас хамаарна. Тиймээс ХАРЬЦАА-г шалгана (×10 пакет нь ×1-ээс
 * 10 дахин орчим удаан, квадрат бол ~100 дахин), нэмээд спекийн хатуу хязгаар ≤50ms.
 */
import { describe, expect, it } from 'vitest';
import { applyAction } from '@shared/core/apply.ts';
import { buildPack } from '@shared/content/index.ts';
import { createRng, fnv1a } from '@shared/core/rng.ts';
import { newGame } from '@shared/save/serialize.ts';
import type { Action, ContentPack, GameState } from '@shared/types/index.ts';

const base = buildPack();
const AT = '2026-03-10T09:00:00.000Z';
/** Спекийн хатуу хязгаар — нэг claim (AC QX-6). */
const CLAIM_BUDGET_MS = 50;
/**
 * ×10 контент дээрх зөвшөөрөгдөх удаашрал. ⚠ 10 биш 30: JIT-ийн дулаарал, GC,
 * тогтмол зардал нь бага пакет дээр харьцангуй ТОМ. Квадрат өсөлт (~100×) нь
 * энэ хилийг ЯМАР Ч ТОХИОЛДОЛД давна — тест нь дараалалын зэргийг барина.
 */
const LINEAR_BOUND = 30;

/** Контентыг `factor` дахин хуулбарлана — ижил хэлбэр, өөр id. */
function scalePack(pack: ContentPack, factor: number): ContentPack {
  const copies = <T extends { id: string }>(items: readonly T[]): T[] =>
    Array.from({ length: factor }, (_, n) =>
      n === 0 ? [...items] : items.map((item) => ({ ...item, id: `${item.id}-x${n}` })),
    ).flat();

  return {
    ...pack,
    // ⚠ `guilds` нь хуулбарлагдахгүй: tag → guild зураглалыг давхардуулах нь
    // хэмжээ биш ДҮРМИЙГ өөрчилнө (нэг tag хоёр guild-д очно).
    quests: copies(pack.quests),
    dungeons: copies(pack.dungeons),
    skills: copies(pack.skills),
    achievements: copies(pack.achievements),
    cosmetics: copies(pack.cosmetics),
    loot: copies(pack.loot),
    encounters: copies(pack.encounters),
  };
}

const claim = (questId: string, index: number, conditions: number): Action =>
  ({
    actionId: `perf-${index}`,
    type: 'claimQuest',
    at: AT,
    // ⚠ Бүх нөхцөл тэмдэглэгдсэн байх ЁСТОЙ (AC MQ-6) — дутуу бол татгалзана.
    payload: { questId, checkedConditions: Array.from({ length: conditions }, (_, i) => i) },
  }) as Action;

/** Нэг quest-ийг давтан claim хийж дундаж хугацааг мс-ээр буцаана. */
function timePerClaim(pack: ContentPack, runs: number): number {
  const quest = pack.quests.find((q) => q.track === 'side')!;
  // ⚠ `maxStamina` нь домэйн тогтмол (10) — түүнийг зөрчихгүй, оронд нь side quest
  // хямд (1 stamina) бөгөөд claim нь stamina-г сэргээдэггүй тул гүйлт бүрд
  // дүүргэсэн төлвөөс эхэлнэ.
  const state: GameState = { ...newGame(), level: 10, xp: 7500 };

  // Дулаарал — эхний гүйлт нь JIT-ийн зардлыг агуулна, хэмжилтэд оруулахгүй.
  const conditions = quest.victoryConditions.length;
  applyAction(state, claim(quest.id, -1, conditions), { pack, at: AT, rng: createRng(fnv1a('warm')) });

  const started = performance.now();
  let current = state;
  for (let i = 0; i < runs; i++) {
    // Stamina нь үйлдэл тутам буурдаг тул хэмжилт бүрд дүүрэн төлвөөс эхэлнэ —
    // хэмжигдэж буй зүйл нь `applyAction`-ийн зардал, нөөцийн хязгаар БИШ.
    const result = applyAction({ ...current, stamina: state.maxStamina }, claim(quest.id, i, conditions), {
      pack,
      at: AT,
      rng: createRng(fnv1a(`perf-${i}`)),
    });
    if (!result.ok) throw new Error(`claim rejected: ${result.reason}`);
    current = result.state;
  }
  return (performance.now() - started) / runs;
}

/** Хэмжилтийн шуугианыг багасгана — хамгийн богино гүйлт нь хамгийн цэвэр дохио. */
function bestOf(pack: ContentPack, runs: number, samples = 3): number {
  let best = Infinity;
  for (let i = 0; i < samples; i++) best = Math.min(best, timePerClaim(pack, runs));
  return best;
}

describe('QX-6 — one action stays linear in content size (T-36)', () => {
  it('scales the synthetic pack tenfold in every content array', () => {
    const big = scalePack(base, 10);
    expect(big.quests.length).toBe(base.quests.length * 10);
    expect(big.achievements.length).toBe(base.achievements.length * 10);
    expect(big.cosmetics.length).toBe(base.cosmetics.length * 10);
    // ⚠ Дүрмийн хэлбэр хэвээр: guild-ийн тоо өөрчлөгдөөгүй.
    expect(big.guilds.length).toBe(base.guilds.length);
  });

  it('costs no more than a linear multiple on the tenfold pack', () => {
    const small = bestOf(base, 40);
    const big = bestOf(scalePack(base, 10), 40);
    const ratio = big / Math.max(small, 0.001);
    expect(ratio, `×10 pack was ${ratio.toFixed(1)}× slower per claim`).toBeLessThan(LINEAR_BOUND);
  });

  it('keeps a single claim under the 50ms budget even at tenfold content', () => {
    const perClaim = bestOf(scalePack(base, 10), 20);
    expect(perClaim, `${perClaim.toFixed(2)}ms per claim`).toBeLessThan(CLAIM_BUDGET_MS);
  });
});
