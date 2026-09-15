/**
 * Мини схемийн DSL (lld.md §5.1).
 *
 * Хоёр үүрэг НЭГ эхээс: runtime validation ба TypeScript төрөл (`Infer<>`).
 * `shared/` нь гадаад хамааралгүй байх ёстой тул `ajv` ашиглах боломжгүй.
 *
 * Дүрэм:
 *  - `obj` нь ҮРГЭЛЖ `additionalProperties: false` — танихгүй талбар чимээгүй өнгөрөхгүй.
 *  - Бүх алдаа хуримтлагдана, эхний алдаанд зогсохгүй (AC BE-5 талбарын жагсаалт шаардана).
 *  - `field` нь JSON Pointer (`/state/projects/0/selfScore`).
 */

export type Issue = { field: string; message: string };

/** Contract-parity тестэд зориулсан зарласан метадата (lld.md §5.1). */
export type Meta = {
  kind: string;
  required?: string[];
  optional?: string[];
  enum?: readonly (string | number)[];
  const?: unknown;
  min?: number;
  max?: number;
  minItems?: number;
  maxItems?: number;
  /** `obj` — дэд талбарууд (зөвхөн contract-parity тестэд). */
  fields?: Record<string, Check<any>>;
  /** `arr` — элементийн Check (зөвхөн contract-parity тестэд). */
  items?: Check<any>;
};

export interface Check<T> {
  readonly _t?: T;
  readonly meta: Meta;
  check(v: unknown, path: string, out: Issue[]): boolean;
}

export type Infer<C> = C extends Check<infer T> ? T : never;
type Prettify<T> = { [K in keyof T]: T[K] } & {};

const fail = (out: Issue[], field: string, message: string): false => {
  out.push({ field, message });
  return false;
};

const make = <T>(meta: Meta, fn: (v: unknown, path: string, out: Issue[]) => boolean): Check<T> => ({
  meta,
  check: fn,
});

export const int = (o: { min?: number; max?: number } = {}): Check<number> =>
  make({ kind: 'integer', ...o }, (v, p, out) => {
    if (typeof v !== 'number' || !Number.isInteger(v)) return fail(out, p, 'expected integer');
    if (o.min !== undefined && v < o.min) return fail(out, p, `must be >= ${o.min}`);
    if (o.max !== undefined && v > o.max) return fail(out, p, `must be <= ${o.max}`);
    return true;
  });

export const num = (o: { min?: number; max?: number; exclusiveMin?: number } = {}): Check<number> =>
  make({ kind: 'number', min: o.min, max: o.max }, (v, p, out) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return fail(out, p, 'expected number');
    if (o.min !== undefined && v < o.min) return fail(out, p, `must be >= ${o.min}`);
    if (o.max !== undefined && v > o.max) return fail(out, p, `must be <= ${o.max}`);
    if (o.exclusiveMin !== undefined && v <= o.exclusiveMin)
      return fail(out, p, `must be > ${o.exclusiveMin}`);
    return true;
  });

export const str = (o: { min?: number; max?: number; pattern?: RegExp } = {}): Check<string> =>
  make({ kind: 'string', min: o.min, max: o.max }, (v, p, out) => {
    if (typeof v !== 'string') return fail(out, p, 'expected string');
    if (o.min !== undefined && v.length < o.min) return fail(out, p, `min length ${o.min}`);
    if (o.max !== undefined && v.length > o.max) return fail(out, p, `max length ${o.max}`);
    if (o.pattern && !o.pattern.test(v)) return fail(out, p, `must match ${o.pattern.source}`);
    return true;
  });

export const bool = (): Check<boolean> =>
  make({ kind: 'boolean' }, (v, p, out) =>
    typeof v === 'boolean' ? true : fail(out, p, 'expected boolean'),
  );

export const lit = <const T extends string | number | boolean>(value: T): Check<T> =>
  make({ kind: 'const', const: value }, (v, p, out) =>
    v === value ? true : fail(out, p, `must be ${JSON.stringify(value)}`),
  );

