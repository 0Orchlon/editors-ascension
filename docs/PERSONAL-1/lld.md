<!-- PERSONAL-1 · lld · Дэлгэрэнгүй загвар (LLD) · 2026-09-15 -->

# Editor's Ascension — Дэлгэрэнгүй загвар (LLD)

**Систем:** EDITORSASC · **Репо:** `0Orchlon/editors-ascension` · **Салбар:** `issue/personal-1`

| Эх баримт | Юуг тогтоосон | Энэ баримт түүнтэй ямар харьцаатай |
|---|---|---|
| `spec.md` | Хүлээн авах шалгуур (AC) | Шалгуурыг ДАХИН тодорхойлохгүй — зөвхөн лавлана |
| `plan.md` | Дараалал, эзэмшил, `BE-10…BE-17` | Фазын хилийг дагана |
| `tasks.md` | 50 ажлын нэгж (`T-01…T-50`) | Task бүрд загварын хэсэг харгалзуулна (§11) |
| `contracts.yaml` | API + домэйн схем — **машин уншигдах эрх бүхий эх** | Энэ баримт нь түүний **хэрэгжүүлэлтийн** тайлбар |
| `lld.html` | Дэлгэцийн харагдац, урсгалын дуурайлт | Энэ баримтын §8-ийн визуал хувилбар |

⚠ **Зөрчилдвөл:** `contracts.yaml` > `spec.md` > энэ баримт. Энэ баримтад бичсэн
гарын үсэг, тоо нь контрактаас зөрвөл контракт зөв.

---

## 0. Энэ шатанд юу шийдэгдсэн

Өмнөх шатууд **юу** хийхийг тогтоосон. Энэ шат **хэрхэн** хийхийг тогтоов:

1. `contracts.yaml` → **v1.1.0**: `plan.md §8`-ийн backend өргөтгөлийн 5 шинэ endpoint,
   `Problem` → RFC 9457, degraded health, 429 — бүгд контракт болов (`tasks.md → T-42`).
2. Модуль тус бүрийн **функцийн гарын үсэг ба алгоритм** (§5, §6, §7).
3. SQLite **схем ба гүйлгээний хил** (§6.2, §6.6).
4. UI-ийн **дэлгэц ба компонентын мод**, навигаци, a11y хэрэгжилт (§7.4, §7.8).
5. Спекийн дотоод **нэг зөрүү** илрүүлж, шийдвэрлэсэн (§10.1).

⚠ **Код бичигдээгүй.** Энэ шатны гаралт нь гурван баримт: `lld.md` · `lld.html` ·
`contracts.yaml`. Хэрэгжүүлэлт нь дараагийн шатны ажил (`tasks.md`).

### 0.1 Хянагчийн саналд өгсөн хариу

> «have and backend that is already in the repo's folder, expand on it»

`plan.md §0` энэ саналыг аль хэдийн уншиж, **backend-ийг энэ репогийн `server/` дотор
байлгаад хамрах хүрээг нь өргөтгөх** гэж тайлбарласан (`BE-10…BE-17`). Энэ LLD тэр
өргөтгөлийг **бүрэн загвар** болгов: эрх бүхий үйлдлийн хөдөлгүүр (§6.6), snapshot
түүх (§6.8), төхөөрөмж хоорондын шилжүүлэг (§6.9), ops хаалга (§6.10).

⚠ **Баримт:** `issue/personal-1` дээрх репод (`bef6d94`) одоо ч зөвхөн `README.md`
(44 байт) байна — backend код БАЙХГҮЙ. Тиймээс «өргөтгөх» нь **шинээр бичих**
гэсэн утгатай хэвээр. Хэрэв хянагч өөр газар (өөр репо, өөр салбар) байгаа
backend-ийг санаж байсан бол түүний байршлыг зааж өгөх хэрэгтэй — тэр тохиолдолд
§6 бүхэлдээ дахин үнэлэгдэнэ.

### 0.2 `plan.md §6.2`-ийн хүн шийдэх цэг

`plan.md` нь `T-42` (контрактын өргөтгөл) хийхээс өмнө хүний баталгаа шаардсан.
**Хянагчийн буцаасан санал нь тэр баталгаа** гэж уншиж, `contracts.yaml`-ыг энэ
шатанд v1.1.0 болгов. Санал өөр утгатай байсан бол `plan.md §8.3`-ийн хасах зам
хүчинтэй хэвээр — `T-42 · T-44 · T-45 · T-46 · T-49 · T-50` хасагдаж, контракт
v1.0.0 руу буцна. Бусад 44 task огт хөндөгдөхгүй.

---

## 1. Системийн бүтэц

```
┌──────────────────────── Хөтөч ────────────────────────┐
│  web-app/src/app      бүрхүүл, hash router, layout    │
│  web-app/src/ui       8 дэлгэц + модал + компонент    │
│         │  (зөвхөн доошоо)                             │
│  web-app/src/services фасад: store · persistence ·    │
│                       actionQueue · sync · content    │
└─────────┬──────────────────────────┬──────────────────┘
          │ import                   │ HTTP /api
          ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  shared/             │   │  server/src                  │
│   types · validate   │◀──│   http · middleware · routes │
│   core  (ДҮРЭМ)      │   │   actionEngine · db (SQLite) │
│   content (JSON)     │◀──│   contentLoader              │
│   save  (migration)  │   └──────────────┬───────────────┘
└──────────────────────┘                  ▼
                                   server/data/*.sqlite
```

**Нэг дүрэм, хоёр ажиллагаа (AC BE-10).** `shared/core` нь XP · stamina · quest ·
dungeon · boss · project · achievement-ийн ЦОРЫН ГАНЦ хэрэгжилт. Хөтөч дээр офлайн
ажиллана, сервер дээр эрх бүхийгээр ажиллана. Хоёр тал **яг ижил кодыг** дуудна.

**Яагаад хоёр тал:** `AC BE-7` нь сервергүй бүрэн ажиллагаа шаарддаг, `BE-11` нь
серверийн эрх бүхий байдлыг шаарддаг. Хоёуланг хангах цорын ганц зам нь дүрмийг
нэг газар байрлуулж хоёр талаас дуудах. Үнэ нь эвлэрүүлгийн нарийвчлал (§7.6).

---

## 2. Репогийн файлын бүтэн мод

```
editors-ascension/
├─ README.md
├─ .gitignore                         # server/data/, dist/, node_modules/
├─ docs/PERSONAL-1/
│  ├─ spec.md  plan.md  tasks.md  lld.md  lld.html  contracts.yaml
├─ shared/                            # ГАДААД ХАМААРАЛГҮЙ. TS эх код.
│  ├─ CLAUDE.md
│  ├─ validate/
│  │  ├─ dsl.ts                       # мини схемийн DSL + Infer<> (§5.1)
│  │  ├─ schemas.ts                   # contracts.yaml-ийн схемүүд DSL-ээр
│  │  └─ index.ts                     # validateGameState / validateContentPack / …
│  ├─ types/index.ts                  # DSL-ээс infer хийсэн бүх төрөл (§5.2)
│  ├─ save/
│  │  ├─ version.ts                   # CURRENT_SCHEMA_VERSION = 1
│  │  ├─ migrations.ts                # бүртгэл (одоо хоосон), runMigrations()
│  │  └─ serialize.ts                 # toPayload / fromPayload / newGame
│  ├─ core/
│  │  ├─ constants.ts                 # ProgressionConstants — ГАНЦ хувилбар
│  │  ├─ rng.ts                       # mulberry32 + fnv1a
│  │  ├─ result.ts                    # Ok / Rejected хэлбэр
│  │  ├─ progression.ts   stamina.ts   quests.ts     sideQuests.ts
│  │  ├─ dungeons.ts      dailyMission.ts  encounters.ts  economy.ts
│  │  ├─ achievements.ts  streak.ts    projects.ts   boss.ts
│  │  └─ apply.ts                     # applyAction() — үйлдлийн диспетчер (§5.4.12)
│  └─ content/
│     ├─ quests.main.json   quests.side.json   dungeons.json
│     ├─ skills.json  achievements.json  encounters.json  loot.json
│     └─ index.ts                     # пакет угсрах + contentVersion тооцох
├─ web-app/
│  ├─ CLAUDE.md  package.json  tsconfig.json  vite.config.ts  index.html
│  ├─ src/
│  │  ├─ app/  main.ts  router.ts  layout.ts  theme.css
│  │  ├─ services/  store.ts  gameService.ts  persistence.ts  actionQueue.ts
│  │  │             sync.ts  apiClient.ts  contentService.ts  exportImport.ts
│  │  └─ ui/   components/  screens/  styles/
│  └─ tests/   unit/  integration/  a11y/  architecture.test.ts
└─ server/
   ├─ CLAUDE.md  package.json  tsconfig.json
   ├─ src/
   │  ├─ index.ts  app.ts  config.ts
   │  ├─ middleware/  requestId.ts  logger.ts  bodyLimit.ts  rateLimit.ts
   │  │               auth.ts  ownership.ts  validate.ts  problem.ts
   │  ├─ routes/      health.ts  players.ts  saves.ts  actions.ts
   │  │               snapshots.ts  transfer.ts  content.ts
   │  ├─ db/          open.ts  migrations/001_init.sql  repos/*.ts
   │  ├─ domain/      actionEngine.ts        # shared/core-ийг гүйлгээнд уяна
   │  ├─ content/     load.ts
   │  └─ ops/         shutdown.ts  cleanup.ts
   └─ tests/  unit/  integration/  contract/  architecture.test.ts
```

⚠ Репогийн root дээр `package.json` **байхгүй**. Гадаргуу тутам нэг команд
(`plan.md P-7`): `cd web-app && npm test` · `cd server && npm test`.

⚠ `shared/` нь өөрийн `package.json`-гүй — хоёр гадаргуу `tsconfig` path alias-аар
эх код хэлбэрээр импортлоно (`plan.md P-1`):
`"paths": { "@shared/*": ["../shared/*"] }`, `vite.config.ts` дотор ижил alias.

---

## 3. Давхаргын гэрээ — юу юуг импортлохыг ЗӨВШӨӨРӨХ

| Эх (from) | Зөвшөөрөгдсөн (to) | Хориотой |
|---|---|---|
| `web-app/src/ui/**` | `web-app/src/services/**`, `@shared/types` | `@shared/core/**`, `@shared/content/**`, `fetch` |
| `web-app/src/app/**` | `ui/**`, `services/**`, `@shared/types` | `@shared/core/**` |
| `web-app/src/services/**` | `@shared/*` бүгд, `fetch` | `ui/**` |
| `server/src/routes/**` | `server/src/{db,domain,middleware}`, `@shared/types` | `@shared/core/**` шууд |
| `server/src/domain/**` | `@shared/core/**`, `@shared/content` | `server/src/routes/**` |
| `shared/core/**` | `shared/{types,validate}`, `shared/core/**` | `shared/content/**`, node/DOM API |
| `shared/content/**` | `shared/types` | бусад бүгд |

**Машинаар хамгаалагдана** (`T-17`, `T-43` — `architecture.test.ts` хоёр гадаргууд):

