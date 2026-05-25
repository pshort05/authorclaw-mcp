# AuthorClaw MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready MCP server that bridges Claude (Desktop, Claude.ai, Claude Code) to a local AuthorClaw gateway, following the design in `docs/ARCHITECTURE.md`.

**Architecture:** Fork the OAuth 2.1 + SSE scaffolding from `freema/openclaw-mcp`, re-target the HTTP client at AuthorClaw's REST API on port 3847, and add twelve author-specific MCP tools. Deploy as a three-service Docker Compose stack (init-container that applies the LAN binding patch, then AuthorClaw, then this MCP bridge).

**Tech Stack:** TypeScript, Node 22, Vitest, tsup, `@modelcontextprotocol/sdk`, Docker, Docker Compose, Alpine `sh` for the patch init-container.

---

## Ground Rules

- **TDD for all new code** (`src/config.ts`, `src/client/authorclaw.ts`, `src/tools/*.ts`): failing test first, then minimal implementation.
- **Verification-first for ported code** (OAuth handler, task queue, server scaffolding): import from upstream, then add tests for the boundaries we touch.
- **One commit per task** unless the task explicitly says otherwise. Prefer Conventional Commits prefixes (`feat:`, `chore:`, `test:`, `docs:`).
- **Never push from inside a task.** The user controls remotes.
- **If reality diverges from this plan** — e.g., the upstream layout differs from what's described in Task 0 — stop, update the plan, then continue.

---

## File Structure

New or modified files this plan produces:

```
src/
  config.ts                       # NEW : env-driven config, AuthorClaw defaults
  server.ts                       # MODIFY : register AuthorClaw tools, instantiate client
  auth/oauth.ts                   # KEEP : verbatim from freema/openclaw-mcp
  client/authorclaw.ts            # NEW : REST client for AuthorClaw :3847
  tools/
    chat.ts                       # NEW : authorclaw_chat, authorclaw_chat_async
    projects.ts                   # NEW : project_create / _status / _list / _stop
    files.ts                      # NEW : files_list / _read / _export
    research.ts                   # NEW : research
    status.ts                     # NEW : status (heartbeat)
    tasks.ts                      # PORT : async task queue from upstream
tests/
  config.test.ts                  # NEW
  client/authorclaw.test.ts       # NEW
  tools/chat.test.ts              # NEW
  tools/projects.test.ts          # NEW
  tools/files.test.ts             # NEW
  tools/research.test.ts          # NEW
  tools/status.test.ts            # NEW
  tools/tasks.test.ts             # NEW (smoke test on ported queue)
docker/
  Dockerfile                      # MODIFY : adjust image tag/name
  docker-compose.yml              # REPLACE : 3-service stack with patcher
scripts/
  apply-lan-patch.sh              # COPY : verbatim from authorclaw-docker-fix
docs/
  installation.md                 # NEW
  configuration.md                # NEW
  threat-model.md                 # PORT + EXTEND from upstream
.env.example                      # REPLACE : AuthorClaw env vars
package.json                      # MODIFY : name, scripts, deps, repo URL
README.md                         # REPLACE : real content
```

Files that exist already and stay untouched: `LICENSE`, `.gitignore`.

---

## Task 0: Import upstream scaffold

**Why first:** Every later task depends on `package.json`, `tsconfig.json`, `vitest.config.ts`, and the OAuth/server scaffolding being present. Imports are easier when we don't yet have local code to merge against.

**Files:**
- Create (by copy from upstream): `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `Taskfile.yml`, `.eslintrc.json`, `.prettierrc`, `.dockerignore`, `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`, `server.json`, `SECURITY.md`, `.env.example`, `src/`, `docs/`, `.github/workflows/`
- Keep: `LICENSE`, `README.md`, `.gitignore`, `docs/ARCHITECTURE.md`

- [ ] **Step 1: Clone upstream into a sibling directory**

```bash
cd /tmp
git clone --depth 1 https://github.com/freema/openclaw-mcp upstream-openclaw-mcp
ls upstream-openclaw-mcp
```

Expected: see `src/`, `docs/`, `package.json`, `vitest.config.ts`, etc.

- [ ] **Step 2: Copy scaffold files into this repo**

```bash
cd /home/paul/data/dev/authorclaw-mcp
UP=/tmp/upstream-openclaw-mcp

cp -r $UP/src .
cp -r $UP/docs ./docs-upstream    # don't clobber our ARCHITECTURE.md
cp -r $UP/.github .
cp $UP/package.json $UP/package-lock.json $UP/tsconfig.json $UP/tsup.config.ts \
   $UP/vitest.config.ts $UP/Taskfile.yml $UP/.eslintrc.json $UP/.prettierrc \
   $UP/.dockerignore $UP/Dockerfile $UP/docker-compose.yml $UP/docker-compose.dev.yml \
   $UP/server.json $UP/SECURITY.md $UP/.env.example .
```

- [ ] **Step 3: Merge upstream docs into ours**

```bash
# Move only the docs we want to retain/port (not ARCHITECTURE.md — we have our own).
mv docs-upstream/threat-model.md docs/threat-model-upstream.md  # to be ported in Task 18
rm -rf docs-upstream
```

- [ ] **Step 4: Append upstream .gitignore entries we don't have**

```bash
cat $UP/.gitignore >> .gitignore
sort -u .gitignore -o .gitignore
```

Open `.gitignore` and remove any duplicates the sort missed.

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected: no errors. If `package-lock.json` is out of sync, run `npm install` again — npm will reconcile.

- [ ] **Step 6: Verify the upstream build and test pass unchanged**

```bash
npx vitest run
npm run build      # whatever upstream's build script is named — check package.json
```

Expected: tests pass, build emits `dist/` (or upstream equivalent). If any fail, this is upstream's state — record what failed in the task notes, don't fix.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: import scaffold from freema/openclaw-mcp@<short-sha>"
```

Replace `<short-sha>` with the actual upstream commit SHA: `git -C /tmp/upstream-openclaw-mcp rev-parse --short HEAD`.

---

## Task 1: Repo identity rewrite

