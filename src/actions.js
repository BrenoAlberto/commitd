/* Everything that changes the vault goes through here: mutate in memory,
   render immediately, then persist. If the write fails we say so and offer a
   reload rather than pretending it landed. */

import { key, parse, slug, shortSha, HHMM } from './util.js';
import { store, S } from './store.js';
import { hydrate, recompute, addCommit, topicLevels, isAbstain, targetAt, cadenceLabel } from './model.js';
import * as V from './vault.js';
import { slotOf, shade, BRANCH_STEPS, TOPIC_STEPS } from './theme.js';
import { toast, errToast, busy } from './ui.js';

const rw = () => !S.readonly && S.gh;

async function persist(fn, label) {
  if (!rw()) { toast('Read-only — nothing was written', 'err'); return false; }
  busy(label);
  try { await fn(); busy(null); return true; }
  catch (e) {
    busy(null);
    errToast(e.status === 403
      ? 'GitHub refused that write. The token may not have Contents: read/write on this repo.'
      : e.status === 404 ? 'Vault not found — check the repository still exists.' : e);
    return false;
  }
}
export const nowTs = (dk) => `${dk}T${HHMM(new Date().getHours() * 60 + new Date().getMinutes())}`;

/* ── commits ─────────────────────────────────────────────── */
export async function commit(b, t, { message, metrics = {}, tags = [], date, link }) {
  const dk = date || S.vault.today;
  const c = { date: dk, ts: nowTs(dk), message: message || (isAbstain(b) ? 'relapse logged' : 'done'),
    metrics, tags, link, relapse: isAbstain(b), backfilled: dk !== S.vault.today,
    sha: shortSha(t.full + dk + message + Math.random()) };
  addCommit(b, t, c);
  store.emit();
  const ok = await persist(async () => {
    const res = await V.writeCommit(S.gh, S.vault, b, t, c);
    c.sha = res.sha.slice(0, 7);
  }, 'writing commit');
  if (ok) toast(`<span class="mono">[${t.full} ${c.sha}]</span> ${message ? message.slice(0, 40) : ''}`);
  store.emit();
  return c;
}
/* One tap from the queue: takes the target as the value. */
export function quickCommit(b) {
  const t = b.topics.find(x => !x.closed); if (!t) return;
  const dk = S.vault.today, metrics = {};
  (t.metrics || []).forEach(m => { metrics[m.k] = targetAt(m, dk); });
  const m0 = t.metrics?.[0];
  const message = m0 ? `${metrics[m0.k]}${m0.unit || ''} — hit target` : 'done';
  return commit(b, t, { message, metrics });
}

