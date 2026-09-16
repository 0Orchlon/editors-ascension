<!-- PERSONAL-2 · tasks · Төлөвлөгөө + Tasks · 2026-09-16 -->

# Editor's Ascension — Ажлын задаргаа (PERSONAL-2)

**Эх баримт:** `spec.md` (62 шалгуур), `plan.md` (дараалал, шийдвэр P-1…P-14, эзэмшил),
`docs/AAA-SPEC.md` (эх шаардлага), `docs/PERSONAL-1/**` (эрх бүхий суурь).

Task бүр `plan.md §8`-ийн дуусгах тодорхойлолтод захирагдана: тест эхлээд улаан →
дараа ногоон → гадаргуунийхаа `npm test` дамжсан → commit-д task ID → `issue/personal-2`-т push.

**Баганын утга:** `Эзэмших` = зөвхөн энэ task өөрчлөх файлууд. `Хамаарал` = өмнө нь
дуусах ёстой task. `AC` = хангах шалгуур (`spec.md`). `Шалгах` = дууссаныг нотлох
ажиллуулж болох команд/шалгалт.

⚠ `AC` багана хоосон task БАЙХГҮЙ — хоосон бол тэр ажил хамрах хүрээнээс гадуур
(`spec.md §6`, `plan.md §10`).
⚠ **Гүйцэтгэх дараалал дугаараар БИШ** — `Хамаарал` багана шийднэ. W2 ба W3, мөн
W4 ба W5 хос нь параллель (`plan.md §3`).
⚠ `T-14` · `T-19` · `T-31` нь хүний шийдвэр **H-1**-ээс хамаарна (`plan.md §7`).

---

## W0 — Суурь ба хаалга

> Зорилго: хэмжилтийн суурийг өөрчлөлтийн ӨМНӨ тогтоох, хориглох сканнеруудыг
> эхэнд суулгаж дараагийн task бүрийг тухайн мөчид нь шалгах.

### T-01 · `contracts.yaml` v1.2.0 — гэрээний өргөтгөл
- **Эзэмших:** `docs/PERSONAL-2/contracts.yaml`, `docs/PERSONAL-2/contract-docs.md`
- **Хамаарал:** —
- **Хийх:** PERSONAL-1-ийн `contracts.yaml` v1.1.0-оос үүсгэж дараахыг нэмнэ:
  `MasteryTrack` · `MasteryPoints` · `Reputation` · `DifficultyTier` · `ReplayLogEntry` ·
  `CosmeticItem` · `GuildDefinition` · `SideQuestChain`; `SkillDefinition`-д `track`+`tier`;
  `BossAttempt`-д `difficulty`; `GameState`-д `mastery` · `masteryPoints` · `reputation` ·
  `replayLog` · `campLayout` · `completedChainIds` · `respecAt`; `settings`-д
  `colorBlindSafe` + `soundVolume` (`plan.md P-6`); `RejectionReason`-д `RESPEC_ON_COOLDOWN`
  (`spec.md D-5`); `ActionType`-д ЯГ гурав (`plan.md P-7`); `DomainEventType`-д ЯГ дөрөв
  (`plan.md P-8`). Гэрээнд байхгүй зүйлийг schemas.ts-д бичихгүй — гэрээ ЭХЛЭЭД.
- **AC:** SVX-1 (схемийн суурь), QX-2
- **Шалгах:** `contracts.yaml` нь `yaml`-аар задарна; `version: 1.2.0`; шинэ enum утга
  бүр яг нэг удаа тодорхойлогдсон.

### T-02 · Bundle-ийн суурь хэмжээ + `QX-3` хаалга
- **Эзэмших:** `web-app/tests/quality/bundle.test.ts`
- **Хамаарал:** —
- **Хийх:** Өөрчлөлт ОРОХООС ӨМНӨ `vite build`-ийг Vitest дотроос Vite-ийн JS API-аар
  ажиллуулж (`plan.md P-11`) `dist/**`-ийн JS+CSS-ийн gzip нийлбэрийг хэмжинэ. Хэмжсэн
  утгыг тестийн тогтмолд (`BASELINE_GZIP_BYTES`) бичиж, тест нь одоогийн хэмжээ
  `≤ BASELINE × 1.3` эсэхийг шалгана. Шинэ команд НЭМЭХГҮЙ — `npm test` нэг хэвээр.
- **AC:** QX-3
- **Шалгах:** `cd web-app && npm test` ногоон; тогтмолыг зориуд 10%-иар бууруулахад
  тест УНАНА (хаалга хазаж байгаа нотолгоо).

### T-03 · `npm run validate:content` CLI
- **Эзэмших:** `web-app/scripts/validate-content.mjs`, `web-app/package.json` (`scripts` хэсэг),
  `shared/validate/content-rules.ts`
- **Хамаарал:** —
- **Хийх:** PERSONAL-1-ийн `[C]` дүрмүүдийг (MQ-1, MQ-2, MQ-5, SQ-1, SQ-3, SQ-4, STA-4,
  DG-1, ENC-1, ACH-1, EC-1) `shared/validate/content-rules.ts` дотор НЭГ модуль болгож
  гаргана; CLI ба одоо байгаа `[C]` vitest тестүүд ХОЁУЛАА ЭНЭ модулийг дуудна
  (`plan.md P-12`) — шинэ validator бичихгүй. Зөрчил олдвол тэгээс ялгаатай кодоор гарна.
- **AC:** QX-5
- **Шалгах:** `cd web-app && npm run validate:content` → exit 0; контентод зориуд
  зөрчил тарихад exit ≠ 0 ба зөрчлийн зам хэвлэгдэнэ; `npm test` ногоон хэвээр.

