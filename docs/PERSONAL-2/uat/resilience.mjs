// UAT resilience harness — seed, then verify persistence across a container restart.
import { readFileSync, writeFileSync } from 'node:fs';
const API = 'http://localhost:19787';
const j = async (m, p, o = {}) => {
  const h = { ...(o.headers ?? {}) };
  if (o.token) h.authorization = `Bearer ${o.token}`;
  if (o.body) h['content-type'] = 'application/json';
  const r = await fetch(API + p, { method: m, headers: h, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, b: await r.text() };
};

if (process.argv[2] === 'seed') {
  const a = JSON.parse((await j('POST', '/api/players')).b);
  const pack = JSON.parse((await j('GET', '/api/content/pack')).b);
  const q = pack.quests.find((x) => x.track === 'main' && x.levelRequired <= 1 && x.prerequisites.length === 0);
  const at = new Date(Date.now() - 86400000).toISOString();
  const r = await j('POST', `/api/players/${a.playerId}/actions`, {
    token: a.token,
    body: { actions: [{ actionId: crypto.randomUUID(), type: 'claimQuest', at, payload: { questId: q.id, checkedConditions: q.victoryConditions.map((_, i) => i) } }] },
  });
  const st = JSON.parse(r.b).state;
  writeFileSync(new URL('./persist.json', import.meta.url), JSON.stringify({ playerId: a.playerId, token: a.token, xp: st.xp, mastery: st.mastery }));
  console.log(`seeded playerId=${a.playerId} xp=${st.xp}`);
} else {
  const saved = JSON.parse(readFileSync(new URL('./persist.json', import.meta.url), 'utf8'));
  const health = await j('GET', '/api/health');
  console.log(`health after restart: ${health.s} ${health.b}`);
  const r = await j('GET', `/api/players/${saved.playerId}/save`, { token: saved.token });
  const body = JSON.parse(r.b);
  const same = r.s === 200 && body.state.xp === saved.xp && JSON.stringify(body.state.mastery) === JSON.stringify(saved.mastery);
  console.log(`${same ? 'PASS' : 'FAIL'} R-1 save and token survive a container restart (xp ${saved.xp} -> ${body?.state?.xp})`);
}
