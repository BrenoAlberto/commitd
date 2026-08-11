/* An in-memory GitHub good enough to exercise the real client: trees, blobs,
   refs, commits, contents, repo create and visibility. Files live in a map;
   every write goes through the same Git Data dance the app uses. */
export function mockGitHub(files = {}, opts = {}) {
  const state = { files: { ...files }, private: true, exists: !!Object.keys(files).length,
    commits: [], admin: opts.admin !== false, log: [] };
  const enc = (s) => Buffer.from(s, 'utf8').toString('base64');
  const dec = (s) => Buffer.from(s, 'base64').toString('utf8');
  const sha = (s) => require('crypto').createHash('sha1').update(s).digest('hex');
  const blobs = {};
  const json = (body, status = 200) => ({ status, contentType: 'application/json',
    headers: { 'x-ratelimit-remaining': '4987', 'x-ratelimit-reset': '0', etag: `W/"${sha(JSON.stringify(body))}"` },
    body: JSON.stringify(body) });

  let head = sha('root'); const trees = {};
  const snapshot = () => { const t = sha(JSON.stringify(state.files) + Math.random());
    trees[t] = { ...state.files }; return t; };
  let tree = snapshot();

  const handle = async function (route, request) {
    const url = new URL(request.url());
    const p = url.pathname, m = request.method();
    state.log.push(`${m} ${p}`);
    const body = request.postData() ? JSON.parse(request.postData()) : null;
    const R = (b, s) => route.fulfill(json(b, s));

    if (p === '/user') return R({ login: 'testuser', avatar_url: '' });
    if (p === '/user/installations' && m === 'GET')
      return R(state.exists ? { total_count: 1, installations: [{ id: 1 }] } : { total_count: 0, installations: [] });
    if (p === '/user/installations/1/repositories' && m === 'GET')
      return R({ repositories: state.exists ? [{ name: 'commitd-vault', private: state.private, default_branch: 'main',
        html_url: 'https://github.com/testuser/commitd-vault', owner: { login: 'testuser' } }] : [] });
    if (/^\/repos\/[^/]+\/[^/]+$/.test(p) && m === 'GET') {
      if (!state.exists) return R({ message: 'Not Found' }, 404);
      return R({ name: 'commitd-vault', private: state.private, default_branch: 'main',
        html_url: 'https://github.com/testuser/commitd-vault' });
    }
    if (p === '/user/repos' && m === 'POST') {
      state.exists = true; state.private = body.private;
      return R({ name: body.name, private: body.private, default_branch: 'main',
        html_url: 'https://github.com/testuser/' + body.name }, 201);
    }
    if (/^\/repos\/[^/]+\/[^/]+$/.test(p) && m === 'PATCH') {
      if (!state.admin) return R({ message: 'Resource not accessible by personal access token' }, 403);
      state.private = body.private; return R({ private: state.private });
    }
    if (p.includes('/git/trees/') && m === 'GET') {
      const t = trees[tree] || state.files;
      return R({ sha: tree, tree: Object.keys(t).map(path => ({ path, type: 'blob', sha: sha(path + t[path]) })) });
    }
    if (p.includes('/contents/') && m === 'GET') {
      const path = decodeURIComponent(p.split('/contents/')[1]);
      if (!(path in state.files)) return R({ message: 'Not Found' }, 404);
      return R({ content: enc(state.files[path]), encoding: 'base64' });
    }
    if (p.includes('/git/blobs/') && m === 'GET') {
      const want = p.split('/git/blobs/')[1];
      const t = trees[tree] || state.files;
      const hit = Object.entries(t).find(([k, v]) => sha(k + v) === want);
      return hit ? R({ content: enc(hit[1]), encoding: 'base64' }) : R({ message: 'Not Found' }, 404);
    }
    if (p.endsWith('/git/blobs') && m === 'POST') {
      const s = sha(body.content + Math.random()); blobs[s] = dec(body.content); return R({ sha: s }, 201);
    }
    if (p.endsWith('/git/trees') && m === 'POST') {
      const next = { ...(trees[body.base_tree] || state.files) };
      body.tree.forEach(n => { next[n.path] = blobs[n.sha]; });
      const t = sha(JSON.stringify(next) + Math.random()); trees[t] = next; return R({ sha: t }, 201);
    }
    if (p.endsWith('/git/commits') && m === 'POST') {
      const c = sha(body.message + Math.random());
      state.commits.push({ sha: c, message: body.message, tree: body.tree, date: body.author?.date });
      return R({ sha: c, message: body.message }, 201);
    }
    if (p.includes('/git/commits/') && m === 'GET') {
      const c = state.commits.find(x => x.sha === p.split('/git/commits/')[1]);
      return R({ sha: c?.sha || head, tree: { sha: c?.tree || tree } });
    }
    if (p.includes('/git/ref') && m === 'GET') return R({ object: { sha: head } });
    if (p.includes('/git/refs/') && m === 'PATCH') {
      head = body.sha;
      const c = state.commits.find(x => x.sha === head);
      if (c) { tree = c.tree; state.files = { ...trees[c.tree] }; }
      return R({ object: { sha: head } });
    }
    return R({ message: 'unhandled ' + m + ' ' + p }, 500);
  };
  handle.state = state;
  return handle;
}
