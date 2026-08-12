/* Router, chrome and every event handler. Hash routing, because GitHub Pages
   has no server to rewrite paths — and because a habit deserves a back button. */

import { $, $$, esc, key, parse, addD, fmtDate, rel } from './util.js';
import { S, store, setTheme } from './store.js';
import { GitHub } from './github.js';
import { OAuthAuth } from './auth.js';
import * as V from './vault.js';
import * as M from './model.js';
import * as A from './actions.js';
import * as views from './views.js';
import * as onb from './onboarding.js';
import { openComposer, openWizard } from './composer.js';
import { initSheets, initPalette, openPalette, openSheet, closeAll, bindTip, showTip, moveTip, hideTip, toast, errToast, busy, fitSheet } from './ui.js';
import { logList, badge, SECTIONS } from './views.js';

/* ── routing ─────────────────────────────────────────────── */
const SECT = ['today', 'vault', 'insights', 'log', 'account'];
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const p = path.split('/').filter(Boolean);
  const q = new URLSearchParams(qs || '');
  if (!p.length) return { name: 'home' };
  if (p[0] === 'connect') return { name: 'connect' };
  if (p[0] === 'u') return { name: 'public', owner: p[1], repo: p[2] || onb.DEFAULT_REPO };
  if (p[0] === 'b') return { name: 'branch', branch: p[1], topic: p[2] || null, tab: q.get('tab') };
  if (SECT.includes(p[0])) return { name: 'section', section: p[0] };
  return { name: 'home' };
}
export const go = (hash) => { location.hash = hash; };
const goSection = (s) => go(`#/${s}`);
const goBranch = (id, topic, tab) =>
  go(`#/b/${id}${topic ? `/${topic.split('/').pop()}` : ''}${tab ? `?tab=${tab}` : ''}`);

