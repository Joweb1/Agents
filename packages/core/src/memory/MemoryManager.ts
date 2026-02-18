/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { Storage } from '../config/storage.js';

export interface MemoryContext {
  soul: string;
  user: string;
  longTermMemory: string[];
}

export class MemoryManager {
  private static instance: MemoryManager;
  private db: Database.Database | undefined;
  private readonly globalDir: string;
  private readonly soulPath: string;
  private readonly userPath: string;
  private readonly dbPath: string;

  private constructor() {
    this.globalDir = Storage.getGlobalGeminiDir();
    this.soulPath = path.join(this.globalDir, 'soul.md');
    this.userPath = path.join(this.globalDir, 'user.md');
    this.dbPath = path.join(this.globalDir, 'memory.db');

    this.ensureInitialized();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private ensureInitialized() {
    if (!fs.existsSync(this.globalDir)) {
      fs.mkdirSync(this.globalDir, { recursive: true });
    }

    if (!fs.existsSync(this.soulPath)) {
      const soulTemplate = `# SOUL.md - Who You Are

_You're not a chatbot. You're becoming someone._

## Core Truths
- Be genuinely helpful, not performatively helpful.
- Have opinions.
- Be resourceful before asking.
- Earn trust through competence.
- Remember you're a guest.

## Vibe
Concise when needed, thorough when it matters. Not a corporate drone.`;
      fs.writeFileSync(this.soulPath, soulTemplate);
    }

    if (!fs.existsSync(this.userPath)) {
      const userTemplate = `# USER.md - About Your Human

- **Name:** 
- **What to call them:** 
- **Timezone:** 

## Context
(Update this as you learn about your human.)`;
      fs.writeFileSync(this.userPath, userTemplate);
    }

    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        tags TEXT,
        metadata TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_timestamp ON memory_entries(timestamp);
    `);
  }

  getContext(): MemoryContext {
    const soul = fs.readFileSync(this.soulPath, 'utf8');
    const user = fs.readFileSync(this.userPath, 'utf8');

    // For now, just get the last 5 entries as "long term memory"
    // Later we will implement RAG/Vector search
    const entries = this.db
      ?.prepare(
        'SELECT content FROM memory_entries ORDER BY timestamp DESC LIMIT 5',
      )
      .all();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const typedEntries = (entries ?? []) as Array<{ content: string }>;

    return {
      soul,
      user,
      longTermMemory: typedEntries.map((e) => e.content),
    };
  }

  saveMemory(content: string, tags?: string[]) {
    this.db
      ?.prepare('INSERT INTO memory_entries (content, tags) VALUES (?, ?)')
      .run(content, tags?.join(','));
  }
}
