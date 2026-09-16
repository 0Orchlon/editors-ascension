<!-- PERSONAL-2 · тайлан · UAT тест · 2026-09-16 -->

# UAT тестийн тайлан — PERSONAL-2

Орчин: локал UAT байршуулалт (`docker-compose.uat.yml`, project `editors-ascension-uat`).
Шалгасан service: `server` → http://localhost:19787, `web-app` (nginx) → http://localhost:19085.

| Зүйл | Утга |
|---|---|
| Репогийн commit | `0583a4f` (`issue/personal-2`) |
| server image | `a97cf76fd7bc…` |
| web-app image | `3b1dbcb87b5f…` |
| `contentVersion` | `d75380c0` (health ба `ETag` ижил) |
| Байршуулсан bundle | `index-BFxMWW1w.js` (195 887 B) · `index-tt_aZswW.css` (8 260 B) |
| Тестийн огноо (UTC) | 2026-09-16 |

⚠ Энэ шат нь **зөвхөн шалгана**. Код, тохиргоо, контейнер **өөрчлөгдөөгүй** — файлын
цорын ганц өөрчлөлт нь энэ тайлан ба `docs/PERSONAL-2/uat/` доторх шалгалтын скриптүүд.

---

## 1. Арга зүй

Бүх шалгалт **байршуулсан артефакт дээр**, гаднаас (black box) хийгдэв. Репогийн
`npm test` энд ДАХИН ажиллуулаагүй — тэр нь бүтээх шатны хаалга; UAT нь «байршуулсан
хувилбар нь гэрээ ба спекийн дагуу ажиллаж байна уу» гэдгийг шалгана.

| Багц | Хэрэгсэл | Юуг хөндөв |
|---|---|---|
| `uat/api.mjs` | бодит HTTP хүсэлт 19787 руу | 10 endpoint, 3 шинэ action, boss v2, chain, respec, replayLog, ETag, rate limit |
| `uat/web.mjs` | nginx-ээс татсан **bundle**-ыг jsdom-д ачаалж, axe-core-оор шалгав | статик түгээлт, офлайн ачаалт, 9 дэлгэц, Trophy Room, палитр, a11y |
| `uat/web2.mjs` | ижил bundle, палитрын тооцоолол + бодит сервертэй sync | контраст (182 хос), juice хамгаалалт, export/import, офлайн→онлайн эвлэрүүлэг |
| `uat/serverdown.mjs` | server контейнер УНТРААСАН үед bundle-ыг бодит `fetch`-ээр | API 502 үед аппын зан төлөв |
| `uat/resilience.mjs` + docker | контейнер restart, volume | төлвийн тогтвортой байдал |

Нийт **189 шалгалт**, бүгд ногоон:

| Багц | Шалгалт | Үр дүн |
|---|---|---|
| Server API (`api.mjs`) | 104 | 104 ✅ |
| Байршуулсан bundle (`web.mjs`) | 48 | 48 ✅ |
| Палитр · juice · sync (`web2.mjs`) | 19 | 19 ✅ |
| Сервергүй нөхцөл (`serverdown.mjs`) | 13 | 13 ✅ |
| Тогтвортой байдал (restart · volume · статик) | 5 | 5 ✅ |

Дахин ажиллуулах:

```bash
cd web-app && npm ci --prefer-offline     # jsdom · axe-core зөвхөн эндээс авна
node docs/PERSONAL-2/uat/api.mjs          # 19787 руу
node docs/PERSONAL-2/uat/web.mjs          # 19085-аас bundle татна
node docs/PERSONAL-2/uat/web2.mjs
```

⚠ `api.mjs`-ийн сүүлчийн бүлэг (M) нь нэргүй замын 30/мин хязгаарыг **зориудаар**
дуустал нь дуудна. Дараагийн скриптийг **~60 секундын дараа** эхлүүлнэ, эс бөгөөс
шинэ тоглогч бүртгэх алхам 429 авч худал улаан гарна.

---

## 2. Server API — 104 шалгалт

