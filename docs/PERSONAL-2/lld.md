<!-- PERSONAL-2 · lld · Дэлгэрэнгүй загвар (Design) · 2026-09-16 -->

# Editor's Ascension — Дэлгэрэнгүй загвар (LLD · PERSONAL-2)

**Систем:** EDITORSASC · **Репо:** `0Orchlon/editors-ascension` · **Салбар:** `issue/personal-2`
**Гэрээ:** [`contracts.yaml`](contracts.yaml) v1.2.0 (машин уншигдах эрх бүхий эх)
**Харагдац:** [`lld.html`](lld.html) (палитр · FX · дэлгэцийн дуурайлт, амьд)

**Эх баримт:** [`spec.md`](spec.md) (62 AC) · [`plan.md`](plan.md) (26 шийдвэр · §11…§14 гэрээ) ·
[`tasks.md`](tasks.md) (37 ажлын нэгж) · [`../AAA-SPEC.md`](../AAA-SPEC.md) ·
[`../PERSONAL-1/lld.md`](../PERSONAL-1/lld.md) (**суурь — энд заагаагүй бүхэн ТЭНД хэвээр**).

> Энэ баримт нь PERSONAL-1-ийн LLD-ийг **ОРЛОХГҮЙ** — түүний **дельта**. §-үүд нь
> PERSONAL-1 lld.md-ийн дугаарлалтыг дагана (`§5.4.3` = `quests.ts` тэнд ч, энд ч).
> Хөндөгдөөгүй модуль энд БАЙХГҮЙ: `stamina.ts` · `economy.ts` · `encounters.ts` ·
> `projects.ts` · `streak.ts` · `rng.ts` · server-ийн 10 endpoint, SQLite схем,
> token, transfer, rate limit — бүгд PERSONAL-1 lld.md-ээр эрх бүхий хэвээр.

---

## 0. Энэ шатанд юу шийдэгдсэн

`plan.md` нь **юуг ямар дарааллаар** хийхийг тогтоосон. Энэ LLD нь тэр шийдвэрүүдийг
**хэрэгжүүлэгч эргэлзэхгүй** түвшинд буулгана: функцийн биеийн псевдокод, хилийн
тохиолдол, event-ийн дараалал, өгөгдлийн бодит утга (палитрын 122 hex, FX-ийн 12 мөр),
хэмжигдсэн суурь (bundle 46,606 B gzip) ба шалгах арга.

### 0.1 Хянагчийн буцаасан саналд өгсөн хариу — «make it even more in-depth»

| Юу нэмэгдэв | Хаана | Яагаад энэ нь гүн |
|---|---|---|
| **Палитрын 122 hex бодитоор гаргаж, 228 контрастын хосыг ТООЦООЛЖ баталгаажуулав** (хамгийн муу нь 4.78:1 · 3.29:1) | §9.1, §9.2, `lld.html → Palette` таб | `VIS-2` нь `plan.md §6`-ийн хамгийн том эрсдэл байсан. Одоо өнгө сонгох эргэлт ХИЙГДСЭН — хэрэгжүүлэгч тохируулахгүй, хуулна |
| **Bundle-ийн суурь хэмжээг ХЭМЖИВ** (46,606 B gzip · тааз 60,587 B) ба шинэ кодын төсвийг мөр мөрөөр задлав (≈11.8 KB) | §11.2 | `QX-3` нь «эхлэхийн өмнө хэмжинэ» гэсэн — хэмжилт нь Design-д хийгдвэл `T-02` нь тестийг л бичнэ, тоог нь хайхгүй |
| **Палитрын хадгалалтын хэлбэр** — cb хувилбар нь 6 дэлхийд ЯГ ИЖИЛ 8 токен болох нь тооцооноос гарав → 228 биш 122 утга | §9.1.3 | 46% бага өгөгдөл. `QX-3`-ийн 14 KB төсөвт шууд нөлөөлнө |
| **5 шинэ зөрүү** (Δ-1…Δ-5), тус бүр одоогийн кодын мөрөөс илэрсэн, шийдэлтэй | §13.1 | `plan.md §16`-ийн 5 зөрүүгээс ӨӨР — эдгээр нь зөвхөн функцийн биеийг зурсны дараа харагддаг төрөл |
| **Skill node-ийн тоо `≥4` биш `14`**, tier ангиллын нотолгоотой | §6.6.1, Δ-3 | `plan.md §1`-ийн тоо `SKL-1`-ийн «track тутамд ЯГ 1 capstone»-той зөрчилдөж байв. `T-19`-ийн хэмжээ 3.5 дахин өөр |
| **`claimQuest` · `attemptDungeon` · `attemptBoss` ГУРВУУЛАНГИЙН** event дарааллыг зурав | §7 | `plan.md §13.2` зөвхөн `claimQuest`-ийг заасан. Нөгөө хоёрт mastery/rep нь амжилтаас хойш үлдвэл `masteryLevel` предикат нэг үйлдэл хоцорно |
| **`dungeonStats`-ийн бичигч ХОЁР зам** болох нь илэрч, ганц туслах руу нэгтгэв | §6.8, Δ-1 | `plan.md §11.1` нэг бичигч (`dungeons.ts`) гэж бичсэн ч `quests.ts` нь `track:'dungeon'` quest-ийг мөн дуусгадаг |
| **Гүйцэтгэлийн шугаман байдлын нотолгоо** — үйлдэл тутмын ажлын хэмжээг мөрөөр тоолов | §11.1 | `QX-6` нь «шугаман» гэж шаардсан; аль дуудлага `O(n)`, аль нь `O(n·m)` болох нь зөвхөн биеийг зурсны дараа харагдана |
| **Skill валютын `MST-4` уншилтын зөрчил** ил гарч, анхдагч зам + сэлгэх өртөг бичигдэв | §6.6.2, §13.3 H-1′ | Хоёр уншилт хоёулаа `spec.md`-тэй нийцнэ; аль нэгийг ЧИМЭЭГҮЙ сонгох нь хамгийн үнэтэй алдаа |
| **`SKL-2`-ийн «track-д харгалзах boss»**-ийн зураглал тодорхойлогдож, шинэ `[C]` дүрэм болов | §6.6.3, Δ-2 | Спекэд зураглал БАЙХГҮЙ байв — хэрэгжүүлэгч 3 өөр аргаар шийдэж болох цэг |

### 0.2 Энэ шат юуг ШИЙДЭЭГҮЙ (ил мэдэгдэл)

- **Код бичигдээгүй.** Энэ гаралт нь загвар + гэрээ. `mvn verify` / `npm test` нь
  одоогийн (PERSONAL-1) кодоор ногоон — шинэ AC-ууд хараахан ХЭРЭГЖЭЭГҮЙ.
  Ажиллуулж шалгасан ганц зүйл: `npm run build` (суурь хэмжээ, §11.2) ба
  `contracts.yaml`-ийн задаргаа + `$ref` бүрэн байдал (§13.4).
- **Контентын бодит текст** (4 boss-ийн `description`/`victoryConditions`, 60 cosmetic-ийн
  нэр, 19 амжилтын өгүүлбэр) энд БАЙХГҮЙ — тэдгээр нь `T-19`…`T-24`-ийн гаралт.
  Энд зөвхөн тэдгээрийн **бүтэц ба тоон шаардлага** тогтоогдов.
- **Guild-ийн нэр** (`plan.md` H-2) ба **PWA** (`H-3`) нь хүний шийдвэр хэвээр.
- **`lld.html` дэх дэлгэцийн дуурайлт** нь бодит `web-app`-ийн DOM БИШ — зохион байгуулалт
  ба мэдээллийн шатлалыг харуулах зориулалттай. Ангийн нэр, `aria-*` нь §9.4-ийн
  гэрээнээс, layout нь ойролцоо.

---

## 1. Системийн бүтэц — дельта

### 1.1 Гадаргуу ба хамаарлын чиглэл (ӨӨРЧЛӨГДӨӨГҮЙ)

```
web-app/src/ui/  →  web-app/src/services/  →  shared/core/  →  shared/{types,validate}
server/src/      →  shared/core/           →  shared/{types,validate}
shared/content/  (зөвхөн өгөгдөл)          →  shared/types
```

`architecture.test.ts` (web-app · server) нь дараахыг ХОРИГЛОНО, зөрчвөл `npm test` УНАНА:
`ui/** → core/**` шууд импорт · `ui/**`-д `fetch` · `core/**`-д `Date.now` · `new Date` ·
`Math.random` · `localStorage` · `process.` · `fetch` · `core/** → content/**`.
⚠ Шинэ 6 домэйн модуль нь ЭНЭ хоригуудад БҮРЭН захирагдана (`QX-7`).

### 1.2 Шинээр нэмэгдэх файлууд (ЯГ 13)

| Файл | Зурвас | Task | §
|---|---|---|---|
| `shared/core/mastery.ts` | domain | T-08 | §6.1 |
| `shared/core/reputation.ts` | domain | T-11 | §6.2 |
| `shared/core/chains.ts` | domain | T-12 | §6.3 |
| `shared/core/cosmetics.ts` | domain | T-16 | §6.4 |
| `shared/core/skillTree.ts` | domain | T-14 | §6.6 |
| `shared/core/replayLog.ts` | domain | T-06 | §6.5 |
| `shared/validate/content-rules.ts` | qa | T-03 | §8.2 |
| `shared/content/guilds.json` | content | T-21 | §8.1 |
| `shared/content/chains.json` | content | T-22 | §8.1 |
| `shared/content/cosmetics.json` | content | T-23 | §8.1 |
| `web-app/src/ui/theme.ts` | ui | T-27 | §9.1 |
| `web-app/src/ui/fx.ts` | ui | T-28 | §9.3 |
| `web-app/src/ui/screens/trophies.ts` | ui | T-30 | §9.4.2 |
| `web-app/scripts/validate-content.mjs` | qa | T-03 | §8.2 |

⚠ `shared/core/dungeons.ts`-д **шинэ файл нэмэхгүй** — `markDungeonPassed` нь тэр файлд
(§6.8, Δ-1). ⚠ `web-app/src/ui/sound.ts` нь **устгагдахгүй**: `fx.ts` нь түүний
`createSoundCues`-ийг доторх давхарга болгож ашиглана, `CUE_EVENTS` нь `fx.ts`-ийн
бүртгэлээс ГАРГАГДАНА (§9.3.4).

### 1.3 Хөндөгдөх одоогийн файлууд

| Файл | Юу өөрчлөгдөх | Task |
|---|---|---|
| `shared/validate/schemas.ts` | 10 шинэ схем, `GameState` +8 талбар, 3 enum өргөтгөл | T-05 |
| `shared/validate/index.ts` | 3 шинэ payload validator + 2 өргөтгөл | T-05, T-18 |
| `shared/types/index.ts` | 10 шинэ `Infer` экспорт | T-05 |
| `shared/core/constants.ts` | 9 шинэ тогтмол (§3) | T-05 |
| `shared/core/result.ts` | `daysBetween(a, b)` | T-06 |
| `shared/save/version.ts` | `CURRENT_SCHEMA_VERSION = 2` | T-06 |
| `shared/save/migrations.ts` | `MIGRATIONS[2]` (§5) | T-06 |
| `shared/core/apply.ts` | +3 `case`, `bossAttempt`/`updateSettings` payload | T-18 |
| `shared/core/quests.ts` | §7.1-ийн 11 алхмын дараалал | T-09, T-11, T-12 |
| `shared/core/dungeons.ts` | §7.2, `markDungeonPassed` | T-09, T-15 |
| `shared/core/boss.ts` | difficulty, дээд амжилт, replay (§6.7) | T-13 |
| `shared/core/dailyMission.ts` | refresher fallback (§6.9) | T-15 |
| `shared/core/achievements.ts` | 5 шинэ `kind` + `ref` (§6.10) | T-17 |
| `shared/core/progression.ts` | `unlockSkill` валютын салаа (§6.6.2) | T-14 |
| `shared/content/index.ts` | `buildPack()` +3 хэсэг | T-21…T-23 |
| `shared/content/skills.json` | 24 node-д `track`+`tier`, +14 шинэ node | T-19 |
| `shared/content/mainQuests.json` | +4 boss | T-20 |
| `shared/content/achievements.json` | 21 → ≥40 | T-24 |
| `server/src/domain/actionEngine.ts` | 3 шинэ action-ийг дамжуулах | T-26 |
| `web-app/src/ui/sound.ts` | `CUE_EVENTS` нь `fx.ts`-ээс гарна | T-28 |
| `web-app/src/ui/shell.ts` | `ROUTES` +1 (`#/trophies`), `data-world` тохируулга | T-29, T-30 |
| `web-app/src/styles.css` | 19 токен, 12 FX keyframe, хатуу hex 0 | T-27, T-28 |
| `web-app/src/services/gameService.ts` | 6 шинэ `view.*` (§9.5) | T-29…T-32 |
| `web-app/src/ui/screens/{camp,skills,settings}.ts` | §9.4 | T-29, T-31, T-33 |
| `web-app/package.json` | `scripts.validate:content` (⚠ `dependencies` ХООСОН ХЭВЭЭР) | T-03 |

---

## 2. Хүчний хоригийн хэрэгжилт (`spec.md` D-6 · `MST-5` · `RET-6`)

D-6 нь **машинаар хаагдана**, зөвхөн заавраар биш. Хоёр сканнер, хоёулаа
`web-app/tests/architecture.test.ts`-д (`T-10`):

**Сканнер A — «унших хориг».** Дараах модулиуд дараах тэмдэгтүүдийг ЭХ КОДДОО
агуулахгүй (импорт ба талбарын нэр хоёулаа):

| Хориотой хэрэглэгч | Хориотой уншилт |
|---|---|
| `shared/core/progression.ts` · `stamina.ts` · `quests.ts` · `dungeons.ts` · `economy.ts` · `encounters.ts` · `sideQuests.ts` · `streak.ts` · `projects.ts` | `state.mastery` · `masteryPoints` · `state.reputation` · `state.campLayout` · `state.replayLog` · `./mastery.ts` · `./reputation.ts` · `./cosmetics.ts` · `./replayLog.ts` |
| `shared/core/**` (бүгд) | `state.campLayout` (UI-гийн ГАНЦ талбар) |

⚠ Үл хамаарах ЯГ ГУРАВ, ил жагсаалттай:
`skillTree.ts → state.mastery` (`SKL-2`) · `cosmetics.ts → state.{mastery,reputation,campLayout}` ·
`achievements.ts → state.{mastery,reputation,completedChainIds}` (`RET-7`).

**Сканнер B — «бичих хориг».** `mastery.ts` · `reputation.ts` · `chains.ts` ·
`cosmetics.ts` · `replayLog.ts` нь `xp` · `level` · `skillPoints` · `stamina` · `coins` ·
`inventory` · `completedMainQuestIds` · `completedDungeonIds` талбарт **бичихгүй**
(`{ ...state, xp:` хэлбэрийн олдвор).
⚠ Үл хамаарах ГАНЦ: `chains.ts` нь `bonusXp`-ийг `addXp`-ээр олгоно (`RET-2`) —
тиймээс `chains.ts` нь `progression.ts`-ийг импортлож БОЛНО, харин `xp`-д ШУУД бичихгүй.

