/* Landing, the token flow, the account/vault screen (including visibility),
   and the read-only public view. */

import { $, $$, esc } from './util.js';
import { S, store } from './store.js';
import { GitHub, PublicReader } from './github.js';
import { OAuthAuth, OAUTH, installUrl } from './auth.js';
import { t, lang, LANGS } from './i18n.js';
import * as V from './vault.js';
import { toast, errToast, busy } from './ui.js';
import { sechead } from './views.js';

export const DEFAULT_REPO = 'commitd-vault';

/* ═══════════ landing ═══════════ */
function heroCard() {
  const lv = (i) => Math.max(0, Math.round(Math.sin(i * 12.9898) * 43758.5453 % 1 * 6) - 1);
  const cells = Array.from({ length: 7 * 26 }, (_, i) => `<i class="l${Math.min(4, lv(i))}"></i>`).join('');
  return `<div class="vcard" aria-hidden="true">
    <div class="vhead"><span class="dot" style="background:var(--good)"></span>${t('you/habits · 3 branches')}</div>
    <div class="vgrid">${cells}</div>
    <div class="vrow"><span class="sw" style="background:var(--good)"></span>${t('gym')}<span class="st">12d · 94%</span></div>
    <div class="vrow"><span class="sw" style="background:#7aa2f7"></span>${t('read')}<span class="st">47d · 98%</span></div>
    <div class="vrow"><span class="sw" style="background:#e0af68"></span>${t('quit-smoking')}<span class="st">${t('231 days clean')}</span></div>
  </div>`;
}
export function landingView() {
  return `<div class="center land">
    <div class="hero">
      <div>
        <div class="kicker">${t('a daemon for the habits you keep')}</div>
        <h1>${t('Your habits,<br>as a git repository.')}</h1>
        <p class="sub">${t('The mental model you already trust — branches, commits, a green grid — pointed at your life. Every workout, every page read, every day quit lives in one private GitHub repo that you own. No server, no account, no subscription. There is no us.')}</p>
        <div class="cta">
          <button class="btn btn-p" data-act="connect">${t('Connect GitHub')}</button>
          <a class="btn btn-g" href="https://github.com/BrenoAlberto/commitd" target="_blank" rel="noopener">${t('Read the source ↗')}</a>
        </div>
        <p class="hint" style="margin-top:14px">${t('Someone shared a vault with you?')} <a data-act="viewpublic" style="cursor:pointer;text-decoration:underline">${t('Open it here')}</a>.</p>
      </div>
      ${heroCard()}
    </div>

    <div class="trust">
      <div><dt>${t('No servers')}</dt><dd>${t('commitd is a static page. There is no backend to breach, no database to leak, nothing to go down.')}</dd></div>
      <div><dt>${t('No data held')}</dt><dd>${t("We couldn't read your habits if we wanted to — every byte lives in your repository, private or public, on your account.")}</dd></div>
      <div><dt>${t('No lock-in')}</dt><dd>${t("It's just git. Clone your vault, grep it, take it anywhere — commitd disappearing costs you nothing.")}</dd></div>
    </div>

    <div class="pt"><h3>${t('The model')}</h3>
      <p>${t('A <b>branch</b> is a habit —')} <span class="mono">${t('gym')}</span>, <span class="mono">${t('read')}</span>,
        <span class="mono">${t('quit-smoking')}</span> ${t('— a long-lived line of work. A <b>commit</b> is one instance of showing up: a message, numbers if you want them.')}</p>
      <p>${t('Goals change; habits persist.')} <span class="mono">run</span> ${t('is for life,')}
        <span class="mono">run/couch-to-5k</span> ${t("is for twelve weeks — so the goal and its numbers live on a <b>topic branch</b> that merges back when it's done. The streak never notices.")}</p>
      <p>${t('And when showing up stops needing a tracker, you <b>merge the habit into main</b>: the record of things that are simply how you live now. The goal was never to track forever. The goal is to merge.')}</p></div>

    <div class="pt"><h3>${t('What it does differently')}</h3>
      <dl class="cols">
        <div><dt>${t('Cadence, not guilt')}</dt><dd>${t("A 3×/week branch keeps its streak through a rest day. Uptime sits next to the streak, because 94% survives one bad Tuesday and a streak doesn't.")}</dd></div>
        <div><dt>${t('Quitting counts too')}</dt><dd>${t('An abstain branch fills the grid green on its own; a commit is a relapse, logged without judgement — because a hidden relapse is the one that wins.')}</dd></div>
        <div><dt>${t('Your real contribution graph')}</dt><dd>${t('Each entry is one true git commit, dated the day it happened. Showing up for yourself looks exactly like shipping.')}</dd></div>
        <div><dt>${t('Plain text forever')}</dt><dd>${t('One JSON line per entry, in files you can read. If commitd vanished tomorrow, your data is still yours —')} <span class="mono">grep</span> ${t('still works.')}</dd></div>
      </dl></div>

    <div class="pt"><h3>${t('Yours, verifiably')}</h3>
      <p>${t('commitd is a static page and one small GitHub App. You install the app on <b>one repository</b> — the vault — and that is everything it can ever see. No analytics, no tracking, nothing phoned home; the source is short enough to read in an afternoon.')}</p>
      <p class="muted" style="font-size:13px;margin-top:12px">${t('Your vault stays <b>private</b> unless you decide otherwise. Make it public later and anyone with the link gets a read-only view.')}</p></div>
  </div>`;
}

