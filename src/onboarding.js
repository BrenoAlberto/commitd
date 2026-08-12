/* Landing, the token flow, the account/vault screen (including visibility),
   and the read-only public view. */

import { $, $$, esc } from './util.js';
import { S, store } from './store.js';
import { GitHub, PublicReader } from './github.js';
import { OAuthAuth, OAUTH, installUrl } from './auth.js';
import * as V from './vault.js';
import { toast, errToast, busy } from './ui.js';
import { sechead } from './views.js';

export const DEFAULT_REPO = 'commitd-vault';

/* ═══════════ landing ═══════════ */
function heroCard() {
  const lv = (i) => Math.max(0, Math.round(Math.sin(i * 12.9898) * 43758.5453 % 1 * 6) - 1);
  const cells = Array.from({ length: 7 * 26 }, (_, i) => `<i class="l${Math.min(4, lv(i))}"></i>`).join('');
  return `<div class="vcard" aria-hidden="true">
    <div class="vhead"><span class="dot" style="background:var(--good)"></span>you/habits · 3 branches</div>
    <div class="vgrid">${cells}</div>
    <div class="vrow"><span class="sw" style="background:var(--good)"></span>gym<span class="st">12d · 94%</span></div>
    <div class="vrow"><span class="sw" style="background:#7aa2f7"></span>read<span class="st">47d · 98%</span></div>
    <div class="vrow"><span class="sw" style="background:#e0af68"></span>quit-smoking<span class="st">231 days clean</span></div>
  </div>`;
}
export function landingView() {
  return `<div class="center land">
    <div class="hero">
      <div>
        <div class="kicker">a daemon for the habits you keep</div>
        <h1>Your habits,<br>as a git repository.</h1>
        <p class="sub">The mental model you already trust — branches, commits, a green grid — pointed at your life.
          Every workout, every page read, every day quit lives in one private GitHub repo that you own.
          No server, no account, no subscription. There is no us.</p>
        <div class="cta">
          <button class="btn btn-p" data-act="connect">Connect GitHub</button>
          <a class="btn btn-g" href="https://github.com/BrenoAlberto/commitd" target="_blank" rel="noopener">Read the source ↗</a>
        </div>
        <p class="hint" style="margin-top:14px">Someone shared a vault with you? <a data-act="viewpublic" style="cursor:pointer;text-decoration:underline">Open it here</a>.</p>
      </div>
      ${heroCard()}
    </div>

    <div class="trust">
      <div><dt>No servers</dt><dd>commitd is a static page. There is no backend to breach, no database to leak,
        nothing to go down.</dd></div>
      <div><dt>No data held</dt><dd>We couldn't read your habits if we wanted to — every byte lives in your
        repository, private or public, on your account.</dd></div>
      <div><dt>No lock-in</dt><dd>It's just git. Clone your vault, grep it, take it anywhere — commitd disappearing
        costs you nothing.</dd></div>
    </div>

    <div class="pt"><h3>The model</h3>
      <p>A <b>branch</b> is a habit — <span class="mono">gym</span>, <span class="mono">read</span>,
        <span class="mono">quit-smoking</span> — a long-lived line of work. A <b>commit</b> is one instance of
        showing up: a message, numbers if you want them.</p>
      <p>Goals change; habits persist. <span class="mono">run</span> is for life,
        <span class="mono">run/couch-to-5k</span> is for twelve weeks — so the goal and its numbers live on a
        <b>topic branch</b> that merges back when it's done. The streak never notices.</p>
      <p>And when showing up stops needing a tracker, you <b>merge the habit into main</b>: the record of things
        that are simply how you live now. The goal was never to track forever. The goal is to merge.</p></div>

    <div class="pt"><h3>What it does differently</h3>
      <dl class="cols">
        <div><dt>Cadence, not guilt</dt><dd>A 3×/week branch keeps its streak through a rest day. Uptime sits next to
          the streak, because 94% survives one bad Tuesday and a streak doesn't.</dd></div>
        <div><dt>Quitting counts too</dt><dd>An abstain branch fills the grid green on its own; a commit is a relapse,
          logged without judgement — because a hidden relapse is the one that wins.</dd></div>
        <div><dt>Your real contribution graph</dt><dd>Each entry is one true git commit, dated the day it happened.
          Showing up for yourself looks exactly like shipping.</dd></div>
        <div><dt>Plain text forever</dt><dd>One JSON line per entry, in files you can read. If commitd vanished
          tomorrow, your data is still yours — <span class="mono">grep</span> still works.</dd></div>
      </dl></div>

    <div class="pt"><h3>Yours, verifiably</h3>
      <p>commitd is a static page and one small GitHub App. You install the app on <b>one repository</b> — the
        vault — and that is everything it can ever see. No analytics, no tracking, nothing phoned home; the source
        is short enough to read in an afternoon.</p>
      <p class="muted" style="font-size:13px;margin-top:12px">Your vault stays <b>private</b> unless you decide
        otherwise. Make it public later and anyone with the link gets a read-only view.</p></div>
  </div>`;
}

