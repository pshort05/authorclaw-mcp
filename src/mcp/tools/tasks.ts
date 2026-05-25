/**
 * Async Task Tools for AuthorClaw MCP
 *
 * Provides async/background task management for long-running operations.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { successResponse, errorResponse, type ToolResponse } from '../../utils/response-helpers.js';
import { taskManager, type TaskStatus } from '../tasks/manager.js';
import { validateInputIsObject, validateId } from '../../utils/validation.js';

// ============================================================================
// Tool Definitions
// ============================================================================

export const taskStatusTool: Tool = {
  name: 'authorclaw_task_status',
  description: 'Check the status of an async task. Returns status, and result if completed.',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'The task ID returned from authorclaw_chat_async',
      },
    },
    required: ['task_id'],
  },
};

export const taskListTool: Tool = {
  name: 'authorclaw_task_list',
  description: 'List all tasks. Optionally filter by status, session, or instance.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
        description: 'Filter by task status',
      },
      session_id: {
        type: 'string',
        description: 'Filter by session ID',
      },
      instance: {
        type: 'string',
        description: 'Filter by instance name',
      },
    },
    required: [],
  },
};

export const taskCancelTool: Tool = {
  name: 'authorclaw_task_cancel',
  description: "Cancel a pending task. Only works for tasks that haven't started yet.",
  inputSchema: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'The task ID to cancel',
      },
    },
    required: ['task_id'],
  },
};

// ============================================================================
// Tool Handlers
// ============================================================================

export async function handleTaskStatus(input: unknown): Promise<ToolResponse> {
  if (!validateInputIsObject(input)) {
    return errorResponse('Invalid input: expected an object');
  }

  const tidResult = validateId(input.task_id, 'task_id');
  if (tidResult.valid === false) {
    return errorResponse(tidResult.error);
  }
  const task_id = tidResult.value;

  const task = taskManager.get(task_id);
  if (!task) {
    return errorResponse(`Task not found: ${task_id}`);
  }

  const response: Record<string, unknown> = {
    task_id: task.id,
    type: task.type,
    status: task.status,
    instance: task.instanceId,
    created_at: task.createdAt.toISOString(),
  };

  if (task.startedAt) {
    response.started_at = task.startedAt.toISOString();
  }
  if (task.completedAt) {
    response.completed_at = task.completedAt.toISOString();
  }
  if (task.status === 'completed' && task.result) {
    response.result = task.result;
  }
  if (task.status === 'failed' && task.error) {
    response.error = task.error;
  }

  return successResponse(JSON.stringify(response, null, 2));
}

const VALID_TASK_STATUSES: readonly TaskStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
];

export async function handleTaskList(input: unknown): Promise<ToolResponse> {
  if (!validateInputIsObject(input)) {
    return errorResponse('Invalid input: expected an object');
  }

  let status: TaskStatus | undefined;
  if (input.status !== undefined) {
    if (
      typeof input.status !== 'string' ||
      !VALID_TASK_STATUSES.includes(input.status as TaskStatus)
    ) {
      return errorResponse(`status must be one of: ${VALID_TASK_STATUSES.join(', ')}`);
    }
    status = input.status as TaskStatus;
  }

  let session_id: string | undefined;
  if (input.session_id !== undefined) {
    const sidResult = validateId(input.session_id, 'session_id');
    if (sidResult.valid === false) {
      return errorResponse(sidResult.error);
    }
    session_id = sidResult.value;
  }

  let instanceFilter: string | undefined;
  if (input.instance !== undefined) {
    const instResult = validateId(input.instance, 'instance');
    if (instResult.valid === false) {
      return errorResponse(instResult.error);
    }
    instanceFilter = instResult.value;
  }

  const tasks = taskManager.list({ status, sessionId: session_id, instanceId: instanceFilter });
  const stats = taskManager.stats();

  const taskList = tasks.map((t) => ({
    task_id: t.id,
    type: t.type,
    status: t.status,
    instance: t.instanceId,
    priority: t.priority,
    created_at: t.createdAt.toISOString(),
    has_result: t.status === 'completed' && !!t.result,
  }));

  return successResponse(
    JSON.stringify(
      {
        stats,
        tasks: taskList,
      },
      null,
      2
    )
  );
}

export async function handleTaskCancel(input: unknown): Promise<ToolResponse> {
  if (!validateInputIsObject(input)) {
    return errorResponse('Invalid input: expected an object');
  }

  const tidResult = validateId(input.task_id, 'task_id');
  if (tidResult.valid === false) {
    return errorResponse(tidResult.error);
  }
  const task_id = tidResult.value;

  const task = taskManager.get(task_id);
  if (!task) {
    return errorResponse(`Task not found: ${task_id}`);
  }

  if (task.status !== 'pending') {
    return errorResponse(
      `Cannot cancel task with status: ${task.status}. Only pending tasks can be cancelled.`
    );
  }

  const cancelled = taskManager.cancel(task_id);
  if (!cancelled) {
    return errorResponse('Failed to cancel task');
  }

  return successResponse(
    JSON.stringify(
      {
        task_id,
        status: 'cancelled',
        message: 'Task cancelled successfully',
      },
      null,
      2
    )
  );
}
