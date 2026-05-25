/**
 * Shared tool registration for MCP Server instances.
 *
 * Each SSE/Streamable HTTP connection needs its own Server + Transport pair,
 * but they all register the same set of tools. This module extracts
 * that registration logic into a reusable function.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import type { InstanceRegistry } from '../openclaw/registry.js';
import { SERVER_ICON_SVG_BASE64 } from '../config/constants.js';
import { log, logError } from '../utils/logger.js';
import { AuthorClawClient } from '../client/authorclaw.js';
import { chatTools, dispatchChatTool } from '../tools/chat.js';
import { projectTools, dispatchProjectTool } from '../tools/projects.js';
import { fileTools, dispatchFileTool } from '../tools/files.js';
import { researchTools, dispatchResearchTool } from '../tools/research.js';
import { statusTools, dispatchStatusTool } from '../tools/status.js';
import { documentTools, dispatchDocumentTool } from '../tools/documents.js';
import { audioTools, dispatchAudioTool } from '../tools/audio.js';
import { imageTools, dispatchImageTool } from '../tools/images.js';
import { seriesTools, dispatchSeriesTool } from '../tools/series.js';
import {
  openclawTaskStatusTool,
  openclawTaskListTool,
  openclawTaskCancelTool,
  handleOpenclawTaskStatus,
  handleOpenclawTaskList,
  handleOpenclawTaskCancel,
} from '../mcp/tools/tasks.js';

export interface ToolRegistrationDeps {
  registry: InstanceRegistry;
  serverName: string;
  serverVersion: string;
}

/**
 * Create a new MCP Server instance with all tools registered.
 */
export function createMcpServer(deps: ToolRegistrationDeps): Server {
  const server = new Server(
    {
      name: deps.serverName,
      version: deps.serverVersion,
      icons: [
        {
          src: `data:image/svg+xml;base64,${SERVER_ICON_SVG_BASE64}`,
          mimeType: 'image/svg+xml',
          sizes: ['128x128'],
        },
      ],
    },
    { capabilities: { tools: {} } }
  );

  registerTools(server, deps);
  return server;
}

/**
 * Register all AuthorClaw tools on an existing MCP Server instance.
 */
function registerTools(server: Server, deps: ToolRegistrationDeps): void {
  const { registry } = deps;
  const authorClawClient = new AuthorClawClient();

  const allTools = [
    ...chatTools,
    ...projectTools,
    ...fileTools,
    ...researchTools,
    ...statusTools,
    ...documentTools,
    ...audioTools,
    ...imageTools,
    ...seriesTools,
    openclawTaskStatusTool,
    openclawTaskListTool,
    openclawTaskCancelTool,
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    log(`Executing tool: ${name}`);

    const args = (toolArgs ?? {}) as Record<string, unknown>;

    try {
      if (name.startsWith('authorclaw_chat')) {
        return await dispatchChatTool(name, args, authorClawClient);
      }
      if (name.startsWith('authorclaw_project')) {
        return await dispatchProjectTool(name, args, authorClawClient);
      }
      if (name.startsWith('authorclaw_files')) {
        return await dispatchFileTool(name, args, authorClawClient);
      }
      if (name === 'authorclaw_research') {
        return await dispatchResearchTool(name, args, authorClawClient);
      }
      if (name === 'authorclaw_status') {
        return await dispatchStatusTool(name, args, authorClawClient);
      }
      if (name.startsWith('authorclaw_documents')) {
        return await dispatchDocumentTool(name, args, authorClawClient);
      }
      if (name.startsWith('authorclaw_audio')) {
        return await dispatchAudioTool(name, args, authorClawClient);
      }
      if (name.startsWith('authorclaw_images')) {
        return await dispatchImageTool(name, args, authorClawClient);
      }
      if (name.startsWith('authorclaw_series')) {
        return await dispatchSeriesTool(name, args, authorClawClient);
      }
      if (name === 'authorclaw_task_status') {
        return await handleOpenclawTaskStatus(registry, toolArgs);
      }
      if (name === 'authorclaw_task_list') {
        return await handleOpenclawTaskList(registry, toolArgs);
      }
      if (name === 'authorclaw_task_cancel') {
        return await handleOpenclawTaskCancel(registry, toolArgs);
      }
      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      logError(`Error executing tool ${name}`, error);
      throw error;
    }
  });
}
