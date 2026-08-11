/* One screen answers one question.
     Today    what needs doing right now
     Vault    the shape of the whole thing
     Insights what the data says, when you sit down with it
     Log      what actually happened, in order
   Entity pages use tabs for the same reason, and every screen ends in a peek
   → link rather than swallowing the next question whole. */

import { key, parse, addD, dayDiff, esc, fmtDate, fmtShort, rel, pct, HHMM } from './util.js';
import { S } from './store.js';
import { shade } from './theme.js';
import * as M from './model.js';
import { yearGrid, miniGrid, sparkGrid, monthStrip, metricChart, weekdayCard, hourChart } from './charts.js';

export const SECTIONS = [['today','Today','◉'],['vault','Vault','▦'],['insights','Insights','◔'],['log','Log','≡']];
export const TABS_B = [['overview','Overview'],['topics','Topics'],['log','Log'],['insights','Insights'],['settings','Settings']];
export const TABS_T = [['overview','Overview'],['log','Log'],['settings','Settings']];

const BADGE = { pass:['b-pass','passing'], pend:['b-pend','pending'], fail:['b-fail','failing'],
                merged:['b-merged','merged'], open:['b-pass','open'] };
export const badge = (s) => `<span class="badge ${BADGE[s][0]}"><span class="d"></span>${BADGE[s][1]}</span>`;
export const tabs = (list, cur) => `<div class="tabs">${list.map(([k,l]) =>
  `<button data-tab="${k}" class="${cur===k?'on':''}">${l}</button>`).join('')}</div>`;
export const peek = (label, sec) => `<button class="peek" data-sec="${sec}">${esc(label)} →</button>`;
export const sechead = (t, right='') => `<div class="sechead"><h3>${esc(t)}</h3>${right?`<span style="margin-left:auto">${right}</span>`:''}</div>`;
export const tiles = (rows) => `<div class="tiles">${rows.map(([k,v,s]) =>
  `<div class="tile"><div class="k">${esc(k)}</div><div class="v">${v}</div><div class="sub">${s}</div></div>`).join('')}</div>`;

const allCommits = (v) => v.branches.flatMap(b => b.commits).sort((a,c)=> a.ts<c.ts?1:-1);

export function logList(list) {
  return list.map((c) => {
    const t = c.topic, b = t.parent;
    const mets = Object.entries(c.metrics || {}).map(([k, val]) => {
      const m = (t.metrics || []).find(x => x.k === k); if (!m) return '';
      return `${esc(m.label.toLowerCase())}: ${esc(val)}${esc(m.unit || '')}`;
    }).filter(Boolean).join(' · ');
    return `<button class="lg" data-dk="${c.date}" style="--bc:${t.color}">
      <span class="rail"><span class="node"></span></span>
      <span style="flex:1"><span class="msg"><span class="ref">${esc(t.full)}:</span>
        ${c.synthetic ? '<span class="muted">·  ·  ·</span>' : esc(c.message)}
        ${c.relapse ? ' <span class="badge b-fail"><span class="d"></span>relapse</span>' : ''}</span>
      <span class="meta"><span>${esc(c.sha || '')}</span><span>${rel(parse(c.date), parse(S.vault.today))}</span>
        ${mets ? `<span>${mets}</span>` : ''}
        ${(c.tags || []).filter(x => x !== 'relapse').map(x => `<span class="tag">${esc(x)}</span>`).join('')}</span>
      </span></button>`;
  }).join('');
}