**Сканнер C — «сканнер өөрөө хазна».** A ба B тус бүрд санаатай зөрчил тарьсан
хиймэл эх мөрийг өгч, сканнер түүнийг ИЛРҮҮЛЭХ ёстой (`plan.md §6`-ийн «guards
actually bite» хэв маяг). Сканнерын зам буруу бичигдвэл хоосон олдворт ногоон болох
эрсдэлийг зөвхөн энэ тест хаана.

---

## 3. Тогтмолууд — `shared/core/constants.ts` (§`contracts.yaml → ProgressionConstants`)

```ts
export const HARD_MODE_MULTIPLIER = 1.15;
export const MASTERY_MAX_LEVEL = 10;
export const MASTERY_PRESTIGE_LEVEL = 10;
export const RESPEC_COOLDOWN_DAYS = 7;
export const REFRESHER_MIN_DAYS = 14;
export const REPLAY_LOG_CAP = 500;
export const REP_THRESHOLDS = [10, 25, 50, 100] as const;
export const REP_BASE = { main: 3, boss: 3, dungeon: 2, side: 2 } as const;
export const GUILD_COUNT = 4;
export const COSMETIC_SLOTS = ['avatarFrame','campBanner','title','campDecoration','uiAccent','badgeFrame'] as const;

/** ⚠ ТООЦОГДОНО — гараар бичих нь `BOSS_TIERS`-ээс чимээгүй салах хоёр дахь эх (`BSX-2`). */
export const HARD_BOSS_TIERS = Object.fromEntries(
  Object.entries(BOSS_TIERS).map(([k, v]) => [k, Math.ceil(v * HARD_MODE_MULTIPLIER)]),
) as { mvp: number; advanced: number; mastery: number };   // → { mvp: 41, advanced: 52, mastery: 60 }
```

**Тестийн үүрэг (`T-05`):** `HARD_BOSS_TIERS` нь `{41, 52, 60}` болохыг батлах —
гараар бичсэн литерал БИШ гэдгийг батлахын тулд `BOSS_TIERS.mvp`-г түр өөрчилсөн
хуулбар дээр функцийг дахин дуудаж шалгана.

⚠ `MAX_CONCURRENT_FX = 3` (`FX-7`) нь **энд БИШ** — UI-ийн шийдвэр, `web-app/src/ui/fx.ts`-д.
`ProgressionConstants` нь домэйны гэрээ; UI-ийн тоог тэнд тавих нь серверийг
харагдах байдлын шийдэлд холбоно.

---

## 4. `shared/validate` ба `shared/types` (T-05)

### 4.1 DSL хөрвүүлэлт — `contracts.yaml` → `schemas.ts`

```ts
export const SkillTag = enom(SKILL_TAGS);                       // constants.ts-аас — ХУУЛАХГҮЙ
export const Rarity = enom(['common','rare','epic','legendary'] as const);
export const DifficultyTier = enom(['standard','hard'] as const);
export const CosmeticSlot = enom(COSMETIC_SLOTS);

export const MasteryTrack = obj({
  tag: SkillTag, xp: int({ min: 0 }),
  level: int({ min: 1, max: MASTERY_MAX_LEVEL }), prestigeCount: int({ min: 0 }),
});

export const ReplayLogEntry = obj({
  at: dateTime(),
  kind: enom(['quest','sideQuest','dungeon','boss','chain'] as const),
  refId: str(), outcome: enom(['passed','failed'] as const),
});

export const CampLayoutSlots = obj(
  Object.fromEntries(COSMETIC_SLOTS.map((s) => [s, nullable(str())])) as …,
);
export const CampLayout = obj({ slots: CampLayoutSlots });

export const CosmeticUnlockSource = obj(
  { kind: enom(['quest','boss','achievement','guildRank','mastery'] as const),
    refId: str(), value: union([int(), str()]) },
  { optional: ['value'] },
);
export const CosmeticItem = obj({
  id: str(), title: str({ min: 1 }), slot: CosmeticSlot, rarity: Rarity,
  effect: lit('cosmetic'), unlockSource: CosmeticUnlockSource,
});
export const GuildDefinition = obj({
  id: str(), title: str({ min: 1 }),
  tags: arr(SkillTag, { min: 1, unique: true }), placeholder: bool(),
});
export const SideQuestChain = obj({
  id: str(), title: str({ min: 1 }), world: int({ min: 1, max: 5 }),
  steps: arr(str(), { min: 4, max: 4, unique: true }), bonusXp: int({ min: 1 }),
});

export const BossAttempt = obj({ …, difficulty: DifficultyTier });     // +1 талбар

export const GameState = obj({
  …PERSONAL-1-ийн 19 талбар…,
  settings: obj({ reducedMotion: bool(), soundEnabled: bool(),
                  colorBlindSafe: bool(), soundVolume: num({ min: 0, max: 1 }) }),
  mastery: rec(MasteryTrack),                 // түлхүүр = SkillTag, ЯГ 7 (§4.2)
  masteryPoints: int({ min: 0 }),             // ҮЛДЭГДЭЛ
  reputation: rec(int({ min: 0 })),           // түлхүүр = guildId, ЯГ 4
  replayLog: arr(ReplayLogEntry, { max: REPLAY_LOG_CAP }),
  campLayout: CampLayout,
  completedChainIds: arr(str(), { unique: true }),
  respecAt: nullable(dateTime()),
  dungeonStats: rec(obj({ lastPassedDate: nullable(date()) })),
});
```

### 4.2 `rec()`-ийн түлхүүрийн бүрэн байдал — DSL-ийн ЗАЙ

⚠ `shared/validate/dsl.ts`-ийн `rec()` нь **түлхүүрийн багцыг шалгадаггүй**
(`propertyNames` · `minProperties` эквивалент БАЙХГҮЙ). `contracts.yaml` нь
`mastery`-д `minProperties: 7 · maxProperties: 7 · propertyNames: SkillTag` гэж заасан.

**Шийдвэр (A-LLD2-1).** DSL-д шинэ комбинатор **НЭМЭХГҮЙ**. Оронд нь:
1. `MIGRATIONS[2]` нь 7 track, 4 guild-ийг **бүтнээр** үүсгэнэ — дутуу төлөв төрөхгүй.
2. `mastery.ts → trackOf(state, tag)` нь байхгүй түлхүүрт **анхдагч** (`xp 0 · level 1 ·
   prestigeCount 0`) буцаана — уншилт хэзээ ч `undefined`-д унахгүй.
3. Бүрэн байдлыг `[U]` тест шалгана (`newGame()` ба `MIGRATIONS[2]`-ийн гаралтад
   ЯГ 7 · ЯГ 4 түлхүүр).

Үндэслэл: `rec()`-д түлхүүрийн шалгалт нэмэх нь DSL-ийн бүх хэрэглэгчийг хөндөнө
(`sideQuestStats` · `dungeonStats` нь ЧӨЛӨӨТ түлхүүртэй) — хамрах хүрээнээс гадуур
эрсдэл. `contract-parity.test.ts` нь энэ ялгааг **мэдэгдэж буй зөрүү** болгон ил
жагсаалтад авна (`T-07`).

### 4.3 Payload validator (`shared/validate/index.ts`)

| `ActionType` | Validator | Татгалзал |
|---|---|---|
| `prestigeMastery` | `obj({ tag: SkillTag })` | `INVALID_INPUT` |
| `respecTree` | `obj({ track: SkillTag })` | `INVALID_INPUT` |
| `setCampLayout` | `obj({ slots: CampLayoutSlots })` | `INVALID_INPUT` |
| `updateSettings` | +`colorBlindSafe?: bool` · `soundVolume?: num 0..1` | `INVALID_INPUT` |
| `bossAttempt` | +`difficulty?: DifficultyTier` | `INVALID_INPUT` |

⚠ `setCampLayout`-ийн `slots` нь **бүтэн** объект (6 түлхүүр заавал). Хэсэгчилсэн
засварыг зөвшөөрөх нь «аль үүр нь өөрчлөгдсөн» гэдгийг далдалж, `COS-4`-ийн
«устгаад ачаалахад бусад утга хэвээр» тестийг утгагүй болгоно.

---

## 5. `shared/save` — v1 → v2 migration (T-06)

`CURRENT_SCHEMA_VERSION = 2`. `MIGRATIONS[2]` нь **цэвэр функц**
(`Record<string,unknown> → Record<string,unknown>`), контентоос хамаарна.

### 5.1 Алгоритм — ЯГ 9 алхам

```
MIGRATIONS[2](v1, pack):
  1. mastery         ← SKILL_TAGS.map(tag => [tag, { tag, xp: 0, level: 1, prestigeCount: 0 }])
  2. masteryPoints   ← 0
  3. reputation      ← pack.guilds.map(g => [g.id, 0])            // ЯГ 4
  4. replayLog       ← []
  5. campLayout      ← { slots: Object.fromEntries(COSMETIC_SLOTS.map(s => [s, null])) }
  6. completedChainIds ← []
  7. respecAt        ← null
  8. dungeonStats    ← Object.fromEntries(
                          v1.completedDungeonIds.map(id => [id, { lastPassedDate: null }]))
  9. bossAttempts    ← v1.bossAttempts.map(a => ({ ...a, difficulty: 'standard' }))
     settings        ← { ...v1.settings, colorBlindSafe: false, soundVolume: 1 }
```

### 5.2 Яагаад ЭНЭ анхдагчууд — тус бүрийн үндэслэл

| Талбар | Анхдагч | Яагаад өөр утга БУРУУ |
|---|---|---|
| `mastery[*].xp` | `0` | Өнгөрсөн XP-ээс буцаан тооцох өгөгдөл БАЙХГҮЙ: `completedMainQuestIds` нь quest бүрийн `tags`-ийг агуулдаг ч `sideQuestStats` нь давталт тутмын **олгогдсон** XP-ийг хадгалдаггүй (`P-17` нь олгогдсоныг шаарддаг). Ойролцоолол нь **буруу** mastery level төрүүлж `SKL-2`-ийн capstone-ийг гэнэт нээнэ |
| `masteryPoints` | `0` | Track бүр level 1 тул олдсон нийт = 0. Инвариант `үлдэгдэл + зарцуулсан == олдсон` нь `0 + 0 == 0` (§6.6.4-ийн «24 хуучин node бүгд tier-1» шийдвэрээс хамаарна) |
| `reputation[*]` | `0` | Rep нь ЗӨВХӨН өснө (`RET-5`) — 0-ээс эхлэх нь цорын ганц зөвшөөрөгдөх утга |
| `dungeonStats[*].lastPassedDate` | `null` | ⚠ Хуучин save-д тэнцсэн ОГНОО БАЙХГҮЙ. `null` = «refresher-т нэр дэвшихГҮЙ» (`P-15`). Огноо ЗОХИОХ (ж. migration-ий өдөр) нь 14 хоногийн дараа БҮХ хуучин dungeon-ийг нэг дор нэр дэвшүүлж `RET-4`-ийг утгагүй болгоно |
| `bossAttempts[*].difficulty` | `'standard'` | v1-д hard mode БАЙГААГҮЙ. `BSX-3`-ийн дээд амжилт нь `(bossId, difficulty)` бүлгээр тооцогддог тул hard гэж тэмдэглэх нь хуурамч дээд амжилт үүсгэнэ |
| `settings.soundVolume` | `1` | `soundEnabled` нь v1-д аль хэдийн байгаа — эзлэхүүн нь тусад нь **намсгах** хэрэгсэл. `0` гэж бичих нь v1 тоглогчийн дууг ЧИМЭЭГҮЙ унтраана |
| `campLayout.slots[*]` | `null` | Cosmetic нь `unlockSource`-оос гаргагддаг (`P-1`) тул v1 тоглогчид зарим cosmetic АЛЬ ХЭДИЙН нээлттэй байж болно — гэвч тэднийг **автоматаар зүүх** нь тоглогчийн сонголтыг зохиох явдал |

### 5.3 `MIGRATIONS[2]`-ийн контентын хамаарал

`reputation`-ийн 4 түлхүүр нь `pack.guilds`-ээс ирнэ. Гэвч `Migration` төрөл нь
`(state) => state` — pack аргумент БАЙХГҮЙ.

**Шийдвэр (A-LLD2-2).** `Migration` төрлийг **өөрчлөхгүй**. `migrations.ts` нь
`shared/content/index.ts`-ийг импортлохгүй (давхаргын хориг). Оронд нь
`reputation` нь `GUILD_IDS` тогтмолоос үүснэ:

```ts
// constants.ts — контентын guild id-ийн ГАНЦ хувилбар.
export const GUILD_IDS = ['guild-cut', 'guild-form', 'guild-frame', 'guild-signal'] as const;
```
ба `guilds.json`-ийн id-ууд нь `GUILD_IDS`-тэй ЯГ таарахыг `[C]` дүрэм шалгана
(`content-rules.ts → guildIdsMatchConstants`). Ингэснээр migration нь контентоос
хамаарахгүй, зөрүү нь тестээр хаагдана.

⚠ Guild-ийн **нэр** (`title`) нь контентод хэвээр (`P-13` · H-2) — зөвхөн `id` нь
тогтмол. Хүн нэрийг солиход код хөндөгдөхгүй.

### 5.4 Тестийн шаардлага (`SVX-1` · `SVX-4`)

`web-app/tests/unit/save.test.ts`-д v1 fixture (бодит утгатай: `level 4 · xp 900 ·
3 main quest · 2 side quest stat · 1 dungeon · 2 skill · streak 6 · 1 boss attempt`) →
`runMigrations(…, 1, 2)` → дараах **бүгд ЯГ тэнцүү**: `xp` · `level` · `stamina` ·
`coins` · `skillPoints` · `combo` · `streak` · `completedMainQuestIds` ·
`sideQuestStats` · `completedDungeonIds` · `unlockedSkillIds` · `inventory` ·
`achievementIds` · `projects` · `dailyMission` · `bossAttempts[i].{bossId,at,scores,total,tier}`.

---

## 6. `shared/core` — модуль тус бүрийн загвар

Бүгд **цэвэр функц** (`D-2`). `DomainResult` · `Ctx` нь `result.ts`-ийнх хэвээр.

### 6.0 `result.ts` өргөтгөл — `daysBetween` (T-06 · `P-18`)

```ts
/** UTC хуанлийн өдрийн зөрүү. Оролт нь `YYYY-MM-DD` (ЗААВАЛ `dayOf`-ийн гаралт). */
export const daysBetween = (a: string, b: string): number =>
  (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;
```

⚠ `Date.parse` нь `architecture.test.ts`-ийн хоригт **ОРОХГҮЙ** (хориг нь `Date.now(` ·
`new Date(`): цаг УНШИХГҮЙ, зөвхөн өгөгдсөн мөрийг задална — детерминизм хадгалагдана.
⚠ `daysBetween(a, b) < 0` боломжтой (`b` нь `a`-аас өмнө — цагийн бүс зөрүүтэй
төхөөрөмж хооронд шилжүүлсэн save). Бүх дуудагч `>= N` гэж шалгана, `=== N` БИШ —
сөрөг утга нь автоматаар «болохгүй» тал руу унана (cooldown идэвхтэй хэвээр).

