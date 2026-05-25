# AuthorClaw MCP: Architecture

A production-ready MCP server for AuthorClaw that combines `pshort05/authorclaw-docker-fix` (network binding patch) with a fork of `freema/openclaw-mcp` (OAuth 2.1 + SSE bridge), re-targeted at the AuthorClaw REST API and enriched with author-specific tools.

## 1. Purpose

[AuthorClaw](https://github.com/Ckokoski/authorclaw) is a writing agent that runs as a local gateway. Two upstream gaps prevent remote use:

1. **Network binding.** The gateway hardcodes `127.0.0.1`, so a Docker container that publishes port 3847 accepts connections at the kernel level but silently drops them. Every browser or API caller sees `ERR_EMPTY_RESPONSE`. `pshort05/authorclaw-docker-fix` resolves this with an idempotent shell patch.
2. **No authentication.** Once the bind is opened to `0.0.0.0`, anyone on the network can drive the agent, read manuscripts, and burn AI quota.

`freema/openclaw-mcp` solves the second gap for the generic OpenClaw gateway (port `18789`, OpenAI-compatible `/v1/chat/completions`). AuthorClaw runs on a different port (`3847`), exposes a different REST surface (`/api/chat`, `/api/projects`, `/api/files`, …), and has writing-specific commands that deserve first-class MCP tools.

`pshort05/authorclaw-mcp` merges both efforts: the Docker-aware network fix plus the OAuth 2.1 + SSE bridge architecture, re-targeted at AuthorClaw's own API and enriched with author-specific tools.

## 2. Source Projects

| Project | Owner / License | Role in `authorclaw-mcp` |
|---|---|---|
| `Ckokoski/authorclaw` | upstream, MIT | The writing agent this bridge wraps |
| `pshort05/authorclaw-docker-fix` | this author, MIT | Source of the LAN binding patch |
| `freema/openclaw-mcp` | Tomáš Grasl, MIT | Source of the OAuth 2.1 + SSE bridge architecture |
| [MCP Specification](https://spec.modelcontextprotocol.io/) | Anthropic | Protocol contract |

All upstreams are MIT-licensed. `pshort05/authorclaw-mcp` is also MIT.

## 3. Repository Layout

```
pshort05/authorclaw-mcp/
├── src/
│   ├── index.ts                   # entry point: parses CLI args, starts stdio or SSE transport
│   ├── cli.ts                     # yargs-based CLI argument parser
│   ├── config.ts                  # env-driven config with AuthorClaw defaults
│   ├── auth/
│   │   └── provider.ts            # OAuth 2.1 provider (forked from freema/openclaw-mcp)
│   ├── client/
│   │   └── authorclaw.ts          # HTTP client for AuthorClaw REST API (:3847)
│   ├── config/
│   │   └── constants.ts           # compile-time constants (server icon, etc.)
│   ├── mcp/
│   │   └── tasks/
│   │       └── manager.ts         # async task queue manager
│   ├── server/
│   │   ├── sse.ts                 # SSE/Streamable HTTP server setup
│   │   └── tools-registration.ts  # shared tool registration (used by both transports)
│   ├── tools/
│   │   ├── audio.ts               # authorclaw_audio_* (v0.2)
│   │   ├── chat.ts                # authorclaw_chat, authorclaw_chat_async
│   │   ├── documents.ts           # authorclaw_documents_* (v0.2)
│   │   ├── files.ts               # authorclaw_files_list / _read / _export
│   │   ├── images.ts              # authorclaw_images_* (v0.2)
│   │   ├── personas.ts            # authorclaw_personas_* (v0.2)
│   │   ├── project-writing.ts     # authorclaw_project_continuity_check, style_clone, etc. (v0.2)
│   │   ├── projects.ts            # authorclaw_project_create / _status / _list / _stop / _execute / _run / etc.
│   │   ├── research.ts            # authorclaw_research
│   │   ├── research-advanced.ts   # authorclaw_research_lookup, _comp_authors, etc. (v0.2)
│   │   ├── series.ts              # authorclaw_series_* (v0.2)
│   │   └── status.ts              # authorclaw_status (heartbeat)
│   ├── types/
│   │   └── global.d.ts            # __PKG_VERSION__ declaration
│   └── utils/
│       ├── logger.ts              # structured logging helpers
│       ├── response-helpers.ts    # MCP response formatting utilities
│       └── validation.ts          # input validation helpers
├── authorclaw-docker-fix/
│   ├── apply-lan-patch.sh         # idempotent LAN patch script (canonical upstream copy)
│   ├── README.md                  # patch details and security caveats
│   └── INSTALL.md                 # quick-start for applying the patch
├── docs/
│   ├── ARCHITECTURE.md            # this document
│   ├── configuration.md
│   ├── development.md
│   ├── endpoint-coverage.md
│   ├── installation.md
│   └── threat-model.md
├── dist/
│   └── index.js                   # compiled bundle (tsup ESM; rebuilt by npm run build)
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

The v0.1 design in sections 7 and 8 below used a simpler directory layout. The actual layout above reflects the v0.2 state. The concepts are the same; the file paths have changed.

## 4. Key Differences from `freema/openclaw-mcp`

| Aspect | `freema/openclaw-mcp` | `pshort05/authorclaw-mcp` |
|---|---|---|
| Target port | 18789 (OpenClaw gateway) | 3847 (AuthorClaw gateway) |
| API protocol | OpenAI `/v1/chat/completions` | AuthorClaw REST (`/api/*`) |
| Tools | `openclaw_chat`, `openclaw_status` | 57 author-specific tools (v0.2; 12 in v0.1) |
| Docker bind fix | N/A | Bundles `apply-lan-patch.sh` |
| Multi-instance | Yes | Yes (e.g. prod / dev AuthorClaw) |

## 5. The Network Problem

The `apply-lan-patch.sh` script makes five idempotent edits to `gateway/src/index.ts`:

```text
server.listen(port, '127.0.0.1', …)
  → server.listen(port, process.env.AUTHORCLAW_BIND || '0.0.0.0', …)

Socket.IO cors.origin:       [hardcoded list] → '*'
Helmet CSP connectSrc:       [list]           → '*'   (+ upgradeInsecureRequests: null)
Express cors() origin:       [list]           → '*'
WebSocket origin allowlist:  [list]           → removed
```

These edits must be applied **before** the MCP bridge tries to connect. In the combined Docker Compose stack this is handled by an init container (see §9).

### Security trade-off

Opening CORS to `*` is acceptable on a trusted home LAN. For any exposure beyond that, CORS must be restricted. The MCP bridge supplies the authentication layer that AuthorClaw lacks, so the correct security model is:

```
AuthorClaw  (0.0.0.0:3847, no auth, LAN only)
   ▲
   │  internal Docker network only, never published to host
   │
authorclaw-mcp bridge  (host:3000, OAuth 2.1, exposed to LAN or internet)
   ▲
   │  Claude.ai / Claude Desktop connects here
```

Port `3847` is therefore **not** published to the host in the combined `docker-compose.yml`. Only the MCP bridge's port `3000` is exposed.

## 6. Fork Strategy

### Keep verbatim

- `src/auth/oauth.ts` - OAuth 2.1 with PKCE, client credentials, token introspection. Solid.
- `src/tools/tasks.ts` - Async task queue with `task_id` return, polling, cancellation. Author projects can run 30+ minutes; async is essential.
- `.github/workflows/` - CI and Docker image publishing to GHCR.
- `docker-compose.yml` hardening pattern - `restart: unless-stopped`, `read_only: true`, `no-new-privileges`, `host.docker.internal` extra host entry.
- `docs/threat-model.md` - extend it; do not replace it.

### Change

**Target URL and port.** `freema/openclaw-mcp` defaults to `http://host.docker.internal:18789`. AuthorClaw uses a service name and a different port:

```typescript
// src/config.ts
export const config = {
  authorclaw: {
    url: process.env.AUTHORCLAW_URL ?? 'http://authorclaw:3847',
    token: process.env.AUTHORCLAW_API_TOKEN ?? '',   // optional; see §8
    timeoutMs: Number(process.env.AUTHORCLAW_TIMEOUT_MS ?? 300_000),
  },
  // ... OAuth and MCP server config unchanged from freema
};
```

When run as a Docker Compose stack (recommended), the hostname is the service name `authorclaw`. When run standalone against a remote host, use the LAN IP or hostname.

**Replace the tools.** `freema/openclaw-mcp` calls `/v1/chat/completions`. AuthorClaw's REST API is entirely different, so every file under `src/tools/` is rewritten (see §8).

### Keep the pattern but rename

The `OPENCLAW_INSTANCES` JSON array routes to multiple OpenClaw gateways. Keep the same pattern but rename to `AUTHORCLAW_INSTANCES` and document it for authors running dev/staging AuthorClaw alongside production.

## 7. AuthorClaw API Client

AuthorClaw's REST endpoints (from `gateway/src/api/routes.ts`) are the foundation for every tool. The client lives in `src/client/authorclaw.ts`:

```typescript
import fetch from 'node-fetch';
import { config } from '../config.js';

export class AuthorClawClient {
  private base: string;
  private token: string;

  constructor(url = config.authorclaw.url, token = config.authorclaw.token) {
    this.base = url.replace(/\/$/, '');
    this.token = token;
  }

  private headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
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
    return res.json() as Promise<{ reply: string }>;
  }

  async createProject(task: string): Promise<{ id: string; steps: number }> {
    const res = await fetch(`${this.base}/api/projects`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ task }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw project error: ${res.status}`);
    return res.json() as Promise<{ id: string; steps: number }>;
  }

  async getProjectStatus(id: string): Promise<object> {
    const res = await fetch(`${this.base}/api/projects/${id}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Project status error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async listProjects(): Promise<object[]> {
    const res = await fetch(`${this.base}/api/projects`, { headers: this.headers() });
    if (!res.ok) throw new Error(`List projects error: ${res.status}`);
    return res.json() as Promise<object[]>;
  }

  async stopProject(id: string): Promise<void> {
    await fetch(`${this.base}/api/projects/${id}/stop`, {
      method: 'POST',
      headers: this.headers(),
    });
  }

  async listFiles(folder?: string): Promise<object[]> {
    const url = folder
      ? `${this.base}/api/files?folder=${encodeURIComponent(folder)}`
      : `${this.base}/api/files`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`List files error: ${res.status}`);
    return res.json() as Promise<object[]>;
  }

  async readFile(nameOrIndex: string): Promise<{ content: string }> {
    const res = await fetch(
      `${this.base}/api/files/${encodeURIComponent(nameOrIndex)}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`Read file error: ${res.status}`);
    return res.json() as Promise<{ content: string }>;
  }

  async exportFile(name: string, format: 'docx' | 'html' | 'txt'): Promise<{ url: string }> {
    const res = await fetch(`${this.base}/api/export`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ name, format }),
    });
    if (!res.ok) throw new Error(`Export error: ${res.status}`);
    return res.json() as Promise<{ url: string }>;
  }

  async research(topic: string): Promise<{ summary: string }> {
    const res = await fetch(`${this.base}/api/research`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ topic }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`Research error: ${res.status}`);
    return res.json() as Promise<{ summary: string }>;
  }

  async health(): Promise<{ status: string }> {
    const res = await fetch(`${this.base}/api/health`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Health check error: ${res.status}`);
    return res.json() as Promise<{ status: string }>;
  }
}
```

## 8. MCP Tool Catalog

Tools are registered in `src/server.ts` against the `@modelcontextprotocol/sdk` `Server` class.

### Writing & chat : `src/tools/chat.ts`

**`authorclaw_chat`** : Send a message and wait for the reply (synchronous; short tasks).

```typescript
{
  name: 'authorclaw_chat',
  description: 'Send a message to AuthorClaw and get a response. Use for short writing tasks, questions, or quick edits.',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'The message or writing request' },
    },
    required: ['message'],
  },
}
```

**`authorclaw_chat_async`** : Queue a long-running writing task. Returns a `task_id` immediately.

```typescript
{
  name: 'authorclaw_chat_async',
  description: 'Queue a writing task that may take several minutes. Returns a task_id to poll with authorclaw_task_status.',
  inputSchema: {
    type: 'object',
    properties: { message: { type: 'string' } },
    required: ['message'],
  },
}
```

### Projects : `src/tools/projects.ts`

**`authorclaw_project_create`** : Create and auto-execute an AuthorClaw project pipeline.

```typescript
{
  name: 'authorclaw_project_create',
  description: 'Create a writing project (e.g. full novel, revision pass, book launch). AuthorClaw plans the steps autonomously and begins executing immediately.',
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
}
```

- **`authorclaw_project_status`** : Step-by-step progress for a running project.
- **`authorclaw_project_list`** : List projects with optional status filter (`running`, `complete`, `paused`).
- **`authorclaw_project_stop`** : Pause a running project cleanly (equivalent to `/stop`).

### Files : `src/tools/files.ts`

- **`authorclaw_files_list`** : List output files by workspace folder (`projects`, `exports`, `research`).
- **`authorclaw_files_read`** : Read the content of a named output file.
- **`authorclaw_files_export`** : Export a file to `docx`, `html`, or `txt` and return the download URL.

### Research : `src/tools/research.ts`

- **`authorclaw_research`** : Trigger a deep research task on a topic (uses AuthorClaw's allowlisted web search).

### Status : `src/tools/status.ts`

- **`authorclaw_status`** : Health check confirming the AuthorClaw gateway is reachable and responsive.

### Async task queue : `src/tools/tasks.ts` (ported from `freema/openclaw-mcp`)

- **`authorclaw_task_status`** : Poll a task by `task_id`.
- **`authorclaw_task_list`** : List recent tasks with optional status filter.
- **`authorclaw_task_cancel`** : Cancel a pending task.

## 9. Deployment Topology : Docker Compose Stack

The combined `docker-compose.yml` wires AuthorClaw, the LAN patch, and the MCP bridge into a single deployable unit.

```yaml
# docker/docker-compose.yml
services:

  # Step 1: Apply the LAN patch to AuthorClaw source before the container builds.
  authorclaw-patcher:
    image: alpine:3.19
    volumes:
      - authorclaw-src:/src
      - ./authorclaw-docker-fix/apply-lan-patch.sh:/apply-lan-patch.sh:ro
    environment:
      - REPO=/src
    command: sh /apply-lan-patch.sh
    # Runs once and exits; authorclaw waits for it via depends_on.

  # Step 2: AuthorClaw gateway (patched).
  authorclaw:
    build:
      context: /opt/docker-compose/authorclaw/src   # path to Ckokoski/authorclaw clone
      dockerfile: docker/Dockerfile
    container_name: authorclaw
    restart: unless-stopped
    depends_on:
      authorclaw-patcher:
        condition: service_completed_successfully
    environment:
      - AUTHORCLAW_BIND=0.0.0.0          # from the docker-fix patch
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - authorclaw-workspace:/app/workspace
    # NOTE: port 3847 is NOT published to the host.
    # Only the mcp-bridge can reach it, via the internal Docker network.
    networks:
      - authorclaw-internal

  # Step 3: MCP bridge (this repo).
  authorclaw-mcp:
    image: ghcr.io/pshort05/authorclaw-mcp:latest
    container_name: authorclaw-mcp
    restart: unless-stopped
    depends_on:
      - authorclaw
    ports:
      - "3000:3000"                        # Only port exposed to the LAN
    environment:
      - AUTHORCLAW_URL=http://authorclaw:3847
      - AUTH_ENABLED=true
      - MCP_CLIENT_ID=authorclaw
      - MCP_CLIENT_SECRET=${MCP_CLIENT_SECRET}
      - MCP_ISSUER_URL=${MCP_ISSUER_URL:-}
      - CORS_ORIGINS=https://claude.ai
    read_only: true
    security_opt:
      - no-new-privileges
    networks:
      - authorclaw-internal

volumes:
  authorclaw-src:
  authorclaw-workspace:

networks:
  authorclaw-internal:
    driver: bridge
```

### Design decisions

1. **Port 3847 is never published to the host.** AuthorClaw is reachable only via the internal Docker network, so the `*` CORS and `0.0.0.0` bind from the patch are contained inside Docker.
2. **Port 3000 is the only LAN-visible surface,** and it is protected by OAuth 2.1.
3. **The patcher is an Alpine init container** that runs `apply-lan-patch.sh` against the mounted source volume before AuthorClaw starts, preserving the idempotency guarantee of the original script.

## 10. Configuration Reference

Create `.env` from `.env.example`:

```bash
# AuthorClaw connection
AUTHORCLAW_URL=http://authorclaw:3847        # internal Docker service name
AUTHORCLAW_API_TOKEN=                        # leave blank (AuthorClaw has no token auth yet)
AUTHORCLAW_TIMEOUT_MS=300000                 # 5 min ; novel pipelines are slow

# MCP bridge auth
AUTH_ENABLED=true
MCP_CLIENT_ID=authorclaw
MCP_CLIENT_SECRET=                           # generate: openssl rand -hex 32
MCP_ISSUER_URL=                              # set to your public HTTPS URL if behind a proxy

# CORS
CORS_ORIGINS=https://claude.ai               # add Claude Desktop origin if needed

# AI keys passed through to AuthorClaw
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

## 11. Client Integration

### Claude.ai (remote)

1. Ensure `authorclaw-mcp` is reachable from the internet (Tailscale, Cloudflare Tunnel, or open port with TLS).
2. Set `MCP_ISSUER_URL=https://your-public-domain.com` in `.env`.
3. In Claude.ai → Settings → Integrations → Add MCP Server:
   - **URL:** `https://your-public-domain.com`
   - **Client ID:** `authorclaw`
   - **Client Secret:** the value of `MCP_CLIENT_SECRET`

### Claude Desktop (local / LAN)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS; adjust path for Windows/Linux):

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

For LAN use without OAuth (home network only), `AUTH_ENABLED=false` is acceptable.

### Claude Code

```bash
claude mcp add authorclaw \
  -e AUTHORCLAW_URL=http://YOUR_LAN_IP:3847 \
  -e AUTHORCLAW_TIMEOUT_MS=300000 \
  -- npx authorclaw-mcp
```

## 12. Build & Release

```bash
# 1. Fork freema/openclaw-mcp into pshort05/authorclaw-mcp on GitHub.

# 2. Clone the fork.
git clone https://github.com/pshort05/authorclaw-mcp.git
cd authorclaw-mcp

# 3. The LAN patch script is bundled in authorclaw-docker-fix/ (no copy needed).
#    The docker-compose.yml and the patcher container reference it there directly.

# 4. Install dependencies (freema's package.json is the starting point).
npm install

# 5. Replace src/tools/ with the AuthorClaw-specific tools (§7 and §8).
#    Update src/config.ts with new defaults (§6).
#    Update docker-compose.yml (§9).

# 6. Build.
npm run build

# 7. Test locally against a running AuthorClaw instance.
AUTHORCLAW_URL=http://localhost:3847 AUTH_ENABLED=false npx authorclaw-mcp

# 8. Build and push the Docker image.
docker build -t ghcr.io/pshort05/authorclaw-mcp:latest .
docker push ghcr.io/pshort05/authorclaw-mcp:latest
```

## 13. Security Model

| Threat | Mitigation |
|---|---|
| Unauthenticated access to AuthorClaw | Port 3847 never published to host; reachable only inside Docker network |
| Unauthenticated access to MCP bridge | OAuth 2.1 with PKCE on port 3000 |
| API key exposure | AuthorClaw vault (AES-256-GCM); keys never traverse the MCP bridge |
| Prompt injection via MCP tool input | Input validation in `authorclaw.ts`; inherited from freema's patterns |
| Overly broad CORS in AuthorClaw | Contained within Docker; the MCP bridge's CORS is the effective boundary |
| Manuscript exfiltration | MCP bridge exposes only `/api/files` read paths : no vault or `.audit` access |

For home LAN use, the stack as described is appropriate. For VPS or internet exposure, add a TLS-terminating reverse proxy (Caddy is the simplest option) in front of port 3000.

## 14. Credits

- **AuthorClaw**: [Ckokoski/authorclaw](https://github.com/Ckokoski/authorclaw) (MIT) - the writing agent this bridge connects to.
- **authorclaw-docker-fix**: [pshort05/authorclaw-docker-fix](https://github.com/pshort05/authorclaw-docker-fix) (MIT) - the LAN binding patch.
- **openclaw-mcp**: [freema/openclaw-mcp](https://github.com/freema/openclaw-mcp) by Tomáš Grasl (MIT) - OAuth bridge architecture.
- **MCP Specification**: Anthropic, <https://spec.modelcontextprotocol.io/>

All forked components are MIT-licensed. `pshort05/authorclaw-mcp` is also MIT.
