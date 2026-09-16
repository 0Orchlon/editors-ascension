/**
 * PERSONAL-2 · Гэрээ нийтлэх · `contracts.yaml`-ийн ГАНЦ уншигч (loader · validator · sampler).
 *
 * Гурван хэрэглэгч ЭНЭ файлыг хуваалцана — `contract-lint.ts` · `contract-mock.ts` ·
 * `contract-docs.ts`. Гурвуулаа өөр өөр уншигчтай байвал «гэрээг яаж уншдаг вэ» гэдэг
 * гурван хувилбартай болж, дуурайлт нэг, баримт өөр зүйл харуулах эрсдэл гарна.
 *
 * ⚠ Энэ файл нь ТОГЛООМЫН ДҮРЭМ БИШ — `shared/core/**`-ыг огт хөнддөггүй. Зөвхөн
 *   OpenAPI баримтыг уншиж, шалгаж, дуурайлт ба баримт үүсгэнэ (AC BE-10-ийн хилийг
 *   зөрчихгүй: `server/src/**`-д ямар ч өөрчлөлт ОРООГҮЙ).
 *
 * Дэмжигдэх JSON Schema дэд олонлог нь `contracts.yaml`-д БОДИТООР хэрэглэгддэг зүйл:
 *   $ref · type (мөн `[T, "null"]`) · const · enum · default · format · required ·
 *   properties · additionalProperties (bool | schema) · propertyNames ·
 *   minProperties · maxProperties · items · minItems · maxItems · uniqueItems ·
 *   minimum · maximum · minLength · maxLength
 * `oneOf` · `anyOf` · `allOf` нь гэрээнд БАЙХГҮЙ (`Action.payload` нь зориуд нээлттэй
 * объект — contracts.yaml §Action). Хэрэв хожим нэмэгдвэл `validate` нь ил алдаа өгнө —
 * чимээгүй өнгөрөхгүй.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export type Schema = Record<string, any>;

export interface Spec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string }[];
  security?: Record<string, string[]>[];
  tags?: { name: string; description?: string }[];
  paths: Record<string, Record<string, any>>;
  components: {
    securitySchemes?: Record<string, Schema>;
    parameters?: Record<string, Schema>;
    headers?: Record<string, Schema>;
    responses?: Record<string, Schema>;
    schemas: Record<string, Schema>;
  };
}

export const HTTP_METHODS = ['get', 'put', 'post', 'patch', 'delete'] as const;

export function loadContract(file: string): Spec {
  const spec = parse(readFileSync(file, 'utf8')) as Spec;
  if (!spec?.paths || !spec?.components?.schemas) throw new Error(`${file}: paths · components.schemas алга`);
  return spec;
}

const unescapeRefToken = (k: string): string => k.replace(/~1/g, '/').replace(/~0/g, '~');

/** `$ref`-ийг задална. Мөчлөг ба тасарсан заалтыг ил алдаа болгоно. */
export function deref(spec: Spec, node: any): Schema {
  const seen: string[] = [];
  let cur = node;
  while (cur && typeof cur === 'object' && typeof cur.$ref === 'string') {
    const ref: string = cur.$ref;
    if (!ref.startsWith('#/')) throw new Error(`гадаад $ref дэмжигдэхгүй: ${ref}`);
    if (seen.includes(ref)) throw new Error(`$ref мөчлөг: ${[...seen, ref].join(' → ')}`);
    seen.push(ref);
    cur = ref
      .slice(2)
      .split('/')
      .reduce<any>((o, k) => (o == null ? o : o[unescapeRefToken(k)]), spec as any);
    if (cur === undefined) throw new Error(`тасарсан $ref: ${ref}`);
  }
  return (cur ?? {}) as Schema;
}

/** `#/components/schemas/GameState` → `GameState`; $ref биш бол `null`. */
export const refName = (node: any): string | null =>
  node && typeof node.$ref === 'string' ? (node.$ref.split('/').pop() ?? null) : null;

/** Гэрээн доторх БҮХ `$ref` мөрийг (гүн) цуглуулна. */
export function collectRefs(node: any, out: string[] = []): string[] {
  if (Array.isArray(node)) for (const v of node) collectRefs(v, out);
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref' && typeof v === 'string') out.push(v);
      else collectRefs(v, out);
    }
  return out;
}

export interface Operation {
  method: string;
  path: string;
  operationId: string;
  op: Schema;
  /** Замын түвшний + үйлдлийн түвшний параметр, задлагдсан. */
  parameters: Schema[];
  /** `security: []` бол нээлттэй; эс бөгөөс баримтын үндсэн хамгаалалт. */
  open: boolean;
}

