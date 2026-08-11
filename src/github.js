/* A small GitHub client. Two things matter here:
   1. Reads are ETag-cached, so a warm load costs 304s instead of payloads.
   2. Writes go through the Git Data API rather than Contents, so a commit
      that touches three files lands as ONE real git commit — atomic, with a
      proper message and an author date, which is what makes your habits show
      up on your own GitHub contribution graph. */

import { b64encode, b64decode, pool } from './util.js';

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const CACHE_KEY = 'commitd.etag.v1';

export class GitHubError extends Error {
  constructor(status, message, body) { super(message); this.status = status; this.body = body; }
}

function loadCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; } }
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); }
  catch { localStorage.removeItem(CACHE_KEY); }   // quota — a cache may always be dropped
}

export class GitHub {
  constructor({ token, owner, repo, branch = 'main', fetchImpl } = {}) {
    this.token = token; this.owner = owner; this.repo = repo; this.branch = branch;
    this.fetch = fetchImpl || globalThis.fetch.bind(globalThis);
    this.cache = loadCache();
    this.rate = null;
    /* The last head we wrote. GET git/ref can lag behind a write we just
       made — freshly created repos are the worst — so between writes we
       trust our own record of the head over a re-read of the ref. */
    this.head = null;
  }
  get slug() { return `${this.owner}/${this.repo}`; }

  async req(path, { method = 'GET', body, etag = false, raw = false } = {}) {
    const url = path.startsWith('http') ? path : API + path;
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const cached = etag && this.cache[url];
    if (cached?.etag) headers['If-None-Match'] = cached.etag;

    const res = await this.fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const rl = res.headers?.get?.('x-ratelimit-remaining');
    if (rl != null) this.rate = { remaining: +rl, reset: +(res.headers.get('x-ratelimit-reset') || 0) };

    if (res.status === 304 && cached) return cached.body;
    if (res.status === 404) throw new GitHubError(404, 'not found');
    if (!res.ok) {
      let b = null; try { b = await res.json(); } catch {}
      throw new GitHubError(res.status, b?.message || `${method} ${path} → ${res.status}`, b);
    }
    if (res.status === 204) return null;
    const out = raw ? await res.text() : await res.json();
    if (etag) {
      const e = res.headers?.get?.('etag');
      if (e) { this.cache[url] = { etag: e, body: out }; saveCache(this.cache); }
    }
    return out;
  }

  /* ── identity & repo ───────────────────────────────────── */
  user()          { return this.req('/user'); }
  repoInfo()      { return this.req(`/repos/${this.slug}`); }
  createRepo(priv = true) {
    return this.req('/user/repos', { method: 'POST', body: {
      name: this.repo, private: priv, auto_init: true,
      description: 'My commitd vault — habits as a git repository.',
    }});
  }
  /* Needs Administration: write on the repo. If the token does not carry it we
     surface that instead of failing silently — see settings. */
  setVisibility(priv) {
    return this.req(`/repos/${this.slug}`, { method: 'PATCH', body: { private: !!priv } });
  }

  /* ── reads ─────────────────────────────────────────────── */
  async tree() {
    const t = await this.req(`/repos/${this.slug}/git/trees/${this.branch}?recursive=1`, { etag: true });
    return t.tree || [];
  }
  async readFile(path) {
    try {
      const r = await this.req(`/repos/${this.slug}/contents/${encodeURI(path)}?ref=${this.branch}`, { etag: true });
      return b64decode(r.content);
    } catch (e) { if (e.status === 404) return null; throw e; }
  }
  async readBlob(sha) {
    const r = await this.req(`/repos/${this.slug}/git/blobs/${sha}`, { etag: true });
    return b64decode(r.content);
  }
  readBlobs(shas, n = 8) { return pool(shas, n, (s) => this.readBlob(s)); }

  /* Reading a path through a tree sha is content-addressed, so unlike
     contents-by-ref it can never be stale. Used when a write must rebuild
     its files against a head somebody else just moved. */
  async readPathAt(treeSha, path) {
    const t = await this.req(`/repos/${this.slug}/git/trees/${treeSha}?recursive=1`);
    const n = (t.tree || []).find(x => x.path === path);
    return n ? this.readBlob(n.sha) : null;
  }

