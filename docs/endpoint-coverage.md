# AuthorClaw v4.0.0 Endpoint Coverage

This document maps every `/api/*` endpoint in AuthorClaw v4.0.0 to its status
in `authorclaw-mcp`. Generated from `/opt/docker-compose/authorclaw/src/gateway/src/api/routes.ts`.

**Legend:**
- ✅ Wrapped — exposed as one or more MCP tools (in v0.1 or v0.2)
- ⏭️ Skipped — out of scope for an MCP writing agent; rationale given
- 🔒 Security-skipped — exposes credentials, internal config, or admin surface
- ❓ Doesn't exist — was assumed in the original ARCHITECTURE.md but is absent in v4.0.0

---

## Health / Status (4 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/health | ✅ v0.1 | `authorclaw_status` |
| GET | /api/status | ⏭️ Skipped v0.2 | Verbose internal dashboard dump (soul, providers, costs, skills, heartbeat). Useful to admins; too noisy for a writing agent. Skipped for v0.2; consider a read-only `authorclaw_server_status` in v0.3. |
| GET | /api/costs | ⏭️ Skipped v0.2 | Operator cost dashboard. Not part of a writing workflow. |
| GET | /api/hub | ⏭️ Skipped v0.2 | Aggregated manuscript hub stats — dashboard concern, not a workflow tool. |

---

## Chat (1 endpoint)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/chat | ✅ v0.1 | `authorclaw_chat`, `authorclaw_chat_async` |

---

## Documents (3 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/documents | ✅ v0.1 | `authorclaw_files_list` |
| POST | /api/documents/upload | ✅ v0.2 | `authorclaw_documents_upload` (new) |
| DELETE | /api/documents/:filename | ✅ v0.2 | `authorclaw_documents_delete` (new) |

---

## Projects (49 endpoints)

### Core project lifecycle

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/projects | ⏭️ Skipped v0.2 | Returns bare directory listing; `GET /api/projects/list` (engine-based) is richer and already wrapped. |
| GET | /api/projects/list | ✅ v0.1 | `authorclaw_project_list` |
| GET | /api/projects/:id | ✅ v0.1 | `authorclaw_project_status` |
| POST | /api/projects/create | ✅ v0.1 | `authorclaw_project_create` |
| DELETE | /api/projects/:id | ⏭️ Skipped v0.2 | Destructive — no safe-delete UX exists in MCP context. Document for v0.3. |
| POST | /api/projects/:id/start | ⏭️ Skipped v0.2 | Internal plumbing; `execute` is the user-facing step driver. |
| POST | /api/projects/:id/execute | ✅ v0.2 | `authorclaw_project_execute` (new) — runs the currently active step and returns the AI response. |
| POST | /api/projects/:id/auto-execute | ✅ v0.2 | `authorclaw_project_run` (new) — fully autonomous execution of all pending steps. |
| POST | /api/projects/:id/resume | ✅ v0.2 | `authorclaw_project_resume` (new) — re-activates a stuck or paused project. |
| POST | /api/projects/:id/restart | ✅ v0.2 | `authorclaw_project_restart` (new) — resets failed/active steps so the project can re-run. |
| POST | /api/projects/:id/pause | ✅ v0.1 | `authorclaw_project_stop` |
| POST | /api/projects/:id/skip/:stepId | ⏭️ Skipped v0.2 | Step-level surgery. Useful but niche — document for v0.3. |
| POST | /api/projects/:id/steps/:stepId/retry | ⏭️ Skipped v0.2 | Step-level surgery. Useful but niche — document for v0.3. |
| POST | /api/projects/:id/provider | ⏭️ Skipped v0.2 | Sets a project's preferred AI provider. Config tweak, not writing workflow. |
| POST | /api/projects/:id/upload | ⏭️ Skipped v0.2 | Project-level file upload (attaches manuscript to a project). Requires multipart; MCP tools work better with base64 or library-first upload. Pair with `authorclaw_documents_upload` instead. Document for v0.3. |