### T-04 · Гадаад холболтын сканнер хаалгууд
- **Эзэмших:** `web-app/tests/offline/no-external.test.ts`
- **Хамаарал:** —
- **Хийх:** Гурван сканнер: (а) `web-app/src/**` + `index.html` + (байвал) `dist/**` дотор
  гадаад host руу заасан `http(s)://` URL байхгүй — `tutorialRefs` (контентын доторх,
  тоглогч өөрөө дардаг холбоос) нь ИЛ зөвшөөрөгдсөн үл хамаарах зүйл, сканнер энэ
  ялгааг ил шалгана; (б) `sendBeacon`, гуравдагч талын SDK, автомат тайлагнал байхгүй,
  сүлжээний цорын ганц зам нь `services/apiClient.ts`; (в) `web-app/package.json →
  dependencies` ХООСОН. Тус бүрд «сканнер өөрөө хазна» тест (санаатай зөрчил тарьж
  илрүүлэхийг батлах).
- **AC:** OFF-2, OFF-3, OFF-4
- **Шалгах:** `cd web-app && npm test` ногоон; `dependencies`-д дурын пакет нэмэхэд УНАНА.

---

## W1 — Схем ба migration (`shared/{validate,types,save}`)

### T-05 · Домэйн схем ба төрлийн өргөтгөл
- **Эзэмших:** `shared/validate/schemas.ts`, `shared/types/index.ts`, `shared/core/constants.ts`
- **Хамаарал:** T-01
- **Хийх:** `contracts.yaml` v1.2.0-ийн БҮХ шинэ схемийг DSL-ээр бичнэ (`T-01`-ийн
  жагсаалт). Тогтмолууд `constants.ts`-д: `GUILD_COUNT`, `HARD_MODE_MULTIPLIER = 1.15`,
  `MASTERY_MAX_LEVEL = 10`, `MASTERY_PRESTIGE_LEVEL = 10`, `RESPEC_COOLDOWN_DAYS = 7`,
  `REPLAY_LOG_CAP = 500`, `REP_THRESHOLDS = [10,25,50,100]`. Hard mode-ын босгыг
  **тооцож гаргана** (`ceil(BOSS_TIERS[t] × 1.15)`) — гараар бичихгүй (`BSX-2`).
  Шинэ тоог `web-app/src/**` эсвэл `server/src/**`-д ДАХИН бичихгүй (`QX-7`).
- **AC:** SVX-1 (схем), QX-7
- **Шалгах:** `cd web-app && npm test` ба `cd server && npm test` хоёул ногоон;
  `architecture.test.ts` (гадаад хамааралгүй, детерминизм) хэвээр ногоон.

### T-06 · Save v2 migration + `replayLog` таслалт + fixture шинэчлэл
- **Эзэмших:** `shared/save/migrations.ts`, `shared/save/version.ts`, `shared/save/serialize.ts`,
  `shared/core/replayLog.ts`, `web-app/tests/unit/core/fixtures.ts`
- **Хамаарал:** T-05
- **Хийх:** `CURRENT_SCHEMA_VERSION` 1 → 2. `MIGRATIONS[2]`: 7 mastery track (xp 0,
  level 1, prestigeCount 0), `masteryPoints: 0`, 4 guild rep 0, `replayLog: []`,
  `campLayout` анхдагч, `completedChainIds: []`, `respecAt` бүгд `null`, skill node-ийн
  track/tier зураглал контентоос уншигдана, `settings.colorBlindSafe: false` +
  `soundVolume` анхдагч. **Хуучин save-ийн тоглоомын утга ХӨНДӨГДӨХГҮЙ.**
  `appendReplay(state, entry)` — 500 FIFO таслалттай ганц туслах (`plan.md P-10`).
  `newGame()` ба `fixtures.ts`-д шинэ талбарын анхдагчийг нэмнэ — **тестийн логик
  өөрчлөгдөхгүй** (`plan.md §6` эрсдэлийн мөр).
- **AC:** SVX-1, SVX-2, SVX-4
- **Шалгах:** v1 fixture → v2 migration: level, xp, `completedMainQuestIds`, `inventory`,
  `streak`, `unlockedSkillIds` ЯГ хэвээр гэдгийг баталсан тест; 501 бичлэг нэмэхэд
  хамгийн хуучин нэг нь хасагдаж, шинэ нь үлдсэн; SV-2/SV-3/SV-4-ийн одоо байгаа
  тестүүд ногоон; `cd web-app && npm test` ногоон.

### T-07 · Export/import round-trip + contract parity
- **Эзэмших:** `web-app/tests/unit/save.test.ts`, `web-app/tests/unit/contract-parity.test.ts`,
  `web-app/tests/integration/persistence.test.ts`
- **Хамаарал:** T-06
- **Хийх:** Export → import round-trip нь шинэ талбар бүрийг бүтнээр хадгалахыг батлах;
  v1 хэлбэрийн export файлыг import хийхэд `MIGRATIONS[2]`-оор дамжихыг батлах.
  `contract-parity.test.ts`-ийг v1.2.0-д тааруулж, `schemas.ts` ↔ `contracts.yaml`
  зөрвөл УНАХ эсэхийг шалгах.
- **AC:** SVX-3, QX-2
- **Шалгах:** `cd web-app && npm test` ногоон; `contracts.yaml`-д зориуд талбар нэмэхэд
  parity тест УНАНА.

---

## W2 — Домэйн (`shared/core/**`) · W3-той ПАРАЛЛЕЛЬ

### T-08 · Mastery track хөдөлгүүр
- **Эзэмших:** `shared/core/mastery.ts`
- **Хамаарал:** T-06
- **Хийх:** `addMasteryXp(state, tag, amount)` — түвшин нь `XP_THRESHOLDS`-ийн ЯГ ижил
  хүснэгтээр, track тус бүрд бие даан (1..10). XP нь зөвхөн заасан track-д очно —
  өөр track руу нэвчихгүй. `prestigeMastery(state, tag)` — зөвхөн level 10-д: xp=0,
  level=1, `prestigeCount+1`, cosmetic цол; өөр track хөндөгдөхгүй; `prestigeCount`
  хэзээ ч буурахгүй; level 10 биш бол `PREREQ_NOT_MET`. Mastery level-up тутамд
  `masteryPoints` 1-ээр өснө. Event: `MASTERY_LEVEL_UP`, `MASTERY_PRESTIGED`.
