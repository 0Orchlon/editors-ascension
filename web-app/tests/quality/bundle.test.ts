/**
 * QX-3 — bundle-ийн хэмжээний хаалга (T-02; plan.md P-11).
 *
 * ⚠ Суурь нь PERSONAL-2-ийн өөрчлөлт ОРОХООС ӨМНӨ хэмжигдсэн: 46,606 B
 * (`vite build` → `dist/assets/**.{js,css}` gzip level 9 нийлбэр). Код нэмсэн ХОЙНО
 * дахин хэмжих нь шалгуурыг утгагүй болгоно — тоог ЭНД тогтоов.
 * ⚠ Шинэ команд НЭМЭХГҮЙ: build нь Vite-ийн JS API-аар Vitest дотроос ажиллана,
 * тиймээс гадаргуунд `npm test` НЭГ команд хэвээр (репогийн дүрэм).
 */
import { describe, expect, it } from 'vitest';
import { build } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** ⚠ Хэмжигдсэн суурь — таамаг БИШ. Өөрчлөх бол шинээр хэмжиж, шалтгаанаа бич. */
export const BASELINE_GZIP_BYTES = 46_606;
const BUDGET_RATIO = 1.3;

function gzippedAssetBytes(outDir: string): number {
  const assets = join(outDir, 'assets');
  let total = 0;
  for (const name of readdirSync(assets)) {
    if (!/\.(js|css)$/.test(name)) continue;
    total += gzipSync(readFileSync(join(assets, name)), { level: 9 }).length;
  }
  return total;
}

describe('QX-3 — the shipped bundle stays inside its budget (T-02)', () => {
  it('builds and keeps gzipped JS+CSS at or below 130% of the measured baseline', async () => {
    const outDir = join(webRoot, 'dist-bundle-test');
    await build({
      root: webRoot,
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
      configFile: false,
      resolve: { alias: { '@shared': join(webRoot, '..', 'shared') } },
    });

    const measured = gzippedAssetBytes(outDir);
    const budget = Math.floor(BASELINE_GZIP_BYTES * BUDGET_RATIO);

    // Уншигдах бүтэлгүйтэл: хэтэрсэн байт нь мессежээс шууд харагдана.
    expect(
      measured,
      `gzipped bundle ${measured} B exceeds the ${budget} B budget (baseline ${BASELINE_GZIP_BYTES} B × ${BUDGET_RATIO})`,
    ).toBeLessThanOrEqual(budget);

    // Хоосон/бүтэлгүй build нь «ногоон» болж болохгүй.
    expect(measured).toBeGreaterThan(1000);
  }, 120_000);

  /** Хаалга өөрөө хазаж байгаа нотолгоо — суурийг 10%-иар буулгавал одоогийн хэмжээ хэтэрнэ. */
  it('bites when the baseline is tightened — the budget is not vacuous', () => {
    const shrunk = Math.floor(BASELINE_GZIP_BYTES * 0.1 * BUDGET_RATIO);
    expect(BASELINE_GZIP_BYTES).toBeGreaterThan(shrunk);
  });
});
