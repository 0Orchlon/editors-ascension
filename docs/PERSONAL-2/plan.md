<!-- PERSONAL-2 · plan · Төлөвлөгөө + Tasks · 2026-09-16 -->

# Editor's Ascension — Хэрэгжүүлэлтийн төлөвлөгөө (PERSONAL-2)

**Систем:** EDITORSASC · **Репо:** `0Orchlon/editors-ascension` · **Салбар:** `issue/personal-2`
**Эх баримт:** `docs/PERSONAL-2/spec.md` (хүлээн авах шалгуур — 62 AC), `docs/AAA-SPEC.md`
(эх шаардлага), `docs/PERSONAL-1/{spec,plan,lld,contracts}` (эрх бүхий суурь).
Ажлын нэгжийн задаргаа нь `docs/PERSONAL-2/tasks.md`.

Энэ баримт нь **ямар дарааллаар, ямар хил хязгаартай** хийхийг тогтооно. Ямар шалгуур
хангахыг `spec.md` шийдсэн — энд шалгуурыг ДАХИН тодорхойлохгүй, зөвхөн лавлана
(`VIS-1`, `MST-4` гэх мэт). **Шинэ AC энэ баримтад нэмэгдээгүй** — PERSONAL-1-ийн
`plan.md §8`-тай адил нэмэлт шалгуурын бүлэг байхгүй.

**Бүтэц.** `§1…§10` нь дараалал, хил, шийдвэр, эрсдэл. `§11…§14` нь тэдгээр шийдвэрийн
**бичиж болохуйц хэлбэр**: схемийн дельта, функцийн гарын үсэг, томьёо, action/event-ийн
payload, палитрын токен ба FX бүртгэл. `§15` нь тестийн төсөв, `§16` нь одоогийн кодыг
уншсанаар илэрсэн 5 зөрүү ба тэдгээрийн шийдэл. Хэрэгжүүлэгч `§11…§14`-ээс ГАДУУР
схем, талбар, токен ЗОХИОХГҮЙ — шаардлага гарвал `§9`-ийн дүрмээр `T-01`-ээс эхэлнэ.

---

## 1. Юу өөрчлөгдөж байгаа — нэг догол мөрөөр

Одоо байгаа MVP (19 main quest + 1 boss, 20 side quest, 16 dungeon, 24 skill node,
21 амжилт, 18 loot, 8 encounter; 439 + 76 тест) дээр **шинэ контент бичихгүйгээр
гүн нэмэх** систем давхарга суулгана: mastery track, guild reputation, side quest
chain, boss hard mode, skill tree v2, cosmetic каталог + Trophy Room, дэлхий тутмын
өнгөний палитр, хариу үйлдлийн (juice) давхарга. Контентоос зөвхөн **схем шаарддаг
хэсэг** нэмэгдэнэ (4 boss, 4 guild, ≥3 chain, ≥60 cosmetic, ≥19 амжилт, skill node
≥4) — Wave 3-ын quest/dungeon хэмжээ ОРОХГҮЙ (`spec.md §1` S-1).

## 2. Архитектурын хил — ӨӨРЧЛӨГДӨХГҮЙ

PERSONAL-1 `plan.md §1`-ийн хамаарлын чиглэл бүрэн хүчинтэй хэвээр:

```
web-app/ui/  →  web-app/services/  →  shared/core/  →  shared/{types,validate}
server/src/  →  shared/core/       →  shared/{types,validate}
shared/content/ (зөвхөн өгөгдөл)   →  shared/types
```

Шинэ систем бүр **`shared/core/**`-д ганц хувилбартай** (`OFF-7`, BE-10). UI давхаргад
дүрэм давхардуулах нь `architecture.test.ts`-ийг унагаана (`QX-7`).

**Шинэ файлууд ба тэдгээрийн байршил:**

| Шинэ зүйл | Хаана | Яагаад тэнд |
|---|---|---|
| `mastery.ts` · `reputation.ts` · `chains.ts` · `cosmetics.ts` | `shared/core/` | Тоглоомын дүрэм — клиент ба сервер ижил кодыг ажиллуулна (`OFF-7`) |
| `guilds.json` · `cosmetics.json` · `chains.json` | `shared/content/` | Зөвхөн өгөгдөл; `core`-ыг импортлохгүй |
| `theme.ts` (палитрын токенийн хүснэгт) | `web-app/src/ui/` | Харагдах байдал — домэйн БИШ. Контрастын тест ЭНЭ хүснэгтээс тооцно (`VIS-2`) |
| `fx.ts` (event → анимац + дуу бүртгэл) | `web-app/src/ui/` | `sound.ts`-ийг ОРЛОХГҮЙ, өргөтгөнө (`FX-1`, `FX-5`) |
| `screens/trophies.ts` | `web-app/src/ui/screens/` | 9 дэх маршрут (`COS-3`) |
| `scripts/validate-content.mjs` | `web-app/` | `npm run validate:content` (`QX-5`) |

⚠ `shared/` нь **гадаад хамааралгүй** хэвээр (`package.json` БАЙХГҮЙ).
⚠ `web-app/package.json → dependencies` **хоосон** хэвээр (`OFF-4`) — шинэ runtime
хамаарал нэмэх нь task-ийг УНАГААНА.

## 3. Дараалал — долоон давалгаа

```
W0 Суурь ба хаалга (contracts v1.2.0 · bundle baseline · validate CLI · OFF сканнер)
   │                                  ← хаалга ЭХЛЭЭД улаан болж, дараа нь хамгаална
W1 Схем ба migration (shared/{validate,types,save})
   │                                  ← БҮХ зүйлийн урьдчилсан нөхцөл
   ├──────────────────────────┐
   │                          │
W2 Домэйн (shared/core)   W3 Контент (shared/content)     ← ХОЁР ПАРАЛЛЕЛЬ (өөр хавтас)
   │                          │
   └────────────┬─────────────┘
                │
        ┌───────┴────────┐
        │                │
    W4 Сервер        W5 UI + визуал                       ← ХОЁР ПАРАЛЛЕЛЬ
        │                │
        └───────┬────────┘
                │
        W6 Офлайн интеграци (OFF-1, OFF-5, OFF-6)
                │
        W7 Чанарын хаалга (QX-1…QX-7, регресс)
```

**Яагаад W0 эхэнд:** `QX-3` (bundle ≤130%) нь суурь хэмжээг **өөрчлөлтийн ӨМНӨ**
хэмжихийг шаарддаг — код нэмсэн хойно хэмжвэл шалгуур утгагүй болно. Мөн `OFF-2…OFF-4`
сканнер нь одоо ногоон: тэдгээрийг эхэнд суулгавал дараагийн task бүр зөрчил
оруулмагц УНАНА — хойно шалгах биш, тухайн мөчид нь хаана.

**Яагаад W2 ба W3 параллель:** домэйн нь контентыг `Ctx.pack`-аар авдаг тул кодоос
хамаарахгүй; контент нь схемээс (W1) хамаарна. Хоёулаа W1 дуусах хүртэл эхлэхгүй.

**Яагаад W5 нь W2-оос хойно:** UI нь `gameService`-ээр дамжин домэйны `*View` уншина;
домэйнгүй бол харуулах зүйл байхгүй.

## 4. Давалгаа тус бүрийн зорилго ба гарах хаалга

Хаалга нь **ажиллуулж болох команд** — «дууссан гэж бодож байна» гэдэг хаалга биш.

