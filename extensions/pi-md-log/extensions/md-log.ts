import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATE_TYPE = "md-log";

type MdLogState = { path: string | null };
type LogRecord = Record<string, unknown>;

function unquote(value: string): string {
	if (
		value.length >= 2 &&
		((value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'")))
	) {
		return value.slice(1, -1);
	}
	return value;
}

function asRecord(value: unknown): LogRecord {
	return typeof value === "object" && value !== null ? (value as LogRecord) : {};
}

function yamlString(value: string | null): string {
	return value === null ? "null" : JSON.stringify(value);
}

function updateFrontmatter(
	content: string,
	now: string,
	sessionFile: string | null,
): string {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) {
		const frontmatter = [
			"---",
			`created: ${yamlString(now)}`,
			`modified: ${yamlString(now)}`,
			`pi_session: ${yamlString(sessionFile)}`,
			"---",
			"",
		].join("\n");
		return frontmatter + content;
	}

	const fields = match[1].split(/\r?\n/);
	const modifiedIndex = fields.findIndex((line) => /^modified\s*:/.test(line));
	const modified = `modified: ${yamlString(now)}`;
	if (modifiedIndex === -1) fields.push(modified);
	else fields[modifiedIndex] = modified;

	return `---\n${fields.join("\n")}\n---\n${content.slice(match[0].length)}`;
}

async function readOrEmpty(path: string): Promise<string> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (
			typeof error !== "object" ||
			error === null ||
			!("code" in error) ||
			error.code !== "ENOENT"
		) {
			throw error;
		}
		return "";
	}
}

function textValue(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}

