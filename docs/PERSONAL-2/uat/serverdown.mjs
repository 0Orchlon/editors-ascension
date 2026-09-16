// UAT: real transport, server container stopped. nginx answers /api with 502.
// jsdom/axe come from web-app dev dependencies: run npm ci inside web-app first.
const { JSDOM, VirtualConsole } = await import(new URL('../../../web-app/node_modules/jsdom/lib/api.js', import.meta.url).href);
const WEB = 'http://localhost:19085';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = async (p) => (await fetch(WEB + p)).text();

const index = await t('/');
const js = await t('/' + index.match(/assets\/index-[\w-]+\.js/)[0]);
const css = await t('/' + index.match(/assets\/index-[\w-]+\.css/)[0]);

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(String(e.message)));
const { window } = new JSDOM(index.replace(/<script[^>]*><\/script>/g, ''), { url: WEB + '/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const calls = [];
window.fetch = (input, init) => { calls.push(String(input)); return fetch(String(input).startsWith('http') ? String(input) : WEB + String(input), init); };
window.matchMedia = window.matchMedia ?? ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
window.AudioContext = class { constructor() { this.destination = {}; this.currentTime = 0; }
  createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {} }, type: '' }; }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
  resume() { return Promise.resolve(); } close() { return Promise.resolve(); } };
const st = window.document.createElement('style'); st.textContent = css; window.document.head.appendChild(st);
window.eval(js);
await sleep(600);
const doc = window.document;
const go = async (h) => { window.location.hash = h; window.dispatchEvent(new window.HashChangeEvent('hashchange')); await sleep(60); };

let out = [];
const ok = (id, c, d = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${id} ${d}`);
ok('S-1 app boots against a dead API (502) with no uncaught error', errors.length === 0, errors.slice(0, 2).join(' | '));
ok('S-2 camp renders', doc.querySelector('#app').textContent.length > 100);
await go('#/quests');
const open = [...doc.querySelectorAll('button')].find((b) => /claim victory/i.test(b.textContent) && !b.disabled);
open.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(80);
const host = doc.getElementById('modal-host');
for (const cb of host.querySelectorAll('input[type="checkbox"]')) { cb.checked = true; cb.dispatchEvent(new window.Event('change', { bubbles: true })); }
await sleep(60);
const claim = [...host.querySelectorAll('button')].find((b) => /claim victory/i.test(b.textContent));
claim.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(1200);
const save = JSON.parse(window.localStorage.getItem('ea.save.v1') ?? 'null');
const queue = JSON.parse(window.localStorage.getItem('ea.queue.v1') ?? '[]');
ok('S-3 a claim still applies and persists locally', (save?.state?.xp ?? 0) > 0, `xp=${save?.state?.xp}`);
ok('S-4 the action waits in the local queue', queue.length >= 1, `${queue.length} queued`);
const samples = [];
for (let i = 0; i < 12; i++) { samples.push(`${i * 2 + 2}s:${doc.querySelector('[data-testid="sync-status"]')?.textContent}`); await sleep(2000); }
const last = doc.querySelector('[data-testid="sync-status"]')?.textContent ?? '';
ok('S-5 the sync status line settles on a degraded state in text', /offline|sync problem/i.test(last), samples.join(' | '));
for (const s of ['#/camp', '#/skills', '#/trophies', '#/dungeons', '#/forge', '#/achievements', '#/settings', '#/side-quests']) {
  await go(s);
  ok(`S-6 ${s} renders with the API down`, doc.querySelector('#app').textContent.trim().length > 50, `${doc.querySelector('#app').textContent.trim().length} chars`);
}
console.log(out.join('\n'));
console.log(`SUMMARY pass=${out.filter((l) => l.startsWith('PASS')).length} fail=${out.filter((l) => l.startsWith('FAIL')).length}`);