1. **Импортын чиглэл** — эх файлуудыг regex-ээр уншиж дээрх хүснэгтийн хоригийг шалгана.
2. **Домэйн давхардал (AC BE-10)** — `web-app/src/**` ба `server/src/**` дотор дараах
   загварууд ОЛДВОЛ тест УНАНА:
   - `ProgressionConstants`-ийн тоон утгууд: `100`, `250`, `500`, `1000`, `1750`, `2750`,
     `4000`, `5500`, `7500`, `35`, `45`, `52` — тоон литерал хэлбэрээр
     (`constants.ts`-ээс импортлосон нэрээр ашиглах ёстой);
   - дүрмийн түлхүүр үг: `xpThreshold`, `levelFor`, `staminaCost -`, `repeatXpMultiplier`,
     `0.7`, `0.5` — тооцооллын контекстэд.
3. **Цэвэр байдал (`plan.md P-5`)** — `shared/core/**` дотор `Date.now(` · `new Date(` ·
   `Math.random(` · `localStorage` · `process.` · `fetch(` олдвол тест УНАНА.
4. **Cosmetic хил (AC EC-1)** — `shared/core/{progression,stamina,quests,dungeons}.ts`
   дотор `coins` эсвэл `inventory` уншигдвал тест УНАНА (эдийн засаг нь `economy.ts`-д
   тусгаарлагдсан, XP/stamina-д нөлөөлөхгүй).

---

## 4. Эх шаардлагаас гаралтай тогтмолууд

`shared/core/constants.ts` — `contracts.yaml → ProgressionConstants`-ийн шууд TS хувилбар.
Өөр газар давхардуулж бичих нь §3.2-ын тестийг УНАГААНА.

```ts
export const XP_THRESHOLDS = [100,250,500,1000,1750,2750,4000,5500,7500] as const;
export const RANK_NAMES = ['Recruit','Apprentice','Cadet','Editor','Animator',
  'Specialist','Director','Cinematic Artist','Senior Generalist','Cinematic Master'] as const;
export const MAX_STAMINA = 10;
export const REST_AMOUNT = 3;
export const PROJECT_MILESTONE_XP = 25;
export const DEFAULT_REPEAT_XP_MULTIPLIER = 0.5;
export const SIDE_QUEST_XP_FLOOR_RATIO = 0.1;
export const DUNGEON_PASS_RATIO = 0.7;
export const BOSS_TIERS = { mvp: 35, advanced: 45, mastery: 52 } as const;
export const ENCOUNTER_CHANCE = 0.25;   // A-LLD-2
export const LOOT_CHANCE = 0.35;        // A-LLD-2
export const MILESTONE_KEYS = ['concept','brief','storyboard','assets','animation',
  'render','editAudioColor','review','finalExport','portfolio'] as const;
export const BOSS_CATEGORIES = ['story','editing','camera','visualCraft',
  'animation','audioPost'] as const;
```

---

## 5. `shared/` — домэйн цөм

### 5.1 `shared/validate` — мини схемийн DSL

**Шийдвэр D-1.** `shared/` нь гадаад хамааралгүй байх ёстой (`plan.md §1`) тул `ajv`
ашиглах боломжгүй. Оронд нь ~150 мөрийн declarative DSL бичнэ. Энэ нь **хоёр үүрэг
нэг дор** гүйцэтгэнэ: runtime validation ба TypeScript төрлийн эх.

```ts
// shared/validate/dsl.ts
export type Issue = { field: string; message: string };   // field = JSON Pointer
export type Check<T> = {
  readonly _t?: T;
  validate(v: unknown, path: string, out: Issue[]): v is T;
};
export type Infer<C> = C extends Check<infer T> ? T : never;

export const int = (o?: {min?:number; max?:number}) => Check<number>
export const num = (o?: {min?:number; max?:number; exclusiveMin?:number}) => Check<number>
export const str = (o?: {min?:number; max?:number; pattern?:RegExp}) => Check<string>
export const bool = () => Check<boolean>
export const lit = <const T extends string|number|boolean>(v: T) => Check<T>
export const enom = <const T extends readonly string[]>(vals: T) => Check<T[number]>
export const nullable = <C>(c: C) => Check<Infer<C> | null>
export const arr = <C>(item: C, o?: {min?:number; max?:number; unique?:boolean}) => Check<Infer<C>[]>
export const rec = <C>(value: C) => Check<Record<string, Infer<C>>>
export const obj = <S extends Record<string, Check<any>>>(
  shape: S, o?: { optional?: (keyof S)[] }
) => Check<...>   // ЧАНД: тодорхойлогдоогүй түлхүүр → Issue (additionalProperties:false)
export const union = <Cs extends Check<any>[]>(...cs: Cs) => Check<Infer<Cs[number]>>
```

**Шаардлага:**
- `obj` нь **үргэлж** `additionalProperties:false` шиг ажиллана — контрактын схемүүд ч
  тийм. Танихгүй талбар нь чимээгүй өнгөрөхгүй (import-ын аюулгүй байдал, `AC SV-4`).
- Бүх алдаа `Issue[]` болж хуримтлагдана, эхний алдаанд зогсохгүй — `AC BE-5` нь
  талбарын түвшний алдааны жагсаалт шаарддаг.
- `field` нь JSON Pointer (`/state/projects/0/selfScore`) — контрактын `Problem.errors[].field`.

```ts
// shared/validate/index.ts — экспортлогдох validator-ууд
export const validateGameState:   (v:unknown) => Issue[];
export const validateSavePayload: (v:unknown) => Issue[];
export const validateContentPack: (v:unknown) => Issue[];
export const validateAction:      (v:unknown) => Issue[];
export const validateActionPayload: (type:ActionType, v:unknown) => Issue[];  // §6.5
```

**Контракттай эвлэрэл (drift хамгаалалт).** `shared/validate/schemas.ts` нь гараар
бичигдсэн тул `contracts.yaml`-аас салж болзошгүй. Хамгаалалт нь
`web-app/tests/unit/contract-parity.test.ts`:

1. `contracts.yaml`-ыг `yaml` (devDependency) -ээр уншина;
2. `components.schemas`-ийн `required` жагсаалт, `enum` утгууд, `const` утгууд, тоон
   `minimum`/`maximum` бүрийг `schemas.ts`-ийн харгалзах `Check`-ийн **зарласан
   метадата**-тай (`Check.meta`) тулгана;
3. Зөрвөл тест УНАНА, зөрүү бүрийг нэрлэнэ.

⚠ Тиймээс `Check` бүр `meta: { required: string[]; enum?: …; const?: … }` талбартай байна —
зөвхөн энэ тестэд зориулагдсан.

### 5.2 `shared/types` — төрлийн эх

```ts
// shared/types/index.ts
import * as S from '../validate/schemas';
import type { Infer } from '../validate/dsl';
export type GameState   = Infer<typeof S.GameState>;
export type SavePayload = Infer<typeof S.SavePayload>;
export type QuestDefinition = Infer<typeof S.QuestDefinition>;
export type ContentPack = Infer<typeof S.ContentPack>;
export type Action = Infer<typeof S.Action>;
export type DomainEvent = Infer<typeof S.DomainEvent>;
export type RejectionReason = Infer<typeof S.RejectionReason>;
// …бүх контрактын схемд нэг-нэг
```

**Яагаад codegen биш:** OpenAPI → TS generator нэмэх нь гуравдагч хэрэгсэл, build алхам,
хувилбарын pin нэмнэ. DSL-ээс infer хийх нь **нэг эхээс хоёр гаралт** (төрөл + шалгалт)
өгөх бөгөөд `shared/`-ыг хамааралгүй байлгана.

### 5.3 `shared/save` — хувилбар ба migration

```ts
export const CURRENT_SCHEMA_VERSION = 1;

// migrations.ts — түлхүүр нь ЗОРИЛТОТ хувилбар
export const MIGRATIONS: Record<number, (s: any) => any> = {
  // 2: (s) => ({ ...s, newField: defaultValue }),   ← v2 гарахад ЭНД нэмнэ
};

export type LoadResult =
  | { ok: true;  state: GameState; migratedFrom?: number }
  | { ok: false; reason: 'parse' | 'schema' | 'too-new'; issues?: Issue[] };

export function loadState(raw: unknown): LoadResult;
export function newGame(): GameState;
export function toPayload(state: GameState, at: string): SavePayload;
```

`loadState` дараалал:
1. `raw` нь объект биш → `{ok:false, reason:'parse'}`
2. `schemaVersion > CURRENT` → `{ok:false, reason:'too-new'}` (`AC SV-1` — тодорхой алдаа)
3. `schemaVersion < CURRENT` → `v+1` -ээс `CURRENT` хүртэл `MIGRATIONS[v]`-ийг дараалан
   хэрэглэнэ. Дутуу migration → `too-new` биш, **шидэгдэх алдаа** (програмын алдаа).
4. `validateGameState` → issue байвал `{ok:false, reason:'schema', issues}`
5. `{ok:true, state, migratedFrom}`

⚠ `plan.md P-6`: хоосон migration бичихгүй. Одоогийн бүртгэл **хоосон** — v1 л байна.
`T-05`-ийн тест нь механизмыг шалгана (зохиомол v0→v1 fixture-ээр), бодит migration биш.

`newGame()` буцаах эхлэлийн төлөв:
```ts
{ schemaVersion:1, xp:0, level:1, stamina:10, maxStamina:10, coins:0, skillPoints:0,
  combo:0, streak:{current:0,best:0,lastQualifiedDate:null},
  completedMainQuestIds:[], sideQuestStats:{}, completedDungeonIds:[],
  unlockedSkillIds:[], inventory:[], achievementIds:[], bossAttempts:[],
  dailyMission:null, projects:[], settings:{reducedMotion:false, soundEnabled:true} }
```

### 5.4 `shared/core` — дүрэм

**Нийтлэг хэлбэр (`spec.md D-2`).** Домэйн функц бүр цэвэр:

```ts
// shared/core/result.ts
export type DomainResult =
  | { ok: true;  state: GameState; events: DomainEvent[] }
  | { ok: false; reason: RejectionReason; detail?: string };

export type Ctx = {
  pack: ContentPack;
  at: string;                 // ISO-8601 — Date.now() ОРОНД (plan.md P-5)
  rng: () => number;          // [0,1) — Math.random() ОРОНД
};
```

⚠ `ok:false` үед `state` буцахгүй — дуудагч ӨМНӨХ төлвийг хэвээр хадгална. Энэ нь
`AC BE-11`-ийн «хадгалагдсан төлөв өөрчлөгдөхгүй» шаардлагыг домэйны түвшинд баталгаажуулна.

#### 5.4.1 `progression.ts` — XP, түвшин, ранк, SP (AC PRG-1…6)

```ts
export function levelFor(xp: number): number;     // 1 + |{t ∈ XP_THRESHOLDS : t ≤ xp}|, ≤10
export function rankName(level: number): string;  // RANK_NAMES[level-1]
export function xpToNextLevel(xp: number): number | null;  // null = 10-р түвшин
export function addXp(state: GameState, amount: number): DomainResult;
export function unlockSkill(state: GameState, skillId: string, pack: ContentPack): DomainResult;
```

