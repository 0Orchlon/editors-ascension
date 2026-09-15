<!-- PERSONAL-1 · tasks · Төлөвлөгөө + Tasks · 2026-09-15 -->

# Editor's Ascension — Ажлын задаргаа (PERSONAL-1)

**Эх баримт:** `spec.md` (шалгуур), `contracts.yaml` (контракт), `plan.md` (дараалал, эзэмшил).
Task бүр `plan.md §7`-ийн дуусгах тодорхойлолтод захирагдана: тест эхлээд улаан → дараа ногоон →
гадаргуунийхаа `npm test` дамжсан → commit-д task ID → `issue/personal-1`-д push.

**Баганын утга:** `Хамаарал` = өмнө нь дуусах ёстой task. `AC` = хангах шалгуур.
`Шалгах` = task дууссаныг нотлох ажиллуулж болох команд/шалгалт.

⚠ `AC` багана хоосон task БАЙХГҮЙ — хоосон бол тэр ажил хамрах хүрээнээс гадуур (`spec.md §6`).
⚠ `BE-10…BE-17` шалгуурууд нь `spec.md`-д БАЙХГҮЙ, `plan.md §8.1`-д тодорхойлогдсон —
хянагчийн саналаар нэмэгдсэн backend өргөтгөл. Тэдгээрийг лавласан task бүр `T-42`-оос хамаарна.
⚠ Дугаарлалт `T-01…T-41` нь Hefesto-д ID 372…412-оор бүртгэгдсэн тул ӨӨРЧЛӨГДӨӨГҮЙ.
Өргөтгөл нь `T-42…T-50` болж нэмэгдсэн. **Гүйцэтгэх дараалал дугаараар БИШ** — `Хамаарал` багана шийднэ.

---

## P0 — Bootstrap

### T-01 · web-app гадаргуу суурьлуулах
- **Эзэмших:** `web-app/package.json`, `vite.config.ts`, `tsconfig.json`, lint тохиргоо, `web-app/src/app/main.ts`, `web-app/tests/smoke.test.ts`
- **Хамаарал:** —
- **Хийх:** Vite + TypeScript + Vitest. `npm test` = `typecheck && lint && vitest run` нэг команд (`plan.md P-7`). `shared/` руу path alias тохируулах (`plan.md P-1`). Хоосон апп ачаалагдана.
- **AC:** Q-1 (суурь)
- **Шалгах:** `cd web-app && npm test` ногоон; `cd web-app && npm run build` амжилттай.

### T-02 · server гадаргуу суурьлуулах
- **Эзэмших:** `server/package.json`, `tsconfig.json`, lint тохиргоо, `server/src/index.ts`, `server/tests/smoke.test.ts`
- **Хамаарал:** —
- **Хийх:** Node + TypeScript + Vitest. `npm test` = `typecheck && lint && vitest run`. `shared/` руу path alias. HTTP сервер асаж унтарна.
- **AC:** Q-2 (суурь)
- **Шалгах:** `cd server && npm test` ногоон.

### T-03 · Репо дахь баримт ба ажлын дүрэм
- **Эзэмших:** `README.md`, `docs/PERSONAL-1/*`, `web-app/CLAUDE.md`, `server/CLAUDE.md`, `shared/CLAUDE.md`
- **Хамаарал:** —
- **Хийх:** `spec.md`, `contracts.yaml`, `plan.md`, `tasks.md`-ийг `docs/PERSONAL-1/`-д хуулах (толгойд гарал үүслийн мөртэй). Гадаргуу тутмын `CLAUDE.md`-д `plan.md §1`-ийн хамаарлын чиглэл, эзэмшлийн хил, нэг шалгах командыг бичих.
- **AC:** `spec.md §7` (хүргэлтийн дүрэм)
- **Шалгах:** `docs/PERSONAL-1/{spec,plan,tasks}.md` + `contracts.yaml` оршино; гурван `CLAUDE.md` байна.

---

## P1 — Shared contracts

### T-04 · `shared/` төрөл + runtime validator
- **Эзэмших:** `shared/types/**`, `shared/validate/**`
- **Хамаарал:** T-01, T-02
- **Хийх:** `contracts.yaml → components.schemas`-ийн бүх схемийг (`GameState`, `QuestDefinition`, `DungeonDefinition`, `ContentPack`, `ProgressionConstants`, `SavePayload`) TypeScript төрөл + нэг runtime validator болгох. Хоёр гадаргуу ижил validator-ыг импортлоно (`plan.md P-2`). `shared/` нь ГАДААД хамааралгүй.
- **AC:** D-3 (бүхэл тоо, сөрөг хориг схемийн түвшинд), BE-5-ийн суурь, SV-4-ийн суурь
- **Шалгах:** `cd web-app && npm test` ба `cd server && npm test` хоёул `shared`-ыг импортолж ногоон; буруу бүтэцтэй объект татгалзсаныг баталсан тест.

### T-05 · Save schema version + migration бүртгэл
- **Эзэмших:** `shared/save/**`
- **Хамаарал:** T-04
- **Хийх:** `schemaVersion` (бүхэл тоо, одоогийн = 1), migration функцийн бүртгэл `v(n-1)→v(n)` (`plan.md P-6`). Хоосон/дэмий migration бичихгүй — зөвхөн бүртгэлийн механизм + v1 fixture.
- **AC:** SV-1 (бүтэц)
- **Шалгах:** Танил бус ирээдүйн хувилбар → тодорхой алдаа; v1 fixture → өөрчлөгдөлгүй дамжина.

