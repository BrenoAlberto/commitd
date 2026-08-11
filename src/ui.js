/* Sheets, tooltips, toasts and the command palette.

   The sheet geometry is measured, never assumed. A soft keyboard does not
   shrink the layout viewport in every browser — an in-app WebView usually
   leaves it alone and shrinks only the visual viewport, at which point vh,
   dvh, position:sticky and bottom:0 all quietly lie. So the sheet sizes
   itself to visualViewport.height and parks at its bottom edge, and the
   header and action bar are flex siblings of the scrolling body so they
   physically cannot scroll away. */

import { $, $$, esc } from './util.js';

const vv = globalThis.visualViewport;
export const vpH = () => globalThis.__vp?.h ?? (vv ? vv.height : innerHeight);
export const vpT = () => globalThis.__vp?.t ?? (vv ? vv.offsetTop : 0);

export function fitSheet() {
  const m = document.querySelector('.modal.on'); if (!m) return;
  const vh = vpH(), vtop = vpT(), phone = innerWidth <= 640, gap = phone ? 6 : 28;
  m.style.maxHeight = Math.max(220, vh - gap * 2) + 'px';
  const h = m.offsetHeight;
  m.style.setProperty('--sy', Math.round(phone ? vtop + vh - h : vtop + Math.max(gap, (vh - h) * 0.32)) + 'px');
}
function revealFocused() {
  const el = document.activeElement;
  if (el?.closest?.('.sheet-b')) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
let lockY = 0;
function lockScroll(on) {
  if (on) { lockY = scrollY; document.documentElement.classList.add('locked'); fitSheet(); }
  else if (document.documentElement.classList.contains('locked')) {
    document.documentElement.classList.remove('locked'); scrollTo(0, lockY);
  }
}
export function initSheets() {
  if (vv) { vv.addEventListener('resize', () => { fitSheet(); setTimeout(revealFocused, 60); });
            vv.addEventListener('scroll', fitSheet); }
  addEventListener('resize', fitSheet);
  addEventListener('orientationchange', () => setTimeout(fitSheet, 250));
  document.addEventListener('focusin', (e) => {
    if (!e.target.closest?.('.modal')) return;
    setTimeout(() => { fitSheet(); revealFocused(); }, 120);
    setTimeout(() => { fitSheet(); revealFocused(); }, 420);
  });
  new MutationObserver(() => lockScroll($('#scrim').classList.contains('on')))
    .observe($('#scrim'), { attributes: true, attributeFilter: ['class'] });
  $('#scrim').onclick = closeAll;
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
}
/* A sheet is: fixed header · scrolling body · fixed action bar. */
export function openSheet(target, { head, body, foot }) {
  const m = $(target);
  m.innerHTML = `<div class="cmdin">${head}</div>
    <div class="sheet-b">${body}</div>${foot ? `<div class="sheet-f">${foot}</div>` : ''}`;
  m.classList.add('on'); $('#scrim').classList.add('on');
  requestAnimationFrame(fitSheet);
  return m;
}
export const closeAll = () => {
  ['#palette', '#composer'].forEach(s => $(s)?.classList.remove('on'));
  $('#drawer')?.classList.remove('on');
  $('#scrim')?.classList.remove('on');
};

/* ── tooltip ─────────────────────────────────────────────── */
const tip = () => $('#tip');
export function showTip(e, html) { tip().innerHTML = html; tip().classList.add('on'); moveTip(e); }
export function moveTip(e) {
  const r = tip().getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY - r.height - 12;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y < 8) y = e.clientY + 18;
  tip().style.left = x + 'px'; tip().style.top = y + 'px';
}
export const hideTip = () => tip().classList.remove('on');
export function bindTip(sel, fn) {
  $$(sel).forEach((el) => {
    el.onmouseenter = (e) => showTip(e, fn(el));
    el.onmousemove = moveTip; el.onmouseleave = hideTip;
  });
}

/* ── toast ───────────────────────────────────────────────── */
let toastT;
export function toast(html, kind = 'ok') {
  const t = $('#toast');
  t.innerHTML = `<span style="color:var(--${kind === 'ok' ? 'good' : 'crit'})">${kind === 'ok' ? '✓' : '!'}</span><span>${html}</span>`;
  t.classList.add('on'); clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), kind === 'ok' ? 3600 : 6000);
}
export const errToast = (e) => toast(esc(e?.message || String(e)), 'err');

/* ── command palette ─────────────────────────────────────── */
let cmds = [], sel = 0, build = () => [];
export function initPalette(builder) { build = builder; }
export function openPalette(prefill = '') {
  sel = 0;
  const m = openSheet('#palette', {
    head: `<span class="pr">$</span><input id="cmdInput" placeholder="commit, checkout, branch new…" autocomplete="off" spellcheck="false">`,
    body: `<div class="cmdlist" id="cmdList"></div>`,
    foot: `<span class="muted mono" style="font-size:11px"><kbd>↑↓</kbd> navigate &nbsp; <kbd>↵</kbd> run &nbsp; <kbd>esc</kbd> close</span>`,
  });
  const inp = $('#cmdInput', m);
  inp.value = prefill;
  const paint = () => {
    const q = inp.value.toLowerCase().trim(), all = build();
    cmds = all.filter(c => !q || q.split(' ').every(w => c.t.toLowerCase().includes(w)));
    if (!cmds.length) cmds = all.slice(0, 1);
    sel = Math.max(0, Math.min(sel, cmds.length - 1));
    $('#cmdList').innerHTML = cmds.map((c, i) => `<button class="ci${i === sel ? ' sel' : ''}" data-ci="${i}">
      <span class="ico">${c.ico || '›'}</span><span class="t">${esc(c.t)}</span>
      <span class="d">${esc(c.d || '')}${c.k ? ` <kbd>${c.k}</kbd>` : ''}</span></button>`).join('');
    $$('#cmdList .ci').forEach(el => el.onclick = () => run(+el.dataset.ci));
    $('#cmdList .ci.sel')?.scrollIntoView({ block: 'nearest' });
    fitSheet();
  };
  const run = (i) => { const c = cmds[i]; closeAll(); c?.run?.(); };
  inp.oninput = () => { sel = 0; paint(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, cmds.length - 1); paint(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
    if (e.key === 'Enter')     { e.preventDefault(); run(sel); }
  };
  paint();
  if (matchMedia('(pointer:fine)').matches) setTimeout(() => inp.focus(), 60);
}

/* ── busy overlay ────────────────────────────────────────── */
export function busy(msg) {
  let b = $('#busy');
  if (!msg) { b?.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'busy';
    b.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:320;'
      + 'background:var(--raise);border:1px solid var(--rule);border-radius:2px;padding:10px 15px;font-size:13px;'
      + 'display:flex;gap:10px;align-items:center;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)';
    document.body.appendChild(b); }
  b.innerHTML = `<span class="spin"></span><span class="mono">${esc(msg)}</span>`;
}