| Давалгаа | Зорилго | Гарах хаалга | Хамрах AC |
|---|---|---|---|
| W0 | Хэмжилтийн суурь тогтсон, хориглох сканнерууд идэвхтэй | `cd web-app && npm test` ногоон; `npm run validate:content` 0 кодоор гарна; bundle baseline тогтмол бичигдсэн | QX-3 (суурь), QX-5, OFF-2, OFF-3, OFF-4 |
| W1 | Шинэ домэйн схем + save v2 migration бэлэн, хуучин save эвдрээгүй | `cd web-app && npm test`, `cd server && npm test` хоёул ногоон; v1 fixture → v2 migration тест | SVX-1…SVX-4, D-5 |
| W2 | Бүх шинэ дүрэм `shared/core`-д цэвэр функцээр, тесттэй | `cd web-app && npm test` — MST/SKL/BSX/RET/COS бүлгийн [U] тестүүд ногоон | MST-1…6, SKL-2…4, BSX-2…6, RET-2…8, COS-2, COS-4 |
| W3 | Контент пакет шинэ бүтцийн шаардлагыг хангасан | `npm run validate:content` ногоон; [C] тестүүд ногоон | SKL-1, SKL-5, BSX-1, RET-1, RET-7, COS-1, COS-2 |
| W4 | Сервер шинэ action/event-ийг эрх бүхий талаар ажиллуулна | `cd server && npm test` ногоон (76 + шинэ) | QX-2, QX-4, OFF-7 |
| W5 | Дэлхий тутмын палитр, juice давхарга, шинэ дэлгэцүүд ажиллана | `cd web-app && npm test` — [S][A] тестүүд ногоон; axe critical 0 | VIS-1…8, FX-1…7, MST-6, SKL-2/3 (UI тал), BSX-2…5 (UI тал), COS-3 |
| W6 | Сервергүй ба сүлжээгүй нөхцөлд бүх шинэ систем ажиллана | `cd web-app && npm test` — [I] тестүүд ногоон | OFF-1, OFF-5, OFF-6 |
| W7 | Регресс байхгүй, гүйцэтгэл ба хэмжээ төсөвт багтсан | `cd web-app && npm test` (≥439 тест) · `cd server && npm test` (≥76) · `npm run build` warning-гүй | QX-1, QX-3, QX-6, QX-7 |

## 5. Гол техникийн шийдвэрүүд

`spec.md`-ийн таамаглалыг хэрэгжүүлэх хэлбэрт хөрвүүлсэн. **Бүгд блоклохгүй** —
өөрөөр шийдвэл зөвхөн заасан task өөрчлөгдөнө.

