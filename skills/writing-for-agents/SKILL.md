---
name: writing-for-agents
description: How to write text an agent reads. Use when creating or editing a skill, a CLAUDE.md or AGENTS.md, a system prompt, or a brief for a subagent or Codex.
---

<!-- Adapted from mattpocock/skills (MIT): writing-for-agents + SKILL-MECHANICS, condensed. -->

Any text an agent reads works the same way, whether it is a skill, a CLAUDE.md, a system prompt or a brief. The goal is
not identical output every run. It is that the agent takes the same **process** every run.

## Pointers

A **pointer** is text that stays in context and names material outside it, with the condition for reaching it. A
skill's `description` is a pointer. So is a CLAUDE.md line that says "read `docs/deploy.md` before deploying". The
pointer's wording, not its target, decides when the agent reaches the material. If must-have material is not being
reached, sharpen the pointer first, and inline the material only if that fails.

An always-loaded pointer costs tokens every turn, so prune it harder than the body:
- Put the **leading word** first. That is where the triggering happens.
- Give **one trigger per branch**. Synonyms for the same case count as one branch; keep only the distinct cases.
- Cut anything the body already says.

## Steps, reference and the ladder

A document holds **steps** (actions, in order) and **reference** (rules and facts, consulted when needed). Place each
piece on a ladder by how soon the agent needs it:
1. In-file steps.
2. In-file reference.
3. Disclosed reference: a separate file, reached through a pointer.

Inline what every branch needs. Move behind a pointer what only some branches reach. Keep a concept's definition,
rules and caveats together under one heading. **Sprawl** (a document too long, even if every line is live) thins
attention; the cure is to disclose reference and split by branch.

## Completion criteria

End every step on a **completion criterion** the agent can check. A vague one ("once you understand it") invites
**premature completion**, because the steps still ahead pull attention toward finishing. Sharpen the criterion first.
Make it demanding where thoroughness matters: "every changed caller accounted for" drives more legwork than "list the
changes". The strongest criteria are both checkable and exhaustive.

Split a sequence into separate documents only when the later steps visibly make the agent rush the current one, and
only across a real context boundary (a subagent or a handoff). Inline calls leave the later steps in view.

## Leading words

A **leading word** is a compact concept the model already knows (_tracer bullet_, _red_, _tight loop_, _relentless_).
Repeat the word, never the sentence that defines it, and it anchors a whole region of behaviour in a few tokens.
Look for a triad or a sentence that gestures at one idea, and collapse it: "fast, deterministic, low-overhead" becomes
_tight_. Prefer an existing word to a coined one; a coined word needs a definition and brings no priors.

## Say the positive

A prohibition puts the forbidden behaviour into context and makes it more likely. State the target behaviour instead
("write one-line comments", not "don't write long comments"). Keep a prohibition only for a hard guardrail you
cannot say positively, and pair it with the positive target.

## Pruning

- **One source of truth** for each meaning, so a behaviour change is a one-place edit. Duplication inflates a rule's
  weight past its real rank.
- **The environment is a source of truth** (`package.json` scripts, config, `--help`). Restating it makes a cache that
  goes stale. Write down only what the agent cannot find by looking: unwritten conventions, the reason behind a choice,
  gotchas.
- **Relevance**: delete lines that never bear on the task, or that have gone stale. Without pruning, a document
  collects **sediment**: old cautions nobody dares remove.
- **No-ops**: test every sentence against the model's default. If the model already does it, delete the whole
  sentence. A word too weak to beat the default (_be thorough_) is a no-op too; use a stronger one (_relentless_).

## When the document is a skill

- **Model-invoked** (has a `description`, no `disable-model-invocation`): the agent can fire it on its own, and so can
  other skills. The description is loaded every turn, so write it as a pointer: what it is, then the trigger branches.
- **User-invoked** (`disable-model-invocation: true`): only a person typing its name fires it. No context load, but you
  have to remember it exists. The description becomes a one-line summary for humans.

Choose model-invoked only when the agent must reach the skill by itself. Make each skill self-contained: a skill that
tells the agent to load another skill does not reliably cause it to load, so inline the text it needs.