  /* A just-created repo's initial commit can take a moment to become
     visible through the Git Data API. Poll before the first write. */
  async waitForRef(tries = 8) {
    for (let i = 0; i < tries; i++) {
      try {
        const ref = await this.req(`/repos/${this.slug}/git/ref/heads/${this.branch}`);
        this.head = ref.object.sha;
        return ref;
      } catch (e) { if (e.status !== 404 && e.status !== 409) throw e; }
      await new Promise(r => setTimeout(r, 700));
    }
    throw new GitHubError(404, 'the new repository is still initialising — give it a few seconds and try again');
  }

  /* ── the atomic write ──────────────────────────────────── */
  async commitFiles(files, message, { authorDate, rebuild, _attempt = 0 } = {}) {
    const head = this.head
      || (await this.req(`/repos/${this.slug}/git/ref/heads/${this.branch}`)).object.sha;
    const base = await this.req(`/repos/${this.slug}/git/commits/${head}`);
    /* On a retry the ref moved under us: regenerate anything content-derived
       (the JSONL append) against the tree we are now committing on top of.
       Replaying the original files would silently drop the other writer's
       lines. */
    if (_attempt && rebuild) files = await rebuild(base.tree.sha);

    const blobs = await pool(files, 6, (f) =>
      this.req(`/repos/${this.slug}/git/blobs`, { method: 'POST',
        body: { content: b64encode(f.content), encoding: 'base64' } }));

    const tree = await this.req(`/repos/${this.slug}/git/trees`, { method: 'POST', body: {
      base_tree: base.tree.sha,
      tree: files.map((f, i) => ({ path: f.path, mode: '100644', type: 'blob', sha: blobs[i].sha })),
    }});

    const when = (authorDate ? new Date(authorDate) : new Date()).toISOString();
    const commit = await this.req(`/repos/${this.slug}/git/commits`, { method: 'POST', body: {
      message, tree: tree.sha, parents: [head],
      author: { name: this.owner, email: `${this.owner}@users.noreply.github.com`, date: when },
    }});

    try {
      await this.req(`/repos/${this.slug}/git/refs/heads/${this.branch}`, {
        method: 'PATCH', body: { sha: commit.sha, force: false } });
    } catch (e) {
      if ((e.status !== 422 && e.status !== 409) || _attempt >= 3) throw e;
      /* The ref moved: another device committed, or our view of the head was
         stale. Wait until the ref reads as something other than the head we
         just tried, then go again on top of it. */
      this.head = null;
      for (let i = 0; i < 5 && !this.head; i++) {
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
        const fresh = (await this.req(`/repos/${this.slug}/git/ref/heads/${this.branch}`)).object.sha;
        if (fresh !== head) { this.head = fresh; break; }
        /* git/ref can stay stale for a while after someone else's write;
           list-commits is served separately and often sees the head first. */
        try {
          const [c] = await this.req(`/repos/${this.slug}/commits?sha=${this.branch}&per_page=1`);
          if (c && c.sha !== head) this.head = c.sha;
        } catch { /* fall through to the next poll */ }
      }
      return this.commitFiles(files, message, { authorDate, rebuild, _attempt: _attempt + 1 });
    }
    this.head = commit.sha;
    return commit;
  }
}

/* Reading someone's public vault needs no token and no rate-limit budget:
   raw.githubusercontent.com is CORS-open and CDN-cached.

   Except on the networks where it isn't. Plenty of corporate proxies allow
   api.github.com and block raw.githubusercontent.com, so the reader falls
   back to the Contents API with the raw media type — unauthenticated, CORS
   enabled, 60 requests an hour, which is ample for reading one file. */
export class PublicReader {
  constructor({ owner, repo, branch = 'HEAD', fetchImpl } = {}) {
    Object.assign(this, { owner, repo, branch });
    this.fetch = fetchImpl || globalThis.fetch.bind(globalThis);
    this.via = null;
  }
  async readFile(path) {
    try {
      const res = await this.fetch(`${RAW}/${this.owner}/${this.repo}/${this.branch}/${path}`, { cache: 'no-cache' });
      if (res.status === 404) { this.via = 'raw'; return null; }
      if (res.ok) { this.via = 'raw'; return res.text(); }
    } catch { /* blocked or offline — try the API */ }
    const res = await this.fetch(`${API}/repos/${this.owner}/${this.repo}/contents/${encodeURI(path)}`,
      { headers: { Accept: 'application/vnd.github.raw' } });
    this.via = 'api';
    if (res.status === 404) return null;
    if (res.status === 403) throw new GitHubError(403, 'GitHub rate-limited this network for anonymous reads. Try again in a few minutes.');
    if (!res.ok) throw new GitHubError(res.status, `public read failed (${res.status})`);
    return res.text();
  }
}
