// Uses Node 22 built-in fetch
import { config } from '../config.js';

export class AuthorClawClient {
  private base: string;
  private token: string;
  private timeoutMs: number | undefined;

  constructor(
    url = config.authorclaw.url,
    token = config.authorclaw.token,
    timeoutMs?: number,
  ) {
    this.base = url.replace(/\/$/, '');
    this.token = token;
    this.timeoutMs = timeoutMs;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  /**
   * Fetch wrapper that always applies the configured timeout and merges headers.
   * Every HTTP call in this file goes through here so timeout coverage is uniform.
   *
   * When `userSignal` is supplied (e.g. from an AbortController for task cancellation),
   * both signals race: whichever fires first aborts the request.
   */
  private async timedFetch(
    url: string,
    init?: RequestInit & { userSignal?: AbortSignal },
  ): Promise<Response> {
    const { userSignal, ...rest } = init ?? {};
    const timeoutSig = AbortSignal.timeout(this.timeoutMs ?? config.authorclaw.timeoutMs);
    // AbortSignal.any() is available since Node 20.3 / undici 5.27.
    // Fall back to timeout-only when the runtime does not support it.
    const signal =
      userSignal && typeof (AbortSignal as unknown as Record<string, unknown>).any === 'function'
        ? (AbortSignal as unknown as { any: (s: AbortSignal[]) => AbortSignal }).any([
            userSignal,
            timeoutSig,
          ])
        : userSignal ?? timeoutSig;
    return fetch(url, {
      ...rest,
      headers: { ...this.headers(), ...(rest.headers ?? {}) },
      signal,
    });
  }

  async chat(message: string, userSignal?: AbortSignal): Promise<{ response: string }> {
    const res = await this.timedFetch(`${this.base}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
      userSignal,
    });
    if (!res.ok) throw new Error(`AuthorClaw chat error: ${res.status}`);
    return (await res.json()) as { response: string };
  }

  async createProject(title: string, description: string): Promise<{ project: unknown }> {
    const res = await this.timedFetch(`${this.base}/api/projects/create`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error(`AuthorClaw createProject error: ${res.status}`);
    return (await res.json()) as { project: unknown };
  }

  async getProjectStatus(id: string): Promise<unknown> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`AuthorClaw getProjectStatus error: ${res.status}`);
    return await res.json();
  }

  async listProjects(): Promise<unknown[]> {
    const res = await this.timedFetch(`${this.base}/api/projects/list`);
    if (!res.ok) throw new Error(`AuthorClaw listProjects error: ${res.status}`);
    const body = (await res.json()) as { projects: unknown[] };
    return body.projects;
  }

  async stopProject(id: string): Promise<void> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/pause`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw stopProject error: ${res.status}`);
  }

  async listFiles(): Promise<unknown[]> {
    const res = await this.timedFetch(`${this.base}/api/documents`);
    if (!res.ok) throw new Error(`AuthorClaw listFiles error: ${res.status}`);
    const body = (await res.json()) as { documents: unknown[] };
    return body.documents;
  }

  async readFile(projectId: string, filename: string): Promise<NodeJS.ReadableStream> {
    const res = await this.timedFetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/download/${encodeURIComponent(filename)}`,
    );
    if (!res.ok) throw new Error(`AuthorClaw readFile error: ${res.status}`);
    if (!res.body) throw new Error('AuthorClaw readFile: response body is null');
    return res.body as unknown as NodeJS.ReadableStream;
  }

  async exportDocx(projectId: string, filename: string): Promise<{ downloadUrl: string }> {
    const res = await this.timedFetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/export-docx`,
      {
        method: 'POST',
        body: JSON.stringify({ filename }),
      },
    );
    if (!res.ok) throw new Error(`AuthorClaw exportDocx error: ${res.status}`);
    return (await res.json()) as { downloadUrl: string };
  }

  async research(query: string): Promise<{ results: unknown[]; totalFound: number; error?: string }> {
    const res = await this.timedFetch(`${this.base}/api/research`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`AuthorClaw research error: ${res.status}`);
    return (await res.json()) as { results: unknown[]; totalFound: number; error?: string };
  }

  async health(): Promise<{ status: string }> {
    const res = await this.timedFetch(`${this.base}/api/health`);
    if (!res.ok) throw new Error(`AuthorClaw health error: ${res.status}`);
    return (await res.json()) as { status: string };
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  async uploadDocument(file: Buffer, filename: string): Promise<object> {
    const form = new FormData();
    form.append('file', new Blob([file]), filename);
    // FormData sets Content-Type + boundary automatically; pass only auth header.
    const authHeaders: Record<string, string> = {};
    if (this.token) authHeaders.Authorization = `Bearer ${this.token}`;
    // timedFetch would add Content-Type: application/json which breaks multipart.
    // Call fetch directly here with only the auth header + timeout signal.
    const res = await fetch(`${this.base}/api/documents/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs ?? config.authorclaw.timeoutMs),
    });
    if (!res.ok) throw new Error(`AuthorClaw uploadDocument error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async deleteDocument(filename: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`AuthorClaw deleteDocument error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  // ── Project Writing ────────────────────────────────────────────────────────

  async executeProjectStep(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/execute`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw executeProjectStep error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async runProject(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/auto-execute`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw runProject error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async resumeProject(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/resume`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw resumeProject error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async restartProject(
    id: string,
    opts?: { keepCompleted?: boolean; deleteOutputFiles?: boolean },
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/restart`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
    if (!res.ok) throw new Error(`AuthorClaw restartProject error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async compileProject(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/compile`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw compileProject error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async startContinuityCheck(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/continuity-check`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw startContinuityCheck error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async getContinuityReport(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/continuity-report`);
    if (!res.ok) throw new Error(`AuthorClaw getContinuityReport error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async structureCheck(
    id: string,
    opts?: { structureId?: string; genre?: string; subgenre?: string; outline?: string },
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/structure-check`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
    if (!res.ok) throw new Error(`AuthorClaw structureCheck error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async styleClone(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/style-clone`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw styleClone error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async pacingHeatmap(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/pacing-heatmap`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw pacingHeatmap error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async formatPro(
    id: string,
    opts?: { outputFormat?: string; author?: string; trimSize?: string },
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/format-pro`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
    if (!res.ok) throw new Error(`AuthorClaw formatPro error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async craftCritique(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/craft-critique`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw craftCritique error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async dialogueAudit(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/dialogue-audit`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`AuthorClaw dialogueAudit error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async betaReader(id: string, archetypes?: string[]): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/beta-reader`, {
      method: 'POST',
      body: JSON.stringify(archetypes ? { archetypes } : {}),
    });
    if (!res.ok) throw new Error(`AuthorClaw betaReader error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async getBetaReaderReport(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/beta-reader/report`);
    if (!res.ok) throw new Error(`AuthorClaw getBetaReaderReport error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async projectCoverSet(id: string, opts?: Record<string, unknown>): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/projects/${encodeURIComponent(id)}/cover-set`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
    if (!res.ok) throw new Error(`AuthorClaw projectCoverSet error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  // ── Plot Promises ──────────────────────────────────────────────────────────

  async listPlotPromises(projectId: string): Promise<object> {
    const res = await this.timedFetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/plot-promises`,
    );
    if (!res.ok) throw new Error(`AuthorClaw listPlotPromises error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async addPlotPromise(
    projectId: string,
    data: {
      title: string;
      description: string;
      category?: string;
      introducedAtChapter?: number;
      confidence?: number;
      status?: string;
      authorNotes?: string;
    },
  ): Promise<object> {
    const res = await this.timedFetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/plot-promises`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error(`AuthorClaw addPlotPromise error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async extractPlotPromises(
    projectId: string,
    opts?: { openingText?: string; merge?: boolean },
  ): Promise<object> {
    const res = await this.timedFetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/plot-promises/extract`,
      {
        method: 'POST',
        body: JSON.stringify(opts || {}),
      },
    );
    if (!res.ok) throw new Error(`AuthorClaw extractPlotPromises error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async auditPlotPromises(
    projectId: string,
    progress?: number,
    riskThreshold?: number,
  ): Promise<object> {
    const params = new URLSearchParams();
    if (progress !== undefined) params.set('progress', String(progress));
    if (riskThreshold !== undefined) params.set('riskThreshold', String(riskThreshold));
    const qs = params.toString();
    const res = await this.timedFetch(
      `${this.base}/api/projects/${encodeURIComponent(projectId)}/plot-promises/audit${qs ? '?' + qs : ''}`,
    );
    if (!res.ok) throw new Error(`AuthorClaw auditPlotPromises error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  // ── Personas ───────────────────────────────────────────────────────────────

  async listPersonas(): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/personas`);
    if (!res.ok) throw new Error(`AuthorClaw listPersonas error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async createPersona(data: { penName: string; [key: string]: unknown }): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/personas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`AuthorClaw createPersona error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async generatePersona(genre: string, description?: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/personas/generate`, {
      method: 'POST',
      body: JSON.stringify({ genre, description }),
    });
    if (!res.ok) throw new Error(`AuthorClaw generatePersona error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async getPersona(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/personas/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`AuthorClaw getPersona error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async updatePersona(id: string, data: Record<string, unknown>): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/personas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`AuthorClaw updatePersona error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async deletePersona(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/personas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`AuthorClaw deletePersona error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  // ── Research Advanced ──────────────────────────────────────────────────────

  async researchLookup(query: string, maxWords?: number): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/research/lookup`, {
      method: 'POST',
      body: JSON.stringify({ query, maxWords }),
    });
    if (!res.ok) throw new Error(`AuthorClaw researchLookup error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async researchCompAuthors(genre: string, subgenre?: string, tone?: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/research/comp-authors`, {
      method: 'POST',
      body: JSON.stringify({ genre, subgenre, tone }),
    });
    if (!res.ok) throw new Error(`AuthorClaw researchCompAuthors error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async researchAgents(
    genre: string,
    subgenre?: string,
    titleAgePositioning?: string,
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/research/agents`, {
      method: 'POST',
      body: JSON.stringify({ genre, subgenre, titleAgePositioning }),
    });
    if (!res.ok) throw new Error(`AuthorClaw researchAgents error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async researchNewsletters(genre: string, subgenre?: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/research/newsletters`, {
      method: 'POST',
      body: JSON.stringify({ genre, subgenre }),
    });
    if (!res.ok) throw new Error(`AuthorClaw researchNewsletters error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async researchPodcasts(genre: string, subgenre?: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/research/podcasts`, {
      method: 'POST',
      body: JSON.stringify({ genre, subgenre }),
    });
    if (!res.ok) throw new Error(`AuthorClaw researchPodcasts error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async researchReviewers(
    genre: string,
    subgenre?: string,
    indieFriendly?: boolean,
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/research/reviewers`, {
      method: 'POST',
      body: JSON.stringify({ genre, subgenre, indieFriendly }),
    });
    if (!res.ok) throw new Error(`AuthorClaw researchReviewers error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  async listVoices(): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/audio/voices`);
    if (!res.ok) throw new Error(`AuthorClaw listVoices error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async generateAudio(
    text: string,
    opts?: {
      voice?: string;
      rate?: string;
      pitch?: string;
      volume?: string;
      provider?: string;
      personaId?: string;
      projectId?: string;
      elevenLabsModel?: string;
    },
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/audio/generate`, {
      method: 'POST',
      body: JSON.stringify({ text, ...(opts || {}) }),
    });
    if (!res.ok) throw new Error(`AuthorClaw generateAudio error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async getAudioFile(filename: string): Promise<string> {
    return `${this.base}/api/audio/file/${encodeURIComponent(filename)}`;
  }

  // ── Images ─────────────────────────────────────────────────────────────────

  async generateImage(
    prompt: string,
    opts?: { provider?: string; width?: number; height?: number; style?: string },
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/images/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt, ...(opts || {}) }),
    });
    if (!res.ok) throw new Error(`AuthorClaw generateImage error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async generateBookCover(
    description: string,
    opts?: {
      title?: string;
      author?: string;
      genre?: string;
      style?: string;
      subgenre?: string;
      mood?: string;
      era?: string;
      setting?: string;
      keyImagery?: string;
      palette?: string;
      avoidImagery?: string;
      includeText?: boolean;
      typographyNote?: string;
      quality?: string;
      provider?: string;
    },
  ): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/images/book-cover`, {
      method: 'POST',
      body: JSON.stringify({ description, ...(opts || {}) }),
    });
    if (!res.ok) throw new Error(`AuthorClaw generateBookCover error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async generateCoverSet(description: string, opts?: Record<string, unknown>): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/images/cover-set`, {
      method: 'POST',
      body: JSON.stringify({ description, ...(opts || {}) }),
    });
    if (!res.ok) throw new Error(`AuthorClaw generateCoverSet error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  // ── Series ─────────────────────────────────────────────────────────────────

  async listSeries(): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/series`);
    if (!res.ok) throw new Error(`AuthorClaw listSeries error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async createSeries(data: {
    title: string;
    description?: string;
    projectIds?: string[];
    readingOrder?: string[];
  }): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/series`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`AuthorClaw createSeries error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async deleteSeries(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/series/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`AuthorClaw deleteSeries error: ${res.status}`);
    return res.json() as Promise<object>;
  }

  async getSeriesReport(id: string): Promise<object> {
    const res = await this.timedFetch(`${this.base}/api/series/${encodeURIComponent(id)}/report`);
    if (!res.ok) throw new Error(`AuthorClaw getSeriesReport error: ${res.status}`);
    return res.json() as Promise<object>;
  }
}