### 2.1 Health, контент (A-1…A-8)
- `GET /api/health` → 200 `{"status":"ok","version":"1.1.0","contentVersion":"d75380c0"}`; docker healthcheck **healthy**.
- `GET /api/content/pack` → 200, **129 746 B** (AC QX-4 «< 2MB» — 6.2%), `ETag: "d75380c0"` нь health-ийн `contentVersion`-той ижил, `cache-control: public, max-age=300, must-revalidate`.
- `If-None-Match` зөв → 304; хуучин → 200.

### 2.2 Байршуулсан контент нь `[C]` дүрмүүдийг хангаж байна (B-1…B-21)
Эдгээрийг **байршуулсан пакетаас** тооцов, репогийн JSON-оос БИШ:

| Дүрэм | Шаардлага | Хэмжсэн |
|---|---|---|
| SKL-1 | skill ≥28, 7 track, tier-3 яг 1/мод | 38 node · 7 track · мод тутам 1 capstone ✅ |
| SKL-1 | урьдчилсан нөхцөл нь DAG, tier алгасахгүй | мөчлөг 0, алгасалт 0 ✅ |
| COS-1 | cosmetic ≥60, 6 slot тус бүр ≥5 | 66; slot тутам 11 ✅ |
| COS-2 | `unlockSource` хоосон биш | өнчин 0 ✅ |
| RET-7 | амжилт ≥40 | 41 ✅ |
| RET-5 | guild 4, 7 tag тус бүр ЯГ нэг guild-д | 4 guild, 7 tag давхцалгүй ✅ |
| RET-1 | chain ≥3, тус бүр 4 алхам, давхцалгүй | 4 chain × 4 алхам, давхцал 0 ✅ |
| RET-3 | `bonusXp` ≤ дэлхийн хамгийн хямд main quest XP | 4/4 chain хангав ✅ |
| BSX-1 | дэлхий тутам ЯГ 1 boss | 1,1,1,1,1; `boss-strange-room` 3-р дэлхийд ✅ |

### 2.3 Authn / authz / алдааны хэлбэр (C-1…C-7)
- Токенгүй ба буруу токен → 401; **өөр тоглогчийн** save → 403; save байхгүй → 404.
- Бүх алдаа `application/problem+json`, `type · title · status · instance · code` талбартай.
- `POST /api/players` → 201, `playerId` давтагдахгүй, түүхий token зөвхөн нэг удаа.

### 2.4 Үйлдлийн хөдөлгүүр (D-1…D-12)
- Эхний багц `If-Match: *`-аар 200; сервер нь save байхгүй тоглогчид `newGame()`-ээс эхэлж **schemaVersion 2** төлөв бичив.
- **MST-2**: quest-ийн `tags` дахь track БҮРД бүтэн XP (`video-editing` 0→60); **MST-1**: бусад 6 track 0 хэвээр — XP нэвчээгүй.
- **RET-5**: `guild-cut` +3, бусад guild 0; бүх утга ≥0.
- Event дараалал: `STAMINA_SPENT → XP_GAINED → QUEST_COMPLETED → REPUTATION_GAINED → STREAK_EXTENDED → COMBO_CHANGED → COINS_GAINED → ACHIEVEMENT_UNLOCKED`.
- **BE-12 идемпотент**: ижил `actionId` → `status:"replayed"`, төлөв давхардсангүй. Давтсан quest claim → 422 `ALREADY_COMPLETED`.
- Хуучирсан `If-Match` → 409; тодорхойгүй action төрөл → 400; 5 минутаас хол ирээдүйн `at` → 422; 51 үйлдлийн багц → 400 (дээд хязгаар 50).

### 2.5 Boss v2 — hard mode (E-1…E-14)
Бодит `bossAttempt` үйлдлээр босго бүрийн ХИЛ дээр:

| Оноо | standard | hard | Хүлээсэн |
|---|---|---|---|
| 40 | — | `failed` | AC BSX-2 (hard mvp = 41) ✅ |
| 41 | `mvp` | `mvp` | урвуулалт байхгүй ✅ |
| 51 | — | `mvp` | 52 нь advanced-ийн зүсэлт ✅ |
| 52 | `mastery` | `advanced` | hard нь ЧАНД хатуу ✅ |
| 59 | — | `advanced` | ✅ |
| 60 | — | `mastery` | `ceil(52×1.15)=60` ✅ |

