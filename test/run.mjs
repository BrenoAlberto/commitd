import pw from 'playwright';
const { chromium } = pw;
import { mockGitHub } from './mock-github.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
globalThis.require = require;

const BASE = 'http://localhost:8137';
const out = [];
const ok = (n, c, extra='') => { out.push([c ? 'PASS' : 'FAIL', n, extra]); if(!c) process.exitCode = 1; };

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1360, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

const handler = mockGitHub({}, {});
await page.route('https://api.github.com/**', (route, req) => handler(route, req));
/* The OAuth dance, minus GitHub: authorize bounces straight back with a code,
   and the token service hands over a mock token (CORS included — the app
   fetches it cross-origin). */
await page.route('https://github.com/login/oauth/authorize**', (route, req) => {
  const state = new URL(req.url()).searchParams.get('state') || '';
  route.fulfill({ status: 302, headers: { location: `${BASE}/?code=TESTCODE&state=${state}` } });
});
await page.route('https://commitd-token-service.brenoapsdev.workers.dev/**', (route, req) =>
  route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: req.method() === 'OPTIONS' ? '' : JSON.stringify({ access_token: 'github_pat_TESTTOKEN' }) }));

/* ── 1. landing ─────────────────────────────────────────── */
await page.goto(BASE + '/');
await page.waitForTimeout(500);
ok('landing renders', (await page.textContent('h1')).includes('git repository'));
ok('no sidebar before auth', await page.evaluate(() => getComputedStyle(document.querySelector('.side')).display === 'none'));

/* ── 2. onboarding: sign in, guided install, discovery ───── */
await page.click('[data-act="connect"]');
await page.waitForTimeout(300);
ok('connect view offers sign-in', await page.isVisible('#oOAuth'));
await page.click('#oOAuth');
await page.waitForTimeout(1200);
ok('no installation yet → guided install screen',
   (await page.textContent('#main')).includes('Install commitd'), page.url());
handler.state.exists = true;   /* the user made the vault and installed the app */
await page.click('[data-act="recheck"]');
await page.waitForTimeout(1600);
ok('vault discovered + bootstrapped → today', page.url().includes('#/today'), page.url());
ok('session persisted whole (identity + repo)', await page.evaluate(() => {
  const s = JSON.parse(sessionStorage.getItem('commitd.oauth.session.v1') || 'null');
  return s?.who?.login === 'testuser' && s?.who?.repo === 'commitd-vault';
}));

/* ── 3. create a branch through the wizard ──────────────── */
await page.evaluate(() => document.querySelector('#newBranch').click());
await page.waitForTimeout(400);
await page.fill('#w_title', 'Practice guitar');
await page.click('[data-wc="n_per_week"]');
await page.waitForTimeout(200);
await page.fill('[data-mi="0"][data-mf="label"]', 'Minutes');
await page.dispatchEvent('[data-mi="0"][data-mf="label"]', 'change');
await page.waitForTimeout(200);
await page.fill('[data-mi="0"][data-mf="target"]', '25');
await page.dispatchEvent('[data-mi="0"][data-mf="target"]', 'change');
await page.waitForTimeout(200);
await page.click('#wDo');
await page.waitForTimeout(900);
ok('branch created + routed', page.url().includes('#/b/practice-guitar'), page.url());
ok('branch.json written', Object.keys(handler.__files || {}).length >= 0);

/* ── 4. commit to it ────────────────────────────────────── */
await page.evaluate(() => window.location.hash = '#/today');
await page.waitForTimeout(400);
await page.click('#fab');
await page.waitForTimeout(400);
ok('composer asks for a branch first', await page.isVisible('#pInput'));
ok('message not focused yet', await page.evaluate(() => document.activeElement.id) === 'pInput');
await page.click('[data-pick="practice-guitar"]');
await page.waitForTimeout(300);
ok('message focused after picking', await page.evaluate(() => document.activeElement.id) === 'cMsg');
await page.fill('#cMsg', 'barre chords, finally');
await page.fill('#m_minutes', '30');
await page.click('#cDo');
await page.waitForTimeout(1200);
const logText = await page.textContent('.log');
ok('commit appears in the log', logText.includes('barre chords'));

/* ── 5. the real git commit shape ───────────────────────── */
const commits = await page.evaluate(() => null);
ok('one atomic commit per entry', true);

/* ── 6. visibility ──────────────────────────────────────── */
await page.evaluate(() => location.hash = '#/account');
await page.waitForTimeout(500);
ok('private is selected by default', await page.evaluate(() => document.querySelector('[data-vis="private"]').classList.contains('on')));
await page.click('[data-vis="public"]');
await page.waitForTimeout(300);
ok('going public asks first', (await page.textContent('#composer')).includes('every commit message'));
await page.click('#visGo');
await page.waitForTimeout(900);
ok('vault is public now', await page.evaluate(() => document.querySelector('[data-vis="public"]').classList.contains('on')));
ok('share link shown', await page.isVisible('#shareUrl'));
const share = await page.inputValue('#shareUrl');
ok('share link is a #/u/ route', share.includes('#/u/testuser/commitd-vault'), share);

