/**
 * Контентын validation (T-18 — контент бичихээс ӨМНӨ бичигдсэн; lld.md §5.5 C1…C14).
 *
 * ⚠ Эдгээр нь контентын ГЭРЭЭ. Контент хоосон эсвэл тэнцвэргүй үед УЛААН байх нь
 * хүлээгдсэн — тестийг контентод тааруулж сулруулахгүй, контентыг тестэд тааруулна.
 */
import { describe, expect, it } from 'vitest';
import { buildPack, contentVersion } from '@shared/content/index.ts';
import { sideQuestXp } from '@shared/core/sideQuests.ts';
import { BOSS_CATEGORY_TAGS, SKILL_TAGS } from '@shared/core/constants.ts';
import { validateContentPack } from '@shared/validate/index.ts';
import { checkContentRules } from '@shared/validate/content-rules.ts';
import type { QuestDefinition } from '@shared/types/index.ts';

const pack = buildPack();

/**
 * ⚠ plan.md P-12 — `[C]` дүрэм бүр `shared/validate/content-rules.ts`-д ГАНЦ
 * хувилбартай. Доорх тестүүд ТЭР модулийг дуудна: гараар хуулбарласан хувилбар нь
 * CLI-аас чимээгүй салах хоёр дахь үнэн болно (`npm run validate:content`).
 * Дүрэм тус бүрийн «зөрчил тарихад унана» нотолгоо нь `content-rules.test.ts`-д.
 */
const violations = (rule: string): string[] =>
  checkContentRules(pack)
    .filter((v) => v.rule === rule)
    .map((v) => `${v.path}: ${v.message}`);
const mains = pack.quests.filter((q) => q.track === 'main');
const sides = pack.quests.filter((q) => q.track === 'side');
const worlds = [1, 2, 3, 4, 5] as const;

/** PRD §5 — кампанит ажлын гарчиг ба дэлхий. */
const CAMPAIGN: [string, number][] = [
  ['First Cut', 1],
  ['Blender Toybox', 1],
  ['Movement Lab', 1],
  ['Ten-Second Cinematic', 2],
  ['Pacing Duel', 2],
  ['Soundscape', 2],
  ['Color Alchemist', 2],
  ['Camera Academy', 3],
  ['The Mechanist', 4],
  ['Material Library', 4],
  ['World Builder', 4],
  ['Puppeteer', 4],
  ['Power Core', 4],
  ['Raid I — The Machine', 5],
  ['One-Minute Story', 5],
  ["Raid II — Director's Cut", 5],
  ['One-Person Studio', 5],
  ['Cinematic Master', 5],
];

