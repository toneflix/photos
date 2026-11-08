import type { SwipeMoves } from "~/lib/swipe";

/** Previous and next buttons on either side of a photo, for mice. Touch screens swipe instead. */
export function PhotoArrows({ previous, next }: SwipeMoves) {
	return (
		<>
			{previous && <Arrow side="left" label="Previous photo" onClick={previous} />}
			{next && <Arrow side="right" label="Next photo" onClick={next} />}
		</>
	);
}

/** A bare chevron, edged in dark so it reads over light and dark photos alike. */
function Arrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
	const chevron = side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7";

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={`${label} (${side === "left" ? "←" : "→"})`}
			className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-90 transition hover:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden ${side === "left" ? "left-2" : "right-2"}`}
		>
			<svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
				<path d={chevron} stroke="rgb(17 28 51 / 0.7)" strokeWidth="5.5" />
				<path d={chevron} stroke="currentColor" strokeWidth="3" />
			</svg>
		</button>
	);
}
