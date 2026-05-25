# Installation

## Prerequisites

- **Docker Engine 24+** and the **Docker Compose plugin** (for the Docker Compose path).
- **Node.js 20+** (for local install via `npx` or `claude mcp add`).
- An AuthorClaw checkout on disk. The default path expected by the Docker Compose stack is `/opt/docker-compose/authorclaw/src`. Override with `AUTHORCLAW_SRC` in `.env` if your clone is elsewhere.

Three supported installation paths are described below.

---

## Docker Compose (recommended for LAN or production)

1. Clone this repository.
2. Clone AuthorClaw separately to a stable path (default `/opt/docker-compose/authorclaw/src`).
3. Copy `.env.example` to `.env` and fill in `MCP_CLIENT_SECRET`, `GEMINI_API_KEY`, and `ANTHROPIC_API_KEY`.
4. Run the patcher once so the AuthorClaw source is rewritten to bind to all interfaces:

   ```bash
   docker compose run --rm authorclaw-patcher
   ```

5. Start the stack:

   ```bash
   docker compose up -d
   ```

6. Verify: `docker compose ps` shows `authorclaw-patcher` exited 0, and `authorclaw` plus `authorclaw-mcp` healthy. The MCP bridge is reachable on `http://<host>:3000`.

**Note on rebuilds:** If you later update AuthorClaw to a new upstream version, re-run the patcher (`docker compose run --rm authorclaw-patcher`) before `docker compose up --build -d`. The patcher is idempotent: running it on already-patched source is safe and reports each change as already applied. If you skip the patcher and go straight to `--build`, Docker rebuilds from the unpatched source and the bridge will fail with `ERR_EMPTY_RESPONSE`.

---

## Claude Desktop (local or LAN, no OAuth)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS; adjust the path for your OS):

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

---

## Claude Code

```bash
claude mcp add authorclaw \
  -e AUTHORCLAW_URL=http://YOUR_LAN_IP:3847 \
  -e AUTHORCLAW_TIMEOUT_MS=300000 \
  -- npx authorclaw-mcp
```

---

## Verification

After starting the bridge via any path, confirm it is reachable and listing tools.

### Stdio mode (Claude Desktop or Claude Code)

Send a minimal JSON-RPC handshake to the process's stdin:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  | AUTHORCLAW_URL=http://YOUR_LAN_IP:3847 AUTH_ENABLED=false npx authorclaw-mcp
```

Expected: a JSON response containing `"protocolVersion"` and `"serverInfo"`. Follow with:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' \
  | AUTHORCLAW_URL=http://YOUR_LAN_IP:3847 AUTH_ENABLED=false npx authorclaw-mcp
```

Expected: a `tools/list` response containing 57 tool entries. Fewer than 57 means `dist/` is stale; run `npm run build`.

### SSE mode (Docker Compose)

```bash
# Health check on the bridge
curl -fsS http://localhost:3000/health

# Confirm AuthorClaw itself is reachable (inside Docker network via bridge; from host, use the bridge health)
docker compose exec authorclaw-mcp curl -fsS http://authorclaw:3847/api/health
```

---

## Troubleshooting

### `ERR_EMPTY_RESPONSE` or `ECONNREFUSED` from AuthorClaw

AuthorClaw's source hardcodes `127.0.0.1` as the listener address. Any connection from outside that process (including a Docker sibling container) is silently dropped. Apply the LAN patch:

```bash
docker compose run --rm authorclaw-patcher
```

Then rebuild and restart:

```bash
docker compose up --build -d
```

For manual or bare-metal installs, run the patch script directly:

```bash
./authorclaw-docker-fix/apply-lan-patch.sh
```

See `authorclaw-docker-fix/README.md` for full details.

### Patcher container fails with "python3 not found"

The `authorclaw-patcher` service uses an Alpine base image. On first run, Alpine downloads `python3` before the patch script can use it. If the container exits non-zero with a package-install error, re-run it:

```bash
docker compose run --rm authorclaw-patcher
```

Subsequent runs use the cached layer and complete immediately.

### `docker compose up --build` rebuilds from unpatched source

The patcher writes changes to the `authorclaw-src` volume. If you run `--build` before the patcher has run, Docker builds the image from the unpatched source tree and the bind-address fix is absent. Always run the patcher first:

```bash
docker compose run --rm authorclaw-patcher
docker compose up -d        # omit --build if the image was already built from patched source
```

### OAuth `401` with `AUTH_ENABLED=true` and a missing token

The bridge returns `401 Unauthorized` when `AUTH_ENABLED=true` and the request does not include a valid Bearer token. Verify:

- `MCP_CLIENT_SECRET` is set in `.env` and matches what your MCP client is using.
- The client is sending an `Authorization: Bearer <token>` header, not an empty one.

Generate a fresh secret:

```bash
openssl rand -hex 32
```

Paste the output into `.env` as `MCP_CLIENT_SECRET=<value>`.

### `tools/list` returns fewer than 57 tools

The tool count is embedded in the compiled bundle at build time. If you added or removed tools without rebuilding, the running server serves stale code. Rebuild:

```bash
npm run build
```

Then restart the server or the Docker stack.

---

## Updating

1. Pull the new release tag:

   ```bash
   git fetch --tags
   git checkout vX.Y.Z
   ```

2. Re-run the patcher (in case AuthorClaw's source has changed):

   ```bash
   docker compose run --rm authorclaw-patcher
   ```

3. Rebuild and restart the stack:

   ```bash
   docker compose up --build -d
   ```

4. Verify with `docker compose ps` and the smoke-test commands above.
