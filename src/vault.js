/* The vault: how a habit becomes files, and back again.

   branches/<id>/branch.json                 the commitment (cadence, why)
   branches/<id>/log/YYYY-MM.jsonl           one JSON object per line = one commit
   branches/<id>/topics/<tid>/branch.json    the goal (metrics, targets)
   branches/<id>/topics/<tid>/log/…jsonl
   .commitd/index.json                       a rebuildable cache, never the truth
   README.md                                 an ASCII grid, so the repo itself reads

   Everything is plain text and greppable on purpose. If commitd disappears
   tomorrow, `grep kana branches/-/log/-.jsonl` still works (with real globs). */

import { key, parse, addD, dayDiff, MONTHS, pool, shortSha } from './util.js';
import { hydrate } from './model.js';
import { t as i18nt } from './i18n.js';
import { DEFAULT_GROUPS } from './theme.js';

export const SCHEMA = 1;
export const RECENT_DAYS = 180;

export const paths = {
  meta:   () => 'commitd.json',
  index:  () => '.commitd/index.json',
  readme: () => 'README.md',
  branch: (b) => `branches/${b}/branch.json`,
  branchReadme: (b) => `branches/${b}/README.md`,
  topic:  (b, t) => `branches/${b}/topics/${t}/branch.json`,
  log:    (b, t, ym) => t ? `branches/${b}/topics/${t}/log/${ym}.jsonl`
                          : `branches/${b}/log/${ym}.jsonl`,
};
const ym = (dk) => dk.slice(0, 7);

/* ── definitions in / out ────────────────────────────────── */
const branchDef = (b) => ({
  id: b.id, title: b.title, emoji: b.emoji, group: b.group,
  created: b.created, cadence: b.cadence, status: b.mergedAt ? 'merged' : 'active',
  mergedAt: b.mergedAt || null, checkedOut: b.checkedOut !== false,
  topics: b.topics.filter(t => !t.implicit).map(t => t.id),
});
const topicDef = (t) => ({
  id: t.id, parent: t.parent?.id, title: t.title, goal: t.goal,
  opened: t.opened, closed: t.closed || null,
  gridMetric: t.gridMetric || null, metrics: t.metrics || [],
});
export const commitLine = (c) => JSON.stringify({
  id: c.sha, ts: c.ts, date: c.date, message: c.message,
  metrics: c.metrics || {}, tags: c.tags || [],
  ...(c.link ? { link: c.link } : {}), ...(c.relapse ? { relapse: true } : {}),
  ...(c.backfilled ? { backfilled: true } : {}),
});
const parseLog = (text) => (text || '').split('\n').filter(Boolean).map((l) => {
  try { const o = JSON.parse(l); return { ...o, sha: o.id }; } catch { return null; }
}).filter(Boolean);

/* ── the cache ───────────────────────────────────────────── */
export function buildIndex(vault) {
  const today = vault.today, cutoff = key(addD(parse(today), -RECENT_DAYS));
  const days = {}, recent = [];
  vault.branches.forEach(b => b.topics.forEach((t) => {
    const d = days[t.full] = {};
    t.commits.forEach((c) => {
      /* A day can hold several commits — count them all, or the reload
         renders fewer commits than the logs hold. */
      const e = d[c.date] ||= { n: 0, m: {} };
      e.n++; e.m = c.metrics || e.m; if (c.relapse) e.r = 1;
      if (c.date >= cutoff) recent.push({ t: t.full, ...JSON.parse(commitLine(c)) });
    });
  }));
  return JSON.stringify({
    v: SCHEMA, generatedAt: new Date().toISOString(), today,
    groups: vault.groups || DEFAULT_GROUPS,
    branches: vault.branches.map(b => ({ ...branchDef(b), why: b.why || '',
      topicDefs: b.topics.map(t => ({ ...topicDef(t), implicit: !!t.implicit })) })),
    days, recent,
  }, null, 0);
}
/* Days outside the recent window come back as facts without prose: enough for
   every grid, streak and chart. The words are fetched on demand — see
   ensureHistory. */
