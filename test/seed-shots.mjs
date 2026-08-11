import pw from 'playwright';
const { chromium } = pw;
import { mockGitHub } from './mock-github.js';
import { createRequire } from 'module'; globalThis.require = createRequire(import.meta.url);

/* Seed a vault by writing an index.json straight into the mock repo, then let
   the app read it exactly as it would read a real one. */
const today = '2026-08-10';
const D = (n) => { const d = new Date(2026,7,10); d.setDate(d.getDate()-n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const rnd = (s => () => (s = (s*1103515245+12345) % 2147483648) / 2147483648)(7);
const SPEC = [
  ['practice-japanese','Practice Japanese','🇯🇵','study',{type:'daily'},220,.82,
    [['kana','Kana','',10],['minutes','Time','min',20]], ['{n} kana, ぬ vs め clicked','{n} kana on the train','{n} kana, N5 deck cleared']],
  ['sleep','Sleep','🌙','rest',{type:'daily'},260,.78,[['early','Before 22:00','min',30]], ['lights out {t}','{t}, phone in the kitchen']],
  ['lift','Lift','🏋️','body',{type:'n_per_week',n:3},200,.42,[['sets','Sets','',12]], ['{n} sets — push day','{n} sets, legs, regret']],
  ['read','Read','📖','mind',{type:'n_per_week',n:4},180,.55,[['pages','Pages','p',20]], ['{n}p — The Dispossessed','{n}p on the balcony']],
  ['cook-at-home','Cook at home','🍳','home',{type:'n_per_week',n:5},300,.66,[['meals','Meals','',1]], ['{n} — pasta again','{n} — proper one']],
];
const branches = [], days = {}, recent = [];
for (const [id,title,emoji,group,cadence,age,base,mets,msgs] of SPEC) {
  const metrics = mets.map(([k,label,unit,v]) => ({k,label,unit,type:'count',dir:'at_least',targets:[{from:D(age),v}]}));
  branches.push({ id,title,emoji,group,cadence,created:D(age),status:'active',mergedAt:null,checkedOut:true,
    why:`Why ${title.toLowerCase()} matters, in one sentence you will need at 11pm.`,
    topicDefs:[{id:'',implicit:true,opened:D(age),closed:null,gridMetric:mets[0][0],metrics}] });
  const d = days[id] = {};
  for (let i = age; i >= 0; i--) {
    if (rnd() > base) continue;
    const dk = D(i), m = {};
    metrics.forEach(x => { m[x.k] = Math.round(x.targets[0].v * (0.7 + rnd()*1.1)); });
    d[dk] = { n:1, m };
    if (i < 180) recent.push({ t:id, id:(1e7*rnd()|0).toString(16), ts:`${dk}T${String(7+(rnd()*13|0)).padStart(2,'0')}:${String(rnd()*59|0).padStart(2,'0')}`,
      date:dk, message: msgs[(rnd()*msgs.length)|0].replace('{n}', m[mets[0][0]]).replace('{t}','21:'+String(10+(rnd()*40|0))), metrics:m, tags:[] });
  }
}
const index = JSON.stringify({ v:1, generatedAt:new Date().toISOString(), today,
  groups:[{id:'study',label:'Study',slot:0},{id:'body',label:'Body',slot:1},{id:'mind',label:'Mind',slot:4},
          {id:'home',label:'Home',slot:3},{id:'rest',label:'Rest',slot:6},{id:'quit',label:'Quitting',slot:5}],
  branches, days, recent });
const files = { 'commitd.json': JSON.stringify({schemaVersion:1,tz:'UTC',dayBoundary:3,owner:'testuser'}),
                '.commitd/index.json': index, 'README.md':'# commitd vault' };

const h = mockGitHub(files, {});
const br = await chromium.launch();
for (const [w,hh,tag,mobile] of [[1400,1200,'desktop',false],[412,915,'mobile',true]]) {
  const ctx = await br.newContext({ viewport:{width:w,height:hh}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor:2 });
  const page = await ctx.newPage();
  await page.route('https://api.github.com/**', (r,q) => h(r,q));
  await page.goto('http://localhost:8137/');
  await page.waitForTimeout(400);
  await page.click('[data-act="connect"]'); await page.waitForTimeout(300);
  await page.fill('#oTok','t'); await page.click('#oGo'); await page.waitForTimeout(1800);
  await page.screenshot({ path:`test/app-${tag}-today.png`, fullPage:!mobile });
  await page.evaluate(() => location.hash = '#/vault'); await page.waitForTimeout(1400);
  await page.screenshot({ path:`test/app-${tag}-vault.png`, fullPage:!mobile });
  await page.evaluate(() => location.hash = '#/b/practice-japanese'); await page.waitForTimeout(1200);
  await page.screenshot({ path:`test/app-${tag}-branch.png`, fullPage:!mobile });
  await page.evaluate(() => location.hash = '#/account'); await page.waitForTimeout(700);
  await page.screenshot({ path:`test/app-${tag}-account.png`, fullPage:!mobile });
  await page.evaluate(() => location.hash = '#/insights'); await page.waitForTimeout(900);
  await page.screenshot({ path:`test/app-${tag}-insights.png`, fullPage:!mobile });
  await ctx.close();
}
await br.close();
console.log('shots written');