export const enom = <const T extends readonly string[]>(values: T): Check<T[number]> =>
  make({ kind: 'enum', enum: values }, (v, p, out) =>
    typeof v === 'string' && (values as readonly string[]).includes(v)
      ? true
      : fail(out, p, `must be one of ${values.join('|')}`),
  );

export const nullable = <C extends Check<any>>(inner: C): Check<Infer<C> | null> =>
  make({ ...inner.meta, kind: `${inner.meta.kind}|null` }, (v, p, out) =>
    v === null ? true : inner.check(v, p, out),
  );

/** Домэйн үйлдлийн `payload` — контрактад нээлттэй объект (хоёр дахь шалгалт §6.5-д). */
export const anyObj = (): Check<Record<string, unknown>> =>
  make({ kind: 'object' }, (v, p, out) =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
      ? true
      : fail(out, p, 'expected object'),
  );

export const arr = <C extends Check<any>>(
  item: C,
  o: { min?: number; max?: number; unique?: boolean } = {},
): Check<Infer<C>[]> =>
  make({ kind: 'array', minItems: o.min, maxItems: o.max, items: item }, (v, p, out) => {
    if (!Array.isArray(v)) return fail(out, p, 'expected array');
    let ok = true;
    if (o.min !== undefined && v.length < o.min) ok = fail(out, p, `min ${o.min} item(s)`);
    if (o.max !== undefined && v.length > o.max) ok = fail(out, p, `max ${o.max} item(s)`);
    v.forEach((el, i) => {
      if (!item.check(el, `${p}/${i}`, out)) ok = false;
    });
    if (o.unique) {
      const seen = new Set(v.map((el) => JSON.stringify(el)));
      if (seen.size !== v.length) ok = fail(out, p, 'items must be unique');
    }
    return ok;
  });

export const rec = <C extends Check<any>>(value: C): Check<Record<string, Infer<C>>> =>
  make({ kind: 'record' }, (v, p, out) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v))
      return fail(out, p, 'expected object');
    let ok = true;
    for (const [k, el] of Object.entries(v)) {
      if (!value.check(el, `${p}/${escapeKey(k)}`, out)) ok = false;
    }
    return ok;
  });

type Shape = Record<string, Check<any>>;
type ObjOut<S extends Shape, K extends keyof S> = Prettify<
  { [P in Exclude<keyof S, K>]: Infer<S[P]> } & { [P in K]?: Infer<S[P]> }
>;

export function obj<S extends Shape, K extends keyof S = never>(
  shape: S,
  o: { optional?: readonly K[] } = {},
): Check<ObjOut<S, K>> {
  const optional = new Set<string>((o.optional ?? []) as readonly string[]);
  const required = Object.keys(shape).filter((k) => !optional.has(k));
  return make({ kind: 'object', required, optional: [...optional], fields: shape }, (v, p, out) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v))
      return fail(out, p, 'expected object');
    const value = v as Record<string, unknown>;
    let ok = true;
    for (const key of Object.keys(shape)) {
      const field = `${p}/${escapeKey(key)}`;
      if (!(key in value) || value[key] === undefined) {
        if (!optional.has(key)) ok = fail(out, field, 'required');
        continue;
      }
      if (!shape[key]!.check(value[key], field, out)) ok = false;
    }
    for (const key of Object.keys(value)) {
      if (!(key in shape)) ok = fail(out, `${p}/${escapeKey(key)}`, 'unexpected property');
    }
    return ok;
  });
}

export function union<Cs extends Check<any>[]>(...cs: Cs): Check<Infer<Cs[number]>> {
  return make({ kind: 'union' }, (v, p, out) => {
    const scratch: Issue[] = [];
    for (const c of cs) if (c.check(v, p, scratch)) return true;
    return fail(out, p, 'matched no allowed shape');
  });
}

/** RFC 6901 — `~` ба `/` нь JSON Pointer-д зайлсхийгддэг. */
function escapeKey(k: string): string {
  return k.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Схемийг ажиллуулж алдааны жагсаалт буцаана (хоосон = хүчинтэй). */
export function run<C extends Check<any>>(schema: C, v: unknown): Issue[] {
  const out: Issue[] = [];
  schema.check(v, '', out);
  return out;
}
