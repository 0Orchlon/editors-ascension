/**
 * Migration бүртгэл (AC SV-1 · SVX-1, plan.md P-6).
 *
 * Түлхүүр нь ЗОРИЛТОТ хувилбар: `MIGRATIONS[n]` нь `v(n-1) → v(n)` хөрвүүлнэ.
 * ⚠ Хоосон/дэмий migration бичихгүй.
 */
import { COSMETIC_SLOTS, GUILD_IDS, SKILL_TAGS } from '../core/constants.ts';

export type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** 7 track — `xp 0 · level 1 · prestigeCount 0` (plan.md §11.1). */
export const defaultMastery = (): Record<string, unknown> =>
  Object.fromEntries(SKILL_TAGS.map((tag) => [tag, { tag, xp: 0, level: 1, prestigeCount: 0 }]));

/**
 * Guild тутам 0. ⚠ Түлхүүр нь `GUILD_IDS` тогтмолоос — `guilds.json`-ийг ШУУД
 * импортлох нь migration-ийг КОНТЕНТООС хамааруулна (lld.md §5.3 A-LLD2-2):
 * контент засварлахад хуучин save-ийн хөрвүүлэлт чимээгүй өөрчлөгдөх болно.
 * Тогтмол ба контентын зөрүүг `[C]` дүрэм C-07 (`RET-5`) хаана.
 */
export const defaultReputation = (): Record<string, number> =>
  Object.fromEntries(GUILD_IDS.map((id) => [id, 0]));

/** ЯГ 6 үүр, бүгд хоосон (plan.md P-25). */
export const defaultCampLayout = (): { slots: Record<string, string | null> } => ({
  slots: Object.fromEntries(COSMETIC_SLOTS.map((slot) => [slot, null])),
});

/**
 * v1 → v2 (AC SVX-1).
 *
 * ⚠ Хуучин save-ийн ТОГЛООМЫН утга ХӨНДӨГДӨХГҮЙ: зөвхөн шинэ талбар нэмэгдэж,
 * `settings` ба `bossAttempts` нь ШИНЭ шаардлагатай талбараараа л дүүрнэ.
 * ⚠ `dungeonStats.lastPassedDate` нь `null` — хуучин тэнцсэн огноог ЗОХИОХГҮЙ
 * (plan.md P-15: `null` = refresher-т нэр дэвшихгүй, дараагийн тэнцэлтээс тоологдоно).
 */
const toV2: Migration = (state) => {
  const settings = (state.settings ?? {}) as Record<string, unknown>;
  const completedDungeonIds = (state.completedDungeonIds ?? []) as string[];
  const bossAttempts = (state.bossAttempts ?? []) as Record<string, unknown>[];

  return {
    ...state,
    settings: {
      reducedMotion: settings.reducedMotion === true,
      soundEnabled: settings.soundEnabled !== false,
      colorBlindSafe: false,
      soundVolume: 1,
    },
    // ⚠ P-2 — дээд амжилт нь эдгээрээс ГАРГАГДАНА, тиймээс difficulty ЗААВАЛ.
    bossAttempts: bossAttempts.map((a) => ({ difficulty: 'standard', ...a })),
    mastery: defaultMastery(),
    masteryPoints: 0,
    reputation: defaultReputation(),
    replayLog: [],
    campLayout: defaultCampLayout(),
    completedChainIds: [],
    respecAt: null,
    dungeonStats: Object.fromEntries(completedDungeonIds.map((id) => [id, { lastPassedDate: null }])),
  };
};

export const MIGRATIONS: Record<number, Migration> = { 2: toV2 };

/** `from` хувилбараас `to` хүртэл дараалан хэрэглэнэ. Дутуу migration нь ПРОГРАМЫН алдаа. */
export function runMigrations(
  state: Record<string, unknown>,
  from: number,
  to: number,
  registry: Record<number, Migration> = MIGRATIONS,
): Record<string, unknown> {
  let cur = state;
  for (let v = from + 1; v <= to; v++) {
    const m = registry[v];
    if (!m) throw new Error(`missing migration to schemaVersion ${v}`);
    cur = { ...m(cur), schemaVersion: v };
  }
  return cur;
}