/* ── chrome ──────────────────────────────────────────────── */
function chrome() {
  const v = S.vault, ident = S.auth?.identity?.();
  const inEntity = S.route.name === 'branch';
  const sec = S.route.name === 'section' ? S.route.section : null;
  $('#secnav').innerHTML = !v ? '' : SECTIONS.map(([k, l]) =>
    `<button data-sec="${k}" class="${!inEntity && sec === k ? 'on' : ''}">${l}</button>`).join('');
  $('#tabbar').innerHTML = !v ? '' :
    SECTIONS.slice(0, 2).map(([k, l, g]) => `<button data-sec="${k}" class="${!inEntity && sec === k ? 'on' : ''}"><span class="glyph">${g}</span>${l}</button>`).join('')
    + (S.readonly ? '' : `<button class="plus" data-act="commit"><i>＋</i></button>`)
    + SECTIONS.slice(2).map(([k, l, g]) => `<button data-sec="${k}" class="${!inEntity && sec === k ? 'on' : ''}"><span class="glyph">${g}</span>${l}</button>`).join('');
  $('#vaultChip').innerHTML = v?.repo
    ? `${esc(v.repo.owner)}/<b>${esc(v.repo.name)}</b>${v.repo.private ? '' : ' <span class="muted">public</span>'}`
    : 'commitd';
  $('#vaultChip').style.display = v ? '' : 'none';
  $('#avatar').textContent = (ident?.login || v?.repo?.owner || '?').slice(0, 1).toUpperCase();
  $('#avatar').style.display = v ? '' : 'none';
  $('#openPalette').style.display = v ? '' : 'none';
  $('#fab').style.display = (v && !S.readonly) ? '' : 'none';
  $('#themeIcon').innerHTML = S.theme === 'dark'
    ? '<path d="M9.598 1.591a.749.749 0 01.785-.175 7.001 7.001 0 11-8.967 8.967.75.75 0 01.961-.96 5.5 5.5 0 007.046-7.046.75.75 0 01.175-.786"/>'
    : '<path d="M8 12a4 4 0 110-8 4 4 0 010 8m0-1.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5M8 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V.75A.75.75 0 018 0m0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 018 13m8-5a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0116 8M3 8a.75.75 0 01-.75.75H.75a.75.75 0 010-1.5h1.5A.75.75 0 013 8m10.657-5.657a.75.75 0 010 1.061l-1.061 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0m-9.193 9.193a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0m9.193 2.121a.75.75 0 01-1.06 0l-1.061-1.06a.75.75 0 011.06-1.061l1.061 1.06a.75.75 0 010 1.061M4.464 4.464a.75.75 0 01-1.06 0L2.34 3.404a.75.75 0 011.06-1.06l1.061 1.06a.75.75 0 010 1.06"/>';
}
function sidebar() {
  const v = S.vault, side = $('.side');
  /* No vault → no sidebar; the grid must give its column back or every
     pre-auth screen renders in a 238px strip. */
  $('.layout').classList.toggle('solo', !v);
  if (!v) { side.style.display = 'none'; return; }
  side.style.display = '';
  $('#headChip').innerHTML = `<span class="mono">HEAD →</span> <b>${fmtDate(parse(v.today))}</b>`;
  const q = S.filter.toLowerCase();
  const match = (b) => !q || b.id.includes(q) || b.title.toLowerCase().includes(q) || b.group.includes(q);
  const active = v.branches.filter(b => !b.mergedAt);
  let html = '';
  v.groups.forEach((g) => {
    const items = active.filter(b => b.group === g.id && b.checkedOut && match(b));
    const parked = active.filter(b => b.group === g.id && !b.checkedOut && match(b)).length;
    if (!items.length && !parked) return;
    const shut = S.closed.has(g.id);
    html += `<button class="grp${shut ? ' closed' : ''}" data-grp="${g.id}"><span class="caret">▾</span>
      <span class="sw" style="background:${(items[0]?.color) || 'var(--ink3)'};box-shadow:none"></span>
      <span class="gn">${esc(g.label)}</span><span class="gc">${items.length}${parked ? `+${parked}` : ''}</span></button>`;
    if (shut) return;
    items.forEach((b) => {
      html += `<button class="br${S.route.branch === b.id && !S.route.topic ? ' on' : ''}" data-br="${esc(b.id)}" style="--bc:${b.color}">
        <span class="sw"></span><span class="nm">${esc(b.id)}</span>
        <span class="st" style="color:${b.st === 'pass' ? 'var(--good)' : b.st === 'fail' ? 'var(--crit)' : 'var(--warn)'}">●</span>
        <span class="st">${b.streak}</span></button>`;
      b.openTopics.forEach(t => { html += `<button class="br sub${S.route.topic === t.id ? ' on' : ''}" data-topic="${esc(t.full)}" style="--bc:${t.color}">
        <span class="sw"></span><span class="nm">${esc(t.id)}</span></button>`; });
    });
  });
  $('#brlist').innerHTML = html || '<div class="muted" style="font-size:12px;padding:8px">Nothing matches.</div>';
  const parked = active.filter(b => !b.checkedOut).length;
  $('#sparseFoot').innerHTML = S.readonly ? ''
    : `${parked} branch${parked === 1 ? '' : 'es'} in the vault but not checked out — <a data-act="sparse">sparse-checkout</a>`;
  $('#newBranch').style.display = S.readonly ? 'none' : '';
  const merged = v.branches.filter(b => b.mergedAt);
  $('#mergedWrap').style.display = merged.length ? '' : 'none';
  $('#mergedlist').innerHTML = merged.map(b => `<button class="br merged" data-br="${esc(b.id)}" style="--bc:${b.color}">
    <span class="sw" style="opacity:.5"></span><span class="nm">${esc(b.id)}</span><span class="st">✓</span></button>`).join('');
  const f = $('#sFilter'); if (f && f.value !== S.filter) f.value = S.filter;
}

