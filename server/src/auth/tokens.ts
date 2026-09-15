/**
 * Нэргүй таних тэмдэг (lld.md §6.3; AC BE-2, BE-4, BE-14).
 *
 * ⚠ Түүхий token ба шилжүүлэх код DB-д ХЭЗЭЭ Ч хадгалагдахгүй — зөвхөн sha256 hex.
 * DB файл алдагдсан ч идэвхтэй session шууд задрахгүй. Хялбаршуулж БОЛОХГҮЙ.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

/** 32 байт → base64url = 43 тэмдэгт (контрактын `token` min 43). */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function newPlayerId(): string {
  return randomUUID();
}

/** Crockford base32 — I · L · O · U хасагдсан тул гараар буулгахад алдаа багатай. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** `XXXX-XXXX-XXXX` — 12 тэмдэгт, ~60 бит. */
export function newTransferCode(): string {
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) out += '-';
    out += CROCKFORD[bytes[i]! % 32];
  }
  return out;
}

/** Том үсэг + зураасгүй — тоглогч гараар бичихэд тэсвэртэй (lld.md §6.9). */
export const normalizeTransferCode = (code: string): string =>
  code.toUpperCase().replace(/-/g, '');

/** Тогтмол хугацааны харьцуулалт — hash-ийг урьдчилан таамаглах суваг үлдээхгүй. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
