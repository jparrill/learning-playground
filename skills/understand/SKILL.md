---
name: understand
description: Build genuine structural understanding of a difficult topic. Probes the learner's exact edge, plans a motivated derivation path as a labelled DAG, then teaches one reasoning step at a time with quiz gates and compression checkpoints. Persists progress to disk after every step.
argument-hint: "[--path <workspace>] [--topic <topic>] [--model <model>]"
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

## Environment detection

This skill works on both Pi and Claude Code. Detect which environment you are in **once** at
session start and adapt accordingly:

### Logging (md-log replacement)

- **Pi with pi-md-log**: activate `/md-log <log-path>`. The extension auto-logs every
  assistant message to the file. You get logging for free.
- **Claude Code / Pi without md-log**: there is no auto-logger. You must **manually append**
  to the log file using Write/Edit tools. Write after each of these events:
  1. Each probe question and the user's answer
  2. Each teaching step (tension, move, definition, anchor, quiz)
  3. Each quiz gate result (pass/fail)
  4. Each plan change or session boundary note

  Format: use the same markdown structure md-log would produce — `## heading` per step,
  fenced code blocks for code/math, mermaid blocks for diagrams.

### Structured questions and quiz gates (ask-user replacement)

- **Pi with pi-ask-user**: use structured questionnaire format for quiz gates and probes.
- **Claude Code**: use the `AskUserQuestion` tool for **all quiz gates** — this is mandatory,
  not optional. The tool mechanically forces the model to stop and wait for the user's answer.
  Without it, long sessions cause the model to drift into lecturing mode and skip quiz gates.
  Also use it for logistical choices (workspace path, domain). For open-ended probe questions
  during Phase 1, ask directly in conversation — free-text answers are better for probing.
- **Either without extensions**: ask directly in conversation text. End the message immediately
  after the question — write NOTHING after the quiz question. Wait for the user's next message.

**Why this matters:** In long sessions, models lose adherence to interactive protocols. They
stop asking and start dumping. The `AskUserQuestion` tool (Claude Code) and `ask-user` (Pi)
are mechanical gates — the model physically cannot continue until the user responds. This is
the only reliable way to preserve quiz gate behavior across session drift and context
compaction.

### Summary

| Capability | Pi + extensions | Pi bare | Claude Code |
|-----------|----------------|---------|-------------|
| Session logging | `/md-log` (auto) | Write/Edit (manual) | Write/Edit (manual) |
| Structured questions | `ask-user` | conversation | `AskUserQuestion` tool |
| File operations | Write/Edit | Write/Edit | Write/Edit |
| Web verification | `web-access` | Bash `curl` | `WebFetch` / Bash `curl` |

## Phase 0 — Bind

This is the onboarding flow. It runs once per session and sets up everything the user needs.
The user's only job is to answer questions — you handle the rest.

### Arguments

Parse the user's input for these flags:

| Flag | Purpose | Default |
|------|---------|---------|
| `--path <dir>` | Workspace directory (contains domain folders) | ask the user |
| `--topic <text>` | What to learn (starts a new domain) | ask the user |
| `--model <name>` | Model to use for this session | keep current model |

**`--path` and `--workspace` are aliases** — accept either.

### Step 0.1 — Resolve the workspace

If `--path` was provided, use that path. Otherwise:

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

### Step 0.2 — Evaluate workspace state and resolve mode

Read the workspace directory. The mode depends on what's inside:

**Case A — Resume (workspace has `_plan.md` or `_map.md`):**
The workspace contains an existing learning session. Read the files and resume.

1. If `--topic` was also provided, **STOP and warn the user**:
   > This workspace already contains a learning session for `<domain>`.
   > To resume it, drop `--topic`. To start a new topic, use a different `--path`.
   Do NOT proceed. Wait for the user to decide.

2. If no `--topic`, read `_plan.md` and `_map.md`:
   - Check for `pending_quiz:` in `_map.md` — if found, re-ask that exact question first.
   - Find the first node with status `pending` or `in-progress` in `_plan.md`.
   - Tell the user where you are picking up and go directly to Phase 3 (Teach).

**Case B — New session (workspace is empty or does not exist):**
No existing state. Start from scratch.

1. Create the workspace if it does not exist: `mkdir -p <path>`
2. If `--topic` was provided, use it. Otherwise ask **one** question:
   > What do you want to understand?
3. Convert the topic into a stable kebab-case domain name (e.g., `quantum-mechanics`,
   `rust-ownership`, `llm-inference`). This becomes the folder name.
4. Create the domain folder structure:
   ```bash
   mkdir -p <workspace>/<domain>/logs
   mkdir -p <workspace>/<domain>/reference
   mkdir -p <workspace>/<domain>/assets
   ```
5. Ask **one** question: what understanding are they aiming at, and why does it matter to
   them? Record it as `goal:` in the log frontmatter.
6. Proceed to Phase 1 (Probe).

### Step 0.3 — Model override

If `--model` was provided:
- **Pi**: switch to that model (if the model is not available, warn and continue with current)
- **Claude Code**: ignore (Claude Code does not support mid-session model switching)

### Step 0.4 — Set up the session log

1. Create the log file: `<workspace>/<domain>/logs/YYYY-MM-DD-<topic-slug>.md`
2. Activate logging per the **Environment detection** section above:
   - Pi + md-log: `/md-log <log-path>`
   - Otherwise: manual Write/Edit after each teaching event
3. **Print the log path** and tell the user to open it in Obsidian or their markdown viewer —
   that note is the real reading surface. LaTeX, mermaid and SVG render there; the terminal
   cannot show any of them.

### Step 0.5 — Read doctrine

1. Read `DOCTRINE.md` (this skill's file).
2. If resuming (Case A), also skim other domains' maps for transferable locked items.

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
4. **Log** — per **Environment detection**: md-log handles this automatically; without it,
   write to the log file using Write/Edit after each teaching step.

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