---

## P2 — Domain core (`shared/core/**`)

⚠ Домэйн нь `web-app/src/core/` БИШ, `shared/core/` дотор (`plan.md §1`, §9). Шалтгаан:
сервер ижил дүрмийг `BE-11`-ээр ажиллуулна. Тест нь `web-app/tests/`-д ажиллана.

### T-06 · Прогресс: XP, түвшин, ранк, skill point
- **Эзэмших:** `shared/core/progression/**`
- **Хамаарал:** T-04
- **Хийх:** `addXp`, `levelFor`, `rankFor`, `unlockSkill`. Босго `[100,250,500,1000,1750,2750,4000,5500,7500]`, ранк 1..10.
- **AC:** PRG-1, PRG-2, PRG-3, PRG-4, PRG-5, D-3, D-4
- **Шалгах:** PRG-1-ийн хүснэгтэн тест (`0,99,100,249,250,7499,7500,999999`); олон түвшин үсрэхэд SP тоо; татгалзлын код бүр тесттэй.

### T-07 · Stamina ба rest
- **Эзэмших:** `shared/core/progression/stamina.ts`
- **Хамаарал:** T-04
- **Хийх:** Шинэ тоглоом 10/10, зарцуулалт, rest +3 `maxStamina`-аар таслах.
- **AC:** STA-1, STA-2, STA-3
- **Шалгах:** 8→10, 10→10; хүрэлцэхгүй үед `INSUFFICIENT_STAMINA` ба төлөв ӨӨРЧЛӨГДӨӨГҮЙ гэдгийг баталсан тест.

### T-08 · Quest claim хөдөлгүүр
- **Эзэмших:** `shared/core/quests/**`
- **Хамаарал:** T-06, T-07
- **Хийх:** `claimQuest(state, questId, {clock, rng, contentPack})`. Урьдчилсан нөхцөл, түвшний шаардлага, давтагдахгүй шалгалт, stamina зарцуулалт, XP олголт, `LEVEL_UP` event. Дуусгах нь зөвхөн ил claim — автоматаар дуусгахгүй, бүх `victoryConditions` тэмдэглэгдсэн байхыг шаардана.
- **AC:** MQ-3, MQ-4, MQ-6, PRG-6, D-1, D-2, D-4
- **Шалгах:** `PREREQ_NOT_MET`, `LEVEL_TOO_LOW`, `ALREADY_COMPLETED` тус бүрд тест; дутуу checklist-тэй claim татгалзана.

### T-09 · Side quest давталт ба XP буурал
- **Эзэмших:** `shared/core/quests/sideQuests.ts`
- **Хамаарал:** T-08
- **Хийх:** `max(ceil(baseXp*0.1), floor(baseXp * m^(n-1)))`, `m` default 0.5. `sideQuestStats[id] = {completions, lastCompletedAt}`.
- **AC:** SQ-2, SQ-5
- **Шалгах:** base 40 → `40, 20, 10, 4, 4, 4` дараалал тесттэй.

### T-10 · Study Dungeon оноолт
- **Эзэмших:** `shared/core/dungeons/**`
- **Хамаарал:** T-06
- **Хийх:** Tutorial нээх (0 XP), mastery ≥70% (дээш бүхэлчилнэ), тэнцсэн эхний удаад л XP, хязгааргүй дахин оролдлого, унасан гаралт нь буруу хариулт бүрийн тайлбар + дараагийн алхам.
- **AC:** DG-2, DG-3, DG-4 (домэйн тал)
- **Шалгах:** 69%/70% хилийн тест; давтан тэнцэхэд 0 XP; унасан үр дүн тайлбартай.

### T-11 · Өдрийн даалгавар сонгогч
- **Эзэмших:** `shared/core/quests/dailyMission.ts`
- **Хамаарал:** T-08, T-10
- **Хийх:** `pickDailyMission(state, date, contentPack)` — детерминистик. Эрэмбэ: main → dungeon → side. `boss`/`raid` хэзээ ч сонгохгүй; өмнөх өдрийн id-г ≥2 нэр дэвшигчтэй үед давтахгүй; байхгүй бол `null`.
- **AC:** DM-1, DM-2, DM-3
- **Шалгах:** Ижил оролтод ижил гаралт (2 удаа дуудсан тест); бүх нэр дэвшигч дууссан төлөвт `null`.

### T-12 · Санамсаргүй тохиолдол, loot, эдийн засаг
- **Эзэмших:** `shared/core/inventory/**`, `shared/core/encounters/**`
- **Хамаарал:** T-08
- **Хийх:** seed-тэй RNG-ээр тохиолдол (нэг claim-д ≤1), loot унах, inventory давхардахгүй. Coin/loot нь XP, stamina, unlock-д НӨЛӨӨЛӨХГҮЙ.
- **AC:** ENC-2, EC-1 (домэйн тал), EC-2
- **Шалгах:** Ижил seed = ижил дараалал; `core/inventory` → `core/progression` импорт БАЙХГҮЙ гэдгийг сканнердсан тест.

