import { describe, it, expect, vi } from 'vitest';
import {
  projectWritingTools,
  dispatchProjectWritingTool,
} from '../../tools/project-writing.js';

// ── Registration ───────────────────────────────────────────────────────────

describe('projectWritingTools registration', () => {
  it('exposes all 19 project-writing tool names', () => {
    const names = projectWritingTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_project_execute',
      'authorclaw_project_run',
      'authorclaw_project_resume',
      'authorclaw_project_restart',
      'authorclaw_project_compile',
      'authorclaw_project_continuity_check',
      'authorclaw_project_continuity_report',
      'authorclaw_project_structure_check',
      'authorclaw_project_style_clone',
      'authorclaw_project_pacing_heatmap',
      'authorclaw_project_format_pro',
      'authorclaw_project_craft_critique',
      'authorclaw_project_dialogue_audit',
      'authorclaw_project_beta_reader',
      'authorclaw_project_cover_set',
      'authorclaw_plot_promises_list',
      'authorclaw_plot_promises_add',
      'authorclaw_plot_promises_extract',
      'authorclaw_plot_promises_audit',
    ]);
  });
});

// ── Dispatch — per-tool routing ────────────────────────────────────────────

describe('dispatchProjectWritingTool', () => {
  it('authorclaw_project_execute calls executeProjectStep and returns JSON', async () => {
    const client = {
      executeProjectStep: vi.fn().mockResolvedValue({ success: true, completedStep: 'outline' }),
    } as any;
    const out = await dispatchProjectWritingTool('authorclaw_project_execute', { id: 'p1' }, client);
    expect(client.executeProjectStep).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ success: true, completedStep: 'outline' });
  });

  it('authorclaw_project_run calls runProject and returns JSON', async () => {
    const client = {
      runProject: vi.fn().mockResolvedValue({ success: true, results: [] }),
    } as any;
    const out = await dispatchProjectWritingTool('authorclaw_project_run', { id: 'p1' }, client);
    expect(client.runProject).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ success: true, results: [] });
  });

  it('authorclaw_project_resume calls resumeProject and returns JSON', async () => {
    const client = {
      resumeProject: vi.fn().mockResolvedValue({ resumed: true, status: 'running' }),
    } as any;
    const out = await dispatchProjectWritingTool('authorclaw_project_resume', { id: 'p1' }, client);
    expect(client.resumeProject).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ resumed: true, status: 'running' });
  });

  it('authorclaw_project_restart calls restartProject with no opts when keep_completed omitted', async () => {
    const client = {
      restartProject: vi.fn().mockResolvedValue({ restarted: true }),
    } as any;
    const out = await dispatchProjectWritingTool('authorclaw_project_restart', { id: 'p1' }, client);
    expect(client.restartProject).toHaveBeenCalledWith('p1', undefined);
    expect(JSON.parse(out.content[0].text)).toEqual({ restarted: true });
  });

  it('authorclaw_project_restart passes keepCompleted when provided', async () => {
    const client = {
      restartProject: vi.fn().mockResolvedValue({ restarted: true }),
    } as any;
    await dispatchProjectWritingTool(
      'authorclaw_project_restart',
      { id: 'p1', keep_completed: true },
      client,
    );
    expect(client.restartProject).toHaveBeenCalledWith('p1', { keepCompleted: true });
  });

  it('authorclaw_project_compile calls compileProject and returns JSON', async () => {
    const client = {
      compileProject: vi.fn().mockResolvedValue({ success: true, totalWords: 80000 }),
    } as any;
    const out = await dispatchProjectWritingTool('authorclaw_project_compile', { id: 'p1' }, client);
    expect(client.compileProject).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ success: true, totalWords: 80000 });
  });

  it('authorclaw_project_continuity_check calls startContinuityCheck and returns JSON', async () => {
    const client = {
      startContinuityCheck: vi.fn().mockResolvedValue({ status: 'started', projectId: 'p1' }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_continuity_check',
      { id: 'p1' },
      client,
    );
    expect(client.startContinuityCheck).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ status: 'started', projectId: 'p1' });
  });

  it('authorclaw_project_continuity_report calls getContinuityReport and returns JSON', async () => {
    const client = {
      getContinuityReport: vi.fn().mockResolvedValue({ report: { issues: [] } }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_continuity_report',
      { id: 'p1' },
      client,
    );
    expect(client.getContinuityReport).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ report: { issues: [] } });
  });

  it('authorclaw_project_structure_check calls structureCheck with optional opts', async () => {
    const client = {
      structureCheck: vi.fn().mockResolvedValue({ recommendation: 'Save the Cat' }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_structure_check',
      { id: 'p1', genre: 'thriller' },
      client,
    );
    expect(client.structureCheck).toHaveBeenCalledWith('p1', { genre: 'thriller' });
    expect(JSON.parse(out.content[0].text)).toEqual({ recommendation: 'Save the Cat' });
  });

  it('authorclaw_project_style_clone calls styleClone and returns JSON', async () => {
    const client = {
      styleClone: vi.fn().mockResolvedValue({ profile: { avgSentenceLen: 14.2 } }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_style_clone',
      { id: 'p1' },
      client,
    );
    expect(client.styleClone).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ profile: { avgSentenceLen: 14.2 } });
  });

  it('authorclaw_project_pacing_heatmap calls pacingHeatmap and returns JSON', async () => {
    const client = {
      pacingHeatmap: vi.fn().mockResolvedValue({ tension: [0.3, 0.7, 0.9] }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_pacing_heatmap',
      { id: 'p1' },
      client,
    );
    expect(client.pacingHeatmap).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ tension: [0.3, 0.7, 0.9] });
  });

  it('authorclaw_project_format_pro calls formatPro with output_format mapped to outputFormat', async () => {
    const client = {
      formatPro: vi.fn().mockResolvedValue({ file: 'manuscript.epub' }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_format_pro',
      { id: 'p1', output_format: 'epub', author: 'Jane Doe' },
      client,
    );
    expect(client.formatPro).toHaveBeenCalledWith('p1', {
      outputFormat: 'epub',
      author: 'Jane Doe',
    });
    expect(JSON.parse(out.content[0].text)).toEqual({ file: 'manuscript.epub' });
  });

  it('authorclaw_project_craft_critique calls craftCritique and returns JSON', async () => {
    const client = {
      craftCritique: vi.fn().mockResolvedValue({ adverbDensity: 0.02 }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_craft_critique',
      { id: 'p1' },
      client,
    );
    expect(client.craftCritique).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ adverbDensity: 0.02 });
  });

  it('authorclaw_project_dialogue_audit calls dialogueAudit and returns JSON', async () => {
    const client = {
      dialogueAudit: vi.fn().mockResolvedValue({ report: { issues: 3 } }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_dialogue_audit',
      { id: 'p1' },
      client,
    );
    expect(client.dialogueAudit).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ report: { issues: 3 } });
  });

  it('authorclaw_project_beta_reader calls betaReader without archetypes when omitted', async () => {
    const client = {
      betaReader: vi.fn().mockResolvedValue({ status: 'started' }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_beta_reader',
      { id: 'p1' },
      client,
    );
    expect(client.betaReader).toHaveBeenCalledWith('p1', undefined);
    expect(JSON.parse(out.content[0].text)).toEqual({ status: 'started' });
  });

  it('authorclaw_project_beta_reader passes archetypes when provided', async () => {
    const client = {
      betaReader: vi.fn().mockResolvedValue({ status: 'started' }),
    } as any;
    await dispatchProjectWritingTool(
      'authorclaw_project_beta_reader',
      { id: 'p1', archetypes: ['romance-reader', 'thriller-fan'] },
      client,
    );
    expect(client.betaReader).toHaveBeenCalledWith('p1', ['romance-reader', 'thriller-fan']);
  });

  it('authorclaw_project_cover_set calls projectCoverSet with optional fields', async () => {
    const client = {
      projectCoverSet: vi.fn().mockResolvedValue({ variants: [] }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_project_cover_set',
      { id: 'p1', genre: 'thriller', mood: 'dark' },
      client,
    );
    expect(client.projectCoverSet).toHaveBeenCalledWith('p1', { genre: 'thriller', mood: 'dark' });
    expect(JSON.parse(out.content[0].text)).toEqual({ variants: [] });
  });

  it('authorclaw_plot_promises_list calls listPlotPromises and returns JSON', async () => {
    const client = {
      listPlotPromises: vi.fn().mockResolvedValue({ promises: [] }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_plot_promises_list',
      { id: 'p1' },
      client,
    );
    expect(client.listPlotPromises).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ promises: [] });
  });

  it('authorclaw_plot_promises_add calls addPlotPromise with required and optional fields', async () => {
    const client = {
      addPlotPromise: vi.fn().mockResolvedValue({ id: 'pp1', title: 'The locked door' }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_plot_promises_add',
      {
        id: 'p1',
        title: 'The locked door',
        description: 'A room no one is allowed to enter',
        category: 'plot',
        introduced_at_chapter: 2,
      },
      client,
    );
    expect(client.addPlotPromise).toHaveBeenCalledWith('p1', {
      title: 'The locked door',
      description: 'A room no one is allowed to enter',
      category: 'plot',
      introducedAtChapter: 2,
    });
    expect(JSON.parse(out.content[0].text)).toEqual({ id: 'pp1', title: 'The locked door' });
  });

  it('authorclaw_plot_promises_extract calls extractPlotPromises with optional opening_text', async () => {
    const client = {
      extractPlotPromises: vi.fn().mockResolvedValue({ extracted: 3 }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_plot_promises_extract',
      { id: 'p1', opening_text: 'Chapter 1 text here...' },
      client,
    );
    expect(client.extractPlotPromises).toHaveBeenCalledWith('p1', {
      openingText: 'Chapter 1 text here...',
    });
    expect(JSON.parse(out.content[0].text)).toEqual({ extracted: 3 });
  });

  it('authorclaw_plot_promises_audit calls auditPlotPromises with optional params', async () => {
    const client = {
      auditPlotPromises: vi.fn().mockResolvedValue({ atRisk: 2 }),
    } as any;
    const out = await dispatchProjectWritingTool(
      'authorclaw_plot_promises_audit',
      { id: 'p1', progress_pct: 75, risk_threshold: 80 },
      client,
    );
    expect(client.auditPlotPromises).toHaveBeenCalledWith('p1', 75, 80);
    expect(JSON.parse(out.content[0].text)).toEqual({ atRisk: 2 });
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('throws when id is missing', async () => {
    const client = {} as any;
    await expect(
      dispatchProjectWritingTool('authorclaw_project_execute', {}, client),
    ).rejects.toThrow(/id is required/);
  });

  it('throws when title is missing for plot_promises_add', async () => {
    const client = {} as any;
    await expect(
      dispatchProjectWritingTool(
        'authorclaw_plot_promises_add',
        { id: 'p1', description: 'some desc' },
        client,
      ),
    ).rejects.toThrow(/title is required/);
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(
      dispatchProjectWritingTool('authorclaw_no_such_tool', { id: 'p1' }, client),
    ).rejects.toThrow(/unknown project-writing tool/);
  });
});
