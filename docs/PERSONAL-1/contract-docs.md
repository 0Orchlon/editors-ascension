<!-- PERSONAL-1 · contract-docs · Гэрээ нийтлэх · 2026-09-15 -->
<!-- ҮҮСГЭСЭН ФАЙЛ — гараар бүү засварла. Эх: contracts/openapi.yaml -->
<!-- Дахин үүсгэх: cd contracts && npm run docs -->

# Editor's Ascension API — гэрээний баримт v1.1.0

Ганц тоглогчийн судалгаа-RPG-ийн backend. Хамрах хүрээ: контент пакет тараах, нэргүй тоглогчийн save хадгалах, ба (v1.1.0-оос) тоглоомын үйлдлийг эрх бүхий талаар `shared/core` домэйнээр хэрэгжүүлэх. Домэйн дүрэм нь НЭГ хувилбартай (`shared/core/**`) бөгөөд клиент, сервер хоёул ижил кодыг ажиллуулна (plan.md → BE-10). Сервер унтарсан үед клиент локал домэйнээр бүрэн ажиллана (AC BE-7).

- **OpenAPI:** 3.1.0 · эх файл: [`contracts/openapi.yaml`](../../contracts/openapi.yaml)
- **Server:** `/api`
- **Үндсэн хамгаалалт:** `playerToken` (Bearer). `security: []` тэмдэгтэй үйлдэл нээлттэй.
- **Дуурайлт (mock):** `cd contracts && npm run mock` → `http://127.0.0.1:4010`

## Эндпойнтын жагсаалт

| Method | Зам | operationId | Tag | Auth | Тайлбар |
|---|---|---|---|---|---|
| `GET` | `/health` | `getHealth` | ops | нээлттэй | Сервисийн эрүүл мэнд (AC BE-9, BE-15) |
| `POST` | `/players` | `createPlayer` | players | нээлттэй | Нэргүй тоглогч үүсгэх (AC BE-2) |
| `GET` | `/players/{playerId}/save` | `getSave` | saves | token | Save унших (AC BE-3, BE-4) |
| `PUT` | `/players/{playerId}/save` | `putSave` | saves | token | Save бүтнээр бичих (AC BE-3, BE-4, BE-5) |
| `GET` | `/players/{playerId}/save/history` | `getSaveHistory` | saves | token | Snapshot түүх (AC BE-13) |
| `POST` | `/players/{playerId}/save/restore` | `restoreSave` | saves | token | Snapshot-оос сэргээх (AC BE-13) |
| `POST` | `/players/{playerId}/actions` | `applyActions` | actions | token | Эрх бүхий домэйн үйлдэл (AC BE-11, BE-12) |
| `POST` | `/players/{playerId}/transfer-code` | `createTransferCode` | transfer | token | Төхөөрөмж хооронд шилжүүлэх код үүсгэх (AC BE-14) |
| `POST` | `/transfer/redeem` | `redeemTransferCode` | transfer | нээлттэй | Шилжүүлэх код ашиглах (AC BE-14) |
| `GET` | `/content/pack` | `getContentPack` | content | нээлттэй | Контент пакет (AC BE-6, BE-15) |

## Үйлдлүүд

### `GET /health` — `getHealth`

Сервисийн эрүүл мэнд (AC BE-9, BE-15) · **auth:** нээлттэй

