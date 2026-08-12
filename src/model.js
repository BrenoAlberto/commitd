/* The rules. Everything here is derived from commits — nothing in this file
   is ever persisted, so a corrupt cache can always be thrown away. */
import { key, parse, addD, dayDiff, WD } from './util.js';
import { slotOf, shade, BRANCH_STEPS, TOPIC_STEPS, DEFAULT_GROUPS } from './theme.js';

export const CADENCES = [
  ['daily',        'every day'],
  ['weekdays',     'weekdays'],
  ['n_per_week',   'N× / week'],
  ['n_per_month',  'N× / month'],
  ['open',         'no target'],
  ['abstain',      'abstain'],
];
export const METRIC_TYPES = [
  ['count', 'count'], ['duration', 'duration'], ['time', 'time of day'],
  ['scalar', 'amount'], ['rating', 'rating 1–5'], ['bool', 'yes/no'],
];

export const isAbstain = (b) => b.cadence?.type === 'abstain';
export const cadenceLabel = (b) => ({
  daily: 'every day', weekdays: 'weekdays', abstain: 'abstain · a clean day is a win',
  n_per_week: `${b.cadence.n}× per week`, n_per_month: `${b.cadence.n}× per month`,
  open: 'no target',
}[b.cadence?.type] || 'no target');
export const statusLabel = (b, s) => ({
  pass: isAbstain(b) ? 'clean' : 'on cadence', pend: 'due today',
  fail: isAbstain(b) ? 'relapse logged today' : 'behind cadence', merged: 'part of main',
}[s]);

export const targetAt = (m, dk) => {
  let v = m.targets?.[0]?.v ?? 0;
  (m.targets || []).forEach(t => { if (dk >= t.from) v = t.v; });
  return v;
};

/* ── per-day facts ───────────────────────────────────────── */
export const inLife  = (b, dk) => dk >= b.created && dk <= (b.mergedAt || b.today);
export const dayList = (b, dk) => b.byDay[dk] || [];
export const dayCount = (b, dk) => dayList(b, dk).filter(c => !c.relapse).length;
export const satisfied = (b, dk) => isAbstain(b) ? !dayList(b, dk).length : dayCount(b, dk) > 0;

/* A parent grid can never be metric-driven: you cannot add kana to pages.
   So it answers "did you show up", which stays meaningful for ten years. */
export function branchLevel(b, dk) {
  if (isAbstain(b)) return dayList(b, dk).length ? -1 : 3;
  const n = dayCount(b, dk);
  return n === 0 ? 0 : n === 1 ? 2 : n === 2 ? 3 : 4;
}
/* A topic grid is p90-normalised, not max-normalised, so one heroic
   Saturday does not flatten the rest of the year into pale nothing. */
export function topicLevels(t) {
  const vals = Object.values(t.byDay)
    .map(c => (t.gridMetric ? (c.metrics?.[t.gridMetric] ?? 1) : 1))
    .filter(v => v > 0).sort((a, b) => a - b);
  const p90 = vals.length ? vals[Math.floor(vals.length * .9)] : 1;
  return (c) => {
    if (!c) return 0;
    if (!t.gridMetric) return 3;
    const v = c.metrics?.[t.gridMetric] ?? 1;
    return Math.max(1, Math.min(4, Math.ceil(Math.min(1, v / Math.max(p90, 1)) * 4)));
  };
}

/* ── cadence maths ───────────────────────────────────────── */
const periodSpan = (b) => b.cadence.type === 'n_per_month' ? 30 : 7;

