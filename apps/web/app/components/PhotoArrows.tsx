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

function Arrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={`${label} (${side === "left" ? "←" : "→"})`}
			className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 transition hover:bg-white pointer-coarse:hidden ${side === "left" ? "left-3" : "right-3"}`}
		>
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
				<path d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</button>
	);
}
