/**
 * PERSONAL-2 · Гэрээ нийтлэх · нийтлэлийн ХААЛГА.
 *
 * `npm run contract:lint` — `docs/PERSONAL-2/contracts.yaml` нь нийтлэгдэхэд бэлэн эсэх.
 * Тэгээс ялгаатай кодоор гарвал гэрээ нийтлэгдэх ЁСГҮЙ.
 *
 * ⚠ Яагаад хэрэгтэй вэ: гэрээ нь код бичигдэхээс ӨМНӨ нийтлэгддэг тул түүнийг барих
 *   хэрэгжүүлэлт хараахан БАЙХГҮЙ. Хэрэв гэрээ өөрөө өөртэйгээ зөрчилдвөл (тасарсан
 *   $ref, схемтэйгээ таарахгүй жишээ, хоёр удаа зарлагдсан operationId) тэр зөрчил нь
 *   хэрэгжүүлэлтийн шатанд «код буруу» мэт харагдана. Хаалга нь гэрээг эхэлж цэвэрлэнэ.
 *
 * Хаалгууд (G-1…G-14) ба өмнөх хувилбартай харьцуулсан зөрүү нь доор.
 */
import { readFileSync } from 'node:fs';
import {
  DEFAULT_CONTRACT,
  PREVIOUS_CONTRACT,
  collectRefs,
  deref,
  isMain,
  loadContract,
  operations,
  refName,
  sample,
  validate,
  type Operation,
  type Schema,
  type Spec,
} from './contract.ts';

export interface Finding {
  gate: string;
  where: string;
  message: string;
}

