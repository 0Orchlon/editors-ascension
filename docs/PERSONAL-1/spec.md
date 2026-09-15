<!-- PERSONAL-1 · spec · Спек бичих · 2026-09-15 -->

# Editor's Ascension — Функционал спек (PERSONAL-1)

**Систем:** EDITORSASC · **Репо:** `0Orchlon/editors-ascension` · **Салбар:** `issue/personal-1`
**Эх шаардлага:** PRD.md (id=39), TECH_SPEC.md (id=40), GAME_DESIGN.md (id=38), BUILD_PLAN.md (id=37),
AGENT_ORCHESTRATION.md (id=36), болон даалгаврын текст дэх хүний нэмэлт шаардлага.

Энэ баримт нь **юуг хийхийг** тодорхойлно. Хэрхэн хийхийг `plan.md`/`tasks.md` шат шийднэ.
Машин уншигдах контракт нь `contracts.yaml` (OpenAPI 3.1 + домэйн схем) дотор.

---

## 1. Хамрах хүрээ

Судалгааг тоглоом болгон нуусан нэг хэрэглэгчийн вэб тоглоом: видео эвлүүлэг ба Blender сурах
кампанит ажил, дагалдах side quest-үүд, Study Dungeon-ууд, Project Forge, boss үнэлгээ.
Хүн бодит бүтээлч ажлыг **гадуур** (Blender/Resolve) хийж, тоглоом түүнийг бүртгэж, чиглүүлнэ.

**Хүргэлтийн нэгж нэг репо, хоёр гадаргуу** (хүний шаардлага: "full game with frontend and backend"):

| Гадаргуу | Хавтас | Технологи | Шалгах команд |
|---|---|---|---|
| Frontend | `web-app/` | Vite + TypeScript + Vitest (TECH_SPEC §Architecture) | `cd web-app && npm test` |
| Backend | `server/` | Node + TypeScript + Vitest, SQLite файл сан | `cd server && npm test` |
| Хуваалцсан төрөл | `shared/` | TypeScript type + JSON schema (хоёр гадаргуу импортлоно) | frontend-ийн тестээр хамрагдана |

`web-app/src/` дотоод бүтэц нь TECH_SPEC-ийн санал болгосон модлыг дагана:
`app/`, `core/{progression,quests,dungeons,inventory,achievements,projects,saves}/`, `content/`, `ui/`, `services/`, `tests/`.

⚠ Энэ репод netos-core template (`.gitlab-ci.yml`, parent pom/`@netos/parent-web`) **байхгүй** тул
netOS хаалганы шалгалт хамаарахгүй. Гадаргуу тутмын шалгалт нь дээрх npm команд — энэ нь TECH_SPEC-ээс
ирсэн, шинээр зохиосон платформын дүрэм биш.

---

## 2. Ил таамаглал ба шийдвэрүүд

Эдгээр нь эх шаардлагад шууд бичигдээгүй, гэвч гаралтыг бүтээхэд шаардлагатай шийдвэрүүд.
Бүгд **блоклохгүй**: өөрөөр шийдвэл зөвхөн тухайн хэсэг өөрчлөгдөнө, бүтэн ажил дэмий болохгүй.

