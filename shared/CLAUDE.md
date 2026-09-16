<!-- PERSONAL-1 · doc · Код + тест · 2026-09-15 -->

# `shared/` — домэйн цөм

Хоёр гадаргуу (`web-app`, `server`) ижил эх кодыг импортлоно. Энэ хавтас нь тоглоомын
дүрмийн **ЦОРЫН ГАНЦ** хувилбар (`plan.md` BE-10).

## Хатуу хориг

- **Гадаад хамааралгүй.** `package.json` байхгүй. `npm` сангаас импортлохгүй.
- `core/**` дотор `Date.now(` · `new Date(` · `Math.random(` · `localStorage` ·
  `process.` · `fetch(` — бүгд хориотой. Цаг ба санамсаргүй нь `Ctx`-ээр дамжина
  (`plan.md P-5`). `architecture.test.ts` шалгана.
- `core/**` нь `content/**`-ыг импортлохгүй; контент нь `Ctx.pack`-аар ирнэ.
- `content/**` нь зөвхөн өгөгдөл + угсрах функц; дүрэм агуулахгүй.
- `core/{progression,stamina,quests,dungeons}.ts` нь `coins`/`inventory`-г ХӨНДӨХГҮЙ —
  эдийн засаг `economy.ts`-д тусгаарлагдсан (AC EC-1).
- **Хүчний хориг (`spec.md D-6` · AC MST-5 · RET-6).** `mastery` · `reputation` ·
  `campLayout` · `replayLog` нь XP · stamina · coin · loot · quest/dungeon-ийн
  нээлтэд НӨЛӨӨЛӨХГҮЙ. Прогрессийн модулиуд эдгээр талбарыг УНШИХГҮЙ —
  `architecture.test.ts`-ийн сканнер уншилт олдвол УНАНА.
  - ИЛ зөвшөөрөгдсөн үл хамаарах ГУРАВ: `skillTree.ts` (tier-2/3 node-ийн нээлт —
    AC SKL-2), `cosmetics.ts`, `achievements.ts`. Гурвуулаа mastery-г `mastery.ts`-ийн
    **`trackOf(state, tag)`**-оор л уншина (lld.md §4.2 A-LLD2-1): `state.mastery[x]?.…`
    гэж гараар анхдагч бичих нь хоёр дахь уншилтын зам үүсгэх тул сканнердагдана.
  - `campLayout`-ыг зөвхөн `cosmetics.ts` бичнэ; `replayLog`-д зөвхөн
    `appendReplay` нэмнэ, түүнийг зөвхөн `boss.ts` дуудна (plan.md P-24).
  - Эсрэг чиглэл (Сканнер B · lld.md §2): `mastery.ts` · `reputation.ts` ·
    `chains.ts` · `cosmetics.ts` · `replayLog.ts` нь `xp` · `level` · `skillPoints` ·
    `stamina` · `coins` · `inventory` · `completed*Ids`-д **бичихгүй**. `chains.ts`
    нь bonus XP-ээ `addXp`-ээр олгоно (AC RET-2), талбарт шууд биш.
  - `dungeonStats` ба `completedDungeonIds` нь ХАМТ, `dungeons.ts → markDungeonPassed`
    ганц замаар бичигдэнэ (lld.md §6.8 Δ-1) — `quests.ts` ч түүгээр дамжина.
  - `GUILD_IDS` нь `core/constants.ts`-д; `save/migrations.ts` нь `content/guilds.json`-ийг
    ИМПОРТЛОХГҮЙ (lld.md §5.3). Тогтмол ба контентын зөрүүг `[C]` дүрэм C-07 хаана.
  - `dungeonStats:`-ийн бичигчид нь ЯГ дөрөв — `core/dungeons.ts` (домэйн),
    `save/serialize.ts` (`newGame`), `save/migrations.ts` (v1→v2), `validate/schemas.ts`
    (схемийн хэлбэр). Сканнер нь `shared/core` биш **`shared` БҮХЭЛДЭЭ**-г гүйнэ;
    жагсаалтад байгаа файл бүр үнэхээр бичдэг байх ёстой (идэвхгүй зөвшөөрөл хоригтой).

## Огноо харьцуулах — `Z`-ээс өөрөөр ирвэл ҮГҮЙ гэж хариул

`schemas.ts`-ийн `dateTime()` нь `(Z|[+-]\d{2}:\d{2})`-ийг зөвшөөрдөг тул
import/crafted action-ийн замаар **офсеттой** мөр орж ирж чадна. ISO мөрийн
лексикографик эрэмбэ нь ЗӨВХӨН ижил бүсэд цаг хугацааны эрэмбэтэй таарна:
`2026-03-11T01:00:00+07:00` нь бодитоор `2026-03-10T18:00Z` — мөрөөр «том»,
агшнаар «бага». `chains.ts → completedInOrder` нь `Z`-ээр төгсөөгүй мөр тааралдвал
`false` буцаана (`RET-2`-ийн чанд дараалал). Огноогоор дарааллын шийдвэр гаргах
ШИНЭ код мөн адил хийнэ — «дуусаагүй» нь худал шагналаас хямд.

## Татгалзлын ДАРААЛАЛ — бүтцийн саад нөөцийнхөөс ӨМНӨ