/* ═══════════ connect ═══════════ */
export function connectView() {
  return `<div class="center land">
    <button class="back" data-act="home">← ${t('back')}</button>
    <h1 style="font-size:clamp(30px,6vw,44px)">${t('Connect your GitHub')}</h1>
    <p class="sub" style="font-size:15.5px">${t('Two clicks. commitd keeps every byte in one private repository — the vault — and can only ever see the repositories you install it on.')}</p>
    <div class="steps" style="margin-top:26px">
      <div class="step"><span class="n">1</span><div>
        <h4>${t('Create the vault — once')}</h4>
        <p>${t('One private repository holds every habit. Already made one? Skip straight to step 2.')}</p>
        <div style="margin-top:12px"><a class="btn btn-g" href="https://github.com/new?name=${DEFAULT_REPO}" target="_blank" rel="noopener">${t('Create {0} on GitHub ↗', DEFAULT_REPO)}</a></div>
        <p class="hint">${t('Keep it <b>Private</b> and tick <b>Add a README</b>, then come back to this tab.')}</p></div></div>
      <div class="step"><span class="n">2</span><div>
        <h4>${t('Sign in with GitHub')}</h4>
        <p>${t('GitHub asks where to install commitd — choose <b>Only select repositories</b> and pick just the vault. commitd finds it from there by itself: nothing to paste, nothing to configure.')}</p>
        <div style="margin-top:12px"><button class="btn btn-p" id="oOAuth">${t('Sign in with GitHub')}</button></div></div></div>
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
  busy(t('finishing sign-in'));
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
  busy(t('finding your vault'));
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
  busy(t('opening the vault'));
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
      busy(t('bootstrapping the vault'));
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
    <h1 style="font-size:clamp(30px,5vw,42px)">${t('One more step, {0}', esc(login))}</h1>
    <p class="sub" style="font-size:15.5px">${t("You're signed in, but commitd isn't installed on any repository yet — and installing it on the vault is the thing that grants access. commitd can only ever see the repositories you install it on.")}</p>
    <div class="steps" style="margin-top:26px">
      <div class="step"><span class="n">1</span><div>
        <h4>${t('Have a vault repository?')}</h4>
        <p>${t('If not, create it now — private, with a README.')}</p>
        <div style="margin-top:12px"><a class="btn btn-g" href="https://github.com/new?name=${DEFAULT_REPO}" target="_blank" rel="noopener">${t('Create {0} on GitHub ↗', DEFAULT_REPO)}</a></div></div></div>
      <div class="step"><span class="n">2</span><div>
        <h4>${t('Install commitd on it')}</h4>
        <p>${t('Choose <b>Only select repositories</b> → the vault. GitHub sends you straight back here.')}</p>
        <div style="margin-top:12px"><a class="btn btn-p" href="${installUrl()}">${t('Install commitd on the vault ↗')}</a></div>
        <p class="hint">${t('Installed it in another tab and landed back here?')} <a data-act="recheck">${t('Check again')}</a>.</p></div></div>
    </div>
    <div style="margin-top:26px"><button class="peek" data-act="signout">${t('sign out instead')}</button></div>
  </div>`;
}