`addXp` дараалал:
- `amount < 0` эсвэл бүхэл тоо биш → `{ok:false, reason:'INVALID_INPUT'}` (AC PRG-4)
- `amount === 0` → `{ok:true, state, events:[]}` — төлөв ӨӨРЧЛӨГДӨХГҮЙ (AC PRG-4)
- `newXp = xp + amount`; `newLevel = levelFor(newXp)`; `gained = newLevel - level`
- `skillPoints += gained` (AC PRG-3 — үсэрсэн бүх түвшинд нэг нэг)
- events: `XP_GAINED{amount}`, дараа нь gained удаа `LEVEL_UP{level}` +
  `SKILL_POINT_GAINED{total}` (AC PRG-6)

Хүснэгтэн тест (AC PRG-1): `0→1 · 99→1 · 100→2 · 249→2 · 250→3 · 7499→9 · 7500→10 · 999999→10`.

`unlockSkill` шалгах дараалал (AC PRG-5):
1. `pack.skills` дотор байхгүй → `INVALID_INPUT`
2. `unlockedSkillIds` дотор байгаа → `ALREADY_COMPLETED` (**SP хасагдахгүй**)
3. `prerequisites ⊄ unlockedSkillIds` → `PREREQ_NOT_MET`
4. `skillPoints < 1` → `INSUFFICIENT_SKILL_POINTS`
5. хэрэгжүүлэх: `skillPoints -= 1`, id нэмэх, `SKILL_UNLOCKED{skillId}`

#### 5.4.2 `stamina.ts` (AC STA-1…3)

```ts
export function spend(state: GameState, cost: number): DomainResult;  // cost>stamina → INSUFFICIENT_STAMINA
export function rest(state: GameState): DomainResult;  // min(stamina+3, maxStamina)
```
`rest` нь `stamina === maxStamina` үед ч `ok:true` буцаана, гэхдээ `STAMINA_RESTORED{amount:0}`
(AC STA-3-ийн `10 → 10` тохиолдол).

⚠ **Мэдэгдэж буй хязгаар (ceiling).** Спек нь rest-д ямар ч зардал, хязгаар тавиагүй тул
stamina нь бодит хаалт БИШ — хэмнэлтийн зөвлөмж төдий. Anti-grind нь XP буурлаар
(`SQ-2`, `SQ-4`) хийгдэнэ. Хэрэв stamina жинхэнэ хаалт болох ёстой бол өдрийн rest-ийн
хязгаар нэмэх шаардлагатай — энэ нь **спекийн өөрчлөлт**, энд зохиогдоогүй.

#### 5.4.3 `quests.ts` — claim хөдөлгүүр (AC MQ-3…6)

```ts
export type ClaimInput = { questId: string; checkedConditions: number[] };
export function claimQuest(state: GameState, input: ClaimInput, ctx: Ctx): DomainResult;
```

**Шалгах дараалал (энэ дараалал нь ГЭРЭЭ — аль татгалзал гарахыг тодорхойлно):**

| # | Нөхцөл | Татгалзал |
|---|---|---|
| 1 | `pack.quests` дотор `questId` байхгүй | `INVALID_INPUT` |
| 2 | `quest.track ∈ {boss, raid}` | `INVALID_INPUT` (`bossAttempt` ашиглана) |
| 3 | `quest.levelRequired > state.level` | `LEVEL_TOO_LOW` |
| 4 | `prerequisites ⊄ completedMainQuestIds` | `PREREQ_NOT_MET` |
| 5 | `track==='main'` ба id аль хэдийн completed | `ALREADY_COMPLETED` |
| 6 | `track==='side'` ба `repeatable===false` ба `sideQuestStats[id]` байгаа | `NOT_REPEATABLE` |
| 7 | `checkedConditions` нь `victoryConditions`-ийн БҮХ индексийг хамраагүй | `INVALID_INPUT` |
| 8 | `quest.staminaCost > state.stamina` | `INSUFFICIENT_STAMINA` |

**Яагаад энэ дараалал:** бүтцийн саад (түвшин, урьдчилсан нөхцөл) нь нөөцийн саадаас
ӨМНӨ гарна — тоглогч «stamina дутуу» гэж уншаад rest хийгээд буцаж ирэхэд «түвшин хүрэхгүй»
гэж хоёр дахь удаа татгалзвал муу UX. `checkedConditions` нь claim-ийн ил байдлын
шаардлага (AC MQ-6) тул хамгийн сүүлийн бүтцийн шалгалт.

**Хэрэгжүүлэх (5-8 дамжсаны дараа), яг энэ дарааллаар:**
1. `spend(state, quest.staminaCost)` → `STAMINA_SPENT`
2. XP тооцоолох: `main`/`dungeon` → `quest.xp`; `side` → `sideQuestXp(...)` (§5.4.4)
3. `addXp(state, xp)` → `XP_GAINED` (+ `LEVEL_UP`…)
4. Бүртгэл: `main` → `completedMainQuestIds.push(id)` + `QUEST_COMPLETED`;
   `side` → `sideQuestStats[id] = {completions: n+1, lastCompletedAt: ctx.at}` + `SIDE_QUEST_COMPLETED`
5. `streak.ts` → `qualifyDay(state, ctx.at)` (§5.4.8)
6. `economy.ts` → `rollRewards(state, ctx)` — coins + loot (§5.4.7)
7. `encounters.ts` → `maybeEncounter(state, ctx)` — **хамгийн ихдээ 1** (AC ENC-2)
8. `achievements.ts` → `evaluate(state, ctx)` — шинэ амжилт олгох

⚠ 5-8 алхам бүр `ok:false` буцааж БОЛОХГҮЙ (тэдгээр нь татгалзалгүй функцүүд).
Зөвхөн 1-3 алхам татгалзаж чадна, тэр нь дээрх хүснэгтээр хамрагдсан.

#### 5.4.4 `sideQuests.ts` — давтан XP (AC SQ-2, SQ-5)

```ts
export function sideQuestXp(baseXp: number, n: number, m = DEFAULT_REPEAT_XP_MULTIPLIER): number;
// n = энэ гүйцэтгэл хэд дэх нь (n ≥ 1)
// = max( ceil(baseXp * 0.1), floor(baseXp * m^(n-1)) )
```

Хүснэгтэн тест (`baseXp=40, m=0.5`):

| n | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| XP | 40 | 20 | 10 | **5** | 4 | 4 |

⚠ `spec.md SQ-2` нь ижил томьёо бичээд жишээгээ `40, 20, 10, 4, 4, 4` гэсэн — n=4 дээр
арифметик алдаатай (§10.1). **Томьёо эрх бүхий**; тестийн вектор дээрхээр засагдав.

#### 5.4.5 `dungeons.ts` (AC DG-2…4)

```ts
export type DungeonInput = { dungeonId: string; answers: number[] };  // асуулт тутам сонгосон индекс
export function attemptDungeon(state: GameState, input: DungeonInput, ctx: Ctx): DomainResult;
export function openTutorial(state: GameState, dungeonId: string): DomainResult; // 0 XP, төлөв өөрчлөхгүй
```

- `answers.length !== questions.length` → `INVALID_INPUT`
- `correct = |{i : answers[i] === questions[i].correctIndex}|`
- **Тэнцэх нөхцөл (AC DG-3):** `correct * 10 >= questions.length * 7`
  (бүхэл тооны арифметик — хөвөгч цэгийн дугуйрлын алдаа гарахгүй)
- Тэнцсэн ба `completedDungeonIds` дотор БАЙХГҮЙ → `dungeon.xp` олгож id нэмнэ,
  `DUNGEON_PASSED` + `XP_GAINED`
- Тэнцсэн ба аль хэдийн байгаа → **0 XP**, зөвхөн `DUNGEON_PASSED` (AC DG-3)
- Унасан → `DUNGEON_FAILED{ wrong: [{questionId, chosen, correct, explanation}], nextStep }`,
  төлөв ӨӨРЧЛӨГДӨХГҮЙ, `ok: true` (унах нь татгалзал БИШ — хязгааргүй дахин оролдоно, AC DG-4)
- `nextStep` = хамгийн олон буруу хариулт өгсөн tag-тай side quest-ийн гарчиг
  (боломжгүй бол `dungeon.conceptGoal`-ийг дахин үзэхийг зөвлөнө)

⚠ `openTutorial` нь төлөв өөрчилдөггүй атлаа домэйнд байгаа шалтгаан: `AC DG-2`-ийг
**машинаар** шалгах боломж (тест нь «энэ функц XP олгодоггүй» гэдгийг батална).

#### 5.4.6 `dailyMission.ts` (AC DM-1…3)

```ts
export function pickDailyMission(state: GameState, date: string, pack: ContentPack): string | null;
```

```
1. eligible = pack.quests filter:
     track ∉ {boss, raid}                                  (DM-2)
     ба (track==='main'  → id ∉ completedMainQuestIds)
     ба (track==='side'  → repeatable === true эсвэл sideQuestStats[id] байхгүй)
     ба (track==='dungeon' → id ∉ completedDungeonIds)
     ба levelRequired ≤ state.level
     ба prerequisites ⊆ completedMainQuestIds
2. if eligible.length ≥ 2 ба state.dailyMission?.questId ∈ eligible:
     eligible-ээс түүнийг ХАСНА                            (DM-2)
3. tier дарааллаар: ['main','dungeon','side']              (DM-3)
     pool = eligible filter track === tier
     if pool хоосон → дараагийн tier
     pool-ыг (world, levelRequired, id) өсөхөөр эрэмбэлнэ  ← тогтвортой дараалал
     idx = fnv1a(date) % pool.length                        (DM-1 детерминистик)
     return pool[idx].id
4. return null                                              (DM-3 — UI «Rest day»)
```

⚠ `fnv1a(date)` нь `rng`-гүй, зөвхөн огнооноос — ижил огноо + ижил төлөв = ижил гаралт.
2-р алхам нь 1-р алхмын ДАРАА хийгдэнэ: «≥2 нэр дэвшигч» гэдэг нь **бүх** боломжит
нэр дэвшигчийг тоолно, tier тус бүрийг биш (`AC DM-2`-ийн үг).

#### 5.4.7 `encounters.ts` · `economy.ts` (AC ENC-2, EC-1, EC-2)

```ts
// encounters.ts
export function maybeEncounter(state: GameState, ctx: Ctx): DomainEvent[];
//   ctx.rng() ≥ ENCOUNTER_CHANCE → []
//   эс бөгөөс жигнэсэн (weight) сонголт → [ENCOUNTER_TRIGGERED{encounterId, callToAction}]
//   Нэг дуудалтад ХАМГИЙН ИХДЭЭ 1 (AC ENC-2)

// economy.ts
export function rollRewards(state: GameState, ctx: Ctx):
  { coins: number; lootId: string | null; events: DomainEvent[] };
//   coins = 5 + floor(rng()*6)   → COINS_GAINED
//   rng() < LOOT_CHANCE → rarity-жигнэсэн сонголт; inventory дотор БАЙГАА бол унагаахгүй
//     (AC EC-2 — давхардахгүй) → LOOT_DROPPED{lootId}
```

**Жигнэсэн сонголт (детерминистик):** каталогийг `id`-аар эрэмбэлж, хуримтлагдсан жингээр
`rng() * totalWeight`-ыг хайна. Эрэмбэлэлт нь каталогийн файл дахь дарааллаас
хамаарахгүй — ижил seed = ижил гаралт (AC ENC-2, EC-2).