/* ── render ──────────────────────────────────────────────── */
function render() {
  const r = S.route, v = S.vault, main = $('#main');
  $('#banner').innerHTML = S.readonly && v ? onb.publicBanner(v) : '';
  if (r.name === 'boot')    main.innerHTML = `<div class="boot"><span class="spin"></span>${esc(S.busy || 'starting')}</div>`;
  else if (r.name === 'home' && !v)    main.innerHTML = onb.landingView();
  else if (r.name === 'connect')       main.innerHTML = onb.connectView();
  else if (r.name === 'pubprompt')     main.innerHTML = onb.publicPrompt();
  else if (r.name === 'error')         main.innerHTML = `<div class="center land"><h1 style="font-size:34px">That didn't work</h1>
      <div class="err">${esc(S.error)}</div><button class="btn btn-g" data-act="home">back</button></div>`;
  else if (r.name === 'install')       main.innerHTML = onb.installView();
  else if (r.name === 'pickrepo')      main.innerHTML = onb.pickRepoView();
  else if (r.name === 'pubwarn')       main.innerHTML = onb.pubWarnView();
  else if (!v)                          main.innerHTML = onb.landingView();
  else if (r.name === 'branch') {
    const b = v.branches.find(x => x.id === r.branch);
    if (!b) main.innerHTML = `<div class="center land"><h1 style="font-size:30px">No such branch</h1>
      <button class="btn btn-g" data-sec="vault">back to vault</button></div>`;
    else if (r.topic) {
      const t = b.topics.find(x => x.id === r.topic);
      main.innerHTML = t ? views.topicView(v, t) : views.branchView(v, b);
    } else main.innerHTML = views.branchView(v, b);
  }
  else if (r.name === 'section' && r.section === 'account') main.innerHTML = onb.accountView(v);
  else main.innerHTML = ({ today: views.todayView, vault: views.vaultView,
        insights: views.insightsView, log: views.logView }[r.section || 'today'])(v);
  chrome(); sidebar(); wire();
  $$('.gridwrap').forEach(g => { g.scrollLeft = g.scrollWidth; });
}