export function operations(spec: Spec): Operation[] {
  const out: Operation[] = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    const shared = (item.parameters ?? []) as Schema[];
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      out.push({
        method,
        path,
        operationId: typeof op.operationId === 'string' ? op.operationId : `${method.toUpperCase()} ${path}`,
        op,
        parameters: [...shared, ...((op.parameters ?? []) as Schema[])].map((p) => deref(spec, p)),
        open: Array.isArray(op.security) && op.security.length === 0,
      });
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────── validate

const typeOf = (v: unknown): string =>
  v === null
    ? 'null'
    : Array.isArray(v)
      ? 'array'
      : typeof v === 'number'
        ? Number.isInteger(v)
          ? 'integer'
          : 'number'
        : typeof v;

const FORMATS: Record<string, RegExp> = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
};

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Утгыг гэрээний схемээр шалгана. Буцаалт нь `"$.state.mastery: ..."` хэлбэрийн мөрүүд;
 * хоосон массив = зөв. Хаялт үүсгэхгүй — дуурайлт нь алдааг 400 Problem болгож буцаана.
 */
export function validate(spec: Spec, schemaOrRef: Schema, value: unknown, at = '$'): string[] {
  const s = deref(spec, schemaOrRef);
  const errs: string[] = [];
  const bad = (m: string) => errs.push(`${at}: ${m}`);

  if (s.const !== undefined && !eq(value, s.const)) return [`${at}: ${JSON.stringify(s.const)} байх ёстой`];
  if (Array.isArray(s.enum) && !s.enum.some((e: unknown) => eq(e, value)))
    return [`${at}: ${JSON.stringify(value)} нь enum-д алга (${s.enum.join(' · ')})`];

  const declared: string[] | undefined = s.type === undefined ? undefined : Array.isArray(s.type) ? s.type : [s.type];
  const actual = typeOf(value);
  if (declared && !declared.includes(actual) && !(declared.includes('number') && actual === 'integer'))
    return [`${at}: төрөл ${declared.join(' | ')} байх ёстой, ${actual} ирэв`];

  if (actual === 'string') {
    const v = value as string;
    if (typeof s.minLength === 'number' && v.length < s.minLength) bad(`минимум ${s.minLength} тэмдэгт`);
    if (typeof s.maxLength === 'number' && v.length > s.maxLength) bad(`максимум ${s.maxLength} тэмдэгт`);
    const re = typeof s.format === 'string' ? FORMATS[s.format] : undefined;
    if (re && !re.test(v)) bad(`${s.format} хэлбэр биш: ${JSON.stringify(v)}`);
  }

  if (actual === 'integer' || actual === 'number') {
    const v = value as number;
    if (typeof s.minimum === 'number' && v < s.minimum) bad(`>= ${s.minimum} байх ёстой`);
    if (typeof s.maximum === 'number' && v > s.maximum) bad(`<= ${s.maximum} байх ёстой`);
  }

  if (actual === 'array') {
    const v = value as unknown[];
    if (typeof s.minItems === 'number' && v.length < s.minItems) bad(`минимум ${s.minItems} элемент, ${v.length} ирэв`);
    if (typeof s.maxItems === 'number' && v.length > s.maxItems) bad(`максимум ${s.maxItems} элемент, ${v.length} ирэв`);
    if (s.uniqueItems === true) {
      const seen = new Set(v.map((x) => JSON.stringify(x)));
      if (seen.size !== v.length) bad('элементүүд давхардсан (uniqueItems)');
    }
    if (s.items) v.forEach((item, i) => errs.push(...validate(spec, s.items, item, `${at}[${i}]`)));
  }

  if (actual === 'object') {
    const v = value as Record<string, unknown>;
    const keys = Object.keys(v);
    for (const req of (s.required ?? []) as string[]) if (!(req in v)) bad(`\`${req}\` талбар дутуу`);
    if (typeof s.minProperties === 'number' && keys.length < s.minProperties)
      bad(`минимум ${s.minProperties} түлхүүр, ${keys.length} ирэв`);
    if (typeof s.maxProperties === 'number' && keys.length > s.maxProperties)
      bad(`максимум ${s.maxProperties} түлхүүр, ${keys.length} ирэв`);
    for (const k of keys) {
      if (s.propertyNames) errs.push(...validate(spec, s.propertyNames, k, `${at}.${k} (түлхүүр)`));
      const child = s.properties?.[k];
      if (child) errs.push(...validate(spec, child, v[k], `${at}.${k}`));
      else if (s.additionalProperties === false) bad(`\`${k}\` нь гэрээнд алга (additionalProperties: false)`);
      else if (s.additionalProperties && typeof s.additionalProperties === 'object')
        errs.push(...validate(spec, s.additionalProperties, v[k], `${at}.${k}`));
    }
  }

  return errs;
}

// ──────────────────────────────────────────────────────────────────── sample

const SAMPLE_UUID = '6f2a1c94-3d8e-4b7a-9f10-2c5de7b8a041';
const SAMPLE_DATE = '2026-09-16';
const SAMPLE_DATE_TIME = '2026-09-16T09:00:00Z';