### Project file management

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/projects/:id/files | ✅ v0.1 | `authorclaw_files_list` (lists project output files) |
| GET | /api/projects/:id/download/:filename | ✅ v0.1 | `authorclaw_files_read` |
| POST | /api/projects/:id/export-docx | ✅ v0.1 | `authorclaw_files_export` |
| POST | /api/projects/:id/compile | ✅ v0.2 | `authorclaw_project_compile` (new) — combines all step outputs into manuscript.md + .docx + .epub. |
| GET | /api/projects/:id/context | ⏭️ Skipped v0.2 | Internal context engine data (summaries + entities). Observability tool, not writing tool. |

### Templates

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/projects/templates | ⏭️ Skipped v0.2 | Dashboard-facing template catalog. Not directly useful as MCP tool. |
| POST | /api/projects/templates | ⏭️ Skipped v0.2 | Create custom template. Dashboard concern. |
| DELETE | /api/projects/templates/:id | ⏭️ Skipped v0.2 | Delete custom template. Dashboard concern. |

### Analysis and editorial tools

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/projects/:id/continuity-check | ✅ v0.2 | `authorclaw_project_continuity_check` (new) — async continuity check; responds immediately, progress via socket. |
| GET | /api/projects/:id/continuity-report | ✅ v0.2 | `authorclaw_project_continuity_report` (new) — fetch the stored continuity report. |
| POST | /api/projects/:id/structure-check | ✅ v0.2 | `authorclaw_project_structure_check` (new) — compare project outline against story structure frameworks. |
| POST | /api/projects/:id/style-clone | ✅ v0.2 | `authorclaw_project_style_clone` (new) — analyze the project's manuscript for style fingerprint. |
| POST | /api/projects/:id/pacing-heatmap | ✅ v0.2 | `authorclaw_project_pacing_heatmap` (new) — manuscript autopsy: tension/pacing analysis. |
| POST | /api/projects/:id/format-pro | ✅ v0.2 | `authorclaw_project_format_pro` (new) — format manuscript as docx/epub/pdf via external formatter. |
| POST | /api/projects/:id/craft-critique | ✅ v0.2 | `authorclaw_project_craft_critique` (new) — mechanical craft analysis of completed chapters. |
| POST | /api/projects/:id/dialogue-audit | ✅ v0.2 | `authorclaw_project_dialogue_audit` (new) — analyse dialogue across manuscript for authenticity issues. |
| POST | /api/projects/:id/beta-reader | ✅ v0.2 | `authorclaw_project_beta_reader` (new) — run simulated beta-reader panel on completed chapters. |
| GET | /api/projects/:id/beta-reader/report | ✅ v0.2 | Covered by `authorclaw_project_beta_reader` — returns stored report if already run. |
| POST | /api/projects/:id/export-blurb | ⏭️ Skipped v0.2 | KDP-formatted blurb export. Niche; document for v0.3. |

### Cover art

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/projects/:id/cover-set | ✅ v0.2 | `authorclaw_project_cover_set` (new) — generate full set of cover sizes auto-filled from project metadata. |

### Plot promises

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/projects/:id/plot-promises | ✅ v0.2 | `authorclaw_plot_promises_list` (new) |
| POST | /api/projects/:id/plot-promises | ✅ v0.2 | `authorclaw_plot_promises_add` (new) |
| POST | /api/projects/:id/plot-promises/extract | ✅ v0.2 | `authorclaw_plot_promises_extract` (new) — AI extracts promises from opening chapters. |
| GET | /api/projects/:id/plot-promises/audit | ✅ v0.2 | `authorclaw_plot_promises_audit` (new) — flag open promises at risk of going unpaid. |
| PATCH | /api/projects/:id/plot-promises/:promiseId | ⏭️ Skipped v0.2 | Fine-grained promise editing. Cover via extract+audit in v0.2; direct edit in v0.3. |
| DELETE | /api/projects/:id/plot-promises/:promiseId | ⏭️ Skipped v0.2 | Destructive. Document for v0.3. |

### Audiobook

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/projects/:id/audiobook/cleanup | ⏭️ Skipped v0.2 | Narration script cleanup. Useful but niche; deferred to v0.3. |
| POST | /api/projects/:id/audiobook/pronunciation | ⏭️ Skipped v0.2 | Pronunciation dictionary. Niche; v0.3. |
| POST | /api/projects/:id/audiobook/ssml | ⏭️ Skipped v0.2 | SSML generation. Niche; v0.3. |
| POST | /api/projects/:id/audiobook/attribute | ⏭️ Skipped v0.2 | Multi-voice attribution. Niche; v0.3. |

