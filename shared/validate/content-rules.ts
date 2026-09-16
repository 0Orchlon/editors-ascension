/**
 * Контентын `[C]` дүрмүүд — ЦОРЫН ГАНЦ хувилбар (plan.md P-12; AC QX-5).
 *
 * ⚠ `npm run validate:content` CLI ба `web-app/tests/unit/content*.test.ts` ХОЁУЛАА
 * ЭНЭ модулийг дуудна. Шинэ validator бичих нь хоёр үнэн үүсгэнэ (PERSONAL-1 P-2).
 * ⚠ Схемийн хэлбэрийн шалгалт нь ЭНД БИШ — тэр нь `validateContentPack`
 * (`schemas.ts`). Энэ модуль нь схемээр илэрдэггүй БҮТЦИЙН тэнцвэрийг шалгана:
 * тоо, граф, эдийн засгийн харьцаа, лавлагааны бүрэн байдал.
 * ⚠ `../core/sideQuests.ts`-ээс `sideQuestXp` импортлогдоно — SQ-4 нь ТЭР ЯГ томьёог
 * шалгах ёстой. Тухайн модуль нь цэвэр арифметик (`constants.ts`-ээс өөр импорт
 * байхгүй) тул давхаргын мөчлөг үүсэхгүй.
 */
import { DEFAULT_REPEAT_XP_MULTIPLIER, SKILL_TAGS } from '../core/constants.ts';
import { AchievementDefinition } from './schemas.ts';
import { sideQuestXp } from '../core/sideQuests.ts';
import type { ContentPack, QuestDefinition } from '../types/index.ts';

export type ContentViolation = {
  /** AC-ийн ID (`MQ-1`, `SQ-4`, …) — CLI-ийн гаралт болон тестийн хаяг. */
  rule: string;
  /** Зөрчил ЯМАР элементэд байгаа (`quests/first-cut`) — хүн засах газраа мэдэх ёстой. */
  path: string;
  message: string;
};

/** ⚠ PERSONAL-1-ийн `[C]` багц. PERSONAL-2-ийн дүрмүүд `T-25`-д нэмэгдэнэ. */
export const CONTENT_RULE_IDS = [
  'MQ-1',
  'MQ-2',
  'MQ-5',
  'SQ-1',
  'SQ-3',
  'SQ-4',
  'STA-4',
  'DG-1',
  'ENC-1',
  'ACH-1',
  'EC-1',
] as const;

const MAIN_QUEST_COUNT = 18;
const MIN_SIDE_QUESTS = 20;
const MIN_ENCOUNTERS = 5;
const MIN_LOOT = 8;
const STAMINA_RANGE = { min: 1, max: 6 } as const;
const MAX_ENCOUNTER_MINUTES = 2;
const WORLDS = [1, 2, 3, 4, 5] as const;

/**
 * Зөвшөөрөгдөх предикатын `kind`-ууд нь `schemas.ts`-ийн энумаас ГАРГАГДАНА —
 * гараар хуулбарлавал гэрээ өргөжихөд энэ жагсаалт чимээгүй хоцорно.
 */
const KNOWN_PREDICATE_KINDS: readonly string[] =
  (AchievementDefinition.meta.fields?.predicate?.meta.fields?.kind?.meta.enum ?? []).map(String);

const BOSS_TIER_NAMES = ['mvp', 'advanced', 'mastery'] as const;

type Out = ContentViolation[];
const add = (out: Out, rule: string, path: string, message: string): void => {
  out.push({ rule, path, message });
};

// ───────────────────────────────────────────────────────── quest дүрмүүд

function mq1(pack: ContentPack, out: Out): void {
  const mains = pack.quests.filter((q) => q.track === 'main');
  if (mains.length !== MAIN_QUEST_COUNT)
    add(out, 'MQ-1', 'quests', `expected ${MAIN_QUEST_COUNT} main-track quests, found ${mains.length}`);

  const worlds = new Set(mains.map((q) => q.world));
  for (const w of WORLDS)
    if (!worlds.has(w)) add(out, 'MQ-1', 'quests', `world ${w} has no main-track quest`);

  const ids = pack.quests.map((q) => q.id);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) add(out, 'MQ-1', `quests/${id}`, 'duplicate quest id');
    seen.add(id);
  }
}