export function streak(b) {
  const today = parse(b.today);
  if (b.mergedAt) return dayDiff(parse(b.created), parse(b.mergedAt));
  if (b.cadence.type === 'n_per_week' || b.cadence.type === 'n_per_month') {
    const span = periodSpan(b); let w = 0;
    for (let k = 0; k < 60; k++) {
      let n = 0;
      for (let i = 0; i < span; i++) if (dayCount(b, key(addD(today, -(k * span) - i)))) n++;
      if (k === 0) { w += n > 0 ? 1 : 0; continue; }
      if (n >= b.cadence.n) w++; else break;
    }
    return w * b.cadence.n;
  }
  let n = 0, d = new Date(today);
  while (n < 3650) {
    const dk = key(d);
    if (!inLife(b, dk)) break;
    if (satisfied(b, dk)) n++;
    else if (dayDiff(d, today) !== 0) break;   // today may still be open
    d = addD(d, -1);
  }
  return n;
}
export function longest(b) {
  let best = 0, cur = 0;
  const end = b.mergedAt ? parse(b.mergedAt) : parse(b.today);
  for (let d = parse(b.created); d <= end; d = addD(d, 1)) {
    if (satisfied(b, key(d))) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return best;
}
export function uptime(b, days = 30) {
  const today = parse(b.today);
  let hit = 0, exp = 0;
  for (let i = 0; i < days; i++) {
    const dk = key(addD(today, -i));
    if (!inLife(b, dk)) continue;
    const t = b.cadence.type;
    if (t === 'n_per_week')       { exp += b.cadence.n / 7;  if (dayCount(b, dk)) hit++; }
    else if (t === 'n_per_month') { exp += b.cadence.n / 30; if (dayCount(b, dk)) hit++; }
    else if (t === 'open')        { exp += .001;             if (dayCount(b, dk)) hit++; }
    else                          { exp += 1;                if (satisfied(b, dk)) hit++; }
  }
  return exp ? Math.min(1, hit / exp) : 0;
}
export function status(b) {
  if (b.mergedAt) return 'merged';
  const today = b.today;
  if (isAbstain(b)) return dayList(b, today).length ? 'fail' : 'pass';
  if (b.cadence.type === 'open') return dayCount(b, today) ? 'pass' : 'pend';
  if (b.cadence.type === 'n_per_week' || b.cadence.type === 'n_per_month') {
    const span = periodSpan(b); let n = 0;
    for (let i = 0; i < span; i++) if (dayCount(b, key(addD(parse(today), -i)))) n++;
    return n >= b.cadence.n ? 'pass' : n >= b.cadence.n - 1 ? 'pend' : 'fail';
  }
  if (b.cadence.type === 'weekdays' && [0, 6].includes(parse(today).getDay())) return 'pass';
  if (dayCount(b, today)) return 'pass';
  return dayCount(b, key(addD(parse(today), -1))) ? 'pend' : 'fail';
}

/* ── hydration: defs + commits → a renderable vault ──────── */
export function hydrate(vault) {
  const today = vault.today || key(new Date());
  const groups = vault.groups?.length ? vault.groups : DEFAULT_GROUPS;
  vault.groups = groups;
  vault.branches.forEach((b) => {
    b.today = today;
    b.slot = slotOf(groups, b.group);
    const gi = vault.branches.filter(x => x.group === b.group).indexOf(b);
    b.color = shade(b.slot, BRANCH_STEPS[gi % 4]);
    b.commits = []; b.byDay = {};
    b.topics.forEach((t, ti) => {
      t.parent = b;
      t.full = t.implicit ? b.id : `${b.id}/${t.id}`;
      t.slot = b.slot;
      t.color = t.implicit ? b.color : shade(b.slot, TOPIC_STEPS[ti % 4]);
      t.commits = (t.commits || []).slice().sort((a, c) => (a.ts < c.ts ? 1 : -1));
      t.byDay = {};
      t.commits.forEach((c) => {
        c.topic = t;
        t.byDay[c.date] = c;
        b.commits.push(c);
        (b.byDay[c.date] ||= []).push(c);
      });
      t.lvl = topicLevels(t);
    });
    b.commits.sort((a, c) => (a.ts < c.ts ? 1 : -1));
    recompute(b);
  });
  return vault;
}
export function recompute(b) {
  b.openTopics   = b.topics.filter(t => !t.implicit && !t.closed);
  b.mergedTopics = b.topics.filter(t => !t.implicit && t.closed);
  b.releases     = b.mergedTopics
    .slice().sort((a, c) => (a.closed < c.closed ? -1 : 1))
    .map((t, i) => ({ v: `v0.${i + 1}.0`, t, date: t.closed }));
  b.topics.forEach(t => { t.lvl = topicLevels(t); });
  b.st      = status(b);
  b.streak  = streak(b);
  b.longest = longest(b);
  b.up30    = uptime(b, 30);
  b.up90    = uptime(b, 90);
  return b;
}
/* Attach a freshly written commit without a full reload. */
export function addCommit(b, t, c) {
  c.topic = t;
  t.commits.unshift(c); t.byDay[c.date] = c;
  b.commits.unshift(c); (b.byDay[c.date] ||= []).push(c);
  recompute(b);
}

/* ── cross-branch views ──────────────────────────────────── */
export const dueToday = (v) => v.branches.filter(
  b => !b.mergedAt && b.checkedOut && !isAbstain(b) && b.st !== 'pass');

export function unifiedDays(vault, from, days) {
  const m = {}, counts = [];
  for (let i = 0; i < days; i++) {
    const dk = key(addD(from, i));
    let n = 0, r = false;
    const bySlot = {};
    vault.branches.forEach((b) => {
      if (!b.checkedOut && !b.mergedAt) return;
      dayList(b, dk).forEach(c => { if (c.relapse) r = true; else { n++; bySlot[b.slot] = (bySlot[b.slot] || 0) + 1; } });
    });
    /* the slot that owns the day — most commits wins, ties go to the lower slot */
    let s = null;
    Object.keys(bySlot).forEach(k => { if (s === null || bySlot[k] > bySlot[s] || (bySlot[k] === bySlot[s] && +k < +s)) s = k; });
    m[dk] = { n, r, ...(s !== null ? { s: +s } : {}) };
    if (n) counts.push(n);
  }
  counts.sort((a, b) => a - b);
  return { m, p90: counts.length ? counts[Math.floor(counts.length * .9)] : 1 };
}
export function weekdayProfile(list) {
  const c = [0, 0, 0, 0, 0, 0, 0];
  list.forEach(x => c[parse(x.date).getDay()]++);
  return c.map((n, i) => ({ day: WD[i], n }));
}
export function gapsFor(b) {
  let gap = 0, cur = 0, breaks = 0; const rec = [];
  for (let d = parse(b.created); d <= parse(b.today); d = addD(d, 1)) {
    if (dayCount(b, key(d))) { if (cur > 1) { breaks++; rec.push(cur); } gap = Math.max(gap, cur); cur = 0; }
    else cur++;
  }
  rec.sort((a, c) => a - c);
  return { gap, breaks, median: rec.length ? rec[Math.floor(rec.length / 2)] : 0 };
}
