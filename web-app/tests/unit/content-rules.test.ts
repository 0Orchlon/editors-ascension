/**
 * QX-5 — контентын `[C]` дүрмүүд ГАНЦ модульд (T-03; plan.md P-12).
 *
 * ⚠ Хоёр validator = хоёр үнэн. CLI (`npm run validate:content`) ба vitest хоёулаа
 * ЯГ ЭНЭ модулийг дуудна — тиймээс дүрэм тус бүрд «зөрчил тарихад унана» тест бий.
 */
import { describe, expect, it } from 'vitest';
import { buildPack } from '@shared/content/index.ts';
import { checkContentRules, CONTENT_RULE_IDS } from '@shared/validate/content-rules.ts';
import type { ContentPack, QuestDefinition } from '@shared/types/index.ts';

const pack = buildPack();

/** Гүн хуулбар — тарьсан зөрчил бусад тестэд нэвчихгүй. */
const clone = (p: ContentPack): ContentPack => JSON.parse(JSON.stringify(p)) as ContentPack;
const rulesHit = (p: ContentPack): string[] => [...new Set(checkContentRules(p).map((v) => v.rule))];

describe('QX-5 — the shipped pack satisfies every [C] rule (T-03)', () => {
  it('reports zero violations for the real content pack', () => {
    expect(checkContentRules(pack)).toEqual([]);
  });

  it('exposes a non-empty, unique rule id list — an empty rule set would pass vacuously', () => {
    expect(CONTENT_RULE_IDS.length).toBeGreaterThanOrEqual(11);
    expect(new Set(CONTENT_RULE_IDS).size).toBe(CONTENT_RULE_IDS.length);
  });

  it('names a path on every violation so the CLI can point at the offender', () => {
    const broken = clone(pack);
    broken.quests = broken.quests.filter((q) => q.track !== 'main');
    const found = checkContentRules(broken);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((v) => v.path.length > 0 && v.message.length > 0)).toBe(true);
  });
});

describe('QX-5 — each rule actually bites when a violation is planted (T-03)', () => {
  it('MQ-1 — the campaign losing a quest is caught', () => {
    const broken = clone(pack);
    const firstMain = broken.quests.findIndex((q) => q.track === 'main');
    broken.quests.splice(firstMain, 1);
    expect(rulesHit(broken)).toContain('MQ-1');
  });

  it('MQ-2 — a dangling prerequisite is caught', () => {
    const broken = clone(pack);
    broken.quests[0]!.prerequisites = ['does-not-exist'];
    expect(rulesHit(broken)).toContain('MQ-2');
  });

  it('MQ-2 — a prerequisite cycle is caught', () => {
    const broken = clone(pack);
    const [a, b] = [broken.quests[0]!, broken.quests[1]!];
    a.prerequisites = [b.id];
    b.prerequisites = [a.id];
    expect(rulesHit(broken)).toContain('MQ-2');
  });

  it('MQ-5 — an empty narrative field is caught', () => {
    const broken = clone(pack);
    broken.quests[0]!.reflectionPrompt = '   ';
    expect(rulesHit(broken)).toContain('MQ-5');
  });

  it('SQ-1 — dropping below twenty side quests is caught', () => {
    const broken = clone(pack);
    const sides = broken.quests.filter((q) => q.track === 'side');
    const keep = new Set(sides.slice(0, 5).map((q) => q.id));
    broken.quests = broken.quests.filter((q) => q.track !== 'side' || keep.has(q.id));
    expect(rulesHit(broken)).toContain('SQ-1');
  });

  it('SQ-3 — a side quest worth more than the cheapest main quest is caught', () => {
    const broken = clone(pack);
    const side = broken.quests.find((q) => q.track === 'side')!;
    side.xp = 100_000;
    expect(rulesHit(broken)).toContain('SQ-3');
  });

  it('SQ-4 — repeat grinding beating the campaign rate is caught', () => {
    const broken = clone(pack);
    const side = broken.quests.find((q) => q.track === 'side')!;
    side.estimatedMinutes = 1;
    side.repeatXpMultiplier = 1;
    expect(rulesHit(broken)).toContain('SQ-4');
  });

  it('STA-4 — a stamina cost outside 1..6 is caught', () => {
    const broken = clone(pack);
    (broken.quests[0] as QuestDefinition).staminaCost = 9;
    expect(rulesHit(broken)).toContain('STA-4');
  });

  it('DG-1 — a dungeon with no tutorial reference is caught', () => {
    const broken = clone(pack);
    broken.dungeons[0]!.tutorialRefs = [];
    expect(rulesHit(broken)).toContain('DG-1');
  });

  it('DG-1 — an out-of-range answer key is caught', () => {
    const broken = clone(pack);
    broken.dungeons[0]!.questions[0]!.correctIndex = 99;
    expect(rulesHit(broken)).toContain('DG-1');
  });

  it('ENC-1 — an encounter longer than two minutes is caught', () => {
    const broken = clone(pack);
    broken.encounters[0]!.maxMinutes = 5 as never;
    expect(rulesHit(broken)).toContain('ENC-1');
  });

  it('ACH-1 — an unknown predicate kind is caught', () => {
    const broken = clone(pack);
    broken.achievements[0]!.predicate.kind = 'vibes' as never;
    expect(rulesHit(broken)).toContain('ACH-1');
  });

  it('EC-1 — loot that is not cosmetic is caught', () => {
    const broken = clone(pack);
    broken.loot[0]!.effect = 'power' as never;
    expect(rulesHit(broken)).toContain('EC-1');
  });
});