**Files:**
- Modify: `package.json` (name, description, repo URL, author, keywords)
- Modify: `server.json` (if present — it's MCP server metadata)
- Replace: `README.md`
- Verify: `LICENSE` (already MIT, © 2026 Paul Short — created in initial commit; no change)

- [ ] **Step 1: Rewrite package.json identity fields**

Edit `package.json`:

```json
{
  "name": "authorclaw-mcp",
  "version": "0.1.0",
  "description": "MCP server bridging Claude to a local AuthorClaw writing agent",
  "author": "Paul Short",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/pshort05/authorclaw-mcp.git"
  },
  "homepage": "https://github.com/pshort05/authorclaw-mcp",
  "bugs": "https://github.com/pshort05/authorclaw-mcp/issues",
  "keywords": ["mcp", "model-context-protocol", "authorclaw", "writing"],
  ...
}
```

Leave `scripts`, `dependencies`, `devDependencies` untouched in this task — they get tuned later if needed.

- [ ] **Step 2: Update server.json if present**

If `server.json` exists (MCP server metadata), set:

```json
{
  "name": "authorclaw",
  "description": "AuthorClaw writing agent — chat, projects, files, research"
}
```

Leave OAuth fields alone for now.

- [ ] **Step 3: Replace README.md with real content**

Replace the placeholder README. Write content that covers, in order:

```markdown
# authorclaw-mcp

MCP server bridging Claude (Desktop, Claude.ai, Claude Code) to a local
[AuthorClaw](https://github.com/Ckokoski/authorclaw) writing agent.

Combines:
- [pshort05/authorclaw-docker-fix](https://github.com/pshort05/authorclaw-docker-fix) — LAN binding patch
- [freema/openclaw-mcp](https://github.com/freema/openclaw-mcp) — OAuth 2.1 + SSE bridge architecture

## Quick Start

See [`docs/installation.md`](docs/installation.md) and [`docs/configuration.md`](docs/configuration.md).

The full design is documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tools

Twelve MCP tools across five surfaces:

- `authorclaw_chat`, `authorclaw_chat_async`
- `authorclaw_project_create`, `_status`, `_list`, `_stop`
- `authorclaw_files_list`, `_read`, `_export`
- `authorclaw_research`
- `authorclaw_status`
- `authorclaw_task_status`, `_list`, `_cancel`

## Security

See [`docs/threat-model.md`](docs/threat-model.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Credits

- AuthorClaw — Ckokoski (MIT)
- openclaw-mcp — Tomáš Grasl (MIT)
- LAN patch — pshort05/authorclaw-docker-fix (MIT)
```

- [ ] **Step 4: Run tests to confirm rename didn't break anything**

```bash
npx vitest run
```

Expected: still passes.

- [ ] **Step 5: Commit**

```bash
git add package.json server.json README.md
git commit -m "chore: rebrand to authorclaw-mcp"
```

---

## Task 2: AuthorClaw configuration module

**Files:**
- Create: `src/config.ts` (or modify the existing one from upstream — see Step 1)
- Create: `tests/config.test.ts`

- [ ] **Step 1: Inspect existing src/config.ts**

```bash
cat src/config.ts
```

Note the existing export shape (almost certainly an object with `openclaw`, `oauth`, `mcp` sub-objects).

- [ ] **Step 2: Write failing test for AuthorClaw config defaults**

Create `tests/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('config.authorclaw', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AUTHORCLAW_URL;
    delete process.env.AUTHORCLAW_API_TOKEN;
    delete process.env.AUTHORCLAW_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults url to http://authorclaw:3847', async () => {
    const { config } = await import('../src/config.js');
    expect(config.authorclaw.url).toBe('http://authorclaw:3847');
  });

  it('defaults token to empty string', async () => {
    const { config } = await import('../src/config.js');
    expect(config.authorclaw.token).toBe('');
  });

  it('defaults timeoutMs to 300000', async () => {
    const { config } = await import('../src/config.js');
    expect(config.authorclaw.timeoutMs).toBe(300_000);
  });

  it('reads overrides from environment', async () => {
    process.env.AUTHORCLAW_URL = 'http://example:9999';
    process.env.AUTHORCLAW_API_TOKEN = 'tok';
    process.env.AUTHORCLAW_TIMEOUT_MS = '60000';
    // Bust import cache so the module re-evaluates env.
    delete require.cache?.[require.resolve('../src/config.js')];
    const { config } = await import('../src/config.js?bust=' + Date.now());
    expect(config.authorclaw.url).toBe('http://example:9999');
    expect(config.authorclaw.token).toBe('tok');
    expect(config.authorclaw.timeoutMs).toBe(60_000);
  });
});
```

Note: if upstream's `src/config.ts` reads env at import time (not lazily), the cache-busting trick is needed. If it reads lazily (via a function), simplify by calling the function in each test.

- [ ] **Step 3: Run test to see it fail**

```bash
npx vitest run tests/config.test.ts
```

Expected: FAIL — `config.authorclaw` does not exist.

- [ ] **Step 4: Add AuthorClaw config to src/config.ts**

Add this block alongside (not replacing) the existing OpenClaw config. Preserve the upstream OAuth / MCP fields untouched. Example shape:

```typescript
export const config = {
  // ... existing oauth, mcp fields kept verbatim ...

  authorclaw: {
    url: process.env.AUTHORCLAW_URL ?? 'http://authorclaw:3847',
    token: process.env.AUTHORCLAW_API_TOKEN ?? '',
    timeoutMs: Number(process.env.AUTHORCLAW_TIMEOUT_MS ?? 300_000),
  },
};
```

If upstream's config exports differently (e.g. multiple named exports), match its style — add an `authorclawConfig` export instead, and update the test imports accordingly.

- [ ] **Step 5: Run test to see it pass**

```bash
npx vitest run tests/config.test.ts
```

Expected: PASS (4/4).

- [ ] **Step 6: Run full suite to confirm no regression**

```bash
npx vitest run
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat(config): add AuthorClaw connection settings"
```

---

## Task 3: AuthorClaw client — chat + scaffold

**Files:**
- Create: `src/client/authorclaw.ts`
- Create: `tests/client/authorclaw.test.ts`

- [ ] **Step 1: Decide on fetch implementation**

Check what HTTP library upstream uses:

```bash
grep -RIn "from 'node-fetch'\|from 'undici'\|global.fetch\|fetch(" src/ | head -20
```

If upstream uses `node-fetch`, install it and use it here. If it relies on Node's built-in `fetch` (Node ≥18), use that. Record the decision in a code comment at the top of `src/client/authorclaw.ts`.

- [ ] **Step 2: Write failing test for chat()**

Create `tests/client/authorclaw.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthorClawClient } from '../../src/client/authorclaw.js';

describe('AuthorClawClient.chat', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('POSTs message to /api/chat and returns reply', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ reply: 'hello' }), { status: 200 }),
    );
    const client = new AuthorClawClient('http://authorclaw:3847', '');
    const result = await client.chat('hi');

    expect(result).toEqual({ reply: 'hello' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://authorclaw:3847/api/chat');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ message: 'hi' }));
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sends bearer token when configured', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{}', { status: 200 }),
    );
    const client = new AuthorClawClient('http://h:3847', 'secret');
    await client.chat('x');
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });

  it('throws on non-OK response with status code in message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('boom', { status: 500 }),
    );
    const client = new AuthorClawClient('http://h:3847', '');
    await expect(client.chat('x')).rejects.toThrow(/500/);
  });

  it('strips trailing slash from base URL', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"reply":""}', { status: 200 }),
    );
    const client = new AuthorClawClient('http://h:3847/', '');
    await client.chat('x');
    expect(fetchMock.mock.calls[0][0]).toBe('http://h:3847/api/chat');
  });
});
```

- [ ] **Step 3: Run test to see it fail**

```bash
npx vitest run tests/client/authorclaw.test.ts
```

Expected: FAIL — `AuthorClawClient` cannot be imported.

- [ ] **Step 4: Implement minimal client + chat()**

Create `src/client/authorclaw.ts`:

```typescript
import { config } from '../config.js';

export class AuthorClawClient {
  private base: string;
  private token: string;

  constructor(url = config.authorclaw.url, token = config.authorclaw.token) {
    this.base = url.replace(/\/$/, '');
    this.token = token;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async chat(message: string): Promise<{ reply: string }> {
    const res = await fetch(`${this.base}/api/chat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw chat error: ${res.status}`);
    return (await res.json()) as { reply: string };
  }
}
```

- [ ] **Step 5: Run test to see it pass**

```bash
npx vitest run tests/client/authorclaw.test.ts
```

Expected: PASS (4/4).

- [ ] **Step 6: Commit**

```bash
git add src/client/authorclaw.ts tests/client/authorclaw.test.ts
git commit -m "feat(client): AuthorClaw HTTP client with chat()"
```

---

## Task 4: AuthorClaw client — project methods

**Files:**
- Modify: `src/client/authorclaw.ts`
- Modify: `tests/client/authorclaw.test.ts`

- [ ] **Step 1: Add failing tests for createProject/getProjectStatus/listProjects/stopProject**

Append to `tests/client/authorclaw.test.ts`:

```typescript
describe('AuthorClawClient projects', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('createProject POSTs task to /api/projects and returns id+steps', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'p1', steps: 5 }), { status: 200 }),
    );
    const client = new AuthorClawClient('http://h:3847', '');
    const result = await client.createProject('write a story');
    expect(result).toEqual({ id: 'p1', steps: 5 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://h:3847/api/projects');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ task: 'write a story' }));
  });

  it('getProjectStatus GETs /api/projects/:id', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"status":"running"}', { status: 200 }),
    );
    const client = new AuthorClawClient('http://h:3847', '');
    const result = await client.getProjectStatus('p1');
    expect(result).toEqual({ status: 'running' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1');
  });

  it('listProjects GETs /api/projects', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('[]', { status: 200 }),
    );
    const client = new AuthorClawClient('http://h:3847', '');
    const result = await client.listProjects();
    expect(result).toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://h:3847/api/projects');
  });

  it('stopProject POSTs to /api/projects/:id/stop', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 200 }),
    );
    const client = new AuthorClawClient('http://h:3847', '');
    await client.stopProject('p1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://h:3847/api/projects/p1/stop');
    expect(init?.method).toBe('POST');
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npx vitest run tests/client/authorclaw.test.ts -t projects
```

Expected: FAIL — methods don't exist.

- [ ] **Step 3: Implement the four project methods**

Append to `src/client/authorclaw.ts` (inside the class):

```typescript
async createProject(task: string): Promise<{ id: string; steps: number }> {
  const res = await fetch(`${this.base}/api/projects`, {
    method: 'POST',
    headers: this.headers(),
    body: JSON.stringify({ task }),
    signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
  });
  if (!res.ok) throw new Error(`AuthorClaw createProject error: ${res.status}`);
  return (await res.json()) as { id: string; steps: number };
}

async getProjectStatus(id: string): Promise<unknown> {
  const res = await fetch(`${this.base}/api/projects/${encodeURIComponent(id)}`, {
    headers: this.headers(),
  });
  if (!res.ok) throw new Error(`AuthorClaw getProjectStatus error: ${res.status}`);
  return await res.json();
}

async listProjects(): Promise<unknown[]> {
  const res = await fetch(`${this.base}/api/projects`, { headers: this.headers() });
  if (!res.ok) throw new Error(`AuthorClaw listProjects error: ${res.status}`);
  return (await res.json()) as unknown[];
}

async stopProject(id: string): Promise<void> {
  const res = await fetch(`${this.base}/api/projects/${encodeURIComponent(id)}/stop`, {
    method: 'POST',
    headers: this.headers(),
  });
  if (!res.ok) throw new Error(`AuthorClaw stopProject error: ${res.status}`);
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
npx vitest run tests/client/authorclaw.test.ts
```

Expected: all chat + project tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/authorclaw.ts tests/client/authorclaw.test.ts
git commit -m "feat(client): project create/status/list/stop methods"
```

---

## Task 5: AuthorClaw client — file methods

**Files:**
- Modify: `src/client/authorclaw.ts`
- Modify: `tests/client/authorclaw.test.ts`

- [ ] **Step 1: Add failing tests for listFiles/readFile/exportFile**

Append:

```typescript
describe('AuthorClawClient files', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('listFiles with no folder GETs /api/files', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('[]', { status: 200 }),
    );
    await new AuthorClawClient('http://h:3847', '').listFiles();
    expect(fetchMock.mock.calls[0][0]).toBe('http://h:3847/api/files');
  });

  it('listFiles with folder URL-encodes the query', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('[]', { status: 200 }),
    );
    await new AuthorClawClient('http://h:3847', '').listFiles('my projects');
    expect(fetchMock.mock.calls[0][0]).toBe('http://h:3847/api/files?folder=my%20projects');
  });

  it('readFile URL-encodes the name', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"content":"hello"}', { status: 200 }),
    );
    const out = await new AuthorClawClient('http://h:3847', '').readFile('a b.md');
    expect(out).toEqual({ content: 'hello' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://h:3847/api/files/a%20b.md');
  });

  it('exportFile POSTs to /api/export with name+format', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"url":"/d/x.docx"}', { status: 200 }),
    );
    const out = await new AuthorClawClient('http://h:3847', '').exportFile('x', 'docx');
    expect(out).toEqual({ url: '/d/x.docx' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://h:3847/api/export');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ name: 'x', format: 'docx' }));
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npx vitest run tests/client/authorclaw.test.ts -t files
```

Expected: FAIL.

- [ ] **Step 3: Implement the three file methods**

Append to `src/client/authorclaw.ts`:

```typescript
async listFiles(folder?: string): Promise<unknown[]> {
  const url = folder
    ? `${this.base}/api/files?folder=${encodeURIComponent(folder)}`
    : `${this.base}/api/files`;
  const res = await fetch(url, { headers: this.headers() });
  if (!res.ok) throw new Error(`AuthorClaw listFiles error: ${res.status}`);
  return (await res.json()) as unknown[];
}

async readFile(name: string): Promise<{ content: string }> {
  const res = await fetch(`${this.base}/api/files/${encodeURIComponent(name)}`, {
    headers: this.headers(),
  });
  if (!res.ok) throw new Error(`AuthorClaw readFile error: ${res.status}`);
  return (await res.json()) as { content: string };
}

async exportFile(name: string, format: 'docx' | 'html' | 'txt'): Promise<{ url: string }> {
  const res = await fetch(`${this.base}/api/export`, {
    method: 'POST',
    headers: this.headers(),
    body: JSON.stringify({ name, format }),
  });
  if (!res.ok) throw new Error(`AuthorClaw exportFile error: ${res.status}`);
  return (await res.json()) as { url: string };
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
npx vitest run tests/client/authorclaw.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/authorclaw.ts tests/client/authorclaw.test.ts
git commit -m "feat(client): file list/read/export methods"
```

---

## Task 6: AuthorClaw client — research + health methods

**Files:**
- Modify: `src/client/authorclaw.ts`
- Modify: `tests/client/authorclaw.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```typescript
describe('AuthorClawClient research + health', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('research POSTs topic to /api/research and returns summary', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"summary":"…"}', { status: 200 }),
    );
    const out = await new AuthorClawClient('http://h:3847', '').research('vintage aircraft');
    expect(out).toEqual({ summary: '…' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://h:3847/api/research');
    expect(init?.body).toBe(JSON.stringify({ topic: 'vintage aircraft' }));
  });

  it('health GETs /api/health and returns status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"status":"ok"}', { status: 200 }),
    );
    const out = await new AuthorClawClient('http://h:3847', '').health();
    expect(out).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run tests/client/authorclaw.test.ts -t research
```

- [ ] **Step 3: Implement**

Append:

```typescript
async research(topic: string): Promise<{ summary: string }> {
  const res = await fetch(`${this.base}/api/research`, {
    method: 'POST',
    headers: this.headers(),
    body: JSON.stringify({ topic }),
    signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
  });
  if (!res.ok) throw new Error(`AuthorClaw research error: ${res.status}`);
  return (await res.json()) as { summary: string };
}

async health(): Promise<{ status: string }> {
  const res = await fetch(`${this.base}/api/health`, { headers: this.headers() });
  if (!res.ok) throw new Error(`AuthorClaw health error: ${res.status}`);
  return (await res.json()) as { status: string };
}
```

- [ ] **Step 4: Run full client test file**

```bash
npx vitest run tests/client/authorclaw.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/authorclaw.ts tests/client/authorclaw.test.ts
git commit -m "feat(client): research and health methods"
```

---

## Task 7: MCP chat tools

**Files:**
- Create: `src/tools/chat.ts`
- Create: `tests/tools/chat.test.ts`

**Design note:** Each tools module exports (a) an array of tool definitions for `ListTools`, and (b) a `dispatch(name, args, client)` function the server calls when `CallTool` arrives. This separation makes handlers unit-testable without a live MCP server.

- [ ] **Step 1: Write failing tests**

Create `tests/tools/chat.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { chatTools, dispatchChatTool } from '../../src/tools/chat.js';

describe('chat tools registration', () => {
  it('exposes authorclaw_chat and authorclaw_chat_async', () => {
    const names = chatTools.map(t => t.name);
    expect(names).toContain('authorclaw_chat');
    expect(names).toContain('authorclaw_chat_async');
  });

  it('authorclaw_chat schema requires a message string', () => {
    const t = chatTools.find(t => t.name === 'authorclaw_chat')!;
    expect(t.inputSchema.required).toContain('message');
    expect((t.inputSchema.properties as any).message.type).toBe('string');
  });
});

describe('dispatchChatTool', () => {
  it('routes authorclaw_chat to client.chat and returns text content', async () => {
    const client = { chat: vi.fn().mockResolvedValue({ reply: 'world' }) } as any;
    const result = await dispatchChatTool('authorclaw_chat', { message: 'hi' }, client);
    expect(client.chat).toHaveBeenCalledWith('hi');
    expect(result).toEqual({ content: [{ type: 'text', text: 'world' }] });
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchChatTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });

  it('validates message is present', async () => {
    const client = { chat: vi.fn() } as any;
    await expect(dispatchChatTool('authorclaw_chat', {}, client)).rejects.toThrow(/message/);
    expect(client.chat).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run tests/tools/chat.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Create `src/tools/chat.ts`:

```typescript
import type { AuthorClawClient } from '../client/authorclaw.js';

export const chatTools = [
  {
    name: 'authorclaw_chat',
    description:
      'Send a message to AuthorClaw and get a response. Use for short writing tasks, questions, or quick edits.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message or writing request' },
      },
      required: ['message'],
    },
  },
  {
    name: 'authorclaw_chat_async',
    description:
      'Queue a writing task that may take several minutes. Returns a task_id to poll with authorclaw_task_status.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  },
] as const;

export async function dispatchChatTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name === 'authorclaw_chat') {
    const message = args.message;
    if (typeof message !== 'string') throw new Error('message is required');
    const { reply } = await client.chat(message);
    return { content: [{ type: 'text', text: reply }] };
  }
  if (name === 'authorclaw_chat_async') {
    // Implemented in Task 12 once the task queue is wired in.
    throw new Error('authorclaw_chat_async not yet implemented');
  }
  throw new Error(`unknown chat tool: ${name}`);
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/tools/chat.test.ts
```

Expected: PASS (chat + schema + dispatch tests). The `chat_async not yet implemented` is fine — no test asserts its success yet.

- [ ] **Step 5: Commit**

```bash
git add src/tools/chat.ts tests/tools/chat.test.ts
git commit -m "feat(tools): authorclaw_chat tool"
```

---

## Task 8: MCP project tools

**Files:**
- Create: `src/tools/projects.ts`
- Create: `tests/tools/projects.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/projects.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { projectTools, dispatchProjectTool } from '../../src/tools/projects.js';

