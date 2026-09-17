<!-- PERSONAL-4 · research · Репо бэлдэх · 2026-09-17 -->

# PERSONAL-4: login/register алдааны шалгалт

## Ticket

> when I ran it, it asked a user login/register (great) but when I register
> it says [object][object] when I type a weak password, and when I do
> register and automaticly enters it is an blank space, so requirements are:
> fix the backend, fix the frontend, and improve the entire game, use
> Find -> Check -> Rewrite.

## Шалгасан зүйлс

- `README.md`: "Бүртгэл, нууц үг, PII ХЭВЭЭР шаардагдахгүй" — тодорхой заасан.
- `docs/AAA-SPEC.md:390`: "accounts/passwords" **out-of-scope** (non-goal).
- `server/src/auth/tokens.ts`: цорын ганц auth файл — нэргүй (anonymous)
  session token + transfer code систем. Нууц үг ерөнхийдөө байхгүй загвар.
- `server/src/auth/` дотор зөвхөн `tokens.ts` — register endpoint,
  password validation ямар ч хэлбэрээр байхгүй.
- `web-app/src` даяар `login|register|password` grep — 0 тохирол
  (зөвхөн тест/спек файлд unrelated context, бодит UI дэлгэц алга).
- Repo бүтэц: `server`, `web-app`, `shared` гурав л бий — native-app,
  өөр auth систем агуулах гадаргуу байхгүй.

## Дүгнэлт

Ticket-ийн тайлбарласан алдаа (`[object][object]` weak-password алдаа,
auto-login-ийн хоосон зай) нь энэ репод БАЙХГҮЙ фичерийн код дээр тохиолдож
буй алдааг заасан. Спек (`AAA-SPEC.md:390`) уг фичерийг ЯГ эсрэгээр
non-goal гэж албан ёсоор хассан.

Хүнээс "ok" гэсэн богино хариулт ирсэн ч аль сонголтыг (шинэ auth систем
бүхэлд нь зохиох уу, эсвэл ticket буруу репод холбогдсон уу) баталгаажуулж
өгөөгүй тул спекийг зөрчиж шинэ feature зохиогоогүй болно. Ponytail/YAGNI
болон "платформын дүрэм ЗОХИОХГҮЙ" зарчмын дагуу: спекд байхгүй, тодорхой
non-goal гэж заасан том subsystem-ийг таамгаар нэмэхгүй.

## Хүний хариулт (2-р удаа) ба дахин шалгалт

Хүн: "when I opened the frontend it asked me to login with a login page
and had a register page aswell".

Үүнийг баталгаажуулахаар дахин шалгав:
- `git log --oneline --all --grep="login|register|auth" -i` — бүх branch
  (`main`, `issue/personal-1`, `issue/personal-2`, `issue/personal-4`) дээрх
  бүх commit-оор хайхад login/register feature нэмсэн ЭСВЭЛ хассан commit
  ГАРААГҮЙ (зөвхөн энэ ticket-ийн өөрийн docs commit олдсон).
- `web-app/src` бүтэц бүхэлдээ (`find src -type f`): 17 файл, бүгд
  `camp/quests/dungeons/skills/forge/achievements/trophies/settings` дэлгэц
  — login/register нэртэй screen, route, эсвэл auth service алга.
- `docker-compose.dev.yml`: зөвхөн `server` (8787) ба `web-app` (80→18085)
  container — өөр app/service (жишээ нь тусдаа auth frontend) байхгүй.
- Тиймээс энэ репо (`editors-ascension`, бүх branch, бүх commit) ЯГ ХЭЗЭЭ Ч
  login/register дэлгэц агуулж байгаагүй нь баталгаажлаа.

## Дүгнэлт

Хүний хоёр дахь хариулт нь эхний асуултын хоёр сонголтын аль нэгийг
(шинэ auth систем зохиох уу / ticket буруу репод холбогдсон уу) сонгосонгүй
— харин код бодит байдалтай ШУУД зөрчилдсөн шинэ мэдэгдэл нэмж өгсөн. Код,
git түүх, docker-compose — бүгд нэг репод (`editors-ascension`) login/register
байгаагүйг баталж байгаа тул хүний харсан дэлгэц:
(а) өөр URL/порт/төсөл (жишээ нь өөр demo/staging), эсвэл
(б) хөтчийн кэш/service worker-ийн хуучин static file, эсвэл
(в) огт өөр repo/branch байх магадлалтай.

Энэ нь спек-код-ийн зөрчил БИШ, харин "юуг тестэлсэн бэ" гэдгийн тодруулга
шаардсан асуулт тул код таамгаар нэмэгдээгүй хэвээр.

## Үр дүн

Код өөрчлөгдөөгүй. PM/хүн дараах тодорхой мэдээллийг өгвол үргэлжлүүлж
болно:
1. Хэдийд, ямар URL (host:port)-оор нээж туршсан бэ (`localhost:18085`
   мөн эсэх)?
2. Screenshot эсвэл browser console/Network tab-ийн зураг байгаа юу?
3. Энэ нь яг `0Orchlon/editors-ascension` repo-гийн `main`/энэ branch-ийн
   build мөн үү, эсвэл өөр repo/project байж болох уу?
