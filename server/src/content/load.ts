/**
 * Асах үеийн контент шалгалт + degraded төлөв (lld.md §6.7; AC BE-15).
 *
 * ⚠ Алдааны АГУУЛГА лог руу орохгүй — зөвхөн тоо ба талбарын зам.
 */
import { buildPack, canonicalJson } from '../../../shared/content/index.ts';
import { fnv1a } from '../../../shared/hash.ts';
import { validateContentPack } from '../../../shared/validate/index.ts';
import type { ContentPack } from '../../../shared/types/index.ts';

export type ContentState =
  | { ok: true; pack: ContentPack; body: string; etag: string; version: string }
  | { ok: false; reason: string; fields: string[] };

export function loadContent(pack: ContentPack = buildPack()): ContentState {
  const issues = validateContentPack(pack);
  if (issues.length > 0)
    return {
      ok: false,
      reason: `${issues.length} schema issue(s) in content pack`,
      fields: issues.slice(0, 10).map((i) => i.field),
    };

  const body = canonicalJson(pack);
  const version = fnv1a(body).toString(16);
  return { ok: true, pack, body, etag: `"${version}"`, version };
}
