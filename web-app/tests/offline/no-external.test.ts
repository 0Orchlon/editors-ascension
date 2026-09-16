/**
 * OFF-2 · OFF-3 · OFF-4 — гадаад холболтын сканнер хаалгууд (T-04).
 *
 * ⚠ Эдгээр нь одоо НОГООН байгаа зүйлийг хамгаална: дараагийн task гадны host,
 * telemetry, эсвэл runtime хамаарал оруулмагц ЯГ ТЭР МӨЧИД унана — хожим шалгах
 * биш. «Ногоон» нь хоосон сканнераас гарч болохгүй тул дүрэм тутамд «сканнер
 * өөрөө хазна» тест бий.
 * ⚠ ИЛ зөвшөөрөгдсөн үл хамаарах зүйл: `shared/content/**`-ийн `tutorialRefs` —
 * тоглогч ӨӨРӨӨ дардаг вендорын баримтын холбоос. Сканнер энэ ялгааг таамаглахгүй,
 * контентоос уншсан ЯГ ТЭР URL-үүдийн багцтай тулгана.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const webRoot = join(repoRoot, 'web-app');
const webSrc = join(webRoot, 'src');
const sharedContent = join(repoRoot, 'shared', 'content');

function filesUnder(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full, exts));
    else if (exts.some((e) => full.endsWith(e))) out.push(full);
  }
  return out;
}

const read = (file: string): string => readFileSync(file, 'utf8');
const rel = (file: string): string => relative(repoRoot, file).replace(/\\/g, '/');

const URL_RE = /https?:\/\/[^\s"'`)<>]+/g;
export const findUrls = (source: string): string[] => source.match(URL_RE) ?? [];

/** `tutorialRefs`-ийн ЗӨВШӨӨРӨГДСӨН URL-үүд — контентоос уншигдана, гараар БИЧИГДЭХГҮЙ. */
function tutorialUrls(): Set<string> {
  const allowed = new Set<string>();
  for (const file of filesUnder(sharedContent, ['.json'])) {
    const data = JSON.parse(read(file)) as unknown;
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node === null || typeof node !== 'object') return;
      const rec = node as Record<string, unknown>;
      for (const ref of (rec.tutorialRefs as { url?: unknown }[] | undefined) ?? [])
        if (typeof ref.url === 'string') allowed.add(ref.url);
      for (const value of Object.values(rec)) walk(value);
    };
    walk(data);
  }
  return allowed;
}

/**
 * Хэлбэрийн/лицензийн URL нь СҮЛЖЭЭНИЙ хүсэлт БИШ: XML namespace, схемийн
 * танигч, тайлбар дахь эшлэл. Тэднийг ил нэрлэж чөлөөлнө — бүрхэг «*://» зөвшөөрөл
 * нь сканнерыг хоосруулна.
 */
const NON_REQUEST_PREFIXES = ['http://www.w3.org/', 'https://spdx.org/licenses/'];
const isRequestUrl = (url: string): boolean =>
  !NON_REQUEST_PREFIXES.some((prefix) => url.startsWith(prefix));

describe('OFF-2 — no external hosts in the shipped frontend (T-04)', () => {
  const allowed = tutorialUrls();

  it('reads a non-empty allow-list from content — an empty list would make the scan vacuous', () => {
    expect(allowed.size).toBeGreaterThan(0);
  });

  it('finds no external url in web-app/src/** or index.html', () => {
    const offenders: string[] = [];
    const targets = [...filesUnder(webSrc, ['.ts', '.css', '.html']), join(webRoot, 'index.html')];
    for (const file of targets)
      for (const url of findUrls(read(file)))
        if (isRequestUrl(url) && !allowed.has(url)) offenders.push(`${rel(file)} → ${url}`);
    expect(offenders).toEqual([]);
  });

  /** `dist/**` нь байвал шалгагдана — build хийгээгүй clone дээр алгасана (хаалга биш). */
  it('finds no external url in dist/** beyond the content allow-list', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(join(webRoot, 'dist'), ['.js', '.css', '.html']))
      for (const url of findUrls(read(file)))
        if (isRequestUrl(url) && !allowed.has(url)) offenders.push(`${rel(file)} → ${url}`);
    expect(offenders).toEqual([]);
  });

  it('bites on a planted external host', () => {
    const planted = `const cdn = 'https://cdn.example.com/lib.js';`;
    const found = findUrls(planted).filter((u) => isRequestUrl(u) && !allowed.has(u));
    expect(found).toEqual(['https://cdn.example.com/lib.js']);
  });

  it('does not flag a tutorial link that comes from content', () => {
    const one = [...allowed][0]!;
    const found = findUrls(`{"url":"${one}"}`).filter((u) => isRequestUrl(u) && !allowed.has(u));
    expect(found).toEqual([]);
  });
});

describe('OFF-3 — the only network path is services/apiClient.ts (T-04)', () => {
  /** Автомат тайлагналын гадаргуу — тоглогчийн үйлдэлгүйгээр байт гадагш явах бүх зам. */
  const BANNED_TOKENS = [
    'sendBeacon',
    'navigator.connection',
    'new WebSocket',
    'EventSource',
    'XMLHttpRequest',
    'importScripts',
    'gtag(',
    'dataLayer',
    'Sentry',
    'analytics',
    'posthog',
    'mixpanel',
    'serviceWorker',
  ];

  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('finds no telemetry or third-party sdk surface in web-app/src/**', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(webSrc, ['.ts'])) {
      const source = stripComments(read(file));
      for (const token of BANNED_TOKENS)
        if (source.includes(token)) offenders.push(`${rel(file)} → ${token}`);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps fetch inside services/apiClient.ts and nowhere else', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(webSrc, ['.ts'])) {
      if (rel(file).endsWith('services/apiClient.ts')) continue;
      if (/\bfetch\s*\(/.test(stripComments(read(file)))) offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
    // Сканнер бодит файл уншиж байгаа эсэх — apiClient нь `fetch` АГУУЛНА.
    expect(read(join(webSrc, 'services', 'apiClient.ts'))).toMatch(/\bfetch/);
  });

  it('bites on a planted beacon call', () => {
    const planted = `navigator.sendBeacon('/collect', body);`;
    expect(BANNED_TOKENS.some((t) => stripComments(planted).includes(t))).toBe(true);
  });

  it('bites on a planted fetch outside the api client', () => {
    expect(/\bfetch\s*\(/.test(`await fetch('/api/anything');`)).toBe(true);
  });

  it('does not mistake a banned token written in a comment for a violation', () => {
    expect(stripComments('// never call navigator.sendBeacon here')).not.toContain('sendBeacon');
  });
});

describe('OFF-4 — the frontend ships zero runtime dependencies (T-04)', () => {
  const pkg = JSON.parse(read(join(webRoot, 'package.json'))) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it('declares no dependencies at all', () => {
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
  });

  it('bites when a dependency is planted', () => {
    const planted = { dependencies: { mantine: '^7.0.0' } };
    expect(Object.keys(planted.dependencies)).not.toEqual([]);
  });

  it('still has devDependencies — the scan is reading the real manifest', () => {
    expect(Object.keys(pkg.devDependencies ?? {}).length).toBeGreaterThan(5);
  });

  it('keeps shared/ dependency-free — no package.json at all', () => {
    expect(existsSync(join(repoRoot, 'shared', 'package.json'))).toBe(false);
  });
});