⚠ **Cosmetic хил (AC EC-1).** `coins` ба `inventory` нь ЗӨВХӨН энэ модульд бичигдэнэ.
`progression.ts` · `stamina.ts` · `quests.ts` · `dungeons.ts` нь эдгээрийг УНШИХГҮЙ —
§3.4-ийн сканнердсан тестээр хамгаалагдана.

#### 5.4.8 `streak.ts` · `achievements.ts` (AC ACH-1, ACH-2)

```ts
// streak.ts — quest/dungeon дуусгах бүрд дуудагдана
export function qualifyDay(state: GameState, at: string):
  { streak: GameState['streak']; combo: number; events: DomainEvent[] };
```
```
D = at-ийн огнооны хэсэг (YYYY-MM-DD, UTC)
if lastQualifiedDate === D        → current хэвээр, combo += 1, [COMBO_CHANGED]
else if lastQualifiedDate === D-1 → current += 1, combo = 1, [STREAK_EXTENDED, COMBO_CHANGED]
else                              → current = 1, combo = 1,
                                    [STREAK_RESET (хэрэв өмнөх current>0), COMBO_CHANGED]
best = max(best, current)     // ХЭЗЭЭ Ч буурахгүй (AC ACH-2)
lastQualifiedDate = D
```

⚠ **A-LLD-1 (ил таамаглал).** `combo`-г `TECH_SPEC` нэрлэсэн боловч ямар ч AC
тодорхойлоогүй. Энд: **тухайн идэвхтэй өдөрт хийгдсэн claim-ийн тоо**, өдөр солигдоход
1 болж дахин эхэлнэ. **Зөвхөн UI-д харагдах** — XP · stamina · unlock-д НӨЛӨӨЛӨХГҮЙ.
Өөр утга зөв бол зөвхөн энэ функц ба Camp дэлгэцийн нэг мөр өөрчлөгдөнө.

```ts
// achievements.ts
export function evaluate(state: GameState, pack: ContentPack): { ids: string[]; events: DomainEvent[] };
```
Предикатын үнэлгээ (`AchievementDefinition.predicate.kind`):

| kind | Илэрхийлэл |
|---|---|
| `level` | `state.level >= value` |
| `totalXp` | `state.xp >= value` |
| `mainQuestsCompleted` | `completedMainQuestIds.length >= value` |
| `sideQuestCompletions` | `Σ sideQuestStats[*].completions >= value` |
| `dungeonsCompleted` | `completedDungeonIds.length >= value` |
| `projectsCompleted` | `projects.filter(p => p.completedAt).length >= value` |
| `bossTier` | `bossAttempts`-д `tier`-ийн зэрэглэл `value`-аас доогуур биш нэг оролдлого байх (`failed<mvp<advanced<mastery`) |
| `streakDays` | `streak.best >= value` |

Үнэлгээ нь **төлөв өөрчлөгдөх бүрд** (үйлдэл бүрийн төгсгөлд) ажиллана; аль хэдийн
`achievementIds` дотор байгаа id дахин олгогдохгүй → `ACHIEVEMENT_UNLOCKED` нэг л удаа.

#### 5.4.9 `projects.ts` (AC PJ-1…4)

```ts
export function createProject(state, input: {title: string}, ctx): DomainResult;
export function completeMilestone(state, input: {projectId: string; key: MilestoneKey}, ctx): DomainResult;
export function updateProject(state, input: {projectId; notes?; nextAction?; evidenceRef?; selfScore?}, ctx): DomainResult;
```
- `createProject` нь `MILESTONE_KEYS`-ийн 10 milestone-ыг **яг тэр дарааллаар**
  `done:false`-оор үүсгэнэ (AC PJ-1) → `PROJECT_CREATED`
- `completeMilestone`: төсөл байхгүй/түлхүүр буруу → `INVALID_INPUT`;
  аль хэдийн `done:true` → `{ok:true, events:[]}` **XP нэмэгдэхгүй** (AC PJ-3);
  эс бөгөөс `done=true, completedAt=ctx.at` + `addXp(25)` + `PROJECT_MILESTONE_COMPLETED`
- 10 milestone бүгд `done` → `completedAt = ctx.at` + `PROJECT_COMPLETED` (AC PJ-4)
- `updateProject`: `selfScore ∉ [0,10] ∪ {null}` → `INVALID_INPUT` (AC PJ-2)

⚠ `completeMilestone` нь дахин тэмдэглэхэд `ok:true` буцаана, `ALREADY_COMPLETED` БИШ.
Шалтгаан: `AC PJ-3` нь «XP нэмэгдэхгүй» гэсэн, «татгалзана» гэсэнгүй — checkbox-ийг
хоёр удаа дарах нь алдаа биш.

#### 5.4.10 `boss.ts` (AC BS-1…4)

```ts
export type BossInput = { bossId: string; scores: BossScores };
export function attemptBoss(state: GameState, input: BossInput, ctx: Ctx): DomainResult;
export function tierFor(total: number): 'failed'|'mvp'|'advanced'|'mastery';
export function coachingMessage(scores: BossScores, pack: ContentPack, state: GameState): string;
```
- Аль нэг оноо бүхэл тоо биш эсвэл `∉ [0,10]` → `INVALID_INPUT` (AC BS-1)
- `total = Σ scores`; `tierFor`: `<35 failed` · `35..44 mvp` · `45..51 advanced` · `≥52 mastery`
  (хилийн тест: 34·35·44·45·51·52 — AC BS-2)
- Оролдлого бүр (тэнцсэн эсэхээс үл хамааран) `bossAttempts`-д бичигдэнэ (AC BS-4)
  → `BOSS_ATTEMPT_LOGGED`
- `tier !== 'failed'` ба bossId нь `completedMainQuestIds`-д БАЙХГҮЙ → `quest.xp` олгож
  id нэмнэ → `BOSS_PASSED` + `XP_GAINED`. Дахин тэнцвэл **0 XP**.
- `tier === 'failed'` → `coachingMessage` (AC BS-3), төлөв (bossAttempts-аас бусад) хэвээр

`coachingMessage` (AC BS-3) — **яг энэ формат**:
```
Attempt logged. Weakest category: {Category}. Recommended side quest: {Title}.
```
- хамгийн сул = хамгийн бага оноо; тэнцвэл `BOSS_CATEGORIES`-ийн дарааллаар эхнийх
- харагдах нэр: `story→Story · editing→Editing · camera→Camera · visualCraft→Visual Craft ·
  animation→Animation · audioPost→Audio/Post`
- ангилал → tag: `story→storytelling · editing→video-editing · camera→cinematography ·
  visualCraft→blender · animation→animation · audioPost→audio`
- `{Title}` = тухайн tag-тай side quest-үүдээс `(world, id)` өсөхөөр эрэмбэлсний эхнийх;
  олдохгүй бол `visualCraft` дээр `vfx` tag-аар дахин хайна; тэр ч байхгүй бол аль ч
  side quest-ийн эхнийх (контентын validation `T-18` нь энэ тохиолдол гарахгүйг баталгаажуулна)

#### 5.4.11 `apply.ts` — үйлдлийн диспетчер

**Энэ нь `contracts.yaml → ActionType` ба `shared/core`-ийн хоорондох ГАНЦ гүүр.**
Клиент, сервер хоёул ЭНЭ функцийг дуудна — тиймээс дүрмийн ганц хувилбар (AC BE-10).

```ts
export function applyAction(state: GameState, action: Action, ctx: Ctx): DomainResult;
```

| `action.type` | Дуудагдах функц |
|---|---|
| `claimQuest` | `quests.claimQuest` |
| `rest` | `stamina.rest` |
| `unlockSkill` | `progression.unlockSkill` |
| `dungeonAttempt` | `dungeons.attemptDungeon` |
| `projectCreate` | `projects.createProject` |
| `projectMilestone` | `projects.completeMilestone` |
| `projectUpdate` | `projects.updateProject` |
| `bossAttempt` | `boss.attemptBoss` |
| `rollDailyMission` | `dailyMission.pickDailyMission` → `state.dailyMission` бичих |
| `resolveEncounter` | `encounters.resolve` → `ENCOUNTER_TRIGGERED`-ийг хаах, coins олгох |
| `updateSettings` | `settings` талбарыг солих → `SETTINGS_UPDATED` |

⚠ `ActionType`-ийн жагсаалт нь `GameState`-ийн **бүх бичигдэх талбарыг** хамарна.
Хамаарахгүй талбар үлдвэл тэр талбар серверээр эрх бүхий болж чадахгүй бөгөөд
зөвхөн `PUT /save`-аар л өөрчлөгдөнө — тэр нь `plan.md P-9`-ийн хязгаарлалтыг зөрчинө.
`shared/core/apply.test.ts` нь `ActionType`-ийн бүх утга диспетчерт байгааг шалгана
(`switch` нь TypeScript-ийн `never` шалгалттай — шинэ төрөл нэмэхэд typecheck УНАНА).

### 5.5 `shared/content` — контентын гэрээ

```ts
// shared/content/index.ts
export function buildPack(): ContentPack;        // JSON файлуудыг угсарна
export function contentVersion(pack: ContentPack): string;  // fnv1a(canonicalJson).toString(16)
```

`canonicalJson` = түлхүүрүүдийг эрэмбэлж, зайгүй цуваасан JSON. **Тогтвортой** байх
ёстой — файлын дарааллаас, форматлалтаас хамаарахгүй (`/content/pack`-ийн ETag,
`/health`-ийн `contentVersion` хоёулаа энэ утгыг ашиглана).

**Контентын validation тестүүд (`T-18` — контент бичихээс ӨМНӨ)**, `web-app/tests/unit/content.test.ts`:

| # | Шалгалт | AC |
|---|---|---|
| C1 | `validateContentPack(buildPack())` → issue 0 | MQ-5, DG-1 |
| C2 | `track==='main'` quest яг **18**, PRD §5-ийн гарчиг ба дэлхий таарна | MQ-1 |
| C3 | `prerequisites` граф DAG (мөчлөггүй), бүх id оршино, `world` буурахгүй | MQ-2 |
| C4 | `track==='side'` **≥20**, тус бүр `tags.length ∈ [1,2]` | SQ-1 |
| C5 | Дэлхий бүрд `max(side.xp) < min(main.xp)` | SQ-3 |
| C6 | Дэлхий бүрд `sideQuestXp(base,4)/estimatedMinutes < avg(main.xp/main.estimatedMinutes)` | SQ-4 |
| C7 | Бүх quest `staminaCost ∈ [1,6]` | STA-4 |
| C8 | Dungeon бүр `tutorialRefs ∈ [1,3]`, асуулт ≥1, `explanation` хоосон биш, `correctIndex < options.length` | DG-1 |
| C9 | Encounter **≥5**, `callToAction` хоосон биш, `maxMinutes ≤ 2` | ENC-1 |
| C10 | Achievement **≥12**, predicate бүр `evaluate`-д таних `kind`-тай | ACH-1 |
| C11 | Loot бүрийн `effect === 'cosmetic'` | EC-1 |
| C12 | Boss ангилал бүрийн tag-д ≥1 side quest харгалзана (`coachingMessage` fallback-гүй ажиллана) | BS-3 |
| C13 | Skill граф DAG, `cost === 1` | PRG-5 |
| C14 | Бүх `tutorialRefs[].url` нь `https://` эхлэлтэй, хоосон биш | DG-1 |

