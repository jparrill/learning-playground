---
name: setup-learning-playground
description: "Install learning-playground dependencies and configure Pi or Claude Code to use the /understand skill."
argument-hint: "[--pi | --claude]"
---

# `/setup-learning-playground`

Configure your environment to use the `/understand` skill. Detects whether you are running
Pi or Claude Code and installs the appropriate dependencies.

## Steps

### 1. Detect environment

Check which tool is running:

- **Pi**: the `subagent` tool or `pi` CLI is available. Proceed to Step 2a.
- **Claude Code**: the `Agent` tool is available. Proceed to Step 2b.
- **Unknown**: ask the user which environment they are using.

### 2a. Pi setup

Install required extensions:

```bash
pi install git:github.com/kanker2/pi-md-log
pi install git:github.com/kanker2/pi-ask-user
```

Verify installation:

```bash
pi list
```

Confirm both packages appear. Then tell the user:

> Setup complete. Extensions installed:
> - **pi-md-log** — auto-logs session content to markdown (used by /understand for live notes)
> - **pi-ask-user** — structured questionnaires (used by /understand for probing)
>
> Reload Pi with `/reload` or restart it.
>
> To start learning: `/understand`

### 2b. Claude Code setup

No extensions needed — Claude Code has built-in Write/Edit/Read tools that replace md-log
functionality. The skill writes to log files directly.

Tell the user:

> Setup complete. No additional extensions needed for Claude Code.
> The /understand skill uses built-in tools to write session logs.
>
> To start learning: `/understand`

### 3. Verify skill is loaded

Check that the `/understand` skill is available:

- In Pi: it should appear in the skill list if this repo is installed via
  `pi install git:<repo-url>` or the skills path is configured.
- In Claude Code: it should appear if the plugin is installed or the skill path is added.

If not found, suggest:

**Pi:**
```bash
pi install git:github.com/<owner>/learning-playground
```

**Claude Code:**
```bash
claude plugin install github.com/<owner>/learning-playground
```

Or manually add the skills path to settings.

### 4. Model recommendation

Print this recommendation:

> **Model recommendation for /understand:**
>
> The quality of the learning experience depends heavily on the model.
> For best results, use a frontier model:
>
> - **Planning (Phase 1-2):** Use the best model available (Claude Opus, GPT-4o, Qwen3-235B).
>   The probe and DAG plan are the foundation — a weak plan means weak teaching.
> - **Teaching (Phase 3):** A strong model is still preferred, but mid-tier models
>   (Claude Sonnet, Qwen3-30B Q8) can work for well-planned sessions.
> - **Small/local models (< 14B):** Use `--serial` mode or be prepared for lower
>   quality probing and less nuanced teaching. The skill still works, but the
>   experience degrades.
>
> If using Pi with model routing, consider configuring `skill-model-router` to
> auto-switch to your best model when `/understand` is invoked.