### T-13 · Амжилт ба streak
- **Эзэмших:** `shared/core/achievements/**`
- **Хамаарал:** T-08, T-10
- **Хийх:** Амжилт бүр төлвөөс машинаар шалгагдах предикаттай, төлөв өөрчлөгдөх бүрд шалгагдаж нэг удаа олгогдоно. Streak: `current`, `best`, `lastQualifiedDate`; өдөр алгасвал 1-ээс эхэлнэ; `best` буурахгүй.
- **AC:** ACH-1 (механизм), ACH-2
- **Шалгах:** Өдөр алгасах, дараалсан өдөр, нэг өдөрт хоёр дуусгах гурван тест; давхар олголтгүй.

### T-14 · Project Forge
- **Эзэмших:** `shared/core/projects/**`
- **Хамаарал:** T-06
- **Хийх:** 10 milestone тогтмол дараалал, `notes`/`nextAction`/`completedAt`/`evidenceRef`/`selfScore` (0..10), milestone тус бүрт 25 XP нэг удаа, бүгд дуусахад `PROJECT_COMPLETED`.
- **AC:** PJ-1, PJ-2, PJ-3, PJ-4
- **Шалгах:** Дахин тэмдэглэхэд XP нэмэгдэхгүй тест; `selfScore=11` → `INVALID_INPUT`.

### T-15 · Boss үнэлгээ
- **Эзэмших:** `shared/core/progression/boss.ts`
- **Хамаарал:** T-06
- **Хийх:** 6 ангилал 0..10, нийлбэрийн эрэмбэ `<35` унасан / `35..44` mvp / `45..51` advanced / `≥52` mastery. Унасан үр дүнд хамгийн сул ангилал + тухайн tag-тай side quest санал. Оролдлого бүр түүхэнд.
- **AC:** BS-1, BS-2, BS-3, BS-4
- **Шалгах:** Хилийн тестүүд `34,35,44,45,51,52`; BS-3-ийн мессежийн формат яг тэр.

### T-16 · Save: цуваалт, migration, гэмтэл сэргээлт, export/import
- **Эзэмших:** `shared/core/saves/**`
- **Хамаарал:** T-05, T-06
- **Хийх:** Төлвийг `SavePayload` болгох/буцаах, migration ажиллуулах, задлагдахгүй save-ыг `save.corrupt.<ts>`-д хадгалаад шинэ тоглоом эхлүүлэх, export JSON (schemaVersion-той), import нь схемээр шалгаж татгалзвал одоогийн төлвийг ХЭВЭЭР үлдээх.
- **AC:** SV-1, SV-2, SV-4, SV-5
- **Шалгах:** Гэмтсэн JSON-оор апп уналгүй сэргэнэ; export→import deep-equal тест.

### T-17 · Архитектурын хамгаалалт (импорт + цэвэр байдал)
- **Эзэмших:** `web-app/tests/architecture.test.ts`, `server/tests/architecture.test.ts`
- **Хамаарал:** T-06
- **Хийх:** Сканнердсан тест: (а) `web-app/src/ui/**` → `shared/core/**` шууд импорт хориг (зөвхөн `services/**` дамжина), (б) `shared/core/**` дотор `Date.now(`/`Math.random(` хориг (`plan.md P-5`), (в) `shared/content/**` нь зөвхөн өгөгдөл, (г) `shared/**` дотор гадаад хамаарлын импорт байхгүй.
- **AC:** UI-3, D-1, D-2
- **Шалгах:** Зөрчил санаатай оруулсан үед тест УНАДАГ гэдгийг батлах.

---

## P3 — Content (`shared/content/**`)

⚠ Контент нь `web-app/src/content/` БИШ, `shared/content/` дотор (`plan.md §9`): сервер
`BE-11`-ийн үйлдлийг шалгахад quest-ийн `staminaCost`/`xp`/`prerequisites` хэрэгтэй.

### T-18 · Контентын validation тестүүд (контентоос ӨМНӨ)
- **Эзэмших:** `web-app/tests/content/**`
- **Хамаарал:** T-04
- **Хийх:** Бүх [C] шалгалтыг эхлээд бичих: схем нийцэл, prerequisite DAG (мөчлөггүй, referenced id оршино, `world` дараалал зөрчихгүй), quest талбарын хоосон биш байдал, `staminaCost` 1..6, side quest XP < тухайн дэлхийн хамгийн бага main quest XP, anti-grind XP/минут, 7 сурах домэйн тус бүрт ≥2 quest, item бүрийн `effect = "cosmetic"`.
- **AC:** MQ-2, MQ-5, STA-4, SQ-3, SQ-4, EC-1 (контент тал), PRD §4 хучилт
- **Шалгах:** Контент хоосон үед эдгээр тест УЛААН байна — энэ нь хүлээгдсэн эхлэл.

### T-19 · Үндсэн кампанит ажил — 18 quest
- **Эзэмших:** `shared/content/mainQuests.json`
- **Хамаарал:** T-18
- **Хийх:** PRD §5-ийн 18 quest яг тэр гарчиг, дэлхий 1..5-аар. Талбар бүрийг дүүргэх (`deliverables`, `victoryConditions`, `stretchGoals`, `reflectionPrompt`, `estimatedMinutes`, `tags`).
- **AC:** MQ-1, MQ-5
- **Шалгах:** T-18-ийн тестүүд энэ файлын хувьд ногоон.

