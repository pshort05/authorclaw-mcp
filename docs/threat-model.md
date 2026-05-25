# Threat Model

## Architecture Overview

```
Claude (Desktop / Claude.ai)
    |
    | MCP Protocol (stdio or SSE/Streamable HTTP)
    v
AuthorClaw MCP Bridge (this project, port 3000)
    |
    | AuthorClaw REST API (/api/*)
    v
AuthorClaw Gateway (port 3847, internal Docker network only)
```

The MCP bridge is a **stateless proxy** — it translates MCP tool calls into AuthorClaw REST requests and returns the response. It does not execute code, access the filesystem directly, or modify any external state on its own.

## Assets

| Asset | Description | Owner |
|---|---|---|
| Manuscripts | Writing project files in `authorclaw-workspace` volume | Author |
| AI quota | Gemini and Anthropic API keys passed to AuthorClaw | Author |
| AuthorClaw vault | AES-256-GCM encrypted store of API keys inside AuthorClaw | AuthorClaw |
| MCP OAuth credentials | `MCP_CLIENT_SECRET` in `.env` | Operator |
| Session tokens | Short-lived OAuth tokens issued by the bridge | MCP bridge |

## Trust Boundaries

| Boundary | Transport | Authentication |
|---|---|---|
| Claude <-> MCP bridge | stdio (local) or SSE/HTTP (remote) | None for stdio; OAuth 2.1 for SSE/HTTP |
| MCP bridge <-> AuthorClaw gateway | HTTP inside Docker internal network | Optional Bearer token (`AUTHORCLAW_API_TOKEN`) |
| AuthorClaw gateway <-> AI providers | HTTPS (outbound) | API keys from vault |
| Host LAN <-> Docker | Port 3000 (MCP bridge only) | OAuth 2.1 |

Port 3847 (AuthorClaw gateway) is never published to the host. All traffic to it passes through the internal `authorclaw-internal` Docker network.

## What Claude Can Do (via MCP tools)

| Tool | Action | Side Effects |
|---|---|---|
| `authorclaw_chat` | Send a message to AuthorClaw, receive a text reply | None — synchronous query |
| `authorclaw_chat_async` | Queue a writing task, receive a `task_id` | Creates an in-memory task |
| `authorclaw_project_create` | Initiate an AuthorClaw writing pipeline | Writes output files to workspace volume |
| `authorclaw_project_status` | Check pipeline progress for a project ID | None — read-only |
| `authorclaw_project_list` | List all projects | None — read-only |
| `authorclaw_project_stop` | Pause a running pipeline | Stops in-progress AI generation |
| `authorclaw_files_list` | List output files in a workspace folder | None — read-only |
| `authorclaw_files_read` | Read the content of a named output file | None — read-only |
| `authorclaw_files_export` | Export a file to docx/html/txt | Writes an export file to workspace volume |
| `authorclaw_research` | Trigger a deep-research task | Consumes AI quota; writes a research file |
| `authorclaw_status` | Health check on the gateway | None |
| `authorclaw_task_status` | Poll an async task by `task_id` | None — read-only |
| `authorclaw_task_list` | List recent async tasks | None — read-only |
| `authorclaw_task_cancel` | Cancel a pending async task | Removes an in-memory task |

## What Claude Cannot Do

- **Execute shell commands** — the bridge has no shell execution capability
- **Read the AuthorClaw vault** — vault contents (encrypted API keys) are never returned by `/api/files` endpoints; the bridge exposes only manuscript and export paths
- **Read `.audit` files** — session audit logs are excluded from the files API surface
- **Access arbitrary network hosts** — the bridge's only outbound destination is `AUTHORCLAW_URL`
- **Modify server configuration** — environment variables are set at startup, not changeable via tool input
- **Bypass authentication** — OAuth tokens are validated per-request when `AUTH_ENABLED=true`
- **Access other users' sessions** — sessions are isolated by MCP session ID

## Threats and Mitigations

| Threat | Mitigation |
|---|---|
| Unauthenticated access to AuthorClaw | Port 3847 never published to host; reachable only inside `authorclaw-internal` Docker network |
| Unauthenticated access to MCP bridge | OAuth 2.1 with PKCE and client credentials on port 3000 |
| API key exposure through bridge | AuthorClaw vault (AES-256-GCM); keys never traverse the MCP bridge or appear in tool responses |
| Prompt injection via MCP tool input | String length limits, type checks, and control character rejection in `authorclaw.ts` (inherited from `freema/openclaw-mcp` validation patterns) |
| Overly broad CORS in AuthorClaw (`*`) | `apply-lan-patch.sh` opens CORS to `*` and binds to `0.0.0.0`, but port 3847 is not published to the host. AuthorClaw is reachable only from inside the Docker internal network. The MCP bridge's `CORS_ORIGINS` (default `https://claude.ai`) is the effective boundary. See §5 of ARCHITECTURE.md. |
| Manuscript exfiltration via file tools | The MCP bridge exposes only `/api/files` read paths through `authorclaw_files_*` tools — vault contents and `.audit` session traces are excluded. The threat surface is reads of manuscript content by whoever holds a valid OAuth token. |
| Man-in-the-middle / replay on SSE transport | OAuth 2.1; HTTPS via reverse proxy required for internet-facing deployments; CORS restricted to configured origins |
| Server-Side Request Forgery (SSRF) | Only one outbound destination: `AUTHORCLAW_URL`, set at startup via environment variable, not controllable via tool input |
| Response-based memory exhaustion | Response size limit (10 MB) and per-request timeout (`AUTHORCLAW_TIMEOUT_MS`, default 5 min) |
| Container privilege escalation | `read_only: true` and `no-new-privileges` on the MCP bridge container |
| AI quota abuse | AuthorClaw research and project tools consume Gemini/Anthropic quota. OAuth authentication gates access; monitor provider dashboards for unexpected usage. |

