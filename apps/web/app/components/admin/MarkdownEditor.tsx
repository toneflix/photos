import { useMemo, useRef, useState } from "react";
import { renderMarkdown } from "~/lib/markdown";

type Mode = "write" | "preview";

/** Wraps the selection, or adds a prefix to each selected line. */
interface Format {
	label: string;
	title: string;
	wrap?: [string, string];
	line?: string;
}

const FORMATS: Format[] = [
	{ label: "H2", title: "Heading", line: "## " },
	{ label: "H3", title: "Small heading", line: "### " },
	{ label: "B", title: "Bold", wrap: ["**", "**"] },
	{ label: "I", title: "Italic", wrap: ["_", "_"] },
	{ label: "•", title: "List", line: "- " },
	{ label: "1.", title: "Numbered list", line: "1. " },
	{ label: "Link", title: "Link", wrap: ["[", "](https://)"] },
];

/** A Markdown field with a formatting bar and a preview drawn by marked, the way the page will look. */
export function MarkdownEditor({ value, onChange, invalid }: { value: string; onChange: (value: string) => void; invalid?: boolean }) {
	const [mode, setMode] = useState<Mode>("write");
	const area = useRef<HTMLTextAreaElement>(null);
	const html = useMemo(() => (mode === "preview" ? renderMarkdown(value) : ""), [mode, value]);

	const apply = (format: Format) => {
		const field = area.current;

		if (!field) return;

		const { selectionStart: start, selectionEnd: end } = field;
		const selected = value.slice(start, end);
		const lineStart = value.lastIndexOf("\n", start - 1) + 1;
		const next = format.wrap
			? `${value.slice(0, start)}${format.wrap[0]}${selected}${format.wrap[1]}${value.slice(end)}`
			: `${value.slice(0, lineStart)}${value
					.slice(lineStart, end)
					.split("\n")
					.map((line) => format.line + line)
					.join("\n")}${value.slice(end)}`;
		const caret = format.wrap ? end + format.wrap[0].length : end + (next.length - value.length);

		onChange(next);
		requestAnimationFrame(() => {
			field.focus();
			field.setSelectionRange(caret, caret);
		});
	};

	const tab = (which: Mode) =>
		`rounded-md px-3 py-1.5 text-sm font-semibold transition ${mode === which ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface-100"}`;

	return (
		<div className="field flex-col !items-stretch !p-0" aria-invalid={invalid ? true : undefined}>
			<div className="flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-surface-200 px-2 py-2">
				<div className="flex gap-1" role="tablist" aria-label="Editor">
					<button type="button" role="tab" aria-selected={mode === "write"} onClick={() => setMode("write")} className={tab("write")}>
						Write
					</button>
					<button type="button" role="tab" aria-selected={mode === "preview"} onClick={() => setMode("preview")} className={tab("preview")}>
						Preview
					</button>
				</div>
				{mode === "write" && (
					<div className="flex flex-wrap gap-1" aria-label="Formatting">
						{FORMATS.map((format) => (
							<button
								key={format.title}
								type="button"
								title={format.title}
								aria-label={format.title}
								onClick={() => apply(format)}
								className="min-w-8 rounded-md px-2 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface-100"
							>
								{format.label}
							</button>
						))}
					</div>
				)}
			</div>
			{mode === "write" ? (
				<textarea
					ref={area}
					required
					value={value}
					onChange={(event) => onChange(event.target.value)}
					rows={24}
					placeholder={"## A heading\n\nWrite in Markdown. Use Preview to see the page."}
					className="field-input min-h-96 resize-y px-4 py-3 font-mono text-sm leading-6 text-ink-900"
				/>
			) : (
				<div className="markdown min-h-96 px-5 py-4" dangerouslySetInnerHTML={{ __html: html || "<p>Nothing written yet.</p>" }} />
			)}
		</div>
	);
}
