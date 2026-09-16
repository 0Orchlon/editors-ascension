/**
 * PERSONAL-2 · Гэрээ нийтлэх · ГЭРЭЭНИЙ БАРИМТ ҮҮСГЭГЧ.
 *
 * `npm run contract:docs` → `docs/PERSONAL-2/contract-docs.md`
 *
 * ⚠ Яагаад React-ийн баримтын сан БИШ вэ: `netos-contract-docs` маягийн хувийн React/npm
 *   багц нь энэ репогоос уншигдахгүй (Nexus-д хандах эрх алга) бөгөөд энэ бол офлайн,
 *   гадны холболтгүй систем (AC OFF-2…OFF-5). Тиймээс даалгаврын зөвшөөрсөн ЗАМААР —
 *   Markdown/хүснэгт орлуулагчаар — баримтыг үүсгэв. Гаралт нь git-д commit хийгддэг тул
 *   дараагийн агент нь ямар ч build алхамгүйгээр уншина.
 *
 * ГАРААР бичсэн хэсэг нь `contract-docs.prologue.md`-д амьдарна — дахин үүсгэхэд
 * ТЭР ХЭСЭГ АЛДАГДАХГҮЙ. Схем ба endpoint-ийн лавлах нь ЗӨВХӨН `contracts.yaml`-аас
 * гардаг тул гэрээ ба баримт хоёр чимээгүй салах зам БАЙХГҮЙ.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { diffContracts, formatDelta } from './contract-lint.ts';
import {
  DEFAULT_CONTRACT,
  PREVIOUS_CONTRACT,
  deref,
  isMain,
  loadContract,
  operations,
  refName,
  sample,
  type Operation,
  type Schema,
  type Spec,
} from './contract.ts';

const anchor = (name: string) => `#${name.toLowerCase()}`;
const oneLine = (s: unknown) => String(s ?? '').replace(/\s*\n\s*/g, ' ').trim();
const cell = (s: unknown) => oneLine(s).replace(/\|/g, '\\|');

/** Схемийн төрлийг уншигдах мөр болгоно — `$ref` нь холбоос болно. */
function typeLabel(spec: Spec, node: Schema): string {
  const ref = refName(node);
  if (ref) return `[\`${ref}\`](${anchor(ref)})`;
  const s = node ?? {};
  if (s.const !== undefined) return `const ${JSON.stringify(s.const)}`;
  if (Array.isArray(s.enum)) return `enum(${s.enum.join(' \\| ')})`;
  const types = s.type === undefined ? [] : Array.isArray(s.type) ? s.type : [s.type];
  if (types.includes('array')) return `${typeLabel(spec, s.items ?? {})}[]`;
  if (types.includes('object') || s.properties || s.additionalProperties) {
    const keys = s.propertyNames ? typeLabel(spec, s.propertyNames) : 'string';
    const vals = typeof s.additionalProperties === 'object' ? typeLabel(spec, s.additionalProperties) : null;
    if (vals) return `map<${keys}, ${vals}>`;
    return 'object';
  }
  const base = types.join(' \\| ') || 'any';
  return s.format ? `${base}(${s.format})` : base;
}

