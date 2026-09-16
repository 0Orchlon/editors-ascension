/**
 * PERSONAL-2-ийн контентын гэрээ — `[C]` тестүүд (T-19…T-24).
 *
 * ⚠ Контент нь ЭДГЭЭР тестэд тааруулагдана, тест нь контентод БИШ. Бүтцийн
 * шаардлага (тоо, tier, давхцал, лавлагааны бүрэн байдал) нь схемээр илрэхгүй тул
 * энд ил бичигдэнэ.
 */
import { describe, expect, it } from 'vitest';
import { buildPack } from '@shared/content/index.ts';
import { COSMETIC_SLOTS, GUILD_COUNT, SKILL_TAGS } from '@shared/core/constants.ts';
import type { SkillDefinition } from '@shared/types/index.ts';

const pack = buildPack();
const skills = pack.skills;
const byId = new Map(skills.map((s) => [s.id, s]));

/** PERSONAL-1-ийн 24 node — id БҮР хэвээр байх ЁСТОЙ (AC SKL-5). */
const LEGACY_SKILL_IDS = [
  'sk-edit-fundamentals',
  'sk-pacing',
  'sk-color-correction',
  'sk-color-grading',
  'sk-blender-navigation',
  'sk-modeling',
  'sk-uv-texturing',
  'sk-shading',
  'sk-lighting',
  'sk-rendering',
  'sk-keyframing',
  'sk-easing',
  'sk-rigging',
  'sk-character-animation',
  'sk-framing',
  'sk-camera-movement',
  'sk-coverage',
  'sk-audio-capture',
  'sk-sound-design',
  'sk-mixing',
  'sk-compositing',
  'sk-vfx-integration',
  'sk-story-structure',
  'sk-visual-storytelling',
];

/** tier алгасалтгүй эсэх — урьдчилсан нөхцөлийн ЗАМ дээр tier N−1 байх ёстой. */
function reachesTier(skill: SkillDefinition, wanted: number): boolean {
  const seen = new Set<string>();
  const stack = [...skill.prerequisites];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (node === undefined) continue;
    if (node.tier === wanted) return true;
    stack.push(...node.prerequisites);
  }
  return false;
}

describe('SKL-5 — the existing tree survives the upgrade (T-19)', () => {
  it('keeps all 24 PERSONAL-1 node ids', () => {
    const missing = LEGACY_SKILL_IDS.filter((id) => !byId.has(id));
    expect(missing).toEqual([]);
  });

  it('keeps every node at cost 1 — the currency changed, not the price', () => {
    expect(skills.filter((s) => s.cost !== 1).map((s) => s.id)).toEqual([]);
  });

  it('keeps the titles and descriptions non-empty for every node', () => {
    const bad = skills.filter((s) => !s.title.trim() || !s.description.trim());
    expect(bad.map((s) => s.id)).toEqual([]);
  });
});

