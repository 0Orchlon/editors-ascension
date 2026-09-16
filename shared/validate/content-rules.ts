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
import {
  DEFAULT_REPEAT_XP_MULTIPLIER,
  GUILD_COUNT,
  MASTERY_MAX_LEVEL,
  REP_THRESHOLDS,
  SKILL_TAGS,
} from '../core/constants.ts';
import { AchievementDefinition } from './schemas.ts';
import { sideQuestXp } from '../core/sideQuests.ts';
import type { ContentPack, QuestDefinition, SkillDefinition } from '../types/index.ts';

export type ContentViolation = {
  /** AC-ийн ID (`MQ-1`, `SQ-4`, …) — CLI-ийн гаралт болон тестийн хаяг. */
  rule: string;
  /** Зөрчил ЯМАР элементэд байгаа (`quests/first-cut`) — хүн засах газраа мэдэх ёстой. */
  path: string;
  message: string;
};

/** PERSONAL-1-ийн `[C]` багц + PERSONAL-2-ийн өргөтгөл (T-25). */
export const CONTENT_RULE_IDS = [
  // PERSONAL-1
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
  // PERSONAL-2 (T-25)
  'SKL-1',
  'SKL-5',
  'BSX-1',
  'RET-1',
  'RET-3',
  'RET-5',
  'RET-7',
  'COS-1',
  'COS-2',
  'OFF-2',
] as const;