/** Хязгаарлалтуудыг нэг нүдэнд. */
function constraints(s: Schema): string {
  const bits: string[] = [];
  for (const k of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties'])
    if (typeof s?.[k] === 'number') bits.push(`${k}=${s[k]}`);
  if (s?.uniqueItems === true) bits.push('uniqueItems');
  if (s?.default !== undefined) bits.push(`default=${JSON.stringify(s.default)}`);
  if (s?.propertyNames) bits.push('түлхүүр нь enum');
  return bits.join(', ') || '—';
}

function schemaSection(spec: Spec, name: string, schema: Schema): string[] {
  const out: string[] = [`### ${name}`, ''];
  if (schema.description) out.push(oneLine(schema.description), '');

  if (Array.isArray(schema.enum)) {
    out.push(schema.enum.map((v: unknown) => `\`${v}\``).join(' · '), '');
    return out;
  }

  const props = (schema.properties ?? {}) as Record<string, Schema>;
  if (Object.keys(props).length > 0) {
    const required = new Set((schema.required ?? []) as string[]);
    out.push('| Талбар | Төрөл | Заавал | Хязгаар | Тайлбар |', '|---|---|---|---|---|');
    for (const [field, raw] of Object.entries(props)) {
      const resolved = refName(raw) ? raw : (raw ?? {});
      out.push(
        `| \`${field}\` | ${typeLabel(spec, resolved)} | ${required.has(field) ? 'тийм' : 'үгүй'} | ` +
          `${constraints(refName(raw) ? {} : resolved)} | ${cell(resolved.description)} |`,
      );
    }
    out.push('');
    if (schema.additionalProperties === false) out.push('_Нэмэлт талбар хориотой (`additionalProperties: false`)._', '');
  } else if (typeof schema.additionalProperties === 'object') {
    out.push(
      `Газрын зураг: ${typeLabel(spec, schema)}. ${constraints(schema) === '—' ? '' : `Хязгаар: ${constraints(schema)}.`}`,
      '',
    );
  } else if (schema.type === 'array') {
    out.push(`Массив: ${typeLabel(spec, schema)}. Хязгаар: ${constraints(schema)}.`, '');
  }

  if (schema.example !== undefined)
    out.push('```json', JSON.stringify(schema.example, null, 2), '```', '');
  return out;
}

function operationSection(spec: Spec, o: Operation, base: string): string[] {
  const out: string[] = [`### \`${o.method.toUpperCase()} ${o.path}\` — \`${o.operationId}\``, ''];
  out.push(`${oneLine(o.op.summary)} · **auth:** ${o.open ? 'нээлттэй' : 'token'}`, '');
  if (o.op.description) out.push(oneLine(o.op.description), '');

  if (o.parameters.length > 0) {
    out.push('| Параметр | Байрлал | Заавал | Төрөл | Тайлбар |', '|---|---|---|---|---|');
    for (const p of o.parameters)
      out.push(
        `| \`${p.name}\` | ${p.in} | ${p.required ? 'тийм' : 'үгүй'} | ${typeLabel(spec, p.schema ?? {})} | ${cell(p.description)} |`,
      );
    out.push('');
  }

  const reqBody = (o.op.requestBody?.content ?? {})['application/json'];
  if (reqBody)
    out.push(
      `**Хүсэлтийн бие** (\`application/json\`, ${o.op.requestBody.required ? 'заавал' : 'сонголттой'}): ` +
        `${typeLabel(spec, reqBody.schema)}`,
      '',
    );

  out.push('| Статус | Бие | Тайлбар |', '|---|---|---|');
  for (const [code, resRef] of Object.entries((o.op.responses ?? {}) as Record<string, Schema>)) {
    const res = deref(spec, resRef);
    const contentType = Object.keys((res.content ?? {}) as Record<string, unknown>)[0];
    const body = contentType ? typeLabel(spec, res.content[contentType].schema) : '—';
    out.push(`| \`${code}\` | ${body} | ${cell(res.description)} |`);
  }
  out.push('');

  const headers = new Set<string>();
  for (const resRef of Object.values((o.op.responses ?? {}) as Record<string, Schema>))
    for (const h of Object.keys((deref(spec, resRef).headers ?? {}) as Record<string, unknown>)) headers.add(h);
  if (headers.size > 0) out.push(`**Хариуны header:** ${[...headers].map((h) => `\`${h}\``).join(' · ')}`, '');

  // Дуурайлт руу шууд ажиллах дуудлага — гэрээг УНШИХ биш, ХЭРЭГЛЭЖ шалгах зам.
  const curl = [
    `curl -i -X ${o.method.toUpperCase()} http://127.0.0.1:4010${base}${o.path.replace(/\{[^}]+\}/g, '00000000-0000-4000-8000-000000000000')}`,
  ];
  if (!o.open) curl.push(`  -H 'Authorization: Bearer mock-token'`);
  for (const p of o.parameters.filter((x) => x.in === 'header' && x.required === true))
    curl.push(`  -H '${p.name}: *'`);
  if (reqBody) {
    curl.push(`  -H 'Content-Type: application/json'`);
    curl.push(`  -d '${JSON.stringify(sample(spec, reqBody.schema))}'`);
  }
  out.push('```bash', curl.join(' \\\n'), '```', '');
  return out;
}