⚠ **C14 нь URL-ийн ЗӨВ ЭСЭХИЙГ шалгахгүй** — зөвхөн хэлбэрийг. Бодит эх сурвалжийн
чанар нь `T-22`-ийн **хүний баталгаа** (`spec.md A8`, `plan.md §6.1`).

---

## 6. `server/` — backend

### 6.1 Давхарга ба middleware гинж

HTTP давхарга: Node-ийн суурин `node:http` + гараар бичсэн жижиг router.
**Шийдвэр D-2:** Express/Fastify нэмэхгүй. Шалтгаан: 9 endpoint, хамаарал багатай
байх нь `npm ci` цэвэр машин дээр (AC Q-5) тогтвортой. Хэрэв endpoint 25-аас давбал
framework руу шилжих нь зөв — одоо биш.

**Гинжний дараалал (энэ дараалал нь ГЭРЭЭ):**

```
1  requestId          → crypto.randomUUID(), хариуны `X-Request-Id`
2  logger(start)      → бүтэцлэгдсэн JSON мөр (§6.10)
3  bodyLimit(1MB)     → давбал 413 (AC BE-5) — уншихаас ӨМНӨ таслана
4  rateLimit:global   → ЗӨВХӨН `POST /api/players` ба `POST /api/transfer/redeem` дээр (30/мин)
5  jsonParse          → задрахгүй бол 400
6  auth               → `Authorization: Bearer` → sha256 → `players.token_hash` → 401
7  rateLimit:perToken → 60/мин (AC BE-17) — auth-ийн ДАРАА, учир нь түлхүүр нь token hash
8  ownership          → path `{playerId}` ≠ auth playerId → 403 (AC BE-4)
9  validate(schema)   → `shared/validate` → 400 + `errors[]` (AC BE-5)
10 handler
11 problemMapper      → бүх алдааг RFC 9457 болгоно (AC BE-16)
```

⚠ **3-р алхам 5-аас ӨМНӨ.** 1MB хязгаарыг задлахаас өмнө таслахгүй бол том бие
санах ойд ачаалагдана.
⚠ **7-р алхам 6-ийн ДАРАА.** Токенгүй замд (4) глобал хязгаар үйлчилнэ; IP хадгалахгүй
тул IP-д тулгуурласан хязгаар боломжгүй (`spec.md A2`, `plan.md P-11`).

### 6.2 SQLite схем

`server/src/db/migrations/001_init.sql` — **гараар `CREATE TABLE` дуудахгүй**, зөвхөн
дугаарласан migration (AC BE-16):

```sql
CREATE TABLE players (
  player_id   TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,      -- sha256 hex. Түүхий token ХАДГАЛАГДАХГҮЙ.
  created_at  TEXT NOT NULL
);
CREATE TABLE saves (
  player_id      TEXT PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL,
  state_json     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  etag           TEXT NOT NULL
);
CREATE TABLE save_snapshots (
  snapshot_id    TEXT PRIMARY KEY,
  player_id      TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL,
  state_json     TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  reason         TEXT NOT NULL CHECK (reason IN ('put','actions','restore'))
);
CREATE INDEX ix_snapshots_player ON save_snapshots(player_id, created_at DESC);
CREATE TABLE action_log (
  player_id  TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  action_id  TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  events_json TEXT NOT NULL,
  PRIMARY KEY (player_id, action_id)     -- ⚠ ЗААВАЛ хосолсон түлхүүр (§6.6)
);
CREATE INDEX ix_action_log_age ON action_log(applied_at);
CREATE TABLE transfer_codes (
  code_hash  TEXT PRIMARY KEY,           -- sha256 hex. Түүхий код ХАДГАЛАГДАХГҮЙ.
  player_id  TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);
CREATE INDEX ix_transfer_player ON transfer_codes(player_id);
CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
```

**PRAGMA:** `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`.

⚠ `action_log`-ийн түлхүүр нь `(player_id, action_id)` — зөвхөн `action_id` байсан бол
өөр тоглогчийн `actionId`-г мэдсэн этгээд түүний event-үүдийг уншиж чадна. Хайлт ч мөн
`player_id`-аар хязгаарлагдана.

⚠ **PII байхгүй** (AC BE-2): IP, user-agent, и-мэйл, нэр — нэг ч багана байхгүй.

### 6.3 Таних тэмдэг (AC BE-2, BE-4)

- `POST /api/players`: `playerId = randomUUID()`, `token = base64url(randomBytes(32))` (43 тэмдэгт)
- DB-д `sha256(token)` hex хадгална. Түүхий token нь **зөвхөн энэ нэг хариунд** гарна.
- `auth` middleware: `sha256(header token)` → `SELECT player_id FROM players WHERE token_hash = ?`
  (индексжсэн, тогтмол хугацаа). Олдохгүй → 401.
- `ownership`: `req.params.playerId !== auth.playerId` → 403.

⚠ Токеныг DB-д hash хэлбэрээр хадгалах нь энэ загварын **хялбаршуулж болохгүй** хэсэг:
DB файл алдагдсан ч идэвхтэй session-ууд шууд задрахгүй.

### 6.4 Save GET/PUT + ETag (AC BE-3)

- `etag = '"' + sha256(state_json).slice(0,16) + '"'` — `saves.etag` баганад хадгална
- `GET`: мөр байхгүй → 404 Problem; байвал 200 + `ETag`
- `PUT`: `If-Match` **заавал**. `*` → зөвхөн мөр БАЙХГҮЙ үед зөвшөөрнө; эс бөгөөс 409.
  Тодорхой утга → `saves.etag`-тай тулгана, зөрвөл 409.
- Амжилттай `PUT` бүр өмнөх төлвийг `save_snapshots(reason='put')` болгоно (AC BE-13)
- Бүхэлдээ нэг `BEGIN IMMEDIATE … COMMIT` дотор

### 6.5 Хүсэлтийн биеийн шалгалт (AC BE-5)

`validate` middleware нь route тус бүрд харгалзах validator-ыг авна:

| Route | Validator |
|---|---|
| `PUT /players/{id}/save` | `validateSavePayload` |
| `POST /players/{id}/actions` | `validateActionBatch` |
| `POST /players/{id}/save/restore` | `validateRestoreRequest` |
| `POST /transfer/redeem` | `validateRedeemRequest` |

`Action.payload` нь контрактад `type: object` (нээлттэй) — **хоёр дахь шалгалт** нь
`actionEngine` дотор `validateActionPayload(type, payload)`-аар хийгдэнэ:

| `type` | `payload` схем |
|---|---|
| `claimQuest` | `{ questId: str, checkedConditions: arr(int) }` |
| `rest` | `{}` |
| `unlockSkill` | `{ skillId: str }` |
| `dungeonAttempt` | `{ dungeonId: str, answers: arr(int) }` |
| `projectCreate` | `{ title: str(1..120) }` |
| `projectMilestone` | `{ projectId: str, key: enom(MILESTONE_KEYS) }` |
| `projectUpdate` | `{ projectId: str, notes?, nextAction?, evidenceRef?, selfScore? }` |
| `bossAttempt` | `{ bossId: str, scores: BossScores }` |
| `rollDailyMission` | `{ date: str(YYYY-MM-DD) }` |
| `resolveEncounter` | `{ encounterId: str }` |
| `updateSettings` | `{ reducedMotion?: bool, soundEnabled?: bool }` |

Хоёр дахь шалгалт унавал → **422** `INVALID_INPUT` + `actionId` (400 биш: бие нь
контрактын хэлбэрт нийцсэн, домэйн түвшний оролт л буруу).

### 6.6 Үйлдлийн хөдөлгүүр (AC BE-11, BE-12)

```ts
// server/src/domain/actionEngine.ts
export function runBatch(db, playerId: string, actions: Action[], ifMatch?: string):
  { state: GameState; results: ActionResult[]; etag: string; updatedAt: string };
```

```
BEGIN IMMEDIATE                                  ← бичих түгжээ шууд авна
  row = saves WHERE player_id = ?
  if ifMatch ба row.etag !== ifMatch  → throw Conflict(409)
  state = row ? JSON.parse(row.state_json) : newGame()
  appliedCount = 0
  results = []
  for a of actions:                              ← ДАРААЛАН
     prior = action_log WHERE player_id=? AND action_id=a.actionId
     if prior:
        results.push({actionId, status:'replayed', events: prior.events})
        continue                                 ← домэйн ДАХИН ажиллахгүй (AC BE-12)
     issues = validateActionPayload(a.type, a.payload)
     if issues  → throw DomainRejection('INVALID_INPUT', a.actionId)
     if |now - a.at| > 5 мин ирээдүйд → throw DomainRejection('INVALID_INPUT', a.actionId)
     r = applyAction(state, a, { pack, at: a.at, rng: createRng(a.seed ?? hash(a.actionId)) })
     if !r.ok → throw DomainRejection(r.reason, a.actionId)      ← ROLLBACK → 422
     state = r.state
     INSERT action_log(playerId, a.actionId, now, JSON.stringify(r.events))
     results.push({actionId, status:'applied', events: r.events})
     appliedCount++
  if appliedCount > 0:
     INSERT save_snapshots(prev state, reason='actions')  ← бүх хэрэгжүүлэлтээс ӨМНӨХ төлөв
     trimSnapshots(playerId, 10)
     UPSERT saves(state_json, etag=hash, updated_at=now)
COMMIT
```

**Гурван шийдвэр, тус бүрийн үндэслэл:**

| Шийдвэр | Яагаад |
|---|---|
| Бүх багц НЭГ гүйлгээнд; аль нэг татгалзвал `ROLLBACK` | AC BE-11 «массив атом» — 3 үйлдлийн 2 дахь нь татгалзахад эхнийх нь үлдэх нь тоглогчийн төлвийг таамаглашгүй болгоно |
| `appliedCount === 0` бол snapshot ҮҮСГЭХГҮЙ | Бүхэлдээ replayed хүсэлт (сүлжээний давталт) нь 10 snapshot-ийн цонхыг хогоор дүүргэнэ |
| `rng` seed нь `a.seed ?? hash(a.actionId)` | Клиент seed өгвөл клиент ба сервер ижил loot гаргана (эвлэрүүлэг зөрөхгүй); өгөөгүй бол `actionId`-аас гарсан тогтвортой утга — давтан илгээхэд ижил үр дүн (AC BE-12) |

⚠ `Math.random()` **ХЭЗЭЭ Ч** ашиглахгүй: idempotent давталт өөр loot өгвөл `replayed`-ийн
баталгаа эвдэрнэ.

### 6.7 Контент тараалт ба degraded (AC BE-6, BE-15)

```
Асах үед:
  pack = buildPack()
  issues = validateContentPack(pack)
  if issues.length:
     state.content = { ok:false, reason: `${issues.length} schema issue(s)` }
     ⚠ issues-ийн АГУУЛГА лог руу орохгүй — зөвхөн тоо ба талбарын зам
  else:
     body = canonicalJson(pack); version = fnv1a(body); etag = `"${version}"`
     state.content = { ok:true, body, etag, version }
```

| Endpoint | `content.ok === true` | `content.ok === false` |
|---|---|---|
| `GET /health` | 200 `{status:'ok', version, contentVersion}` | **503** `{status:'degraded', version, reason}` |
| `GET /content/pack` | 200 + `ETag` + `Cache-Control: public, max-age=300, must-revalidate`; `If-None-Match` таарвал **304** | 503 Problem |
| `POST /actions` | хэвийн | 503 Problem (домэйн контентгүй ажиллахгүй) |
| `GET/PUT /save` | хэвийн | **хэвийн** — save нь контентоос хамаарахгүй |

