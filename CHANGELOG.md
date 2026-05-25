# Changelog

Notable changes per release. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.5] 2026-05-25

### Fixed

- `authorclaw-docker-fix/apply-lan-patch.sh`: the script no longer overwrites a caller-supplied `REPO` env var. The hardcoded path is now a fallback default: `REPO="${REPO:-/opt/docker-compose/authorclaw/src}"`. Same change applied to `COMPOSE_DIR` and `SVC`. This unblocks the docker-compose patcher container, which sets `REPO=/src` to point at the bind-mounted source. Before this fix the patcher exited 1 with `ERROR: /opt/docker-compose/authorclaw/src/gateway/src/index.ts not found`, and the `depends_on: condition: service_completed_successfully` clause prevented the AuthorClaw service from starting.
- `docker-compose.yml`: the patcher container now installs `bash` alongside `python3` and invokes the script with `bash`. The script's shebang is `#!/usr/bin/env bash` and it uses bash builtins (`declare`), so the previous `sh /apply-lan-patch.sh` invocation failed with `line 57: declare: not found` on Alpine.
- `src/server/tools-registration.ts`: the three task-tool handlers (`handleTaskStatus`, `handleTaskList`, `handleTaskCancel`) now receive the null-coalesced `args` (`(toolArgs ?? {})`) instead of the raw `toolArgs`. Previously, an MCP client that called `authorclaw_task_list` without an `arguments` field (valid per the MCP spec, since the tool has no required parameters) got back `Invalid input: expected an object` instead of the actual list.
- `src/config.ts`: `AUTHORCLAW_TIMEOUT_MS` is now parsed defensively via a new exported `parseTimeoutMs()` helper. Empty string, whitespace, non-numeric strings, zero, and negative values all fall back to the 300000ms default with a single stderr warning. Previously, `AUTHORCLAW_TIMEOUT_MS=banana` produced `NaN` which crashed every fetch via `AbortSignal.timeout(NaN)` with a `RangeError` at the first tool call; `AUTHORCLAW_TIMEOUT_MS=""` produced `0` which aborted every fetch on the next tick.
- `src/cli.ts`: now uses the same `parseTimeoutMs()` helper so the startup log line `Request timeout: ...ms` always shows the actual effective value rather than `NaN`.

### Tests

- 328 tests pass (up from 322 with 6 new tests covering the timeout parsing edge cases).

## [0.2.4] 2026-05-25

### Added

- New top-level `CHANGELOG.md` (this file).
- New `docs/development.md` covering build, test, live smoke, adding tools, and the release process.
- Substantially expanded top-level `README.md`: status table, architecture diagram, configuration overview, documentation index, compatibility matrix, credits.

### Changed

- All documentation rewritten without em or en dashes, emojis, or check marks. Word-based status labels replace icons in the endpoint coverage tables.
- `docs/installation.md` expanded with prerequisites, verification, troubleshooting, and an update workflow.
- `docs/configuration.md` expanded with an annotated `.env` walkthrough, OAuth secret generation, multi-environment usage, and CLI options table.
- `docs/threat-model.md`: new section on `authorclaw_task_cancel` residual risk (cannot abort in-flight chats).
- `docs/ARCHITECTURE.md`: repository layout tree updated to reflect the v0.2 state. Tool count updated to 57. The `scripts/apply-lan-patch.sh` path updated to `authorclaw-docker-fix/apply-lan-patch.sh`.

## [0.2.3] 2026-05-25

### Added