export function vaultFromIndex(json, meta = {}) {
  const ix = typeof json === 'string' ? JSON.parse(json) : json;
  const today = key(new Date());
  const recentBy = {};
  (ix.recent || []).forEach((c) => { (((recentBy[c.t] ||= {})[c.date]) ||= []).push(c); });
  const branches = (ix.branches || []).map((bd) => {
    const b = { ...bd, why: bd.why || '', mergedAt: bd.mergedAt || null, topics: [] };
    b.topics = (bd.topicDefs || []).map((td) => {
      const t = { ...td, commits: [] };
      const days = ix.days?.[td.implicit ? bd.id : `${bd.id}/${td.id}`] || {};
      Object.entries(days).forEach(([date, d]) => {
        const full = recentBy[td.implicit ? bd.id : `${bd.id}/${td.id}`]?.[date];
        if (full) full.forEach(c => t.commits.push({ ...c, sha: c.id, metrics: c.metrics || {} }));
        /* Older than the recent window: facts without prose — one synthetic
           commit per logged instance, so counts and grids stay honest. */
        else for (let i = 0; i < (d.n || 1); i++)
          t.commits.push({ date, ts: `${date}T12:00`, message: '', metrics: d.m || {}, tags: [],
            relapse: !!d.r, sha: shortSha(date + td.id + i), synthetic: true });
      });
      return t;
    });
    return b;
  });
  return hydrate({ ...meta, today, groups: ix.groups || DEFAULT_GROUPS, branches,
                   generatedAt: ix.generatedAt });
}

/* ── cold read ───────────────────────────────────────────── */
export async function loadVault(gh, { onProgress = () => {} } = {}) {
  onProgress(i18nt('reading vault'));
  const metaRaw = await gh.readFile(paths.meta());
  if (!metaRaw) return null;                       // not a commitd vault
  const meta = JSON.parse(metaRaw);
  const ixRaw = await gh.readFile(paths.index());
  if (ixRaw) {
    try { return { ...vaultFromIndex(ixRaw, { meta }), meta }; }
    catch { /* corrupt cache: fall through and rebuild */ }
  }
  onProgress(i18nt('no index — rebuilding from logs'));
  return rebuildVault(gh, meta, onProgress);
}

/* The slow, always-correct path. Also what "rebuild index" runs. */
export async function rebuildVault(gh, meta, onProgress = () => {}) {
  const tree = await gh.tree();
  const bySha = Object.fromEntries(tree.map(n => [n.path, n.sha]));
  const branchFiles = tree.filter(n => /^branches\/[^/]+\/branch\.json$/.test(n.path));
  onProgress(i18nt('reading {0} branches', branchFiles.length));

  const branches = await pool(branchFiles, 6, async (n) => {
    const id = n.path.split('/')[1];
    const def = JSON.parse(await gh.readBlob(n.sha));
    const why = bySha[paths.branchReadme(id)] ? await gh.readBlob(bySha[paths.branchReadme(id)]) : '';
    const topicIds = tree.filter(x => new RegExp(`^branches/${id}/topics/[^/]+/branch\\.json$`).test(x.path))
      .map(x => x.path.split('/')[3]);
    const topics = [];
    if (!topicIds.length) {
      topics.push({ id: '', implicit: true, opened: def.created, closed: def.mergedAt || null,
        gridMetric: def.gridMetric || null, metrics: def.metrics || [], commits: [] });
    } else {
      for (const tid of topicIds) topics.push({ ...JSON.parse(await gh.readBlob(bySha[paths.topic(id, tid)])), commits: [] });
    }
    for (const t of topics) {
      const pre = t.implicit ? `branches/${id}/log/` : `branches/${id}/topics/${t.id}/log/`;
      const logs = tree.filter(x => x.path.startsWith(pre) && x.path.endsWith('.jsonl'));
      const texts = await gh.readBlobs(logs.map(l => l.sha), 6);
      texts.forEach(txt => t.commits.push(...parseLog(txt)));
    }
    return { ...def, why, mergedAt: def.mergedAt || null, topics };
  });
  onProgress('done');
  return { ...hydrate({ today: key(new Date()), groups: meta.groups || DEFAULT_GROUPS, branches }), meta };
}

/* Pull the real messages for one branch's whole history. Called when you open
   a Log tab, because that is the only place the words are needed. */
export async function ensureHistory(gh, vault, b) {
  if (b._full) return b;
  const tree = await gh.tree();
  for (const t of b.topics) {
    const pre = t.implicit ? `branches/${b.id}/log/` : `branches/${b.id}/topics/${t.id}/log/`;
    const logs = tree.filter(x => x.path.startsWith(pre) && x.path.endsWith('.jsonl'));
    const texts = await gh.readBlobs(logs.map(l => l.sha), 6);
    const all = texts.flatMap(parseLog);
    if (all.length) t.commits = all;
  }
  b._full = true;
  hydrate(vault);
  return b;
}

