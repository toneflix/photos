import type { ReactNode } from "react";

/** The heading of one settings page. */
export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
	return (
		<header className="mb-8">
			<h1 className="font-display font-bold tracking-tight text-4xl text-ink-900">{title}</h1>
			{description && <p className="mt-2 max-w-2xl text-ink-500">{description}</p>}
		</header>
	);
}

/** One card on a settings page. */
export function Section({
	title,
	description,
	tone = "default",
	children,
}: {
	title?: string;
	description?: ReactNode;
	tone?: "default" | "danger";
	children: ReactNode;
}) {
	return (
		<section
			className={`panel p-6 sm:p-8 ${tone === "danger" ? "!border-red-300" : ""}`}
		>
			{title && <h2 className={`font-display font-bold tracking-tight text-2xl ${tone === "danger" ? "text-red-800" : "text-ink-900"}`}>{title}</h2>}
			{description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
			<div className={title || description ? "mt-6" : ""}>{children}</div>
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
