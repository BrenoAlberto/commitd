/* Auth is behind an interface with exactly four methods, because the whole
   point is that the second implementation drops in without the app noticing.

   v1  PatAuth      — a fine-grained token scoped to one repo. No backend at all.
   v2  OAuthAuth    — a ~30-line stateless function somewhere that holds the
                      client secret and does nothing else. Same four methods.

   GitHub Pages cannot hold a client secret and GitHub's token endpoint sends
   no CORS headers, so a purely static site cannot complete the OAuth code
   exchange. That is the honest reason v1 is a token, not a laziness. */

const SS = 'commitd.session.v1';
const LS = 'commitd.vault.v1';
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function keyFrom(passphrase, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(text, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const k    = await keyFrom(passphrase, salt);
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(text));
  return { salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
async function open(blob, passphrase) {
  const k  = await keyFrom(passphrase, unb64(blob.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, k, unb64(blob.ct));
  return dec.decode(pt);
}

export class PatAuth {
  constructor() { this.token = null; this.who = null; }

  /* What is on disk, without unlocking anything. */
  state() {
    if (this.token) return 'ready';
    if (sessionStorage.getItem(SS)) return 'session';
    if (localStorage.getItem(LS)) return 'locked';
    return 'empty';
  }
  meta() { try { return JSON.parse(localStorage.getItem(LS))?.meta || null; } catch { return null; } }

  async restore() {
    const s = sessionStorage.getItem(SS);
    if (s) { const o = JSON.parse(s); this.token = o.token; this.who = o.who; return true; }
    return false;
  }
  async unlock(passphrase) {
    const rec = JSON.parse(localStorage.getItem(LS));
    this.token = await open(rec.blob, passphrase);   // throws on a wrong passphrase
    this.who = rec.meta;
    sessionStorage.setItem(SS, JSON.stringify({ token: this.token, who: this.who }));
    return true;
  }

  /* remember:false → sessionStorage, gone when the tab closes.
     remember:true  → localStorage, but only ever encrypted. A bearer token
                      belonging to someone's GitHub account does not go into
                      localStorage in the clear, convenience notwithstanding. */
  async persist(token, who, { remember, passphrase } = {}) {
    this.token = token; this.who = who;
    sessionStorage.setItem(SS, JSON.stringify({ token, who }));
    if (remember && passphrase) {
      localStorage.setItem(LS, JSON.stringify({ blob: await seal(token, passphrase), meta: who }));
    }
  }
  getToken() { return this.token; }
  identity() { return this.who; }
  signOut({ forget = false } = {}) {
    this.token = null; this.who = null;
    sessionStorage.removeItem(SS);
    if (forget) localStorage.removeItem(LS);
    localStorage.removeItem('commitd.etag.v1');
  }
}

/* The pre-filled token page. GitHub reads these query parameters, so the
   scopes arrive already ticked and the user's job is Generate → copy. */
export function tokenUrl(repo) {
  const p = new URLSearchParams({
    name: 'commitd', description: `read/write ${repo} only`,
    target_name: '', expires_in: '365',
  });
  return `https://github.com/settings/personal-access-tokens/new?${p}`;
}
