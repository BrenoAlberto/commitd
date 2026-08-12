/* Commit composer and the branch / topic wizard.

   The composer is deliberately two steps. Step one is WHICH BRANCH — a
   search box with today's due branches ranked first. The message field is
   never focused before a branch is chosen: being dropped into a text box for
   an unknown branch is disorienting, and it gets worse the more branches you
   have. On touch neither step steals focus, because summoning a keyboard over
   the list you are trying to read is not help. */

import { $, $$, esc, slug, key } from './util.js';
import { S, store } from './store.js';
import { t as tr } from './i18n.js';
import { CADENCES, METRIC_TYPES, targetAt, dueToday, isAbstain, allTags } from './model.js';
import { shade, slotOf } from './theme.js';
import { openSheet, closeAll, fitSheet, toast } from './ui.js';
import * as A from './actions.js';

let target = null, psel = 0;
const focusable = () => matchMedia('(pointer:fine)').matches;

const pickList = () => {
  const due = dueToday(S.vault);
  const rank = (b) => (due.includes(b) ? 0 : b.checkedOut ? 1 : 2);
  return S.vault.branches.filter(b => !b.mergedAt)
    .flatMap(b => b.topics.filter(t => !t.closed).map(t => ({ t, b, r: rank(b) })))
    .sort((x, y) => x.r - y.r || x.t.full.localeCompare(y.t.full));
};

export function openComposer(full, date) {
  const dk = date || S.vault.today;
  if (full) {
    const t = S.vault.branches.flatMap(b => b.topics).find(x => x.full === full);
    if (t) { target = t; return composerForm(t, dk); }
  }
  psel = 0; composerPick(dk, '');
}

/* The sheet renders once; keystrokes redraw only the list below the input.
   Rebuilding the input on every character would blur it — on a phone that
   closes the keyboard after each letter. */
function composerPick(dk, q) {
  $('#composer').style.removeProperty('--bc');
  openSheet('#composer', {
    head: `<span class="pr">$</span><span class="mono" style="font-size:14px">git commit</span>
      <input id="pInput" placeholder="${tr('which branch?')}" autocomplete="off" spellcheck="false" value="${esc(q)}">
      <button class="iconbtn" data-close>✕</button>`,
    body: `<div id="pList"></div>`,
    foot: `<span class="muted mono" style="font-size:11px"><kbd>↑↓</kbd> ${tr('pick')} &nbsp; <kbd>↵</kbd> ${tr('select')}</span>
      <a class="peek" id="pNew" style="margin-left:auto;cursor:pointer">${tr('＋ new branch')}</a>`,
  });
  $('[data-close]').onclick = closeAll;
  $('#pNew').onclick = () => { closeAll(); openWizard(); };
  const inp = $('#pInput');
  let list = [];
  const renderList = () => {
    const all = pickList(), qq = inp.value.toLowerCase();
    list = all.filter(x => !qq || x.t.full.includes(qq)
      || x.b.title.toLowerCase().includes(qq) || x.b.group.includes(qq));
    psel = Math.max(0, Math.min(psel, list.length - 1));
    let out = '', lastR = -1;
    list.forEach((x, i) => {
      if (x.r !== lastR && !qq) { lastR = x.r; out += `<div class="psec">${[tr('Due today'), tr('Checked out'), tr('Parked')][x.r]}</div>`; }
      out += `<button class="pitem${i === psel ? ' sel' : ''}" data-pick="${esc(x.t.full)}" style="--bc:${x.b.color}">
        <span class="sw"></span><span>${esc(x.b.emoji)}</span><span class="nm">${esc(x.t.full)}</span>
        <span class="d">${esc((x.t.metrics || []).map(m => m.k).join(' · ') || tr('message only'))}</span></button>`;
    });
    $('#pList').innerHTML = list.length ? `<div class="plist" style="padding:11px">${out}</div>`
      : `<div class="muted" style="padding:26px 16px;font-size:13px">${tr('No branch matches.')}
         <b>Enter</b> ${tr('creates one called')} <span class="mono">${esc(inp.value)}</span>.</div>`;
    $$('#pList [data-pick]').forEach(el => el.onclick = () => {
      target = S.vault.branches.flatMap(b => b.topics).find(t => t.full === el.dataset.pick);
      composerForm(target, dk);
    });
  };
  renderList();
  inp.oninput = () => { psel = 0; renderList(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); psel = Math.min(psel + 1, list.length - 1); renderList(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); psel = Math.max(psel - 1, 0); renderList(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!list.length) { closeAll(); openWizard(inp.value); return; }
      target = list[psel].t; composerForm(target, dk);
    }
  };
  if (focusable()) setTimeout(() => { inp.focus(); inp.setSelectionRange(q.length, q.length); }, 60);
}

