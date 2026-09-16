<!-- PERSONAL-2 · contract-docs · Дэлгэрэнгүй загвар (Design) · 2026-09-16 -->

# Гэрээний уншигдах хэлбэр — v1.2.0

**Эрх бүхий эх:** [`contracts.yaml`](contracts.yaml) (машин уншигдах).
**Дельтагийн харагдац:** [`lld.html`](lld.html) → «Гэрээний дельта» таб.
**PERSONAL-1-ийн бүрэн баримт:** [`../PERSONAL-1/contract-docs.md`](../PERSONAL-1/contract-docs.md)
— **хэвээр хүчинтэй**; энд заагаагүй бүхэн тэнд.

⚠ Энэ файл нь `contracts.yaml`-ийг **ДАХИН БИЧИХГҮЙ**. Схемийн бүрэн хэлбэрийг зөвхөн
`contracts.yaml`-аас уншина — хоёр дахь бүтэн хуулбар нь чимээгүй салах хоёр дахь үнэн
болно (`plan.md P-12`-ийн зарчим). Энд зөвхөн **хэрэглэгчид (сервер · клиент) юу өөр
болсон** нь бий.

---

## 1. Endpoint-ийн зан төлөвийн өөрчлөлт

Зам, метод, статус код, header **ӨӨРЧЛӨГДӨӨГҮЙ**. Шинэ endpoint БАЙХГҮЙ.

| Endpoint | v1.2.0-д юу өөр |
|---|---|
| `POST /players/{id}/actions` | `type`-д гурван шинэ утга: `prestigeMastery` · `respecTree` · `setCampLayout`. `bossAttempt.payload` нь сонголттой `difficulty` авна; байхгүй бол `standard`. `updateSettings.payload` нь `colorBlindSafe?` · `soundVolume?` авна. Татгалзлын `code`-д `RESPEC_ON_COOLDOWN` нэмэгдэв (422). |
| `PUT /players/{id}/save` | `schemaVersion` нь 2. **v1 бие хүлээн авагдана** — сервер `MIGRATIONS[2]`-оор дээшлүүлж хадгална. `> CURRENT_SCHEMA_VERSION` нь 400 `INVALID_INPUT`. |
| `POST /players/{id}/save/restore` | v1 snapshot сэргээхэд `MIGRATIONS[2]` ажиллаж v2 буцна. |
| `GET /content/pack` | Хариунд `guilds` (4) · `chains` (≥3) · `cosmetics` (≥60) нэмэгдэв. `skills ≥28` · `achievements ≥40` болж чангарав. ETag автоматаар солигдоно (`canonicalJson` hash). |
| `GET /health` | Контентын шалгалт шинэ 3 хэсгийг мөн хамарна; `unlockSource`-ийн өнчин лавлагаа нь пакетыг хүчингүй болгож 503 degraded үүсгэнэ. |

## 2. Клиент нүүлгэх зааврын хамгийн бага багц

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

## 3. Гэрээнээс ГАРГАЖ авдаг зүйлс (талбар БИШ)

Эдгээрийг хүсэх кодыг **бичихгүй** — `GameState`-д ийм талбар БАЙХГҮЙ:

| Хүсэх зүйл | Хаанаас гарна |
|---|---|
| Нээгдсэн cosmetic | `cosmetics[].unlockSource` + төлөв (`lld.md §6.4`) |
| Boss-ийн хувийн дээд амжилт | `bossAttempts`-ээс `(bossId, difficulty)`-оор `max(total)` |
| Chain-ийн явц | `sideQuestStats[stepId].lastCompletedAt`-ийн дараалал |
| Олдсон нийт mastery point | `Σ_tracks((level − 1) + prestigeCount × 9)` |
| Hard mode-ын босго | `ceil(bossTiers[t] × 1.15)` = `41 · 52 · 60` |

## 4. Татгалзлын код → шалтгаан (v1.2.0-ийн шинэ замууд)

| Action | Код | Хэзээ |
|---|---|---|
| `prestigeMastery` | `INVALID_INPUT` | `tag` нь 7 `SkillTag`-д үгүй |
| `prestigeMastery` | `PREREQ_NOT_MET` | track level ≠ 10 |
| `respecTree` | `INVALID_INPUT` | `track` нь 7 `SkillTag`-д үгүй |
| `respecTree` | `RESPEC_ON_COOLDOWN` | сүүлийн respec-ээс < 7 тоглоомын өдөр |
| `respecTree` | `PREREQ_NOT_MET` | тухайн модонд нээгдсэн node байхгүй |
| `setCampLayout` | `INVALID_INPUT` | 6 slot биш · танихгүй cosmetic id · буруу үүрэнд |
| `setCampLayout` | `PREREQ_NOT_MET` | нээгдээгүй cosmetic зүүх оролдлого |
| `unlockSkill` | `PREREQ_NOT_MET` | capstone-ийн 3 нөхцөлийн аль нэг дутуу (`detail` нь АЛЬ нь дутсаныг нэрлэнэ) |
| `unlockSkill` | `INSUFFICIENT_SKILL_POINTS` | tier-1-д `skillPoints` · tier-2/3-д `masteryPoints` хүрэлцэхгүй |
| `updateSettings` | `INVALID_INPUT` | `soundVolume` нь `0..1`-д үгүй |

## 5. Шалгалтын хаалга

- `web-app/tests/unit/contract-parity.test.ts` — `shared/validate/schemas.ts` ↔
  `contracts.yaml` зөрвөл **УНАНА**. ⚠ Мэдэгдэж буй **ил** зөрүү: `rec()` нь
  түлхүүрийн багцыг (`minProperties` · `propertyNames`) шалгадаггүй — `lld.md §4.2` ·
  `Δ-5`. Энэ зөрүү тестийн ил жагсаалтад бүртгэгдэнэ, чимээгүй өнгөрөхгүй.
- `server/tests/contract/contract.test.ts` — endpoint бүрийн хариу схемтэй тулгагдана.
- `npm run validate:content` — `[C]` дүрэм (PERSONAL-1-ийн 11 + PERSONAL-2-ийн 14)
  бодит пакет дээр; зөрчилтэй бол тэгээс ялгаатай кодоор гарна.
