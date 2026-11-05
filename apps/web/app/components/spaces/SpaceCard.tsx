import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Space } from "@photos/types";
import { SpaceCover } from "./SpaceCover";

/** A space in a grid: its photo cover, name and what's inside. `children` adds owner details or actions below. */
export function SpaceCard({ space, children }: { space: Space; children?: ReactNode }) {
	return (
		<li className="group min-w-0">
			<Link
				to={`/spaces/${space.slug}`}
				className="relative block aspect-[4/3] overflow-hidden rounded-xl shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
				aria-label={`Open ${space.name}`}
			>
				<SpaceCover photos={space.previews} className="h-full w-full" />
				{space.visibility === "private" && <VisibilityBadge className="absolute top-2 left-2" />}
			</Link>
			<h2 className="mt-3 truncate font-display font-bold text-ink-900">{space.name}</h2>
			<p className="text-sm text-ink-500">{spaceCounts(space)}</p>
			{children}
		</li>
	);
}

/** Marks a space only its owner can open. */
export function VisibilityBadge({ className = "" }: { className?: string }) {
	return (
		<span className={`inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur ${className}`}>
			<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
				<rect x="5" y="11" width="14" height="9" rx="2" />
				<path d="M8 11V8a4 4 0 0 1 8 0v3" />
			</svg>
			Private
		</span>
	);
}

/** "12 photos · 2 books" */
export function spaceCounts(space: Pick<Space, "photoCount" | "bookCount">) {
	const photos = `${space.photoCount} ${space.photoCount === 1 ? "photo" : "photos"}`;
	const books = `${space.bookCount} ${space.bookCount === 1 ? "book" : "books"}`;

	return `${photos} · ${books}`;
}