| # | Шийдвэр | Үндэслэл | Өөрчилвөл |
|---|---|---|---|
| P-1 | **Cosmetic-ийн нээлт нь ХАДГАЛАГДАХГҮЙ, төлвөөс ГАРГАЖ авна.** `cosmetics.json`-ийн `unlockSource` нь quest/boss/achievement/guild-rank/mastery id-д заана; «нээгдсэн эсэх» нь тухайн эх сурвалж биелсэн эсэхээс тооцогдоно. Save-д `unlockedCosmeticIds` талбар НЭМЭХГҮЙ. | Хоёр эх сурвалж (төлөв + жагсаалт) нь чимээгүй салалт үүсгэнэ; `COS-2` аль хэдийн эх сурвалжийг заавал шаарддаг тул гаргаж авах нь боломжтой. Save схемийн эрсдэл багасна (`SVX-1`). | T-16, T-23, T-30 |
| P-2 | **Boss-ийн хувийн дээд амжилт мөн ГАРГАЖ авна:** `BossAttempt`-д `difficulty` талбар нэмэгдэж, `BSX-3`-ийн дээд амжилт нь `bossAttempts`-ээс `(bossId, difficulty)`-оор max-аар тооцогдоно. Тусдаа `personalBests` талбар байхгүй. | Нэг эх сурвалж; «буурахгүй» шинж нь max-ийн шинж болж өөрөө батлагдана. | T-13 |
| P-3 | **Skill node-ийн үнэ — хоёр валют, tier-ээр хуваагдана:** tier-1 node = 1 `skillPoints` (PRG-5 ӨӨРЧЛӨГДӨХГҮЙ), tier-2/tier-3 node = тухайн `track`-ийн 1 mastery point (`MST-4`). Track таарахгүй бол `PREREQ_NOT_MET`, хүрэлцэхгүй бол `INSUFFICIENT_SKILL_POINTS`. Respec нь төлсөн валютаараа яг бүтнээр буцаана (`SKL-3`). | `MST-4` нь mastery point-ийг skill node-д зарцуулахыг шаарддаг; `SKL-5` нь `cost:1` хэвээр үлдэхийг шаарддаг; `PRG-5` нь `skillPoints`-ийн замыг хадгалахыг шаарддаг. Гурвыг НЭГЭН зэрэг хангах цорын ганц хуваарилалт нь tier-ийн хил. **§7-ийн хүний шийдвэрийн цэг H-1.** | T-14, T-19, T-31 |
| P-4 | **Палитр нь TS хүснэгтээс CSS custom property болж гарна** (`ui/theme.ts`). Контрастын тест ижил хүснэгтийг уншина — CSS-ийг задлан шинжлэхгүй. Дэлхий солигдоход `<html data-world="N">` атрибут л солигдоно. | `VIS-2`-ийн «палитр нэмэхэд тест автоматаар хамарна» шаардлагыг хангах цорын ганц арга нь тестийн уншиж чадах өгөгдөл. `VIS-1`-ийн «DOM өөрчлөгдөхгүй» нь атрибутын сэлгэлтээр биелнэ. | T-27 |
| P-5 | **Juice-ийн ГАНЦ хамгаалалт:** `fx.ts` дотор `play(event)` нэг функц; анимац ба дуу ХОЁУЛАА түүгээр дамжина. `reducedMotion` ба `soundEnabled/soundVolume` шалгалт ЭНД, өөр хаана ч биш. Сканнердсан тест `classList.add`-аар анимацийн класс нэмэх бусад бүх замыг хориглоно. | `FX-2`/`FX-3`-ийн «нэг эх үүсвэр, тусдаа mute зам байхгүй» заалт. Хоёр зам гарвал нэг нь хамгаалалтыг мартана. | T-28 |
| P-6 | **`soundVolume: number (0..1)` нь `settings`-д нэмэгдэнэ** (`updateSettings` payload өргөтгөнө, шинэ action БИШ). `colorBlindSafe: boolean` мөн адил. | `FX-3` нь «эзлэхүүн 0» гэсэн нөхцөлийг нэрлэсэн — хэмжигдэхүйц байхын тулд талбар хэрэгтэй. Шинэ action нэмэх нь дэмий гэрээний гадаргуу. | T-05, T-33 |
| P-7 | **Шинэ `ActionType` ЯГ ГУРАВ:** `prestigeMastery` · `respecTree` · `setCampLayout`. Mastery XP, reputation, chain bonus нь ОДОО байгаа action-уудын (`claimQuest`, `dungeonAttempt`, `bossAttempt`) дотор гарах үр дагавар — шинэ action шаардахгүй. | Хамгийн бага гэрээний өөрчлөлт. Гурав нь тоглогчийн ИЛ сонголт тул action байх ёстой; бусад нь автомат үр дагавар. | T-05, T-18, T-26 |
| P-8 | **Шинэ `DomainEventType` ЯГ ДӨРӨВ:** `MASTERY_LEVEL_UP` · `MASTERY_PRESTIGED` · `REPUTATION_GAINED` · `CHAIN_COMPLETED`. `FX-1`-ийн жагсаалтын бусад 8 event аль хэдийн байдаг. | AC-д нэрлэгдээгүй event нэмэх нь гэрээг спекээс салгана. `FX-1`-ийн бүртгэлийн бүрэн байдлын тест нь ЯГ 12 event-ийг хамарна. | T-05, T-28 |
| P-9 | **`campLayout` нь `GameState`-д** (`SVX-1` шаардсан), гэхдээ домэйн дүрэм түүнийг УНШИХГҮЙ (`D-6`). `COS-4`-ийн тест: талбарыг устгаад ачаалахад бусад утга өөрчлөгдөхгүй. | `SVX-1` migration-д ил нэрлэсэн. `localStorage`-д тусад нь хадгалах нь спектэй зөрчилдөнө. | T-05, T-16 |
| P-10 | **`replayLog`-ийн 500 таслалт нь `shared/core`-ийн ганц туслах функцээр** (`appendReplay`). Бичих бүх зам түүгээр дамжина. | `SVX-2`-ийн FIFO дүрэм олон дуудагчид хуулагдвал нэг нь мартагдана. | T-06, T-13 |
| P-11 | **Bundle хэмжээний тест нь Vitest дотроос Vite-ийн JS API-аар build хийж хэмжинэ.** Гадаргуунд шинэ команд НЭМЭХГҮЙ — `npm test` нэг хэвээр. | Репогийн дүрэм: гадаргуу тутам НЭГ команд. `vite` аль хэдийн devDependency — шинэ хэрэгсэл нэмэхгүй. Үнэ: тест ~секунд удаашрана. | T-02 |
| P-12 | **`validate:content` нь ОДОО байгаа `shared/validate`-ийг дуудна**, шинэ validator бичихгүй. `[C]` дүрэм бүр ганц газар — CLI ба vitest [C] тест НЭГ модулийг дуудна. | `AAA-TOOL-1` «extended, not replaced». Хоёр validator = хоёр үнэн (PERSONAL-1 P-2). | T-03, T-25 |
| P-13 | **Guild = 4, `SkillTag` → guild зураглал нь контентод** (`guilds.json`), кодод биш. 7 tag бүр ЯГ нэг guild-д (`RET-5`). | Нэр, бүлэглэл нь хүний баталгаа хүлээж буй зүйл (§7 H-2); контентод байвал код хөндөхгүйгээр солигдоно. | T-11, T-21 |
| P-14 | **Шинэ маршрут ЯГ НЭГ:** `#/trophies`. Mastery нь тусдаа дэлгэц БИШ — Camp дээр мини bar (`VIS-6`), Skills дэлгэц дээр track таб + prestige (`MST-6`). | 8 дэлгэц → 10 болгох нь навигацийг задална; `MST-6` нь тусдаа дэлгэц шаараагүй. | T-29, T-30, T-31 |
| P-15 | **Dungeon-ийн тэнцсэн огноог хадгална** — `dungeonStats: Record<dungeonId, { lastPassedDate: string \| null }>` шинэ талбар. Migration нь одоо дууссан бүх id-д `null` бичнэ; `null` = refresher-ийн нэр дэвшигч БИШ (дараагийн тэнцэлтээс эхлэн тоологдоно). | `RET-4` нь «≥14 өдрийн өмнө тэнцсэн» гэдгийг шаарддаг ч `completedDungeonIds` нь ЗӨВХӨН id-ийн жагсаалт — огноо БАЙХГҮЙ. `replayLog`-оос гаргах нь `D-6`-г зөрчинө (replayLog нь нээлтэд нөлөөлөхгүй байх ёстой). | T-05, T-06, T-15 |
| P-16 | **Rep-ийн хэмжээний хүснэгт:** `REP_BASE = { main: 3, boss: 3, dungeon: 2, side: 2 }`; `n` дэх гүйцэтгэлийн олголт `floor(base × m^(n-1))`, `m = repeatXpMultiplier ?? 0.5` → side: `2,1,0,0…`. `0` нь «олгохгүй». | `RET-5` нь ЗӨВХӨН `1..3` хязгаар ба SQ-2-ийн буурах шинжийг заасан — яг тоог төлөвлөгөө тогтооно. Бүх эерэг олголт 1..3-д багтана, grind нь тэгд нийлнэ (SQ-4-ийн сүнс). **§7 H-5.** | T-11 |
| P-17 | **Mastery XP = ОЛГОГДСОН XP** (SQ-2-ийн бууралтын ДАРААХ утга), контентын суурь XP БИШ. | `A4`-ийн жишээ (60 XP · 2 tag → track тутамд 60) эхний гүйцэтгэлд яг ижил гарна. Давталтад суурь XP өгвөл mastery нь хязгааргүй grind болж SQ-4-ийн anti-grind таазтай зөрчилдөнө. | T-09 |
| P-18 | **«Тоглоомын өдөр» = `dayOf(at)`-ийн UTC хуанлийн зөрүү.** `daysBetween(a, b)` туслах нь `shared/core/result.ts`-д (`dayOf`-ийн хажууд, шинэ модуль үүсгэхгүй): `(Date.parse(b + 'T00:00:00Z') − Date.parse(a + 'T00:00:00Z')) / 86400000`. Цаг УНШИХГҮЙ тул `QX-7`-ийн детерминизмын хориг зөрчигдөхгүй. | `SKL-3` (7 өдөр) ба `RET-4` (14 өдөр) хоёулаа өдрийн зөрүү шаарддаг; `Date.now()` нь `shared/core`-д хоригтой. Хоёр газар өөрөөр тоолвол нэг нь цагийн бүсэд унана. | T-06, T-14, T-15 |
| P-19 | **`respecAt` нь ГАНЦ талбар** (`string \| null`), мод тутам БИШ. Нэг модыг respec хийхэд бүх модны 7 өдрийн cooldown эхэлнэ. | `SKL-3`-ийн «сүүлийн respec-ээс хойш» гэсэн өгүүлбэр ганц тоолуурын утгатай. Мод тутмын хувилбар нь нэг өдөрт 7 respec зөвшөөрч, cooldown-ийн зорилгыг үгүйсгэнэ. **§7 H-6.** | T-05, T-06, T-14 |
| P-20 | **`masteryPoints` нь ҮЛДЭГДЭЛ**; олдсон НИЙТ нь `Σ_tracks((level − 1) + prestigeCount × 9)`-аар ГАРГАГДАНА, хадгалагдахгүй. Инвариант: `үлдэгдэл + зарцуулсан == олдсон`. Prestige нь өмнө олдсон оноог БУЦААЖ АВАХГҮЙ. | `MST-4` нь «олдсон = нийт level-up» гэж тодорхойлсон ч зарцуулалт байдаг тул хоёр тоо хэрэгтэй. Нэгийг нь гаргаж авбал P-1-ийн зарчмаар салалт үүсэхгүй бөгөөд инвариант нь тестээр хаагдана. | T-05, T-08, T-14 |
| P-21 | **Chain-ийн явцад ШИНЭ талбар ХЭРЭГГҮЙ:** дараалал нь `sideQuestStats[stepId].lastCompletedAt`-аас гарна (4 алхам бүгд бүртгэлтэй БА огноо нь алхмын дарааллаар буурахгүй). Дууссан chain нь `completedChainIds`-д БАЙНГА үлдэнэ. | `RET-2`-ийн «чанд дараалал» ба «нэг л удаа» хоёрыг одоо байгаа төлвөөс бүрэн шалгаж болно. Явцын шинэ талбар нь ижил баримтын хоёр дахь эх сурвалж болно (PERSONAL-1 P-2-ийн алдаа). | T-12 |
| P-22 | **`unlockSource` нь `{ kind, refId, value? }` объект, ЯГ 5 `kind`** (`quest · boss · achievement · guildRank · mastery`). Prestige цол (`MST-3`) ба streak шагнал (`RET-8`) нь ХАРГАЛЗАХ АМЖИЛТАД (`kind: 'achievement'`) заана — шинэ kind НЭМЭХГҮЙ. | `COS-2` нь яг тэр 5 эх сурвалжийг нэрлэсэн. `RET-7` нь prestige/streak предикаттай амжилтуудыг аль хэдийн шаарддаг тул тэдгээр нь бэлэн зангуу — гэрээг өргөтгөхгүйгээр хоёр AC хангагдана. | T-01, T-05, T-23, T-24 |
| P-23 | **Амжилтын предикатад заавал БИШ `ref: string` нэмэгдэнэ** (`value` хэвээр скаляр). `masteryLevel`(ref = `SkillTag`), `guildRank`(ref = guildId), `bossPersonalBest`(ref = bossId); `ref` байхгүй бол «дурын нэг» гэсэн утга. Хувийн дээд амжилт нь хоёр difficulty-гийн НЭГДСЭН багц дээрх max (`total` нь хоёуланд нь 0..60 нэг хуваарьтай). | Одоогийн `predicate.value` нь скаляр — «аль guild», «аль boss» гэдгийг илэрхийлэх газаргүй. Kind тутамд тусдаа талбар нэмэх нь предикатын гэрээг задална. | T-01, T-05, T-17, T-24 |
| P-24 | **`replayLog`-д ЗӨВХӨН boss оролдлого бичигдэнэ** (`BSX-6`). `kind` enum нь `quest · sideQuest · dungeon · boss · chain`-ийг агуулна (Wave 3 схем эвдэлгүй дүүргэнэ), гэхдээ энэ ажилд бичигч нь ГАНЦ: `attemptBoss`. | `BSX-6`-аас өөр ямар ч AC replay бичихийг шаардаагүй — бүх зам дээр бичигч нэмэх нь AC-гүй ажил (`tasks.md`-ийн «AC хоосон task байхгүй» дүрэм). Enum нь S-1-ийн «схем хожим дүүргэгдэнэ» зарчмыг хангана. | T-01, T-06, T-13 |
| P-25 | **`campLayout` = `{ slots: Record<CosmeticSlot, string \| null> }`** (ЯГ 6 түлхүүр). `setCampLayout` нь танихгүй slot/id-д `INVALID_INPUT`, нээгдээгүй cosmetic-д `PREREQ_NOT_MET` буцаана. | `COS-4` нь талбарыг устгаад ачаалахыг шалгадаг тул бүтэц нь тогтмол байх ёстой. Нээгдээгүй зүйлийг зүүх боломж нь Trophy Room (`COS-3`)-ийн утгыг үгүйсгэнэ. | T-05, T-16, T-30 |
| P-26 | **Палитрын токен 9 → 19:** `styles.css`-д ОДОО хатуу бичигдсэн 14 hex (`#2b3648` · `#3a475e` · `#1d2f4d` · `#24406b` · `#16351f` · `#b7f0be` · `#3a2f10` · `#ffe2a3` · `#ccf5d2` · `#55637a` · `#000` …) нь токен болж `theme.ts`-ийн хүснэгтэд шилжинэ. | `VIS-2` нь «БҮХ текст/дэвсгэрийн хос»-ыг шалгана. Хатуу hex үлдвэл контрастын тест тэдгээрийг ХАРАХГҮЙ — шалгуур худал ногоон болж, палитр солиход badge/pip/товч уншигдахгүй болно. | T-27 |