/* ═══════════ connect ═══════════ */
export function connectView() {
  return `<div class="center land">
    <button class="back" data-act="home">← back</button>
    <h1 style="font-size:clamp(30px,6vw,44px)">Connect your GitHub</h1>
    <p class="sub" style="font-size:15.5px">Two clicks. commitd keeps every byte in one private repository — the
      vault — and can only ever see the repositories you install it on.</p>
    <div class="steps" style="margin-top:26px">
      <div class="step"><span class="n">1</span><div>
        <h4>Create the vault — once</h4>
        <p>One private repository holds every habit. Already made one? Skip straight to step 2.</p>
        <div style="margin-top:12px"><a class="btn btn-g" href="https://github.com/new?name=${DEFAULT_REPO}" target="_blank" rel="noopener">Create ${DEFAULT_REPO} on GitHub ↗</a></div>
        <p class="hint">Keep it <b>Private</b> and tick <b>Add a README</b>, then come back to this tab.</p></div></div>
      <div class="step"><span class="n">2</span><div>
        <h4>Sign in with GitHub</h4>
        <p>GitHub asks where to install commitd — choose <b>Only select repositories</b> and pick just the vault.
          commitd finds it from there by itself: nothing to paste, nothing to configure.</p>
        <div style="margin-top:12px"><button class="btn btn-p" id="oOAuth">Sign in with GitHub</button></div></div></div>
    </div></div>`;
}
export function wireConnect() {
  const b = $('#oOAuth');
  if (b) b.onclick = () => OAuthAuth.begin();
}

/* ═══════════ oauth: exchange, discovery, vault open ═══════════
   After sign-in the app never asks which repository the vault is — it lists
   what the token was installed on. Zero grants → guided install screen.
   Several → a picker. Exactly one → that's the vault. */
export async function completeOAuth(landing, onReady, onError) {
  busy('finishing sign-in');
  try {
    const auth = new OAuthAuth();
    await auth.complete(landing.code);
    const user = await new GitHub({ token: auth.getToken() }).user();
    /* Persist identity immediately — a session must never exist half-written,
       or the next reload boots into a crash. */
    auth.persist(auth.bundle, { login: user.login, avatar: user.avatar_url || '', repo: null, repoOwner: null });
    S.auth = auth;
    await resolveVault(auth, onReady, onError);
  } catch (e) { busy(null); onError(e.message || String(e)); }
}

export async function resolveVault(auth, onReady, onError) {
  busy('finding your vault');
  try {
    const probe = new GitHub({ token: auth.getToken() });
    const inst = await probe.req('/user/installations');
    const repos = [];
    for (const i of (inst.installations || []))
      repos.push(...(((await probe.req(`/user/installations/${i.id}/repositories`)).repositories) || []));
    if (!repos.length) { busy(null); S.route = { name: 'install' }; store.emit(); return; }
    if (repos.length > 1) { busy(null); S.pickRepos = repos; S.route = { name: 'pickrepo' }; store.emit(); return; }
    await finishWithRepo(auth, repos[0], onReady, onError);
  } catch (e) { busy(null); onError(e.message || String(e)); }
}

export async function finishWithRepo(auth, repo, onReady, onError) {
  busy('opening the vault');
  try {
    const who = auth.identity();
    const owner = repo.owner?.login || who.login;
    const gh = new GitHub({ token: auth.getToken(), owner, repo: repo.name, branch: repo.default_branch || 'main' });
    let vault = await V.loadVault(gh, { onProgress: busy });
    if (!vault) {
      /* Never seed a vault into a public repository. A vault holds every
         honest commit message ever written — going public is a decision to
         make later, eyes open, not a side effect of picking the wrong repo
         on the install screen. */
      if (repo.private === false) {
        busy(null); S.pubRepo = { name: repo.name, owner }; S.route = { name: 'pubwarn' }; store.emit(); return;
      }
      busy('bootstrapping the vault');
      await gh.waitForRef();
      await gh.commitFiles(V.bootstrapFiles(who.login), 'commitd: initialise vault');
      vault = await V.loadVault(gh, { onProgress: busy });
    }
    vault.repo = { name: repo.name, private: repo.private !== false, owner,
      url: repo.html_url || `https://github.com/${owner}/${repo.name}` };
    auth.persist(auth.bundle, { ...who, repo: repo.name, repoOwner: owner });
    busy(null);
    onReady({ gh, vault, auth });
  } catch (e) { busy(null); onError(e.message || String(e)); }
}