/** Хоёр хувилбарын хоорондох ялгаа — «эвдэх» ба «нэмэх» гэж ангилагдсан. */
export interface Delta {
  addedSchemas: string[];
  removedSchemas: string[];
  addedFields: { schema: string; field: string; required: boolean }[];
  removedFields: { schema: string; field: string }[];
  addedEnumValues: { schema: string; value: string }[];
  removedEnumValues: { schema: string; value: string }[];
  addedRequired: { schema: string; field: string }[];
  removedRequired: { schema: string; field: string }[];
  addedOperations: string[];
  removedOperations: string[];
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const semver = (v: string): [number, number, number] => {
  const m = SEMVER.exec(v);
  if (!m) throw new Error(`semver биш хувилбар: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const gt = (a: string, b: string): boolean => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) {
    if (x[i]! > y[i]!) return true;
    if (x[i]! < y[i]!) return false;
  }
  return false;
};

const opKey = (o: Operation) => `${o.method.toUpperCase()} ${o.path}`;

const fieldsOf = (s: Schema): string[] => Object.keys((s?.properties ?? {}) as Record<string, unknown>);
const enumOf = (s: Schema): string[] => (Array.isArray(s?.enum) ? s.enum.map(String) : []);
const requiredOf = (s: Schema): string[] => (Array.isArray(s?.required) ? (s.required as string[]) : []);

// ──────────────────────────────────────────────────────────────────── зөрүү

export function diffContracts(prev: Spec, next: Spec): Delta {
  const p = prev.components.schemas;
  const n = next.components.schemas;
  const d: Delta = {
    addedSchemas: Object.keys(n).filter((k) => !(k in p)),
    removedSchemas: Object.keys(p).filter((k) => !(k in n)),
    addedFields: [],
    removedFields: [],
    addedEnumValues: [],
    removedEnumValues: [],
    addedRequired: [],
    removedRequired: [],
    addedOperations: [],
    removedOperations: [],
  };

  for (const name of Object.keys(n).filter((k) => k in p)) {
    const [a, b] = [p[name]!, n[name]!];
    const req = new Set(requiredOf(b));
    for (const f of fieldsOf(b).filter((f) => !fieldsOf(a).includes(f)))
      d.addedFields.push({ schema: name, field: f, required: req.has(f) });
    for (const f of fieldsOf(a).filter((f) => !fieldsOf(b).includes(f))) d.removedFields.push({ schema: name, field: f });
    for (const v of enumOf(b).filter((v) => !enumOf(a).includes(v))) d.addedEnumValues.push({ schema: name, value: v });
    for (const v of enumOf(a).filter((v) => !enumOf(b).includes(v))) d.removedEnumValues.push({ schema: name, value: v });
    for (const f of requiredOf(b).filter((f) => !requiredOf(a).includes(f))) d.addedRequired.push({ schema: name, field: f });
    for (const f of requiredOf(a).filter((f) => !requiredOf(b).includes(f)))
      d.removedRequired.push({ schema: name, field: f });
  }

  const prevOps = operations(prev).map(opKey);
  const nextOps = operations(next).map(opKey);
  d.addedOperations = nextOps.filter((k) => !prevOps.includes(k));
  d.removedOperations = prevOps.filter((k) => !nextOps.includes(k));
  return d;
}

// ──────────────────────────────────────────────────────────────── хаалгууд

/** 4xx/5xx-д бие байх ёстой content-type (AC BE-16 · RFC 9457). */
const PROBLEM_TYPE = 'application/problem+json';
/** Офлайн дүрэм (AC OFF-2…OFF-5): гэрээнд гадаад origin БАЙХГҮЙ. */
const ALLOWED_HOSTS = ['127.0.0.1', 'localhost'];

export function lintContract(next: Spec, prev: Spec | null, rawText: string): Finding[] {
  const f: Finding[] = [];
  const add = (gate: string, where: string, message: string) => f.push({ gate, where, message });

  // G-1 — OpenAPI хувилбар.
  if (next.openapi !== '3.1.0') add('G-1', 'openapi', `3.1.0 байх ёстой, "${next.openapi}" байна`);

  // G-2 — semver ба өмнөхөөсөө ЧАНД их.
  try {
    semver(next.info.version);
    if (prev && !gt(next.info.version, prev.info.version))
      add('G-2', 'info.version', `${next.info.version} нь өмнөх ${prev.info.version}-аас их БИШ`);
  } catch (e) {
    add('G-2', 'info.version', (e as Error).message);
  }

  // G-3 — бүх $ref задарна, гадаад заалт БАЙХГҮЙ.
  for (const ref of new Set(collectRefs(next))) {
    if (!ref.startsWith('#/')) {
      add('G-3', ref, 'гадаад $ref — гэрээ нь өөрөө бүрэн байх ёстой');
      continue;
    }
    try {
      deref(next, { $ref: ref });
    } catch (e) {
      add('G-3', ref, (e as Error).message);
    }
  }

  // G-4 — өнчин схем: `$ref`-ээр ч, тайлбар текстээр ч дурдагдаагүй схем.
  const referenced = new Set(collectRefs(next).map((r) => r.split('/').pop()!));
  for (const name of Object.keys(next.components.schemas)) {
    if (referenced.has(name)) continue;
    const mentions = rawText.split(name).length - 1;
    // Тодорхойлолт өөрөө нэг удаа нэрийг агуулна — 2-оос цөөн бол хаана ч дурдагдаагүй.
    if (mentions < 2) add('G-4', `components.schemas.${name}`, 'өнчин — $ref ч, тайлбар ч заагаагүй');
  }

  const ops = operations(next);

  // G-5 — operationId давхцахгүй; summary ба хариу байна.
  const ids = new Map<string, string>();
  for (const o of ops) {
    const where = opKey(o);
    if (typeof o.op.operationId !== 'string') add('G-5', where, 'operationId алга');
    else if (ids.has(o.op.operationId)) add('G-5', where, `operationId давхцав: ${o.op.operationId} (${ids.get(o.op.operationId)})`);
    else ids.set(o.op.operationId, where);
    if (!o.op.summary) add('G-5', where, 'summary алга');
    if (!Array.isArray(o.op.tags) || o.op.tags.length === 0) add('G-5', where, 'tags алга');
    if (!o.op.responses || Object.keys(o.op.responses).length === 0) add('G-5', where, 'хариу зарлагдаагүй');
  }

  // G-6 — алдааны хариу бүр RFC 9457 Problem (AC BE-16).
  for (const o of ops)
    for (const [code, resRef] of Object.entries((o.op.responses ?? {}) as Record<string, Schema>)) {
      if (!/^[45]\d\d$/.test(code)) continue;
      const res = deref(next, resRef);
      // Чөлөөлөлт нь ИЛ, ЭЗЭНТЭЙ байх ёстой: `x-problem-exempt` нь ШАЛТГААН (мөр) агуулна.
      // `true` гэсэн ганц утга хангалтгүй — шалтгаангүй чөлөөлөлт нь зөрчлөөс дор.
      const exempt = res['x-problem-exempt'];
      if (typeof exempt === 'string' && exempt.trim().length >= 20) continue;
      if (exempt !== undefined) {
        add('G-6', `${opKey(o)} → ${code}`, 'x-problem-exempt нь утга учиртай ШАЛТГААН (≥20 тэмдэгт) байх ёстой');
        continue;
      }
      const body = res.content?.[PROBLEM_TYPE];
      if (!body) add('G-6', `${opKey(o)} → ${code}`, `${PROBLEM_TYPE} бие алга`);
      else if (refName(body.schema) !== 'Problem') add('G-6', `${opKey(o)} → ${code}`, 'бие нь Problem биш');
    }

  // G-7 — замын {параметр} бүр зарлагдсан.
  for (const o of ops) {
    const declared = new Set(o.parameters.filter((p) => p.in === 'path').map((p) => p.name as string));
    for (const m of o.path.matchAll(/\{([^}]+)\}/g))
      if (!declared.has(m[1]!)) add('G-7', opKey(o), `{${m[1]}} параметр зарлагдаагүй`);
  }

  // G-8 — хамгаалалт ил: эсвэл `security: []`, эсвэл баримтын үндсэн хамгаалалт.
  const rootSchemes = (next.security ?? []).flatMap((s) => Object.keys(s));
  for (const name of rootSchemes)
    if (!next.components.securitySchemes?.[name]) add('G-8', `security.${name}`, 'securitySchemes-д тодорхойлогдоогүй');
  if (rootSchemes.length === 0) add('G-8', 'security', 'баримтын үндсэн хамгаалалт зарлагдаагүй');
  for (const o of ops)
    if (!o.open && !Array.isArray(o.op.security) && rootSchemes.length === 0)
      add('G-8', opKey(o), 'хамгаалалт тодорхойгүй');

  // G-9 — гэрээнд бичигдсэн `example` бүр ӨӨРИЙН схемээ хангана.
  for (const [name, schema] of Object.entries(next.components.schemas))
    if (schema.example !== undefined)
      for (const e of validate(next, schema, schema.example, `${name}.example`)) add('G-9', name, e);

  // G-10 — үүсгэгч ↔ шалгагч эвлэрэл: схем бүрийн үүсгэсэн жишээ нь схемээ хангана.
  for (const [name, schema] of Object.entries(next.components.schemas)) {
    let generated: unknown;
    try {
      generated = sample(next, schema);
    } catch (e) {
      add('G-10', name, `жишээ үүсгэхэд алдав: ${(e as Error).message}`);
      continue;
    }
    for (const e of validate(next, schema, generated, `sample(${name})`)) add('G-10', name, e);
  }

  // G-11 — офлайн: гэрээнд гадаад origin БАЙХГҮЙ (AC OFF-2…OFF-5).
  for (const m of rawText.matchAll(/https?:\/\/([^\s"'`)/\\]+)/g)) {
    const host = m[1]!.split(':')[0]!;
    if (!ALLOWED_HOSTS.includes(host)) add('G-11', m[0]!, 'гэрээнд гадаад origin — офлайн дүрэм зөрчигдөв');
  }
  for (const s of next.servers ?? []) {
    const url = s.url ?? '';
    const host = /^https?:\/\//.test(url) ? url.replace(/^https?:\/\//, '').split(/[:/]/)[0]! : '';
    if (host && !ALLOWED_HOSTS.includes(host)) add('G-11', `servers[${url}]`, 'гадаад server origin');
  }

  if (!prev) return f;
  const d = diffContracts(prev, next);

  // G-12 — endpoint нэмэгдээгүй · устаагүй (v1.2.0-ийн ӨӨРИЙН зарласан инвариант).
  for (const k of d.addedOperations) add('G-12', k, 'шинэ endpoint — v1.2.0 «endpoint нэмэгдээгүй» гэж зарласан');
  for (const k of d.removedOperations) add('G-12', k, 'endpoint устсан — эвдэх өөрчлөлт');

  // G-13 — жинхэнэ эвдэх өөрчлөлт: устсан схем · талбар · enum утга.
  for (const n of d.removedSchemas) add('G-13', n, 'схем устсан — хэрэглэгч эвдэрнэ');
  for (const x of d.removedFields) add('G-13', `${x.schema}.${x.field}`, 'талбар устсан — хэрэглэгч эвдэрнэ');
  for (const x of d.removedEnumValues) add('G-13', `${x.schema}.${x.value}`, 'enum утга устсан — хэрэглэгч эвдэрнэ');

  // G-14 — ЗААВАЛ талбар нэмэгдсэн схем нь хүсэлтийн бие бол, түүнд нүүлгэх зам ЗААГДСАН байх ёстой.
  const requestSchemas = new Set(
    ops.flatMap((o) => Object.values((o.op.requestBody?.content ?? {}) as Record<string, Schema>))
      .map((c) => refName(c.schema))
      .filter((n): n is string => n !== null),
  );
  const reachable = reachableFrom(next, [...requestSchemas]);
  for (const x of d.addedRequired) {
    if (!reachable.has(x.schema)) continue;
    const owners = ops.filter((o) =>
      reachableFrom(
        next,
        Object.values((o.op.requestBody?.content ?? {}) as Record<string, Schema>)
          .map((c) => refName(c.schema))
          .filter((n): n is string => n !== null),
      ).has(x.schema),
    );
    const documented = owners.some((o) => /migration|MIGRATIONS|нүүлгэ/i.test(String(o.op.description ?? '')));
    if (!documented)
      add(
        'G-14',
        `${x.schema}.${x.field}`,
        'хүсэлтийн бие дээр ЗААВАЛ талбар нэмэгдсэн атал нүүлгэх зам зарлагдаагүй',
      );
  }

  return f;
}