function mq2(pack: ContentPack, out: Out): void {
  const byId = new Map(pack.quests.map((q) => [q.id, q]));

  for (const q of pack.quests)
    for (const p of q.prerequisites) {
      const prereq = byId.get(p);
      if (prereq === undefined) {
        add(out, 'MQ-2', `quests/${q.id}`, `prerequisite ${p} does not exist`);
        continue;
      }
      if (prereq.world > q.world)
        add(out, 'MQ-2', `quests/${q.id}`, `prerequisite ${p} lives in a later world (${prereq.world} > ${q.world})`);
    }

  // Мөчлөг — DFS, «visiting» төлөв дээр буцаж ирвэл мөчлөг.
  const mark = new Map<string, 'visiting' | 'done'>();
  const walk = (id: string, trail: string[]): void => {
    if (mark.get(id) === 'done') return;
    if (mark.get(id) === 'visiting') {
      add(out, 'MQ-2', `quests/${id}`, `prerequisite cycle: ${[...trail, id].join(' → ')}`);
      return;
    }
    mark.set(id, 'visiting');
    for (const p of byId.get(id)?.prerequisites ?? []) walk(p, [...trail, id]);
    mark.set(id, 'done');
  };
  for (const q of pack.quests) walk(q.id, []);

  const openers = pack.quests.filter(
    (q) => q.track === 'main' && q.world === 1 && q.prerequisites.length === 0,
  );
  if (openers.length === 0)
    add(out, 'MQ-2', 'quests', 'world 1 has no prerequisite-free main quest — a new player cannot start');
  else if (Math.min(...openers.map((q) => q.levelRequired)) !== 1)
    add(out, 'MQ-2', 'quests', 'no world-1 opener is reachable at level 1');
}

function mq5(pack: ContentPack, out: Out): void {
  for (const q of pack.quests) {
    const at = `quests/${q.id}`;
    if (!q.summary.trim()) add(out, 'MQ-5', at, 'summary is empty');
    if (!q.description.trim()) add(out, 'MQ-5', at, 'description is empty');
    if (!q.reflectionPrompt.trim()) add(out, 'MQ-5', at, 'reflectionPrompt is empty');
    if (q.deliverables.length === 0) add(out, 'MQ-5', at, 'no deliverables');
    if (q.victoryConditions.length === 0) add(out, 'MQ-5', at, 'no victory conditions');
    if (q.stretchGoals.length === 0) add(out, 'MQ-5', at, 'no stretch goals');
    if (q.estimatedMinutes < 1) add(out, 'MQ-5', at, 'estimatedMinutes must be at least 1');
    // MQ-6 — шалгаж болохуйц өгүүлбэр; хэт ерөнхий нь checklist-ийг утгагүй болгоно.
    for (const v of q.victoryConditions)
      if (v.trim().length < 12) add(out, 'MQ-5', at, `victory condition too vague: "${v}"`);
  }

  const thin = SKILL_TAGS.filter((tag) => pack.quests.filter((q) => q.tags.includes(tag)).length < 2);
  for (const tag of thin)
    add(out, 'MQ-5', 'quests', `learning domain ${tag} has fewer than two quests`);
}

function sq1(pack: ContentPack, out: Out): void {
  const sides = pack.quests.filter((q) => q.track === 'side');
  if (sides.length < MIN_SIDE_QUESTS)
    add(out, 'SQ-1', 'quests', `expected at least ${MIN_SIDE_QUESTS} side quests, found ${sides.length}`);

  for (const q of sides) {
    if (q.tags.length < 1 || q.tags.length > 2)
      add(out, 'SQ-1', `quests/${q.id}`, `a side quest carries one or two tags, found ${q.tags.length}`);
    if (!q.repeatable)
      add(out, 'SQ-1', `quests/${q.id}`, 'side quests stay repeatable — the practice gym never closes');
  }
}

const inWorld = (list: readonly QuestDefinition[], w: number): QuestDefinition[] =>
  list.filter((q) => q.world === w);

function sq3(pack: ContentPack, out: Out): void {
  const mains = pack.quests.filter((q) => q.track === 'main');
  const sides = pack.quests.filter((q) => q.track === 'side');

  for (const w of WORLDS) {
    const mainXp = inWorld(mains, w).map((q) => q.xp);
    const here = inWorld(sides, w);
    if (mainXp.length === 0 || here.length === 0) continue;
    const cheapest = Math.min(...mainXp);
    for (const s of here)
      if (s.xp >= cheapest)
        add(out, 'SQ-3', `quests/${s.id}`, `${s.xp} xp is not below the cheapest world-${w} main quest (${cheapest})`);
  }
}

function sq4(pack: ContentPack, out: Out): void {
  const mains = pack.quests.filter((q) => q.track === 'main');
  const sides = pack.quests.filter((q) => q.track === 'side');

  for (const w of WORLDS) {
    const mainsHere = inWorld(mains, w);
    const sidesHere = inWorld(sides, w);
    if (mainsHere.length === 0 || sidesHere.length === 0) continue;
    const mainRate = mainsHere.reduce((sum, q) => sum + q.xp / q.estimatedMinutes, 0) / mainsHere.length;
    for (const s of sidesHere) {
      const repeatRate =
        sideQuestXp(s.xp, 4, s.repeatXpMultiplier ?? DEFAULT_REPEAT_XP_MULTIPLIER) / s.estimatedMinutes;
      if (repeatRate >= mainRate)
        add(
          out,
          'SQ-4',
          `quests/${s.id}`,
          `4th-repeat rate ${repeatRate.toFixed(2)} xp/min is not below the world-${w} campaign rate ${mainRate.toFixed(2)}`,
        );
    }
  }
}

