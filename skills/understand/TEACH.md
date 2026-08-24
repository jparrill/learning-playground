# Phase 3 — Teach

Walk the DAG, **one node per message**. This is the whole phase. The discipline of not
rushing is more important than any individual explanation.

## The step contract

Every node, in this order. Each part has a fixed callout in the log — the table in
[FORMATS.md](./FORMATS.md#callout-vocabulary) is authoritative.

### 1. Tension — `> [!failure] Tension`

Name what the current frontier **cannot do**. This is what makes the next object necessary
rather than arbitrary (doctrine rule 2).

No tension, no step. If you cannot state one, the node is misplaced in the DAG — say so and
fix the plan rather than teaching an unmotivated object.

### 2. Motivated move — prose, **not** boxed

Why would anyone try *this particular* thing? Make the move look like the obvious thing to
reach for, not a rabbit produced from a hat.

This part stays unboxed in the log. It is the argument, and it must read as continuous
reasoning rather than another labelled box.

### 3. The object — `> [!abstract] Definition`

State it as a **real definition** — something that determines the object. Never a list of
properties dressed up as a definition (doctrine rule 1). If the honest form is "the unique
thing satisfying X", say that.

Notation gets introduced here, explicitly flagged as notation.

### 4. Anchor — `> [!important] Anchor`

One line, safe to accept at face value, universal in form where possible. This is what the
user will still hold in a month.

Exactly one anchor per node. Two anchors means two nodes.

### 5. Reframe — `> [!note] Reframe`

If this node recasts something they already hold, **say so explicitly**. Reframes are the
cheapest learning available — existing structure relabelled, not new structure built. Never
let one pass silently.

### 6. Visual — `![[…]]`, or `> [!warning] visual pending`

When the content is genuinely **geometric** — something with shape, orientation, direction,
area — create an SVG illustration and save it to `assets/<nn>-<slug>.svg`.

Do not illustrate the non-geometric. A diagram of an abstract definition is decoration and
costs attention.

### 7. Quiz gate — free-text only

Ask one or two open questions in chat, on **this step only**, and let the user answer in
their own words.

**Never use `AskUserQuestion` in this phase.** Multiple choice is banned here because
options let a learner recognise an answer they could not have generated — Brain A passes,
and the gate measures nothing.

Make the question require the step to be *used*, not recited. Compute something. Predict what
breaks. Apply it to a case not shown.

Grade the **reasoning**, not the answer. A right answer with absent or wrong reasoning is a
fail.

- **Correct** → confirm in one line. **Immediately** update `_map.md` (move node to Locked)
  and `_plan.md` (set node status to `complete`). Then advance to the next node.
- **Wrong** → do **not** advance. Mark node as `in-progress` in `_plan.md` if not already.
  Re-teach by a *different* route: different motivation, different concrete case, add a
  visual, drop half a level. Record the failed route in the log so it is not repeated.
- **Wrong twice** → the node is too big or the edge is lower than the probe found. Split the
  node or back up the DAG. Say which you are doing. Update `_plan.md` with the split.
- **"I don't know"** → treat as wrong, but say the step was under-taught, not that they
  failed.

Log the grade in a `> [!success] Quiz — correct` or `> [!failure] Quiz — missed` callout
carrying the user's answer *and* the reasoning verdict.

Never advance past an unverified step.

### Persistence after every gate

This is crash-safety. After grading each quiz (pass or fail), **immediately write**:

1. `_map.md` — update the node's status (Locked if passed, Shaky if failed, add evidence)
2. `_plan.md` — update the node's `status:` field (`complete` / `in-progress`)

Do not batch these writes. Do not defer them. If the session dies after this write, the next
session can resume from exactly the right point.

## How a rung reads

A rung that is correct but unreadable teaches nothing. Budgets, per rung:

| Part | Budget |
|---|---|
| Tension | 2 sentences |
| Motivated move | ~60 words, 4 short sentences |
| Definition | 1 sentence |
| Anchor | 1 line |
| Reframe | 2 sentences |
| Whole rung, before the quiz | ~150 words |

**These are diagnostics, not gags.** Over budget does not mean *write less* — it means the
rung is carrying two reasoning steps, so **split the node**. Never compress the reason away.

No paragraph longer than four lines. If a paragraph outgrows that, it is doing two jobs —
split it, or move half of it into its callout.

**Plain words before names.** Say what the thing does in everyday language, *then* attach
its name. One new term per rung. Analogy before formalism when the field is new. Every
symbol said out loud the first time it appears.

## Pacing rules

- **One node per message.** No exceptions, including when the next node feels trivial.
- **Never look ahead.** No "we will see later that…" teasers.
- **Never batch quizzes.** Gate each step.
- **Answer interruptions fully, then resume the same node.**
- Write each step to the live log as it is produced, in the callouts above — the user reads
  Obsidian, not the terminal. Cap it at ~3 callouts per rung.

## Compression checkpoint

At each strand's end, or roughly every four nodes, stop walking and harvest (doctrine rule 4).

Ask the user, in chat:

> Before we go on — what does all of that collapse into? Which of these do you actually have
> to remember, and which now follow from the others?

Let them answer first. Their answer *is* the measurement of whether structure formed. Then
give your own compression and reconcile the two — where they differ is exactly where an edge
is missing.

Then:

1. **Write/update the reference note** (`reference/<concept>.md`, schema in
   [FORMATS.md](./FORMATS.md)): generators, motivation-labelled edges, anchors, sources. It
   **must be shorter than the log**. If it is not, no compression happened.
2. **Update `_map.md`**: move nodes to locked, extend the `## Structure` graph with the edges
   actually taught.
3. **Name the next frontier** in one line.

## When the user is struggling

Struggle in the material is the point; struggle in the logistics is a defect. Distinguish
them:

- Struggling to follow a derivation → good, stay, slow down further.
- Struggling because a term was never defined, a step skipped a motivation, notation appeared
  unexplained → your defect. Fix it and apologise once, briefly.

If three consecutive nodes need re-teaching, stop the walk. The probe placed the edge wrong.
Say so plainly and re-probe the affected strand.
