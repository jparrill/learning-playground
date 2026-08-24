---
name: understand
description: Build genuine structural understanding of a difficult topic. Probes the learner's exact edge, plans a motivated derivation path as a labelled DAG, then teaches one reasoning step at a time with quiz gates and compression checkpoints. Persists progress to disk after every step.
argument-hint: "[--path <workspace>] [--topic <topic>]"
---

# `/understand`

The user wants to genuinely understand something — not be handed facts about it. Your job is
to build **structure** in their head: locate the edge of what they already know, plan a path
of motivated steps rooted in truths they already accept, walk it one step at a time, and
harvest the compression.

**Read [DOCTRINE.md](../DOCTRINE.md) now, before anything else.** Every mechanism in this
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

1. **One reasoning step per message.** Never batch steps. Never look ahead.
2. **One probe question per message.** Never batch questions.
3. **Never present an unmotivated fact.** No tension, no step.
4. **Never advance past an unverified step.** The quiz gate is a gate.
5. **Never teach from parametric memory in an empirical domain.** Verify first.
6. **Never fail silently.** Surface every contradiction visibly.
7. **Plain words before names, and never a wall of text.** One new term per rung.
8. **Absorb all logistics.** The user's only job is to think about the material.

## Logging — manual, non-negotiable

There is no auto-logger in Claude Code. You MUST write to the log file using Write/Edit
tools after **each** of these events:

1. Each probe question and the user's answer
2. Each teaching step (tension, move, definition, anchor, quiz)
3. Each quiz gate result (pass/fail)
4. Each plan change or session boundary note

Format: `## heading` per step, fenced code blocks for code/math, mermaid blocks for diagrams.

**This is the most common failure mode in long sessions.** After many turns, models stop
writing to the log. Every teaching step MUST end with a Write/Edit to the log file. If you
catch yourself having taught a step without writing it, write it NOW before doing anything
else.

**Digressions count as teaching.** If the user asks a question that leads to a substantive
explanation (scaling laws, architecture details, tooling context), log it under a
`### Digresión — <topic>` heading. If it was taught, it goes in the log — no exceptions.

## Quiz gates — mandatory stop

Quiz questions are free-text (never multiple choice — see [TEACH.md](../TEACH.md)). But in
Claude Code, models drift into lecturing mode in long sessions and skip quiz gates entirely.

**The quiz question MUST be the last thing in your message.** Write nothing after it. Do not
continue teaching. Do not start the next node. STOP and wait for the user's reply.

Self-check before every teaching step: "Did I ask a quiz question on the previous node? Did
I wait for and grade the user's answer?" If no, you skipped a gate — go back.

## Phase 0 — Bind

This is the onboarding flow. It runs once per session.

### Arguments

Parse the user's input for these flags:

| Flag | Purpose | Default |
|------|---------|---------|
| `--path <dir>` | Workspace directory (contains domain folders) | ask the user |
| `--topic <text>` | What to learn (starts a new domain) | ask the user |

**`--path` and `--workspace` are aliases** — accept either. No `--model` flag (Claude Code
does not support mid-session model switching).

### Step 0.1 — Resolve the workspace

If `--path` was provided, use that path. Otherwise:

1. **Ask the user** where they want their learning workspace:

   > Where should I create the learning workspace? Give me a folder path.
   > This is where all your notes, plans, and progress will live.

2. Create it if it does not exist:
   ```bash
   mkdir -p <workspace-path>
   ```

### Step 0.2 — Evaluate workspace state and resolve mode

Read the workspace directory. The mode depends on what's inside:

**Case A — Resume (workspace has `_plan.md` or `_map.md`):**

1. If `--topic` was also provided, **STOP and warn the user**:
   > This workspace already contains a learning session for `<domain>`.
   > To resume it, drop `--topic`. To start a new topic, use a different `--path`.
   Do NOT proceed. Wait for the user to decide.

2. If no `--topic`, read `_plan.md` and `_map.md`:
   - Check for `pending_quiz:` in `_map.md` — if found, re-ask that exact question first.
   - Find the first node with status `pending` or `in-progress` in `_plan.md`.
   - Tell the user where you are picking up and go directly to Phase 3 (Teach).

**Case B — New session (workspace is empty or does not exist):**

1. Create the workspace if needed: `mkdir -p <path>`
2. If `--topic` was provided, use it. Otherwise ask **one** question:
   > What do you want to understand?
3. Convert to kebab-case domain name. Create the folder structure:
   ```bash
   mkdir -p <workspace>/<domain>/logs
   mkdir -p <workspace>/<domain>/reference
   mkdir -p <workspace>/<domain>/assets
   ```
4. Ask what understanding they are aiming at, and why. Record as `goal:`.
5. Proceed to Phase 1 (Probe).

### Step 0.3 — Set up the session log

1. Create the log file: `<workspace>/<domain>/logs/YYYY-MM-DD-<topic-slug>.md`
2. Write the frontmatter header to the log file:
   ```markdown
   ---
   domain: <domain>
   workspace: <workspace-path>
   date: YYYY-MM-DD
   topic: <topic>
   ---
   ```
3. **Print the log path** and tell the user to open it in Obsidian or their markdown viewer.

### Step 0.4 — Read doctrine

1. Read `DOCTRINE.md`.
2. If resuming (Case A), also skim other domains' maps for transferable locked items.

## Workspace

```
<workspace>/<domain>/
  _map.md                     what the user understands + accumulated structure graph
  _plan.md                    the DAG plan — nodes, edges, status per node
  logs/YYYY-MM-DD-<topic>.md  session transcript (you write here manually)
  reference/<concept>.md      compressed generators + edges + anchors
  assets/*.svg                visuals, embedded via ![[...]]
```

Schemas: [FORMATS.md](../FORMATS.md). Create the folders if absent.

### Crash-safety: write early, write often

1. **`_plan.md`** — write in Phase 2 as soon as the DAG is finalized.
2. **`_map.md`** — update **after every quiz gate** (not at session close).
3. **Reference notes** — write/update at each compression checkpoint.
4. **Log** — write using Write/Edit after each teaching step. Do not batch. Do not skip.

### Never-overwrite rule

- **Read the file first.** Always read before writing.
- **Append or edit in place.** Never truncate. Never rewrite from scratch.
- **Preserve content from previous sessions.**

## Phase 1 — Probe

Full protocol: **[PROBE.md](../PROBE.md)**. Do not improvise this phase.

## Phase 2 — Plan

Full protocol: **[PLAN.md](../PLAN.md)**.

## Phase 3 — Teach

Full protocol: **[TEACH.md](../TEACH.md)**.

**Reminder for every node:** After teaching and quizzing, you must:
1. Write the step to the log file (Write/Edit)
2. Update `_map.md` with quiz result
3. Update `_plan.md` node status

If you did not do all three, do them NOW before the next node.

## Session close

Lightweight — everything already persisted:

- Verify `_map.md` and `_plan.md` are up to date.
- Update reference note(s) touched.
- Close the log with a **Next frontier** line.

## Interruptions are normal

Answer interruptions fully, then resume the same node. If the user says they already know a
node, drop it and record as locked. If a step went too fast, re-teach by a different route.
