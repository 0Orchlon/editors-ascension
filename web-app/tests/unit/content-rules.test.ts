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