### 6.1 `mastery.ts` (T-08 · AC MST-1…MST-6)

```ts
export function trackOf(state, tag): MasteryTrack;                    // байхгүй бол анхдагч
export function earnedMasteryPoints(state): number;                   // ГАРГАГДАНА (P-20)
export function addMasteryXp(state, tags, xp): { state, events };     // ⚠ DomainResult БИШ
export function prestigeMastery(state, tag): DomainResult;
```

**`addMasteryXp` — татгалзахгүй байх нь ЗОРИУД.** Дуудагч нь `claimQuest` ·
`attemptDungeon` · `attemptBoss` — тэдгээрийн урсгал аль хэдийн амжилттай болсон
байна. Энд `reject` буцаах нь дууссан quest-ийг буцаах болно.
Хамгаалалт: `xp <= 0` эсвэл `tags` хоосон → төлөв ХЭВЭЭР, event БАЙХГҮЙ.

```
addMasteryXp(state, tags, xp):
  if xp <= 0 or tags.length === 0: return { state, events: [] }
  next ← state; events ← []
  for tag of unique(tags):                       // ⚠ давхардсан tag НЭГ л удаа
     t ← trackOf(next, tag)
     if t.level >= MASTERY_MAX_LEVEL: continue   // 10-д XP хуримтлагдахгүй
     xp' ← t.xp + xp
     lvl' ← min(levelFor(xp'), MASTERY_MAX_LEVEL)
     next.mastery[tag] ← { tag, xp: xp', level: lvl', prestigeCount: t.prestigeCount }
     for l in (t.level, lvl']:                   // level бүрд НЭГ event
        next.masteryPoints ← next.masteryPoints + 1
        events.push(MASTERY_LEVEL_UP { tag, level: l, masteryPoints: next.masteryPoints })
  return { state: next, events }
```

**Хилийн шийдвэрүүд:**
- **Level 10-д XP царцана** (`continue`). Эс бөгөөс `xp` хязгааргүй өснө, `prestige`
  хийхэд `xp ← 0` болж хуримтлал АЛГА болно — тоглогч «алдсан» мэдрэмж авна.
- `unique(tags)` — `QuestDefinition.tags` нь `uniqueItems: true` (гэрээ) тул онолын
  хамгаалалт; гэвч `attemptBoss` нь боссын tags-ийг дамжуулдаг тул давхар хамгаална.
- `masteryPoints` нь **үлдэгдэл** тул level-up бүрд `+1` (`P-20`).

**`prestigeMastery`:**
```
if tag ∉ SKILL_TAGS                         → reject INVALID_INPUT
t ← trackOf(state, tag)
if t.level !== MASTERY_PRESTIGE_LEVEL       → reject PREREQ_NOT_MET, detail `${tag} must be level 10`
next.mastery[tag] ← { tag, xp: 0, level: 1, prestigeCount: t.prestigeCount + 1 }
events ← [ MASTERY_PRESTIGED { tag, prestigeCount: t.prestigeCount + 1 } ]
// ⚠ masteryPoints БУУРАХГҮЙ — олдсон томьёо нь prestigeCount×9-ээр нөхөгдөнө
```

**Инвариантын нотолгоо (тестийн зорилт `T-08`):** prestige-ийн ӨМНӨ
`earned = (10−1) + p×9 = 9 + 9p`; ДАРАА нь `(1−1) + (p+1)×9 = 9 + 9p`. **ТЭНЦҮҮ** —
prestige нь оноог үүсгэхгүй ч буцааж авахгүй. Хоёр дараалсан prestige → `earned = 18`.

**`earnedMasteryPoints(state) = Σ_tags ((level − 1) + prestigeCount × 9)`.**
Инвариантын тест: `state.masteryPoints + spentMasteryPoints(state, pack) === earnedMasteryPoints(state)`,
энд `spent = |{ id ∈ unlockedSkillIds : skill(id).tier >= 2 }|`.

### 6.2 `reputation.ts` (T-11 · AC RET-5, RET-6)

```ts
export function guildFor(tag: SkillTag, pack): GuildDefinition | undefined;
export function rankOf(rep: number): 0 | 1 | 2 | 3 | 4;
export function repAward(track: 'main'|'boss'|'dungeon'|'side', n: number, m?: number): number;
export function grantReputation(state, tags, track, n, pack): { state, events };
```

```
rankOf(rep)      = REP_THRESHOLDS.filter(t => rep >= t).length          // 0..4
repAward(tr,n,m) = floor(REP_BASE[tr] × (m ?? 0.5) ^ (n − 1))           // side: 2,1,0,0…

grantReputation(state, tags, track, n, pack):
  amount ← repAward(track, n)
  if amount === 0: return { state, events: [] }                  // grind тэгд нийлнэ
  next ← state; events ← []
  for guild of unique(tags.map(t => guildFor(t, pack)).filter(Boolean)):
     total ← (next.reputation[guild.id] ?? 0) + amount
     next.reputation[guild.id] ← total
     events.push(REPUTATION_GAINED { guildId: guild.id, amount, total, rank: rankOf(total) })
  return { state: next, events }
```

⚠ **`unique(guild)`, `unique(tag)` БИШ.** Нэг quest нь `[blender, vfx]` гэсэн 2 tag-тай
байж хоёулаа НЭГ guild-д харгалзвал тэр guild `amount`-ыг **нэг удаа** авна.
Эс бөгөөс олон tag-тай quest нь rep-ийг үржүүлж, `RET-5`-ийн «+1..3» хязгаарыг зөрчинө.

**`n` (гүйцэтгэлийн дугаар) хаанаас ирэх вэ:**

| Дуудагч | `track` | `n` | Тэмдэглэл |
|---|---|---|---|
| `claimQuest` · main | `main` | `1` | Дахин claim хийх боломжгүй (`ALREADY_COMPLETED`) |
| `claimQuest` · dungeon-track | `dungeon` | `1` | Мөн адил |
| `claimQuest` · side | `side` | `priorCompletions + 1` | SQ-2-ийн бууралт үйлчилнэ |
| `attemptDungeon` (тэнцсэн) | `dungeon` | `1` | ⚠ **Дахин тэнцэхэд огт дуудагдахгүй** — XP 0, rep 0 |
| `attemptBoss` (тэнцсэн, анх) | `boss` | `1` | Дахин тэнцэхэд дуудагдахгүй |

⚠ **Rep уншигч нь ЗӨВХӨН `reputation.ts` · `cosmetics.ts` · `achievements.ts` ба
`gameService`** (`RET-6`) — §2-ийн Сканнер A хаана.

### 6.3 `chains.ts` (T-12 · AC RET-1…RET-3)

```ts
export function chainComplete(state, chain): boolean;
export function evaluateChains(state, ctx): { state, events };   // ⚠ Ctx — bonusXp-д addXp хэрэгтэй
```

```
chainComplete(state, chain):
  ts ← chain.steps.map(id => state.sideQuestStats[id]?.lastCompletedAt ?? null)
  if ts.some(t => t === null): return false                        // 4 алхам бүгд бүртгэлтэй
  for i in 1..3: if ts[i] < ts[i-1]: return false                  // ⚠ ЧАНД дараалал
  return true

evaluateChains(state, ctx):
  next ← state; events ← []
  for chain of ctx.pack.chains:
     if next.completedChainIds.includes(chain.id): continue        // ⚠ нэг л удаа (RET-2)
     if !chainComplete(next, chain): continue
     awarded ← addXp(next, chain.bonusXp)                          // ok биш байх боломжгүй
     next ← { ...awarded.state, completedChainIds: [...next.completedChainIds, chain.id] }
     events.push(...awarded.events, CHAIN_COMPLETED { chainId: chain.id, bonusXp: chain.bonusXp })
  return { state: next, events }
```

**Дарааллын харьцуулалт — яагаад мөрийн (`<`) харьцуулалт хангалттай.**
`lastCompletedAt` нь ISO-8601 UTC (`Z`) форматтай бөгөөд `dateTime()` regex түүнийг
шаарддаг. Ижил урттай ISO-8601 UTC мөрийн лексикографик эрэмбэ нь цаг хугацааны
эрэмбэтэй ТААРНА. ⚠ `+07:00` офсеттой мөр ирвэл энэ нь эвдэрнэ — гэвч `ctx.at` нь
`apply.ts`-аас ирдэг бөгөөд клиент `toISOString()` (үргэлж `Z`) ашиглана. Хамгаалалт:
`[U]` тест нь офсеттой мөр агуулсан төлөв дээр chain-ийг **дуусгахгүй** байхыг
шаардана (буруу дуусгахаас дуусгахгүй нь аюулгүй).

**`bonusXp`-ийн тааз (`RET-3`) нь `[C]` дүрэм, домэйн шалгалт БИШ:**
`bonusXp ≤ min{ q.xp : q ∈ pack.quests, q.track === 'main', q.world === chain.world }`.
Домэйн үед шалгах нь ажиллах үед татгалзал үүсгэж, контентын алдааг тоглогчийн
асуудал болгоно — validator нь пакетыг ачаалахаас нь өмнө унана (`BE-15`).

**Mastery ба rep — chain bonus дээр олгогдох УУ?**
**ҮГҮЙ** (A-LLD2-3). `MST-2` нь «quest/dungeon/side quest дуусахад **түүний** `tags`»
гэж заасан — chain нь `tags`-гүй нэгж. `RET-5` мөн адил `tags`-аас эхэлдэг.
Chain-ийн 4 алхам тус бүр өөрийн mastery/rep-ийг АЛЬ ХЭДИЙН олгосон; bonus дээр
дахин олгох нь давхар тооцоо болно. `bonusXp` нь character XP-д л нэмэгдэнэ.

### 6.4 `cosmetics.ts` (T-16 · AC COS-1…COS-4, RET-8)

```ts
export function isUnlocked(state, item: CosmeticItem, pack): boolean;
export function unlockedCosmetics(state, pack): CosmeticItem[];
export function setCampLayout(state, slots, pack): DomainResult;
```

**`isUnlocked` — `unlockSource.kind`-ийн ЯГ 5 салаа (`plan.md §12.5`):**

| `kind` | Нөхцөл |
|---|---|
| `quest` | `completedMainQuestIds.includes(refId)` ∨ `completedDungeonIds.includes(refId)` ∨ `sideQuestStats[refId] !== undefined` |
| `boss` | `bossAttempts.some(a => a.bossId === refId && TIER_RANK[a.tier] >= TIER_RANK[value])` |
| `achievement` | `achievementIds.includes(refId)` |
| `guildRank` | `rankOf(reputation[refId] ?? 0) >= Number(value)` |
| `mastery` | `trackOf(state, refId).level >= Number(value)` |

⚠ `boss` нөхцөл нь **difficulty-ээс хамаарахгүй** — hard mode нь нэмэлт сорилт,
өөр шагналын зам БИШ (`BSX-4`-ийн «нэмэлт нөөцийн хаалт байхгүй» сүнс).

**`setCampLayout` — шалгах ДАРААЛАЛ (гэрээ):**
```
1. Object.keys(slots) ≠ COSMETIC_SLOTS-ийн багц       → INVALID_INPUT  (бүтцийн)
2. ∃ slot: value ≠ null ∧ pack.cosmetics-д БАЙХГҮЙ    → INVALID_INPUT  (бүтцийн)
3. ∃ slot: item.slot ≠ slot                           → INVALID_INPUT  (буруу үүрэнд)
4. ∃ slot: !isUnlocked(state, item, pack)             → PREREQ_NOT_MET (нөөцийн)
5. ok({ ...state, campLayout: { slots } }, [])        // ⚠ event БАЙХГҮЙ
```
Бүтцийн саад нь нөөцийн саадаас ӨМНӨ — `quests.ts`-ийн конвенц (PERSONAL-1 §5.4.3).
Event гаргахгүй: `campLayout` нь UI төлөв, `FX-1`-ийн бүртгэлд орох event БАЙХГҮЙ
(`D-6`). UI нь `DomainResult.ok` дээр өөрөө дахин зурна.

**Streak шагнал (`RET-8`) ба prestige цол (`MST-3`) — шинэ код БАЙХГҮЙ.**
Хоёулаа `kind: 'achievement'` cosmetic (`P-22`): `streakDays` ба `prestigeCount`
предикаттай амжилт нь зангуу болно. Тиймээс `T-24`-ийн каталогт **ЗААВАЛ**:
`streakDays ∈ {3, 7, 14, 30}` (4 амжилт) ба `prestigeCount >= 1` (≥1 амжилт).
Дутуу бол `COS-2`-ийн өнчин шалгалт УНАНА — энэ нь хоёр AC-г нэг тестээр холбоно.

### 6.5 `replayLog.ts` (T-06 · AC SVX-2)

```ts
export function appendReplay(state: GameState, entry: ReplayLogEntry): GameState {
  const log = [...state.replayLog, entry];
  return { ...state, replayLog: log.slice(-REPLAY_LOG_CAP) };   // FIFO — хуучин нь унана
}
```
⚠ `slice(-500)` нь массивыг хуулна: `O(500)` тогтмол. Үйлдэл тутам 1 удаа дуудагдана
(зөвхөн `attemptBoss` — `P-24`) тул `QX-6`-д нөлөөгүй.
**Тест:** 500 бичлэгтэй төлөвт 501 дэх нэмэхэд урт нь 500, эхний бичлэг АЛГА, сүүлийнх нь шинэ.

### 6.6 `skillTree.ts` + `progression.ts` (T-14 · AC SKL-1…SKL-5, MST-4)

#### 6.6.1 Tier ангилал — 24 хуучин node БҮГД tier 1

**Шийдвэр (A-LLD2-4 · Δ-3).** Одоогийн 24 node бүгд `tier: 1`. Шинэ node = **14**
(track тутамд 1 tier-2 + 1 tier-3). Нийт **38** (`SKL-1`-ийн ≥28 хангагдана).

**Яагаад «бүгд tier-1» нь цорын ганц зөв ангилал:**
`masteryPoints` инвариант нь `үлдэгдэл + зарцуулсан == олдсон`. Migration нь
`masteryPoints ← 0` бичнэ (mastery track бүгд level 1 → олдсон = 0). Хэрэв хуучин
node-уудын аль нэг нь tier-2 болбол, түүнийг нээсэн хуучин save-д
`зарцуулсан = 1 > олдсон = 0` болж инвариант ЗӨРЧИГДӨНӨ — `SVX-1`-ийн «хуучин
save-ийн утга өөрчлөгдөхгүй» шаардлагыг зөрчихгүйгээр засах арга БАЙХГҮЙ.

**Track хуваарилалт (24 node → 7 track, бүгд хамрагдсан):**

