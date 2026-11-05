import type { SelectHTMLAttributes } from "react";
import type { Space } from "@photos/types";

/** Choose which of your spaces something belongs to, or none. */
export function SpacePicker({ spaces, className = "", ...props }: { spaces: Space[] } & SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			{...props}
			className={`block w-full cursor-pointer rounded-lg border border-surface-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition hover:border-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none ${className}`}
		>
			<option value="">No space</option>
			{spaces.map((space) => (
				<option key={space.id} value={space.id}>
					{space.name}
					{space.visibility === "private" ? " (private)" : ""}
				</option>
			))}
		</select>
	);
}
