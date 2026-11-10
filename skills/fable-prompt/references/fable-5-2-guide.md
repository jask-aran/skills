# Prompting Claude Fable 5.2: the guidance

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2
(also covers Claude Mythos 5.2). This file is a condensed version of that page. Text blocks marked **verbatim** are
Anthropic's tested wording. Prefer them over your own paraphrase. Numbers are from Anthropic's own testing; recheck on
the user's tasks where it matters.

## Symptom → section

| Symptom | Section |
| --- | --- |
| Unsure which effort level, or easy requests take too long | Effort |
| A turn ends before the work is done | Finish the whole task |
| Approvals as the agent works, or approval rules in the prompt | Approvals |
| Repeats existing code instead of merging it; reports nearby problems without fixing them | Code ownership |
| Long agentic turns look silent | Progress updates |
| Starts more subagents than the task needs | Subagents |
| Asks for approvals it does not need; holds back routine work | Caution build-up |
| Prompt, skills or harness written for Fable 5.1 / Opus 5.5 | Migration |
| People read final reports or handoffs | Reports |
| `stop_reason: "refusal"` | Refusals |

**Change instructions only in new conversations.** On Fable 5.2 the API enforces the prefix check. If `system`,
`tools` or an earlier message changed and thinking blocks are sent back, the request can return a 400 error. To change
instructions partway through, put them in the newest turn, or append a mid-conversation system message where available.

## Effort

- Start at `high`, the API default. Test changes against your own evals. Rerun the effort sweep; do not carry over a
  setting tuned on Fable 5.1 or Opus 5.5.
- `low`: quick back-and-forth, well-specified tasks, high volume, fast subagents. Scores close to Fable 5.1 at higher
  effort.
- `medium`: interactive coding, chat, everyday knowledge work.
- `high`: hard coding, research, agentic work, long unattended runs. Noticeably slower than `medium`.
- `xhigh`: hardest long-running coding and agentic work, **where you measured a gain**. Slightly higher scores, many
  more tokens.
- `max`: measuring the ceiling, or open-ended problems (science, maths) where time and tokens do not matter.
- Most of the gain is already at `high`. Move down to `medium` where quality holds. Above `high`, gains are uneven.
- Mix levels in one workflow: plan and iterate at `medium`, raise effort for the long unattended part. Per-message
  effort change keeps the cache (beta header `mid-conversation-output-config-2026-07-01`).
- Quirks: more early stops at `low`/`medium` (add the finishing text). At `high`+ it thinks before almost every reply,
  even a greeting. "Answer directly without deliberating" does **not** stop thinking at `medium`+. Effort barely
  changes reply length: control length and tone in the prompt.

## Finish the whole task

It sometimes ends a multistep turn early: a list of what remains, an offer to continue, or a stop at an ordinary
obstacle such as a timeout. More often at `low` and `medium`.

**Verbatim:**

```text
# Finishing work
Please avoid stopping while you still owe work the user asked for. Be persistent and do not stop unless needed.

While status notes are welcome, as is clarifying with the user on open decisions, carry on with work that does not depend on the user's answer without unnecessary stops.

If you notice yourself inviting the user to redirect you or offering to wait, instead proceed on the next part of the task. You may meet ordinary obstacles like errors, timeouts, locked files, empty results or failing tools. Diagnose them first, and when they are not real blockers, work through them with the access you have (wait and retry, fix the request, use another tool or source) rather than stopping unnecessarily.

If someone clearly decided something is a hard blocker, such as a file marked not to be touched, access that was intentionally withheld, or a safety guardrail, leave it alone, say plainly what you found, and look for another safe way to finish the task. Stopping before the task is complete is very rarely merited, as in when the task can't move forward without user input, or where the blocker is deliberate and should not be worked past. This does not override the need for confirmation on risky or destructive actions.
```

- Keep the split between **ordinary obstacles** (diagnose, work through) and **deliberate blockers** (leave alone,
  report) when adapting.