- **AC:** MST-1, MST-3
- **Шалгах:** 7 track бүрд босгын хүснэгтэн тест; нэг track-д XP өгөхөд бусад 6 нь
  ЯГ хэвээр; level 9 дээр prestige → `PREREQ_NOT_MET` ба төлөв өөрчлөгдөөгүй;
  prestige-ийн дараа `masteryPoints` буураагүй.

### T-09 · Mastery roll-up-ыг quest/dungeon/side quest-д залгах
- **Эзэмших:** `shared/core/quests.ts`, `shared/core/dungeons.ts`, `shared/core/sideQuests.ts`
- **Хамаарал:** T-08
- **Хийх:** Контент дуусахад түүний `tags` дэх track БҮРД тухайн контентын **бүтэн XP**
  нэмэгдэнэ (`spec.md A4` — хуваахгүй). Character XP-ийн тооцоо (PRG-1…PRG-3) ба
  side quest-ийн буурах томьёо (SQ-2) ӨӨРЧЛӨГДӨХГҮЙ.
- **AC:** MST-2, MST-6 (event тал)
- **Шалгах:** 60 XP-тэй, 2 tag-тай quest → track тус бүрд 60, character XP +60;
  PRG/SQ-ийн одоо байгаа бүх тест ногоон хэвээр.

### T-10 · Хүчний хоригийн сканнер (`D-6`)
- **Эзэмших:** `web-app/tests/architecture.test.ts` (шинэ describe блок)
- **Хамаарал:** T-08, T-11
- **Хийх:** Импорт/токен сканнердсан тест: `progression.ts` · `stamina.ts` · `quests.ts` ·
  `dungeons.ts` · `economy.ts` нь `mastery`, `reputation`, `campLayout`, `replayLog`
  утгыг УНШИХГҮЙ (EC-1-ийн `coins`/`inventory` сканнерын арга). Rep утгыг
  `reputation.ts` ба cosmetic модулиас ГАДНА ямар ч домэйн функц уншихгүй.
  «Сканнер өөрөө хазна» тест ЗААВАЛ (санаатай зөрчил тарьж илрүүлэх).
- **AC:** MST-5, RET-6
- **Шалгах:** `cd web-app && npm test` ногоон; `progression.ts`-д `state.mastery`
  бичихэд тест УНАНА.

### T-11 · Guild reputation хөдөлгүүр
- **Эзэмших:** `shared/core/reputation.ts`
- **Хамаарал:** T-06
- **Хийх:** `grantReputation(state, tags, amount)` — контентын tag → guild зураглал
  нь `Ctx.pack.guilds`-ээс (`plan.md P-13`), кодод хатуу бичигдэхгүй. +1..3 rep,
  **зөвхөн өснө** (бууралт, зарцуулалт байхгүй). `repeatable:false` контент нэг л
  удаа rep өгнө; давтагдах контент SQ-2-ийн буурах хуваарийг дагана. Rep босго
  `10/25/50/100` → зөвхөн cosmetic цол/туг. Event: `REPUTATION_GAINED`.
- **AC:** RET-5, RET-6
- **Шалгах:** Давтагдахгүй quest-ийг 2 дахь удаа claim хийхэд rep нэмэгдэхгүй;
  давтагдах side quest-ийн 3 дахь гүйцэтгэлийн rep нь SQ-2-ийн хуваарьтай таарсан;
  rep хэзээ ч буураагүйг баталсан property-маягийн тест.

### T-12 · Side quest chain хөдөлгүүр
- **Эзэмших:** `shared/core/chains.ts`
- **Хамаарал:** T-06
- **Хийх:** Chain-ийн алхмууд ЧАНД дарааллаар (алгасалтгүй). 4-р алхам дуусахад нэг
  удаагийн `bonusXp`; тухайн chain дахин олгогдохгүй (давтагдах side quest-ийг дахин
  дуусгасан ч). `completedChainIds`-д бичигдэнэ. Event: `CHAIN_COMPLETED`.
  `bonusXp` ≤ тухайн дэлхийн хамгийн бага main quest XP — домэйн талын шалгалт.
- **AC:** RET-2, RET-3
- **Шалгах:** 1→2→4 дарааллаар дуусгахад chain дуусахгүй; 1→2→3→4 дараалалд ЯГ нэг
  `CHAIN_COMPLETED`; 4-р алхмыг дахин дуусгахад bonus дахин олгогдохгүй.

### T-13 · Boss v2 — hard mode, хувийн дээд амжилт, rematch, replay
- **Эзэмших:** `shared/core/boss.ts`
- **Хамаарал:** T-06
- **Хийх:** `BossInput`-д `difficulty: 'standard' | 'hard'` (оролдлого тутамд, тоглогчид
  биш). Hard босго = `ceil(standard × 1.15)` → `41/52/60`, тогтмолоос ТООЦОГДОНО.
  Хувийн дээд амжилт нь `bossAttempts`-ээс `(bossId, difficulty)`-оор max-аар
  гаргагдана (`plan.md P-2`) — тусдаа талбар байхгүй. Rematch хязгааргүй: cooldown
  БАЙХГҮЙ, boss-ийн ердийн `staminaCost`-оос өөр нөөцийн хаалт БАЙХГҮЙ. Унасан
  оролдлогын дасгалжуулах мессеж нь BS-3-ийн ЯГ форматаар, difficulty зөвлөмжийг
  өөрчлөхгүй. Оролдлого бүр (хоёр difficulty-д ч) `appendReplay`-ээр бичигдэнэ.
- **AC:** BSX-2, BSX-3, BSX-4, BSX-5, BSX-6
- **Шалгах:** Хилийн тест 40/41 · 51/52 · 59/60; hard-д tier T авсан оноо standard-аар
  ямагт ≥T (урвуулалт байхгүй) — бүх боломжит нийлбэр дээр гүйлгэсэн тест; муу
  оролдлогын дараа дээд амжилт буураагүй; 10 удаа дараалан rematch хийхэд stamina-аас
  өөр татгалзал гараагүй.

