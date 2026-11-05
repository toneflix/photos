import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BookWithPages } from "@photos/types";
import {
	BackCoverView,
	BlankPageView,
	ColophonView,
	CoverView,
	PageView,
	TitlePageView,
} from "./PageView";
import { enterLandscape, useElementSize, useOrientation } from "./useViewport";

/** Width / height of one page. */
const PAGE_ASPECT = 3 / 4;
const TURN_MS = 900;

type Face =
	| { kind: "cover" }
	| { kind: "title" }
	| { kind: "page"; index: number }
	| { kind: "blank" }
	| { kind: "colophon" }
	| { kind: "back" };

type Leaf = { front: Face; back: Face };

/**
 * Build the physical leaves of the book. In a two-page spread every leaf has a
 * page on each side; in single-page mode each page gets its own leaf with a
 * blank back.
 */
function buildLeaves(pageCount: number, spread: boolean): Leaf[] {
	const pages: Face[] = Array.from({ length: pageCount }, (_, index) => ({ kind: "page", index }));

	if (!spread) {
		const faces: Face[] = [{ kind: "cover" }, { kind: "title" }, ...pages, { kind: "colophon" }, { kind: "back" }];
		return faces.map((front) => ({ front, back: { kind: "blank" } }));
	}

	const faces: Face[] = [
		{ kind: "cover" },
		{ kind: "title" },
		...pages,
		...(pageCount % 2 === 1 ? [{ kind: "blank" } as Face] : []),
		{ kind: "colophon" },
		{ kind: "back" },
	];
	const leaves: Leaf[] = [];
	for (let i = 0; i < faces.length; i += 2) leaves.push({ front: faces[i], back: faces[i + 1] });
	return leaves;
}

