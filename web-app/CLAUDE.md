<!-- PERSONAL-1 · doc · Код + тест · 2026-09-15 -->

# `web-app/` — frontend

Нэг команд: `npm test` (= `typecheck && lint && vitest run`).

## Давхаргын гэрээ

```
ui/ → services/ → @shared/core → @shared/{types,validate}
```

- `src/ui/**` нь `@shared/core/**`-ыг ШУУД импортлохгүй (AC UI-3) — `architecture.test.ts` унана.
- `src/ui/**` дотор `fetch` хориотой; сүлжээ нь `services/apiClient.ts`-д.
- XP босго, stamina тоо, boss tier зэрэг тогтмолыг ЭНД дахин бичихгүй —
  `@shared/core/constants.ts`-ээс импортлоно (AC BE-10).

## UI шийдвэр (lld.md §7.1)

Framework ашиглахгүй — `render(state) → HTMLElement` функцүүд. Шалтгаан: 9 дэлгэц,
runtime хамаарал тэг, a11y-г бүрэн хянана.

## PERSONAL-2-ийн шинэ хил

- **`fx.ts` нь juice-ийн ГАНЦ хаалга.** Анимацийн `fx-` класс нэмэх, дууны дохио
  тоглуулах бүх зам энэ файлаар дамжина; `sound.ts`-ийн `CUE_EVENTS` нь
  `FX_REGISTRY`-ээс ГАРГАГДАНА. Хоёр дахь зам үүсвэл `reducedMotion` ба
  `soundVolume = 0`-ийн хамгаалалт чимээгүй тойрогдоно — `tests/ui/fx.test.ts` УНАНА.
- **Click сонсогч зөвхөн `components.ts`-д.** Дэлгэцүүд `button()`/`el('a')`-г
  ашиглана; `addEventListener('click'` нь `ui/**`-ийн бусад файлд гарвал
  `tests/a11y/a11y-v2.test.ts` УНАНА (`div` + onclick-ийн зам нээгдэхээс сэргийлнэ).
- **Өнгө нь хэзээ ч цорын ганц суваг биш.** Шинэ төлөв бүр (trophy lock, rarity,
  mastery Lv, boss difficulty, guild rank, node-ийн валют) ТЕКСТТЭЙ.
- **Домэйны дүрэм UI-д давтагдахгүй.** Capstone-ийн дутуу нөхцөл, respec-ийн
  cooldown, hard mode-ийн босго, cosmetic-ийн нээлт — бүгд `gameService`-ээр
  `shared/core`-оос ирнэ (`QX-7`).

## Өнгө — `theme.ts` ба `styles.css` нь ХОЛБОГДСОН

`ui/theme.ts` нь өнгөний цорын ганц эх, `src/styles.css` нь түүний хуулбар. Контрастын
нотолгоо хүснэгтээс тооцогддог, тоглогчийн харах өнгө CSS-ээс гардаг тул хоёр нь
САЛВАЛ хаалга хашгирахгүй байв. `tests/a11y/contrast.test.ts` нь одоо
6 палитр × 19 токен + 8 colour-blind override = **122 утгыг** үг үсгээрээ тулгана.
Токен нэмэх/өнгө засах бол ХОЁУЛАНГ нь нэг өөрчлөлтөд.

`gameService` нь `state.mastery[tag] ?? { … }` гэж анхдагчаа гараар бичихгүй —
`trackOf(state, tag)` (lld.md §4.2 A-LLD2-1). `architecture.test.ts`-ийн сканнер
`shared/core`-оос гадна **`web-app/src`**-ийг ч гүйнэ.

Trophy Room-ийн нээлтийн текст нь явцтай зорилтод ОДООГИЙН байрлалыг мөн бичнэ
(`(currently N)` — lld.md §9.4.2): «rank 3 хүр» гэдэг нь 0-оос эсвэл 2-оос
хамаарч огт өөр зай.

`gameService.view.*`-ийн нэрс загварын `§9.5`-ийнхээс гурав ялгаатай
(`trophies` ↔ `cosmetics` · `respecStatus` ↔ `respecAvailableIn` ·
`bossThresholds`+`bossPersonalBest` ↔ `bossBoard`) — чадвар нь бүтэн, зөвхөн нэр.
Шинэ view нэмэхэд загварын нэрийг эхлээд шалга.

## A11y (заавал)

Интерактив элемент бүр `<button>`/`<a>`/`<input>` — `div` + `onclick` ХОРИГТОЙ.
Төлөв зөвхөн өнгөөр дамжихгүй: текст эсвэл дүрс хамт.
