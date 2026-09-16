<!-- PERSONAL-2 · тайлан · DEV тест · 2026-09-16 -->

# DEV тестийн тайлан — PERSONAL-2

Орчин: локал DEV, `docker-compose.dev.yml`.
Шалгасан service: `server` (http://localhost:18787), `web-app` (http://localhost:18085).
Энэ шат нь **зөвхөн шалгана** — код засаагүй (repo `main`-аас өөрчлөлтгүй, зөвхөн энэ тайлан нэмэгдэв).

## 1. Хамрах хүрээ

| Давхарга | Арга | Үр дүн |
|---|---|---|
| Server HTTP API | бодит `curl` хүсэлт (28 шалгалт) | 28/28 ногоон |
| Контент пакет | байршуулсан `/api/content/pack`-ийн бодит агуулга | схемийн доод хязгаар бүгд хангагдав |
| web-app статик | nginx-ээс бодит татах, SPA fallback, proxy | ногоон |
| Офлайн тоглолт | байршуулсан bundle-ийг jsdom-д ачаалж бодит хэрэглэгчийн зам гүйлгэв | ногоон, 0 сүлжээний дуудлага |
| Офлайн → онлайн sync | jsdom клиент + жинхэнэ server | ногоон, round trip батлагдав |
| Тогтвортой байдал | контейнер restart, volume persist | ногоон |
| Гүйцэтгэл, a11y бүтэц | байршуулсан bundle дээр хэмжив | ногоон |

## 2. Server API — шалгасан зан төлөв

Health ба контент
- `GET /api/health` → 200 `{"status":"ok","version":"1.1.0","contentVersion":"d75380c0"}`; docker healthcheck **healthy**.
- `GET /api/content/pack` → 200, 129 746 байт, `ETag: "d75380c0"` — health-ийн `contentVersion`-той **ижил** (контрактын шаардлага).
- `If-None-Match` зөв бол 304, хуучин бол 200.
- Пакетын бодит тоо: achievements **41** (≥40), cosmetics **66** (≥60), skills **38** (≥28), guilds **4** (яг 4), chains **4** (≥3), quests 59, dungeons 16, encounters 8, loot 18.

Authn/authz
- Токенгүй → 401; буруу токен → 401; **өөр тоглогчийн** save руу хүрэх → 403.
- `POST /api/players` → 201, `playerId` бүр давтагдахгүй, түүхий token зөвхөн нэг удаа буцав.
- Серверийн лог дотор токен **огт гарсангүй** (`grep` = 0).

Save + ETag (optimistic concurrency)
- `If-Match`-гүй PUT → 409; `If-Match: *` эхний бичилт → 200 + шинэ ETag; хоёр дахь `*` → 409; хуучирсан ETag → 409; зөв ETag → 200.
- `GET save` → 200, `schemaVersion=2`, state-ийн 27 талбар бүтэн.
- Хог state (`{"nope":1}`) → 400 `INVALID_BODY` (problem+json, талбар тус бүрийн алдаатай).
- `save/history` → snapshot бүртгэгдэв; `save/restore` зөв snapshot → 200, байхгүй snapshot → 404.

Action batch
- `updateSettings` + `rest` багц → 200, `SETTINGS_UPDATED` event гарав, шинэ ETag олгов.
- **Идемпотент**: ижил `actionId`-уудыг дахин илгээхэд `status: "replayed"`, төлөв давхардсангүй.
- Хуучирсан `If-Match` → 409; тодорхойгүй action type → 400 (зөвшөөрөгдсөн 14 төрлийн жагсаалтыг алдаанд буцаана).

Transfer
- `POST transfer-code` → 201, TTL-тэй код; `POST transfer/redeem` → 201 ба **шинэ** playerId.
- Шилжүүлсэн save нь шинэ токеноор уншигдав (27 талбар бүтэн).
- Ашигласан код дахин → 410; байхгүй код → **мөн 410** (кодын оршин тогтнол задрахгүй).

Rate limit
- Нэргүй глобал зам: 30 амжилттай дуудлагын дараа 429, `retry-after: 31`, `application/problem+json`. Тохиргооны хязгаартай (30/мин) яг таарав.

## 3. web-app (nginx)

- `/` → 200 `text/html` (413 байт), `/trophy-room` гэх гүн зам → **index.html-ийн яг ижил байт** (SPA fallback ажиллаж байна).
- `/assets/index-BFxMWW1w.js` → 200, 196 105 байт; `/assets/index-tt_aZswW.css` → 200, 8 260 байт.
- `/api/health` web-app-ын порт дээгүүр → 200 (nginx `proxy_pass` ажиллаж байна; CORS шаардлагагүй — нэг origin).
- `If-None-Match` → статик болон index хоёул 304.

## 4. Офлайн баталгаа (компанийн холболтгүй)

Байршуулсан bundle-ийг jsdom-д ачаалж, `fetch`/`XMLHttpRequest`-ийг бүртгэгчээр орлуулав:

- Ачаалахад **0 сүлжээний дуудлага** (цорын ганц `fetch(` нь Vite-ийн modulepreload polyfill, локал модуль руу заана). `XMLHttpRequest`, `WebSocket`, `sendBeacon`, analytics/CDN/Sentry **байхгүй**.
- Bundle доторх гадаад URL-ууд нь зөвхөн **сургалтын лавлагаа** (docs.blender.org, blackmagicdesign.com) — ажиллах үед татагддаггүй, текстийн өгөгдөл.
- Server контейнерийг **зогсоосон** нөхцөлд: index 200, JS 200, CSS 200, гүн зам 200; зөвхөн `/api/*` proxy 502 (хүлээгдсэн).
- Офлайн бүтэн тоглолтын гинж: Camp → өдрийн даалгавар roll → Main Quest Board → "Claim victory" → модалын 3 нөхцөлийг тэмдэглэх → claim.
  Үр дүн: **XP 0 → 60**, stamina 10/10 → 8/10, `completedMainQuestIds` 1, `mastery.blender.xp = 60`,
  `localStorage.ea.save.v1` (2 137 байт) бичигдэв, үйлдэл `ea.queue.v1`-д хүлээлгэнд орлоо, **сүлжээний дуудлага 0**.
- Дэлгэц бүр рендэрлэгдэв: Camp, Main Quest Board, Side Quest Board, Study Dungeons, Skill Tree, Achievements, Trophy Room, Settings (Project Forge нь `#/forge`).
  Тодорхойгүй hash (`#/boss`, `#/projects`) нь Camp руу буцдаг — router-ийн зориулалтын дагуу.
- Settings дэлгэцийн бүх удирдлага байрандаа: `reduced-motion`, `sound`, `sound-volume` (range), `colorblind`, `import-file`, `redeem-code`.

## 5. Офлайн → онлайн эвлэрүүлэг

Server-ийг эргүүлэн асаагаад ижил bundle-ийг жинхэнэ `fetch`-тэй ажиллуулав:

- Клиент өөрөө `POST /api/players` хийж бүртгүүлэв, дараа нь `POST /api/players/{id}/actions`-аар дарааллаа түлхэв.
- Төлвийн мөр «Offline» → **«Synced»**, `ea.queue.v1` **хоосорлоо**, `ea.save.etag` бичигдэв.
- Сервер талаас нягтлав: `GET /api/players/{id}/save` → 200, `xp=60`, `completedMainQuestIds=1`, `schemaVersion=2`.

## 6. Тогтвортой байдал

- `docker compose restart server` → health 200 буцаж ирэв (3 дахь оролдлогод).
- Restart-ийн өмнөх ба дараах `GET save` хариу **байт тутмаа ижил** — `ea-server-data` volume-ийн persist ажиллаж байна.

## 7. Гүйцэтгэл ба хүртээмж (байршуулсан bundle дээр хэмжсэн)

- Bundle eval 31 мс, эхний рендэр 65 мс, нийт 182 мс.
- Дэлгэц солих: quests 18 мс, dungeons 7 мс, skills 22 мс, trophies 22 мс, achievements 24 мс.
- Хэмжээ: JS 196 105 B (gzip 56 987 B), CSS 8 260 B (gzip 2 466 B).
- Бүтцийн a11y: `lang="en"`, title байгаа, skip-link 1, `main` 1, `nav` 1, `h1` 1, `aria-live` 1;
  **нэргүй товч 0**, **шошгогүй input 0**, **alt-гүй зураг 0**.

## 8. Ажиглалт (блоклогч БИШ, энэ шат засаагүй)

1. **Хувилбарын зөрүү** — `/api/health` нь `version: "1.1.0"` буцаана (`server/src/app.ts:53` `SERVER_VERSION`),
   атлаа `contracts.yaml` нь v1.2.0, `server/package.json` нь `1.2.0`, `web-app/package.json` ба
   `shared/content/index.ts` (`CONTENT_VERSION`) нь `1.1.0`. Контракт дахь `HealthOk.version` нь чөлөөт
   мөр (const биш) тул **гэрээ зөрчигдөөгүй**, гэвч ажиллаж буй систем өөрийгөө хуучин хувилбараар нэрлэж байна.
2. **nginx gzip унтраалттай** — 196 KB JS шахалтгүй очиж байна (gzip-тэй бол 57 KB). DEV-д хүлцэх боломжтой,
   гэвч нийтлэг сүлжээнд 3.4 дахин илүү трафик.
3. **Статик asset-д `Cache-Control` байхгүй** — зөвхөн `ETag`/`Last-Modified`-аар давтан баталгаажуулна.
   Файлын нэр hash-тай тул урт `max-age` тавих боломжтой.
4. **Server контейнер `root`-оор ажиллаж байна** (`uid=0`). DEV-д блоклогч биш, хатууруулалтын зүйл.
5. Контрактад `405` тодорхойлоогүй тул буруу method (`DELETE /api/health`) нь 404 буцаана — энэ нь
   загварын дагуу, алдаа биш (шалгаад баталсан).

## 9. Цэвэрлэгээ

`docker compose -f docker-compose.dev.yml down` — server, web-app контейнер ба `repo_default` сүлжээ бүрэн устав.
`repo_ea-server-data` volume нь `down`-ийн анхдагч зан төлвөөр үлдэв (`-v` өгөөгүй).