| # | Таамаглал / шийдвэр | Үндэслэл | Өөрчилвөл нөлөөлөх AC |
|---|---|---|---|
| A1 | Backend нь **контент тараагч + save хадгалагч**; тоглоомын дүрэм (XP, stamina, шалгуур) frontend дэх `core/` домэйнд ажиллана. | PRD §17 нь account/cloud sync-ийг хамрах хүрээнээс гаргасан; ганц хэрэглэгчийн тоглоомд хууран мэхлэлтээс хамгаалах шаардлага алга. Хамгийн бага код. Дээшлүүлэх зам: сервер талд `shared/` домэйныг дахин ажиллуулж action-based болгох. | BE-1…BE-9 |
| A2 | Хэрэглэгчийн таних тэмдэг нь **нэргүй `playerId` + opaque token** (нууц үг, и-мэйл, PII байхгүй). | PRD §17 "No accounts" — бүртгэлгүй мөртлөө сервер талд save хадгалах цорын ганц арга. | BE-2, BE-4 |
| A3 | Сервер талын хадгалалт **SQLite файл** (`server/data/*.sqlite`). | Нэг хамаарал, Docker шаардахгүй, restart-д тэсвэртэй. | BE-8 |
| A4 | Frontend нь **offline-first**: localStorage бол ажлын хуулбар, сервер бол нөөц/шилжүүлэг. Зөрчилдвөл last-write-wins (`updatedAt`). | PRD §7 "Progress survives closing the app". Ceiling: олон төхөөрөмжийн зэрэг засвар нэгдэхгүй. | SV-1…SV-5, BE-7 |
| A5 | Export/import нь **клиент талд** JSON файлаар. | Сервергүй ч ажиллах ёстой; нэмэлт endpoint шаардахгүй. | SV-4, SV-5 |
| A6 | Хэл: UI текст англиар (контентын нэрс PRD-д англиар өгөгдсөн). | Эх шаардлагын контент англи. | UI-1 |
| A7 | Deployment/hosting, CI тохиргоо энэ спекийн хамрах хүрээнд ОРОХГҮЙ. | BUILD_PLAN §Phase 6 нь зөвхөн package хүртэл. | — |
| A8 | Tutorial-ийн бодит холбоосууд (`tutorialRefs`) нь **контент шатанд хүний баталгаа шаардана** (AGENT_ORCHESTRATION §Human approval points). Спек нь зөвхөн талбарын **бүтэц ба шалгуурыг** тогтооно, тодорхой сувгийг сонгохгүй. | Буруу сурах материал нь бүх доод урсгалыг гэмтээнэ. | DG-1 |

---

## 3. Домэйн модел

`GameState` ба `QuestDefinition`-ийн жинхэнэ тодорхойлолт нь **`contracts.yaml` → `components.schemas`**
дотор (TECH_SPEC §Domain state / §Quest schema-г бүрэн агуулсан). Спекийн хувьд заавал биелэх дүрэм:

- **D-1.** UI давхарга XP/stamina/skill/inventory-г шууд өөрчлөхийг ХОРИГЛОНО. Бүх өөрчлөлт
  `core/` домэйн функцээр дамжина (TECH_SPEC §Domain rule).
- **D-2.** Домэйн функц бүр **цэвэр** (pure): `(state, input) → { state, events[] }`. Date/Random нь
  параметрээр дамжина (тестэд seed/тогтмол огноо өгнө).
- **D-3.** Бүх мөнгө/XP-ийн тоо бүхэл тоо. Сөрөг XP, сөрөг stamina төлөв үүсэхийг хориглоно.
- **D-4.** Татгалзсан үйлдэл бүр машин уншигдах шалтгаан кодтой буцна:
  `INSUFFICIENT_STAMINA` · `PREREQ_NOT_MET` · `LEVEL_TOO_LOW` · `ALREADY_COMPLETED` ·
  `NOT_REPEATABLE` · `INSUFFICIENT_SKILL_POINTS` · `INVALID_INPUT`.

---

## 4. Функционал шаардлага ба хүлээн авах шалгуур

Шалгуур бүр **шалгаж болохуйц**: `[U]` unit test, `[I]` integration test, `[C]` контентын
validation test, `[S]` release smoke test, `[A]` автомат a11y шалгалт.

### 4.1 Прогресс — AC-PRG

| ID | Шалгуур | Төрөл |
|---|---|---|
| PRG-1 | XP босго яг `[100,250,500,1000,1750,2750,4000,5500,7500]`. Хүснэгтэн тест: `0→lvl1`, `99→1`, `100→2`, `249→2`, `250→3`, `7499→9`, `7500→10`, `999999→10`. | [U] |
| PRG-2 | Ранкийн нэр 1..10 нь PRD §7-ийн жагсаалттай яг тэнцүү (`Recruit`…`Cinematic Master`). | [U] |
| PRG-3 | Түвшин бүрт яг 1 Skill Point. Нэг удаад олон түвшин үсэрвэл үсэрсэн түвшингийн тоогоор SP олгоно (жишээ: 0 XP → 1000 XP нэг үйлдлээр = lvl1→lvl4 = 3 SP). | [U] |
| PRG-4 | `addXp(0)` төлвийг өөрчлөхгүй; сөрөг утга `INVALID_INPUT`-аар татгалзана, төлөв хэвээр. | [U] |
| PRG-5 | Skill unlock 1 SP зарцуулна; SP хүрэхгүй бол `INSUFFICIENT_SKILL_POINTS`; урьдчилсан нөхцөл биелээгүй бол `PREREQ_NOT_MET`; аль хэдийн нээгдсэн бол `ALREADY_COMPLETED` ба SP хасагдахгүй. | [U] |
| PRG-6 | Түвшин ахих бүрд `LEVEL_UP` event гарч, UI баннер харуулна. | [U][S] |

