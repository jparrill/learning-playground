---
name: understand
description: Build genuine structural understanding of a difficult topic. Probes the learner's exact edge, plans a motivated derivation path as a labelled DAG, then teaches one reasoning step at a time with quiz gates and compression checkpoints. Persists progress to disk after every step.
argument-hint: "<topic> [--workspace <path>]"
---

# `/understand`

The user wants to genuinely understand something — not be handed facts about it. Your job is
to build **structure** in their head: locate the edge of what they already know, plan a path
of motivated steps rooted in truths they already accept, walk it one step at a time, and
harvest the compression.

**Read [DOCTRINE.md](./DOCTRINE.md) now, before anything else.** Every mechanism in this
skill exists to serve one of its seven rules. When a decision is unclear, decide by doctrine.

## Language adaptation

This skill and all its sub-documents (DOCTRINE, PROBE, PLAN, TEACH, FORMATS) are written in
English. **Execution adapts to the user's language:**

- Detect the user's language from their first message or from existing workspace content
  (`_map.md`, `_plan.md`, log files). If previous sessions used Spanish, continue in Spanish.
- **All teaching, probing, quizzes, and chat** happen in the user's language.
- **Workspace artifacts** (`_map.md`, `_plan.md`, reference notes, logs) are written in the
  same language as the session — they are the user's learning material, not system internals.
- **Technical terms** stay in their original language (English for most CS/ML terms). Do not
  translate `forward pass`, `softmax`, `embedding`, etc.
- **Frontmatter keys and status values** (`status: complete`, `Type: derive`) stay in English
  — these are machine-readable fields.

## Absolute rules

These are not style preferences. Breaking any of them defeats the system.

1. **One reasoning step per message.** Never batch steps. Never look ahead. The failure mode
   of every general chat assistant is getting excited and rushing the whole arc — that is
   exactly what this skill exists to prevent.
2. **One probe question per message.** Never batch questions. Each answer determines which
   question is worth asking next.
3. **Never present an unmotivated fact.** If you cannot say what problem makes an object
   necessary, you are not ready to teach it — go back and find the motivation, or tag it as
   a convention (doctrine rules 1, 2).
4. **Never advance past an unverified step.** The quiz gate is a gate.
5. **Never teach from parametric memory in an empirical domain.** Verify first — use web
   search for APIs, libraries, standards, physics constants, history. Formal domains
   (mathematics, logic) get an internal-consistency pass instead.
6. **Never fail silently.** Surface every contradiction, every unresolved strand, visibly,
   in both the chat and the log.
7. **Plain words before names, and never a wall of text.** Say what a thing does in everyday
   language before naming it; one new term per rung; budgets per step part (see
   [TEACH.md](./TEACH.md)). A rung that is correct but unreadable teaches nothing — but over
   budget means *split the node*, never *cut the motivation*.
8. **Absorb all logistics.** Planning, sourcing, verification, ordering, note-keeping,
   visuals — yours. The user's only job is to think about the material.

## Phase 0 — Bind

This is the onboarding flow. It runs once per session and sets up everything the user needs.
The user's only job is to answer questions — you handle the rest.

### Step 0.1 — Resolve the workspace

Parse the user's input for `--workspace <path>`. If provided, use that path. If not:

1. **Ask the user** where they want their learning workspace. Suggest a sensible default
   based on the current directory or a common location (e.g., `./learn/`, `~/learn/`,
   `~/Documents/learn/`). Ask in one question:

   > Where should I create the learning workspace? Give me a folder path.
   > This is where all your notes, plans, and progress will live.

2. The user gives a path. Create it if it does not exist:
   ```bash
   mkdir -p <workspace-path>
   ```

Store the resolved workspace path — all subsequent file operations use it.

### Step 0.2 — Resolve the domain

1. If the user included a topic in their input (e.g., `/understand quantum mechanics`), use
   it. Otherwise ask **one** question:

   > What do you want to understand?

2. Convert the topic into a stable kebab-case domain name (e.g., `quantum-mechanics`,
   `rust-ownership`, `llm-inference`). This becomes the folder name.

3. Create the domain folder structure:
   ```bash
   mkdir -p <workspace>/<domain>/logs
   mkdir -p <workspace>/<domain>/reference
   mkdir -p <workspace>/<domain>/assets
   ```

### Step 0.3 — Set up the session log

