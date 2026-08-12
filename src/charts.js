/* Every mark in here follows the same three rules:
   · the heatmap encodes magnitude, so by default it is a sequential
     single-hue ramp. The opt-in "by branch" lens tints each day with the
     group hue of whichever branch dominated it — hues stay within the
     curated group palette and intensity still carries the magnitude;
   · identity is carried by a swatch plus a label, never by colour alone;
   · "before this existed" is drawn differently from "you missed it". */

import { key, parse, addD, dayDiff, MONTHS, WD, esc, fmtShort } from './util.js';
import { step, shade } from './theme.js';
import { S } from './store.js';
import { unifiedDays, branchLevel, inLife, isAbstain, targetAt, weekdayProfile } from './model.js';

export const gridRange = (today) => {
  const t = parse(today), end = addD(t, 6 - t.getDay());
  return { start: addD(end, -370), end, today: t };
};

export function yearGrid(vault, { branch = null, topic = null, lanes = false } = {}) {
  const { start, today } = gridRange(vault.today);
  const slot = topic ? topic.slot : branch ? branch.slot : 2;
  const uni = (!branch && !topic) ? unifiedDays(vault, start, 371) : null;
  const byBranch = uni && S.gridMode === 'branches';
  let months = '', lastM = -1, cells = '';
  for (let i = 0; i < 371; i++) {
    const d = addD(start, i), dk = key(d), wk = Math.floor(i / 7);
    if (d.getDay() === 0 && d.getMonth() !== lastM && d.getDate() <= 7) {
      months += `<span style="left:${wk * 16}px">${MONTHS[d.getMonth()]}</span>`; lastM = d.getMonth();
    }
    if (d > today) { cells += '<div class="c oor"></div>'; continue; }
    let lvl = 0, rl = false, mark = '', cellSlot = slot;
    if (topic) {
      if (dk < topic.opened || (topic.closed && dk > topic.closed)) { cells += '<div class="c oor"></div>'; continue; }
      const c = topic.byDay[dk]; rl = !!(c && c.relapse); lvl = rl ? 0 : topic.lvl(c);
    } else if (branch) {
      if (!inLife(branch, dk)) { cells += '<div class="c oor"></div>'; continue; }
      const v = branchLevel(branch, dk); rl = v === -1; lvl = rl ? 0 : v;
    } else {
      const { n, r, s } = uni.m[dk];
      lvl = n ? Math.max(1, Math.min(4, Math.ceil(n / uni.p90 * 4))) : 0;
      rl = r && n === 0; if (r && n > 0) mark = ' rl-mark';
      if (byBranch && s != null) cellSlot = s;
    }
    cells += `<div class="c${rl ? ' relapse' : ''}${mark}${dk === vault.today ? ' today' : ''}" data-dk="${dk}"
      style="background:${rl ? '' : step(cellSlot, lvl, S.theme)};animation-delay:${(i % 7) * 13 + Math.floor(i / 7) * 6}ms"></div>`;
  }
  const usedGroups = uni ? vault.groups.filter(g =>
    vault.branches.some(b => (b.checkedOut || b.mergedAt) && b.group === g.id)) : [];
  const legend = byBranch
    ? usedGroups.map(g => `<span class="lgg"><i style="background:${step(g.slot, 3, S.theme)}"></i>${esc(g.label)}</span>`).join('')
    : `<span>less</span>${[0, 1, 2, 3, 4].map(l => `<div class="c" style="background:${step(slot, l, S.theme)}"></div>`).join('')}<span>more</span>`;
  const modeCtl = uni ? `<span class="gmode">
      <button class="${S.gridMode === 'heat' ? 'on' : ''}" data-gridmode="heat">heat</button>
      <button class="${S.gridMode === 'branches' ? 'on' : ''}" data-gridmode="branches">by branch</button></span>` : '';
  let laneHTML = '', laneLbs = '';
  if (lanes && branch) {
    branch.topics.filter(t => !t.implicit).forEach((t) => {
      const s = Math.max(0, dayDiff(start, parse(t.opened)));
      const e = Math.min(371, dayDiff(start, parse(t.closed || vault.today)));
      const rl = branch.releases.find(r => r.t === t);
      laneHTML += `<div class="lane" style="--bc:${t.color}"><div class="trk"></div>
        <div class="bar" data-topicbar="${esc(t.full)}" style="left:${s / 371 * 100}%;width:${Math.max(1, (e - s) / 371 * 100)}%"></div>
        ${t.closed ? `<div class="tagm" data-v="${rl ? rl.v : ''}" style="left:${e / 371 * 100}%"></div>` : ''}</div>`;
      laneLbs += `<div class="lanelb"><span class="sw" style="background:${t.color}"></span>${esc(t.id)}</div>`;
    });
  }
  return `<div class="gcols">
    <div class="grail" style="width:${lanes && laneLbs ? 134 : 34}px">
      <div class="gdays"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
      ${laneLbs ? `<div class="lanelbs">${laneLbs}</div>` : ''}
    </div>
    <div class="gridwrap"><div class="gmain" style="width:848px">
      <div class="gmonths">${months}</div><div class="g anim">${cells}</div>
      ${laneHTML ? `<div class="lanes">${laneHTML}</div>` : ''}
    </div></div></div>
  <div class="legend">${legend}${modeCtl}</div>`;
}