### T-20 · Side quest ≥20
- **Эзэмших:** `shared/content/sideQuests.json`
- **Хамаарал:** T-18, T-19
- **Хийх:** ≥20 side quest, тус бүр 1–2 tag; XP нь SQ-3/SQ-4-ийн хүрээнд багтана; 7 домэйныг хамарна.
- **AC:** SQ-1, SQ-3, SQ-4
- **Шалгах:** anti-grind тестүүд ногоон.

### T-21 · Dungeon бүтэц ба mastery асуултууд
- **Эзэмших:** `shared/content/dungeons.json`
- **Хамаарал:** T-18
- **Хийх:** Dungeon бүрт `conceptGoal`, `estimatedMinutes`, ≥1 mastery асуулт, зөв хариулт бүрт тайлбар. `tutorialRefs` талбарыг бүтцээр бэлдэнэ (утга нь T-22).
- **AC:** DG-1 (бүтэц)
- **Шалгах:** Бүтцийн [C] тест ногоон; `tutorialRefs` хоосон байх нь энэ шатанд хүлээгдсэн.

### T-22 · Tutorial эх сурвалж дүүргэх ⚠ хүний баталгаа
- **Эзэмших:** `shared/content/dungeons.json` (зөвхөн `tutorialRefs`)
- **Хамаарал:** T-21 + **хүний баталгаа** (`plan.md §6.1`, `spec.md` асуулт 3)
- **Хийх:** Dungeon бүрт 1–3 `tutorialRefs` (`title`, `url`, `minutes`) — батлагдсан жагсаалтаас.
- **AC:** DG-1 (холбоос)
- **Шалгах:** `tutorialRefs` тоо 1..3, талбар бүр дүүрсэн тест ногоон.
- ⚠ Баталгаа ирээгүй бол энэ task БЛОКЛОГДЖЭЭ гэж мэдүүлнэ — холбоос ЗОХИОХГҮЙ.

### T-23 · Тохиолдол, амжилт, loot каталог
- **Эзэмших:** `shared/content/{encounters,achievements,loot}.json`
- **Хамаарал:** T-18, T-12, T-13
- **Хийх:** PRD §12-ийн 5 төрөл тохиолдол, тус бүр ≤2 минутын `callToAction`; ≥12 амжилт предикатын түлхүүртэй; loot item бүр `effect: "cosmetic"`.
- **AC:** ENC-1, ACH-1 (контент тал), EC-1
- **Шалгах:** [C] тестүүд бүгд ногоон.

---

## P4 — Backend суурь (`server/**`)

### T-24 · Сервер суурь: `/health` + SQLite хадгалалт
- **Эзэмших:** `server/src/{app.ts,db/**}`, `server/tests/health.test.ts`
- **Хамаарал:** T-02, T-04
- **Хийх:** HTTP апп, `GET /api/health → 200 {status:"ok", version}`, SQLite файл сан (`server/data/*.sqlite`), схем үүсгэлт (migration механизм нь `T-48`).
- **AC:** BE-8, BE-9
- **Шалгах:** Бичсэн save нь процесс дахин эхэлсний дараа уншигдана гэдгийг баталсан тест.

### T-25 · Нэргүй тоглогч + токен хамгаалалт
- **Эзэмших:** `server/src/routes/players.ts`, `server/src/auth/**`
- **Хамаарал:** T-24
- **Хийх:** `POST /api/players → {playerId, token}`. PII хадгалахгүй, IP лог хийхгүй. `/api/players/{id}/**` бүрт `Authorization: Bearer` шаардана: токенгүй 401, өөр тоглогчийн id 403. Токен нь DB-д hash хэлбэрээр хадгалагдана.
- **AC:** BE-2, BE-4
- **Шалгах:** 401, 403, 200 гурван тест. ⚠ Итгэлцлийн хил — хялбаршуулахыг хориглоно.

### T-26 · Save GET/PUT + ETag
- **Эзэмших:** `server/src/routes/saves.ts`
- **Хамаарал:** T-25
- **Хийх:** `GET` — байхгүй бол 404, `ETag` толгойтой. `PUT` — `If-Match` заавал, анхны бичилтэд `*`, хуучирсан ETag → 409. Хэрэглээний хүрээ нь `plan.md P-9`-ээр хязгаарлагдсан.
- **AC:** BE-3
- **Шалгах:** 404 / 200+ETag / зөв If-Match 200 / хуучин If-Match 409 тестүүд.

### T-27 · Хүсэлтийн биеийн шалгалт
- **Эзэмших:** `server/src/middleware/validate.ts`
- **Хамаарал:** T-26
- **Хийх:** `shared/validate`-ээр бие шалгах (`plan.md P-2`): буруу → 400 + талбарын алдаа; >1MB → 413.
- **AC:** BE-5
- **Шалгах:** Буруу талбартай бие 400 ба алдааны талбарын нэр гарна; 1MB+ бие 413.

### T-28 · Контент тараалт + кэш
- **Эзэмших:** `server/src/routes/content.ts`
- **Хамаарал:** T-24, T-23
- **Хийх:** `GET /api/content/pack` — `shared/content/*.json`-оос угсарсан пакет (`plan.md P-3`), `ETag` + `Cache-Control`; `If-None-Match` таарвал 304.
- **AC:** BE-6
- **Шалгах:** 200 → ETag авах → ижил ETag-аар 304.