describe('SKL-1 — the tree carries tracks, tiers and one capstone each (T-19)', () => {
  it('ships at least 28 nodes', () => {
    expect(skills.length).toBeGreaterThanOrEqual(28);
  });

  it('assigns every node a valid track and a tier in 1..3', () => {
    const bad = skills.filter(
      (s) => !(SKILL_TAGS as readonly string[]).includes(s.track) || s.tier < 1 || s.tier > 3,
    );
    expect(bad.map((s) => s.id)).toEqual([]);
  });

  it.each(SKILL_TAGS)('gives %s at least one tier-1, one tier-2 and exactly one tier-3', (tag) => {
    const tree = skills.filter((s) => s.track === tag);
    expect(tree.filter((s) => s.tier === 1).length).toBeGreaterThanOrEqual(1);
    expect(tree.filter((s) => s.tier === 2).length).toBeGreaterThanOrEqual(1);
    expect(tree.filter((s) => s.tier === 3)).toHaveLength(1);
  });

  /**
   * ⚠ «tier алгасахгүй» нь ЗАМААР шалгагдана, шууд урьдчилсан нөхцөлөөр БИШ:
   * `sk-uv-texturing` (tier 2) нь `sk-modeling` (tier 2)-оор дамжин
   * `sk-blender-navigation` (tier 1) хүрдэг. Шууд шалгалт нь DAG-д дахин
   * давхардсан, утгагүй урьдчилсан нөхцөл бичихийг шаардах байсан.
   */
  it('never lets a tier-2 node start without a tier-1 ancestor', () => {
    const bad = skills.filter((s) => s.tier === 2 && !reachesTier(s, 1));
    expect(bad.map((s) => s.id)).toEqual([]);
  });

  it('never lets a capstone start without a tier-2 ancestor', () => {
    const bad = skills.filter((s) => s.tier === 3 && !reachesTier(s, 2));
    expect(bad.map((s) => s.id)).toEqual([]);
  });

  it('requires every capstone prerequisite to come from its own track', () => {
    const bad: string[] = [];
    for (const s of skills.filter((n) => n.tier === 3))
      for (const p of s.prerequisites)
        if (byId.get(p)?.track !== s.track) bad.push(`${s.id} → ${p}`);
    expect(bad).toEqual([]);
  });

  it('keeps the prerequisite graph acyclic and fully resolvable', () => {
    const problems: string[] = [];
    for (const s of skills)
      for (const p of s.prerequisites) if (!byId.has(p)) problems.push(`${s.id} → ${p}`);

    const mark = new Map<string, 'visiting' | 'done'>();
    const walk = (id: string): void => {
      if (mark.get(id) === 'done') return;
      if (mark.get(id) === 'visiting') {
        problems.push(`cycle at ${id}`);
        return;
      }
      mark.set(id, 'visiting');
      for (const p of byId.get(id)?.prerequisites ?? []) walk(p);
      mark.set(id, 'done');
    };
    for (const s of skills) walk(s.id);
    expect(problems).toEqual([]);
  });
});

describe('BSX-1 — exactly one boss per world (T-20)', () => {
  const bosses = pack.quests.filter((q) => q.track === 'boss');

  it('ships five bosses', () => {
    expect(bosses).toHaveLength(5);
  });

  it.each([1, 2, 3, 4, 5])('gives world %i exactly one boss', (world) => {
    expect(bosses.filter((b) => b.world === world)).toHaveLength(1);
  });

  /** ⚠ spec.md A6 — PERSONAL-1-ийн boss нь 3-р дэлхийд ХЭВЭЭР. */
  it('keeps The Strange Room as the world-3 boss', () => {
    const w3 = bosses.find((b) => b.world === 3)!;
    expect(w3.id).toBe('boss-strange-room');
  });

  it('keeps the eighteen main-track quests untouched (MQ-1)', () => {
    expect(pack.quests.filter((q) => q.track === 'main')).toHaveLength(18);
  });

  it('invents no tutorial links for the new bosses (README T-22)', () => {
    const invented = bosses.filter((b) => b.id !== 'boss-strange-room' && b.tutorialRefs.length > 0);
    expect(invented.map((b) => b.id)).toEqual([]);
  });

  it('gates each boss behind reachable prerequisites in its own or an earlier world', () => {
    const byQuestId = new Map(pack.quests.map((q) => [q.id, q]));
    const bad: string[] = [];
    for (const b of bosses)
      for (const p of b.prerequisites) {
        const prereq = byQuestId.get(p);
        if (prereq === undefined) bad.push(`${b.id} → ${p} (missing)`);
        else if (prereq.world > b.world) bad.push(`${b.id} → ${p} (later world)`);
      }
    expect(bad).toEqual([]);
  });

  it('asks every boss to be scored across the six craft categories (BS-5)', () => {
    const bad = bosses.filter(
      (b) => !b.victoryConditions.some((v) => /six craft categories/i.test(v)),
    );
    expect(bad.map((b) => b.id)).toEqual([]);
  });
});