- **BSX-3**: 60-ийн дараа 12 оноотой оролдлого бүртгэсэн ч `(boss, hard)`-ийн дээд амжилт 60 хэвээр.
- **BSX-4**: rematch дараалан 200 — cooldown алга.
- **BSX-5**: унасан hard оролдлого BS-3-ийн ЯГ форматтай зөвлөгөө буцаав:
  `Attempt logged. Weakest category: Camera. Recommended side quest: Camera Copycat.`
- **BSX-6**: оролдлого бүр `replayLog`-д бичигдэв (10 оролдлого → 10 бичлэг).
- Тодорхойгүй difficulty (`directorsCut`) ба 0..10-аас гадуурх оноо → 422.

### 2.6 Prestige · respec · campLayout (F-1…F-4, K-1…K-5)
- **MST-3**: түвшин 10 биш track-д prestige → 422 `PREREQ_NOT_MET`, мессеж нь одоогийн түвшнийг НЭРЛЭНЭ.
- **COS-4**: `setCampLayout` нь 6 slot-ийн БҮТЭН объект шаардана (хэсэгчилсэн → 422); хэрэглэсний дараа level · xp · mastery · reputation БАЙРАНДАА.
- **SKL-3**: юу ч нээгээгүй модонд respec → `PREREQ_NOT_MET`; бодит нээлтийн дараа respec нь зарцуулсан оноог яг бүтнээр буцаав (0→1) ба unlock-ийг тэглэв; **ижил өдөр** дахин → 422 `RESPEC_ON_COOLDOWN`.
- **SKL-2**: нөхцөл хангаагүй capstone → `PREREQ_NOT_MET`.

### 2.7 Side quest chain (J-1…J-7)
`chain-first-week`-ийн 4 алхмыг дараалан дуусгав:
- 4 дэх алхамд `CHAIN_COMPLETED` гарч, `completedChainIds`-д ЯГ нэг удаа бичигдэв.
- Давтагдах 4 дэх алхмыг ДАХИН дуусгахад bonus ДАХИН олгогдсонгүй; давталтын XP буурав (30 → 15, AC SQ-2).
- Chain-ий явцад 4 track хөдөлж, 3 guild-ийн rep өслөө — бууралт алга.

### 2.8 Хадгалалт, ETag, snapshot (G-1…G-10)
- `If-Match`-гүй PUT → 409; `*` эхний бичилт → 200; хоёр дахь `*` → 409; хуучин ETag → 409.
- ETag нь **агуулгын hash**: ижил төлвийг дахин бичихэд ижил ETag, өөрчилсөн төлөвт шинэ ETag.
- Хог төлөв (`{"nope":1}`) → 400 `INVALID_BODY` (талбар тус бүрийн алдаатай) — одоо байгаа save ХЭВЭЭР.
- `save/history` → snapshot бүртгэгдэв; `restore` зөв ID → 200, байхгүй ID → 404.
- **SVX-1**: mastery · reputation · replayLog · campLayout · masteryPoints зэргийг хассан **v1 хэлбэрийн төлөв** → 400 (`/state/mastery` дутуу). Сервер migration хийдэггүй — энэ нь клиентийн үүрэг (lld §7.7) бөгөөд дутуу төлөв чимээгүй орж ирэхгүй.

### 2.9 `replayLog`-ийн таслалт (L-1…L-3)
**505** boss оролдлогыг (11 багц) илгээв: `bossAttempts` 505 бичлэгтэй, `replayLog` нь
**яг 500** — хамгийн хуучин нь FIFO-гоор хасагдав (AC SVX-2).