/* ── events ──────────────────────────────────────────────── */
function wire() {
  const v = S.vault;
  $$('[data-sec]').forEach(el => el.onclick = () => goSection(el.dataset.sec));
  $$('[data-br]').forEach(el => el.onclick = () => goBranch(el.dataset.br));
  $$('[data-topic]').forEach(el => el.onclick = (e) => { e.stopPropagation();
    const [b, t] = el.dataset.topic.split('/'); goBranch(b, t); });
  $$('[data-topicbar]').forEach(el => el.onclick = () => { const [b, t] = el.dataset.topicbar.split('/'); goBranch(b, t); });
  $$('[data-tab]').forEach(el => el.onclick = () => {
    const r = S.route;
    goBranch(r.branch, r.topic, el.dataset.tab);
    if (el.dataset.tab === 'log' && v) {
      const b = v.branches.find(x => x.id === r.branch);
      if (b && !b._full && !S.readonly) A.loadHistory(b);
    }
  });
  $$('.c[data-dk], .scell[data-dk]').forEach((el) => {
    el.onclick = () => { hideTip(); openDrawer(el.dataset.dk); };
  });
  bindTip('.c[data-dk], .scell[data-dk]', el => dayTip(el.dataset.dk));
  bindTip('.bar[data-tipd]', el => `<div class="t-d">${fmtDate(parse(el.dataset.tipd))}</div>
    <div style="font-size:12.5px">${el.dataset.tipv === '0' ? 'no commit' : esc(el.dataset.tipl) + ': ' + esc(el.dataset.tipv)}</div>`);
  bindTip('.bar[data-tiph]', el => `<div class="t-d">${String(el.dataset.tiph).padStart(2,'0')}:00</div>
    <div style="font-size:12.5px">${esc(el.dataset.tipv)} commits</div>`);
  bindTip('.lane .bar', (el) => { const t = v.branches.flatMap(b => b.topics).find(x => x.full === el.dataset.topicbar);
    return `<div class="t-d">${esc(t.full)}</div><div style="font-size:12.5px">${esc(t.title || '')}</div>`; });
  $$('.lg[data-dk]').forEach(el => el.onclick = () => openDrawer(el.dataset.dk));
  $$('[data-quick]').forEach(el => el.onclick = (e) => { e.stopPropagation(); A.quickCommit(v.branches.find(b => b.id === el.dataset.quick)); });
  $$('[data-open]').forEach(el => el.onclick = (e) => { e.stopPropagation();
    const b = v.branches.find(x => x.id === el.dataset.open); openComposer(b.topics.find(t => !t.closed).full); });
  $$('[data-bview]').forEach(el => el.onclick = () => { S.bview = el.dataset.bview; render(); });
  $$('[data-grp]').forEach(el => el.onclick = () => { const g = el.dataset.grp;
    S.closed.has(g) ? S.closed.delete(g) : S.closed.add(g); sidebar(); wire(); });
  $$('[data-newtopic]').forEach(el => el.onclick = () => openWizard('', el.dataset.newtopic));
  $$('[data-merge]').forEach(el => el.onclick = () => {
    const b = v.branches.find(x => x.id === el.dataset.merge);
    if (confirm(`Merge ${b.id} into main?\n\nThe branch closes and its history squashes into main. The grid stays forever.`)) A.mergeBranch(b);
  });
  $$('[data-mergetopic]').forEach(el => el.onclick = () => {
    const [bid, tid] = el.dataset.mergetopic.split('/');
    const b = v.branches.find(x => x.id === bid);
    A.mergeTopic(b, b.topics.find(t => t.id === tid)).then(() => goBranch(bid, null, 'topics'));
  });
  $$('[data-park]').forEach(el => el.onclick = () => A.toggleCheckout(v.branches.find(x => x.id === el.dataset.park)));
  $$('[data-setcad]').forEach(el => el.onclick = () => A.setCadence(v.branches.find(x => x.id === S.route.branch), el.dataset.setcad, +($('#setN')?.value || 0)));
  const sn = $('#setN'); if (sn) sn.onchange = () => A.setCadence(v.branches.find(x => x.id === S.route.branch), v.branches.find(x => x.id === S.route.branch).cadence.type, +sn.value);
  $$('[data-target]').forEach(el => el.onchange = () => {
    const b = v.branches.find(x => x.id === S.route.branch);
    const t = S.route.topic ? b.topics.find(x => x.id === S.route.topic) : (b.topics.find(x => !x.closed) || b.topics[0]);
    A.setTarget(b, t, el.dataset.target, +el.value);
  });
  $$('[data-vis]').forEach(el => el.onclick = () => confirmVisibility(el.dataset.vis === 'public'));
  const ff = $('#fFilter'); if (ff) ff.oninput = () => { S.filter = ff.value; render();
    const n = $('#fFilter'); if (n) { n.focus(); n.setSelectionRange(S.filter.length, S.filter.length); } };
  const lf = $('#lFilter'); if (lf) lf.oninput = () => { S.logFilter = lf.value; S.logN = 40; render();
    const n = $('#lFilter'); if (n) { n.focus(); n.setSelectionRange(S.logFilter.length, S.logFilter.length); } };
  $$('[data-act]').forEach(el => el.onclick = () => act(el.dataset.act));
  $$('[data-pickrepo]').forEach(el => el.onclick = () =>
    onb.finishWithRepo(S.auth, S.pickRepos[+el.dataset.pickrepo], onReadyVault, onErrorVault));
  if (S.route.name === 'connect') onb.wireConnect();
  if (S.route.name === 'pubprompt') $('#pubGo').onclick = () =>
    go(`#/u/${$('#pubOwner').value.trim()}/${$('#pubRepo').value.trim() || onb.DEFAULT_REPO}`);
}
function act(name) {
  switch (name) {
    case 'home': S.vault && !S.readonly ? go('#/today') : (S.vault = null, S.readonly = false, go('#/')); break;
    case 'connect': go('#/connect'); break;
    case 'viewpublic': S.route = { name: 'pubprompt' }; render(); break;
    case 'commit': openComposer(); break;
    case 'sparse': openSparse(); break;
    case 'rebuild': A.rebuildIndex(); break;
    case 'more': S.logN = (S.logN || 40) + 40; render(); break;
    case 'copy': { const i = $('#shareUrl'); i.select(); navigator.clipboard?.writeText(i.value); toast('Link copied'); break; }
    case 'signout': S.auth?.signOut(); S.vault = null; S.gh = null; S.route = { name: 'home' }; location.hash = '#/'; render(); break;
    case 'recheck': onb.resolveVault(S.auth, onReadyVault, onErrorVault); break;
  }
}
/* Visibility is a one-way door for anything already read, so it asks. */
function confirmVisibility(makePublic) {
  const v = S.vault;
  if (makePublic === !v.repo.private) return;
  if (!makePublic) { A.setVisibility(false); return; }
  openSheet('#composer', {
    head: `<span class="pr">$</span><span class="mono" style="font-size:14px">gh repo edit --visibility public</span>
      <button class="iconbtn" data-close style="margin-left:auto">✕</button>`,
    body: `<div style="padding:18px"><p style="font-size:14px;line-height:1.6">You are about to make
      <span class="mono">${esc(v.repo.owner)}/${esc(v.repo.name)}</span> readable by anyone on the internet.</p>
      <div class="expose" style="margin-top:14px">That includes:
        <ul><li>every branch name, README and goal</li>
          <li><b>every commit message you have ever written</b></li>
          <li>every metric value, date and time of day</li>
          <li>relapses on abstain branches</li></ul></div>
      <p class="hint">Nobody else can write to it — they have no token, and GitHub will not accept commits from them.
        Turning it back to private stops new readers, but anything already copied stays copied.</p></div>`,
    foot: `<button class="btn btn-g" data-close>cancel</button>
      <button class="btn btn-p" id="visGo">make it public</button>`,
  });
  $$('[data-close]').forEach(el => el.onclick = closeAll);
  $('#visGo').onclick = () => { closeAll(); A.setVisibility(true); };
}
function openSparse() {
  const v = S.vault;
  openSheet('#composer', {
    head: `<span class="pr">$</span><span class="mono" style="font-size:14px">git sparse-checkout set</span>
      <button class="iconbtn" data-close style="margin-left:auto">✕</button>`,
    body: `<div style="padding:18px"><p class="hint" style="margin:0 0 14px">Everything stays in the vault and keeps
      its history. Checking a branch out just means it appears in the sidebar and in today's queue. Park the ones you
      are not working on — <b>a habit you are not currently running should not cost you attention every morning.</b></p>
      ${v.groups.map((g) => { const items = v.branches.filter(b => !b.mergedAt && b.group === g.id);
        if (!items.length) return '';
        return `<div class="wsec"><label class="lbl" style="display:block;margin-bottom:8px">${esc(g.label)}</label>
          <div class="chipsel">${items.map(b => `<button class="${b.checkedOut ? 'on' : ''}" data-co="${esc(b.id)}">${b.checkedOut ? '●' : '○'} ${esc(b.id)}</button>`).join('')}</div></div>`;
      }).join('')}</div>`,
    foot: `<button class="btn btn-p" data-close style="margin-left:auto">done</button>`,
  });
  $$('[data-close]').forEach(el => el.onclick = () => { closeAll(); render(); });
  $$('#composer [data-co]').forEach(el => el.onclick = async () => {
    await A.toggleCheckout(S.vault.branches.find(b => b.id === el.dataset.co)); openSparse();
  });
}
function dayTip(dk) {
  const v = S.vault, d = parse(dk), rows = [];
  v.branches.forEach(b => (b.byDay[dk] || []).forEach((c) => {
    if (S.route.name === 'branch' && b.id !== S.route.branch) return;
    if (S.route.topic && c.topic.id !== S.route.topic) return;
    rows.push(c);
  }));
  const body = rows.length ? rows.map((c) => {
    const m0 = c.topic.metrics?.[0], val = m0 ? c.metrics?.[m0.k] : null;
    return `<div class="t-r"><span class="sw" style="background:${c.topic.color}"></span>
      <span style="font-size:11.5px">${c.relapse ? 'relapse' : esc(c.topic.full)}</span>
      <span class="v">${val != null ? esc(val) + esc(m0.unit || '') : '✓'}</span></div>`;
  }).join('') : '<div class="sec" style="font-size:11.5px">no commits</div>';
  return `<div class="t-d">${fmtDate(d)}${dk === v.today ? ' · today' : ''}</div>${body}`;
}
function openDrawer(dk) {
  const v = S.vault, d = parse(dk);
  const rows = v.branches.flatMap(b => b.byDay[dk] || []);
  $('#drawer').innerHTML = `<div class="dh">
      <button class="iconbtn" id="dPrev">‹</button><button class="iconbtn" id="dNext">›</button>
      <div><h3>${fmtDate(d)}</h3><div class="muted mono" style="font-size:11px">${rel(d, parse(v.today))} · ${rows.length} commit${rows.length === 1 ? '' : 's'}</div></div>
      <button class="iconbtn" style="margin-left:auto" id="dClose">✕</button></div>
    <div class="log" style="padding:6px 20px">${rows.length ? logList(rows)
      : `<div style="padding:38px 0;text-align:center"><div style="font-size:24px;opacity:.3">◻︎</div>
         <p class="muted" style="margin-top:10px;font-size:13px">Nothing committed on this day.</p></div>`}</div>
    ${S.readonly ? '' : `<div style="padding:16px 20px;display:flex;gap:9px;border-top:1px solid var(--rule)">
      <button class="btn btn-g" id="dAdd">＋ commit</button></div>`}`;
  $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
  $('#dClose').onclick = closeAll;
  $('#dPrev').onclick = () => openDrawer(key(addD(d, -1)));
  $('#dNext').onclick = () => { const n = addD(d, 1); if (key(n) <= v.today) openDrawer(key(n)); };
  const add = $('#dAdd'); if (add) add.onclick = () => { closeAll(); openComposer(null, dk); };
}

