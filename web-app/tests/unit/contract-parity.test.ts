/**
 * Drift хамгаалалт (lld.md §5.1): `shared/validate/schemas.ts` нь ГАРААР бичигдсэн тул
 * `docs/PERSONAL-1/contracts.yaml`-аас салж болзошгүй. Зөрвөл ЭНЭ ТЕСТ УНАНА.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { Check } from '@shared/validate/dsl.ts';
import * as S from '@shared/validate/schemas.ts';

// vitest нь `web-app/` дотроос ажиллана (plan.md P-7).
const contractPath = resolve(process.cwd(), '../docs/PERSONAL-1/contracts.yaml');
const doc = parse(readFileSync(contractPath, 'utf8')) as {
  components: { schemas: Record<string, any> };
};
const yamlSchemas = doc.components.schemas;

/** Контрактын нэр → манай Check. `$ref` бүхий дэд объектуудыг тусад нь жагсаана. */
const MAP: Record<string, Check<any>> = {
  Problem: S.Problem,
  RejectionReason: S.RejectionReason,
  HealthOk: S.HealthOk,
  HealthDegraded: S.HealthDegraded,
  PlayerCredentials: S.PlayerCredentials,
  SavePayload: S.SavePayload,
  SaveAck: S.SaveAck,
  RestoreRequest: S.RestoreRequest,
  SnapshotRef: S.SnapshotRef,
  SaveHistory: S.SaveHistory,
  ActionType: S.ActionType,
  Action: S.Action,
  ActionBatchRequest: S.ActionBatchRequest,
  ActionResult: S.ActionResult,
  ActionBatchResponse: S.ActionBatchResponse,
  TransferCode: S.TransferCode,
  RedeemRequest: S.RedeemRequest,
  GameState: S.GameState,
  BossScores: S.BossScores,
  ProjectState: S.ProjectState,
  QuestDefinition: S.QuestDefinition,
  TutorialRef: S.TutorialRef,
  DungeonDefinition: S.DungeonDefinition,
  AchievementDefinition: S.AchievementDefinition,
  EncounterDefinition: S.EncounterDefinition,
  LootItem: S.LootItem,
  SkillDefinition: S.SkillDefinition,
  ContentPack: S.ContentPack,
  ProgressionConstants: S.ProgressionConstants,
};

const sorted = (xs: readonly (string | number)[] | undefined) => [...(xs ?? [])].sort();

describe('contract parity: schemas.ts ↔ contracts.yaml (T-04)', () => {
  it('covers every contract schema that has a TypeScript counterpart', () => {
    // DomainEvent · ActionBatchResponse-ийн дэд хэсгүүд MAP-д тусдаа биш — тэднийг оруулав.
    const covered = new Set([...Object.keys(MAP), 'DomainEvent', 'MilestoneKey', 'TransferCodeString']);
    const missing = Object.keys(yamlSchemas).filter((n) => !covered.has(n));
    expect(missing).toEqual([]);
  });

  for (const [name, check] of Object.entries(MAP)) {
    const y = yamlSchemas[name];

    it(`${name}: required талбарууд таарна`, () => {
      expect(y, `${name} нь contracts.yaml-д байхгүй`).toBeDefined();
      if (check.meta.kind !== 'object') return;
      expect(sorted(check.meta.required)).toEqual(sorted(y.required));
    });

    it(`${name}: талбарын нэрс таарна`, () => {
      if (check.meta.kind !== 'object' || !y.properties) return;
      expect(sorted(Object.keys(check.meta.fields ?? {}))).toEqual(sorted(Object.keys(y.properties)));
    });

    it(`${name}: enum · const утгууд таарна`, () => {
      if (check.meta.kind === 'enum') {
        expect(sorted(check.meta.enum)).toEqual(sorted(y.enum));
        return;
      }
      if (check.meta.kind !== 'object' || !y.properties) return;
      for (const [prop, sub] of Object.entries<any>(y.properties)) {
        const ours = check.meta.fields?.[prop];
        if (!ours) continue;
        if (sub.enum) expect(sorted(ours.meta.enum), `${name}.${prop} enum`).toEqual(sorted(sub.enum));
        if (sub.const !== undefined && !Array.isArray(sub.const))
          expect(ours.meta.const, `${name}.${prop} const`).toEqual(sub.const);
      }
    });

    it(`${name}: тоон minimum · maximum таарна`, () => {
      if (check.meta.kind !== 'object' || !y.properties) return;
      for (const [prop, sub] of Object.entries<any>(y.properties)) {
        const ours = check.meta.fields?.[prop];
        if (!ours) continue;
        if (typeof sub.minimum === 'number' && ours.meta.min !== undefined)
          expect(ours.meta.min, `${name}.${prop} minimum`).toBe(sub.minimum);
        if (typeof sub.maximum === 'number' && ours.meta.max !== undefined)
          expect(ours.meta.max, `${name}.${prop} maximum`).toBe(sub.maximum);
        if (typeof sub.minItems === 'number')
          expect(ours.meta.minItems, `${name}.${prop} minItems`).toBe(sub.minItems);
        if (typeof sub.maxItems === 'number')
          expect(ours.meta.maxItems, `${name}.${prop} maxItems`).toBe(sub.maxItems);
      }
    });
  }
});
