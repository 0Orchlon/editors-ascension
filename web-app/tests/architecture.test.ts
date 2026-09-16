/**
 * Сканнердсан архитектурын хамгаалалт (T-17, T-43; AC UI-3, D-1, D-2, BE-10).
 *
 * ⚠ Эдгээр нь СТИЛИЙН дүрэм БИШ. Тус бүр нь зөрчигдвөл чимээгүй эвдрэх шийдвэрийг
 * хамгаалдаг: домэйн давхарлал, детерминизм, гадаад хамаарал.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const sharedDir = join(repoRoot, 'shared');
const webSrc = join(repoRoot, 'web-app', 'src');

function filesUnder(dir: string, ext = '.ts'): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full, ext));
    else if (full.endsWith(ext)) out.push(full);
  }
  return out;
}

const read = (file: string) => readFileSync(file, 'utf8');
const rel = (file: string) => relative(repoRoot, file).replace(/\\/g, '/');

/** Импортын эх мөрүүд — тайлбар доторх дурдлагыг тоолохгүй. */
function importSources(source: string): string[] {
  const out: string[] = [];
  const re = /^\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(m[1]!);
  return out;
}

/** Тайлбар ба мөрийн төгсгөлийн тайлбарыг хасна — дүрмийг тайлбарт бичих нь зөрчил биш. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('shared/ purity (T-17)', () => {
  it('has no external dependencies — every import is relative (D-1)', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(sharedDir)) {
      for (const source of importSources(read(file))) {
        if (!source.startsWith('.')) offenders.push(`${rel(file)} → ${source}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('declares no package.json — shared/ is source, not a package', () => {
    expect(() => statSync(join(sharedDir, 'package.json'))).toThrow();
  });

  /** plan.md P-5 — цаг ба санамсаргүй нь ЗӨВХӨН `Ctx`-ээр орно (AC D-2). */
  it('keeps shared/core deterministic — no clock, no Math.random, no ambient I/O (D-2)', () => {
    const banned = [
      'Date.now(',
      'new Date(',
      'Math.random(',
      'localStorage',
      'sessionStorage',
      'process.',
      'fetch(',
      'crypto.randomUUID(',
    ];
    const offenders: string[] = [];
    for (const file of filesUnder(join(sharedDir, 'core'))) {
      const source = stripComments(read(file));
      for (const token of banned) if (source.includes(token)) offenders.push(`${rel(file)} → ${token}`);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps shared/core free of content imports — content arrives via Ctx.pack', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(join(sharedDir, 'core'))) {
      for (const source of importSources(read(file))) {
        if (source.includes('/content/') || source.endsWith('/content')) offenders.push(rel(file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps shared/content data-only — no rules, no core imports', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(join(sharedDir, 'content'))) {
      for (const source of importSources(read(file))) {
        if (source.includes('core/')) offenders.push(`${rel(file)} → ${source}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * AC EC-1 — cosmetic хил. `coins`/`inventory` нь ЗӨВХөН `economy.ts`-д бичигдэнэ;
   * прогрессийн модулиуд тэдгээрийг уншихгүй, бичихгүй.
   */
  it('keeps coins and inventory out of the progression modules (EC-1)', () => {
    const guarded = ['progression.ts', 'stamina.ts', 'sideQuests.ts'];
    const offenders: string[] = [];
    for (const name of guarded) {
      const source = stripComments(read(join(sharedDir, 'core', name)));
      for (const token of ['coins', 'inventory']) {
        if (source.includes(token)) offenders.push(`${name} → ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('web-app layering (T-17)', () => {
  /** AC UI-3 — `ui/` нь домэйныг ШУУД дуудахгүй; зөвхөн `services/` дамжина. */
  it('forbids ui/ from importing shared/core directly (UI-3)', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(join(webSrc, 'ui'))) {
      for (const source of importSources(read(file))) {
        if (source.includes('@shared/core') || source.includes('shared/core'))
          offenders.push(`${rel(file)} → ${source}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('forbids network calls from ui/ — the network lives in services/apiClient', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(join(webSrc, 'ui'))) {
      const source = stripComments(read(file));
      if (/\bfetch\s*\(/.test(source)) offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * T-43 — домэйн тогтмолыг гадаргуунд ДАХИН бичихийг хориглоно (AC BE-10).
 * Давхардсан тоо нь чимээгүй салалт үүсгэнэ: сервер нэг дүрмээр, клиент өөрөөр тооцно.
 */
describe('no duplicated domain constants (T-43)', () => {
  const surfaces = [webSrc, join(repoRoot, 'server', 'src')];

  it('never restates the xp thresholds outside shared/core/constants.ts (BE-10)', () => {
    const offenders: string[] = [];
    for (const dir of surfaces) {
      for (const file of filesUnder(dir)) {
        const source = stripComments(read(file));
        // Босгын дараалал — дор хаяж гурав нь зэрэг гарвал давхардал гэж үзнэ.
        const hits = ['100', '250', '500', '1000', '1750', '2750', '4000', '5500', '7500'].filter(
          (n) => new RegExp(`\\b${n}\\b`).test(source),
        );
        if (hits.length >= 5) offenders.push(`${rel(file)} → ${hits.join(',')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never restates the boss tier cut-offs outside shared/core/constants.ts (BE-10)', () => {
    const offenders: string[] = [];
    for (const dir of surfaces) {
      for (const file of filesUnder(dir)) {
        const source = stripComments(read(file));
        const hits = ['35', '45', '52'].filter((n) => new RegExp(`\\b${n}\\b`).test(source));
        if (hits.length === 3) offenders.push(rel(file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never restates the rank names outside shared/core/constants.ts (BE-10)', () => {
    const offenders: string[] = [];
    for (const dir of surfaces) {
      for (const file of filesUnder(dir)) {
        const source = stripComments(read(file));
        if (source.includes('Cinematic Master') && source.includes('Senior Generalist'))
          offenders.push(rel(file));
      }
    }
    expect(offenders).toEqual([]);
  });
});

/** Хамгаалалт өөрөө ажиллаж байгааг батална — «ногоон» нь хоосон сканнераас гарч болохгүй. */
describe('the guards actually bite (T-17)', () => {
  it('flags a planted determinism violation', () => {
    const planted = 'const now = Date.now();';
    expect(['Date.now(', 'Math.random('].some((t) => stripComments(planted).includes(t))).toBe(true);
  });

  it('flags a planted ui → core import', () => {
    const planted = `import { addXp } from '@shared/core/progression.ts';`;
    expect(importSources(planted).some((s) => s.includes('@shared/core'))).toBe(true);
  });

  it('scans a non-empty set of files — an empty scan would pass vacuously', () => {
    expect(filesUnder(join(sharedDir, 'core')).length).toBeGreaterThan(5);
  });

  it('does not mistake a rule written in a comment for a violation', () => {
    expect(stripComments('// never call Date.now( here')).not.toContain('Date.now(');
  });
});

/**
 * T-10 — ХҮЧНИЙ ХОРИГ (AC MST-5, RET-6, spec.md D-6).
 *
 * Mastery · reputation · campLayout · replayLog нь XP · stamina · coin · loot ·
 * quest/dungeon-ийн НЭЭЛТЭД нөлөөлөхгүй байх ёстой. Энэ нь машинаар шалгагдахгүй
 * амлалт учраас `EC-1`-ийн арга (импорт/токен сканнер) хэрэглэв: прогрессийн
 * модулиуд эдгээр утгыг УНШИХ боломжгүй бол нөлөөлж ч чадахгүй.
 *
 * ⚠ ИЛ зөвшөөрөгдсөн ганц үл хамаарах зүйл: `skillTree.ts` нь tier-2/3 node-ийн
 * нээлтэд mastery-г уншина (AC SKL-2 — гэрээнд нэрлэгдсэн). Тиймээс сканнер
 * ТУХАЙН файлыг хамрахгүй, гэхдээ түүнийг ил нэрлэж баримтжуулна.
 */
describe('power bans: progression never reads the new systems (T-10)', () => {
  /**
   * ⚠ ЯГ `lld.md §2`-ийн 9 модуль. Явцуу жагсаалт нь сканнерыг чимээгүй нүхтэй
   * болгоно: `encounters.ts` · `sideQuests.ts` · `streak.ts` · `projects.ts` нь
   * mastery-г уншиж чадах хэвээр үлдэж, D-6 зөвхөн заавар болж хувирна.
   */
  const GUARDED = [
    'progression.ts',
    'stamina.ts',
    'quests.ts',
    'dungeons.ts',
    'economy.ts',
    'encounters.ts',
    'sideQuests.ts',
    'streak.ts',
    'projects.ts',
  ];

  /**
   * Талбарын УНШИЛТ — `state.mastery`, `next.reputation[…]` гэх мэт.
   * ⚠ `...mastery.events` (дамжуулж буй үр дүнгийн ХУВЬСАГЧ) нь уншилт БИШ: энд
   * талбарын нэр нь `events`. Тиймээс энгийн дэд мөр хайлт хангалтгүй — таних
   * тэмдгийн дараах талбарыг л барина.
   */
  const fieldReads = (field: string): RegExp =>
    new RegExp(String.raw`(?<![.\w])[A-Za-z_$][\w$]*\.${field}\b`);
  const BANNED_FIELDS = ['mastery', 'masteryPoints', 'reputation', 'campLayout', 'replayLog'];

  it('keeps mastery, reputation, campLayout and replayLog out of the progression modules', () => {
    const offenders: string[] = [];
    for (const name of GUARDED) {
      const source = stripComments(read(join(sharedDir, 'core', name)));
      for (const field of BANNED_FIELDS)
        if (fieldReads(field).test(source)) offenders.push(`${name} → .${field}`);
    }
    expect(offenders).toEqual([]);
  });

  /** Roll-up нь ДУУДЛАГААР явагдана: `addMasteryXp` · `grantReputation` — уншилт биш бичилт. */
  it('still lets those modules hand work to the owning engines', () => {
    const quests = stripComments(read(join(sharedDir, 'core', 'quests.ts')));
    expect(quests).toContain('addMasteryXp');
    expect(quests).toContain('grantReputation');
  });

  it('keeps reputation reads inside the rep, cosmetic and achievement modules (RET-6)', () => {
    const allowed = ['reputation.ts', 'cosmetics.ts', 'achievements.ts'];
    const offenders: string[] = [];
    for (const file of filesUnder(join(sharedDir, 'core'))) {
      const name = basename(file);
      if (allowed.includes(name)) continue;
      if (fieldReads('reputation').test(stripComments(read(file)))) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  /** ⚠ AC SKL-2-ийн ил үл хамаарах зүйл — баримтжуулсан, чимээгүй биш. */
  it('documents skillTree.ts as the one module allowed to read mastery for unlocks', () => {
    const source = read(join(sharedDir, 'core', 'skillTree.ts'));
    expect(source).toContain('state.mastery');
    expect(source).toMatch(/SKL-2/);
  });

  it('keeps campLayout out of every domain module except the cosmetic engine (D-6)', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(join(sharedDir, 'core'))) {
      const name = basename(file);
      if (name === 'cosmetics.ts') continue;
      if (fieldReads('campLayout').test(stripComments(read(file)))) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps replayLog writes to the single append helper (P-10 · P-24)', () => {
    const writers: string[] = [];
    for (const file of filesUnder(join(sharedDir, 'core'))) {
      const name = basename(file);
      if (name === 'replayLog.ts') continue;
      if (fieldReads('replayLog').test(stripComments(read(file)))) writers.push(name);
    }
    expect(writers).toEqual([]);

    // `appendReplay`-ийн дуудагч нь ЯГ нэг модуль: `boss.ts` (plan.md P-24).
    const callers = filesUnder(join(sharedDir, 'core'))
      .filter((f) => !f.endsWith('replayLog.ts'))
      .filter((f) => stripComments(read(f)).includes('appendReplay('))
      .map((f) => basename(f));
    expect(callers).toEqual(['boss.ts']);
  });

  it('flags a planted mastery read inside a guarded module', () => {
    const planted = 'const level = state.mastery[tag].level;';
    expect(BANNED_FIELDS.some((f) => fieldReads(f).test(stripComments(planted)))).toBe(true);
  });

  it('flags a planted reputation read', () => {
    expect(fieldReads('reputation').test('if (state.reputation[g] > 10) xp *= 2;')).toBe(true);
    // ⚠ Үр дүнгийн хувьсагчийг дамжуулах нь уншилт БИШ — сканнер хэт хашгирахгүй.
    expect(fieldReads('reputation').test('events.push(...reputation.events);')).toBe(false);
  });

  it('scans a non-empty set of guarded files — an empty scan would pass vacuously', () => {
    for (const name of GUARDED) expect(read(join(sharedDir, 'core', name)).length).toBeGreaterThan(200);
  });
});

/**
 * Сканнер B — «БИЧИХ хориг» (`lld.md §2`). Дээрх сканнер А нь шинэ системүүд
 * прогрессийг УНШИХГҮЙ гэдгийг хаадаг; энэ нь эсрэг чиглэлийг хаана: шинэ
 * хөдөлгүүрүүд прогрессийн талбарт ШУУД БИЧИХГҮЙ.
 *
 * ⚠ Илрүүлэлт нь `{ ...state, xp: … }` хэлбэрийн олдвор — объектын дээд түвшний
 * түлхүүрийг л барина. `{ tag, xp: 0, level: 1 }` гэсэн ҮҮРЛЭСЭН `MasteryTrack`
 * литерал нь прогрессийн бичилт БИШ тул хашгирахгүй.
 * ⚠ Үл хамаарах ГАНЦ: `chains.ts` нь `bonusXp`-ийг `addXp`-ээр олгоно (RET-2) —
 * `progression.ts`-ийг импортлож БОЛНО, харин `xp`-д ШУУД бичихгүй.
 */
describe('power bans: the new engines never write progression state (T-10 · §2 Scanner B)', () => {
  const WRITERS = ['mastery.ts', 'reputation.ts', 'chains.ts', 'cosmetics.ts', 'replayLog.ts'];
  const BANNED_WRITES = [
    'xp',
    'level',
    'skillPoints',
    'stamina',
    'coins',
    'inventory',
    'completedMainQuestIds',
    'completedDungeonIds',
  ];

  /**
   * Тархалтаар эхэлсэн объект литерал бүрийн ДЭЭД ТҮВШНИЙ түлхүүрүүд.
   * Хаалтын гүнг тоолж үүрлэсэн литералыг алгасана — регулярын оронд жижиг
   * гүйлгэгч: `{ ...state, mastery: { …, xp: 0 } }` нь `mastery` л буцаана.
   */
  const spreadWriteFields = (source: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < source.length; i++) {
      if (source[i] !== '{') continue;
      let depth = 0;
      let body = '';
      for (let j = i; j < source.length; j++) {
        const ch = source[j]!;
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth === 1 && ch !== '{') body += ch;
        if (depth === 0) break;
      }
      if (!/^\s*\.\.\.[A-Za-z_$][\w$]*\s*,/.test(body)) continue;
      for (const m of body.matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?::|,|$)/g)) out.push(m[1]!);
    }
    return out;
  };

  it('keeps progression fields out of every spread-write in the new engines', () => {
    const offenders: string[] = [];
    for (const name of WRITERS) {
      const source = stripComments(read(join(sharedDir, 'core', name)));
      for (const field of spreadWriteFields(source))
        if (BANNED_WRITES.includes(field)) offenders.push(`${name} → ${field}:`);
    }
    expect(offenders).toEqual([]);
  });

  it('flags a planted progression write', () => {
    const planted = 'return { ...state, xp: state.xp + entry.bonusXp };';
    expect(spreadWriteFields(planted)).toContain('xp');
  });

  it('flags a planted shorthand write — `{ ...state, coins }` evades a naive `coins:` scan', () => {
    expect(spreadWriteFields('return { ...state, coins };')).toContain('coins');
  });

  it('does not mistake a nested MasteryTrack literal for a progression write', () => {
    const legit = 'return { ...state, mastery: { ...state.mastery, [tag]: { tag, xp: 0, level: 1 } } };';
    expect(spreadWriteFields(legit)).not.toContain('xp');
    expect(spreadWriteFields(legit)).not.toContain('level');
    expect(spreadWriteFields(legit)).toContain('mastery');
  });

  it('scans a non-empty set of writer files — an empty scan would pass vacuously', () => {
    for (const name of WRITERS)
      expect(read(join(sharedDir, 'core', name)).length).toBeGreaterThan(200);
  });

  /** ⚠ `chains.ts`-ийн ил зөвшөөрөл: XP нь `addXp`-ээр л очно, талбарт биш. */
  it('lets chains.ts award its bonus through addXp instead of touching xp (RET-2)', () => {
    const source = stripComments(read(join(sharedDir, 'core', 'chains.ts')));
    expect(source).toContain('addXp');
  });
});

/**
 * `lld.md §6.8` (Δ-1) — `dungeonStats` нь ХОЁР зам (`dungeons.ts` ба `quests.ts`)-аар
 * бичигдэх эрсдэлтэй байсан. Шийдэл нь `markDungeonPassed` ганц туслах. Энэ сканнер
 * нь тэр шийдвэрийг хаана: талбарт ШУУД бичих нь зөвхөн эзэн хоёр файлд.
 */
describe('dungeonStats has exactly one writer (§6.8 Δ-1)', () => {
  /**
   * ⚠ Хамрах хүрээ нь `shared/core` БИШ, `shared` БҮХЭЛДЭЭ: `newGame` нь
   * `shared/save/serialize.ts`-д, migration нь `shared/save/migrations.ts`-д
   * `dungeonStats`-ыг бүтээдэг. Зөвхөн `core`-ыг сканнердах нь эзэн бус бичигчийг
   * чимээгүй өнгөрүүлнэ — өмнөх жагсаалтын `saves.ts` нь огт бичдэггүй байсан тул
   * зөвшөөрөл нь ИДЭВХГҮЙ байв.
   */
  const ALLOWED = [
    'shared/core/dungeons.ts', // домэйн бичигч — `markDungeonPassed`
    'shared/save/serialize.ts', // `newGame` — хоосон гараа
    'shared/save/migrations.ts', // v1 → v2 — огноогүй бичлэг
    'shared/validate/schemas.ts', // схемийн ХЭЛБЭР, төлвийн бичилт БИШ
  ];

  it('never assigns dungeonStats outside its declared owners', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(sharedDir)) {
      if (ALLOWED.includes(rel(file))) continue;
      if (/\bdungeonStats\s*:/.test(stripComments(read(file)))) offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
  });

  it('names only owners that really do write the field — no dead permission', () => {
    for (const name of ALLOWED)
      expect(/\bdungeonStats\s*:/.test(stripComments(read(join(repoRoot, name))))).toBe(true);
  });

  it('routes the quest-track dungeon completion through markDungeonPassed', () => {
    const quests = stripComments(read(join(sharedDir, 'core', 'quests.ts')));
    expect(quests).toContain('markDungeonPassed');
  });

  it('flags a planted dungeonStats write', () => {
    expect(/\bdungeonStats\s*:/.test('return { ...state, dungeonStats: {} };')).toBe(true);
  });
});

/**
 * `lld.md §4.2` (A-LLD2-1) · `§6.10` — `mastery`-г уншигч бүр `trackOf`-оор дамжина.
 *
 * ⚠ `rec()` нь түлхүүрийн бүрэн байдлыг шалгадаггүй тул уншигч тутам `?? 0` гэж
 * анхдагчаа дотроо бичих уруу таталт байдаг. Тэр нь хоёр асуудал үүсгэнэ: (а) «хараахан
 * ахиагүй» нь level 1 биш 0 болж `earnedMasteryPoints`-ийн `level − 1` томьёо хазайна,
 * (б) анхдагчийг өөрчлөхөд файл тутам мартагдана. Ганц зам нь шийдвэр, стиль БИШ.
 */
describe('mastery is read through trackOf only (§4.2 A-LLD2-1)', () => {
  const READERS = ['skillTree.ts', 'achievements.ts', 'cosmetics.ts'];

  it('routes every allowed mastery reader through the helper', () => {
    for (const name of READERS)
      expect(stripComments(read(join(sharedDir, 'core', name)))).toContain('trackOf');
  });

  it('leaves no hand-written mastery default anywhere in shared/core', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(join(sharedDir, 'core'))) {
      if (basename(file) === 'mastery.ts') continue; // анхдагчийн ГАНЦ эх
      if (/\.mastery\[[^\]]+\]\s*\?\./.test(stripComments(read(file)))) offenders.push(basename(file));
    }
    expect(offenders).toEqual([]);
  });

  /**
   * ⚠ Сканнерын хамрах хүрээ нь `shared/core`-оор ЗОГСОХГҮЙ: `gameService.ts` нь
   * `state.mastery[tag] ?? { … }` гэж анхдагчаа гараар бичиж чадна — домэйнтэй ижил
   * хазайлт, зөвхөн уншигдахгүй газар. `?.` ба `?? {` хоёр хэлбэрийг хоёуланг барина.
   */
  it('leaves no hand-written mastery default in web-app/src either', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(webSrc)) {
      if (/\.mastery\[[^\]]+\]\s*\?\??[.{\s]/.test(stripComments(read(file)))) offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
  });

  it('flags a planted default of the `?? { … }` shape', () => {
    expect(/\.mastery\[[^\]]+\]\s*\?\??[.{\s]/.test('state.mastery[tag] ?? { xp: 0 }')).toBe(true);
  });

  it('flags a planted hand-written default', () => {
    expect(/\.mastery\[[^\]]+\]\s*\?\./.test('const l = state.mastery[track]?.level ?? 0;')).toBe(true);
  });
});
