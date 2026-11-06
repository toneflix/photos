import type { SelectHTMLAttributes } from "react";
import type { Space } from "@photos/types";
import { Select } from "~/components/ui";

/** Choose which of your spaces something belongs to, or none. */
export function SpacePicker({ spaces, className = "", ...props }: { spaces: Space[] } & SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<Select {...props} className={`!py-2.5 text-sm ${className}`}>
			<option value="">No space</option>
			{spaces.map((space) => (
				<option key={space.id} value={space.id}>
					{space.name}
					{space.visibility === "private" ? " (private)" : ""}
				</option>
			))}
		</Select>
	);
}
