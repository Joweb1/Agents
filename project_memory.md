# Project Memory: Jovibe Agentic Gemini

## Project Mission

To build **Jovibe Agentic Gemini** — a secure, local-first personal agent that
runs in the terminal, possessing long-term memory, proactive capabilities, and a
distinct "soul". It evolves the Gemini CLI into a fully agentic system by
replicating the architecture of OpenClaw within a strict TypeScript/Node.js
stack.

## The Tech Stack

- **Base**: TypeScript / Node.js (Existing Gemini CLI monorepo).
- **Intelligence**: Google Gemini API (Flash/Pro/Ultra).
- **Memory System**:
  - **Storage**: Local Markdown files (`soul.md`, `user.md`, `memory.md`,
    `souvenir.md`) compatible with Obsidian.
  - **Indexing**: `better-sqlite3` with `sqlite-vec` (or a pure TS vector search
    implementation) for RAG/vector search over memory files.
- **Adapters**:
  - **Primary**: Gemini CLI Terminal (Ink-based UI).
  - **Secondary**: Slack (via `@slack/bolt`) and potentially a background daemon
    for proactive tasks.

## Architecture Analysis & Porting Plan

### 1. Memory Injection (The Soul & The User)

**OpenClaw Pattern**: Reads `SOUL.md` and `USER.md` at the start of every
session to set personality and user context. **Porting Plan**:

- Extend `packages/core/src/prompts/snippets.ts`'s `renderUserMemory` function
  to search for and read `soul.md` and `user.md` in addition to `GEMINI.md`.
- Update `packages/core/src/tools/memoryTool.ts` to include these files in the
  `getAllGeminiMdFilenames` list.
- Wrap these in specific XML tags: `<soul_context>` and `<user_context>`.

### 2. Heartbeat & Proactivity

**OpenClaw Pattern**: A background process or "watch" loop that checks
`HEARTBEAT.md` for scheduled tasks. **Porting Plan**:

- Implement a `HeartbeatService` in `packages/core/src/core/`.
- Use a lightweight scheduler (like `node-cron` or a simple `setInterval`) that
  can be optionally enabled.
- The service will poll a `heartbeat.md` file, and if non-empty, trigger a
  hidden "proactive" turn where the agent analyzes the tasks and acts.

### 3. Skill Registry

**OpenClaw Pattern**: Dynamic loading of capabilities from a `skills/`
directory. **Porting Plan**:

- Leverage the existing `SkillManager` in `packages/core/src/skills/`.
- Create a `FileSystemSkillProvider` that watches a `~/.jovibe/skills/`
  directory and automatically registers any `.md` or `.json` skill definitions
  found there.

### 4. Vector Memory (RAG)

**OpenClaw Pattern**: Vector search over chat history and memory files using
Python-based tools. **Porting Plan**:

- Implement `MemoryManager` using `better-sqlite3`.
- Integrate a TypeScript-native embedding generator (calling Gemini's embedding
  API).
- Create a new tool `query_long_term_memory` that performs semantic search over
  indexed Markdown files and previous session transcripts.

## Development Roadmap

### Step 1: Memory Foundation (Markdown + Context) [DONE]

- Add support for `soul.md` and `user.md` discovery.
- Update the system prompt to prioritize these files.
- Implement the "reflective" writing turn where the agent updates memory files.

### Step 2: Advanced Memory (SQLite + RAG) [IN PROGRESS]

- Integrate `better-sqlite3`. [DONE]
- Build the indexing pipeline that parses Markdown headers into searchable
  chunks.
- Implement the `memory_search` tool. [DONE - Basic version]

### Step 3: Proactive Heartbeat [DONE]

- Create the `HeartbeatService`.
- Add a new CLI command `gemini --watch` to start the agent in proactive mode.
- Integrate "background" task checking via `heartbeat.md`.

### Step 4: Skill Expansion [IN PROGRESS]

- Created the first custom skill `hello-jovibe`.
- Refactor `SkillManager` to support dynamic loading from a user-defined
  directory. [DONE - via existing mechanism]
- Port initial skills (e.g., `skill-creator`, `github-helper`) into the new
  structure.