| Track | Одоогийн tier-1 node |
|---|---|
| `video-editing` | `sk-edit-fundamentals` · `sk-pacing` · `sk-color-correction` · `sk-color-grading` |
| `blender` | `sk-blender-navigation` · `sk-modeling` · `sk-uv-texturing` · `sk-shading` · `sk-lighting` · `sk-rendering` |
| `animation` | `sk-keyframing` · `sk-easing` · `sk-rigging` · `sk-character-animation` |
| `cinematography` | `sk-framing` · `sk-camera-movement` · `sk-coverage` |
| `audio` | `sk-audio-capture` · `sk-sound-design` · `sk-mixing` |
| `vfx` | `sk-compositing` · `sk-vfx-integration` |
| `storytelling` | `sk-story-structure` · `sk-visual-storytelling` |

⚠ Track бүрд ≥1 tier-1 БАЙНА (`SKL-1` хангагдсан). `T-19` нь эдгээрт `track`+`tier`
нэмж, track тутамд 1 tier-2 + 1 tier-3 node бичнэ. `cost` нь БҮГДЭД `1` хэвээр (`SKL-5`).
**DAG:** tier-2-ийн `prerequisites` нь тухайн track-ийн ≥1 tier-1 node; tier-3-ынх нь
тухайн track-ийн tier-2 node. Мөчлөгийн шалгалт нь `MQ-2`-ийн одоогийн алгоритмыг
дахин ашиглана (`content-rules.ts`).

#### 6.6.2 Валютын салаа ба `MST-4`-ийн уншилт

```ts
export const costCurrency = (s: SkillDefinition): 'skillPoints' | 'masteryPoints' =>
  s.tier === 1 ? 'skillPoints' : 'masteryPoints';
```

`unlockSkill`-ийн шалгах **ДАРААЛАЛ** (PRG-5-ийн бүтэц ХЭВЭЭР, дунд нь 2 алхам орлоо):
```
1. skill олдохгүй                                     → INVALID_INPUT
2. аль хэдийн нээгдсэн                                → ALREADY_COMPLETED
3. prerequisites дутуу                                → PREREQ_NOT_MET
4. tier === 3: capstoneGaps(...) ≠ []                 → PREREQ_NOT_MET, detail = gaps.join('; ')
5. tier === 2: mastery[skill.track].level < 2         → PREREQ_NOT_MET, detail = `${track} mastery 2 required`
6. costCurrency === 'skillPoints'  ∧ skillPoints < 1  → INSUFFICIENT_SKILL_POINTS
   costCurrency === 'masteryPoints' ∧ masteryPoints < 1 → INSUFFICIENT_SKILL_POINTS
7. ok — харгалзах валютаас 1 хасаж, id-г нэмнэ
```

**⚠ `MST-4`-ийн уншилт (A-LLD2-5 · §13.3 H-1′).**
`MST-4` нь «зөвхөн `track` таарах skill node-д зарцуулагдана; таарахгүй node-д
зарцуулах оролдлого `PREREQ_NOT_MET`» гэсэн. `plan.md §11.1` нь `masteryPoints`-ийг
**скаляр** сан (`int`) болгосон. Хоёрыг НЭГЭН зэрэг хангах уншилт нь дээрх **5-р алхам**:
оноо нь фунгибл, харин node-ийн ӨӨРИЙН track нь ахисан байхыг шаардана
(tier-2 → `mastery.level ≥ 2`; tier-3 → `≥ 8`, `SKL-2`-оос).

**Өөр уншилт:** `masteryPoints: Record<SkillTag, number>` (track тутмын сан). Тэгвэл
«track таарах» нь шууд утгаараа биелнэ. **Сэлгэх өртөг:** `contracts.yaml`-ийн 1
талбар (`int` → `rec(int)`), `MIGRATIONS[2]`-ийн 1 мөр, `skillTree.ts`-ийн 2 мөр,
`§12.1`-ийн инвариант нь track тутам шалгагдана. `T-14` · `T-31` хоёр л хөндөгдөнө.
⚠ Энэ нь `plan.md` H-1-ийн ДЭД асуулт — H-1 хариулагдах үед хамт шийдэгдэнэ.

#### 6.6.3 `capstoneGaps` — `SKL-2`-ийн «legible failure»

```ts
export function capstoneGaps(state, skill: SkillDefinition, pack): string[] {
  const gaps: string[] = [];
  if (trackOf(state, skill.track).level < 8)
    gaps.push(`${skill.track} mastery must reach 8`);
  const tier1 = pack.skills.filter(s => s.track === skill.track && s.tier === 1);
  const missing = tier1.filter(s => !state.unlockedSkillIds.includes(s.id));
  if (missing.length) gaps.push(`unlock ${missing.length} more tier-1 node(s) in ${skill.track}`);
  const bosses = pack.quests.filter(q => q.track === 'boss' && q.tags.includes(skill.track));
  const cleared = state.bossAttempts.some(a =>
    bosses.some(b => b.id === a.bossId) && TIER_RANK[a.tier] >= TIER_RANK.advanced);
  if (!cleared) gaps.push(`log an advanced-or-better attempt on a ${skill.track} boss`);
  return gaps;                                  // ХООСОН = нээж болно
}
```

**⚠ «track-д харгалзах boss» — Δ-2.** Спекэд зураглал БАЙГААГҮЙ. Энэ загвар нь
`boss.tags ∋ track` гэж тодорхойлов (тусдаа хүснэгт ЗОХИОХГҮЙ — `tags` нь аль
хэдийн байгаа). Үүнээс **шинэ `[C]` дүрэм** гарна:
`∀ tag ∈ SKILL_TAGS: ∃ boss ∈ pack.quests[track=boss] : tag ∈ boss.tags`.
Одоогийн `boss-strange-room` нь `[storytelling, cinematography]`-г хамарна;
`T-20`-ийн 4 шинэ boss нь үлдсэн 5 tag-ийг (`video-editing` · `blender` ·
`animation` · `audio` · `vfx`) хамрах ЁСТОЙ. Дүрэмгүй бол зарим capstone
**хэзээ ч нээгдэхгүй** — тоглогчид харагдахгүй мухардал.

#### 6.6.4 `respecTree` (`SKL-3` · `P-19`)

```
respecTree(state, track, at, pack):
  if track ∉ SKILL_TAGS                                             → INVALID_INPUT
  if state.respecAt ≠ null ∧
     daysBetween(dayOf(state.respecAt), dayOf(at)) < RESPEC_COOLDOWN_DAYS
                                                                    → RESPEC_ON_COOLDOWN
  ids ← unlockedSkillIds ∩ { s.id : s.track === track }
  if ids.length === 0                                               → PREREQ_NOT_MET
  refundSp ← |{ id ∈ ids : tier(id) === 1 }|
  refundMp ← |{ id ∈ ids : tier(id) >= 2 }|
  ok({ ...state,
       unlockedSkillIds: unlockedSkillIds \ ids,
       skillPoints:   skillPoints + refundSp,
       masteryPoints: masteryPoints + refundMp,
       respecAt: at },
     [ SKILL_UNLOCKED БИШ — event БАЙХГҮЙ ])
```
⚠ **Event гаргахгүй.** `FX-1`-ийн 12 мөрт respec БАЙХГҮЙ; шинэ event нэмэх нь
`P-8`-ийн «ЯГ дөрөв»-ийг зөрчинө. UI нь `ok` дээр дахин зурж, `aria-live`-аар
«N points refunded» гэж мэдэгдэнэ (`FX-6`-ийн зарчим, `fx.ts`-ээс ГАДУУР).

⚠ **Инвариант хадгалагдана:** буцаагдсан `refundMp` нь `зарцуулсан`-аас хасагдаж
`үлдэгдэл`-д нэмэгдэнэ → нийлбэр ӨӨРЧЛӨГДӨХГҮЙ. Тест: 2 tier-2 node нээж respec
хийсний дараа `masteryPoints + spent === earned` хэвээр.

### 6.7 `boss.ts` v2 (T-13 · AC BSX-1…BSX-6)

```ts
export type BossInput = { bossId: string; scores: BossScores; difficulty?: DifficultyTier };
export function tierFor(total: number, difficulty: DifficultyTier = 'standard'): BossTier;
export function personalBest(state, bossId, difficulty): number;   // max(total), байхгүй бол 0
```

```
tierFor(total, difficulty):
  T ← difficulty === 'hard' ? HARD_BOSS_TIERS : BOSS_TIERS
  if total >= T.mastery  return 'mastery'
  if total >= T.advanced return 'advanced'
  if total >= T.mvp      return 'mvp'
  return 'failed'
```

**⚠ Гарын үсгийн нийцтэй байдал.** `tierFor(total)` нь PERSONAL-1-д нэг аргументтай
байсан. `difficulty` нь **сонголттой, анхдагч `standard`** — одоо байгаа бүх дуудагч
ба тест ӨӨРЧЛӨГДӨХГҮЙ (`QX-1`).

**`BSX-2`-ийн «урвуулалт байхгүй» — 61 утгын хүснэгтэн тест (`T-13`).**
`∀ total ∈ 0..60 : TIER_RANK[tierFor(total,'standard')] >= TIER_RANK[tierFor(total,'hard')]`.
Хилийн утга: `40/41` (mvp), `51/52` (advanced), `59/60` (mastery).

**`attemptBoss`-ийн шинэ алхмууд** (§7.3-ийн бүрэн дараалал):
```
…одоогийн үнэлгээ…
attempt ← { bossId, at, scores, total, tier, difficulty }
next    ← { ...state, bossAttempts: [...bossAttempts, attempt] }
next    ← appendReplay(next, { at, kind: 'boss', refId: bossId,
                               outcome: tier === 'failed' ? 'failed' : 'passed' })   // BSX-6
BOSS_ATTEMPT_LOGGED { bossId, total, tier, difficulty, personalBest, [message] }
…тэнцсэн ба анх удаа бол addXp → mastery → rep → амжилт (§7.3)…
```

**`BSX-5` — дасгалжуулах мессеж.** `coachingMessage` нь `difficulty`-г **авахгүй**
ба формат нь ЯГ хэвээр. Тестийн шаардлага: ижил `scores`-той standard ба hard
оролдлогын `data.message` нь **тэмдэгт тэмдэгтээрээ ижил**.

**`BSX-4` — rematch.** Шинэ хаалт БАЙХГҮЙ: cooldown талбар нэмэгдээгүй, `staminaCost`
нь boss quest-ийнх хэвээр. **Тест:** нэг `at` дээр 5 дараалсан `attemptBoss` нь 5
бичлэг үүсгэж, 5 дахь нь татгалзахгүй.

**`BSX-3` — хувийн дээд амжилт.**
`personalBest(state, bossId, d) = max({0} ∪ { a.total : a.bossId === bossId ∧ a.difficulty === d })`.
`max` нь монотон тул «муу оролдлого бүртгэхэд буурахгүй» шинж **өөрөө батлагдана** —
тусдаа хамгаалалт хэрэггүй (`P-2`).

### 6.8 `dungeons.ts` — `markDungeonPassed` (T-09 · T-15 · **Δ-1**)

**Зөрүү.** `plan.md §11.1` нь `dungeonStats`-ийн бичигчийг `dungeons.ts` гэж заасан.
Гэвч `quests.ts:70-73` нь `track === 'dungeon'` quest-ийг мөн дуусгаж
`completedDungeonIds`-д бичдэг (`shared/content/index.ts → questForDungeon` нь
dungeon бүрийг quest хэлбэрээр МӨН гаргадаг). Хоёр зам, нэг талбар.

**Шийдэл.** `dungeons.ts`-д экспортлогдох туслах, ХОЁУЛАА түүгээр дамжина:
```ts
export function markDungeonPassed(state: GameState, dungeonId: string, at: string): GameState {
  const done = state.completedDungeonIds.includes(dungeonId)
    ? state.completedDungeonIds : [...state.completedDungeonIds, dungeonId];
  return { ...state, completedDungeonIds: done,
           dungeonStats: { ...state.dungeonStats, [dungeonId]: { lastPassedDate: dayOf(at) } } };
}
```
⚠ `lastPassedDate` нь **дахин тэнцэх бүрд шинэчлэгдэнэ** (XP 0 байсан ч). Refresher нь
«хамгийн сүүлд хэзээ хүрсэн» гэдгийг хэмждэг — дахин тэнцсэн dungeon 14 хоногийн
дараа л дахин нэр дэвшинэ. Эс бөгөөс тоглогч давтсан зүйлээ дахин санал болгуулна.

**`architecture.test.ts`-ийн шинэ дүрэм:** `dungeonStats:` гэсэн бичилт
`shared/core/**` дотор ЗӨВХӨН `dungeons.ts` ба `saves.ts`(`newGame`)-д олдоно.

### 6.9 `dailyMission.ts` — refresher (T-15 · AC RET-4)

**Гарын үсэг ӨӨРЧЛӨГДӨХГҮЙ:** `pickDailyMission(state, date, pack)`. Refresher-т
шаардлагатай бүх өгөгдөл (`state.dungeonStats`, `date`) аль хэдийн байна.

```
pickDailyMission(state, date, pack):
  …одоогийн pool · previous шүүлт · TIERS гогцоо ХЭВЭЭР…

  // ⬇ ШИНЭ — TIERS гогцоо ЮУ Ч ОЛООГҮЙ үед л (RET-4)
  refresh ← pack.quests.filter(q =>
      q.track === 'dungeon'
      ∧ q.levelRequired <= state.level
      ∧ (state.dungeonStats[q.id]?.lastPassedDate ?? null) !== null
      ∧ daysBetween(state.dungeonStats[q.id].lastPassedDate, date) >= REFRESHER_MIN_DAYS)
    .sort(world, levelRequired, id)                      // TIERS-тэй ИЖИЛ эрэмбэ
  if refresh.length > 0: return refresh[fnv1a(date) % refresh.length].id

  return null                                            // «Rest day» ХЭВЭЭР
```

**Детерминизм (`DM-1`) хадгалагдана:** `fnv1a(date)` ижил, `state` ижил → гаралт ижил.
**`DM-2` хадгалагдана:** boss/raid track энд ч шүүгдээгүй (`q.track === 'dungeon'` л).
**`previous` шүүлт:** refresher pool-д хэрэглэгдэхгүй — `pool.length >= 2` нөхцөл нь
үндсэн pool дээр ажилладаг. ⚠ Хэрэв refresher нь өчигдрийнхтэй ижил гарвал тоглогч
хоёр өдөр дараалан ижил зүйл харна. **Тестийн шаардлага (`T-15`):** refresh pool
≥2 үед өмнөх `dailyMission.questId`-г мөн адил хасна — TIERS-ийн зан төлөвтэй нэгэн ижил.

### 6.10 `achievements.ts` v2 (T-17 · AC RET-7)

`satisfied()`-д 5 шинэ `kind`. Бүгд `def.predicate.ref` (сонголттой) ашиглана:

| `kind` | `ref` байхад | `ref` БАЙХГҮЙ (= «дурын нэг») |
|---|---|---|
| `masteryLevel` | `trackOf(state, ref).level >= v` | `∃ tag : level >= v` |
| `prestigeCount` | `trackOf(state, ref).prestigeCount >= v` | `Σ_tags prestigeCount >= v` |
| `guildRank` | `rankOf(reputation[ref] ?? 0) >= v` | `∃ guild : rank >= v` |
| `bossPersonalBest` | `max{ a.total : a.bossId === ref } >= v` | `max{ a.total } >= v` |
| `chainsCompleted` | — (`ref` ашиглагдахгүй) | `completedChainIds.length >= v` |