### 4.2 Stamina — AC-STA

| ID | Шалгуур | Төрөл |
|---|---|---|
| STA-1 | Шинэ тоглоом `stamina=10`, `maxStamina=10`. | [U] |
| STA-2 | `staminaCost > stamina` бол claim татгалзана (`INSUFFICIENT_STAMINA`), XP/completion өөрчлөгдөхгүй. | [U] |
| STA-3 | Rest нь +3, `maxStamina`-аар таслана (8 → 10, 10 → 10). | [U] |
| STA-4 | Контент дахь quest бүрийн `staminaCost` нь 1..6 муж дотор. | [C] |

### 4.3 Үндсэн кампанит ажил — AC-MQ

| ID | Шалгуур | Төрөл |
|---|---|---|
| MQ-1 | Контент пакет PRD §5-ийн **18 үндсэн quest**-ийг яг тэр гарчиг, дэлхий (1..5)-ээр агуулна. | [C] |
| MQ-2 | `prerequisites` граф нь DAG (мөчлөггүй); бүх referenced id оршино; `world` өсөх дарааллыг зөрчихгүй. | [C] |
| MQ-3 | Урьдчилсан нөхцөл дутуу → `PREREQ_NOT_MET`; `levelRequired > level` → `LEVEL_TOO_LOW`. | [U] |
| MQ-4 | Дахин claim → `ALREADY_COMPLETED`, XP давхарлахгүй (`repeatable:false`). | [U] |
| MQ-5 | Quest definition бүрт PRD §9-ийн бүх талбар байх ба хоосон биш: `deliverables ≥1`, `victoryConditions ≥1`, `stretchGoals ≥1`, `reflectionPrompt` хоосон биш, `estimatedMinutes > 0`, `tags ≥1`. | [C] |
| MQ-6 | Quest дуусгах нь зөвхөн **тоглогчийн ил claim**-аар болно; систем автоматаар дуусгахгүй (PRD §9). Claim UI нь victoryConditions-ийн checklist-ийг харуулж, бүгдийг тэмдэглэхийг шаардана. | [U][S] |

### 4.4 Side quest ба anti-grind — AC-SQ

| ID | Шалгуур | Төрөл |
|---|---|---|
| SQ-1 | Контент пакетад **≥20** side quest, тус бүр 1–2 `tags` (ур чадвар). | [C] |
| SQ-2 | Давтан XP томьёо: n дэх гүйцэтгэл (n≥1) = `max(ceil(baseXp*0.1), floor(baseXp * m^(n-1)))`, `m` = `repeatXpMultiplier` (default 0.5). Тест: base 40 → 40, 20, 10, 4, 4, 4. | [U] |
| SQ-3 | Дэлхий бүрийн хамгийн өндөр side quest XP < тухайн дэлхийн хамгийн бага main quest XP (PRD §6). | [C] |
| SQ-4 | Anti-grind: 3 дахь давталтаас хойшхи side quest-ийн XP/минут < тухайн дэлхийн main quest-ийн дундаж XP/минут (GAME_DESIGN §Anti-grind). | [C] |
| SQ-5 | `sideQuestStats[id]` нь `completions` (тоо) ба `lastCompletedAt` (ISO-8601) хадгална. | [U] |

### 4.5 Study Dungeon — AC-DG

