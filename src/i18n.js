/* Internationalisation, no-build style.
   The English source string IS the key: `t('Nothing is waiting')` returns the
   current language's translation, or the English itself when there isn't one —
   a missing entry can never break the app, it just shows up untranslated.
   Adding a language = one dictionary file in src/lang/ plus one LANGS row.

   Two things deliberately stay English everywhere:
   · git and product vocabulary — branch, commit, merge, checkout, topic,
     vault, streak — they are the product's own names;
   · anything WRITTEN TO THE REPOSITORY (commit messages, the generated
     README): that is data, and data must not depend on the UI language. */

import { PT } from './lang/pt.js';

const DICTS = { pt: PT };
export const LANGS = [['en', 'English'], ['pt', 'Português (BR)']];

export let lang = globalThis.localStorage?.getItem('commitd.lang')
  || ((globalThis.navigator?.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en');
if (lang !== 'en' && !DICTS[lang]) lang = 'en';
if (globalThis.document) document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

export const setLang = (l) => { localStorage.setItem('commitd.lang', l); location.reload(); };

export const t = (s, ...a) => {
  let out = (lang !== 'en' && DICTS[lang]?.[s]) || s;
  a.forEach((v, i) => { out = out.replaceAll(`{${i}}`, v); });
  return out;
};
