<!-- PERSONAL-1 · doc · Код + тест · 2026-09-15 -->

# `server/` — backend

Нэг команд: `npm test` (= `typecheck && lint && vitest run`). Ажиллуулах: `npm start`.

## Шийдвэрүүд (lld.md §6)

- HTTP framework БАЙХГҮЙ — `node:http` + жижиг router. 10 endpoint.
- SQLite нь Node-ийн суурин `node:sqlite` — нативе build шаардахгүй (AC Q-5).
- Схем нь зөвхөн дугаарласан migration-аар үүснэ; гараар `CREATE TABLE` дуудахгүй (AC BE-16).

## Хатуу хориг

- Домэйн дүрмийг ЭНД бичихгүй — `../shared/core/**`-ыг дуудна (AC BE-10).
  `src/domain/actionEngine.ts` нь ганц гүүр.
- **PII хадгалахгүй, логдохгүй:** IP, user-agent, `Authorization`, түүхий token,
  шилжүүлэх код, save-ийн агуулга. `tests/unit/logging.test.ts` шалгана (AC BE-16).
- Token ба transfer code нь DB-д зөвхөн `sha256` hash хэлбэрээр.
- Бүх 4xx/5xx хариу `application/problem+json` (RFC 9457).

## Middleware гинжний дараалал нь ГЭРЭЭ

`requestId → logger → bodyLimit(1MB) → rateLimit:global → jsonParse → auth →
rateLimit:perToken → ownership → validate → handler → problemMapper`