| ID | Шалгуур | Төрөл |
|---|---|---|
| DG-1 | Dungeon бүр: 1–3 `tutorialRefs` (title + url + minutes), `estimatedMinutes`, нэг `conceptGoal`, ≥1 mastery асуулт, асуулт бүрт зөв хариултын **тайлбар**. | [C] |
| DG-2 | Tutorial нээх нь **0 XP** олгоно (PRD §10). | [U] |
| DG-3 | Mastery тэнцэх босго = зөв хариултын ≥70% (дээш нь бүхэлчилнэ). Тэнцвэл dungeon XP нэг удаа олгоно; давтан тэнцвэл 0 XP. | [U] |
| DG-4 | Унасан оролдлого хязгааргүй дахин оролдох боломжтой; гаралт нь буруу хариулт бүрийн тайлбар + дараагийн алхмыг харуулна, зөвхөн "Failed" гэж бичихийг хориглоно (GAME_DESIGN §Failure UX). | [U][S] |

### 4.6 Өдрийн даалгавар — AC-DM

| ID | Шалгуур | Төрөл |
|---|---|---|
| DM-1 | `pickDailyMission(state, date, contentPack)` нь **детерминистик**: ижил оролтод ижил гаралт. | [U] |
| DM-2 | Хэзээ ч `boss`/`raid` track сонгохгүй; дууссан давтагдахгүй quest сонгохгүй; сонгох боломжтой ≥2 нэр дэвшигч байвал өмнөх өдрийн id-г давтахгүй (PRD §11). | [U] |
| DM-3 | Эрэмбэ: (1) одоо боломжтой дуусаагүй main quest → (2) dungeon → (3) side quest. Аль нь ч байхгүй бол `null` буцаана, UI нь "Rest day" харуулна. | [U] |

### 4.7 Санамсаргүй тохиолдол — AC-ENC

| ID | Шалгуур | Төрөл |
|---|---|---|
| ENC-1 | PRD §12-ийн **5 төрөл** контентод байх ба тус бүр ≤2 минутын биелэх боломжтой үйлдэлтэй (`callToAction` хоосон биш). | [C] |
| ENC-2 | Тохиолдол нь seed-тэй RNG-ээр гарна: ижил seed = ижил дараалал; нэг claim-д хамгийн ихдээ 1 тохиолдол. | [U] |

### 4.8 Project Forge — AC-PJ

| ID | Шалгуур | Төрөл |
|---|---|---|
| PJ-1 | Төсөл бүр PRD §13-ийн **10 milestone**-ийг яг тэр дарааллаар агуулна. | [U] |
| PJ-2 | Төсөл `notes`, `nextAction`, `completedAt`, сонголтоор `evidenceRef`, `selfScore` (0..10; хүрээнээс гадуур утга `INVALID_INPUT`) хадгална. | [U] |
| PJ-3 | Milestone дуусгах нь 25 XP-г төсөл тус бүрийн milestone тус бүрд **нэг удаа** олгоно; дахин тэмдэглэхэд XP нэмэгдэхгүй. | [U] |
| PJ-4 | 10 milestone бүгд дуусахад төсөл `completed` төлөвт орж `PROJECT_COMPLETED` event гарна. | [U] |

### 4.9 Boss ба үнэлгээ — AC-BS

| ID | Шалгуур | Төрөл |
|---|---|---|
| BS-1 | 6 ангилал (`story, editing, camera, visualCraft, animation, audioPost`), тус бүр 0..10 бүхэл тоо; гадуур утга `INVALID_INPUT`. | [U] |
| BS-2 | Нийлбэрээр: `<35` = унасан, `35..44` = `mvp`, `45..51` = `advanced`, `≥52` = `mastery` (PRD §14). Хил дээрх тестүүд: 34, 35, 44, 45, 51, 52. | [U] |
| BS-3 | Унасан үр дүн нь хамгийн сул ангиллыг нэрлэж, тухайн tag-тай side quest-ийг санал болгоно. Формат: `Attempt logged. Weakest category: {Category}. Recommended side quest: {Title}.` | [U] |
| BS-4 | Оролдлого бүр (тэнцсэн эсэхээс үл хамааран) огноо + оноогоор түүхэнд бүртгэгдэнэ. | [U] |
| BS-5 | UI нь оноог "гэрчилгээ биш, дасгалжуулах хэрэгсэл" гэдгийг ил бичнэ (PRD §14). | [S] |

