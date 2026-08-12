/* Small shared helpers. Only dependency: i18n, for display formatting.
   MONTHS/WD stay English — they are also used to build DATA. */

import { t } from './i18n.js';

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const el = (html) => { const t = document.createElement('template');
  t.innerHTML = html.trim(); return t.content.firstElementChild; };
/* Escape anything that came from the vault before it touches innerHTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ── dates ───────────────────────────────────────────────── */
export const key   = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const parse = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
export const addD  = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
export const dayDiff = (a, b) => Math.round((b - a) / 864e5);
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const fmtDate  = (d) => `${t(WD[d.getDay()])} ${d.getDate()} ${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
export const fmtShort = (s) => { const d = parse(s); return `${d.getDate()} ${t(MONTHS[d.getMonth()])} ${String(d.getFullYear()).slice(2)}`; };
export const HHMM = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

/* The day a timestamp belongs to. With dayBoundary = 3, anything logged
   before 03:00 counts for the previous day — which is the only way a
   `sleep` branch can ever be honest. */
export function dayOf(date, boundary = 0) {
  const d = new Date(date);
  if (d.getHours() < boundary) d.setDate(d.getDate() - 1);
  return key(d);
}
export const rel = (d, today) => {
  const n = dayDiff(d, today);
  return n === 0 ? t('today') : n === 1 ? t('yesterday') : n < 7 ? t('{0}d ago', n)
    : n < 35 ? t('{0}w ago', Math.round(n / 7)) : t('{0}mo ago', Math.round(n / 30));
};

/* ── misc ────────────────────────────────────────────────── */
export const slug = (x) => String(x).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/* A short content hash, shown before the real git sha comes back. */
export function shortSha(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}
export const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
};
export const b64decode = (b64) => {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const pct = (x) => `${Math.round(x * 100)}%`;

/* Run tasks with a concurrency cap — used when rebuilding the index
   from every log file in the vault. */
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}