### Character voices

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/projects/:id/character-voices | ⏭️ Skipped v0.2 | Character voice fingerprints. Interesting but complex setup; v0.3. |
| POST | /api/projects/:id/character-voices/ingest | ⏭️ Skipped v0.2 | Ingest chapter for voice corpus. Niche; v0.3. |
| POST | /api/projects/:id/character-voices/detect-drift | ⏭️ Skipped v0.2 | Detect voice drift. Niche; v0.3. |

### Auto-skill drafts (project-scoped)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/projects/:id/draft-skill | ⏭️ Skipped v0.2 | Generates a SKILL.md from a project's outputs. Operator/developer feature; not a writing workflow. |

---

## Pipeline (2 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/pipeline/create | ⏭️ Skipped v0.2 | Creates a multi-phase novel pipeline (6 linked projects). Complex setup; covered by `authorclaw_project_create` with `type: novel-pipeline`. Document standalone tool for v0.3. |
| GET | /api/pipeline/:pipelineId | ⏭️ Skipped v0.2 | Pipeline phase status. Covered by `authorclaw_project_status` per phase. Document for v0.3. |

---

## Personas (6 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/personas | ✅ v0.2 | `authorclaw_personas_list` (new) |
| POST | /api/personas | ✅ v0.2 | `authorclaw_personas_create` (new) |
| POST | /api/personas/generate | ✅ v0.2 | `authorclaw_personas_generate` (new) — AI-assisted full persona generation from genre. |
| GET | /api/personas/:id | ✅ v0.2 | `authorclaw_personas_get` (new) |
| PUT | /api/personas/:id | ✅ v0.2 | `authorclaw_personas_update` (new) |
| DELETE | /api/personas/:id | ✅ v0.2 | `authorclaw_personas_delete` (new) |
| POST | /api/personas/:id/generate-bio | ✅ v0.2 | Covered by `authorclaw_personas_generate` (returns persona with bio); standalone bio regeneration folded into update. |

---

## Research (8 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/research | ✅ v0.1 | `authorclaw_research` |
| GET | /api/research/domains | ⏭️ Skipped v0.2 | Domain allowlist management. Operator config, not writing workflow. |
| POST | /api/research/domains | ⏭️ Skipped v0.2 | Domain allowlist management. Operator config, not writing workflow. |
| POST | /api/research/lookup | ✅ v0.2 | `authorclaw_research_lookup` (new) — sourced research via Perplexity with citation. |
| POST | /api/research/comp-authors | ✅ v0.2 | `authorclaw_research_comp_authors` (new) — find comparable authors for a genre. |
| POST | /api/research/agents | ✅ v0.2 | `authorclaw_research_agents` (new) — find literary agents for a genre. |
| POST | /api/research/newsletters | ✅ v0.2 | `authorclaw_research_newsletters` (new) — find genre-appropriate newsletters. |
| POST | /api/research/podcasts | ✅ v0.2 | `authorclaw_research_podcasts` (new) — find author podcasts for a genre. |
| POST | /api/research/reviewers | ✅ v0.2 | `authorclaw_research_reviewers` (new) — find book reviewers for a genre. |

---

## Audio / TTS (5 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/audio/voices | ✅ v0.2 | `authorclaw_audio_voices` (new) — list all available TTS voices (Edge + ElevenLabs). |
| GET | /api/audio/voice | ⏭️ Skipped v0.2 | Returns current active voice only; covered by voices list. |
| POST | /api/audio/voice | ⏭️ Skipped v0.2 | Sets global default voice. Config operation; not a writing workflow step. |
| POST | /api/audio/generate | ✅ v0.2 | `authorclaw_audio_generate` (new) — generate TTS audio from text. |
| POST | /api/audio/config | ⏭️ Skipped v0.2 | Sets global TTS provider/voice. Config operation. |
| GET | /api/audio/file/:filename | ✅ v0.2 | `authorclaw_audio_get` (new) — retrieve a generated audio file URL. |

---

