/**
 * PERSONAL-2-ийн контентын гэрээ — `[C]` тестүүд (T-19…T-24).
 *
 * ⚠ Контент нь ЭДГЭЭР тестэд тааруулагдана, тест нь контентод БИШ. Бүтцийн
 * шаардлага (тоо, tier, давхцал, лавлагааны бүрэн байдал) нь схемээр илрэхгүй тул
 * энд ил бичигдэнэ.
 */
import { describe, expect, it } from 'vitest';
import { buildPack } from '@shared/content/index.ts';
import { SKILL_TAGS } from '@shared/core/constants.ts';
import type { SkillDefinition } from '@shared/types/index.ts';

const pack = buildPack();
const skills = pack.skills;
const byId = new Map(skills.map((s) => [s.id, s]));

/** PERSONAL-1-ийн 24 node — id БҮР хэвээр байх ЁСТОЙ (AC SKL-5). */
const LEGACY_SKILL_IDS = [
  'sk-edit-fundamentals',
  'sk-pacing',
  'sk-color-correction',
  'sk-color-grading',
  'sk-blender-navigation',
  'sk-modeling',
  'sk-uv-texturing',
  'sk-shading',
  'sk-lighting',
  'sk-rendering',
  'sk-keyframing',
  'sk-easing',
  'sk-rigging',
  'sk-character-animation',
  'sk-framing',
  'sk-camera-movement',
  'sk-coverage',
  'sk-audio-capture',
  'sk-sound-design',
  'sk-mixing',
  'sk-compositing',
  'sk-vfx-integration',
  'sk-story-structure',
  'sk-visual-storytelling',
];

/** tier алгасалтгүй эсэх — урьдчилсан нөхцөлийн ЗАМ дээр tier N−1 байх ёстой. */
function reachesTier(skill: SkillDefinition, wanted: number): boolean {
  const seen = new Set<string>();
  const stack = [...skill.prerequisites];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (node === undefined) continue;
    if (node.tier === wanted) return true;
    stack.push(...node.prerequisites);
  }
  return false;
}

describe('SKL-5 — the existing tree survives the upgrade (T-19)', () => {
  it('keeps all 24 PERSONAL-1 node ids', () => {
    const missing = LEGACY_SKILL_IDS.filter((id) => !byId.has(id));
    expect(missing).toEqual([]);
  });

  it('keeps every node at cost 1 — the currency changed, not the price', () => {
    expect(skills.filter((s) => s.cost !== 1).map((s) => s.id)).toEqual([]);
  });

  it('keeps the titles and descriptions non-empty for every node', () => {
    const bad = skills.filter((s) => !s.title.trim() || !s.description.trim());
    expect(bad.map((s) => s.id)).toEqual([]);
  });
});

