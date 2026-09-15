/**
 * Серверийн архитектурын хамгаалалт (T-17, T-43; AC BE-10, BE-16).
 *
 * ⚠ Домэйн дүрэм `server/src/**`-д ДАХИН бичигдвэл сервер ба клиент чимээгүй сална.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const serverSrc = join(repoRoot, 'server', 'src');

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const rel = (f: string) => relative(repoRoot, f).replace(/\\/g, '/');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const sources = filesUnder(serverSrc).map((f) => ({ file: f, text: stripComments(readFileSync(f, 'utf8')) }));

describe('server keeps the domain in shared/core (T-43)', () => {
  it('scans a non-empty set of files', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  /** AC BE-10 — сервер домэйныг ДУУДНА, хувилбарыг нь бичихгүй. */
  it('reaches the domain only through shared/core/apply.ts', () => {
    const importers = sources.filter((s) => /shared\/core\//.test(s.text)).map((s) => rel(s.file));
    expect(importers.sort()).toEqual([
      'server/src/domain/actionEngine.ts',
    ]);
  });

  it('never restates the xp thresholds (BE-10)', () => {
    const offenders = sources
      .filter((s) => ['100', '250', '500', '1000', '1750', '2750', '4000', '5500', '7500']
        .filter((n) => new RegExp(`\\b${n}\\b`).test(s.text)).length >= 5)
      .map((s) => rel(s.file));
    expect(offenders).toEqual([]);
  });

  it('never restates the boss tier cut-offs (BE-10)', () => {
    const offenders = sources
      .filter((s) => ['35', '45', '52'].every((n) => new RegExp(`\\b${n}\\b`).test(s.text)))
      .map((s) => rel(s.file));
    expect(offenders).toEqual([]);
  });

  it('never restates stamina or skill-point arithmetic (BE-10)', () => {
    const offenders = sources
      .filter((s) => /\b(maxStamina|skillPoints)\s*[+-]/.test(s.text))
      .map((s) => rel(s.file));
    expect(offenders).toEqual([]);
  });

  /** plan.md P-5 — санамсаргүй нь ЗӨВХӨН seed-тэй RNG-ээр (AC BE-12 replayed баталгаа). */
  it('never calls Math.random — replayed actions must reproduce exactly', () => {
    const offenders = sources.filter((s) => s.text.includes('Math.random(')).map((s) => rel(s.file));
    expect(offenders).toEqual([]);
  });

  it('creates tables only through the numbered migration list (BE-16)', () => {
    const offenders = sources
      .filter((s) => /CREATE TABLE/i.test(s.text) && !s.file.endsWith('migrations.ts'))
      .map((s) => rel(s.file));
    expect(offenders).toEqual([]);
  });

  /**
   * AC BE-2 — PII-г хадгалах багана ч, логдох зам ч байхгүй.
   *
   * ⚠ `logging/logger.ts` нь ЧӨЛӨӨЛӨГДСӨН: тэр нь дүрмийг ХЭРЭГЖҮҮЛЭХ цэг тул
   * хориотой талбаруудын нэрийг денилист болгон агуулах ёстой. Уншиж БАЙГАА биш,
   * хааж байгаа — түүнийг өөрийг нь зөрчил гэж тоолвол хамгаалалт өөрийгөө иднэ.
   */
  it('never reads the client IP or user agent', () => {
    const offenders = sources
      .filter((s) => !s.file.endsWith(join('logging', 'logger.ts')))
      .filter((s) => /remoteAddress|socket\.address|x-forwarded-for|user-agent/i.test(s.text))
      .map((s) => rel(s.file));
    expect(offenders).toEqual([]);
  });

  it('keeps the logger denylist covering the PII fields it must block (BE-16)', () => {
    const logger = readFileSync(join(serverSrc, 'logging', 'logger.ts'), 'utf8');
    for (const field of ['ip', 'authorization', 'bearer', 'token', 'state_json', 'code'])
      expect(logger).toContain(`'${field}'`);
  });

  it('routes every error through the problem mapper (BE-16)', () => {
    const offenders = sources
      .filter((s) => /res\.writeHead\(\s*(4|5)\d\d/.test(s.text))
      .map((s) => rel(s.file));
    expect(offenders).toEqual([]);
  });

  it('flags a planted violation so the guard is not vacuous', () => {
    expect(stripComments('const x = Math.random();').includes('Math.random(')).toBe(true);
  });
});
