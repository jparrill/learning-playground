UNDERSTAND_DOCS := DOCTRINE.md PROBE.md PLAN.md TEACH.md FORMATS.md

.PHONY: install-pi install-cc

install-pi:
	mkdir -p ~/.pi/agent/skills/understand ~/.pi/agent/skills/setup-learning-playground
	cp skills/understand/variants/pi.md ~/.pi/agent/skills/understand/SKILL.md
	$(foreach doc,$(UNDERSTAND_DOCS),cp skills/understand/$(doc) ~/.pi/agent/skills/understand/;)
	cp skills/setup-learning-playground/SKILL.md ~/.pi/agent/skills/setup-learning-playground/
	@echo "Installed for Pi. Run /setup-learning-playground to finish setup."

install-cc:
	mkdir -p ~/.claude/skills/understand ~/.claude/skills/setup-learning-playground
	cp skills/understand/variants/claude.md ~/.claude/skills/understand/SKILL.md
	$(foreach doc,$(UNDERSTAND_DOCS),cp skills/understand/$(doc) ~/.claude/skills/understand/;)
	cp skills/setup-learning-playground/SKILL.md ~/.claude/skills/setup-learning-playground/
	@echo "Installed for Claude Code. Run /setup-learning-playground to verify."
