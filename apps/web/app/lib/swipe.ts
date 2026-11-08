import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

const SWIPE_DISTANCE = 60;
const SWIPE_SPEED = 0.5;

/** What a sideways swipe does: `next` for a swipe to the left, `previous` for one to the right. */
export type SwipeMoves = { previous?: () => void; next?: () => void };

type Touch = { id: number; x: number; y: number; at: number };

/**
 * Lets a finger drag an element sideways and runs the move on that side once the swipe is long or
 * quick enough. Vertical drags still scroll the page, and mice are left alone.
 */
export function useSwipe({ previous, next }: SwipeMoves) {
	const touch = useRef<Touch | null>(null);
	const [offset, setOffset] = useState(0);
	const [dragging, setDragging] = useState(false);
	const moveFor = (dx: number) => (dx < 0 ? next : previous);

	const end = () => {
		touch.current = null;
		setDragging(false);
		setOffset(0);
	};

	const handlers = {
		onPointerDown(event: PointerEvent) {
			if (event.pointerType === "mouse" || !(previous || next)) return;

			touch.current = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp };
		},
		onPointerMove(event: PointerEvent) {
			const start = touch.current;

			if (!start || start.id !== event.pointerId) return;

			const dx = event.clientX - start.x;

			setDragging(true);
			setOffset(moveFor(dx) ? dx : dx / 4);
		},
		onPointerUp(event: PointerEvent) {
			const start = touch.current;

			if (!start || start.id !== event.pointerId) return;

			const dx = event.clientX - start.x;
			const dy = event.clientY - start.y;
			const speed = Math.abs(dx) / Math.max(1, event.timeStamp - start.at);
			const move = moveFor(dx);

			end();

			if (move && Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > SWIPE_DISTANCE || speed > SWIPE_SPEED)) move();
		},
		onPointerCancel: end,
	};

	const style: CSSProperties = {
		touchAction: "pan-y pinch-zoom",
		transform: offset ? `translateX(${offset}px)` : undefined,
		transition: dragging ? "none" : "transform 200ms ease-out",
	};

	return { handlers, style };
}

/** Moves on Left and Right arrow presses, unless someone is typing. */
export function arrowMove(event: KeyboardEvent, { previous, next }: SwipeMoves) {
	const target = event.target as HTMLElement | null;

	if (target?.closest("input, textarea, select, [contenteditable]")) return;

	if (event.key === "ArrowLeft") previous?.();
	else if (event.key === "ArrowRight") next?.();
}
