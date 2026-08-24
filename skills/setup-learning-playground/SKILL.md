---
name: setup-learning-playground
description: "Configure the /understand skill for your CLI environment. Installs dependencies and selects the right skill variant."
argument-hint: "[--pi | --claude]"
---

# `/setup-learning-playground`

Configure the `/understand` skill for your environment. This skill detects (or asks) which
CLI you use and installs the appropriate variant.

## Steps

### 1. Determine the CLI

If `--pi` or `--claude` was passed, use that. Otherwise ask the user:

> Which CLI do you use for coding?
>
> 1. **Pi** (pi-coding-agent)
> 2. **Claude Code**

### 2a. Pi setup

Extensions are bundled in this repo. Install everything with:

```bash
make install-pi
```

If `make` is not available (e.g., running from within Pi), copy manually:

```bash
# Skills
mkdir -p ~/.pi/agent/skills/understand ~/.pi/agent/skills/setup-learning-playground
cp skills/understand/variants/pi.md ~/.pi/agent/skills/understand/SKILL.md
cp skills/understand/DOCTRINE.md skills/understand/PROBE.md skills/understand/PLAN.md skills/understand/TEACH.md skills/understand/FORMATS.md ~/.pi/agent/skills/understand/

# Extensions
mkdir -p ~/.pi/agent/git/github.com/jparrill/pi-md-log/extensions
cp extensions/pi-md-log/package.json extensions/pi-md-log/LICENSE extensions/pi-md-log/README.md ~/.pi/agent/git/github.com/jparrill/pi-md-log/
cp extensions/pi-md-log/extensions/md-log.ts ~/.pi/agent/git/github.com/jparrill/pi-md-log/extensions/
mkdir -p ~/.pi/agent/git/github.com/jparrill/pi-ask-user/src
cp extensions/pi-ask-user/package.json extensions/pi-ask-user/README.md ~/.pi/agent/git/github.com/jparrill/pi-ask-user/
cp extensions/pi-ask-user/src/*.ts ~/.pi/agent/git/github.com/jparrill/pi-ask-user/src/
```

Tell the user:

> Setup complete for Pi.
>
> Extensions installed (bundled, originally by [@kanker2](https://github.com/kanker2)):
> - **pi-md-log** — auto-logs session content to markdown
> - **pi-ask-user** — structured questionnaires for probing
>
> Skill variant: **Pi** (auto-logging, extension-based quiz gates)
>
> Restart Pi or run `/reload` to activate.
> To start learning: `/understand`

### 2b. Claude Code setup

No extensions needed. Install with:

```bash
make install-cc
```

Or manually:

```bash
mkdir -p ~/.claude/skills/understand ~/.claude/skills/setup-learning-playground
cp skills/understand/variants/claude.md ~/.claude/skills/understand/SKILL.md
cp skills/understand/DOCTRINE.md skills/understand/PROBE.md skills/understand/PLAN.md skills/understand/TEACH.md skills/understand/FORMATS.md ~/.claude/skills/understand/
```

Tell the user:

> Setup complete for Claude Code.
>
> No extensions needed — Claude Code uses built-in Write/Edit tools for logging.
>
> Skill variant: **Claude Code** (manual logging, explicit quiz gate stops)
>
> To start learning: `/understand`

### 3. Verify skill is loaded

Check that `/understand` is available in the skill list. If not found, suggest:

**Pi:**
```bash
pi install git:github.com/jparrill/learning-playground
```

**Claude Code:**
```bash
claude plugin install github.com/jparrill/learning-playground
```

### 4. Model recommendation

Print this recommendation:

> **Model recommendation for /understand:**
>
> The quality of the learning experience depends heavily on the model.
>
> - **Planning (Phase 1-2):** Use the best model available (Claude Opus, GPT-4o, Qwen3-235B).
>   The probe and DAG plan are the foundation — a weak plan means weak teaching.
> - **Teaching (Phase 3):** A strong model is still preferred, but mid-tier models
>   (Claude Sonnet, Qwen3-30B Q8) can work for well-planned sessions.
> - **Small/local models (< 14B):** The skill still works, but probing and teaching
>   quality degrades significantly.
>
> If using Pi with model routing, consider configuring
> [`skill-model-router`](https://github.com/jparrill/skill-model-router) to auto-switch
> to your best model when `/understand` is invoked.