## Images (6 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/images/generate | ✅ v0.2 | `authorclaw_images_generate` (new) — generate any image from a text prompt. |
| POST | /api/images/book-cover | ✅ v0.2 | `authorclaw_images_book_cover` (new) — generate a single book cover image. |
| POST | /api/images/cover-set | ✅ v0.2 | `authorclaw_images_cover_set` (new) — generate the full set of standard cover sizes in one call. |
| GET | /api/images/cover-variants | ⏭️ Skipped v0.2 | Returns static spec list; not a tool — call internally if needed. |
| GET | /api/images/providers | ⏭️ Skipped v0.2 | Lists available image providers. Config introspection; not a writing workflow step. |
| GET | /api/images/:filename | ⏭️ Skipped v0.2 | Serves a generated image file. Images are referenced by URL in responses; no MCP tool needed. |

---

## Series (6 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/series | ✅ v0.2 | `authorclaw_series_list` (new) |
| POST | /api/series | ✅ v0.2 | `authorclaw_series_create` (new) |
| DELETE | /api/series/:id | ✅ v0.2 | `authorclaw_series_delete` (new) |
| GET | /api/series/:id/report | ✅ v0.2 | `authorclaw_series_report` (new) — build the series bible from linked projects. |
| POST | /api/series/:id/add-project | ⏭️ Skipped v0.2 | Fold into `authorclaw_series_create` and `authorclaw_series_report`; direct project management in v0.3. |
| POST | /api/series/:id/remove-project | ⏭️ Skipped v0.2 | Same as above. |
| POST | /api/series/:id/reading-order | ⏭️ Skipped v0.2 | Set reading order array. Fine-grained; v0.3. |

---

## Writing Judge (2 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/judge | ⏭️ Skipped v0.2 | Score arbitrary prose. Interesting but an internal quality gate; surfacing to MCP agents adds complexity without clear benefit for v0.2. Defer to v0.3. |
| GET | /api/judge/screen | ⏭️ Skipped v0.2 | Mechanical prose screen (no AI cost). Same reasoning as above. |

---

## Structures (3 endpoints)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/structures | ⏭️ Skipped v0.2 | Lists story structure frameworks. Covered internally by `structure-check`; not needed as standalone MCP tool. |
| POST | /api/structures/recommend | ⏭️ Skipped v0.2 | Recommend structure for a genre. Covered by `authorclaw_project_structure_check`. |
| POST | /api/structures/check-outline | ⏭️ Skipped v0.2 | Check a raw outline array. Use `authorclaw_project_structure_check` instead (reads from project). |

---

## Style Clone (1 standalone endpoint)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/style-clone/analyze | ⏭️ Skipped v0.2 | Analyze arbitrary pasted text for style profile. The project-scoped `authorclaw_project_style_clone` covers the primary use case. Document standalone in v0.3. |

---

## Beta Reader (1 standalone endpoint)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| GET | /api/beta-reader/archetypes | ⏭️ Skipped v0.2 | Lists available beta-reader archetypes. Not a workflow step; internal metadata. |

---

## Covers (1 endpoint)

| Method | Path | Disposition | Tool / Rationale |
|---|---|---|---|
| POST | /api/covers/apply-typography | ⏭️ Skipped v0.2 | Overlay title/author text on a cover PNG. Niche compositor step; v0.3. |

---

## Skipped Categories (v0.2)

### Vault (4 endpoints) — 🔒 Security

All `/api/vault/*` endpoints expose stored API keys (Anthropic, Gemini, DeepSeek, etc.). Wrapping these would let any MCP client read and modify credentials. Never expose via MCP.

| Method | Path | Rationale |
|---|---|---|
| POST | /api/vault | Stores an API key by name |
| GET | /api/vault/keys | Lists stored key names |
| DELETE | /api/vault/:key | Deletes a key |
| POST | /api/vault/load-from-files | Loads keys from shared folder files |

### Config (2 endpoints) — 🔒 Security

| Method | Path | Rationale |
|---|---|---|
| GET | /api/config | Returns internal config including cost limits, heartbeat intervals, security presets |
| POST | /api/config/update | Modifies live server config (AI provider, cost limits, Telegram, etc.) |

### Memory (5 endpoints) — ⏭️ Operator / Internal