/* The only repository commitd can see is public — refuse to seed it. */
export function pubWarnView() {
  const r = S.pubRepo || {};
  return `<div class="center land">
    <h1 style="font-size:clamp(30px,5vw,42px)">${t('That repository is public')}</h1>
    <p class="sub" style="font-size:15.5px">${t('commitd is installed on')}
      <span class="mono">${esc(r.owner || '')}/${esc(r.name || '')}</span>${t(', which anyone on the internet can read. A vault holds every habit and every honest commit message — it should start private.')}</p>
    <div class="steps" style="margin-top:26px">
      <div class="step"><span class="n">→</span><div>
        <h4>${t('Pick a private home for it')}</h4>
        <p>${t('Either make that repository private')}
          (<a href="https://github.com/${esc(r.owner || '')}/${esc(r.name || '')}/settings" target="_blank" rel="noopener">${t('repository settings ↗')}</a>)${t(', or create a private')} <span class="mono">${DEFAULT_REPO}</span>
          (<a href="https://github.com/new?name=${DEFAULT_REPO}" target="_blank" rel="noopener">github.com/new ↗</a>)
          ${t('and point the installation at it')}
          (<a href="${installUrl()}" target="_blank" rel="noopener">${t('configure ↗')}</a>).</p>
        <div style="margin-top:14px"><button class="btn btn-p" data-act="recheck">${t('Check again')}</button></div></div></div>
    </div>
    <div style="margin-top:26px"><button class="peek" data-act="signout">${t('sign out instead')}</button></div>
  </div>`;
}

/* Installed on more than one repository — habits live in exactly one. */
export function pickRepoView() {
  return `<div class="center land">
    <h1 style="font-size:clamp(30px,5vw,42px)">${t('Which one is the vault?')}</h1>
    <p class="sub" style="font-size:15.5px">${t('commitd is installed on {0} repositories. Habit data lives in exactly one — pick it. (You can trim the installation to a single repository any time on GitHub.)', S.pickRepos.length)}</p>
    <div class="steps" style="margin-top:22px">
      ${S.pickRepos.map((r, i) => `<button class="btn btn-g" data-pickrepo="${i}" style="justify-content:flex-start;width:100%;max-width:420px;margin-bottom:8px">
        <span class="mono">${esc(r.owner?.login || '')}/${esc(r.name)}</span>${r.private === false ? `<span class="muted" style="margin-left:8px">${t('public')}</span>` : ''}
      </button>`).join('')}
    </div>
    <div style="margin-top:22px"><button class="peek" data-act="signout">${t('sign out instead')}</button></div>
  </div>`;
}