⚠ Сүүлийн мөр нь санаатай: контент эвдэрсэн ч тоглогч өөрийн өгөгдлөө уншиж, гаргаж
авах боломжтой байх ёстой.

### 6.8 Snapshot түүх (AC BE-13)

```ts
snapshot(db, playerId, state, reason): void   // INSERT + trimSnapshots(playerId, 10)
trimSnapshots(db, playerId, keep = 10): void
//   DELETE FROM save_snapshots WHERE player_id=? AND snapshot_id NOT IN (
//     SELECT snapshot_id FROM save_snapshots WHERE player_id=?
//     ORDER BY created_at DESC, snapshot_id DESC LIMIT ?)
```
⚠ `ORDER BY created_at DESC, snapshot_id DESC` — нэг миллисекундэд хоёр snapshot үүсвэл
дараалал тодорхойгүй болохгүй (тестийн тогтворгүй байдлын эх үүсвэр).

`POST /save/restore`:
```
BEGIN IMMEDIATE
  snap = save_snapshots WHERE snapshot_id=? AND player_id=?   → байхгүй бол 404
  snapshot(одоогийн state, reason='restore')                  ← сэргээлт ӨӨРӨӨ буцаагдах боломжтой
  UPSERT saves ← snap.state_json, шинэ etag
COMMIT
```

### 6.9 Төхөөрөмж хоорондын шилжүүлэг (AC BE-14)

- `POST /players/{id}/transfer-code`:
  `BEGIN; DELETE FROM transfer_codes WHERE player_id=? AND used_at IS NULL;` (нэг идэвхтэй код)
  `code = crockford32(randomBytes(8))` → 12 тэмдэгт, `XXXX-XXXX-XXXX`;
  `INSERT (sha256(normalize(code)), playerId, now, now+15мин)`; `COMMIT` → 201 `{code, expiresAt}`
- `normalize(code)` = том үсэг болгож зураас арилгана (кодыг гараар бичихэд тэсвэртэй)
- `POST /transfer/redeem`:
  ```
  BEGIN IMMEDIATE
    row = transfer_codes WHERE code_hash = sha256(normalize(code))
    if !row || row.used_at || row.expires_at < now → 410 (ЯЛГААГҮЙ мессеж)
    newPlayer = createPlayer()
    INSERT saves(newPlayer, ← эх тоглогчийн save-ийн ХУУЛБАР)
    UPDATE transfer_codes SET used_at = now WHERE code_hash = ?
  COMMIT → 201 {playerId, token}
  ```

**Аюулгүй байдлын шийдвэрүүд (хялбаршуулж БОЛОХГҮЙ):**
1. Код нь hash хэлбэрээр хадгалагдана — DB уншсан этгээд кодыг сэргээж чадахгүй.
2. Гурван бүтэлгүй тохиолдол (олдсонгүй · ашигласан · хугацаа дууссан) **ижил 410** —
   ялгаатай хариу нь кодын оршин тогтнолыг задруулна.
3. `POST /transfer/redeem` нь глобал 30/мин-д багтана — 40 битийн кодыг таамаглах
   оролдлогыг утгагүй болгоно.
4. Хариунд save-ийн агуулга ОРОХГҮЙ — зөвхөн шинэ таних тэмдэг.
5. Эх тоглогчийн save **устахгүй** — «шилжүүлэг» нь хуулбар, устгал биш.

### 6.10 Ops хаалга (AC BE-16, BE-17)

**Problem зураглал** (бүх 4xx/5xx → `application/problem+json`):

| Нөхцөл | status | `code` |
|---|---|---|
| JSON задрахгүй / схемийн алдаа | 400 | `INVALID_BODY` + `errors[]` |
| Token байхгүй/буруу | 401 | `UNAUTHORIZED` |
| Өөр тоглогчийн id | 403 | `FORBIDDEN` |
| Save/snapshot/тоглогч байхгүй | 404 | `NOT_FOUND` |
| `If-Match` зөрөв | 409 | `ETAG_MISMATCH` |
| Шилжүүлэх код хүчингүй | 410 | `TRANSFER_CODE_INVALID` |
| Бие > 1MB | 413 | `BODY_TOO_LARGE` |
| Домэйн татгалзал | 422 | `RejectionReason`-ы утга + `actionId` |
| Хурдны хязгаар | 429 | `RATE_LIMITED` + `Retry-After` |
| Гэнэтийн алдаа | 500 | `INTERNAL` (⚠ stack trace хариунд ОРОХГҮЙ) |
| Контент хүчингүй | 503 | `CONTENT_UNAVAILABLE` |

**Лог (PII-гүй).** Нэг мөр = нэг JSON:
```json
{"ts":"…","level":"info","msg":"request","requestId":"…","method":"POST",
 "route":"/api/players/:id/actions","status":200,"durMs":12,"actionCount":3}
```
**Хориотой (сканнердсан тест `T-48`):** `ip` · `remoteAddress` · `authorization` ·
`bearer` · `token` · `state_json` · `code` (шилжүүлэх код) · `playerId`-ийн бүтэн утга
(эхний 8 тэмдэгт л зөвшөөрөгдөнө). Тест нь тестийн явцад цуглуулсан лог мөрүүдээс
эдгээр түлхүүр/утгыг хайж, олдвол УНАНА.

**Rate limit (`plan.md P-11`).** Процессын санах ой дахь token bucket:
`Map<key, {tokens, resetAt}>`, минут тутам шинэчлэгдэнэ. Түлхүүр: per-token нь
`token_hash`, глобал нь тогтмол мөр `'global:anon'`. Хэтэрвэл 429 +
`Retry-After = ceil((resetAt - now)/1000)`.
⚠ **Хязгаар:** нэг процесст л үйлчилнэ. Олон инстанс шаардлагатай болвол хуваалцсан
тоолуур руу шилжинэ — SQLite нэг файл = нэг процесс тул одоо шаардлагагүй.

**Graceful shutdown.** `SIGTERM`/`SIGINT` → шинэ холболт хүлээхээ болино →
идэвхтэй хүсэлтүүд дуустал (≤10с) хүлээнэ → `db.close()` → `exit(0)`.
Хугацаа хэтэрвэл `exit(1)`.

**Цэвэрлэгээ (`plan.md P-10`).** Асах үед ба 24 цаг тутам:
`DELETE FROM action_log WHERE applied_at < now-90 хоног`;
`DELETE FROM transfer_codes WHERE expires_at < now-1 хоног`.

---

## 7. `web-app/` — frontend

### 7.1 Технологийн шийдвэр

**D-3: UI framework нэмэхгүй.** Vite + TypeScript + жижиг `render(state) → HTMLElement`
функцүүд. Шалтгаан: 8 дэлгэц, 3 модал, runtime хамаарал тэг, a11y-г бүрэн хянана
(`AC A11Y-1…6` нь DOM-ийн нарийн хяналт шаарддаг).
**Хэзээ буруу болох:** дэлгэцийн тоо 15-аас давах, эсвэл хэсэгчилсэн шинэчлэлт
гүйцэтгэлийн асуудал болох үед. Тэр үед React руу шилжих нь `ui/` давхаргад
хязгаарлагдана — `services/` ба `shared/` хөндөгдөхгүй (§3-ын давхаргын гэрээний ашиг).

### 7.2 `services/` — фасад (AC UI-3)

**UI нь ЗӨВХӨН энэ давхаргыг дуудна.** `shared/core` руу шууд импорт хийвэл
`architecture.test.ts` УНАНА.

```ts
// store.ts — 20 мөрийн pub/sub, төлөвийн сан нэмэхгүй
export function createStore<T>(initial: T): {
  getState(): T; setState(next: T): void; subscribe(fn: (s:T)=>void): () => void;
};

// gameService.ts — ГАНЦ бичих цэг
export type Dispatch = (type: ActionType, payload: unknown) =>
  Promise<{ events: DomainEvent[]; rejected?: RejectionReason }>;
export function createGameService(deps): {
  dispatch: Dispatch;
  state$: Store<GameState>;
  events$: (fn:(e:DomainEvent[])=>void)=>()=>void;   // toast · баннер · aria-live
  // уншилтын туслахууд (домэйныг шууд ил гаргахгүй):
  view: {
    rank(): string; xpProgress(): {current:number; next:number|null; pct:number};
    questBoard(track:'main'|'side'): QuestCardView[];
    dailyMission(): QuestCardView | null;
    dungeonList(): DungeonCardView[];
    skillTree(): SkillNodeView[];
    projects(): ProjectView[];
    achievements(): AchievementView[];
  };
};
```

`dispatch` урсгал:
```
1. actionId = crypto.randomUUID(); action = {actionId, type, at: new Date().toISOString(), payload}
2. ЛОКАЛ домэйнээр урьдчилан хэрэгжүүлнэ (optimistic):
     r = applyAction(state, action, ctx)
     if !r.ok → return { rejected: r.reason }   ← сервер рүү ОГТ явуулахгүй
     store.setState(r.state); persistence.scheduleWrite()
3. actionQueue.enqueue(action)
4. sync.kick()  (онлайн бол шууд, офлайн бол дараа)
```

⚠ **Локал татгалзал сервер рүү явахгүй.** Ижил дүрэм ажиллаж байгаа тул сервер ч
татгалзана — сүлжээний дуудлага дэмий (`AC BE-7`-ийн офлайн зан төлөвтэй ижил).

### 7.3 Event → UI

`events$` нь DOM-д хоёр зүйл хийнэ:
1. **`aria-live="polite"` бүс** (`#announcer`) — `XP_GAINED`, `LEVEL_UP`,
   `ACHIEVEMENT_UNLOCKED`, `DUNGEON_FAILED` зэргийг текстээр уншуулна (AC A11Y-3)
2. **Toast / баннер** — `LEVEL_UP` нь дэлгэцийн баннер (AC PRG-6), бусад нь toast

⚠ Зөвхөн өнгө/анимацаар мэдээлэл дамжуулахгүй (AC A11Y-3): toast бүр текст + дүрстэй.

### 7.4 Дэлгэцүүд ба навигаци (AC UI-1, UI-2)

Hash router (`app/router.ts`), 8 зам:

| # | Зам | Дэлгэц | Гол агуулга |
|---|---|---|---|
| 1 | `#/camp` | **Camp** | rank · level · XP bar · stamina · **өдрийн даалгавар** · streak+combo · дараагийн төслийн үйлдэл · тохиолдлын карт (AC UI-2) |
| 2 | `#/quests` | Main Quest Board | дэлхий тус бүрээр бүлэглэсэн 18 quest, түгжээтэй/боломжтой/дууссан төлөв |
| 3 | `#/side` | Side Quest Board | ≥20 side quest, давталтын тоо + **дараагийн XP** ил |
| 4 | `#/dungeons` | Study Dungeons | tutorial холбоос + mastery шалгалт |
| 5 | `#/skills` | Skill Tree | SP тоо, түгжээ, урьдчилсан нөхцөлийн шугам |
| 6 | `#/forge` | Project Forge | төслүүд, 10 milestone-ийн checklist, notes/nextAction |
| 7 | `#/achievements` | Achievements | олдсон/олдоогүй, предикатын тайлбар |
| 8 | `#/settings` | Settings | reducedMotion · sound · **export/import** · **transfer code** · сүүлд хадгалсан |

