import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { BookTheme, BookWithPages } from "@photos/types";
import {
	BackCoverView,
	BlankPageView,
	ColophonView,
	CoverView,
	PageView,
	PaperContext,
	TitlePageView,
} from "./PageView";
import { playPageTurn } from "./sound";
import { enterLandscape, useElementSize, useOrientation } from "./useViewport";

/** Width / height of one page. */
const PAGE_ASPECT = 3 / 4;
const TURN_MS = 900;
/** How far (0–1) a dragged page must travel before letting go finishes the turn. */
const COMMIT_AT = 0.3;
/** Hinged strips in a leaf that can turn; more strips make a smoother bend. */
const BEND_STRIPS = 6;
/** How far (degrees) a page's free edge bends away from its spine half-way through a turn. */
const BEND_MAX = 38;

type Face =
	| { kind: "cover" }
	| { kind: "title" }
	| { kind: "page"; index: number }
	| { kind: "blank" }
	| { kind: "colophon" }
	| { kind: "back" };

type Leaf = { front: Face; back: Face };

/** Background behind the book, tinted to match its cover. */
const STAGE_TINT: Record<BookTheme, string> = {
	classic: "radial-gradient(ellipse at 50% 40%, #4a2a27 0%, #22140f 55%, #0d0807 100%)",
	linen: "radial-gradient(ellipse at 50% 40%, #4a4134 0%, #241f18 55%, #0e0c09 100%)",
	midnight: "radial-gradient(ellipse at 50% 40%, #27324d 0%, #121827 55%, #07090f 100%)",
};

/**
 * Build the physical leaves of the book. In a two-page spread every leaf has a
 * page on each side; in single-page mode each page gets its own leaf with a
 * blank back.
 */
function buildFaces(pageCount: number, spread: boolean): Face[] {
	const pages: Face[] = Array.from({ length: pageCount }, (_, index) => ({ kind: "page", index }));
	if (!spread) return [{ kind: "cover" }, { kind: "title" }, ...pages, { kind: "colophon" }, { kind: "back" }];
	return [
		{ kind: "cover" },
		{ kind: "title" },
		...pages,
		...(pageCount % 2 === 1 ? [{ kind: "blank" } as Face] : []),
		{ kind: "colophon" },
		{ kind: "back" },
	];
}

function buildLeaves(faces: Face[], spread: boolean): Leaf[] {
	if (!spread) return faces.map((front) => ({ front, back: { kind: "blank" } }));
	const leaves: Leaf[] = [];
	for (let i = 0; i < faces.length; i += 2) leaves.push({ front: faces[i], back: faces[i + 1] });
	return leaves;
}

/** The `flipped` value that shows a given face. */
const flippedForFace = (face: number, spread: boolean) => (spread ? Math.ceil(face / 2) : face);

/** `progress` runs 0→1 in the direction of the turn. */
type Drag = { leaf: number; dir: 1 | -1; progress: number };
/** A leaf finishing its turn. `fromDrag` turns settle from the drag's bend instead of bending afresh. */
type Turn = { leaf: number; until: number; dir: 1 | -1; fromDrag: boolean };