Memory management is internal plumbing. Exposing reset/reindex to MCP agents risks data loss.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/memory/search | Full-text search over conversation history |
| GET | /api/memory/stats | Memory index statistics |
| POST | /api/memory/reset | Clears conversation memory |
| POST | /api/memory/reindex | Forces full reindex |
| GET | /api/memory/active-persona | Gets active persona for memory tagging |
| POST | /api/memory/active-persona | Sets active persona for memory tagging |

### Agent / Autonomous (10 endpoints) — ⏭️ Operator

Heartbeat / autonomous mode is a server-side scheduler. Not a writing workflow tool.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/agent/journal | Heartbeat journal log |
| GET | /api/agent/status | Autonomous agent status |
| GET | /api/autonomous/status | Same as above |
| POST | /api/autonomous/enable | Enable autonomous mode |
| POST | /api/autonomous/disable | Disable autonomous mode |
| POST | /api/autonomous/pause | Pause autonomous mode |
| POST | /api/autonomous/resume | Resume autonomous mode |
| POST | /api/autonomous/config | Update autonomous config |
| GET | /api/autonomous/idle-tasks | List idle task queue |
| PUT | /api/autonomous/idle-tasks | Replace idle task queue |
| POST | /api/autonomous/idle-tasks | Add idle task |
| DELETE | /api/autonomous/idle-tasks/:index | Delete idle task |
| GET | /api/autonomous/idle-tasks/history/:filename | Download idle task history file |

### Audit (1 endpoint) — 🔒 Security

| Method | Path | Rationale |
|---|---|---|
| GET | /api/audit | Returns last 50 audit log entries — internal security log; MCP exposure risks metadata leakage |

### Activity (2 endpoints) — ⏭️ Operator

| Method | Path | Rationale |
|---|---|---|
| GET | /api/activity | Activity feed |
| GET | /api/activity/stream | SSE activity stream — server-sent events; not usable from MCP tool paradigm |

### Author OS (2 endpoints) — ⏭️ Operator

| Method | Path | Rationale |
|---|---|---|
| GET | /api/author-os/status | Lists external tool status |
| POST | /api/author-os/format | Exports markdown to docx/html/txt — similar function to `authorclaw_files_export`; defer to v0.3 if distinct need arises |

### Backup (4 endpoints) — ⏭️ Operator

Dashboard concern. Snapshot/restore/list/delete are sysadmin operations.

| Method | Path | Rationale |
|---|---|---|
| POST | /api/backup/create | Create backup snapshot |
| GET | /api/backup/list | List backups |
| POST | /api/backup/restore/:id | Restore backup |
| DELETE | /api/backup/:id | Delete backup |

### Browser (1 endpoint) — ⏭️ Operator

| Method | Path | Rationale |
|---|---|---|
| GET | /api/browser/doctor | Diagnostic: which browser-automation planners are active |

### Workspace (2 endpoints) — ⏭️ Operator

| Method | Path | Rationale |
|---|---|---|
| GET | /api/workspace/stats | Workspace disk usage stats |
| DELETE | /api/workspace/clean | Deletes workspace subdirectory — destructive, no safe use in MCP context |

### Orchestrator (7 endpoints) — ⏭️ Operator

Script process manager. No writing-workflow relevance.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/orchestrator/status | Script status |
| GET | /api/orchestrator/scripts | List script configs |
| POST | /api/orchestrator/scripts | Add script config |
| POST | /api/orchestrator/scripts/:id/start | Start script |
| POST | /api/orchestrator/scripts/:id/stop | Stop script |
| POST | /api/orchestrator/scripts/:id/restart | Restart script |
| GET | /api/orchestrator/scripts/:id/logs | Script logs |
| DELETE | /api/orchestrator/scripts/:id | Delete script config |

### Cron (5 endpoints) — ⏭️ Operator

Scheduled job management. Not a writing-workflow tool.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/cron | List cron jobs |
| POST | /api/cron | Create cron job |
| PATCH | /api/cron/:id | Update cron job |
| DELETE | /api/cron/:id | Delete cron job |
| POST | /api/cron/:id/run-now | Run job immediately |
| POST | /api/cron/validate | Validate cron expression |