describe('RET-5 — four guilds partition the seven learning domains (T-21)', () => {
  const guilds = pack.guilds;

  it('ships exactly four guilds', () => {
    expect(guilds).toHaveLength(4);
  });

  it('assigns every skill tag to exactly one guild — no overlap, no gap', () => {
    const owners = new Map<string, string[]>();
    for (const g of guilds) for (const t of g.tags) owners.set(t, [...(owners.get(t) ?? []), g.id]);
    const wrong = SKILL_TAGS.map((tag) => ({ tag, guilds: owners.get(tag) ?? [] })).filter(
      (r) => r.guilds.length !== 1,
    );
    expect(wrong).toEqual([]);
  });

  it('uses unique guild ids and non-empty titles', () => {
    expect(new Set(guilds.map((g) => g.id)).size).toBe(guilds.length);
    expect(guilds.filter((g) => !g.title.trim())).toEqual([]);
  });

  /** ⚠ H-2 хариугүй тул AAA §4.10-ын 4 нэр нь ТҮР орлуулагч — `placeholder` нь тэр тэмдэглэгээ. */
  it('marks the AAA placeholder names as awaiting human sign-off (H-2)', () => {
    expect(guilds.every((g) => g.placeholder)).toBe(true);
  });

  it('keeps the guild count in step with the domain constant', () => {
    expect(guilds).toHaveLength(GUILD_COUNT);
  });
});