/**
 * Схемээс ГЭРЭЭНД НИЙЦЭХ жишээ утга үүсгэнэ — дуурайлтын хариу ба баримтын жишээ.
 *
 * Дараалал: `example` → `default` → `const` → `enum[0]` → төрлөөс. Өөрөөр хэлбэл
 * гэрээнд жишээ бичигдсэн бол ТЭР нь эрх бүхий; үүсгэгч нь зөвхөн дутууг нөхнө.
 * Үүсгэсэн утга бүрийг `contract-lint.ts` нь `validate`-ээр буцааж шалгадаг —
 * үүсгэгч ба шалгагч хоёр салвал нийтлэлийн хаалга УНАНА.
 */
export function sample(spec: Spec, schemaOrRef: Schema, depth = 0): unknown {
  if (depth > 12) return null;
  const s = deref(spec, schemaOrRef);
  if (s.example !== undefined) return s.example;
  if (s.default !== undefined) return s.default;
  if (s.const !== undefined) return s.const;
  if (Array.isArray(s.enum) && s.enum.length > 0) return s.enum[0];

  const declared: string[] = s.type === undefined ? [] : Array.isArray(s.type) ? s.type : [s.type];
  const type = declared.find((t) => t !== 'null') ?? (s.properties || s.additionalProperties ? 'object' : 'null');

  switch (type) {
    case 'string': {
      const base =
        s.format === 'uuid'
          ? SAMPLE_UUID
          : s.format === 'date-time'
            ? SAMPLE_DATE_TIME
            : s.format === 'date'
              ? SAMPLE_DATE
              : 'sample';
      return typeof s.minLength === 'number' && base.length < s.minLength ? base.padEnd(s.minLength, 'x') : base;
    }
    case 'integer':
    case 'number':
      return typeof s.minimum === 'number' ? s.minimum : 0;
    case 'boolean':
      return false;
    case 'array': {
      const n = typeof s.minItems === 'number' ? s.minItems : 0;
      const item = deref(spec, s.items ?? {});
      // enum/const элементийг ялгаж болохгүй — ялгавал enum-аас гарна. Тэр тохиолдолд
      // uniqueItems нь схемээс өөрөө хангагдах ёстой (minItems <= enum.length).
      const unique = s.uniqueItems === true && item.const === undefined && !Array.isArray(item.enum);
      return Array.from({ length: n }, (_, i) =>
        Array.isArray(item.enum) ? item.enum[i % item.enum.length] : withUniqueId(sample(spec, s.items ?? {}, depth + 1), i, unique),
      );
    }
    case 'object': {
      const out: Record<string, unknown> = {};
      // Тогтмол талбарууд: заавал байх ёстой нь + жишээ/анхдагчтай нь.
      for (const [k, child] of Object.entries((s.properties ?? {}) as Record<string, Schema>)) {
        const needed =
          (s.required ?? []).includes(k) || deref(spec, child).example !== undefined || deref(spec, child).default !== undefined;
        if (needed) out[k] = sample(spec, child, depth + 1);
      }
      // Түлхүүр нь enum-аар хязгаарлагдсан газрын зураг (ж: `mastery`) — түлхүүр бүрийг үүсгэнэ.
      const names = s.propertyNames ? deref(spec, s.propertyNames) : null;
      if (names && Array.isArray(names.enum) && s.additionalProperties && typeof s.additionalProperties === 'object')
        for (const k of names.enum as string[]) out[k] ??= sample(spec, s.additionalProperties, depth + 1);
      // Түлхүүрийн доод тоо (`minProperties`) — нэрлэгдээгүй газрын зураг.
      if (typeof s.minProperties === 'number' && s.additionalProperties && typeof s.additionalProperties === 'object')
        for (let i = Object.keys(out).length; i < s.minProperties; i++)
          out[`key-${i}`] = sample(spec, s.additionalProperties, depth + 1);
      return out;
    }
    default:
      return null;
  }
}

/** Массивын элемент давхардвал `uniqueItems` унана — id-тай бол ялгана. */
function withUniqueId(value: unknown, i: number, unique: boolean): unknown {
  if (!unique) return value;
  if (typeof value === 'string') return `${value}-${i}`;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    if (typeof o.id === 'string') return { ...o, id: `${o.id}-${i}` };
  }
  return value;
}

/** CLI-д: энэ модулийг ШУУД ажиллуулж байна уу (`node tools/x.ts`), эсвэл тест импортлов уу? */
export const isMain = (metaUrl: string): boolean =>
  typeof process.argv[1] === 'string' && fileURLToPath(metaUrl) === resolve(process.argv[1]);

/** Гэрээний анхдагч зам — репогийн аль ч хавтаснаас ИЖИЛ файлыг зааж өгнө. */
export const DEFAULT_CONTRACT = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  'docs',
  'PERSONAL-2',
  'contracts.yaml',
);

/** v1.1.0 — өмнөх нийтлэгдсэн хувилбар. Зөрүүг `contract-lint.ts` гаргана. */
export const PREVIOUS_CONTRACT = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  'docs',
  'PERSONAL-1',
  'contracts.yaml',
);
