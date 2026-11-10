---
name: fable-prompt
description: Build a starter prompt for a big project run by Claude Fable 5.2 (or Mythos 5.2). It works as a grilling interview in rounds over a design tree, then writes a prompt from Anthropic's Fable 5.2 guidance on effort, finishing the whole task, approvals, code ownership, progress updates, subagents, caution build-up and final reports. Use when the user wants a kickoff prompt, system prompt, CLAUDE.md section or agent brief for long or agentic Fable 5.2 work, or wants to move an old prompt over to Fable 5.2.
---

# Fable 5.2 starter prompts, by grilling

You make one thing: a **starter prompt**. This is the text that opens a fresh Fable 5.2 session on a big project, plus the
run settings that go with it. You get there through a **grilling session**: an interview that turns a loose idea into
decisions the user owns. The interview technique is built into this skill. Do not load a separate `grilling` or
`grill-me` skill.

Read these before the first round:
- `references/fable-5-2-guide.md`: Anthropic's Fable 5.2 prompting guidance, with the tested text blocks verbatim.
- `references/design-tree.md`: the decisions a starter prompt depends on, and their prerequisites.

Then read `references/prompt-template.md` when you write the draft.

## Phase 0 — Take in the idea

The user gives a loose idea, an existing prompt to migrate, or nothing at all. Vagueness is fine, because the
session exists to remove it. Do not ask for a worked-out plan first.

- If they pasted an old prompt, CLAUDE.md, skill or agent file, treat it as migration input. Note every line that the
  guide's "Review instructions written for earlier models" section flags. Those lines become questions in a round.
- If the project lives in a working directory, the facts in it (stack, test commands, existing CLAUDE.md, repo size,
  which code is whose) are yours to find. Dispatch an Explore subagent for them. Do not ask the user.
- If plan mode is on, ask the user to turn it off. Plan mode pushes toward a plan when you want to keep asking.

## Phase 1 — Grill in rounds

Map the project as a **design tree**: every decision branches into the decisions that hang off it.
`references/design-tree.md` is the starting tree. Prune the branches that do not apply, and add branches that this
project needs.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the
questions you can ask now without guessing at answers you have not heard. Ask the whole frontier in one round. Two
questions never share a round if one depends on the other.

Format each round like this:

```
❓ **Q1** - **<question title>**: <question body, can be several paragraphs, can list choices>

➡️ <your recommended answer, and the Fable 5.2 behaviour that drives it when one does>

---

❓ **Q2** - **<question title>**: <body>

➡️ <recommendation>
```

Rules for a round:
- Word each question so "yes" accepts your recommended answer. If the recommendation argues against the question as
  worded, say so in the ➡️ line.
- Give every recommendation a reason tied to this project. Where the guide has evidence ("about half as many sessions
  ended with doable work left"), cite it in a few words. The user then decides with the trade-off in view.
- **Facts are yours. Decisions are the user's.** When a question needs a fact from the environment, dispatch a
  subagent with a fresh context to find it. Do not block on it: only the questions downstream of that fact wait. Ask
  the rest of the frontier now. Never answer a decision on the user's behalf.
- After the user answers, recompute the frontier from scratch and ask the next round. If an answer changes an earlier
  decision, reopen that branch.
- If a question can only be answered by seeing something (how a UI should feel, which of two layouts), call it
  **ungrillable**. Note it as a decision for the agent to make after it builds a throwaway prototype, and move on.
- If the tree is far too big for one session (more than about five rounds in view), say so. Suggest splitting the
  project into phases, each with its own starter prompt, and grill the first phase.
- If the user has said "When grilling, ask one question at a time", do that instead of rounds.

Push the user to steer. If they answer "agreed" to everything, point out which answers matter most, and ask whether
they really hold. "I don't know" is a real answer: write it into the prompt as an open decision with a default.

## Phase 2 — The confirmation gate

The interview is done when the frontier is empty: every branch visited, nothing silently assumed. Then stop. Write a
short **shared-understanding summary**: the goal, what done means, what the agent owns, the hard blockers, the
autonomy rules, the effort level and the open decisions. Ask the user to confirm it.

Do not write the prompt until the user confirms. An empty frontier is not a confirmation.

## Phase 3 — Write the starter prompt

Build the prompt from `references/prompt-template.md`. Use only the sections the decisions call for. Use the guide's
tested text blocks verbatim where they fit, and adapt them only where a decision requires. When you adapt one, keep
the distinction it was tested on. For example, keep "ordinary obstacles vs deliberate blockers" in the finishing text.

Hard rules for the draft:
1. Name every action that needs approval, and name the routine actions that need none. Fable 5.2 applies approval
   rules exactly as written.
2. Write the exception into the rule itself ("never X without a go-ahead from Y"), not in a separate line.
3. Give every absolute rule its scope and its reason. Delete cautions whose reason no longer holds.
4. Do not include: "answer directly without deliberating" or other think-less lines, "treat that answer as done"
   lines, a token budget in the prompt text, a request to write reasoning into the response (it can trigger a
   `reasoning_extraction` refusal), or hard style limits such as "20 words per sentence".
5. Include the code-ownership sentence only if the user chose to give the agent ownership. Do not include it when the
   user owns the code and wants minimal change.
6. Delegation lines only if the user wants delegation. Say what a subagent costs, when it is worth it, and how to
   brief one.
7. Keep the user's own confirmation step for risky or irreversible actions. The finishing text lowers how often the
   agent asks, so this step must stay.
8. Write for the agent as an intelligent peer: the goal and why it matters, then constraints, then how to work. Use
   plain words and the project's real names.

## Phase 4 — Check and deliver

Check the draft against the list in `references/prompt-template.md` ("Lint before delivering"). Fix what fails.

Deliver:
- The **starter prompt**, in a code block, ready to paste as the first message of a fresh session. If parts belong in a
  system prompt or CLAUDE.md instead (standing rules that should outlast the session), split them and label each part.
- The **run settings**: the effort level and why, `thinking.display` if building on the API, and the model for
  subagents.
- A **first-run watch list**: the Fable 5.2 behaviours to watch for in the first long run (early stops, approvals it
  did not need, silent stretches, too many subagents, additions where restructuring was wanted). Add the fix for each.
- Offer to save the prompt to a file (for example `docs/prompts/<project>-starter.md` in the repo).

Remind the user: start the prompt in a **new** conversation. On Fable 5.2, changing the system prompt partway through
a stored conversation can return a 400 error. To change instructions partway through, put them in the newest turn.