describe('RET-1 · RET-3 — side quest chains (T-22)', () => {
  const chains = pack.chains;
  const sideIds = new Set(pack.quests.filter((q) => q.track === 'side').map((q) => q.id));
  const mains = pack.quests.filter((q) => q.track === 'main');

  it('ships at least three chains', () => {
    expect(chains.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every chain exactly four steps', () => {
    const bad = chains.filter((c) => c.steps.length !== 4);
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it('references only real side quests', () => {
    const bad: string[] = [];
    for (const c of chains)
      for (const s of c.steps) if (!sideIds.has(s)) bad.push(`${c.id} → ${s}`);
    expect(bad).toEqual([]);
  });

  /** ⚠ Хоёр chain-д орсон side quest нь «чанд дараалал»-ыг хоёрдмол болгоно. */
  it('never puts a side quest in two chains', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const c of chains)
      for (const s of c.steps) {
        const owner = seen.get(s);
        if (owner !== undefined) clashes.push(`${s}: ${owner} + ${c.id}`);
        seen.set(s, c.id);
      }
    expect(clashes).toEqual([]);
  });

  it('keeps bonusXp at or below the cheapest main quest of the chain’s world (RET-3)', () => {
    const bad: string[] = [];
    for (const c of chains) {
      const here = mains.filter((q) => q.world === c.world).map((q) => q.xp);
      if (here.length === 0) {
        bad.push(`${c.id}: world ${c.world} has no main quest to set the ceiling`);
        continue;
      }
      const ceiling = Math.min(...here);
      if (c.bonusXp > ceiling) bad.push(`${c.id}: ${c.bonusXp} > ${ceiling}`);
    }
    expect(bad).toEqual([]);
  });

  it('uses unique chain ids and unique steps inside a chain', () => {
    expect(new Set(chains.map((c) => c.id)).size).toBe(chains.length);
    const bad = chains.filter((c) => new Set(c.steps).size !== c.steps.length);
    expect(bad.map((c) => c.id)).toEqual([]);
  });
});

describe('RET-7 — the achievement catalog reaches forty (T-24)', () => {
  const achievements = pack.achievements;
  const kinds = new Set(achievements.map((a) => a.predicate.kind));

  it('ships at least forty achievements', () => {
    expect(achievements.length).toBeGreaterThanOrEqual(40);
  });

  it('uses unique ids and non-empty text', () => {
    expect(new Set(achievements.map((a) => a.id)).size).toBe(achievements.length);
    const thin = achievements.filter((a) => !a.title.trim() || !a.description.trim());
    expect(thin.map((a) => a.id)).toEqual([]);
  });

  it.each(['masteryLevel', 'prestigeCount', 'guildRank', 'bossPersonalBest', 'chainsCompleted'])(
    'exercises the new %s predicate',
    (kind) => {
      expect(kinds.has(kind as never)).toBe(true);
    },
  );

  /**
   * ⚠ plan.md §12.5 — prestige цол ба streak шагналын cosmetic нь `kind:'achievement'`-ээр
   * ЭДГЭЭР амжилтад заана. Байхгүй бол тэр cosmetic өнчирч `COS-2` УНАНА.
   */
  it('keeps prestigeCount and streakDays predicates so the cosmetics have anchors', () => {
    expect(kinds.has('prestigeCount')).toBe(true);
    expect(kinds.has('streakDays')).toBe(true);
  });

  it('covers the four streak reward thresholds 3 · 7 · 14 · 30 (RET-8)', () => {
    const days = achievements
      .filter((a) => a.predicate.kind === 'streakDays')
      .map((a) => Number(a.predicate.value))
      .sort((a, b) => a - b);
    expect(days).toEqual([3, 7, 14, 30]);
  });

  it('points every masteryLevel ref at a real skill tag', () => {
    const bad = achievements
      .filter((a) => a.predicate.kind === 'masteryLevel' && a.predicate.ref !== undefined)
      .filter((a) => !(SKILL_TAGS as readonly string[]).includes(a.predicate.ref!));
    expect(bad.map((a) => a.id)).toEqual([]);
  });

  it('points every guildRank ref at a real guild and a rank in 1..4', () => {
    const guildIds = new Set(pack.guilds.map((g) => g.id));
    const bad = achievements
      .filter((a) => a.predicate.kind === 'guildRank')
      .filter(
        (a) =>
          (a.predicate.ref !== undefined && !guildIds.has(a.predicate.ref)) ||
          Number(a.predicate.value) < 1 ||
          Number(a.predicate.value) > 4,
      );
    expect(bad.map((a) => a.id)).toEqual([]);
  });

  it('points every bossPersonalBest ref at a real boss and a total in 0..60', () => {
    const bossIds = new Set(pack.quests.filter((q) => q.track === 'boss').map((q) => q.id));
    const bad = achievements
      .filter((a) => a.predicate.kind === 'bossPersonalBest')
      .filter(
        (a) =>
          (a.predicate.ref !== undefined && !bossIds.has(a.predicate.ref)) ||
          Number(a.predicate.value) < 0 ||
          Number(a.predicate.value) > 60,
      );
    expect(bad.map((a) => a.id)).toEqual([]);
  });

  it('keeps chainsCompleted thresholds inside the number of chains that exist', () => {
    const bad = achievements
      .filter((a) => a.predicate.kind === 'chainsCompleted')
      .filter((a) => Number(a.predicate.value) > pack.chains.length);
    expect(bad.map((a) => a.id)).toEqual([]);
  });

  it('keeps all 21 PERSONAL-1 achievements', () => {
    expect(achievements.filter((a) => a.id.startsWith('ach-')).length).toBeGreaterThanOrEqual(41);
    for (const id of ['ach-first-light', 'ach-boss-mastery', 'ach-streak-30', 'ach-campaign-complete'])
      expect(achievements.some((a) => a.id === id)).toBe(true);
  });
});

describe('COS-1 · COS-2 — the cosmetic catalog (T-23)', () => {
  const cosmetics = pack.cosmetics;
  const questIds = new Set(pack.quests.map((q) => q.id));
  const bossIds = new Set(pack.quests.filter((q) => q.track === 'boss').map((q) => q.id));
  const achievementIds = new Set(pack.achievements.map((a) => a.id));
  const guildIds = new Set(pack.guilds.map((g) => g.id));

  it('ships at least sixty items', () => {
    expect(cosmetics.length).toBeGreaterThanOrEqual(60);
  });

  it.each(COSMETIC_SLOTS)('fills the %s slot with at least five items', (slot) => {
    expect(cosmetics.filter((c) => c.slot === slot).length).toBeGreaterThanOrEqual(5);
  });

  it('uses only the six contract slots', () => {
    const bad = cosmetics.filter((c) => !(COSMETIC_SLOTS as readonly string[]).includes(c.slot));
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it('marks every item cosmetic — nothing may buy progression (EC-1)', () => {
    expect(cosmetics.filter((c) => c.effect !== 'cosmetic').map((c) => c.id)).toEqual([]);
  });

  it('uses unique ids and non-empty titles', () => {
    expect(new Set(cosmetics.map((c) => c.id)).size).toBe(cosmetics.length);
    expect(cosmetics.filter((c) => !c.title.trim()).map((c) => c.id)).toEqual([]);
  });

  /** ⚠ COS-2 — өнчин шагнал ХОРИОТОЙ: `unlockSource` нь БОДИТ id-д заана. */
  it('resolves every unlockSource to a real id', () => {
    const bad: string[] = [];
    for (const c of cosmetics) {
      const { kind, refId } = c.unlockSource;
      const known =
        kind === 'quest' ? questIds.has(refId)
        : kind === 'boss' ? bossIds.has(refId)
        : kind === 'achievement' ? achievementIds.has(refId)
        : kind === 'guildRank' ? guildIds.has(refId)
        : (SKILL_TAGS as readonly string[]).includes(refId);
      if (!known) bad.push(`${c.id} → ${kind}:${refId}`);
    }
    expect(bad).toEqual([]);
  });

  it('keeps every unlockSource value inside the range its kind allows', () => {
    const bad: string[] = [];
    for (const c of cosmetics) {
      const { kind, value } = c.unlockSource;
      if (kind === 'boss' && !['mvp', 'advanced', 'mastery'].includes(String(value)))
        bad.push(`${c.id}: boss tier ${String(value)}`);
      if (kind === 'guildRank' && (Number(value) < 1 || Number(value) > 4))
        bad.push(`${c.id}: guild rank ${String(value)}`);
      if (kind === 'mastery' && (Number(value) < 1 || Number(value) > 10))
        bad.push(`${c.id}: mastery level ${String(value)}`);
      if ((kind === 'quest' || kind === 'achievement') && value !== undefined)
        bad.push(`${c.id}: ${kind} carries a value it cannot use`);
    }
    expect(bad).toEqual([]);
  });

  /** plan.md P-22 — prestige цол ба streak шагнал нь шинэ kind БИШ, амжилтад заана. */
  it('anchors the prestige titles to the prestigeCount achievements', () => {
    const prestigeAchievements = new Set(
      pack.achievements.filter((a) => a.predicate.kind === 'prestigeCount').map((a) => a.id),
    );
    const anchored = cosmetics.filter(
      (c) => c.unlockSource.kind === 'achievement' && prestigeAchievements.has(c.unlockSource.refId),
    );
    expect(anchored.length).toBeGreaterThanOrEqual(1);
  });

  it('anchors a streak reward to each of the four streak achievements (RET-8)', () => {
    const streakAchievements = pack.achievements
      .filter((a) => a.predicate.kind === 'streakDays')
      .map((a) => a.id);
    const missing = streakAchievements.filter(
      (id) => !cosmetics.some((c) => c.unlockSource.kind === 'achievement' && c.unlockSource.refId === id),
    );
    expect(missing).toEqual([]);
  });

  it('adds no new unlock kind beyond the contract five', () => {
    const kinds = new Set(cosmetics.map((c) => c.unlockSource.kind));
    expect([...kinds].sort()).toEqual(
      ['achievement', 'boss', 'guildRank', 'mastery', 'quest'].filter((k) => kinds.has(k as never)),
    );
    expect(kinds.size).toBeLessThanOrEqual(5);
  });

  /** ⚠ `loot.json`-ийн 18 RNG drop нь cosmetic каталог БИШ — хоёулаа зэрэгцэн байна. */
  it('leaves the eighteen RNG loot items untouched', () => {
    expect(pack.loot).toHaveLength(18);
    const overlap = pack.loot.filter((l) => cosmetics.some((c) => c.id === l.id));
    expect(overlap.map((l) => l.id)).toEqual([]);
  });
});