function sta4(pack: ContentPack, out: Out): void {
  for (const q of pack.quests)
    if (q.staminaCost < STAMINA_RANGE.min || q.staminaCost > STAMINA_RANGE.max)
      add(
        out,
        'STA-4',
        `quests/${q.id}`,
        `stamina cost ${q.staminaCost} is outside ${STAMINA_RANGE.min}..${STAMINA_RANGE.max}`,
      );
}

// ───────────────────────────────────────────── dungeon · encounter · achievement · loot

function dg1(pack: ContentPack, out: Out): void {
  const thin = SKILL_TAGS.filter((tag) => pack.dungeons.filter((d) => d.tags.includes(tag)).length < 1);
  for (const tag of thin) add(out, 'DG-1', 'dungeons', `learning domain ${tag} has no study dungeon`);

  for (const d of pack.dungeons) {
    const at = `dungeons/${d.id}`;
    if (d.tutorialRefs.length < 1 || d.tutorialRefs.length > 3)
      add(out, 'DG-1', at, `a dungeon carries one to three tutorial refs, found ${d.tutorialRefs.length}`);
    if (d.conceptGoal.trim().length < 10)
      add(out, 'DG-1', at, 'conceptGoal must say what is being learned — a link dump is not a dungeon');
    if (d.questions.length === 0) add(out, 'DG-1', at, 'no mastery questions');

    for (const t of d.tutorialRefs) {
      if (!/^https:\/\/\S+$/.test(t.url)) add(out, 'DG-1', at, `tutorial url is not https: ${t.url}`);
      if (!t.title.trim()) add(out, 'DG-1', at, 'tutorial title is empty');
      if (t.minutes < 1) add(out, 'DG-1', at, 'tutorial minutes must be at least 1');
    }

    for (const q of d.questions) {
      const qat = `${at}/${q.id}`;
      if (q.correctIndex >= q.options.length || q.correctIndex < 0)
        add(out, 'DG-1', qat, `correctIndex ${q.correctIndex} is out of range`);
      if (!q.explanation.trim()) add(out, 'DG-1', qat, 'no explanation for the answer');
      if (new Set(q.options).size !== q.options.length) add(out, 'DG-1', qat, 'duplicate options');
    }
  }
}

function enc1(pack: ContentPack, out: Out): void {
  if (pack.encounters.length < MIN_ENCOUNTERS)
    add(out, 'ENC-1', 'encounters', `expected at least ${MIN_ENCOUNTERS}, found ${pack.encounters.length}`);

  for (const e of pack.encounters) {
    const at = `encounters/${e.id}`;
    if (!e.callToAction.trim()) add(out, 'ENC-1', at, 'no call to action');
    if ((e.maxMinutes ?? 1) > MAX_ENCOUNTER_MINUTES)
      add(out, 'ENC-1', at, `longer than ${MAX_ENCOUNTER_MINUTES} minutes`);
    if (e.weight <= 0) add(out, 'ENC-1', at, 'weight must be positive');
  }
}

function ach1(pack: ContentPack, out: Out): void {
  const seen = new Set<string>();
  for (const a of pack.achievements) {
    const at = `achievements/${a.id}`;
    if (seen.has(a.id)) add(out, 'ACH-1', at, 'duplicate achievement id');
    seen.add(a.id);

    if (!KNOWN_PREDICATE_KINDS.includes(a.predicate.kind))
      add(out, 'ACH-1', at, `predicate kind ${a.predicate.kind} cannot be evaluated by the domain`);
    if (
      a.predicate.kind === 'bossTier' &&
      !(BOSS_TIER_NAMES as readonly string[]).includes(String(a.predicate.value))
    )
      add(out, 'ACH-1', at, `bossTier predicate value ${String(a.predicate.value)} is not a tier name`);
  }
}

function ec1(pack: ContentPack, out: Out): void {
  if (pack.loot.length < MIN_LOOT)
    add(out, 'EC-1', 'loot', `expected at least ${MIN_LOOT} items, found ${pack.loot.length}`);
  for (const i of pack.loot)
    if (i.effect !== 'cosmetic')
      add(out, 'EC-1', `loot/${i.id}`, `effect ${String(i.effect)} is not cosmetic — nothing may buy progression`);
}

/** Бүх `[C]` дүрмийг ажиллуулж зөрчлүүдийг буцаана. Хоосон = контент хүчинтэй. */
export function checkContentRules(pack: ContentPack): ContentViolation[] {
  const out: Out = [];
  mq1(pack, out);
  mq2(pack, out);
  mq5(pack, out);
  sq1(pack, out);
  sq3(pack, out);
  sq4(pack, out);
  sta4(pack, out);
  dg1(pack, out);
  enc1(pack, out);
  ach1(pack, out);
  ec1(pack, out);
  return out;
}
