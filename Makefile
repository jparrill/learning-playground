UNDERSTAND_DOCS := DOCTRINE.md PROBE.md PLAN.md TEACH.md FORMATS.md
PI_GIT_DIR := ~/.pi/agent/git/github.com/jparrill

.PHONY: install-pi install-cc test

install-pi:
	@# Skills
	mkdir -p ~/.pi/agent/skills/understand ~/.pi/agent/skills/setup-learning-playground
	cp skills/understand/variants/pi.md ~/.pi/agent/skills/understand/SKILL.md
	$(foreach doc,$(UNDERSTAND_DOCS),cp skills/understand/$(doc) ~/.pi/agent/skills/understand/;)
	cp skills/setup-learning-playground/SKILL.md ~/.pi/agent/skills/setup-learning-playground/
	@# Extensions (each as its own Pi package)
	mkdir -p $(PI_GIT_DIR)/pi-md-log/extensions
	cp extensions/pi-md-log/package.json extensions/pi-md-log/LICENSE extensions/pi-md-log/README.md $(PI_GIT_DIR)/pi-md-log/
	cp extensions/pi-md-log/extensions/md-log.ts $(PI_GIT_DIR)/pi-md-log/extensions/
	mkdir -p $(PI_GIT_DIR)/pi-ask-user/src
	cp extensions/pi-ask-user/package.json extensions/pi-ask-user/README.md $(PI_GIT_DIR)/pi-ask-user/
	cp extensions/pi-ask-user/src/*.ts $(PI_GIT_DIR)/pi-ask-user/src/
	@echo ""
	@echo "Installed for Pi:"
	@echo "  Skills   -> ~/.pi/agent/skills/{understand,setup-learning-playground}/"
	@echo "  md-log   -> $(PI_GIT_DIR)/pi-md-log/"
	@echo "  ask-user -> $(PI_GIT_DIR)/pi-ask-user/"
	@echo ""
	@echo "Restart Pi or run /reload to activate."

test:
	./tests/run.sh $(ARGS)

install-cc:
	mkdir -p ~/.claude/skills/understand ~/.claude/skills/setup-learning-playground
	cp skills/understand/variants/claude.md ~/.claude/skills/understand/SKILL.md
	$(foreach doc,$(UNDERSTAND_DOCS),cp skills/understand/$(doc) ~/.claude/skills/understand/;)
	cp skills/setup-learning-playground/SKILL.md ~/.claude/skills/setup-learning-playground/
	@echo ""
	@echo "Installed for Claude Code:"
	@echo "  Skills -> ~/.claude/skills/{understand,setup-learning-playground}/"
	@echo ""
	@echo "No extensions needed. Run /understand to start."
