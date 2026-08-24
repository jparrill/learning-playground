# Phase 1 — Probe

**Purpose.** Teaching at the edge is impossible without knowing where the edge is (doctrine
rule 5), and the plan must be rooted in unconditional truths the user *already accepts*
(rule 1). Probe produces both.

**Budget.** 20 questions is a hard ceiling; ~10 is the target. Announce the ceiling in one
line before the first question. Getting a *correct starting point* is the goal — not a
complete audit of their knowledge.

**Cadence.** Strictly **one question per message**. Never batch. Each answer changes which
question is worth asking next; batching throws that information away. Speed comes from
asking fewer, better-placed questions.

## Step 1 — Self-report

Open with one free-text question, not a quiz:

> Before I start testing: what do you already know in this area, and what have you actually
> worked with? Anything you tell me here is context I don't have to spend questions finding.

A self-report **cannot enter the map** — the Brain-A illusion makes it unreliable as
evidence, and people routinely report fluency they do not have. Its job is to set the
**starting altitude** of each binary search. Trust it to aim, never to conclude.

If the user gives a rich answer, the probe may be very short. If they say "nothing", start
low but still verify — "nothing" is also unreliable.

## Step 2 — Back-chain to strands

Work backwards from the goal: what does it depend on, what does *that* depend on, down to
things that are plainly common ground. Each chain is a **strand**.

Keep this list internal. Showing it now leaks the answers to your own probe questions.

Cull before asking:

- drop anything `_map.md` records as **locked** and recent
- drop anything **inferred-locked** unless a plan root will lean on it directly
- drop anything locked in another domain's map that transfers cleanly
- re-test **stale** locked items only when the goal directly depends on them
- re-test everything marked **shaky**

## Step 3 — Bisect each strand

For each surviving strand:

1. **Start high, not at the base.** The first question sits high in the strand. A correct
   answer eliminates everything beneath it in one move.
2. **Bisect.** Correct → move up. Wrong or unknown → move down. The edge is bracketed when
   one more step in either direction is already determined.
3. **Stop at bracketed.** Do not seek certainty. A start point one step below the true edge
   costs one cheap step of teaching; a full audit costs the whole budget.
4. **Spend by proximity to the goal.** Strands adjacent to the goal get properly bisected.
   Distant strands get **one** confirming question — enough to know the ground is solid.

## Step 4 — Propagate inference

When a correct answer *logically entails* the prerequisites beneath it, mark those
`inferred-locked` and do not test them. If someone correctly explains what a line integral
computes, they are not tested on the dot product.

Record inferred items in the map distinctly from tested ones, so a later session can promote
or demote them cheaply.

## Question construction

Use `AskUserQuestion` for probe questions — one question per call.

If the user prefers to answer probe questions in prose too, honour that: ask the same question
open-ended and grade the reasoning. Multiple choice is a budget convenience for locating an
edge, never a measurement of understanding.

- **Always include an explicit "I don't know" option.** A guess poisons the map, and an
  honest unknown is the single highest-signal answer available. Make it unembarrassing.
- **Options of roughly equal length.** No formatting, length, hedging or specificity tells.
  The longest option must not be the correct one by habit.
- **Test structure, not recall.** A Brain-A answer must not pass. Prefer "what does this
  compute", "why must this hold", "what breaks if we drop this condition" over "what is the
  formula for".
- **Distractors must be plausible to someone at that level** — a common misconception is the
  best distractor, because getting it wrong tells you *which* wrong model they hold.
- **One concept per question.** A question testing two things gives a signal about neither.
- **Plain wording.** Ask in everyday language, and never let an unexplained term appear in a
  question (doctrine rule 7). Keep each option to one line.

## Grading and feedback

- Grade **silently** while probing. Do not narrate correctness — it turns the probe into a
  lesson and inflates the budget.
- **Exception:** when the user answers "I don't know", give the answer in one or two lines.
  No signal is being extracted anyway, and it is free warm-up.
- **Three "I don't know" answers in one strand** means the edge is well below where you
  assumed. Stop bisecting that strand, drop to its base, and plan to build up from there.

## Writing the log

Every question, the answer and the silent grade go into one collapsed callout in the live log
— `> [!example]- Probe — <n> questions, edge located`. Collapsed, because it is a record, not
reading material.

Below it, unboxed, the two lines that *are* reading material: **edge located** and **roots**.

## Writing the map

Write `_map.md` **once, at the end of the phase**, in a single pass. Never leave a
half-written map — a partial map is worse than none, because the next session trusts it.

Record for each item: the claim, the evidence (`probe qN correct`, `answered don't know`,
`inferred-locked from qN`, `self-reported, untested`), and the date.

## Closing the phase

Tell the user, briefly:

- where the edge came out — the highest thing they solidly hold
- which unconditional truths the plan will be rooted in
- anything that came back shaky and will be repaired on the way
- if the ceiling was hit with a strand unresolved: **say which one**, and that teaching will
  start from the lowest confirmed point rather than a guess

Then go to Phase 2.
