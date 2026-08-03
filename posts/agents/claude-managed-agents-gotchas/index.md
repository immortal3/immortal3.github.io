# Claude Managed Agents: sharp edges and gotchas

> What Anthropic Claude Managed Agents provide, where the API is limited, and gotchas around sessions, environments, tools, and GitHub repos.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/agents/claude-managed-agents-gotchas/
- Published: 2026-04-26
- Updated: 2026-06-17
- Tags: agents, claude, anthropic

---

## What Are Managed Agents?

Anthropic released [Managed Agents](https://docs.anthropic.com/en/docs/agents/overview) in April 2026. The idea is simple: instead of building your own agent loop, tool execution sandbox, and session persistence, Anthropic hosts all of it for you.

You define an **Agent** (model + system prompt + tools), create an **Environment** (a sandboxed Ubuntu container), and spin up **Sessions** that run your agent against real tasks. The interaction is event-driven over SSE. You send user messages in, you get agent actions out. Anthropic runs the loop, manages the container, handles compaction, and persists the session history.

The four core primitives:

| Concept         | What it is                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Agent**       | A reusable, versioned configuration: model, system prompt, tools, MCP servers, skills. Create once, reuse across sessions. |
| **Environment** | Container template: networking rules, pre-installed packages. Ubuntu 22.04, up to 8 GB RAM, 10 GB disk.                    |
| **Session**     | A running agent instance. Gets its own isolated container. Stateful, persistent event history.                             |
| **Events**      | The interaction protocol. SSE streaming or polling. No webhooks.                                                           |

It's a good product direction. But it's also a beta, and betas come with sharp edges. If you are evaluating this for production, here are the things that will bite you.

## 1. Custom Tools Require an Active Event Loop

This was the first thing that surprised me. Custom tools, the ones where *your* application executes the logic instead of the agent's sandbox, don't work like fire-and-forget callbacks.

The flow looks like this:

1. You define a custom tool on the agent with a name, description, and input schema.
2. The agent decides to call it and emits an `agent.custom_tool_use` event.
3. The entire session goes **idle** and waits.
4. Your application reads the event, executes the tool, and sends back a `user.custom_tool_result` event.
5. The session resumes.

There is no webhook. There is no callback URL you register. Your application must hold an SSE connection open (or poll `events.list`) to detect when the agent wants something from you. If your SSE stream drops while a custom tool call is pending, the session deadlocks. You need to implement reconnect-with-consolidation: open a new stream, fetch full history via `events.list`, dedupe by event ID, then resume.

So, you can't just define a tool and walk away. You need an always-on listener. For teams used to webhook-driven architectures, this is a meaningful shift in how you design your integration layer.

The alternative? Move your tools to an MCP server. MCP tools execute server-side and don't require your application to stay connected. But that introduces its own complexity.

## 2. MCP Is the Escape Hatch, but It Has Its Own Friction

If custom tools feel heavy because of the event loop requirement, Anthropic's answer is MCP (Model Context Protocol) servers. MCP tools run remotely and the agent calls them directly, no client-side listener needed.

But MCP integration is not as plug-and-play as it sounds:

- **Only remote MCP servers with Streamable HTTP transport are supported.** No local stdio-based servers. If you have been building MCP servers locally for Claude Desktop or Claude Code, they won't work here without a transport adapter.
- **Credential setup is not trivial.** Vaults support two auth types: `mcp_oauth` (with refresh flows) and `static_bearer` (for fixed API keys or PATs). The `static_bearer` path is simpler, but not every MCP server accepts it. For OAuth-based servers, you need proper token endpoints, client IDs, and refresh logic configured in the [Vault credential](https://platform.claude.com/docs/en/managed-agents/vaults). Either way, you are managing credentials through Anthropic's Vault abstraction rather than passing them directly.
- **Vault credentials never enter the sandbox.** They are injected by [Anthropic-side proxies](https://www.anthropic.com/engineering/managed-agents) after requests leave the container. Claude calls MCP tools via a dedicated proxy that resolves credentials from the vault and makes the external call. The harness itself is never made aware of any credentials. This is good for security, but it means you can't reuse vaulted secrets for non-MCP purposes inside the container. If you need an API key for a shell command, you need a separate path.
- **Max 20 MCP servers per agent, 128 tools total across all types.**

MCP is clearly the intended long-term path for external integrations. But the Vault-mediated credential model and the remote-only transport constraint mean you will spend time adapting existing tools.

## 3. No Webhooks. SSE or Nothing.

This deserves its own section because it affects the architecture of every integration you build.

There is no webhook support. Communication with a running session happens through two channels:

- **SSE streaming** (`GET /v1/sessions/{id}/events/stream`): a long-lived connection that delivers events in real time. This is the primary interface.
- **Polling** (`GET /v1/sessions/{id}/events`): paginated event list. Returns immediately. Useful for backfill, not for real-time.

The SSE stream has no replay. If your connection drops, you miss events. You must implement reconnect-with-consolidation every time. You also need to open the stream *before* sending your first event, because the stream only delivers events emitted after it opens. This one is easy to miss.

There are a few subtle timing issues too:

- **Don't break on bare `session.status_idle`.** The session goes idle transiently for tool confirmations and custom tool calls. Only break when idle with `stop_reason.type === "end_turn"` or `"retries_exhausted"`, or on `session.status_terminated`.
- **Post-idle status-write race.** The SSE stream emits `session.status_idle` slightly before the queryable status reflects it. If you immediately call `sessions.delete()`, it can 400.
- **HTTP library timeouts are per-chunk, not wall-clock.** A standard `requests timeout=(5, 60)` can block indefinitely on a trickling SSE response. Use the SDK or track elapsed time yourself.

For any serious production use, plan to build a robust event consumer with reconnection, deduplication, and state reconciliation. This is table stakes for SSE-based systems, but it's work that Anthropic could eventually eliminate with webhook support.

## 4. File Mounting: Current Limitations

File mounting works today, and the basic mechanism is straightforward:

1. Upload via Files API: `client.beta.files.upload({ file, purpose: "agent" })`
2. Mount at session creation: `{ type: "file", file_id: "file_abc123", mount_path: "/workspace/data.csv" }`

You can also mount GitHub repositories directly, which is useful for code-review and analysis workflows. Repos are cached, so repeated sessions against the same repo start faster.

That said, the current beta has a number of constraints around files and environments. These are likely to improve as the product matures, but today they shape what you can and can't do:

- **Files are mounted read-only.** The agent reads them but can't modify originals. Modified versions go to new paths.
- **Max 100 files per session.**
- **Mounted files get a different `file_id` than the uploaded original.** Session creation makes a scoped copy. Don't assume IDs are stable across the boundary.
- **Brief indexing lag (~1-3 seconds)** between `session.status_idle` and output files appearing in `files.list`. If you check immediately, you will get an empty list.
- **Memory stores (persistent cross-session storage) can only be attached at session creation time.** You can't add them to a running session.
- **No custom container images.** `config.type: "cloud"` is the only option. You can pre-install packages in the environment definition (`apt`, `pip`, `npm`, `cargo`, `gem`, `go`), but you can't mount arbitrary Docker images with your application code pre-baked. The container starts from Anthropic's base image every time.
- **No environment variables in containers.** If your tools need config, you either bake it into the system prompt (which persists in event history) or use a custom tool pattern where your orchestrator holds the config.

Most of these feel like beta-era constraints rather than deliberate design choices. Custom container support, writable mounts, and environment variable injection are all reasonable future additions. But if you are planning around them today, plan around what exists, not what might ship.

## 5. Business Logic Is Your Problem

This is expected, but worth saying clearly: Managed Agents gives you a hosted agent runtime, not a hosted application platform.

You still need to build:

- **Agent-per-tenant routing.** The API gives you `agents.create()` and `sessions.create()`, but deciding which agent config maps to which customer, which tools a given user should have access to, and how to manage agent versions across your user base, that's entirely on you.
- **Multi-agent orchestration logic.** There is a multi-agent feature in research preview, but it only supports one level of delegation and requires a separate access request. For anything more complex, you are building the coordinator yourself.
- **YAML-driven agent definitions.** If you want to version-control agent configs (and you should), the recommended path is YAML files deployed via the `ant` CLI. But the lifecycle management, CI/CD pipeline, and rollback strategy are yours to design.
- **Cost controls and usage limits.** Sessions bill at $0.08/session-hour plus standard token rates. There is no built-in per-user spend cap. If a runaway agent loops for hours, your bill reflects that. You need to implement your own circuit breakers.

Anthropic provides Vaults for credential management and Memory Stores for cross-session persistence, which help. But the glue between "i have an agent" and "i have a product" is still a significant engineering surface.

## 6. Session History: Store Your Own Copy

Session event history is stored server-side and accessible via `events.list()`. You can retrieve the full history of any session, which is convenient.

But i would recommend also storing it in your own infrastructure. Here's why:

- **Archive is permanent.** Once you archive a session, there is no unarchive. Agents also have no delete, only archive. If you archive something by mistake, you lose write access to it forever.
- **You will want to query across sessions.** The API gives you per-session history, but no cross-session search or analytics. If you want to answer "which sessions hit a tool error last week?" or "what is the average token usage per agent type?", you need your own data store.
- **Compliance and auditing.** If you operate in a regulated industry, you likely need session logs in your own infrastructure regardless of where the runtime lives.
- **Built-in context compaction summarizes older turns.** This is great for token efficiency during a session, but it means the raw event history includes compaction events that replace earlier context. If you want the full uncompacted transcript, capture events as they stream in.

## Looking Forward

These are real limitations today, but it's worth acknowledging: this is a beta released weeks ago. Anthropic is iterating quickly, and several of these gaps have clear paths to resolution.

Webhook support would eliminate the always-on listener requirement for custom tools. Bring-your-own-container would unlock richer environment setups. Environment variable support in containers would simplify credential management for non-MCP tools. These are not architectural impossibilities. They are features that haven't shipped yet.

The core architecture is sound. Durable session logs decoupled from containers, versioned agent configs, sandboxed execution with MCP integration. The separation of "brain" (Claude + harness) from "hands" (sandbox + tools) is the right abstraction. The question is whether the edges get polished fast enough for production workloads that can't wait.

If you are building something new and can tolerate beta constraints, Managed Agents removes a meaningful amount of infrastructure work. If you are migrating an existing agent system with webhook-driven tools, custom container images, or complex multi-agent hierarchies, the current feature set will require workarounds.

Either way, know the gotchas before you commit.