⚠ `prestigeCount`-ийн «дурын нэг» нь **нийлбэр**, `∃` БИШ: «Prestige 3 удаа» гэсэн
амжилт нь нэг track-д 3 удаа ч, 3 track-д нэг удаа ч биелэх нь тоглогчийн хүлээлттэй нийцнэ.
⚠ `bossPersonalBest` нь **difficulty-г нэгтгэнэ** (`P-23`) — `total` нь хоёуланд нь 0..60
нэг хуваарьтай тул нэгтгэх нь утгатай.

**Гүйцэтгэл (`QX-6`).** `evaluateAchievements` нь үйлдэл тутам ≥40 предикат үнэлнэ.
`sideQuestCompletions` нь `Object.values(...).reduce` — `O(|sideQuestStats|)`.
Бусад бүгд `O(1)` эсвэл `O(|bossAttempts|)`. ⚠ `bossPersonalBest` ба `bossTier` нь
`bossAttempts`-ийг гүйлгэнэ; `bossAttempts` нь **хязгааргүй өснө** (`BSX-4` rematch
хязгааргүй). 10× пакет + 500 оролдлого → `40 × 500 = 20,000` харьцуулалт ≈ 1 ms.
**≤50 ms-ийн төсөвт багтана** (§11.1) — таслалт НЭМЭХГҮЙ (`BS-4` нь бүх оролдлогыг
хадгалахыг шаарддаг).

---

## 7. Үйлдлийн дарааллын гэрээ

⚠ **Дүрэм:** mastery ба reputation нь **амжилтын үнэлгээнээс ӨМНӨ**. Эс бөгөөс
`masteryLevel` · `guildRank` предикаттай амжилт нэг үйлдэл ХОЦРОЖ олгогдоно.
`plan.md §13.2` нь `claimQuest`-ийг заасан; энд **гурвуулангийнх** нь зурагдав.

### 7.1 `claimQuest` — 8 → 11 алхам (T-09 · T-11 · T-12)

```
1.  stamina зарцуулалт                                  (STAMINA_SPENT)
2.  XP олголт: side бол sideQuestXp(...), эс бол quest.xp (XP_GAINED · LEVEL_UP · SKILL_POINT_GAINED)
3.  бүртгэл: main / dungeon(→ markDungeonPassed) / side  (QUEST_COMPLETED | SIDE_QUEST_COMPLETED)
3a. ⬅ ШИНЭ  addMasteryXp(next, quest.tags, xpAward)      (MASTERY_LEVEL_UP × k)
3b. ⬅ ШИНЭ  grantReputation(next, quest.tags, track, n)  (REPUTATION_GAINED × g)
3c. ⬅ ШИНЭ  side бол evaluateChains(next, ctx)           (XP_GAINED · CHAIN_COMPLETED)
4.  streak ба combo                                      (STREAK_EXTENDED | STREAK_RESET · COMBO_CHANGED)
5.  cosmetic шагнал (coins, loot)                        (COINS_GAINED · LOOT_DROPPED)
6.  санамсаргүй тохиолдол, ≤1                            (ENCOUNTER_TRIGGERED)
7.  амжилт — ЭЦСИЙН төлөв дээр                            (ACHIEVEMENT_UNLOCKED × m)
```

**⚠ `3a`-гийн XP нь `xpAward`** — олгогдсон утга, `quest.xp` БИШ (`P-17`).
Давтагдах side quest-ийн 4 дэх гүйцэтгэл `40 → 5 XP` бол mastery-д ч `5`.
**⚠ `3c` нь `3` ба `3a`-гийн ДАРАА** — `sideQuestStats` шинэчлэгдсэн байх ёстой,
эс бөгөөс сүүлийн алхам chain-ийг «дуусаагүй» гэж уншина.
**⚠ `3c`-ийн `bonusXp` нь `3a`-д ОРОХГҮЙ** (A-LLD2-3, §6.3).
**⚠ Дарааллын тест (`T-09`, `T-11`, `T-12`):** `events` массивын индексээр
`MASTERY_LEVEL_UP` < `ACHIEVEMENT_UNLOCKED`, `REPUTATION_GAINED` < `ACHIEVEMENT_UNLOCKED`
болохыг шалгана — дараалал нь гэрээ, тестээр хаагдана.

### 7.2 `attemptDungeon` (T-09 · T-15)

```
унасан  → DUNGEON_FAILED (төлөв ӨӨРЧЛӨГДӨХГҮЙ) — mastery, rep, chain ОЛГОГДОХГҮЙ
тэнцсэн → DUNGEON_PASSED
   дахин тэнцсэн (completedDungeonIds-д байгаа):
          markDungeonPassed(...)    ⬅ ШИНЭ: огноо ШИНЭЧЛЭГДЭНЭ, XP 0, mastery 0, rep 0
          return
   анх удаа:
          addXp(dungeon.xp) → markDungeonPassed → addMasteryXp(tags, dungeon.xp)
          → grantReputation(tags, 'dungeon', 1) → streak → rewards → амжилт
```
⚠ **Унасан оролдлогод `replayLog` бичигдэхгүй** — `P-24` нь бичигчийг `attemptBoss`
ганцаар заасан. `ReplayLogEntry.kind` нь `dungeon`-ийг агуулдаг ч энэ ажилд
бичигдэхгүй (Wave 3-ын зай).

### 7.3 `attemptBoss` (T-13)

```
1.  боссын үнэлгээ · tier (difficulty-ээр)
2.  bossAttempts += attempt
3.  appendReplay(kind:'boss')                    ⬅ ШИНЭ (BSX-6)
4.  BOSS_ATTEMPT_LOGGED { …, difficulty, personalBest, [message] }   ⬅ өргөтгөв
5.  тэнцсэн ∧ анх удаа:  addXp(boss.xp) → completedMainQuestIds += bossId → BOSS_PASSED
5a. ⬅ ШИНЭ  addMasteryXp(boss.tags, boss.xp)
5b. ⬅ ШИНЭ  grantReputation(boss.tags, 'boss', 1)
6.  амжилт — ЭЦСИЙН төлөв дээр
```
⚠ Дахин тэнцэхэд `5…5b` алгасагдана (XP 0 — `BS-2`), гэвч `2`, `3`, `4`, `6` нь
АЖИЛЛАНА: rematch нь дээд амжилт ба амжилтыг (`bossPersonalBest` предикат) шинэчилнэ.

### 7.4 `apply.ts` — диспетчерийн 3 шинэ `case` (T-18)

```ts
case 'prestigeMastery': return prestigeMastery(state, payload.tag as SkillTag);
case 'respecTree':      return respecTree(state, payload.track as SkillTag, actionCtx.at, actionCtx.pack);
case 'setCampLayout':   return setCampLayout(state, payload.slots as CampLayoutSlots, actionCtx.pack);
```
`KNOWN_TYPES`-д гурвыг нэмнэ. `switch`-ийн `never` шалгалт нь дутуу үлдэхийг УНАГААНА
(одоо байгаа хамгаалалт).

`bossAttempt`: `difficulty: (payload.difficulty as DifficultyTier) ?? 'standard'`.
`updateSettings`: 4 талбарын `typeof` шалгалт (одоогийн хэв маяг), `soundVolume` нь
`typeof === 'number' ∧ 0 <= v <= 1` үед л солигдоно.

---

## 8. `shared/content` ба контентын дүрэм

### 8.1 `buildPack()` өргөтгөл (T-21…T-23)

```ts
return { …, guilds: guilds as GuildDefinition[],
             chains: chains as SideQuestChain[],
             cosmetics: cosmetics as CosmeticItem[] };
```
⚠ `contentVersion(pack)` нь `canonicalJson`-оос гардаг тул шинэ хэсэг нэмэгдмэгц
ETag автоматаар солигдоно — клиентийн кэш хүчингүй болно (`BE-6` хэвээр).

### 8.2 `content-rules.ts` — `[C]` дүрмийн ГАНЦ модуль (T-03 · T-25 · `P-12`)

```ts
export type ContentIssue = { rule: string; path: string; message: string };
export function checkContent(pack: ContentPack): ContentIssue[];
```
CLI (`scripts/validate-content.mjs`) ба `[C]` vitest тестүүд **хоёулаа энэ функцийг**
дуудна. CLI: `issues.length ? (print, exit 1) : exit 0`.

**PERSONAL-2-д нэмэгдэх дүрмүүд (14):**

| # | Дүрэм | AC |
|---|---|---|
| C-01 | Дэлхий тутамд `track:'boss'` quest ЯГ 1 (нийт 5) | BSX-1 |
| C-02 | `∀ tag ∈ SKILL_TAGS : ∃ boss : tag ∈ boss.tags` | SKL-2 (Δ-2) |
| C-03 | `skills.length >= 28`; track тутамд ≥1 tier-1, ≥1 tier-2, **ЯГ 1** tier-3 | SKL-1 |
| C-04 | tier-N node-ийн `prerequisites` нь тухайн track-ийн tier-(N−1) node агуулна | SKL-1 |
| C-05 | Skill-ийн урьдчилсан нөхцөл нь DAG (мөчлөггүй) | SKL-1 |
| C-06 | PERSONAL-1-ийн 24 node-ийн `id·title·description·cost` ӨӨРЧЛӨГДӨӨГҮЙ | SKL-5 |
| C-07 | `guilds.length === 4`; `id`-ууд нь `GUILD_IDS`-тэй ЯГ таарна | RET-5 (§5.3) |
| C-08 | 7 `SkillTag` бүр ЯГ НЭГ guild-д (давхцалгүй, дутуугүй) | RET-5 |
| C-09 | `chains.length >= 3`; алхам ЯГ 4; бүгд оршин буй `track:'side'` quest; chain хооронд давхцалгүй | RET-1 |
| C-10 | `chain.bonusXp <= min{ q.xp : q.track==='main' ∧ q.world===chain.world }` | RET-3 |
| C-11 | `cosmetics.length >= 60`; slot тутамд ≥5; `effect === 'cosmetic'` | COS-1 |
| C-12 | `unlockSource.refId` нь БОДИТ id-д заана (`kind`-ээс хамаарсан 5 багц); `value` нь мужид | COS-2 |
| C-13 | `achievements.length >= 40`; `streakDays ∈ {3,7,14,30}` ба `prestigeCount>=1` предикат БАЙНА | RET-7, §6.4 |
| C-14 | `predicate.ref` нь `kind`-д тохирох багцад (SkillTag / guildId / bossId) | RET-7 |

⚠ **«Сканнер өөрөө хазна» (`T-25`):** дүрэм тутамд, тухайн дүрмийг ЗӨРЧСӨН гуйвуулсан
пакет дээр `checkContent` нь ЯГ тэр `rule`-ийг буцаахыг батлана. 14 дүрэм → 14 тест.

### 8.3 Контентын хэмжээний нөлөө (`QX-4` · `QX-3`)

| Хэсэг | Тоо | Ойролцоо raw | gzip (≈) |
|---|---|---|---|
| `cosmetics.json` | 60 | 8.0 KB | 1.5 KB |
| `mainQuests.json` +4 boss | 4 | 6.0 KB | 1.5 KB |
| `skills.json` +14 node, 38-д `track`+`tier` | 14 | 3.5 KB | 0.7 KB |
| `achievements.json` 21 → 40 | +19 | 3.0 KB | 0.7 KB |
| `guilds.json` + `chains.json` | 4 + 3 | 1.0 KB | 0.3 KB |
| **Нийт контент** | | **21.5 KB** | **4.7 KB** |

`/content/pack` (`QX-4 < 2MB`): одоогийн пакет нь bundle-ийн дийлэнх (147 KB raw-ийн
ихэнх) — 21.5 KB нэмэгдсэн ч 2 MB-ийн 10%-д ч хүрэхгүй. **Эрсдэл БАГА.**

---

## 9. `web-app/` — харагдах байдал ба хариу үйлдэл

### 9.1 `ui/theme.ts` — палитр (T-27 · AC VIS-1…VIS-3)

#### 9.1.1 Гаргаж авах дүрэм (яагаад гараар сонгоогүй)

Токен бүр **тооцооноос** гарсан: дэлхий тутмын өнгөний өнцөг `H` сонгож, дараа нь
HSL-ийн гэрэлтэлтийг **хоёртын хайлтаар** тухайн хос нь зорилтот харьцаанд (`4.8:1`
текст · `3.3:1` UI — 4.5 ба 3.0-аас нөөцтэй) хүрэх хүртэл шилжүүлсэн.
⚠ Зорилт нь `4.8`/`3.3` ч **бодит hex-д дугуйрсны дараа** `4.78`/`3.29` болно
(8-бит суваг тутамд). Хоёулаа `VIS-2`-ийн `4.5`/`3.0`-аас дээгүүр — нөөц нь яг
энэ дугуйрлыг зориуд шингээхээр авагдсан. Тодруулга
(`accent` · `ok` · `warn`) нь «vibrant» шаардлагыг хангахаар гэрэлтэлтийн **шал**-тай
(0.62…0.64) — хамгийн бага хангалттай утга нь бүдэг гардаг.

Дэлхийн өнцөг: `camp 218` · `w1 205` · `w2 268` · `w3 158` · `w4 22` · `w5 330`.
Тодруулгын өнцөг: `camp 214 · w1 195 · w2 275 · w3 165 · w4 28 · w5 325`.

#### 9.1.2 Токенийн хүснэгт — 6 дэлхий × 19 токен

| Токен | `camp` | `w1` | `w2` | `w3` | `w4` | `w5` |
|---|---|---|---|---|---|---|
| `--bg` | `#0c0f16` | `#0c1116` | `#100c16` | `#0c1612` | `#160f0c` | `#160c11` |
| `--surface` | `#161b25` | `#161f25` | `#1d1625` | `#16251f` | `#251b16` | `#25161d` |
| `--surface-2` | `#1f2530` | `#1f2930` | `#271f30` | `#1f302a` | `#30251f` | `#301f28` |
| `--border` | `#5c6d8a` | `#587284` | `#786192` | `#517a6b` | `#846858` | `#8d5e75` |
| `--border-strong` | `#7486a6` | `#6d8ca2` | `#917bab` | `#639b87` | `#a2816e` | `#a8768f` |
| `--text` | `#e9ecf1` | `#e9eef1` | `#ede9f1` | `#e9f1ee` | `#f1ece9` | `#f1e9ed` |
| `--muted` | `#a5afc0` | `#a5b5c0` | `#b2a5c0` | `#a5c0b6` | `#c0afa5` | `#c0a5b3` |
| `--text-on-focus` | `#000000` | `#000000` | `#000000` | `#000000` | `#000000` | `#000000` |
| `--accent` | `#5c9aeb` | `#5cc7eb` | `#b15feb` | `#5cebc7` | `#eb9e5c` | `#eb5caf` |
| `--ok` | `#5ae293` | `#5ae293` | `#5ae293` | `#5ae293` | `#5ae293` | `#5ae293` |
| `--warn` | `#f7bc45` | `#f7bc45` | `#f7bc45` | `#f7bc45` | `#f7bc45` | `#f7bc45` |
| `--focus` | `#ffdd33` | `#ffdd33` | `#ffdd33` | `#ffdd33` | `#ffdd33` | `#ffdd33` |
| `--btn-bg` | `#1b2a43` | `#1b3243` | `#2e1b43` | `#1b4334` | `#432a1b` | `#431b2f` |
| `--btn-bg-hover` | `#24395e` | `#24465e` | `#3f245e` | `#245e49` | `#5e3924` | `#5e2441` |
| `--badge-ok-bg` | `#0c2717` | `#0c2717` | `#0c2717` | `#0c2717` | `#0c2717` | `#0c2717` |
| `--badge-ok-text` | `#98ebbb` | `#98ebbb` | `#98ebbb` | `#98ebbb` | `#98ebbb` | `#98ebbb` |
| `--badge-warn-bg` | `#291f0d` | `#291f0d` | `#291f0d` | `#291f0d` | `#291f0d` | `#291f0d` |
| `--badge-warn-text` | `#f9d894` | `#f9d894` | `#f9d894` | `#f9d894` | `#f9d894` | `#f9d894` |
| `--pip-off` | `#69758b` | `#667987` | `#7c6c8f` | `#618075` | `#877266` | `#8d6a7b` |