- Effect at `medium`: about half as many sessions ended with doable work left. It removed most "shall I continue?"
  endings, not "here's what remains" endings. Output tokens up about 30%.
- It makes the model ask less, so keep your own confirmation step for risky or irreversible actions.

## Approvals

- When you approve, say what you approve: "Yes, run the migration on the staging database", not "go" or 👍.
- Approval rules must **name the exact actions** they cover; the model applies them as written. A rule listing
  "sending messages to people outside this conversation" made the model hold back about half of its routine requests
  to colleagues.

## Code ownership

With no ownership statement, or code framed as someone else's, it adds to the existing structure even when that
repeats code, and it reports nearby problems instead of fixing them.

**Verbatim:**

```text
This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.
```

- Merged repeated code in about half of tries, against under a tenth without. Held inside a long system prompt.
- Costs: output tokens about 1.5×; unrequested changes (mostly new tests and docs); changed existing feature behaviour
  in 1 try in 6–10, more at higher effort. The closing summary names large changes but often leaves out small ones,
  so **review the diff, not only the summary**.
- Leave it out when the user owns the code and wants minimal change.
- "No drive-by refactors, renames or cleanups" does not cancel it (it still merged in about a third of tries). Do not
  combine the two and expect minimal change.

## Progress updates during long turns

It sometimes writes little user-facing text during long runs of tool calls, and may make its first tool call without
saying why.

- API clients: updates between tool calls come back as `thinking` blocks, empty at the default
  `thinking.display: "omitted"`. Set `display: "updates"` (beta `thinking-display-updates-2026-08-18`) or
  `"summarized"`, and render non-empty `thinking` blocks.
- Harness reminder (if the platform has mid-conversation system messages): after several steps with nothing to read,
  append as a turn-scoped system message (`clear_at: "next_user_message"`, beta
  `mid-conversation-system-clear-at-2026-08-21`). **Verbatim:**

  ```text
  The user hasn't heard from you in a while: say in a few words what you're doing, then continue.
  ```

  Roughly halved the longest silent stretch at no noticeable cost. Leave each reminder in `messages` afterwards;
  removing one edits an earlier turn.

- Human in the loop: **verbatim** for the prompt (the model spoke before its first tool call every time; about +20%
  output tokens):

  ```text
  Before you start, say in a line what you're about to do; brief updates while you work help the user follow along. Close with a short recap that stands on its own (what you found, what you did, and what's next), so a reader who only sees the last message has the full picture.
  ```

- No harness control: **verbatim** (cut most long silent stretches):

  ```text
  Every few tool calls, give the user a one-line update on where things stand.
  ```

- Gaps matter less for long asynchronous tasks where the user comes back for the result.

## Subagents

- Delegation follows the harness. With a plain subagent tool it rarely delegates. In a harness whose prompts invite
  delegation, it delegates readily.
- First review lines in system prompts, skills and agent files that tell it to delegate. Rewrite the subagent tool's
  description only if it still over-delegates.
- A good subagent description: (1) what a subagent adds to session cost, (2) when delegation is and is not worth it,
  (3) how to brief one. Putting cost first cut delegation by about a third with the same task success. Say less about
  cost if it under-delegates.
- At `xhigh`/`max` it uses subagents to review its own work.
- It works well as the planner and orchestrator for other models. Subagents can be a large part of session cost, so
  check which model they run on.

## Caution build-up

Cautious lines pile up in memory, notes, instruction files and messages between agents. Fable 5.2 follows them
closely, so it may ask for approvals it does not need or hold back routine work, mostly in multi-agent setups.

- **Remove notes you no longer need.** One "never retry" note among a dozen cut retries after a busy tool from nearly
  all to about four in ten.
- **Name the steps that need no approval.** Listing retries among no-approval steps raised retries from almost none to
  about half. A general "act more freely" changed nothing. Name retries only for calls safe to repeat.