`setCampLayout` (lld.md §6.4) нь гэрээ: 1) түлхүүрийн багц → 2) үл мэдэгдэх id →
3) буруу үүр → 4) нээгдээгүй (`PREREQ_NOT_MET`). Тиймээс олон элементтэй оролтыг
шалгахдаа **бүх** элементийн бүтцийн шалгалтыг эхлээд гүйлгэ, дараа нь нөөцийнхийг.
Элемент тутмаар бүх шалгалтыг зэрэг хийвэл эхний элементийн нөөцийн саад нь
сүүлийн элементийн бүтцийн саадыг дарж, дуудагчид ТАНДАЖ болохгүй шалтгаан очно.

## Контентын царцаалт

`validate/content-rules.ts`-ийн `PERSONAL_1_SKILL_IDS` ба `PERSONAL_1_SKILL_TEXT` нь
PERSONAL-1-ийн 24 node-ийн `id · title · description · cost · tier`-ийг царцаана
(`[C]` дүрэм C-06). `title`/`description`-ийг «хоосон биш» гэж л шалгах нь v1
тоглогчийн танидаг нэрийг чимээгүй солих зам — үг үсгээрээ тулгагдана.

`dailyMission.ts`-ийн refresher нь үндсэн pool-ынхтой ИЖИЛ түвшний хаалга
(`levelRequired <= state.level`) ба ИЖИЛ эрэмбэ (`world → levelRequired → id`)
ашиглана (lld.md §6.9).

## Event-ийн дараалал бол ГЭРЭЭ, тестээр хаагдсан

`events` массивын дараалал нь FX ба `aria-live`-ийн ЦОРЫН ГАНЦ оролт (`lld.md §9.3`)
тул төлөвт нөлөөгүй ч тоглогчид ШУУД харагдана. `lld.md §7.1…§7.3`-ын дараалал:

- `claimQuest`: stamina → XP → бүртгэл → mastery → reputation → chain → streak →
  шагнал → тохиолдол → амжилт. `QUEST_COMPLETED` нь `MASTERY_LEVEL_UP`-аас ӨМНӨ.
- `attemptBoss`: `BOSS_ATTEMPT_LOGGED` → `XP_GAINED` → `BOSS_PASSED` → mastery → rep
  → амжилт. Ялалтын FX-ийг `BOSS_PASSED` асаадаг тул XP нь түүнээс ӨМНӨ урсана.
- mastery ба reputation нь ҮРГЭЛЖ амжилтын үнэлгээнээс ӨМНӨ — эс бөгөөс
  `masteryLevel`/`guildRank` предикаттай амжилт нэг үйлдэл ХОЦРОНО.

Индексийн тестүүд: `tests/unit/core/rollup.test.ts` · `boss.test.ts`.

## Migration нь оролтод ИТГЭХГҮЙ

`save/migrations.ts`-ийн алхам бүр `{ ...a, шинэ_талбар: анхдагч }` — spread нь
ЭХЭНД. Эсрэгээр бичвэл оролтын утга ноёрхоно.

⚠ Яагаад энэ нь бодит эмзэг байдал вэ: `loadState` нь схемийн шалгалтыг migration-ий
ДАРАА, v2 схемээр хийдэг (`save/serialize.ts`). Тиймээс `schemaVersion: 1` гэж
тэмдэглэсэн, гараар зохиосон файл нь v1 схемд БАЙХГҮЙ талбарыг (ж: `difficulty:
'hard'`) агуулж чадна. Импортын зам дээр цорын ганц хамгаалалт нь энэ дарааллах.

## Загвараас ил зөрсөн ХОЁР цэг (санамсаргүй биш)

- **`chains.ts → bonusWithinCeiling` нь домэйнд ҮЛДСЭН.** `lld.md §6.3` нь таазыг
  «`[C]` дүрэм, домэйн шалгалт БИШ» гэж шийдсэн. Код түүнийг `[C]` дүрэмд
  хэрэгжүүлсэн БӨГӨӨД домэйнд ХОЁР ДАХЬ хамгаалалт болгон үлдээв: татгалзал нь
  тоглогчийн үйлдэлд БИШ (`DomainResult` буцаахгүй), зөвхөн хүчингүй пакетын bonus-ыг
  алгасна. Хүчинтэй контент дээр ажиглагдах ялгаа ТЭГ. Устгах бол
  `tests/unit/core/chains.test.ts`-ийн `RET-3` блокыг хамт устгана.
- **Сканнер A нь `./mastery.ts`-ийн ИМПОРТЫГ хориглодоггүй.** `lld.md §2`-ийн текст
  түүнийг нэрлэсэн ч `§7.1` нь `quests.ts`-д `addMasteryXp`-ийг ШААРДДАГ — загварын
  дотоод зөрчил. Код нь ажиллах хувилбарыг (талбарт хүрэхийг хориглох, импортыг биш)
  сонгож `architecture.test.ts`-д баримтжуулав.

## Хэлбэр

Домэйн функц бүр цэвэр: `(state, input, ctx) → DomainResult`
(`{ok:true, state, events}` эсвэл `{ok:false, reason}`). `ok:false` үед `state` БУЦАХГҮЙ —
дуудагч өмнөх төлвийг хэвээр хадгална.

## Импортын хэлбэр

Файлын өргөтгөлийг ЗААВАЛ бичнэ (`./constants.ts`) — Node-ийн type-stripping шаарддаг.