#### 9.1.3 colorBlindSafe — ЯГ 8 токенийн ГАНЦ хэсэг (бүх дэлхийд ИЖИЛ)

Протанопи/дейтеранопийн бодит эрсдэл нь **улаан↔ногооны семантик хос** (`ok`/`warn`),
дэлхийн гадаргуугийн өнгө БИШ (гадаргуу нь утга илэрхийлэхгүй). Тиймээс cb горим нь
семантик өнгийг л сольж, дэлхийн өвөрмөц байдлыг `bg`/`surface`-д үлдээнэ:

| Токен | cb утга | Өнцөг |
|---|---|---|
| `--accent` | `#eb5ceb` | 300 (magenta) |
| `--ok` | `#5ab0e2` | 202 (blue) |
| `--warn` | `#f7c845` | 44 (amber) |
| `--focus` | `#ffe433` | 52 |
| `--badge-ok-bg` | `#0c1d27` | 202 |
| `--badge-ok-text` | `#98cdeb` | 202 |
| `--badge-warn-bg` | `#29210d` | 44 |
| `--badge-warn-text` | `#f9de94` | 44 |

⚠ **Тооцооны илрүүлэлт:** эдгээр 8 утга нь 6 дэлхийд ЯГ ИЖИЛ гардаг (тэдгээр нь
`surface`-ээс хамаардаг ч `surface`-ийн ГЭРЭЛТЭЛТ дэлхий бүрд ижил — зөвхөн өнцөг
өөр). Тиймээс `theme.ts` нь `12 × 19 = 228` биш **`6 × 19 + 8 = 122`** утга хадгална
(**46% бага**). CSS-д нэг нэмэлт блокоор хэрэгжинэ:
```css
:root[data-world="2"] { --bg:#100c16; … }        /* 19 токен */
:root[data-cb="1"]    { --accent:#eb5ceb; … }    /* 8 токен — каскад дарна */
```
⚠ cb горимд `accent` нь **бүх дэлхийд ижил** болно — дэлхийн өвөрмөц байдал
`bg`/`surface`/`btn-*`-д үлдэнэ. Энэ нь ил гэрээ: `VIS-3` нь «зөвхөн өнгөний токен
солигдоно» гэж шаардсан, «дэлхийн ялгаа хадгалагдана» гэж шаардаагүй.

#### 9.1.4 Хадгалалтын хэлбэр ба bundle

```ts
export const TOKENS = ['bg','surface','surface-2','border','border-strong','text','muted',
  'text-on-focus','accent','ok','warn','focus','btn-bg','btn-bg-hover',
  'badge-ok-bg','badge-ok-text','badge-warn-bg','badge-warn-text','pip-off'] as const;

/** Токенийн ДАРААЛАЛ нь `TOKENS`-ийнх — `#` хасагдсан, урт тогтмол 6. */
export const PALETTES: Record<'camp'|'w1'|'w2'|'w3'|'w4'|'w5', readonly string[]> = {
  camp: ['0c0f16','161b25','1f2530','5c6d8a','7486a6','e9ecf1','a5afc0','000000',
         '5c9aeb','5ae293','f7bc45','ffdd33','1b2a43','24395e','0c2717','98ebbb',
         '291f0d','f9d894','69758b'],
  …
};
export const CB_OVERRIDE: Partial<Record<(typeof TOKENS)[number], string>> = {
  accent:'eb5ceb', ok:'5ab0e2', warn:'f7c845', focus:'ffe433',
  'badge-ok-bg':'0c1d27', 'badge-ok-text':'98cdeb',
  'badge-warn-bg':'29210d', 'badge-warn-text':'f9de94',
};
export function applyTheme(world: 1|2|3|4|5 | 'camp', colorBlindSafe: boolean): void;
```
⚠ Хэрэглэх арга: `document.documentElement.dataset.world` ба `.cb` **атрибутыг л**
солино (`VIS-1`). `style.setProperty` ашиглахгүй — DOM-ийн `style` шинж чанар
snapshot тестийг ялгаатай болгоно.

#### 9.1.5 Контрастын тест (`T-27` · AC VIS-2)

```
∀ palette ∈ {camp,w1..w5} × {энгийн, cb} :         // 12
  ∀ pair ∈ TEXT_PAIRS (14) : ratio >= 4.5
  ∀ pair ∈ UI_PAIRS   (5)  : ratio >= 3.0
```
**Нийт 228 баталгаа.** Хэмжигдсэн хамгийн муу утга: **текст 4.78:1** (`w2`-ийн
`accent/surface`) · **UI 3.29:1** (`camp` · `w2` · `w4` · `w5`-ийн `border/surface`). Хамгийн сайн 16.40:1.

⚠ Тест нь `PALETTES` + `CB_OVERRIDE`-оос **нийлүүлж** тооцно (`styles.css`-ийг
задлан ЗАДЛАХГҮЙ) → шинэ палитр нэмэхэд тест автоматаар хамарна (`VIS-2`-ийн шаардлага).
⚠ Хос бүрийн ангилал нь **ил гэрээ** (§14.2 `plan.md`): `pip-off` нь `.pips-text`
шошготой тул чимэглэл (3:1); ангиллыг өөрчлөх нь `T-27` ба `T-34`-д НӨЛӨӨЛНӨ.

#### 9.1.6 `styles.css` — хатуу hex ТЭГ (`P-26`)

Одоогийн 14 хатуу hex (`#2b3648` · `#3a475e` · `#1d2f4d` · `#24406b` · `#16351f` ·
`#b7f0be` · `#3a2f10` · `#ffe2a3` · `#ccf5d2` · `#55637a` · `#000` …) бүгд `var(--…)`
болно. `#ccf5d2` (`.sync-ok`) нь `--badge-ok-text`-д НЭГДЭНЭ.
**Сканнердсан тест (`T-27`):** `styles.css` дотор `:root[data-world]` ба `:root[data-cb]`
блокоос ГАДУУР `#[0-9a-f]{3,8}` олдвол УНАНА.

### 9.2 Дэлхийн сонголт — `data-world` хэзээ солигдох

| Маршрут | `data-world` |
|---|---|
| `#/camp` · `#/settings` · `#/achievements` · `#/trophies` · `#/forge` | `camp` |
| `#/quests` · `#/side` · `#/dungeons` · `#/skills` | тоглогчийн **идэвхтэй дэлхий** |

**Идэвхтэй дэлхий** = дуусгаагүй хамгийн бага `world`-тэй main quest-ийн `world`;
бүгд дууссан бол `5`. `gameService.view.activeWorld(): 1..5` (домэйн БИШ — цэвэр
дүрслэл, `D-6`-ийн хүчний хоригт хамаарахгүй).
⚠ **`VIS-1`-ийн snapshot тест:** ижил дэлгэцийг `data-world="1"` ба `"5"`-аар зурж
`outerHTML`-ийг харьцуулна — ЯЛГААГҮЙ байх ёстой (атрибут нь `<html>` дээр, дэлгэцийн
DOM дотор БИШ).

### 9.3 `ui/fx.ts` — juice-ийн ГАНЦ хаалга (T-28 · AC FX-1…FX-7)

#### 9.3.1 Бүртгэл — 12 мөр (`FX-1`-ийн бүрэн байдлын ЭХ)

| Event | Класс | Hz | `aria-live` текстийн эх |
|---|---|---|---|
| `LEVEL_UP` | `fx-levelup` | 880 | `data.rank` · `data.level` |
| `QUEST_COMPLETED` | `fx-claim` | 660 | `data.title` |
| `SIDE_QUEST_COMPLETED` | `fx-side` | 620 | `data.title` · `data.completions` |
| `DUNGEON_PASSED` | `fx-pass` | 740 | `data.correct` / `data.total` |
| `DUNGEON_FAILED` | `fx-fail` | 320 | `data.nextStep` |
| `ACHIEVEMENT_UNLOCKED` | `fx-achieve` | 990 | `data.title` |
| `LOOT_DROPPED` | `fx-loot` | 1040 | loot-ийн нэр ба rarity **текстээр** (`VIS-4`) |
| `BOSS_ATTEMPT_LOGGED` | `fx-boss` | 700 | `data.tier` · `data.total` · `data.difficulty` (+ унасан бол `data.message`) |
| `STREAK_EXTENDED` | `fx-streak` | 820 | streak-ийн өдрийн тоо |
| `MASTERY_LEVEL_UP` | `fx-mastery` | 900 | `data.tag` · `data.level` |
| `REPUTATION_GAINED` | `fx-rep` | 580 | `data.guildId` · `data.rank` |
| `CHAIN_COMPLETED` | `fx-chain` | 960 | `data.chainId` · `data.bonusXp` |

**Бүрэн байдлын тест (`T-28`):** `Object.keys(FX_REGISTRY)` нь дээрх 12-ын багцтай
ЯГ тэнцүү. Шинэ event нэмэгдээд бүртгэлд ороогүй бол тест УНАНА.

#### 9.3.2 ГАНЦ хаалга (`P-5` · AC FX-2, FX-3)

```ts
type FxSettings = { reducedMotion: boolean; soundEnabled: boolean; soundVolume: number };
export function play(events: DomainEvent[], settings: () => FxSettings): void;
```
```
play(events, settings):
  s ← settings()
  motionOff ← s.reducedMotion ∨ matchMedia('(prefers-reduced-motion: reduce)').matches
  soundOff  ← !s.soundEnabled ∨ s.soundVolume <= 0
  animated ← 0
  for e of events:
     row ← FX_REGISTRY[e.type]; if !row: continue
     announce(row.text(e.data))                       // ⬅ ҮРГЭЛЖ — FX-6
     if !motionOff ∧ animated < MAX_CONCURRENT_FX:    // FX-7
        addClass(row.cls); animated++
     if !soundOff: tone(row.hz, s.soundVolume)
```
⚠ **Анимац эхлүүлэх БУСАД зам БАЙХГҮЙ.** Сканнердсан тест (`T-28`): `src/ui/**`
дотор `classList.add('fx-` гэсэн бичилт ЗӨВХӨН `fx.ts`-д олдоно.
⚠ **Дуу ба анимац НЭГ гаралт** — тусдаа mute зам байхгүй (`FX-3`).
⚠ `announce` нь `motionOff`/`soundOff`-оос ҮЛ ХАМААРНА: анимац нь мэдээллийн
цорын ганц хэлбэр БИШ (`FX-6`).

#### 9.3.3 CSS — `FX-4` (≤300ms, зөвхөн `transform`/`opacity`)

```css
@keyframes fx-pop   { from { transform: scale(.94); opacity:.4 } to { transform: none; opacity:1 } }
@keyframes fx-shake { 0%,100%{transform:none} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
.fx-levelup,.fx-achieve,.fx-mastery,.fx-chain { animation: fx-pop 280ms ease-out }
.fx-claim,.fx-side,.fx-pass,.fx-loot,.fx-streak,.fx-rep,.fx-boss { animation: fx-pop 200ms ease-out }
.fx-fail { animation: fx-shake 240ms ease-in-out }
@media (prefers-reduced-motion: reduce) { [class*="fx-"] { animation: none !important } }
```
**Сканнердсан тест (`T-28`):** `styles.css`-ийн `@keyframes` блок бүрийн доторх
шинж чанар нь `transform` · `opacity` **зөвхөн** (layout хөдөлгөх `width` · `height` ·
`top` · `margin` … хориотой); `animation` товчлолын хугацаа бүр `<= 300ms`.
⚠ Медиа асуулт ба `fx.ts`-ийн хамгаалалт **ХОЁУЛАА** хэрэгтэй: медиа асуулт нь
класс нэмэгдэхийг зогсоохгүй (зөвхөн үргэлжлэлийг тэглэнэ), JS хамгаалалт нь
`settings.reducedMotion`-ийг хамарна (медиа асуулт үүнийг мэдэхгүй).

#### 9.3.4 `sound.ts`-тэй холбоо

`sound.ts` нь **устгагдахгүй** (`QX-1` — түүний 5 тест хэвээр). `CUE_EVENTS` нь
`fx.ts`-ийн `FX_REGISTRY`-ээс ГАРГАГДАНА:
```ts
export const CUE_EVENTS = Object.keys(FX_REGISTRY) as DomainEventType[];   // 4 → 12
```
⚠ Хоёр дахь жагсаалт үлдэхгүй (`P-5`). Одоогийн `TONE_HZ` нь `FX_REGISTRY[e].hz`-ээр
солигдоно. `createSoundCues(enabled)`-ийн гарын үсэг хэвээр — `fx.ts` нь түүнийг
дотроосоо дуудна, `enabled` нь `soundEnabled ∧ soundVolume > 0`.

### 9.4 Дэлгэцүүд

`ROUTES` **8 → 9**. Шинэ ЯГ НЭГ: `{ hash: '#/trophies', label: 'Trophy Room' }` (`P-14`).
Mastery нь тусдаа дэлгэц БИШ.

#### 9.4.1 Camp v2 (T-29 · AC VIS-6)

НЭГ дэлгэцэнд: rank/level/XP bar · stamina · streak · өдрийн даалгавар · дараагийн
төслийн үйлдэл (`UI-2` хэвээр) **+ 7 mastery track-ийн мини progress bar** + идэвхтэй
guild rank.

```
<section aria-labelledby="mastery-h">
  <h2 id="mastery-h">Mastery tracks</h2>
  <ul class="mastery-mini">
    <li>
      <span class="mastery-tag">Video Editing</span>
      <span class="mastery-lv">Lv 4</span>              ← VIS-4: түвшин ТЕКСТЭЭР
      <span class="mastery-pr" hidden-if-0>★2</span>     ← prestigeCount, тэмдэг + текст
      <div class="bar" role="img" aria-label="Video Editing mastery level 4, 210 of 500 XP">…</div>
    </li>  × 7
  </ul>
</section>
```
⚠ `role="img"` + `aria-label` — `statBar()` компонентийн одоогийн хэв маяг (PERSONAL-1 §7.4).
⚠ 7 мөр × 360px өргөнд хэвтээ гүйлгэлт үүсэхгүй (`VIS-5`): `grid-template-columns:
auto auto 1fr`, `min-width: 0`.