/** Өгсөн схемүүдээс `$ref`-ээр хүрч болох БҮХ схемийн нэр. */
function reachableFrom(spec: Spec, roots: string[]): Set<string> {
  const out = new Set<string>();
  const queue = [...roots];
  while (queue.length) {
    const name = queue.shift()!;
    if (out.has(name)) continue;
    out.add(name);
    const schema = spec.components.schemas[name];
    if (!schema) continue;
    for (const r of collectRefs(schema)) {
      const child = r.split('/').pop()!;
      if (!out.has(child)) queue.push(child);
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────── CLI

export function formatDelta(d: Delta): string[] {
  const line = (label: string, xs: string[]) => (xs.length ? `  ${label}: ${xs.length} — ${xs.join(' · ')}` : null);
  return [
    line('Шинэ схем', d.addedSchemas),
    line('Устсан схем', d.removedSchemas),
    line(
      'Шинэ талбар',
      d.addedFields.map((x) => `${x.schema}.${x.field}${x.required ? ' (заавал)' : ''}`),
    ),
    line(
      'Устсан талбар',
      d.removedFields.map((x) => `${x.schema}.${x.field}`),
    ),
    line(
      'Шинэ enum утга',
      d.addedEnumValues.map((x) => `${x.schema}.${x.value}`),
    ),
    line(
      'Устсан enum утга',
      d.removedEnumValues.map((x) => `${x.schema}.${x.value}`),
    ),
    line('Шинэ endpoint', d.addedOperations),
    line('Устсан endpoint', d.removedOperations),
  ].filter((x): x is string => x !== null);
}

if (isMain(import.meta.url)) {
  const file = process.argv[2] ?? DEFAULT_CONTRACT;
  const next = loadContract(file);
  const prev = loadContract(PREVIOUS_CONTRACT);
  const findings = lintContract(next, prev, readFileSync(file, 'utf8'));

  console.log(`Гэрээ: ${next.info.title} v${next.info.version}  (өмнөх v${prev.info.version})`);
  console.log(`Үйлдэл: ${operations(next).length} · Схем: ${Object.keys(next.components.schemas).length}`);
  console.log('Зөрүү v' + prev.info.version + ' → v' + next.info.version + ':');
  for (const l of formatDelta(diffContracts(prev, next))) console.log(l);

  if (findings.length === 0) {
    console.log('\n✔ 14 хаалга бүгд тэнцэв — гэрээ нийтлэгдэхэд бэлэн.');
    process.exit(0);
  }
  console.error(`\n✘ ${findings.length} зөрчил:`);
  for (const x of findings) console.error(`  [${x.gate}] ${x.where} — ${x.message}`);
  process.exit(1);
}