/* ── palette commands ────────────────────────────────────── */
function commands() {
  const v = S.vault; if (!v) return [{ t: 'connect github', d: 'get started', run: () => go('#/connect') }];
  const active = v.branches.filter(b => !b.mergedAt);
  const rw = !S.readonly;
  return [
    ...(rw ? [{ t: 'commit', d: 'log an instance', k: 'c', run: () => openComposer() }] : []),
    ...SECTIONS.map(([k, l, g]) => ({ t: `goto ${k}`, d: l, ico: g, run: () => goSection(k) })),
    ...(rw ? active.flatMap(b => b.topics.filter(t => !t.closed).map(t =>
      ({ t: `commit ${t.full}`, d: (t.metrics || []).map(m => m.k).join(' · '), ico: b.emoji, run: () => openComposer(t.full) }))) : []),
    ...v.branches.map(b => ({ t: `checkout ${b.id}`, d: 'branch', ico: b.emoji, run: () => goBranch(b.id) })),
    ...v.branches.flatMap(b => b.topics.filter(t => !t.implicit).map(t =>
      ({ t: `checkout ${t.full}`, d: t.closed ? 'merged topic' : 'topic branch', run: () => goBranch(b.id, t.id) }))),
    ...(rw ? [{ t: 'branch new', d: 'create a branch', run: () => openWizard() }] : []),
    ...(rw ? active.map(b => ({ t: `checkout -b ${b.id}/<topic>`, d: 'new focus, same streak', ico: b.emoji, run: () => openWizard('', b.id) })) : []),
    ...(rw ? [{ t: 'sparse-checkout', d: 'park branches you are not running', run: () => openSparse() }] : []),
    ...(rw ? [{ t: 'vault settings', d: 'visibility, index, token', run: () => goSection('account') }] : []),
    ...(rw ? [{ t: 'rebuild index', d: '.commitd/index.json', run: () => A.rebuildIndex() }] : []),
    { t: 'theme toggle', d: 'dark ⇄ light', k: 't', run: () => setTheme(S.theme === 'dark' ? 'light' : 'dark') },
  ];
}