### 4.10 Эдийн засаг, loot, амжилт — AC-EC / AC-ACH

| ID | Шалгуур | Төрөл |
|---|---|---|
| EC-1 | Coin ба loot нь **зөвхөн cosmetic**: каталог дахь item бүрийн `effect` нь `"cosmetic"`; домэйн функц coin/loot-оос XP, stamina, unlock-д хамаарахгүй (импорт шалгах тест). | [U][C] |
| EC-2 | Loot унах нь seed-тэй RNG-ээр детерминистик; inventory давхардахгүй (ижил id дахин нэмэгдэхгүй). | [U] |
| ACH-1 | **≥12** амжилт, тус бүр төлөвөөс машинаар шалгагдах предикаттай; төлөв өөрчлөгдөх бүрд шалгагдаж, нэг удаа л олгогдоно. | [U][C] |
| ACH-2 | Streak: `current`, `best`, `lastQualifiedDate`. Өдөрт ≥1 quest/dungeon дуусгавал тухайн өдөр тооцогдоно; өдөр алгасвал `current=1`-ээс дахин эхэлнэ; `best` хэзээ ч буурахгүй. | [U] |

### 4.11 Хадгалалт — AC-SV

| ID | Шалгуур | Төрөл |
|---|---|---|
| SV-1 | Save payload нь `schemaVersion`-той. `v(n-1) → v(n)` migration бүртгэлтэй; хуучин хувилбарын fixture ачаалахад автоматаар шилжиж, шинэ хувилбараар буцаж хадгалагдана. | [U][I] |
| SV-2 | Гэмтсэн/задлагдахгүй save → апп унахгүй, шинэ тоглоом эхлүүлж, гэмтсэн хуулбарыг `save.corrupt.<ts>` түлхүүрт хадгална, UI сануулга харуулна. | [U][I] |
| SV-3 | Бичилт debounce ≥500ms; "сүүлд хадгалсан" хугацаа UI-д харагдана. | [U][S] |
| SV-4 | Export нь бүтэн төлөв + `schemaVersion` агуулсан JSON файл татна. Import нь схемээр шалгаж, буруу файлыг шалтгаантай татгалзана, **одоогийн төлвийг устгахгүй**. | [U][S] |
| SV-5 | Round-trip: export → import → төлөв deep-equal. | [I] |
| SV-6 | Интеграци: quest claim → XP өөрчлөгдөх → save → reload → ижил төлөв (TECH_SPEC §Testing). | [I] |

### 4.12 Backend — AC-BE

Бүрэн контракт: `contracts.yaml`.

| ID | Шалгуур | Төрөл |
|---|---|---|
| BE-1 | `contracts.yaml`-д тодорхойлсон бүх endpoint хэрэгжсэн; хариу нь схемд нийцнэ (contract test). | [I] |
| BE-2 | `POST /api/players` нь нэргүй тоглогч үүсгэж `{playerId, token}` буцаана. Ямар ч PII (и-мэйл, нэр, IP лог) хадгалахгүй. | [I] |
| BE-3 | `GET /api/players/{id}/save` — байхгүй бол 404. `PUT` нь `If-Match` ETag шаардана; хуучирсан ETag → 409. | [I] |
| BE-4 | Бүх `/api/players/{id}/**` зам нь `Authorization: Bearer <token>` шаардана: token байхгүй → 401; өөр тоглогчийн id → 403. (Итгэлцлийн хил — хялбаршуулахыг хориглоно.) | [I] |
| BE-5 | Хүсэлтийн бие схемээр шалгагдана: буруу бол 400 + талбарын алдаа; биеийн хэмжээ >1MB → 413. | [I] |
| BE-6 | `GET /api/content/pack` нь `ETag` + `Cache-Control` буцаана; `If-None-Match` таарвал 304. | [I] |
| BE-7 | Backend унтарсан үед frontend ажиллана: localStorage-аас ачаалж, бүх функц ажиллана; дараагийн амжилттай холболтод sync хийнэ (last-write-wins). | [I] |
| BE-8 | Save нь SQLite файлд хадгалагдана; процесс restart хийсний дараа өгөгдөл хэвээр. | [I] |
| BE-9 | `GET /api/health` → 200 `{status:"ok", version}`. | [I] |