describe('SKL-1 — the tree carries tracks, tiers and one capstone each (T-19)', () => {
  it('ships at least 28 nodes', () => {
    expect(skills.length).toBeGreaterThanOrEqual(28);
  });

  it('assigns every node a valid track and a tier in 1..3', () => {
    const bad = skills.filter(
      (s) => !(SKILL_TAGS as readonly string[]).includes(s.track) || s.tier < 1 || s.tier > 3,
    );
    expect(bad.map((s) => s.id)).toEqual([]);
  });

  it.each(SKILL_TAGS)('gives %s at least one tier-1, one tier-2 and exactly one tier-3', (tag) => {
    const tree = skills.filter((s) => s.track === tag);
    expect(tree.filter((s) => s.tier === 1).length).toBeGreaterThanOrEqual(1);
    expect(tree.filter((s) => s.tier === 2).length).toBeGreaterThanOrEqual(1);
    expect(tree.filter((s) => s.tier === 3)).toHaveLength(1);
  });

  /**
   * ⚠ «tier алгасахгүй» нь ЗАМААР шалгагдана, шууд урьдчилсан нөхцөлөөр БИШ:
   * `sk-uv-texturing` (tier 2) нь `sk-modeling` (tier 2)-оор дамжин
   * `sk-blender-navigation` (tier 1) хүрдэг. Шууд шалгалт нь DAG-д дахин
   * давхардсан, утгагүй урьдчилсан нөхцөл бичихийг шаардах байсан.
   */
  it('never lets a tier-2 node start without a tier-1 ancestor', () => {
    const bad = skills.filter((s) => s.tier === 2 && !reachesTier(s, 1));
    expect(bad.map((s) => s.id)).toEqual([]);
  });

  it('never lets a capstone start without a tier-2 ancestor', () => {
    const bad = skills.filter((s) => s.tier === 3 && !reachesTier(s, 2));
    expect(bad.map((s) => s.id)).toEqual([]);
  });

  it('requires every capstone prerequisite to come from its own track', () => {
    const bad: string[] = [];
    for (const s of skills.filter((n) => n.tier === 3))
      for (const p of s.prerequisites)
        if (byId.get(p)?.track !== s.track) bad.push(`${s.id} → ${p}`);
    expect(bad).toEqual([]);
  });

  it('keeps the prerequisite graph acyclic and fully resolvable', () => {
    const problems: string[] = [];
    for (const s of skills)
      for (const p of s.prerequisites) if (!byId.has(p)) problems.push(`${s.id} → ${p}`);

    const mark = new Map<string, 'visiting' | 'done'>();
    const walk = (id: string): void => {
      if (mark.get(id) === 'done') return;
      if (mark.get(id) === 'visiting') {
        problems.push(`cycle at ${id}`);
        return;
      }
      mark.set(id, 'visiting');
      for (const p of byId.get(id)?.prerequisites ?? []) walk(p);
      mark.set(id, 'done');
    };
    for (const s of skills) walk(s.id);
    expect(problems).toEqual([]);
  });
});

describe('BSX-1 — exactly one boss per world (T-20)', () => {
  const bosses = pack.quests.filter((q) => q.track === 'boss');

  it('ships five bosses', () => {
    expect(bosses).toHaveLength(5);
  });

  it.each([1, 2, 3, 4, 5])('gives world %i exactly one boss', (world) => {
    expect(bosses.filter((b) => b.world === world)).toHaveLength(1);
  });

  /** ⚠ spec.md A6 — PERSONAL-1-ийн boss нь 3-р дэлхийд ХЭВЭЭР. */
  it('keeps The Strange Room as the world-3 boss', () => {
    const w3 = bosses.find((b) => b.world === 3)!;
    expect(w3.id).toBe('boss-strange-room');
  });

  it('keeps the eighteen main-track quests untouched (MQ-1)', () => {
    expect(pack.quests.filter((q) => q.track === 'main')).toHaveLength(18);
  });

  it('invents no tutorial links for the new bosses (README T-22)', () => {
    const invented = bosses.filter((b) => b.id !== 'boss-strange-room' && b.tutorialRefs.length > 0);
    expect(invented.map((b) => b.id)).toEqual([]);
  });

  it('gates each boss behind reachable prerequisites in its own or an earlier world', () => {
    const byQuestId = new Map(pack.quests.map((q) => [q.id, q]));
    const bad: string[] = [];
    for (const b of bosses)
      for (const p of b.prerequisites) {
        const prereq = byQuestId.get(p);
        if (prereq === undefined) bad.push(`${b.id} → ${p} (missing)`);
        else if (prereq.world > b.world) bad.push(`${b.id} → ${p} (later world)`);
      }
    expect(bad).toEqual([]);
  });

  it('asks every boss to be scored across the six craft categories (BS-5)', () => {
    const bad = bosses.filter(
      (b) => !b.victoryConditions.some((v) => /six craft categories/i.test(v)),
    );
    expect(bad.map((b) => b.id)).toEqual([]);
  });
});