/* ── boot ────────────────────────────────────────────────── */
async function route() {
  const r = parseHash();
  if (r.name === 'public') {
    S.route = { name: 'boot' }; S.busy = 'reading public vault'; render();
    try {
      const vault = await onb.loadPublic(r.owner, r.repo);
      S.vault = vault; S.readonly = true; S.gh = null;
      S.route = { name: 'section', section: 'today' }; S.tab = null;
    } catch (e) { S.route = { name: 'error' }; S.error = e.message; }
    render(); return;
  }
  if (S.readonly && r.name !== 'public') { S.vault = null; S.readonly = false; }
  if (r.name === 'section' || r.name === 'branch') {
    if (!S.vault) { location.hash = '#/'; return; }
  }
  S.route = r; S.tab = r.tab || null; render();
}

async function boot() {
  document.documentElement.dataset.theme = S.theme;
  initSheets(); initPalette(commands);
  $('#themeBtn').onclick = () => setTheme(S.theme === 'dark' ? 'light' : 'dark');
  $('#openPalette').onclick = () => openPalette();
  $('#fab').onclick = () => openComposer();
  $('#avatar').onclick = () => goSection('account');
  $('#newBranch').onclick = () => openWizard();
  $('#sFilter').oninput = (e) => { S.filter = e.target.value; sidebar(); wire();
    const n = $('#sFilter'); n.focus(); n.setSelectionRange(S.filter.length, S.filter.length); };
  addEventListener('hashchange', route);
  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (S.vault) openPalette(); return; }
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    if (!S.vault) return;
    if (e.key === 'c' && !S.readonly) { e.preventDefault(); openComposer(); }
    if (e.key === 't') setTheme(S.theme === 'dark' ? 'light' : 'dark');
    if (e.key === 'g') { S._g = true; return; }
    if (S._g) { const m = { t: 'today', v: 'vault', i: 'insights', l: 'log' }[e.key]; if (m) goSection(m); S._g = false; }
  });
  store.on(() => render());

  /* Coming back from GitHub's OAuth redirect? Finish the exchange first. */
  const landing = OAuthAuth.landing();
  if (landing) return onb.completeOAuth(landing, onReadyVault, onErrorVault);

  const r = parseHash();
  if (r.name === 'public') return route();

  const auth = new OAuthAuth(); S.auth = auth;
  if (auth.state() === 'session' && await auth.restore()) {
    if (auth.stale()) { try { await auth.refresh(); } catch { auth.signOut(); } }
    if (auth.getToken()) {
      /* Signed in but the vault was never resolved (closed the tab on the
         install screen, say) — pick up where that left off. */
      if (!auth.identity()?.repo) return onb.resolveVault(auth, onReadyVault, onErrorVault);
      return openVault(auth);
    }
  }
  S.route = r.name === 'connect' ? r : { name: 'home' }; render();
}
function onReadyVault({ gh, vault, auth }) {
  S.gh = gh; S.vault = vault; S.auth = auth; S.readonly = false;
  location.hash === '#/today' ? route() : go('#/today');
}
function onErrorVault(msg) { S.route = { name: 'error' }; S.error = msg; render(); }
async function openVault(auth) {
  const who = auth.identity();
  if (!who?.login || !who?.repo) { auth.signOut(); S.route = { name: 'home' }; render(); return; }
  S.route = { name: 'boot' }; S.busy = 'opening vault'; render();
  const gh = new GitHub({ token: auth.getToken(), owner: who.repoOwner || who.login, repo: who.repo });
  try {
    const info = await gh.repoInfo();
    gh.branch = info.default_branch || 'main';
    const vault = await V.loadVault(gh, { onProgress: (m) => { S.busy = m; render(); } });
    if (!vault) throw new Error('That repository is not a commitd vault.');
    vault.repo = { name: who.repo, private: info.private, url: info.html_url, owner: who.repoOwner || who.login };
    S.gh = gh; S.vault = vault; S.readonly = false;
    route();
  } catch (e) {
    S.route = { name: 'error' };
    S.error = e.status === 401 ? 'The stored token is no longer valid — it may have expired. Sign in again.' : (e.message || String(e));
    render();
  }
}
boot();
