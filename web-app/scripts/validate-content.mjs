/**
 * `npm run validate:content` — контентын хаалга командын шугамаас (AC QX-5; plan.md P-12).
 *
 * ⚠ Дүрмийг ЭНД бичихгүй: `shared/validate/**`-ийн ГАНЦ модулийг дуудна. CLI нь
 * зөвхөн гаралт форматлаж exit код тавина — хоёр дахь validator үүсэхгүй.
 * ⚠ Гадаад хамаарал ТЭГ: Node-ийн суурин TypeScript type-stripping-ээр `.ts`-ийг
 * шууд импортлоно, build алхам шаардахгүй.
 */
import { buildPack } from '../../shared/content/index.ts';
import { checkContentRules } from '../../shared/validate/content-rules.ts';
import { validateContentPack } from '../../shared/validate/index.ts';

const pack = buildPack();

// 1 — схемийн хэлбэр (`contracts.yaml` ↔ `schemas.ts`).
const schemaIssues = validateContentPack(pack);
// 2 — бүтцийн `[C]` дүрмүүд (тоо, граф, эдийн засаг, лавлагаа).
const ruleViolations = checkContentRules(pack);

for (const issue of schemaIssues) console.error(`schema  ${issue.field || '/'}  ${issue.message}`);
for (const v of ruleViolations) console.error(`${v.rule.padEnd(6)}  ${v.path}  ${v.message}`);

const total = schemaIssues.length + ruleViolations.length;
if (total === 0) {
  const counts = [
    `${pack.quests.length} quests`,
    `${pack.dungeons.length} dungeons`,
    `${pack.skills.length} skills`,
    `${pack.achievements.length} achievements`,
    `${pack.encounters.length} encounters`,
    `${pack.loot.length} loot`,
  ];
  console.log(`content ok — ${counts.join(' · ')}`);
  process.exit(0);
}

console.error(`\n${total} content problem(s): ${schemaIssues.length} schema, ${ruleViolations.length} rule`);
process.exit(1);
