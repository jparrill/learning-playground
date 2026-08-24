# learning-playground

Structured learning skill for AI coding agents (Pi, Claude Code).

## Structure

- `skills/understand/` — the `/understand` skill and all its sub-documents
- `skills/setup-learning-playground/` — environment setup skill for Pi and Claude Code
- `examples/` — example domain workspaces from real sessions

## Standards

- Skill documents are written in English
- Execution adapts to the user's language
- All file schemas are defined in `skills/understand/FORMATS.md`
- The skill is designed to work with Pi (via md-log extension) and Claude Code (via built-in tools)

## Key design principles

- **Crash-safe**: all progress is written to disk immediately, never deferred to session close
- **Never overwrite**: files are read-then-updated, never rewritten from scratch
- **Resumable**: `_plan.md` + `_map.md` enable any new session to pick up exactly where the last one stopped