describe('QX-5 — the PERSONAL-2 rules bite too (T-25)', () => {
  it('SKL-1 — a second capstone in one track is caught', () => {
    const broken = clone(pack);
    const tier2 = broken.skills.find((s) => s.track === 'blender' && s.tier === 2)!;
    tier2.tier = 3;
    expect(rulesHit(broken)).toContain('SKL-1');
  });

  it('SKL-1 — a capstone borrowing a prerequisite from another track is caught', () => {
    const broken = clone(pack);
    const capstone = broken.skills.find((s) => s.tier === 3 && s.track === 'audio')!;
    capstone.prerequisites = ['sk-modeling'];
    expect(rulesHit(broken)).toContain('SKL-1');
  });

  it('SKL-1 — a skill cycle is caught', () => {
    const broken = clone(pack);
    broken.skills[0]!.prerequisites = [broken.skills[1]!.id];
    broken.skills[1]!.prerequisites = [broken.skills[0]!.id];
    expect(rulesHit(broken)).toContain('SKL-1');
  });

  it('SKL-5 — a node priced above one point is caught', () => {
    const broken = clone(pack);
    broken.skills[0]!.cost = 2 as never;
    expect(rulesHit(broken)).toContain('SKL-5');
  });

  it('BSX-1 — a world losing its boss is caught', () => {
    const broken = clone(pack);
    broken.quests = broken.quests.filter((q) => q.id !== 'boss-strange-room');
    expect(rulesHit(broken)).toContain('BSX-1');
  });

  it('BSX-1 — a second boss in one world is caught', () => {
    const broken = clone(pack);
    const boss = broken.quests.find((q) => q.track === 'boss' && q.world === 2)!;
    boss.world = 3;
    expect(rulesHit(broken)).toContain('BSX-1');
  });

  it('RET-1 — a chain with the wrong number of steps is caught', () => {
    const broken = clone(pack);
    broken.chains[0]!.steps = broken.chains[0]!.steps.slice(0, 3);
    expect(rulesHit(broken)).toContain('RET-1');
  });

  it('RET-1 — the same side quest in two chains is caught', () => {
    const broken = clone(pack);
    broken.chains[1]!.steps[0] = broken.chains[0]!.steps[0]!;
    expect(rulesHit(broken)).toContain('RET-1');
  });

  it('RET-1 — a step that is not a side quest is caught', () => {
    const broken = clone(pack);
    broken.chains[0]!.steps[0] = 'mq-first-cut';
    expect(rulesHit(broken)).toContain('RET-1');
  });

  it('RET-3 — a bonus above the world ceiling is caught', () => {
    const broken = clone(pack);
    broken.chains[0]!.bonusXp = 100_000;
    expect(rulesHit(broken)).toContain('RET-3');
  });

  it('RET-5 — a skill tag owned by two guilds is caught', () => {
    const broken = clone(pack);
    broken.guilds[1]!.tags = [...broken.guilds[1]!.tags, broken.guilds[0]!.tags[0]!];
    expect(rulesHit(broken)).toContain('RET-5');
  });

  it('RET-5 — a skill tag owned by no guild is caught', () => {
    const broken = clone(pack);
    broken.guilds[2]!.tags = broken.guilds[0]!.tags.slice(0, 1);
    expect(rulesHit(broken)).toContain('RET-5');
  });

  it('RET-7 — dropping below forty achievements is caught', () => {
    const broken = clone(pack);
    broken.achievements = broken.achievements.slice(0, 20);
    expect(rulesHit(broken)).toContain('RET-7');
  });

  it('RET-7 — a guildRank predicate pointing at no guild is caught', () => {
    const broken = clone(pack);
    const rank = broken.achievements.find((a) => a.predicate.kind === 'guildRank')!;
    rank.predicate.ref = 'guild-does-not-exist';
    expect(rulesHit(broken)).toContain('RET-7');
  });

  it('RET-7 — losing the prestigeCount anchor is caught (orphaned cosmetics)', () => {
    const broken = clone(pack);
    broken.achievements = broken.achievements.filter((a) => a.predicate.kind !== 'prestigeCount');
    expect(rulesHit(broken)).toContain('RET-7');
  });

  it('COS-1 — a slot falling below five items is caught', () => {
    const broken = clone(pack);
    broken.cosmetics = broken.cosmetics.filter(
      (c) => c.slot !== 'title' || broken.cosmetics.indexOf(c) % 10 === 0,
    );
    expect(rulesHit(broken)).toContain('COS-1');
  });

  it('COS-1 — a non-cosmetic effect is caught', () => {
    const broken = clone(pack);
    broken.cosmetics[0]!.effect = 'power' as never;
    expect(rulesHit(broken)).toContain('COS-1');
  });

  it('COS-2 — an unlockSource pointing at a missing id is caught', () => {
    const broken = clone(pack);
    broken.cosmetics[0]!.unlockSource.refId = 'nope-does-not-exist';
    expect(rulesHit(broken)).toContain('COS-2');
  });

  it('COS-2 — a guild rank outside 1..4 is caught', () => {
    const broken = clone(pack);
    const item = broken.cosmetics.find((c) => c.unlockSource.kind === 'guildRank')!;
    item.unlockSource.value = 9;
    expect(rulesHit(broken)).toContain('COS-2');
  });

  it('OFF-2 — an external url outside tutorialRefs is caught', () => {
    const broken = clone(pack);
    broken.quests[0]!.summary = 'See https://cdn.example.com/tracker.js for details.';
    expect(rulesHit(broken)).toContain('OFF-2');
  });

  it('OFF-2 — a real tutorialRefs link is not flagged', () => {
    expect(checkContentRules(pack).filter((v) => v.rule === 'OFF-2')).toEqual([]);
  });

  /**
   * ⚠ Бүрэн байдлын хаалга: дүрмийн id нэмэгдээд «зөрчил тарихад унана» тест
   * бичигдээгүй бол ЭНЭ тест унана. Хоосон пакет дээр гүйлгэх нь хүрэлцэхгүй —
   * `SQ-3` зэрэг дүрэм зөрчих ЗҮЙЛ байхгүй үед чимээгүй өнгөрнө.
   */
  it('has a planted-violation test for every declared rule id', () => {
    const covered = [
      'MQ-1', 'MQ-2', 'MQ-5', 'SQ-1', 'SQ-3', 'SQ-4', 'STA-4', 'DG-1', 'ENC-1', 'ACH-1', 'EC-1',
      'SKL-1', 'SKL-5', 'BSX-1', 'RET-1', 'RET-3', 'RET-5', 'RET-7', 'COS-1', 'COS-2', 'OFF-2',
    ];
    expect([...CONTENT_RULE_IDS].sort()).toEqual([...covered].sort());
  });
});