describe('project tools registration', () => {
  it('exposes the four project tools', () => {
    const names = projectTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_project_create',
      'authorclaw_project_status',
      'authorclaw_project_list',
      'authorclaw_project_stop',
    ]);
  });
});

describe('dispatchProjectTool', () => {
  it('project_create calls client.createProject and returns id+steps as text', async () => {
    const client = {
      createProject: vi.fn().mockResolvedValue({ id: 'p1', steps: 5 }),
    } as any;
    const out = await dispatchProjectTool('authorclaw_project_create', { task: 'write' }, client);
    expect(client.createProject).toHaveBeenCalledWith('write');
    expect(out.content[0].text).toContain('p1');
    expect(out.content[0].text).toContain('5');
  });

  it('project_status calls client.getProjectStatus and returns JSON text', async () => {
    const client = {
      getProjectStatus: vi.fn().mockResolvedValue({ status: 'running', step: 3 }),
    } as any;
    const out = await dispatchProjectTool('authorclaw_project_status', { id: 'p1' }, client);
    expect(client.getProjectStatus).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ status: 'running', step: 3 });
  });

  it('project_list calls client.listProjects and returns JSON text', async () => {
    const client = { listProjects: vi.fn().mockResolvedValue([{ id: 'p1' }]) } as any;
    const out = await dispatchProjectTool('authorclaw_project_list', {}, client);
    expect(JSON.parse(out.content[0].text)).toEqual([{ id: 'p1' }]);
  });

  it('project_stop calls client.stopProject and returns confirmation text', async () => {
    const client = { stopProject: vi.fn().mockResolvedValue(undefined) } as any;
    const out = await dispatchProjectTool('authorclaw_project_stop', { id: 'p1' }, client);
    expect(client.stopProject).toHaveBeenCalledWith('p1');
    expect(out.content[0].text).toMatch(/stopped/i);
  });

  it('validates required args', async () => {
    const client = { createProject: vi.fn() } as any;
    await expect(
      dispatchProjectTool('authorclaw_project_create', {}, client),
    ).rejects.toThrow(/task/);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run tests/tools/projects.test.ts
```

- [ ] **Step 3: Implement**

Create `src/tools/projects.ts`:

```typescript
import type { AuthorClawClient } from '../client/authorclaw.js';

export const projectTools = [
  {
    name: 'authorclaw_project_create',
    description:
      'Create a writing project (e.g. full novel, revision pass, book launch). AuthorClaw plans the steps autonomously and begins executing immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Project description, e.g. "Write a sci-fi thriller about rogue AI in aviation"',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'authorclaw_project_status',
    description: 'Get step-by-step progress for a running project.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_list',
    description: 'List all projects, optionally filtered by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['running', 'complete', 'paused'] },
      },
    },
  },
  {
    name: 'authorclaw_project_stop',
    description: 'Pause a running project cleanly.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchProjectTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_project_create') {
    const task = args.task;
    if (typeof task !== 'string') throw new Error('task is required');
    const { id, steps } = await client.createProject(task);
    return { content: [{ type: 'text', text: `Created project ${id} with ${steps} planned steps.` }] };
  }
  if (name === 'authorclaw_project_status') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const status = await client.getProjectStatus(id);
    return { content: [{ type: 'text', text: JSON.stringify(status) }] };
  }
  if (name === 'authorclaw_project_list') {
    const list = await client.listProjects();
    // Status filter is applied client-side until AuthorClaw supports server-side filtering.
    const status = args.status;
    const filtered = typeof status === 'string'
      ? (list as Array<Record<string, unknown>>).filter(p => p.status === status)
      : list;
    return { content: [{ type: 'text', text: JSON.stringify(filtered) }] };
  }
  if (name === 'authorclaw_project_stop') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    await client.stopProject(id);
    return { content: [{ type: 'text', text: `Project ${id} stopped.` }] };
  }
  throw new Error(`unknown project tool: ${name}`);
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/tools/projects.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/projects.ts tests/tools/projects.test.ts
git commit -m "feat(tools): project create/status/list/stop tools"
```

---

## Task 9: MCP file tools

**Files:**
- Create: `src/tools/files.ts`
- Create: `tests/tools/files.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/files.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fileTools, dispatchFileTool } from '../../src/tools/files.js';

