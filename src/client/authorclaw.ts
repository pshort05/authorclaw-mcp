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

  async chat(message: string): Promise<{ reply: string }> {
    const res = await fetch(`${this.base}/api/chat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw chat error: ${res.status}`);
    return (await res.json()) as { reply: string };
  }

  async createProject(task: string): Promise<{ id: string; steps: number }> {
    const res = await fetch(`${this.base}/api/projects`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ task }),
      signal: AbortSignal.timeout(config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw createProject error: ${res.status}`);
    return (await res.json()) as { id: string; steps: number };
  }

  async getProjectStatus(id: string): Promise<unknown> {
    const res = await fetch(`${this.base}/api/projects/${encodeURIComponent(id)}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`AuthorClaw getProjectStatus error: ${res.status}`);
    return await res.json();
  }

  async listProjects(): Promise<unknown[]> {
    const res = await fetch(`${this.base}/api/projects`, { headers: this.headers() });
    if (!res.ok) throw new Error(`AuthorClaw listProjects error: ${res.status}`);
    return (await res.json()) as unknown[];
  }

  async stopProject(id: string): Promise<void> {
    const res = await fetch(`${this.base}/api/projects/${encodeURIComponent(id)}/stop`, {
      method: 'POST',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`AuthorClaw stopProject error: ${res.status}`);
  }

  async listFiles(folder?: string): Promise<unknown[]> {
    const url = folder
      ? `${this.base}/api/files?folder=${encodeURIComponent(folder)}`
      : `${this.base}/api/files`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`AuthorClaw listFiles error: ${res.status}`);
    return (await res.json()) as unknown[];
  }

  async readFile(name: string): Promise<{ content: string }> {
    const res = await fetch(`${this.base}/api/files/${encodeURIComponent(name)}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`AuthorClaw readFile error: ${res.status}`);
    return (await res.json()) as { content: string };
  }

  async exportFile(name: string, format: 'docx' | 'html' | 'txt'): Promise<{ url: string }> {
    const res = await fetch(`${this.base}/api/export`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ name, format }),
    });
    if (!res.ok) throw new Error(`AuthorClaw exportFile error: ${res.status}`);
    return (await res.json()) as { url: string };
  }
}
