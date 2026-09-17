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

## Үр дүн

Код өөрчлөгдөөгүй. Энэ баримт нь ticket-ийг PERSONAL-4 дугаараар цаашид
шийдвэрлэхэд (эсвэл өөр репо/ticket рүү шилжүүлэхэд) зориулсан нотолгоо.
Product/PM тал спек шинэчлэх эсвэл ticket-ийг зөв репод шилжүүлэх шийдвэр
гаргах шаардлагатай хэвээр байна.
