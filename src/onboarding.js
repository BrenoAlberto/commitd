/* Landing, the token flow, the account/vault screen (including visibility),
   and the read-only public view. */

import { $, $$, esc } from './util.js';
import { S, store } from './store.js';
import { GitHub, PublicReader, GitHubError } from './github.js';
import { PatAuth, tokenUrl } from './auth.js';
import * as V from './vault.js';
import { toast, errToast, busy } from './ui.js';
import { sechead } from './views.js';

export const DEFAULT_REPO = 'commitd-vault';

/* ═══════════ landing ═══════════ */
export function landingView() {
  return `<div class="center land">
    <div class="kicker">a daemon for the habits you keep</div>
    <h1>Your habits,<br>as a git repository.</h1>
    <p class="sub">commitd is a habit tracker that treats your life like a repo. It runs entirely in your browser,
      and stores every byte in a single GitHub repository that you own. No server, no database, no account with us —
      because there is no us.</p>
    <div class="cta">
      <button class="btn btn-p" data-act="connect">Connect GitHub</button>
      <button class="btn btn-g" data-act="viewpublic">View someone's public vault</button>
    </div>

    <div class="pt"><h3>The idea</h3>
      <p>A <b>branch</b> is a habit — a long-lived line of work running in parallel with your other lines of work.
        A <b>commit</b> is one instance of doing it: a message, some numbers, a couple of tags.</p>
      <p>A habit outlives its metrics. "14 kana" is true for six weeks; <span class="mono">practice-japanese</span>
        runs for years. So the metrics live on a <b>topic branch</b> — <span class="mono">practice-japanese/kana</span>,
        then <span class="mono">/vocab</span>, then <span class="mono">/grammar</span> — which merges into the parent
        when it's learned. The streak never notices.</p>
      <p>And when a habit no longer needs tracking, you <b>merge it into main</b>: the record of things that are simply
        part of how you live now. The goal was never to track forever. The goal is to merge.</p></div>

    <div class="pt"><h3>What it does differently</h3>
      <dl class="cols">
        <div><dt>Cadence, not guilt</dt><dd>A 3×/week branch keeps its streak through a rest day. Uptime sits next to
          the streak, because 94% survives one bad Tuesday and a streak doesn't.</dd></div>
        <div><dt>Abstain branches</dt><dd>For quitting, the grid fills green on its own and a commit is a relapse —
          logged without judgement, because a hidden relapse is the one that wins.</dd></div>
        <div><dt>Real git commits</dt><dd>Each entry is one atomic commit with the author date set to the day you
          logged. Your habits show up on your own GitHub contribution graph.</dd></div>
        <div><dt>Plain text forever</dt><dd><span class="mono">branches/&lt;name&gt;/log/YYYY-MM.jsonl</span>. If this app
          vanishes, <span class="mono">grep</span> still works.</dd></div>
      </dl></div>

    <div class="pt"><h3>What it asks for</h3>
      <p>A fine-grained GitHub token scoped to <b>one repository</b>, with permission to read and write that
        repository's contents. Nothing else in your account is reachable with it. The token is held in this tab, and
        only written to disk if you ask — and then only encrypted with a passphrase.</p>
      <p class="muted" style="font-size:13px;margin-top:12px">Your vault is <b>private</b> when it is created. You can
        make it public later, and then anyone with the link gets a read-only view.</p></div>
  </div>`;
}