### 4.13 UI ба хүртээмж — AC-UI / AC-A11Y

| ID | Шалгуур | Төрөл |
|---|---|---|
| UI-1 | Дараах дэлгэцүүд бүгд байх ба шилжих боломжтой: Camp, Main Quest Board, Side Quest Board, Study Dungeons, Skill Tree, Project Forge, Achievements, Settings (BUILD_PLAN §Phase 3). | [S] |
| UI-2 | Camp нь: одоогийн rank/level/XP bar, stamina, өдрийн даалгавар, streak, дараагийн төслийн үйлдлийг нэг дэлгэцэнд харуулна (GAME_DESIGN §Session loop). | [S] |
| UI-3 | `web-app/src/ui/**` дотроос `core/**` руу шууд импорт хийхийг хориглоно (зөвхөн `services/**` дамжина) — импорт сканнердсан тест унана. | [U] |
| UI-4 | Smoke: апп ачаалагдана, бүх таб нээгдэнэ, quest эхэлж дуусна, XP өөрчлөгдөнө, reload төлөв хадгална, export/import ажиллана, консолд uncaught алдаа **0** (TECH_SPEC §Release smoke test). | [S] |
| A11Y-1 | Интерактив элемент бүр гарнаас ажиллана (Tab дараалал логик, Enter/Space идэвхжүүлнэ), фокус ил харагдана (контраст ≥3:1). | [A][S] |
| A11Y-2 | `prefers-reduced-motion` хүндэтгэнэ; Settings дэх `reducedMotion` нь бүх анимацийг унтраана. | [A][S] |
| A11Y-3 | Төлөв мэдээлэл зөвхөн өнгөөр дамжихгүй (текст эсвэл дүрс хамт). | [A] |
| A11Y-4 | Текстийн контраст ≥4.5:1; 360px, 768px, 1280px өргөнд хэвтээ гүйлгэлт үүсэхгүй. | [A] |
| A11Y-5 | Дуу шаардлагагүй: дууг бүрэн унтраасан үед бүх функц ажиллана. | [S] |
| A11Y-6 | Үндсэн дэлгэц бүр дээр автомат a11y шалгалт (axe) — **critical зөрчил 0**. | [A] |

### 4.14 Чанарын хаалга — AC-Q

| ID | Шалгуур | Төрөл |
|---|---|---|
| Q-1 | `cd web-app && npm test` — typecheck + lint + unit/integration тест бүгд дамжина. | [U][I] |
| Q-2 | `cd server && npm test` — typecheck + lint + contract/integration тест бүгд дамжина. | [I] |
| Q-3 | `cd web-app && npm run build` — production build амжилттай, warning-гүй. | [S] |
| Q-4 | TECH_SPEC §Testing-д нэрлэсэн бүх сэдэв тесттэй: XP босго, stamina, combo, давтагдах side quest, prerequisites, dungeon scoring, achievements, projects, save migration, export/import. | [U] |
| Q-5 | Цэвэр машин дээр `npm ci` → тест → build дараалал ажиллана (BUILD_PLAN §Phase 6). | [S] |

---

## 5. Хучилтын матриц (эх шаардлага → шалгуур)