### T-14 · Skill tree v2 домэйн — capstone, respec, mastery point зарцуулалт
- **Эзэмших:** `shared/core/progression.ts` (`unlockSkill`), `shared/core/skillTree.ts`
- **Хамаарал:** T-08, T-19, **H-1 (хүний шийдвэр — `plan.md §7`)**
- **Хийх:** `plan.md P-3`-ийн валютын хуваарилалт: tier-1 = 1 `skillPoints`,
  tier-2/tier-3 = тухайн `track`-ийн 1 mastery point. Track таарахгүй →
  `PREREQ_NOT_MET`; хүрэлцэхгүй → `INSUFFICIENT_SKILL_POINTS`. Capstone (tier-3)
  нээхэд **гурван** нөхцөл бүгд: (а) track-ийн mastery ≥8, (б) тухайн модны БҮХ
  tier-1 node нээгдсэн, (в) track-д харгалзах boss-д `advanced`+ tier-ийн оролдлого ≥1.
  Дутуу бол `PREREQ_NOT_MET` ба мессеж нь АЛЬ нөхцөл дутсаныг НЭРЛЭНЭ. Capstone нь
  зөвхөн cosmetic үр дүн (XP, stamina, нээлтэд нөлөөгүй — `D-6`). `respecTree(state,
  track, at)` — НЭГ модны зарцуулсан оноог төлсөн валютаараа яг бүтнээр буцааж,
  тухайн модны бүх unlock-ийг тэглэнэ; сүүлийн respec-ээс 7 тоглоомын өдөр
  өнгөрөөгүй бол `RESPEC_ON_COOLDOWN` ба **төлөв өөрчлөгдөхгүй**.
- **AC:** SKL-2, SKL-3, SKL-4, MST-4
- **Шалгах:** Гурван нөхцөлийн 2³ хослол бүрд тест — татгалзлын мессеж дутсан
  нөхцөлийг нэрлэсэн; 6 хоногийн дараа respec → `RESPEC_ON_COOLDOWN` ба төлөв ЯГ
  хэвээр, 7 хоногт зөвшөөрөгдөнө; respec-ийн дараа оноо яг тэнцүү буцсан.

### T-15 · Refresher — өдрийн даалгаврын нэр дэвшилт
- **Эзэмших:** `shared/core/dailyMission.ts`
- **Хамаарал:** T-06
- **Хийх:** ≥14 тоглоомын өдрийн өмнө тэнцсэн dungeon нь нэр дэвшигч болно,
  ГЭХДЭЭ зөвхөн DM-3-ийн 1–3 эрэмбэд шинэ нэр дэвшигч БАЙХГҮЙ үед. DM-1-ийн
  детерминизм ӨӨРЧЛӨГДӨХГҮЙ (ижил оролт → ижил гаралт).
- **AC:** RET-4
- **Шалгах:** Шинэ нэр дэвшигчтэй төлөвт refresher сонгогдохгүй; 13 хоног →
  сонгогдохгүй, 14 хоног → сонгогдоно; ижил оролтыг 2 удаа дуудахад ижил гаралт;
  DM-1…DM-3-ийн одоо байгаа тестүүд ногоон хэвээр.

### T-16 · Cosmetic нээлтийн үнэлгээ · `campLayout` · streak шагнал
- **Эзэмших:** `shared/core/cosmetics.ts`
- **Хамаарал:** T-08, T-11, T-13
- **Хийх:** `unlockedCosmetics(state, pack)` — cosmetic бүрийн `unlockSource`-ийг
  төлвөөс үнэлж нээгдсэн эсэхийг ГАРГАЖ авна (`plan.md P-1`; save-д шинэ талбар
  НЭМЭХГҮЙ). `setCampLayout(state, layout)` — цэвэр UI төлөв; домэйн дүрэм үүнийг
  уншихгүй. Streak-ийн 3/7/14/30 өдрийн босгод cosmetic шагнал (тоглоомын нөлөөгүй);
  ACH-2-ийн streak логик ӨӨРЧЛӨГДӨХГҮЙ.
- **AC:** COS-2 (домэйн тал), COS-4, RET-8
- **Шалгах:** `campLayout`-ыг save-аас устгаад ачаалахад level/XP/inventory/mastery/rep
  ЯГ хэвээр; unlockSource биелээгүй cosmetic нь нээгдээгүй, биелсэн нь нээгдсэн;
  streak-ийн одоо байгаа тестүүд ногоон хэвээр.

### T-17 · Амжилтын шинэ предикатууд
- **Эзэмших:** `shared/core/achievements.ts`
- **Хамаарал:** T-08, T-11, T-12, T-13
- **Хийх:** Предикатын `kind`-д нэмнэ: `masteryLevel`, `prestigeCount`,
  `chainsCompleted`, `guildRank`, `bossPersonalBest`. Бүгд төлвөөс машинаар
  шалгагдана, нэг удаа олгогдоно (ACH-1-ийн дүрэм хэвээр).
- **AC:** RET-7 (домэйн тал)
- **Шалгах:** Шинэ `kind` бүрд хилийн тест; аль хэдийн эзэмшсэн амжилт дахин
  олгогдохгүйг баталсан тест; ACH-1-ийн одоо байгаа тестүүд ногоон.

### T-18 · `applyAction` дискпетчер — 3 шинэ action
- **Эзэмших:** `shared/core/apply.ts`, `shared/validate/index.ts` (payload validator)
- **Хамаарал:** T-08, T-14, T-16
- **Хийх:** `prestigeMastery` · `respecTree` · `setCampLayout`-ыг `KNOWN_TYPES` ба
  `switch`-д нэмж, payload validator бичнэ. `updateSettings`-ийн payload-д
  `colorBlindSafe` ба `soundVolume` нэмэгдэнэ (`plan.md P-6`). `never` шалгалт хэвээр —
  дискпетчер дутуу үлдвэл typecheck УНАНА. Дүрэм UI давхаргад давхардахгүй.
- **AC:** OFF-7
- **Шалгах:** Гурван action бүрд: буруу payload → `INVALID_INPUT`, зөв payload →
  хүлээгдсэн event; `cd web-app && npm test` ба `cd server && npm test` хоёул ногоон.

