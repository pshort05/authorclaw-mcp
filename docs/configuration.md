# Configuration Reference

Settings come from three sources, applied in this order (later sources override earlier ones):

1. **Environment variables** in the shell or container environment.
2. **`.env` file** in the working directory, loaded at startup (Docker Compose and direct invocation both pick this up via `dotenv`).
3. **CLI flags** passed directly to the `authorclaw-mcp` binary (useful in stdio mode where there is no `.env` file in scope).

Copy `.env.example` to `.env` to get started.

---

## AuthorClaw connection

| Var | Default | Purpose |
|---|---|---|
| `AUTHORCLAW_URL` | `http://authorclaw:3847` | Base URL of the AuthorClaw gateway. Use the Docker service name inside Compose; use a LAN IP for stdio mode. |
| `AUTHORCLAW_API_TOKEN` | *(empty)* | Sent as `Authorization: Bearer <token>` if set. AuthorClaw does not currently issue tokens; leave blank. |
| `AUTHORCLAW_TIMEOUT_MS` | `300000` | Per-request timeout in milliseconds. Novel pipelines can run several minutes; raise if you see `AbortError`. |
| `AUTHORCLAW_SRC` | `/opt/docker-compose/authorclaw/src` | Compose build context path to your AuthorClaw checkout. Used by the `authorclaw` service and the `authorclaw-patcher` init container. |

## MCP bridge auth

| Var | Default | Purpose |
|---|---|---|
| `AUTH_ENABLED` | `true` | Set `false` for LAN-only stdio mode (no OAuth). |
| `MCP_CLIENT_ID` | `authorclaw` | OAuth client ID. |
| `MCP_CLIENT_SECRET` | *(empty)* | Generate with `openssl rand -hex 32`. Required when `AUTH_ENABLED=true`. |
| `MCP_ISSUER_URL` | *(empty)* | Set to your public HTTPS URL when the bridge is behind a TLS proxy. |
| `MCP_REDIRECT_URIS` | *(empty)* | Allowed OAuth redirect URIs, comma-separated. If unset, any redirect URI is accepted. |
| `CORS_ORIGINS` | `https://claude.ai` | Comma-separated. Add `https://desktop.claude.ai` and similar as needed. |

## Server settings

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port for the SSE server. |
| `HOST` | `0.0.0.0` | Bind address for the SSE server. |
| `DEBUG` | `false` | Enable debug logging. Logs request and response bodies with credentials redacted. Also enabled when `NODE_ENV=development`. |
| `TRUST_PROXY` | *(empty)* | Express trust-proxy setting. Required behind a reverse proxy. Typical values: `1` (one hop), `true` (all proxies on a private network), a CIDR like `10.0.0.0/8`. Without this, the OAuth `/token` endpoint crashes with `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`. |

## AI keys (passed through to AuthorClaw)

| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Used by AuthorClaw for Gemini-backed steps. |
| `ANTHROPIC_API_KEY` | Used by AuthorClaw for Claude-backed steps. |

---

## Annotated `.env` walkthrough

### Home-LAN setup (stdio, no OAuth)

```bash
# Point the bridge at your local AuthorClaw instance
AUTHORCLAW_URL=http://192.168.1.100:3847
AUTHORCLAW_TIMEOUT_MS=300000

# OAuth is off; Claude Desktop connects directly without a token
AUTH_ENABLED=false

# AI keys are only needed if AuthorClaw is running in the same Docker stack.
# For a standalone AuthorClaw install, set them there instead.
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

### Docker Compose stack (SSE, OAuth on)

```bash
# Internal Docker service name; the bridge and gateway share a Docker network
AUTHORCLAW_URL=http://authorclaw:3847
AUTHORCLAW_SRC=/opt/docker-compose/authorclaw/src
AUTHORCLAW_TIMEOUT_MS=300000

# OAuth required; generate a strong secret
AUTH_ENABLED=true
MCP_CLIENT_ID=authorclaw
MCP_CLIENT_SECRET=<output of: openssl rand -hex 32>

# Required if behind a reverse proxy (Caddy, nginx, Traefik)
MCP_ISSUER_URL=https://mcp.example.com
TRUST_PROXY=1

# Restrict to the Claude.ai origin; widen only if you know why
CORS_ORIGINS=https://claude.ai

# AI keys for the AuthorClaw container
GEMINI_API_KEY=<your key>
ANTHROPIC_API_KEY=<your key>
```

---

## Generating an OAuth client secret

```bash
openssl rand -hex 32
```

Copy the output into `.env` as the value of `MCP_CLIENT_SECRET`. Use the same value when configuring your MCP client (Claude.ai settings, Claude Desktop config, or the `claude mcp add` command).

The secret must be kept confidential. Anyone who obtains it can authenticate to the bridge and read your manuscripts.

---

## Multi-environment use

For stdio mode with Claude Desktop or Claude Code, there is typically no `.env` file in scope. Pass settings inline:

```bash
AUTHORCLAW_URL=http://192.168.1.100:3847 AUTH_ENABLED=false npx authorclaw-mcp
```

Or inline via Claude Code's `claude mcp add`:

```bash
claude mcp add authorclaw \
  -e AUTHORCLAW_URL=http://192.168.1.100:3847 \
  -e AUTH_ENABLED=false \
  -e AUTHORCLAW_TIMEOUT_MS=300000 \
  -- npx authorclaw-mcp
```

---

## CLI options

The `authorclaw-mcp` binary accepts CLI flags that mirror the environment variables. Flags take precedence over environment variables. These are parsed by `src/cli.ts` using `yargs`:

| Flag | Alias | Default | Purpose |
|---|---|---|---|
| `--transport` | `-t` | `stdio` | Transport mode: `stdio` for local/Claude Desktop, `sse` for remote/Docker. |
| `--port` | `-p` | `3000` (or `$PORT`) | Port for the SSE server. |
| `--host` | | `0.0.0.0` (or `$HOST`) | Bind address for the SSE server. |
| `--timeout` | | `120000` (or `$AUTHORCLAW_TIMEOUT_MS`) | Per-request timeout in milliseconds. |
| `--debug` | | `false` | Enable debug logging. |
| `--auth` | | from `$AUTH_ENABLED` | Enable OAuth authentication (SSE mode only). |
| `--client-id` | | from `$MCP_CLIENT_ID` | MCP OAuth client ID. |
| `--client-secret` | | from `$MCP_CLIENT_SECRET` | MCP OAuth client secret. |
| `--issuer-url` | | from `$MCP_ISSUER_URL` | OAuth issuer URL for HTTPS deployments behind a proxy. |
| `--redirect-uris` | | from `$MCP_REDIRECT_URIS` | Allowed OAuth redirect URIs, comma-separated. |
| `--allow-dcr` | | `false` | Allow OAuth Dynamic Client Registration (Cursor or Windsurf compatibility; development only). |
| `--trust-proxy` | | from `$TRUST_PROXY` | Express trust-proxy setting for reverse-proxy deployments. |

Run `npx authorclaw-mcp --help` to see current defaults.