/* ── branches ────────────────────────────────────────────── */
export async function createBranch(def) {
  const v = S.vault, id = slug(def.title);
  if (!id) { toast('Give it a name first', 'err'); return null; }
  if (v.branches.some(b => b.id === id)) { toast(`A branch called ${id} already exists`, 'err'); return null; }
  const created = v.today;
  const b = { id, title: def.title.trim(), emoji: def.emoji || '🌱', group: def.group,
    checkedOut: true, created, cadence: def.cadence, why: def.why || '', mergedAt: null,
    topics: [{ id: '', implicit: true, opened: created, closed: null,
      gridMetric: def.metrics[0]?.k || null, metrics: def.metrics, commits: [] }] };
  v.branches.push(b);
  hydrate(v); store.emit();
  const ok = await persist(() => V.writeBranch(S.gh, v, b, `branch ${id}: ${def.title}`), 'creating branch');
  if (ok) toast(`<span class="mono">${id}</span> created · ${cadenceLabel(b)} · ${def.metrics.length} metric${def.metrics.length === 1 ? '' : 's'}`);
  return b;
}
export async function createTopic(b, def) {
  const id = slug(def.title);
  if (!id) { toast('Give it a name first', 'err'); return null; }
  if (b.topics.length === 1 && b.topics[0].implicit && !b.topics[0].commits.length) b.topics = [];
  const t = { id, title: def.title.trim(), goal: def.goal || '—', opened: S.vault.today, closed: null,
    implicit: false, gridMetric: def.metrics[0]?.k || null, metrics: def.metrics, commits: [] };
  b.topics.push(t);
  hydrate(S.vault); store.emit();
  const ok = await persist(() => V.writeBranch(S.gh, S.vault, b, `checkout -b ${b.id}/${id}`), 'opening topic branch');
  if (ok) toast(`<span class="mono">${b.id}/${id}</span> opened — new goal, new metrics, <b>same streak</b>`);
  return t;
}
export async function mergeTopic(b, t) {
  if (!t || t.closed) return;
  t.closed = S.vault.today;
  recompute(b); store.emit();
  const rel = b.releases.at(-1);
  const ok = await persist(() => V.writeBranch(S.gh, S.vault, b, `merge ${b.id}/${t.id} → ${b.id}${rel ? ` (${rel.v})` : ''}`), 'merging topic');
  if (ok) toast(`<span class="mono">${b.id}/${t.id}</span> merged into <span class="mono">${b.id}</span> — ${t.commits.length} commits, tagged <span class="mono">${rel?.v || ''}</span>. The streak is untouched.`);
}
export async function mergeBranch(b) {
  if (b.mergedAt) return;
  b.mergedAt = S.vault.today;
  recompute(b); store.emit();
  const ok = await persist(() => V.writeBranch(S.gh, S.vault, b, `merge ${b.id} → main`), 'merging branch');
  if (ok) toast(`<span class="mono">${b.id}</span> merged into <span class="mono">main</span> — ${b.commits.length} commits, ${b.longest}-day best streak. It's yours now.`);
}
export async function setCadence(b, type, n) {
  b.cadence = /n_per/.test(type) ? { type, n: n || b.cadence.n || 3 } : { type };
  recompute(b); store.emit();
  await persist(() => V.writeBranch(S.gh, S.vault, b, `${b.id}: cadence → ${cadenceLabel(b)}`), 'saving cadence');
  toast(`cadence → <span class="mono">${cadenceLabel(b)}</span> · streak recomputed, no commit touched`);
}
/* Raising a target appends a dated entry. Nothing in the past is re-judged. */
export async function setTarget(b, t, mk, value) {
  const m = t.metrics.find(x => x.k === mk); if (!m || !value) return;
  if (value === targetAt(m, S.vault.today)) return;
  m.targets = m.targets.filter(x => x.from !== S.vault.today)
    .concat([{ from: S.vault.today, v: value }]).sort((a, c) => (a.from < c.from ? -1 : 1));
  store.emit();
  await persist(() => V.writeBranch(S.gh, S.vault, b, `${t.full}: ${mk} target → ${value}`), 'saving target');
  toast(`<span class="mono">${mk}</span> target → ${value} from today · earlier commits keep the old target`);
}
export async function toggleCheckout(b) {
  b.checkedOut = !b.checkedOut;
  store.emit();
  await persist(() => V.writeBranch(S.gh, S.vault, b, `sparse-checkout: ${b.checkedOut ? 'add' : 'remove'} ${b.id}`), 'saving');
  toast(`<span class="mono">${b.id}</span> ${b.checkedOut ? 'checked out — back in the sidebar and the queue' : 'parked — history kept, attention returned'}`);
}

/* ── the vault itself ────────────────────────────────────── */
export async function setVisibility(makePublic) {
  if (!rw()) return;
  busy(makePublic ? 'making the repository public' : 'making the repository private');
  try {
    await S.gh.setVisibility(!makePublic);
    S.vault.repo.private = !makePublic;
    busy(null); store.emit();
    toast(makePublic
      ? 'Vault is public. Anyone with the link can read it — nobody can write to it.'
      : 'Vault is private again. Existing links stop resolving.');
  } catch (e) {
    busy(null);
    errToast(e.status === 403
      ? 'Your token cannot change repository visibility — it needs Administration: read/write, or you can flip it on github.com.'
      : e);
  }
}
export async function rebuildIndex() {
  if (!rw()) return;
  busy('rebuilding index from every log file');
  try {
    const fresh = await V.rebuildVault(S.gh, S.vault.meta, (m) => busy(m));
    fresh.repo = S.vault.repo; fresh.meta = S.vault.meta;
    S.vault = fresh;
    await S.gh.commitFiles(V.metaFiles(fresh), 'rebuild index');
    busy(null); store.emit();
    toast('Rebuilt from your logs — everything is in sync.');
  } catch (e) { busy(null); errToast(e); }
}
export async function loadHistory(b) {
  if (!S.gh || b._full || S.readonly) return;
  busy(`reading ${b.id} history`);
  try { await V.ensureHistory(S.gh, S.vault, b); busy(null); store.emit(); }
  catch (e) { busy(null); errToast(e); }
}