#### 9.4.2 Trophy Room (T-30 · AC COS-3, COS-4)

`#/trophies` — Camp-ийн дэд дэлгэц (Camp дээрээс холбоос, nav-д ч бас).

```
[ Slot шүүлтүүр: All | Avatar Frame | Camp Banner | Title | Decoration | UI Accent | Badge Frame ]
[ 60 карт, slot-оор бүлэглэсэн ]
  ┌────────────────────────────────┐
  │ ✓ Golden Razor Frame           │   ← нээгдсэн: ✓ тэмдэг + «Unlocked» текст (VIS-4)
  │ Rare · Avatar Frame            │   ← rarity ТЕКСТЭЭР, зөвхөн өнгөөр БИШ
  │ From: Achievement “First Blood”│
  │ [ Equip ] [ Unequip ]          │   ← <button>, setCampLayout дуудна
  └────────────────────────────────┘
  ┌────────────────────────────────┐
  │ 🔒 Signal Chain Banner         │   ← нээгдээгүй: 🔒 + «Locked» текст
  │ Epic · Camp Banner             │
  │ To unlock: reach Signal Chain  │   ← COS-3: «юу хийвэл нээгдэх» УНШИГДАХААР
  │ guild rank 3 (currently 1)     │   ← одоогийн явцыг МӨН харуулна
  └────────────────────────────────┘
```

**Нээх эх сурвалжийн текст (`gameService.view.cosmetics()`-д бүтнэ):**

| `kind` | Загвар |
|---|---|
| `quest` | `Complete “<quest title>”` |
| `boss` | `Reach <value> tier on “<boss title>”` |
| `achievement` | `Earn achievement “<title>”` |
| `guildRank` | `Reach <guild title> rank <value> (currently <rank>)` |
| `mastery` | `Reach <tag> mastery level <value> (currently <level>)` |

⚠ `Equip` товч нь **нээгдээгүй** элементэд БАЙХГҮЙ (товч нь `disabled` биш, огт
байхгүй) — `PREREQ_NOT_MET`-д хүргэх зам UI-д нээлттэй үлдээх нь тоглогчийг
мухардалд хүргэнэ. Домэйн шалгалт нь тэр ч байсан хэвээр (`setCampLayout` алхам 4).

#### 9.4.3 Skills v2 (T-31 · AC SKL-1…SKL-4, MST-3, MST-6)

```
[ Track таб: Video Editing | Blender | Animation | Cinematography | Audio | VFX | Storytelling ]
  ┌ Track толгой ─────────────────────────────────────────────┐
  │ Blender · Mastery Lv 8 · ★1 · 1,240 XP                     │
  │ [███████░░░] 8/10   [ Prestige ]  ← level 10 биш бол БАЙХГҮЙ│
  │ Skill points: 2  ·  Mastery points: 3                      │
  └───────────────────────────────────────────────────────────┘
  Tier 1  ○ Blender Navigation ✓   ○ Modeling ✓   ○ UV/Texturing [Unlock · 1 SP]
  Tier 2  ○ Procedural Shading [Unlock · 1 MP]
  Tier 3  ◆ Capstone: Pipeline Architect  🔒
          Needs: Blender mastery 8 ✓ · all 6 tier-1 nodes (2 left) ✗
                 · advanced attempt on a Blender boss ✗        ← capstoneGaps() мөр мөрөөр
  [ Reflect (respec Blender) ]   ← cooldown-д бол: «Available in 4 days», <button disabled>
```
⚠ Валют нь товчны шошгонд ИЛ (`1 SP` / `1 MP`) — `VIS-4`-ийн «зөвхөн өнгөөр биш».
⚠ Capstone-ийн дутуу нөхцөл бүр **тусдаа мөр**, ✓/✗ тэмдэг + текст (`SKL-2`-ийн
«АЛЬ нөхцөл дутсаныг нэрлэнэ»).
⚠ Respec cooldown-ийн үлдсэн өдөр нь `RESPEC_COOLDOWN_DAYS − daysBetween(...)` —
`gameService.view.respecAvailableIn(): number` (0 = боломжтой).

#### 9.4.4 Boss UI (T-32 · AC BSX-2…BSX-5)

```
Difficulty:  (•) Standard    ( ) Hard        ← <input type="radio" name="difficulty">
Thresholds shown:  MVP 35 · Advanced 45 · Mastery 52
                   (Hard: 41 · 52 · 60)      ← ИЛ харуулна (plan.md §12.2-ийн шаардлага)
Personal best — Standard: 47 (Advanced) · Hard: 38 (Failed)
[ 6 оноо: 0..10 slider/number ]
[ Log attempt ]     ← cooldown БАЙХГҮЙ (BSX-4); дараалан дарж болно
```
⚠ Hard mode-ийн `mastery` босго нь 60 = дээд тал — UI нь «All six categories must be
10» гэсэн тайлбартай (`plan.md §12.2`-ийн «тоглогч үүнийг таахгүй» шаардлага).
⚠ Унасан оролдлогын дасгалжуулах мессеж нь standard/hard хоёуланд ЯГ ижил (`BSX-5`).

#### 9.4.5 Settings (T-33 · AC VIS-3, FX-3)

Шинэ хоёр удирдлага, хоёулаа `updateSettings` руу:
```
[x] Color-blind safe palette      ← <input type="checkbox">, colorBlindSafe
Sound volume  [——●———] 60%        ← <input type="range" min=0 max=100 step=10>, soundVolume/100
```
⚠ `range`-ийн утга `0` нь бүрэн чимээгүй (`FX-3`) — `soundEnabled` чекбокс ХЭВЭЭР,
хоёр нь бие даасан. Текст шошго `60%` нь `aria-live`-гүй (`output` элемент).

### 9.5 `services/gameService.ts` — 6 шинэ `view.*` (`UI-3` хэвээр)

| View | Буцаах | Хэрэглэгч |
|---|---|---|
| `masteryTracks()` | `{ tag, level, xp, xpToNext, prestigeCount }[7]` | Camp · Skills |
| `guilds()` | `{ id, title, rep, rank, placeholder }[4]` | Camp · Trophy Room |
| `cosmetics()` | `{ item, unlocked, sourceText, equipped }[≥60]` | Trophy Room |
| `capstone(track)` | `{ skill, gaps: string[] }` | Skills |
| `bossBoard(bossId)` | `{ standard: { best, tier }, hard: { … }, thresholds }` | Boss |
| `respecAvailableIn()` | `number` (өдөр, 0 = боломжтой) | Skills |
| `activeWorld()` | `1..5` | `shell.ts` (`data-world`) |

⚠ `ui/**` нь `shared/core`-ыг ШУУД импортлохгүй (`QX-7`) — бүх шинэ дүрэм
`gameService`-ээр дамжина. `architecture.test.ts` хэвээр хаана.

### 9.6 Хүртээмж — шинэ элемент тутмын шалгалт (T-34)

| AC | Шинэ элементэд юу шалгагдана |
|---|---|
| VIS-4 | Mastery tier · rarity · difficulty · guild rank БҮГД текстээр давхарлагдсан (`toHaveTextContent`) |
| VIS-5 | Trophy Room ба Skills v2 нь 360 · 768 · 1280px-д `scrollWidth <= clientWidth` |
| VIS-7 | Trophy Room-ийн `Equip`, Skills-ийн `Prestige`/`Reflect`, Boss-ийн radio — бүгд `<button>`/`<input>`; `div[onclick]` ТЭГ |
| VIS-8 | `#/trophies` ба шинэчилсэн `#/camp` · `#/skills` дээр axe critical = 0 |
| FX-6 | Event тутам `#announcer`-ийн текст өөрчлөгдсөн (12 event × 1 тест) |
| A11Y-5 | `soundVolume = 0` үед `AudioContext.createOscillator` дуудагдаагүй (spy) |

---

## 10. Гол урсгалууд

### 10.1 Chain-ийн 4 дэх алхам (офлайн, сервергүй)

```
UI  claimQuest(sq-chain-4) ──► gameService ──► applyAction ──► claimQuest
                                                    │
   1 stamina −2 ──► 2 addXp(+30) ──► 3 sideQuestStats[sq-chain-4] = {1, at}
   3a addMasteryXp([storytelling], 30) ──► mastery.storytelling 4→5  → MASTERY_LEVEL_UP
   3b grantReputation([storytelling], 'side', 1) ──► guild-signal +2 → REPUTATION_GAINED
   3c evaluateChains ──► chainComplete(chain-story) = true
                     ──► addXp(+40)  ──► CHAIN_COMPLETED { chainId, bonusXp: 40 }
                     ──► completedChainIds += chain-story
   4 streak ──► 5 loot ──► 6 encounter
   7 evaluateAchievements ──► ach-storyteller-5 (masteryLevel 5) ✓
                          ──► ach-first-chain  (chainsCompleted 1) ✓
                                                    │
   events[] ──► fx.play() ──► 3 анимац (MAX_CONCURRENT_FX), 12 дуу, 12 aria-live мөр
   төлөв ──► persistence.save() (debounce 300ms) ──► localStorage
   actionQueue ──► сервер БАЙХГҮЙ → дараалалд үлдэнэ (OFF-6)
```
⚠ `7`-д хоёр амжилт зэрэг олгогдож байгаа нь `3a`/`3b` нь `7`-оос ӨМНӨ байсны шууд
үр дүн. Дараалал буруу бол хоёулаа ДАРААГИЙН үйлдэлд олгогдоно.

### 10.2 Hard mode rematch → capstone нээгдэх

```
attemptBoss(boss-w2, scores=52, difficulty='hard')
   tierFor(52, 'hard') = 'advanced'          (HARD_BOSS_TIERS.advanced = 52)
   bossAttempts += { …, difficulty: 'hard' }
   appendReplay({ kind:'boss', outcome:'passed' })
   BOSS_ATTEMPT_LOGGED { tier:'advanced', difficulty:'hard', personalBest: 52 }
   (аль хэдийн дууссан boss → XP 0, mastery 0, rep 0)
   evaluateAchievements → ach-hard-advanced (bossPersonalBest ref=boss-w2, value=52) ✓
   ⇣
unlockSkill('sk-blender-capstone')
   capstoneGaps() → [] (mastery 8 ✓ · бүх tier-1 ✓ · advanced attempt ✓)
   masteryPoints 3 → 2, unlockedSkillIds += capstone     → SKILL_UNLOCKED
```

### 10.3 Сүлжээ бүрэн тасарсан (`OFF-6`)

```
main.ts эхлэх
  ├ persistence.load()  → localStorage (сүлжээгүй)
  ├ buildPack()         → bundle дотроос (сүлжээгүй)
  ├ apiClient.health()  → fetch REJECT → sync.status = 'offline'
  ├ shell render: «Offline — playing locally» ТЕКСТ (өнгө БИШ — VIS-4)
  └ бүх 9 дэлгэц ажиллана; үйлдэл бүр actionQueue-д хуримтлагдана
uncaught алдаа: 0   (бүх fetch нь try/catch дотор — PERSONAL-1 §7.6)
```

---

## 11. Гүйцэтгэл ба хэмжээ

### 11.1 `QX-6` — шугаман байдлын нотолгоо

Нэг `claimQuest`-ийн ажлын хэмжээ (`n` = контентын масштаб):

| Алхам | Зардал | Тэмдэглэл |
|---|---|---|
| `pack.quests.find` | `O(n_quests)` | Шугаман |
| `addXp` | `O(1)` | 9 босго |
| `addMasteryXp` | `O(|tags|) ≤ O(7)` | Тогтмол |
| `grantReputation` → `guildFor` | `O(|tags| × 4)` | Тогтмол |
| `evaluateChains` | `O(n_chains × 4)` | Шугаман |
| `rollRewards` | `O(n_loot)` | Шугаман |
| `maybeEncounter` | `O(n_encounters)` | Шугаман |
| `evaluateAchievements` | `O(n_ach × (1 + |sideQuestStats| + |bossAttempts|))` | ⚠ хамгийн том |

Нийт `O(n)` — **үржвэр гарах цорын ганц цэг** нь `evaluateAchievements`-ийн доторх
`bossAttempts` гүйлгэлт. Тэр нь контентын масштабаас ХАМААРАХГҮЙ (тоглолтын түүх),
тиймээс `QX-6`-ийн «контентын хэмжээнд шугаман» нөхцөл хангагдана.

**Тестийн хэлбэр (`T-36`):** `buildPack()`-ийг 10 дахин хуулж (id-д дугаар залгаж)
синтетик пакет үүсгэж, 500 boss attempt-тай төлөв дээр 1 `claimQuest` ≤ **50 ms**.

⚠ Cosmetic-ийн нээлт (`unlockedCosmetics`, `O(60 × isUnlocked)`) нь **домэйны замд
БАЙХГҮЙ** — зөвхөн `gameService.view.cosmetics()` (Trophy Room зурахад) дуудагдана.
Үйлдэл тутам үнэлбэл `QX-6`-ийн төсөв 2 дахин өснө.

### 11.2 `QX-3` — bundle-ийн суурь ба төсөв (Design шатанд ХЭМЖИГДСЭН)

```
cd web-app && npm ci && npm run build        # 2026-09-16, vite 8.3.0
dist/assets/index-*.js    147,100 B raw  →  44,897 B gzip
dist/assets/index-*.css     4,861 B raw  →   1,709 B gzip
────────────────────────────────────────────────────────────
BASELINE (JS+CSS, gzip -9)              →  46,606 B
QX-3-ийн тааз (× 1.30)                  →  60,587 B
БОЛОМЖИТ НЭМЭГДЭЛ                       →  13,981 B
```

⚠ **Хэмжих аргыг ЯГ тогтоов** (`T-02`), эс бөгөөс тоо дахин давтагдахгүй:
`dist/**`-ийн `.js` ба `.css` файл БҮГД · `zlib.gzipSync(buf, { level: 9 })` ·
`index.html` ОРОХГҮЙ. (Vite-ийн өөрийн тайлан 47,060 B — өөр gzip тохиргоотой тул
ТҮҮНИЙГ ашиглахгүй.)

**Төсвийн задаргаа:**

| Зүйл | raw | gzip (≈) |
|---|---|---|
| Контент JSON (§8.3) | 21.5 KB | 4.7 KB |
| `theme.ts` (122 hex + токен жагсаалт) | 1.9 KB | 0.9 KB |
| `styles.css` (19 токен × 6 блок + cb блок + 12 FX класс) | 3.5 KB | 0.8 KB |
| 6 шинэ домэйн модуль | 12 KB | 3.0 KB |
| `fx.ts` + `trophies.ts` + дэлгэцийн өөрчлөлт | 10 KB | 2.4 KB |
| **Нийт** | **48.9 KB** | **≈11.8 KB** |

