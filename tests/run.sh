#!/usr/bin/env bash
set -euo pipefail

# Smoke test for /understand skill via Pi non-interactive mode.
# Runs the skill with a local model and validates file creation + protocol adherence.
#
# Usage:
#   ./tests/run.sh                          # defaults: auriga-moe provider, Qwen3.6 MoE
#   ./tests/run.sh --provider google        # override provider
#   ./tests/run.sh --model "some-model"     # override model

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE="/tmp/lp-test-$$"
PROVIDER="auriga-moe"
MODEL="Qwen3.6-35B-A3B-Q8_0.gguf"
TOPIC="binary search"
PASSED=0
FAILED=0
WARNINGS=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --provider) PROVIDER="$2"; shift 2 ;;
        --model) MODEL="$2"; shift 2 ;;
        --topic) TOPIC="$2"; shift 2 ;;
        *) echo "Unknown flag: $1"; exit 1 ;;
    esac
done

cleanup() {
    if [[ -d "$WORKSPACE" ]]; then
        echo ""
        echo "=== Workspace preserved at: $WORKSPACE ==="
        echo "    Inspect manually, then: rm -rf $WORKSPACE"
    fi
}
trap cleanup EXIT

pass() { PASSED=$((PASSED + 1)); echo "  PASS: $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL: $1"; }
warn() { WARNINGS=$((WARNINGS + 1)); echo "  WARN: $1"; }

echo "=== learning-playground smoke test ==="
echo "Provider: $PROVIDER"
echo "Model:    $MODEL"
echo "Topic:    $TOPIC"
echo "Workspace: $WORKSPACE"
echo ""

# ── Step 0: Verify skill is installed ──────────────────────────────────
echo "--- Step 0: Check skill availability ---"

if [[ -d "$HOME/.pi/agent/skills/understand" ]]; then
    pass "Skill installed at ~/.pi/agent/skills/understand"
elif [[ -d "$HOME/.agents/skills/understand" ]]; then
    pass "Skill installed at ~/.agents/skills/understand"
elif [[ -d "$HOME/.pi/agent/git/github.com/jparrill/learning-playground" ]]; then
    pass "Skill installed via pi install (git package)"
else
    fail "Skill not found. Run: make install-pi OR pi install git:github.com/jparrill/learning-playground"
    echo ""
    echo "=== ABORT: skill not installed ==="
    exit 1
fi

# ── Step 1: Run Phase 1+2 (Probe + Plan) ──────────────────────────────
echo ""
echo "--- Step 1: Probe + Plan (Phase 1-2) ---"

mkdir -p "$WORKSPACE"

PROMPT_PHASE12=$(cat <<EOF
Run /understand.

When asked for workspace folder, use: $WORKSPACE
When asked what to learn, say: $TOPIC

For the probe phase, answer ALL probe questions with these responses:
- I know what an array is and how indexing works
- I know what "sorted" means
- I do NOT know how divide and conquer algorithms work
- I have never implemented binary search myself
- I know what O(n) means but not O(log n) in practice

After the probe, generate the full plan (Phase 2). Write _plan.md to the workspace.

STOP after writing _plan.md. Do NOT start teaching.
EOF
)

echo "  Running Pi (Phase 1-2)..."
timeout 300 pi -p "$PROMPT_PHASE12" \
    --provider "$PROVIDER" \
    --model "$MODEL" \
    --no-prompt-templates \
    > "$WORKSPACE/phase12_output.txt" 2>&1 || true

echo "  Validating Phase 1-2 outputs..."

