# Starter prompt template

Fill each section from the confirmed decisions. Leave out a section when no decision calls for it. Order: goal and
context first, then ownership and limits, then how to work, then how to report. Write in second person, in plain
prose, with the project's real names. Text in `[...]` is guidance; replace it.

```markdown
# <Project name>

## Goal
[A1: what to build and why it matters, in 2–4 sentences. Name the users and the problem.]

## Done means
[A2 + F1: the observable end state, and the commands that prove it. For example: "`pnpm test` and `pnpm typecheck`
pass, `pnpm dev` serves the import page, and a CSV of 10k rows imports in under 5 s."]

## Context
[A4 + A6: stack, layout, the decisions already made and why, and what is out of scope (A3). Point at files rather than
pasting them. List the open decisions the agent makes itself, with the default for each. Ungrillable ones: "build a
throwaway prototype, pick, and say why in the report."]

## Ownership
[B1 = agent's own → verbatim:]
This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.
[B3: then the rule on changing existing behaviour, with its exception written in.]
[B1 = user's → "This code belongs to <owner>. Make the smallest change that does the job, and report problems you
see nearby instead of fixing them." Do NOT also add the ownership sentence.]

## Limits and approvals
[B2: hard blockers, each with its reason: "Do not edit `vendor/`; it is generated from upstream."]
[C2: each action that needs approval, with the exception inside the rule: "Never push to `main` without a go-ahead
from me in this conversation."]
[C3: "These need no approval: <named routine actions>." Name retries only for calls safe to repeat.]
[C4: how approvals arrive.]

## How to work
[C5 / unattended or medium effort → the "Finishing work" block, verbatim from the guide.]
[F2: checkpoints: commits, a progress file (for example `PROGRESS.md`) for long runs, milestones.]
[D3: delegation, if any: what a subagent costs, when it is and is not worth it, how to brief one, which model.]
[E1: the update text that matches C1 and D2, verbatim from the guide.]

## Final report
[E2: the "Communicating clearly" block, verbatim from the guide, adapted to the reader. Then the required content: what
changed, how it was verified, what is left, decisions made on the user's behalf, and "list every change, including
small ones, because I review the diff against your list."]
```

## Run settings to deliver with the prompt

- **Effort** (D1), with the reason. In Claude Code: `/effort <level>` (or the model picker); in the API: `effort`.
- **thinking.display** (API only): `"updates"` when a human watches, `"summarized"` to inspect reasoning.
- **Subagent model** (D3), if any.
- **Fresh session**: start in a new conversation; put later instruction changes in the newest turn.

## Lint before delivering

Fail the draft and fix it if any of these hold:

1. An approval rule says "risky actions" or similar instead of naming the actions.
2. A "never" rule has no scope or reason, or its exception sits in a separate line.
3. No list of routine actions that need no approval, while approval rules exist.
4. Contains a think-less line, "treat that answer as done", a token budget, a request to show reasoning in the reply,
   or a hard sentence-length or style limit.
5. Has the ownership sentence while the user wants minimal change, or pairs it with "no drive-by refactors" and
   expects minimal change.
6. Long or unattended run at `low`/`medium` without the finishing text.
7. Finishing text present, but the user's confirmation step for risky or irreversible actions is gone.
8. Delegation encouraged without cost, when-worth-it and how-to-brief guidance.
9. "Done" cannot be checked by a command or an observation.
10. Uses a term the agent cannot know (an abbreviation from the grilling session, a name not in the repo) without
    defining it.
11. Stale cautions carried over from an old prompt whose reason no longer holds.
12. Effort above `high` with no measured reason.
