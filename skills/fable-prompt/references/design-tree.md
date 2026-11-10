# Design tree for a Fable 5.2 starter prompt

Each node is a decision. "Needs" lists its prerequisites. A node is on the frontier once everything it needs is
settled. Nodes marked **fact** are yours to find (look in the repo, or dispatch a subagent); do not ask the user.
Prune nodes that do not apply. Add nodes the project needs: the real questions are usually inside the project
(architecture, data, users), not about prompting.

The first round is usually A1, A2, A4, A5, B1 and any facts you can start finding.

## A. The project

- **A1 Goal and why**: what the agent builds, and why it matters to the user. Needs: nothing.
- **A2 Done**: the observable end state. Which tests pass, what runs, what a reviewer checks. Needs: A1.
- **A3 Scope edges**: what is out of scope for this run; what later phases will cover. Needs: A1, A2.
- **A4 Environment (fact)**: repo or greenfield, stack, test and typecheck commands, existing CLAUDE.md, size. Needs:
  nothing.
- **A5 Size check**: one session, or phases with a starter prompt each? Needs: A1, A3. If phases, grill phase 1 only.
- **A6 Project decisions**: the real design questions inside the project (data model, architecture, interfaces). Each
  one is its own branch. Needs: A1, A4. Ungrillable ones (look and feel) become "prototype first, then decide".

## B. Who owns what

- **B1 Code ownership**: is the codebase the agent's own (its call how it is built; it merges repeated code, makes
  related fixes, adds tests and docs, costs about 1.5× tokens), or the user's (minimal change, report nearby problems)?
  Needs: A4.
- **B2 Untouchable areas**: files, directories, services or data the agent must not touch. These become deliberate
  hard blockers. Needs: A4.
- **B3 Behaviour changes**: if B1 = agent's own, may it change how existing features behave, or only with a
  go-ahead? Needs: B1.

## C. Autonomy and approvals

- **C1 Attended or unattended**: is a human watching in real time, or coming back for the result? Needs: A1.
- **C2 Actions that need approval**: name each one exactly (for example "pushing to `main`", "running migrations
  against production", "deleting data", "sending email to customers"). Needs: A4, B2.
- **C3 Routine actions that need no approval**: name them (retrying safe-to-repeat calls, installing dev dependencies,
  creating branches, running tests, editing files under `src/`). Needs: C2.
- **C4 How approval is given**: who approves, and what an approval message looks like. Needs: C1, C2.
- **C5 When to stop**: the few cases where stopping is right (needs a user decision, deliberate blocker). Default is
  the finishing text. Needs: C1, B2.

## D. Run settings

- **D1 Effort**: `medium` for interactive, `high` for long unattended agentic work (default), `xhigh` only for
  measured gains on the hardest work, `max` for open-ended research. Mixed: plan at `medium`, build at `high`. Needs:
  A5, C1.
- **D2 Where it runs (fact or ask)**: Claude Code, Agent SDK, raw API, other harness. Affects `thinking.display` and
  harness reminders. Needs: nothing.
- **D3 Delegation**: none, light (research and review), or orchestrator (Fable plans, other models build). If any:
  which model runs subagents, and when is a subagent worth its cost. Needs: A5, D2.

## E. Communication

- **E1 Progress updates**: human in the loop → opening line, brief updates, closing recap. Asynchronous → updates
  every few tool calls, or none. Needs: C1, D2.
- **E2 Final report**: who reads it (the user, a team, a reviewer agent), and what it must contain (what changed, what
  was verified and how, what is left, open decisions). Needs: C1, A2.
- **E3 Vocabulary**: the project's real names for things, to use in code and reports. Needs: A4, A6.

## F. Verification

- **F1 How the agent proves it is done**: tests, typecheck, a script, screenshots, a demo command. Needs: A2, A4.
- **F2 Checkpoints**: does the agent commit as it goes, keep a progress file for long runs, or stop at milestones for
  review? Needs: A5, C1.

## G. Migration (only when an old prompt was given)

- **G1 Each flagged line**: delegation instructions, a token budget, think-less lines, "treat that answer as done",
  hard style rules, stale cautions, "never" rules without scope, requests to show reasoning. For each: delete, rewrite
  with scope and reason, or keep. Needs: nothing.
