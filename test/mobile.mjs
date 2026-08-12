import pw from 'playwright';
const { chromium } = pw;
import { mockGitHub } from './mock-github.js';
import { createRequire } from 'module'; globalThis.require = createRequire(import.meta.url);
const out = []; const ok = (n,c,e='') => { out.push([c?'PASS':'FAIL',n,e]); if(!c) process.exitCode = 1; };
const br = await chromium.launch();
const ctx = await br.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
const page = await ctx.newPage();
const h = mockGitHub({}, {});
await page.route('https://api.github.com/**', (r,q) => h(r,q));
h.state.exists = true;   /* vault repo already made and app installed */
await page.route('https://github.com/login/oauth/authorize**', (route, req) => {
  const state = new URL(req.url()).searchParams.get('state') || '';
  route.fulfill({ status: 302, headers: { location: `http://localhost:8137/?code=TESTCODE&state=${state}` } });
});
await page.route('https://commitd-token-service.brenoapsdev.workers.dev/**', (route, req) =>
  route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: req.method() === 'OPTIONS' ? '' : JSON.stringify({ access_token: 'github_pat_TESTTOKEN' }) }));
await page.goto('http://localhost:8137/'); await page.waitForTimeout(500);
await page.screenshot({ path:'test/shot-landing.png' });
ok('no horizontal overflow on the landing page', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1)));
await page.click('[data-act="connect"]'); await page.waitForTimeout(300);
await page.screenshot({ path:'test/shot-connect.png' });
await page.click('#oOAuth'); await page.waitForTimeout(2200);
ok('tab bar appears once signed in', await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display === 'flex'));
ok('sidebar hidden on a phone', await page.evaluate(() => getComputedStyle(document.querySelector('.side')).display === 'none'));
await page.screenshot({ path:'test/shot-today.png' });
/* build something to look at */
await page.evaluate(() => document.querySelector('.tabbar [data-act="commit"]').click());
await page.waitForTimeout(400);
ok('compose from the tab bar opens the picker', await page.isVisible('#pInput'));
ok('touch does not steal focus', await page.evaluate(() => document.activeElement.tagName.toLowerCase() !== 'input'));
await page.screenshot({ path:'test/shot-picker.png' });
/* typing must not rebuild the input — that closes the phone keyboard per key */
await page.tap('#pInput');
await page.type('#pInput', 'gym', { delay: 60 });
ok('input keeps focus while typing (keyboard stays up)',
   await page.evaluate(() => document.activeElement?.id === 'pInput'));
ok('typed text survives the list redraws', (await page.inputValue('#pInput')) === 'gym');
/* keyboard geometry, both viewport behaviours */

await page.keyboard.press('Escape');
/* a visible-or-hidden toast must never eat taps meant for the tab bar */
await page.evaluate(() => { const t = document.querySelector('#toast'); t.textContent = 'x'; t.classList.add('on'); });
const blocker = await page.evaluate(() => {
  const el = document.querySelector('.tabbar .plus') || document.querySelector('.tabbar button');
  const r = el.getBoundingClientRect();
  return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.tabbar') ? 'tabbar' : 'blocked';
});
ok('tab bar stays tappable under a toast', blocker === 'tabbar', blocker);
await page.evaluate(() => document.querySelector('#toast').classList.remove('on'));
await page.evaluate(() => location.hash = '#/vault'); await page.waitForTimeout(600);
ok('no horizontal overflow in the app', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1)));
await page.screenshot({ path:'test/shot-vault.png' });
console.log(out.map(([s,n,e]) => `${s}  ${n}${e?'  → '+e:''}`).join('\n'));
console.log(`\n${out.filter(o=>o[0]==='PASS').length}/${out.length} passed`);
await br.close();
