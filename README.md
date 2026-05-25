# authorclaw-mcp

MCP server bridging Claude (Desktop, Claude.ai, Claude Code) to a local
[AuthorClaw](https://github.com/Ckokoski/authorclaw) writing agent.

Combines:
- [pshort05/authorclaw-docker-fix](https://github.com/pshort05/authorclaw-docker-fix) — LAN binding patch
- [freema/openclaw-mcp](https://github.com/freema/openclaw-mcp) — OAuth 2.1 + SSE bridge architecture

## Quick Start

See [`docs/installation.md`](docs/installation.md) and [`docs/configuration.md`](docs/configuration.md).

The full design is documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tools

Twelve MCP tools across five surfaces:

- `authorclaw_chat`, `authorclaw_chat_async`
- `authorclaw_project_create`, `_status`, `_list`, `_stop`
- `authorclaw_files_list`, `_read`, `_export`
- `authorclaw_research`
- `authorclaw_status`
- `authorclaw_task_status`, `_list`, `_cancel`

## Security

See [`docs/threat-model.md`](docs/threat-model.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Credits

- AuthorClaw — Ckokoski (MIT)
- openclaw-mcp — Tomáš Grasl (MIT)
- LAN patch — pshort05/authorclaw-docker-fix (MIT)
