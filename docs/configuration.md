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