---

## W3 — Контент (`shared/content/**`) · W2-той ПАРАЛЛЕЛЬ

### T-19 · Skill контент v2 — track, tier, capstone
- **Эзэмших:** `shared/content/skills.json`
- **Хамаарал:** T-05, **H-1**
- **Хийх:** Одоогийн 24 node бүрийн **id · title · description · cost ХЭВЭЭР**
  (`SKL-5`) — зөвхөн `track: SkillTag` ба `tier: 1|2|3` нэмэгдэнэ. Мод (track) тутамд
  ≥1 tier-1, ≥1 tier-2, **ЯГ 1** tier-3. Нийт node **≥28** (шаардлагатай хэмжээгээр
  шинэ node нэмнэ). Урьдчилсан нөхцөлийн граф DAG (MQ-2-ийн мөчлөгийн шалгалт);
  tier N-ийн node нь tier N-1-ийн node-ыг урьдчилсан нөхцөлтэй (tier алгасахгүй).
- **AC:** SKL-1, SKL-5
- **Шалгах:** `npm run validate:content` ногоон; хуучин 24 id бүр хэвээр байгааг
  баталсан [C] тест; мөчлөг тарихад validator УНАНА.

### T-20 · Boss контент — дэлхий тутамд нэг
- **Эзэмших:** `shared/content/mainQuests.json`
- **Хамаарал:** T-05
- **Хийх:** Дэлхий 1, 2, 4, 5-д нэг нэг boss quest нэмнэ (нийт 5). Одоогийн
  `boss-strange-room` 3-р дэлхийд ХЭВЭЭР (`spec.md A6`). Тус бүр MQ-5-ийн бүх
  талбарын шаардлагыг хангана. Шинэ `tutorialRefs` ЗОХИОХГҮЙ — одоо байгаа
  албан ёсны вендорын баримтын холбоосыг л ашиглана (README T-22-ийн дүрэм).
- **AC:** BSX-1
- **Шалгах:** `npm run validate:content` ногоон; дэлхий тутамд `track:'boss'` ЯГ 1
  гэдгийг баталсан [C] тест; MQ-1…MQ-5-ийн одоо байгаа [C] тестүүд ногоон.

### T-21 · Guild контент
- **Эзэмших:** `shared/content/guilds.json`, `shared/content/index.ts`
- **Хамаарал:** T-05, **H-2 (хүний шийдвэр)**
- **Хийх:** 4 guild, тус бүр `SkillTag`-уудын дэд багцад харгалзана — **7 tag бүр ЯГ
  нэг guild-д** (давхцалгүй, дутуугүй). H-2 хариугүй бол AAA §4.10-ын 4 нэрээр
  үргэлжилж, файлд «түр орлуулагч, хүний баталгаа хүлээж буй» тэмдэглэгээ бичнэ.
  `buildPack()`-д `guilds` нэмэгдэнэ.
- **AC:** RET-5
- **Шалгах:** `npm run validate:content` ногоон; tag-ийн хуваарилалтын бүрэн байдал
  (7 tag → 4 guild, давхцалгүй) [C] тестээр.

### T-22 · Side quest chain контент
- **Эзэмших:** `shared/content/chains.json`, `shared/content/index.ts`
- **Хамаарал:** T-05
- **Хийх:** Одоогийн 20 side quest дээр **≥3 chain**, тус бүр ЯГ 4 алхам, дараалал
  чанд, нэг side quest хоёр chain-д ОРОХГҮЙ. `bonusXp` ≤ тухайн дэлхийн хамгийн бага
  main quest XP.
- **AC:** RET-1, RET-3
- **Шалгах:** `npm run validate:content` ногоон; давхцсан side quest тарихад validator
  УНАНА; `bonusXp` таазыг хэтрүүлэхэд УНАНА.

### T-23 · Cosmetic каталог ≥60
- **Эзэмших:** `shared/content/cosmetics.json`, `shared/content/index.ts`
- **Хамаарал:** T-05, T-19, T-20, T-21, T-24
- **Хийх:** ≥60 элемент, 6 slot төрлөөр (`avatarFrame · campBanner · title ·
  campDecoration · uiAccent · badgeFrame`), slot тус бүрд ≥5. Элемент бүрийн `effect`
  нь `"cosmetic"`. `unlockSource` хоосон биш бөгөөд **БОДИТ** quest/boss/achievement/
  guild-rank/mastery id-д заана — өнчин шагнал ХОРИОТОЙ. `loot.json`-ийн одоогийн 18
  элемент ХӨНДӨГДӨХГҮЙ (тэдгээр нь RNG drop, cosmetic каталог биш).
- **AC:** COS-1, COS-2
- **Шалгах:** `npm run validate:content` ногоон; байхгүй id руу заасан `unlockSource`
  тарихад УНАНА; slot тутмын тоо ≥5 гэдгийг баталсан [C] тест.

### T-24 · Амжилт ≥40
- **Эзэмших:** `shared/content/achievements.json`
- **Хамаарал:** T-17
- **Хийх:** Одоогийн 21-ээс ≥40 болгоно. Шинэ амжилтууд `T-17`-ийн шинэ предикат
  (`masteryLevel`, `prestigeCount`, `chainsCompleted`, `guildRank`, `bossPersonalBest`)
  дээр тулгуурлана. Тус бүр төлвөөс машинаар шалгагдана, нэг удаа олгогдоно.
- **AC:** RET-7
- **Шалгах:** `npm run validate:content` ногоон; предикат бүр бодит төлөвт үнэлэгдэж
  болохыг баталсан [C]+[U] тест; давхардсан id тарихад УНАНА.

### T-25 · `validate:content`-ыг PERSONAL-2-ийн `[C]` дүрмээр өргөтгөх
- **Эзэмших:** `shared/validate/content-rules.ts`, `web-app/tests/unit/content.test.ts`
- **Хамаарал:** T-03, T-19, T-20, T-21, T-22, T-23, T-24
- **Хийх:** SKL-1, SKL-5, BSX-1, RET-1, RET-3, RET-7, COS-1, COS-2, OFF-2-ийн
  контент тал — БҮХ `[C]` дүрмийг ганц модульд нэмж, CLI ба vitest хоёулаа түүнийг
  дуудахыг хадгална (`plan.md P-12`). Дүрэм бүрд «зөрчил тарихад унана» тест.
