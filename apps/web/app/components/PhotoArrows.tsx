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

/** A solid brand-blue chevron, edged in white so it reads over light and dark photos alike. */
function Arrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={`${label} (${side === "left" ? "←" : "→"})`}
			className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-brand-600 opacity-90 transition hover:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden ${side === "left" ? "left-2" : "right-2"}`}
		>
			<svg viewBox="0 0 24 24" className={`h-8 w-8 ${side === "left" ? "-scale-x-100" : ""}`} aria-hidden>
				<path
					d="M8.3 2.6 17.7 12l-9.4 9.4-2.9-2.9 6.5-6.5-6.5-6.5Z"
					fill="currentColor"
					stroke="white"
					strokeWidth="2"
					strokeLinejoin="round"
					paintOrder="stroke"
				/>
			</svg>
		</button>
	);
}
