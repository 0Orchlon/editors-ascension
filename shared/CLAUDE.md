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

## Хэлбэр

Домэйн функц бүр цэвэр: `(state, input, ctx) → DomainResult`
(`{ok:true, state, events}` эсвэл `{ok:false, reason}`). `ok:false` үед `state` БУЦАХГҮЙ —
дуудагч өмнөх төлвийг хэвээр хадгална.

## Импортын хэлбэр

Файлын өргөтгөлийг ЗААВАЛ бичнэ (`./constants.ts`) — Node-ийн type-stripping шаарддаг.
