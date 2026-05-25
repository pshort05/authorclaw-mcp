# authorclaw-docker-fix

Reapplies a LAN-access patch to [AuthorClaw](https://github.com/Ckokoski/authorclaw) after every upstream `git pull`, until the project gains a supported configuration option for non-localhost binding.

> This directory is the integrated copy of [`pshort05/authorclaw-docker-fix`](https://github.com/pshort05/authorclaw-docker-fix), bundled here so the docker-compose stack in this repo can apply the patch via an init container without a separate clone. The standalone repository remains the canonical upstream and tracks the issue for AuthorClaw maintainers.

## When you need this

Apply this patch if AuthorClaw is not reachable from the host that runs `authorclaw-mcp`. Common scenarios:

- AuthorClaw is running in a Docker container on the same host and you've published its port 3847 but the MCP bridge gets `ERR_EMPTY_RESPONSE` / `ECONNREFUSED`.
- AuthorClaw runs on a different physical machine on your LAN and you want the bridge to reach it.
- You're running the docker-compose stack from this repo — the `authorclaw-patcher` init container runs this script automatically.

If you run AuthorClaw and `authorclaw-mcp` on the same machine, talking to it over `127.0.0.1`, you don't need the patch.

## The problem this addresses

AuthorClaw's [README](https://github.com/Ckokoski/authorclaw/blob/main/README.md) recommends running the application in a VM or VPS with Docker:

> We strongly recommend running AuthorClaw inside a VM or VPS with Docker. Your API keys, manuscripts, and creative work deserve real protection. Defense in depth means multiple security layers — not just application-level security.

However, the source code in `gateway/src/index.ts` hardcodes the listener to loopback:

```typescript
this.server.listen(port, '127.0.0.1', () => {
  // Bound to localhost only for security
});
```

The same file also hardcodes localhost-only allowlists for CORS, the helmet CSP `connectSrc` directive, and the WebSocket origin check. The combined effect is that a Docker container exposing port 3847 to its host appears reachable at the network layer (`docker ps` shows the publish; the kernel accepts the connection) but every request returns `ERR_EMPTY_RESPONSE` in the browser. The container's listener never accepts the request because the source IP is not loopback.

This issue is reported upstream as [Ckokoski/authorclaw#4](https://github.com/Ckokoski/authorclaw/issues/4).

## What the script does

`apply-lan-patch.sh` performs five idempotent text replacements on `gateway/src/index.ts`:

| Change | Purpose |
|--------|---------|
| `server.listen(port, '127.0.0.1', ...)` becomes `server.listen(port, process.env.AUTHORCLAW_BIND \|\| '0.0.0.0', ...)` | Bind to all interfaces by default; allow override via the `AUTHORCLAW_BIND` environment variable. |
| SocketIO `cors.origin` allowlist becomes `'*'` | Permit WebSocket handshake from any LAN origin. |
| Helmet CSP `connectSrc` allowlist becomes `'*'`, plus `upgradeInsecureRequests: null` | Stop the browser from blocking the WebSocket upgrade or rewriting URLs to HTTPS. |
| Express `cors()` middleware allowlist becomes `'*'` | Permit XHR and `fetch` from any LAN origin. |
| WebSocket `connection` handler's hardcoded origin allowlist is removed | Stop hard-disconnecting connections from non-localhost origins. |

Each transformation is gated by an idempotency check: if the post-patch marker is already in the file, the change is skipped. If neither the marker nor the upstream anchor string is present, the script exits non-zero with a clear message identifying which transformation could not be applied. That is the signal that upstream has restructured the file and the patch needs revisiting.

## Usage

See [`INSTALL.md`](./INSTALL.md) for the quick-start. The summary:

```bash
# After pulling upstream AuthorClaw:
cd /opt/docker-compose/authorclaw/src
sudo git pull

# Apply the patch (idempotent, safe to re-run):
/path/to/authorclaw-mcp/authorclaw-docker-fix/apply-lan-patch.sh

# Apply, then rebuild the image and recreate the container in one step:
/path/to/authorclaw-mcp/authorclaw-docker-fix/apply-lan-patch.sh --rebuild

# Report status without modifying anything:
/path/to/authorclaw-mcp/authorclaw-docker-fix/apply-lan-patch.sh --check
```

Exit codes:

| Code | Meaning |
|------|---------|
| 0 | All transformations applied (or already present in `--check` mode). |
| 1 | Source file `gateway/src/index.ts` not found at the expected path. |
| 2 | Unknown command-line argument. |
| 3 | An anchor string was found more than once, indicating the file has changed shape. |
| 4 | `--check` reports the patch is incomplete (some transformations would be applied). |

## Configuration

The script assumes the standard AuthorClaw Docker Compose layout:

| Path | Set in script |
|------|---------------|
| Source tree | `/opt/docker-compose/authorclaw/src` |
| Compose project root | `/opt/docker-compose` |
| Service name | `authorclaw` |

If your installation uses different paths, edit the `REPO`, `COMPOSE_DIR`, and `SVC` variables near the top of `apply-lan-patch.sh`, or override `REPO` via environment variable (the [docker-compose stack](../docker-compose.yml) in this repo does this).

After patching, set the bind address either in your AuthorClaw container's environment:

```yaml
environment:
  - AUTHORCLAW_BIND=0.0.0.0
```

or rely on the script's default (`0.0.0.0`) which is applied when the environment variable is unset.

## Security caveats

**This patch removes the localhost-only network isolation that the upstream codebase relies on as a security boundary.** AuthorClaw has no API authentication, no rate limiting, and the confirmation-gate flow is designed around the assumption that the requester is on the local machine. After applying this patch, anyone reachable on the network can:

- Drive the AI agent and consume your AI provider quota
- Read and write the workspace, vault, and project state
- Trigger external actions that the confirmation gate may not correctly validate for non-local requesters

This is acceptable on a trusted single-user home LAN. It is not acceptable for any wider exposure. If the service is reachable from untrusted networks, front it with a reverse proxy that enforces authentication — for example, the `authorclaw-mcp` bridge in the parent directory exposes its OAuth-protected port 3000 and keeps AuthorClaw's port 3847 unpublished inside the Docker network, which is the recommended deployment.

## Suggested upstream fix

The patch in this directory is a workaround. The upstream-clean fix that would close issue #4 without sacrificing the security model would default the bind to `127.0.0.1` and allow override via environment variable:

```typescript
const host = process.env.AUTHORCLAW_BIND || '127.0.0.1';
this.server.listen(port, host, () => { ... });
```

A complementary `AUTHORCLAW_CORS_ORIGINS` environment variable (comma-separated) could replace the hardcoded CORS allowlist when set, leaving the localhost-only default in place when unset.

If the AuthorClaw maintainer accepts that direction, this directory becomes obsolete and can be removed.

## License

MIT — see [`../LICENSE`](../LICENSE). Identical to the parent project.
