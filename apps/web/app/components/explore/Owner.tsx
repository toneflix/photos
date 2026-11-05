import type { Owner as OwnerData } from "@photos/types";
import { Avatar } from "~/components/Avatar";

/** Who shared a photo or book. Owners who keep their name off shared work show as a member. */
export function Owner({ owner, light = false }: { owner: OwnerData; light?: boolean }) {
	const name = owner.name ?? "A Toneflix member";

	return (
		<span className={`flex min-w-0 items-center gap-2 text-sm font-medium ${light ? "text-white" : "text-ink-900"}`}>
			{owner.name ? (
				<Avatar user={{ name: owner.name, avatarUrl: owner.avatarUrl }} size="xs" />
			) : (
				<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-300 text-ink-500" aria-hidden>
					<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
						<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z" />
					</svg>
				</span>
			)}
			<span className="truncate">{name}</span>
		</span>
	);
}
