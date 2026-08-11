/* Auth is behind an interface with exactly four methods (signIn / getToken /
   identity / signOut), because the whole point is that another provider can
   drop in without the app noticing.

   The provider: a GitHub App the user installs on exactly one repository,
   plus a stateless ~30-line worker that holds the client secret. GitHub
   Pages cannot hold a secret and GitHub's token endpoint sends no CORS
   headers, so a purely static site cannot finish the code → token exchange
   itself. The worker stores nothing and logs nothing.

   What the app can reach is decided by the user on GitHub's install screen:
   commitd sees exactly the repositories it was installed on, nothing else. */

export const OAUTH = {
  clientId: 'Iv23liO8GU9OD5FAGXOC',   // public identifier of the commitd-app GitHub App
  appSlug: 'commitd-app',
  tokenService: 'https://commitd-token-service.brenoapsdev.workers.dev',
};
export const oauthEnabled = () => !!(OAUTH.clientId && OAUTH.tokenService);
export const installUrl = () => `https://github.com/apps/${OAUTH.appSlug}/installations/new`;

const SO = 'commitd.oauth.session.v1';
const NONCE = 'commitd.oauth.nonce.v1';
const bundleFrom = (o) => ({ t: o.access_token, r: o.refresh_token || null,
  exp: o.expires_in ? Date.now() + o.expires_in * 1000 : null });

export class OAuthAuth {
  constructor() { this.bundle = null; this.who = null; }

  state() {
    if (this.bundle) return 'ready';
    if (sessionStorage.getItem(SO)) return 'session';
    return 'empty';
  }
  async restore() {
    const s = sessionStorage.getItem(SO);
    if (!s) return false;
    try { const o = JSON.parse(s); this.bundle = o.bundle; this.who = o.who; } catch { return false; }
    return !!this.bundle?.t;
  }
  /* The session is only ever written whole — a token with no identity is a
     corrupt session waiting to crash a reload. */
  persist(bundle, who) {
    this.bundle = bundle; this.who = who;
    sessionStorage.setItem(SO, JSON.stringify({ bundle: this.bundle, who: this.who }));
  }
  getToken() { return this.bundle?.t || null; }
  identity() { return this.who; }
  signOut() {
    this.bundle = null; this.who = null;
    sessionStorage.removeItem(SO);
    sessionStorage.removeItem(NONCE);
    localStorage.removeItem('commitd.etag.v1');
    /* keys from retired providers, so no stale state survives an upgrade */
    sessionStorage.removeItem('commitd.session.v1');
    localStorage.removeItem('commitd.vault.v1');
    localStorage.removeItem('commitd.oauth.vault.v1');
  }

  /* App user tokens can expire (8 h by default); refresh before they die. */
  stale() { return !!(this.bundle?.exp && this.bundle.r && Date.now() > this.bundle.exp - 10 * 60e3); }
  async refresh() {
    const res = await fetch(`${OAUTH.tokenService}/refresh`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.bundle.r }) });
    const o = await res.json();
    if (!o.access_token) throw new Error(o.error_description || o.error || 'token refresh failed');
    this.persist(bundleFrom(o), this.who);
  }

  static begin() {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem(NONCE, nonce);
    location.href = `https://github.com/login/oauth/authorize?client_id=${OAUTH.clientId}&state=${nonce}`;
  }
  /* The redirect back arrives with ?code= in the query — hash routing leaves
     the query alone. Install & Authorize flows started on github.com carry no
     nonce of ours; a stored nonce that disagrees is rejected. The code is
     single-use: scrub it from the URL immediately. */
  static landing() {
    const q = new URLSearchParams(location.search);
    const code = q.get('code');
    if (!code) return null;
    const state = q.get('state');
    const saved = sessionStorage.getItem(NONCE);
    history.replaceState(null, '', location.pathname + location.hash);
    sessionStorage.removeItem(NONCE);
    if (saved && saved !== state) return null;
    return { code };
  }
  /* Exchange only — the caller persists once it also knows who this is. */
  async complete(code) {
    const res = await fetch(`${OAUTH.tokenService}/exchange`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }) });
    const o = await res.json();
    if (!o.access_token) throw new Error(o.error_description || o.error || 'token exchange failed');
    this.bundle = bundleFrom(o);
    return this.bundle;
  }
}
