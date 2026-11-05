/**
 * Page-turn physics for the flipbook.
 *
 * Coordinates are page pixels from the top of the spine, measured toward the
 * side the leaf starts on: the leaf lies flat over x ∈ [0, W] and is fully
 * turned over x ∈ [-W, 0]. A turn is described by the point of the leaf that
 * was grabbed (`origin`) and where that point is now (`point`).
 */

export type Vec = { x: number; y: number };

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const length = (a: Vec) => Math.hypot(a.x, a.y);

/**
 * A leaf folded so that `origin` lands on `point`. The fold line is the
 * perpendicular bisector of the two; the part of the leaf past it is flipped
 * over, showing the back of the page.
 */
export class Fold {
	readonly point: Vec;
	/** Middle of the fold line. */
	readonly center: Vec;
	/** Unit normal of the fold line, pointing toward the folded-over part. */
	readonly normal: Vec;
	/** 0 when flat, 1 when fully turned. */
	readonly progress: number;
	/** The part of the leaf still lying flat, in leaf coordinates. */
	readonly flat: Vec[];
	/** The part of the leaf that is folded over, in leaf coordinates (before it is flipped). */
	readonly folded: Vec[];

	constructor(
		readonly width: number,
		readonly height: number,
		readonly origin: Vec,
		point: Vec,
	) {
		this.point = Fold.attach(point, origin, height);

		const span = sub(origin, this.point);
		const distance = length(span);
		const page = [
			{ x: 0, y: 0 },
			{ x: width, y: 0 },
			{ x: width, y: height },
			{ x: 0, y: height },
		];

		this.center = { x: (origin.x + this.point.x) / 2, y: (origin.y + this.point.y) / 2 };
		this.progress = Math.min(1, distance / Math.max(1, 2 * origin.x));

		if (distance < 0.5) {
			this.normal = { x: 1, y: 0 };
			this.flat = page;
			this.folded = [];
			return;
		}

		this.normal = { x: span.x / distance, y: span.y / distance };
		this.flat = this.clip(page, -1);
		this.folded = this.clip(page, 1);
	}

	/**
	 * Keeps the grabbed point within reach of the spine, so the leaf stretches
	 * around its binding instead of tearing away from it.
	 */
	static attach(point: Vec, origin: Vec, height: number): Vec {
		const anchors = [
			{ x: 0, y: 0 },
			{ x: 0, y: height },
		];
		let p = point;

		for (let pass = 0; pass < 3; pass++) {
			for (const anchor of anchors) {
				const reach = length(sub(origin, anchor));
				const offset = sub(p, anchor);
				const distance = length(offset);

				if (distance > reach) p = { x: anchor.x + (offset.x * reach) / distance, y: anchor.y + (offset.y * reach) / distance };
			}
		}

		return p;
	}

	/** Mirrors a point across the fold line. */
	reflect(p: Vec): Vec {
		const side = 2 * dot(sub(p, this.center), this.normal);

		return { x: p.x - side * this.normal.x, y: p.y - side * this.normal.y };
	}

	/** Where the folded part of the leaf now lies. */
	get flap(): Vec[] {
		return this.folded.map((p) => this.reflect(p));
	}

	/**
	 * CSS matrix placing the hidden side of the leaf over the flap, for a page
	 * element whose left edge sits on the spine. `dir` is 1 when the leaf
	 * started on the right (the flap shows its back, laid out with the spine on
	 * the right) and -1 when it started on the left (the flap shows its front).
	 */
	flapMatrix(dir: 1 | -1): string {
		const { x: nx, y: ny } = this.normal;
		const mirror = dir === 1 ? -1 : 1;
		const a = dir * (1 - 2 * nx * nx) * mirror;
		const b = -2 * nx * ny * mirror;
		const c = -2 * dir * nx * ny;
		const d = 1 - 2 * ny * ny;
		const shift = this.reflect({ x: dir === 1 ? this.width : 0, y: 0 });

		return `matrix(${a}, ${b}, ${c}, ${d}, ${dir * shift.x}, ${shift.y})`;
	}