### T-29 · Contract тест (`contracts.yaml`-тай тулгах)
- **Эзэмших:** `server/tests/contract/**`
- **Хамаарал:** T-24…T-28
- **Хийх:** `contracts.yaml`-ийн endpoint бүрийн хариуг схемтэй нь автоматаар тулгах тест. Шинэ endpoint нэмэгдвэл тест өөрөө шалгана.
- **AC:** BE-1
- **Шалгах:** `cd server && npm test` ногоон; схемээс гажсан хариу тестийг УНАГААНА.

---

## P4b — Backend өргөтгөл (хянагчийн саналаар, `plan.md §8`)

⚠ Энэ бүлгийн шалгуурууд (`BE-10…BE-17`) `spec.md`-д БАЙХГҮЙ — `plan.md §8.1`-д тодорхойлогдсон.
`T-42` нь тэдгээрийг албан ёсны контракт болгоно; түүнээс өмнө өөр P4b task эхлэхгүй.
Хасах зам: `plan.md §8.3`.

### T-42 · Контрактын өргөтгөл: шинэ endpoint + схем
- **Эзэмших:** `contracts.yaml`, `docs/PERSONAL-1/contracts.yaml`, `spec.md`-ийн §4.12 нэмэлт
- **Хамаарал:** T-29 + **хүний баталгаа** (`plan.md §6.2`)
- **Хийх:** `contracts.yaml`-д нэмэх: `POST /api/players/{id}/actions`, `GET /api/players/{id}/save/history`, `POST /api/players/{id}/save/restore`, `POST /api/players/{id}/transfer-code`, `POST /api/transfer/redeem`; схем: `Action`, `ActionBatchRequest`, `ActionResult`, `SnapshotRef`, `TransferCode`, `Problem` (RFC 9457). `GET /api/health`-ийн хариунд `contentVersion` + `degraded` төлөв. Дараа `shared/types`-ыг шинэчилнэ.
- **AC:** BE-1 (өргөтгөсөн гадаргуу), BE-10…BE-17-ийн контрактын суурь
- **Шалгах:** `contracts.yaml` нь YAML/OpenAPI 3.1-ээр parse хийгдэнэ; `T-29`-ийн contract тест шинэ endpoint-уудыг олж, хэрэгжээгүй байхад УНАНА (хүлээгдсэн улаан).

### T-43 · Домэйныг `shared/core`-д нэгтгэх хамгаалалт
- **Эзэмших:** `web-app/tests/architecture.test.ts`, `server/tests/architecture.test.ts`
- **Хамаарал:** T-17, T-24
- **Хийх:** Сканнердсан тестийг өргөтгөх: `web-app/src/**` ба `server/src/**` дотор XP босго, stamina тоо, skill point тооцоолол, quest шалгалт ДАХИН бичигдээгүй (тогтмолууд болон дүрмийн түлхүүр үгсийн жагсаалтаар). Зөрчил → тест унана.
- **AC:** BE-10
- **Шалгах:** Санаатай давхардуулсан тогтмол оруулахад тест УНАДАГ гэдгийг батлах.

### T-44 · Эрх бүхий үйлдлийн endpoint + idempotency
- **Эзэмших:** `server/src/routes/actions.ts`, `server/src/db/actions.ts`
- **Хамаарал:** T-42, T-43, T-08…T-16, T-19…T-23
- **Хийх:** `POST /api/players/{id}/actions` — үйлдлийн массивыг `shared/core`-оор дараалан хэрэгжүүлж `{state, events[]}` буцаах. Татгалзал → 422 + `spec.md D-4` код, хадгалагдсан төлөв өөрчлөгдөхгүй (транзакц буцаана). `actionId` (UUID) тус бүрээр idempotency бүртгэл; давтан ирвэл анхны үр дүнг буцаана. Бүртгэл 90 хоногийн дараа цэвэрлэгдэнэ (`plan.md P-10`).
- **AC:** BE-11, BE-12
- **Шалгах:** (а) claim → XP серверт нэмэгдсэн; (б) ижил `actionId` 2 удаа → XP нэг л удаа; (в) stamina хүрэлцэхгүй багц → 422 `INSUFFICIENT_STAMINA`, DB дэх төлөв ӨӨРЧЛӨГДӨӨГҮЙ.

### T-45 · Save snapshot түүх + сэргээлт
- **Эзэмших:** `server/src/routes/snapshots.ts`, `server/src/db/snapshots.ts`
- **Хамаарал:** T-44
- **Хийх:** `PUT /save` ба `POST /actions` бүрт өмнөх төлвийг snapshot болгон хадгалах (сүүлийн 10, хуучныг устгах). `GET /api/players/{id}/save/history`, `POST /api/players/{id}/save/restore {snapshotId}` — сэргээлт өөрөө шинэ snapshot үүсгэнэ.
- **AC:** BE-13
- **Шалгах:** 12 удаа бичсэний дараа түүх яг 10 бичлэгтэй; сэргээсний дараа төлөв тэнцүү ба түүхэнд шинэ бичлэг нэмэгдсэн.