Контент пакет асах үедээ `shared/validate`-ээр шалгагдана. Хүчингүй бол сервис degraded — `/content/pack` мөн 503 буцаана (AC BE-15).

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`HealthOk`](#healthok) | Эрүүл |
| `503` | [`HealthDegraded`](#healthdegraded) | Контент хүчингүй — degraded (AC BE-15) |

### `POST /players` — `createPlayer`

Нэргүй тоглогч үүсгэх (AC BE-2) · **auth:** нээлттэй

PII хадгалахгүй. Token нь дахин олгогдохгүй — клиент localStorage-д хадгална. Сервер талд token нь зөвхөн hash хэлбэрээр хадгалагдана. Rate limit: глобал 30/мин (AC BE-17; IP хадгалахгүй тул IP-д тулгуурлахгүй).

| Статус | Бие | Тайлбар |
|---|---|---|
| `201` | [`PlayerCredentials`](#playercredentials) | Үүссэн |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

### `GET /players/{playerId}/save` — `getSave`

Save унших (AC BE-3, BE-4) · **auth:** token

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SavePayload`](#savepayload) | Save олдов |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

### `PUT /players/{playerId}/save` — `putSave`

Save бүтнээр бичих (AC BE-3, BE-4, BE-5) · **auth:** token

Хэрэглээ нь ил хязгаарлагдсан (plan.md P-9): зөвхөн (а) офлайн үйлдлийн дараалал алдагдсаны дараах бүтэн эвлэрүүлэг, (б) import хийсэн төлвийг серверт тавих. Ердийн тоглолтын бичилт нь `POST /players/{playerId}/actions`. Амжилттай бичилт бүр өмнөх төлвийг snapshot болгоно (AC BE-13).

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |
| `If-Match` | header | тийм | string | Сүүлд уншсан ETag. Анхны бичилтэд `*`. |

**Хүсэлтийн бие** (`application/json`, заавал): [`SavePayload`](#savepayload)

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SaveAck`](#saveack) | Хадгалагдав |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `409` | [`Problem`](#problem) | ETag хуучирсан — өөр бичилт түрүүлсэн (AC BE-3) |
| `413` | [`Problem`](#problem) | Бие 1MB-аас том (AC BE-5) |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

### `GET /players/{playerId}/save/history` — `getSaveHistory`

Snapshot түүх (AC BE-13) · **auth:** token

Хамгийн сүүлийн 10 snapshot, шинэ нь эхэнд. Агуулга буцаахгүй — зөвхөн лавлагаа.

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SaveHistory`](#savehistory) | Түүх |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

### `POST /players/{playerId}/save/restore` — `restoreSave`

Snapshot-оос сэргээх (AC BE-13) · **auth:** token

Сэргээлт өөрөө шинэ snapshot үүсгэнэ (`reason: restore`) — сэргээсэн үйлдэл эргүүлэн буцаагдах боломжтой байх ёстой.

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

**Хүсэлтийн бие** (`application/json`, заавал): [`RestoreRequest`](#restorerequest)

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`SavePayload`](#savepayload) | Сэргээгдэв |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

### `POST /players/{playerId}/actions` — `applyActions`

Эрх бүхий домэйн үйлдэл (AC BE-11, BE-12) · **auth:** token

Үйлдлийн массивыг `shared/core`-оор ДАРААЛАН хэрэгжүүлнэ. **Атом**: нэг үйлдэл домэйнээр татгалзвал бүх багц буцаагдаж 422 гарна, хадгалагдсан төлөв ӨӨРЧЛӨГДӨХГҮЙ. Idempotency: `actionId` тус бүрээр бүртгэгдэнэ; өмнө хэрэгжсэн `actionId` дахин ирвэл домэйн ДАХИН ажиллахгүй (`status: replayed`), анхны event-үүд буцна. `If-Match` нь сонголттой — өгвөл хуучирсан ETag → 409 (клиент эхлээд GET хийнэ).

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |
| `If-Match` | header | үгүй | string | Өгвөл хуучирсан ETag → 409. |

**Хүсэлтийн бие** (`application/json`, заавал): [`ActionBatchRequest`](#actionbatchrequest)

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`ActionBatchResponse`](#actionbatchresponse) | Багц хэрэгжив (эсвэл бүхэлдээ replayed) |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `409` | [`Problem`](#problem) | ETag хуучирсан — өөр бичилт түрүүлсэн (AC BE-3) |
| `413` | [`Problem`](#problem) | Бие 1MB-аас том (AC BE-5) |
| `422` | [`Problem`](#problem) | Домэйн үйлдлийг татгалзав (AC BE-11). `code` нь `RejectionReason`, `actionId` нь татгалзсан үйлдлийг заана. Багц бүхэлдээ буцаагдсан. |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |
| `503` | [`Problem`](#problem) | Контент хүчингүй — сервис degraded (AC BE-15) |

### `POST /players/{playerId}/transfer-code` — `createTransferCode`

Төхөөрөмж хооронд шилжүүлэх код үүсгэх (AC BE-14) · **auth:** token

TTL 15 минут, криптографийн санамсаргүй. Код нь сервер талд зөвхөн hash хэлбэрээр хадгалагдана. Хариунд save-ийн агуулга ОРОХГҮЙ. Шинэ код үүсгэвэл өмнөх идэвхтэй код хүчингүй болно (нэг тоглогчид нэг идэвхтэй код).

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `playerId` | path | тийм | string(uuid) |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `201` | [`TransferCode`](#transfercode) | Код үүсэв |
| `401` | [`Problem`](#problem) | Token байхгүй/буруу (AC BE-4) |
| `403` | [`Problem`](#problem) | Token өөр тоглогчийнх (AC BE-4) |
| `404` | [`Problem`](#problem) | Олдсонгүй |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

### `POST /transfer/redeem` — `redeemTransferCode`

Шилжүүлэх код ашиглах (AC BE-14) · **auth:** нээлттэй

Код **нэг удаа**. Амжилттай бол ШИНЭ `{playerId, token}` олгож, эх тоглогчийн save-ийн хуулбарыг шинэ тоглогчид үүсгэнэ. Эх тоглогчийн save хэвээр үлдэнэ. Ашигласан · хугацаа дууссан · олдоогүй — бүгд **410** (кодын оршин тогтнолыг задруулахгүйн тулд ялгаагүй хариу).

**Хүсэлтийн бие** (`application/json`, заавал): [`RedeemRequest`](#redeemrequest)

| Статус | Бие | Тайлбар |
|---|---|---|
| `201` | [`PlayerCredentials`](#playercredentials) | Шинэ тоглогч үүсэж save хуулагдав |
| `400` | [`Problem`](#problem) | Схемийн алдаа (AC BE-5) |
| `410` | [`Problem`](#problem) | Код ашиглагдсан · хугацаа дууссан · олдсонгүй (AC BE-14) |
| `429` | [`Problem`](#problem) | Хурдны хязгаар (AC BE-17) |

### `GET /content/pack` — `getContentPack`

Контент пакет (AC BE-6, BE-15) · **auth:** нээлттэй

| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |
|---|---|---|---|---|
| `If-None-Match` | header | үгүй | string |  |

| Статус | Бие | Тайлбар |
|---|---|---|
| `200` | [`ContentPack`](#contentpack) | Пакет |
| `304` | — | Өөрчлөгдөөгүй |
| `503` | [`Problem`](#problem) | Контент хүчингүй — сервис degraded (AC BE-15) |

## Схемүүд

### Problem

RFC 9457 problem details. Бүх 4xx/5xx хариу ЭНЭ хэлбэртэй (AC BE-16).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `type` | string | тийм | default=about:blank |  |
| `title` | string | тийм | — |  |
| `status` | integer | тийм | minimum=400, maximum=599 |  |
| `detail` | string | үгүй | — |  |
| `instance` | string | үгүй | — |  |
| `code` | string | үгүй | — | Машин уншигдах код. Домэйн татгалзалд `RejectionReason`-ы утга. |
| `actionId` | string(uuid) | үгүй | — | 422 үед — татгалзсан үйлдлийн id (AC BE-11) |
| `errors` | object[] | үгүй | — | 400 үед — талбарын түвшний алдаа (AC BE-5) |

### RejectionReason

Домэйн үйлдэл татгалзах шалтгаан (spec.md → D-4)

`INSUFFICIENT_STAMINA` · `PREREQ_NOT_MET` · `LEVEL_TOO_LOW` · `ALREADY_COMPLETED` · `NOT_REPEATABLE` · `INSUFFICIENT_SKILL_POINTS` · `INVALID_INPUT`

### HealthOk

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `status` | const "ok" | тийм | — |  |
| `version` | string | тийм | — | Серверийн хувилбар |
| `contentVersion` | string | тийм | — | Контент пакетын тогтвортой hash — `/content/pack`-ийн ETag-тай ижил утга. |

### HealthDegraded

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `status` | const "degraded" | тийм | — |  |
| `version` | string | тийм | — |  |
| `reason` | string | тийм | — | Хүний уншихад зориулсан шалтгаан. Контентын түүхий агуулга ОРОХГҮЙ. |

### PlayerCredentials

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `playerId` | string(uuid) | тийм | — |  |
| `token` | string | тийм | minLength=43 | 32 байт санамсаргүй, base64url. Сервер талд зөвхөн hash хадгална. |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SavePayload

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `schemaVersion` | integer | тийм | minimum=1 |  |
| `updatedAt` | string(date-time) | тийм | — |  |
| `state` | [`GameState`](#gamestate) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SaveAck

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `updatedAt` | string(date-time) | тийм | — |  |
| `etag` | string | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### RestoreRequest

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `snapshotId` | string(uuid) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SnapshotRef

Snapshot-ийн лавлагаа. Төлвийн агуулга ОРОХГҮЙ (AC BE-13).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `snapshotId` | string(uuid) | тийм | — |  |
| `createdAt` | string(date-time) | тийм | — |  |
| `schemaVersion` | integer | тийм | minimum=1 |  |
| `reason` | enum(put \| actions \| restore) | тийм | — | Snapshot үүсгэсэн шалтгаан. |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SaveHistory

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `snapshots` | [`SnapshotRef`](#snapshotref)[] | тийм | maxItems=10 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionType

Домэйн үйлдлийн төрөл. `shared/core`-ийн нэг функцтэй нэг-нэгээр харгалзана (lld.md §5.4). Энэ жагсаалт нь `GameState`-ийн БҮХ бичигдэх талбарыг хамарна — хамаарахгүй талбар үлдвэл тэр талбар серверээр эрх бүхий болж чадахгүй.

`claimQuest` · `rest` · `unlockSkill` · `dungeonAttempt` · `projectCreate` · `projectMilestone` · `projectUpdate` · `bossAttempt` · `rollDailyMission` · `resolveEncounter` · `updateSettings`

### Action

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `actionId` | string(uuid) | тийм | — | Клиент үүсгэсэн UUIDv4. Idempotency түлхүүр (AC BE-12). |
| `type` | [`ActionType`](#actiontype) | тийм | — |  |
| `at` | string(date-time) | тийм | — | Клиент дээрх үйлдлийн цаг. Домэйнд `clock`-ийн оронд дамжина (plan.md P-5). Сервер нь ирээдүйд 5 минутаас илүү хазайсан цагийг татгалзана (INVALID_INPUT). |
| `seed` | integer | үгүй | minimum=0 | RNG seed (loot, encounter). Байхгүй бол сервер үүсгэнэ (AC EC-2, ENC-2). |
| `payload` | object | тийм | — | Төрлөөс хамаарсан бие. Сервер нь `type`-аар нь салгаж `shared/validate`-ийн харгалзах validator-оор шалгана (lld.md §6.5 хүснэгт). |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionBatchRequest

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `actions` | [`Action`](#action)[] | тийм | minItems=1, maxItems=50 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### DomainEvent

Домэйн функцийн гаргасан event (spec.md D-2). UI нь эдгээрээр feedback үзүүлнэ.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `type` | enum(XP_GAINED \| LEVEL_UP \| SKILL_POINT_GAINED \| SKILL_UNLOCKED \| STAMINA_SPENT \| STAMINA_RESTORED \| QUEST_COMPLETED \| SIDE_QUEST_COMPLETED \| DUNGEON_PASSED \| DUNGEON_FAILED \| COINS_GAINED \| LOOT_DROPPED \| ACHIEVEMENT_UNLOCKED \| STREAK_EXTENDED \| STREAK_RESET \| COMBO_CHANGED \| PROJECT_CREATED \| PROJECT_MILESTONE_COMPLETED \| PROJECT_COMPLETED \| BOSS_ATTEMPT_LOGGED \| BOSS_PASSED \| ENCOUNTER_TRIGGERED \| DAILY_MISSION_ROLLED \| SETTINGS_UPDATED) | тийм | — |  |
| `data` | object | үгүй | — | Event-ээс хамаарсан нэмэлт (ж. `{ amount: 40 }`, `{ level: 3 }`). |

### ActionResult

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `actionId` | string(uuid) | тийм | — |  |
| `status` | enum(applied \| replayed) | тийм | — | `replayed` = энэ `actionId` өмнө нь хэрэгжсэн; домэйн ДАХИН ажиллаагүй, анхны event-үүд буцсан (AC BE-12). |
| `events` | [`DomainEvent`](#domainevent)[] | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ActionBatchResponse

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `state` | [`GameState`](#gamestate) | тийм | — | Хэрэгжүүлсний ДАРААХ эрх бүхий төлөв. Клиент үүгээр локал төлвийг СОЛИНО. |
| `results` | [`ActionResult`](#actionresult)[] | тийм | — |  |
| `updatedAt` | string(date-time) | тийм | — |  |
| `etag` | string | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### TransferCodeString

Crockford base32, 4-4-4 бүлэг (ж. `K7QM-2X4T-9BRH`). Том/жижиг үсэг ба зураас үл хамаарна; `I·L·O·U` тэмдэгт байхгүй (уншилтын алдаанаас сэргийлнэ).

Төрөл: string · pattern=`^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}-?[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}-?[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}$`

### TransferCode

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `code` | [`TransferCodeString`](#transfercodestring) | тийм | — |  |
| `expiresAt` | string(date-time) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### RedeemRequest

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `code` | [`TransferCodeString`](#transfercodestring) | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### GameState

TECH_SPEC §Domain state-ийн бүрэн хэлбэр. Export/import файлын агуулга ч мөн энэ.

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `schemaVersion` | integer | тийм | minimum=1 |  |
| `xp` | integer | тийм | minimum=0 |  |
| `level` | integer | тийм | minimum=1, maximum=10 |  |
| `stamina` | integer | тийм | minimum=0 |  |
| `maxStamina` | const 10 | тийм | — |  |
| `coins` | integer | тийм | minimum=0 |  |
| `skillPoints` | integer | тийм | minimum=0 |  |
| `combo` | integer | тийм | minimum=0 | Дараалсан идэвхтэй өдрийн claim-ийн тоолуур (lld.md §5.4.11). Cosmetic — XP · stamina · unlock-д НӨЛӨӨЛӨХГҮЙ (AC EC-1-ийн зарчим). |
| `streak` | object | тийм | — |  |
| `completedMainQuestIds` | string[] | тийм | — |  |
| `sideQuestStats` | object | тийм | — |  |
| `completedDungeonIds` | string[] | тийм | — |  |
| `unlockedSkillIds` | string[] | тийм | — |  |
| `inventory` | string[] | тийм | — |  |
| `achievementIds` | string[] | тийм | — |  |
| `bossAttempts` | object[] | тийм | — | AC BS-4 — оролдлогын түүх (тэнцсэн эсэхээс үл хамааран бүгд) |
| `dailyMission` | object,null | тийм | — |  |
| `projects` | [`ProjectState`](#projectstate)[] | тийм | — |  |
| `settings` | object | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### BossScores

AC BS-1 — 6 ангилал, тус бүр 0..10

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `story` | integer | тийм | minimum=0, maximum=10 |  |
| `editing` | integer | тийм | minimum=0, maximum=10 |  |
| `camera` | integer | тийм | minimum=0, maximum=10 |  |
| `visualCraft` | integer | тийм | minimum=0, maximum=10 |  |
| `animation` | integer | тийм | minimum=0, maximum=10 |  |
| `audioPost` | integer | тийм | minimum=0, maximum=10 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ProjectState

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `createdAt` | string(date-time) | тийм | — |  |
| `completedAt` | string,null(date-time) | үгүй | — |  |
| `notes` | string | тийм | — |  |
| `nextAction` | string | тийм | — |  |
| `evidenceRef` | string,null | үгүй | — |  |
| `selfScore` | integer,null | үгүй | minimum=0, maximum=10 |  |
| `milestones` | object[] | тийм | minItems=10, maxItems=10 | AC PJ-1 — PRD §13-ийн 10 milestone, яг энэ дарааллаар |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### QuestDefinition

TECH_SPEC §Quest schema + PRD §9-ийн бүх заавал талбар (AC MQ-5)

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | pattern=`^[a-z0-9-]+$` |  |
| `track` | enum(main \| side \| dungeon \| boss \| raid) | тийм | — |  |
| `world` | integer | тийм | minimum=1, maximum=5 |  |
| `levelRequired` | integer | тийм | minimum=1, maximum=10 |  |
| `type` | enum(training \| mission \| boss \| raid \| final) | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `summary` | string | тийм | minLength=1 |  |
| `description` | string | тийм | minLength=1 |  |
| `estimatedMinutes` | integer | тийм | minimum=1 |  |
| `staminaCost` | integer | тийм | minimum=1, maximum=6 |  |
| `xp` | integer | тийм | minimum=1 |  |
| `tags` | enum(video-editing \| blender \| animation \| cinematography \| audio \| vfx \| storytelling)[] | тийм | minItems=1 |  |
| `prerequisites` | string[] | тийм | — |  |
| `tutorialRefs` | [`TutorialRef`](#tutorialref)[] | тийм | — |  |
| `deliverables` | string[] | тийм | minItems=1 |  |
| `victoryConditions` | string[] | тийм | minItems=1 |  |
| `stretchGoals` | string[] | тийм | minItems=1 |  |
| `reflectionPrompt` | string | тийм | minLength=1 |  |
| `repeatable` | boolean | тийм | — |  |
| `repeatXpMultiplier` | number | үгүй | maximum=1 | AC SQ-2 — давтан XP коэффициент (default 0.5) |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### TutorialRef

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `title` | string | тийм | minLength=1 |  |
| `url` | string(uri) | тийм | — |  |
| `minutes` | integer | тийм | minimum=1 |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### DungeonDefinition

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `conceptGoal` | string | тийм | minLength=1 |  |
| `estimatedMinutes` | integer | тийм | minimum=1 |  |
| `xp` | integer | тийм | minimum=1 |  |
| `tags` | string[] | тийм | minItems=1 |  |
| `tutorialRefs` | [`TutorialRef`](#tutorialref)[] | тийм | minItems=1, maxItems=3 |  |
| `questions` | object[] | тийм | minItems=1 | AC DG-1, DG-3 — тэнцэх босго нь зөв хариултын ≥70% |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### AchievementDefinition

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `description` | string | тийм | minLength=1 |  |
| `predicate` | object | тийм | — | Машинаар шалгагдах нөхцөл (AC ACH-1) |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### EncounterDefinition

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `body` | string | тийм | minLength=1 |  |
| `callToAction` | string | тийм | minLength=1 |  |
| `maxMinutes` | integer | үгүй | minimum=1, maximum=2 |  |
| `weight` | number | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### LootItem

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `rarity` | enum(common \| rare \| epic \| legendary) | тийм | — |  |
| `effect` | const "cosmetic" | тийм | — | AC EC-1 — MVP-д зөвхөн cosmetic |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### SkillDefinition

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `id` | string | тийм | — |  |
| `title` | string | тийм | minLength=1 |  |
| `description` | string | тийм | minLength=1 |  |
| `cost` | const 1 | тийм | — |  |
| `prerequisites` | string[] | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ContentPack

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `version` | string | тийм | — |  |
| `quests` | [`QuestDefinition`](#questdefinition)[] | тийм | — | AC MQ-1 (18 main), AC SQ-1 (≥20 side) |
| `dungeons` | [`DungeonDefinition`](#dungeondefinition)[] | тийм | — |  |
| `skills` | [`SkillDefinition`](#skilldefinition)[] | тийм | — |  |
| `achievements` | [`AchievementDefinition`](#achievementdefinition)[] | тийм | minItems=12 |  |
| `encounters` | [`EncounterDefinition`](#encounterdefinition)[] | тийм | minItems=5 |  |
| `loot` | [`LootItem`](#lootitem)[] | тийм | — |  |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._

### ProgressionConstants

AC PRG-1, PRG-2, BS-2 — тогтмолууд контрактын хэсэг. `shared/core/constants.ts` нь эдгээрийн ЦОРЫН ГАНЦ хувилбар; `web-app/src/**` ба `server/src/**` дотор дахин бичигдвэл `T-43`-ийн сканнердсан тест УНАНА (AC BE-10).

| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |
|---|---|---|---|---|
| `xpThresholds` | const [100,250,500,1000,1750,2750,4000,5500,7500] | тийм | minItems=9, maxItems=9 |  |
| `rankNames` | const ["Recruit","Apprentice","Cadet","Editor","Animator","Specialist","Director","Cinematic Artist","Senior Generalist","Cinematic Master"] | тийм | minItems=10, maxItems=10 |  |
| `bossTiers` | object | тийм | — |  |
| `maxStamina` | const 10 | тийм | — | AC STA-1 |
| `restAmount` | const 3 | тийм | — | AC STA-3 |
| `projectMilestoneXp` | const 25 | тийм | — | AC PJ-3 |
| `defaultRepeatXpMultiplier` | const 0.5 | тийм | — | AC SQ-2 |
| `dungeonPassRatio` | const 0.7 | тийм | — | AC DG-3 |
| `sideQuestXpFloorRatio` | const 0.1 | тийм | — | AC SQ-2 — давтан XP-ийн доод шал `ceil(baseXp * 0.1)` |
| `encounterChance` | const 0.25 | тийм | — | AC ENC-2 — claim тутамд тохиолдол гарах магадлал. ⚠ Эх шаардлагад БАЙХГҮЙ, загварын шатны сонголт (lld.md → A-LLD-2). Тохируулга нь зөвхөн энэ утга. |
| `lootChance` | const 0.35 | тийм | — | AC EC-2 — claim тутамд loot унах магадлал. ⚠ Эх шаардлагад БАЙХГҮЙ, загварын шатны сонголт (lld.md → A-LLD-2). |

_Нэмэлт талбар хориотой (`additionalProperties: false`)._
