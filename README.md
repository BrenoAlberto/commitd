# commitd

**A daemon for the habits you keep.** A habit tracker that treats your life like a
repository: it runs entirely in your browser, is hosted on GitHub Pages, and stores
100% of its data in a single GitHub repo that *you* own.

No server. No database. No account with us — because there is no us. If commitd
disappears tomorrow, your data is still sitting in your GitHub account as plain,
greppable text.

---

## The model in sixty seconds

| commitd | what it means |
|---|---|
| **branch** | one habit (`practice-japanese`, `sleep`, `quit-smoking`) — a long-lived line of work running in parallel with your other lines of work |
| **topic branch** | the current *focus* inside a habit (`practice-japanese/kana`, then `/vocab`, then `/grammar`). It owns the goal and the metrics, and merges into the parent when it's learned. **The streak never notices.** |
| **commit** | one logged instance: a message, some metrics, some tags |
| **cadence** | daily · weekdays · N×/week · N×/month · no target · **abstain** |
| **build status** | `passing` / `pending` / `failing` — are you meeting the cadence you set? |
| **uptime** | % of expected periods hit. 94% survives one bad Tuesday; a streak doesn't. |
| **merge to main** | graduate a habit. It's not a thing you track anymore — it's who you are. |

Two ideas do most of the work:

**A habit outlives its metrics.** "14 kana" is true for six weeks; `practice-japanese`
runs for years. So the branch owns the *commitment* (cadence, streak, uptime) and a
topic branch owns the *goal and the numbers*. That's also why a parent's grid can never
be metric-driven — you can't add kana to pages — so it answers "did you show up", which
stays meaningful for ten years.

**Abstain branches invert.** For quitting, the grid fills green on its own and a commit
is a *relapse* — logged without judgement, because a hidden relapse is the one that wins.

## What's in the vault

```
commitd-vault/
├── README.md                       auto-generated: an ASCII contribution grid + stats
├── commitd.json                    schema version, timezone, day boundary
├── branches/
│   └── practice-japanese/
│       ├── branch.json             the commitment: cadence, group, status
│       ├── README.md               your why
│       ├── log/2026-08.jsonl       one JSON object per line = one commit
│       └── topics/
│           ├── kana/               branch.json (goal, metrics, dated targets) + log/
│           ├── vocab/
│           └── grammar/
└── .commitd/index.json             a rebuildable cache — never the source of truth
```

Writes go through the **Git Data API** (blobs → tree → commit → ref), so one logged
habit is one atomic git commit with a real message and the author date set to the day
you logged it. Your habits show up on your own GitHub contribution graph.

## Running it

There is no build step. The files in this repo are the files GitHub Pages serves.

```bash
git clone <this repo> && cd commitd
python3 -m http.server 8137        # or any static server
open http://localhost:8137
```

To deploy: push to `main`. `.github/workflows/pages.yml` publishes the repo as-is.
Then enable **Settings → Pages → Source: GitHub Actions**.

## Connecting your GitHub

Two ways in, same four-method auth interface behind both:

**Sign in with GitHub** (the short way): create the vault repository, click sign in,
and GitHub asks you to install the commitd app on that one repository. No token to
copy. GitHub's token endpoint sends no CORS headers, so the code → token exchange runs
through a [stateless ~30-line worker](https://github.com/BrenoAlberto/commitd-token-service)
that holds the app's client secret and stores nothing.

**A fine-grained personal access token** (the self-custody way), scoped to **one
repository**:

| Permission | Why |
|---|---|
| **Contents: Read and write** | required — the vault's files |
| **Administration: Read and write** | optional — only to flip the repo public/private from inside the app |

Either credential lives in this tab by default. If you tick *remember on this device*
it is encrypted with a passphrase (AES-GCM, PBKDF2 250k) before it touches
`localStorage`. A bearer token for your GitHub account does not belong in
`localStorage` in the clear.

## Private and public

**Your vault is private when it is created.** In *Vault settings* you can make it public;
the app tells you exactly what that exposes (every branch name, every commit message,
every metric, every relapse) before it does anything.

A public vault gets a read-only viewer that needs no token and no account:

```
https://<you>.github.io/commitd/#/u/<login>/<repo>
```

Readers can see everything and write nothing — they have no token, and GitHub will not
accept commits from them. The reader tries `raw.githubusercontent.com` first and falls
back to the Contents API for networks that block it.

## Keyboard

`⌘K` palette · `c` commit · `t` theme · `g` then `t/v/i/l` for Today, Vault, Insights, Log

## Architecture

No build, no bundler, no dependencies — plain ES modules, which is also why the whole
thing is auditable in an afternoon.

| file | what it owns |
|---|---|
| `src/model.js` | the rules: cadence, streak, uptime, build status, grid levels. Nothing here is persisted. |
| `src/vault.js` | how a habit becomes files and back again |
| `src/github.js` | ETag-cached reads, atomic multi-file writes, the public reader |
| `src/auth.js` | the auth interface + the PAT provider |
| `src/actions.js` | every mutation: change memory, render, then persist |
| `src/views.js` | Today / Vault / Insights / Log and the entity pages |
| `src/charts.js` | grids, lanes, sparklines, target step lines |
| `src/ui.js` | sheets (including the keyboard geometry), palette, toasts |

## Tests

```bash
python3 -m http.server 8137 &        # serve the app
node test/run.mjs                    # 43 assertions against a mock GitHub
node test/public.mjs                 # the read-only public path
node test/mobile.mjs                 # phone layout and focus behaviour
```

`test/mock-github.js` is an in-memory GitHub — trees, blobs, refs, commits, contents,
repo creation and visibility — so the real client code is exercised end to end, right
down to asserting what lands in `branches/…/log/YYYY-MM.jsonl`.

## Licence

MIT.
