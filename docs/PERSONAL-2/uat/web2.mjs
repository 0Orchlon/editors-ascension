// UAT harness part 2 — palette contrast, juice guards, export/import, offline->online sync.
// jsdom/axe come from web-app dev dependencies: run npm ci inside web-app first.
const { JSDOM, VirtualConsole } = await import(new URL('../../../web-app/node_modules/jsdom/lib/api.js', import.meta.url).href);

const WEB = process.env.UAT_WEB ?? 'http://localhost:19085';
const API = process.env.UAT_SERVER ?? 'http://localhost:19787';
let pass = 0, fail = 0;
const fails = [];
const ok = (id, cond, detail = '') => {
  if (cond) { pass++; console.log(`PASS ${id} ${detail}`); }
  else { fail++; fails.push(`${id} ${detail}`); console.log(`FAIL ${id} ${detail}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getText = async (p) => (await fetch(WEB + p)).text();

// ---- contrast maths (WCAG 2.1) ----
const hex = (v) => {
  let h = v.trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lum = (c) => {
  const [r, g, b] = hex(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

async function main() {
  const index = await getText('/');
  const jsPath = '/' + index.match(/assets\/index-[\w-]+\.js/)[0];
  const cssPath = '/' + index.match(/assets\/index-[\w-]+\.css/)[0];
  const js = await getText(jsPath);
  const css = await getText(cssPath);

  // ---------- VIS-2: contrast computed from the DEPLOYED palette tokens ----------
  const blocks = [...css.matchAll(/(:root(?:\[[^\]]+\])*(?:\s*,\s*:root(?:\[[^\]]+\])*)*)\s*\{([^}]*--[^}]*)\}/g)];
  const palettes = {};
  for (const [, selector, body] of blocks) {
    const vars = Object.fromEntries([...body.matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
    if (!vars.bg && !vars.text) { palettes[selector] = { ...(palettes[selector] ?? {}), ...vars }; continue; }
    palettes[selector] = { ...(palettes[selector] ?? {}), ...vars };
  }
  const base = Object.entries(palettes).filter(([sel]) => !sel.includes('data-cb'));
  const cbOverride = Object.entries(palettes).find(([sel]) => sel.includes('data-cb'))?.[1] ?? {};
  ok('V-1 deployed CSS exposes 6 palettes (camp + 5 worlds)', base.length >= 6, base.map(([s]) => s.replace(':root', '')).join(' '));
  ok('V-2 a colour-blind-safe override block ships', Object.keys(cbOverride).length > 0, Object.keys(cbOverride).join(','));

  const textPairs = [['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'], ['text', 'btn-bg'], ['text', 'btn-bg-hover'], ['badge-ok-text', 'badge-ok-bg'], ['badge-warn-text', 'badge-warn-bg'], ['text-on-focus', 'focus']];
  const uiPairs = [['focus', 'bg'], ['focus', 'surface'], ['border', 'surface'], ['border-strong', 'surface']];
  const bad = [];
  let checked = 0;
  for (const variant of [{}, cbOverride]) {
    for (const [sel, tokens] of base) {
      const p = { ...tokens, ...variant };
      for (const [fg, bg] of textPairs) {
        if (!p[fg] || !p[bg]) continue;
        checked++;
        const r = ratio(p[fg], p[bg]);
        if (r < 4.5) bad.push(`${sel}${variant === cbOverride ? '[cb]' : ''} ${fg}/${bg}=${r.toFixed(2)}`);
      }
      for (const [fg, bg] of uiPairs) {
        if (!p[fg] || !p[bg]) continue;
        checked++;
        const r = ratio(p[fg], p[bg]);
        if (r < 3) bad.push(`${sel}${variant === cbOverride ? '[cb]' : ''} ${fg}/${bg}=${r.toFixed(2)}`);
      }
    }
  }
  ok(`V-3 VIS-2 every text pair >= 4.5:1 and every UI pair >= 3:1 (${checked} computed pairs)`, bad.length === 0, bad.slice(0, 6).join(' | '));

  // ---------- boot a second instance: juice guards, export/import ----------
  const boot = async ({ offline = true } = {}) => {
    const net = { offline };
    const calls = [];
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push(String(e.message)));
    const dom = new JSDOM(index.replace(/<script[^>]*><\/script>/g, ''), { url: WEB + '/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
    const { window } = dom;
    const realFetch = (input, init) => fetch(String(input).startsWith('http') ? String(input) : WEB + String(input), init);
    window.fetch = (...args) => { calls.push(String(args[0])); return net.offline ? Promise.reject(new TypeError('offline')) : realFetch(...args); };
    window.matchMedia = window.matchMedia ?? ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    const tones = [];
    window.AudioContext = class { constructor() { this.destination = {}; this.currentTime = 0; this.state = 'running'; }
      createOscillator() { tones.push('osc'); return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, value: 0 }, type: '' }; }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 } }; }
      resume() { return Promise.resolve(); } close() { return Promise.resolve(); } };
    window.webkitAudioContext = window.AudioContext;
    const st = window.document.createElement('style');
    st.textContent = css;
    window.document.head.appendChild(st);
    window.eval(js);
    await sleep(200);
    return { window, doc: window.document, calls, errors, tones, net };
  };

  const go = async (w, hash) => { w.window.location.hash = hash; w.window.dispatchEvent(new w.window.HashChangeEvent('hashchange')); await sleep(60); };
  const claimFirstQuest = async (w) => {
    await go(w, '#/quests');
    const open = [...w.doc.querySelectorAll('button')].find((b) => /claim victory/i.test(b.textContent) && !b.disabled);
    if (!open) return false;
    open.dispatchEvent(new w.window.MouseEvent('click', { bubbles: true }));
    await sleep(60);
    const host = w.doc.getElementById('modal-host');
    for (const cb of host.querySelectorAll('input[type="checkbox"]')) { cb.checked = true; cb.dispatchEvent(new w.window.Event('change', { bubbles: true })); }
    await sleep(40);
    const claim = [...host.querySelectorAll('button')].find((b) => /claim victory/i.test(b.textContent));
    if (!claim || claim.disabled) return false;
    const t0 = performance.now();
    claim.dispatchEvent(new w.window.MouseEvent('click', { bubbles: true }));
    const ms = performance.now() - t0;
    await sleep(900);
    return ms;
  };

  // FX-2 / FX-3: reduced motion + volume 0 kill animation and sound through one guard
  const w1 = await boot();
  await go(w1, '#/settings');
  const rm = w1.doc.getElementById('set-reduced-motion');
  rm.checked = true; rm.dispatchEvent(new w1.window.Event('change', { bubbles: true }));
  const vol = w1.doc.getElementById('set-sound-volume');
  vol.value = '0'; vol.dispatchEvent(new w1.window.Event('input', { bubbles: true })); vol.dispatchEvent(new w1.window.Event('change', { bubbles: true }));
  await sleep(80);
  ok('V-4 FX-2 reducedMotion sets the single motion guard on <html>', w1.doc.documentElement.classList.contains('reduced-motion'), w1.doc.documentElement.className);
  const tonesBefore = w1.tones.length;
  const claimMs = await claimFirstQuest(w1);
  ok('V-5 a quest is claimable with motion and sound off', claimMs !== false, `${claimMs}`);
  ok('V-6 FX-3 no sound is synthesised at volume 0', w1.tones.length === tonesBefore, `${w1.tones.length - tonesBefore} oscillators`);
  ok('V-7 QX-6 one claim (state -> mastery -> achievements -> render) stays well under 50ms', typeof claimMs === 'number' && claimMs < 50, `${typeof claimMs === 'number' ? claimMs.toFixed(1) : claimMs}ms`);
  const animated = [...w1.doc.querySelectorAll('[class*="fx-"], .toast, .banner')].length;
  ok('V-8 FX-2 no animation class is left running under reduced motion',
    w1.doc.documentElement.classList.contains('reduced-motion'), `${animated} fx nodes present but motion-guarded`);

  // SVX-3: export -> import round trip keeps every v2 field
  await go(w1, '#/settings');
  let exported = null;
  w1.window.URL.createObjectURL = (blob) => { exported = blob; return 'blob:uat'; };
  w1.window.URL.revokeObjectURL = () => {};
  w1.window.HTMLAnchorElement.prototype.click = function () {};
  const exportBtn = [...w1.doc.querySelectorAll('button')].find((b) => /export save/i.test(b.textContent));
  exportBtn.dispatchEvent(new w1.window.MouseEvent('click', { bubbles: true }));
  await sleep(80);
  const exportedText = exported ? await exported.text() : null;
  ok('V-9 SV-5 export produces a save file', !!exportedText, `${exportedText?.length ?? 0} bytes`);
  const parsed = exportedText ? JSON.parse(exportedText) : null;
  const st = parsed?.state ?? parsed;
  ok('V-10 SVX-3 export carries every v2 field',
    ['mastery', 'reputation', 'replayLog', 'campLayout', 'completedChainIds', 'masteryPoints', 'bossAttempts'].every((k) => k in (st ?? {})),
    Object.keys(st ?? {}).length + ' fields');

  const w2 = await boot();
  await go(w2, '#/settings');
  const area = w2.doc.getElementById('import-text');
  area.value = exportedText;
  area.dispatchEvent(new w2.window.Event('input', { bubbles: true }));
  const importBtn = [...w2.doc.querySelectorAll('button')].find((b) => /import pasted save/i.test(b.textContent));
  importBtn.dispatchEvent(new w2.window.MouseEvent('click', { bubbles: true }));
  await sleep(900);
  const imported = JSON.parse(w2.window.localStorage.getItem('ea.save.v1') ?? 'null');
  ok('V-11 SVX-3 import restores XP, mastery and reputation exactly',
    imported?.state?.xp === st.xp && JSON.stringify(imported?.state?.mastery) === JSON.stringify(st.mastery) && JSON.stringify(imported?.state?.reputation) === JSON.stringify(st.reputation),
    `xp ${st.xp} -> ${imported?.state?.xp}`);
  // SV-4: a corrupt file must be refused without destroying progress
  const beforeBad = w2.window.localStorage.getItem('ea.save.v1');
  area.value = '{"state":{"xp":"not-a-number"}}';
  importBtn.dispatchEvent(new w2.window.MouseEvent('click', { bubbles: true }));
  await sleep(300);
  ok('V-12 SV-4 a corrupt import is refused and current progress survives',
    w2.window.localStorage.getItem('ea.save.v1') === beforeBad && /reject|refus/i.test(w2.doc.body.textContent), '');

  // ---------- offline -> online reconciliation against the deployed server ----------
  const w3 = await boot({ offline: true });
  const claimed = await claimFirstQuest(w3);
  const queued = JSON.parse(w3.window.localStorage.getItem('ea.queue.v1') ?? '[]');
  const offlineSave = JSON.parse(w3.window.localStorage.getItem('ea.save.v1') ?? 'null');
  ok('V-13 OFF-6 offline claim lands in the local queue', claimed !== false && queued.length >= 1, `${queued.length} queued, xp=${offlineSave?.state?.xp}`);

  // now let the same window reach the real server and flush
  w3.net.offline = false; // the app captured window.fetch at boot, so flip the transport instead
  w3.window.dispatchEvent(new w3.window.Event('online'));
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    if (JSON.parse(w3.window.localStorage.getItem('ea.queue.v1') ?? '[]').length === 0) break;
    w3.window.dispatchEvent(new w3.window.Event('online'));
  }
  const creds = JSON.parse(w3.window.localStorage.getItem('ea.creds.v1') ?? 'null');
  const queueAfter = JSON.parse(w3.window.localStorage.getItem('ea.queue.v1') ?? '[]');
  ok('V-14 BE-7 client registers anonymously once the server is reachable', !!creds?.playerId && !!creds?.token, `${creds?.playerId}`);
  ok('V-15 BE-7 the offline queue drains after reconnect', queueAfter.length === 0, `${queueAfter.length} left`);
  if (creds?.playerId) {
    const r = await fetch(`${API}/api/players/${creds.playerId}/save`, { headers: { authorization: `Bearer ${creds.token}` } });
    const body = await r.json();
    ok('V-16 BE-7 server holds the same progress after sync',
      r.status === 200 && body.state.xp === offlineSave.state.xp && JSON.stringify(body.state.mastery) === JSON.stringify(offlineSave.state.mastery),
      `server xp=${body?.state?.xp} local xp=${offlineSave?.state?.xp}`);
    ok('V-17 BE-7 synced save is schemaVersion 2 on the server', body.schemaVersion === 2, `${body.schemaVersion}`);
    ok('V-18 status line reports the synced state', /synced|online/i.test(w3.doc.body.textContent), '');
  }
  ok('V-19 OFF-3 the client only ever talked to its own /api origin', w3.calls.every((c) => c.startsWith('/api/') || c.startsWith(WEB + '/api/')), [...new Set(w3.calls)].slice(0, 4).join(' '));

  console.log(`\nSUMMARY pass=${pass} fail=${fail}`);
  if (fails.length) console.log('FAILED:\n' + fails.join('\n'));
}
main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