- **AC:** QX-5
- **Шалгах:** `cd web-app && npm run validate:content` exit 0; дүрэм тус бүрийн
  зөрчлийг тарихад exit ≠ 0 ба зөрчлийн зам хэвлэгдэнэ.

---

## W4 — Сервер (`server/**`) · W5-тай ПАРАЛЛЕЛЬ

### T-26 · Сервер: шинэ action/event, contract тест, пакетын хэмжээ
- **Эзэмших:** `server/src/domain/actionEngine.ts`, `server/src/content/load.ts`,
  `server/tests/contract/contract.test.ts`, `server/tests/api.test.ts`
- **Хамаарал:** T-18, T-25
- **Хийх:** 3 шинэ action ба 4 шинэ event-ийг серверийн гэрээний тестэд оруулна.
  Домэйн дүрэм сервер талд ДАХИН бичигдэхгүй — `shared/core`-ийн `applyAction`-ыг л
  дуудна (BE-10 хэвээр). Шинэ контент файлууд (`guilds`, `chains`, `cosmetics`)
  асахдаа `shared/validate`-ээр шалгагдана; хүчингүй бол health **503** (BE-15 хэвээр).
  `GET /api/content/pack`-ийн хариуны хэмжээг хэмжих тест.
- **AC:** QX-2, QX-4, OFF-7
- **Шалгах:** `cd server && npm test` ногоон (76 тест + шинэ); `/api/content/pack`
  хариу < 2MB гэдгийг бодит пакет дээр баталсан тест; `server/src/**` дотор XP/tier
  тооцоолол давхардаагүйг `server/tests/architecture.test.ts` баталсан.

---

## W5 — UI ба визуал (`web-app/src/{ui,app,services}`) · W4-тэй ПАРАЛЛЕЛЬ

### T-27 · Дэлхий тутмын палитр + colorblind багц + контрастын тест
- **Эзэмших:** `web-app/src/ui/theme.ts`, `web-app/src/styles.css`,
  `web-app/tests/a11y/contrast.test.ts`
- **Хамаарал:** T-05
- **Хийх:** `theme.ts`-д 6 палитр (дэлхий 1..5 + Camp) × 2 багц (энгийн /
  `colorBlindSafe`) токенийн ХҮСНЭГТ хэлбэрээр; CSS custom property-ууд ЭНЭ хүснэгтээс
  гарна (`plan.md P-4`). Дэлхий солигдоход зөвхөн `<html data-world>` атрибут солигдоно —
  DOM бүтэц, `aria-*`, текст ӨӨРЧЛӨГДӨХГҮЙ. Контрастын тест нь хүснэгтээс WCAG
  харьцааг **тооцож** шалгана: текст/дэвсгэрийн бүх хос ≥4.5:1, фокусын
  хүрээ/дэвсгэр ≥3:1 — палитр нэмэхэд тест автоматаар хамарна.
- **AC:** VIS-1, VIS-2, VIS-3
- **Шалгах:** `cd web-app && npm test` ногоон; нэг токеныг зориуд бүдгэрүүлэхэд
  контрастын тест УНАНА; ижил дэлгэцийн 2 палитрын DOM snapshot ЯЛГААГҮЙ;
  `colorBlindSafe` асаахад layout/зай/текст өөрчлөгдөөгүйг баталсан snapshot.

### T-28 · Juice давхарга — `fx.ts` бүртгэл, ганц хамгаалалт, дараалал
- **Эзэмших:** `web-app/src/ui/fx.ts`, `web-app/src/ui/sound.ts`,
  `web-app/src/styles.css` (анимацийн класс), `web-app/tests/ui/fx.test.ts`
- **Хамаарал:** T-18, T-27
- **Хийх:** `fx.ts`-д 12 event-ийн (`spec.md FX-1`-ийн жагсаалт) → (анимац, дуу) хос
  бүртгэл. `play(event)` нь ГАНЦ хаалга (`plan.md P-5`): `reducedMotion`
  (эсвэл `prefers-reduced-motion`) → анимац 100% унтарна; `soundEnabled=false` эсвэл
  `soundVolume === 0` → дуу гарахгүй. Бүх дуу одоогийн WebAudio synth замаар — шинэ
  аудио файл, шинэ сүлжээний хүсэлт БАЙХГҮЙ. Анимац бүр ≤300ms, зөвхөн
  `transform`/`opacity`. Нэг үйлдлээс олон event гарахад дараалалд орж зэрэг ≤3
  ажиллана, илүү нь товчилно. Event бүр `aria-live` мэдэгдэл + дэлгэцийн текстээр
  ДАВХАР гарна — анимац нь мэдээллийн цорын ганц хэлбэр БИШ.
- **AC:** FX-1, FX-2, FX-3, FX-4, FX-5, FX-6, FX-7
- **Шалгах:** Бүртгэлээс нэг event хасахад бүрэн байдлын тест УНАНА; `reducedMotion`
  үед анимацийн класс нэмэгдээгүй; `soundVolume=0` үед oscillator үүсээгүй;
  `fx.ts`-ээс ГАДНА анимацийн класс нэмэх замыг сканнердсан тест хориглосон;
  8 event зэрэг ирэхэд зэрэг ажиллаж буй анимац ≤3 ба 8 текст мэдэгдэл гарсан.

### T-29 · Camp v2 — mastery мини bar, guild rank
- **Эзэмших:** `web-app/src/ui/screens/camp.ts`, `web-app/src/services/gameService.ts`
- **Хамаарал:** T-09, T-11, T-27
- **Хийх:** Camp дэлгэц НЭГ дэлгэцэнд: rank/level/XP bar, stamina, streak, өдрийн
  даалгавар, дараагийн төслийн үйлдэл (UI-2 хэвээр) + **7 mastery track-ийн мини
  progress bar** + идэвхтэй guild rank. `gameService`-д `masteryView()`,
  `guildView()` нэмэгдэнэ — `ui/**` нь `shared/core`-ыг ШУУД импортлохгүй (`QX-7`).
