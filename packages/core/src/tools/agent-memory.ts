/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  ToolResult,
} from './tools.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MemoryManager } from '../memory/MemoryManager.js';
import { Storage } from '../config/storage.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

interface AgentMemoryParams {
  type: 'soul' | 'user' | 'long_term';
  content: string;
  operation: 'append' | 'replace' | 'add_entry';
}

class AgentMemoryToolInvocation extends BaseToolInvocation<
  AgentMemoryParams,
  ToolResult
> {
  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { type, content, operation } = this.params;
    const memoryManager = MemoryManager.getInstance();
    const globalDir = Storage.getGlobalGeminiDir();

    try {
      if (type === 'long_term') {
        memoryManager.saveMemory(content);
        return {
          llmContent: JSON.stringify({ success: true, message: 'Saved to long-term memory' }),
          returnDisplay: 'Saved to long-term memory (SQLite)',
        };
      }

      const filePath = path.join(globalDir, `${type}.md`);
      let newContent = content;

      if (operation === 'append') {
        const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
        newContent = current + '\n\n' + content;
      }

      fs.writeFileSync(filePath, newContent);

      return {
        llmContent: JSON.stringify({ success: true, message: `Updated ${type}.md` }),
        returnDisplay: `Updated ${type}.md`,
      };
    } catch (error) {
      return {
        llmContent: JSON.stringify({ success: false, error: String(error) }),
        returnDisplay: `Error updating agent memory: ${error}`,
      };
    }
  }
}

export class AgentMemoryTool extends BaseDeclarativeTool<
  AgentMemoryParams,
  ToolResult
> {
  static readonly Name = 'manage_agent_memory';

  constructor(messageBus: MessageBus) {
    super(
      AgentMemoryTool.Name,
      'ManageAgentMemory',
      "Manage the agent's personal memory (soul, user facts, and long-term insights). Use this to update your identity, user preferences, or save important long-term facts.",
      Kind.Think,
      {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['soul', 'user', 'long_term'],
            description: 'The type of memory to update.',
          },
          operation: {
            type: 'string',
            enum: ['append', 'replace', 'add_entry'],
            description: 'The operation to perform. "add_entry" is for long_term (SQLite).',
          },
          content: {
            type: 'string',
            description: 'The content to save or append.',
          },
        },
        required: ['type', 'operation', 'content'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: AgentMemoryParams,
    messageBus: MessageBus,
  ) {
    return new AgentMemoryToolInvocation(params, messageBus, this.name, this.displayName);
  }
}