### Telegram (5 endpoints) — ⏭️ Operator

Telegram bridge management. Not a writing-workflow tool.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/telegram/status | Bridge status |
| POST | /api/telegram/connect | Connect bot |
| POST | /api/telegram/disconnect | Disconnect bot |
| POST | /api/telegram/test | Test token |
| POST | /api/telegram/users | Set allowed users |

### Goals (5 endpoints) — ⏭️ Broader scope / v0.3

Writing goals are potentially useful but have a wide data model. Defer to v0.3.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/goals | List author goals |
| POST | /api/goals | Create goal |
| POST | /api/goals/:id/progress | Update progress |
| POST | /api/goals/:id/status | Set goal status |
| DELETE | /api/goals/:id | Delete goal |

### Calendar (6 endpoints) — ⏭️ Broader scope / v0.3

Release calendar. Useful for launch management but distinct from core writing workflow.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/calendar | List events |
| POST | /api/calendar | Create event |
| POST | /api/calendar/price-pulse-plan | Generate price-pulse event set |
| PATCH | /api/calendar/:id | Update event |
| DELETE | /api/calendar/:id | Delete event |
| GET | /api/calendar/export.ics | Export ICS file |

### Launches (7 endpoints) — ⏭️ Broader scope / v0.3

Book launch orchestration. Wave 3 feature with confirmation gates; complex UX for v0.2.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/launches | List launches |
| POST | /api/launches | Create launch |
| GET | /api/launches/:id | Get launch + plan |
| PATCH | /api/launches/:id | Update metadata |
| POST | /api/launches/:id/acknowledge-disclosures | Acknowledge disclosures |
| POST | /api/launches/:id/propose-step | Propose a launch step |
| DELETE | /api/launches/:id | Delete launch |

### Confirmations (5 endpoints) — ⏭️ Operator / Wave 3 gate

Confirmation gate for irreversible Wave 3 actions. Internal plumbing; not a writing tool.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/confirmations | List confirmation requests |
| GET | /api/confirmations/:id | Get specific request |
| POST | /api/confirmations/:id/approve | Approve |
| POST | /api/confirmations/:id/reject | Reject |
| POST | /api/confirmations/:id/outcome | Record external outcome |

### Disclosures (2 endpoints) — ⏭️ Operator

AI disclosure compliance. Internal; not a writing-workflow tool.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/disclosures/universal | Get universal disclaimer text |
| POST | /api/disclosures/check | Check platform compliance |

### Sites / Websites (16 endpoints) — ⏭️ Broader scope / v0.3

Author website builder. Distinct product surface; not core writing workflow.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/websites | List website builder sites |
| POST | /api/websites/build | Build static site |
| GET | /api/sites | List site registry |
| GET | /api/sites/:siteId | Get site |
| POST | /api/sites | Create site |
| PATCH | /api/sites/:siteId | Update site |
| DELETE | /api/sites/:siteId | Delete site |
| POST | /api/sites/:siteId/link-project | Link project |
| POST | /api/sites/:siteId/unlink-project | Unlink project |
| POST | /api/sites/:siteId/books | Add book |
| DELETE | /api/sites/:siteId/books/:bookSlug | Remove book |
| POST | /api/sites/:siteId/blog-posts | Add blog post |
| DELETE | /api/sites/:siteId/blog-posts/:postSlug | Remove blog post |
| POST | /api/sites/:siteId/render | Render HTML |
| POST | /api/sites/:siteId/deploy | Deploy site |
| POST | /api/sites/:siteId/publish | Render + deploy |
| GET | /api/site-deploy/doctor | Deploy-target diagnostics |

### Blog Posts (1 endpoint) — ⏭️ Broader scope / v0.3

| Method | Path | Rationale |
|---|---|---|
| POST | /api/blog-posts/draft | AI-draft a blog post from a project |

### AMS Ads (2 endpoints) — ⏭️ Broader scope / v0.3

Amazon advertising. Wave 3 / launch workflow.

| Method | Path | Rationale |
|---|---|---|
| POST | /api/ams/propose-campaigns | Propose ad campaign structure |
| POST | /api/ams/optimize | Optimize existing campaigns |

### BookBub (1 endpoint) — ⏭️ Broader scope / v0.3