function tableCell(value: string): string {
	return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function blockquote(value: string): string {
	return value.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function answerFor(question: LogRecord, answers: LogRecord, cancelled: boolean): string {
	const text = textValue(question.question);
	if (cancelled) return "Cancelada";
	return (text && textValue(answers[text])) || "(sin respuesta)";
}

function answerIncludes(answer: string, label: string): boolean {
	return answer === label || answer.split(/,\s*/).includes(label);
}

function formatQuestionnaire(inputValue: unknown, detailsValue: unknown): string {
	const input = asRecord(inputValue);
	const details = asRecord(detailsValue);
	const questionsValue = Array.isArray(details.questions)
		? details.questions
		: Array.isArray(input.questions)
			? input.questions
			: [];
	const questions = questionsValue.map(asRecord);
	if (questions.length === 0) return "";

	const title = textValue(details.title) ?? textValue(input.title) ?? "Cuestionario";
	const answers = asRecord(details.answers);
	const cancelled = details.cancelled === true;

	if (questions.length === 1) {
		const question = questions[0];
		const questionText = textValue(question.question) ?? "Pregunta";
		const header = textValue(question.header);
		const label = [title === "Cuestionario" ? "Pregunta" : title, header]
			.filter(Boolean)
			.join(" · ");
		const answer = answerFor(question, answers, cancelled);
		const options = Array.isArray(question.options) ? question.options.map(asRecord) : [];
		const optionLines = options.map((option) => {
			const optionLabel = textValue(option.label) ?? "(opción sin nombre)";
			const description = textValue(option.description);
			const suffix = description ? ` — ${description}` : "";
			const marker = answerIncludes(answer, optionLabel) ? "◉" : "○";
			return `> - ${marker} ${optionLabel}${suffix}`;
		});

		return [
			`> [!question] ${label}`,
			blockquote(questionText),
			">",
			"> **Opciones**",
			...optionLines,
			"",
			"> [!note] Respuesta",
			blockquote(answer),
		].join("\n");
	}

	const heading = title === "Cuestionario" ? "**Cuestionario**" : `**Cuestionario** · ${title}`;
	const rows = questions.map((question, index) => {
		const questionText = textValue(question.question) ?? "(pregunta sin texto)";
		return `| ${index + 1} | ${tableCell(questionText)} | ${tableCell(answerFor(question, answers, cancelled))} |`;
	});
	return [
		heading,
		"",
		"| # | Pregunta | Respuesta |",
		"|---:|---|---|",
		...rows,
	].join("\n");
}

function formatAssistantMessage(message: unknown): string {
	const record = asRecord(message);
	if (typeof record.content === "string") return record.content.trimEnd();
	if (!Array.isArray(record.content)) return "";

	return record.content
		.map((part) => {
			const content = asRecord(part);
			if (content.type === "text" && typeof content.text === "string") {
				return content.text;
			}
			return "";
		})
		.filter(Boolean)
		.join("\n\n")
		.trimEnd();
}

function notify(ctx: ExtensionContext, message: string, level: "info" | "error" = "info"): void {
	if (ctx.hasUI) ctx.ui.notify(`md-log: ${message}`, level);
}

export default function mdLog(pi: ExtensionAPI) {
	let targetPath: string | undefined;
	let writeQueue = Promise.resolve();
	let lastWriteError: string | undefined;

	const reportWriteError = (ctx: ExtensionContext, error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		if (message === lastWriteError) return;
		lastWriteError = message;
		notify(ctx, `no se pudo escribir: ${message}`, "error");
	};

	const append = (path: string, content: string, ctx: ExtensionContext): Promise<void> => {
		const operation = writeQueue.then(async () => {
			await mkdir(dirname(path), { recursive: true });
			const current = await readOrEmpty(path);
			const sessionFile = ctx.sessionManager.getSessionFile() ?? null;
			const next = updateFrontmatter(current, new Date().toISOString(), sessionFile);
			if (next !== current) await writeFile(path, next, "utf8");
			if (content) await appendFile(path, content, "utf8");
			lastWriteError = undefined;
		});

		writeQueue = operation.catch((error) => reportWriteError(ctx, error));
		return operation;
	};

	pi.on("session_start", (_event, ctx) => {
		targetPath = undefined;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || entry.customType !== STATE_TYPE) continue;

			const state = entry.data as Partial<MdLogState> | undefined;
			targetPath = typeof state?.path === "string" ? resolve(ctx.cwd, state.path) : undefined;
		}
	});

	pi.registerCommand("md-log", {
		description: "Volcar respuestas del asistente en un fichero Markdown",
		handler: async (args, ctx) => {
			const value = unquote(args.trim());

			if (!value) {
				notify(ctx, targetPath ? `activo: ${targetPath}` : "uso: /md-log /ruta/sesion.md");
				return;
			}

			if (value.toLowerCase() === "off") {
				targetPath = undefined;
				pi.appendEntry(STATE_TYPE, { path: null } satisfies MdLogState);
				notify(ctx, "desactivado");
				return;
			}

			const nextPath = resolve(ctx.cwd, value);
			if (!nextPath.toLowerCase().endsWith(".md")) {
				notify(ctx, "la ruta debe terminar en .md", "error");
				return;
			}
			if (nextPath === targetPath) {
				notify(ctx, `ya activo: ${nextPath}`);
				return;
			}

			try {
				await append(nextPath, "", ctx);
			} catch {
				return;
			}

			targetPath = nextPath;
			pi.appendEntry(STATE_TYPE, { path: nextPath } satisfies MdLogState);
			notify(ctx, `activo: ${nextPath}`);
		},
	});

	pi.on("tool_result", async (event, ctx) => {
		if (!targetPath || event.toolName !== "ask_user") return;

		const output = formatQuestionnaire(event.input, event.details);
		if (!output) return;

		try {
			await append(targetPath, `\n\n${output}\n`, ctx);
		} catch {
			// Reported by append(); logging must not stop the agent.
		}
	});

	pi.on("message_end", async (event, ctx) => {
		if (!targetPath || event.message.role !== "assistant") return;

		const output = formatAssistantMessage(event.message);
		if (!output) return;

		try {
			await append(targetPath, `\n\n${output}\n`, ctx);
		} catch {
			// Reported by append(); logging must not stop the agent.
		}
	});

	pi.on("session_shutdown", async () => {
		await writeQueue;
	});
}