### T-46 · Төхөөрөмж хоорондын шилжүүлэх код
- **Эзэмших:** `server/src/routes/transfer.ts`
- **Хамаарал:** T-44
- **Хийх:** `POST /api/players/{id}/transfer-code` → `{code, expiresAt}` (TTL 15 мин, криптографийн санамсаргүй). `POST /api/transfer/redeem {code}` → шинэ `{playerId, token}` + save-ийн хуулбар. Код нэг удаа: дахин → 410; хугацаа дууссан → 410. Хариунд save-ийн агуулга орохгүй.
- **AC:** BE-14
- **Шалгах:** Redeem хоёр дахь удаа 410; хугацаа дууссан код 410 (цагийг тестэд шахна); redeem-ийн дараа хоёр playerId тус тусдаа save-тай.

### T-47 · Контентын серверийн validation + degraded health
- **Эзэмших:** `server/src/content/load.ts`, `server/src/routes/health.ts`
- **Хамаарал:** T-42, T-28
- **Хийх:** Сервер асахдаа `shared/content/*.json`-ыг `shared/validate`-ээр шалгана. Хүчинтэй → health 200 `{status:"ok", version, contentVersion}` (`contentVersion` = пакетын hash). Хүчингүй → `/api/content/pack` тараахгүй, health 503 `{status:"degraded", reason}`.
- **AC:** BE-15
- **Шалгах:** Санаатай эвдсэн контент fixture-тэй сервер → health 503 ба `/content/pack` 503; зөв контентоор 200 + `contentVersion` тогтвортой.

### T-48 · Ops хаалга: problem+json, лог, shutdown, migration, rate limit
- **Эзэмших:** `server/src/{errors,logging,shutdown,db/migrations}/**`, `server/src/middleware/rateLimit.ts`
- **Хамаарал:** T-42, T-27
- **Хийх:** Бүх 4xx/5xx → `application/problem+json`. Бүтэцлэгдсэн JSON лог, PII-гүй (IP, `Authorization`, token, save агуулга ОРОХГҮЙ). SIGTERM → graceful shutdown. DB схем дугаарласан migration-аар. Токен тутам 60 req/min → 429 + `Retry-After`; `POST /api/players` глобал 30/min (`plan.md P-11`).
- **AC:** BE-16, BE-17
- **Шалгах:** Алдааны хариу бүрийн `content-type` тест; лог бичлэгт хориотой түлхүүр байхгүй гэдгийг баталсан тест; 61 дэх хүсэлт 429; `npm test` дотор migration тэгээс ажиллана.

### T-49 · Клиентийн үйлдлийн дараалал + эвлэрүүлэг
- **Эзэмших:** `web-app/src/services/actionQueue.ts`, `web-app/src/services/sync.ts`
- **Хамаарал:** T-37, T-44
- **Хийх:** Онлайн үед үйлдлийг `POST /actions`-оор илгээж серверийн `state`-ыг эрх бүхий болгон авна. Офлайн үед локал домэйнээр хэрэгжүүлж `actionId`-тай дараалалд хадгална; холболт сэргэхэд дарааллыг илгээж серверийн төлвөөр солино. Дараалал алдагдсан бол `PUT /save` (last-write-wins) руу шилжинэ (`plan.md P-9`).
- **AC:** BE-7, BE-11 (клиент тал), BE-12 (клиент тал)
- **Шалгах:** Офлайн 5 үйлдэл → онлайн болох → сервер дээр 5 үйлдэл нэг удаа хэрэгжсэн; давхар илгээхэд XP давхарлаагүй; сервер бүрэн унтарсан горимд бүх [I] тест ногоон хэвээр.

### T-50 · Өргөтгөсөн contract тест
- **Эзэмших:** `server/tests/contract/**`
- **Хамаарал:** T-44…T-48
- **Хийх:** `T-29`-ийн тестийг шинэ endpoint-ууд болон `Problem` схемд хамруулах. Алдааны хариунууд ч схемээр шалгагдана.
- **AC:** BE-1
- **Шалгах:** `cd server && npm test` ногоон; `contracts.yaml`-д байгаа мөртлөө хэрэгжээгүй endpoint байвал тест УНАНА.

---

## P5 — UI (`web-app/src/{services,ui,app}/**`)

### T-30 · `services/` фасад
- **Эзэмших:** `web-app/src/services/**`
- **Хамаарал:** T-08…T-16
- **Хийх:** UI-д зориулсан цорын ганц хаалга: `shared/core`-ийн үйлдлүүдийг дуудаж, `clock`/`rng`-г нэг газар холбоно. UI нь `shared/core`-ыг ХЭЗЭЭ Ч шууд импортлохгүй.
- **AC:** UI-3, D-1
- **Шалгах:** T-17-ийн импортын тест ногоон хэвээр.

### T-31 · Апп бүрхүүл + 8 дэлгэцийн навигаци
- **Эзэмших:** `web-app/src/app/**`, `web-app/src/ui/shell/**`
- **Хамаарал:** T-30
- **Хийх:** Camp, Main Quest Board, Side Quest Board, Study Dungeons, Skill Tree, Project Forge, Achievements, Settings — бүгд нээгдэж, хооронд шилжинэ.
- **AC:** UI-1
- **Шалгах:** Дэлгэц бүрийг нээж үндсэн элемент нь харагдсаныг баталсан тест.

### T-32 · Camp дэлгэц
- **Эзэмших:** `web-app/src/ui/camp/**`
- **Хамаарал:** T-31, T-11
- **Хийх:** Нэг дэлгэцэнд: rank/level/XP bar, stamina, өдрийн даалгавар (эсвэл "Rest day"), streak, төслийн дараагийн үйлдэл.
- **AC:** UI-2, DM-3 (UI тал)
- **Шалгах:** Бүх зургаан элемент DOM-д байгааг баталсан тест.

