---
name: prompting-fable-5
description: Use when writing, reviewing, or migrating system prompts, harness instructions, or agent scaffolding for Claude Fable 5 or Claude Mythos 5. Covers behavioral differences from Claude Opus 4.8 (effort levels, instruction following, long autonomous runs, memory, subagent delegation) and gives ready-to-use prompt snippets to fix overplanning, unrequested refactors, fabricated progress reports, premature stopping, and unreadable end-of-run summaries.
---

# Prompting Claude Fable 5 and Claude Mythos 5

Behavioral differences and prompting patterns for Claude Fable 5 and Claude
Mythos 5 relative to Claude Opus 4.8. Use this when drafting or auditing
system prompts, skills, or harness instructions targeting these models — not
for general Claude prompting (see the model-agnostic
[Prompting best practices] doc for that) and not for API parameter changes
(see [Introducing Claude Fable 5 and Claude Mythos 5] for adaptive thinking,
summarized-only thinking output, and the `refusal` stop reason).

## When to reach for this skill

- Migrating a prompt/skill/harness from Claude Opus 4.8 to Fable 5 or Mythos 5.
- The model is overplanning, over-explaining, or narrating options it won't take.
- The model refactors or "cleans up" beyond what was asked.
- A long autonomous run reports progress that tool results don't back up.
- The model stops mid-task to ask permission it doesn't need, or ends a turn
  with a stated intent ("I'll now run X") but no tool call.
- End-of-run summaries are dense, jargon-heavy, or assume the reader saw the
  working context.
- Deciding on an `effort` level, or setting up parallel subagents, a memory
  file, or a `send_to_user`-style tool for long-running agents.

## Key behavioral differences from Claude Opus 4.8

Fable 5 is generally more capable across the board, and is particularly
strong at long-horizon autonomy, first-shot correctness on well-specified
problems, vision, enterprise workflows, code review/debugging, navigating
ambiguity, and delegating to parallel subagents. That extra capability
surfaces new failure modes that need explicit steering:

1. **Runs longer by default.** Individual requests can run many minutes at
   higher effort; autonomous runs can extend for hours. Adjust client
   timeouts, streaming, and progress UI; prefer async polling over blocking.
2. **Effort is the main intelligence/latency/cost dial.** Default to `high`;
   use `xhigh` for capability-sensitive work, `medium`/`low` for routine
   tasks. Lower effort on Fable 5 often beats `xhigh` on prior models.
3. **Very strong instruction following.** A short, general instruction now
   steers a whole class of behaviors — no need to enumerate every case.
4. **Can over-elaborate at high effort.** Surveys options it won't pursue,
   over-explains root causes, over-structures PR descriptions, narrates
   obvious code line-by-line.
5. **Can refactor/clean up beyond scope.** Especially at higher effort.
6. **Can occasionally take unrequested actions** (drafting an unrequested
   email, defensive git-branch backups) — state explicit boundaries.
7. **Dispatches parallel subagents more readily** — give explicit guidance
   on when delegation is appropriate and prefer async communication.
8. **Performs well with a persistent memory file** across sessions —
   recording lessons and confirmed approaches, not stuff already in the
   repo/history.
9. **Rare early stopping**: text-only "I'll now do X" with no tool call, or
   asking permission when it already has enough to proceed.
10. **Rare context-budget anxiety**: may suggest a new session or trim its
    own work if the harness surfaces a remaining-token countdown.
11. **Needs the "why," not just the "what.**" Given intent/context, it
    connects the task to relevant information instead of guessing.
12. **End-of-run summaries can be hard to read** after long tool-heavy
    stretches: arrow-chain shorthand, unexplained jargon, references to
    thinking the user never saw.

Safety note: Fable 5 runs classifiers targeting offensive cybersecurity,
biology/life-sciences content, and extraction of its summarized thinking.
Benign work in these areas can still trigger a `refusal` stop reason —
configure fallback to Claude Opus 4.8 if that matters for the use case.
Do NOT instruct the model to echo/transcribe/explain its internal reasoning
as response text — this can itself trigger the reasoning-extraction refusal
category. If reasoning visibility is needed, read the structured `thinking`
blocks instead.

## Ready-to-use prompt snippets

Pick only the snippets relevant to the symptom you're seeing — don't paste
all of them by default; over-instructing a model this steerable just adds
noise.

**Stop overplanning / narrating options on ambiguous tasks:**
```text
When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey. This does not apply to thinking blocks.
```

**Stop unrequested refactors/cleanup at higher effort:**
```text
Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup and a one-shot operation usually doesn't need a helper. Don't design for hypothetical future requirements: do the simplest thing that works well. Avoid premature abstraction and half-finished implementations. Don't add error handling, fallbacks, or validation for scenarios that cannot happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use feature flags or backwards-compatibility shims when you can just change the code.
```