export function renderDocs(spec: Spec, prev: Spec | null, prologue: string): string {
  const base = spec.servers?.[0]?.url ?? '';
  const ops = operations(spec);
  const lines: string[] = [];

  lines.push(
    `<!-- PERSONAL-2 · contract-docs · Гэрээ нийтлэх · ${new Date().toISOString().slice(0, 10)} -->`,
    `<!-- ҮҮСГЭСЭН ФАЙЛ — гараар бүү засварла. Эх: docs/PERSONAL-2/contracts.yaml -->`,
    `<!-- Гараар бичих хэсэг: docs/PERSONAL-2/contract-docs.prologue.md -->`,
    `<!-- Дахин үүсгэх: cd server && npm run contract:docs -->`,
    '',
    `# ${spec.info.title} — гэрээний баримт v${spec.info.version}`,
    '',
    oneLine(spec.info.description),
    '',
    `- **OpenAPI:** ${spec.openapi} · эх файл: [\`contracts.yaml\`](contracts.yaml)`,
    `- **Server:** \`${base}\``,
    `- **Үндсэн хамгаалалт:** \`${Object.keys(spec.security?.[0] ?? { playerToken: [] })[0]}\` (Bearer). \`security: []\` тэмдэгтэй үйлдэл нээлттэй.`,
    `- **Дуурайлт (mock):** \`cd server && npm run contract:mock\` → \`http://127.0.0.1:4010${base}\``,
    `- **Нийтлэлийн хаалга:** \`cd server && npm run contract:lint\` (14 хаалга)`,
    `- **Хэмжээ:** ${ops.length} үйлдэл · ${Object.keys(spec.components.schemas).length} схем`,
    '',
  );

  if (prev) {
    const delta = formatDelta(diffContracts(prev, spec));
    lines.push(
      `## Хувилбарын зөрүү — v${prev.info.version} → v${spec.info.version}`,
      '',
      '⚠ Энэ хэсэг нь ҮҮСГЭГДСЭН: хоёр `contracts.yaml`-ийг машинаар харьцуулсан үр дүн.',
      'Гараар бичсэн өөрчлөлтийн жагсаалттай зөрвөл ЭНЭ нь зөв.',
      '',
      ...(delta.length ? delta.map((l) => `- ${l.trim()}`) : ['- (зөрүү алга)']),
      '',
    );
  }

  if (prologue.trim()) lines.push(prologue.trim(), '');

  lines.push('## Эндпойнтын жагсаалт', '', '| Method | Зам | operationId | Tag | Auth | Тайлбар |', '|---|---|---|---|---|---|');
  for (const o of ops)
    lines.push(
      `| \`${o.method.toUpperCase()}\` | \`${o.path}\` | [\`${o.operationId}\`](${anchor(o.operationId)}) | ` +
        `${(o.op.tags ?? []).join(', ')} | ${o.open ? 'нээлттэй' : 'token'} | ${cell(o.op.summary)} |`,
    );
  lines.push('');

  lines.push('## Үйлдлүүд', '');
  for (const o of ops) lines.push(...operationSection(spec, o, base));

  lines.push('## Дахин ашиглагдах хариунууд', '', '| Нэр | Бие | Тайлбар |', '|---|---|---|');
  for (const [name, res] of Object.entries(spec.components.responses ?? {})) {
    const contentType = Object.keys((res.content ?? {}) as Record<string, unknown>)[0];
    lines.push(`| \`${name}\` | ${contentType ? typeLabel(spec, res.content[contentType].schema) : '—'} | ${cell(res.description)} |`);
  }
  lines.push('');

  lines.push('## Схемүүд', '');
  for (const [name, schema] of Object.entries(spec.components.schemas)) lines.push(...schemaSection(spec, name, schema));

  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

if (isMain(import.meta.url)) {
  const contractFile = process.argv[2] ?? DEFAULT_CONTRACT;
  const outFile = resolve(contractFile, '..', 'contract-docs.md');
  const prologueFile = resolve(contractFile, '..', 'contract-docs.prologue.md');
  const spec = loadContract(contractFile);
  const prev = existsSync(PREVIOUS_CONTRACT) ? loadContract(PREVIOUS_CONTRACT) : null;
  const prologue = existsSync(prologueFile) ? readFileSync(prologueFile, 'utf8') : '';

  const md = renderDocs(spec, prev, prologue);
  writeFileSync(outFile, md, 'utf8');
  console.log(`${outFile} — ${md.split('\n').length} мөр үүсэв (v${spec.info.version}).`);
}
