<!-- PERSONAL-2 · contract-docs · Гэрээ нийтлэх · 2026-09-16 -->
<!-- ҮҮСГЭСЭН ФАЙЛ — гараар бүү засварла. Эх: docs/PERSONAL-2/contracts.yaml -->
<!-- Гараар бичих хэсэг: docs/PERSONAL-2/contract-docs.prologue.md -->
<!-- Дахин үүсгэх: cd server && npm run contract:docs -->

# Editor's Ascension API — гэрээний баримт v1.2.0

Ганц тоглогчийн судалгаа-RPG-ийн backend. Хамрах хүрээ: контент пакет тараах, нэргүй тоглогчийн save хадгалах, ба тоглоомын үйлдлийг эрх бүхий талаар `shared/core` домэйнээр хэрэгжүүлэх. v1.2.0 нь PERSONAL-2-ийн гүнзгийрүүлэлтийн схемийг нэмнэ: mastery track, guild reputation, side quest chain, boss hard mode, cosmetic каталог. Домэйн дүрэм нь НЭГ хувилбартай (`shared/core/**`) бөгөөд клиент, сервер хоёул ижил кодыг ажиллуулна (AC OFF-7 · BE-10). Сервер унтарсан үед клиент локал домэйнээр БҮРЭН ажиллана — шинэ системүүд ч мөн адил (AC OFF-1). ⚠ Гадаад origin БАЙХГҮЙ (AC OFF-2…OFF-5): энэ API нь тоглогчийн ӨӨРИЙН ажиллуулдаг сервер бөгөөд заавал БИШ. Гуравдагч талын analytics, telemetry, CDN, font, аудио эх сурвалж энэ гэрээнд БАЙХГҮЙ бөгөөд нэмэгдэхгүй.

- **OpenAPI:** 3.1.0 · эх файл: [`contracts.yaml`](contracts.yaml)
- **Server:** `/api`
- **Үндсэн хамгаалалт:** `playerToken` (Bearer). `security: []` тэмдэгтэй үйлдэл нээлттэй.
- **Дуурайлт (mock):** `cd server && npm run contract:mock` → `http://127.0.0.1:4010/api`
- **Нийтлэлийн хаалга:** `cd server && npm run contract:lint` (14 хаалга)
- **Хэмжээ:** 10 үйлдэл · 50 схем

## Хувилбарын зөрүү — v1.1.0 → v1.2.0

⚠ Энэ хэсэг нь ҮҮСГЭГДСЭН: хоёр `contracts.yaml`-ийг машинаар харьцуулсан үр дүн.
Гараар бичсэн өөрчлөлтийн жагсаалттай зөрвөл ЭНЭ нь зөв.

- Шинэ схем: 19 — ActionPayloadPrestigeMastery · ActionPayloadRespecTree · ActionPayloadSetCampLayout · ActionPayloadUpdateSettings · ActionPayloadBossAttempt · DomainEventType · SkillTag · Rarity · DifficultyTier · CosmeticSlot · MasteryTrack · ReplayLogEntry · CampLayoutSlots · CampLayout · BossAttempt · GuildDefinition · SideQuestChain · CosmeticUnlockSource · CosmeticItem
- Шинэ талбар: 22 — GameState.mastery (заавал) · GameState.masteryPoints (заавал) · GameState.reputation (заавал) · GameState.replayLog (заавал) · GameState.campLayout (заавал) · GameState.completedChainIds (заавал) · GameState.respecAt (заавал) · GameState.dungeonStats (заавал) · SkillDefinition.track (заавал) · SkillDefinition.tier (заавал) · ContentPack.guilds (заавал) · ContentPack.chains (заавал) · ContentPack.cosmetics (заавал) · ProgressionConstants.hardModeMultiplier (заавал) · ProgressionConstants.masteryMaxLevel (заавал) · ProgressionConstants.masteryPrestigeLevel (заавал) · ProgressionConstants.respecCooldownDays (заавал) · ProgressionConstants.refresherMinDays (заавал) · ProgressionConstants.replayLogCap (заавал) · ProgressionConstants.repThresholds (заавал) · ProgressionConstants.repBase (заавал) · ProgressionConstants.guildCount (заавал)
- Шинэ enum утга: 4 — RejectionReason.RESPEC_ON_COOLDOWN · ActionType.prestigeMastery · ActionType.respecTree · ActionType.setCampLayout

## Нийтлэлийн бүртгэл

| Хувилбар | Файл | Төлөв | Юу нэмэгдсэн | Хаалга |
|---|---|---|---|---|
| `v1.1.0` | [`../PERSONAL-1/contracts.yaml`](../PERSONAL-1/contracts.yaml) | нийтлэгдсэн · **хүчинтэй хэвээр** | 10 endpoint · 31 схем | `server/tests/contract/contract.test.ts` |
| `v1.2.0` | [`contracts.yaml`](contracts.yaml) | **нийтлэгдэв** (PERSONAL-2 · Гэрээ нийтлэх шат) | +19 схем · +22 талбар · +4 enum утга · endpoint 0 | `npm run contract:lint` (G-1…G-14) + `server/tests/contract/publish.test.ts` |

v1.2.0 нь **v1.1.0-ийн орлуулагч БИШ, харин бүтэн залгамжлагч**: файл нь бүх 10 замыг
ба 50 схемийг **өөртөө** агуулна. v1.1.0-ийг унших шаардлагагүй — хэрэглэгч ганцхан
`contracts.yaml` унших боломжтой (нийтлэх шатны хамгийн эхний шаардлага).

### Нийтлэгдсэн гэрээ гэдэг нь юу вэ

Гурван зүйл НЭГ зэрэг байж гэмээ нь гэрээ «нийтлэгдсэн» гэж тооцогдоно:

1. **Машин уншигдах эх** — [`contracts.yaml`](contracts.yaml), 14 хаалгаар шалгагдсан.
2. **Ажилладаг дуурайлт** — `cd server && npm run contract:mock`. Хэрэгжүүлэлт
   бичигдээгүй байхад л хэрэглэгч (web-app) гэрээний эсрэг ажиллаж эхэлнэ.
3. **Уншигдах баримт** — энэ файл; `contracts.yaml`-аас ҮҮСГЭГДДЭГ тул салах зам алга.

⚠ Гурвын аль нэг дутвал нийтлэл **дуусаагүй**: эх байгаад дуурайлтгүй бол хэрэглэгч
хэрэгжүүлэлтийг хүлээнэ; баримтгүй бол YAML уншиж чаддаг хүн л гэрээг ойлгоно.

---

## 1. Нийцтэй байдлын ангилал

Машин үүсгэсэн зөрүү (дээрх хэсэг) нь **юу өөрчлөгдсөнийг** хэлнэ. Энэ хүснэгт нь
**хэн эвдрэхийг** хэлнэ — хоёр нь өөр асуулт.

| Өөрчлөлт | Ангилал | Хэнд нөлөөлнө | Яаж хучигдсан |
|---|---|---|---|
| `GameState` +8 ЗААВАЛ талбар | **Эвдэх (бичигч)** | v1.1.0-ийн клиент `PUT /save` хийвэл 400 | Сервер v1 биеийг ХҮЛЭЭН АВЧ `MIGRATIONS[2]`-оор дээшлүүлнэ (AC SVX-3). Тиймээс **утсан дээр эвдрэхгүй** |
| `GameState.settings` +2 ЗААВАЛ талбар | **Эвдэх (бичигч)** | дээрхтэй ижил | дээрхтэй ижил — migration нь `colorBlindSafe: false` · `soundVolume: 1` тавина |
| `bossAttempts[].difficulty` ЗААВАЛ | **Эвдэх (бичигч)** | хуучин bossAttempt бичлэг | migration нь `standard` тавина; офлайн дараалалд хадгалагдсан action-д мөн адил |
| `SkillDefinition` +`track` +`tier` | **Эвдэх (контент)** | хуучин `skills.json` | контентын шат (T-568) шинэчилнэ; `validate:content` барина |
| `ContentPack` +`guilds` +`chains` +`cosmetics` | **Эвдэх (уншигч)** | пакетыг бүтнээр шалгадаг клиент | клиент `shared/validate`-ийн ИЖИЛ схемийг ашигладаг тул нэг алхамд хамт шинэчлэгдэнэ |
| `ActionType` +3 утга | Нэмэх | — | хуучин клиент шинэ утга ИЛГЭЭХГҮЙ; шинэ клиент хуучин сервер рүү илгээвэл 400 |
| `DomainEventType` +4 утга | Нэмэх | event уншигч | танихгүй event нь АЛГАСАГДАНА (одоогийн зан төлөв), UI унахгүй |
| `RejectionReason` +`RESPEC_ON_COOLDOWN` | Нэмэх | 422 боловсруулагч | `code`-ийг таньдаггүй клиент нь `title`/`detail`-ыг харуулна |
| `ProgressionConstants` +9 тогтмол | Нэмэх | — | `/content/pack`-ийн ETag солигдоно → клиент дахин татна |
| Endpoint | **Өөрчлөгдөөгүй** | — | G-12 хаалга барина |
| Устсан зүйл | **Байхгүй** | — | G-13 хаалга барина |

**Дүгнэлт:** v1.2.0 нь схемийн түвшинд эвдэх өөрчлөлттэй ч, **утсан дээр (wire)
арагш нийцтэй** — учир нь `PUT /save` нь `schemaVersion: 1`-ийг хүлээн авч
дээшлүүлдэг. Ийм учраас minor bump (1.1.0 → 1.2.0) зөв. Хэрэв сервер v1-ийг
татгалзаж эхэлбэл энэ нь **2.0.0** болох ёстой — G-14 хаалга яг үүнийг хардаг:
хүсэлтийн бие дээр заавал талбар нэмэгдсэн атал нүүлгэх зам зарлагдаагүй бол унана.

---

## 2. Endpoint-ийн зан төлөвийн өөрчлөлт

Зам, метод, статус код, header **ӨӨРЧЛӨГДӨӨГҮЙ**. Шинэ endpoint БАЙХГҮЙ.