| Эх шаардлага | Хамрах AC |
|---|---|
| PRD §1 Product / §2 Principles | UI-2, MQ-6, DG-2, SQ-4, SV-1, DG-4, PJ-1 |
| PRD §3 MVP acceptance | PRG-1…6, STA-1…4, MQ-1…6, SQ-1…5, DG-1…4, DM-1…3, EC-1…2, ACH-1…2, PJ-1…4, BS-1…5, SV-1…6, UI-1…4 |
| PRD §4 Learning domains | MQ-1, SQ-1 (tags нь 7 домэйныг бүрэн хамарна — [C] шалгалт: домэйн тус бүрт ≥2 quest) |
| PRD §5 Campaign | MQ-1, MQ-2 |
| PRD §6 Side quests | SQ-1…SQ-5 |
| PRD §7 Progression | PRG-1, PRG-2, PRG-3 |
| PRD §8 Resources | PRG-3, PRG-5, STA-1…3, EC-1, EC-2 |
| PRD §9 Quest requirements | MQ-5, MQ-6, `contracts.yaml#QuestDefinition` |
| PRD §10 Study Dungeons | DG-1…DG-4 |
| PRD §11 Daily missions | DM-1…DM-3 |
| PRD §12 Random encounters | ENC-1, ENC-2 |
| PRD §13 Project Forge | PJ-1…PJ-4 |
| PRD §14 Bosses | BS-1…BS-5 |
| PRD §15 Accessibility | A11Y-1…A11Y-6 |
| PRD §16 Save requirements | SV-1…SV-6, `contracts.yaml#GameState` |
| PRD §17 Non-goals | §6 «Хамрах хүрээнээс гадуур» |
| GAME_DESIGN §Core/Session loop | UI-1, UI-2, DM-1 |
| GAME_DESIGN §Feel | UI-1, EC-1 |
| GAME_DESIGN §Anti-grind | SQ-3, SQ-4 |
| GAME_DESIGN §Failure UX | DG-4, BS-3 |
| TECH_SPEC §Architecture / structure | §1 хүснэгт, Q-1, Q-2 |
| TECH_SPEC §Domain state / Quest schema | `contracts.yaml` схемүүд, D-1…D-4 |
| TECH_SPEC §Domain rule | D-1, D-2, UI-3 |
| TECH_SPEC §Persistence | SV-1…SV-5, BE-7 |
| TECH_SPEC §Testing | Q-1, Q-2, Q-4, SV-6, UI-4 |
| BUILD_PLAN §Phase 0…6 | Q-1…Q-5, UI-1, `plan.md` шатанд дараалал болно |
| AGENT_ORCHESTRATION §File ownership/Rules | §1 хавтасны бүтэц; `plan.md` шатанд ажлын хуваарь болно |
| AGENT_ORCHESTRATION §Human approval | Таамаглал A8 |
| Хүн: "full game with frontend and backend" | §1 хүснэгт, BE-1…BE-9 |
| Хүн: "study disguised as a game with side quests" | MQ-6, DG-1…DG-4, SQ-1…SQ-5 |
| Хүн: "don't push randomly" | §7 Хүргэлтийн дүрэм |

---

## 6. Хамрах хүрээнээс гадуур (PRD §17)

Multiplayer · хэрэглэгчийн бүртгэл/нууц үг · cloud sync (A2/A4-ийн нэргүй нөөцлөлтөөс өөр) ·
marketplace · гуравдагч талын analytics · Blender-тэй real-time холболт · нийгмийн сүлжээ ·
hosting/CI тохиргоо (A7) · мобайл нативе апп.

⚠ Эдгээрийн аль нэгийг хэрэгжүүлэх нь **спекийн өөрчлөлт** бөгөөд хүний зөвшөөрөл шаардана.

---

## 7. Хүргэлтийн дүрэм

- Ажил зөвхөн `issue/personal-1` салбарт commit хийгдэнэ; `main` руу шууд push хийхгүй.
- Хүний ил хүсэлтгүйгээр санамсаргүй push/PR үүсгэхгүй (хүний шаардлага).
- Баримт репод `docs/PERSONAL-1/` дор, толгойдоо гарал үүслийн мөртэй байна.

---

## 8. Нээлттэй асуулт (блоклохгүй — таамаглалаар үргэлжилсэн)

1. Backend нь зөвхөн контент+save хадгалагч (A1) мөн үү, эсвэл дүрмийг сервер тал шийдэх үү?
   Хожим action-based болговол `shared/` домэйн дахин ашиглагдана.
2. Нэргүй `playerId` (A2) хангалттай юу, эсвэл хэрэглэгч нэрээр сэргээх боломж хэрэгтэй юу?
3. `tutorialRefs`-ийн эх сурвалжийг хэн батлах вэ (A8) — контент шатанд хүний баталгаа шаардлагатай.
4. UI-ийн хэл англи (A6) хэвээр үлдэх үү, эсвэл монгол орчуулга хэрэгтэй юу?

Эдгээрийн аль нь ч энэ спекийн бүтэц, AC-уудыг үндсээр нь өөрчлөхгүй тул ажил зогсоосонгүй.
