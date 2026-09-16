/**
 * PERSONAL-2 · Гэрээ нийтлэх — нийтлэлийн ХААЛГЫГ `npm test`-д холбоно.
 *
 * ⚠ Яагаад тестээр вэ: `npm run contract:lint` нь ГАРААР дуудагддаг тул мартагдаж болно.
 *   Гэрээ нь хэрэгжүүлэлтээс ӨМНӨ нийтлэгддэг — хэрэв нийтлэгдсэний дараа хэн нэг нь
 *   `contracts.yaml`-ийг засаад хаалгыг ажиллуулахгүй бол дуурайлт ба баримт хоёул
 *   чимээгүй хуучирна. Энэ тест нь гадаргуугийн ГАНЦ командад (`npm test`) залгагдана.
 *
 * Гурван зүйлийг барина:
 *   1. Гэрээ өөрөө 14 хаалгаар тэнцэнэ.
 *   2. Commit хийгдсэн `contract-docs.md` нь гэрээнээс ДАХИН үүсгэсэнтэй ИЖИЛ
 *      (баримт хуучирвал УНАНА).
 *   3. Дуурайлт нь гэрээний БҮХ үйлдэлд гэрээ хангасан хариу буцаана.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { lintContract } from '../../tools/contract-lint.ts';
import { renderDocs } from '../../tools/contract-docs.ts';
import { createMockServer } from '../../tools/contract-mock.ts';
import {
  DEFAULT_CONTRACT,
  PREVIOUS_CONTRACT,
  deref,
  loadContract,
  operations,
  sample,
  validate,
} from '../../tools/contract.ts';

const spec = loadContract(DEFAULT_CONTRACT);
const prev = loadContract(PREVIOUS_CONTRACT);
const rawText = readFileSync(DEFAULT_CONTRACT, 'utf8');
const docsDir = resolve(DEFAULT_CONTRACT, '..');
const base = spec.servers?.[0]?.url ?? '';
const UUID = '00000000-0000-4000-8000-000000000000';

/**
 * Үүсгэсэн огноог хассан, мөрийн төгсгөлийг жигдрүүлсэн хувилбар.
 * ⚠ CRLF жигдрүүлэлт нь ЗААВАЛ: `core.autocrlf=true` тохиргоотой clone дээр файл нь
 *   CRLF болж checkout хийгддэг атал үүсгэгч нь LF бичдэг — жигдрүүлэхгүй бол энэ тест
 *   зөвхөн Windows дээр, зөвхөн шинэ clone дээр унана (хамгийн хууртмал төрлийн унал).
 */
const withoutStamp = (md: string) =>
  md.replace(/\r\n/g, '\n').replace(/<!-- PERSONAL-2 · contract-docs ·[^\n]*\n/, '');

describe('гэрээ нийтлэгдэхэд бэлэн (G-1…G-14)', () => {
  it('нэг ч зөрчилгүй', () => {
    const findings = lintContract(spec, prev, rawText);
    expect(findings.map((f) => `[${f.gate}] ${f.where} — ${f.message}`)).toEqual([]);
  });

  it('хаалга нь хоосон биш — тарьсан зөрчлийг барина', () => {
    const broken = structuredClone(spec);
    broken.components.schemas.Problem!.required = ['type', 'title', 'status', 'НЭМЭГДСЭН'];
    delete (broken.paths['/health']!.get as { operationId?: string }).operationId;
    const findings = lintContract(broken, prev, rawText);
    expect(findings.some((f) => f.gate === 'G-5')).toBe(true);
    expect(findings.some((f) => f.gate === 'G-13')).toBe(false); // required нэмэх нь устгал БИШ
  });

  it('commit хийгдсэн contract-docs.md нь гэрээнээс дахин үүсгэсэнтэй ИЖИЛ', () => {
    const prologue = readFileSync(resolve(docsDir, 'contract-docs.prologue.md'), 'utf8');
    const onDisk = readFileSync(resolve(docsDir, 'contract-docs.md'), 'utf8');
    expect(withoutStamp(renderDocs(spec, prev, prologue))).toEqual(withoutStamp(onDisk));
  });
});

describe('гэрээний дуурайлт (prism-ийн орлуулагч)', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = createMockServer(spec);
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((done) => server.close(() => done())));

  const call = (method: string, path: string, init: RequestInit = {}) =>
    fetch(`${origin}${base}${path.replace(/\{[^}]+\}/g, UUID)}`, { method: method.toUpperCase(), ...init });

  for (const o of operations(spec)) {
    it(`${o.operationId}: анхдагч хариу нь гэрээг хангана`, async () => {
      const headers: Record<string, string> = {};
      if (!o.open) headers.authorization = 'Bearer mock-token';
      for (const p of o.parameters.filter((x) => x.in === 'header' && x.required === true)) headers[String(p.name)] = '*';

      let body: string | undefined;
      const reqSchema = (o.op.requestBody?.content ?? {})['application/json']?.schema;
      if (reqSchema) {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(sample(spec, reqSchema));
      }

      const res = await call(o.method, o.path, { headers, body });
      const declared = Object.keys(o.op.responses);
      expect(declared, `${res.status} нь гэрээнд зарлагдаагүй`).toContain(String(res.status));

      const response = deref(spec, o.op.responses[String(res.status)]);
      const contentType = Object.keys((response.content ?? {}) as Record<string, unknown>)[0];
      if (!contentType) return;
      expect(res.headers.get('content-type')).toBe(contentType);
      expect(validate(spec, response.content[contentType].schema, await res.json())).toEqual([]);
    });
  }

  it('token шаардсан үйлдэл нь Bearer-гүйд 401', async () => {
    const res = await call('get', '/players/{playerId}/save');
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toBe('application/problem+json');
  });

  it('гэрээг зөрчсөн бие нь 400 + талбарын замтай алдаа', async () => {
    const res = await call('put', '/players/{playerId}/save', {
      headers: { authorization: 'Bearer x', 'if-match': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ schemaVersion: 'хоёр' }),
    });
    expect(res.status).toBe(400);
    const problem = (await res.json()) as { code?: string; errors?: { message: string }[] };
    expect(problem.code).toBe('INVALID_INPUT');
    expect(problem.errors?.some((e) => e.message.includes('schemaVersion'))).toBe(true);
  });

  it('Prefer: code=NNN нь зарлагдсан хариуг сонгоно, зарлагдаагүйг татгалзана', async () => {
    const conflict = await call('put', '/players/{playerId}/save', {
      headers: { authorization: 'Bearer x', 'if-match': '*', 'content-type': 'application/json', prefer: 'code=409' },
      body: JSON.stringify(sample(spec, { $ref: '#/components/schemas/SavePayload' })),
    });
    expect(conflict.status).toBe(409);

    const bogus = await call('get', '/health', { headers: { prefer: 'code=418' } });
    expect(bogus.status).toBe(400);
  });

  it('гэрээнд байхгүй зам нь 404 Problem', async () => {
    const res = await call('get', '/зохиосон-зам');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toBe('application/problem+json');
  });
});
