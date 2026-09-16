/**
 * Дэлхий тутмын палитр (T-27; AC VIS-1, VIS-2, VIS-3; lld.md §9.1).
 *
 * ⚠ Өнгөний ЦОРЫН ГАНЦ эх. `styles.css`-ийн `:root[data-world]` блокууд нь ЭНЭ
 * хүснэгтийн хуулбар — контрастын тест хүснэгтээс тооцдог тул хоёулаа зэрэг
 * шинэчлэгдэх ёстой (`P-26`-ийн сканнер `styles.css`-д хатуу hex үлдэхийг хориглоно).
 * ⚠ Токен бүр ТООЦООНООС гарсан: дэлхийн өнгөний өнцөг сонгож, HSL гэрэлтэлтийг
 * зорилтот харьцаанд (текст 4.8:1 · UI 3.3:1) хүртэл хоёртын хайлтаар шилжүүлсэн.
 * Дугуйрсны дараа хамгийн муу утга нь 4.78:1 ба 3.29:1 — хоёулаа WCAG-ийн 4.5/3.0-аас дээш.
 * ⚠ Дэлхий солигдоход ЗӨВХӨН `<html data-world>` (+ `data-cb`) солигдоно — DOM бүтэц,
 * `aria-*`, текст ХӨДӨЛӨХГҮЙ (`VIS-1`). `style.setProperty` ХЭРЭГЛЭХГҮЙ.
 */

export const TOKENS = [
  'bg', 'surface', 'surface-2', 'border', 'border-strong', 'text', 'muted',
  'text-on-focus', 'accent', 'ok', 'warn', 'focus', 'btn-bg', 'btn-bg-hover',
  'badge-ok-bg', 'badge-ok-text', 'badge-warn-bg', 'badge-warn-text', 'pip-off',
] as const;

export type ThemeToken = (typeof TOKENS)[number];
export type PaletteKey = 'camp' | 'w1' | 'w2' | 'w3' | 'w4' | 'w5';

export const PALETTE_KEYS: readonly PaletteKey[] = ['camp', 'w1', 'w2', 'w3', 'w4', 'w5'];

/** Утгын ДАРААЛАЛ нь `TOKENS`-ийнх; `#` хасагдсан, урт нь тогтмол 6 (lld.md §9.1.4). */
export const PALETTES: Record<PaletteKey, readonly string[]> = {
  camp: ['0c0f16', '161b25', '1f2530', '5c6d8a', '7486a6', 'e9ecf1', 'a5afc0', '000000',
    '5c9aeb', '5ae293', 'f7bc45', 'ffdd33', '1b2a43', '24395e', '0c2717', '98ebbb',
    '291f0d', 'f9d894', '69758b'],
  w1: ['0c1116', '161f25', '1f2930', '587284', '6d8ca2', 'e9eef1', 'a5b5c0', '000000',
    '5cc7eb', '5ae293', 'f7bc45', 'ffdd33', '1b3243', '24465e', '0c2717', '98ebbb',
    '291f0d', 'f9d894', '667987'],
  w2: ['100c16', '1d1625', '271f30', '786192', '917bab', 'ede9f1', 'b2a5c0', '000000',
    'b15feb', '5ae293', 'f7bc45', 'ffdd33', '2e1b43', '3f245e', '0c2717', '98ebbb',
    '291f0d', 'f9d894', '7c6c8f'],
  w3: ['0c1612', '16251f', '1f302a', '517a6b', '639b87', 'e9f1ee', 'a5c0b6', '000000',
    '5cebc7', '5ae293', 'f7bc45', 'ffdd33', '1b4334', '245e49', '0c2717', '98ebbb',
    '291f0d', 'f9d894', '618075'],
  w4: ['160f0c', '251b16', '30251f', '846858', 'a2816e', 'f1ece9', 'c0afa5', '000000',
    'eb9e5c', '5ae293', 'f7bc45', 'ffdd33', '432a1b', '5e3924', '0c2717', '98ebbb',
    '291f0d', 'f9d894', '877266'],
  w5: ['160c11', '25161d', '301f28', '8d5e75', 'a8768f', 'f1e9ed', 'c0a5b3', '000000',
    'eb5caf', '5ae293', 'f7bc45', 'ffdd33', '431b2f', '5e2441', '0c2717', '98ebbb',
    '291f0d', 'f9d894', '8d6a7b'],
};

/**
 * `colorBlindSafe` нь ЗӨВХӨН семантик хосыг (улаан↔ногоон) сольдог — дэлхийн
 * гадаргуу нь утга илэрхийлдэггүй тул хөндөгдөхгүй (lld.md §9.1.3). Эдгээр 8 утга
 * нь 6 дэлхийд ижил гардаг тул `12 × 19 = 228` биш `6 × 19 + 8 = 122` утга хадгална.
 */
export const CB_OVERRIDE: Partial<Record<ThemeToken, string>> = {
  accent: 'eb5ceb',
  ok: '5ab0e2',
  warn: 'f7c845',
  focus: 'ffe433',
  'badge-ok-bg': '0c1d27',
  'badge-ok-text': '98cdeb',
  'badge-warn-bg': '29210d',
  'badge-warn-text': 'f9de94',
};

/** Нэрлэсэн палитрыг токен → hex зураглал болгоно. */
export function paletteOf(key: PaletteKey, colorBlindSafe: boolean): Record<ThemeToken, string> {
  const row = PALETTES[key];
  const out = {} as Record<ThemeToken, string>;
  TOKENS.forEach((token, index) => {
    out[token] = row[index]!;
  });
  if (colorBlindSafe) Object.assign(out, CB_OVERRIDE);
  return out;
}

/** WCAG 2.x-ийн харьцангуй гэрэлтэлт — 8-бит суваг тутам. */
function luminance(hex: string): number {
  const channels = [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** `(L₁ + 0.05) / (L₂ + 0.05)` — аргумент нь `#`-гүй 6 оронтой hex. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Дэлхийн дугаарыг палитрын түлхүүр болгоно (`camp` нь дэд дэлгэцүүдэд). */
export function worldPalette(world: 1 | 2 | 3 | 4 | 5 | 'camp'): PaletteKey {
  return world === 'camp' ? 'camp' : (`w${world}` as PaletteKey);
}

/**
 * ⚠ Атрибут СОЛИХ цорын ганц зам. `document.documentElement` нь дэлгэцийн DOM-оос
 * ГАДНА тул snapshot тестүүд дэлхий солигдоход ялгарахгүй (`VIS-1`).
 */
export function applyTheme(world: 1 | 2 | 3 | 4 | 5 | 'camp' | PaletteKey, colorBlindSafe: boolean): void {
  const key = typeof world === 'string' && world !== 'camp' ? (world as PaletteKey) : worldPalette(world as 1 | 'camp');
  const html = document.documentElement;
  html.dataset.world = key;
  if (colorBlindSafe) html.dataset.cb = '1';
  else delete html.dataset.cb;
}
