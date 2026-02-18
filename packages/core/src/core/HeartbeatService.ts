/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Storage } from '../config/storage.js';
import type { GeminiClient } from './client.js';
import { debugLogger } from '../utils/debugLogger.js';

export class HeartbeatService {
  private intervalId: NodeJS.Timeout | undefined;
  private readonly heartbeatPath: string;
  private isRunning = false;

  constructor(private readonly geminiClient: GeminiClient) {
    const globalDir = Storage.getGlobalGeminiDir();
    this.heartbeatPath = path.join(globalDir, 'heartbeat.md');
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!fs.existsSync(this.heartbeatPath)) {
      const template = `# HEARTBEAT.md

# Keep this file empty to skip heartbeat API calls.
# Add tasks below when you want the agent to check something periodically.`;
      fs.writeFileSync(this.heartbeatPath, template);
    }
  }

  start(intervalMinutes: number = 30) {
    if (this.intervalId) return;

    debugLogger.log(`Starting heartbeat service every ${intervalMinutes} minutes`);
    this.intervalId = setInterval(() => {
      void this.checkHeartbeat();
    }, intervalMinutes * 60 * 1000);
    
    // Initial check
    void this.checkHeartbeat();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async checkHeartbeat() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const content = fs.readFileSync(this.heartbeatPath, 'utf8').trim();
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

      if (lines.length > 0) {
        debugLogger.log('Heartbeat tasks found, triggering proactive turn');
        await this.triggerProactiveTurn(content);
      }
    } catch (error) {
      debugLogger.error('Error in heartbeat check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async triggerProactiveTurn(content: string) {
    // This is where we tell the agent: "Hey, check these tasks."
    // We can use sendMessageStream with a special system-like prompt.
    const prompt = `[HEARTBEAT] The following tasks are scheduled in heartbeat.md:

${content}

Please analyze and perform any necessary actions. If a task is completed, you can suggest removing it from heartbeat.md using manage_agent_memory if you implement that, or just inform the user.`;
    
    // Since we are in a proactive mode, we might want a way to not block the main UI
    // but for now, we'll just emit it as if it's a hidden user message.
    // In a real background daemon, it would run in a separate session.
    
    // For now, let's just log it. Integrating with the UI loop requires more work.
    debugLogger.log('Proactive turn prompt:', prompt);
    
    // TODO: Implement actual turn execution. 
    // This likely requires a way to inject a message into the current session's stream
    // or start a background session.
  }
}