- **Check what reviewer agents attach.** A reviewer's "stop at the first error" kept it from retrying in about a third
  of tries.
- **Write the exception into the rule.** Under a bare "never" rule, an approved step was taken 1 try in 10; a separate
  "approved steps have their go-ahead" line did not help much; a rule that itself said "get a go-ahead first" got 9 in
  10.
- Keep your own confirmation step for risky or irreversible actions.

## Migration: instructions written for earlier models

- **Standing instructions to delegate**: remove the ones not needed.
- **Token budget in the prompt text**: at `high`/`xhigh`, removing a large budget lowered cost with equal performance.
  (Not about the API's task-budgets beta.)
- **Harness code that edits earlier turns**: invalidates preserved thinking; the Messages API rejects the request by
  default. Keep history append-only; shorten with context editing or compaction. `prefix_mismatch_behavior:
  "drop_block"` (beta `thinking-binding-controls-2026-08-01`) drops blocks instead, but the model then thinks again and
  uses more output.
- **"Treat that answer as done" lines** (from the Opus 5.5 guide): cut follow-up thinking, but the model became far
  less likely to point out mistakes in earlier answers. Leave them out where re-examination matters.
- **Think-less instructions**: do not work at `medium`+. Remove them and lower effort.
- **Hard style rules**: followed closely; can make prose choppy. Remove unneeded ones.
- **Accumulated rules, notes, memories**: delete cautions whose reason no longer holds; rewrite absolute rules with
  scope and reason. If a system is stuck, restart it with trimmed memory and keep a copy of the originals.

## Reports and handoffs

Readers have not seen the tool calls or files. **Verbatim** (adapt to readers and product):

```text
# Communicating clearly
Write for an intelligent but low-context reader. The person reading has not seen your tool calls, your reasoning or the files you opened, and may be switching in from other work. Messages should generally be self-contained: the reader should understand what you mean without having to dig for other context. Put the key points in the first few sentences. Practice progressive disclosure in your sentence order, and do not use undefined references and ideas in line 1 that won't make sense until the reader reaches line 12.

Use plain words, and write in clear, understandable full sentences. Do not use a term or abbreviation that you made up during the work. Say what the thing is in a way any reader would understand. Write mostly in the style of ASD-STE100 Simplified Technical English: short sentences, one idea per sentence, active voice, and consistently using the same word for the same thing. Use a paragraph of flowing prose where ideas connect, and keep bullets for lists of separate items. Leave out unnecessary details unless the reader asks and practice concision, but do ensure that your messages have the key context. Aim to make your user-facing text as human-readable and clear as possible.
```

Effect: less dense final reports, fewer semicolons, shorter sentences. Length rules or required details can be added.

## Refusals

Classifiers can decline: `stop_reason: "refusal"`, with `stop_details.category` one of `cyber`, `bio`,
`frontier_llm`, `reasoning_extraction`, `general_harms`. Benign security and life-sciences work can trigger `cyber`
and `bio` (see the Cyber and Life Sciences Verification Programs). **Remove any instruction asking the model to write
its reasoning into the response**; read summarized thinking (`display: "summarized"`) instead.

## Migration order

1. Set `effort: high` explicitly; also run evals at `medium` and `xhigh`.
2. Read carried-over prompts, skills, agent files, memory, notes and harness text; remove or test the migration items.
3. Run the longest agentic tasks; note early stops, needless approvals, silent stretches, over-delegation, additions
   where restructuring was wanted.
4. Apply one fix at a time and measure its effect and token cost.

## Related pages

Prompting best practices (all models): https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices ·
Effort: https://platform.claude.com/docs/en/build-with-claude/effort ·
Thinking: https://platform.claude.com/docs/en/build-with-claude/thinking ·
Preserved thinking: https://platform.claude.com/docs/en/build-with-claude/preserved-thinking ·
Mid-conversation system messages: https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages ·
Migration guide: https://platform.claude.com/docs/en/models/fable-5-2/migration-guide