/* ═══════════ connect ═══════════ */
export function connectView() {
  const repo = S.pendingRepo || DEFAULT_REPO;
  return `<div class="center land">
    <button class="back" data-act="home">← back</button>
    <h1 style="font-size:clamp(30px,6vw,44px)">Connect your GitHub</h1>
    <p class="sub" style="font-size:15.5px">Three steps, about a minute. commitd will create one private repository
      and never touch anything else.</p>
    <div class="steps" style="margin-top:26px">
      <div class="step"><span class="n">1</span><div>
        <h4>Name the vault</h4>
        <p>One repository holds every branch. Private by default.</p>
        <input class="inp" id="oRepo" value="${esc(repo)}" style="max-width:320px" spellcheck="false"></div></div>
      <div class="step"><span class="n">2</span><div>
        <h4>Create a fine-grained token</h4>
        <p>Opens GitHub with the form pre-filled. Set <b>Repository access → Only select repositories</b> and pick
          (or leave room for) your vault, then grant exactly:</p>
        <div class="scopes">
          <div><b>Contents</b> · Read and write <span class="muted">— the vault's files</span></div>
          <div><b>Administration</b> · Read and write <span class="muted">— optional, only to flip public/private from here</span></div>
        </div>
        <p class="hint">A token with only <b>Contents</b> works fine; you'd just change visibility on github.com instead.</p>
        <div style="margin-top:12px"><a class="btn btn-g" href="${tokenUrl(repo)}" target="_blank" rel="noopener">Open GitHub token page ↗</a></div>
      </div></div>
      <div class="step"><span class="n">3</span><div>
        <h4>Paste it back</h4>
        <input class="inp" id="oTok" type="password" placeholder="github_pat_…" spellcheck="false" autocomplete="off">
        <label class="row" style="margin-top:12px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="oRemember"> Remember on this device</label>
        <div id="oPassWrap" style="display:none;margin-top:10px">
          <input class="inp" id="oPass" type="password" placeholder="passphrase to encrypt it" autocomplete="new-password">
          <p class="hint">Stored encrypted (AES-GCM, PBKDF2 250k). Without a passphrase the token stays in this tab
            only — a bearer token for your GitHub account does not belong in localStorage in the clear.</p></div>
        <div id="oErr"></div>
        <div class="row" style="margin-top:16px"><button class="btn btn-p" id="oGo">Connect</button></div>
      </div></div>
    </div></div>`;
}

export function wireConnect(onReady) {
  $('#oRemember').onchange = (e) => { $('#oPassWrap').style.display = e.target.checked ? '' : 'none'; };
  $('#oRepo').oninput = (e) => { S.pendingRepo = e.target.value.trim(); };
  $('#oGo').onclick = async () => {
    const token = $('#oTok').value.trim(), repo = ($('#oRepo').value.trim() || DEFAULT_REPO);
    const remember = $('#oRemember').checked, passphrase = $('#oPass')?.value || '';
    const err = (m) => { $('#oErr').innerHTML = `<div class="err">${esc(m)}</div>`; };
    $('#oErr').innerHTML = '';
    if (!token) return err('Paste the token first.');
    if (remember && !passphrase) return err('Choose a passphrase, or untick "remember" to keep the token in this tab only.');
    busy('checking the token');
    try {
      const probe = new GitHub({ token });
      const user = await probe.user();
      const gh = new GitHub({ token, owner: user.login, repo });
      let info = null;
      try { info = await gh.repoInfo(); }
      catch (e) { if (e.status !== 404) throw e; }
      let created = false;
      if (!info) { busy('creating the vault (private)'); info = await gh.createRepo(true); created = true; }
      gh.branch = info.default_branch || 'main';
      if (created) { busy('waiting for GitHub to initialise it'); await gh.waitForRef(); }
      busy('reading the vault');
      let vault = await V.loadVault(gh, { onProgress: busy });
      if (!vault) {
        busy('bootstrapping');
        await gh.commitFiles(V.bootstrapFiles(user.login), 'commitd: initialise vault');
        vault = await V.loadVault(gh, { onProgress: busy });
      }
      vault.repo = { name: repo, private: info.private, url: info.html_url, owner: user.login };
      const auth = new PatAuth();
      await auth.persist(token, { login: user.login, avatar: user.avatar_url, repo }, { remember, passphrase });
      busy(null);
      onReady({ gh, vault, auth });
    } catch (e) {
      busy(null);
      err(e instanceof GitHubError && e.status === 401 ? 'GitHub rejected that token. Check it was copied whole and has not expired.'
        : e.status === 403 ? 'The token is valid but lacks permission. It needs Contents: read and write on the vault repository.'
        : e.message || String(e));
    }
  };
}