const MAIN_QUEST_COUNT = 18;
const MIN_SIDE_QUESTS = 20;
const MIN_ENCOUNTERS = 5;
const MIN_LOOT = 8;
const STAMINA_RANGE = { min: 1, max: 6 } as const;
const MAX_ENCOUNTER_MINUTES = 2;
const WORLDS = [1, 2, 3, 4, 5] as const;
const MIN_SKILLS = 28;
const MIN_ACHIEVEMENTS = 40;
const MIN_CHAINS = 3;
const CHAIN_STEPS = 4;
const MIN_COSMETICS = 60;
const MIN_COSMETICS_PER_SLOT = 5;
const MAX_BOSS_TOTAL = 60;
const COSMETIC_SLOT_NAMES = [
  'avatarFrame',
  'campBanner',
  'title',
  'campDecoration',
  'uiAccent',
  'badgeFrame',
] as const;
/** Контент дотор URL хайх — `g` туг нь `String.match`-д БҮХ таарлыг буцаана. */
const URL_IN_CONTENT = /https?:\/\/[^\s"'`)]+/g;

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


// ────────────────────────────── PERSONAL-2-ийн дүрмүүд (T-25)

/** Урьдчилсан нөхцөлийн ЗАМ дээр хүссэн tier байгаа эсэх — tier алгасалтын шалгалт. */
function ancestorAtTier(
  skill: SkillDefinition,
  wanted: number,
  byId: Map<string, SkillDefinition>,
): boolean {
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

function skl1(pack: ContentPack, out: Out): void {
  const skills = pack.skills;
  const byId = new Map(skills.map((s) => [s.id, s]));

  if (skills.length < MIN_SKILLS)
    add(out, 'SKL-1', 'skills', `expected at least ${MIN_SKILLS} nodes, found ${skills.length}`);

  for (const s of skills) {
    const at = `skills/${s.id}`;
    if (!SKILL_TAGS.includes(s.track)) add(out, 'SKL-1', at, `track ${s.track} is not a skill tag`);
    if (s.tier < 1 || s.tier > 3) add(out, 'SKL-1', at, `tier ${s.tier} is outside 1..3`);
    for (const p of s.prerequisites)
      if (!byId.has(p)) add(out, 'SKL-1', at, `prerequisite ${p} does not exist`);
  }

  for (const tag of SKILL_TAGS) {
    const tree = skills.filter((s) => s.track === tag);
    const at = `skills/${tag}`;
    if (tree.filter((s) => s.tier === 1).length < 1) add(out, 'SKL-1', at, 'no tier-1 node');
    if (tree.filter((s) => s.tier === 2).length < 1) add(out, 'SKL-1', at, 'no tier-2 node');
    const capstones = tree.filter((s) => s.tier === 3);
    if (capstones.length !== 1)
      add(out, 'SKL-1', at, `expected exactly one tier-3 capstone, found ${capstones.length}`);
  }

  /**
   * ⚠ «tier алгасахгүй» нь ЗАМААР шалгагдана, ШУУД урьдчилсан нөхцөлөөр БИШ:
   * `sk-uv-texturing` (tier 2) нь `sk-modeling` (tier 2)-оор дамжин tier-1 хүрнэ.
   * Шууд шалгалт нь DAG-д давхардсан, утгагүй prerequisite бичихийг шаардах байв.
   */
  for (const s of skills) {
    if (s.tier >= 2 && !ancestorAtTier(s, s.tier - 1, byId))
      add(out, 'SKL-1', `skills/${s.id}`, `tier ${s.tier} node has no tier-${s.tier - 1} ancestor`);
    if (s.tier === 3)
      for (const p of s.prerequisites)
        if (byId.get(p)?.track !== s.track)
          add(out, 'SKL-1', `skills/${s.id}`, `capstone prerequisite ${p} comes from another track`);
  }

  // Мөчлөг — capstone нэмэгдсэн ч граф DAG хэвээр байх ёстой.
  const mark = new Map<string, 'visiting' | 'done'>();
  const walk = (id: string, trail: string[]): void => {
    if (mark.get(id) === 'done') return;
    if (mark.get(id) === 'visiting') {
      add(out, 'SKL-1', `skills/${id}`, `prerequisite cycle: ${[...trail, id].join(' → ')}`);
      return;
    }
    mark.set(id, 'visiting');
    for (const p of byId.get(id)?.prerequisites ?? []) walk(p, [...trail, id]);
    mark.set(id, 'done');
  };
  for (const s of skills) walk(s.id, []);

  if (!skills.some((s) => s.prerequisites.length === 0))
    add(out, 'SKL-1', 'skills', 'no entry node — the tree cannot be entered');
}

/** ⚠ Валют өөрчлөгдсөн, ҮНЭ өөрчлөгдөөгүй — `cost` нь 1 ХЭВЭЭР (plan.md P-3). */
function skl5(pack: ContentPack, out: Out): void {
  for (const s of pack.skills) {
    const at = `skills/${s.id}`;
    if (s.cost !== 1) add(out, 'SKL-5', at, `cost ${s.cost} — every node costs exactly 1`);
    if (!s.title.trim()) add(out, 'SKL-5', at, 'title is empty');
    if (!s.description.trim()) add(out, 'SKL-5', at, 'description is empty');
  }
}

function bsx1(pack: ContentPack, out: Out): void {
  const bosses = pack.quests.filter((q) => q.track === 'boss');
  for (const w of WORLDS) {
    const here = bosses.filter((b) => b.world === w);
    if (here.length !== 1)
      add(out, 'BSX-1', 'quests', `world ${w} has ${here.length} boss quests, expected exactly 1`);
  }
}

function ret1(pack: ContentPack, out: Out): void {
  const chains = pack.chains;
  const sideIds = new Set(pack.quests.filter((q) => q.track === 'side').map((q) => q.id));

  if (chains.length < MIN_CHAINS)
    add(out, 'RET-1', 'chains', `expected at least ${MIN_CHAINS}, found ${chains.length}`);

  const owner = new Map<string, string>();
  const seenIds = new Set<string>();
  for (const c of chains) {
    const at = `chains/${c.id}`;
    if (seenIds.has(c.id)) add(out, 'RET-1', at, 'duplicate chain id');
    seenIds.add(c.id);
    if (c.steps.length !== CHAIN_STEPS)
      add(out, 'RET-1', at, `expected exactly ${CHAIN_STEPS} steps, found ${c.steps.length}`);
    if (new Set(c.steps).size !== c.steps.length)
      add(out, 'RET-1', at, 'the same side quest appears twice inside the chain');

    for (const step of c.steps) {
      if (!sideIds.has(step)) add(out, 'RET-1', at, `step ${step} is not a side quest`);
      const other = owner.get(step);
      // ⚠ Хоёр chain-д орсон side quest нь «чанд дараалал»-ыг хоёрдмол болгоно.
      if (other !== undefined && other !== c.id)
        add(out, 'RET-1', at, `step ${step} already belongs to ${other}`);
      owner.set(step, c.id);
    }
  }
}

function ret3(pack: ContentPack, out: Out): void {
  const mains = pack.quests.filter((q) => q.track === 'main');
  for (const c of pack.chains) {
    const here = inWorld(mains, c.world).map((q) => q.xp);
    if (here.length === 0) {
      add(out, 'RET-3', `chains/${c.id}`, `world ${c.world} has no main quest to set the bonus ceiling`);
      continue;
    }
    const ceiling = Math.min(...here);
    if (c.bonusXp > ceiling)
      add(
        out,
        'RET-3',
        `chains/${c.id}`,
        `bonusXp ${c.bonusXp} exceeds the cheapest world-${c.world} main quest (${ceiling})`,
      );
  }
}

/** 7 tag → 4 guild, давхцалгүй, дутуугүй (plan.md P-13). */
function ret5(pack: ContentPack, out: Out): void {
  const guilds = pack.guilds;
  if (guilds.length !== GUILD_COUNT)
    add(out, 'RET-5', 'guilds', `expected ${GUILD_COUNT} guilds, found ${guilds.length}`);

  const owners = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const g of guilds) {
    if (seen.has(g.id)) add(out, 'RET-5', `guilds/${g.id}`, 'duplicate guild id');
    seen.add(g.id);
    if (!g.title.trim()) add(out, 'RET-5', `guilds/${g.id}`, 'title is empty');
    for (const t of g.tags) owners.set(t, [...(owners.get(t) ?? []), g.id]);
  }

  for (const tag of SKILL_TAGS) {
    const hits = owners.get(tag) ?? [];
    if (hits.length !== 1)
      add(out, 'RET-5', 'guilds', `skill tag ${tag} maps to ${hits.length} guilds, expected exactly 1`);
  }
  for (const [tag, hits] of owners)
    if (!SKILL_TAGS.includes(tag as (typeof SKILL_TAGS)[number]))
      add(out, 'RET-5', `guilds/${hits[0]}`, `unknown skill tag ${tag}`);
}

const BOSS_TOTAL_RANGE = { min: 0, max: MAX_BOSS_TOTAL } as const;

function ret7(pack: ContentPack, out: Out): void {
  const achievements = pack.achievements;
  if (achievements.length < MIN_ACHIEVEMENTS)
    add(
      out,
      'RET-7',
      'achievements',
      `expected at least ${MIN_ACHIEVEMENTS}, found ${achievements.length}`,
    );

  const guildIds = new Set(pack.guilds.map((g) => g.id));
  const bossIds = new Set(pack.quests.filter((q) => q.track === 'boss').map((q) => q.id));
  const kinds = new Set(achievements.map((a) => a.predicate.kind));

  for (const a of achievements) {
    const at = `achievements/${a.id}`;
    const { kind, value, ref } = a.predicate;
    const n = Number(value);

    if (kind === 'masteryLevel') {
      if (ref !== undefined && !SKILL_TAGS.includes(ref as (typeof SKILL_TAGS)[number]))
        add(out, 'RET-7', at, `masteryLevel ref ${ref} is not a skill tag`);
      if (n < 1 || n > MASTERY_MAX_LEVEL)
        add(out, 'RET-7', at, `mastery level ${n} is outside 1..${MASTERY_MAX_LEVEL}`);
    }
    if (kind === 'guildRank') {
      if (ref !== undefined && !guildIds.has(ref))
        add(out, 'RET-7', at, `guildRank ref ${ref} is not a guild`);
      if (n < 1 || n > REP_THRESHOLDS.length)
        add(out, 'RET-7', at, `guild rank ${n} is outside 1..${REP_THRESHOLDS.length}`);
    }
    if (kind === 'bossPersonalBest') {
      if (ref !== undefined && !bossIds.has(ref))
        add(out, 'RET-7', at, `bossPersonalBest ref ${ref} is not a boss`);
      if (n < BOSS_TOTAL_RANGE.min || n > BOSS_TOTAL_RANGE.max)
        add(out, 'RET-7', at, `boss total ${n} is outside ${BOSS_TOTAL_RANGE.min}..${BOSS_TOTAL_RANGE.max}`);
    }
    if (kind === 'chainsCompleted' && n > pack.chains.length)
      add(out, 'RET-7', at, `needs ${n} chains but only ${pack.chains.length} exist`);
    if (kind === 'prestigeCount' && n < 1)
      add(out, 'RET-7', at, 'prestigeCount threshold must be at least 1');
  }

  /**
   * ⚠ plan.md §12.5 — prestige цол ба streak шагналын cosmetic нь `kind:'achievement'`-ээр
   * ЭДГЭЭР предикатад заана. Байхгүй бол тэр cosmetic өнчирч `COS-2` унана.
   */
  for (const needed of ['prestigeCount', 'streakDays'] as const)
    if (!kinds.has(needed))
      add(out, 'RET-7', 'achievements', `no ${needed} achievement — the matching cosmetics would be orphaned`);
}

function cos1(pack: ContentPack, out: Out): void {
  const cosmetics = pack.cosmetics;
  if (cosmetics.length < MIN_COSMETICS)
    add(out, 'COS-1', 'cosmetics', `expected at least ${MIN_COSMETICS}, found ${cosmetics.length}`);

  const seen = new Set<string>();
  for (const c of cosmetics) {
    const at = `cosmetics/${c.id}`;
    if (seen.has(c.id)) add(out, 'COS-1', at, 'duplicate cosmetic id');
    seen.add(c.id);
    if (!c.title.trim()) add(out, 'COS-1', at, 'title is empty');
    if (!(COSMETIC_SLOT_NAMES as readonly string[]).includes(c.slot))
      add(out, 'COS-1', at, `slot ${c.slot} is not one of the six contract slots`);
    // ⚠ AC EC-1 хэвээр — cosmetic нь тоглоомын тоон нөлөө агуулахгүй.
    if (c.effect !== 'cosmetic') add(out, 'COS-1', at, `effect ${String(c.effect)} is not cosmetic`);
  }

  for (const slot of COSMETIC_SLOT_NAMES) {
    const here = cosmetics.filter((c) => c.slot === slot);
    if (here.length < MIN_COSMETICS_PER_SLOT)
      add(
        out,
        'COS-1',
        `cosmetics/${slot}`,
        `slot has ${here.length} items, expected at least ${MIN_COSMETICS_PER_SLOT}`,
      );
  }
}

/** ⚠ Өнчин шагнал ХОРИОТОЙ — `unlockSource` нь БОДИТ id-д заана (AC COS-2). */
function cos2(pack: ContentPack, out: Out): void {
  const questIds = new Set(pack.quests.map((q) => q.id));
  const bossIds = new Set(pack.quests.filter((q) => q.track === 'boss').map((q) => q.id));
  const achievementIds = new Set(pack.achievements.map((a) => a.id));
  const guildIds = new Set(pack.guilds.map((g) => g.id));
  const lootIds = new Set(pack.loot.map((l) => l.id));

  for (const c of pack.cosmetics) {
    const at = `cosmetics/${c.id}`;
    const { kind, refId, value } = c.unlockSource;
    const n = Number(value);

    if (lootIds.has(c.id)) add(out, 'COS-2', at, 'id collides with an RNG loot item');

    switch (kind) {
      case 'quest':
        if (!questIds.has(refId)) add(out, 'COS-2', at, `quest ${refId} does not exist`);
        if (value !== undefined) add(out, 'COS-2', at, 'a quest unlock carries no value');
        break;
      case 'boss':
        if (!bossIds.has(refId)) add(out, 'COS-2', at, `boss ${refId} does not exist`);
        if (!(BOSS_TIER_NAMES as readonly string[]).includes(String(value)))
          add(out, 'COS-2', at, `boss unlock value ${String(value)} is not a tier name`);
        break;
      case 'achievement':
        if (!achievementIds.has(refId)) add(out, 'COS-2', at, `achievement ${refId} does not exist`);
        if (value !== undefined) add(out, 'COS-2', at, 'an achievement unlock carries no value');
        break;
      case 'guildRank':
        if (!guildIds.has(refId)) add(out, 'COS-2', at, `guild ${refId} does not exist`);
        if (n < 1 || n > REP_THRESHOLDS.length)
          add(out, 'COS-2', at, `guild rank ${n} is outside 1..${REP_THRESHOLDS.length}`);
        break;
      case 'mastery':
        if (!SKILL_TAGS.includes(refId as (typeof SKILL_TAGS)[number]))
          add(out, 'COS-2', at, `mastery ref ${refId} is not a skill tag`);
        if (n < 1 || n > MASTERY_MAX_LEVEL)
          add(out, 'COS-2', at, `mastery level ${n} is outside 1..${MASTERY_MAX_LEVEL}`);
        break;
      default:
        add(out, 'COS-2', at, `unknown unlock kind ${String(kind)}`);
    }
  }
}

/**
 * OFF-2-ийн КОНТЕНТ тал — гадаад URL нь ЗӨВХӨН `tutorialRefs[].url`-д байна.
 * ⚠ Бусад талбарт URL гарах нь апп ачаалахад гадны host-д хандах зам болно; кодын
 * тал нь `web-app/tests/offline/no-external.test.ts`-д сканнердагдана (T-04).
 */
function off2(pack: ContentPack, out: Out): void {
  const allowed = new Set<string>();
  for (const q of pack.quests) for (const t of q.tutorialRefs) allowed.add(t.url);
  for (const d of pack.dungeons) for (const t of d.tutorialRefs) allowed.add(t.url);

  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      for (const url of node.match(URL_IN_CONTENT) ?? [])
        if (!allowed.has(url)) add(out, 'OFF-2', path, `external url outside tutorialRefs: ${url}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((el, i) => walk(el, `${path}/${i}`));
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'tutorialRefs') continue;
      walk(v, `${path}/${k}`);
    }
  };
  walk(pack, '');
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
  // PERSONAL-2 (T-25)
  skl1(pack, out);
  skl5(pack, out);
  bsx1(pack, out);
  ret1(pack, out);
  ret3(pack, out);
  ret5(pack, out);
  ret7(pack, out);
  cos1(pack, out);
  cos2(pack, out);
  off2(pack, out);
  return out;
}