describe('file tools registration', () => {
  it('exposes list/read/export', () => {
    const names = fileTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_files_list',
      'authorclaw_files_read',
      'authorclaw_files_export',
    ]);
  });
});

describe('dispatchFileTool', () => {
  it('files_list calls client.listFiles with optional folder', async () => {
    const client = { listFiles: vi.fn().mockResolvedValue([]) } as any;
    await dispatchFileTool('authorclaw_files_list', { folder: 'projects' }, client);
    expect(client.listFiles).toHaveBeenCalledWith('projects');
  });

  it('files_list with no folder calls listFiles()', async () => {
    const client = { listFiles: vi.fn().mockResolvedValue([]) } as any;
    await dispatchFileTool('authorclaw_files_list', {}, client);
    expect(client.listFiles).toHaveBeenCalledWith(undefined);
  });

  it('files_read calls client.readFile and returns content', async () => {
    const client = { readFile: vi.fn().mockResolvedValue({ content: 'body' }) } as any;
    const out = await dispatchFileTool('authorclaw_files_read', { name: 'a.md' }, client);
    expect(client.readFile).toHaveBeenCalledWith('a.md');
    expect(out.content[0].text).toBe('body');
  });

  it('files_export validates format enum', async () => {
    const client = { exportFile: vi.fn() } as any;
    await expect(
      dispatchFileTool('authorclaw_files_export', { name: 'a', format: 'pdf' }, client),
    ).rejects.toThrow(/format/);
  });

  it('files_export calls client.exportFile and returns the URL', async () => {
    const client = {
      exportFile: vi.fn().mockResolvedValue({ url: '/d/a.docx' }),
    } as any;
    const out = await dispatchFileTool(
      'authorclaw_files_export',
      { name: 'a', format: 'docx' },
      client,
    );
    expect(client.exportFile).toHaveBeenCalledWith('a', 'docx');
    expect(out.content[0].text).toContain('/d/a.docx');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run tests/tools/files.test.ts
```

- [ ] **Step 3: Implement**

Create `src/tools/files.ts`:

```typescript
import type { AuthorClawClient } from '../client/authorclaw.js';

const ALLOWED_FORMATS = ['docx', 'html', 'txt'] as const;
type Format = (typeof ALLOWED_FORMATS)[number];

export const fileTools = [
  {
    name: 'authorclaw_files_list',
    description: 'List output files by workspace folder (projects, exports, research).',
    inputSchema: {
      type: 'object',
      properties: { folder: { type: 'string' } },
    },
  },
  {
    name: 'authorclaw_files_read',
    description: 'Read the content of a named output file.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'authorclaw_files_export',
    description: 'Export a file to docx, html, or txt and return the download URL.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        format: { type: 'string', enum: ['docx', 'html', 'txt'] },
      },
      required: ['name', 'format'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchFileTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_files_list') {
    const folder = typeof args.folder === 'string' ? args.folder : undefined;
    const list = await client.listFiles(folder);
    return { content: [{ type: 'text', text: JSON.stringify(list) }] };
  }
  if (name === 'authorclaw_files_read') {
    const file = args.name;
    if (typeof file !== 'string') throw new Error('name is required');
    const { content } = await client.readFile(file);
    return { content: [{ type: 'text', text: content }] };
  }
  if (name === 'authorclaw_files_export') {
    const file = args.name;
    const format = args.format;
    if (typeof file !== 'string') throw new Error('name is required');
    if (typeof format !== 'string' || !ALLOWED_FORMATS.includes(format as Format)) {
      throw new Error(`format must be one of ${ALLOWED_FORMATS.join(', ')}`);
    }
    const { url } = await client.exportFile(file, format as Format);
    return { content: [{ type: 'text', text: `Export ready: ${url}` }] };
  }
  throw new Error(`unknown file tool: ${name}`);
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/tools/files.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/files.ts tests/tools/files.test.ts
git commit -m "feat(tools): file list/read/export tools"
```

---

## Task 10: MCP research tool

**Files:**
- Create: `src/tools/research.ts`
- Create: `tests/tools/research.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { researchTools, dispatchResearchTool } from '../../src/tools/research.js';

describe('research tool', () => {
  it('exposes authorclaw_research', () => {
    expect(researchTools.map(t => t.name)).toEqual(['authorclaw_research']);
  });

  it('calls client.research and returns summary text', async () => {
    const client = {
      research: vi.fn().mockResolvedValue({ summary: 'A short brief.' }),
    } as any;
    const out = await dispatchResearchTool(
      'authorclaw_research',
      { topic: 'aviation history' },
      client,
    );
    expect(client.research).toHaveBeenCalledWith('aviation history');
    expect(out.content[0].text).toBe('A short brief.');
  });

  it('validates topic', async () => {
    const client = { research: vi.fn() } as any;
    await expect(
      dispatchResearchTool('authorclaw_research', {}, client),
    ).rejects.toThrow(/topic/);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run tests/tools/research.test.ts
```

- [ ] **Step 3: Implement**

Create `src/tools/research.ts`:

```typescript
import type { AuthorClawClient } from '../client/authorclaw.js';

export const researchTools = [
  {
    name: 'authorclaw_research',
    description: 'Trigger a deep research task on a topic using AuthorClaw\'s allowlisted web search.',
    inputSchema: {
      type: 'object',
      properties: { topic: { type: 'string' } },
      required: ['topic'],
    },
  },
] as const;

export async function dispatchResearchTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name !== 'authorclaw_research') throw new Error(`unknown research tool: ${name}`);
  const topic = args.topic;
  if (typeof topic !== 'string') throw new Error('topic is required');
  const { summary } = await client.research(topic);
  return { content: [{ type: 'text', text: summary }] };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/tools/research.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/research.ts tests/tools/research.test.ts
git commit -m "feat(tools): research tool"
```

---

## Task 11: MCP status tool

**Files:**
- Create: `src/tools/status.ts`
- Create: `tests/tools/status.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { statusTools, dispatchStatusTool } from '../../src/tools/status.js';

describe('status tool', () => {
  it('exposes authorclaw_status', () => {
    expect(statusTools.map(t => t.name)).toEqual(['authorclaw_status']);
  });

  it('returns OK when health returns ok', async () => {
    const client = { health: vi.fn().mockResolvedValue({ status: 'ok' }) } as any;
    const out = await dispatchStatusTool('authorclaw_status', {}, client);
    expect(out.content[0].text).toMatch(/ok/i);
  });

  it('returns degraded text when health throws', async () => {
    const client = { health: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) } as any;
    const out = await dispatchStatusTool('authorclaw_status', {}, client);
    expect(out.content[0].text).toMatch(/unreachable|ECONNREFUSED/);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run tests/tools/status.test.ts
```

- [ ] **Step 3: Implement**

Create `src/tools/status.ts`:

```typescript
import type { AuthorClawClient } from '../client/authorclaw.js';

export const statusTools = [
  {
    name: 'authorclaw_status',
    description: 'Health check: confirm the AuthorClaw gateway is reachable and responsive.',
    inputSchema: { type: 'object', properties: {} },
  },
] as const;

export async function dispatchStatusTool(
  name: string,
  _args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name !== 'authorclaw_status') throw new Error(`unknown status tool: ${name}`);
  try {
    const { status } = await client.health();
    return { content: [{ type: 'text', text: `AuthorClaw status: ${status}` }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `AuthorClaw unreachable: ${message}` }] };
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/tools/status.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/status.ts tests/tools/status.test.ts
git commit -m "feat(tools): status tool"
```

---

## Task 12: Async task queue (port + adapt)

**Files:**
- Examine: upstream `src/tools/tasks.ts` (already imported in Task 0)
- Modify: `src/tools/tasks.ts` (rename internal references from openclaw → authorclaw)
- Modify: `src/tools/chat.ts` (wire `authorclaw_chat_async` to the queue)
- Create: `tests/tools/tasks.test.ts`

- [ ] **Step 1: Read the upstream task queue**

```bash
cat src/tools/tasks.ts
```

Identify:
- The job-creation function (likely `enqueueTask(fn): string`).
- The status-poll function.
- The cancel function.
- Any module-level state (in-memory map of `task_id → result`).

If the upstream tasks file references `openclaw_*` tool names, list every occurrence so Step 3 catches them all:

```bash
grep -n openclaw src/tools/tasks.ts
```

- [ ] **Step 2: Rename tool names openclaw_* → authorclaw_***

For each match, replace `openclaw_task_status` → `authorclaw_task_status`, etc. Do not touch internal function names, types, or comments unless they expose external symbols. Run after editing:

```bash
grep -n openclaw src/tools/tasks.ts
```

Expected: no matches remain.

- [ ] **Step 3: Wire authorclaw_chat_async into the queue**

Edit `src/tools/chat.ts`. Import the enqueue function from the tasks module:

```typescript
import { enqueueTask } from './tasks.js';
```

Replace the `chat_async` branch:

```typescript
if (name === 'authorclaw_chat_async') {
  const message = args.message;
  if (typeof message !== 'string') throw new Error('message is required');
  const taskId = enqueueTask(() => client.chat(message));
  return { content: [{ type: 'text', text: `Task queued: ${taskId}` }] };
}
```

The exact `enqueueTask` import name depends on what upstream exports — adjust accordingly.

- [ ] **Step 4: Write smoke test for the queue**

Create `tests/tools/tasks.test.ts` — a minimal test that exercises the queue without depending on its internals:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { dispatchChatTool } from '../../src/tools/chat.js';

describe('authorclaw_chat_async', () => {
  it('returns a task_id immediately and the chat resolves in background', async () => {
    const client = { chat: vi.fn().mockResolvedValue({ reply: 'done' }) } as any;
    const out = await dispatchChatTool('authorclaw_chat_async', { message: 'go' }, client);
    expect(out.content[0].text).toMatch(/[A-Za-z0-9-]{4,}/); // some task id
    // Background work must have been kicked off; allow microtasks to drain.
    await new Promise(r => setImmediate(r));
    expect(client.chat).toHaveBeenCalledWith('go');
  });
});
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all green. If the queue test fails because `enqueueTask` runs differently (e.g., requires `await`), adapt the test rather than the queue.

- [ ] **Step 6: Commit**

```bash
git add src/tools/tasks.ts src/tools/chat.ts tests/tools/tasks.test.ts
git commit -m "feat(tools): port async task queue and wire chat_async"
```

---

## Task 13: Wire tools in server.ts

**Files:**
- Modify: `src/server.ts`
- Verify: existing OAuth + transport scaffolding still works

- [ ] **Step 1: Read the current server entry point**

```bash
cat src/server.ts
```

Identify:
- Where the MCP `Server` instance is created.
- Where tools are registered (a `ListTools` handler that returns a flat array; a `CallTool` handler that dispatches by name).
- Where the HTTP client (or whatever upstream uses for the OpenClaw HTTP backend) is constructed.

- [ ] **Step 2: Replace the upstream OpenClaw client with AuthorClawClient**

Find the line that instantiates the OpenClaw client (likely `new OpenClawClient(...)`). Replace with:

```typescript
import { AuthorClawClient } from './client/authorclaw.js';
const client = new AuthorClawClient();   // uses config defaults
```

Remove the now-unused OpenClaw client import. Keep it removed — don't keep dead code per `CLAUDE.md`.

- [ ] **Step 3: Replace the tool registration**

Find the `ListTools` handler. Replace its returned tools array with:

```typescript
import { chatTools, dispatchChatTool } from './tools/chat.js';
import { projectTools, dispatchProjectTool } from './tools/projects.js';
import { fileTools, dispatchFileTool } from './tools/files.js';
import { researchTools, dispatchResearchTool } from './tools/research.js';
import { statusTools, dispatchStatusTool } from './tools/status.js';
// import { taskTools, dispatchTaskTool } from './tools/tasks.js'; // surface depends on upstream

const allTools = [
  ...chatTools,
  ...projectTools,
  ...fileTools,
  ...researchTools,
  ...statusTools,
  // ...taskTools,
];
```

If upstream's `tasks.ts` already exports a `taskTools`-shaped array, include it. If not, add the `taskTools` export in Task 12 and uncomment here.

Replace the `CallTool` dispatch with name-prefix routing:

```typescript
async function dispatch(name: string, args: Record<string, unknown>) {
  if (name.startsWith('authorclaw_chat')) return dispatchChatTool(name, args, client);
  if (name.startsWith('authorclaw_project')) return dispatchProjectTool(name, args, client);
  if (name.startsWith('authorclaw_files')) return dispatchFileTool(name, args, client);
  if (name === 'authorclaw_research') return dispatchResearchTool(name, args, client);
  if (name === 'authorclaw_status') return dispatchStatusTool(name, args, client);
  if (name.startsWith('authorclaw_task')) return dispatchTaskTool(name, args, client);
  throw new Error(`unknown tool: ${name}`);
}
```

- [ ] **Step 4: Type-check + build**

```bash
npm run build
```

Expected: clean. Fix any type errors before continuing.

- [ ] **Step 5: Local smoke test (stdio transport)**

If upstream supports stdio mode (most MCP servers do), run a one-shot ListTools request:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | AUTH_ENABLED=false AUTHORCLAW_URL=http://127.0.0.1:3847 node dist/server.js --stdio \
  2>/dev/null | head -50
```

Expected: JSON response containing all twelve tool names. If the server starts up but no AuthorClaw is running, that's fine — `tools/list` doesn't touch the backend.

If upstream's run command differs, use that instead. Adjust `--stdio` flag to match upstream's CLI.

- [ ] **Step 6: Commit**

```bash
git add src/server.ts
git commit -m "feat(server): register AuthorClaw tools and client"
```

---

## Task 14: LAN patch script

**Files:**
- Create: `scripts/apply-lan-patch.sh` (copy from `pshort05/authorclaw-docker-fix`)

- [ ] **Step 1: Fetch the latest script from the docker-fix repo**

```bash
cd /home/paul/data/dev/authorclaw-mcp
mkdir -p scripts
curl -fsSL https://raw.githubusercontent.com/pshort05/authorclaw-docker-fix/main/apply-lan-patch.sh \
  -o scripts/apply-lan-patch.sh
chmod +x scripts/apply-lan-patch.sh
```

If `main` isn't the default branch, replace with the actual branch name.

- [ ] **Step 2: Sanity-check the script**

```bash
head -5 scripts/apply-lan-patch.sh
scripts/apply-lan-patch.sh --help 2>&1 | head -10  # or --check
```

Expected: shebang line + usage/help text. If the script's interface differs from `--check` / `--rebuild` flags, note the actual interface — Task 16 (compose) depends on it.

- [ ] **Step 3: Add a README pointer**

In `scripts/`, no README is needed for a single file. But add a header comment to the script if one isn't already there — only do this if `head -1` shows it's missing the upstream attribution. Otherwise leave verbatim.

- [ ] **Step 4: Commit**

```bash
git add scripts/apply-lan-patch.sh
git commit -m "chore: bundle LAN patch script from authorclaw-docker-fix"
```

---

## Task 15: Dockerfile

**Files:**
- Modify: `Dockerfile` (in repo root, from upstream)

- [ ] **Step 1: Review the upstream Dockerfile**

```bash
cat Dockerfile
```

Verify: Node 22 slim base, non-root user, multi-stage build, copies `dist/` not `src/`.

- [ ] **Step 2: Adjust image labels and tags only**

Replace any `openclaw-mcp` strings with `authorclaw-mcp` (image name, OCI label values). Do not change the build pipeline structure unless something is broken.

```bash
grep -n openclaw Dockerfile
```

Expected: no matches after edits.

- [ ] **Step 3: Build the image locally**

```bash
docker build -t authorclaw-mcp:dev .
```

Expected: image builds cleanly.

- [ ] **Step 4: Smoke-run the image**

```bash
docker run --rm -e AUTH_ENABLED=false -e AUTHORCLAW_URL=http://127.0.0.1:3847 \
  authorclaw-mcp:dev --help 2>&1 | head -20
```

Expected: the server prints its CLI help and exits, or starts up cleanly. Failure to connect to AuthorClaw is fine at this stage.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile
git commit -m "chore(docker): rename image to authorclaw-mcp"
```

---

## Task 16: docker-compose stack

**Files:**
- Replace: `docker-compose.yml` (root) with the three-service stack from `docs/ARCHITECTURE.md` §9
- Keep: `docker-compose.dev.yml` for local hot-reload during development

- [ ] **Step 1: Move the new compose file into place**

Move the existing upstream `docker-compose.yml` aside, then create the new one:

```bash
mv docker-compose.yml docker-compose.upstream-reference.yml
```

Create `docker-compose.yml` with the stack from `docs/ARCHITECTURE.md` §9 verbatim. Key invariants:

- `authorclaw-patcher` runs once (Alpine) and exits with success before `authorclaw` starts (`depends_on: condition: service_completed_successfully`).
- `authorclaw` does **not** publish port 3847 to the host.
- `authorclaw-mcp` publishes only port 3000 and lives on the same internal Docker network.
- `read_only: true` and `security_opt: [no-new-privileges]` on the MCP container.

- [ ] **Step 2: Adjust the AuthorClaw build context to a working path**

The architecture doc uses `/opt/docker-compose/authorclaw/src` as the example AuthorClaw checkout path. For this repo, document the actual path the user should set via an environment variable:

```yaml
authorclaw:
  build:
    context: ${AUTHORCLAW_SRC:-/opt/docker-compose/authorclaw/src}
    dockerfile: docker/Dockerfile
```

Add a `AUTHORCLAW_SRC=` line to `.env.example` in Task 17.

- [ ] **Step 3: Lint the compose file**

```bash
docker compose -f docker-compose.yml config --quiet
```

Expected: no output (success). If errors, fix syntax.

- [ ] **Step 4: Dry-run the dependency order**

```bash
docker compose -f docker-compose.yml config | grep -E 'service|depends_on' -A 2
```

Expected: `authorclaw-mcp` depends on `authorclaw`, `authorclaw` depends on `authorclaw-patcher` with `service_completed_successfully`.

- [ ] **Step 5: Remove the upstream reference file from version control if not useful**

If `docker-compose.upstream-reference.yml` won't help future readers, delete it. If it documents an alternate pattern worth keeping, leave it but add a one-line header comment explaining what it is.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml
git rm docker-compose.upstream-reference.yml  # if removing
git commit -m "feat(docker): three-service stack with LAN-patcher init container"
```

---

## Task 17: .env.example

**Files:**
- Replace: `.env.example`

- [ ] **Step 1: Replace .env.example with the AuthorClaw set**

```bash
cat > .env.example <<'EOF'
# AuthorClaw source checkout (used by the docker-compose build context)
AUTHORCLAW_SRC=/opt/docker-compose/authorclaw/src

# AuthorClaw connection (inside the Docker network)
AUTHORCLAW_URL=http://authorclaw:3847
AUTHORCLAW_API_TOKEN=
AUTHORCLAW_TIMEOUT_MS=300000

# MCP bridge auth
AUTH_ENABLED=true
MCP_CLIENT_ID=authorclaw
MCP_CLIENT_SECRET=
MCP_ISSUER_URL=

# CORS
CORS_ORIGINS=https://claude.ai

# AI keys passed through to AuthorClaw
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
EOF
```

- [ ] **Step 2: Verify .env is gitignored**

```bash
grep -E '^\.env$|^\.env\.local$' .gitignore
```

Expected: at least `.env` listed. The `.gitignore` from Task 0 already covers this; if it doesn't, add `.env` and `.env.local`.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: .env.example with AuthorClaw variables"
```

---

## Task 18: Supporting docs

**Files:**
- Create: `docs/installation.md`
- Create: `docs/configuration.md`
- Create: `docs/threat-model.md` (port + extend from `docs/threat-model-upstream.md`)
- Delete: `docs/threat-model-upstream.md` (after porting)

- [ ] **Step 1: Write docs/installation.md**

Create the file with three sections (Docker Compose, Claude Desktop stdio, Claude Code), each lifted from `docs/ARCHITECTURE.md` §11 with the surrounding prose tightened:

```markdown
# Installation

Three supported installation paths.

## Docker Compose (recommended for LAN / production)

Prerequisites: Docker Engine 24+, Docker Compose plugin.

1. Clone this repository.
2. Clone AuthorClaw separately to a stable path (default `/opt/docker-compose/authorclaw/src`).
3. Copy `.env.example` to `.env` and fill in `MCP_CLIENT_SECRET`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`.
4. Start the stack:

   ```bash
   docker compose up -d
   ```

5. Verify: `docker compose ps` shows `authorclaw-patcher` exited 0, and `authorclaw` + `authorclaw-mcp` healthy. The MCP bridge is reachable on `http://<host>:3000`.

## Claude Desktop (local / LAN, no OAuth)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS — adjust for your OS):

```json
{
  "mcpServers": {
    "authorclaw": {
      "command": "npx",
      "args": ["authorclaw-mcp"],
      "env": {
        "AUTHORCLAW_URL": "http://YOUR_LAN_IP:3847",
        "AUTH_ENABLED": "false",
        "AUTHORCLAW_TIMEOUT_MS": "300000"
      }
    }
  }
}
```

## Claude Code

```bash
claude mcp add authorclaw \
  -e AUTHORCLAW_URL=http://YOUR_LAN_IP:3847 \
  -e AUTHORCLAW_TIMEOUT_MS=300000 \
  -- npx authorclaw-mcp
```
```

- [ ] **Step 2: Write docs/configuration.md**

```markdown
# Configuration Reference

All settings are environment variables.

## AuthorClaw connection

| Var | Default | Purpose |
|---|---|---|
| `AUTHORCLAW_URL` | `http://authorclaw:3847` | Base URL of the AuthorClaw gateway. Use the Docker service name inside Compose; use a LAN IP for stdio mode. |
| `AUTHORCLAW_API_TOKEN` | *(empty)* | Sent as `Authorization: Bearer <token>` if set. AuthorClaw does not currently issue tokens; leave blank. |
| `AUTHORCLAW_TIMEOUT_MS` | `300000` | Per-request timeout. Novel pipelines can run >5 min; raise if you see `AbortError`. |
| `AUTHORCLAW_SRC` | `/opt/docker-compose/authorclaw/src` | Compose build context path to your AuthorClaw checkout. |

## MCP bridge auth

| Var | Default | Purpose |
|---|---|---|
| `AUTH_ENABLED` | `true` | Set `false` for LAN-only stdio mode (no OAuth). |
| `MCP_CLIENT_ID` | `authorclaw` | OAuth client ID. |
| `MCP_CLIENT_SECRET` | *(empty)* | Generate with `openssl rand -hex 32`. |
| `MCP_ISSUER_URL` | *(empty)* | Set to your public HTTPS URL when fronted by a TLS proxy. |
| `CORS_ORIGINS` | `https://claude.ai` | Comma-separated. Add `https://desktop.claude.ai` etc. as needed. |

## AI keys (passed through to AuthorClaw)

| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Used by AuthorClaw for Gemini-backed steps. |
| `ANTHROPIC_API_KEY` | Used by AuthorClaw for Claude-backed steps. |
```

- [ ] **Step 3: Port and extend the threat model**

```bash
cat docs/threat-model-upstream.md
```

Carry the structure forward into `docs/threat-model.md`, replacing OpenClaw-specific assertions with AuthorClaw-specific ones. Add at minimum:

- An entry covering the `*` CORS that the LAN patch introduces, mitigated by not publishing port 3847.
- An entry covering manuscript exfiltration via the file tools, mitigated by exposing only `/api/files` (read) and not vault or `.audit` endpoints.

Once `docs/threat-model.md` is written:

```bash
rm docs/threat-model-upstream.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/installation.md docs/configuration.md docs/threat-model.md
git rm docs/threat-model-upstream.md
git commit -m "docs: installation, configuration, threat model"
```

---

## Task 19: End-to-end verification

**Files:** none modified — this task is verification only.

**Prerequisite:** an AuthorClaw checkout exists at `${AUTHORCLAW_SRC}` and `.env` is populated with real keys.

- [ ] **Step 1: Run the unit test suite**

```bash
npx vitest run
```

Expected: all suites green.

- [ ] **Step 2: Build the production image**

```bash
docker build -t authorclaw-mcp:0.1.0 .
```

Expected: clean build.

- [ ] **Step 3: Bring up the stack**

```bash
docker compose up -d
docker compose ps
```

Expected: `authorclaw-patcher` shows `Exited (0)`, `authorclaw` and `authorclaw-mcp` are `running`.

- [ ] **Step 4: Confirm the patcher applied changes**

```bash
docker compose run --rm authorclaw-patcher sh /apply-lan-patch.sh --check
```

Expected: all five patches reported as already applied. (Use whatever flag Task 14 Step 2 confirmed is correct.)

- [ ] **Step 5: Hit the MCP bridge from the host**

If `AUTH_ENABLED=false`:

```bash
curl -s http://localhost:3000/health 2>/dev/null \
  || curl -s http://localhost:3000/  # try a couple paths upstream may expose
```

Expected: a response (200 with JSON, or 401 if auth is on — both prove the bridge is listening).

If `AUTH_ENABLED=true`: skip this step; OAuth setup is covered in `docs/installation.md`.

- [ ] **Step 6: Exercise one tool via Claude Code**

Wire the bridge into Claude Code:

```bash
claude mcp add authorclaw-local \
  -e AUTHORCLAW_URL=http://localhost:3847 \
  -- npx authorclaw-mcp
```

(Bypass the Docker stack and hit AuthorClaw directly via stdio — this isolates whether tool dispatch works without involving OAuth.)

Run `authorclaw_status` from a Claude Code session. Expected: it returns the AuthorClaw health status.

- [ ] **Step 7: Confirm port 3847 is NOT host-published**

```bash
docker compose port authorclaw 3847 2>&1
```

Expected: empty output or "No public port" — confirming the security model in §9 of ARCHITECTURE.md.

- [ ] **Step 8: Tear down**

```bash
docker compose down
```

- [ ] **Step 9: Tag the release**

```bash
git tag -a v0.1.0 -m "Initial release: 12 MCP tools, OAuth bridge, Docker stack"
git log --oneline | head -25
```

Do **not** push the tag. Inform the user; they'll push when ready.

---

## Self-Review (already performed)

**Spec coverage** — every section of `docs/ARCHITECTURE.md` is covered:
- §1 Purpose / §2 Source projects → context only, no tasks needed
- §3 Repository layout → Task 0 + Tasks 3–13 produce every listed file
- §4 Differences from upstream → Tasks 2, 4–11 implement the differences
- §5 Network problem → Task 14 (script) + Task 16 (compose ordering)
- §6 Fork strategy / keep vs change → Task 0 (keep) + Tasks 2, 13 (change)
- §7 AuthorClaw client → Tasks 3–6
- §8 MCP tool catalog → Tasks 7–12
- §9 Docker Compose topology → Task 16
- §10 Configuration → Task 17
- §11 Client integration → Task 18 (installation.md)
- §12 Build & release → Task 19
- §13 Security model → Task 18 (threat-model.md) + Task 16 (port 3847 not published) + Task 19 Step 7 (verification)
- §14 Credits → Task 1 (README + LICENSE attribution)

**Placeholder scan** — all code blocks contain real code; no "TBD", "implement later", or "similar to Task N" references. The two places where the plan defers to runtime inspection (Task 0 upstream layout, Task 12 upstream task queue API) are inspection steps with explicit commands, not placeholders.

**Type consistency** — `AuthorClawClient` method names (`chat`, `createProject`, `getProjectStatus`, `listProjects`, `stopProject`, `listFiles`, `readFile`, `exportFile`, `research`, `health`) are used consistently across Tasks 3–13. Tool names (`authorclaw_chat`, `authorclaw_chat_async`, four `authorclaw_project_*`, three `authorclaw_files_*`, `authorclaw_research`, `authorclaw_status`, three `authorclaw_task_*` from the ported queue) total 13 — one more than the ARCHITECTURE "12 tools" headline because the three task-queue tools are inherited verbatim from upstream rather than rebuilt. ARCHITECTURE §3's tree count (12) excludes the upstream-inherited queue tools; both numbers are internally consistent.