/* ═══════════ TODAY ═══════════ */
export function todayView(v) {
  const co = v.branches.filter(b => !b.mergedAt && b.checkedOut), due = M.dueToday(v);
  const week = v.branches.reduce((s,b) => s + b.commits.filter(c => !c.relapse && dayDiff(parse(c.date), parse(v.today)) < 7).length, 0);
  const best = co.reduce((a,b) => (b.streak > (a?.streak ?? -1) ? b : a), null);
  return `
  <div class="hero"><h1>${due.length ? `${due.length} branch${due.length>1?'es':''} waiting` : 'Nothing is waiting'}</h1>
    <p>${fmtDate(parse(v.today))} · ${co.length} branches checked out${due.length ? '' : ' · everything on cadence is done'}</p></div>
  ${queue(v)}
  ${tiles([
    ['current streak', `${best?.streak ?? 0}<small>days</small>`, esc(best?.id || '—')],
    ['this week', `${week}`, 'commits in the last 7 days'],
    ['30-day uptime', `${Math.round(co.reduce((s,b)=>s+b.up30,0)/Math.max(1,co.length)*100)}<small>%</small>`, 'checked-out branches'],
  ])}
  ${sechead('Last four weeks', peek('the whole year','vault'))}
  ${monthStrip(v)}
  ${sechead('Latest', peek('full log','log'))}
  <div class="log">${logList(allCommits(v).slice(0,5))}</div>`;
}
function queue(v) {
  const due = M.dueToday(v), co = v.branches.filter(b => !b.mergedAt && b.checkedOut);
  if (!due.length) return `<div class="queue"><div class="qh"><h3>Today</h3></div>
    <div class="qdone"><span style="color:var(--good)">✓</span><span>Everything on cadence is done.
      ${v.branches.filter(b => !b.mergedAt && !b.checkedOut).length} more branches are in the vault but not checked out.</span></div></div>`;
  return `<div class="queue"><div class="qh"><h3>Today</h3>
    <span class="muted" style="font-size:12px">${due.length} of ${co.length} checked-out branches want a commit</span></div>
    ${due.map((b) => { const t = b.topics.find(x => !x.closed);
      return `<div class="qrow" style="--bc:${b.color}"><span class="sw"></span>
      <span class="qmeta"><span class="nm">${esc(t && !t.implicit ? t.full : b.id)}</span>
        <span class="cad">${esc(M.cadenceLabel(b))}${b.st === 'fail' ? ' · behind' : ''}</span></span>
      <span class="qacts">
        <button class="qb" data-open="${esc(b.id)}">details</button>
        <button class="qb go" data-quick="${esc(b.id)}">✓ done</button></span></div>`; }).join('')}
  </div>`;
}