- **AC:** VIS-6, MST-6
- **Шалгах:** Camp smoke тест — 7 track bar + guild rank нэг дэлгэцэнд илэрсэн;
  `architecture.test.ts` ногоон; UI-2-ийн одоо байгаа тест ногоон.

### T-30 · Trophy Room дэлгэц
- **Эзэмших:** `web-app/src/ui/screens/trophies.ts`, `web-app/src/ui/shell.ts`
  (9 дэх маршрут), `web-app/src/app/router.ts`
- **Хамаарал:** T-16, T-23, T-27
- **Хийх:** Camp-ийн дэд дэлгэц (`#/trophies`): БҮХ cosmetic-ийг нээгдсэн/нээгдээгүй
  төлөвөөр, нээх эх сурвалжийн **текстээр** жагсаана. Нээгдээгүй элемент нь «юу
  хийвэл нээгдэхийг» уншигдахаар харуулна. `campLayout`-ийн эмхлэн байрлуулалт
  энд — цэвэр UI төлөв.
- **AC:** COS-3
- **Шалгах:** Smoke тест — ≥60 элемент жагсаагдсан, нээгдээгүй элемент бүр эх
  сурвалжийн тексттэй; шинэ маршрут навигациас гарнаас хүрэгдэнэ.

### T-31 · Skills дэлгэц v2 — track таб, capstone, respec, prestige
- **Эзэмших:** `web-app/src/ui/screens/skills.ts`, `web-app/src/services/gameService.ts`
- **Хамаарал:** T-14, T-19, T-27, **H-1**
- **Хийх:** 7 track-ийн таб; node бүрийн tier, үнэ (аль валют), нээх нөхцөл ил.
  Capstone-ийн гурван нөхцөлийн аль нь дутсаныг ТЕКСТЭЭР харуулна. Respec товч +
  cooldown үлдэгдлийг текстээр. Mastery track-ийн дэлгэрэнгүй (xp/level/цол) +
  level 10-д prestige товч. Татгалзал бүр хүний уншиж болох мессежээр
  (`RESPEC_ON_COOLDOWN` оролцоно).
- **AC:** MST-6, SKL-2, SKL-3
- **Шалгах:** Smoke тест — capstone түгжээтэй үед дутсан нөхцөл нэрлэгдсэн;
  cooldown идэвхтэй үед respec товч тайлбартай идэвхгүй; prestige товч зөвхөн
  level 10-д харагдана.

### T-32 · Boss UI — hard mode, хувийн дээд амжилт, rematch
- **Эзэмших:** `web-app/src/ui/screens/quests.ts` (boss хэсэг),
  `web-app/src/services/gameService.ts`
- **Хамаарал:** T-13, T-20, T-27
- **Хийх:** Difficulty сонголт (`standard`/`hard`) оролдлого тутамд; hard-ын босго
  ил харагдана. `(bossId, difficulty)` тутмын хувийн дээд амжилт. Rematch товч —
  cooldown БАЙХГҮЙ. Унасан оролдлогын дасгалжуулах мессеж BS-3-ийн ЯГ форматаар.
  Difficulty нь өнгөөр БИШ, текст+дүрсээр ялгарна (`VIS-4`).
- **AC:** BSX-2, BSX-3, BSX-4, BSX-5
- **Шалгах:** Smoke тест — hard сонгоход харуулсан босго `41/52/60`; муу оролдлогын
  дараа дээд амжилт буураагүй; rematch дараалан 3 удаа ажилласан.

### T-33 · Settings — `colorBlindSafe`, `soundVolume`
- **Эзэмших:** `web-app/src/ui/screens/settings.ts`
- **Хамаарал:** T-18, T-27, T-28
- **Хийх:** `colorBlindSafe` toggle (save-д хадгалагдана, `updateSettings`-ээр),
  `soundVolume` (0..1). `reducedMotion`, `soundEnabled` хэвээр. Тохиргоо бүр
  гарнаас хүрэгдэнэ, `<input>`/`<button>`-оор.
- **AC:** VIS-3, FX-3
- **Шалгах:** Toggle → save → дахин ачаалахад утга хадгалагдсан; `soundVolume=0`
  үед дуу гараагүйг баталсан тест; settings-ийн одоо байгаа тестүүд ногоон.

### T-34 · A11y сүүлчийн шалгалт — шинэ элемент бүр
- **Эзэмших:** `web-app/tests/a11y/a11y.test.ts`, шаардлагатай UI засвар
- **Хамаарал:** T-29, T-30, T-31, T-32, T-33
- **Хийх:** Шинэ визуал төлөв бүр (rarity, mastery tier, difficulty, guild rank)
  ЗӨВХӨН өнгөөр дамжихгүй — тус бүр текст эсвэл дүрстэй. Шинэ интерактив элемент
  бүр `<button>`/`<a>`/`<input>` (`div`+`onclick` хориотой), гарнаас хүрэх, фокус ил.
  360px · 768px · 1280px өргөнд хэвтээ гүйлгэлт үүсэхгүй — шинэ дэлгэц ба виджет
  бүрт. Үндсэн дэлгэц бүрт axe — **critical зөрчил 0**.
- **AC:** VIS-4, VIS-5, VIS-7, VIS-8
- **Шалгах:** `cd web-app && npm test` ногоон; `div`+`onclick` тарихад сканнер УНАНА;
  axe тайлан critical 0; 3 өргөнд `scrollWidth ≤ clientWidth`.

---

## W6 — Офлайн интеграци