| Method | Path | Rationale |
|---|---|---|
| POST | /api/bookbub/draft | Draft BookBub Featured Deal submission |

### KDP (1 endpoint) — ⏭️ Broader scope / v0.3

| Method | Path | Rationale |
|---|---|---|
| POST | /api/kdp/export-blurb | Format KDP blurb HTML |

### Providers (1 endpoint) — 🔒 Security / Operator

| Method | Path | Rationale |
|---|---|---|
| POST | /api/providers/refresh | Re-initializes AI provider detection — touches vault; operator action |

### Track Changes (2 endpoints) — ⏭️ Niche / v0.3

DOCX roundtrip editor. Useful but requires complex multipart file workflow.

| Method | Path | Rationale |
|---|---|---|
| POST | /api/track-changes/parse | Upload and parse tracked-changes .docx |
| POST | /api/track-changes/apply | Apply accept/reject decisions |

### User Model (3 endpoints) — ⏭️ Internal / v0.3

Honcho-style author dialectic profile. Interesting but internal state management.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/user-model | Get current user model snapshot |
| POST | /api/user-model/consolidate | Force consolidation via AI |
| DELETE | /api/user-model | Reset user model |

### Preferences (4 endpoints) — ⏭️ Internal / v0.3

Per-author preference store.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/preferences | Get all preferences |
| POST | /api/preferences | Set a preference |
| DELETE | /api/preferences/:key | Delete a preference |
| DELETE | /api/preferences | Reset all preferences |

### Lessons (4 endpoints) — ⏭️ Internal / v0.3

Agent lessons store (from Sneakers pattern).

| Method | Path | Rationale |
|---|---|---|
| GET | /api/lessons | List lessons |
| POST | /api/lessons | Add lesson |
| POST | /api/lessons/:id/adjust | Adjust lesson confidence |
| DELETE | /api/lessons | Reset all lessons |

### Skill Drafts (4 endpoints) — ⏭️ Operator

Auto-generated SKILL.md review queue. Developer/operator tooling.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/skill-drafts | List skill drafts |
| GET | /api/skill-drafts/:id | Get draft |
| POST | /api/skill-drafts/:id/accept | Accept draft |
| POST | /api/skill-drafts/:id/reject | Reject draft |

### Tools Ingestion (2 endpoints) — ⏭️ Operator

Generate SKILL.md from source code. Developer tooling.

| Method | Path | Rationale |
|---|---|---|
| POST | /api/tools/ingest | AI-analyze code and generate SKILL.md |
| POST | /api/tools/ingest/save | Save generated SKILL.md |

### Translation (3 endpoints) — ⏭️ Broader scope / v0.3

Foreign rights pipeline. Distinct product surface.

| Method | Path | Rationale |
|---|---|---|
| POST | /api/translation/plan | Plan a translation budget across languages |
| POST | /api/translation/propose | Propose a single-language translation |
| POST | /api/translation/rights-pitch | Generate a rights-pitch letter |

### Video (2 endpoints) — ⏭️ Broader scope / v0.3

YouTube research tool.

| Method | Path | Rationale |
|---|---|---|
| GET | /api/video/doctor | Check yt-dlp availability |
| POST | /api/video/extract | Extract transcript + AI notes from a video URL |

### Reader Intel (1 endpoint) — ⏭️ Broader scope / v0.3

Review analysis.

| Method | Path | Rationale |
|---|---|---|
| POST | /api/reader-intel/analyze | Analyze Amazon/Goodreads reviews for reader sentiment |

---

## Endpoints Documented in ARCHITECTURE.md but Absent in v4.0.0

These were assumed in the original design doc but do not exist in the running gateway:

| Assumed endpoint | Actual endpoint | Notes |
|---|---|---|
| `GET /api/files` | `GET /api/documents` | Document library is at `/api/documents`, not `/api/files`. The `files_list` tool calls the correct endpoint as implemented. |
| `GET /api/files/:name` | `GET /api/projects/:id/download/:filename` | Project file download requires project ID. No generic `/api/files/:name` exists. |
| `POST /api/export` | `POST /api/projects/:id/export-docx` | Export is project-scoped. No standalone `/api/export` endpoint. |
| `POST /api/projects` (create) | `POST /api/projects/create` | The create endpoint is at `/create`, not the collection root. `POST /api/projects` does not exist. |
| `POST /api/projects/:id/stop` | `POST /api/projects/:id/pause` | No `/stop` endpoint. The client calls `/pause` correctly. The ARCHITECTURE.md client stub was wrong. |

