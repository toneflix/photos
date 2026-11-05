import type { ReactNode } from "react";

/** One card on a settings page. */
export function Section({
	title,
	description,
	tone = "default",
	children,
}: {
	title: string;
	description?: ReactNode;
	tone?: "default" | "danger";
	children: ReactNode;
}) {
	return (
		<section
			className={`rounded-3xl border bg-white p-6 shadow-sm sm:p-8 ${tone === "danger" ? "border-red-200" : "border-paper-200"}`}
		>
			<h2 className={`font-serif text-2xl ${tone === "danger" ? "text-red-800" : "text-ink-900"}`}>{title}</h2>
			{description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
			<div className="mt-6">{children}</div>
		</section>
	);
}

/** The outcome of a settings form, keyed by the form's `intent`. */
export interface SettingsResult {
	intent: string;
	message: string | null;
	error: string | null;
	fieldErrors: Record<string, string>;
}

/** Pick the result that belongs to one form on the page. */
export function resultFor(result: SettingsResult | undefined, intent: string): SettingsResult | undefined {
	return result?.intent === intent ? result : undefined;
}