### 2.10 Шилжүүлэг, хязгаарлалт, гүйцэтгэл (H-1…H-5, I-1, M-1…M-3)
- `transfer-code` → 201 (TTL-тэй) → `redeem` → 201 шинэ `playerId`; шилжүүлсэн save шинэ токеноор бүтэн уншигдав.
- Ашигласан код **ба** байхгүй код хоёулаа **410** — кодын оршин тогтнол задрахгүй.
- Нэг үйлдлийн round trip: **median 3.3 ms · p95 3.6 ms**.
- Нэргүй глобал зам 30/мин хязгаартаа хүрч 429, `retry-after: 60`, `problem+json`.

---

## 3. Байршуулсан web-app — 48 шалгалт

### 3.1 Статик түгээлт
- `/` → 200 `text/html`; `/assets/*.js|css` → 200; `ETag`-аар 304.
- Гүн зам (`/trophies`) → index.html-ийн ЯГ ижил байт (SPA fallback).
- `/api/health` web-app портоор → 200 (nginx `proxy_pass`).
- **QX-3**: байршуулсан JS+CSS-ийн **gzip = 59 320 B** — хаалганы дээд хязгаарын доор.

### 3.2 Гадны холболтгүй байдал (OFF-2…OFF-4)
- Байршуулсан байтуудад гадаад origin **байхгүй**; цорын ганц гадаад URL нь сургалтын
  `tutorialRefs` (blender.org, blackmagicdesign.com) ба `w3.org` нэрийн орон зай.
- `sendBeacon`, analytics/telemetry SDK, `WebSocket`, `EventSource`, `XMLHttpRequest` — **алга**.
- CSS дотор гадаад font/CDN `@import` алга.

### 3.3 Juice давхарга (FX-2, FX-4)
- CSS-ийн бүх `animation`/`transition` ≤ **280 ms** (7 тунхаг) — 300ms-ийн тааз хангав.
- `@keyframes` нь зөвхөн `transform`/`opacity` төрлийн шинж чанар хөдөлгөнө — layout шинж чанар алга.
- `prefers-reduced-motion` хамгаалалт байршуулсан CSS-д бий; `reducedMotion` тохиргоо нь
  `<html class="reduced-motion">` гэсэн **ГАНЦ** хаалга тавина.
- Эзлэхүүн 0 үед claim хийхэд WebAudio oscillator **0** үүсэв (FX-3).

### 3.4 Дэлгэц, UI гэрээ
- 9 маршрут бүгд агуулгатай рендэрлэгдэв (Camp · Quests · Side Quests · Dungeons · Skills · Achievements · Trophy Room · Settings · Forge).
- **VIS-6**: Camp дээр 7 mastery bar + guild rank + XP/Stamina/Streak нэг дэлгэцэнд.
- **COS-3**: Trophy Room 142 бичлэг жагсаав; нээгдээгүй бүр «юу хийвэл нээгдэх»-ийг ТЕКСТЭЭР хэлнэ.
- **SKL**: 7 track таб, capstone нөхцөл текстээр, «Reflect» (respec) товч байрандаа.
- **BSX**: Forge дээр hard mode ба хувийн дээд амжилт харагдана.
- **Settings**: `set-reduced-motion` · `set-sound` · `set-sound-volume` · `set-colorblind` · `import-file` · `redeem-code`.
- **VIS-7**: `div`+`onclick` хэлбэрийн удирдлага **0**.
- **VIS-8**: axe-core (wcag2a+wcag2aa) 9 дэлгэц дээр — critical/serious зөрчил **0**.
- **FX-6**: `aria-live` мужаар event-үүд текстээр давхар зарлагдана.

### 3.5 Палитр ба контраст (VIS-2, VIS-3)
- Байршуулсан CSS-д 6 палитр (`camp` + `w1..w5`) ба `[data-cb]` багц бий.
- Токенийн хүснэгтээс **182 хос** контраст тооцов: текстийн хос бүр ≥4.5:1, фокус/хүрээний хос бүр ≥3:1 — **зөрчил 0**.
- **VIS-3**: `colorBlindSafe`-ийг асаахад `<html data-cb="1">` л солигдож, `#app`-ийн DOM
  **байт тутам ижил** үлдэв (цорын ганц ялгаа нь `aria-live` дэх зарлал — энэ нь A11y-ийн шаардлага).