/* ═══════════ account & vault settings ═══════════ */
export function accountView(v) {
  const pub = v.repo && !v.repo.private;
  const share = `${location.origin}${location.pathname}#/u/${v.repo?.owner}/${v.repo?.name}`;
  const active = v.branches.filter(b => !b.mergedAt).length;
  const merged = v.branches.length - active;
  return `<div class="center" style="padding-top:8px">
    <button class="back" data-sec="today">← ${t('today')}</button>
    <div class="hero"><h1 style="font-size:36px">Vault</h1>
      <p><span class="mono">${esc(v.repo?.owner || '')}/${esc(v.repo?.name || '')}</span> ·
        ${t(active === 1 ? '{0} active branch' : '{0} active branches', active)}${merged ? t(' · {0} merged', merged) : ''} ·
        ${pub ? t('public') : t('private')}</p></div>

    ${sechead(t('Visibility'))}
    <div class="vis${pub ? '' : ' on'}" data-vis="private"><span class="dot"></span><div>
      <h4>${t('Private')}</h4><p>${t('Only you can read the repository. This is the default, and where a vault should stay unless you have a reason. Nobody can see the link, the grid, or a single commit message.')}</p></div></div>
    <div class="vis${pub ? ' on' : ''}" data-vis="public"><span class="dot"></span><div>
      <h4>${t('Public — read-only for everyone else')}</h4><p>${t('Anyone with the link sees your grid, branches and history. <b>Nobody but you can write to it</b>: they have no token, and GitHub will not accept commits from them.')}</p></div></div>

    <div class="expose" style="margin-top:14px">${t('Going public exposes, to anyone who asks:')}
      <ul><li>${t('every branch name, README and goal')}</li>
        <li>${t('<b>every commit message you have ever written</b>, including the honest ones')}</li>
        <li>${t('every metric value, date and time of day')}</li>
        <li>${t('relapses on abstain branches')}</li></ul>
      ${t('Turning it back to private stops new readers, but anything already copied or cached stays copied.')}</div>

    ${pub ? `<div class="ok" style="margin-top:16px">${t('<b>This vault is public.</b> Share this link — it opens a read-only view that needs no token and no account.')}
      <div class="copyrow"><input class="inp" id="shareUrl" readonly value="${esc(share)}">
        <button class="btn btn-g" data-act="copy">${t('copy')}</button></div>
      <div class="hint" style="margin-top:8px">${t('The repository itself is also readable at')}
        <a href="${esc(v.repo?.url || '')}" target="_blank" rel="noopener">${esc(v.repo?.url || '')}</a>${t(', and its README renders your grid in ASCII.')}</div></div>` : ''}

    ${sechead(t('Maintenance'))}
    <div class="srow"><div><div class="k">${t('Rebuild from logs')}</div>
      <div class="sub">${t("Something looks out of sync — a missing commit, a wrong streak? This re-reads every log in the repository and rebuilds the app's view from scratch. Your data is never touched.")}</div></div>
      <button class="btn btn-g" data-act="rebuild">${t('rebuild')}</button></div>

    ${sechead(t('Session'))}
    <div class="srow"><div><div class="k">${t('Signed in as {0}', esc(S.auth?.identity()?.login || ''))}</div>
      <div class="sub">${t('Through the commitd GitHub App — it sees this repository and nothing else. The session lives in this tab; signing back in is one click.')}</div></div>
      <div class="row"><a class="btn btn-g" href="https://github.com/apps/${OAUTH.appSlug}" target="_blank" rel="noopener">${t('manage on GitHub')}</a>
        <button class="btn btn-d" data-act="signout">${t('sign out')}</button></div></div>

    ${sechead(t('Language'))}
    <div class="chipsel" style="margin-bottom:30px">${LANGS.map(([id, label]) =>
      `<button class="${lang === id ? 'on' : ''}" data-setlang="${id}">${label}</button>`).join('')}</div>
  </div>`;
}

/* ═══════════ public, read-only ═══════════ */
export function publicPrompt() {
  return `<div class="center land">
    <button class="back" data-act="home">← ${t('back')}</button>
    <h1 style="font-size:clamp(30px,6vw,44px)">${t('Open a public vault')}</h1>
    <p class="sub">${t('Read-only, no token, no account. Only works if that person made their vault public.')}</p>
    <div class="row" style="margin-top:22px">
      <input class="inp" id="pubOwner" placeholder="${t('github username')}" style="max-width:230px" spellcheck="false">
      <input class="inp" id="pubRepo" placeholder="${DEFAULT_REPO}" style="max-width:230px" spellcheck="false">
      <button class="btn btn-p" id="pubGo">${t('open')}</button></div>
    <div id="pubErr"></div></div>`;
}
export async function loadPublic(owner, repo) {
  const reader = new PublicReader({ owner, repo });
  const ix = await reader.readFile(V.paths.index());
  if (!ix) throw new Error(t('No public vault at {0}/{1}. It may be private, or may not exist.', owner, repo));
  const vault = V.vaultFromIndex(ix);
  vault.repo = { owner, name: repo, private: false, url: `https://github.com/${owner}/${repo}` };
  vault.meta = { schemaVersion: 1 };
  return vault;
}
export const publicBanner = (v) => `<div class="banner">
  <span>${t('Viewing')} <span class="mono">${esc(v.repo.owner)}/${esc(v.repo.name)}</span> ${t('— read-only.')}</span>
  <button data-act="home">${t('leave')}</button></div>`;
