<!-- PERSONAL-1 · doc · Код + тест · 2026-09-15 -->

# `web-app/` — frontend

Нэг команд: `npm test` (= `typecheck && lint && vitest run`).

## Давхаргын гэрээ

```
ui/ → services/ → @shared/core → @shared/{types,validate}
```

- `src/ui/**` нь `@shared/core/**`-ыг ШУУД импортлохгүй (AC UI-3) — `architecture.test.ts` унана.
- `src/ui/**` дотор `fetch` хориотой; сүлжээ нь `services/apiClient.ts`-д.
- XP босго, stamina тоо, boss tier зэрэг тогтмолыг ЭНД дахин бичихгүй —
  `@shared/core/constants.ts`-ээс импортлоно (AC BE-10).

## UI шийдвэр (lld.md §7.1)

Framework ашиглахгүй — `render(state) → HTMLElement` функцүүд. Шалтгаан: 8 дэлгэц,
runtime хамаарал тэг, a11y-г бүрэн хянана.

## A11y (заавал)

Интерактив элемент бүр `<button>`/`<a>`/`<input>` — `div` + `onclick` ХОРИГТОЙ.
Төлөв зөвхөн өнгөөр дамжихгүй: текст эсвэл дүрс хамт.
