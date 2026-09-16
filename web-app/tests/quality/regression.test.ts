/**
 * Регрессийн хаалга (T-37; AC QX-1, QX-3, QX-7).
 *
 * ⚠ QX-1 — PERSONAL-1-ийн тест НЭГ Ч устгагдаагүй, `skip` хийгдээгүй, сулруулаагүй.
 * Хамгийн хямд «ногоон» бол унадаг тестээ хасах явдал; энэ файл тэр замыг хаана.
 * ⚠ Тоо нь ДООД хязгаар — тест нэмэхэд шинэчилнэ, ХАСАХАД шинэчлэхгүй.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..', '..');
const testsDir = join(webRoot, 'tests');
const repoRoot = join(webRoot, '..');

/**
 * Статикаар ТУНХАГЛАГДСАН `it(`/`test(` блокийн доод хязгаар. ⚠ Ажиллах үеийн тоо
 * (одоогоор 1251) нь үүнээс ИХ: `for` давталт дотор тунхаглагдсан блок нэг мөрөөс
 * олон тест гаргадаг. Энэ хаалга нь ЭХ КОДЫГ хардаг тул давталтыг тоолж чадахгүй —
 * харин тест ФАЙЛ, БЛОК устгахыг барина.
 */
const TEST_FLOOR = 730;
/** PERSONAL-1-ийн хаалт — ЭНЭ тооноос доош хэзээ ч буухгүй (AC QX-1). */
const PERSONAL_1_FLOOR = 439;

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : full.endsWith('.test.ts') ? [full] : [];
  });
}

const testFiles = filesUnder(testsDir);
const rel = (file: string) => relative(webRoot, file).replace(/\\/g, '/');

/** `it(` · `test(` · `it.each(` — тайлбарын дотрох дурдлагыг тоолохгүй. */
function declaredTests(source: string): number {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return (clean.match(/^\s*(?:it|test)(?:\.each\([^)]*\))?\s*\(/gm) ?? []).length;
}

describe('QX-1 — the suite only ever grows (T-37)', () => {
  it('declares at least as many tests as the recorded floor', () => {
    const total = testFiles.reduce((sum, file) => sum + declaredTests(readFileSync(file, 'utf8')), 0);
    expect(total, `${total} declared tests — the floor is ${TEST_FLOOR}`).toBeGreaterThanOrEqual(
      TEST_FLOOR,
    );
    expect(TEST_FLOOR).toBeGreaterThan(PERSONAL_1_FLOOR);
  });

  it('skips nothing and focuses nothing', () => {
    const offenders: string[] = [];
    for (const file of testFiles) {
      // ⚠ Энэ файл өөрөө «тарьсан» жишээ мөр агуулна — өөрийгөө буруутгахгүй.
      if (file.endsWith('regression.test.ts')) continue;
      const source = readFileSync(file, 'utf8');
      // ⚠ `it.only` нь БУСАД бүх тестийг чимээгүй унтраадаг — ногоон CI, хоосон утга.
      for (const pattern of [/\b(?:it|test|describe)\.skip\s*\(/, /\b(?:it|test|describe)\.only\s*\(/, /\bx(?:it|describe)\s*\(/])
        if (pattern.test(source)) offenders.push(`${rel(file)} → ${pattern.source}`);
    }
    expect(offenders).toEqual([]);
  });

  it('counts a planted skip — the scanner is not decorative', () => {
    expect(/\b(?:it|test|describe)\.skip\s*\(/.test('it.skip("later", () => {})')).toBe(true);
  });
});

describe('QX-7 — the layer boundaries are still guarded (T-37)', () => {
  /**
   * ⚠ Хил өөрөө `architecture.test.ts`-д шалгагдана. Энд шалгах зүйл нь ТЭР ХААЛГА
   * байсаар байгаа эсэх: хамгаалалтын файлыг хасах нь зөрчлийг ил гаргахгүйгээр
   * бүх хилийг нэг мөрөөр нээнэ.
   */
  const guard = readFileSync(join(testsDir, 'architecture.test.ts'), 'utf8');

  for (const rule of [
    'forbids ui/ from importing shared/core directly',
    'forbids network calls from ui/',
    'keeps shared/core deterministic',
    'power bans: progression never reads the new systems',
  ]) {
    it(`still guards: ${rule}`, () => {
      expect(guard).toContain(rule);
    });
  }
});

describe('the repo documents what it now ships (T-37)', () => {
  const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');

  it('names the Trophy Room route and the content validator', () => {
    expect(readme).toContain('#/trophies');
    expect(readme).toContain('validate:content');
  });

  it('names the PERSONAL-2 systems a new reader has to know about', () => {
    for (const word of ['mastery', 'guild', 'hard mode', 'Trophy Room'])
      expect(readme.toLowerCase(), word).toContain(word.toLowerCase());
  });

  it('records the new boundaries in the surface rule files', () => {
    expect(readFileSync(join(webRoot, 'CLAUDE.md'), 'utf8')).toContain('fx.ts');
    expect(readFileSync(join(repoRoot, 'shared', 'CLAUDE.md'), 'utf8')).toContain('D-6');
  });
});