/* ═══════════ VAULT ═══════════ */
export function vaultView(v) {
  const total = v.branches.reduce((s,b) => s + b.commits.filter(c => !c.relapse).length, 0);
  const from = addD(parse(v.today), -370);
  const yr = v.branches.reduce((s,b) => s + b.commits.filter(c => !c.relapse && c.date >= key(from)).length, 0);
  const active = v.branches.filter(b => !b.mergedAt), merged = v.branches.filter(b => b.mergedAt);
  const co = active.filter(b => b.checkedOut);
  const q = S.filter.toLowerCase(), gi = (g) => v.groups.findIndex(x => x.id === g);
  const list = v.branches.filter(b => !q || b.id.includes(q) || b.title.toLowerCase().includes(q) || b.group.includes(q))
    .sort((a,b) => (a.mergedAt?1:0)-(b.mergedAt?1:0) || gi(a.group)-gi(b.group) || a.id.localeCompare(b.id));
  return `
  <div class="hero"><h1><span class="n">${yr.toLocaleString()}</span> commits in the last year</h1>
    <p>${v.branches.length} branches in the vault · ${co.length} checked out ·
      ${active.reduce((s,b)=>s+b.openTopics.length,0)} topic branches open</p></div>
  <div class="card"><div class="card-b">${yearGrid(v)}</div></div>
  ${tiles([
    ['commits', `${total.toLocaleString()}`, `${yr} in the last year`],
    ['branches', `${active.length}`, `${co.length} checked out, ${active.length-co.length} parked`],
    ['topic branches', `${active.reduce((s,b)=>s+b.openTopics.length,0)}`,
      `${v.branches.reduce((s,b)=>s+b.mergedTopics.length,0)} merged into their parent`],
    ['merged to main', `${merged.length}`, 'habits that became identity'],
  ])}
  ${sechead('Branches', `<input class="ffilter" id="fFilter" placeholder="filter…" value="${esc(S.filter)}">
    <div class="viewsw" style="display:inline-flex;margin-left:8px;vertical-align:middle">
      <button data-bview="list" class="${S.bview==='list'?'on':''}">list</button>
      <button data-bview="cards" class="${S.bview==='cards'?'on':''}">cards</button></div>`)}
  ${S.bview === 'cards' ? branchCards(v, list) : branchTable(v, list)}
  ${S.readonly ? '' : `<div style="margin-top:16px" class="muted">${active.filter(b=>!b.checkedOut).length} parked —
    <a data-act="sparse" style="cursor:pointer;text-decoration:underline">sparse-checkout</a></div>`}`;
}
function branchTable(v, list) {
  let rows = '', lastG = null;
  list.forEach((b) => {
    if (!S.filter && b.group !== lastG) { lastG = b.group;
      rows += `<tr class="grp-row"><td colspan="6"><span class="gn">${esc((v.groups.find(g=>g.id===b.group)||{}).label || b.group)}</span></td></tr>`; }
    rows += `<tr class="b-row" data-br="${esc(b.id)}" style="--bc:${b.color}">
      <td><span class="nm"><span class="sw"></span>${esc(b.emoji)} ${esc(b.id)}${b.mergedAt?' <span class="badge b-merged"><span class="d"></span>merged</span>':''}</span>
        <div class="muted" style="font-size:11px;margin-top:2px">${b.openTopics.length ? 'on ' + esc(b.openTopics.map(t=>t.id).join(', ')) : esc(M.cadenceLabel(b))}</div></td>
      <td class="hide-s">${sparkGrid(v, b)}</td>
      <td class="r"><span class="num">${b.mergedAt ? '—' : b.streak}</span></td>
      <td class="r hide-s"><span class="num">${b.mergedAt ? '—' : pct(b.up30)}</span></td>
      <td class="r hide-s"><span class="num">${b.commits.length}</span></td>
      <td class="r">${badge(b.st)}</td></tr>`;
  });
  return `<table class="btable"><thead><tr><th>Branch</th><th class="hide-s">13 weeks</th>
    <th class="r">Streak</th><th class="r hide-s">Uptime</th><th class="r hide-s">Commits</th><th class="r">Build</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="muted" style="padding:22px 10px">No branch matches that filter.</td></tr>'}</tbody></table>`;
}
function branchCards(v, list) {
  return `<div class="bcards">${list.map(b => `
    <button class="bcard" data-br="${esc(b.id)}" style="--bc:${b.color}${b.mergedAt?';opacity:.6':''}">
      <div class="top"><span class="em">${esc(b.emoji)}</span><span class="ttl">${esc(b.id)}</span>
        <span style="margin-left:auto">${badge(b.st)}</span></div>
      <div class="cad">${b.mergedAt ? `merged into main · ${fmtShort(b.mergedAt)}`
        : b.openTopics.length ? `on <span class="mono">${esc(b.openTopics.map(t=>t.id).join(', '))}</span> · ${esc(M.cadenceLabel(b))}`
        : esc(M.cadenceLabel(b))}</div>
      ${miniGrid(v, b)}
      <div class="foot">${b.mergedAt ? `<span><b>${b.longest}</b> best streak</span>`
        : `<span><b>${b.streak}</b> streak</span><span><b>${pct(b.up30)}</b> uptime</span>`}
        <span style="margin-left:auto"><b>${b.commits.length}</b> commits</span></div></button>`).join('')}</div>`;
}