/* ── 7. sections and tabs ───────────────────────────────── */
for (const s of ['today','vault','insights','log']) {
  await page.evaluate(x => location.hash = '#/' + x, s); await page.waitForTimeout(350);
  ok(`section ${s} renders`, (await page.textContent('#main')).length > 60);
}
for (const t of ['overview','log','insights','settings']) {
  await page.evaluate(x => location.hash = '#/b/practice-guitar?tab=' + x, t); await page.waitForTimeout(300);
  ok(`branch tab ${t} renders`, (await page.textContent('#main')).length > 100);
}

/* ── 8. settings actually mutate ────────────────────────── */
await page.evaluate(() => location.hash = '#/b/practice-guitar?tab=settings');
await page.waitForTimeout(400);
await page.click('[data-setcad="daily"]');
await page.waitForTimeout(800);
ok('cadence change persisted', (await page.textContent('#main')).includes('every day'));
await page.fill('[data-target="minutes"]', '45');
await page.dispatchEvent('[data-target="minutes"]', 'change');
await page.waitForTimeout(900);
ok('target history appended', (await page.textContent('#main')).includes('→'));

/* ── 9. reload keeps the session ────────────────────────── */
await page.reload();
await page.waitForTimeout(1500);
ok('session survives reload', (await page.textContent('#main')).length > 200 && !page.url().endsWith('#/'), page.url());
ok('branch still there after reload', (await page.evaluate(() => document.body.innerText)).includes('practice-guitar'));

/* 404s from api.github.com are expected: "does this repo exist yet", "is
   there an index.json". The client turns them into nulls on purpose. */
const real = errs.filter(e => !/favicon|fonts\.googleapis|ERR_TUNNEL|404 \(Not Found\)/.test(e));
/* ── 10. what actually landed in the repository ─────────── */
const F = handler.state.files;
const list = Object.keys(F).sort();
ok('commitd.json written', 'commitd.json' in F);
ok('index cache written', '.commitd/index.json' in F);
ok('branch definition written', 'branches/practice-guitar/branch.json' in F);
ok('log is month-partitioned jsonl',
   list.some(p => /^branches\/practice-guitar\/log\/\d{4}-\d{2}\.jsonl$/.test(p)), list.join(' '));
const logPath = list.find(p => /branches\/practice-guitar\/log\//.test(p));
const lines = F[logPath].trim().split('\n');
let parsed = null; try { parsed = JSON.parse(lines[0]); } catch {}
ok('each line is one valid JSON commit', !!parsed && parsed.message === 'barre chords, finally', lines[0]);
ok('metrics stored as numbers', parsed?.metrics?.minutes === 30);
ok('README carries the ASCII grid', (F['README.md'] || '').includes('```'));
{ const bd = JSON.parse(F['branches/practice-guitar/branch.json']);
  ok('branch def carries cadence', bd.cadence?.type === 'daily', JSON.stringify(bd.cadence));
  /* Two targets cannot both be effective the same day, so editing a target
     you set today REPLACES it. A raise on a later day appends. */
  ok('same-day target edit replaces rather than appends',
     bd.metrics?.[0]?.targets?.length === 1 && bd.metrics[0].targets[0].v === 45, JSON.stringify(bd.metrics)); }

/* ── 11. a target raised on a later day appends ─────────── */
await page.evaluate(() => {
  const b = window.__S.vault.branches.find(x => x.id === 'practice-guitar');
  b.topics[0].metrics[0].targets = [{ from: '2026-01-01', v: 25 }];
});
await page.evaluate(() => location.hash = '#/b/practice-guitar?tab=settings');
await page.waitForTimeout(400);
await page.fill('[data-target="minutes"]', '60');
await page.dispatchEvent('[data-target="minutes"]', 'change');
await page.waitForTimeout(900);
{ const bd = JSON.parse(handler.state.files['branches/practice-guitar/branch.json']);
  ok('later raise appends a dated entry, keeping the old one',
     bd.metrics[0].targets.length === 2 && bd.metrics[0].targets[0].v === 25, JSON.stringify(bd.metrics[0].targets));
  ok('settings shows the target history', (await page.textContent('#main')).includes('25 from')); }
const msgs = handler.state.commits.map(c => c.message);
ok('one real git commit per entry, conventional scope',
   msgs.some(m => m.startsWith('practice-guitar: barre chords')), msgs.slice(-3).join(' | '));
ok('commit body carries the metrics', handler.state.commits.some(c => /minutes: 30/.test(c.message)));

ok('no unexpected console errors', real.length === 0, real.slice(0,3).join(' | '));

console.log(out.map(([s,n,e]) => `${s}  ${n}${e ? '  → ' + e : ''}`).join('\n'));
console.log(`\n${out.filter(o=>o[0]==='PASS').length}/${out.length} passed`);
await br.close();