export function miniGrid(vault, node, isTopic) {
  const { end: gEnd, today } = gridRange(vault.today);
  let end = gEnd;
  const stop = isTopic ? node.closed : node.mergedAt;
  if (stop) { const s = parse(stop); end = addD(s, 6 - s.getDay()); }
  const start = addD(end, -90);
  let out = '';
  for (let i = 0; i < 91; i++) {
    const d = addD(start, i), dk = key(d);
    if (d > today) { out += '<div class="c oor"></div>'; continue; }
    if (isTopic) {
      if (dk < node.opened || (node.closed && dk > node.closed)) { out += '<div class="c oor"></div>'; continue; }
      out += `<div class="c" style="background:${step(node.slot, node.lvl(node.byDay[dk]), S.theme)}"></div>`;
    } else {
      if (!inLife(node, dk)) { out += '<div class="c oor"></div>'; continue; }
      const v = branchLevel(node, dk);
      out += v === -1 ? '<div class="c relapse"></div>'
        : `<div class="c" style="background:${step(node.slot, v, S.theme)}"></div>`;
    }
  }
  return `<div class="mini">${out}</div>`;
}
export function sparkGrid(vault, b) {
  const { start, today } = gridRange(vault.today);
  let out = '';
  for (let i = 280; i < 371; i++) {
    const d = addD(start, i), dk = key(d);
    if (d > today || !inLife(b, dk)) { out += '<div class="c oor"></div>'; continue; }
    const v = branchLevel(b, dk);
    out += v === -1 ? '<div class="c" style="background:var(--crit)"></div>'
      : `<div class="c" style="background:${step(b.slot, v, S.theme)}"></div>`;
  }
  return `<div class="sparkgrid">${out}</div>`;
}
/* The last four weeks read better as a calendar than as a slice of the year. */
export function monthStrip(vault) {
  const t = parse(vault.today), end = addD(t, 6 - t.getDay()), start = addD(end, -27);
  const u = unifiedDays(vault, start, 28);
  let out = WD.map(w => `<div class="lb">${w[0]}</div>`).join('');
  for (let i = 0; i < 28; i++) {
    const d = addD(start, i), dk = key(d);
    if (d > t) { out += '<div class="scell oor"></div>'; continue; }
    const { n, r } = u.m[dk], lvl = n ? Math.max(1, Math.min(4, Math.ceil(n / u.p90 * 4))) : 0;
    out += `<div class="scell${n ? ' on' : ''}${dk === vault.today ? ' today' : ''}" data-dk="${dk}"
      style="${lvl ? `background:${step(2, lvl, S.theme)}` : ''}">${d.getDate()}${r ? '<span class="rl"></span>' : ''}</div>`;
  }
  return `<div class="strip">${out}</div>`;
}

/* Targets are a dated list, so the target line is drawn as steps — a chart of
   your worst week never lies about what you were aiming at that week. */
export function metricChart(vault, t) {
  const m0 = t.metrics?.[0]; if (!m0) return '';
  const end = parse(t.closed || vault.today), vals = [];
  for (let i = 29; i >= 0; i--) {
    const d = addD(end, -i), dk = key(d), c = t.byDay[dk];
    vals.push({ dk, v: c ? (c.metrics?.[m0.k] || 0) : 0, tg: targetAt(m0, dk) });
  }
  const mx = Math.max(...vals.map(x => Math.max(x.v, x.tg))) * 1.1 || 1;
  const runs = []; let cur = null;
  vals.forEach((x, i) => { if (!cur || cur.tg !== x.tg) { cur = { tg: x.tg, s: i, e: i }; runs.push(cur); } else cur.e = i; });
  return `<div class="card"><div class="card-h"><h3>${esc(m0.label)}</h3>
    <span class="muted mono" style="margin-left:auto;font-size:11px">${t.closed ? 'final 30 days' : 'last 30 days'} ·
      target ${runs.map(r => r.tg).join(' → ')}${esc(m0.unit || '')}</span></div>
    <div class="card-b" style="--bc:${t.color}">
      <div class="bars">
        ${vals.map(x => `<div class="bar${x.v ? '' : ' zero'}" style="height:${Math.max(2, x.v / mx * 100)}%"
          data-tipd="${x.dk}" data-tipv="${x.v}" data-tipl="${esc(m0.label)}"></div>`).join('')}
        ${runs.map(r => `<div class="tline" style="bottom:${(r.tg / mx * 120).toFixed(1)}px;left:${r.s / 30 * 100}%;right:${(1 - (r.e + 1) / 30) * 100}%"></div>`).join('')}
      </div>
      <div class="axis"><span>${fmtShort(vals[0].dk)}</span><span>${t.closed ? fmtShort(t.closed) : 'today'}</span></div>
    </div></div>`;
}
export function weekdayCard(list, color, note = '') {
  const rows = weekdayProfile(list), mx = Math.max(...rows.map(r => r.n)) || 1;
  return `<div class="card"><div class="card-h"><h3>Weekday profile</h3>
    ${note ? `<span class="muted mono" style="margin-left:auto;font-size:11px">${esc(note)}</span>` : ''}</div>
    <div class="card-b" style="--bc:${color}">${rows.map(r =>
      `<div class="wd"><span class="lb">${r.day}</span><span class="track"><span class="fill" style="width:${r.n / mx * 100}%"></span></span>
       <span class="vl">${r.n}</span></div>`).join('')}</div></div>`;
}
export function hourChart(all) {
  const h = new Array(24).fill(0);
  all.forEach(c => h[+String(c.ts).slice(11, 13) || 0]++);
  const mx = Math.max(...h) || 1;
  return `<div class="card"><div class="card-h"><h3>When you commit</h3>
    <span class="muted mono" style="margin-left:auto;font-size:11px">all branches</span></div>
    <div class="card-b" style="--bc:${shade(2, .6)}">
      <div class="bars">${h.map((v, i) => `<div class="bar${v ? '' : ' zero'}" style="height:${Math.max(2, v / mx * 100)}%"
        data-tiph="${i}" data-tipv="${v}"></div>`).join('')}</div>
      <div class="axis"><span>00:00</span><span>12:00</span><span>23:00</span></div></div></div>`;
}
