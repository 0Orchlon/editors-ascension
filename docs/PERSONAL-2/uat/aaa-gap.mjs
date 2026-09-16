// AAA-SPEC §2 target table measured against the DEPLOYED content pack (observation only).
const P = await (await fetch('http://localhost:19787/api/content/pack')).json();
const q = P.quests;
const n = (t) => q.filter((x) => x.track === t).length;
const rows = [
  ['Worlds / seasons', '5 worlds x 3 seasons (15)', `${new Set(q.map((x) => x.world)).size} worlds, seasons field: ${'seasons' in P ? 'present' : 'absent'}`],
  ['Main quests', '45+', `${n('main')}`],
  ['Side quests', '70+', `${n('side')}`],
  ['Study dungeons', '40+', `${P.dungeons.length}`],
  ['Bosses', '14 (7 base + 7 hard remix)', `${q.filter((x) => x.track === 'boss' || x.track === 'raid').length} base x 2 difficulties`],
  ['Achievements', '60+', `${P.achievements.length}`],
  ['Loot / cosmetics', '90+', `${P.cosmetics.length} cosmetics + ${P.loot.length} loot`],
  ['Encounters', '24+ in 4 chained lines', `${P.encounters.length}, chains: ${'encounterChains' in P ? 'present' : 'absent'}`],
  ['Skill tree nodes', '60+ across 6 trees', `${P.skills.length} across ${new Set(P.skills.map((s) => s.track)).size} trees`],
  ['Reputation systems', '4 guilds', `${P.guilds.length}`],
  ['Difficulty modes', 'standard / hard / directorsCut', 'standard / hard (directorsCut rejected by the server)'],
  ['Save slots', 'up to 3 named', `1 (no slotId in the deployed save schema)`],
  ['Dungeon question banks', '>=6 per dungeon, 3 drawn', `min questions per dungeon: ${Math.min(...P.dungeons.map((d) => (d.questions ?? d.questionBank ?? []).length))}`],
  ['Portfolio tab', 'read-only gallery', `projects field in pack: ${'projects' in P ? 'present' : 'absent'}`],
  ['Telemetry export', 'opt-in local export', 'not present in the deployed build'],
];
console.log(rows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} |`).join('\n'));
