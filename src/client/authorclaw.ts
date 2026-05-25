// Uses Node 22 built-in fetch
import { config } from '../config.js';

export class AuthorClawClient {
  private base: string;
  private token: string;

  constructor(url = config.authorclaw.url, token = config.authorclaw.token) {
    this.base = url.replace(/\/$/, '');
    this.token = token;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async chat(message: string): Promise<{ response: string }> {
    const res = await fetch(`${this.base}/api/chat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw chat error: ${res.status}`);
    return (await res.json()) as { response: string };
  }

  async createProject(title: string, description: string): Promise<{ project: unknown }> {
    const res = await fetch(`${this.base}/api/projects/create`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ title, description }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw createProject error: ${res.status}`);
    return (await res.json()) as { project: unknown };
  }

  async getProjectStatus(id: string): Promise<unknown> {
    const res = await fetch(`${this.base}/api/projects/${encodeURIComponent(id)}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`AuthorClaw getProjectStatus error: ${res.status}`);
    return await res.json();
  }

  async listProjects(): Promise<unknown[]> {
    const res = await fetch(`${this.base}/api/projects/list`, { headers: this.headers() });
    if (!res.ok) throw new Error(`AuthorClaw listProjects error: ${res.status}`);
    const body = (await res.json()) as { projects: unknown[] };
    return body.projects;
  }

  async stopProject(id: string): Promise<void> {
    const res = await fetch(`${this.base}/api/projects/${encodeURIComponent(id)}/pause`, {
      method: 'POST',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`AuthorClaw stopProject error: ${res.status}`);
  }

  async listFiles(): Promise<unknown[]> {
    const res = await fetch(`${this.base}/api/documents`, { headers: this.headers() });
    if (!res.ok) throw new Error(`AuthorClaw listFiles error: ${res.status}`);
    const body = (await res.json()) as { documents: unknown[] };
    return body.documents;
  }

  async readFile(projectId: string, filename: string): Promise<NodeJS.ReadableStream> {
    const res = await fetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/download/${encodeURIComponent(filename)}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`AuthorClaw readFile error: ${res.status}`);
    if (!res.body) throw new Error('AuthorClaw readFile: response body is null');
    return res.body as unknown as NodeJS.ReadableStream;
  }

  async exportDocx(projectId: string, filename: string): Promise<{ downloadUrl: string }> {
    const res = await fetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/export-docx`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ filename }),
      },
    );
    if (!res.ok) throw new Error(`AuthorClaw exportDocx error: ${res.status}`);
    return (await res.json()) as { downloadUrl: string };
  }

  async research(query: string): Promise<{ results: unknown[]; totalFound: number; error?: string }> {
    const res = await fetch(`${this.base}/api/research`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw research error: ${res.status}`);
    return (await res.json()) as { results: unknown[]; totalFound: number; error?: string };
  }

  async health(): Promise<{ status: string }> {
    const res = await fetch(`${this.base}/api/health`, { headers: this.headers() });
    if (!res.ok) throw new Error(`AuthorClaw health error: ${res.status}`);
    return (await res.json()) as { status: string };
  }
}