	/** Keeps the part of a polygon on one side of the fold (1: the folded side). */
	private clip(polygon: Vec[], side: 1 | -1): Vec[] {
		const out: Vec[] = [];
		const inside = (p: Vec) => side * dot(sub(p, this.center), this.normal) >= 0;

		polygon.forEach((current, i) => {
			const previous = polygon[(i + polygon.length - 1) % polygon.length];
			const a = side * dot(sub(previous, this.center), this.normal);
			const b = side * dot(sub(current, this.center), this.normal);

			if (inside(current) !== inside(previous)) {
				const t = a / (a - b);
				out.push({ x: previous.x + (current.x - previous.x) * t, y: previous.y + (current.y - previous.y) * t });
			}
			if (inside(current)) out.push(current);
		});

		return out;
	}
}

export type TurnFrame = { origin: Vec; point: Vec; stiff: boolean };

type Listener = {
	frame: (frame: TurnFrame) => void;
	/** The leaf came to rest, either turned over or back where it started. */
	settle: (turned: boolean) => void;
};

type Mode = "idle" | "drag" | "fall" | "peek";

/** Natural frequencies (rad/ms) of the springs that move a released page. */
const FALL = 0.0075;
const AUTO = 0.0055;
const PEEK = 0.02;
/** How far ahead (ms) a flick carries the page when deciding where it lands. */
const FLICK_MS = 170;

/**
 * Moves one leaf: follows the pointer while dragged, then falls open or shut
 * on a critically damped spring, starting with the speed it was let go at.
 * While falling, the page lifts off the paper in an arc so it curls over
 * instead of sliding flat.
 */
export class PageTurn {
	private mode: Mode = "idle";
	private origin: Vec = { x: 0, y: 0 };
	private point: Vec = { x: 0, y: 0 };
	private stiff = false;
	private size = { width: 1, height: 1 };

	/** Spring state; `position.y` excludes the lift arc. */
	private position: Vec = { x: 0, y: 0 };
	private velocity: Vec = { x: 0, y: 0 };
	private target: Vec = { x: 0, y: 0 };
	private omega = FALL;
	private lift = 0;
	private turned = false;

	private trail: { p: Vec; t: number }[] = [];
	private raf = 0;
	private last = 0;

	constructor(private listener: Listener) {}

	get active() {
		return this.mode !== "idle";
	}

	get dragging() {
		return this.mode === "drag";
	}

	get peeking() {
		return this.mode === "peek";
	}

	get frame(): TurnFrame {
		return { origin: this.origin, point: this.point, stiff: this.stiff };
	}

	/** Takes hold of a leaf at `origin`, currently at `point`. */
	grab(origin: Vec, point: Vec, size: { width: number; height: number }, stiff: boolean) {
		this.size = size;
		this.origin = origin;
		this.stiff = stiff;
		this.mode = "drag";
		this.trail = [];
		this.stop();
		this.moveTo(point);
	}

	/** Follows the pointer during a drag. */
	drag(point: Vec) {
		if (this.mode !== "drag") return;

		this.moveTo(point);
	}

	/** Lets go: the page lands open or shut depending on where it is and how fast it moves. */
	release() {
		if (this.mode !== "drag") return false;

		const speed = this.speed();
		const ahead = this.point.x + speed.x * FLICK_MS;

		this.fall(ahead < 0, speed, FALL);

		return this.turned;
	}

	/** Turns a leaf over on its own, as if lifted by the given corner. */
	turn(origin: Vec, size: { width: number; height: number }, stiff: boolean) {
		this.size = size;
		this.origin = origin;
		this.stiff = stiff;
		this.point = { ...origin };
		this.fall(true, { x: 0, y: 0 }, AUTO);
	}

