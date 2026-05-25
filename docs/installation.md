# Installation

Three supported installation paths.

## Docker Compose (recommended for LAN / production)

Prerequisites: Docker Engine 24+, Docker Compose plugin.

1. Clone this repository.
2. Clone AuthorClaw separately to a stable path (default `/opt/docker-compose/authorclaw/src`).
3. Copy `.env.example` to `.env` and fill in `MCP_CLIENT_SECRET`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`.
4. Run the patcher once so the AuthorClaw source is rewritten to bind to all interfaces:

   ```bash
   docker compose run --rm authorclaw-patcher
   ```

5. Start the stack:

   ```bash
   docker compose up -d
   ```

6. Verify: `docker compose ps` shows `authorclaw-patcher` exited 0, and `authorclaw` + `authorclaw-mcp` healthy. The MCP bridge is reachable on `http://<host>:3000`.

**Note on rebuilds:** If you later update AuthorClaw to a new upstream version, re-run the patcher (`docker compose run --rm authorclaw-patcher`) before `docker compose up --build -d`. The patcher is idempotent — running it on already-patched source is safe and reports each patch as already applied.

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