| Endpoint | v1.2.0-д юу өөр |
|---|---|
| `POST /players/{id}/actions` | `type`-д гурван шинэ утга: `prestigeMastery` · `respecTree` · `setCampLayout`. `bossAttempt.payload` нь сонголттой `difficulty` авна; байхгүй бол `standard`. `updateSettings.payload` нь `colorBlindSafe?` · `soundVolume?` авна. Татгалзлын `code`-д `RESPEC_ON_COOLDOWN` нэмэгдэв (422). |
| `PUT /players/{id}/save` | `schemaVersion` нь 2. **v1 бие хүлээн авагдана** — сервер `MIGRATIONS[2]`-оор дээшлүүлж хадгална. `> CURRENT_SCHEMA_VERSION` нь 400 `INVALID_INPUT`. |
| `POST /players/{id}/save/restore` | v1 snapshot сэргээхэд `MIGRATIONS[2]` ажиллаж v2 буцна. |
| `GET /content/pack` | Хариунд `guilds` (4) · `chains` (≥3) · `cosmetics` (≥60) нэмэгдэв. `skills ≥28` · `achievements ≥40` болж чангарав. ETag автоматаар солигдоно (`canonicalJson` hash). |
| `GET /health` | Контентын шалгалт шинэ 3 хэсгийг мөн хамарна; `unlockSource`-ийн өнчин лавлагаа нь пакетыг хүчингүй болгож 503 degraded үүсгэнэ. |

### Ил чөлөөлөлт — `GET /health` → 503

`server/CLAUDE.md` нь «Бүх 4xx/5xx хариу `application/problem+json`» гэж заасан.
`getHealth`-ийн 503 нь ЭНЭ дүрмээс **ил чөлөөлөгдсөн** бөгөөд чөлөөлөлт нь гэрээнд
`x-problem-exempt` талбараар, **шалтгаантайгаа хамт** бичигдсэн:

> Health нь 200 ба 503-д ИЖИЛ баримтын хэлбэр буцаана (AC BE-15). Problem руу
> шилжүүлбэл health-ийн хоёр дахь хэлбэр үүснэ.

G-6 хаалга нь `x-problem-exempt`-ийг **≥20 тэмдэгтийн шалтгаантай** үед л
зөвшөөрнө — `true` гэсэн ганц утга ХҮРЭЛЦЭХГҮЙ. Шалтгаангүй чөлөөлөлт нь
зөрчлөөс дор: дараагийн уншигч яагаад гэдгийг мэдэхгүй тул хуулбарлана.

---

## 3. Save v1 → v2 — талбар тутмын анхдагч

Migration нь `shared/save/migrations.ts → MIGRATIONS[2]`. Клиент, сервер хоёул ИЖИЛ
кодыг ажиллуулна (AC BE-10). Анхдагч бүр нь **мэдээлэл ЗОХИОХГҮЙ** зарчмаар сонгогдсон.

| Шинэ талбар | Анхдагч | Яагаад яг тэр |
|---|---|---|
| `mastery` | 7 track × `{xp: 0, level: 1, prestigeCount: 0}` | Хуучин save-д track тутмын XP БАЙХГҮЙ. Нийт XP-ээс буцааж хуваарилах нь тоо ЗОХИОХ явдал болно. |
| `masteryPoints` | `0` | **Үлдэгдэл**, олдсон нийт БИШ (plan.md P-20). Level 1 → олдсон нийт 0. |
| `reputation` | 4 guild × `0` | Хуучин үйлдлээс rep буцааж тооцох зам алга (event log хадгалагддаггүй). |
| `replayLog` | `[]` | Өнгөрсөн үйлдлийн бичлэг байхгүй. 500-аар таслагдана (FIFO). |
| `campLayout` | 6 слот бүгд `null` | Cosmetic нээгдээгүй. |
| `completedChainIds` | `[]` | Chain нь v1.2.0-д гарч ирсэн. |
| `respecAt` | `null` | «Хэзээ ч respec хийгээгүй» → анхны respec ЗӨВШӨӨРӨГДӨНӨ. |
| `dungeonStats` | `{}` | `completedDungeonIds` нь **огноогүй** — тэнцсэн ОГНООГ зохиох нь refresher-ийн нэр дэвшилтийг хуурамчаар эхлүүлнэ. Дараагийн тэнцэлтээс тоологдоно. |
| `settings.colorBlindSafe` | `false` | Хэрэглэгч сонгоогүй. |
| `settings.soundVolume` | `1` | `soundEnabled` нь v1-д аль хэдийн байгаа — дуу асаалттай хүнд хэмжээ бүтэн. |
| `bossAttempts[].difficulty` | `standard` | Hard mode нь v1.2.0-д гарсан тул хуучин оролдлого бүр standard байсан. |

⚠ Migration нь **нэг чиглэлтэй**. v2 → v1 буулгах зам БАЙХГҮЙ: доошлуулбал 8 талбарын
мэдээлэл алдагдана. Export файлыг буцааж импортлох нь `schemaVersion`-оор шийдэгдэнэ.

---

## 4. Клиент нүүлгэх зааврын хамгийн бага багц

1. **`schemaVersion: 2`.** Export/import файл ба `PUT /save`-ийн бие хоёул. v1 файл
   хэвээр импортлогдоно (migration).
2. **`GameState`-д 8 шинэ ЗААВАЛ талбар** — `mastery` (7 түлхүүр) · `masteryPoints` ·
   `reputation` (4 түлхүүр) · `replayLog` · `campLayout` · `completedChainIds` ·
   `respecAt` · `dungeonStats`. Дутуу бол 400.
3. **`settings`-д 2 шинэ ЗААВАЛ талбар** — `colorBlindSafe: boolean` ·
   `soundVolume: number` (0..1).
4. **`bossAttempts[].difficulty` ЗААВАЛ** — хуучин бичлэгт `standard`.
5. **Шинэ 4 event-ийг таних** — `MASTERY_LEVEL_UP` · `MASTERY_PRESTIGED` ·
   `REPUTATION_GAINED` · `CHAIN_COMPLETED`. Танихгүй event нь UI-д алдаа үүсгэх ёсгүй
   (одоогийн зан төлөв: бүртгэлд байхгүй event алгасагдана).
6. **Офлайн дараалалын нийцтэй байдал:** v1.1.0-д дараалалд орсон `bossAttempt`
   (`difficulty`-гүй) хожим илгээгдэхэд **эвдрэхгүй** — `standard` гэж уншигдана.

### Сервер талын нүүлгэлт

1. `shared/validate/schemas.ts` нь `contracts.yaml`-ийн ДАРАА шинэчлэгдэнэ — зөрүүг
   `web-app/tests/unit/contract-parity.test.ts` барина (AC QX-2).
2. `MIGRATIONS[2]` нэмэгдэнэ; `CURRENT_SCHEMA_VERSION` нь 2 болно.
3. `applyAction` дискпетчерт 3 шинэ `ActionType` залгагдана (T-567).
4. `/content/pack`-ийн хариу 3 хэсгээр өснө → `canonicalJson` hash солигдож ETag шинэчлэгдэнэ.
   ⚠ Хариу < 2MB байх ёстой (AC QX-4) — хэмжээг сервер талын тестээр барина.

---

## 5. Гэрээнээс ГАРГАЖ авдаг зүйлс (талбар БИШ)

Эдгээрийг хүсэх кодыг **бичихгүй** — `GameState`-д ийм талбар БАЙХГҮЙ:

| Хүсэх зүйл | Хаанаас гарна |
|---|---|
| Нээгдсэн cosmetic | `cosmetics[].unlockSource` + төлөв (`lld.md §6.4`) |
| Boss-ийн хувийн дээд амжилт | `bossAttempts`-ээс `(bossId, difficulty)`-оор `max(total)` |
| Chain-ийн явц | `sideQuestStats[stepId].lastCompletedAt`-ийн дараалал |
| Олдсон нийт mastery point | `Σ_tracks((level − 1) + prestigeCount × 9)` |
| Hard mode-ын босго | `ceil(bossTiers[t] × hardModeMultiplier)` = `41 · 52 · 60` |
| Guild rank | `rankOf(rep)` = `repThresholds`-оос хэтрээгүй босгуудын тоо → `0..4` |

⚠ Эдгээрийг талбар болгож нэмэх санал гарвал: нэмсэн мөчид **хоёр эх** үүснэ — тооцоолол
ба хадгалсан утга. Тэр хоёр салахад аль нь зөв бэ гэдгийг хэн ч хэлж чадахгүй.

---

## 6. Татгалзлын код → шалтгаан (v1.2.0-ийн шинэ замууд)

| Action | Код | Хэзээ |
|---|---|---|
| `prestigeMastery` | `INVALID_INPUT` | `tag` нь 7 `SkillTag`-д үгүй |
| `prestigeMastery` | `PREREQ_NOT_MET` | track level ≠ `masteryPrestigeLevel` (10) |
| `respecTree` | `INVALID_INPUT` | `track` нь 7 `SkillTag`-д үгүй |
| `respecTree` | `RESPEC_ON_COOLDOWN` | сүүлийн respec-ээс < `respecCooldownDays` (7) тоглоомын өдөр |
| `respecTree` | `PREREQ_NOT_MET` | тухайн модонд нээгдсэн node байхгүй |
| `setCampLayout` | `INVALID_INPUT` | 6 slot биш · танихгүй cosmetic id · буруу үүрэнд |
| `setCampLayout` | `PREREQ_NOT_MET` | нээгдээгүй cosmetic зүүх оролдлого |
| `unlockSkill` | `PREREQ_NOT_MET` | capstone-ийн 3 нөхцөлийн аль нэг дутуу (`detail` нь АЛЬ нь дутсаныг нэрлэнэ) |
| `unlockSkill` | `INSUFFICIENT_SKILL_POINTS` | tier-1-д `skillPoints` · tier-2/3-д `masteryPoints` хүрэлцэхгүй |
| `updateSettings` | `INVALID_INPUT` | `soundVolume` нь `0..1`-д үгүй |

⚠ **Шинэ `RejectionReason` нэмэх нь СПЕКИЙН өөрчлөлт** (plan.md §13.3). Дээрх бүх
татгалзал одоогийн 8 кодод багтана — код нэмбэл 422-ыг боловсруулдаг БҮХ клиент
шинэчлэгдэх шаардлагатай болно.

---

## 7. Дуурайлтаар шалгах — жорууд

```bash
cd server && npm run contract:mock        # http://127.0.0.1:4010/api
```

| Юу шалгах | Команд |
|---|---|
| Гэрээний хэлбэр зөв уншигдаж байна уу | `curl -s http://127.0.0.1:4010/api/health` |
| Token шаардлага | `curl -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4010/api/players/$UUID/save` → `401` |
| Тодорхой алдааны зам | `curl -H 'Authorization: Bearer x' -H 'Prefer: code=409' -X PUT …` |
| Хүсэлтийн биеийн шалгалт | буруу бие илгээ → `400` + `errors[]` талбар тутмын замтай |
| Гэрээнд байхгүй зам | `curl …/api/nope` → `404` |