**Brevity / lead with the outcome:**
```text
Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find": the thing the user would ask for if they said "just give me the TLDR." Supporting detail and reasoning come after. Being readable and being concise are different things, and readability matters more.

The way to keep output short is to be selective about what you include (drop details that don't change what the reader would do next), not to compress the writing into fragments, abbreviations, arrow chains like A → B → fails, or jargon.
```

**Only pause when the user is genuinely needed (checkpoint behavior):**
```text
Pause for the user only when the work genuinely requires them: a destructive or irreversible action, a real scope change, or input that only they can provide. If you hit one of these, ask and end the turn, rather than ending on a promise.
```

**Ground progress claims on long/autonomous runs:**
```text
Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.
```

**State explicit boundaries on unrequested actions:**
```text
When the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Don't apply a fix until they ask for one. Before running a command that changes system state (restarts, deletes, config edits), check that the evidence actually supports that specific action. A signal that pattern-matches to a known failure may have a different cause.
```

**Encourage parallel subagent delegation:**
```text
Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track or is missing relevant context.
```

**Bootstrap/maintain a memory file:**
```text
Store one lesson per file with a one-line summary at the top. Record corrections and confirmed approaches alike, including why they mattered. Don't save what the repo or chat history already records; update an existing note rather than creating a duplicate; delete notes that turn out to be wrong.
```
To seed it from history: `Reflect on the previous sessions we've had together. Use subagents to identify core themes and lessons, and store them in [X]. Make sure you know to reference [X] for future use.`

**Fix rare early-stopping in autonomous pipelines:**
```text
You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking "Want me to…?" or "Shall I…?" will block the work. For reversible actions that follow from the original request, proceed without asking. Offering follow-ups after the task is done is fine; asking permission after already discussing with the user before doing the work is not. Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done ("I'll…", "let me know when…"), do that work now with tool calls. End your turn only when the task is complete or you are blocked on input only the user can provide.
```

**Reassure about context budget (only if the harness must surface a countdown):**
```text
You have ample context remaining. Do not stop, summarize, or suggest a new session on account of context limits. Continue the work.
```

**Give intent, not just the request:**
```text
I'm working on [the larger task] for [who it's for]. They need [what the output enables]. With that in mind: [request].
```

**Readable end-of-run summaries after long tool-heavy stretches:**
```text
Terse shorthand is fine between tool calls (that's you thinking out loud, and brevity there is good). Your final summary is different: it's for a reader who didn't see any of that.

If you've been working for a while without the user watching (overnight, across many tool calls, since they last spoke), your final message is their first look at any of it. Write it as a re-grounding, not a continuation of your working thread: the outcome first, then the one or two things you need from them, each explained as if new. The vocabulary you built up while working is yours, not theirs; leave it behind unless you re-introduce it.

When you write the summary at the end, drop the working shorthand. Write complete sentences. Spell out terms. Don't use arrow chains, hyphen-stacked compounds, or labels you made up earlier. When you mention files, commits, flags, or other identifiers, give each one its own plain-language clause. Open with the outcome: one sentence on what happened or what you found. Then the supporting detail. If you have to choose between short and clear, choose clear.
```

## Building a send-to-user tool for long async agents

For long, asynchronous agents that need to deliver content verbatim (a
deliverable, a progress update with specific numbers, a direct reply)
without ending the turn:

```json
{
  "name": "send_to_user",
  "description": "Display a message directly to the user. Use this for progress updates, partial results, or content the user must see exactly as written before the task finishes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The content to display to the user."
      }
    },
    "required": ["message"]
  }
}
```

Render the tool's input directly in the UI and return a simple
acknowledgement as the result — tool inputs aren't summarized, so content
arrives intact. Pair the tool definition with an elicitation instruction, or
Fable 5 rarely calls it:

```text
Between tool calls, when you have content the user must read verbatim (a partial deliverable, a direct answer to their question), call the send_to_user tool with that content. Use send_to_user only for user-facing content, not for narration or reasoning.
```

Don't route narration/internal reasoning through it — over-calling it for
non-user-facing content defeats the purpose. If routine progress narration
is all that's needed, the model's own summaries are usually adequate and no
tool is required.

## Recommended scaffolding changes when migrating

- **Start at the top of your difficulty range.** Give Fable 5 a task harder
  than what you'd assign prior models, and let it scope, ask clarifying
  questions, and execute.
- **Make self-verification explicit on long runs.** Separate, fresh-context
  verifier subagents outperform self-critique:
  `Establish a method for checking your own work at an interval of [X] as you build. Run this every [X interval], verifying your work with subagents against the specification.`
- **Re-audit old prompts/skills instead of porting them as-is.** Skills
  written for prior models are often too prescriptive for Fable 5 and can
  degrade output quality; try removing instructions and see if default
  performance improves.
- **Remove any "show your reasoning" instructions.** These can trigger the
  reasoning-extraction refusal category on Fable 5 (see safety note above).
- **Add a send-to-user tool** for long async agents that must deliver
  verbatim content mid-run (see above).

[Prompting best practices]: /docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
[Introducing Claude Fable 5 and Claude Mythos 5]: /docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5
