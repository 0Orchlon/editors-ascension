/**
 * COS-2 · COS-4 · RET-8 — cosmetic нээлт ба camp layout (T-16; plan.md P-1 · P-25 · §12.5).
 *
 * ⚠ P-1 — «нээгдсэн эсэх» нь ХАДГАЛАГДАХГҮЙ, төлвөөс ГАРГАГДАНА. Тиймээс тест нь
 * `unlockedCosmeticIds` төрлийн талбар БАЙХГҮЙ гэдгийг ч ил барина: хоёр эх сурвалж
 * үүсэх нь чимээгүй салалтын гол шалтгаан.
 */
import { describe, expect, it } from 'vitest';
import { isUnlocked, setCampLayout, unlockedCosmetics } from '@shared/core/cosmetics.ts';
import { COSMETIC_SLOTS } from '@shared/core/constants.ts';
import type { ContentPack, CosmeticItem, GameState } from '@shared/types/index.ts';
import { freshState, testPack } from './fixtures.ts';

const item = (over: Partial<CosmeticItem> & { id: string }): CosmeticItem =>
  ({
    title: 'C',
    slot: 'title',
    rarity: 'common',
    effect: 'cosmetic',
    unlockSource: { kind: 'achievement', refId: 'ach-a' },
    ...over,
  }) as CosmeticItem;

const packOf = (...items: CosmeticItem[]): ContentPack =>
  testPack({ cosmetics: items as unknown as ContentPack['cosmetics'] });

const bossAttempt = (bossId: string, tier: string) =>
  ({
    bossId,
    at: '2026-03-10T09:00:00Z',
    scores: { story: 0, editing: 0, camera: 0, visualCraft: 0, animation: 0, audioPost: 0 },
    total: 0,
    tier,
    difficulty: 'standard',
  }) as unknown as GameState['bossAttempts'][number];

describe('COS-2 — unlock is evaluated from state, never stored (T-16)', () => {
  it('has no unlockedCosmeticIds field on the state at all (P-1)', () => {
    expect('unlockedCosmeticIds' in freshState()).toBe(false);
  });

  it('unlocks a quest source from a completed main quest, dungeon or side quest', () => {
    const cosmetic = item({ id: 'c', unlockSource: { kind: 'quest', refId: 'q1' } });
    const pack = packOf(cosmetic);
    expect(isUnlocked(freshState(), cosmetic, pack)).toBe(false);
    expect(isUnlocked({ ...freshState(), completedMainQuestIds: ['q1'] }, cosmetic, pack)).toBe(true);
    expect(isUnlocked({ ...freshState(), completedDungeonIds: ['q1'] }, cosmetic, pack)).toBe(true);
    expect(
      isUnlocked(
        { ...freshState(), sideQuestStats: { q1: { completions: 1, lastCompletedAt: null } } },
        cosmetic,
        pack,
      ),
    ).toBe(true);
  });

  it.each([
    ['mvp', 'mvp', true],
    ['advanced', 'mvp', true],
    ['mastery', 'advanced', true],
    ['mvp', 'advanced', false],
    ['failed', 'mvp', false],
  ])('a %s attempt against a %s requirement unlocks: %s', (reached, needed, expected) => {
    const cosmetic = item({ id: 'c', unlockSource: { kind: 'boss', refId: 'boss-a', value: needed } });
    const state = { ...freshState(), bossAttempts: [bossAttempt('boss-a', reached)] };
    expect(isUnlocked(state, cosmetic, packOf(cosmetic))).toBe(expected);
  });

  it('does not accept a tier reached on a different boss', () => {
    const cosmetic = item({ id: 'c', unlockSource: { kind: 'boss', refId: 'boss-a', value: 'mvp' } });
    const state = { ...freshState(), bossAttempts: [bossAttempt('boss-b', 'mastery')] };
    expect(isUnlocked(state, cosmetic, packOf(cosmetic))).toBe(false);
  });

  it('unlocks an achievement source from the earned list', () => {
    const cosmetic = item({ id: 'c', unlockSource: { kind: 'achievement', refId: 'ach-a' } });
    expect(isUnlocked(freshState(), cosmetic, packOf(cosmetic))).toBe(false);
    expect(isUnlocked({ ...freshState(), achievementIds: ['ach-a'] }, cosmetic, packOf(cosmetic))).toBe(true);
  });

  it.each([
    [9, 1, false],
    [10, 1, true],
    [49, 3, false],
    [50, 3, true],
  ])('rep %i against rank %i unlocks: %s', (rep, rank, expected) => {
    const cosmetic = item({ id: 'c', unlockSource: { kind: 'guildRank', refId: 'g-a', value: rank } });
    const state = { ...freshState(), reputation: { 'g-a': rep } };
    expect(isUnlocked(state, cosmetic, packOf(cosmetic))).toBe(expected);
  });

  it.each([
    [4, 5, false],
    [5, 5, true],
    [10, 5, true],
  ])('mastery level %i against requirement %i unlocks: %s', (level, needed, expected) => {
    const cosmetic = item({ id: 'c', unlockSource: { kind: 'mastery', refId: 'audio', value: needed } });
    const base = freshState();
    const state = { ...base, mastery: { ...base.mastery, audio: { ...base.mastery.audio!, level } } };
    expect(isUnlocked(state, cosmetic, packOf(cosmetic))).toBe(expected);
  });

  it('lists exactly the unlocked items', () => {
    const pack = packOf(
      item({ id: 'c-open', unlockSource: { kind: 'achievement', refId: 'ach-a' } }),
      item({ id: 'c-shut', unlockSource: { kind: 'achievement', refId: 'ach-b' } }),
    );
    const state = { ...freshState(), achievementIds: ['ach-a'] };
    expect(unlockedCosmetics(state, pack).map((c) => c.id)).toEqual(['c-open']);
  });
});

