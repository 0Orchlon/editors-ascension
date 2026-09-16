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

### DEV байршуулалт (docker-compose)

```bash
cd web-app && npm ci --prefer-offline && npm run build   # dist/ шаардлагатай, image dist-ыг л түгээнэ
docker compose -f docker-compose.dev.yml up -d --build
# web-app: http://localhost:18085   server: http://localhost:18787/api/health
```

Сонсох хаяг нь `HOST` орчны хувьсагчаас уншигдана (анхдагч `0.0.0.0`) — container-ийн
port-forward ба web-app-ийн nginx `proxy_pass` хоёулаа ажиллана. Зөвхөн локал loopback
дээр сонсох бол `HOST=127.0.0.1` гэж өг.

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

- [`docs/PERSONAL-2/spec.md`](docs/PERSONAL-2/spec.md) — **PERSONAL-2 гүнзгийрүүлэлтийн спек**
  (vibrant · addictive · офлайн · гадны холболтгүй); суурь нь доорх PERSONAL-1 спек
- [`docs/PERSONAL-2/plan.md`](docs/PERSONAL-2/plan.md) · [`tasks.md`](docs/PERSONAL-2/tasks.md) —
  PERSONAL-2-ийн хэрэгжүүлэлтийн төлөвлөгөө (7 давалгаа, 26 шийдвэр) ба 37 ажлын нэгж.
  `plan.md §11…§14` нь схемийн дельта, функцийн гарын үсэг, томьёо, action/event-ийн
  payload, палитрын токен ба FX бүртгэлийн **гэрээ** — код бичихийн ӨМНӨ уншина
- [`docs/PERSONAL-2/lld.md`](docs/PERSONAL-2/lld.md) — **PERSONAL-2-ийн дэлгэрэнгүй загвар**;
  модуль тутмын псевдокод, event-ийн дараалал, save v2 migration, палитрын 122 hex
  (228 контраст шалгагдсан), FX-ийн 12 мөр, bundle-ийн хэмжигдсэн суурь (46,606 B gzip)
- [`docs/PERSONAL-2/lld.html`](docs/PERSONAL-2/lld.html) — загварын харагдац: амьд
  палитрын лаборатори, дэлгэцийн дуурайлт, FX бүртгэл, boss/rep тооцоолуур
- [`docs/PERSONAL-2/contracts.yaml`](docs/PERSONAL-2/contracts.yaml) — **API гэрээ v1.2.0**
  (mastery · guild · chain · hard mode · cosmetic; endpoint нэмэгдээгүй)
- [`docs/PERSONAL-2/contract-docs.md`](docs/PERSONAL-2/contract-docs.md) — гэрээний
  уншигдах хэлбэр (зөвхөн v1.1.0 → v1.2.0-ийн дельта)
- [`docs/AAA-SPEC.md`](docs/AAA-SPEC.md) — AAA гүнзгийрүүлэлтийн эх спек (PERSONAL-2-ийн эх шаардлага)
- [`docs/PERSONAL-1/spec.md`](docs/PERSONAL-1/spec.md) — шаардлага ба хүлээн авах шалгуур
- [`docs/PERSONAL-1/plan.md`](docs/PERSONAL-1/plan.md) · [`tasks.md`](docs/PERSONAL-1/tasks.md) — төлөвлөгөө ба ажлын задаргаа
- [`docs/PERSONAL-1/lld.md`](docs/PERSONAL-1/lld.md) — дэлгэрэнгүй загвар
- [`docs/PERSONAL-1/contracts.yaml`](docs/PERSONAL-1/contracts.yaml) — API гэрээ v1.1.0
- [`docs/PERSONAL-1/contract-docs.md`](docs/PERSONAL-1/contract-docs.md) — гэрээний уншигдах хэлбэр
- Гадаргуу тутмын дүрэм: [`shared/CLAUDE.md`](shared/CLAUDE.md) · [`server/CLAUDE.md`](server/CLAUDE.md) · [`web-app/CLAUDE.md`](web-app/CLAUDE.md)
