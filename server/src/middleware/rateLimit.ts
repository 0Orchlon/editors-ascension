/**
 * Процессын санах ой дахь token bucket (lld.md §6.10; AC BE-17).
 *
 * ⚠ Мэдэгдэж буй хязгаар: НЭГ процесст л үйлчилнэ. SQLite нэг файл = нэг процесс тул
 * одоо хангалттай; олон инстанс болвол хуваалцсан тоолуур руу шилжинэ.
 * ⚠ IP-д тулгуурласан хязгаар БОЛОМЖГҮЙ — IP хадгалахыг AC BE-2 хориглодог.
 */
export type RateLimiter = {
  /** `null` = зөвшөөрнө; тоо = дахин оролдох хүртэлх секунд. */
  hit(key: string, limit: number, now: number): number | null;
};

export function createRateLimiter(windowMs = 60_000): RateLimiter {
  const buckets = new Map<string, { used: number; resetAt: number }>();

  return {
    hit(key, limit, now) {
      const bucket = buckets.get(key);
      if (bucket === undefined || now >= bucket.resetAt) {
        buckets.set(key, { used: 1, resetAt: now + windowMs });
        return null;
      }
      if (bucket.used < limit) {
        bucket.used++;
        return null;
      }
      return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    },
  };
}

/** plan.md P-11 — токен тутам 60/мин, нэргүй глобал зам 30/мин. */
export const PER_TOKEN_LIMIT = 60;
export const GLOBAL_ANON_LIMIT = 30;
export const GLOBAL_ANON_KEY = 'global:anon';