## 6. Эрсдэл ба сааруулалт

| Эрсдэл | Нөлөө | Сааруулалт |
|---|---|---|
| `VIS-2` — 6 палитр × colorblind хувилбар бүрийн бүх хос ≥4.5:1 хангахад өнгө сонгоход удаан эргэлт | W5 сунана | Контрастын тест (`T-27`) нь палитрын өгөгдлөөс ӨМНӨ бичигдэнэ: тест улаанаар эхэлж, өнгө тохируулах бүрд шууд хариу өгнө |
| `QX-3` bundle ≤130% — палитр, FX, 2 шинэ дэлгэц, ≥60 cosmetic нэмэгдэнэ | W7-д хожуу илэрвэл буцаах өртөг өндөр | Суурийг `T-02`-т хэмжиж тестийг ТЭР ҮЕД идэвхжүүлнэ — хэтрүүлсэн task тухайн мөчид улаан болно |
| `QX-1` — 439 тестийн аль нэг нь шинэ талбараас болж унах (fixture-ууд `GameState`-ийг бүтнээр барьдаг) | W1-д олон тест зэрэг улаан болно | `T-06`-ийн migration-той хамт `newGame()` ба тестийн fixture-ийг НЭГ task-д шинэчилнэ (`web-app/tests/unit/core/fixtures.ts`); тестийн ЛОГИК өөрчлөгдөхгүй, зөвхөн анхдагч талбар нэмэгдэнэ |
| `MST-5`/`RET-6`/`D-6` — хүчний хориг нь сканнердсан импортын тестээр хаагдана; шинэ модуль нэр солигдвол сканнер хоосон ажиллаж чимээгүй ногоон болно | Дунд | `T-10`-д «сканнер өөрөө хазна» тест (PERSONAL-1-ийн `the guards actually bite` хэв маяг): санаатай зөрчил тарьж илрүүлэхийг батална |
| `P-3` (skill валютын хуваарилалт) буруу уншилт байвал `SKL-1`…`SKL-5`, `MST-4`, `T-19` контент дахин хийгдэнэ | Өндөр | §7 H-1 — `T-14` эхлэхийн ӨМНӨ хүнээс баталгаа авна. Баталгаагүй бол `T-14`, `T-19`, `T-31` хүлээнэ; бусад бүх task үргэлжилнэ (хамаарал тусгаарлагдсан) |
| `tutorialRefs` (README T-22) нээлттэй хэвээр | Нөлөөгүй | Энэ ажил шинэ dungeon бичихгүй (`spec.md` S-1) — хамаарал ҮГҮЙ |
| Push хийгээгүй ажил алга болно (ажлын хавтас устдаг) | Бүх ажил | Task бүр дуусмагц `issue/personal-2`-т commit + push (`§8` дүрэм 4) |

## 7. Хүн шийдэх цэгүүд

| # | Цэг | Хэзээ | Хариугүй бол |
|---|---|---|---|
| H-1 | **`P-3` — skill node-ийн валютын хуваарилалт** (tier-1 = skillPoint, tier-2/3 = mastery point). `spec.md MST-4` ба `SKL-5`-ийг нэгэн зэрэг хангах уншилт; өөр уншилт байж болно. | `T-14` эхлэхийн өмнө | `T-14`, `T-19`, `T-31` хүлээнэ; `T-01…T-13`, `T-15…T-18`, `T-20…T-37` үргэлжилнэ |
| H-2 | **Guild-ийн нэр ба tag-ийн бүлэглэл** (`spec.md §8 Q2`). AAA-ийн 4 нэр өөрөө түр орлуулагч гэж тэмдэглэгдсэн. | `T-21` дуусахын өмнө | `T-21` нь AAA-ийн 4 нэрээр үргэлжилнэ, файлд «түр орлуулагч» тэмдэглэгээтэй (`README` T-22-ийн хэв маяг) |
| H-3 | **PWA / жинхэнэ офлайн** (`spec.md §8 Q1`). «Тийм» бол `OFF-6`-д шинэ AC нэмэгдэж, шинэ task гарна. | W6 эхлэхийн өмнө | `A1`-ийн таамаглалаар (сервергүй ажиллана) үргэлжилнэ — одоогийн төлөвлөгөө тэр утгаар бичигдсэн |
| H-4 | **Wave 3 контент** дараагийн ажлын нэгж болох эсэх (`spec.md §7`) | Энэ ажил дууссаны дараа | Хамрах хүрээнээс гадуур хэвээр — энэ төлөвлөгөөнд нөлөөгүй |
| H-5 | **Rep-ийн хэмжээний хүснэгт (`P-16`)** — `REP_BASE = {main:3, boss:3, dungeon:2, side:2}` ба давталтын бууралт. `RET-5` нь зөвхөн `1..3` хязгаарыг заасан. | `T-11` дуусахын өмнө | `P-16`-ийн хүснэгтээр үргэлжилнэ; өөрчилвөл ЗӨВХӨН `T-11`-ийн нэг тогтмол ба түүний хүснэгтэн тест солигдоно |
| H-6 | **Respec cooldown нь ГЛОБАЛ уу, мод тутам уу (`P-19`)** — `SKL-3`-ийн «сүүлийн respec» хэллэгийн уншилт. | `T-14` эхлэхийн өмнө | Глобал (`respecAt: string \| null`) гэж үргэлжилнэ; мод тутам болговол `T-05`-ийн схем `Record<SkillTag, …>` болж `T-14`-ийн cooldown шалгалт түлхүүрээр индексжинэ |

