<!-- PERSONAL-1 · тест тайлан · UAT тест · 2026-09-15 -->

# UAT тестийн тайлан — Editor's Ascension

**Орчин:** энэ машин дээрх `docker-compose.uat.yml` (project `editors-ascension-uat`)
**Хаягууд:** сервер `http://localhost:19787/api`, nginx proxy + web-app `http://localhost:19085`
**Тестийн хувилбар:** commit `c5df7de`, сервер `version 1.1.0`, `contentVersion cd269b74`
**Хамрах хүрээ:** зөвхөн шалгалт — код засаагүй, байршуулалт өөрчлөгдөөгүй
(серверийг зөвхөн тэсвэрлэлтийн хэмжилтэд restart/stop-start хийж буцаан асаасан).

## Нэгдсэн дүн

| Багц | Үр дүн |
|---|---|
| API гэрээ (10 endpoint, host болон proxy-гоор) | ✅ 27/27 |
| Хөтчийн бодит урсгал (jsdom, UAT-аас түгээсэн bundle) | ✅ 8 дэлгэц ачаалав, claim урсгал ажиллав |
| Офлайн тэсвэр + эвлэрүүлэг (AC BE-7) | ✅ |
| Өгөгдлийн тогтвор (container restart) | ✅ |
| Rate limit (AC BE-17) | ✅ 30 амжилт, дараа нь 429 + `Retry-After` |
| Хүртээмж (axe-core) | ⚠ critical/serious 0, moderate 2 төрөл |
| Серверийн лог | ✅ алдаа 0, token/PII алдагдал 0 |

**Блоклогч алдаа алга.**

## 1. API гэрээний шалгалт (proxy `:19085` дээр, дараа нь host `:19787` дээр давхар)

- `GET /api/health` → 200 `{"status":"ok","version":"1.1.0","contentVersion":"cd269b74"}` — **host болон proxy хоёулаа**
  (өмнөх хянагчийн заасан 127.0.0.1 bind асуудал бодитоор хаагдсаныг батлав).
- `GET /api/content/pack` → 200, 103 936 байт, `ETag "cd269b74"`; `If-None-Match` → **304** (AC BE-6).
- `POST /api/players` → 201, `{playerId, token}`.
- Итгэлцлийн хил (AC BE-4): token байхгүй → **401**, буруу token → **401**, өөр тоглогчийн id → **403**.
- `GET /api/players/{id}/save` шинэ тоглогчид → **404** — AC BE-3-ын дагуу зөв (save нь эхний бичилтээр үүснэ).
- `POST /api/players/{id}/actions` (`rest`) → 200 `status: applied`; ижил `actionId` дахин → 200 `status: replayed` (AC BE-12 idempotency).
- Хуучирсан `If-Match` → **409** (actions болон `PUT save` хоёуланд), зөв ETag-тай `PUT save` → 200 (AC BE-3).
- Схемийн алдаа: `{"actions":[]}` → **400**, `application/problem+json`, `errors: [{field:"/actions", message:"min 1 item(s)"}]` (AC BE-5).
- Домэйн татгалзал: байхгүй `skillId`-тай `unlockSkill` → **422** `INVALID_INPUT` + `actionId` (төлөв ӨӨРЧЛӨГДӨӨГҮЙ).
- Бие 1 MB-ээс том → **413** (AC BE-5).
- Snapshot: `GET .../save/history` → 200 (`reason: put`), `POST .../save/restore` → 200 (AC BE-13).
- Шилжүүлэг (AC BE-14): `POST .../transfer-code` → 201 (`TPFT-ESCN-GG7K`, TTL 15 мин),
  `POST /api/transfer/redeem` → 201 шинэ тоглогч + save хуулбар; ижил кодыг дахин → **410**.
- Тодорхойгүй зам → 404.

## 2. Бодит тоглогчийн урсгал (UAT-аас түгээсэн bundle-ийг jsdom дээр гүйцэтгэв)

- `/` → 200, `index.html` + hashed asset-ууд ачаалагдана; 8 дэлгэцийн навигаци бүрэн
  (Camp · Main Quests · Side Quests · Study Dungeons · Skill Tree · Project Forge · Achievements · Settings) — бүгд агуулгатай render хийв.
- Апп өөрөө proxy-гоор серверт тоглогч үүсгэж (`ea.creds.v1`), save-аа sync хийж `ea.save.etag` хадгалав.
- Side quest claim: модал → нөхцөлүүдийг тэмдэглэх → `Claim victory` →
  `aria-live`: «Camera Copycat claimed. You gained 30 XP.»;
  Camp дээр XP 30, Coins 9, Stamina 8/10, Streak 1 болов;
  **серверийн эрх бүхий төлөв клиенттэй яг таарав** (xp 30, coins 9, `sideQuestStats.completions = 1`), дараалал хоосон.

## 3. Офлайн тэсвэр ба эвлэрүүлэг (AC BE-7)

1. `docker stop` сервер → proxy `/api/health` **502**.
2. Апп асав, Camp render хийв, side quest claim ажиллав (локал XP 30), `ea.queue.v1` → 1 үйлдэл, credential байхгүй.
3. `docker start` сервер → апп тоглогч үүсгэж дараалал **0** болтол drain хийв; серверийн xp 30 = локал xp 30.

## 4. Тогтвор ба ops

- Сервер container restart → `healthy`, өмнөх save (`updatedAt` хүртэл) хэвээр — `ea-server-data-uat` volume ажиллаж байна.
- Rate limit: `POST /api/players`-ийг 40 удаа дуудахад 30 нь 201, 10 нь **429** `RATE_LIMITED` + `retry-after: 55` (AC BE-17).
- Лог: JSON бүтэцтэй, route template-ээр (`/api/players/:playerId/save`), `requestId`-тай; `error`/stack 0 бичлэг; `Bearer`/түүхий token 0 бичлэг.

## 5. Илэрсэн зүйлс (блоклогч БИШ)

| # | Зэрэг | Зүйл |
|---|---|---|
| F-1 | Бага | axe-core: `#/dungeons`, `#/skills`, `#/achievements` дээр `heading-order` (moderate) — карт доторх `h3` өмнөх `h2`-гүй. |
| F-2 | Мэдээлэл | axe-core: onboarding toast-ийн текст landmark-аас гадна (`region`, moderate) — түр харагдах элемент, хаагдсаны дараа алга болно. critical/serious зөрчил АЛГА. |
| F-3 | Бага | nginx `try_files $uri /index.html` — байхгүй `/assets/*.js` нь 404-ийн оронд 200 + HTML буцаана. Апп hash router тул бодит урсгалд нөлөөгүй; зөвхөн кэш зөрсөн үед оношилгоог бүрхэгдүүлнэ. |
| F-4 | Бага | Side quest модалд нөхцөлүүд тэмдэглэгдээгүй байхад `Claim victory` товч идэвхтэй харагдана; дарахад юу ч болохгүй, шалтгааны мессеж гарахгүй. |

## Дахин гүйцэтгэх

```bash
docker compose -f docker-compose.uat.yml up -d --build   # web-app/dist урьдчилан build хийсэн байх
curl -s http://localhost:19085/api/health                 # proxy
curl -s http://localhost:19787/api/health                 # host
```