/* ═══════════ INSIGHTS ═══════════ */
export function insightsView(v) {
  const items = buildInsights(v);
  const active = v.branches.filter(b => !b.mergedAt);
  const gaps = active.filter(b => !M.isAbstain(b)).map(b => ({ b, ...M.gapsFor(b) }))
    .sort((x,y) => y.gap - x.gap).slice(0, 8);
  return `
  <div class="hero"><h1>Insights</h1>
    <p>Everything below is computed from your own commits and carries its <span class="mono">n</span>.
      Nothing here is a nudge or a guess.</p></div>
  <div class="card"><div class="card-h"><h3>Insights</h3>
    <span class="muted mono" style="margin-left:auto;font-size:11px">one vault → cross-branch correlation</span></div>
    <div class="card-b">${items.length ? items.map(i => `<div class="insight"><span style="font-size:15px">${i.icon}</span>
      <div><p>${i.text}</p><div class="n">${esc(i.n)}</div></div></div>`).join('')
      : '<p class="hint" style="margin:0">Not enough history yet. These appear once a branch has a few weeks behind it.</p>'}</div></div>
  <div class="grid2">${weekdayCard(active.flatMap(b=>b.commits), shade(2,.6), 'all active branches')}${hourChart(v.branches.flatMap(b=>b.commits))}</div>
  ${gaps.length ? `<div class="card"><div class="card-h"><h3>Breaks and recoveries</h3>
    <span class="muted mono" style="margin-left:auto;font-size:11px">restarting well beats never breaking</span></div>
    <div class="card-b"><table class="btable"><thead><tr><th>Branch</th><th class="r">Longest gap</th>
      <th class="r hide-s">Breaks</th><th class="r">Median recovery</th></tr></thead><tbody>
      ${gaps.map(r => `<tr class="b-row" data-br="${esc(r.b.id)}" style="--bc:${r.b.color}">
        <td><span class="nm"><span class="sw"></span>${esc(r.b.id)}</span></td>
        <td class="r"><span class="num">${r.gap}d</span></td>
        <td class="r hide-s"><span class="num">${r.breaks}</span></td>
        <td class="r"><span class="num">${r.median}d</span></td></tr>`).join('')}
    </tbody></table></div></div>` : ''}`;
}
/* An insight only ships when the data supports it, and always with its n. */
function buildInsights(v) {
  const out = [], active = v.branches.filter(b => !b.mergedAt);
  const all = v.branches.flatMap(b => b.commits);
  if (all.length < 20) return out;
  const wd = M.weekdayProfile(active.flatMap(b => b.commits));
  const best = wd.reduce((a,b) => b.n > a.n ? b : a), worst = wd.reduce((a,b) => b.n < a.n ? b : a);
  out.push({ icon: '📅', text: `<b>${best.day}</b> is your strongest day. <b>${worst.day}</b> is where branches go to die.`,
    n: `n=${wd.reduce((s,x)=>s+x.n,0)} commits across ${active.length} active branches` });
  const h = new Array(24).fill(0); all.forEach(c => h[+String(c.ts).slice(11,13) || 0]++);
  const peak = h.indexOf(Math.max(...h));
  out.push({ icon: '🕘', text: `You commit most around <b>${String(peak).padStart(2,'0')}:00</b>.`,
    n: `peak of ${Math.max(...h)} commits · consider moving the reminder 30min earlier` });
  /* Cross-branch correlation — the one thing a single vault buys you that
     five separate apps never can. */
  const pairs = active.filter(b => !M.isAbstain(b) && b.commits.length > 30);
  if (pairs.length >= 2) {
    let bestPair = null;
    for (const a of pairs) for (const b of pairs) {
      if (a === b) continue;
      let both = 0, aOnly = 0, bDays = 0, n = 0;
      const from = parse(a.created) > parse(b.created) ? parse(a.created) : parse(b.created);
      for (let d = from; d <= parse(v.today); d = addD(d, 1)) {
        const dk = key(d); n++;
        const hb = M.dayCount(b, dk) > 0;
        if (hb) { bDays++; if (M.dayCount(a, dk)) both++; } else if (M.dayCount(a, dk)) aOnly++;
      }
      if (n < 60 || bDays < 15 || n - bDays < 15) continue;
      const p1 = both / bDays, p0 = aOnly / (n - bDays);
      if (!p0) continue;
      const r = p1 / p0;
      if (!bestPair || Math.abs(Math.log(r)) > Math.abs(Math.log(bestPair.r))) bestPair = { a, b, r, n, p1, p0 };
    }
    if (bestPair && bestPair.r >= 1.2) out.unshift({ icon: '🔗',
      text: `<span class="mono">${esc(bestPair.a.id)}</span> commits are <b>${bestPair.r.toFixed(1)}×</b> more likely on days you also did <span class="mono">${esc(bestPair.b.id)}</span>.`,
      n: `n=${bestPair.n} days · ${pct(bestPair.p1)} vs ${pct(bestPair.p0)} · correlation, not cause — but it's your data` });
  }
  return out;
}