### T-33 · Quest board + claim модал
- **Эзэмших:** `web-app/src/ui/quests/**`
- **Хамаарал:** T-31
- **Хийх:** Main/Side board, түгжээтэй quest-ийн шалтгаан харуулах, claim модал нь `victoryConditions` checklist-ийг шаардана, түвшин ахихад баннер.
- **AC:** MQ-6 (UI тал), PRG-6
- **Шалгах:** Дутуу checklist-тэй claim товч идэвхгүй; түвшин ахихад баннер гарна.

### T-34 · Dungeon дэлгэц + унах UX
- **Эзэмших:** `web-app/src/ui/dungeons/**`
- **Хамаарал:** T-31, T-10
- **Хийх:** Tutorial жагсаалт, mastery шалгалт, унасан үед буруу хариулт бүрийн тайлбар + дараагийн алхам. Зөвхөн "Failed" бичихийг хориглоно.
- **AC:** DG-4 (UI тал)
- **Шалгах:** Унасан оролдлогын дэлгэцэнд тайлбарын текст байгааг баталсан тест.

### T-35 · Skill Tree · Forge · Achievements · Settings
- **Эзэмших:** `web-app/src/ui/{skills,forge,achievements,settings}/**`
- **Хамаарал:** T-31, T-14, T-15, T-13
- **Хийх:** Skill unlock (SP зарцуулалт, шалтгаантай татгалзал), төслийн 10 milestone, boss үнэлгээний маягт + "гэрчилгээ биш, дасгалжуулах хэрэгсэл" тайлбар, амжилтын жагсаалт, Settings (`reducedMotion`, дуу, export/import байрлал).
- **AC:** PRG-5 (UI тал), PJ-1 (UI тал), BS-5
- **Шалгах:** Boss дэлгэцэнд тайлбарын текст байгааг баталсан тест; SP хүрэхгүй үед шалтгаан харагдана.

---

## P6 — Integration (`web-app/src/services/**`)

### T-36 · localStorage persistence
- **Эзэмших:** `web-app/src/services/persistence.ts`
- **Хамаарал:** T-16, T-31
- **Хийх:** Бичилт ≥500ms debounce, "сүүлд хадгалсан" хугацаа UI-д, ачаалахад migration ажиллана.
- **AC:** SV-3, SV-6
- **Шалгах:** quest claim → XP өөрчлөгдөх → save → reload → ижил төлөв интеграцийн тест.

### T-37 · Серверийн sync адаптер
- **Эзэмших:** `web-app/src/services/sync.ts`
- **Хамаарал:** T-36, T-26
- **Хийх:** Нэг сүлжээний адаптер (тестэд солигдоно). Сервер унтарсан үед апп бүрэн ажиллана; холболт сэргэхэд `updatedAt`-аар last-write-wins нэгтгэнэ; контент пакетыг ETag-аар шинэчилнэ. Үйлдлийн дараалал нь `T-49`.
- **AC:** BE-7, BE-6 (клиент тал)
- **Шалгах:** Сүлжээ бүрэн унтарсан горимд бүх [I] тест ногоон; сэргэхэд sync хийсэн тест.

### T-38 · Export / Import UI
- **Эзэмших:** `web-app/src/ui/settings/transfer.ts`
- **Хамаарал:** T-16, T-35
- **Хийх:** JSON файл татах / оруулах; буруу файлыг шалтгаантай татгалзаж, одоогийн төлвийг УСТГАХГҮЙ. `T-46` хэрэгжсэн бол шилжүүлэх кодын талбар мөн энд.
- **AC:** SV-4 (UI тал), SV-5, BE-14 (UI тал)
- **Шалгах:** Round-trip тест; гэмтсэн файл оруулахад төлөв өөрчлөгдөөгүйг баталсан тест.

---

## P7 — Polish + a11y

### T-39 · Хүртээмжийн шалгуур
- **Эзэмших:** `web-app/src/ui/**` (стиль, ARIA), `web-app/tests/a11y/**`
- **Хамаарал:** T-31…T-35
- **Хийх:** Гарны навигаци (Tab дараалал, Enter/Space), фокусын харагдац ≥3:1, текстийн контраст ≥4.5:1, төлвийг зөвхөн өнгөөр дамжуулахгүй, 360/768/1280px-д хэвтээ гүйлгэлтгүй, axe шалгалт үндсэн дэлгэц бүрт.
- **AC:** A11Y-1, A11Y-3, A11Y-4, A11Y-6
- **Шалгах:** axe critical зөрчил 0; гурван өргөнд гүйлгэлтгүй тест.

### T-40 · Хөдөлгөөн, дуу, onboarding
- **Эзэмших:** `web-app/src/ui/**` (анимаци), `web-app/src/ui/settings/**`
- **Хамаарал:** T-39
- **Хийх:** `prefers-reduced-motion` хүндэтгэх + Settings-ийн `reducedMotion` нь БҮХ анимацийг унтраана; дуу заавал биш — унтраасан үед бүх функц ажиллана; анхны onboarding.
- **AC:** A11Y-2, A11Y-5
- **Шалгах:** `reducedMotion=true` үед анимацийн класс хэрэглэгдэхгүй тест; дуугүй горимд smoke.