---

## Summary Counts

| Category | Wrapped v0.1 | Wrapped v0.2 | Skipped | Security-skipped | Total |
|---|---|---|---|---|---|
| Documents | 1 | 2 | 0 | 0 | 3 |
| Chat | 1 | 0 | 0 | 0 | 1 |
| Health/Status | 1 | 0 | 3 | 0 | 4 |
| Projects | 8 | 15 | 20 | 0 | 43 (49 incl. sub-categories) |
| Pipeline | 0 | 0 | 2 | 0 | 2 |
| Personas | 0 | 7 | 0 | 0 | 7 |
| Research | 1 | 6 | 2 | 0 | 9 |
| Audio | 0 | 3 | 3 | 0 | 6 |
| Images | 0 | 3 | 3 | 0 | 6 |
| Series | 0 | 4 | 3 | 0 | 7 |
| Judge | 0 | 0 | 2 | 0 | 2 |
| Structures | 0 | 0 | 3 | 0 | 3 |
| Style Clone (standalone) | 0 | 0 | 1 | 0 | 1 |
| Beta Reader (standalone) | 0 | 0 | 1 | 0 | 1 |
| Covers (typography) | 0 | 0 | 1 | 0 | 1 |
| Vault | 0 | 0 | 0 | 4 | 4 |
| Config | 0 | 0 | 0 | 2 | 2 |
| Memory | 0 | 0 | 6 | 0 | 6 |
| Agent / Autonomous | 0 | 0 | 13 | 0 | 13 |
| Audit | 0 | 0 | 0 | 1 | 1 |
| Activity | 0 | 0 | 2 | 0 | 2 |
| Author OS | 0 | 0 | 2 | 0 | 2 |
| Backup | 0 | 0 | 4 | 0 | 4 |
| Browser | 0 | 0 | 1 | 0 | 1 |
| Workspace | 0 | 0 | 2 | 0 | 2 |
| Orchestrator | 0 | 0 | 8 | 0 | 8 |
| Cron | 0 | 0 | 6 | 0 | 6 |
| Telegram | 0 | 0 | 5 | 0 | 5 |
| Goals | 0 | 0 | 5 | 0 | 5 |
| Calendar | 0 | 0 | 6 | 0 | 6 |
| Launches | 0 | 0 | 7 | 0 | 7 |
| Confirmations | 0 | 0 | 5 | 0 | 5 |
| Disclosures | 0 | 0 | 2 | 0 | 2 |
| Sites / Websites | 0 | 0 | 17 | 0 | 17 |
| Blog Posts | 0 | 0 | 1 | 0 | 1 |
| AMS Ads | 0 | 0 | 2 | 0 | 2 |
| BookBub | 0 | 0 | 1 | 0 | 1 |
| KDP | 0 | 0 | 1 | 0 | 1 |
| Providers | 0 | 0 | 0 | 1 | 1 |
| Track Changes | 0 | 0 | 2 | 0 | 2 |
| User Model | 0 | 0 | 3 | 0 | 3 |
| Preferences | 0 | 0 | 4 | 0 | 4 |
| Lessons | 0 | 0 | 4 | 0 | 4 |
| Skill Drafts | 0 | 0 | 4 | 0 | 4 |
| Tools Ingestion | 0 | 0 | 2 | 0 | 2 |
| Translation | 0 | 0 | 3 | 0 | 3 |
| Video | 0 | 0 | 2 | 0 | 2 |
| Reader Intel | 0 | 0 | 1 | 0 | 1 |
| **TOTAL** | **12** | **40** | **166** | **8** | **231** |

**Endpoints wrapped (v0.1 + v0.2):** 52 of 231  
**Endpoints skipped (operator/niche/broader scope):** 166 of 231  
**Security-skipped:** 8 of 231  
**Nonexistent (assumed in ARCHITECTURE.md, absent in v4.0.0):** 5 assumed paths
