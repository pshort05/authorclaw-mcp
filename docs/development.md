# Development Guide

## Prerequisites

Node.js 20 or later is required. The project targets Node 20 in `tsup.config.ts` and uses native `fetch` which is stable from Node 18 but best supported from Node 20 onward.

## Local development setup

```bash
# Clone the repository
git clone https://github.com/pshort05/authorclaw-mcp.git
cd authorclaw-mcp

# Install dependencies
npm install

# Run the test suite
npx vitest run

# Build the compiled bundle
npm run build
```

The `dist/index.js` bundle is the only file that gets published and executed at runtime. Always rebuild after changing source files.

---

## Running against a live AuthorClaw

Point a local stdio invocation at a running AuthorClaw instance by setting `AUTHORCLAW_URL` and disabling OAuth:

```bash
AUTHORCLAW_URL=http://192.168.1.100:3847 AUTH_ENABLED=false npx authorclaw-mcp
```

The process reads JSON-RPC messages from stdin and writes responses to stdout. For a manual smoke test, pipe the full handshake:

```bash
printf '%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | AUTHORCLAW_URL=http://192.168.1.100:3847 AUTH_ENABLED=false node dist/index.js
```

Expected output: an `initialize` response on the first line, then a `tools/list` response containing 57 tool entries.

To call a specific tool:

```bash
printf '%s\n%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"authorclaw_status","arguments":{}}}' \
  | AUTHORCLAW_URL=http://192.168.1.100:3847 AUTH_ENABLED=false node dist/index.js
```

### SSE transport equivalent

For the SSE transport, the same handshake runs over HTTP. The bridge uses the MCP SDK's Streamable HTTP transport, so the equivalent `curl` approach is to open the SSE stream and POST messages to the session endpoint. In practice, running `docker compose up -d` and pointing Claude Desktop or Claude Code at `http://localhost:3000` is the easiest live test path.

---

## Test layout

Tests live under `src/__tests__/` and are organized to mirror the source tree:

| Suite | Path | What it covers |
|---|---|---|
| Client methods | `src/__tests__/client/authorclaw.test.ts` | `AuthorClawClient` HTTP methods: chat, projects, files, research, health, audio, images, personas, series, documents |
| Config | `src/__tests__/config.test.ts` | Environment variable parsing, defaults, and overrides |
| OAuth provider | `src/__tests__/auth/oauth.test.ts` | OAuth 2.1 provider logic: token issuance, validation, introspection |
| Auth integration | `src/__tests__/server/auth-integration.test.ts` | OAuth middleware wired into the Express server |
| SSE transport | `src/__tests__/server/sse.test.ts` | SSE server startup, session routing, shutdown |
| Task manager | `src/__tests__/mcp/tasks/manager.test.ts` | Async task queue: create, poll, cancel, timeout |
| Tool dispatchers | `src/__tests__/tools/*.test.ts` | One file per tool module: chat, projects, project-writing, files, research, research-advanced, documents, audio, images, personas, series, status |
| Validation utilities | `src/__tests__/utils/validation.test.ts` | Input sanitization and validation helpers |
| Response helpers | `src/__tests__/utils/response-helpers.test.ts` | MCP response formatting utilities |
| Logger | `src/__tests__/utils/logger.test.ts` | Structured logger behavior |

All tests are pure unit tests. They use `vi.stubGlobal('fetch', ...)` to mock HTTP calls. No tests run against a live AuthorClaw instance. Integration validation is done manually via the smoke-test pattern above.

Run a single suite:

```bash
npx vitest run src/__tests__/client/authorclaw.test.ts
```

Run in watch mode during development:

```bash
npx vitest
```

---

## Build and bundle

`tsup` bundles `src/index.ts` to `dist/index.js` as a single ESM file:

```bash
npm run build
```

The bundle embeds the version string from `package.json` at build time via the `__PKG_VERSION__` define in `tsup.config.ts`:

```typescript
define: {
  __PKG_VERSION__: JSON.stringify(pkg.version),
}
```

If you bump `package.json` without rebuilding, the running server reports the old version. Always rebuild after a version bump. The `dist/` directory is not committed; it is regenerated as part of the release process.

---

## Adding a new tool

Follow these steps to wrap an unwrapped AuthorClaw endpoint (see `docs/endpoint-coverage.md` for the current status of each endpoint):

1. **Add a client method (TDD).** Write a test in `src/__tests__/client/authorclaw.test.ts` that mocks `fetch` and asserts the correct URL, method, and headers are used. Then add the method to `src/client/authorclaw.ts`.

2. **Add a dispatcher (TDD).** Write a test in the appropriate `src/__tests__/tools/*.test.ts` file that mocks the client method and asserts the tool name, input schema, and output format. Then add the dispatcher to the corresponding `src/tools/*.ts` file.

3. **Wire into tool registration.** Import the tool definition and dispatcher into `src/server/tools-registration.ts`. Add the tool to the `ListToolsRequestSchema` handler (in the tools array) and the `CallToolRequestSchema` handler (in the dispatch switch).

