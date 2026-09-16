<!-- PERSONAL-1 · readme · Код + тест · 2026-09-15 -->
<!-- PERSONAL-2 · readme · Код + тест · 2026-09-16 — v2-ийн систем, 9 дэх маршрут, validate:content -->

# Editor's Ascension

Судалгааг тоглоом болгон далдалсан ганц тоглогчийн RPG: видео засвар, Blender,
анимэйшн, кино зураглалыг кампанит ажил, side quest, Study Dungeon-оор сурна.
Дэлгэрэнгүйг [`docs/PERSONAL-1/spec.md`](docs/PERSONAL-1/spec.md) үзнэ үү.

## Одоогийн төлөв — MVP хэрэгжсэн

| Хавтас | Төлөв |
|---|---|
| `shared/` | ✅ домэйн цөм, контент пакет, validator, save давхарга |
| `server/` | ✅ 10 endpoint, SQLite, эрх бүхий үйлдэл, snapshot, transfer, ops хаалга |
| `web-app/` | ✅ **9 дэлгэц**, офлайн дараалал, сервертэй эвлэрүүлэг (If-Match · 409 · 429), шилжүүлэх код, export/import, a11y |
| `docs/PERSONAL-1/` | ✅ спек · төлөвлөгөө · tasks · LLD · гэрээний баримт |
| `docs/PERSONAL-2/` | ✅ спек · төлөвлөгөө · tasks · LLD · гэрээ v1.2.0 ба түүний баримт |

### PERSONAL-2 — гүнзгийрүүлэлт (хэрэгжсэн)

| Систем | Юу гэсэн үг | Хаана |
|---|---|---|
| **Mastery track** ×7 | Ажлын `tags` бүрд ТУСДАА түвшин; level 10-д **prestige**. ⚠ XP, stamina, quest-ийн нээлтэд НӨЛӨӨЛӨХГҮЙ — зөвхөн tier-2/3 skill node ба cosmetic | `shared/core/mastery.ts` · Camp · Skills |
| **Guild reputation** ×4 | `tags` → guild; rep ХЭЗЭЭ Ч буурахгүй, зэрэглэл нь ЗӨВХӨН cosmetic | `shared/core/reputation.ts` · Camp |
| **Side quest chain** | 4 алхмын дараалал → нэг удаагийн bonus XP | `shared/core/chains.ts` |
| **Boss v2 — hard mode** | Оролдлого тутамд `standard`/`hard`; hard босго нь `ceil(×1.15)` = 41/52/60. `(bossId, difficulty)` тутмын хувийн дээд амжилт, rematch **cooldown-гүй** | `shared/core/boss.ts` · Project Forge |
| **Skill tree v2** | 7 track таб, tier-1 = skill point · tier-2/3 = mastery point, capstone-ийн дутуу нөхцөл НЭРЛЭГДЭНЭ, respec (7 хоногийн ГЛОБАЛ cooldown) | `shared/core/skillTree.ts` · Skills |
| **Trophy Room** | `#/trophies` — 60+ cosmetic бүгд харагдана, нээгдээгүй бүр «юу хийвэл нээгдэх»-ээ текстээр хэлнэ; camp-ийн 6 slot энд эмхлэгдэнэ | `web-app/src/ui/screens/trophies.ts` |
| **Дэлхий тутмын палитр** | 6 палитр × 19 токен × 2 багц (`colorBlindSafe`); 228 контраст ТООЦООЛЖ шалгагдана | `web-app/src/ui/theme.ts` |
| **Juice давхарга** | 12 event → (анимац ≤300ms, дуу, `aria-live` текст) ГАНЦ хаалгаар; `reducedMotion`/`soundVolume=0` бүрэн унтраана | `web-app/src/ui/fx.ts` |

⚠ Шинэ систем бүр **сервергүйгээр бүрэн ажиллана** — `web-app/tests/integration/offline.test.ts`
нь бүх `fetch`-ийг унагаж, mastery · guild · trophy · hard mode · skill unlock бүгдийг
шалгана. Бүртгэл, нууц үг, PII ХЭВЭЭР шаардагдахгүй.

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

## Гэрээ (API contract) — нийтлэгдсэн v1.2.0

Гэрээ нь **код бичигдэхээс ӨМНӨ** нийтлэгддэг. Гурван зүйл нэг зэрэг байна:

```bash
cd server
npm run contract:lint    # 14 хаалга (G-1…G-14) — гэрээ нийтлэгдэхэд бэлэн үү
npm run contract:mock    # дуурайлт → http://127.0.0.1:4010/api  (prism-ийн орлуулагч)
npm run contract:docs    # docs/PERSONAL-2/contract-docs.md-ыг ДАХИН үүсгэнэ
```

- **Эрх бүхий эх:** [`docs/PERSONAL-2/contracts.yaml`](docs/PERSONAL-2/contracts.yaml) (v1.2.0).
- **Уншигдах баримт:** [`docs/PERSONAL-2/contract-docs.md`](docs/PERSONAL-2/contract-docs.md) —
  **ҮҮСГЭГДДЭГ**. Гараар бичих хэсэг нь зөвхөн
  [`contract-docs.prologue.md`](docs/PERSONAL-2/contract-docs.prologue.md).
- Гурвуулаа `cd server && npm test`-д залгагдсан
  ([`server/tests/contract/publish.test.ts`](server/tests/contract/publish.test.ts)):
  гэрээ зөрчилтэй болох, баримт хуучрах, дуурайлт гэрээнээс гарах — гурвуулангийнх нь
  замд хаалга бий.

⚠ Дуурайлт нь **төлөв ХАДГАЛАХГҮЙ** — гэрээний ХЭЛБЭР шалгахад зориулагдсан. Зан төлөвийн
тест нь жинхэнэ сервер дээр (`server/tests/contract/contract.test.ts`).
⚠ `@stoplight/prism-cli` ашиглаагүй: гадны холболтгүй байх дүрэм (AC OFF-2…OFF-5) ба
«гадаргуу тутамд ганц команд» зарчмын улмаас дуурайлт нь `node:http` + аль хэдийн суусан
`yaml`-аар бичигдсэн — шинэ хамаарал ТЭГ.

## Шалгах — гадаргуу тутамд НЭГ команд

```bash
cd web-app && npm test      # typecheck + lint + vitest (439 тест)
cd server  && npm test      # typecheck + lint + vitest (76 тест)
```

Репогийн ROOT дээр `package.json` БАЙХГҮЙ нь зөв — CI нь гадаргуу тутам ажиллана.

Контентын дүрмийг тестээс ГАДНА, CLI-аар ч шалгана (ижил модуль — хоёр дүгнэлт үүсэхгүй):

```bash
cd web-app && npm run validate:content   # exit ≠ 0 бол зөрчсөн зам хэвлэгдэнэ
```

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
- [`docs/PERSONAL-2/contract-docs.md`](docs/PERSONAL-2/contract-docs.md) — **гэрээний
  нийтлэгдсэн баримт** (ҮҮСГЭГДСЭН): нийтлэлийн бүртгэл, нийцтэй байдлын ангилал,
  save v1→v2-ийн талбар тутмын анхдагч, клиент/сервер нүүлгэх зам, татгалзлын матриц,
  дуурайлтын жорууд, 14 хаалгын тайлбар, 10 үйлдэл + 50 схемийн бүрэн лавлах
- [`docs/AAA-SPEC.md`](docs/AAA-SPEC.md) — AAA гүнзгийрүүлэлтийн эх спек (PERSONAL-2-ийн эх шаардлага)
- [`docs/PERSONAL-1/spec.md`](docs/PERSONAL-1/spec.md) — шаардлага ба хүлээн авах шалгуур
- [`docs/PERSONAL-1/plan.md`](docs/PERSONAL-1/plan.md) · [`tasks.md`](docs/PERSONAL-1/tasks.md) — төлөвлөгөө ба ажлын задаргаа
- [`docs/PERSONAL-1/lld.md`](docs/PERSONAL-1/lld.md) — дэлгэрэнгүй загвар
- [`docs/PERSONAL-1/contracts.yaml`](docs/PERSONAL-1/contracts.yaml) — API гэрээ v1.1.0
- [`docs/PERSONAL-1/contract-docs.md`](docs/PERSONAL-1/contract-docs.md) — гэрээний уншигдах хэлбэр
- Гадаргуу тутмын дүрэм: [`shared/CLAUDE.md`](shared/CLAUDE.md) · [`server/CLAUDE.md`](server/CLAUDE.md) · [`web-app/CLAUDE.md`](web-app/CLAUDE.md)
