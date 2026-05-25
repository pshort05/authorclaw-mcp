import { describe, it, expect, vi } from 'vitest';
import { projectTools, dispatchProjectTool } from '../../tools/projects.js';

describe('project tools registration', () => {
  it('exposes the four project tools', () => {
    const names = projectTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_project_create',
      'authorclaw_project_status',
      'authorclaw_project_list',
      'authorclaw_project_stop',
    ]);
  });

  it('project_create schema requires task string', () => {
    const t = projectTools.find(t => t.name === 'authorclaw_project_create')!;
    expect(t.inputSchema.required).toContain('task');
    expect((t.inputSchema.properties as any).task.type).toBe('string');
  });

  it('project_status schema requires id string', () => {
    const t = projectTools.find(t => t.name === 'authorclaw_project_status')!;
    expect(t.inputSchema.required).toContain('id');
    expect((t.inputSchema.properties as any).id.type).toBe('string');
  });

  it('project_list schema has optional status enum', () => {
    const t = projectTools.find(t => t.name === 'authorclaw_project_list')!;
    expect(t.inputSchema.required || []).not.toContain('status');
    const status = (t.inputSchema.properties as any).status;
    expect(status.enum).toEqual(['running', 'complete', 'paused']);
  });

  it('project_stop schema requires id string', () => {
    const t = projectTools.find(t => t.name === 'authorclaw_project_stop')!;
    expect(t.inputSchema.required).toContain('id');
    expect((t.inputSchema.properties as any).id.type).toBe('string');
  });
});

describe('dispatchProjectTool', () => {
  it('project_create calls client.createProject and returns id+steps as text', async () => {
    const client = {
      createProject: vi.fn().mockResolvedValue({ id: 'p1', steps: 5 }),
    } as any;
    const out = await dispatchProjectTool('authorclaw_project_create', { task: 'write' }, client);
    expect(client.createProject).toHaveBeenCalledWith('write');
    expect(out.content[0].text).toContain('p1');
    expect(out.content[0].text).toContain('5');
  });

  it('project_status calls client.getProjectStatus and returns JSON text', async () => {
    const client = {
      getProjectStatus: vi.fn().mockResolvedValue({ status: 'running', step: 3 }),
    } as any;
    const out = await dispatchProjectTool('authorclaw_project_status', { id: 'p1' }, client);
    expect(client.getProjectStatus).toHaveBeenCalledWith('p1');
    expect(JSON.parse(out.content[0].text)).toEqual({ status: 'running', step: 3 });
  });

  it('project_list calls client.listProjects and returns JSON text', async () => {
    const client = { listProjects: vi.fn().mockResolvedValue([{ id: 'p1' }]) } as any;
    const out = await dispatchProjectTool('authorclaw_project_list', {}, client);
    expect(client.listProjects).toHaveBeenCalled();
    expect(JSON.parse(out.content[0].text)).toEqual([{ id: 'p1' }]);
  });

  it('project_list filters by status when provided', async () => {
    const client = {
      listProjects: vi.fn().mockResolvedValue([
        { id: 'p1', status: 'running' },
        { id: 'p2', status: 'complete' },
      ]),
    } as any;
    const out = await dispatchProjectTool('authorclaw_project_list', { status: 'running' }, client);
    const parsed = JSON.parse(out.content[0].text);
    expect(parsed).toEqual([{ id: 'p1', status: 'running' }]);
  });

  it('project_stop calls client.stopProject and returns confirmation text', async () => {
    const client = { stopProject: vi.fn().mockResolvedValue(undefined) } as any;
    const out = await dispatchProjectTool('authorclaw_project_stop', { id: 'p1' }, client);
    expect(client.stopProject).toHaveBeenCalledWith('p1');
    expect(out.content[0].text).toMatch(/stopped/i);
  });

  it('validates task is required for project_create', async () => {
    const client = { createProject: vi.fn() } as any;
    await expect(
      dispatchProjectTool('authorclaw_project_create', {}, client),
    ).rejects.toThrow(/task/);
    expect(client.createProject).not.toHaveBeenCalled();
  });

  it('validates id is required for project_status', async () => {
    const client = { getProjectStatus: vi.fn() } as any;
    await expect(
      dispatchProjectTool('authorclaw_project_status', {}, client),
    ).rejects.toThrow(/id/);
    expect(client.getProjectStatus).not.toHaveBeenCalled();
  });

  it('validates id is required for project_stop', async () => {
    const client = { stopProject: vi.fn() } as any;
    await expect(
      dispatchProjectTool('authorclaw_project_stop', {}, client),
    ).rejects.toThrow(/id/);
    expect(client.stopProject).not.toHaveBeenCalled();
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchProjectTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });
});
