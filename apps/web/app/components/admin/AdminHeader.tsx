import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "./Icon";

/** The heading across the top of an admin page, with an optional way back and actions on the right. */
export function AdminHeader({ title, description, back, children }: { title: string; description: string; back?: { to: string; label: string }; children?: ReactNode }) {
	return (
		<header className="border-b-[1.5px] border-surface-200 bg-white px-4 py-6 sm:px-8">
			{back && (
				<Link prefetch="intent" to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
					<Icon name="back" className="h-4 w-4" />
					{back.label}
				</Link>
			)}
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					<h1 className="font-display text-3xl font-bold tracking-tight break-words text-ink-900">{title}</h1>
					<p className="mt-1 text-ink-500">{description}</p>
				</div>
				{children && <div className="flex flex-wrap gap-2">{children}</div>}
			</div>
		</header>
	);
}
