<!-- PERSONAL-1 · readme · Код + тест · 2026-09-15 -->

# Editor's Ascension

Судалгааг тоглоом болгон далдалсан ганц тоглогчийн RPG: видео засвар, Blender,
анимэйшн, кино зураглалыг кампанит ажил, side quest, Study Dungeon-оор сурна.
Дэлгэрэнгүйг [`docs/PERSONAL-1/spec.md`](docs/PERSONAL-1/spec.md) үзнэ үү.

## Одоогийн төлөв — MVP хэрэгжсэн

| Хавтас | Төлөв |
|---|---|
| `shared/` | ✅ домэйн цөм, контент пакет, validator, save давхарга |
| `server/` | ✅ 10 endpoint, SQLite, эрх бүхий үйлдэл, snapshot, transfer, ops хаалга |
| `web-app/` | ✅ 8 дэлгэц, офлайн дараалал, сервертэй эвлэрүүлэг (If-Match · 409 · 429), шилжүүлэх код, export/import, a11y |
| `docs/PERSONAL-1/` | ✅ спек · төлөвлөгөө · tasks · LLD · гэрээний баримт |

## Эхлэх

```bash
cd web-app && npm ci && npm test && npm run dev     # http://localhost:5173
cd server  && npm ci && npm test && npm start       # http://127.0.0.1:8787
```

Сервер **заавал биш**: унтарсан үед web-app нь локал домэйн + `localStorage`-аар
бүрэн ажиллана (AC BE-7). Сервер асвал үйлдлүүд `POST /api/players/{id}/actions`-аар
илгээгдэж серверийн төлөв эрх бүхий болно.

## Шалгах — гадаргуу тутамд НЭГ команд

```bash
cd web-app && npm test      # typecheck + lint + vitest (439 тест)
cd server  && npm test      # typecheck + lint + vitest (76 тест)
```

Репогийн ROOT дээр `package.json` БАЙХГҮЙ нь зөв — CI нь гадаргуу тутам ажиллана.

## Архитектурын хил (тестээр хамгаалагдсан)

```
web-app/src/ui  →  web-app/src/services  →  shared/core  →  shared/{types,validate}
server/src/app.ts → server/src/domain/actionEngine → shared/core
```

- Тоглоомын дүрэм нь **`shared/core/**` дотор ГАНЦ хувилбартай**. Клиент, сервер
  хоёул ижил `applyAction`-ыг ажиллуулна (AC BE-10).
- `shared/core/**` нь детерминистик: `Date.now()`, `Math.random()` ХОРИОТОЙ —
  цаг ба санамсаргүй нь `Ctx`-ээр орно.
- `src/ui/**` нь `shared/core`-ыг ШУУД импортлохгүй.

Эдгээрийг `web-app/tests/architecture.test.ts` ба `server/tests/architecture.test.ts`
сканнердаж шалгана — зөрчвөл `npm test` УНАНА.

## Хүний баталгаа ХҮЛЭЭЖ БУЙ зүйл

**T-22 · Tutorial эх сурвалж.** `shared/content/dungeons.json`-ийн `tutorialRefs` нь
одоогоор **албан ёсны вендорын баримтын холбоос** (Blender Manual, Blender Studio,
Blackmagic DaVinci Resolve) — бүтцийн шаардлагыг (DG-1: 1–3 холбоос) хангах
**түр орлуулагч**. Эдгээрийг заасан сэдэв тус бүрд тохирсон, батлагдсан
хичээлийн жагсаалтаар СОЛИХ шаардлагатай.
⚠ Холбоос ЗОХИОХГҮЙ гэсэн дүрмийн дагуу гуравдагч талын хичээлийн URL
таамаглаагүй — энэ нь хүний сонголт.

## Баримт

- [`docs/PERSONAL-1/spec.md`](docs/PERSONAL-1/spec.md) — шаардлага ба хүлээн авах шалгуур
- [`docs/PERSONAL-1/plan.md`](docs/PERSONAL-1/plan.md) · [`tasks.md`](docs/PERSONAL-1/tasks.md) — төлөвлөгөө ба ажлын задаргаа
- [`docs/PERSONAL-1/lld.md`](docs/PERSONAL-1/lld.md) — дэлгэрэнгүй загвар
- [`docs/PERSONAL-1/contracts.yaml`](docs/PERSONAL-1/contracts.yaml) — API гэрээ v1.1.0
- [`docs/PERSONAL-1/contract-docs.md`](docs/PERSONAL-1/contract-docs.md) — гэрээний уншигдах хэлбэр
- Гадаргуу тутмын дүрэм: [`shared/CLAUDE.md`](shared/CLAUDE.md) · [`server/CLAUDE.md`](server/CLAUDE.md) · [`web-app/CLAUDE.md`](web-app/CLAUDE.md)
