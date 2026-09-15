/**
 * Тогтвортой hash — домэйн ба контент ХОЁУЛАА хэрэглэнэ.
 *
 * ⚠ `shared/core/`-д БИШ, түүнээс ДЭЭГҮҮР байрлана: `shared/content/**` нь
 * `core/**`-ыг импортлохгүй байх ёстой (`architecture.test.ts`), гэтэл хоёулаа
 * ижил hash хэрэгтэй. Давхардуулж бичих нь ETag-ийг чимээгүй салгана.
 */

/** FNV-1a 32-бит — огноо, actionId, канон JSON-д. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
