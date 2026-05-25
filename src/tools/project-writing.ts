import type { AuthorClawClient } from '../client/authorclaw.js';

export const projectWritingTools = [
  // ── Project Lifecycle ──────────────────────────────────────────────────────
  {
    name: 'authorclaw_project_execute',
    description:
      'Execute the currently active step in a project. Returns the AI response and the next pending step. Call authorclaw_project_status first to confirm there is an active step.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_run',
    description:
      'Fully autonomous execution: run ALL pending steps sequentially until the project completes or is paused. May take many minutes for novel pipelines. Returns a results list with per-step word counts.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_resume',
    description:
      'Re-activate a paused or stuck project by promoting the next pending step to active. Use when a project shows remaining steps but status is "paused" or "completed" prematurely.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_restart',
    description:
      'Reset a project so failed or active steps become pending again. Optionally keep completed steps intact.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        keep_completed: {
          type: 'boolean',
          description:
            'If true, only reset failed/active steps; leave completed steps intact. Default: false.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_compile',
    description:
      'Compile all completed chapter or step outputs into a single manuscript file. Exports manuscript.md, manuscript.docx, and manuscript.epub (or compiled-output.* for non-chapter projects).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  // ── Editorial Analysis ─────────────────────────────────────────────────────
  {
    name: 'authorclaw_project_continuity_check',
    description:
      'Run an asynchronous continuity check over the project context (character names, timelines, entity facts). Responds immediately with { status: "started" }. The full report is retrievable with authorclaw_project_continuity_report once complete.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_continuity_report',
    description:
      'Retrieve the stored continuity report for a project. Returns null if the check has not completed yet.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_structure_check',
    description:
      "Compare the project outline against story structure frameworks (Hero's Journey, Save the Cat, etc.) and get structure recommendations for the genre.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        structure_id: {
          type: 'string',
          description: 'Optional: specific structure ID to check against',
        },
        genre: {
          type: 'string',
          description: 'Optional: override the project genre for recommendation',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_style_clone',
    description:
      "Analyze the project's completed chapters to extract a style fingerprint (sentence length, dialogue ratio, vocabulary richness, genre markers). Useful for maintaining consistent voice across a series.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_pacing_heatmap',
    description:
      'Run a manuscript autopsy on completed chapters: tension curve, scene-type distribution, pacing analysis. Requires at least one completed writing-phase chapter.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_format_pro',
    description:
      'Format the project manuscript using the professional formatter. Outputs docx, epub, pdf, or md.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        output_format: {
          type: 'string',
          enum: ['docx', 'epub', 'pdf', 'md'],
          description: 'Output format (default: docx)',
        },
        author: { type: 'string', description: 'Author name for document metadata' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_craft_critique',
    description:
      "Run a mechanical craft critique over completed chapters: show-don't-tell ratio, adverb density, passive voice, dialogue attribution, filtering, cliches.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_dialogue_audit',
    description:
      'Audit dialogue across the entire manuscript for authenticity issues: attribution variety, dialogue tags, subtext, character voice consistency.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_beta_reader',
    description:
      'Run a simulated beta-reader panel over completed chapters. Returns { status: "started" } immediately; the full panel report is available via authorclaw_project_beta_reader_report once complete.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        archetypes: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional list of beta-reader archetype names to use. Omit to use all defaults.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_beta_reader_report',
    description:
      'Get the most recent beta-reader panel report for a project. Pair with authorclaw_project_beta_reader, which starts the check.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'authorclaw_project_cover_set',
    description:
      'Generate a full set of standard cover sizes (ebook, print, audiobook, social) for a project using the project title, author (from linked persona), and genre. Optionally override any field.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        description: {
          type: 'string',
          description: 'Visual brief for the cover (required if not inferrable from project)',
        },
        genre: { type: 'string', description: 'Override genre' },
        mood: {
          type: 'string',
          description: 'Mood/tone keywords, e.g. "dark, atmospheric, thriller"',
        },
        style: {
          type: 'string',
          description: 'Art style, e.g. "photorealistic", "painterly", "minimalist"',
        },
      },
      required: ['id'],
    },
  },
  // ── Plot Promises ──────────────────────────────────────────────────────────
  {
    name: 'authorclaw_plot_promises_list',
    description:
      'List all plot promises (Sanderson-style promise + payoff tracking) for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_plot_promises_add',
    description: 'Manually add a plot promise to a project.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        title: {
          type: 'string',
          description: 'Short name for the promise, e.g. "The locked room mystery"',
        },
        description: { type: 'string', description: 'Full description of the promise' },
        category: {
          type: 'string',
          description: 'Category: character, plot, world, theme, or other',
        },
        introduced_at_chapter: {
          type: 'number',
          description: 'Chapter number where promise is introduced',
        },
      },
      required: ['id', 'title', 'description'],
    },
  },
  {
    name: 'authorclaw_plot_promises_extract',
    description:
      "Use AI to extract plot promises from the project's opening chapters (or provided text). Merges results into the existing promise list by default.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        opening_text: {
          type: 'string',
          description:
            'Optional: provide opening chapter text directly instead of reading from completed project steps',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_plot_promises_audit',
    description:
      'Audit plot promises for risk: identifies open promises that are unlikely to be paid off given the current project progress. Returns a risk-flagged list.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' },
        progress_pct: {
          type: 'number',
          description:
            'Current story progress percentage (0-100). Defaults to project progress.',
        },
        risk_threshold: {
          type: 'number',
          description:
            'Progress percentage at which open promises are flagged as at-risk. Default: 80.',
        },
      },
      required: ['id'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchProjectWritingTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_project_execute') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.executeProjectStep(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_run') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.runProject(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_resume') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.resumeProject(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_restart') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const keepCompleted =
      typeof args.keep_completed === 'boolean' ? args.keep_completed : undefined;
    const result = await client.restartProject(id, keepCompleted !== undefined ? { keepCompleted } : undefined);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_compile') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.compileProject(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_continuity_check') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.startContinuityCheck(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_continuity_report') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.getContinuityReport(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_structure_check') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const opts: { structureId?: string; genre?: string; subgenre?: string } = {};
    if (typeof args.structure_id === 'string') opts.structureId = args.structure_id;
    if (typeof args.genre === 'string') opts.genre = args.genre;
    if (typeof args.subgenre === 'string') opts.subgenre = args.subgenre;
    const result = await client.structureCheck(id, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_style_clone') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.styleClone(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_pacing_heatmap') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.pacingHeatmap(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_format_pro') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const opts: { outputFormat?: string; author?: string; trimSize?: string } = {};
    if (typeof args.output_format === 'string') opts.outputFormat = args.output_format;
    if (typeof args.author === 'string') opts.author = args.author;
    if (typeof args.trim_size === 'string') opts.trimSize = args.trim_size;
    const result = await client.formatPro(id, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_craft_critique') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.craftCritique(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_dialogue_audit') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.dialogueAudit(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_beta_reader_report') {
    const projectId = args.project_id;
    if (typeof projectId !== 'string') throw new Error('project_id is required');
    const result = await client.getBetaReaderReport(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_beta_reader') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const archetypes = Array.isArray(args.archetypes)
      ? (args.archetypes as string[])
      : undefined;
    const result = await client.betaReader(id, archetypes);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_project_cover_set') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const opts: Record<string, unknown> = {};
    if (typeof args.description === 'string') opts.description = args.description;
    if (typeof args.genre === 'string') opts.genre = args.genre;
    if (typeof args.mood === 'string') opts.mood = args.mood;
    if (typeof args.style === 'string') opts.style = args.style;
    const result = await client.projectCoverSet(id, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_plot_promises_list') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.listPlotPromises(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_plot_promises_add') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const title = args.title;
    if (typeof title !== 'string') throw new Error('title is required');
    const description = args.description;
    if (typeof description !== 'string') throw new Error('description is required');
    const data: {
      title: string;
      description: string;
      category?: string;
      introducedAtChapter?: number;
    } = { title, description };
    if (typeof args.category === 'string') data.category = args.category;
    if (typeof args.introduced_at_chapter === 'number')
      data.introducedAtChapter = args.introduced_at_chapter;
    const result = await client.addPlotPromise(id, data);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_plot_promises_extract') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const opts: { openingText?: string; merge?: boolean } = {};
    if (typeof args.opening_text === 'string') opts.openingText = args.opening_text;
    const result = await client.extractPlotPromises(id, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_plot_promises_audit') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const progress =
      typeof args.progress_pct === 'number' ? args.progress_pct : undefined;
    const riskThreshold =
      typeof args.risk_threshold === 'number' ? args.risk_threshold : undefined;
    const result = await client.auditPlotPromises(id, progress, riskThreshold);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  throw new Error(`unknown project-writing tool: ${name}`);
}