/* ═══════════ account & vault settings ═══════════ */
export function accountView(v) {
  const pub = v.repo && !v.repo.private;
  const share = `${location.origin}${location.pathname}#/u/${v.repo?.owner}/${v.repo?.name}`;
  const rate = S.gh?.rate;
  return `<div class="center" style="padding-top:8px">
    <button class="back" data-sec="today">← today</button>
    <div class="hero"><h1 style="font-size:36px">Vault</h1>
      <p><span class="mono">${esc(v.repo?.owner || '')}/${esc(v.repo?.name || '')}</span> ·
        schema v${v.meta?.schemaVersion ?? 1} · ${v.branches.length} branches ·
        day boundary ${String(v.meta?.dayBoundary ?? 0).padStart(2,'0')}:00</p></div>

    ${sechead('Visibility')}
    <div class="vis${pub ? '' : ' on'}" data-vis="private"><span class="dot"></span><div>
      <h4>Private</h4><p>Only you can read the repository. This is the default, and where a vault should stay unless
        you have a reason. Nobody can see the link, the grid, or a single commit message.</p></div></div>
    <div class="vis${pub ? ' on' : ''}" data-vis="public"><span class="dot"></span><div>
      <h4>Public — read-only for everyone else</h4><p>Anyone with the link sees your grid, branches and history.
        <b>Nobody but you can write to it</b>: they have no token, and GitHub will not accept commits from them.</p></div></div>

    <div class="expose" style="margin-top:14px">Going public exposes, to anyone who asks:
      <ul><li>every branch name, README and goal</li>
        <li><b>every commit message you have ever written</b>, including the honest ones</li>
        <li>every metric value, date and time of day</li>
        <li>relapses on abstain branches</li></ul>
      Turning it back to private stops new readers, but anything already copied or cached stays copied.</div>

    ${pub ? `<div class="ok" style="margin-top:16px"><b>This vault is public.</b> Share this link — it opens a
      read-only view that needs no token and no account.
      <div class="copyrow"><input class="inp" id="shareUrl" readonly value="${esc(share)}">
        <button class="btn btn-g" data-act="copy">copy</button></div>
      <div class="hint" style="margin-top:8px">The repository itself is also readable at
        <a href="${esc(v.repo?.url || '')}" target="_blank" rel="noopener">${esc(v.repo?.url || '')}</a>, and its README
        renders your grid in ASCII.</div></div>` : ''}

    ${sechead('Maintenance')}
    <div class="srow"><div><div class="k">Rebuild index</div>
      <div class="sub"><span class="mono">.commitd/index.json</span> is a cache, never the source of truth. This
        re-reads every log file and regenerates it — the answer to any sync weirdness.</div></div>
      <button class="btn btn-g" data-act="rebuild">rebuild</button></div>
    <div class="srow"><div><div class="k">API budget</div>
      <div class="sub">Reads are ETag-cached, so a warm load costs 304s. A heavy day is about 40 requests.</div></div>
      <span class="rate">${rate ? `${rate.remaining} / 5000 left` : '—'}</span></div>

    ${sechead('Token')}
    <div class="srow"><div><div class="k">Signed in as ${esc(S.auth?.identity()?.login || '')}</div>
      <div class="sub">Scoped to this repository only. ${localStorage.getItem('commitd.vault.v1') ? 'Stored encrypted on this device.' : 'Held in this tab only.'}</div></div>
      <div class="row"><button class="btn btn-g" data-act="signout">sign out</button>
        <button class="btn btn-d" data-act="forget">forget this device</button></div></div>
  </div>`;
}

/* ═══════════ public, read-only ═══════════ */
export function publicPrompt() {
  return `<div class="center land">
    <button class="back" data-act="home">← back</button>
    <h1 style="font-size:clamp(30px,6vw,44px)">Open a public vault</h1>
    <p class="sub">Read-only, no token, no account. Only works if that person made their vault public.</p>
    <div class="row" style="margin-top:22px">
      <input class="inp" id="pubOwner" placeholder="github username" style="max-width:230px" spellcheck="false">
      <input class="inp" id="pubRepo" placeholder="${DEFAULT_REPO}" style="max-width:230px" spellcheck="false">
      <button class="btn btn-p" id="pubGo">open</button></div>
    <div id="pubErr"></div></div>`;
}
export async function loadPublic(owner, repo) {
  const reader = new PublicReader({ owner, repo });
  const ix = await reader.readFile(V.paths.index());
  if (!ix) throw new Error(`No public vault at ${owner}/${repo}. It may be private, or may not exist.`);
  const vault = V.vaultFromIndex(ix);
  vault.repo = { owner, name: repo, private: false, url: `https://github.com/${owner}/${repo}` };
  vault.meta = { schemaVersion: 1 };
  return vault;
}
export const publicBanner = (v) => `<div class="banner">
  <span>Viewing <span class="mono">${esc(v.repo.owner)}/${esc(v.repo.name)}</span> — read-only.</span>
  <button data-act="home">leave</button></div>`;