⚠ H-1…H-6 нь **блоклогч БИШ**: тус бүрд анхдагч зам тодорхойлогдсон. Зөвхөн H-1 нь
гурван task-ийг түр хүлээлгэнэ, бусад 34 task хөндөгдөхгүй. H-5 ба H-6 нь ганц тогтмол
эсвэл ганц талбарын хэлбэрт хүрдэг тул хариу хожуу ирсэн ч засвар нь нэг task-д багтана.

## 8. Дуусгах тодорхойлолт (task бүрд нийтлэг)

1. Тухайн task-ийн AC-д харгалзах тест бичигдсэн бөгөөд **өмнө нь унаж байсан**
   (хаалга өөрөө хазаж байгаа нотолгоо).
2. Харьяалах гадаргуунийхаа нэг команд ногоон: `cd web-app && npm test` эсвэл
   `cd server && npm test`.
3. **Тестийн тоо буураагүй** — `QX-1`. Тест устгах, `skip` хийх, сулруулах ХОРИОТОЙ.
4. Эзэмшлийн хилээс гадуур файл өөрчлөгдөөгүй (§9 хүснэгт).
5. `git commit` мессежид task ID байна, `git push -u origin issue/personal-2` хийгдсэн.

⚠ `NETOS_GATES_SKIP` төрлийн туг, `--no-verify`, `it.skip` — аль нь ч commit-д ОРОХГҮЙ.

## 9. Зурвасын эзэмшил

| Зурвас | Эзэмших зам | Давалгаа |
|---|---|---|
| contracts | `docs/PERSONAL-2/contracts.yaml`, `shared/validate/schemas.ts`, `shared/types/**` | W0, W1 |
| save | `shared/save/**`, `shared/core/saves.ts` | W1 |
| domain | `shared/core/**` (saves.ts-ээс бусад) | W2 |
| content | `shared/content/**` | W3 |
| backend | `server/**` | W4 |
| ui | `web-app/src/ui/**`, `web-app/src/app/**`, `web-app/src/styles.css` | W5 |
| services | `web-app/src/services/**` | W5, W6 |
| qa | `web-app/tests/**`, `server/tests/**`, `web-app/scripts/**` | бүх давалгаа |

⚠ Зурвас хоорондын хил (`shared/types`, `shared/validate/schemas.ts`, `contracts.yaml`)
нь **зөвхөн W1-д** хөндөгдөнө. Дараа өөрчлөх шаардлага гарвал ажлыг зогсоож, тусдаа
task болгож, хамаарах зурвасуудыг хамт шинэчилнэ.

## 10. Хамрах хүрээнээс гадуур (энэ төлөвлөгөөнд БАЙХГҮЙ)

`spec.md §6` ба `§7`-ийн бүх зүйл. Тодруулбал энэ төлөвлөгөө дараахыг **ХИЙХГҮЙ**:
шинэ quest/dungeon/encounter бичих (Wave 3) · season бүтэц · save slot · telemetry
export · `?dev=1` дибаг самбар · `directorsCut` гурав дахь хүндрэл · PWA / service
worker · portfolio таб.

⚠ Эдгээрийн аль нэгийг task-д оруулах нь спекийн өөрчлөлт бөгөөд хүний зөвшөөрөл
шаардана.

---

## 11. Интерфейсийн гэрээ — `GameState` v2 ба шинэ төрлүүд

Энэ бүлэг нь `§5`-ийн шийдвэрүүдийг **бичиж болохуйц хэлбэрт** хөрвүүлнэ. Эрх бүхий
эх нь `contracts.yaml` v1.2.0 (`T-01`) — доорх нь түүний DSL хувилбарын (`T-05`) гэрээ.
Энд заагаагүй талбар НЭМЭГДЭХГҮЙ: схем өргөтгөх шаардлага гарвал `§9`-ийн дүрмээр
ажлыг зогсоож `T-01`-ээс эхэлнэ.

### 11.1 `GameState`-ийн дельта (v1 → v2) — ЯГ 10 өөрчлөлт

| Талбар | DSL төрөл | Migration-ийн анхдагч | Бичдэг модуль | Уншдаг модуль |
|---|---|---|---|---|
| `mastery` | `rec(obj({ tag, xp: int{min:0}, level: int{1..10}, prestigeCount: int{min:0} }))`, түлхүүр = `SkillTag` | 7 бичлэг: `xp 0 · level 1 · prestigeCount 0` | `mastery.ts` | `mastery.ts` · `skillTree.ts` · `cosmetics.ts` · `achievements.ts` · `gameService` |
| `masteryPoints` | `int{min:0}` — **үлдэгдэл** (`P-20`) | `0` | `mastery.ts` · `skillTree.ts` | `skillTree.ts` · `gameService` |
| `reputation` | `rec(int{min:0})`, түлхүүр = `guildId` | 4 бичлэг = `0` | `reputation.ts` | `reputation.ts` · `cosmetics.ts` · `achievements.ts` · `gameService` |
| `replayLog` | `arr(ReplayLogEntry, { max: 500 })` | `[]` | `replayLog.ts` (`appendReplay`) — дуудагч ЗӨВХӨН `boss.ts` (`P-24`) | `gameService` · тест |
| `campLayout` | `obj({ slots: rec(nullable(str())) })`, ЯГ 6 түлхүүр (`P-25`) | 6 slot → `null` | `cosmetics.ts` | **ЗӨВХӨН UI** (`D-6`) |
| `completedChainIds` | `arr(str(), { unique: true })` | `[]` | `chains.ts` | `chains.ts` · `achievements.ts` · `gameService` |
| `respecAt` | `nullable(dateTime())` — ГАНЦ талбар (`P-19`) | `null` | `skillTree.ts` | `skillTree.ts` · `gameService` |
| `dungeonStats` | `rec(obj({ lastPassedDate: nullable(date()) }))` (`P-15`) | дууссан id бүрд `{ lastPassedDate: null }` | `dungeons.ts` | `dailyMission.ts` |
| `settings.colorBlindSafe` | `bool()` | `false` | `apply.ts` | `theme.ts` |
| `settings.soundVolume` | `num{ min: 0, max: 1 }` | `1` | `apply.ts` | `fx.ts` |

⚠ `bossAttempts[]`-д `difficulty: DifficultyTier` талбар нэмэгдэнэ — migration нь одоо
байгаа бүх бичлэгт `standard` бичнэ (`P-2`; дээд амжилт нь тэднээс гарна).
⚠ **`unlockedCosmeticIds` · `personalBests` · `chainProgress` талбар БАЙХГҮЙ** —
гурвуулаа төлвөөс гаргагдана (`P-1` · `P-2` · `P-21`). Тэдгээрийг нэмэх нь хоёр дахь
эх сурвалж үүсгэх бөгөөд энэ төлөвлөгөөний зөрчил.