**Үлдэх нөөц: ≈2.2 KB gzip (16%).** ⚠ Энэ нь **бага нөөц** — `T-23`-ийн cosmetic
каталог 60-аас хэтэрвэл, эсвэл boss-ийн текст урт бол хамгийн түрүүнд хэтэрнэ.
**Сааруулалт (өртөг өсөх дарааллаар):**
1. `theme.ts`-ийн cb хэсгийг 6×8 биш 1×8 болгосон нь **аль хэдийн** ≈0.5 KB хэмнэв (§9.1.3).
2. `cosmetics.json`-ийн `title` нь ГАНЦ талбар — `description` НЭМЭХГҮЙ (Trophy Room-ийн
   текст нь `unlockSource`-оос ГЭНЭРАЦЛАГДАНА, §9.4.2).
3. Хэтэрвэл: контент пакетыг тусдаа chunk болгож (`import()`), анхны ачаалалтаас
   хасах. ⚠ Энэ нь `QX-3`-ийн хэмжилтийн тодорхойлолтыг өөрчилнө — **`T-02`-ийн
   тодорхойлолтыг өөрчлөх нь спекийн шийдвэр**, чимээгүй хийхгүй.

---

## 12. Тестийн зураглал — AC → файл

| AC бүлэг | Тестийн файл | Шинэ (≈) |
|---|---|---|
| VIS-1, VIS-2, VIS-3 | `tests/ui/theme.test.ts` (шинэ) | 228 баталгаа / ~12 тест |
| VIS-4…VIS-8 | `tests/a11y/a11y.test.ts` (өргөтгөл) | ~14 |
| FX-1…FX-7 | `tests/ui/fx.test.ts` (шинэ) · `tests/ui/sound.test.ts` (хэвээр) | ~18 |
| MST-1…MST-6 | `tests/unit/core/mastery.test.ts` (шинэ) | ~22 |
| SKL-1…SKL-5 | `tests/unit/core/skillTree.test.ts` (шинэ) · `content.test.ts` | ~20 |
| BSX-1…BSX-6 | `tests/unit/core/boss.test.ts` (өргөтгөл) | ~16 (үүнээс 61 утгын хүснэгт) |
| RET-1…RET-3 | `tests/unit/core/chains.test.ts` (шинэ) | ~10 |
| RET-4 | `tests/unit/core/dailyMission.test.ts` (өргөтгөл) | ~6 |
| RET-5, RET-6 | `tests/unit/core/reputation.test.ts` (шинэ) | ~12 |
| RET-7, RET-8 | `tests/unit/core/achievements.test.ts` (өргөтгөл) | ~12 |
| COS-1…COS-4 | `tests/unit/core/cosmetics.test.ts` (шинэ) · `tests/ui/screens.test.ts` | ~16 |
| OFF-1, OFF-5…OFF-7 | `tests/integration/offline.test.ts` (шинэ) | ~8 |
| OFF-2, OFF-3, OFF-4 | `tests/offline/no-external.test.ts` (шинэ) | ~12 |
| SVX-1…SVX-4 | `tests/unit/save.test.ts` · `tests/integration/persistence.test.ts` | ~18 |
| QX-1, QX-7 | `tests/architecture.test.ts` (өргөтгөл) | ~10 |
| QX-2 | `server/tests/{api,contract}.test.ts` | ~12 (server) |
| QX-3 | `tests/quality/bundle.test.ts` (шинэ) | ~2 |
| QX-5 | `tests/unit/content.test.ts` (өргөтгөл, 14 «хазна» тест) | ~16 |
| QX-6 | `tests/quality/perf.test.ts` (шинэ) | ~2 |
| D-6 хүчний хориг | `tests/architecture.test.ts` (Сканнер A/B/C, §2) | ~9 |
| **Нийт** | | **web-app ≈ 185 · server ≈ 12** |

Эцсийн тоо: **web-app ≥ 439 + 185 = 624** · **server ≥ 76 + 12 = 88** (`QX-1` нь
буурахгүйг л шаарддаг — эдгээр нь төсөв, AC БИШ).

---

## 13. Загварын шатанд илэрсэн зөрүү, таамаглал, шийдэх цэг

### 13.1 Зөрүү (Δ) — одоогийн кодоос илэрсэн, `plan.md §16`-аас ӨӨР

| # | Зөрүү | Хаана илэрсэн | Шийдэл | Хэнд нөлөөлнө |
|---|---|---|---|---|
| Δ-1 | `dungeonStats`-д **хоёр** бичигч зам байна (`quests.ts` нь `track:'dungeon'` quest-ийг мөн дуусгадаг) | `shared/core/quests.ts:70-73` ↔ `shared/content/index.ts → questForDungeon` | `markDungeonPassed` ГАНЦ туслах (§6.8) + сканнердсан тест | T-09, T-15 |
| Δ-2 | `SKL-2`-ийн «track-д харгалзах boss» нь ХААНА Ч тодорхойлогдоогүй | `spec.md §4.4` ↔ `shared/content/mainQuests.json` (boss 1 ширхэг) | `boss.tags ∋ track` + шинэ `[C]` дүрэм C-02 (§6.6.3) | T-14, T-20, T-25 |
| Δ-3 | `plan.md §1`-ийн «skill node ≥4» нь `SKL-1`-ийн «track тутамд ЯГ 1 capstone»-той зөрчилдөнө | `plan.md §1` ↔ `spec.md SKL-1` | Шинэ node = **14** (7 tier-2 + 7 tier-3), нийт 38 (§6.6.1) | T-19 (хэмжээ 3.5×) |
| Δ-4 | `plan.md §13.2` нь зөвхөн `claimQuest`-ийн event дарааллыг заасан; `attemptDungeon`/`attemptBoss`-д mastery/rep нь амжилтаас ХОЙШ үлдэж болно | `shared/core/dungeons.ts:78-96` · `boss.ts:88-94` | Гурвуулангийн дараалал зурагдав (§7.2, §7.3) + индексийн тест | T-09, T-13 |
| Δ-5 | `shared/validate/dsl.ts → rec()` нь түлхүүрийн багцыг шалгадаггүй — `mastery` (7) · `reputation` (4)-ийн бүрэн байдал схемээр хаагдахгүй | `shared/validate/dsl.ts` ↔ `contracts.yaml` (`minProperties`) | DSL өргөтгөхгүй; migration бүтнээр үүсгэнэ + `trackOf` анхдагч + `[U]` тест (§4.2) | T-05, T-06, T-07 |

⚠ Δ-1…Δ-5 нь **блоклогч биш** — тус бүр нэг л шийдэл боломжтой, эсвэл анхдагч замтай.

### 13.2 Загварын шатны ил таамаглал (A-LLD2)

| # | Таамаглал | Үндэслэл | Өөрчилвөл |
|---|---|---|---|
| A-LLD2-1 | `rec()`-ийн түлхүүрийн бүрэн байдлыг **схемээр БИШ**, migration + тестээр хаана | DSL өргөтгөх нь `sideQuestStats` · `dungeonStats` (чөлөөт түлхүүр) зэрэг бүх хэрэглэгчийг хөндөнө | `shared/validate/dsl.ts` + бүх `rec()` дуудлага |
| A-LLD2-2 | Guild `id` нь **`constants.ts → GUILD_IDS`**, `title` нь контентод | `MIGRATIONS[2]` нь pack-гүй; давхаргын хориг зөрчихгүй цорын ганц арга (§5.3) | T-06, T-21, C-07 |
| A-LLD2-3 | Chain-ийн `bonusXp` нь mastery ба rep ОЛГОХГҮЙ | Chain нь `tags`-гүй нэгж; 4 алхам аль хэдийн олгосон — bonus дээр давхар тооцно | T-12 |
| A-LLD2-4 | 24 хуучин skill node БҮГД `tier: 1` | Өөрөөр бол хуучин save-д `зарцуулсан > олдсон` болж инвариант зөрчигдөнө (§6.6.1) | T-19, T-06 |
| A-LLD2-5 | `masteryPoints` нь **скаляр** сан; `MST-4`-ийн «track таарах» нь node-ийн track-ийн mastery босго (tier-2 → ≥2) | `plan.md §11.1`-ийн схемтэй нийцнэ; өөр уншилтын сэлгэх өртөг §6.6.2-т бичигдсэн | T-05, T-14, T-31 |
| A-LLD2-6 | cb горимд `accent` нь **бүх дэлхийд ижил** | `VIS-3` нь «дэлхийн ялгаа хадгалагдана» гэж шаараагүй; 46% бага өгөгдөл (§9.1.3) | T-27 |
| A-LLD2-7 | `data-world` нь **идэвхтэй дэлхийгээр** солигдоно (дуусгаагүй хамгийн бага world) | `VIS-1` нь «дэлхий солигдоход» гэж заасан ч аль дэлхий гэдгийг заагаагүй | T-27, T-29 |
| A-LLD2-8 | Refresher нь өмнөх `dailyMission.questId`-г мөн хасна (pool ≥2 үед) | TIERS-ийн зан төлөвтэй нэгэн ижил; эс бөгөөс 2 өдөр дараалан ижил зүйл гарна | T-15 |

### 13.3 Хүн шийдэх цэгүүд

`plan.md §7`-ийн H-1…H-6 **хүчинтэй хэвээр**. Энэ шат нэмж:

| # | Цэг | Анхдагч зам |
|---|---|---|
| H-1′ | **`masteryPoints` скаляр уу, track тутам уу** (§6.6.2 · A-LLD2-5) — H-1-ийн дэд асуулт | Скаляр + tier-2-т `mastery.level ≥ 2` босго. Сэлгэх өртөг: 1 схемийн талбар + 3 мөр код, `T-14`/`T-31` |
| H-7 | **Guild-ийн `id`** (`GUILD_IDS`) — `title` нь H-2-т байгаа ч `id` нь одоо код болов | `['guild-cut','guild-form','guild-frame','guild-signal']`. Солих нь `constants.ts`-ийн 1 мөр + `guilds.json` |

⚠ H-1′ ба H-7 нь **блоклохгүй**: хоёулаа нэг тогтмол/нэг талбарын хэлбэрт хүрдэг.

### 13.4 Энэ шатанд ЯГ юуг ажиллуулж шалгав

| Шалгасан | Хэрхэн | Үр дүн |
|---|---|---|
| `contracts.yaml` задарна | `yaml.parse` (web-app-ийн `yaml@2.9.1`) | ✅ 50 схем |
| `$ref` бүрэн байдал | Бүх `#/components/...` лавлагааг components-тай тулгав | ✅ тасарсан лавлагаа 0 |
| `GameState.example` | 27 `required` талбар ба 27 `properties`-тай тулгав | ✅ дутуу 0 · илүүдэл 0 |
| Enum-ийн тоо | `ActionType 14` · `DomainEventType 28` · `RejectionReason 8` | ✅ +3 · +4 · +1 |
| Палитрын 228 контраст | WCAG 2.x харьцааг 12 палитрын 19 хосоор тооцов | ✅ 228/228; муу нь 4.78 · 3.29 |
| Bundle-ийн суурь | `npm ci && npm run build` + `gzipSync(level 9)` | ✅ 46,606 B |
| Skill track хамрах хүрээ | 24 node-ийн нэрийг 7 track-д хуваарилав | ✅ track бүрд ≥1 |

| ШАЛГААГҮЙ | Яагаад |
|---|---|
| `npm test` (439 тест) | Код өөрчлөгдөөгүй — Design шат кодод хүрэхгүй |
| Bundle-ийн төсвийн БОДИТ хэмжээ | Шинэ код бичигдээгүй; §11.2 нь **тооцоо**, `T-37`-д хэмжигдэнэ |
| Контентын бодит текстийн хэмжээ | `T-19`…`T-24`-ийн гаралт |
| axe critical = 0 (шинэ дэлгэц) | Дэлгэц бичигдээгүй; `T-34`-д |

---

## 14. Task → загварын хэсэг

| Hefesto ID | Task | LLD § |
|---|---|---|
| 550 | T-01 `contracts.yaml` v1.2.0 | [`contracts.yaml`](contracts.yaml) бүхэлдээ |
| 551 | T-02 Bundle суурь + QX-3 | §11.2 (суурь ХЭМЖИГДСЭН) |
| 552 | T-03 `validate:content` CLI | §8.2 |
| 553 | T-04 Гадаад холболтын сканнер | §1.1, §10.3 |
| 554 | T-05 Домэйн схем ба төрөл | §3, §4.1, §4.3 |
| 555 | T-06 Save v2 migration | §5, §6.0, §6.5 |
| 556 | T-07 Export/import + parity | §4.2 (мэдэгдэж буй зөрүү), §5.4 |
| 557 | T-08 Mastery хөдөлгүүр | §6.1 |
| 558 | T-09 Mastery roll-up залгах | §7.1, §7.2, §7.3, §6.8 |
| 559 | T-10 Хүчний хоригийн сканнер | §2 |
| 560 | T-11 Guild reputation | §6.2, §7.1 |
| 561 | T-12 Side quest chain | §6.3, §7.1 |
| 562 | T-13 Boss v2 | §6.7, §7.3 |
| 563 | T-14 Skill tree v2 домэйн | §6.6 |
| 564 | T-15 Refresher | §6.9, §6.8 |
| 565 | T-16 Cosmetic үнэлгээ · campLayout | §6.4 |
| 566 | T-17 Амжилтын шинэ предикат | §6.10 |
| 567 | T-18 `applyAction` диспетчер | §7.4, §4.3 |
| 568 | T-19 Skill контент v2 | §6.6.1, §8.2 (C-03…C-06) |
| 569 | T-20 Boss контент | §6.6.3, §8.2 (C-01, C-02) |
| 570 | T-21 Guild контент | §5.3, §8.2 (C-07, C-08) |
| 571 | T-22 Side quest chain контент | §8.2 (C-09, C-10) |
| 572 | T-23 Cosmetic каталог ≥60 | §8.2 (C-11, C-12), §11.2 |
| 573 | T-24 Амжилт ≥40 | §6.4, §8.2 (C-13, C-14) |
| 574 | T-25 `validate:content` өргөтгөл | §8.2 (14 «хазна» тест) |
| 575 | T-26 Сервер | §7.4, [`contracts.yaml`](contracts.yaml) `/actions` |
| 576 | T-27 Палитр + colorblind + контраст | §9.1 (122 hex БЭЛЭН) |
| 577 | T-28 Juice давхарга | §9.3 |
| 578 | T-29 Camp v2 | §9.4.1, §9.2 |
| 579 | T-30 Trophy Room | §9.4.2 |
| 580 | T-31 Skills v2 | §9.4.3 |
| 581 | T-32 Boss UI | §9.4.4 |
| 582 | T-33 Settings | §9.4.5 |
| 583 | T-34 A11y сүүлчийн шалгалт | §9.6 |
| 584 | T-35 Сервергүй интеграци | §10.3 |
| 585 | T-36 Гүйцэтгэлийн тест | §11.1 |
| 586 | T-37 Регресс, архитектур, баримт | §11.2, §12, §2 |