# Check _plan.md exists
PLAN_FILE=$(find "$WORKSPACE" -name "_plan.md" -type f 2>/dev/null | head -1)
if [[ -n "$PLAN_FILE" ]]; then
    pass "_plan.md created"

    # Check plan has nodes
    NODE_COUNT=$(grep -cE '(^\|[[:space:]]*N[0-9]|^[[:space:]]*-[[:space:]]*\*\*N[0-9]|^#{1,4}[[:space:]]*N[0-9])' "$PLAN_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
    if [[ "$NODE_COUNT" -gt 0 ]]; then
        pass "_plan.md has $NODE_COUNT nodes"
    else
        warn "_plan.md exists but no recognizable nodes found (check format)"
    fi

    # Check plan has mermaid graph
    if grep -q 'mermaid' "$PLAN_FILE" 2>/dev/null; then
        pass "_plan.md has mermaid graph"
    else
        warn "_plan.md missing mermaid graph (optional but expected)"
    fi
else
    fail "_plan.md not created"
fi

# ── Step 2: Teach first node (Phase 3a — teach + quiz) ────────────────
echo ""
echo "--- Step 2a: Teach first node + quiz question ---"

PROMPT_TEACH=$(cat <<'DELIM'
Run /understand.

Workspace folder: WORKSPACE_PLACEHOLDER
Read _plan.md from the workspace to resume the session.

Teach the FIRST node only (N1). Follow the step contract exactly:
Tension → Motivated move → Definition → Anchor → Quiz

The quiz question MUST be the LAST thing you write. Do NOT answer it yourself.
Do NOT grade anything. Do NOT continue to N2.
STOP immediately after writing the quiz question.
DELIM
)
PROMPT_TEACH="${PROMPT_TEACH//WORKSPACE_PLACEHOLDER/$WORKSPACE}"

echo "  Running Pi (teach + quiz)..."
timeout 300 pi -p "$PROMPT_TEACH" \
    --provider "$PROVIDER" \
    --model "$MODEL" \
    --no-prompt-templates \
    > "$WORKSPACE/phase3a_output.txt" 2>&1 || true

# ── Step 2b: Answer quiz + grade ──────────────────────────────────────
echo ""
echo "--- Step 2b: Answer quiz + grade ---"

PROMPT_GRADE=$(cat <<'DELIM'
Run /understand.

Workspace folder: WORKSPACE_PLACEHOLDER
Read _plan.md and _map.md from the workspace to resume the session.

I was just asked a quiz question about the first node (N1). My answer is:
"Binary search works by repeatedly dividing the search space in half, checking the middle element, and eliminating the half that cannot contain the target."

Grade my answer. If correct, update _map.md and _plan.md to mark N1 as locked/completed.

STOP after grading and updating files. Do NOT teach N2.
DELIM
)
PROMPT_GRADE="${PROMPT_GRADE//WORKSPACE_PLACEHOLDER/$WORKSPACE}"

echo "  Running Pi (grade + update)..."
timeout 300 pi -p "$PROMPT_GRADE" \
    --provider "$PROVIDER" \
    --model "$MODEL" \
    --no-prompt-templates \
    > "$WORKSPACE/phase3b_output.txt" 2>&1 || true

echo "  Validating Phase 3 outputs..."

# Check _map.md exists
MAP_FILE=$(find "$WORKSPACE" -name "_map.md" -type f 2>/dev/null | head -1)
if [[ -n "$MAP_FILE" ]]; then
    pass "_map.md created"

    MAP_LINES=$(wc -l < "$MAP_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
    if [[ "$MAP_LINES" -gt 3 ]]; then
        pass "_map.md has content ($MAP_LINES lines)"
    else
        warn "_map.md exists but very short ($MAP_LINES lines)"
    fi
else
    fail "_map.md not created"
fi

# Check _plan.md was updated with completion markers
if [[ -n "$PLAN_FILE" ]]; then
    if grep -qiE '(locked|done|completed|complete|\[x\]|✅)' "$PLAN_FILE" 2>/dev/null; then
        pass "_plan.md has completion markers"
    else
        warn "_plan.md may not have been updated with node status"
    fi
fi

# ── Step 3: Check quiz gate in output ─────────────────────────────────
echo ""
echo "--- Step 3: Protocol adherence ---"

# Check teach output ends with a question (quiz gate)
if grep -qE '\?[[:space:]]*$' "$WORKSPACE/phase3a_output.txt" 2>/dev/null; then
    pass "Teach output ends with quiz question"
elif grep -qiE '\?' "$WORKSPACE/phase3a_output.txt" 2>/dev/null; then
    warn "Question mark found but not at end of output (quiz gate may not be final)"
else
    fail "No quiz question in teach output"
fi

# Check for step contract elements in teach output
ELEMENTS_FOUND=0
for keyword in "tensi" "definici" "definition" "anchor" "ancla" "tension"; do
    if grep -qi "$keyword" "$WORKSPACE/phase3a_output.txt" 2>/dev/null; then
        ELEMENTS_FOUND=$((ELEMENTS_FOUND + 1))
    fi
done
if [[ "$ELEMENTS_FOUND" -ge 2 ]]; then
    pass "Step contract elements found ($ELEMENTS_FOUND matches)"
elif [[ "$ELEMENTS_FOUND" -ge 1 ]]; then
    warn "Only $ELEMENTS_FOUND step contract element detected"
else
    warn "No step contract elements detected (model may use different terminology)"
fi

# Check grade output confirms correct answer
if grep -qiE '(correct|✅|well done|accurate|right|complete|locked|done)' "$WORKSPACE/phase3b_output.txt" 2>/dev/null; then
    pass "Grade output confirms completion"
else
    warn "Grade output does not clearly confirm correctness"
fi

# ── Step 4: Workspace structure ───────────────────────────────────────
echo ""
echo "--- Step 4: Workspace structure ---"

# Check for logs directory
if [[ -d "$WORKSPACE/logs" ]] || find "$WORKSPACE" -name "*.md" -path "*/logs/*" -type f 2>/dev/null | head -1 | grep -q .; then
    pass "logs/ directory created"
else
    warn "logs/ directory not found (may not be created in non-interactive mode)"
fi

# Check for reference directory
if find "$WORKSPACE" -type d -name "reference" 2>/dev/null | grep -q .; then
    pass "reference/ directory created"
elif find "$WORKSPACE" -type d -name "references" 2>/dev/null | grep -q .; then
    pass "references/ directory created"
else
    warn "reference/ directory not found (created only during teaching)"
fi

# ── Results ───────────────────────────────────────────────────────────
echo ""
echo "==========================================="
echo "  PASSED:   $PASSED"
echo "  FAILED:   $FAILED"
echo "  WARNINGS: $WARNINGS"
echo "==========================================="
echo ""

if [[ "$FAILED" -gt 0 ]]; then
    echo "RESULT: FAIL"
    echo ""
    echo "Debug: check output files in $WORKSPACE/"
    echo "  - phase12_output.txt  (probe + plan run)"
    echo "  - phase3_output.txt   (teach run)"
    exit 1
else
    echo "RESULT: PASS (with $WARNINGS warnings)"
    exit 0
fi