function composerForm(t, dk) {
  const b = t.parent;
  $('#composer').style.setProperty('--bc', b.color);
  openSheet('#composer', {
    head: `<span class="pr">$</span><span class="mono" style="font-size:14px">git commit</span>
      <button class="chip mono" id="cSwap" style="height:26px;cursor:pointer">
        <span class="sw" style="background:${b.color};box-shadow:none"></span>${esc(t.full)} <span class="muted">${tr('change')}</span></button>
      ${dk !== S.vault.today ? `<span class="chip mono" style="height:26px;font-size:11px">--date ${dk}</span>` : ''}
      <button class="iconbtn" data-close style="margin-left:auto">✕</button>`,
    body: `<div style="padding:18px">
      <div class="field"><label>${tr('Message')}</label>
        <textarea class="inp" id="cMsg" placeholder="${tr('what actually happened — one honest line')}"></textarea></div>
      ${(t.metrics || []).length ? `<div class="field"><label>${tr('Metrics · defined on {0}', esc(t.implicit ? tr('this branch') : t.full))}</label>
        <div class="mgrid">${t.metrics.map(m => `<input class="inp" id="m_${esc(m.k)}" type="number" step="any"
          placeholder="${esc(m.label)}${m.unit ? ` (${esc(m.unit)})` : ''} · ${tr('target {0}', targetAt(m, dk))}">`).join('')}</div></div>` : ''}
      <div class="field" style="margin-bottom:0"><label>Tags</label>
        <input class="inp" id="cTags" placeholder="${tr('comma, separated, optional')}">
        <div class="tagsug" id="cTagSug"></div></div></div>`,
    foot: `<span class="muted mono" style="font-size:11px;margin-right:auto">→ branches/${esc(t.implicit ? b.id : `${b.id}/topics/${t.id}`)}/log/${dk.slice(0, 7)}.jsonl</span>
      <button class="btn btn-g" data-close>${tr('cancel')}</button><button class="btn btn-p" id="cDo">commit</button>`,
  });
  $$('[data-close]').forEach(el => el.onclick = closeAll);
  $('#cSwap').onclick = () => { psel = 0; composerPick(dk, ''); };
  /* one tap re-uses a tag you've used before; typing still works as ever */
  const tagInp = $('#cTags');
  const curTags = () => tagInp.value.split(',').map(x => x.trim()).filter(Boolean);
  const drawTags = () => {
    const cur = curTags();
    $('#cTagSug').innerHTML = allTags(S.vault).slice(0, 12).map(tg =>
      `<button type="button" class="${cur.includes(tg) ? 'on' : ''}" data-tag="${esc(tg)}">${esc(tg)}</button>`).join('');
    $$('#cTagSug [data-tag]').forEach(el => el.onclick = () => {
      const tg = el.dataset.tag, cur2 = curTags();
      tagInp.value = (cur2.includes(tg) ? cur2.filter(x => x !== tg) : [...cur2, tg]).join(', ');
      drawTags();
    });
  };
  drawTags();
  tagInp.oninput = drawTags;
  $('#cDo').onclick = async () => {
    const metrics = {};
    (t.metrics || []).forEach(m => { const v = $('#m_' + m.k)?.value; if (v !== '' && v != null) metrics[m.k] = +v; });
    const payload = { message: $('#cMsg').value.trim(), metrics,
      tags: $('#cTags').value.split(',').map(x => x.trim()).filter(Boolean), date: dk };
    closeAll();
    await A.commit(b, t, payload);
  };
  if (focusable()) setTimeout(() => $('#cMsg')?.focus(), 80);
}

/* ── wizard ──────────────────────────────────────────────── */
let wiz = null;
const newMetric = () => ({ label: '', unit: '', type: 'count', dir: 'at_least', target: '' });