**Компонентын мод (давтагдах хэсгүүд):**
```
AppShell
├─ SkipLink ("Skip to main content")
├─ TopBar     — rank · level · XP bar · stamina pip · coins · sync индикатор
├─ Nav        — 8 холбоос, идэвхтэйд `aria-current="page"`
├─ main#main  — дэлгэцийн контент (route солигдоход <h1>-д фокус шилжинэ)
├─ Announcer  — aria-live="polite", визуал далд
└─ ModalHost  — нэг зэрэг НЭГ модал
components/
  QuestCard · StatBar · StaminaPips · Badge · Checklist · Modal · Toast
  ClaimModal      — victoryConditions checklist, БҮГД тэмдэглэгдтэл Claim товч идэвхгүй (AC MQ-6)
  DungeonModal    — асуултууд → үр дүн → буруу хариулт бүрийн тайлбар (AC DG-4)
  BossModal       — 6 slider (0..10), нийт оноо, «coaching, not certification» тэмдэглэл (AC BS-5)
```

**Claim модал (AC MQ-6) — гэрээ:** `victoryConditions` бүр checkbox болно;
бүгд тэмдэглэгдэх хүртэл «Claim victory» товч `disabled` + `aria-disabled="true"`.
Дарахад `dispatch('claimQuest', {questId, checkedConditions:[0..n-1]})`.

**Dungeon унах UX (AC DG-4):** «Failed» гэсэн ганц үг ХОРИГЛОГДОНО. Гаралт нь
буруу хариулт тус бүрийн `explanation` + `nextStep` мөр.

### 7.5 Persistence (AC SV-2, SV-3)

```ts
// persistence.ts
const KEY = 'ea.save.v1';
export function load(): { state: GameState; warning?: string };
export function scheduleWrite(state: GameState): void;   // 500ms trailing debounce
export function flush(): void;                           // visibilitychange + pagehide
export function lastSavedAt(): string | null;            // UI-д харагдана (AC SV-3)
```

`load()` (AC SV-2):
```
raw = localStorage[KEY]
if !raw                              → { state: newGame() }
parsed = try JSON.parse(raw) catch   → гэмтсэн зам
r = loadState(parsed)
if !r.ok:
   localStorage[`ea.save.corrupt.${Date.now()}`] = raw    ← ГЭМТСЭН ХУУЛБАР ХАДГАЛАГДАНА
   localStorage.removeItem(KEY)
   return { state: newGame(), warning: `Save could not be read (${r.reason}). A backup was kept.` }
return { state: r.state }
```
⚠ Апп **ХЭЗЭЭ Ч унахгүй** — гэмтсэн save нь шинэ тоглоом + сануулга болно.
⚠ Гэмтсэн хуулбар устгагдахгүй: тоглогчийн ажлыг чимээгүй алдах нь энэ системийн
хамгийн муу бүтэлгүйтэл.

`flush()` нь `visibilitychange`(hidden) ба `pagehide` дээр дуудагдана — `beforeunload`
нь мобайл дээр найдваргүй.

### 7.6 Үйлдлийн дараалал ба эвлэрүүлэг (AC BE-7, BE-11, BE-12)

```ts
// actionQueue.ts — localStorage `ea.queue.v1` дотор
enqueue(a: Action): void
peekAll(): Action[]
dropUpTo(actionIds: string[]): void

// sync.ts
kick(): void            // онлайн эсэхийг шалгаад flush эхлүүлнэ
status(): 'offline' | 'syncing' | 'synced' | 'error'
```

**Flush алгоритм:**
```
1. q = queue.peekAll();  хэрэв хоосон → GET /save (сервер илүү шинэ эсэхийг шалгах)
2. batch = q.slice(0, 50)                          ← контрактын maxItems
3. POST /players/{id}/actions  { actions: batch }  (If-Match = сүүлд мэдэгдэж буй etag)
4. 200 →  store.setState(res.state)                ← СЕРВЕРИЙН төлөв ЭРХ БҮХИЙ
          queue.dropUpTo(res.results.map(r=>r.actionId))
          etag = res.etag;  persistence.scheduleWrite()
          үлдсэн байвал 2 руу буцна
   409 →  GET /save → серверийн төлвийг авна → үлдсэн дарааллыг ТҮҮН ДЭЭР дахин илгээнэ
   422 →  тухайн actionId-г дарааллаас ХАСНА, тоглогчид шалтгааныг харуулна,
          үлдсэнийг үргэлжлүүлнэ  ⚠ давталтад орохгүйн тулд ЗААВАЛ хасна
   429 →  Retry-After секундын дараа дахин
   сүлжээний алдаа → status='offline', дараагийн `online` event хүртэл зогсоно
5. Дараалал эвдэрсэн бол (JSON задрахгүй, actionId давхардсан):
     PUT /save (If-Match) — бүтэн эвлэрүүлэг, last-write-wins (plan.md P-9)
```

**Офлайн (AC BE-7).** `dispatch` нь сервергүйгээр бүрэн ажиллана: локал домэйн →
localStorage. Дараалал өснө. Холболт сэргэхэд (`window.online` эсвэл `/health` амжилттай)
`kick()` дуудагдаж дээрх урсгал явна.

⚠ **Зөрүүний цонх.** Локал optimistic төлөв ба серверийн эрх бүхий төлөв нь loot/encounter
дээр зөрж болзошгүй. Тиймээс `dispatch` нь `action.seed`-ыг **клиент дээр** үүсгэж илгээнэ
(`crypto.getRandomValues`-аас нэг 32-бит тоо) — сервер ижил seed-ээр ижил үр дүн гаргана.
Зөрөх цорын ганц тохиолдол нь өөр төхөөрөмжөөс өөрчлөлт орсон үед бөгөөд тэр үед
серверийн төлөв ялна (документчилсан last-write-wins, `spec.md A4`).

### 7.7 Export / Import (AC SV-4, SV-5)

```ts
export function exportSave(state: GameState): Blob;    // toPayload(state, now) → pretty JSON
export function importSave(file: File): Promise<{ ok: true; state } | { ok: false; issues: Issue[] }>;
```
- Файлын нэр: `editors-ascension-save-YYYY-MM-DD.json`
- Import нь `loadState` дамжина (migration + validation)
- **Буруу файл нь одоогийн төлвийг УСТГАХГҮЙ** (AC SV-4) — модал нь `issues`-ийн эхний
  5 алдааг талбарын замтай нь харуулна, төлөв хөндөгдөхгүй
- Амжилттай import → төлөв солигдож, `PUT /save` (`If-Match`) -аар серверт тавигдана
  (`plan.md P-9`-ийн зөвшөөрөгдсөн хоёр дахь тохиолдол)
- Round-trip тест (AC SV-5): `export → import → deep-equal`

### 7.8 Хүртээмж (AC A11Y-1…6)

| AC | Хэрэгжилт |
|---|---|
| A11Y-1 | Бүх интерактив элемент нь `<button>`/`<a>`/`<input>` — `div+onclick` ХОРИГЛОНО (сканнердсан тест). `:focus-visible` outline 2px, контраст ≥3:1. Модал: focus trap + `Escape` хаана + хаагдахад нээсэн товч руу фокус БУЦНА |
| A11Y-2 | `@media (prefers-reduced-motion: reduce)` бүх `transition`/`animation`-ыг `0.01ms` болгоно. Settings-ийн `reducedMotion` нь `<html data-reduced-motion="true">` тавьж ижил CSS дүрмийг идэвхжүүлнэ |
| A11Y-3 | Төлөв бүр текст + дүрстэй: `Locked 🔒` · `Done ✓` · `Available` — зөвхөн өнгө ХЭЗЭЭ Ч биш |
| A11Y-4 | Өнгөний палитр нь ≥4.5:1 контрасттай (`theme.css` дотор тогтоогдоно). Layout нь CSS Grid + `minmax` — 360/768/1280px дээр хэвтээ гүйлгэлтгүй |
| A11Y-5 | Дуу нь **нэмэлт** давхарга: `soundEnabled:false` үед ямар ч функц алдагдахгүй. Дуу нь зөвхөн `events$`-ийн 4 event дээр тоглоно |
| A11Y-6 | `web-app/tests/a11y/*.test.ts` — дэлгэц бүрийг jsdom-д mount хийж `axe-core` ажиллуулна, `critical` зөрчил **0** |

⚠ `axe-core` нь `web-app`-ийн **devDependency** — `shared/`-ыг хамааралгүй байлгана.

---

## 8. Гол урсгалууд

### 8.1 Онлайн quest claim
```
Тоглогч → ClaimModal: victoryConditions бүгд тэмдэглэв → «Claim victory»
  ui → services.dispatch('claimQuest', {questId, checkedConditions})
     → applyAction(локал)  ok → store шинэчлэгдэнэ, XP bar хөдөлнө (шууд)
     → persistence.scheduleWrite()            (500ms дараа localStorage)
     → actionQueue.enqueue(action)
     → sync.kick()
        → POST /api/players/{id}/actions  {actions:[…]}  If-Match: etag
           server: BEGIN IMMEDIATE → action_log шалгах → applyAction(сервер) →
                   snapshot(өмнөх) → UPSERT saves → COMMIT
           ← 200 {state, results:[{status:'applied', events}], etag}
        → store.setState(res.state)   ← эрх бүхий төлөв
        → queue.dropUpTo([actionId])
  events$ → aria-live: "Gained 40 XP. Level up: Apprentice."
```

### 8.2 Офлайн → онлайн эвлэрүүлэг
```
[офлайн] claim ×3, rest ×1, dungeon ×1   → дараалалд 5 үйлдэл, локал төлөв урагшилсан
[онлайн болов] window 'online' → sync.kick()
  POST /actions {actions: [5]}   ← НЭГ багц, дараалал хадгалагдсан
  ← 200 {state: серверийн тооцоолсон төлөв, results: 5× applied}
  store.setState(серверийн state)   ← локал төлөв СОЛИГДОНО
  ⚠ Ижил seed → ижил loot → зөрүү ГАРАХГҮЙ
[давхар илгээлт] сүлжээ хариу алдсан тул клиент ижил багцыг дахин илгээв
  ← 200 results: 5× replayed, state ӨӨРЧЛӨГДӨӨГҮЙ   (AC BE-12: XP нэг л удаа)
```

### 8.3 Домэйн татгалзал сервер дээр
```
POST /actions {actions:[claim(cost 5), claim(cost 5)]}   stamina = 6
  server: 1-р үйлдэл ok (stamina 6→1)
          2-р үйлдэл → INSUFFICIENT_STAMINA → throw → ROLLBACK
  ← 422 problem+json { code:'INSUFFICIENT_STAMINA', actionId:'<2-р>' , status:422 }
  DB: saves ӨӨРЧЛӨГДӨӨГҮЙ, action_log-д 1-р үйлдэл ч БИЧИГДЭЭГҮЙ  (AC BE-11 атом)
  клиент: 2-р actionId-г дарааллаас хасна, 1-рийг дахин илгээнэ, тоглогчид
          «Not enough stamina» харуулна
```