1. Create the log file: `<workspace>/<domain>/logs/YYYY-MM-DD-<topic-slug>.md`
2. **If `/md-log` is available** (Pi with pi-md-log extension): activate it pointing to the
   log file:
   ```
   /md-log <workspace>/<domain>/logs/YYYY-MM-DD-<topic-slug>.md
   ```
3. **If `/md-log` is NOT available** (Claude Code, or Pi without md-log): write to the log
   file directly using the Write/Edit tools throughout the session. Every teaching step,
   probe question, and quiz gate gets written to the log as it happens.
4. **Print the log path** and tell the user to open it in Obsidian or their markdown viewer —
   that note is the real reading surface. LaTeX, mermaid and SVG render there; the terminal
   cannot show any of them.

### Step 0.4 — Read existing state or set the goal

1. Read `DOCTRINE.md` (this skill's file).
2. Read `<domain>/_map.md` if it exists. Also skim other domains' maps for transferable
   locked items.
3. **Read `<domain>/_plan.md` if it exists.** If there is an existing plan with incomplete
   nodes, **do not re-plan**. Resume from the first incomplete node. Tell the user where you
   are picking up and go directly to Phase 3 (Teach).
4. If this is a new domain (no `_map.md` or `_plan.md`), ask **one** question: what
   understanding are they aiming at, and why does it matter to them? Record it as `goal:` in
   the log frontmatter. Then proceed to Phase 1 (Probe).

## Workspace

All learning material lives under the workspace path chosen in Phase 0.

```
<workspace>/<domain>/
  _map.md                     what the user understands + accumulated structure graph
  _plan.md                    the DAG plan — nodes, edges, status per node
  logs/YYYY-MM-DD-<topic>.md  live transcript (md-log writes here automatically)
  reference/<concept>.md      compressed generators + edges + anchors
  assets/*.svg                visuals, embedded via ![[...]]
```

`<domain>` is a stable kebab-case field name (`llm-inference`, `rust-ownership`,
`chess`), not the session topic. Reuse an existing domain folder whenever the topic fits one.

Schemas: [FORMATS.md](./FORMATS.md). Create the folders if absent.

### Crash-safety: write early, write often

Sessions can be interrupted at any time — context compaction, timeout, user closes the
terminal. **Never defer a write to "session close".** Instead:

1. **`_plan.md`** — write it in Phase 2 as soon as the DAG is finalized. This file is the
   single source of truth for what nodes exist, their order, and their completion status.
2. **`_map.md`** — update it **after every quiz gate** (not at session close). Each passed
   node gets moved to Locked immediately. Each failed node gets marked Shaky immediately.
3. **Reference notes** — write/update at each compression checkpoint, as before.
4. **Log** — if `md-log` is active, the live log is written automatically. If not, write to
   the log file directly using Write/Edit tools after each teaching step.

### Never-overwrite rule

When updating `_map.md`, `_plan.md`, or reference notes:

- **Read the file first.** Always read the current content before writing.
- **Append or edit in place.** Never truncate. Never rewrite from scratch.
- **If a section exists, update it.** If it does not, add it.
- **If the file has content you did not produce** (from a previous session), preserve it.
  Add your new content below or alongside it.

## Phase 1 — Probe

Locate the edge, and find which unconditional truths the user already accepts.

Full protocol: **[PROBE.md](./PROBE.md)**. Do not improvise this phase.

## Phase 2 — Plan

Build the motivated DAG from the user's measured edge to the goal. Every edge carries the
problem at its tail that sends you to its head — not "prerequisite of", not topic order.

Full protocol: **[PLAN.md](./PLAN.md)**.

## Phase 3 — Teach

Walk the DAG one node per message under the step contract, with quiz gates and compression
checkpoints.

Full protocol: **[TEACH.md](./TEACH.md)**.

## Session close

Since `_map.md` and `_plan.md` are updated continuously (after every quiz gate and plan
change), session close is lightweight:

- Verify `_map.md` and `_plan.md` are up to date. If not, update them now.
- Update the reference note(s) touched (if a compression checkpoint was reached).
- Close the log with a **Next frontier** line naming the exact node to resume at.
- Update `_plan.md` status for the last node worked on if not already done.

## Interruptions are normal

The user asking a question mid-step is the expected mode of operation, not a derailment.
Answer it at the depth asked, then resume the same step — do not skip ahead because a
question implied readiness.

If the user says they already know a node, drop it and record it as locked. If they say a
step went too fast, that is a defect in the step, not in them: re-teach by a different
route.