**Дуурайлтын хил (ил бичив):**
- Төлөв ХАДГАЛАХГҮЙ. `PUT` хийгээд `GET` хийвэл өөрийн бичсэн зүйл БУЦАХГҮЙ.
- `ETag` тогтмол `W/"mock"` — 409-ийн урсгалыг `Prefer: code=409`-ээр дуурайна.
- Домэйн дүрэм ажиллахгүй: `POST /actions` нь ямар ч `type`-д амжилттай хэлбэр буцаана.
  Домэйн зан төлөв нь `shared/core` ба жинхэнэ серверийн тестийн ажил.
- `Prefer: code=NNN` нь гэрээнд ЗАРЛАГДААГҮЙ кодыг заавал 400 өгнө — дуурайлт нь
  гэрээнээс гадуур хариу зохиохгүй.

---

## 8. Нийтлэлийн хаалга — G-1…G-14

`cd server && npm run contract:lint` · `server/tests/contract/publish.test.ts`-д мөн ажиллана.

| Хаалга | Юу шалгана | Яагаад |
|---|---|---|
| G-1 | `openapi: 3.1.0` | Хэрэгслүүд өөр хувилбарт өөрөөр биеэ авч явна |
| G-2 | `info.version` нь semver ба өмнөхөөсөө ЧАНД их | Хоёр өөр агуулга нэг дугаартай байвал «аль нь» гэдэг хариугүй |
| G-3 | `$ref` бүр задарна, гадаад заалт алга | Тасарсан `$ref` нь дуурайлт ба codegen-ийг унагана |
| G-4 | Өнчин схем алга (`$ref` эсвэл тайлбараар дурдагдсан) | Хэн ч заадаггүй схем нь хуучирч, хожим буруу лавлагаа болно |
| G-5 | `operationId` давхцаагүй, `summary` · `tags` · хариу байна | `operationId` нь codegen-ийн функцийн нэр |
| G-6 | 4xx/5xx бүр RFC 9457 `Problem` (ил чөлөөлөлтөөс бусад) | Алдааны хоёр хэлбэр = клиент бүрд хоёр зам |
| G-7 | Замын `{параметр}` бүр зарлагдсан | Зарлагдаагүй параметр нь дуурайлт болон validator-т үл мэдэгдэнэ |
| G-8 | Хамгаалалт ил (`security: []` эсвэл үндсэн схем) | Санамсаргүй нээлттэй endpoint нь эмзэг байдал |
| G-9 | Гэрээн дэх `example` бүр ӨӨРИЙН схемээ хангана | Хуурамч жишээ нь хэрэглэгчийг буруу замд хөтөлнө |
| G-10 | `sample()`-ийн үүсгэсэн жишээ бүр схемээ хангана | Үүсгэгч ба шалгагч салвал дуурайлт хүчингүй хариу тарааж эхэлнэ |
| G-11 | Гэрээнд гадаад origin алга (`127.0.0.1` · `localhost` л) | AC OFF-2…OFF-5 — гадны холболтгүй |
| G-12 | Endpoint нэмэгдээгүй · устаагүй | v1.2.0-ийн ӨӨРИЙН зарласан инвариант |
| G-13 | Схем · талбар · enum утга УСТААГҮЙ | Жинхэнэ арагш эвдэх өөрчлөлт |
| G-14 | Хүсэлтийн бие дээр заавал талбар нэмэгдвэл нүүлгэх зам зарлагдсан байх | Энэ л нь minor bump-ыг зөвтгөдөг цорын ганц үндэслэл |

⚠ Хаалга нь **гэрээг** шалгана, хэрэгжүүлэлтийг БИШ. Гэрээ ба кодын зөрүүг
`web-app/tests/unit/contract-parity.test.ts` (схем) ба `server/tests/contract/contract.test.ts`
(зан төлөв) барина — тэдгээр нь хэрэгжүүлэлтийн шатанд PERSONAL-2-ийн гэрээ рүү
шилжинэ (T-575 · T-586).

---

## 9. Мэдэгдэж буй зөрүү ба нээлттэй цэг

- **`rec()` нь түлхүүрийн багцыг шалгадаггүй** (`lld.md §4.2` · `Δ-5`). `shared/validate`-ийн
  DSL нь `minProperties` · `propertyNames`-ийг илэрхийлж чадахгүй тул `mastery` (яг 7
  түлхүүр) ба `reputation` (яг 4) -ийн тооны хязгаар нь **гэрээнд байгаа, DSL-д алга**.
  Энэ зөрүү нь `contract-parity.test.ts`-ийн ИЛ жагсаалтад бүртгэгдэнэ — чимээгүй өнгөрөхгүй.
  Дуурайлт нь харин гэрээний дагуу шалгана: буруу түлхүүрийн тоо → 400.
- **`H-1′`** — `masteryPoints` скаляр уу, track тутам уу. Гэрээнд **скаляр** (`integer`).
  Track тутам болговол `GameState.masteryPoints` нь `map<SkillTag, integer>` болж
  **эвдэх** өөрчлөлт болно → 2.0.0.
- **`H-7`** — `GUILD_IDS`-ийн эцсийн нэрс. Гэрээ нь тоог (4) бэхэлсэн, нэрсийг БИШ:
  `reputation` нь `minProperties: 4 · maxProperties: 4`. Нэр нь контентын шатны шийдвэр
  (T-570) бөгөөд гэрээг өөрчлөхгүй.
- **PERSONAL-1-ийн баримтын толгой** нь `contracts/openapi.yaml` ба `cd contracts && npm run docs`
  гэсэн БАЙХГҮЙ замыг заасан байсан (тэр хавтас репод хэзээ ч commit хийгдээгүй).
  PERSONAL-2-ийн үүсгэгч нь `server/tools/` дотор ажиллаж байгаа тул энэ файлын толгойд
  бичигдсэн команд нь ажилладаг. PERSONAL-1-ийн толгойг мөн залруулав.

## Эндпойнтын жагсаалт