describe('COS-4 — campLayout is pure UI state (T-16; plan.md P-25)', () => {
  const pack = packOf(
    item({ id: 'c-title', slot: 'title', unlockSource: { kind: 'achievement', refId: 'ach-a' } }),
    item({ id: 'c-frame', slot: 'avatarFrame', unlockSource: { kind: 'achievement', refId: 'ach-a' } }),
    item({ id: 'c-locked', slot: 'title', unlockSource: { kind: 'achievement', refId: 'ach-none' } }),
  );
  const owner = (): GameState => ({ ...freshState(), achievementIds: ['ach-a'] });
  const emptySlots = () => Object.fromEntries(COSMETIC_SLOTS.map((s) => [s, null]));

  it('accepts a full six-slot layout of unlocked ids', () => {
    const slots = { ...emptySlots(), title: 'c-title', avatarFrame: 'c-frame' };
    const result = setCampLayout(owner(), slots, pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.campLayout.slots).toEqual(slots);
  });

  it('accepts an all-empty layout', () => {
    const result = setCampLayout(owner(), emptySlots(), pack);
    expect(result.ok && result.state.campLayout.slots).toEqual(emptySlots());
  });

  it('rejects INVALID_INPUT when a slot key is missing', () => {
    const { title: _dropped, ...partial } = emptySlots();
    const result = setCampLayout(owner(), partial, pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_INPUT');
  });

  it('rejects INVALID_INPUT for an unknown slot key', () => {
    const result = setCampLayout(owner(), { ...emptySlots(), hat: null }, pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_INPUT');
  });

  it('rejects INVALID_INPUT for a cosmetic id that does not exist', () => {
    const result = setCampLayout(owner(), { ...emptySlots(), title: 'c-nope' }, pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_INPUT');
  });

  it('rejects INVALID_INPUT when a cosmetic is worn in the wrong slot', () => {
    const result = setCampLayout(owner(), { ...emptySlots(), title: 'c-frame' }, pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_INPUT');
  });

  /** ⚠ Нээгдээгүй зүйлийг зүүх боломж нь Trophy Room-ийн утгыг үгүйсгэнэ (P-25). */
  it('rejects PREREQ_NOT_MET for a cosmetic that is not unlocked yet', () => {
    const result = setCampLayout(owner(), { ...emptySlots(), title: 'c-locked' }, pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('PREREQ_NOT_MET');
  });

  it('leaves the state untouched on every rejection', () => {
    const before = owner();
    for (const slots of [{ hat: null }, { ...emptySlots(), title: 'c-locked' }]) {
      const result = setCampLayout(before, slots, pack);
      expect(result.ok).toBe(false);
      // `ok:false` үед `state` БУЦАХГҮЙ — дуудагч өмнөхөө хэвээр хадгална.
      if (!result.ok) expect('state' in result).toBe(false);
    }
    expect(before.campLayout.slots).toEqual(emptySlots());
  });

  it('touches nothing but campLayout — no xp, level, inventory, mastery or rep (D-6)', () => {
    const before = owner();
    const result = setCampLayout(before, { ...emptySlots(), title: 'c-title' }, pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect({ ...result.state, campLayout: before.campLayout }).toEqual(before);
  });
});
