import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { Fold, PageTurn, type TurnFrame, type Vec } from "./pageTurn";
import { FrameContext } from "./PrintedPhoto";
import { playPageTurn } from "./sound";
import { enterLandscape, useElementSize, useOrientation } from "./useViewport";

/** Width / height of one page. */
const PAGE_ASPECT = 3 / 4;
/** Share of the page width along the outer edge, and of its height along the top and bottom, that grabs the edge itself. */
const EDGE_X = 0.15;
const EDGE_Y = 0.08;

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

/** The leaf being turned or peeked at. Covers are stiff: they swing on the spine instead of curling. */
type ActiveTurn = { leaf: number; dir: 1 | -1; stiff: boolean; peek: boolean };

/** Light and shadow drawn around the fold of a turning page. */
type Overlay = "under" | "bend" | "shadow" | "curl";

const isStiff = (leaf: Leaf) => leaf.front.kind === "cover" || leaf.front.kind === "back" || leaf.back.kind === "back";

const polygon = (points: Vec[], dx = 0, dy = 0) =>
	points.length ? `polygon(${points.map((p) => `${(p.x + dx).toFixed(2)}px ${(p.y + dy).toFixed(2)}px`).join(", ")})` : "polygon(0 0)";

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
	const [active, setActive] = useState<ActiveTurn | null>(null);

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

	// Page size: as large as fits, keeping the page aspect, with room for the controls.
	const pagesAcross = spread ? 2 : 1;
	const marginY = stage.height < 500 ? 16 : Math.min(150, stage.height * 0.16);
	const availW = Math.max(0, stage.width - (spread ? 64 : 24));
	const availH = Math.max(0, stage.height - marginY);
	const pageW = Math.floor(Math.min(availH * PAGE_ASPECT, availW / pagesAcross));
	const pageH = Math.floor(pageW / PAGE_ASPECT);
	const size = { width: pageW, height: pageH };

	// ------------------------------------------------- Turning pages
	const faceRefs = useRef(new Map<string, HTMLDivElement>());
	const overlayRefs = useRef(new Map<Overlay, { clip: HTMLDivElement | null; light: HTMLDivElement | null }>());
	const activeRef = useRef<ActiveTurn | null>(null);
	activeRef.current = active;

	const paint = useCallback(
		(frame: TurnFrame) => {
			const turn = activeRef.current;
			if (!turn) return;

			const s = turn.dir;
			const front = faceRefs.current.get(`${turn.leaf}:front`);
			const back = faceRefs.current.get(`${turn.leaf}:back`);
			const overlays = overlayRefs.current;

			if (frame.stiff) {
				const angle = (-Math.acos(Math.max(-1, Math.min(1, (s * frame.point.x) / Math.max(1, frame.origin.x)))) * 180) / Math.PI;
				const perspective = `perspective(${Math.max(1800, pageW * 5)}px) rotateY(${angle}deg)`;

				if (front) Object.assign(front.style, { transformOrigin: "0 50%", transform: perspective, clipPath: "" });
				if (back) Object.assign(back.style, { transformOrigin: "0 50%", transform: `${perspective} translateX(${pageW}px) rotateY(180deg)`, clipPath: "" });
				return;
			}

			// The side facing up where the leaf started, and the side the fold turns over.
			const top = s === 1 ? front : back;
			const under = s === 1 ? back : front;
			const fold = new Fold(pageW, pageH, frame.origin, frame.point);
			const flap = fold.flap;
			// Strongest mid-turn, fading out as the page lies flat at either end.
			const strength = Math.min(1, fold.progress * 8) * Math.min(1, (1 - fold.progress) * 6);

			if (top) {
				Object.assign(top.style, {
					transformOrigin: "",
					transform: "",
					clipPath: polygon(fold.flat.map((p) => ({ x: s === 1 ? p.x : pageW - p.x, y: p.y }))),
				});
			}
			if (under) {
				Object.assign(under.style, {
					transformOrigin: "0 0",
					transform: fold.flapMatrix(s),
					clipPath: polygon(fold.folded.map((p) => ({ x: s === 1 ? pageW - p.x : p.x, y: p.y }))),
				});
			}

			const layer = (name: Overlay, region: Vec[], toward: 1 | -1, opacity: number) => {
				const refs = overlays.get(name);
				if (!refs?.clip || !refs.light) return;

				const shape = polygon(
					region.map((p) => ({ x: s * p.x, y: p.y })),
					pageW,
					pageH,
				);

				refs.clip.style.opacity = String(opacity);

				// The flap's shadow is its own silhouette, blurred by the layer around it.
				if (name === "shadow") {
					refs.light.style.clipPath = shape;
					return;
				}

				refs.clip.style.clipPath = shape;

				const angle = Math.atan2(toward * fold.normal.y, s * toward * fold.normal.x);
				refs.light.style.transform = `translate(${s * fold.center.x + pageW}px, ${fold.center.y + pageH}px) rotate(${angle}rad) translateY(-50%)`;
			};

			layer("under", fold.folded, 1, strength);
			layer("bend", fold.flat, -1, strength);
			layer("shadow", flap, -1, strength * 0.6);
			layer("curl", flap, -1, strength);
		},
		[pageW, pageH],
	);

	const settle = useCallback((turned: boolean) => {
		const turn = activeRef.current;
		if (!turn) return;

		// A leaf turned from the right lands on the left, and the other way round.
		const landedLeft = turn.dir === 1 ? turned : !turned;

		setFlipped(landedLeft ? turn.leaf + 1 : turn.leaf);
		setActive(null);
	}, []);

	const handlers = useRef({ paint, settle });
	handlers.current = { paint, settle };

	const [engine] = useState(() => new PageTurn({ frame: (f) => handlers.current.paint(f), settle: (t) => handlers.current.settle(t) }));

	// Faces change roles when a turn starts or ends: place them before the browser paints.
	useLayoutEffect(() => {
		faceRefs.current.forEach((el, key) => {
			const turning = active && (key === `${active.leaf}:front` || key === `${active.leaf}:back`);
			if (!turning) Object.assign(el.style, { transform: "", transformOrigin: "", clipPath: "" });
		});
		if (active) paint(engine.frame);
	}, [active, paint, engine]);

	useEffect(() => () => engine.cancel(), [engine]);

	// A new layout or page size drops any turn in progress.
	useEffect(() => {
		engine.cancel();
		setActive(null);
	}, [engine, spread, pageW]);

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
			if (next === flipped || pageW === 0) return;

			// A turn already under way lands first.
			if (engine.active && !engine.peeking) {
				engine.finish();
				return;
			}
			engine.cancel();
			if (sound) playPageTurn();

			// Turning one leaf animates it from its bottom corner; a jump just swaps the view.
			if (Math.abs(next - flipped) !== 1) {
				setActive(null);
				setFlipped(next);
				return;
			}

			const leaf = Math.min(next, flipped);
			const stiff = isStiff(leaves[leaf]);
			const turn: ActiveTurn = { leaf, dir: next > flipped ? 1 : -1, stiff, peek: false };

			activeRef.current = turn;
			setActive(turn);
			engine.turn({ x: pageW, y: stiff ? pageH / 2 : pageH }, { width: pageW, height: pageH }, stiff);
		},
		[leaves, flipped, sound, engine, pageW, pageH],
	);
	const next = useCallback(() => go(flipped + 1), [go, flipped]);
	const prev = useCallback(() => go(flipped - 1), [go, flipped]);

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

	// A closed book sits centred: shift by half a page at either end.
	const settled = !active || active.peek;
	let shift = 0;
	if (spread && flipped === 0 && settled) shift = -pageW / 2;
	if (spread && flipped === leaves.length && settled) shift = pageW / 2;

	// ------------------------------------------------- Pointer: grab, drag, peek
	const bookRef = useRef<HTMLDivElement>(null);
	const press = useRef<{ at: Vec; id: number; grabbed: boolean } | null>(null);
	const grabStart = useRef<Vec>({ x: 0, y: 0 });
	const grabDir = useRef<1 | -1>(1);
	const grabReach = useRef(1);

	/** Pointer position relative to the top of the spine. */
	const toBook = (e: React.PointerEvent): Vec => {
		const rect = bookRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };

		return { x: e.clientX - (rect.left + (spread ? rect.width / 2 : 0)), y: e.clientY - rect.top };
	};

	/**
	 * Which leaf a press at `p` takes hold of, and where on it. Presses near an
	 * outer edge or corner hold that spot; anywhere else holds the outer edge at
	 * the same height, so a swipe across the page turns it.
	 */
	const holdAt = (p: Vec) => {
		const forward = spread ? p.x >= 0 : p.x >= pageW * 0.3;
		const leaf = forward ? flipped : flipped - 1;
		if (leaf < 0 || leaf >= leaves.length) return null;

		// Measured from the spine toward the side the leaf lies on.
		const onLeaf = forward ? p : { x: spread ? -p.x : pageW, y: p.y };
		const nearOuter = onLeaf.x > pageW * (1 - EDGE_X);
		const nearTop = onLeaf.y < pageH * EDGE_Y;
		const nearBottom = onLeaf.y > pageH * (1 - EDGE_Y);
		const stiff = isStiff(leaves[leaf]);
		const origin = {
			x: nearOuter || !(nearTop || nearBottom) ? pageW : Math.max(1, onLeaf.x),
			y: stiff ? pageH / 2 : nearTop ? 0 : nearBottom ? pageH : Math.max(0, Math.min(pageH, onLeaf.y)),
		};

		return { leaf, dir: forward ? 1 : -1, origin, stiff, start: origin } as const;
	};

	/** The outer corner under a hovering mouse, if any. */
	const cornerAt = (p: Vec) => {
		const reach = Math.max(36, pageW * 0.12);
		const corners = [
			...(flipped < leaves.length ? [{ x: pageW, y: 0 }, { x: pageW, y: pageH }] : []),
			...(spread && flipped > 0 ? [{ x: -pageW, y: 0 }, { x: -pageW, y: pageH }] : []),
		];

		return corners.find((c) => Math.hypot(p.x - c.x, p.y - c.y) < reach) ?? null;
	};

	const peekAt = (p: Vec) => {
		const corner = cornerAt(p);

		if (!corner) {
			engine.unpeek();
			return;
		}

		const dir = corner.x > 0 ? 1 : -1;
		const leaf = dir === 1 ? flipped : flipped - 1;
		const stiff = isStiff(leaves[leaf]);
		const origin = { x: pageW, y: stiff ? pageH / 2 : corner.y };
		const toward = { x: dir * (p.x - corner.x), y: p.y - corner.y };
		const distance = Math.hypot(toward.x, toward.y) || 1;
		const lift = Math.max(pageW * 0.12, Math.min(pageW * 0.2, distance * 2));
		const point = {
			x: pageW + (toward.x / distance) * lift,
			y: stiff ? origin.y : corner.y + (toward.y / distance) * lift,
		};

		if (active?.leaf !== leaf || active.dir !== dir) {
			const turn: ActiveTurn = { leaf, dir, stiff, peek: true };
			activeRef.current = turn;
			setActive(turn);
		}
		engine.peek(origin, point, size, stiff);
	};

	const onPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return;

		press.current = { at: { x: e.clientX, y: e.clientY }, id: e.pointerId, grabbed: false };
	};

	const onPointerMove = (e: React.PointerEvent) => {
		poke();
		const p = toBook(e);
		const start = press.current;

		if (!start) {
			if (e.pointerType === "mouse" && !engine.dragging) peekAt(p);
			return;
		}
		if (start.id !== e.pointerId) return;

		const dx = e.clientX - start.at.x;
		const dy = e.clientY - start.at.y;

		if (!start.grabbed) {
			if (Math.hypot(dx, dy) < 6 || (engine.active && !engine.peeking)) return;

			const pressed = { x: p.x - dx, y: p.y - dy };
			const peeked = engine.peeking && active ? { ...active, origin: engine.frame.origin, start: engine.frame.point } : null;
			const hold = peeked ?? holdAt(pressed);
			if (!hold) return;

			start.grabbed = true;
			grabStart.current = hold.start;
			grabDir.current = hold.dir;
			// On a single page the previous leaf lies out of sight, so it moves twice as far to show up under the pointer.
			grabReach.current = !spread && hold.dir === -1 ? 2 : 1;
			(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

			const turn: ActiveTurn = { leaf: hold.leaf, dir: hold.dir, stiff: hold.stiff, peek: false };
			activeRef.current = turn;
			setActive(turn);
			engine.grab(hold.origin, hold.start, size, hold.stiff);
		}

		engine.drag({ x: grabStart.current.x + grabDir.current * grabReach.current * dx, y: grabStart.current.y + dy });
	};

	const onPointerUp = (e: React.PointerEvent) => {
		const start = press.current;
		press.current = null;
		if (!start) return;

		if (start.grabbed) {
			if (engine.release() && sound) playPageTurn();
			return;
		}

		// A tap on the outer thirds turns the page.
		const dx = e.clientX - start.at.x;
		const dy = e.clientY - start.at.y;
		if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
			const rect = stageRef.current?.getBoundingClientRect();
			if (!rect) return;
			const third = rect.width / 3;
			const x = e.clientX - rect.left;
			if (x > rect.width - third) next();
			else if (x < third) prev();
		}
	};

	const renderFace = (face: Face, side: "left" | "right") => {
		switch (face.kind) {
			case "cover":
				return <CoverView book={book} />;
			case "back":
				return <BackCoverView theme={book.theme} />;
			case "title":
				return <TitlePageView book={book} side={side} />;
			case "colophon":
				return <ColophonView side={side} />;
			case "blank":
				return <BlankPageView side={side} />;
			case "page":
				return <PageView page={book.pages[face.index]} number={face.index + 1} side={side} />;
		}
	};

	// Faces of the leaves around the opening. Each keeps its element while it
	// moves between roles, so pages never reload mid-turn.
	const turnLeaf = active?.leaf ?? null;
	const turnDir = active?.dir ?? 1;
	const rightLeaf = turnLeaf !== null ? turnLeaf + 1 : flipped;
	const leftLeaf = turnLeaf !== null ? turnLeaf - 1 : flipped - 1;
	const faceElements: ReactNode[] = [];

	for (let k = Math.max(0, flipped - 2); k <= Math.min(leaves.length - 1, flipped + 1); k++) {
		for (const side of ["front", "back"] as const) {
			const key = `${k}:${side}`;
			const facesUp = (side === "front") === (turnDir === 1);
			const role =
				k === turnLeaf
					? facesUp
						? "turning"
						: "flap"
					: side === "front"
						? k === rightLeaf
							? "right"
							: "spare"
						: k === leftLeaf && spread
							? "left"
							: "spare";
			const z = { right: 1, left: 1, turning: 3, flap: 6, spare: 0 }[role];
			const onLeft = role === "left" || (role === "turning" && turnDir === -1 && !active?.stiff);

			faceElements.push(
				<div
					key={key}
					ref={(el) => {
						if (el) faceRefs.current.set(key, el);
						else faceRefs.current.delete(key);
					}}
					className="flipbook-face"
					style={{ left: onLeft ? -pageW : 0, width: pageW, height: pageH, zIndex: z, visibility: role === "spare" ? "hidden" : "visible" }}
					aria-hidden={role !== "left" && role !== "right"}
				>
					{renderFace(side === "front" ? leaves[k].front : leaves[k].back, side === "front" ? "right" : "left")}
				</div>,
			);
		}
	}

	const overlay = (name: Overlay, z: number, light: string) => {
		const shadow = name === "shadow";
		const bind = (part: "clip" | "light") => (el: HTMLDivElement | null) => {
			const refs = overlayRefs.current.get(name) ?? { clip: null, light: null };
			refs[part] = el;
			overlayRefs.current.set(name, refs);
		};

		return (
			<div
				key={name}
				ref={bind("clip")}
				className="flipbook-overlay"
				style={{ left: -pageW, top: -pageH, width: pageW * 2, height: pageH * 3, zIndex: z, filter: shadow ? `blur(${Math.max(3, pageW * 0.012)}px)` : undefined }}
			>
				<div
					ref={bind("light")}
					className="flipbook-light"
					style={shadow ? { inset: 0, background: light } : { width: pageW * 3, height: pageH * 4, background: light }}
				/>
			</div>
		);
	};
	const w = (share: number) => `${(pageW * share).toFixed(1)}px`;

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
		<FrameContext.Provider value={book.frame ?? "none"}>
		<div
			ref={rootRef}
			className="relative flex h-dvh w-full flex-col overflow-hidden text-white select-none"
			style={{ background: STAGE_TINT[book.theme] ?? STAGE_TINT.classic }}
		>
			{/* Top bar */}
			<div
				className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 py-3 transition-opacity duration-300 ${
					chromeShown ? "opacity-100 [&>*]:pointer-events-auto" : "opacity-0"
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
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerLeave={() => engine.unpeek()}
				onPointerCancel={() => {
					press.current = null;
					if (engine.dragging) engine.release();
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
							cursor: engine.dragging ? "grabbing" : "grab",
							clipPath: spread ? undefined : "inset(-50% -50% -50% 0)",
						}}
					>
						{/* Shadow cast by the book */}
						<div
							className="pointer-events-none absolute -bottom-8 h-12 rounded-[50%] bg-black/60 blur-2xl transition-all duration-700"
							style={{
								left: spread && atStart && settled ? "52%" : "2%",
								right: spread && atEnd && settled ? "52%" : "2%",
							}}
						/>
						{/* Page edges */}
						{open && leftEdge > 0 && (
							<div className="flipbook-edge absolute top-[3px] bottom-[3px]" style={{ left: -leftEdge, width: leftEdge }} />
						)}
						{(open || (spread && atStart)) && rightEdge > 0 && (
							<div className="flipbook-edge absolute top-[3px] bottom-[3px]" style={{ right: -rightEdge, width: rightEdge }} />
						)}

						{/* Everything inside is placed from the top of the spine. */}
						<div className="absolute top-0" style={{ left: spread ? pageW : 0 }}>
							{faceElements}
							{active &&
								!active.stiff && [
									overlay("under", 2, `linear-gradient(to right, rgb(0 0 0 / 0.42), rgb(0 0 0 / 0.2) ${w(0.05)}, rgb(0 0 0 / 0.06) ${w(0.16)}, transparent ${w(0.3)})`),
									overlay("bend", 4, `linear-gradient(to right, rgb(0 0 0 / 0.16), rgb(0 0 0 / 0.04) ${w(0.05)}, transparent ${w(0.1)})`),
									overlay("shadow", 5, "rgb(0 0 0 / 0.55)"),
									overlay(
										"curl",
										7,
										`linear-gradient(to right, rgb(0 0 0 / 0.3), rgb(0 0 0 / 0.1) ${w(0.035)}, rgb(255 255 255 / 0.2) ${w(0.11)}, rgb(255 255 255 / 0.06) ${w(0.25)}, rgb(0 0 0 / 0.05) ${w(0.6)}, rgb(0 0 0 / 0.12) ${w(1)})`,
									),
								]}
						</div>
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
				className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent px-4 pt-6 pb-4 transition-opacity duration-300 ${
					chromeShown ? "opacity-100 [&>*]:pointer-events-auto" : "opacity-0"
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
		</FrameContext.Provider>
		</PaperContext.Provider>
	);
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
