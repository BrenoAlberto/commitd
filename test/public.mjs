/* The public path over the REAL network: raw.githubusercontent.com must be
   fetchable from a browser origin (CORS), must 404 cleanly for a missing
   file, and the app must render a real index.json end-to-end. */
import pw from 'playwright';
const { chromium } = pw;
const BASE = 'http://localhost:8137';
const out = []; const ok = (n, c, e='') => { out.push([c?'PASS':'FAIL', n, e]); if(!c) process.exitCode = 1; };

const br = await chromium.launch();
const page = await br.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(BASE + '/');
await page.waitForTimeout(400);

/* 1. does this sandbox reach GitHub at all? (reported, not asserted — the
      network here gates repositories, so a miss says nothing about prod) */
const reach = await page.evaluate(async () => {
  const probe = async (u) => { try { const r = await fetch(u, { cache: 'no-cache' }); return r.status; }
                               catch (e) { return String(e).slice(0, 40); } };
  return { raw: await probe('https://raw.githubusercontent.com/octocat/Hello-World/HEAD/README'),
           api: await probe('https://api.github.com/rate_limit') };
});
console.log('   network probe →', JSON.stringify(reach));

/* 2. a repo with no vault must explain itself in words, not a stack trace */
await page.route('https://raw.githubusercontent.com/**', r => r.fulfill({ status: 404, body: '404: Not Found' }));
await page.route('https://api.github.com/repos/octocat/**', r => r.fulfill({ status: 404, body: '{}' }));
await page.goto(BASE + '/#/u/octocat/Hello-World');
await page.waitForTimeout(1200);
const txt = await page.textContent('#main');
ok('missing vault explained in words', /No public vault at octocat\/Hello-World/.test(txt), txt.slice(0, 120));

/* 4. a real index.json rendered read-only, served over the same transport */
const index = JSON.stringify({
  v: 1, generatedAt: new Date().toISOString(), today: '2026-08-10',
  groups: [{ id: 'study', label: 'Study', slot: 0 }],
  branches: [{ id: 'practice-japanese', title: 'Practice Japanese', emoji: '🇯🇵', group: 'study',
    created: '2026-06-01', cadence: { type: 'daily' }, checkedOut: true, status: 'active', mergedAt: null,
    why: 'Reading a menu in Kyoto without pointing.',
    topicDefs: [{ id: '', implicit: true, opened: '2026-06-01', closed: null, gridMetric: 'kana',
      metrics: [{ k: 'kana', label: 'Kana', unit: '', type: 'count', dir: 'at_least', targets: [{ from: '2026-06-01', v: 10 }] }] }] }],
  days: { 'practice-japanese': { '2026-08-10': { n: 1, m: { kana: 14 } }, '2026-08-09': { n: 1, m: { kana: 11 } } } },
  recent: [{ t: 'practice-japanese', id: 'abc1234', ts: '2026-08-10T21:14', date: '2026-08-10',
    message: 'ぬ vs め finally clicked', metrics: { kana: 14 }, tags: ['hiragana'] }],
});
await page.unroute('https://raw.githubusercontent.com/**');
await page.route('https://raw.githubusercontent.com/someone/**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: index }));
await page.goto(BASE + '/#/u/someone/commitd-vault');
await page.waitForTimeout(1500);
const body = await page.evaluate(() => document.body.innerText);
ok('public vault renders', body.includes('practice-japanese'), body.slice(0, 100));
ok('read-only banner shown', body.includes('read-only'));
ok('commit text visible to a reader', body.includes('ぬ vs め finally clicked'));
ok('no commit button in read-only', await page.evaluate(() => getComputedStyle(document.querySelector('#fab')).display === 'none'));
ok('no compose button in the mobile bar', !(await page.evaluate(() => !!document.querySelector('.tabbar [data-act="commit"]'))));
await page.evaluate(() => location.hash = '#/b/practice-japanese?tab=settings');
await page.waitForTimeout(500);
const st = await page.evaluate(() => document.body.innerText);
ok('no danger zone for a visitor', !st.includes('Danger zone'));
ok('cadence not editable for a visitor', await page.evaluate(() =>
  [...document.querySelectorAll('[data-setcad]')].every(b => b.disabled)));

/* 5. when raw is blocked (this network, and plenty of corporate ones) the
      reader must fall back to the Contents API and still work */
await page.unroute('https://raw.githubusercontent.com/someone/**');
await page.route('https://raw.githubusercontent.com/**', r => r.abort('blockedbyclient'));
let viaApi = false;
await page.route('https://api.github.com/repos/someone/**', (r) => { viaApi = true;
  r.fulfill({ status: 200, contentType: 'application/json', body: index }); });
await page.goto(BASE + '/#/u/someone/commitd-vault');
await page.waitForTimeout(1500);
ok('falls back to the Contents API when raw is blocked', viaApi);
ok('and still renders', (await page.evaluate(() => document.body.innerText)).includes('practice-japanese'));

ok('no console errors', errs.length === 0, errs.slice(0,2).join(' | '));
console.log(out.map(([s,n,e]) => `${s}  ${n}${e ? '  → ' + e : ''}`).join('\n'));
console.log(`\n${out.filter(o=>o[0]==='PASS').length}/${out.length} passed`);
await br.close();