export function Flipbook({
	book,
	topLeft,
	topRight,
	startPage,
}: {
	book: BookWithPages;
	/** Open at this page (1-based) instead of the cover, e.g. from a photo on Explore. */
	startPage?: number;
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
	const [showPages, setShowPages] = useState(false);
	const [sound, setSound] = useState(false);

	// Phones held upright are asked to rotate. Landscape is the default way to
	// read; single pages are the fallback when someone chooses to stay upright.
	const mobilePortrait = ready && touch && portrait;
	const showRotatePrompt = mobilePortrait && portraitChoice === "ask";
	const narrow = stage.width > 0 && stage.width / stage.height < 0.95;
	const spread = !(mobilePortrait && portraitChoice === "single") && !narrow;

	const faces = useMemo(() => buildFaces(book.pages.length, spread), [book.pages.length, spread]);
	const leaves = useMemo(() => buildLeaves(faces, spread), [faces, spread]);
	const [flipped, setFlipped] = useState(() =>
		startPage && startPage <= book.pages.length ? flippedForFace(startPage + 1, spread) : 0,
	);
	const [turning, setTurning] = useState<Turn | null>(null);
	const [drag, setDrag] = useState<Drag | null>(null);

	useEffect(() => {
		try {
			setSound(localStorage.getItem("flipbook:sound") === "on");
		} catch {
			// Storage blocked; sound stays off.
		}
	}, []);
	const toggleSound = () => {
		setSound((on) => {
			try {
				localStorage.setItem("flipbook:sound", on ? "off" : "on");
			} catch {
				// Ignore.
			}
			if (!on) playPageTurn();
			return !on;
		});
	};

	// Keep the reader on roughly the same page when the mode changes.
	const prevSpread = useRef(spread);
	useEffect(() => {
		if (prevSpread.current === spread) return;
		setFlipped((f) => (spread ? Math.ceil(f / 2) : Math.max(0, f * 2 - 1)));
		prevSpread.current = spread;
	}, [spread]);

	const go = useCallback(
		(target: number) => {
			const next = Math.max(0, Math.min(leaves.length, target));
			if (next === flipped) return;
			// Turning one leaf animates it; a jump just swaps the view.
			if (Math.abs(next - flipped) === 1) {
				setTurning({ leaf: Math.min(next, flipped), until: Date.now() + TURN_MS, dir: next > flipped ? 1 : -1, fromDrag: false });
			}
			if (sound) playPageTurn();
			setFlipped(next);
		},
		[leaves.length, flipped, sound],
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
			else if (e.key === "Escape") setShowPages(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [next, prev, go, leaves.length]);

	// Hide the controls while reading; any movement brings them back.
	const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const poke = useCallback(() => {
		setChromeVisible(true);
		clearTimeout(hideTimer.current);
		hideTimer.current = setTimeout(() => setChromeVisible(false), 3200);
	}, []);
	useEffect(() => {
		poke();
		return () => clearTimeout(hideTimer.current);
	}, [poke]);
	const chromeShown = chromeVisible || showPages;

	useEffect(() => {
		const onChange = () => setFullscreen(!!document.fullscreenElement);
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);

	const toggleFullscreen = async () => {
		if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
		else if (rootRef.current) await enterLandscape(rootRef.current);
	};

	// Page size: as large as fits, keeping the page aspect, with room for the controls.
	const pagesAcross = spread ? 2 : 1;
	const marginY = stage.height < 500 ? 16 : Math.min(150, stage.height * 0.16);
	const availW = Math.max(0, stage.width - (spread ? 64 : 24));
	const availH = Math.max(0, stage.height - marginY);
	const pageW = Math.floor(Math.min(availH * PAGE_ASPECT, availW / pagesAcross));
	const pageH = Math.floor(pageW / PAGE_ASPECT);

	// A closed book sits centred: shift by half a page at either end.
	let shift = 0;
	if (spread && flipped === 0 && !(drag && drag.dir === 1)) shift = -pageW / 2;
	if (spread && flipped === leaves.length && !(drag && drag.dir === -1)) shift = pageW / 2;

	// ------------------------------------------------- Drag to turn a page
	const pointer = useRef<{ x: number; y: number; id: number; leaf: number | null; dir: 1 | -1; spine: number } | null>(null);
	const bookRef = useRef<HTMLDivElement>(null);

	const onPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return;
		const rect = bookRef.current?.getBoundingClientRect();
		const middle = rect ? rect.left + rect.width / 2 : e.clientX;
		// Grab the right page to go forward, the left page to go back.
		const forward = spread ? e.clientX >= middle : e.clientX >= middle - (rect?.width ?? 0) / 6;
		const dir: 1 | -1 = forward ? 1 : -1;
		const leaf = forward ? (flipped < leaves.length ? flipped : null) : flipped > 0 ? flipped - 1 : null;
		const spine = rect ? (spread ? middle : rect.left) : e.clientX;
		pointer.current = { x: e.clientX, y: e.clientY, id: e.pointerId, leaf, dir, spine };
	};

	const onPointerMove = (e: React.PointerEvent) => {
		poke();
		const start = pointer.current;
		if (!start || start.leaf === null || start.id !== e.pointerId) return;
		const dx = e.clientX - start.x;
		const dy = e.clientY - start.y;
		if (!drag && (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx))) return;
		if (!drag) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		// The page's free edge follows the pointer: edge x = spine + width·cos(angle).
		const cos = Math.max(-1, Math.min(1, (e.clientX - start.spine) / Math.max(1, pageW)));
		const turned = Math.acos(cos) / Math.PI; // 0 = flat on the right, 1 = flat on the left
		const progress = start.dir === 1 ? turned : 1 - turned;
		setDrag({ leaf: start.leaf, dir: start.dir, progress });
	};

	const onPointerUp = (e: React.PointerEvent) => {
		const start = pointer.current;
		pointer.current = null;
		if (!start) return;

		if (drag) {
			const done = drag.progress >= COMMIT_AT;
			setTurning({ leaf: drag.leaf, until: Date.now() + TURN_MS, dir: done ? drag.dir : drag.dir === 1 ? -1 : 1, fromDrag: true });
			setDrag(null);
			if (done) {
				if (sound) playPageTurn();
				setFlipped(drag.dir === 1 ? drag.leaf + 1 : drag.leaf);
			}
			return;
		}

		// A tap on the outer thirds turns the page.
		const dx = e.clientX - start.x;
		const dy = e.clientY - start.y;
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
				return <TitlePageView book={book} side={side} />;
			case "colophon":
				return <ColophonView side={side} />;
			case "blank":
				return <BlankPageView side={side} />;
			case "page":
				return <PageView page={book.pages[face.index]} number={face.index + 1} side={side} showImages={nearby} />;
		}
	};

	const label = pageLabel(flipped, leaves, spread, book.pages.length);
	const atStart = flipped === 0;
	const atEnd = flipped === leaves.length;
	const open = spread && !atStart && !atEnd;

	// Stacked page edges, thicker on the side with more pages left.
	const edge = (count: number) => Math.min(10, Math.max(0, count) * 0.8);
	const leftEdge = spread && flipped > 1 ? edge(flipped - 1) : 0;
	const rightEdge = spread && flipped < leaves.length - 1 ? edge(leaves.length - flipped - 1) : 0;

	return (
		<PaperContext.Provider value={book.paper ?? "ivory"}>
		<div
			ref={rootRef}
			className="relative flex h-dvh w-full flex-col overflow-hidden text-white select-none"
			style={{ background: STAGE_TINT[book.theme] ?? STAGE_TINT.classic }}
		>
			{/* Top bar */}
			<div
				className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 py-3 transition-opacity duration-300 ${
					chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
			>
				<div className="flex min-w-0 items-center gap-3">
					{topLeft}
					<div className="min-w-0">
						<h1 className="truncate font-serif text-lg leading-tight">{book.title}</h1>
						{book.owner.name && <p className="truncate text-xs text-white/60">by {book.owner.name}</p>}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{topRight}
					<RoundButton onClick={toggleSound} label={sound ? "Turn page sound off" : "Turn page sound on"}>
						{sound ? <IconSoundOn /> : <IconSoundOff />}
					</RoundButton>
					<RoundButton onClick={toggleFullscreen} label={fullscreen ? "Exit full screen" : "Full screen"}>
						{fullscreen ? <IconCollapse /> : <IconExpand />}
					</RoundButton>
				</div>
			</div>

			{/* The book */}
			<div
				ref={stageRef}
				className="relative flex flex-1 touch-none items-center justify-center"
				style={{ perspective: `${Math.max(1800, pageW * 5)}px` }}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={() => {
					pointer.current = null;
					setDrag(null);
				}}
			>
				{pageW > 0 && (
					<div
						ref={bookRef}
						className="flipbook-book"
						style={{
							width: pageW * pagesAcross,
							height: pageH,
							transform: `translateX(${shift}px)`,
							cursor: drag ? "grabbing" : "grab",
						}}
					>
						{/* Shadow cast by the book */}
						<div
							className="pointer-events-none absolute -bottom-8 h-12 rounded-[50%] bg-black/60 blur-2xl transition-all duration-700"
							style={{
								left: spread && atStart ? "52%" : "2%",
								right: spread && atEnd ? "52%" : "2%",
							}}
						/>
						{/* Page edges */}
						{open && leftEdge > 0 && (
							<div className="flipbook-edge absolute top-[3px] bottom-[3px]" style={{ left: -leftEdge, width: leftEdge }} />
						)}
						{(open || (spread && atStart)) && rightEdge > 0 && (
							<div className="flipbook-edge absolute top-[3px] bottom-[3px]" style={{ right: -rightEdge, width: rightEdge }} />
						)}

						{leaves.map((leaf, k) => {
							const isDragged = drag?.leaf === k;
							const isFlipped = k < flipped;
							const isTurning = turning?.leaf === k;
							const nearby = Math.abs(k - flipped) <= 2;

							let angle = isFlipped ? -180 : 0;
							if (isDragged) angle = drag.dir === 1 ? -180 * drag.progress : -180 + 180 * drag.progress;
							const lift = isDragged ? Math.sin(Math.PI * drag.progress) : 0;
							// Leaves either side of the spine can turn next, so they are built from strips that bend.
							const canTurn = isDragged || isTurning || k === flipped || k === flipped - 1;
							// The free edge trails the rest of the page, so it bows as it turns.
							const bend = isDragged ? BEND_MAX * lift * drag.dir : isTurning ? BEND_MAX * turning.dir : 0;
							const bending = isTurning && !turning.fromDrag;
							const z = isDragged || isTurning ? leaves.length + 2 : isFlipped ? k + 1 : leaves.length - k;
							// Hide leaves that can't be seen so large books stay fast.
							const hidden =
								!isDragged &&
								!isTurning &&
								(spread ? k < flipped - 2 || k > flipped + 1 : (isFlipped || k > flipped + 1));

							return (
								<div
									key={k}
									className={`flipbook-leaf ${isTurning ? "is-turning" : ""}`}
									style={{
										left: spread ? "50%" : 0,
										width: spread ? "50%" : "100%",
										zIndex: z,
										transform: `rotateY(${angle}deg)`,
										transition: isDragged ? "none" : undefined,
										visibility: hidden ? "hidden" : "visible",
									}}
									aria-hidden={!(k === flipped || k === flipped - 1)}
								>
									<LeafFaces
										strips={canTurn ? BEND_STRIPS : 1}
										flat={!isDragged && !isTurning}
										bend={bend}
										bending={bending}
										dragging={isDragged}
										front={
											<>
												{renderFace(leaf.front, "right", nearby)}
												{lift > 0 && (
													<div
														className="pointer-events-none absolute inset-0 z-10"
														style={{ background: `linear-gradient(to left, rgb(0 0 0 / ${0.35 * lift}), transparent 70%)` }}
													/>
												)}
											</>
										}
										back={
											<>
												{renderFace(leaf.back, "left", nearby)}
												{lift > 0 && (
													<div
														className="pointer-events-none absolute inset-0 z-10"
														style={{
															background: `linear-gradient(to right, rgb(0 0 0 / ${0.3 * lift}), rgb(255 255 255 / ${0.06 * lift}) 50%, transparent)`,
														}}
													/>
												)}
											</>
										}
									/>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Page thumbnails */}
			{showPages && (
				<PageStrip
					book={book}
					faces={faces}
					spread={spread}
					flipped={flipped}
					onPick={(f) => {
						go(f);
						setShowPages(false);
					}}
				/>
			)}

			{/* Bottom controls */}
			<div
				className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent px-4 pt-6 pb-4 transition-opacity duration-300 ${
					chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
			>
				<RoundButton onClick={prev} disabled={atStart} label="Previous page">
					<IconChevron dir="left" />
				</RoundButton>
				<button
					type="button"
					onClick={() => setShowPages((s) => !s)}
					className="flex min-w-40 items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm tabular-nums text-white/90 hover:bg-white/20"
					aria-expanded={showPages}
					aria-live="polite"
				>
					<IconGrid />
					{label}
				</button>
				<RoundButton onClick={next} disabled={atEnd} label="Next page">
					<IconChevron dir="right" />
				</RoundButton>
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
		</PaperContext.Provider>
	);
}

/**
 * Both faces of a leaf, cut into a chain of vertical strips. Each strip hinges
 * on the one before it, so rotating them by `bend` (spread across the chain)
 * curves the page. `bending` plays the bend once as the leaf turns.
 */
function LeafFaces({
	front,
	back,
	strips,
	flat,
	bend,
	bending,
	dragging,
}: {
	front: ReactNode;
	back: ReactNode;
	strips: number;
	flat: boolean;
	bend: number;
	bending: boolean;
	dragging: boolean;
}) {
	const step = strips > 1 ? bend / (strips - 1) : 0;
	// Slices are a pixel wider than their strip, so size the page from the strip width.
	const page = (offset: number): CSSProperties =>
		flat ? { left: 0, width: "100%" } : { left: `calc((100% - 1px) * ${-offset})`, width: `calc((100% - 1px) * ${strips})` };

	// At rest the first strip shows the whole page and the rest stay mounted but hidden, so a turn starts without seams or reloads.
	const strip = (i: number): ReactNode => (
		<div
			className={`flipbook-strip ${flat ? "is-flat" : ""} ${bending && i > 0 ? "is-bending" : ""}`}
			style={
				{
					left: i === 0 ? 0 : "100%",
					width: i === 0 && !flat ? `${100 / strips}%` : "100%",
					display: flat && i > 0 ? "none" : undefined,
					transform: i === 0 || bending ? undefined : `rotateY(${step}deg)`,
					transition: dragging ? "none" : undefined,
					"--bend": `${step}deg`,
				} as CSSProperties
			}
		>
			<div className="flipbook-slice">
				<div className="flipbook-page" style={page(i)}>
					{front}
				</div>
			</div>
			<div className="flipbook-slice is-back">
				<div className="flipbook-page" style={page(strips - 1 - i)}>
					{back}
				</div>
			</div>
			{i < strips - 1 && strip(i + 1)}
		</div>
	);

	return strip(0);
}

/** A strip of every spread (or page) to jump around the book. */
function PageStrip({
	book,
	faces,
	spread,
	flipped,
	onPick,
}: {
	book: BookWithPages;
	faces: Face[];
	spread: boolean;
	flipped: number;
	onPick: (flipped: number) => void;
}) {
	const listRef = useRef<HTMLDivElement>(null);

	// Group faces into what the reader sees at each stop.
	const stops = useMemo(() => {
		const out: { flipped: number; faces: Face[] }[] = [];
		if (!spread) {
			faces.forEach((f, i) => out.push({ flipped: i, faces: [f] }));
			return out;
		}
		out.push({ flipped: 0, faces: [faces[0]] });
		for (let i = 1; i < faces.length - 1; i += 2) out.push({ flipped: flippedForFace(i, true), faces: [faces[i], faces[i + 1]] });
		out.push({ flipped: Math.ceil(faces.length / 2), faces: [faces[faces.length - 1]] });
		return out;
	}, [faces, spread]);

	useEffect(() => {
		listRef.current?.querySelector("[aria-current='true']")?.scrollIntoView({ inline: "center", block: "nearest" });
	}, []);

	const mini = (face: Face, key: number) => (
		<div key={key} className="relative h-full overflow-hidden" style={{ aspectRatio: "3 / 4", containerType: "size" }}>
			{face.kind === "cover" ? (
				<CoverView book={book} />
			) : face.kind === "back" ? (
				<BackCoverView theme={book.theme} />
			) : face.kind === "title" ? (
				<TitlePageView book={book} />
			) : face.kind === "page" ? (
				<PageView page={book.pages[face.index]} />
			) : (
				<BlankPageView />
			)}
		</div>
	);

	return (
		<div className="absolute inset-x-0 bottom-20 z-30 px-4">
			<div ref={listRef} className="mx-auto flex max-w-5xl gap-4 overflow-x-auto rounded-2xl bg-black/60 p-4 backdrop-blur-md">
				{stops.map((stop, i) => (
					<button
						key={i}
						type="button"
						onClick={() => onPick(stop.flipped)}
						aria-current={stop.flipped === flipped}
						className={`flex h-24 shrink-0 rounded-sm shadow-lg ring-2 transition sm:h-28 ${
							stop.flipped === flipped ? "ring-amber-300" : "ring-transparent opacity-80 hover:opacity-100"
						}`}
						aria-label={`Go to ${stopLabel(stop.faces)}`}
					>
						{stop.faces.map(mini)}
					</button>
				))}
			</div>
		</div>
	);
}

function stopLabel(faces: Face[]) {
	const pages = faces.filter((f): f is Extract<Face, { kind: "page" }> => f.kind === "page").map((f) => f.index + 1);
	if (pages.length) return `page ${pages.join(" and ")}`;
	return faces[0].kind === "back" ? "the back cover" : faces[0].kind === "cover" ? "the cover" : "the title page";
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
function RotatePrompt({ onFullscreen, onStayPortrait }: { onFullscreen: () => void; onStayPortrait: () => void }) {
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
			<button type="button" onClick={onFullscreen} className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink-900">
				Open full screen
			</button>
			<button type="button" onClick={onStayPortrait} className="text-sm text-white/70 underline underline-offset-4">
				Read one page at a time
			</button>
		</div>
	);
}

function RoundButton({
	onClick,
	label,
	disabled,
	children,
}: {
	onClick: () => void;
	label: string;
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="rounded-full bg-white/10 p-2.5 transition hover:bg-white/20 disabled:opacity-30"
			aria-label={label}
			title={label}
		>
			{children}
		</button>
	);
}

const svg = (d: string) => (
	<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
		<path d={d} strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);
const IconChevron = ({ dir }: { dir: "left" | "right" }) => svg(dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6");
const IconExpand = () => svg("M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5");
const IconCollapse = () => svg("M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5");
const IconGrid = () => (
	<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
		<rect x="3" y="5" width="8" height="14" rx="1" />
		<rect x="13" y="5" width="8" height="14" rx="1" />
	</svg>
);
const IconSoundOn = () => svg("M4 10v4h3l5 4V6L7 10H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11");
const IconSoundOff = () => svg("M4 10v4h3l5 4V6L7 10H4zM17 10l4 4M21 10l-4 4");
