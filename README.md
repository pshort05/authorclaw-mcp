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

57 MCP tools across twelve surfaces. See [`docs/endpoint-coverage.md`](docs/endpoint-coverage.md) for the full catalog (including endpoints intentionally skipped and the rationale).

- **Chat (2):** `authorclaw_chat`, `authorclaw_chat_async`
- **Status (1):** `authorclaw_status`
- **Documents (3):** `authorclaw_files_list`, `authorclaw_documents_upload`, `authorclaw_documents_delete`
- **Projects — lifecycle (9):** `authorclaw_project_create`, `_status`, `_list`, `_stop`, `_execute`, `_run`, `_resume`, `_restart`, `_compile`
- **Projects — editorial (10):** `_continuity_check`, `_continuity_report`, `_structure_check`, `_style_clone`, `_pacing_heatmap`, `_format_pro`, `_craft_critique`, `_dialogue_audit`, `_beta_reader`, `_cover_set`
- **Plot promises (4):** `authorclaw_plot_promises_list`, `_add`, `_extract`, `_audit`
- **Files / export (2):** `authorclaw_files_read`, `authorclaw_files_export`
- **Personas (6):** `authorclaw_personas_list`, `_create`, `_generate`, `_get`, `_update`, `_delete`
- **Research (7):** `authorclaw_research`, `authorclaw_research_lookup`, `_comp_authors`, `_agents`, `_newsletters`, `_podcasts`, `_reviewers`
- **Audio (3):** `authorclaw_audio_voices`, `authorclaw_audio_generate`, `authorclaw_audio_get`
- **Images (3):** `authorclaw_images_generate`, `authorclaw_images_book_cover`, `authorclaw_images_cover_set`
- **Series (4):** `authorclaw_series_list`, `authorclaw_series_create`, `authorclaw_series_delete`, `authorclaw_series_report`
- **Task queue (3):** `authorclaw_task_status`, `authorclaw_task_list`, `authorclaw_task_cancel`

## Security

See [`docs/threat-model.md`](docs/threat-model.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Credits

- AuthorClaw — Ckokoski (MIT)
- openclaw-mcp — Tomáš Grasl (MIT)
- LAN patch — pshort05/authorclaw-docker-fix (MIT)