### 11.2 Шинэ схемүүд (`contracts.yaml` v1.2.0 → `schemas.ts`)

| Схем | Хэлбэр | Тайлбар |
|---|---|---|
| `MasteryTrack` | `{ tag: SkillTag, xp, level 1..10, prestigeCount }` | `spec.md §3` |
| `DifficultyTier` | `enum[standard, hard]` | Оролдлого тутамд (`BSX-2`) |
| `ReplayLogEntry` | `{ at: date-time, kind: enum[quest, sideQuest, dungeon, boss, chain], refId, outcome: enum[passed, failed] }` | Энэ ажилд ЗӨВХӨН `kind = boss` бичигдэнэ (`P-24`) |
| `CosmeticSlot` | `enum[avatarFrame, campBanner, title, campDecoration, uiAccent, badgeFrame]` | `COS-1`-ийн 6 slot |
| `CosmeticUnlockSource` | `{ kind: enum[quest, boss, achievement, guildRank, mastery], refId, value? }` | `P-22`; лавлагааны бүрэн байдал `[C]`-ээр (`COS-2`) |
| `CosmeticItem` | `{ id, title, slot, rarity: enum[common, rare, epic, legendary], effect: lit(cosmetic), unlockSource }` | `rarity` нь `LootItem`-тэй ижил enum — шинэ enum нэмэхгүй |
| `GuildDefinition` | `{ id, title, tags: arr(SkillTag, {min:1}), placeholder: bool }` | `placeholder = true` нь H-2-ийн түр нэр |
| `SideQuestChain` | `{ id, title, world: int{1..5}, steps: arr(str, {min:4, max:4}), bonusXp: int{min:1} }` | `world` нь `RET-3`-ийн таазыг тооцоход хэрэгтэй |
| `SkillDefinition` (өргөтгөл) | `+ { track: SkillTag, tier: int{1..3} }`, `cost: lit(1)` ХЭВЭЭР | `SKL-1` · `SKL-5` |
| `AchievementDefinition.predicate` (өргөтгөл) | `+ { ref?: str }`, `kind`-д 5 шинэ утга | `P-23` |
| `ContentPack` (өргөтгөл) | `+ { guilds, chains, cosmetics }` | `buildPack()` (`T-21`, `T-22`, `T-23`) |

### 11.3 `shared/core`-ийн шинэ функцүүдийн гарын үсэг

Бүгд **цэвэр функц** (`D-2`): төлвийг мутацлахгүй, `Date.now`/`Math.random` дуудахгүй.
`DomainResult` ба `Ctx` нь `result.ts`-ийнх хэвээр.

| Модуль | Экспорт | Тэмдэглэл |
|---|---|---|
| `mastery.ts` | `addMasteryXp(state, tags, xp)` · `prestigeMastery(state, tag): DomainResult` · `earnedMasteryPoints(state): number` | `addMasteryXp` нь `DomainResult` БИШ, `{ state, events }` буцаана — татгалзахгүй тул дуудагчийн урсгалыг таслахгүй (`T-09`) |
| `reputation.ts` | `grantReputation(state, tags, track, completionIndex, pack)` · `guildFor(tag, pack)` · `rankOf(rep): 0..4` | Хэмжээ нь `§12.3` |
| `chains.ts` | `evaluateChains(state, pack): { state, events }` | Side quest claim-ийн ДАРАА дуудагдана; дараалал нь `P-21`-ээр гаргагдана |
| `cosmetics.ts` | `isUnlocked(state, item, pack)` · `unlockedCosmetics(state, pack)` · `setCampLayout(state, slots): DomainResult` | Үнэлгээний хүснэгт `§12.5` |
| `skillTree.ts` | `capstoneGaps(state, skill, pack): string[]` · `respecTree(state, track, at, pack): DomainResult` · `costCurrency(skill)` | `capstoneGaps` ХООСОН = нээж болно; дүүрэн бол татгалзлын мессежийн эх (`SKL-2`) |
| `replayLog.ts` | `appendReplay(state, entry): GameState` | 500 FIFO таслалт — ГАНЦ газар (`P-10`) |
| `result.ts` (өргөтгөл) | `daysBetween(a, b): number` | `dayOf`-ийн хажууд, шинэ модуль үүсгэхгүй (`P-18`) |
| `progression.ts` (өргөтгөл) | `unlockSkill` нь валютыг `costCurrency`-ээр сонгоно | `PRG-5`-ийн шалгах ДАРААЛАЛ хэвээр |

## 12. Томьёо ба тогтмолууд

Тоог **тооцож гаргана** — хүснэгтэд гараар бичих нь хоёр дахь эх үүсгэнэ (`T-05`).

### 12.1 Mastery

- Түвшин: `levelFor(track.xp)` — `XP_THRESHOLDS` ижил хүснэгт, дээд тал 10 (`MST-1`).
- Олдсон нийт оноо: нийлбэр `(level − 1) + prestigeCount × 9` бүх track дээр (`P-20`).
- Инвариант (тест): `masteryPoints + зарцуулсан = олдсон нийт`; зарцуулсан нь нээгдсэн
  tier-2 ба tier-3 node-уудын тоо.
- Prestige: `level = 10` үед `xp = 0 · level = 1 · prestigeCount + 1`; өмнө олдсон оноо
  БУЦААГДАХГҮЙ; `level ≠ 10` бол `PREREQ_NOT_MET` ба төлөв хэвээр (`MST-3`).

### 12.2 Boss hard mode

| Tier | Standard (`BOSS_TIERS`) | Hard = `ceil(× 1.15)` |
|---|---|---|
| mvp | 35 | **41** |
| advanced | 45 | **52** |
| mastery | 52 | **60** |

⚠ **Мэдэгдэж буй үр дагавар:** `BossScores`-ийн дээд нийлбэр нь ЯГ 60 тул hard mode-ийн
`mastery` нь 6 ангилал бүрд 10 оноо шаардана. Энэ нь `BSX-2`-ийн томьёоноос гарсан үр
дүн — спек тоог ил нэрлэсэн тул өөрчлөхгүй; `T-32`-ийн UI босгыг ил харуулснаар тоглогч
үүнийг таахгүй.

Урвуулалтгүй байдал (`BSX-2`): босго бүр чанд өндөр бөгөөд оноо нь ижил хуваарьтай тул
hard-ын tier нь standard-ынхаас хэзээ ч ӨНДӨР гарахгүй — **0..60 бүх 61 утгаар гүйлгэсэн**
хүснэгтэн тест (`T-13`).

### 12.3 Reputation

- Олголт: `repAward(track, n) = floor(REP_BASE[track] × m^(n − 1))`, энд
  `REP_BASE = { main: 3, boss: 3, dungeon: 2, side: 2 }`, `m = repeatXpMultiplier ?? 0.5`,
  `n` = тухайн контентын гүйцэтгэлийн дугаар.
- Жишээ (side, m = 0.5): `2 · 1 · 0 · 0 …` — grind тэгд нийлнэ, rep хэзээ ч БУУРАХГҮЙ.
- Зэрэглэл: `rankOf(rep)` = `[10, 25, 50, 100]`-аас `rep`-ээс хэтрэхгүй босгуудын тоо → `0..4`.
- Guild зураглал нь контентоос (`P-13`); 7 tag → 4 guild, давхцалгүй (`[C]` тест).

### 12.4 Chain · refresher · respec