/* ═══════════ LOG ═══════════ */
export function logView(v) {
  const q = (S.logFilter || '').toLowerCase();
  const all = allCommits(v).filter(c => !q || c.topic.full.includes(q)
    || (c.message || '').toLowerCase().includes(q) || (c.tags || []).some(t => t.includes(q)));
  const n = S.logN || 40, page = all.slice(0, n);
  return `
  <div class="hero"><h1>git log</h1>
    <p>${all.length.toLocaleString()} commits${q ? ` matching <span class="mono">${esc(q)}</span>` : ' across every branch, newest first'}</p></div>
  ${sechead('History', `<input class="ffilter" id="lFilter" style="width:210px" placeholder="branch, word or tag…" value="${esc(S.logFilter||'')}">`)}
  <div class="log">${page.length ? logList(page) : '<div class="muted" style="padding:26px 0">Nothing matches.</div>'}</div>
  ${all.length > n ? `<div style="margin-top:20px"><button class="btn btn-g" data-act="more">load ${Math.min(40, all.length-n)} more
    <span class="muted mono" style="font-size:11px">· ${n} of ${all.length}</span></button></div>` : ''}`;
}

/* ═══════════ BRANCH ═══════════ */
export function branchView(v, b) {
  const tab = S.tab || 'overview';
  const hasT = b.topics.some(t => !t.implicit), flat = !hasT && b.topics[0];
  let body = '';
  if (tab === 'overview') {
    body = `${tiles([
      ['streak', `${b.streak}<small>${M.isAbstain(b)?'days clean':'days'}</small>`, `longest ${b.longest}`],
      ['uptime 30d', `${Math.round(b.up30*100)}<small>%</small>`, `90d · ${Math.round(b.up90*100)}%`],
      ['commits', `${b.commits.length}`, `since ${fmtShort(b.created)}`],
      ['build', badge(b.st), esc(M.statusLabel(b, b.st))],
    ])}
    <div class="card"><div class="card-h"><h3>${hasT?'The year, and what it was about':'The year'}</h3>
      <span class="muted mono" style="margin-left:auto;font-size:11px">${hasT?'grid = did you practise · lanes = what you practised':'intensity = '+esc(flat?.gridMetric||'commits')}</span></div>
      <div class="card-b">${yearGrid(v, { branch: b, lanes: hasT })}</div></div>
    ${b.why ? `<div class="card" style="--bc:${b.color}"><div class="card-h"><h3>README.md</h3>
      <span class="muted mono" style="margin-left:auto;font-size:11px">why</span></div>
      <div class="card-b readme">${esc(b.why).replace(/\n/g,'<br>')}</div></div>` : ''}
    ${hasT ? `${sechead('Currently working on', `<button class="peek" data-tab="topics">all ${b.topics.filter(t=>!t.implicit).length} topics →</button>`)}
      <div class="bcards">${b.openTopics.map(t => topicCard(v,t,b)).join('') || '<div class="muted">No topic branch open — the parent is still collecting the streak.</div>'}</div>` : ''}
    ${sechead('Latest', `<button class="peek" data-tab="log">full log →</button>`)}
    <div class="log">${logList(b.commits.slice(0,5))}</div>`;
  }
  if (tab === 'topics') {
    body = `<p class="muted" style="font-size:13px;margin-bottom:20px;max-width:64ch">The parent holds the cadence and
      the streak. A topic branch holds the goal and the metrics, and merges into the parent when it's learned — the
      streak never notices.</p>
    <div class="bcards">${b.topics.filter(t=>!t.implicit).map(t => topicCard(v,t,b)).join('')}
      ${S.readonly ? '' : `<button class="bcard" data-newtopic="${esc(b.id)}" style="--bc:var(--ink3)">
        <div class="top"><span class="ttl">＋ new topic branch</span></div>
        <div class="cad">when the focus changes, don't rewrite the metrics — branch</div></button>`}</div>
    ${b.releases.length ? `${sechead('Releases')}${b.releases.map(r => `<div class="rel"><span class="v">${r.v}</span>
      <span class="t">${esc(r.t.title||r.t.id)}</span><span class="dots"></span><span class="d">${fmtShort(r.date)}</span></div>`).join('')}` : ''}`;
  }
  if (tab === 'log') body = `<div class="log">${logList(b.commits.slice(0,60))}</div>`;
  if (tab === 'insights') body = `${flat ? metricChart(v, flat) : ''}${weekdayCard(b.commits, b.color)}`;
  if (tab === 'settings') body = settingsView(v, b);
  return `<button class="back" data-sec="vault">← vault</button>
  <div class="hero" style="--bc:${b.color};margin-bottom:16px">
    <div class="row"><span style="font-size:26px">${esc(b.emoji)}</span>
      <h1 style="font-family:var(--mono);font-size:26px">${esc(b.id)}</h1>${badge(b.st)}</div>
    <p>${esc(b.title)} · ${esc(M.cadenceLabel(b))} · ${esc(M.statusLabel(b,b.st))} · opened ${fmtShort(b.created)}</p></div>
  ${tabs(TABS_B.filter(t => t[0] !== 'topics' || hasT), tab)}${body}`;
}
function topicCard(v, t, b) {
  const rl = b.releases.find(r => r.t === t);
  return `<button class="bcard" data-topic="${esc(t.full)}" style="--bc:${t.color}${t.closed?';opacity:.72':''}">
    <div class="top"><span class="ttl">${esc(t.id)}</span><span style="margin-left:auto">${badge(t.closed?'merged':'open')}</span></div>
    <div class="cad">${esc(t.title||'')} · ${fmtShort(t.opened)} → ${t.closed?fmtShort(t.closed):'now'}${rl?` · <span class="mono">${rl.v}</span>`:''}</div>
    ${miniGrid(v, t, true)}
    <div class="foot"><span><b>${t.commits.length}</b> commits</span>
      ${t.metrics?.[0] ? `<span><b>${t.commits.reduce((s,c)=>s+(c.metrics?.[t.metrics[0].k]||0),0)}</b> ${esc(t.metrics[0].label.toLowerCase())}</span>` : ''}
      <span style="margin-left:auto">${dayDiff(parse(t.opened), parse(t.closed||v.today))}d</span></div></button>`;
}

/* ═══════════ TOPIC ═══════════ */
export function topicView(v, t) {
  const b = t.parent, m0 = t.metrics?.[0], rl = b.releases.find(r => r.t === t), tab = S.tab || 'overview';
  const days = dayDiff(parse(t.opened), parse(t.closed || v.today)) + 1;
  let body = '';
  if (tab === 'overview') {
    const totals = (t.metrics||[]).map(m => [m.label.toLowerCase(), t.commits.reduce((s,c)=>s+(c.metrics?.[m.k]||0),0), m.unit||'']);
    body = `${tiles([
      ['commits', `${t.commits.length}`, `${Math.round(t.commits.length/days*100)}% of days`],
      ...totals.slice(0,2).map(([l,val,u]) => [l, `${val.toLocaleString()}<small>${esc(u)}</small>`, `${Math.round(val/Math.max(1,t.commits.length))} per session`]),
      ['target now', m0 ? `${M.targetAt(m0, v.today)}<small>${esc(m0.unit||'')}</small>` : '—',
        m0 && m0.targets.length > 1 ? `raised from ${m0.targets[0].v} on ${fmtShort(m0.targets[1].from)}` : 'unchanged since day one'],
    ])}
    <div class="card"><div class="card-b">${yearGrid(v, { topic: t })}</div></div>
    ${metricChart(v, t)}
    ${sechead('Latest', `<button class="peek" data-tab="log">full log →</button>`)}
    <div class="log">${logList(t.commits.slice(0,5))}</div>`;
  }
  if (tab === 'log') body = `<div class="log">${logList(t.commits.slice(0,60))}</div>`;
  if (tab === 'settings') body = settingsView(v, b, t);
  return `<button class="back" data-br="${esc(b.id)}">← ${esc(b.id)}</button>
  <div class="hero" style="--bc:${t.color};margin-bottom:16px">
    <div class="row"><h1 style="font-family:var(--mono);font-size:24px">${esc(t.full)}</h1>${badge(t.closed?'merged':'open')}</div>
    ${t.goal ? `<div class="goal" style="margin-top:12px">${esc(t.goal)}</div>` : ''}
    <p>${fmtShort(t.opened)} → ${t.closed?fmtShort(t.closed):'open'} · ${days} days · cadence inherited from
      <span class="mono">${esc(b.id)}</span> (${esc(M.cadenceLabel(b))})${rl?` · released as <span class="mono">${rl.v}</span>`:''}</p></div>
  ${tabs(TABS_T, tab)}${body}`;
}

/* ═══════════ SETTINGS ═══════════ */
export function settingsView(v, b, topic) {
  const node = topic || b.topics.find(t => !t.closed) || b.topics[0];
  const editable = !S.readonly && !b.mergedAt && !(topic && topic.closed);
  return `
  ${topic ? '' : `${sechead('Cadence')}
  <div class="chipsel">${M.CADENCES.map(([k,l]) => `<button class="${b.cadence.type===k?'on':''}" data-setcad="${k}" ${editable?'':'disabled'}>${l}</button>`).join('')}</div>
  ${/n_per/.test(b.cadence.type) ? `<div class="row" style="margin-top:11px">
    <input class="tinp" id="setN" type="number" min="1" value="${b.cadence.n}" ${editable?'':'disabled'}>
    <span class="muted" style="font-size:12px">times per ${b.cadence.type==='n_per_week'?'week':'month'}</span></div>` : ''}
  <p class="hint">Changing cadence recomputes the streak and build status against the new rule — it never touches a commit.</p>`}

  ${sechead('Metrics', esc(topic ? `on ${topic.full}` : (node?.implicit ? 'on this branch' : `on ${node?.full}`)))}
  ${(node?.metrics || []).length ? node.metrics.map(m => `<div class="srow">
      <div><div class="k">${esc(m.label)} ${m.unit?`<span class="muted mono" style="font-size:11.5px">(${esc(m.unit)})</span>`:''}</div>
        <div class="sub">${esc(m.type)} · ${m.dir==='at_most'?'at most':'at least'} the target</div>
        ${m.targets.length>1 ? `<div class="thist">${m.targets.map(t=>`${t.v} from ${fmtShort(t.from)}`).join('  →  ')}</div>` : ''}</div>
      <div style="text-align:right"><input class="tinp" data-target="${esc(m.k)}" value="${M.targetAt(m, v.today)}" ${editable?'':'disabled'}>
        <div class="thist">target</div></div></div>`).join('')
    : '<p class="hint" style="margin-top:0">No metrics — this branch records messages only, and its grid means <b>did you show up</b>.</p>'}
  <p class="hint">Raising a target appends a dated entry instead of overwriting: charts draw the change as a step, and
    no past commit is re-judged against a target that did not exist yet.</p>

  ${!editable ? '' : `${sechead('Danger zone')}
  ${topic ? `<p class="sec" style="font-size:13px;line-height:1.6;margin-bottom:14px;max-width:64ch">Merging a topic doesn't
      end the habit — it ends this <em>focus</em>. <span class="mono">${esc(b.id)}</span> keeps its streak; you open the
      next topic and the metrics change with it.</p>
    <button class="btn btn-p" data-mergetopic="${esc(topic.full)}">merge ${esc(topic.id)} → ${esc(b.id)}</button>`
  : `<p class="sec" style="font-size:13px;line-height:1.6;margin-bottom:14px;max-width:64ch">Merging closes this branch and
      squashes its history into <span class="mono">main</span> — the record of things that are simply part of how you live
      now. The grid stays. The pressure doesn't.</p>
    <div class="row"><button class="btn btn-d" data-merge="${esc(b.id)}">merge ${esc(b.id)} → main</button>
      <button class="btn btn-g" data-park="${esc(b.id)}">${b.checkedOut?'park (sparse-checkout out)':'check out'}</button></div>`}`}`;
}
