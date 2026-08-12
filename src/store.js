/* One object, one notify. The app is not big enough to need more. */
export const store = {
  s: {
    route: { name: 'boot' },        // boot | landing | connect | app | public | error
    section: 'today',               // today | vault | insights | log
    view: null, topic: null, tab: null,
    theme: localStorage.getItem('commitd.theme') || 'dark',
    gridMode: localStorage.getItem('commitd.gridmode') || 'heat',
    filter: '', logFilter: '', logN: 40, bview: 'list',
    closed: new Set(), busy: null, error: null,
    vault: null, gh: null, auth: null, readonly: false, rate: null,
  },
  subs: new Set(),
  set(patch) { Object.assign(this.s, patch); this.emit(); },
  emit() { this.subs.forEach(f => f(this.s)); },
  on(f) { this.subs.add(f); return () => this.subs.delete(f); },
};
export const S = store.s;
/* Handy from the console when something looks wrong on a real device. */
globalThis.__S = S;
export const setTheme = (t) => {
  S.theme = t; document.documentElement.dataset.theme = t;
  localStorage.setItem('commitd.theme', t); store.emit();
};
