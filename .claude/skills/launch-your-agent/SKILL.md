---
name: launch-your-agent
description: Scaffold a new Claude Code subagent. Use when the user wants to "build", "create", "launch", or "add" a new agent/subagent. Walks through the agent's purpose, allowed tools, and model, then writes a ready-to-use agent definition into .claude/agents/.
---

# Launch Your Agent

This skill creates a new Claude Code **subagent** — a Markdown file in
`.claude/agents/<name>.md` that defines a specialized assistant with its own
system prompt, allowed tools, and model. Once written, the agent is invocable
through the `Agent` / `Task` tool by its `name`.

## Steps

1. **Gather requirements.** If the user has not already specified them, ask for:
   - **Name** — a short, kebab-case identifier (e.g. `code-reviewer`,
     `test-writer`). This becomes the filename and the `name` field.
   - **Purpose** — one or two sentences on what the agent does and when it
     should be invoked. This drives the `description` field (which controls
     auto-delegation) and the system prompt.
   - **Tools** — which tools it may use. Use `*` for all tools, or a
     comma-separated allowlist (e.g. `Read, Grep, Glob, Bash`). Read-only
     agents should omit `Edit`, `Write`, and `NotebookEdit`.
   - **Model** (optional) — `opus`, `sonnet`, `haiku`, or `inherit`. Omit to
     inherit from the parent session.

   If the user gives a one-line description, infer sensible defaults rather
   than over-asking. Prefer the narrowest tool set that fits the job.

2. **Write the agent file** to `.claude/agents/<name>.md` using this format:

   ```markdown
   ---
   name: <name>
   description: <when to use this agent — be specific; this drives auto-delegation>
   tools: <* or comma-separated allowlist>   # optional; omit to inherit all
   model: <opus|sonnet|haiku|inherit>        # optional; omit to inherit
   ---

   You are <role>. <Concise statement of the agent's mission.>

   ## Responsibilities
   - <bullet 1>
   - <bullet 2>

   ## Approach
   1. <how it should work, step by step>
   2. ...

   ## Constraints
   - <what it must not do, scope boundaries, output expectations>
   ```

   Keep the system prompt focused and operational — describe *how* the agent
   should behave, not just *what* it is.

3. **Confirm.** Tell the user the file path, summarize the agent's purpose,
   tools, and model, and remind them they can invoke it via the `Agent`/`Task`
   tool (or it may be auto-delegated based on its `description`).

## Notes
- A subagent runs in its own context window; it starts fresh each time it is
  spawned and only its final message returns to the caller.
- Give each agent a precise `description` — vague descriptions cause poor
  auto-delegation.
- Project agents live in `.claude/agents/` (this repo). User-global agents live
  in `~/.claude/agents/`.