### 3.6 Офлайн тоглолт (OFF-1, OFF-6)
- Bundle ачаалахад **сүлжээний дуудлага 0**, uncaught алдаа 0.
- Claim модал: 3 нөхцөл тэмдэглэгдтэл товч **disabled**, бүгд тэмдэглэгдмэгц идэвхжив (MQ-6).
- Claim → `xp 0→60`, `mastery.blender.xp=60`, `reputation.guild-form=3`, локал save `schemaVersion 2`, үйлдэл `ea.queue.v1`-д хүлээлгэнд.

---

## 4. Офлайн ↔ онлайн эвлэрүүлэг ба экспорт (19 шалгалт)

- **SV-5/SVX-3**: Export нь 2 102 B файл гаргав; дотор нь mastery · reputation · replayLog ·
  campLayout · completedChainIds · masteryPoints · bossAttempts бүгд (27 талбар).
  Шинэ хуулбар руу import хийхэд XP · mastery · reputation **яг таарав**.
- **SV-4**: гэмтсэн файл (`{"state":{"xp":"not-a-number"}}`) татгалзагдаж, одоо байгаа
  явц ХЭВЭЭР үлдэв, шалтгаан дэлгэцэнд гарав.
- **BE-7**: офлайнаар claim хийсэн клиент сүлжээ сэргэхэд өөрөө бүртгүүлж
  (`ea.creds.v1`), дарааллаа бүрэн хоослов (1 → 0). Сервер талаас нягтлахад
  `xp=60`, mastery ижил, `schemaVersion=2`. Төлвийн мөр «Synced».
- **QX-6 (клиент тал)**: нэг claim-ийн боловсруулалт (домэйн → mastery roll-up →
  achievement үнэлгээ → дахин рендэр) **6.1 ms** — 50ms-ийн таазны 12%.
- Клиент нь ЗӨВХӨН өөрийн `/api/...` origin руу хандав.

---

## 5. Сервергүй ба тогтвортой байдал (18 шалгалт)

`server` контейнерийг **зогсоосон** нөхцөлд:
- `index` · `/assets/*.js` · `/assets/*.css` · гүн зам → бүгд 200; зөвхөн `/api/*` → 502 (хүлээгдсэн).
- Bundle нь бодит `fetch`-ээр 502 авсан ч uncaught алдаагүй ачаалав; 8 дэлгэц бүрэн рендэрлэв;
  claim хийгдэж локал save-д бичигдэж, дараалалд хүлээв.
- Төлвийн мөр эхний ~15 секундэд «Syncing…» (дахин оролдлогын backoff), дараа нь
  **«Sync problem — progress saved on this device»** гэж ТЕКСТЭЭР суув.

Контейнер restart:
- `docker restart` → health 200 `healthy`; өмнө бичсэн save ба токен volume-д хадгалагдаж,
  `xp`, mastery яг хэвээр уншигдав.

---

## 6. AAA-SPEC §2-ийн зорилтууд — байршуулсан пакетаас хэмжсэн

`docs/PERSONAL-2/spec.md` §1-ийн **Шийдвэр S-1** нь AAA-SPEC-ийн Wave 1 · 2 · 4-ийг хамруулж,
**Wave 3 (контентын хэмжээ)-ийг хамрах хүрээнээс ГАДУУР** үлдээсэн. Доорх зөрүү нь тэр
шийдвэрийн хүлээгдсэн үр дүн — UAT-ийн олсон согог БИШ. Дараагийн долгионы хэмжүүр болгож бичив:

| Тэнхлэг | AAA зорилт | Байршуулсан |
|---|---|---|
| Дэлхий / season | 5 × 3 = 15 | 5 дэлхий, `seasons` талбар алга |
| Main quest | 45+ | 18 |
| Side quest | 70+ | 20 |
| Study Dungeon | 40+ | 16 |
| Boss | 14 (7 + 7 remix) | 5 base × 2 difficulty |
| Амжилт | 60+ | 41 (PERSONAL-2-ийн ≥40 хангасан) |
| Cosmetic / loot | 90+ | 66 cosmetic + 18 loot (≥60 хангасан) |
| Encounter | 24+, 4 гинж | 8, гинж алга |
| Skill node | 60+ / 6 мод | 38 / 7 мод (≥28 хангасан) |
| Difficulty | standard · hard · directorsCut | standard · hard (`directorsCut` серверт татгалзагдана) |
| Save slot | 3 нэртэй | 1 (схемд `slotId` алга) |
| Dungeon question bank | ≥6-аас 3 сонгоно | dungeon тутам 3 асуулт |
| Portfolio таб | бий | алга |
| Telemetry export | opt-in | алга |

---

## 7. Ажиглалт (блоклохгүй)

1. **Health-ийн `version` нь `1.1.0`**, гэрээний файлын жишээ (`contracts.yaml` §health example)
   нь `1.2.0` гэж бичигдсэн. Схемд `version` нь чөлөөт мөр тул зөрчил биш, гэхдээ
   жишээ ба бодит утга зөрүүтэй — дараагийн хувилбарт `SERVER_VERSION`-ыг гэрээний
   хувилбартай нийцүүлэх эсэхийг шийдэх нь зүйтэй.
2. **nginx `try_files $uri /index.html`** тул байхгүй `/assets/*.js` зам нь 404 биш
   **200 + HTML** буцаана. Тоглогчид нөлөөгүй (hash-тай нэр), гэвч хуучирсан asset
   хүссэн хөтөч «JS байрлалд HTML» авч будлиантай алдаа өгч болзошгүй.
3. **Сервер 502 үед** төлвийн мөр ~15 секунд «Syncing…» хэвээр байгаад дараа нь
   «Sync problem» болно (дахин оролдлогын backoff). Мэдээлэл алдагдахгүй; зөвхөн
   хэрэглэгчийн хүлээх хугацааны ажиглалт.
4. **`replayLog` нь ЗӨВХӨН boss оролдлогыг бичнэ** (`plan.md` P-24-ийн зориудын шийдвэр).
   AAA-SPEC §3 нь claim/dungeon-ийг ч дурдсан — схем өөрчлөхгүйгээр хожим нэмэгдэх зай бий.
5. **Нэргүй глобал хязгаар 30/мин** нь автомат шалгалтын хэрэгсэлд мэдрэгддэг: дараалсан
   скриптүүдийн хооронд ~60 секунд хүлээх шаардлагатай (§1-ийн анхааруулга).

---

## 8. Хамрагдаагүй зүйл (ил хязгаарлалт)

- **VIS-5 (360/768/1280 өргөний хэвтээ гүйлгэлт)** — jsdom-д layout хөдөлгүүр байхгүй тул
  хэмжих боломжгүй. Энэ нь репогийн `npm test` доторх a11y/regression тестээр хаагдсан.
- Бодит хөтчийн рендэр (фонт, focus ring-ийн харагдах байдал), ачааллын/стресс тест,
  нэвтрэлтийн аюулгүй байдлын гүнзгий шалгалт — энэ шатны хамрах хүрээнд ОРООГҮЙ.
- Сервер талын migration хийдэггүй тул v1→v2 migration нь клиентийн `npm test`-ээр
  хаагдана; UAT нь зөвхөн «сервер дутуу төлвийг ТАТГАЛЗАНА» гэдгийг баталгаажуулав.

---

## 9. Дүгнэлт

Байршуулсан UAT хувилбар нь `docs/PERSONAL-2/spec.md`-ийн хамрах хүрээнд буй
AC-VIS · AC-FX · AC-MST · AC-SKL · AC-BSX · AC-RET · AC-COS · AC-OFF · AC-SVX · AC-QX
шалгуурыг **бүрэн хангаж байна**: 189/189 шалгалт ногоон, улаан шалгалт алга,
блоклох согог олдсонгүй. Хэрэглэгчийн дөрвөн шаардлага — илүү өнгөлөг, илүү зууралдам,
офлайн ажиллана, компанийн холболтгүй — байршуулсан артефакт дээр баталгаажив.