export function Flipbook({
	book,
	topLeft,
	topRight,
}: {
	book: BookWithPages;
	/** Extra controls for the top bar, e.g. a close link or an edit button. */
	topLeft?: ReactNode;
	topRight?: ReactNode;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const stage = useElementSize(stageRef);
	const { ready, portrait, touch } = useOrientation();

	const [portraitChoice, setPortraitChoice] = useState<"ask" | "single">("ask");
	const [fullscreen, setFullscreen] = useState(false);
	const [chromeVisible, setChromeVisible] = useState(true);

	// Phones held upright are asked to rotate. Landscape is the default way to
	// read; single pages are the fallback when someone chooses to stay upright.
	const mobilePortrait = ready && touch && portrait;
	const showRotatePrompt = mobilePortrait && portraitChoice === "ask";
	const narrow = stage.width > 0 && stage.width / stage.height < 0.95;
	const spread = !(mobilePortrait && portraitChoice === "single") && !narrow;

	const leaves = useMemo(() => buildLeaves(book.pages.length, spread), [book.pages.length, spread]);
	const [flipped, setFlipped] = useState(0);
	const [turning, setTurning] = useState<{ leaf: number; until: number } | null>(null);

	// Keep the reader on roughly the same page when the mode changes.
	const prevSpread = useRef(spread);
	useEffect(() => {
		if (prevSpread.current === spread) return;
		setFlipped((f) => (spread ? Math.ceil(f / 2) : Math.max(0, f * 2 - 1)));
		prevSpread.current = spread;
	}, [spread]);

	const go = useCallback(
		(target: number) => {
			setFlipped((current) => {
				const next = Math.max(0, Math.min(leaves.length, target));
				if (next === current) return current;
				const leaf = next > current ? current : next;
				setTurning({ leaf, until: Date.now() + TURN_MS });
				return next;
			});
		},
		[leaves.length],
	);
	const next = useCallback(() => go(flipped + 1), [go, flipped]);
	const prev = useCallback(() => go(flipped - 1), [go, flipped]);

	useEffect(() => {
		if (!turning) return;
		const t = setTimeout(() => setTurning(null), Math.max(0, turning.until - Date.now()));
		return () => clearTimeout(t);
	}, [turning]);

	// Keyboard: arrows, page keys, space, home/end.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (["ArrowRight", "PageDown", " "].includes(e.key)) {
				e.preventDefault();
				next();
			} else if (["ArrowLeft", "PageUp"].includes(e.key)) {
				e.preventDefault();
				prev();
			} else if (e.key === "Home") go(0);
			else if (e.key === "End") go(leaves.length);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [next, prev, go, leaves.length]);

	// Hide the controls while reading; any movement brings them back.
	const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const poke = useCallback(() => {
		setChromeVisible(true);
		clearTimeout(hideTimer.current);
		hideTimer.current = setTimeout(() => setChromeVisible(false), 3000);
	}, []);
	useEffect(() => {
		poke();
		return () => clearTimeout(hideTimer.current);
	}, [poke]);

	useEffect(() => {
		const onChange = () => setFullscreen(!!document.fullscreenElement);
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);

	const toggleFullscreen = async () => {
		if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
		else if (rootRef.current) await enterLandscape(rootRef.current);
	};

	// Page size: as large as fits, keeping the page aspect.
	const pagesAcross = spread ? 2 : 1;
	// Leave room for the top and bottom controls, less on short (landscape phone) screens.
	const marginY = stage.height < 500 ? 16 : Math.min(140, stage.height * 0.14);
	const availW = Math.max(0, stage.width - (spread ? 64 : 24));
	const availH = Math.max(0, stage.height - marginY);
	const pageW = Math.floor(Math.min(availH * PAGE_ASPECT, availW / pagesAcross));
	const pageH = Math.floor(pageW / PAGE_ASPECT);

	// A closed book sits centred: shift by half a page at either end.
	let shift = 0;
	if (spread && flipped === 0) shift = -pageW / 2;
	if (spread && flipped === leaves.length) shift = pageW / 2;

	// Swipe and tap handling.
	const pointer = useRef<{ x: number; y: number; t: number } | null>(null);
	const onPointerDown = (e: React.PointerEvent) => {
		pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() };
	};
	const onPointerUp = (e: React.PointerEvent) => {
		const start = pointer.current;
		pointer.current = null;
		poke();
		if (!start) return;
		const dx = e.clientX - start.x;
		const dy = e.clientY - start.y;
		if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
			if (dx < 0) next();
			else prev();
			return;
		}
		if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
			const rect = stageRef.current?.getBoundingClientRect();
			if (!rect) return;
			const third = rect.width / 3;
			const x = e.clientX - rect.left;
			if (x > rect.width - third) next();
			else if (x < third) prev();
		}
	};

	const renderFace = (face: Face, side: "left" | "right", nearby: boolean) => {
		switch (face.kind) {
			case "cover":
				return <CoverView book={book} showImages={nearby} />;
			case "back":
				return <BackCoverView theme={book.theme} />;
			case "title":
				return <TitlePageView book={book} />;
			case "colophon":
				return <ColophonView />;
			case "blank":
				return <BlankPageView />;
			case "page":
				return (
					<PageView
						page={book.pages[face.index]}
						number={face.index + 1}
						side={side}
						showImages={nearby}
					/>
				);
		}
	};

	const label = pageLabel(flipped, leaves, spread, book.pages.length);
	const atStart = flipped === 0;
	const atEnd = flipped === leaves.length;

	return (
		<div
			ref={rootRef}
			className="flipbook-stage relative flex h-dvh w-full flex-col overflow-hidden text-white select-none"
			onPointerMove={poke}
		>
			{/* Top bar */}
			<div
				className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 py-3 transition-opacity duration-300 ${
					chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
			>
				<div className="flex min-w-0 items-center gap-3">
					{topLeft}
					<h1 className="truncate font-serif text-lg">{book.title}</h1>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{topRight}
					<button
						type="button"
						onClick={toggleFullscreen}
						className="rounded-full bg-white/10 p-2 hover:bg-white/20"
						aria-label={fullscreen ? "Exit full screen" : "Full screen"}
						title={fullscreen ? "Exit full screen" : "Full screen"}
					>
						{fullscreen ? <IconCollapse /> : <IconExpand />}
					</button>
				</div>
			</div>

			{/* The book */}
			<div
				ref={stageRef}
				className="relative flex flex-1 touch-pan-y items-center justify-center"
				style={{ perspective: `${Math.max(1600, pageW * 5)}px` }}
				onPointerDown={onPointerDown}
				onPointerUp={onPointerUp}
			>
				{pageW > 0 && (
					<div
						className="flipbook-book"
						style={{
							width: pageW * pagesAcross,
							height: pageH,
							transform: `translateX(${shift}px)`,
						}}
					>
						{/* Shadow cast by the book */}
						<div
							className="absolute -inset-x-2 -bottom-6 h-10 rounded-[50%] bg-black/50 blur-xl transition-all duration-700"
							style={{
								left: spread && atStart ? "50%" : undefined,
								right: spread && atEnd ? "50%" : undefined,
							}}
						/>
						{leaves.map((leaf, k) => {
							const isFlipped = k < flipped;
							const isTurning = turning?.leaf === k;
							const nearby = Math.abs(k - flipped) <= 2;
							const z = isTurning ? leaves.length + 2 : isFlipped ? k + 1 : leaves.length - k;

							return (
								<div
									key={k}
									className={`flipbook-leaf ${isTurning ? "is-turning" : ""}`}
									style={{
										left: spread ? "50%" : 0,
										width: spread ? "50%" : "100%",
										zIndex: z,
										transform: `rotateY(${isFlipped ? -180 : 0}deg)`,
										// In single-page mode a turned page leaves the stage.
										visibility: !spread && isFlipped && !isTurning ? "hidden" : "visible",
									}}
									aria-hidden={!(k === flipped || k === flipped - 1)}
								>
									<div className={`flipbook-face ${leaf.front.kind === "cover" ? "" : "is-right"}`}>
										{renderFace(leaf.front, "right", nearby)}
									</div>
									<div className={`flipbook-face is-back ${leaf.back.kind === "back" || !spread ? "" : "is-left"}`}>
										{renderFace(leaf.back, "left", nearby)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Bottom controls */}
			<div
				className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent px-4 pt-6 pb-4 transition-opacity duration-300 ${
					chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
			>
				<button
					type="button"
					onClick={prev}
					disabled={atStart}
					className="rounded-full bg-white/10 p-2.5 hover:bg-white/20 disabled:opacity-30"
					aria-label="Previous page"
				>
					<IconChevron dir="left" />
				</button>
				<span className="min-w-36 text-center text-sm tabular-nums text-white/80" aria-live="polite">
					{label}
				</span>
				<button
					type="button"
					onClick={next}
					disabled={atEnd}
					className="rounded-full bg-white/10 p-2.5 hover:bg-white/20 disabled:opacity-30"
					aria-label="Next page"
				>
					<IconChevron dir="right" />
				</button>
			</div>

			{showRotatePrompt && (
				<RotatePrompt
					onFullscreen={async () => {
						if (rootRef.current) await enterLandscape(rootRef.current);
					}}
					onStayPortrait={() => setPortraitChoice("single")}
				/>
			)}
		</div>
	);
}

function pageLabel(flipped: number, leaves: Leaf[], spread: boolean, pageCount: number) {
	if (flipped === 0) return "Cover";
	if (flipped === leaves.length) return "Back cover";

	const visible: Face[] = spread ? [leaves[flipped - 1].back, leaves[flipped].front] : [leaves[flipped].front];
	const numbers = visible.filter((f): f is Extract<Face, { kind: "page" }> => f.kind === "page").map((f) => f.index + 1);

	if (numbers.length === 0) return visible.some((f) => f.kind === "title") ? "Title page" : "The end";
	if (numbers.length === 1) return `Page ${numbers[0]} of ${pageCount}`;
	return `Pages ${numbers[0]}–${numbers[1]} of ${pageCount}`;
}

/** Shown on phones held upright: books are read sideways. */
function RotatePrompt({
	onFullscreen,
	onStayPortrait,
}: {
	onFullscreen: () => void;
	onStayPortrait: () => void;
}) {
	return (
		<div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black/85 px-8 text-center backdrop-blur-sm">
			<svg viewBox="0 0 64 64" className="rotate-hint h-20 w-20 text-white" aria-hidden>
				<rect x="20" y="6" width="24" height="52" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
				<circle cx="32" cy="51" r="2" fill="currentColor" />
			</svg>
			<div>
				<p className="font-serif text-2xl">Turn your phone sideways</p>
				<p className="mt-2 text-sm text-white/70">Photo books open across two pages, just like the real thing.</p>
			</div>
			<button
				type="button"
				onClick={onFullscreen}
				className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink-900"
			>
				Open full screen
			</button>
			<button type="button" onClick={onStayPortrait} className="text-sm text-white/70 underline underline-offset-4">
				Read one page at a time
			</button>
		</div>
	);
}

function IconChevron({ dir }: { dir: "left" | "right" }) {
	return (
		<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function IconExpand() {
	return (
		<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function IconCollapse() {
	return (
		<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
