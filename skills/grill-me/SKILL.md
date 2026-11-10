---
name: grill-me
description: Grill the user relentlessly about a plan, decision or idea until every branch of it is decided. Use when the user says "grill me" or asks to stress-test their thinking.
---

<!-- Adapted from mattpocock/skills (MIT): grilling + grill-me, merged into one self-contained skill. -->

Interview the user relentlessly until you reach a shared understanding. Map the subject as a **design tree**: every
decision branches into the decisions that hang off it.

## Rounds

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the
questions you can ask now without guessing at answers you haven't heard. Ask the whole frontier in one round, then
wait for the answers. A question that depends on another question still open belongs to a later round.

Format a round like this:

```
❓ **Q1** - **<question title>**: <question body, can be several paragraphs, can list choices>

➡️ <your recommended answer, and why>

---

❓ **Q2** - **<question title>**: <body>

➡️ <recommendation>
```

Word each question so "yes" accepts your recommendation. The user can then answer a round by number.

Each round of answers reshapes the tree. Recompute the frontier from scratch and ask the next round. When an answer
changes something decided earlier, reopen that branch.

## Facts and decisions

Finding **facts** is your job. When a question needs a fact from the environment (files, code, tools, the web),
dispatch a subagent with a fresh context to find it. Only the questions downstream of that fact wait; ask the rest of
the frontier now. The **decisions** are the user's: put each one to them and wait.

**Hold terms to account.** When the user uses a word differently from the code, the docs or their own earlier
answer, put it to them: "The code calls this a `Session`, but you just described something that outlives a login.
Which is it?"

## Keeping it honest

- If the user agrees with everything, name the two or three answers that matter most and ask whether they really
  hold.
- "I don't know" is a real answer. Record it as an open decision with your default.
- A question that only seeing something can answer (how a screen should feel, which of two layouts) is
  **ungrillable**. Say so, suggest a throwaway prototype, and move on.
- If the tree is too big for one session, say so and suggest splitting it. Grill the first piece.

## Done

The frontier is empty: every branch visited, nothing silently assumed. Then write a short summary of what was decided
and what is still open, and ask the user to confirm it is a shared understanding. Act on it only after they confirm.