### T-35 · Сервергүй ба сүлжээгүй нөхцөлийн интеграци
- **Эзэмших:** `web-app/tests/integration/offline.test.ts`
- **Хамаарал:** T-26, T-34
- **Хийх:** (а) `server/` огт асаагүй үед бүх дэлгэц, бүх үйлдэл, save/load,
  export/import, БОЛОН бүх шинэ систем (mastery, guild, chain, trophy room, hard mode)
  ажиллана — BE-7-ийн тестийг шинэ системүүдээр өргөтгөнө; (б) бүх `fetch` алдаа
  буцаах нөхцөлд апп ачаалагдана: uncaught алдаа 0, UI офлайн төлвийг ТЕКСТЭЭР
  харуулна, үйлдлүүд локал дараалалд орж хадгалагдана (одоогийн `actionQueue` зам);
  (в) бүртгэл, нууц үг, PII шаардахгүй — нэргүй `playerId` хэвээр, шинэ систем
  хувийн мэдээлэл цуглуулахгүй.
- **AC:** OFF-1, OFF-5, OFF-6
- **Шалгах:** `cd web-app && npm test` ногоон; `fetch` бүхэлдээ `reject` болгосон
  тестэд uncaught алдаа 0 ба mastery/guild/chain/hard mode үйлдлүүд амжилттай.

---

## W7 — Чанарын хаалга

### T-36 · Гүйцэтгэлийн тест
- **Эзэмших:** `web-app/tests/quality/performance.test.ts`
- **Хамаарал:** T-18, T-25
- **Хийх:** Нэг үйлдлийн боловсруулалт (XP → mastery roll-up → achievement үнэлгээ →
  daily mission сонголт) нь контентын хэмжээнд **шугаман** гэдгийг 10 дахин
  томруулсан синтетик пакет дээр батална; нэг claim ≤50ms.
- **AC:** QX-6
- **Шалгах:** ×1 ба ×10 пакетын хугацааны харьцаа шугаман хилд багтсан; ×10 дээр
  claim ≤50ms.

### T-37 · Регрессийн хаалга, архитектур, баримт
- **Эзэмших:** `README.md`, `web-app/CLAUDE.md`, `shared/CLAUDE.md`, `server/CLAUDE.md`,
  `docs/PERSONAL-2/**`
- **Хамаарал:** T-35, T-36
- **Хийх:** PERSONAL-1-ийн **439 тест бүгд дамжсан** эсэхийг батлах — тест устгаагүй,
  `skip` хийгээгүй, сулруулаагүй; тестийн нийт тоо буураагүй. `npm run build`
  warning-гүй, bundle ≤130% (`T-02`-ийн тогтмол). Архитектурын хил хэвээр:
  `ui/** → services/** → shared/core`; `ui/**`-д `fetch` хориотой; `shared/core/**`-д
  `Date.now` · `Math.random` · `localStorage` · `fetch` хориотой. `README.md`-д
  PERSONAL-2-ийн шинэ систем, шинэ маршрут, `validate:content` командыг нэмнэ;
  гадаргуу тутмын `CLAUDE.md`-д шинэ хил (`D-6` хүчний хориг, `fx.ts` ганц
  хамгаалалт) бичигдэнэ.
- **AC:** QX-1, QX-3, QX-7
- **Шалгах:** `cd web-app && npm test` (≥439 тест, `skip` 0) · `cd server && npm test`
  (≥76) · `cd web-app && npm run build` warning-гүй · `npm run validate:content` exit 0.

---

## Хучилтын матриц — AC → task

Спекийн 62 AC тус бүр дор хаяж нэг task-д харгалзана. Хоосон мөр БАЙХГҮЙ.

| AC | Task |
|---|---|
| VIS-1 · VIS-2 | T-27 |
| VIS-3 | T-27, T-33 |
| VIS-4 · VIS-5 · VIS-7 · VIS-8 | T-34 |
| VIS-6 | T-29 |
| FX-1 · FX-2 · FX-4 · FX-5 · FX-6 · FX-7 | T-28 |
| FX-3 | T-28, T-33 |
| MST-1 · MST-3 | T-08 (MST-3 UI: T-31) |
| MST-2 | T-09 |
| MST-4 | T-14 |
| MST-5 | T-10 |
| MST-6 | T-09, T-29, T-31 |
| SKL-1 · SKL-5 | T-19 |
| SKL-2 · SKL-3 | T-14, T-31 |
| SKL-4 | T-14 |
| BSX-1 | T-20 |
| BSX-2 · BSX-3 · BSX-4 · BSX-5 | T-13, T-32 |
| BSX-6 | T-13 |
| RET-1 | T-22 |
| RET-2 | T-12 |
| RET-3 | T-12, T-22 |
| RET-4 | T-15 |
| RET-5 | T-11, T-21 |
| RET-6 | T-10, T-11 |
| RET-7 | T-17, T-24 |
| RET-8 | T-16 |
| COS-1 | T-23 |
| COS-2 | T-16, T-23 |
| COS-3 | T-30 |
| COS-4 | T-16 |
| OFF-1 · OFF-5 · OFF-6 | T-35 |
| OFF-2 · OFF-3 · OFF-4 | T-04 |
| OFF-7 | T-18, T-26 |
| SVX-1 | T-05, T-06 |
| SVX-2 · SVX-4 | T-06 |
| SVX-3 | T-07 |
| QX-1 | T-37 |
| QX-2 | T-07, T-26 |
| QX-3 | T-02, T-37 |
| QX-4 | T-26 |
| QX-5 | T-03, T-25 |
| QX-6 | T-36 |
| QX-7 | T-05, T-37 |

## Хамаарлын шүүмж — эгзэгтэй зам

```
T-01 → T-05 → T-06 → T-08 → T-14* → T-18 → T-26 → T-35 → T-37
                                 ↑
                              T-19* (H-1)
```

Эгзэгтэй зам нь **9 task**. `T-02`, `T-03`, `T-04` нь хамааралгүй (шууд эхэлнэ);
W3-ын контент task-ууд (`T-19…T-24`) нь W2-ын домэйн task-уудтай параллель;
W5-ын UI task-ууд (`T-27…T-34`) нь W4-тэй параллель. `*` тэмдэгтэй хоёр task нь
хүний шийдвэр **H-1**-ийг хүлээнэ (`plan.md §7`) — хариугүй бол `T-14`, `T-19`,
`T-31` хүлээж, үлдсэн **34 task үргэлжилнэ**.
