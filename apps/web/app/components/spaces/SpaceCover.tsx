import type { Photo } from "@photos/types";

/** Up to four photos tiled as a space's cover, or a soft brand wash when it has none yet. */
export function SpaceCover({ photos, className = "" }: { photos: Photo[]; className?: string }) {
	const tiles = photos.slice(0, 4);

	if (!tiles.length) {
		return (
			<div className={`flex items-center justify-center bg-gradient-to-br from-brand-50 via-surface-100 to-gold-50 ${className}`} aria-hidden>
				<svg viewBox="0 0 24 24" className="h-10 w-10 text-brand-700/40" fill="none" stroke="currentColor" strokeWidth="1.5">
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<circle cx="9" cy="10" r="1.8" />
					<path d="m21 16-5-5-8 8" strokeLinejoin="round" />
				</svg>
			</div>
		);
	}

	const layout = ["grid-cols-1", "grid-cols-2", "grid-cols-2 grid-rows-2", "grid-cols-2 grid-rows-2"][tiles.length - 1];

	return (
		<div className={`grid gap-0.5 bg-surface-200 ${layout} ${className}`} aria-hidden>
			{tiles.map((photo, index) => (
				<img
					key={photo.id}
					src={photo.url}
					alt=""
					loading="lazy"
					decoding="async"
					className={`fade-in-img h-full w-full object-cover ${tiles.length === 3 && index === 0 ? "row-span-2" : ""}`}
				/>
			))}
		</div>
	);
}
