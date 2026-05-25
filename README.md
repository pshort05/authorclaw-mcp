# authorclaw-mcp

An MCP (Model Context Protocol) server that lets Claude drive [AuthorClaw](https://github.com/Ckokoski/authorclaw), an AI writing agent for novelists, from any MCP client: Claude Desktop, Claude.ai, or Claude Code.

The bridge exposes 57 tools across twelve surfaces: chat, projects, plot promises, files and documents, personas, research, audio narration, cover images, series, and async task tracking. It speaks both stdio (for local clients) and SSE (for remote clients), with OAuth 2.1 protecting the SSE endpoint.

## Status

| Item | Value |
| --- | --- |
| Current release | `v0.2.5` |
| License | MIT |
| Node.js | 20 or newer |
| AuthorClaw | tested against v4.0.0 |
| Test count | 322 unit tests |
| MCP protocol | 2024-11-05 |

## Why this exists

AuthorClaw is a sophisticated multi-step writing agent: pipeline orchestration, plot-promise tracking, beta-reader simulation, audio narration, cover generation, and dozens of other capabilities. Its built-in interface is a browser dashboard. Putting Claude in front of it via MCP lets you direct the agent in natural language, hand off long-running work, and pull artifacts back into your conversation, without leaving Claude.

## Quick start

Three supported paths. The full guide with prerequisites and troubleshooting is in [`docs/installation.md`](docs/installation.md).

### Docker Compose (recommended for LAN or production)

```bash
git clone https://github.com/pshort05/authorclaw-mcp.git
cd authorclaw-mcp
cp .env.example .env
# Fill in MCP_CLIENT_SECRET, GEMINI_API_KEY, ANTHROPIC_API_KEY
docker compose run --rm authorclaw-patcher    # one-shot LAN patch
docker compose up -d                           # bring up the stack
```

The stack starts three containers: a patcher init container that applies the LAN patch to your AuthorClaw checkout, AuthorClaw itself (port 3847, internal-only), and the MCP bridge (port 3000, OAuth-protected).

### Claude Desktop (stdio, local)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, or the equivalent path on Windows or Linux:

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

### Claude Code

```bash
claude mcp add authorclaw \
  -e AUTHORCLAW_URL=http://YOUR_LAN_IP:3847 \
  -e AUTHORCLAW_TIMEOUT_MS=300000 \
  -- npx authorclaw-mcp
```

## Architecture

```
+----------------------------+
|  Claude (Desktop / Web /   |
|  Code)                     |
+--------------+-------------+
               |
               |  MCP over stdio  OR  MCP over SSE + OAuth 2.1
               v
+----------------------------+
|  authorclaw-mcp            |
|  - 57 tools                |
|  - AuthorClawClient        |
|  - In-memory taskManager   |
|  - OAuth 2.1 provider      |
+--------------+-------------+
               |
               |  HTTP REST (AuthorClaw v4.0.0 API)
               v
+----------------------------+
|  AuthorClaw gateway        |
|  - port 3847               |
|  - 231 /api/* endpoints    |
|  - Vault, workspace,       |
|    pipeline state          |
+----------------------------+
```

In the Docker Compose deployment, AuthorClaw's port 3847 is never published to the host. Only the MCP bridge's port 3000 is reachable from the LAN, and it requires an OAuth 2.1 token. The full design rationale is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tools

57 MCP tools across twelve surfaces. The full catalog (including the 174 AuthorClaw endpoints intentionally not wrapped and the rationale for each) lives in [`docs/endpoint-coverage.md`](docs/endpoint-coverage.md).

| Surface | Count | Tool names (prefix `authorclaw_`) |
| --- | ---: | --- |
| Chat | 2 | `chat`, `chat_async` |
| Status | 1 | `status` |
| Projects (lifecycle) | 9 | `project_create`, `_status`, `_list`, `_stop`, `_execute`, `_run`, `_resume`, `_restart`, `_compile` |
| Projects (editorial) | 10 | `_continuity_check`, `_continuity_report`, `_structure_check`, `_style_clone`, `_pacing_heatmap`, `_format_pro`, `_craft_critique`, `_dialogue_audit`, `_beta_reader`, `_cover_set` |
| Plot promises | 4 | `plot_promises_list`, `_add`, `_extract`, `_audit` |
| Files | 3 | `files_list`, `files_read`, `files_export` |
| Documents | 2 | `documents_upload`, `documents_delete` |
| Personas | 6 | `personas_list`, `_create`, `_generate`, `_get`, `_update`, `_delete` |
| Research | 7 | `research`, `research_lookup`, `_comp_authors`, `_agents`, `_newsletters`, `_podcasts`, `_reviewers` |
| Audio | 3 | `audio_voices`, `audio_generate`, `audio_get` |
| Images | 3 | `images_generate`, `images_book_cover`, `images_cover_set` |
| Series | 4 | `series_list`, `series_create`, `series_delete`, `series_report` |
| Task queue | 3 | `task_status`, `task_list`, `task_cancel` |

Long-running tasks (full novel pipelines, beta-reader passes) use the async pattern: call `_chat_async` or a project pipeline trigger to get a `task_id` back immediately, then poll with `task_status` or list active work with `task_list`.

## Configuration

Every setting is an environment variable. Defaults are listed below; the full reference is in [`docs/configuration.md`](docs/configuration.md).

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTHORCLAW_URL` | `http://authorclaw:3847` | Where the bridge finds AuthorClaw |
| `AUTHORCLAW_API_TOKEN` | empty | Bearer token (AuthorClaw does not issue tokens yet) |
| `AUTHORCLAW_TIMEOUT_MS` | `300000` | Per-request timeout (raise for long pipelines) |
| `AUTH_ENABLED` | `true` | Enable OAuth 2.1 on the SSE endpoint |
| `MCP_CLIENT_ID` | `authorclaw` | OAuth client ID |
| `MCP_CLIENT_SECRET` | empty | OAuth client secret (generate with `openssl rand -hex 32`) |
| `CORS_ORIGINS` | `https://claude.ai` | Comma-separated allowed origins |
| `GEMINI_API_KEY` | empty | Passed through to AuthorClaw for Gemini-backed steps |
| `ANTHROPIC_API_KEY` | empty | Passed through to AuthorClaw for Claude-backed steps |

Copy [`.env.example`](.env.example) to `.env` and fill the required values before starting the stack.

## Optional: AuthorClaw LAN patch

If AuthorClaw runs anywhere other than `127.0.0.1` from the host that runs this bridge (a Docker container, a different LAN machine, a VM), apply the patch bundled in [`authorclaw-docker-fix/`](authorclaw-docker-fix/README.md). AuthorClaw's upstream source binds only to loopback, so Docker port-publishing and LAN access silently fail (`ERR_EMPTY_RESPONSE` on every request).

The `apply-lan-patch.sh` script rewrites five spots in `gateway/src/index.ts` so the gateway binds `0.0.0.0` and accepts non-loopback origins. The patch is idempotent: rerun it after every AuthorClaw `git pull`. The Docker Compose stack handles this automatically via the `authorclaw-patcher` init container. See [`authorclaw-docker-fix/INSTALL.md`](authorclaw-docker-fix/INSTALL.md) for the standalone quick-start.

You do not need the patch when AuthorClaw and `authorclaw-mcp` run on the same machine and talk over `127.0.0.1`.

## Documentation

| File | Purpose |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Design decisions: fork strategy, fork boundaries, Docker topology, security model |
| [`docs/installation.md`](docs/installation.md) | Setup for Docker Compose, Claude Desktop, and Claude Code with troubleshooting |
| [`docs/configuration.md`](docs/configuration.md) | Every environment variable, its default, and when to change it |
| [`docs/threat-model.md`](docs/threat-model.md) | Assets, trust boundaries, threats, mitigations, residual risk |
| [`docs/endpoint-coverage.md`](docs/endpoint-coverage.md) | All 231 AuthorClaw endpoints and their disposition (wrapped, skipped, security-skipped) |
| [`docs/development.md`](docs/development.md) | Build, test, contribute, release |
| [`CHANGELOG.md`](CHANGELOG.md) | Release-by-release summary of changes |
| [`SECURITY.md`](SECURITY.md) | How to report a vulnerability |
| [`authorclaw-docker-fix/README.md`](authorclaw-docker-fix/README.md) | The LAN patch: problem, mechanics, security caveats |

## Compatibility

| Component | Tested version | Notes |
| --- | --- | --- |
| AuthorClaw | v4.0.0 | The wrapped endpoints match this version's routes. Earlier versions have a smaller API surface. |
| Node.js | 20.x, 22.x | The Docker image uses Node 22. Local install requires `>=20`. |
| Claude Desktop | current | Tested via stdio transport |
| Claude Code | current | Tested via stdio transport |
| Claude.ai | current | Tested via SSE transport with OAuth 2.1 |
| Docker Engine | 24 or newer | Compose v2 required (the v1 `docker-compose` binary is not supported) |

When AuthorClaw upgrades, route paths may drift. Run the live smoke test in [`docs/development.md`](docs/development.md) against the new version before assuming the wrapper still works.

## Security

The deployment topology described in [`docs/threat-model.md`](docs/threat-model.md) keeps AuthorClaw's port 3847 internal to the Docker network and exposes only the OAuth-protected bridge on port 3000. The LAN patch is required to make this work and opens AuthorClaw's CORS to `*` inside the Docker network; that exposure is contained as long as 3847 is not host-published.

For deployments beyond a single-user home LAN, front the MCP bridge with a TLS-terminating reverse proxy and treat the bridge's OAuth 2.1 layer as the only authentication boundary.

Vulnerability reports go through GitHub's private security advisory channel: [github.com/pshort05/authorclaw-mcp/security/advisories/new](https://github.com/pshort05/authorclaw-mcp/security/advisories/new). See [`SECURITY.md`](SECURITY.md) for the policy.

## Development

```bash
git clone https://github.com/pshort05/authorclaw-mcp.git
cd authorclaw-mcp
npm install
npx vitest run          # 322 unit tests
npm run build           # tsup, outputs dist/index.js
```

For the live smoke test against a running AuthorClaw, run-loop ergonomics, and the release process, see [`docs/development.md`](docs/development.md).

The repo uses TypeScript with strict types, Vitest for tests, tsup for bundling, and ESLint plus Prettier for style. Tests cover the HTTP client, every tool dispatcher, config loading, OAuth providers, SSE transport, and validation helpers.

## License

MIT. See [`LICENSE`](LICENSE).

## Credits

This project builds on three pieces of prior work:

- [AuthorClaw](https://github.com/Ckokoski/authorclaw) by Ckokoski (MIT). The writing agent this bridge wraps.
- [openclaw-mcp](https://github.com/freema/openclaw-mcp) by Tomas Grasl (MIT). The OAuth 2.1 plus SSE server scaffolding was forked from this project, then retargeted at AuthorClaw's REST API.
- [authorclaw-docker-fix](https://github.com/pshort05/authorclaw-docker-fix) by Paul Short (MIT). The LAN-binding patch, integrated into this repo as the optional `authorclaw-docker-fix/` component.

The MCP specification itself is by Anthropic: [spec.modelcontextprotocol.io](https://spec.modelcontextprotocol.io/).