export function openWizard(prefill = '', topicOf = null) {
  wiz = { topicOf, title: prefill, emoji: '🌱', group: S.vault.groups[0].id, goal: '',
    cadence: { type: 'daily', n: 3 }, metrics: [newMetric()], why: '' };
  drawWizard();
}
function drawWizard() {
  const t = wiz.topicOf, parent = t && S.vault.branches.find(b => b.id === t);
  const id = slug(wiz.title) || 'unnamed';
  const mets = wiz.metrics.filter(m => m.label.trim());
  $('#composer').style.setProperty('--bc', parent ? parent.color : shade(slotOf(S.vault.groups, wiz.group), .6));
  openSheet('#composer', {
    head: `<span class="pr">$</span><span class="mono" style="font-size:14px" id="wTitle">${
      t ? `git checkout -b ${esc(t)}/${esc(id)}` : `git branch ${esc(id)}`}</span>
      <button class="iconbtn" data-close style="margin-left:auto">✕</button>`,
    body: `<div style="padding:18px">
      <div class="wsec">
        <div class="mgrid3" style="grid-template-columns:64px 1fr">
          <input class="inp" id="w_emoji" value="${esc(wiz.emoji)}" style="text-align:center;font-size:19px">
          <input class="inp" id="w_title" value="${esc(wiz.title)}"
            placeholder="${t ? tr('What is the current focus? e.g. Couch to 5K') : tr('What are you building? e.g. Gym, Reading, Quit smoking')}"></div>
        <div class="hint">→ <span class="mono">${esc(t ? `${t}/${id}` : id)}</span> ${tr('· stored at')}
          <span class="mono">branches/${esc(t ? `${t}/topics/${id}` : id)}/</span></div></div>
      ${t ? `<div class="wsec"><label class="lbl" style="display:block;margin-bottom:8px">${tr('Goal — one sentence')}</label>
        <input class="inp" id="w_goal" value="${esc(wiz.goal)}" placeholder="${tr('Run 5K without stopping, by the end of March.')}">
        <div class="hint">${tr('Cadence is inherited from')} <span class="mono">${esc(t)}</span>. ${tr('A topic branch never has its own streak — that is the whole point.')}</div></div>`
      : `<div class="wsec"><label class="lbl" style="display:block;margin-bottom:8px">${tr('Group')}</label>
        <div class="chipsel">${S.vault.groups.map(g => `<button class="${wiz.group === g.id ? 'on' : ''}" data-wg="${g.id}">
          <span style="color:${shade(g.slot, .6)}">●</span> ${esc(g.label)}</button>`).join('')}</div>
        <div class="hint">${tr('Groups own the colour, so branch colours stay colourblind-safe past eight branches.')}</div></div>
      <div class="wsec"><label class="lbl" style="display:block;margin-bottom:8px">${tr('Cadence')}</label>
        <div class="chipsel">${CADENCES.map(([k, l]) => `<button class="${wiz.cadence.type === k ? 'on' : ''}" data-wc="${k}">${l}</button>`).join('')}</div>
        ${/n_per/.test(wiz.cadence.type) ? `<div class="row" style="margin-top:10px">
          <input class="inp" id="w_n" type="number" min="1" value="${wiz.cadence.n}" style="width:80px">
          <span class="hint" style="margin:0">${tr("times per {0} — rest days don't break the streak", wiz.cadence.type === 'n_per_week' ? tr('week') : tr('month'))}</span></div>` : ''}
        ${wiz.cadence.type === 'abstain' ? `<div class="hint">${tr('Inverted: every day that passes commits itself, and a commit is a relapse.')}</div>` : ''}
      </div>`}
      <div class="wsec"><label class="lbl" style="display:block;margin-bottom:10px">${tr('Metrics')}</label>
        ${wiz.metrics.map((m, i) => `<div class="mrow">
          <input class="inp" data-mi="${i}" data-mf="label" value="${esc(m.label)}" placeholder="${tr('Label e.g. Minutes')}">
          <select class="inp" data-mi="${i}" data-mf="type">${METRIC_TYPES.map(([k, l]) => `<option value="${k}"${m.type === k ? ' selected' : ''}>${tr(l)}</option>`).join('')}</select>
          <input class="inp" data-mi="${i}" data-mf="unit" value="${esc(m.unit)}" placeholder="${tr('unit')}">
          <select class="inp" data-mi="${i}" data-mf="dir">
            <option value="at_least"${m.dir === 'at_least' ? ' selected' : ''}>≥</option>
            <option value="at_most"${m.dir === 'at_most' ? ' selected' : ''}>≤</option></select>
          <input class="inp" data-mi="${i}" data-mf="target" value="${esc(m.target)}" placeholder="${tr('target')}" type="number" step="any">
          <button class="mdel" data-mdel="${i}">✕</button></div>`).join('')}
        <button class="madd" id="wAdd">${tr('＋ add a metric')}</button>
        <div class="hint">${tr('Leave this empty for a message-only branch. Targets can be raised later without rewriting history — they are stored as a dated list.')}</div></div>
      ${t ? '' : `<div class="wsec"><label class="lbl" style="display:block;margin-bottom:8px">${tr('README — your why')}</label>
        <textarea class="inp" id="w_why" placeholder="${tr("The sentence you'll need to read at 11pm when you don't want to.")}">${esc(wiz.why)}</textarea></div>`}
      <div class="wsec"><div class="preview"><div class="pl">${tr('Preview · what committing will look like')}</div>
        <div class="field" style="margin-bottom:10px"><label>${tr('Message')}</label>
          <div class="inp muted" style="font-size:13px">${tr('what actually happened — one honest line')}</div></div>
        ${mets.length ? `<div class="mgrid">${mets.map(m => `<div class="inp muted" style="font-size:12.5px">${esc(m.label)}${
          m.unit ? ` (${esc(m.unit)})` : ''}${m.target !== '' ? ` · ${tr('target')} ${m.dir === 'at_most' ? '≤' : '≥'} ${esc(m.target)}` : ''}</div>`).join('')}</div>`
          : `<div class="hint" style="margin:0">${tr('No metrics — the grid will show <b>did you show up</b>.')}</div>`}
      </div></div></div>`,
    foot: `<button class="btn btn-g" data-close>${tr('cancel')}</button>
      <button class="btn btn-p" id="wDo">${t ? 'checkout -b' : tr('create branch')}</button>`,
  });
  $$('[data-close]').forEach(el => el.onclick = closeAll);
  const bind = (sel, fn) => { const e = $(sel); if (e) e.oninput = () => fn(e.value); };
  bind('#w_title', v => { wiz.title = v; $('#wTitle').textContent = (wiz.topicOf ? `git checkout -b ${wiz.topicOf}/` : 'git branch ') + (slug(v) || 'unnamed'); });
  bind('#w_emoji', v => wiz.emoji = v); bind('#w_goal', v => wiz.goal = v); bind('#w_why', v => wiz.why = v);
  bind('#w_n', v => wiz.cadence.n = Math.max(1, +v || 1));
  $$('#composer [data-wg]').forEach(el => el.onclick = () => { wiz.group = el.dataset.wg; drawWizard(); });
  $$('#composer [data-wc]').forEach(el => el.onclick = () => { wiz.cadence = { type: el.dataset.wc, n: wiz.cadence.n || 3 }; drawWizard(); });
  $$('#composer [data-mi]').forEach((el) => {
    el.oninput  = () => { wiz.metrics[+el.dataset.mi][el.dataset.mf] = el.value; };
    el.onchange = () => { wiz.metrics[+el.dataset.mi][el.dataset.mf] = el.value; drawWizard(); };
  });
  $$('#composer [data-mdel]').forEach(el => el.onclick = () => { wiz.metrics.splice(+el.dataset.mdel, 1); drawWizard(); });
  $('#wAdd').onclick = () => { wiz.metrics.push(newMetric()); drawWizard(); };
  $('#wDo').onclick = async () => {
    const metrics = wiz.metrics.filter(m => m.label.trim()).map(m => ({
      k: slug(m.label), label: m.label.trim(), unit: m.unit.trim(), type: m.type, dir: m.dir,
      targets: [{ from: S.vault.today, v: +m.target || 0 }] }));
    const w = wiz; closeAll();
    if (w.topicOf) {
      const b = S.vault.branches.find(x => x.id === w.topicOf);
      const t = await A.createTopic(b, { title: w.title, goal: w.goal, metrics });
      if (t) location.hash = `#/b/${b.id}/${t.id}`;
    } else {
      const b = await A.createBranch({ title: w.title, emoji: w.emoji, group: w.group,
        cadence: w.cadence, metrics, why: w.why });
      if (b) location.hash = `#/b/${b.id}`;
    }
  };
}
