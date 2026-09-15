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

## Хэлбэр

Домэйн функц бүр цэвэр: `(state, input, ctx) → DomainResult`
(`{ok:true, state, events}` эсвэл `{ok:false, reason}`). `ok:false` үед `state` БУЦАХГҮЙ —
дуудагч өмнөх төлвийг хэвээр хадгална.

## Импортын хэлбэр

Файлын өргөтгөлийг ЗААВАЛ бичнэ (`./constants.ts`) — Node-ийн type-stripping шаарддаг.