/* Signed in, but commitd is not installed anywhere yet. */
export function installView() {
  const login = S.auth?.identity()?.login || '';
  return `<div class="center land">
    <h1 style="font-size:clamp(30px,5vw,42px)">One more step, ${esc(login)}</h1>
    <p class="sub" style="font-size:15.5px">You're signed in, but commitd isn't installed on any repository yet —
      and installing it on the vault is the thing that grants access. commitd can only ever see the repositories
      you install it on.</p>
    <div class="steps" style="margin-top:26px">
      <div class="step"><span class="n">1</span><div>
        <h4>Have a vault repository?</h4>
        <p>If not, create it now — private, with a README.</p>
        <div style="margin-top:12px"><a class="btn btn-g" href="https://github.com/new?name=${DEFAULT_REPO}" target="_blank" rel="noopener">Create ${DEFAULT_REPO} on GitHub ↗</a></div></div></div>
      <div class="step"><span class="n">2</span><div>
        <h4>Install commitd on it</h4>
        <p>Choose <b>Only select repositories</b> → the vault. GitHub sends you straight back here.</p>
        <div style="margin-top:12px"><a class="btn btn-p" href="${installUrl()}">Install commitd on the vault ↗</a></div>
        <p class="hint">Installed it in another tab and landed back here? <a data-act="recheck">Check again</a>.</p></div></div>
    </div>
    <div style="margin-top:26px"><button class="peek" data-act="signout">sign out instead</button></div>
  </div>`;
}

/* The only repository commitd can see is public — refuse to seed it. */
export function pubWarnView() {
  const r = S.pubRepo || {};
  return `<div class="center land">
    <h1 style="font-size:clamp(30px,5vw,42px)">That repository is public</h1>
    <p class="sub" style="font-size:15.5px">commitd is installed on
      <span class="mono">${esc(r.owner || '')}/${esc(r.name || '')}</span>, which anyone on the internet can read.
      A vault holds every habit and every honest commit message — it should start private.</p>
    <div class="steps" style="margin-top:26px">
      <div class="step"><span class="n">→</span><div>
        <h4>Pick a private home for it</h4>
        <p>Either make that repository private
          (<a href="https://github.com/${esc(r.owner || '')}/${esc(r.name || '')}/settings" target="_blank" rel="noopener">repository settings ↗</a>),
          or create a private <span class="mono">${DEFAULT_REPO}</span>
          (<a href="https://github.com/new?name=${DEFAULT_REPO}" target="_blank" rel="noopener">github.com/new ↗</a>)
          and point the installation at it
          (<a href="${installUrl()}" target="_blank" rel="noopener">configure ↗</a>).</p>
        <div style="margin-top:14px"><button class="btn btn-p" data-act="recheck">Check again</button></div></div></div>
    </div>
    <div style="margin-top:26px"><button class="peek" data-act="signout">sign out instead</button></div>
  </div>`;
}

/* Installed on more than one repository — habits live in exactly one. */
export function pickRepoView() {
  return `<div class="center land">
    <h1 style="font-size:clamp(30px,5vw,42px)">Which one is the vault?</h1>
    <p class="sub" style="font-size:15.5px">commitd is installed on ${S.pickRepos.length} repositories. Habit data
      lives in exactly one — pick it. (You can trim the installation to a single repository any time on GitHub.)</p>
    <div class="steps" style="margin-top:22px">
      ${S.pickRepos.map((r, i) => `<button class="btn btn-g" data-pickrepo="${i}" style="justify-content:flex-start;width:100%;max-width:420px;margin-bottom:8px">
        <span class="mono">${esc(r.owner?.login || '')}/${esc(r.name)}</span>${r.private === false ? '<span class="muted" style="margin-left:8px">public</span>' : ''}
      </button>`).join('')}
    </div>
    <div style="margin-top:22px"><button class="peek" data-act="signout">sign out instead</button></div>
  </div>`;
}

/* ═══════════ account & vault settings ═══════════ */
export function accountView(v) {
  const pub = v.repo && !v.repo.private;
  const share = `${location.origin}${location.pathname}#/u/${v.repo?.owner}/${v.repo?.name}`;
  const active = v.branches.filter(b => !b.mergedAt).length;
  const merged = v.branches.length - active;
  return `<div class="center" style="padding-top:8px">
    <button class="back" data-sec="today">← today</button>
    <div class="hero"><h1 style="font-size:36px">Vault</h1>
      <p><span class="mono">${esc(v.repo?.owner || '')}/${esc(v.repo?.name || '')}</span> ·
        ${active} active branch${active === 1 ? '' : 'es'}${merged ? ` · ${merged} merged` : ''} ·
        ${pub ? 'public' : 'private'}</p></div>

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
    <div class="srow"><div><div class="k">Rebuild from logs</div>
      <div class="sub">Something looks out of sync — a missing commit, a wrong streak? This re-reads every log in
        the repository and rebuilds the app's view from scratch. Your data is never touched.</div></div>
      <button class="btn btn-g" data-act="rebuild">rebuild</button></div>

    ${sechead('Session')}
    <div class="srow"><div><div class="k">Signed in as ${esc(S.auth?.identity()?.login || '')}</div>
      <div class="sub">Through the commitd GitHub App — it sees this repository and nothing else. The session lives
        in this tab; signing back in is one click.</div></div>
      <div class="row"><a class="btn btn-g" href="https://github.com/apps/${OAUTH.appSlug}" target="_blank" rel="noopener">manage on GitHub</a>
        <button class="btn btn-d" data-act="signout">sign out</button></div></div>
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