---

## P8 — Release

### T-41 · Release хаалга
- **Эзэмших:** `web-app/tests/smoke/**`, `server/tests/smoke/**`, багцлах скрипт
- **Хамаарал:** T-01…T-40, T-42…T-50 (хэрэгжсэн бол)
- **Хийх:** Цэвэр машины дараалал: `npm ci` → `npm test` → `npm run build` → smoke. Smoke нь: апп ачаална, бүх таб нээгдэнэ, quest эхэлж дуусна, XP өөрчлөгдөнө, reload төлөв хадгална, export/import ажиллана, консолд uncaught алдаа 0. Сервер талд: асаж health 200, үйлдэл хэрэгжиж, restart-ийн дараа төлөв хэвээр. TECH_SPEC §Testing-ийн сэдэв бүр тесттэй гэдгийг хяналтын жагсаалтаар баталгаажуулна.
- **AC:** Q-1, Q-2, Q-3, Q-4, Q-5, UI-4
- **Шалгах:** Хоёр гадаргууд `npm ci && npm test && npm run build` ногоон; smoke тайлан.

---

## Хучилтын матриц (AC → task)

| AC | Task |
|---|---|
| PRG-1…PRG-4 | T-06 |
| PRG-5 | T-06, T-35 |
| PRG-6 | T-08, T-33 |
| STA-1…STA-3 | T-07 |
| STA-4 | T-18 |
| MQ-1 | T-19 |
| MQ-2 | T-18 |
| MQ-3, MQ-4 | T-08 |
| MQ-5 | T-18, T-19 |
| MQ-6 | T-08, T-33 |
| SQ-1 | T-20 |
| SQ-2, SQ-5 | T-09 |
| SQ-3, SQ-4 | T-18, T-20 |
| DG-1 | T-21 (бүтэц), T-22 (холбоос) |
| DG-2, DG-3 | T-10 |
| DG-4 | T-10, T-34 |
| DM-1, DM-2 | T-11 |
| DM-3 | T-11, T-32 |
| ENC-1 | T-23 |
| ENC-2 | T-12 |
| PJ-1 | T-14, T-35 |
| PJ-2…PJ-4 | T-14 |
| BS-1…BS-4 | T-15 |
| BS-5 | T-35 |
| EC-1 | T-12, T-18, T-23 |
| EC-2 | T-12 |
| ACH-1 | T-13, T-23 |
| ACH-2 | T-13 |
| SV-1 | T-05, T-16 |
| SV-2 | T-16 |
| SV-3 | T-36 |
| SV-4 | T-16, T-38 |
| SV-5 | T-16, T-38 |
| SV-6 | T-36 |
| BE-1 | T-29, T-42, T-50 |
| BE-2, BE-4 | T-25 |
| BE-3 | T-26 |
| BE-5 | T-27 |
| BE-6 | T-28, T-37 |
| BE-7 | T-37, T-49 |
| BE-8, BE-9 | T-24 |
| BE-10 (`plan.md §8.1`) | T-43 |
| BE-11 | T-44, T-49 |
| BE-12 | T-44, T-49 |
| BE-13 | T-45 |
| BE-14 | T-46, T-38 |
| BE-15 | T-47 |
| BE-16, BE-17 | T-48 |
| UI-1 | T-31 |
| UI-2 | T-32 |
| UI-3 | T-17, T-30 |
| UI-4 | T-41 |
| A11Y-1, A11Y-3, A11Y-4, A11Y-6 | T-39 |
| A11Y-2, A11Y-5 | T-40 |
| Q-1 | T-01, T-41 |
| Q-2 | T-02, T-41 |
| Q-3…Q-5 | T-41 |
| D-1 | T-08, T-17, T-30 |
| D-2 | T-08, T-17 |
| D-3 | T-04, T-06 |
| D-4 | T-06, T-08, T-44 |

`spec.md`-ийн AC бүр дор хаяж нэг task-д харгалзсан; `plan.md §8.1`-ийн `BE-10…BE-17` мөн адил;
AC-гүй task алга.

## Параллель ажиллуулах боломж

| Долоо хоног | Зэрэг явж болох | Учир |
|---|---|---|
| 1 | T-01, T-02, T-03 | Өөр гадаргуу / зөвхөн баримт |
| 2 | T-04 → T-05 | Дараалсан, хил тогтоож байна |
| 3 | (T-06…T-17) ‖ (T-18…T-23) ‖ (T-24…T-29) | Гурван өөр хавтас, огтлолцолгүй |
| 4 | T-30 → (T-31…T-35) ‖ (T-42 → T-43, T-47, T-48) | UI нь домэйн дуусмагц; backend өргөтгөлийн контракт+ops зэрэг явна |
| 5 | (T-36…T-38) ‖ (T-44 → T-45, T-46) | Интеграци ба серверийн эрх бүхий зам |
| 6 | T-49 → T-50 | Эвлэрүүлэг, дараа өргөтгөсөн contract тест |
| 7 | T-39, T-40 → T-41 | Polish, дараа release |

⚠ Зэрэг ажиллахдаа `shared/types` ба `contracts.yaml`-ыг ХЭН Ч өөрчлөхгүй (`T-42`-оос бусад).
Хэрэгцээ гарвал ажлыг зогсоож, тусдаа task болгож, зурвасууд хамт шинэчилнэ (`plan.md §2`).