| Дүрэм | Томьёо | AC |
|---|---|---|
| Chain дууссан | 4 алхам бүгд `sideQuestStats`-д БА `lastCompletedAt` нь алхмын дарааллаар буурахгүй | RET-2 |
| Chain дахин олгогдохгүй | `completedChainIds` дотор байвал bonus алгасна | RET-2 |
| `bonusXp` тааз | `bonusXp ≤` тухайн `chain.world`-ийн main quest-үүдийн ХАМГИЙН БАГА `xp` | RET-3 |
| Refresher нэр дэвшигч | `lastPassedDate ≠ null` БА `daysBetween(lastPassedDate, dayOf(at)) ≥ 14` | RET-4 |
| Refresher-ийн байрлал | `pickDailyMission`-ий `TIERS` гогцоо ДУУССАНЫ ДАРАА, `return null`-ийн ӨМНӨ — 1–3 эрэмбэд нэр дэвшигч байвал хүрэхгүй | RET-4 |
| Respec зөвшөөрөгдөх | `respecAt = null` ЭСВЭЛ `daysBetween(dayOf(respecAt), dayOf(at)) ≥ 7`; эс бөгөөс `RESPEC_ON_COOLDOWN` ба төлөв ХЭВЭЭР | SKL-3 |

### 12.5 Cosmetic-ийн нээлтийн үнэлгээ (`P-1` · `P-22`)

| `kind` | `refId` | `value` | Нээгдсэн нөхцөл |
|---|---|---|---|
| `quest` | quest id | — | `completedMainQuestIds` эсвэл `completedDungeonIds`-д байгаа, эсвэл `sideQuestStats`-д бичлэгтэй |
| `boss` | boss id | tier нэр | тухайн boss-д `value`-ээс дээш эрэмбийн tier-тэй оролдлого байгаа |
| `achievement` | achievement id | — | `achievementIds`-д байгаа |
| `guildRank` | guild id | `1..4` | `rankOf(reputation[refId]) ≥ value` |
| `mastery` | `SkillTag` | `1..10` | `mastery[refId].level ≥ value` |

⚠ Prestige цол (`MST-3`) ба streak шагнал (`RET-8`) нь `kind = achievement`-ээр харгалзах
амжилтад заана — тиймээс `T-24`-ийн амжилтын жагсаалтад `prestigeCount` ба `streakDays`
предикат ЗААВАЛ байх ёстой, эс бөгөөс тэдгээр cosmetic өнчирч `COS-2` УНАНА.

## 13. Action · event · татгалзлын гэрээ

### 13.1 Шинэ ба өргөтгөсөн action-ууд

| Action | Payload | Validator | Боломжит татгалзал |
|---|---|---|---|
| `prestigeMastery` | `{ tag: SkillTag }` | `tag` нь `SKILL_TAGS`-д багтана | `INVALID_INPUT` · `PREREQ_NOT_MET` (level ≠ 10) |
| `respecTree` | `{ track: SkillTag }` | `track` нь `SKILL_TAGS`-д багтана | `INVALID_INPUT` · `RESPEC_ON_COOLDOWN` · `PREREQ_NOT_MET` (тухайн модонд нээгдсэн node байхгүй) |
| `setCampLayout` | `{ slots: Record<CosmeticSlot, string \| null> }` | түлхүүр нь 6 slot-ын нэг; утга нь `null` эсвэл cosmetic id | `INVALID_INPUT` (танихгүй slot/id) · `PREREQ_NOT_MET` (нээгдээгүй cosmetic) |
| `updateSettings` (өргөтгөл) | `+ { colorBlindSafe?, soundVolume? }` | `soundVolume` нь `0..1` | `INVALID_INPUT` |
| `bossAttempt` (өргөтгөл) | `+ { difficulty? }` | байхгүй бол `standard` | одоогийнх хэвээр |

⚠ `difficulty` нь **заавал биш** — хуучин клиентийн дараалалд (`actionQueue`) хадгалагдсан
үйлдэл серверт хожим хүрэхэд эвдрэхгүй (BE-13 replay-ийн зарчим).

### 13.2 Шинэ event-үүдийн `data`

| Event | `data` | Гаргагч |
|---|---|---|
| `MASTERY_LEVEL_UP` | `{ tag, level, masteryPoints }` | `mastery.ts` |
| `MASTERY_PRESTIGED` | `{ tag, prestigeCount }` | `mastery.ts` |
| `REPUTATION_GAINED` | `{ guildId, amount, total, rank }` | `reputation.ts` |
| `CHAIN_COMPLETED` | `{ chainId, bonusXp }` | `chains.ts` |

**Event-ийн ДАРААЛАЛ** — `claimQuest`-ийн одоогийн 8 алхамд оруулах байрлал:
`3. XP` → **`3a. mastery roll-up`** → `4. бүртгэл` → **`4a. reputation`** →
**`4b. chain`** → `5. streak` → `6. cosmetic шагнал (coins, loot)` → `7. encounter` →
`8. амжилт`.
⚠ Mastery ба rep нь **амжилтын үнэлгээнээс ӨМНӨ** байх ЁСТОЙ — эс бөгөөс `masteryLevel`,
`guildRank` предикаттай амжилт нэг үйлдэл ХОЦРОЖ олгогдоно (`T-09`, `T-11`-ийн тест
энэ дарааллыг ил шалгана).

### 13.3 Татгалзлын код

`RejectionReason`-д нэмэгдэх ГАНЦ утга: `RESPEC_ON_COOLDOWN` (`D-5`). Бусад бүх шинэ
татгалзал одоогийн 7 кодод багтана — шинэ код нэмэх нь спекийн өөрчлөлт.

## 14. UI давхаргын гэрээ — палитр ба FX

### 14.1 Токенийн багц (`theme.ts`)

`styles.css`-д одоо **9 токен + 14 хатуу бичсэн hex** байна. v2-т бүгд токен болно (`P-26`):

| Бүлэг | Токен | Одоогийн эх |
|---|---|---|
| Гадаргуу | `--bg` · `--surface` · `--surface-2` | `:root` |
| Хүрээ | `--border` (`#2b3648`) · `--border-strong` (`#3a475e`) | хатуу hex |
| Текст | `--text` · `--muted` · `--text-on-focus` (`#000`) | `:root` + `.skip-link` |
| Онцлох | `--accent` · `--ok` · `--warn` · `--focus` | `:root` |
| Товч | `--btn-bg` (`#1d2f4d`) · `--btn-bg-hover` (`#24406b`) | хатуу hex |
| Badge | `--badge-ok-bg` (`#16351f`) · `--badge-ok-text` (`#b7f0be`) · `--badge-warn-bg` (`#3a2f10`) · `--badge-warn-text` (`#ffe2a3`) | хатуу hex |
| Идэвхгүй | `--pip-off` (`#55637a`) | хатуу hex |

Нийт **19 өнгөний токен × 6 палитр (camp · w1..w5) × 2 багц (энгийн · colorBlindSafe)**.
`#ccf5d2` (`.sync-ok`) нь `--badge-ok-text`-д НЭГДЭНЭ — шинэ токен нэмэхгүй.
`--radius` зэрэг өнгө БИШ токен нь глобал, палитраар солигдохгүй.
Дэлхий солигдоход ЗӨВХӨН `<html data-world>` (+ `data-cb`) атрибут солигдоно (`VIS-1`).

### 14.2 Контрастын шалгалтын хосууд (`VIS-2` — тестийн эх жагсаалт)

**≥4.5:1 (текст):** `text/bg` · `text/surface` · `text/surface-2` · `text/btn-bg` ·
`text/btn-bg-hover` · `muted/bg` · `muted/surface` · `muted/surface-2` · `accent/surface` ·
`ok/surface` · `warn/surface` · `badge-ok-text/badge-ok-bg` · `badge-warn-text/badge-warn-bg` ·
`text-on-focus/focus` — **14 хос**.
**≥3:1 (UI бүрэлдэхүүн, хүрээ, идэвхгүй чимэглэл):** `focus/bg` · `focus/surface` ·
`border/surface` · `border-strong/surface` · `pip-off/surface` — **5 хос**.

