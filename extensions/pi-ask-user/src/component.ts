import type { Theme } from "@earendil-works/pi-coding-agent";
import {
  type Component,
  Editor,
  type EditorTheme,
  Key,
  matchesKey,
  type TUI,
  truncateToWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import type { Option, Question, Result } from "./schema.ts";

// ── TUILike ───────────────────────────────────────────────────────────────────
// Minimal interface satisfied by both the real TUI and a test stub.
export interface TUILike {
  requestRender(): void;
}

// ── QuestionState ─────────────────────────────────────────────────────────────
interface QuestionState {
  /** Visual cursor position — where the highlight is, NOT the answer */
  cursorIndex: number;
  /** Single-select: explicitly chosen option index; null = nothing chosen yet */
  selectedIndex: number | null;
  /** For multiSelect: set of explicitly selected option indices */
  selectedIndices: Set<number>;
  /** Whether the user has confirmed this question */
  confirmed: boolean;
  /** Free-text answer typed via "Other"; null = none */
  freeTextValue: string | null;
  /** Details keyed by regular option index */
  details: Map<number, string>;
  /** Option index currently being edited; last index = "Other" */
  editingIndex: number | null;
  /** Whether the inline Editor is currently active */
  inEditMode: boolean;
}

type DisplayOption = Option & { isOther?: true };

// ── AskUserQuestionComponent ──────────────────────────────────────────────────
export class AskUserQuestionComponent implements Component {
  private questions: Question[];
  private theme: Theme;
  private tui: TUILike;
  private done: (result: Result | null) => void;

  private states: QuestionState[];
  private activeTab: number = 0;
  private editor: Editor;

  // Render cache
  private cachedWidth?: number;
  private cachedLines?: string[];

  // Guard: prevent done() being called more than once
  private _resolved: boolean = false;

  constructor(
    questions: Question[],
    tui: TUILike,
    theme: Theme,
    done: (result: Result | null) => void,
  ) {
    this.questions = questions;
    this.tui = tui;
    this.theme = theme;
    this.done = done;

    this.states = questions.map(() => ({
      cursorIndex: 0,
      selectedIndex: null,
      selectedIndices: new Set<number>(),
      confirmed: false,
      freeTextValue: null,
      details: new Map<number, string>(),
      editingIndex: null,
      inEditMode: false,
    }));

    const editorTheme: EditorTheme = {
      borderColor: (s) => theme.fg("muted", s),
      selectList: {
        selectedPrefix: (s) => theme.fg("accent", s),
        selectedText: (s) => theme.fg("accent", s),
        description: (s) => theme.fg("muted", s),
        scrollInfo: (s) => theme.fg("dim", s),
        noMatch: (s) => theme.fg("warning", s),
      },
    };

    this.editor = new Editor(tui as TUI, editorTheme);
    this.editor.disableSubmit = true;
    this.editor.onChange = () => {
      this.invalidate();
      this.tui.requestRender();
    };

    this.invalidate();
  }

  // ── Derived helpers ─────────────────────────────────────────────────────────

  private allOptions(q: Question): DisplayOption[] {
    return [
      ...q.options,
      { label: "Type your own answer...", isOther: true as const },
    ];
  }

  private renderInlineEditorText(): string {
    const lines = this.editor.getLines();
    const cursor = this.editor.getCursor();
    const text = lines.join(" ");
    const cursorOffset =
      lines
        .slice(0, cursor.line)
        .reduce((offset, line) => offset + line.length + 1, 0) + cursor.col;
    const before = text.slice(0, cursorOffset);
    const after = text.slice(cursorOffset);
    const cursorChar = Array.from(after)[0] ?? " ";
    return `${before}\x1b[7m${cursorChar}\x1b[0m${after.slice(cursorChar.length)}`;
  }

  private renderOptionLabel(
    q: Question,
    state: QuestionState,
    index: number,
    label: string,
  ): string {
    if (index === q.options.length) return label;
    if (state.inEditMode && state.editingIndex === index) {
      return `${label} (${this.renderInlineEditorText()})`;
    }
    const detail = state.details.get(index);
    return detail === undefined ? label : `${label} (${detail})`;
  }

  private allConfirmed(): boolean {
    return this.states.every((s) => s.confirmed);
  }

  private get isSingle(): boolean {
    return this.questions.length === 1;
  }

  private get totalTabs(): number {
    return this.questions.length + 1; // questions + Submit
  }

  // ── Public interface ────────────────────────────────────────────────────────

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  // ── render() ────────────────────────────────────────────────────────────────

  render(width: number): string[] {
    if (this.cachedWidth === width && this.cachedLines) {
      return this.cachedLines;
    }

    if (this.questions.length === 0) {
      return [];
    }

    const t = this.theme;
    const lines: string[] = [];
    const add = (s: string) => lines.push(truncateToWidth(s, width));

    // ── Top separator ──
    add(t.fg("accent", "─".repeat(width)));

    // ── Tab bar (multi-question only) ──
    if (!this.isSingle) {
      this.renderTabBar(width, add);
      lines.push("");
    }

    // ── Question body or Submit tab ──
    const q = this.questions[this.activeTab];
    if (!q) {
      // activeTab is on Submit tab (or out of bounds) — render Submit view
      this.renderSubmitTab(width, add);
    } else {
      const state = this.states[this.activeTab];
      this.renderQuestionBody(q, state, width, add);
    }

    // ── Bottom separator ──
    add(t.fg("accent", "─".repeat(width)));

    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  private renderTabBar(_width: number, add: (s: string) => void): void {
    const t = this.theme;
    const parts: string[] = [" "];

    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      const s = this.states[i];
      const isActive = i === this.activeTab;
      // Truncate header to 12 chars
      const header = truncateToWidth(q.header, 12);
      const label = ` ${header} `;

      let styled: string;
      if (isActive) {
        styled = t.bg("selectedBg", t.fg("text", label));
      } else if (s.confirmed) {
        styled = t.fg("success", ` ■${header} `);
      } else {
        styled = t.fg("muted", `  ${header} `);
      }
      parts.push(styled);
    }

    // Submit tab
    const isSubmitActive = this.activeTab === this.questions.length;
    const submitLabel = " ✓ Submit ";
    let submitStyled: string;
    if (isSubmitActive) {
      submitStyled = t.bg("selectedBg", t.fg("text", submitLabel));
    } else if (this.allConfirmed()) {
      submitStyled = t.fg("success", submitLabel);
    } else {
      submitStyled = t.fg("dim", submitLabel);
    }
    parts.push(submitStyled);

    add(parts.join(""));
  }

  private renderQuestionBody(
    q: Question,
    state: QuestionState,
    width: number,
    add: (s: string) => void,
  ): void {
    const t = this.theme;
    const opts = this.allOptions(q);

    // Question text (word-wrapped)
    {
      const wrapped = wrapTextWithAnsi(
        t.fg("text", ` ${q.question}`),
        width - 2,
      );
      for (const line of wrapped) {
        add(line);
      }
    }
    add("");

    // Options list
    for (let i = 0; i < opts.length; i++) {
      const opt = opts[i];
      const isSelected = i === state.cursorIndex;
      const isOther = opt.isOther === true;
      const optionLabel = this.renderOptionLabel(q, state, i, opt.label);
      const prefix = isSelected ? t.fg("accent", ">") : " ";

      if (q.multiSelect && !isOther) {
        // Checkbox style
        const checked = state.selectedIndices.has(i);
        const box = checked ? t.fg("accent", "[✓]") : t.fg("dim", "[ ]");
        const labelColor = isSelected ? "accent" : "text";
        add(`${prefix} ${box} ${t.fg(labelColor, `${i + 1}. ${optionLabel}`)}`);
      } else if (isOther) {
        // "Type your own answer..." row — check/box matches sibling row format
        const hasFreeText = state.freeTextValue !== null && !state.inEditMode;
        const suffix = state.inEditMode ? t.fg("accent", " ✎") : "";
        const labelColor = isSelected ? "accent" : "muted";
        if (q.multiSelect) {
          // Match multi-select box format: prefix + ' ' + box(3) + ' ' + label
          const box = hasFreeText ? t.fg("success", "[✓]") : t.fg("dim", "[ ]");
          add(
            `${prefix} ${box} ${t.fg(labelColor, `${i + 1}. ${optionLabel}`)}${suffix}`,
          );
        } else {
          // Match single-select format: prefix + ' ' + check(1) + ' ' + label
          const check = hasFreeText ? t.fg("success", "✓") : " ";
          add(
            `${prefix} ${check} ${t.fg(labelColor, `${i + 1}. ${optionLabel}`)}${suffix}`,
          );
        }
        // Free-text keeps its original preview instead of option-detail syntax.
        if (hasFreeText) {
          const indent = q.multiSelect ? "       " : "     ";
          const preview = truncateToWidth(
            state.freeTextValue ?? "",
            width - indent.length,
          );
          add(`${indent}${t.fg("dim", `"${preview}"`)}`);
        }
      } else {
        // Single-select — show ✓ on the confirmed selection
        const isConfirmedChoice = state.selectedIndex === i;
        const check = isConfirmedChoice ? t.fg("success", "✓") : " ";
        const labelColor = isSelected ? "accent" : "text";
        add(
          `${prefix} ${check} ${t.fg(labelColor, `${i + 1}. ${optionLabel}`)}`,
        );
      }

      // Description (not for "Type your own answer...")
      if (!isOther && opt.description) {
        const indent = q.multiSelect ? "       " : "     ";
        const wrapped = wrapTextWithAnsi(
          t.fg("muted", opt.description),
          width - indent.length,
        );
        for (const line of wrapped) {
          add(`${indent}${line}`);
        }
      }
    }

    // Other keeps its original editor below the options; regular option details
    // stay inline with their option row.
    if (state.inEditMode && state.editingIndex === q.options.length) {
      add("");
      add(t.fg("muted", " Your answer:"));
      const editorLines = this.editor.render(width - 4);
      for (const line of editorLines) {
        add(` ${line}`);
      }
    }

    add("");

    // Footer help — context-sensitive based on cursor position
    if (state.inEditMode) {
      add(t.fg("dim", " Enter save · Esc cancel"));
    } else {
      const onOther = state.cursorIndex === opts.length - 1;
      const tabHint = this.isSingle ? "" : " · ←→ switch tabs";
      let actionHint: string;
      if (onOther) {
        actionHint = "Space/Tab open editor";
      } else if (q.multiSelect) {
        actionHint = "Space toggle · Tab details · Enter confirm";
      } else {
        actionHint = "Enter select · Tab details";
      }
      add(t.fg("dim", ` ↑↓ navigate · ${actionHint}${tabHint} · Esc cancel`));
    }
  }

  private renderSubmitTab(_width: number, add: (s: string) => void): void {
    const t = this.theme;
    const allDone = this.allConfirmed();

    const title = allDone
      ? t.fg("success", t.bold(" Ready to submit"))
      : t.fg("warning", t.bold(" Unanswered questions"));
    add(title);
    add("");

    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      const state = this.states[i];
      const answer = this.getAnswerText(q, state);
      if (answer !== null) {
        add(
          t.fg("muted", ` ${truncateToWidth(q.header, 12)}: `) +
            t.fg("text", answer),
        );
      } else {
        add(
          t.fg("dim", ` ${truncateToWidth(q.header, 12)}: `) +
            t.fg("warning", "—"),
        );
      }
    }

    add("");
    if (allDone) {
      add(t.fg("success", " Press Enter to submit"));
    } else {
      const missing = this.questions
        .filter((_, i) => !this.states[i].confirmed)
        .map((q) => truncateToWidth(q.header, 12))
        .join(", ");
      add(t.fg("warning", ` Still needed: ${missing}`));
    }
    add("");
    add(t.fg("dim", " ←→ switch tabs · Esc cancel"));
  }

  private formatOptionAnswer(
    q: Question,
    state: QuestionState,
    index: number,
  ): string {
    const label = q.options[index].label;
    const detail = state.details.get(index);
    return detail === undefined ? label : `${label} (${detail})`;
  }

  private getAnswerText(q: Question, state: QuestionState): string | null {
    if (!state.confirmed) return null;
    if (q.multiSelect) {
      const labels = [...state.selectedIndices]
        .sort((a, b) => a - b)
        .map((idx) => this.formatOptionAnswer(q, state, idx));
      if (state.freeTextValue !== null) labels.push(state.freeTextValue);
      return labels.join(", ");
    }
    if (state.freeTextValue !== null) return state.freeTextValue;
    if (state.selectedIndex !== null) {
      return this.formatOptionAnswer(q, state, state.selectedIndex);
    }
    return null;
  }

  // ── Private navigation helpers ───────────────────────────────────────────────

  private moveCursor(delta: -1 | 1): void {
    const q = this.questions[this.activeTab];
    const state = this.states[this.activeTab];
    const max = this.allOptions(q).length - 1;
    state.cursorIndex = Math.max(0, Math.min(max, state.cursorIndex + delta));
    this.invalidate();
    this.tui.requestRender();
  }

  private toggleSelected(index: number): void {
    const state = this.states[this.activeTab];
    if (state.selectedIndices.has(index)) {
      state.selectedIndices.delete(index);
    } else {
      state.selectedIndices.add(index);
    }
    // If all answers removed, un-confirm so Submit tab blocks correctly
    if (state.selectedIndices.size === 0 && state.freeTextValue === null) {
      state.confirmed = false;
    }
    this.invalidate();
    this.tui.requestRender();
  }

  private enterEditMode(index: number): void {
    const q = this.questions[this.activeTab];
    const state = this.states[this.activeTab];
    state.inEditMode = true;
    state.editingIndex = index;
    const existing =
      index === q.options.length
        ? state.freeTextValue
        : state.details.get(index);
    this.editor.setText(existing ?? "");
    this.invalidate();
    this.tui.requestRender();
  }

  private exitEditMode(save: boolean): void {
    const q = this.questions[this.activeTab];
    const state = this.states[this.activeTab];
    const index = state.editingIndex;
    const isOther = index === q.options.length;
    const text = this.editor.getText().trim();

    if (save && index !== null) {
      if (isOther) {
        state.freeTextValue = text || null;
        if (!q.multiSelect) state.selectedIndex = null;
        if (
          !q.multiSelect &&
          state.selectedIndex === null &&
          state.freeTextValue === null
        ) {
          state.confirmed = false;
        }
        if (
          q.multiSelect &&
          state.selectedIndices.size === 0 &&
          state.freeTextValue === null
        ) {
          state.confirmed = false;
        }
      } else if (text) {
        state.details.set(index, text);
        if (q.multiSelect) {
          state.selectedIndices.add(index);
        } else {
          state.selectedIndex = index;
          state.freeTextValue = null;
        }
      } else {
        state.details.delete(index);
      }
    } else if (!save && isOther && !state.confirmed) {
      // Discard unsaved free-text while preserving a confirmed answer.
      state.freeTextValue = null;
    }

    this.editor.setText("");
    state.inEditMode = false;
    state.editingIndex = null;
    this.invalidate();
  }

  private autoConfirmIfAnswered(): void {
    const q = this.questions[this.activeTab];
    const state = this.states[this.activeTab];
    if (!q || !state || state.confirmed) return;
    if (q.multiSelect) {
      if (state.selectedIndices.size > 0 || state.freeTextValue !== null) {
        state.confirmed = true;
      }
    } else {
      if (state.freeTextValue !== null || state.selectedIndex !== null) {
        state.confirmed = true;
      }
    }
  }

  private confirmAndAdvance(): void {
    const state = this.states[this.activeTab];
    state.confirmed = true;
    this.advance();
  }

  private advance(): void {
    if (this.isSingle) {
      this.submit();
      return;
    }
    if (this.activeTab < this.questions.length - 1) {
      this.activeTab++;
    } else {
      this.activeTab = this.questions.length; // Submit tab
    }
    this.invalidate();
    this.tui.requestRender();
  }

  private submit(): void {
    this._resolved = true;
    this.done(this.buildResult());
  }

  private cancel(): void {
    this._resolved = true;
    this.done(null);
  }

  private buildResult(): Result {
    const answers: Record<string, string> = {};
    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      const s = this.states[i];
      if (!s.confirmed) continue;
      if (q.multiSelect) {
        const labels = [...s.selectedIndices]
          .sort((a, b) => a - b)
          .map((idx) => this.formatOptionAnswer(q, s, idx));
        if (s.freeTextValue !== null) labels.push(s.freeTextValue);
        answers[q.question] = labels.join(", ");
      } else if (s.freeTextValue !== null) {
        answers[q.question] = s.freeTextValue;
      } else if (s.selectedIndex !== null) {
        answers[q.question] = this.formatOptionAnswer(q, s, s.selectedIndex);
      }
    }
    return { questions: this.questions, answers, cancelled: false };
  }

  // ── handleInput() ────────────────────────────────────────────────────────────

  handleInput(data: string): void {
    // Guard: once done has been called, ignore all further input
    if (this._resolved) return;

    // ── Submit tab ─────────────────────────────────────────────────────────────
    // Check Submit tab FIRST — states[activeTab] is undefined when on Submit tab
    if (!this.isSingle && this.activeTab === this.questions.length) {
      if (matchesKey(data, Key.enter)) {
        if (this.allConfirmed()) this.submit();
        return;
      }
      if (matchesKey(data, Key.escape)) {
        this.cancel();
        return;
      }
      if (matchesKey(data, Key.right)) {
        this.activeTab = 0;
        this.invalidate();
        this.tui.requestRender();
        return;
      }
      if (matchesKey(data, Key.left)) {
        this.activeTab = this.questions.length - 1;
        this.invalidate();
        this.tui.requestRender();
        return;
      }
      return;
    }

    const state = this.states[this.activeTab];
    const q = this.questions[this.activeTab];

    // ── Edit mode: route to inline editor ──────────────────────────────────────
    if (state.inEditMode) {
      if (matchesKey(data, Key.escape)) {
        this.exitEditMode(false);
        this.tui.requestRender();
        return;
      }
      if (matchesKey(data, Key.enter)) {
        this.exitEditMode(true);
        const answered = q.multiSelect
          ? state.selectedIndices.size > 0 || state.freeTextValue !== null
          : state.selectedIndex !== null || state.freeTextValue !== null;
        if (!q.multiSelect && answered) {
          this.confirmAndAdvance();
        } else {
          this.tui.requestRender();
        }
        return;
      }
      this.editor.handleInput(data);
      this.invalidate();
      this.tui.requestRender();
      return;
    }

    // ── Question tab ───────────────────────────────────────────────────────────
    if (matchesKey(data, Key.escape)) {
      this.cancel();
      return;
    }

    if (!this.isSingle && matchesKey(data, Key.right)) {
      this.autoConfirmIfAnswered();
      this.activeTab = (this.activeTab + 1) % this.totalTabs;
      this.invalidate();
      this.tui.requestRender();
      return;
    }

    if (!this.isSingle && matchesKey(data, Key.left)) {
      this.autoConfirmIfAnswered();
      this.activeTab = (this.activeTab - 1 + this.totalTabs) % this.totalTabs;
      this.invalidate();
      this.tui.requestRender();
      return;
    }

    if (matchesKey(data, Key.up)) {
      this.moveCursor(-1);
      return;
    }

    if (matchesKey(data, Key.down)) {
      this.moveCursor(1);
      return;
    }

    const opts = this.allOptions(q);
    const onOther = state.cursorIndex === opts.length - 1;

    // Tab opens inline details for regular options; Other keeps its free-text editor.
    if (matchesKey(data, Key.tab)) {
      this.enterEditMode(state.cursorIndex);
      return;
    }
    if (onOther) {
      if (matchesKey(data, Key.space)) {
        this.enterEditMode(state.cursorIndex);
        return;
      }
      if (matchesKey(data, Key.enter) && state.freeTextValue !== null) {
        this.confirmAndAdvance();
        return;
      }
    }

    if (q.multiSelect) {
      if (matchesKey(data, Key.space) && !onOther) {
        // Space = toggle selection
        this.toggleSelected(state.cursorIndex);
        return;
      }
      if (matchesKey(data, Key.enter) && !onOther) {
        if (state.selectedIndices.size > 0 || state.freeTextValue !== null) {
          this.confirmAndAdvance();
        }
        return;
      }
    } else {
      if (matchesKey(data, Key.enter) && !onOther) {
        // Record explicit selection and clear any free-text
        state.selectedIndex = state.cursorIndex;
        state.freeTextValue = null;
        this.confirmAndAdvance();
        return;
      }
    }
  }
}
