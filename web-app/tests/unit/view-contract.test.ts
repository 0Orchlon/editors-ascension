/**
 * `lld.md §9.5` — `gameService.view`-ийн 7 нэрлэсэн гэрээ (T-29…T-32).
 *
 * ⚠ Яагаад нэр нь өөрөө хаалгатай вэ: §9.5 бол UI ↔ домэйны ЦОРЫН ГАНЦ гэрээ
 * (`QX-7` — `ui/**` нь `shared/core`-ыг шууд импортлохгүй). Дэлгэцийн дотоод нэр
 * (`trophies`, `respecStatus`) рүү чимээгүй шилжвэл загварын хүснэгт ба код хоёр
 * тусдаа үнэн болж, дараагийн уншигч алийг нь эрх бүхий гэж мэдэхээ болино.
 * Зан төлөв нь тестийн бусад хэсэгт хаагдсан — энд ЗӨВХӨН гадаргуу.
 */
import { describe, expect, it } from 'vitest';
import { buildPack } from '@shared/content/index.ts';
import { newGame } from '@shared/save/serialize.ts';
import { SKILL_TAGS } from '@shared/core/constants.ts';
import { createGameService } from '../../src/services/gameService.ts';

const pack = buildPack();
const view = (): ReturnType<typeof createGameService>['view'] =>
  createGameService({ pack, initial: newGame(), now: () => '2026-09-16T09:00:00Z' }).view;

describe('§9.5 — every named view exists with the contracted shape', () => {
  it('masteryTracks() returns one entry per SkillTag', () => {
    const tracks = view().masteryTracks();
    expect(tracks.map((t) => t.tag)).toEqual([...SKILL_TAGS]);
    for (const track of tracks)
      expect(track).toMatchObject({
        level: expect.any(Number),
        xp: expect.any(Number),
        prestigeCount: expect.any(Number),
      });
  });

  it('guilds() returns the four guilds with rank and placeholder flags', () => {
    const guilds = view().guilds();
    expect(guilds).toHaveLength(4);
    for (const guild of guilds)
      expect(guild).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        rep: expect.any(Number),
        rank: expect.any(Number),
        placeholder: expect.any(Boolean),
      });
  });

  it('cosmetics() returns every catalogue entry with unlock state and source text', () => {
    const items = view().cosmetics();
    expect(items.length).toBe(pack.cosmetics.length);
    expect(items.length).toBeGreaterThanOrEqual(60);
    for (const item of items) {
      expect(typeof item.unlocked).toBe('boolean');
      // COS-3 — «юу хийвэл нээгдэх» нь ХООСОН байж БОЛОХГҮЙ: хоосон мөр нь
      // мухардал — тоглогч юу хийхээ мэдэхгүй зорилт харна.
      expect(item.unlockText.length).toBeGreaterThan(0);
    }
  });

  it('capstone(track) returns the tier-3 node and its gaps for every track', () => {
    const v = view();
    for (const tag of SKILL_TAGS) {
      const capstone = v.capstone(tag);
      expect(capstone).not.toBeNull();
      expect(capstone!.skill.tier).toBe(3);
      expect(capstone!.skill.track).toBe(tag);
      // Шинэ тоглоомд capstone нээгдэхгүй тул дутсан нөхцөл ЗААВАЛ нэрлэгдэнэ (SKL-2).
      expect(capstone!.gaps.length).toBeGreaterThan(0);
    }
  });

  it('bossBoard(bossId) reports both difficulties and their thresholds', () => {
    const boss = pack.quests.find((q) => q.track === 'boss');
    expect(boss).toBeDefined();
    const board = view().bossBoard(boss!.id);
    expect(board.standard).toEqual({ best: 0, tier: 'failed' });
    expect(board.hard).toEqual({ best: 0, tier: 'failed' });
    // BSX-2 — hard босго нь standard-аас ХАТУУ, тэгш биш.
    for (const cut of ['mvp', 'advanced', 'mastery'] as const)
      expect(board.thresholds.hard[cut]).toBeGreaterThan(board.thresholds.standard[cut]);
  });

  it('respecAvailableIn() returns 0 days on a fresh save', () => {
    expect(view().respecAvailableIn()).toBe(0);
  });

  it('activeWorld() returns 1 before any main quest is finished', () => {
    expect(view().activeWorld()).toBe(1);
  });

  /** Хамгаалалт: §9.5-ийн нэр СОЛИГДВОЛ энэ тест хашгирна, дэлгэц чимээгүй унахгүй. */
  it('exposes exactly the §9.5 names', () => {
    const v = view() as unknown as Record<string, unknown>;
    for (const name of [
      'masteryTracks', 'guilds', 'cosmetics', 'capstone', 'bossBoard', 'respecAvailableIn', 'activeWorld',
    ])
      expect(typeof v[name]).toBe('function');
  });
});