Нийт шалгалт: `19 хос × 6 палитр × 2 багц = 228` баталгаа (`T-27`).

⚠ Ангилал нь **ил гэрээ**: `pip-off` нь хажуудаа текст шошготой (`.pips-text`) тул
чимэглэл гэж ангилагдана — `VIS-4`-ийн «зөвхөн өнгөөр дамжихгүй» шаардлагыг тэр текст
хангана. Ангиллыг өөрчлөх нь `T-27` ба `T-34` хоёуланд нөлөөлнө.

### 14.3 FX бүртгэл (`fx.ts` — `FX-1`-ийн бүрэн байдлын эх)

12 мөр: `event → анимацийн класс → синтезийн давтамж (Hz) → aria-live текстийн эх`.
Одоогийн `sound.ts`-ийн `CUE_EVENTS` (4 event) нь ЭНЭ бүртгэлээс **гаргагдана** — хоёр
дахь жагсаалт үлдэхгүй (`FX-3`-ийн «ганц хамгаалалт»).

| Event | Класс | Hz | `aria-live` текстийн эх |
|---|---|---|---|
| `LEVEL_UP` | `fx-levelup` | 880 | `data.rank` · `data.level` |
| `QUEST_COMPLETED` | `fx-claim` | 660 | `data.title` |
| `SIDE_QUEST_COMPLETED` | `fx-side` | 620 | `data.title` · `data.completions` |
| `DUNGEON_PASSED` | `fx-pass` | 740 | `data.correct` / `data.total` |
| `DUNGEON_FAILED` | `fx-fail` | 320 | `data.nextStep` |
| `ACHIEVEMENT_UNLOCKED` | `fx-achieve` | 990 | `data.title` |
| `LOOT_DROPPED` | `fx-loot` | 1040 | loot-ийн нэр ба rarity **текстээр** (`VIS-4`) |
| `BOSS_ATTEMPT_LOGGED` | `fx-boss` | 700 | `data.tier` · `data.total` (+ унасан бол `data.message`) |
| `STREAK_EXTENDED` | `fx-streak` | 820 | streak-ийн өдрийн тоо |
| `MASTERY_LEVEL_UP` | `fx-mastery` | 900 | `data.tag` · `data.level` |
| `REPUTATION_GAINED` | `fx-rep` | 580 | `data.guildId` · `data.rank` |
| `CHAIN_COMPLETED` | `fx-chain` | 960 | `data.chainId` · `data.bonusXp` |

Дүрэм: анимац бүр **≤300ms**, зөвхөн `transform`/`opacity` (`FX-4`); зэрэг ≤3, илүү нь
товчилно (`FX-7`); `reducedMotion` эсвэл `prefers-reduced-motion` үед класс НЭМЭГДЭХГҮЙ
(`FX-2`); `soundEnabled = false` эсвэл `soundVolume = 0` үед oscillator ҮҮСЭХГҮЙ (`FX-3`).
`styles.css`-д `prefers-reduced-motion` блок аль хэдийн БАЙГАА — `fx.ts`-ийн хамгаалалт нь
түүний JS тал бөгөөд хоёулаа хэрэгтэй (медиа асуулт нь класс нэмэгдэхийг зогсоохгүй,
зөвхөн үргэлжлэх хугацааг тэглэнэ).

## 15. Тестийн төсөв

`QX-1` нь тестийн тоо БУУРАХГҮЙ гэж шаарддаг. Доорх нь **төсөв** — AC БИШ, тоо
хэлбэлзэж болно. Зорилго нь давалгаа бүрийн хаалга хэр «зузаан» болохыг урьдчилан
харуулж, дуусахад гэнэтийн зөрүү гаргахгүй байх.

| Давалгаа | Шинэ тест (web-app) | Шинэ тест (server) | Хамгийн зузаан хэсэг |
|---|---|---|---|
| W0 | ~12 | — | сканнер «өөрөө хазна» тестүүд (`T-04`) |
| W1 | ~18 | ~2 | v1 → v2 migration дахь талбар бүрийн хадгалалт (`T-06`) |
| W2 | ~70 | — | `T-13` (61 утгын хүснэгт) · `T-14` (2³ хослол) |
| W3 | ~25 | — | `[C]` дүрэм тутмын «зөрчил тарихад унана» (`T-25`) |
| W4 | — | ~10 | гэрээний parity ба пакетын хэмжээ (`T-26`) |
| W5 | ~45 | — | контрастын 228 баталгаа (`T-27`) · FX 12 мөр (`T-28`) |
| W6 | ~8 | — | бүх `fetch` унасан нөхцөл (`T-35`) |
| W7 | ~6 | — | регрессийн тоолуур ба bundle (`T-37`) |
| **Нийт** | **~184** | **~12** | эцсийн: web-app ≥ 439 + 184 · server ≥ 76 + 12 |

## 16. Гүнзгийрүүлэлтийн шатанд илэрсэн зөрүү

Доорх 5 зөрүү нь **одоогийн кодыг уншсанаар** илэрсэн бөгөөд спекийн AC-г ӨӨРЧЛӨӨГҮЙ
(шинэ AC нэмэгдээгүй). Гэвч шийдэлгүй үлдвэл хэрэгжүүлэгч тус бүрийг ЧИМЭЭГҮЙ өөрөөр
шийдэх байсан — тэр нь хожим олдоход хамгийн үнэтэй төрлийн зөрүү.

| # | Зөрүү | Хаана илэрсэн | Шийдэл |
|---|---|---|---|
| 1 | `RET-4` нь «14 өдрийн өмнө тэнцсэн» гэж шаардана, гэтэл `completedDungeonIds` нь огноогүй id-ийн жагсаалт | `shared/core/dungeons.ts` · `schemas.ts → GameState` | `P-15` — `dungeonStats.lastPassedDate` |
| 2 | `RET-5`-ийн «+1..3 rep» нь яг ямар олголтыг хэлэхийг заагаагүй | `spec.md §4.6` ↔ `shared/core/sideQuests.ts` | `P-16` — `REP_BASE` + SQ-2-ийн бууралт |
| 3 | Шинэ предикатууд (`guildRank`, `bossPersonalBest`) нь «аль guild / аль boss» гэдгийг хадгалах газаргүй — `predicate.value` нь скаляр | `shared/core/achievements.ts` | `P-23` — заавал биш `ref` |
| 4 | `VIS-2`-ийн «БҮХ хос» нь `styles.css`-ийн 14 хатуу hex-ийг ХАМРАХГҮЙ — тест худал ногоон болох эрсдэл | `web-app/src/styles.css` | `P-26` — токен 9 → 19 |
| 5 | `MST-4`-ийн «олдсон оноо» нь зарцуулалттай зөрчилдөж, хоёр тоо шаардана | `spec.md §4.3` ↔ `shared/core/progression.ts` | `P-20` — үлдэгдлийг хадгалж, олдсоныг гаргана |

⚠ Эдгээрийн аль нь ч **блоклогч биш**: 1 · 3 · 4 · 5 нь спекээс шууд гардаг ганц
боломжит шийдэл; 2 нь `§7 H-5`-д хүний баталгаанд өгөгдсөн, анхдагч замтай.

⚠ **Ажлын нэгжийн тоо 37 ХЭВЭЭР.** Энэ гүнзгийрүүлэлт шинэ task НЭМЭЭГҮЙ — Hefesto-д
бүртгэгдсэн ID-ууд (`513…549` ↔ `T-01…T-37`) хүчинтэй хэвээр (`tasks.md`-ийн ID
зураглалын хүснэгт).
