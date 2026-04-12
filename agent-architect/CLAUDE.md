# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Hackatin is a hackathon project by "Masonería madrileña" that turns a conversation about an idea into a team of specialized AI agents that can then build the project inside Claude Code. A user chats with an interviewer agent ("Neural Architect"), agrees on a stack, and the backend emits a bundle of `.md` agent definitions compatible with Claude Code's subagent format (`.claude/agents/`). An MCP server lets users pull those agents directly into their own Claude Code install.

The README tracks the hackathon punch list — keep it in sync when closing tasks.

## Commands

Everything runs from the repo root unless noted.

### Backend (Spring Boot 3.3, Java 17)
- `mvn spring-boot:run` — run the app at `http://localhost:8080`. The frontend is built and served from `/static` automatically via `frontend-maven-plugin` (it downloads Node 22.12.0 / npm 10.9.0 into `frontend/node/` on first run, so the first build is slow).
- `mvn -q compile` — fast compile check without running the frontend build pipeline in full (still triggers `generate-resources`).
- `mvn package` — produces the fat jar with the built frontend baked in.
- H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:file:./data/hackatin`, user `sa`, no password). The DB file lives at `data/hackatin.mv.db` and persists across runs — delete it to reset state.

There is no test suite yet (`spring-boot-starter-test` is not in `pom.xml`), so there is nothing to run for tests.

### Frontend (React 19 + Vite 8, standalone dev loop)
From `frontend/`:
- `npm run dev` — Vite dev server with HMR. Use this while iterating on UI, not the Spring build, which is slow.
- `npm run build` — production build into `frontend/dist/` (Maven copies this into `target/.../static/`).
- `npm run lint` — ESLint flat config.
- `npm run preview` — preview the production bundle.

When developing the frontend standalone, the API is still served by the Spring backend on `:8080`. Check `frontend/vite.config.js` for any proxy setup before changing URLs.

### MCP server (`mcp-agents/`)
- `cd mcp-agents && npm start` — runs the MCP stdio server exposing `list_agents` and `download_agents`, which hit the Spring backend to fetch agent markdowns and write them into the consumer's `.claude/agents/` directory. This is the integration that lets Claude Code use the agents we generate.

### Environment
`openai.api.key` is read from `OPENAI_API_KEY` (with a hardcoded fallback in `application.properties` — treat that fallback as a placeholder, set `.env` / export the var for real runs). `OPENAI_MODEL` defaults to `gpt-4o-mini`. If no key is configured, `OpenAiService.fallbackReply` returns a demo message instead of calling the API, so the app still boots without credentials.

## Architecture

### High-level flow (what happens end-to-end)
1. **Landing / project creation** (`ProjectController`) — creates a `ProjectConfig` row in H2 with status `draft`.
2. **Chat interview** (`ChatController` + `frontend/src/pages/ChatPage.jsx`) — Neural Architect interviews the user. Messages are stored in `ChatMessageRepository` keyed by `projectId`. Every assistant reply is scanned by `parseSummary()` for an embedded JSON block with `project_summary` + `agents`. When found, the frontend shows a pending configuration card; when the user confirms (either the assistant replies with `[CONFIRMADO]` or the frontend posts `/api/chat/{id}/confirm`), the config is persisted with `status=configured` and `agentsJson` set.
3. **Agent generation** (`AgentController.generateAgents`) — reads `ProjectConfig.agentsJson`, deletes previous `Agent` rows for that project, and for each entry re-renders a large markdown template (the "megaprompt") filling in `name`, `role`, `stack`, `description`, `personality`, and `projectIdea`. The output is a Claude-Code-compatible subagent `.md` with YAML frontmatter (`name`, `description`) followed by role/examples/identity/workflow/principles sections. Status transitions to `generated`.
4. **Retrieval** (`AgentController.getAgentsByProject` / `getAllAgents`) — the frontend workspace page and the MCP server both consume these endpoints to list/download the generated agents.

### Prompt surfaces (where "intelligence" lives)
Three prompts carry most of the product's value. Edit them carefully and keep them coherent with each other — the JSON schema in `SYSTEM_PROMPT` and `BUILD_PROMPT` must match the fields `parseSummary()` reads (`project_summary`, `backend`, `frontend`, `database`, `agents[].title|role|instructions|personality`), and those fields feed directly into the `AgentController` megaprompt:

- `ChatController.SYSTEM_PROMPT` — the interviewer persona, conversation rules, and the JSON schema the assistant must emit when closing.
- `ChatController.BUILD_PROMPT` — a stricter architecture-only prompt for regenerating the agent team from an existing conversation. It is currently defined but not yet wired into an endpoint; if you add a "regenerate team" feature, it plugs in here.
- `AgentController.generateAgents` format string — 21 `%s` placeholders, order-sensitive. The argument order at the bottom of the `String.format` call must stay in sync with the placeholders (`name`, `role`, `stack`, `projectIdea`, `description`, `personality` appear multiple times in a specific sequence). Count them before shipping changes.

### Data model (JPA entities in `com.example.hackatin.model`)
- `ProjectConfig` — one row per project idea. Holds `projectName`, `projectIdea`, stack (`backend`/`frontend`/`database`), `agentsJson` (raw JSON from the chat), and `status` (`draft` → `configured` → `generated`).
- `ChatMessage` — `projectId` + `role` (`user`/`assistant`) + `content`, ordered by `createdAt`. The full history is replayed to OpenAI on every turn, with `SYSTEM_PROMPT` re-injected at position 0.
- `Agent` — one row per generated agent (`projectId`, `name`, `role`, `stack`, `description`, `personality`, `markdownContent`). `markdownContent` is the rendered megaprompt ready to drop into `.claude/agents/`.

### Frontend routing
React Router v7 in `frontend/src/App.jsx` chains: Landing → ProjectsDashboard → Chat → Orchestration (agent cards + generation) → Office (isometric view of agents working). `ProjectContext` holds the current project id. The Office page (`OfficePage.jsx`) is the demo headline — it renders agents as isometric SVG characters at desks with monitors/keyboards, animated typing, chat bubbles cycling between agents, and a real-time activity log panel (65/35 split). The old `/workspace` route redirects to Office. `WorkspacePage.jsx` is unused legacy code.

### Integration with Claude Code (the differentiator)
The `.md` files this project generates follow Claude Code's subagent file format: YAML frontmatter with `name` + `description`, then free-form markdown. Dropping one into `.claude/agents/` of any Claude Code project makes it invocable as a subagent. The `mcp-agents/` server automates that last step: `download_agents` fetches all agents for a project from `/api/agents/project/{id}` and writes them into the user's `.claude/agents/`. When editing the megaprompt or the JSON schema, verify the output still renders as a valid subagent file (frontmatter parseable, no unescaped `---`).

## Things to know before changing code

- **H2 in file mode.** `data/hackatin.mv.db` is a real file the app holds open via `AUTO_SERVER=TRUE`. Don't delete it while the app is running. If schemas drift (new `@Column` etc.), `spring.jpa.hibernate.ddl-auto=update` will add columns but won't remove or rename them — wipe the file for clean slates.
- **Frontend build is attached to `generate-resources`.** Any `mvn` goal that includes that phase will run `npm install` and `vite build`. For quick Java-only iteration, prefer `npm run dev` on the side and edit Java without repackaging.
- **`src/main/resources/static_old/`** is a graveyard of pre-React HTML mockups. It is not served. Don't edit it expecting changes to show up.
- **Prompt changes ripple.** The chat prompt produces the JSON that the config endpoint persists that the agent-generation prompt consumes. Breaking any field name (e.g. renaming `title` → `name` in the chat JSON without updating `parseSummary`) silently drops agents.
- **No tests.** Validate changes by running `mvn spring-boot:run` and exercising the chat → confirm → generate flow end-to-end. Check the rendered markdown in `/api/agents/project/{id}` or the workspace UI.
