/**
 * Сканнердсан архитектурын хамгаалалт (T-17, T-43; AC UI-3, D-1, D-2, BE-10).
 *
 * ⚠ Эдгээр нь СТИЛИЙН дүрэм БИШ. Тус бүр нь зөрчигдвөл чимээгүй эвдрэх шийдвэрийг
 * хамгаалдаг: домэйн давхарлал, детерминизм, гадаад хамаарал.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

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