## Attack Surface Detail

### 1. Malicious MCP Tool Input

**Risk:** Crafted tool arguments could exploit the AuthorClaw gateway.

**Mitigations:**
- All tool inputs are validated: type checks, string length limits, control character rejection.
- The MCP bridge does not interpret message content — it passes validated strings to the gateway.
- The AuthorClaw API is not an arbitrary code execution surface; endpoints accept structured task descriptions.

### 2. Compromised AuthorClaw Gateway

**Risk:** A compromised gateway could return malicious responses, leak vault contents, or escalate to the host.

**Mitigations:**
- Response size limit (10 MB) prevents memory exhaustion.
- Responses are parsed as JSON — no script execution.
- Error messages from the gateway are sanitized before being returned to Claude.
- The gateway container runs in the isolated `authorclaw-internal` Docker network.

### 3. Network-Level Attacks (SSE transport)

**Risk:** Man-in-the-middle, replay attacks, unauthorized access over LAN or internet.

**Mitigations:**
- OAuth 2.1 with client credentials (required when `AUTH_ENABLED=true`).
- HTTPS via reverse proxy (Caddy recommended) for any internet-facing deployment.
- CORS restricted to `CORS_ORIGINS` (default: `https://claude.ai`).
- DNS rebinding protection via MCP SDK's Express middleware.

### 4. Server-Side Request Forgery (SSRF)

**Risk:** Attacker could trick the bridge into making requests to internal services.

**Mitigations:**
- Only one outbound destination: `AUTHORCLAW_URL`.
- URL is fixed at startup via environment variable, not controllable via tool input.

### 5. `*` CORS Contained by Docker

**Risk:** `apply-lan-patch.sh` sets AuthorClaw's CORS to `*` and its bind address to `0.0.0.0`. If port 3847 were published to the host, any browser on the LAN could reach the gateway directly without authentication.

**Mitigation:** The `docker-compose.yml` deliberately omits a `ports:` entry for the `authorclaw` service. Port 3847 is never published to the host; AuthorClaw is accessible only from within the `authorclaw-internal` Docker network. The MCP bridge is the only service that can reach it. The bridge's `CORS_ORIGINS` setting (not AuthorClaw's `*`) is the effective CORS boundary for browser clients.

**Residual risk:** An operator who manually publishes port 3847 to the host removes this containment. The `docker-compose.yml` must not be edited to add `"3847:3847"` to the `authorclaw` service.

### 6. Manuscript Exfiltration via File Tools

**Risk:** The `authorclaw_files_read` tool exposes manuscript content to any caller with a valid OAuth token.

**Mitigation:** The bridge exposes only the `/api/files` read paths — manuscript and export files that the author has created. AuthorClaw vault contents (AES-256-GCM encrypted API keys) and `.audit` files (session traces) are not returned by these endpoints and are not accessible through any MCP tool. Access requires a valid OAuth token gated by `MCP_CLIENT_SECRET`.

**Residual risk:** Any party who obtains a valid OAuth token can read manuscript content. OAuth credentials must be protected; `MCP_CLIENT_SECRET` should be generated with `openssl rand -hex 32` and stored only in `.env`.

## Production Recommendations

For any deployment beyond a single-user home LAN:

1. **Enable OAuth 2.1** — set `AUTH_ENABLED=true` with a strong `MCP_CLIENT_SECRET`.
2. **Use HTTPS** — terminate TLS at a reverse proxy (Caddy is the simplest option) in front of port 3000.
3. **Restrict CORS** — leave `CORS_ORIGINS=https://claude.ai` (or your specific origin); do not widen to `*`.
4. **Run in Docker Compose** — use the provided `docker-compose.yml`; do not publish port 3847 to the host.
5. **Review what AuthorClaw can do** — project and research tools consume AI quota and write files to the workspace volume. Consider who holds OAuth tokens carefully.
6. **Monitor AI provider dashboards** — unexpected quota consumption may indicate unauthorized tool use.
