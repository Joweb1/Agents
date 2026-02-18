/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolResult } from './tools.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

interface MemorySearchParams {
  query: string;
  limit?: number;
}

class MemorySearchToolInvocation extends BaseToolInvocation<
  MemorySearchParams,
  ToolResult
> {
  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { query, limit = 5 } = this.params;
    const memoryManager = MemoryManager.getInstance();
    const context = memoryManager.getContext();

    // Basic implementation: filter by query string
    // Later we can implement actual semantic search with embeddings
    const results = context.longTermMemory
      .filter((m) => m.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);

    return {
      llmContent: JSON.stringify({
        success: true,
        results,
        count: results.length,
      }),
      returnDisplay: `Found ${results.length} memories matching "${query}".`,
    };
  }
}

export class MemorySearchTool extends BaseDeclarativeTool<
  MemorySearchParams,
  ToolResult
> {
  static readonly Name = 'search_agent_memory';

  constructor(messageBus: MessageBus) {
    super(
      MemorySearchTool.Name,
      'SearchAgentMemory',
      "Search through the agent's long-term memory for relevant facts or insights.",
      Kind.Think,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query or keyword.',
          },
          limit: {
            type: 'number',
            description: 'The maximum number of results to return.',
            default: 5,
          },
        },
        required: ['query'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: MemorySearchParams,
    messageBus: MessageBus,
  ) {
    return new MemorySearchToolInvocation(
      params,
      messageBus,
      this.name,
      this.displayName,
    );
  }
}