| Method | Зам | operationId | Tag | Auth | Тайлбар |
|---|---|---|---|---|---|
| `GET` | `/health` | [`getHealth`](#gethealth) | ops | нээлттэй | Сервисийн эрүүл мэнд (AC BE-9, BE-15) |
| `POST` | `/players` | [`createPlayer`](#createplayer) | players | нээлттэй | Нэргүй тоглогч үүсгэх (AC BE-2, OFF-5) |
| `GET` | `/players/{playerId}/save` | [`getSave`](#getsave) | saves | token | Save унших (AC BE-3, BE-4) |
| `PUT` | `/players/{playerId}/save` | [`putSave`](#putsave) | saves | token | Save бүтнээр бичих (AC BE-3, BE-4, BE-5) |
| `GET` | `/players/{playerId}/save/history` | [`getSaveHistory`](#getsavehistory) | saves | token | Snapshot түүх (AC BE-13) |
| `POST` | `/players/{playerId}/save/restore` | [`restoreSave`](#restoresave) | saves | token | Snapshot-оос сэргээх (AC BE-13) |
| `POST` | `/players/{playerId}/actions` | [`applyActions`](#applyactions) | actions | token | Эрх бүхий домэйн үйлдэл (AC BE-11, BE-12, OFF-7) |
| `POST` | `/players/{playerId}/transfer-code` | [`createTransferCode`](#createtransfercode) | transfer | token | Төхөөрөмж хооронд шилжүүлэх код үүсгэх (AC BE-14) |
| `POST` | `/transfer/redeem` | [`redeemTransferCode`](#redeemtransfercode) | transfer | нээлттэй | Шилжүүлэх код ашиглах (AC BE-14) |
| `GET` | `/content/pack` | [`getContentPack`](#getcontentpack) | content | нээлттэй | Контент пакет (AC BE-6, BE-15, QX-4) |

## Үйлдлүүд

### `GET /health` — `getHealth`

Сервисийн эрүүл мэнд (AC BE-9, BE-15) · **auth:** нээлттэй

Контент пакет асах үедээ `shared/validate`-ээр шалгагдана. Хүчингүй бол сервис degraded — `/content/pack` мөн 503 буцаана (AC BE-15). v1.2.0: шалгалт нь шинэ `guilds` · `chains` · `cosmetics` хэсгийг МӨН хамарна; `unlockSource` нь өнчин лавлагаатай бол пакет хүчингүй (AC COS-2).

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`HealthOk`](#healthok) | Эрүүл |
| `503` | [`HealthDegraded`](#healthdegraded) | Контент хүчингүй — degraded (AC BE-15) |

```bash
curl -i -X GET http://127.0.0.1:4010/api/health
```

### `POST /players` — `createPlayer`

Нэргүй тоглогч үүсгэх (AC BE-2, OFF-5) · **auth:** нээлттэй

PII хадгалахгүй. Token нь дахин олгогдохгүй — клиент localStorage-д хадгална. Сервер талд token нь зөвхөн hash хэлбэрээр хадгалагдана. Rate limit: глобал 30/мин (AC BE-17; IP хадгалахгүй тул IP-д тулгуурлахгүй). v1.2.0-д ӨӨРЧЛӨГДӨӨГҮЙ — шинэ систем ямар ч хувийн мэдээлэл шаардахгүй (AC OFF-5).

| Статус | Бие | Тайлбар |
|---|---|---|
| `201` | [`PlayerCredentials`](#playercredentials) | Үүссэн |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

**Хариуны header:** `Retry-After`

```bash
curl -i -X POST http://127.0.0.1:4010/api/players
```

### `GET /players/{playerId}/save` — `getSave`

Save унших (AC BE-3, BE-4) · **auth:** token

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SavePayload`](#savepayload) | Save олдов |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

**Хариуны header:** `ETag` · `Retry-After`

```bash
curl -i -X GET http://127.0.0.1:4010/api/players/00000000-0000-4000-8000-000000000000/save \
  -H 'Authorization: Bearer mock-token'
```

### `PUT /players/{playerId}/save` — `putSave`

Save бүтнээр бичих (AC BE-3, BE-4, BE-5) · **auth:** token

Хэрэглээ нь ил хязгаарлагдсан (PERSONAL-1 plan.md P-9): зөвхөн (а) офлайн үйлдлийн дараалал алдагдсаны дараах бүтэн эвлэрүүлэг, (б) import хийсэн төлвийг серверт тавих. Ердийн тоглолтын бичилт нь `POST /players/{playerId}/actions`. Амжилттай бичилт бүр өмнөх төлвийг snapshot болгоно (AC BE-13). ⚠ v1.2.0: `schemaVersion` нь 2. Сервер v1 биетэй хүсэлтийг ХҮЛЭЭН АВНА — `shared/save`-ийн `MIGRATIONS[2]`-оор дээшлүүлж хадгална (AC SVX-1, SVX-3). Ирээдүйн (`> CURRENT_SCHEMA_VERSION`) хувилбар нь 400 `INVALID_INPUT`.

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |
| `If-Match` | header | тийм | string | Сүүлд уншсан ETag. Анхны бичилтэд `*`. |

**Хүсэлтийн бие** (`application/json`, заавал): [`SavePayload`](#savepayload)

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SaveAck`](#saveack) | Хадгалагдав |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `409` | [`Problem`](#problem) | ETag хуучирсан — өөр бичилт түрүүлсэн (AC BE-3) |
| `413` | [`Problem`](#problem) | Бие 1MB-аас том (AC BE-5) |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

**Хариуны header:** `ETag` · `Retry-After`

```bash
curl -i -X PUT http://127.0.0.1:4010/api/players/00000000-0000-4000-8000-000000000000/save \
  -H 'Authorization: Bearer mock-token' \
  -H 'If-Match: *' \
  -H 'Content-Type: application/json' \
  -d '{"schemaVersion":2,"updatedAt":"2026-09-16T09:00:00Z","state":{"schemaVersion":2,"xp":140,"level":2,"stamina":7,"maxStamina":10,"coins":60,"skillPoints":1,"combo":2,"streak":{"current":3,"best":5,"lastQualifiedDate":"2026-09-14"},"completedMainQuestIds":["mq-first-cut","mq-blender-toybox"],"sideQuestStats":{"sq-hotkey-hunter":{"completions":2,"lastCompletedAt":"2026-09-14T19:12:00Z"}},"completedDungeonIds":["dg-timeline-basics"],"unlockedSkillIds":["sk-precision-cut"],"inventory":["loot-golden-razor"],"achievementIds":["ach-first-blood"],"bossAttempts":[],"dailyMission":{"questId":"sq-three-cut-story","date":"2026-09-15"},"projects":[],"settings":{"reducedMotion":false,"soundEnabled":true,"colorBlindSafe":false,"soundVolume":1},"mastery":{"video-editing":{"tag":"video-editing","xp":140,"level":2,"prestigeCount":0},"blender":{"tag":"blender","xp":0,"level":1,"prestigeCount":0},"animation":{"tag":"animation","xp":0,"level":1,"prestigeCount":0},"cinematography":{"tag":"cinematography","xp":0,"level":1,"prestigeCount":0},"audio":{"tag":"audio","xp":0,"level":1,"prestigeCount":0},"vfx":{"tag":"vfx","xp":0,"level":1,"prestigeCount":0},"storytelling":{"tag":"storytelling","xp":60,"level":1,"prestigeCount":0}},"masteryPoints":1,"reputation":{"guild-cut":5,"guild-form":0,"guild-frame":0,"guild-signal":2},"replayLog":[],"campLayout":{"slots":{"avatarFrame":null,"campBanner":null,"title":"cos-title-first-blood","campDecoration":null,"uiAccent":null,"badgeFrame":null}},"completedChainIds":[],"respecAt":null,"dungeonStats":{"dg-timeline-basics":{"lastPassedDate":"2026-09-02"}}}}'
```

### `GET /players/{playerId}/save/history` — `getSaveHistory`

Snapshot түүх (AC BE-13) · **auth:** token

Хамгийн сүүлийн 10 snapshot, шинэ нь эхэнд. Агуулга буцаахгүй — зөвхөн лавлагаа.

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SaveHistory`](#savehistory) | Түүх |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

**Хариуны header:** `Retry-After`

```bash
curl -i -X GET http://127.0.0.1:4010/api/players/00000000-0000-4000-8000-000000000000/save/history \
  -H 'Authorization: Bearer mock-token'
```

### `POST /players/{playerId}/save/restore` — `restoreSave`

Snapshot-оос сэргээх (AC BE-13) · **auth:** token

Сэргээлт өөрөө шинэ snapshot үүсгэнэ (`reason: restore`) — сэргээсэн үйлдэл эргүүлэн буцаагдах боломжтой байх ёстой. ⚠ v1 snapshot сэргээхэд `MIGRATIONS[2]` ажиллаж v2 болж буцна (AC SVX-1).

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

**Хүсэлтийн бие** (`application/json`, заавал): [`RestoreRequest`](#restorerequest)

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SavePayload`](#savepayload) | Сэргээгдэв |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

**Хариуны header:** `ETag` · `Retry-After`

```bash
curl -i -X POST http://127.0.0.1:4010/api/players/00000000-0000-4000-8000-000000000000/save/restore \
  -H 'Authorization: Bearer mock-token' \
  -H 'Content-Type: application/json' \
  -d '{"snapshotId":"6f2a1c94-3d8e-4b7a-9f10-2c5de7b8a041"}'
```

### `POST /players/{playerId}/actions` — `applyActions`

Эрх бүхий домэйн үйлдэл (AC BE-11, BE-12, OFF-7) · **auth:** token

Үйлдлийн массивыг `shared/core`-оор ДАРААЛАН хэрэгжүүлнэ. **Атом**: нэг үйлдэл домэйнээр татгалзвал бүх багц буцаагдаж 422 гарна, хадгалагдсан төлөв ӨӨРЧЛӨГДӨХГҮЙ. Idempotency: `actionId` тус бүрээр бүртгэгдэнэ; өмнө хэрэгжсэн `actionId` дахин ирвэл домэйн ДАХИН ажиллахгүй (`status: replayed`), анхны event-үүд буцна. `If-Match` нь сонголттой — өгвөл хуучирсан ETag → 409 (клиент эхлээд GET хийнэ). v1.2.0-д гурван шинэ `type` дэмжигдэнэ (`prestigeMastery` · `respecTree` · `setCampLayout`) ба `bossAttempt` · `updateSettings` хоёрын payload өргөжив. ⚠ Хуучин клиентийн дараалалд хадгалагдсан `bossAttempt` (`difficulty`-гүй) нь хожим ирэхэд ЭВДЭРЭХГҮЙ — байхгүй бол `standard` (AC BE-13-ийн replay зарчим).

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |
| `If-Match` | header | үгүй | string | Өгвөл хуучирсан ETag → 409. |

**Хүсэлтийн бие** (`application/json`, заавал): [`ActionBatchRequest`](#actionbatchrequest)

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`ActionBatchResponse`](#actionbatchresponse) | Багц хэрэгжив (эсвэл бүхэлдээ replayed) |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `409` | [`Problem`](#problem) | ETag хуучирсан — өөр бичилт түрүүлсэн (AC BE-3) |
| `413` | [`Problem`](#problem) | Бие 1MB-аас том (AC BE-5) |
| `422` | [`Problem`](#problem) | Домэйн үйлдлийг татгалзав (AC BE-11). `code` нь `RejectionReason`, `actionId` нь татгалзсан үйлдлийг заана. Багц бүхэлдээ буцаагдсан. v1.2.0: `RESPEC_ON_COOLDOWN` мөн энэ замаар гарна (AC SKL-3). |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |
| `503` | [`Problem`](#problem) | Контент хүчингүй — сервис degraded (AC BE-15) |

**Хариуны header:** `ETag` · `Retry-After`

```bash
curl -i -X POST http://127.0.0.1:4010/api/players/00000000-0000-4000-8000-000000000000/actions \
  -H 'Authorization: Bearer mock-token' \
  -H 'Content-Type: application/json' \
  -d '{"actions":[{"actionId":"6f2a1c94-3d8e-4b7a-9f10-2c5de7b8a041","type":"claimQuest","at":"2026-09-16T09:00:00Z","payload":{}}]}'
```

### `POST /players/{playerId}/transfer-code` — `createTransferCode`

Төхөөрөмж хооронд шилжүүлэх код үүсгэх (AC BE-14) · **auth:** token

TTL 15 минут, криптографийн санамсаргүй. Код нь сервер талд зөвхөн hash хэлбэрээр хадгалагдана. Хариунд save-ийн агуулга ОРОХГҮЙ. Шинэ код үүсгэвэл өмнөх идэвхтэй код хүчингүй болно (нэг тоглогчид нэг идэвхтэй код).

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `201` | [`TransferCode`](#transfercode) | Код үүсэв |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

**Хариуны header:** `Retry-After`

```bash
curl -i -X POST http://127.0.0.1:4010/api/players/00000000-0000-4000-8000-000000000000/transfer-code \
  -H 'Authorization: Bearer mock-token'
```

### `POST /transfer/redeem` — `redeemTransferCode`

Шилжүүлэх код ашиглах (AC BE-14) · **auth:** нээлттэй

Код **нэг удаа**. Амжилттай бол ШИНЭ `{playerId, token}` олгож, эх тоглогчийн save-ийн хуулбарыг шинэ тоглогчид үүсгэнэ. Эх тоглогчийн save хэвээр үлдэнэ. Ашигласан · хугацаа дууссан · олдоогүй — бүгд **410** (кодын оршин тогтнолыг задруулахгүйн тулд ялгаагүй хариу).

**Хүсэлтийн бие** (`application/json`, заавал): [`RedeemRequest`](#redeemrequest)

| Статус | Бие | Тайлбар |
|---|---|---|
| `201` | [`PlayerCredentials`](#playercredentials) | Шинэ тоглогч үүсэж save хуулагдав |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `410` | [`Problem`](#problem) | Код ашиглагдсан · хугацаа дууссан · олдсонгүй (AC BE-14) |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

**Хариуны header:** `Retry-After`

```bash
curl -i -X POST http://127.0.0.1:4010/api/transfer/redeem \
  -H 'Content-Type: application/json' \
  -d '{"code":"sample"}'
```

### `GET /content/pack` — `getContentPack`

Контент пакет (AC BE-6, BE-15, QX-4) · **auth:** нээлттэй

⚠ Хариу < 2MB (AC QX-4) — `cosmetics` (≥60), `guilds` (4), `chains` (≥3) нэмэгдсэн ч төсөв хэвээр. Хэмжээг `server/tests` бодит пакет дээр хэмжинэ.

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `If-None-Match` | header | үгүй | string |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`ContentPack`](#contentpack) | Пакет |
| `304` | — | Өөрчлөгдөөгүй |
| `503` | [`Problem`](#problem) | Контент хүчингүй — сервис degraded (AC BE-15) |

**Хариуны header:** `ETag` · `Cache-Control`

```bash
curl -i -X GET http://127.0.0.1:4010/api/content/pack
```

## Дахин ашиглагдах хариунууд

| Нэр | Бие | Тайлбар |
|---|---|---|
| `BadRequest` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `Unauthorized` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `Forbidden` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `NotFound` | [`Problem`](#problem) | Олдсонгүй |
| `Conflict` | [`Problem`](#problem) | ETag хуучирсан — өөр бичилт түрүүлсэн (AC BE-3) |
| `Gone` | [`Problem`](#problem) | Код ашиглагдсан · хугацаа дууссан · олдсонгүй (AC BE-14) |
| `PayloadTooLarge` | [`Problem`](#problem) | Бие 1MB-аас том (AC BE-5) |
| `DomainRejected` | [`Problem`](#problem) | Домэйн үйлдлийг татгалзав (AC BE-11). `code` нь `RejectionReason`, `actionId` нь татгалзсан үйлдлийг заана. Багц бүхэлдээ буцаагдсан. v1.2.0: `RESPEC_ON_COOLDOWN` мөн энэ замаар гарна (AC SKL-3). |
| `TooManyRequests` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |
| `Degraded` | [`Problem`](#problem) | Контент хүчингүй — сервис degraded (AC BE-15) |

## Схемүүд

### Problem

RFC 9457 problem details. Бүх 4xx/5xx хариу ЭНЭ хэлбэртэй (AC BE-16).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `type` | string | тийм | default="about:blank" |  |
| `title` | string | тийм | — |  |
| `status` | integer | тийм | minimum=400, maximum=599 |  |
| `detail` | string | үгүй | — |  |
| `instance` | string | үгүй | — |  |
| `code` | string | үгүй | — | Машин уншигдах код. Домэйн татгалзалд `RejectionReason`-ы утга. |
| `actionId` | string(uuid) | үгүй | — | 422 үед — татгалзсан үйлдлийн id (AC BE-11) |
| `errors` | object[] | үгүй | — | 400 үед — талбарын түвшний алдаа (AC BE-5) |

### RejectionReason

Домэйн үйлдэл татгалзах шалтгаан (PERSONAL-1 spec.md D-4 + PERSONAL-2 spec.md D-5). ⚠ v1.2.0-д ЯГ НЭГ утга нэмэгдэв. Бусад бүх шинэ татгалзал одоогийн 7 кодод багтана — шинэ код нэмэх нь СПЕКИЙН өөрчлөлт (plan.md §13.3).

`INSUFFICIENT_STAMINA` · `PREREQ_NOT_MET` · `LEVEL_TOO_LOW` · `ALREADY_COMPLETED` · `NOT_REPEATABLE` · `INSUFFICIENT_SKILL_POINTS` · `INVALID_INPUT` · `RESPEC_ON_COOLDOWN`

### HealthOk

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `status` | const "ok" | тийм | — |  |
| `version` | string | тийм | — | Серверийн хувилбар |
| `contentVersion` | string | тийм | — | Контент пакетын тогтвортой hash — `/content/pack`-ийн ETag-тай ижил утга. |

```json
{
  "status": "ok",
  "version": "1.2.0",
  "contentVersion": "c3f1a9"
}
```

### HealthDegraded

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `status` | const "degraded" | тийм | — |  |
| `version` | string | тийм | — |  |
| `reason` | string | тийм | — | Хүний уншихад зориулсан шалтгаан. Контентын түүхий агуулга ОРОХГҮЙ. |

### PlayerCredentials

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `playerId` | string(uuid) | тийм | — |  |
| `token` | string | тийм | minLength=43 | 32 байт санамсаргүй, base64url. Сервер талд зөвхөн hash хадгална. |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

```json
{
  "playerId": "6f2a1c94-3d8e-4b7a-9f10-2c5de7b8a041",
  "token": "9Qe1xM7bK2pR4tY6uI8oA0sD3fG5hJ7kL9zX1cV3bN5m"
}
```

### SavePayload

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `schemaVersion` | integer | тийм | minimum=1 |  |
| `updatedAt` | string(date-time) | тийм | — |  |
| `state` | [`GameState`](#gamestate) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SaveAck

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `updatedAt` | string(date-time) | тийм | — |  |
| `etag` | string | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### RestoreRequest

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `snapshotId` | string(uuid) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SnapshotRef

Snapshot-ийн лавлагаа. Төлвийн агуулга ОРОХГҮЙ (AC BE-13).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `snapshotId` | string(uuid) | тийм | — |  |
| `createdAt` | string(date-time) | тийм | — |  |
| `schemaVersion` | integer | тийм | minimum=1 |  |
| `reason` | enum(put \| actions \| restore) | тийм | — | Snapshot үүсгэсэн шалтгаан. |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SaveHistory

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `snapshots` | [`SnapshotRef`](#snapshotref)[] | тийм | maxItems=10 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionType

Домэйн үйлдлийн төрөл. `shared/core`-ийн нэг функцтэй нэг-нэгээр харгалзана (lld.md §5.4). Энэ жагсаалт нь `GameState`-ийн БҮХ бичигдэх талбарыг хамарна — хамаарахгүй талбар үлдвэл тэр талбар серверээр эрх бүхий болж чадахгүй. ⚠ v1.2.0-д ЯГ ГУРАВ нэмэгдэв (plan.md P-7). Mastery XP · reputation · chain bonus нь ШИНЭ action БИШ — `claimQuest` · `dungeonAttempt` · `bossAttempt`-ийн ДОТООД үр дагавар (lld.md §5.5).

`claimQuest` · `rest` · `unlockSkill` · `dungeonAttempt` · `projectCreate` · `projectMilestone` · `projectUpdate` · `bossAttempt` · `rollDailyMission` · `resolveEncounter` · `updateSettings` · `prestigeMastery` · `respecTree` · `setCampLayout`

### Action

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `actionId` | string(uuid) | тийм | — | Клиент үүсгэсэн UUIDv4. Idempotency түлхүүр (AC BE-12). |
| `type` | [`ActionType`](#actiontype) | тийм | — |  |
| `at` | string(date-time) | тийм | — | Клиент дээрх үйлдлийн цаг. Домэйнд `clock`-ийн оронд дамжина (plan.md P-5). Сервер нь ирээдүйд 5 минутаас илүү хазайсан цагийг татгалзана (INVALID_INPUT). ⚠ `respecTree` (7 өдөр) ба refresher (14 өдөр) нь ЭНЭ талбараас `daysBetween` тооцно — `Date.now()` домэйнд хоригтой (AC QX-7 · plan.md P-18). |
| `seed` | integer | үгүй | minimum=0 | RNG seed (loot, encounter). Байхгүй бол сервер үүсгэнэ (AC EC-2, ENC-2). |
| `payload` | object | тийм | — | Төрлөөс хамаарсан бие. Сервер нь `type`-аар нь салгаж `shared/validate`-ийн харгалзах validator-оор шалгана (lld.md §6.5 хүснэгт). ⚠ Энэ талбар нь ЗОРИУД нээлттэй объект — `oneOf` дискриминатор нэмэх нь v1.1.0-ийн клиентүүдийг эвдэнэ. v1.2.0-ийн шинэ/өргөтгөсөн 5 payload-ийн БАРИМТЖУУЛСАН хэлбэр нь доорх ТАВАН схем — тэдгээр нь `shared/validate/index.ts → validateActionPayload`-ийн гэрээ: `ActionPayloadPrestigeMastery` (prestigeMastery) · `ActionPayloadRespecTree` (respecTree) · `ActionPayloadSetCampLayout` (setCampLayout) · `ActionPayloadUpdateSettings` (updateSettings) · `ActionPayloadBossAttempt` (bossAttempt). ⚠ Эдгээрийг `$ref`-ээр ЗААГААГҮЙ нь ЗОРИУД — `payload` нээлттэй хэвээр үлдэх ёстой. Нийтлэлийн хаалга (G-4) тэднийг НЭРЭЭР нь хайж олно. |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionPayloadPrestigeMastery

`type: prestigeMastery` (AC MST-3). Татгалзал: `INVALID_INPUT` (танихгүй tag) · `PREREQ_NOT_MET` (track level ≠ 10).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `tag` | [`SkillTag`](#skilltag) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionPayloadRespecTree

`type: respecTree` (AC SKL-3). Татгалзал: `INVALID_INPUT` (танихгүй track) · `RESPEC_ON_COOLDOWN` (сүүлийн respec-ээс < 7 тоглоомын өдөр) · `PREREQ_NOT_MET` (тухайн модонд нээгдсэн node байхгүй).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `track` | [`SkillTag`](#skilltag) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionPayloadSetCampLayout

`type: setCampLayout` (AC COS-4). Татгалзал: `INVALID_INPUT` (танихгүй slot/id) · `PREREQ_NOT_MET` (нээгдээгүй cosmetic зүүх оролдлого). ⚠ `slots` нь ЯГ 6 түлхүүртэй БҮТЭН объект — хэсэгчилсэн засвар БАЙХГҮЙ (plan.md P-25).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `slots` | [`CampLayoutSlots`](#camplayoutslots) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionPayloadUpdateSettings

`type: updateSettings` (AC VIS-3, FX-3). БҮХ талбар сонголттой — ирсэн талбар л солигдоно (plan.md P-6). Шинэ action нэмэхийн оронд payload өргөжив.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `reducedMotion` | boolean | үгүй | — |  |
| `soundEnabled` | boolean | үгүй | — |  |
| `colorBlindSafe` | boolean | үгүй | — |  |
| `soundVolume` | number | үгүй | minimum=0, maximum=1 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionPayloadBossAttempt

`type: bossAttempt` (AC BSX-2…BSX-6). `difficulty` нь СОНГОЛТТОЙ — байхгүй бол `standard`. Энэ нь v1.1.0-ийн офлайн дараалалд хадгалагдсан үйлдлийг эвдэхгүй.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `bossId` | string | тийм | — |  |
| `scores` | [`BossScores`](#bossscores) | тийм | — |  |
| `difficulty` | [`DifficultyTier`](#difficultytier) | үгүй | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionBatchRequest

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `actions` | [`Action`](#action)[] | тийм | minItems=1, maxItems=50 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### DomainEventType

Домэйн функцийн гаргах event-ийн төрөл. ⚠ v1.2.0-д ЯГ ДӨРӨВ нэмэгдэв (plan.md P-8). `FX-1`-ийн «бүртгэлийн бүрэн байдал» тест нь эдгээрийн 12-ыг (`fx.ts`) хамарна.

`XP_GAINED` · `LEVEL_UP` · `SKILL_POINT_GAINED` · `SKILL_UNLOCKED` · `STAMINA_SPENT` · `STAMINA_RESTORED` · `QUEST_COMPLETED` · `SIDE_QUEST_COMPLETED` · `DUNGEON_PASSED` · `DUNGEON_FAILED` · `COINS_GAINED` · `LOOT_DROPPED` · `ACHIEVEMENT_UNLOCKED` · `STREAK_EXTENDED` · `STREAK_RESET` · `COMBO_CHANGED` · `PROJECT_CREATED` · `PROJECT_MILESTONE_COMPLETED` · `PROJECT_COMPLETED` · `BOSS_ATTEMPT_LOGGED` · `BOSS_PASSED` · `ENCOUNTER_TRIGGERED` · `DAILY_MISSION_ROLLED` · `SETTINGS_UPDATED` · `MASTERY_LEVEL_UP` · `MASTERY_PRESTIGED` · `REPUTATION_GAINED` · `CHAIN_COMPLETED`

### DomainEvent

Домэйн функцийн гаргасан event (spec.md D-2). UI нь эдгээрээр feedback үзүүлнэ. ⚠ `data`-гийн хэлбэр нь event тутамд ТОГТМОЛ (lld.md §5.6) — `fx.ts` нь `aria-live` текстээ ЭНДЭЭС бүрдүүлдэг тул талбар хасах нь UI-г ЧИМЭЭГҮЙ хоослоно.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `type` | [`DomainEventType`](#domaineventtype) | тийм | — |  |
| `data` | object | үгүй | — | Event-ээс хамаарсан нэмэлт. v1.2.0-ийн 4 шинэ event: `MASTERY_LEVEL_UP {tag, level, masteryPoints}` · `MASTERY_PRESTIGED {tag, prestigeCount}` · `REPUTATION_GAINED {guildId, amount, total, rank}` · `CHAIN_COMPLETED {chainId, bonusXp}`. `BOSS_ATTEMPT_LOGGED`-д `difficulty` нэмэгдэв. |

### ActionResult

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `actionId` | string(uuid) | тийм | — |  |
| `status` | enum(applied \| replayed) | тийм | — | `replayed` = энэ `actionId` өмнө нь хэрэгжсэн; домэйн ДАХИН ажиллаагүй, анхны event-үүд буцсан (AC BE-12). |
| `events` | [`DomainEvent`](#domainevent)[] | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionBatchResponse

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `state` | [`GameState`](#gamestate) | тийм | — | Хэрэгжүүлсний ДАРААХ эрх бүхий төлөв. Клиент үүгээр локал төлвийг СОЛИНО. |
| `results` | [`ActionResult`](#actionresult)[] | тийм | — |  |
| `updatedAt` | string(date-time) | тийм | — |  |
| `etag` | string | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### TransferCodeString

Crockford base32, 4-4-4 бүлэг (ж. `K7QM-2X4T-9BRH`). Том/жижиг үсэг ба зураас үл хамаарна; `I·L·O·U` тэмдэгт байхгүй (уншилтын алдаанаас сэргийлнэ).

### TransferCode

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `code` | [`TransferCodeString`](#transfercodestring) | тийм | — |  |
| `expiresAt` | string(date-time) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### RedeemRequest

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `code` | [`TransferCodeString`](#transfercodestring) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SkillTag

Сурах домэйны шошго. ⚠ v1.1.0-д `QuestDefinition.tags`-д INLINE байсан; утга ӨӨРЧЛӨГДӨӨГҮЙ, зөвхөн нэрлэгдэв. Mastery track нь эдгээртэй 1:1 (spec.md A3).

`video-editing` · `blender` · `animation` · `cinematography` · `audio` · `vfx` · `storytelling`

### Rarity

Ховордолт. ⚠ v1.1.0-д `LootItem.rarity`-д INLINE байсан; утга ӨӨРЧЛӨГДӨӨГҮЙ. `CosmeticItem` МӨН энэ enum-ыг ашиглана — шинэ enum нэмэгдээгүй (plan.md §11.2).

`common` · `rare` · `epic` · `legendary`

### DifficultyTier

Boss оролдлогын хүндрэл (AC BSX-2). **Оролдлого тутамд**, тоглогчид БИШ — нэг тоглогч standard ба hard-ыг сольж оролдож болно. Hard mode-ын босго нь `ceil(bossTiers[t] × hardModeMultiplier)` = 41 · 52 · 60.

`standard` · `hard`

### CosmeticSlot

Cosmetic-ийн байрлах 6 үүр (AC COS-1). `campLayout` нь ЯГ эдгээр түлхүүртэй.

`avatarFrame` · `campBanner` · `title` · `campDecoration` · `uiAccent` · `badgeFrame`

### MasteryTrack

`SkillTag` тутмын бие даасан прогрессийн тэнхлэг (AC MST-1). Түвшин нь `ProgressionConstants.xpThresholds` ИЖИЛ хүснэгтээр тооцогдоно — өөр босго БАЙХГҮЙ. ⚠ AC MST-5 · spec.md D-6: mastery нь XP · stamina · coin · loot · quest/dungeon-ийн нээлтэд НӨЛӨӨЛӨХГҮЙ. Цорын ганц үл хамаарах зүйл — tier-2/tier-3 skill node-ийн нээлт (AC SKL-2).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `tag` | [`SkillTag`](#skilltag) | тийм | — |  |
| `xp` | integer | тийм | minimum=0 | Тухайн track-д хуримтлагдсан XP. Prestige хийхэд 0 болно. |
| `level` | integer | тийм | minimum=1, maximum=10 |  |
| `prestigeCount` | integer | тийм | minimum=0 | ⚠ ХЭЗЭЭ Ч БУУРАХГҮЙ (AC MST-3). |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ReplayLogEntry

Тоглолтын түүхийн нэг мөр (AC BSX-6, SVX-2). Зөвхөн НЭМЭГДЭНЭ. ⚠ `kind` нь 5 утгатай ч энэ хувилбарт ЗӨВХӨН `boss` бичигдэнэ (plan.md P-24) — үлдсэн утгууд нь схем эвдэлгүйгээр хожим дүүргэгдэх зай (AAA-SPEC §4.16). ⚠ spec.md D-6: replayLog нь ямар ч нээлт, XP, оноонд НӨЛӨӨЛӨХГҮЙ.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `at` | string(date-time) | тийм | — |  |
| `kind` | enum(quest \| sideQuest \| dungeon \| boss \| chain) | тийм | — |  |
| `refId` | string | тийм | — | Контентын id (boss id |
| `outcome` | enum(passed \| failed) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### CampLayoutSlots

ЯГ 6 түлхүүр — бүгд ЗААВАЛ (plan.md P-25). `null` = үүр хоосон. Утга нь `ContentPack.cosmetics`-д БАЙГАА бөгөөд тоглогчид НЭЭГДСЭН id байх ёстой (эс бөгөөс `setCampLayout` нь `PREREQ_NOT_MET`).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `avatarFrame` | string \| null | тийм | — |  |
| `campBanner` | string \| null | тийм | — |  |
| `title` | string \| null | тийм | — |  |
| `campDecoration` | string \| null | тийм | — |  |
| `uiAccent` | string \| null | тийм | — |  |
| `badgeFrame` | string \| null | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### CampLayout

Цэвэр UI төлөв (AC COS-4). ⚠ Домэйн дүрэм ЭНЭ талбарыг УНШИХГҮЙ (spec.md D-6) — устгаад дахин ачаалахад level · XP · inventory · mastery · rep ӨӨРЧЛӨГДӨХГҮЙ.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `slots` | [`CampLayoutSlots`](#camplayoutslots) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### BossAttempt

AC BS-4 — оролдлогын түүх (тэнцсэн эсэхээс үл хамааран бүгд). ⚠ v1.2.0: `difficulty` ЗААВАЛ. Migration нь одоо байгаа бүх бичлэгт `standard` бичнэ. Хувийн дээд амжилт (AC BSX-3) нь `(bossId, difficulty)` бүлгийн `total`-ийн max — ТУСДАА `personalBests` талбар БАЙХГҮЙ (plan.md P-2).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `bossId` | string | тийм | — |  |
| `at` | string(date-time) | тийм | — |  |
| `scores` | [`BossScores`](#bossscores) | тийм | — |  |
| `total` | integer | тийм | minimum=0, maximum=60 |  |
| `tier` | enum(failed \| mvp \| advanced \| mastery) | тийм | — |  |
| `difficulty` | [`DifficultyTier`](#difficultytier) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### GameState

Домэйн төлвийн бүрэн хэлбэр. Export/import файлын агуулга ч мөн энэ. ⚠ v1.2.0 = `schemaVersion: 2`. v1 → v2 шилжилт нь `shared/save/migrations.ts` `MIGRATIONS[2]` (AC SVX-1) — **хуучин save-ийн тоглоомын утга ХӨНДӨГДӨХГҮЙ**.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `schemaVersion` | integer | тийм | minimum=1 |  |
| `xp` | integer | тийм | minimum=0 |  |
| `level` | integer | тийм | minimum=1, maximum=10 |  |
| `stamina` | integer | тийм | minimum=0 |  |
| `maxStamina` | const 10 | тийм | — |  |
| `coins` | integer | тийм | minimum=0 |  |
| `skillPoints` | integer | тийм | minimum=0 |  |
| `combo` | integer | тийм | minimum=0 | Дараалсан идэвхтэй өдрийн claim-ийн тоолуур. Cosmetic — XP · stamina · unlock-д НӨЛӨӨЛӨХГҮЙ (AC EC-1-ийн зарчим). |
| `streak` | object | тийм | — |  |
| `completedMainQuestIds` | string[] | тийм | uniqueItems |  |
| `sideQuestStats` | map<string, object> | тийм | — | ⚠ v1.2.0-д side quest chain-ийн явц ЭНДЭЭС гаргагдана (plan.md P-21) — `chainProgress` талбар НЭМЭГДЭЭГҮЙ. `lastCompletedAt` нь chain-ийн «чанд дараалал» шалгалтын ЦОРЫН ГАНЦ эх. |
| `completedDungeonIds` | string[] | тийм | uniqueItems |  |
| `unlockedSkillIds` | string[] | тийм | uniqueItems |  |
| `inventory` | string[] | тийм | uniqueItems |  |
| `achievementIds` | string[] | тийм | uniqueItems |  |
| `bossAttempts` | [`BossAttempt`](#bossattempt)[] | тийм | — |  |
| `dailyMission` | object | тийм | — |  |
| `projects` | [`ProjectState`](#projectstate)[] | тийм | — |  |
| `settings` | object | тийм | — |  |
| `mastery` | map<[`SkillTag`](#skilltag), [`MasteryTrack`](#masterytrack)> | тийм | minProperties=7, maxProperties=7, түлхүүр нь enum | AC MST-1 — ЯГ 7 бичлэг, түлхүүр нь `SkillTag`. Migration-ий анхдагч: `xp 0 · level 1 · prestigeCount 0`. |
| `masteryPoints` | integer | тийм | minimum=0 | AC MST-4 — **ҮЛДЭГДЭЛ** (зарцуулаагүй оноо), олдсон НИЙТ БИШ (plan.md P-20). Олдсон нийт нь `Σ_tracks((level − 1) + prestigeCount × 9)`-ээр ГАРГАГДАНА. Инвариант (тест): `masteryPoints + зарцуулсан == олдсон нийт`. |
| `reputation` | map<string, integer> | тийм | minProperties=4, maxProperties=4 | AC RET-5 — guild тутмын нэр хүнд. Түлхүүр нь `GuildDefinition.id` (4 ширхэг). ⚠ ЗӨВХӨН ӨСНӨ: бууралт, зарцуулалт БАЙХГҮЙ. |
| `replayLog` | [`ReplayLogEntry`](#replaylogentry)[] | тийм | maxItems=500 | AC SVX-2 — 500 бичлэгээр ТАСЛАГДАНА (FIFO: хамгийн хуучин нь хасагдана). Бичих ЦОРЫН ГАНЦ зам нь `shared/core/replayLog.ts → appendReplay` (plan.md P-10). |
| `campLayout` | [`CampLayout`](#camplayout) | тийм | — |  |
| `completedChainIds` | string[] | тийм | uniqueItems | AC RET-2 — дууссан chain. ⚠ БАЙНГА үлдэнэ: `bonusXp` дахин олгогдохгүй (давтагдах side quest-ийг дахин дуусгасан ч). |
| `respecAt` | string \| null(date-time) | тийм | — | AC SKL-3 — сүүлийн respec-ийн цаг. ⚠ **ГАНЦ** талбар, мод тутам БИШ (plan.md P-19 · H-6): нэг модыг respec хийхэд БҮХ модны 7 өдрийн cooldown эхэлнэ. `null` = хэзээ ч respec хийгээгүй → зөвшөөрөгдөнө. |
| `dungeonStats` | map<string, object> | тийм | — | AC RET-4 — refresher-ийн нэр дэвшилтэд шаардлагатай ОГНОО (plan.md P-15). `completedDungeonIds` нь огноогүй тул энэ талбар нэмэгдэв. ⚠ `lastPassedDate: null` = refresher-т нэр дэвшихГҮЙ (migration-ий анхдагч — хуучин save-ийн тэнцсэн огноог ЗОХИОХГҮЙ; дараагийн тэнцэлтээс тоологдоно). |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

```json
{
  "schemaVersion": 2,
  "xp": 140,
  "level": 2,
  "stamina": 7,
  "maxStamina": 10,
  "coins": 60,
  "skillPoints": 1,
  "combo": 2,
  "streak": {
    "current": 3,
    "best": 5,
    "lastQualifiedDate": "2026-09-14"
  },
  "completedMainQuestIds": [
    "mq-first-cut",
    "mq-blender-toybox"
  ],
  "sideQuestStats": {
    "sq-hotkey-hunter": {
      "completions": 2,
      "lastCompletedAt": "2026-09-14T19:12:00Z"
    }
  },
  "completedDungeonIds": [
    "dg-timeline-basics"
  ],
  "unlockedSkillIds": [
    "sk-precision-cut"
  ],
  "inventory": [
    "loot-golden-razor"
  ],
  "achievementIds": [
    "ach-first-blood"
  ],
  "bossAttempts": [],
  "dailyMission": {
    "questId": "sq-three-cut-story",
    "date": "2026-09-15"
  },
  "projects": [],
  "settings": {
    "reducedMotion": false,
    "soundEnabled": true,
    "colorBlindSafe": false,
    "soundVolume": 1
  },
  "mastery": {
    "video-editing": {
      "tag": "video-editing",
      "xp": 140,
      "level": 2,
      "prestigeCount": 0
    },
    "blender": {
      "tag": "blender",
      "xp": 0,
      "level": 1,
      "prestigeCount": 0
    },
    "animation": {
      "tag": "animation",
      "xp": 0,
      "level": 1,
      "prestigeCount": 0
    },
    "cinematography": {
      "tag": "cinematography",
      "xp": 0,
      "level": 1,
      "prestigeCount": 0
    },
    "audio": {
      "tag": "audio",
      "xp": 0,
      "level": 1,
      "prestigeCount": 0
    },
    "vfx": {
      "tag": "vfx",
      "xp": 0,
      "level": 1,
      "prestigeCount": 0
    },
    "storytelling": {
      "tag": "storytelling",
      "xp": 60,
      "level": 1,
      "prestigeCount": 0
    }
  },
  "masteryPoints": 1,
  "reputation": {
    "guild-cut": 5,
    "guild-form": 0,
    "guild-frame": 0,
    "guild-signal": 2
  },
  "replayLog": [],
  "campLayout": {
    "slots": {
      "avatarFrame": null,
      "campBanner": null,
      "title": "cos-title-first-blood",
      "campDecoration": null,
      "uiAccent": null,
      "badgeFrame": null
    }
  },
  "completedChainIds": [],
  "respecAt": null,
  "dungeonStats": {
    "dg-timeline-basics": {
      "lastPassedDate": "2026-09-02"
    }
  }
}
```

### BossScores

AC BS-1 — 6 ангилал, тус бүр 0..10. Дээд нийлбэр = 60. ⚠ AC BSX-2-ийн үр дагавар: hard mode-ийн `mastery` босго нь 60 тул 6 ангилал БҮРД 10 оноо шаардана (plan.md §12.2 — томьёоноос гарсан, спекээр батлагдсан).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `story` | integer | тийм | minimum=0, maximum=10 |  |
| `editing` | integer | тийм | minimum=0, maximum=10 |  |
| `camera` | integer | тийм | minimum=0, maximum=10 |  |
| `visualCraft` | integer | тийм | minimum=0, maximum=10 |  |
| `animation` | integer | тийм | minimum=0, maximum=10 |  |
| `audioPost` | integer | тийм | minimum=0, maximum=10 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ProjectState

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1, maxLength=120 |  |
| `createdAt` | string(date-time) | тийм | — |  |
| `completedAt` | string \| null(date-time) | үгүй | — |  |
| `notes` | string | тийм | maxLength=4000 |  |
| `nextAction` | string | тийм | maxLength=500 |  |
| `evidenceRef` | string \| null | үгүй | maxLength=500 |  |
| `selfScore` | integer \| null | үгүй | minimum=0, maximum=10 |  |
| `milestones` | object[] | тийм | minItems=10, maxItems=10 | AC PJ-1 — 10 milestone, яг энэ дарааллаар |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### QuestDefinition

TECH_SPEC §Quest schema + PRD §9-ийн бүх заавал талбар (AC MQ-5)

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `track` | enum(main \| side \| dungeon \| boss \| raid) | тийм | — |  |
| `world` | integer | тийм | minimum=1, maximum=5 |  |
| `levelRequired` | integer | тийм | minimum=1, maximum=10 |  |
| `type` | enum(training \| mission \| boss \| raid \| final) | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `summary` | string | тийм | minLength=1 |  |
| `description` | string | тийм | minLength=1 |  |
| `estimatedMinutes` | integer | тийм | minimum=1 |  |
| `staminaCost` | integer | тийм | minimum=1, maximum=6 |  |
| `xp` | integer | тийм | minimum=1 |  |
| `tags` | [`SkillTag`](#skilltag)[] | тийм | minItems=1, uniqueItems | ⚠ AC MST-2 — гүйцэтгэл бүр ЭНД заасан track БҮРД контентын бүтэн XP олгоно (spec.md A4, хуваахгүй). AC RET-5 — guild rep мөн эндээс зураглагдана. |
| `prerequisites` | string[] | тийм | — |  |
| `tutorialRefs` | [`TutorialRef`](#tutorialref)[] | тийм | — | ⚠ AC OFF-2-ийн ЦОРЫН ГАНЦ зөвшөөрөгдсөн гадаад URL — тоглогч ӨӨРӨӨ дардаг, автоматаар ТАТАГДАХГҮЙ. Сканнердсан тест энэ ялгааг ил шалгана. |
| `deliverables` | string[] | тийм | minItems=1 |  |
| `victoryConditions` | string[] | тийм | minItems=1 |  |
| `stretchGoals` | string[] | тийм | minItems=1 |  |
| `reflectionPrompt` | string | тийм | minLength=1 |  |
| `repeatable` | boolean | тийм | — |  |
| `repeatXpMultiplier` | number | үгүй | maximum=1 | AC SQ-2 — давтан XP коэффициент (default 0.5). ⚠ AC RET-5: guild rep-ийн давталтын бууралт МӨН энэ коэффициентийг ашиглана (plan.md P-16). |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### TutorialRef

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `title` | string | тийм | minLength=1 |  |
| `url` | string(uri) | тийм | — |  |
| `minutes` | integer | тийм | minimum=1 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### DungeonDefinition

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `conceptGoal` | string | тийм | minLength=1 |  |
| `estimatedMinutes` | integer | тийм | minimum=1 |  |
| `xp` | integer | тийм | minimum=1 |  |
| `tags` | [`SkillTag`](#skilltag)[] | тийм | minItems=1 |  |
| `tutorialRefs` | [`TutorialRef`](#tutorialref)[] | тийм | minItems=1, maxItems=3 |  |
| `questions` | object[] | тийм | minItems=1 | AC DG-1, DG-3 — тэнцэх босго нь зөв хариултын ≥70% |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### AchievementDefinition

AC RET-7 — каталог ≥40. Предикат бүр төлвөөс МАШИНААР шалгагдана; нэг удаа олгогдоно.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `description` | string | тийм | minLength=1 |  |
| `predicate` | object | тийм | — | Машинаар шалгагдах нөхцөл (AC ACH-1, RET-7). ⚠ v1.2.0: `kind`-д 5 утга нэмэгдэж, СОНГОЛТТОЙ `ref` орлоо (plan.md P-23). `ref` нь «аль guild / аль boss / аль track» гэдгийг заана; БАЙХГҮЙ бол «дурын нэг» гэсэн утгатай. `value` нь скаляр ХЭВЭЭР. |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### EncounterDefinition

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `body` | string | тийм | minLength=1 |  |
| `callToAction` | string | тийм | minLength=1 |  |
| `maxMinutes` | integer | үгүй | minimum=1, maximum=2 |  |
| `weight` | number | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### LootItem

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `rarity` | [`Rarity`](#rarity) | тийм | — |  |
| `effect` | const "cosmetic" | тийм | — | AC EC-1 — зөвхөн cosmetic |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SkillDefinition

⚠ v1.2.0: `track` · `tier` ЗААВАЛ нэмэгдэв (AC SKL-1). `cost` нь `1` ХЭВЭЭР (AC SKL-5) — өөрчлөгдсөн нь ТӨЛБӨРИЙН ВАЛЮТ, хэмжээ биш: tier 1 → `skillPoints` 1 · tier 2/3 → тухайн `track`-ийн mastery point 1 (plan.md P-3 · хүн шийдэх цэг H-1).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `description` | string | тийм | minLength=1 |  |
| `cost` | const 1 | тийм | — |  |
| `prerequisites` | string[] | тийм | — |  |
| `track` | [`SkillTag`](#skilltag) | тийм | — |  |
| `tier` | integer | тийм | minimum=1, maximum=3 | AC SKL-1 — мод (track) тутамд ≥1 tier-1, ≥1 tier-2, ЯГ 1 tier-3 (capstone). Урьдчилсан нөхцөл нь DAG бөгөөд tier N нь tier N−1-ийг шаардана (алгасахгүй). |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### GuildDefinition

AC RET-5 — ЯГ 4 guild. 7 `SkillTag` бүр ЯГ НЭГ guild-д харгалзана (давхцалгүй, дутуугүй) — `[C]` дүрмээр шалгагдана. ⚠ `placeholder: true` нь AAA-SPEC §8.1-ийн ТҮР нэр (хүний баталгаа хүлээж буй — plan.md H-2). Бүтэц нэрнээс ХАМААРАХГҮЙ.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `tags` | [`SkillTag`](#skilltag)[] | тийм | minItems=1, uniqueItems |  |
| `placeholder` | boolean | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SideQuestChain

AC RET-1 — ЯГ 4 алхам, чанд дараалал (алгасалтгүй). Нэг side quest ХОЁР chain-д орохгүй. ⚠ AC RET-3: `bonusXp ≤` тухайн `world`-ийн main quest-үүдийн ХАМГИЙН БАГА `xp` — тааз нь `world`-оос хамаардаг тул `world` ЗААВАЛ.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `world` | integer | тийм | minimum=1, maximum=5 |  |
| `steps` | string[] | тийм | minItems=4, maxItems=4, uniqueItems | 4 side quest id, ЯГ гүйцэтгэх дарааллаар. |
| `bonusXp` | integer | тийм | minimum=1 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### CosmeticUnlockSource

AC COS-2 — нээлтийн ЭХ СУРВАЛЖ. ⚠ plan.md P-1: cosmetic-ийн «нээгдсэн эсэх» нь ЭНДЭЭС ГАРГАГДАНА — `GameState`-д `unlockedCosmeticIds` талбар БАЙХГҮЙ. ⚠ `kind` нь ЯГ 5 (plan.md P-22). Prestige цол ба streak шагнал нь `kind: achievement`-ээр харгалзах амжилтад заана — шинэ `kind` нэмэгдээгүй.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `kind` | enum(quest \| boss \| achievement \| guildRank \| mastery) | тийм | — |  |
| `refId` | string | тийм | — | `quest` → quest/dungeon id · `boss` → boss id · `achievement` → achievement id · `guildRank` → guild id · `mastery` → `SkillTag`. ⚠ Өнчин лавлагаа (контентод байхгүй id) нь пакетыг ХҮЧИНГҮЙ болгоно. |
| `value` | integer \| string | үгүй | — | `boss` → шаардлагатай tier нэр (`mvp`\|`advanced`\|`mastery`) · `guildRank` → 1..4 · `mastery` → 1..10 · бусад → байхгүй. |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### CosmeticItem

AC COS-1 — каталог ≥60, slot тутамд ≥5. ⚠ `effect` нь `cosmetic` ЗӨВХӨН (AC EC-1 хэвээр): тоглоомын тоон нөлөө БАЙХГҮЙ (spec.md D-6).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `slot` | [`CosmeticSlot`](#cosmeticslot) | тийм | — |  |
| `rarity` | [`Rarity`](#rarity) | тийм | — |  |
| `effect` | const "cosmetic" | тийм | — |  |
| `unlockSource` | [`CosmeticUnlockSource`](#cosmeticunlocksource) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ContentPack

⚠ `minItems` нь СПЕКИЙН тоо — `npm run validate:content` (AC QX-5) ба `[C]` vitest тестүүд НЭГ модулиас (`shared/validate/content-rules.ts`) шалгана (plan.md P-12). Хоёр validator = хоёр үнэн.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `version` | string | тийм | — |  |
| `quests` | [`QuestDefinition`](#questdefinition)[] | тийм | — | AC MQ-1 (main), AC SQ-1 (≥20 side), AC BSX-1 (дэлхий тутамд ЯГ 1 boss = 5) |
| `dungeons` | [`DungeonDefinition`](#dungeondefinition)[] | тийм | — |  |
| `skills` | [`SkillDefinition`](#skilldefinition)[] | тийм | minItems=28 | AC SKL-1 — ≥28 node; track тутамд ≥1 tier-1, ≥1 tier-2, ЯГ 1 tier-3 |
| `achievements` | [`AchievementDefinition`](#achievementdefinition)[] | тийм | minItems=40 | AC RET-7 — ≥40 (v1.1.0-д ≥12 байсан) |
| `encounters` | [`EncounterDefinition`](#encounterdefinition)[] | тийм | minItems=5 |  |
| `loot` | [`LootItem`](#lootitem)[] | тийм | — |  |
| `guilds` | [`GuildDefinition`](#guilddefinition)[] | тийм | minItems=4, maxItems=4 | AC RET-5 — ЯГ 4 |
| `chains` | [`SideQuestChain`](#sidequestchain)[] | тийм | minItems=3 | AC RET-1 — ≥3 |
| `cosmetics` | [`CosmeticItem`](#cosmeticitem)[] | тийм | minItems=60 | AC COS-1 — ≥60 |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ProgressionConstants

Тогтмолууд контрактын хэсэг. `shared/core/constants.ts` нь эдгээрийн ЦОРЫН ГАНЦ TypeScript хувилбар; `web-app/src/**` ба `server/src/**` дотор дахин бичигдвэл `architecture.test.ts` УНАНА (AC BE-10 · QX-7). ⚠ ЭНД БАЙХГҮЙ ба ЯАГААД: `hardBossTiers` нь `ceil(bossTiers[t] × hardModeMultiplier)` = `{mvp: 41, advanced: 52, mastery: 60}` болж ТООЦОГДОНО (AC BSX-2). Гараар бичих нь `bossTiers` өөрчлөгдөхөд чимээгүй салах хоёр дахь эх сурвалж үүсгэнэ.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `xpThresholds` | const [100,250,500,1000,1750,2750,4000,5500,7500] | тийм | minItems=9, maxItems=9 | AC PRG-1. ⚠ AC MST-1 — mastery track-ийн түвшин МӨН ЭНЭ хүснэгтээр тооцогдоно; тусдаа босго БАЙХГҮЙ. |
| `rankNames` | const ["Recruit","Apprentice","Cadet","Editor","Animator","Specialist","Director","Cinematic Artist","Senior Generalist","Cinematic Master"] | тийм | minItems=10, maxItems=10 |  |
| `bossTiers` | object | тийм | — |  |
| `maxStamina` | const 10 | тийм | — | AC STA-1 |
| `restAmount` | const 3 | тийм | — | AC STA-3 |
| `projectMilestoneXp` | const 25 | тийм | — | AC PJ-3 |
| `defaultRepeatXpMultiplier` | const 0.5 | тийм | — | AC SQ-2 |
| `dungeonPassRatio` | const 0.7 | тийм | — | AC DG-3 |
| `sideQuestXpFloorRatio` | const 0.1 | тийм | — | AC SQ-2 — давтан XP-ийн доод шал `ceil(baseXp * 0.1)` |
| `encounterChance` | const 0.25 | тийм | — | AC ENC-2. ⚠ Эх шаардлагад БАЙХГҮЙ, PERSONAL-1 загварын шатны сонголт (PERSONAL-1 lld.md → A-LLD-2). |
| `lootChance` | const 0.35 | тийм | — | AC EC-2. ⚠ PERSONAL-1 lld.md → A-LLD-2. |
| `hardModeMultiplier` | const 1.15 | тийм | — | AC BSX-2 — hard mode босго = `ceil(bossTiers[t] × 1.15)` → 41 · 52 · 60. |
| `masteryMaxLevel` | const 10 | тийм | — | AC MST-1 |
| `masteryPrestigeLevel` | const 10 | тийм | — | AC MST-3 — prestige зөвшөөрөгдөх түвшин. `masteryMaxLevel`-тэй ТЭНЦҮҮ боловч ТУСДАА тогтмол: «дээд түвшин» ба «prestige-ийн босго» нь өөр шийдвэрүүд. |
| `respecCooldownDays` | const 7 | тийм | — | AC SKL-3 |
| `refresherMinDays` | const 14 | тийм | — | AC RET-4 — dungeon refresher-ийн нэр дэвшилтийн доод хугацаа (тоглоомын өдөр). ⚠ plan.md §12.4-д томьёогоор нэрлэгдсэн; энэ гэрээнд тогтмол болж гарав (lld.md A-LLD2-3). |
| `replayLogCap` | const 500 | тийм | — | AC SVX-2 |
| `repThresholds` | const [10,25,50,100] | тийм | minItems=4, maxItems=4 | AC RET-6 — `rankOf(rep)` = хэтрээгүй босгуудын тоо → 0..4 |
| `repBase` | object | тийм | — | AC RET-5 · plan.md P-16 (хүн шийдэх цэг H-5) — `repAward(track, n) = floor(repBase[track] × m^(n−1))`, `m = repeatXpMultiplier ?? 0.5`. Бүх эерэг олголт 1..3-д багтана; grind нь 0-д нийлнэ. |
| `guildCount` | const 4 | тийм | — | AC RET-5 |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

