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
await page.goto('http://localhost:8137/'); await page.waitForTimeout(500);
await page.screenshot({ path:'test/shot-landing.png' });
ok('no horizontal overflow on the landing page', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1)));
await page.click('[data-act="connect"]'); await page.waitForTimeout(300);
await page.screenshot({ path:'test/shot-connect.png' });
await page.fill('#oTok','t'); await page.click('#oGo'); await page.waitForTimeout(1500);
ok('tab bar appears once signed in', await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display === 'flex'));
ok('sidebar hidden on a phone', await page.evaluate(() => getComputedStyle(document.querySelector('.side')).display === 'none'));
await page.screenshot({ path:'test/shot-today.png' });
/* build something to look at */
await page.evaluate(() => document.querySelector('.tabbar [data-act="commit"]').click());
await page.waitForTimeout(400);
ok('compose from the tab bar opens the picker', await page.isVisible('#pInput'));
ok('touch does not steal focus', await page.evaluate(() => document.activeElement.tagName.toLowerCase() !== 'input'));
await page.screenshot({ path:'test/shot-picker.png' });
/* keyboard geometry, both viewport behaviours */

await page.keyboard.press('Escape');
await page.evaluate(() => location.hash = '#/vault'); await page.waitForTimeout(600);
ok('no horizontal overflow in the app', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1)));
await page.screenshot({ path:'test/shot-vault.png' });
console.log(out.map(([s,n,e]) => `${s}  ${n}${e?'  → '+e:''}`).join('\n'));
console.log(`\n${out.filter(o=>o[0]==='PASS').length}/${out.length} passed`);
await br.close();