/* ── writes ──────────────────────────────────────────────── */
async function logFileFor(gh, vault, b, t, dk) {
  const p = paths.log(b.id, t.implicit ? null : t.id, ym(dk));
  const existing = await gh.readFile(p);
  return { path: p, existing: existing || '' };
}
export async function writeCommit(gh, vault, b, t, c) {
  const { path, existing } = await logFileFor(gh, vault, b, t, c.date);
  const append = (log) => (log ? log.replace(/\n*$/, '\n') : '') + commitLine(c) + '\n';
  const files = (log) => [
    { path, content: append(log) },
    { path: paths.index(), content: buildIndex(vault) },
    { path: paths.readme(), content: renderReadme(vault) },
  ];
  const scope = t.implicit ? b.id : `${b.id}/${t.id}`;
  const bits = Object.entries(c.metrics || {}).map(([k, v]) => `${k}: ${v}`);
  const msg = `${scope}: ${c.message}` + (bits.length ? `\n\n${bits.join('\n')}` : '')
    + ((c.tags || []).length ? `\ntags: ${c.tags.join(', ')}` : '');
  return gh.commitFiles(files(existing), msg, {
    authorDate: `${c.date}T${(c.ts.split('T')[1] || '12:00')}:00`,
    /* If the ref moves mid-write, re-read the log through the new head's
       tree (content-addressed, never stale) and re-append our line. */
    rebuild: async (treeSha) => files(await gh.readPathAt(treeSha, path)),
  });
}
export function metaFiles(vault) {
  return [
    { path: paths.index(),  content: buildIndex(vault) },
    { path: paths.readme(), content: renderReadme(vault) },
  ];
}
export async function writeBranch(gh, vault, b, message) {
  const files = [
    { path: paths.branch(b.id), content: JSON.stringify(branchDef(b), null, 2) },
    { path: paths.branchReadme(b.id), content: b.why || '' },
    ...b.topics.filter(t => !t.implicit).map(t => ({
      path: paths.topic(b.id, t.id), content: JSON.stringify(topicDef(t), null, 2) })),
    ...metaFiles(vault),
  ];
  /* An implicit topic has nowhere else to keep its metrics, so they ride on
     the branch file. */
  if (b.topics.length === 1 && b.topics[0].implicit) {
    const t = b.topics[0];
    files[0].content = JSON.stringify({ ...branchDef(b), gridMetric: t.gridMetric, metrics: t.metrics }, null, 2);
  }
  return gh.commitFiles(files, message);
}
export function bootstrapFiles(login) {
  const meta = { schemaVersion: SCHEMA, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayBoundary: 3, createdAt: new Date().toISOString(), owner: login, groups: DEFAULT_GROUPS };
  return [
    { path: paths.meta(), content: JSON.stringify(meta, null, 2) },
    { path: paths.index(), content: JSON.stringify({ v: SCHEMA, generatedAt: new Date().toISOString(),
        today: key(new Date()), groups: DEFAULT_GROUPS, branches: [], days: {}, recent: [] }) },
    { path: paths.readme(), content: `# commitd vault\n\nHabits as a git repository. Nothing here was written by hand — see https://github.com/${login}.\n` },
  ];
}

/* ── the repo reads as a document ────────────────────────── */
const BLOCKS = [' ', '·', '▪', '▩', '█'];
export function renderReadme(vault) {
  const today = parse(vault.today);
  const end = addD(today, 6 - today.getDay()), start = addD(end, -370);
  const grid = [];
  for (let r = 0; r < 7; r++) {
    let row = '';
    for (let w = 0; w < 53; w++) {
      const d = addD(start, w * 7 + r);
      if (d > today) { row += ' '; continue; }
      let n = 0;
      vault.branches.forEach((b) => { if (b.checkedOut || b.mergedAt) n += (b.byDay[key(d)] || []).filter(c => !c.relapse).length; });
      row += BLOCKS[Math.min(4, n)];
    }
    grid.push(row);
  }
  const active = vault.branches.filter(b => !b.mergedAt);
  const total = vault.branches.reduce((s, b) => s + b.commits.filter(c => !c.relapse).length, 0);
  const best = active.reduce((a, b) => (b.streak > (a?.streak ?? -1) ? b : a), null);
  const rows = active.slice().sort((a, b) => b.streak - a.streak).map(b =>
    `| \`${b.id}\` | ${b.cadence.type === 'abstain' ? 'abstain' : b.cadence.n ? `${b.cadence.n}×/${b.cadence.type === 'n_per_week' ? 'week' : 'month'}` : b.cadence.type} | ${b.streak} | ${Math.round(b.up30 * 100)}% | ${b.commits.length} |`);
  return `# commitd

_${total.toLocaleString()} commits · ${active.length} branches · longest current streak ${best?.streak ?? 0} days on \`${best?.id ?? '—'}\`_

\`\`\`
${grid.join('\n')}
\`\`\`

| branch | cadence | streak | uptime 30d | commits |
|---|---|---:|---:|---:|
${rows.join('\n')}

Every commit in this repository is one logged instance of a habit. The data is
plain text: \`branches/<name>/log/YYYY-MM.jsonl\`, one JSON object per line.

_Generated by [commitd](https://github.com/) — last updated ${new Date().toISOString().slice(0, 10)}._
`;
}
