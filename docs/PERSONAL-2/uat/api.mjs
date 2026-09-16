// UAT API harness — black box against deployed server.
const BASE = process.env.UAT_SERVER ?? 'http://localhost:19787';
let pass = 0, fail = 0;
const fails = [];
const ok = (id, cond, detail = '') => {
  if (cond) { pass++; console.log(`PASS ${id} ${detail}`); }
  else { fail++; fails.push(`${id} ${detail}`); console.log(`FAIL ${id} ${detail}`); }
};
async function req(method, path, { token, body, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.authorization = `Bearer ${token}`;
  if (body !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: r.status, headers: Object.fromEntries(r.headers), body: parsed, raw: text };
}
const act = (type, payload, at) => ({ actionId: crypto.randomUUID(), type, at, payload });

// ⚠ Server rejects actions more than 5 minutes in the future, so every simulated
// "day" sits in the past: day 0 == 20 days ago, day 20 == now.
const iso = (dayOffset = 0) => new Date(Date.now() - (20 - dayOffset) * 86400e3).toISOString();

async function main() {
  // ---------- A. health + content ----------
  const health = await req('GET', '/api/health');
  ok('A-1 health 200', health.status === 200, JSON.stringify(health.body));
  ok('A-2 health shape', health.body?.status === 'ok' && typeof health.body.version === 'string' && typeof health.body.contentVersion === 'string');

  const pack = await req('GET', '/api/content/pack');
  ok('A-3 pack 200', pack.status === 200);
  const etag = pack.headers.etag;
  ok('A-4 pack etag == contentVersion', etag === `"${health.body.contentVersion}"` || etag === health.body.contentVersion, `etag=${etag}`);
  const packBytes = Buffer.byteLength(pack.raw);
  ok('A-5 QX-4 pack < 2MB', packBytes < 2 * 1024 * 1024, `${packBytes}b`);
  ok('A-6 cache-control', /max-age=\d+/.test(pack.headers['cache-control'] ?? ''), pack.headers['cache-control']);
  const nm = await req('GET', '/api/content/pack', { headers: { 'if-none-match': etag } });
  ok('A-7 304 on matching etag', nm.status === 304);
  const nm2 = await req('GET', '/api/content/pack', { headers: { 'if-none-match': '"stale"' } });
  ok('A-8 200 on stale etag', nm2.status === 200);

  const P = pack.body;
  // ---------- B. content rules ([C]) on the DEPLOYED pack ----------
  const quests = P.quests ?? [];
  const byTrack = (t) => quests.filter((q) => q.track === t);
  ok('B-1 SKL-1 skills >= 28', (P.skills ?? []).length >= 28, `${P.skills?.length}`);
  const tracks = [...new Set(P.skills.map((s) => s.track))];
  ok('B-2 SKL-1 7 tracks', tracks.length === 7, tracks.join(','));
  let capstoneOk = true, tierOk = true;
  for (const t of tracks) {
    const inTree = P.skills.filter((s) => s.track === t);
    if (inTree.filter((s) => s.tier === 3).length !== 1) capstoneOk = false;
    if (!inTree.some((s) => s.tier === 1) || !inTree.some((s) => s.tier === 2)) tierOk = false;
  }
  ok('B-3 SKL-1 exactly 1 capstone per tree', capstoneOk);
  ok('B-4 SKL-1 tier1+tier2 present per tree', tierOk);
  const skillById = new Map(P.skills.map((s) => [s.id, s]));
  let dagOk = true, tierStepOk = true;
  const done = new Set();
  const visit = (id, stack = new Set()) => {
    if (stack.has(id)) { dagOk = false; return; }
    if (done.has(id)) return;
    stack.add(id);
    for (const p of skillById.get(id)?.prerequisites ?? []) visit(p, stack);
    stack.delete(id); done.add(id);
  };
  for (const s of P.skills) {
    visit(s.id);
    if (s.tier > 1) {
      const preTiers = (s.prerequisites ?? []).map((p) => skillById.get(p)?.tier ?? 0);
      if (!preTiers.includes(s.tier - 1)) tierStepOk = false;
    }
  }
  ok('B-5 SKL-1 prerequisite graph is a DAG', dagOk);
  ok('B-6 SKL-1 no tier skipping', tierStepOk);

  const cos = P.cosmetics ?? [];
  ok('B-7 COS-1 cosmetics >= 60', cos.length >= 60, `${cos.length}`);
  const slots = ['avatarFrame', 'campBanner', 'title', 'campDecoration', 'uiAccent', 'badgeFrame'];
  const slotCounts = Object.fromEntries(slots.map((s) => [s, cos.filter((c) => c.slot === s).length]));
  ok('B-8 COS-1 >=5 per slot (6 slots)', slots.every((s) => slotCounts[s] >= 5), JSON.stringify(slotCounts));
  ok('B-9 COS-1 effect == cosmetic', cos.every((c) => c.effect === 'cosmetic' || c.effect?.kind === 'cosmetic'));
  const orphan = cos.filter((c) => !c.unlockSource || (typeof c.unlockSource === 'string' && c.unlockSource.length === 0));
  ok('B-10 COS-2 unlockSource non-empty', orphan.length === 0, `${orphan.length} orphans`);
  ok('B-11 RET-7 achievements >= 40', (P.achievements ?? []).length >= 40, `${P.achievements?.length}`);
  ok('B-12 RET-5 guilds == 4', (P.guilds ?? []).length === 4, `${P.guilds?.length}`);
  const tagCover = (P.guilds ?? []).flatMap((g) => g.tags ?? []);
  ok('B-13 RET-5 7 tags each in exactly one guild', tagCover.length === 7 && new Set(tagCover).size === 7, tagCover.join(','));
  const chains = P.chains ?? [];
  ok('B-14 RET-1 chains >= 3', chains.length >= 3, `${chains.length}`);
  ok('B-15 RET-1 every chain has exactly 4 steps', chains.every((c) => c.steps.length === 4));
  const chainSteps = chains.flatMap((c) => c.steps);
  ok('B-16 RET-1 no side quest in two chains', new Set(chainSteps).size === chainSteps.length);
  ok('B-17 RET-1 chain steps resolve to real side quests', chainSteps.every((s) => byTrack('side').some((q) => q.id === s)));
  let ceilOk = true;
  for (const ch of chains) {
    const mains = byTrack('main').filter((q) => q.world === ch.world).map((q) => q.xp);
    if (!mains.length || ch.bonusXp > Math.min(...mains)) ceilOk = false;
  }
  ok('B-18 RET-3 chain bonus <= cheapest main quest XP of its world', ceilOk);
  const bosses = quests.filter((q) => q.track === 'boss' || q.track === 'raid');
  const perWorld = [1, 2, 3, 4, 5].map((w) => bosses.filter((x) => x.world === w).length);
  ok('B-19 BSX-1 exactly 1 boss per world (5)', perWorld.every((n) => n === 1), perWorld.join(','));
  ok('B-20 BSX-1 boss-strange-room stays in world 3', bosses.some((x) => x.id === 'boss-strange-room' && x.world === 3));
  ok('B-21 dungeons >= 16', (P.dungeons ?? []).length >= 16, `${P.dungeons?.length}`);

  // ---------- C. authn / authz / problem shape ----------
  const noAuth = await req('GET', '/api/players/p-nobody/save');
  ok('C-1 401 without token', noAuth.status === 401);
  ok('C-2 problem+json content type', (noAuth.headers['content-type'] ?? '').includes('application/problem+json'), noAuth.headers['content-type']);
  ok('C-3 problem body has code+title', typeof noAuth.body?.code === 'string' && typeof noAuth.body?.title === 'string', JSON.stringify(noAuth.body));
  const badAuth = await req('GET', '/api/players/p-nobody/save', { token: 'garbage' });
  ok('C-4 401 with bad token', badAuth.status === 401);

  const a = (await req('POST', '/api/players')).body;
  const b = (await req('POST', '/api/players')).body;
  ok('C-5 POST /players issues id+token', !!a.playerId && !!a.token && a.playerId !== b.playerId);
  const cross = await req('GET', `/api/players/${b.playerId}/save`, { token: a.token });
  ok('C-6 403 on other player save', cross.status === 403, `${cross.status}`);
  const missing = await req('GET', `/api/players/${a.playerId}/save`, { token: a.token });
  ok('C-7 404 when no save yet', missing.status === 404, `${missing.status}`);

  // ---------- D. new systems end-to-end ----------
  const mainQ = byTrack('main').filter((q) => q.levelRequired <= 1 && (q.prerequisites ?? []).length === 0);
  ok('D-0 a level-1 main quest exists', mainQ.length > 0);
  const q1 = mainQ[0];
  const claim = (q, at) => act('claimQuest', { questId: q.id, checkedConditions: q.victoryConditions.map((_, i) => i) }, at);
  let r = await req('POST', `/api/players/${a.playerId}/actions`, {
    token: a.token, headers: { 'if-match': '*' },
    body: { actions: [act('rest', {}, iso(0)), claim(q1, iso(0))] },
  });
  ok('D-1 first action batch 200', r.status === 200, `${r.status} ${r.raw.slice(0, 200)}`);
  if (r.status !== 200) { console.log(`\nSUMMARY pass=${pass} fail=${fail}`); return; }
  let state = r.body.state;
  let saveEtag = r.body.etag;
  const ev = r.body.results.flatMap((x) => x.events.map((e) => e.type));
  ok('D-2 MST-2 quest XP feeds every tagged mastery track',
    q1.tags.every((t) => (state.mastery?.[t]?.xp ?? 0) >= q1.xp), JSON.stringify(q1.tags.map((t) => [t, state.mastery?.[t]?.xp])));
  const untagged = Object.keys(state.mastery ?? {}).filter((t) => !q1.tags.includes(t));
  ok('D-3 MST-1 no XP bleed into untagged tracks', untagged.every((t) => state.mastery[t].xp === 0));
  ok('D-4 RET-5 reputation granted, all values >= 0',
    Object.values(state.reputation ?? {}).some((v) => (v?.rep ?? v) > 0) && Object.values(state.reputation ?? {}).every((v) => (v?.rep ?? v) >= 0),
    JSON.stringify(state.reputation));
  const got = await req('GET', `/api/players/${a.playerId}/save`, { token: a.token });
  ok('D-5 SVX-1 schemaVersion 2', got.body.schemaVersion === 2, `${got.body?.schemaVersion}`);
  ok('D-6 events include QUEST_COMPLETED', ev.includes('QUEST_COMPLETED'), ev.join(','));
  // plan.md P-24: `appendReplay` has exactly one caller (boss.ts), so a quest claim must NOT write a replay entry.
  ok('D-7 replayLog present and boss-only (empty after a quest claim)', Array.isArray(state.replayLog) && state.replayLog.length === 0, `${state.replayLog?.length}`);

  const dupAction = claim(q1, iso(0));
  const firstRest = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, headers: { 'if-match': saveEtag }, body: { actions: [act('rest', {}, iso(0))] } });
  saveEtag = firstRest.body.etag;
  const idem1 = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, headers: { 'if-match': saveEtag }, body: { actions: [dupAction] } });
  ok('D-8 duplicate quest claim -> ALREADY_COMPLETED', idem1.status >= 400 && JSON.stringify(idem1.body).includes('ALREADY_COMPLETED'), JSON.stringify(idem1.body).slice(0, 160));
  const restA = act('rest', {}, iso(0));
  const rr1 = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, headers: { 'if-match': saveEtag }, body: { actions: [restA] } });
  saveEtag = rr1.body.etag;
  const rr2 = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, headers: { 'if-match': saveEtag }, body: { actions: [restA] } });
  ok('D-9 BE-12 same actionId replays, not re-applied', rr2.body?.results?.[0]?.status === 'replayed', JSON.stringify(rr2.body?.results?.[0] ?? {}).slice(0, 120));
  const staleBatch = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, headers: { 'if-match': '"stale-etag"' }, body: { actions: [act('rest', {}, iso(0))] } });
  ok('D-9b stale If-Match on actions -> 409', staleBatch.status === 409, `${staleBatch.status}`);

  const badType = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [{ actionId: crypto.randomUUID(), type: 'mineBitcoin', at: iso(0), payload: {} }] } });
  ok('D-10 unknown action type -> 400', badType.status === 400, `${badType.status}`);
  const skew = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [act('rest', {}, new Date(Date.now() + 3600e3).toISOString())] } });
  ok('D-11 clock skew > 5min rejected', skew.status >= 400, `${skew.status}`);
  const tooMany = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: Array.from({ length: 51 }, () => act('rest', {}, iso(0))) } });
  ok('D-12 batch > 50 rejected', tooMany.status === 400, `${tooMany.status}`);

  // ---------- E. boss v2 ----------
  const boss3 = bosses.find((x) => x.id === 'boss-strange-room') ?? bosses[0];
  const scoreOf = (total) => {
    const cats = ['story', 'editing', 'camera', 'visualCraft', 'animation', 'audioPost'];
    const out = {}; let left = total;
    for (const cat of cats) { const v = Math.max(0, Math.min(10, left)); out[cat] = v; left -= v; }
    return out;
  };
  const attempt = async (total, difficulty, day) => req('POST', `/api/players/${a.playerId}/actions`, {
    token: a.token,
    body: { actions: [...Array.from({ length: 6 }, () => act('rest', {}, iso(day))), act('bossAttempt', { bossId: boss3.id, scores: scoreOf(total), difficulty }, iso(day))] },
  });
  const tierOfLast = (res) => res.body?.state?.bossAttempts?.at(-1)?.tier;
  const h40 = await attempt(40, 'hard', 1);
  ok('E-1 hard 40 -> failed', tierOfLast(h40) === 'failed', `${h40.status} ${tierOfLast(h40) ?? h40.raw.slice(0, 160)}`);
  const h41 = await attempt(41, 'hard', 2);
  ok('E-2 BSX-2 hard 41 -> mvp', tierOfLast(h41) === 'mvp', `${tierOfLast(h41)}`);
  const h51 = await attempt(51, 'hard', 3);
  ok('E-3 BSX-2 hard 51 -> mvp (52 is the advanced cut)', tierOfLast(h51) === 'mvp', `${tierOfLast(h51)}`);
  const h52 = await attempt(52, 'hard', 3);
  ok('E-4 BSX-2 hard 52 -> advanced', tierOfLast(h52) === 'advanced', `${tierOfLast(h52)}`);
  const h59 = await attempt(59, 'hard', 4);
  ok('E-5 BSX-2 hard 59 -> advanced', tierOfLast(h59) === 'advanced', `${tierOfLast(h59)}`);
  const h60 = await attempt(60, 'hard', 4);
  ok('E-6 BSX-2 hard 60 -> mastery', tierOfLast(h60) === 'mastery', `${tierOfLast(h60)}`);
  const s41 = await attempt(41, 'standard', 5);
  ok('E-7 BSX-2 no inversion: hard-mvp score is >= mvp on standard', ['mvp', 'advanced', 'mastery'].includes(tierOfLast(s41)), `${tierOfLast(s41)}`);
  const s52 = await attempt(52, 'standard', 5);
  ok('E-8 BSX-2 no inversion: hard-advanced score is >= advanced on standard', ['advanced', 'mastery'].includes(tierOfLast(s52)), `${tierOfLast(s52)}`);
  const worse = await attempt(12, 'hard', 6);
  const hardAttempts = worse.body.state.bossAttempts.filter((x) => x.bossId === boss3.id && x.difficulty === 'hard');
  ok('E-9 BSX-3 personal best never decreases', Math.max(...hardAttempts.map((x) => x.total)) === 60, hardAttempts.map((x) => x.total).join(','));
  const rematch = await attempt(30, 'hard', 6);
  ok('E-10 BSX-4 rematch has no cooldown', rematch.status === 200, `${rematch.status}`);
  const bossEvents = worse.body.results.flatMap((x) => x.events).filter((e) => e.type === 'BOSS_ATTEMPT_LOGGED');
  ok('E-11 BSX-5 coaching message on failed hard attempt',
    bossEvents.some((e) => /Weakest category: .*Recommended side quest: /.test(JSON.stringify(e.data))), JSON.stringify(bossEvents[0]?.data ?? {}).slice(0, 220));
  const replayBossEntries = rematch.body.state.replayLog.filter((x) => JSON.stringify(x).includes('boss'));
  ok('E-12 BSX-6 every attempt written to replayLog', replayBossEntries.length >= 10, `${replayBossEntries.length} boss entries / ${rematch.body.state.replayLog.length} total`);
  const badDiff = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [act('bossAttempt', { bossId: boss3.id, scores: scoreOf(30), difficulty: 'directorsCut' }, iso(6))] } });
  ok('E-13 unknown difficulty rejected', badDiff.status >= 400, `${badDiff.status}`);
  const badScore = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [act('bossAttempt', { bossId: boss3.id, scores: { ...scoreOf(30), story: 11 } }, iso(6))] } });
  ok('E-14 out-of-range score rejected', badScore.status >= 400, `${badScore.status}`);

  // ---------- F. prestige / respec / campLayout ----------
  const stateBefore = rematch.body.state;
  const prest = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [act('prestigeMastery', { tag: q1.tags[0] }, iso(7))] } });
  ok('F-1 MST-3 prestige below level 10 -> PREREQ_NOT_MET', prest.status >= 400 && JSON.stringify(prest.body).includes('PREREQ_NOT_MET'), JSON.stringify(prest.body).slice(0, 160));
  const layoutSlots = { avatarFrame: null, campBanner: null, title: null, campDecoration: null, uiAccent: null, badgeFrame: null };
  const partial = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [act('setCampLayout', { slots: { avatarFrame: null } }, iso(7))] } });
  ok('F-1b setCampLayout rejects a partial slot object', partial.status >= 400, `${partial.status}`);
  const layout = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [act('setCampLayout', { slots: layoutSlots }, iso(7))] } });
  ok('F-2 COS-4 setCampLayout applies', layout.status === 200, `${layout.status} ${layout.raw.slice(0, 200)}`);
  if (layout.status === 200) {
    const after = layout.body.state;
    ok('F-3 COS-4 campLayout leaves progression untouched',
      after.level === stateBefore.level && after.xp === stateBefore.xp && JSON.stringify(after.mastery) === JSON.stringify(stateBefore.mastery) && JSON.stringify(after.reputation) === JSON.stringify(stateBefore.reputation));
  }
  const respecEmpty = await req('POST', `/api/players/${a.playerId}/actions`, { token: a.token, body: { actions: [act('respecTree', { track: q1.tags[0] }, iso(7))] } });
  ok('F-4 SKL-3 respec with nothing unlocked -> PREREQ_NOT_MET', respecEmpty.status >= 400 && JSON.stringify(respecEmpty.body).includes('PREREQ_NOT_MET'), JSON.stringify(respecEmpty.body).slice(0, 140));

  const envelope = (save) => ({ schemaVersion: save.schemaVersion, updatedAt: save.updatedAt, state: save.state });
  // ---------- G. save PUT / ETag / history / restore / v1 ----------
  const c = (await req('POST', '/api/players')).body;
  const cur = (await req('GET', `/api/players/${a.playerId}/save`, { token: a.token })).body;
  const noIfMatch = await req('PUT', `/api/players/${c.playerId}/save`, { token: c.token, body: envelope(cur) });
  ok('G-1 PUT without If-Match -> 409', noIfMatch.status === 409, `${noIfMatch.status}`);
  const put1 = await req('PUT', `/api/players/${c.playerId}/save`, { token: c.token, headers: { 'if-match': '*' }, body: envelope(cur) });
  ok('G-2 PUT If-Match:* first write 200', put1.status === 200, `${put1.status} ${put1.raw.slice(0, 200)}`);
  const put2 = await req('PUT', `/api/players/${c.playerId}/save`, { token: c.token, headers: { 'if-match': '*' }, body: envelope(cur) });
  ok('G-3 second If-Match:* -> 409', put2.status === 409, `${put2.status}`);
  const putStale = await req('PUT', `/api/players/${c.playerId}/save`, { token: c.token, headers: { 'if-match': '"nope"' }, body: envelope(cur) });
  ok('G-4 stale ETag -> 409', putStale.status === 409, `${putStale.status}`);
  const putOk = await req('PUT', `/api/players/${c.playerId}/save`, { token: c.token, headers: { 'if-match': put1.body.etag }, body: envelope(cur) });
  ok('G-5 correct ETag -> 200; ETag is a content hash (same state, same ETag)', putOk.status === 200 && putOk.body.etag === put1.body.etag, `${putOk.status} ${putOk.body?.etag}`);
  const mutated = envelope(cur);
  mutated.state = { ...mutated.state, coins: mutated.state.coins + 1 };
  const putChanged = await req('PUT', `/api/players/${c.playerId}/save`, { token: c.token, headers: { 'if-match': putOk.body.etag }, body: mutated });
  ok('G-5b changed state -> new ETag', putChanged.status === 200 && putChanged.body.etag !== putOk.body.etag, `${putChanged.status} ${putChanged.body?.etag}`);
  const junk = await req('PUT', `/api/players/${c.playerId}/save`, { token: c.token, headers: { 'if-match': putOk.body.etag }, body: { schemaVersion: 2, updatedAt: new Date().toISOString(), state: { nope: 1 } } });
  ok('G-6 SV-2 junk state -> 400', junk.status === 400 && JSON.stringify(junk.body).includes('INVALID'), JSON.stringify(junk.body).slice(0, 160));
  const hist = await req('GET', `/api/players/${c.playerId}/save/history`, { token: c.token });
  const snaps = hist.body?.snapshots ?? [];
  ok('G-7 history lists snapshots', hist.status === 200 && snaps.length >= 1, `${snaps.length}`);
  const snapId = snaps[0]?.snapshotId ?? snaps[0]?.id;
  const restore = await req('POST', `/api/players/${c.playerId}/save/restore`, { token: c.token, body: { snapshotId: snapId } });
  ok('G-8 restore 200', restore.status === 200, `${restore.status} ${restore.raw.slice(0, 160)}`);
  const restore404 = await req('POST', `/api/players/${c.playerId}/save/restore`, { token: c.token, body: { snapshotId: '00000000-0000-4000-8000-000000000000' } });
  ok('G-9 restore unknown snapshot -> 404', restore404.status === 404, `${restore404.status}`);

  const v1 = JSON.parse(JSON.stringify(cur.state));
  for (const k of ['mastery', 'reputation', 'replayLog', 'campLayout', 'completedChainIds', 'masteryPoints', 'respecAt']) delete v1[k];
  v1.schemaVersion = 1;
  const d = (await req('POST', '/api/players')).body;
  const putV1 = await req('PUT', `/api/players/${d.playerId}/save`, { token: d.token, headers: { 'if-match': '*' }, body: { schemaVersion: 1, updatedAt: new Date().toISOString(), state: v1 } });
  ok('G-10 SVX-1 server refuses un-migrated v1 state', putV1.status === 400, `${putV1.status} ${putV1.raw.slice(0, 200)}`);

  // ---------- H. transfer ----------
  const code = await req('POST', `/api/players/${a.playerId}/transfer-code`, { token: a.token });
  ok('H-1 transfer-code 201 with expiry', code.status === 201 && !!code.body.code && !!code.body.expiresAt, `${code.status}`);
  const redeem = await req('POST', '/api/transfer/redeem', { body: { code: code.body.code } });
  ok('H-2 redeem 201 with new playerId', redeem.status === 201 && redeem.body.playerId !== a.playerId, `${redeem.status}`);
  const movedSave = await req('GET', `/api/players/${redeem.body.playerId}/save`, { token: redeem.body.token });
  ok('H-3 transferred save readable by new token', movedSave.status === 200 && movedSave.body.state.level === cur.state.level, `${movedSave.status}`);
  const reuse = await req('POST', '/api/transfer/redeem', { body: { code: code.body.code } });
  ok('H-4 reused code -> 410', reuse.status === 410, `${reuse.status}`);
  const ghost = await req('POST', '/api/transfer/redeem', { body: { code: 'ZZZZ-ZZZZ-ZZZZ' } });
  ok('H-5 unknown code -> 410 (no existence leak)', ghost.status === 410, `${ghost.status}`);

  // ---------- J. side quest chain (fresh player) ----------
  const ch = chains[0];
  const chQuests = ch.steps.map((id) => quests.find((q) => q.id === id));
  const cp = (await req('POST', '/api/players')).body;
  let chainEvents = [], chainState = null, chainStatus = 0;
  for (let i = 0; i < chQuests.length; i++) {
    const q = chQuests[i];
    const res = await req('POST', `/api/players/${cp.playerId}/actions`, {
      token: cp.token,
      body: { actions: [...Array.from({ length: 6 }, () => act('rest', {}, iso(8 + i))), claim(q, iso(8 + i))] },
    });
    chainStatus = res.status;
    if (res.status !== 200) { chainEvents = [`HTTP ${res.status} ${res.raw.slice(0, 160)}`]; break; }
    chainEvents = res.body.results.flatMap((x) => x.events);
    chainState = res.body.state;
  }
  ok('J-1 all 4 chain steps claimable in order', chainStatus === 200, JSON.stringify(chainEvents).slice(0, 200));
  if (chainStatus === 200) {
    ok('J-2 RET-2 CHAIN_COMPLETED fires on step 4', chainEvents.some((e) => e.type === 'CHAIN_COMPLETED'), chainEvents.map((e) => e.type).join(','));
    ok('J-3 RET-2 chain id recorded once', (chainState.completedChainIds ?? []).filter((x) => x === ch.id).length === 1, JSON.stringify(chainState.completedChainIds));
    const xpAfter = chainState.xp;
    const repeatable = chQuests[3].repeatable;
    if (repeatable) {
      const again = await req('POST', `/api/players/${cp.playerId}/actions`, {
        token: cp.token,
        body: { actions: [...Array.from({ length: 6 }, () => act('rest', {}, iso(13))), claim(chQuests[3], iso(13))] },
      });
      const evs = again.body?.results?.flatMap((x) => x.events) ?? [];
      ok('J-4 RET-2 bonus is not granted twice', again.status === 200 && !evs.some((e) => e.type === 'CHAIN_COMPLETED'), `${again.status} ${evs.map((e) => e.type).join(',')}`);
      ok('J-5 SQ-2 repeat completion pays diminished XP', again.body.state.xp - xpAfter < chQuests[3].xp, `${again.body?.state?.xp - xpAfter} < ${chQuests[3].xp}`);
    } else {
      const again = await req('POST', `/api/players/${cp.playerId}/actions`, { token: cp.token, body: { actions: [claim(chQuests[3], iso(13))] } });
      ok('J-4 non-repeatable step 4 refuses a second completion', again.status >= 400 && JSON.stringify(again.body).includes('NOT_REPEATABLE'), JSON.stringify(again.body).slice(0, 140));
    }
    ok('J-6 RET-5 chain run grants reputation only upward', Object.values(chainState.reputation).every((v) => v >= 0) && Object.values(chainState.reputation).some((v) => v > 0), JSON.stringify(chainState.reputation));
    ok('J-7 MST-2 mastery moved on every tag touched by the chain',
      [...new Set(chQuests.flatMap((q) => q.tags))].every((t) => chainState.mastery[t].xp > 0),
      JSON.stringify(Object.fromEntries(Object.entries(chainState.mastery).map(([k, v]) => [k, v.xp]))));
  }

  // ---------- K. skill unlock + respec cooldown ----------
  const sp = (await req('POST', '/api/players')).body;
  const cheapMains = byTrack('main').filter((q) => q.levelRequired <= 1 && (q.prerequisites ?? []).length === 0);
  let kState = null, kEtag;
  for (let i = 0; i < cheapMains.length && i < 4; i++) {
    const res = await req('POST', `/api/players/${sp.playerId}/actions`, {
      token: sp.token,
      body: { actions: [...Array.from({ length: 8 }, () => act('rest', {}, iso(9 + i))), claim(cheapMains[i], iso(9 + i))] },
    });
    if (res.status === 200) { kState = res.body.state; kEtag = res.body.etag; }
  }
  ok('K-1 PRG level-up grants skill points', (kState?.skillPoints ?? 0) >= 1 || (kState?.level ?? 1) > 1, `level=${kState?.level} skillPoints=${kState?.skillPoints}`);
  const tier1 = P.skills.filter((s) => s.tier === 1 && (s.prerequisites ?? []).length === 0);
  const affordable = tier1.find((s) => (s.cost ?? 1) <= (kState?.skillPoints ?? 0));
  if (affordable) {
    const unlock = await req('POST', `/api/players/${sp.playerId}/actions`, { token: sp.token, body: { actions: [act('unlockSkill', { skillId: affordable.id }, iso(14))] } });
    ok('K-2 SKL tier-1 node unlocks with skill points', unlock.status === 200 && unlock.body.state.unlockedSkillIds.includes(affordable.id), `${unlock.status}`);
    const pointsBefore = unlock.body?.state?.skillPoints;
    const respec1 = await req('POST', `/api/players/${sp.playerId}/actions`, { token: sp.token, body: { actions: [act('respecTree', { track: affordable.track }, iso(14))] } });
    ok('K-3 SKL-3 respec refunds the spent points and clears the tree',
      respec1.status === 200 && respec1.body.state.skillPoints === pointsBefore + (affordable.cost ?? 1) && !respec1.body.state.unlockedSkillIds.includes(affordable.id),
      `${respec1.status} points ${pointsBefore} -> ${respec1.body?.state?.skillPoints}`);
    const respec2 = await req('POST', `/api/players/${sp.playerId}/actions`, { token: sp.token, body: { actions: [act('respecTree', { track: affordable.track }, iso(14))] } });
    ok('K-4 SKL-3 second respec inside 7 days -> RESPEC_ON_COOLDOWN', respec2.status >= 400 && JSON.stringify(respec2.body).includes('RESPEC_ON_COOLDOWN'), JSON.stringify(respec2.body).slice(0, 160));
    const capstone = P.skills.find((s) => s.tier === 3);
    const cap = await req('POST', `/api/players/${sp.playerId}/actions`, { token: sp.token, body: { actions: [act('unlockSkill', { skillId: capstone.id }, iso(14))] } });
    ok('K-5 SKL-2 capstone without its gates -> PREREQ_NOT_MET', cap.status >= 400 && JSON.stringify(cap.body).includes('PREREQ_NOT_MET'), JSON.stringify(cap.body).slice(0, 160));
  } else {
    ok('K-2 SKL tier-1 node unlocks with skill points', false, 'no affordable tier-1 node after 4 quests');
  }

  // ---------- L. SVX-2 replayLog FIFO cap (505 boss attempts) ----------
  const cap = (await req('POST', '/api/players')).body;
  let capState = null, capOk = true;
  for (let batch = 0; batch < 11; batch++) {
    const actions = Array.from({ length: batch === 10 ? 5 : 50 }, () => act('bossAttempt', { bossId: boss3.id, scores: scoreOf(12), difficulty: 'hard' }, iso(15)));
    const res = await req('POST', `/api/players/${cap.playerId}/actions`, { token: cap.token, body: { actions } });
    if (res.status !== 200) { capOk = false; capState = res.raw.slice(0, 160); break; }
    capState = res.body.state;
  }
  ok('L-1 505 boss attempts accepted', capOk, typeof capState === 'string' ? capState : '');
  if (capOk) {
    ok('L-2 SVX-2 replayLog capped at 500', capState.replayLog.length === 500, `${capState.replayLog.length}`);
    ok('L-3 SVX-2 oldest entries dropped, newest kept', capState.bossAttempts.length === 505 && capState.replayLog.at(-1).kind === 'boss', `attempts=${capState.bossAttempts.length}`);
  }

  // ---------- I. perf ----------
  const perfPlayer = (await req('POST', '/api/players')).body;
  const times = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await req('POST', `/api/players/${perfPlayer.playerId}/actions`, { token: perfPlayer.token, body: { actions: [act('rest', {}, iso(0))] } });
    times.push(performance.now() - t0);
  }
  times.sort((x, y) => x - y);
  const p95 = times[Math.floor(times.length * 0.95) - 1];
  ok('I-1 action round trip p95 < 100ms', p95 < 100, `p95=${p95.toFixed(1)}ms median=${times[10].toFixed(1)}ms`);

  // ---------- M. rate limit (runs last: it burns the anonymous quota for a minute) ----------
  let limited = null;
  for (let i = 0; i < 60 && limited === null; i++) {
    const res = await req('POST', '/api/players');
    if (res.status === 429) limited = res;
  }
  ok('M-1 anonymous global route rate-limited', limited !== null, limited ? `429 after quota` : 'no 429 in 60 calls');
  if (limited) {
    ok('M-2 429 carries retry-after', !!limited.headers['retry-after'], `retry-after=${limited.headers['retry-after']}`);
    ok('M-3 429 is problem+json', (limited.headers['content-type'] ?? '').includes('problem+json'), limited.headers['content-type']);
  }

  console.log(`\nSUMMARY pass=${pass} fail=${fail}`);
  if (fails.length) console.log('FAILED:\n' + fails.join('\n'));
}
main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