### 8.4 Төхөөрөмж солих
```
[Төхөөрөмж A] Settings → «Transfer to another device»
  POST /players/{A}/transfer-code → 201 {code:'K7QM-2X4T-9BRH', expiresAt}
  UI: кодыг том фонтоор харуулж, 15 минутын тоолуур
[Төхөөрөмж B] Settings → «Import from another device» → код оруулав
  POST /transfer/redeem {code} → 201 {playerId:B, token:B}
  localStorage-д шинэ таних тэмдэг → GET /players/{B}/save → төлөв ачаалагдав
[Төхөөрөмж B] ижил кодыг дахин → 410 TRANSFER_CODE_INVALID
```

---

## 9. Тестийн зураглал

| Давхарга | Байршил | Хамрах |
|---|---|---|
| `[U]` домэйн | `web-app/tests/unit/core/*.test.ts` | PRG · STA · MQ-3,4,6 · SQ-2,5 · DG-2,3,4 · DM · ENC-2 · PJ · BS · EC · ACH · SV-1..5 |
| `[C]` контент | `web-app/tests/unit/content.test.ts` | §5.5-ийн C1…C14 |
| `[I]` интеграци (клиент) | `web-app/tests/integration/*.test.ts` | SV-6 · BE-7 (fetch хаалттай) · BE-12 клиент тал · export/import round-trip |
| `[A]` a11y | `web-app/tests/a11y/*.test.ts` | A11Y-1…6 |
| архитектур | `web-app/tests/architecture.test.ts`, `server/tests/architecture.test.ts` | UI-3 · BE-10 · `plan.md P-5` · EC-1 |
| контракт паритет | `web-app/tests/unit/contract-parity.test.ts` | §5.1 — `schemas.ts` ↔ `contracts.yaml` |
| `[I]` сервер | `server/tests/integration/*.test.ts` | BE-2…BE-6, BE-8, BE-9, BE-11…BE-17 |
| контракт | `server/tests/contract/*.test.ts` | BE-1 — `contracts.yaml`-ийн endpoint БҮРИЙН хариу схемд нийцнэ |
| `[S]` smoke | гараар, `plan.md` P8 | UI-1,2,4 · BS-5 · Q-3, Q-5 |

**Contract тестийн механизм (`T-29`, `T-50`).** `contracts.yaml`-ыг уншиж, `paths`-ийн
`(зам, method, status)` гурвалсан бүрээр нэг тест үүсгэнэ. Endpoint контрактад байгаа
мөртлөө хэрэгжээгүй бол тест УНАНА — `T-42` (контракт) нь `T-44…T-48`-аас өмнө
хийгддэгийн шалтгаан нь яг энэ (**хүлээгдсэн улаан**).

**Хоёр команд, өөр юу ч биш** (`plan.md P-7`):
`cd web-app && npm test` · `cd server && npm test`
(тус бүр нь `typecheck && lint && vitest run`).

---

## 10. Загварын үед илэрсэн зөрүү ба ил таамаглал

### 10.1 Зөрүү: `spec.md SQ-2`-ийн жишээ томьёотойгоо зөрж байна

`spec.md SQ-2`-ийн томьёо: `max(ceil(base*0.1), floor(base * m^(n-1)))`.
`base=40, m=0.5` үед `n=4` → `floor(40 × 0.125) = 5`, `ceil(4) = 4`, `max = 5`.
Спекийн жишээ `40, 20, 10, **4**, 4, 4` гэсэн — n=4 дээр **5** байх ёстой.

**Шийдвэр:** томьёо эрх бүхий, жишээ арифметик алдаатай. Тестийн вектор
`40, 20, 10, 5, 4, 4` болов (§5.4.4). **Блоклохгүй** — зөвхөн нэг тестийн мөр өөрчлөгдөнө.
Хэрэв жишээ нь зорилготой байсан бол томьёо `floor(base * m^n)` руу өөрчлөгдөх ёстой,
гэвч тэр нь `n=1` дээр 20 өгч эхний гүйцэтгэлийг хагасалж, `SQ-3`-ийн тэнцвэрийг эвднэ.

### 10.2 Ил таамаглалууд (бүгд блоклохгүй)

| # | Таамаглал | Өөрчилвөл нөлөөлөх |
|---|---|---|
| A-LLD-1 | `combo` = тухайн идэвхтэй өдрийн claim-ийн тоо, зөвхөн cosmetic. Спек тодорхойлоогүй. | `streak.ts` нэг функц + Camp дэлгэцийн нэг мөр |
| A-LLD-2 | `ENCOUNTER_CHANCE = 0.25`, `LOOT_CHANCE = 0.35`. Спекэд тоо байхгүй. | `constants.ts` дахь хоёр тоо |
| A-LLD-3 | UI framework ашиглахгүй (§7.1). | `ui/**` бүхэлдээ; `services/`, `shared/` хөндөгдөхгүй |
| A-LLD-4 | HTTP framework ашиглахгүй (§6.1). | `server/src/{app,middleware}`; routes-ийн логик хөндөгдөхгүй |
| A-LLD-5 | `ActionType`-д `projectCreate` · `projectUpdate` · `rollDailyMission` · `resolveEncounter` · `updateSettings` нэмэгдсэн (`plan.md BE-11` нь 6 төрөл нэрлэсэн). Шалтгаан: эдгээргүйгээр `GameState`-ийн 5 талбар серверээр эрх бүхий болж чадахгүй. | `contracts.yaml → ActionType`, `apply.ts` |
| A-LLD-6 | Огнооны хил нь **UTC** (`streak`, `dailyMission`). Цагийн бүс тооцохгүй. | `streak.ts`, `dailyMission.ts` |
| A-LLD-7 | `client action.at` нь ирээдүйд >5 мин хазайвал татгалзана (цагийн хууран мэхлэлт биш, буруу цагтай төхөөрөмжөөс хамгаалах) | `actionEngine` нэг мөр |

### 10.3 Хүн шийдэх цэгүүд (`plan.md §6` хэвээр)

1. **`T-22`-ийн өмнө** — dungeon-ы бодит tutorial эх сурвалжууд (`spec.md A8`).
   Энэ LLD нь зөвхөн бүтэц ба хэлбэрийн шалгалтыг (§5.5 C14) тогтоов.
2. **Save схемийн эвдрэлтэй өөрчлөлт** — `schemaVersion` 2 болох шаардлага гарвал.
3. **Release (P8)**.

### 10.4 Энэ шатанд ШАЛГААГДААГҮЙ зүйлс (ил мэдэгдэл)

- Ямар ч код бичигдээгүй, тиймээс ямар ч тест АЖИЛЛААГҮЙ. `npm test` нь `web-app/`
  болон `server/` хавтас байхгүй тул одоогоор ажиллах боломжгүй.
- `contracts.yaml` нь YAML-ээр задарч, бүх дотоод `$ref` шийдэгдэж байгааг **шалгасан**
  (44 лавлагаа, эвдэрсэн нь 0). OpenAPI 3.1-ийн семантик валидацийг гүйцэтгээгүй —
  тэр нь `T-29`-ийн contract тестийн ажил.
- Гүйцэтгэлийн хэмжилт, ачааллын тест хамрах хүрээнд ОРООГҮЙ (`spec.md §6`).

---

## 11. Task → загварын хэсэг

| Hefesto ID | Task | Загварын хэсэг |
|---|---|---|
| 413 | T-01 web-app суурь | §2, §7.1 |
| 414 | T-02 server суурь | §2, §6.1 |
| 415 | T-03 баримт ба дүрэм | §2 (`docs/PERSONAL-1/`), §3 (`CLAUDE.md`-ийн агуулга) |
| 416 | T-04 `shared/` төрөл + validator | §5.1, §5.2 |
| 417 | T-05 save version + migration | §5.3 |
| 418 | T-06 прогресс | §5.4.1 |
| 419 | T-07 stamina | §5.4.2 |
| 420 | T-08 quest claim | §5.4.3 |
| 421 | T-09 side quest давталт | §5.4.4 |
| 422 | T-10 dungeon | §5.4.5 |
| 423 | T-11 өдрийн даалгавар | §5.4.6 |
| 424 | T-12 тохиолдол · loot · эдийн засаг | §5.4.7 |
| 425 | T-13 амжилт ба streak | §5.4.8 |
| 426 | T-14 Project Forge | §5.4.9 |
| 427 | T-15 boss | §5.4.10 |
| 428 | T-16 save цуваалт · corruption · export | §5.3, §7.5, §7.7 |
| 429 | T-17 архитектурын хамгаалалт | §3 |
| 430 | T-18 контентын validation | §5.5 (C1…C14) |
| 431 | T-19 18 main quest | §5.5 (C2, C3) |
| 432 | T-20 side quest ≥20 | §5.5 (C4, C5, C6) |
| 433 | T-21 dungeon бүтэц | §5.5 (C8) |
| 434 | T-22 tutorial эх сурвалж ⚠ хүн | §5.5 (C14), §10.3 |
| 435 | T-23 тохиолдол · амжилт · loot каталог | §5.5 (C9, C10, C11) |
| 436 | T-24 сервер суурь `/health` + SQLite | §6.1, §6.2 |
| 437 | T-25 нэргүй тоглогч + токен | §6.3 |
| 438 | T-26 save GET/PUT + ETag | §6.4 |
| 439 | T-27 биеийн шалгалт | §6.5 |
| 440 | T-28 контент тараалт + кэш | §6.7 |
| 441 | T-29 contract тест | §9 |
| 442 | T-42 контрактын өргөтгөл | **`contracts.yaml` v1.1.0 — ЭНЭ ШАТАНД ХИЙГДСЭН** |
| 443 | T-43 домэйн нэгтгэх хамгаалалт | §3.2 |
| 444 | T-44 үйлдлийн endpoint + idempotency | §6.6 |
| 445 | T-45 snapshot түүх | §6.8 |
| 446 | T-46 шилжүүлэх код | §6.9 |
| 447 | T-47 контентын validation + degraded | §6.7 |
| 448 | T-48 ops хаалга | §6.10 |
| 449 | T-49 клиентийн дараалал + эвлэрүүлэг | §7.6, §8.2, §8.3 |
| 450 | T-50 өргөтгөсөн contract тест | §9 |
| 451 | T-30 `services/` фасад | §7.2 |
| 452 | T-31 апп бүрхүүл + навигаци | §7.4 |
| 453 | T-32 Camp | §7.4 (мөр 1) |
| 454 | T-33 quest board + claim модал | §7.4 (мөр 2, 3 + ClaimModal) |
| 455 | T-34 dungeon дэлгэц + унах UX | §7.4 (мөр 4 + DungeonModal) |
| 456 | T-35 Skill · Forge · Achievements · Settings | §7.4 (мөр 5–8) |
| 457 | T-36 localStorage persistence | §7.5 |
| 458 | T-37 серверийн sync адаптер | §7.6 |
| 459 | T-38 export / import UI | §7.7 |
| 460 | T-39 хүртээмж | §7.8 |
| 461 | T-40 хөдөлгөөн · дуу · onboarding | §7.8 (A11Y-2, A11Y-5) |
| 462 | T-41 release хаалга | §9 (сүүлийн мөр) |

⚠ Бүх 50 task загварын хэсэгтэй. Хэсэггүй task БАЙХГҮЙ — байсан бол тэр нь загварын
цоорхой байх байсан.