- Bundled `authorclaw-docker-fix/` as an integrated optional component with its own `README.md` and `INSTALL.md`. Mirrors the standalone [pshort05/authorclaw-docker-fix](https://github.com/pshort05/authorclaw-docker-fix) repo so the Docker Compose stack can apply the LAN patch without a separate clone.
- New "Optional: AuthorClaw LAN Patch" section in the main `README.md` explaining when the patch is needed.

### Changed

- `apply-lan-patch.sh` moved from `scripts/` to `authorclaw-docker-fix/` (preserved via git rename).
- `docker-compose.yml` bind-mount path updated to the new location.
- Removed the empty `scripts/` directory.

## [0.2.2] 2026-05-25

### Removed

- Final remaining openclaw-mcp upstream artifacts. After this release, `grep -rin openclaw src/` returns zero hits.
  - `config.openclaw` and the `OpenClawConfig` interface (the registry chain that consumed them was removed in v0.2.1).
  - `DEFAULT_OPENCLAW_URL` and `DEFAULT_MODEL` constants.
  - `src/utils/errors.ts` with its `OpenClawError`, `OpenClawConnectionError`, `OpenClawApiError` classes (zero production consumers).
  - `OPENCLAW_TIMEOUT_MS` environment-variable fallback in `cli.ts`.
  - The `[openclaw-mcp]` log prefix renamed to `[authorclaw-mcp]`.
- Internal `openclawTaskStatusTool`, `openclawTaskListTool`, `openclawTaskCancelTool` exports and matching handler names renamed to drop the `openclaw` prefix. MCP tool names are unchanged.

### Tests

- 322 tests pass.

## [0.2.1] 2026-05-25

### Removed

- Dead tool files imported from openclaw-mcp upstream:
  - `src/mcp/tools/chat.ts`
  - `src/mcp/tools/status.ts`
  - `src/mcp/tools/instances.ts`
  - `src/mcp/tools/index.ts`
  - `src/openclaw/client.ts`
  - `src/openclaw/registry.ts`
  - `src/openclaw/types.ts`
- Dead handlers inside `src/mcp/tools/tasks.ts`: `openclawChatAsyncTool`, `handleOpenclawChatAsync`, `processTask`, `startTaskProcessor`, `processorRegistry`.
- The `InstanceRegistry` chain across `cli.ts`, `src/index.ts`, and `src/server/tools-registration.ts`. The `--instance` CLI option, `InstanceConfig` type, and `registry: InstanceRegistry` parameter on the task handlers are gone.

### Changed

- `OpenClawAuthProvider` and `OpenClawClientsStore` in `src/auth/provider.ts` renamed to `AuthorClawAuthProvider` and `AuthorClawClientsStore`. Internal OAuth client name string updated.

## [0.2.0] 2026-05-25

### Added

- 43 new MCP tools across 7 families, bringing the total to 57:
  - 19 project-writing tools: `_execute`, `_run`, `_resume`, `_restart`, `_compile`, `_continuity_check`, `_continuity_report`, `_structure_check`, `_style_clone`, `_pacing_heatmap`, `_format_pro`, `_craft_critique`, `_dialogue_audit`, `_beta_reader`, `_cover_set`, plus 4 `_plot_promises_*` tools.
  - 6 persona tools: `list`, `create`, `generate`, `get`, `update`, `delete`.
  - 6 advanced-research tools: `lookup`, `comp_authors`, `agents`, `newsletters`, `podcasts`, `reviewers`.
  - 3 audio tools: `voices`, `generate`, `get`.
  - 3 image tools: `generate`, `book_cover`, `cover_set`.
  - 4 series tools: `list`, `create`, `delete`, `report`.
  - 2 document tools: `upload`, `delete`.
- 44 new methods on `AuthorClawClient` wrapping the corresponding endpoints.
- `docs/endpoint-coverage.md`: every one of AuthorClaw v4.0.0's 231 `/api/*` endpoints categorized as wrapped, skipped (with rationale), or security-skipped.

### Tests

- 365 tests pass.

## [0.1.1] 2026-05-24

### Fixed

- Aligned client paths and bodies with AuthorClaw v4.0.0 after live verification:
  - `chat` response field renamed from `reply` to `response`.
  - `createProject` now POSTs to `/api/projects/create` with `{ title, description }` (was `{ task }` to `/api/projects`).
  - `stopProject` now POSTs to `/api/projects/:id/pause` (was `/stop`).
  - `listProjects` now GETs `/api/projects/list` and unwraps the `{ projects: [] }` envelope.
  - `listFiles` now GETs `/api/documents` and unwraps the `{ documents: [] }` envelope. The optional `folder` parameter was removed.
  - `readFile` and `exportFile` now require a `project_id` parameter because the real endpoints are project-scoped (`/api/projects/:id/download/:filename` and `/api/projects/:id/export-docx`).
  - `research` body shape changed from `{ topic }` to `{ query }`.

## [0.1.0] 2026-05-24

Initial public release.

### Added

- 14 MCP tools covering chat, projects, files, research, status, and the async task queue.
- `AuthorClawClient` wrapping 10 AuthorClaw REST endpoints.
- OAuth 2.1 plus SSE transport scaffolding forked from [freema/openclaw-mcp](https://github.com/freema/openclaw-mcp).
- Three-service Docker Compose stack with an `authorclaw-patcher` init container that applies the LAN patch before the gateway starts.
- Complete rebrand from `openclaw-mcp` to `authorclaw-mcp`: package metadata, server identity, configuration variables, MCP registry manifest, security policy, Docker image labels.
- `docs/ARCHITECTURE.md`, `docs/installation.md`, `docs/configuration.md`, `docs/threat-model.md`.

[0.2.5]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.2.5
[0.2.4]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.2.4
[0.2.3]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.2.3
[0.2.2]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.2.2
[0.2.1]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.2.1
[0.2.0]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.2.0
[0.1.1]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.1.1
[0.1.0]: https://github.com/pshort05/authorclaw-mcp/releases/tag/v0.1.0