	/** Lifts a corner a little toward `point`, as a hint that it can be turned. */
	peek(origin: Vec, point: Vec, size: { width: number; height: number }, stiff: boolean) {
		if (this.mode === "drag" || this.mode === "fall") return;

		if (this.mode === "idle" || this.origin.x !== origin.x || this.origin.y !== origin.y) {
			this.size = size;
			this.origin = origin;
			this.stiff = stiff;
			this.point = { ...origin };
			this.position = { ...this.point };
			this.velocity = { x: 0, y: 0 };
			this.lift = 0;
		}

		this.mode = "peek";
		this.omega = PEEK;
		this.target = point;
		this.turned = point.x < 0;
		this.run();
	}

	/** Lets a peeking corner drop back. */
	unpeek() {
		if (this.mode !== "peek") return;

		this.mode = "fall";
		this.target = this.turned ? { x: -this.origin.x, y: this.origin.y } : { ...this.origin };
		this.run();
	}

	/** Ends any turn immediately, landing it where it was heading. */
	finish() {
		if (this.mode === "idle") return;

		const turned = this.mode === "fall" ? this.turned : this.point.x < 0;

		this.stop();
		this.mode = "idle";
		this.listener.settle(turned);
	}

	/** Drops the turn without settling, e.g. when the book is resized. */
	cancel() {
		this.stop();
		this.mode = "idle";
	}

	private moveTo(point: Vec) {
		const p = this.stiff ? { x: Math.max(-this.origin.x, Math.min(this.origin.x, point.x)), y: this.origin.y } : Fold.attach(point, this.origin, this.size.height);
		const now = performance.now();

		this.point = p;
		this.trail.push({ p, t: now });
		this.trail = this.trail.filter((s) => now - s.t < 100);
		this.listener.frame(this.frame);
	}

	private speed(): Vec {
		if (this.trail.length < 2) return { x: 0, y: 0 };

		const first = this.trail[0];
		const last = this.trail[this.trail.length - 1];
		const dt = Math.max(1, last.t - first.t);

		return { x: (last.p.x - first.p.x) / dt, y: (last.p.y - first.p.y) / dt };
	}

	private fall(turned: boolean, velocity: Vec, omega: number) {
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
			this.stop();
			this.mode = "idle";
			this.listener.settle(turned);
			return;
		}

		this.mode = "fall";
		this.turned = turned;
		this.omega = omega;
		this.target = turned ? { x: -this.origin.x, y: this.origin.y } : { ...this.origin };
		this.lift = this.stiff ? 0 : this.size.height * 0.12 * (this.origin.y > this.size.height / 2 ? -1 : 1);
		this.position = { x: this.point.x, y: this.point.y - this.arc(this.point.x) };
		this.velocity = velocity;
		this.run();
	}

	/** How far the page lifts off the paper at x while falling. */
	private arc(x: number) {
		const reach = Math.max(1, this.origin.x);
		const t = Math.min(1, Math.abs(x) / reach);

		return this.lift * (1 - t * t);
	}

	private run() {
		if (this.raf) return;

		this.last = performance.now();
		this.raf = requestAnimationFrame(this.tick);
	}

	private stop() {
		cancelAnimationFrame(this.raf);
		this.raf = 0;
	}

	private tick = (now: number) => {
		const dt = Math.min(48, now - this.last);
		const w = this.omega;

		this.last = now;

		for (let step = 0; step < dt; step += 4) {
			const h = Math.min(4, dt - step);

			for (const axis of ["x", "y"] as const) {
				const accel = w * w * (this.target[axis] - this.position[axis]) - 2 * w * this.velocity[axis];
				this.velocity[axis] += accel * h;
				this.position[axis] += this.velocity[axis] * h;
			}
		}

		const point = { x: this.position.x, y: this.position.y + (this.mode === "fall" ? this.arc(this.position.x) : 0) };

		this.point = this.stiff ? { x: point.x, y: this.origin.y } : Fold.attach(point, this.origin, this.size.height);
		this.listener.frame(this.frame);

		const resting = length(sub(this.target, this.position)) < 0.5 && length(this.velocity) < 0.02;

		if (resting && this.mode === "fall") {
			this.raf = 0;
			this.mode = "idle";
			this.listener.settle(this.turned);
			return;
		}

		this.raf = resting ? 0 : requestAnimationFrame(this.tick);
	};
}