4. **Run the full test suite:**

   ```bash
   npx vitest run
   ```

5. **Smoke-test against a live AuthorClaw:**

   ```bash
   printf '%s\n%s\n%s\n%s\n' \
     '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
     '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
     '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
     '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"your_new_tool","arguments":{"param":"value"}}}' \
     | AUTHORCLAW_URL=http://192.168.1.100:3847 AUTH_ENABLED=false node dist/index.js
   ```

6. **Update `docs/endpoint-coverage.md`.** Change the row for the endpoint you wrapped from `Skipped` to `Wrapped vX.Y`, note the tool name, and update the summary count table at the bottom.

7. **Bump the version** in `package.json` following semver (patch for a new tool, minor for a new group of tools).

---

## Release process

1. **Bump `package.json` version.**

2. **Update `CHANGELOG.md`** with a summary of what changed.

3. **Rebuild:**

   ```bash
   npm run build
   ```

4. **Run the unit tests:**

   ```bash
   npx vitest run
   ```

5. **Run the live smoke test** against a running AuthorClaw (see "Running against a live AuthorClaw" above). Confirm `tools/list` returns the expected tool count and at least one `tools/call` succeeds.

6. **Commit and tag:**

   ```bash
   git add package.json CHANGELOG.md dist/
   git commit -m "chore: release vX.Y.Z"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main
   git push origin vX.Y.Z
   ```

The Git tag triggers the GitHub Actions workflow, which builds and pushes the Docker image to GHCR as `ghcr.io/pshort05/authorclaw-mcp:vX.Y.Z` and `:latest`.

---

## Subdirectory layout

```
authorclaw-mcp/
├── src/                        # TypeScript source
│   ├── __tests__/              # Vitest unit tests (mirrors src/ structure)
│   ├── auth/                   # OAuth 2.1 provider
│   ├── client/                 # HTTP client for AuthorClaw REST API
│   ├── config/                 # Compile-time constants
│   ├── mcp/                    # MCP-specific modules (async task manager)
│   ├── server/                 # SSE server setup and shared tool registration
│   ├── tools/                  # One file per tool group
│   ├── types/                  # TypeScript global type declarations
│   └── utils/                  # Logger, validation, response helpers
├── dist/                       # Compiled bundle (generated; not committed)
├── docs/                       # Project documentation
└── authorclaw-docker-fix/      # LAN patch script and its own README/INSTALL
```

### `src/` directory detail

| Path | Purpose |
|---|---|
| `src/index.ts` | Entry point: parses CLI arguments, selects stdio or SSE transport, starts the server |
| `src/cli.ts` | CLI argument parser (`yargs`). Defines all flags and maps them to `CliArgs`. |
| `src/config.ts` | Environment variable config with defaults. Single source of truth for runtime settings. |
| `src/auth/provider.ts` | OAuth 2.1 provider: token issuance, PKCE, client credentials, introspection |
| `src/client/authorclaw.ts` | Typed HTTP client for the AuthorClaw REST API. One method per API call. |
| `src/config/constants.ts` | Compile-time constants (server icon SVG, etc.) |
| `src/mcp/tasks/manager.ts` | In-memory async task queue used by `authorclaw_chat_async` and related tools |
| `src/mcp/tools/tasks.ts` | MCP tool definitions for task status, list, and cancel |
| `src/server/sse.ts` | SSE/Streamable HTTP server: Express app, session routing, OAuth middleware |
| `src/server/tools-registration.ts` | Shared function that registers all 57 tools on an MCP `Server` instance |
| `src/tools/audio.ts` | `authorclaw_audio_*` tools (v0.2) |
| `src/tools/chat.ts` | `authorclaw_chat`, `authorclaw_chat_async` |
| `src/tools/documents.ts` | `authorclaw_documents_*` tools (v0.2) |
| `src/tools/files.ts` | `authorclaw_files_list`, `_read`, `_export` |
| `src/tools/images.ts` | `authorclaw_images_*` tools (v0.2) |
| `src/tools/personas.ts` | `authorclaw_personas_*` tools (v0.2) |
| `src/tools/project-writing.ts` | Project-scoped editorial tools: continuity check, style clone, pacing heatmap, etc. (v0.2) |
| `src/tools/projects.ts` | Core project lifecycle tools: create, status, list, stop, execute, run, resume, restart, compile, plot promises, etc. |
| `src/tools/research.ts` | `authorclaw_research` |
| `src/tools/research-advanced.ts` | `authorclaw_research_lookup`, comp authors, agents, newsletters, podcasts, reviewers (v0.2) |
| `src/tools/series.ts` | `authorclaw_series_*` tools (v0.2) |
| `src/tools/status.ts` | `authorclaw_status` (gateway health check) |
| `src/utils/logger.ts` | Structured logging with debug/info/error levels and credential redaction |
| `src/utils/response-helpers.ts` | Helpers for formatting MCP tool responses consistently |
| `src/utils/validation.ts` | Input validation: type checks, string length limits, control character rejection |