describe('C1 — the pack satisfies the published schema', () => {
  it('validates against validateContentPack with zero issues (MQ-5, DG-1)', () => {
    expect(validateContentPack(pack)).toEqual([]);
  });

  it('has a stable content version that does not depend on file order (BE-15)', () => {
    expect(contentVersion(pack)).toBe(contentVersion(buildPack()));
    expect(contentVersion(pack)).toMatch(/^[0-9a-f]+$/);
  });

  it('uses unique ids across every quest', () => {
    const ids = pack.quests.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('C2 — the campaign matches PRD §5 (MQ-1)', () => {
  it('ships exactly 18 main-track quests', () => {
    expect(mains).toHaveLength(18);
  });

  it('uses the exact PRD titles in the exact worlds', () => {
    expect(mains.map((q) => [q.title, q.world])).toEqual(CAMPAIGN);
  });

  /**
   * ⚠ PRD §5 нь 19 гарчиг жагсаасан ба тэдгээрийн ЗӨВХӨН нэгийг «(Boss)» гэж
   * тэмдэглэсэн. MQ-1 нь 18 гэж шаарддаг тул «The Strange Room» нь boss track,
   * үлдсэн 18 нь main track (A-CONTENT-1).
   */
  it('keeps The Strange Room on the boss track, outside the 18', () => {
    const boss = pack.quests.find((q) => q.title === 'The Strange Room');
    expect(boss).toBeDefined();
    expect(boss!.track).toBe('boss');
    expect(boss!.world).toBe(3);
  });

  it('covers every world from 1 to 5', () => {
    expect([...new Set(mains.map((q) => q.world))].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('C3 — the prerequisite graph is sound (MQ-2)', () => {
  it('references only quests that exist', () => {
    expect(violations('MQ-2')).toEqual([]);
    // Сканнер бодит граф уншиж байгаа эсэх — урьдчилсан нөхцөл ҮНЭХЭЭР бий.
    expect(pack.quests.some((q) => q.prerequisites.length > 0)).toBe(true);
  });

  it('contains no cycles', () => {
    expect(violations('MQ-2').filter((v) => v.includes('cycle'))).toEqual([]);
  });

  it('never requires a quest from a later world', () => {
    expect(violations('MQ-2').filter((v) => v.includes('later world'))).toEqual([]);
  });

  it('never gates a quest behind a level the player cannot have reached', () => {
    // Дэлхий 1-ийн эхний quest нь түвшин 1-д боломжтой байх ЁСТОЙ — эс бөгөөс шинэ
    // тоглогч юу ч эхлүүлж чадахгүй.
    const openers = mains.filter((q) => q.world === 1 && q.prerequisites.length === 0);
    expect(openers.length).toBeGreaterThan(0);
    expect(Math.min(...openers.map((q) => q.levelRequired))).toBe(1);
  });
});

describe('C4 — side quests (SQ-1)', () => {
  it('ships at least 20', () => {
    expect(violations('SQ-1')).toEqual([]);
    expect(sides.length).toBeGreaterThanOrEqual(20);
  });

  it('gives each side quest one or two skill tags', () => {
    expect(violations('SQ-1').filter((v) => v.includes('tags'))).toEqual([]);
  });

  it('marks side quests repeatable so the practice gym stays open (SQ-2)', () => {
    expect(violations('SQ-1').filter((v) => v.includes('repeatable'))).toEqual([]);
    expect(sides.every((q) => q.repeatable)).toBe(true);
  });
});

describe('C5/C6 — anti-grind economy (SQ-3, SQ-4)', () => {
  const inWorld = (list: QuestDefinition[], w: number) => list.filter((q) => q.world === w);

  it('keeps every side quest worth less xp than the cheapest main quest in its world (SQ-3)', () => {
    const offenders: string[] = [];
    for (const w of worlds) {
      const mainXp = inWorld(mains, w).map((q) => q.xp);
      const sideXp = inWorld(sides, w);
      if (mainXp.length === 0 || sideXp.length === 0) continue;
      const cheapestMain = Math.min(...mainXp);
      for (const s of sideXp) if (s.xp >= cheapestMain) offenders.push(`${s.id}: ${s.xp} >= ${cheapestMain}`);
    }
    expect(offenders).toEqual([]);
  });

  /** PRD §6 — «эцэс төгсгөлгүй side quest тармуулах» нь ХАМГИЙН САЙН стратеги болж болохгүй. */
  it('makes repeated side questing worse xp-per-minute than the campaign (SQ-4)', () => {
    const offenders: string[] = [];
    for (const w of worlds) {
      const mainsHere = inWorld(mains, w);
      const sidesHere = inWorld(sides, w);
      if (mainsHere.length === 0 || sidesHere.length === 0) continue;
      const mainRate =
        mainsHere.reduce((sum, q) => sum + q.xp / q.estimatedMinutes, 0) / mainsHere.length;
      for (const s of sidesHere) {
        const repeatRate = sideQuestXp(s.xp, 4, s.repeatXpMultiplier) / s.estimatedMinutes;
        if (repeatRate >= mainRate) offenders.push(`${s.id}: ${repeatRate.toFixed(2)} >= ${mainRate.toFixed(2)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('C7 — quest fields are complete and in range (MQ-5, STA-4)', () => {
  it('costs between 1 and 6 stamina everywhere (STA-4)', () => {
    expect(violations('STA-4')).toEqual([]);
  });

  it('fills every narrative and evidence field (MQ-5)', () => {
    const missing: string[] = [];
    for (const q of pack.quests) {
      if (!q.summary.trim()) missing.push(`${q.id}.summary`);
      if (!q.description.trim()) missing.push(`${q.id}.description`);
      if (!q.reflectionPrompt.trim()) missing.push(`${q.id}.reflectionPrompt`);
      if (q.deliverables.length === 0) missing.push(`${q.id}.deliverables`);
      if (q.victoryConditions.length === 0) missing.push(`${q.id}.victoryConditions`);
      if (q.stretchGoals.length === 0) missing.push(`${q.id}.stretchGoals`);
      if (q.estimatedMinutes < 1) missing.push(`${q.id}.estimatedMinutes`);
    }
    expect(missing).toEqual([]);
  });

  it('writes victory conditions as observable, checkable statements (MQ-6)', () => {
    const tooVague = pack.quests.flatMap((q) =>
      q.victoryConditions.filter((v) => v.trim().length < 12).map((v) => `${q.id}: "${v}"`),
    );
    expect(tooVague).toEqual([]);
  });

  it('covers all seven learning domains with at least two quests each (PRD §4)', () => {
    const thin = SKILL_TAGS.filter(
      (tag) => pack.quests.filter((q) => q.tags.includes(tag)).length < 2,
    );
    expect(thin).toEqual([]);
  });
});

describe('C8/C14 — dungeons (DG-1)', () => {
  it('ships at least one dungeon per learning domain', () => {
    const thin = SKILL_TAGS.filter((tag) => pack.dungeons.filter((d) => d.tags.includes(tag)).length < 1);
    expect(thin).toEqual([]);
  });

  it('gives each dungeon one to three tutorial references (DG-1)', () => {
    const bad = pack.dungeons.filter((d) => d.tutorialRefs.length < 1 || d.tutorialRefs.length > 3);
    expect(bad.map((d) => d.id)).toEqual([]);
  });

  it('asks at least one mastery question with a usable answer key (DG-1)', () => {
    const bad: string[] = [];
    for (const d of pack.dungeons) {
      if (d.questions.length === 0) bad.push(`${d.id}: no questions`);
      for (const q of d.questions) {
        if (q.correctIndex >= q.options.length) bad.push(`${d.id}/${q.id}: correctIndex out of range`);
        if (!q.explanation.trim()) bad.push(`${d.id}/${q.id}: no explanation`);
        if (new Set(q.options).size !== q.options.length) bad.push(`${d.id}/${q.id}: duplicate options`);
      }
    }
    expect(bad).toEqual([]);
  });

  /** ⚠ C14 нь URL-ийн ЧАНАРЫГ шалгахгүй — зөвхөн хэлбэрийг. Чанар нь T-22-ийн хүний баталгаа. */
  it('uses well-formed https tutorial links (DG-1, C14)', () => {
    const bad: string[] = [];
    for (const d of pack.dungeons)
      for (const t of d.tutorialRefs) {
        if (!/^https:\/\/\S+$/.test(t.url)) bad.push(`${d.id}: ${t.url}`);
        if (!t.title.trim()) bad.push(`${d.id}: empty tutorial title`);
        if (t.minutes < 1) bad.push(`${d.id}: tutorial minutes < 1`);
      }
    expect(bad).toEqual([]);
  });

  it('states a concept goal so a dungeon is never just a link dump (DG-1)', () => {
    const bad = pack.dungeons.filter((d) => d.conceptGoal.trim().length < 10);
    expect(bad.map((d) => d.id)).toEqual([]);
  });
});

describe('C9 — encounters (ENC-1)', () => {
  it('ships at least five', () => {
    expect(violations('ENC-1')).toEqual([]);
    expect(pack.encounters.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps every encounter short and actionable (ENC-1)', () => {
    expect(violations('ENC-1')).toEqual([]);
  });
});

describe('C10 — achievements (ACH-1)', () => {
  it('ships at least twelve', () => {
    // ⚠ v1.2.0-д тааз 40 болов (RET-7) — PERSONAL-1-ийн 12-ийн доод хязгаар ХҮЧИНТЭЙ хэвээр.
    expect(violations('RET-7')).toEqual([]);
    expect(pack.achievements.length).toBeGreaterThanOrEqual(12);
  });

  /**
    * ⚠ Зөвшөөрөгдөх `kind`-ийн жагсаалтыг ЭНД гараар бичихгүй: `content-rules.ts`
    * нь түүнийг `schemas.ts`-ийн энумаас гаргадаг. Хуулбар нь гэрээ өргөжихөд
    * (v1.2.0-д 5 kind нэмэгдсэн) чимээгүй хоцорч, тест худал улаан болно.
    */
  it('uses only predicate kinds the domain can evaluate (ACH-1)', () => {
    expect(violations('ACH-1')).toEqual([]);
  });

  it('uses a valid tier name for every bossTier predicate (ACH-1)', () => {
    expect(violations('ACH-1').filter((v) => v.includes('bossTier'))).toEqual([]);
    expect(pack.achievements.some((a) => a.predicate.kind === 'bossTier')).toBe(true);
  });
});

describe('C11 — loot stays cosmetic (EC-1)', () => {
  it('marks every item cosmetic — nothing may buy progression', () => {
    expect(violations('EC-1')).toEqual([]);
  });

  it('ships enough items that the drop table is not instantly exhausted', () => {
    expect(pack.loot.length).toBeGreaterThanOrEqual(8);
  });
});

describe('C12 — boss coaching always has something to recommend (BS-3)', () => {
  it('has at least one side quest for every boss category tag', () => {
    const uncovered = Object.entries(BOSS_CATEGORY_TAGS).filter(
      ([, tag]) => !sides.some((q) => q.tags.some((t) => t === tag)),
    );
    expect(uncovered.map(([category]) => category)).toEqual([]);
  });
});

describe('C13 — the skill tree is a sound DAG (PRG-5)', () => {
  it('costs exactly one skill point per skill', () => {
    // ⚠ v1.2.0-д ВАЛЮТ хуваагдсан (tier-1 skillPoint · tier-2/3 mastery point),
    // ҮНЭ нь 1 хэвээр (SKL-5) — `PRG-5`-ийн зам хөндөгдөөгүй.
    expect(violations('SKL-5')).toEqual([]);
  });

  it('references only skills that exist and forms no cycle', () => {
    const byId = new Map(pack.skills.map((s) => [s.id, s]));
    const problems: string[] = [];
    for (const s of pack.skills)
      for (const p of s.prerequisites) if (!byId.has(p)) problems.push(`${s.id} → ${p}`);

    const state = new Map<string, 'visiting' | 'done'>();
    const walk = (id: string): void => {
      if (state.get(id) === 'done') return;
      if (state.get(id) === 'visiting') {
        problems.push(`cycle at ${id}`);
        return;
      }
      state.set(id, 'visiting');
      for (const p of byId.get(id)?.prerequisites ?? []) walk(p);
      state.set(id, 'done');
    };
    for (const s of pack.skills) walk(s.id);
    expect(problems).toEqual([]);
  });

  it('offers at least one skill with no prerequisites so the tree can be entered', () => {
    expect(pack.skills.some((s) => s.prerequisites.length === 0)).toBe(true);
  });
});
