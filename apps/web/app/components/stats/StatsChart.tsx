import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { StatsDay } from "@photos/types";

/** Fixed series order and colours, checked for colour-blind separation against white. */
const SERIES = [
	{ key: "views", label: "Views", color: "#0064d6" },
	{ key: "downloads", label: "Downloads", color: "#bb8c01" },
] as const;

/** How far back a chart can look, in days. */
export const RANGES = [7, 30, 90];

const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

const number = new Intl.NumberFormat("en");
const shortDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** A rounded axis top and a few even steps up to it. */
function ticks(max: number): number[] {
	if (max <= 4) return Array.from({ length: Math.max(max, 1) + 1 }, (_, index) => index);

	const step = 10 ** Math.floor(Math.log10(max / 4));
	const nice = [1, 2, 5, 10].map((factor) => factor * step).find((size) => max / size <= 4) ?? step * 10;

	return Array.from({ length: Math.ceil(max / nice) + 1 }, (_, index) => index * nice);
}

/**
 * Views and downloads per day as two lines on one axis. Hovering shows that day's numbers,
 * and the same numbers are in a table for screen readers and anyone who wants them.
 * Pass `downloads={false}` for spaces, which have nothing to download.
 */
export function StatsChart({ days, title, downloads = true }: { days: StatsDay[]; title: string; downloads?: boolean }) {
	const id = useId();
	const [active, setActive] = useState<number | null>(null);
	const box = useRef<HTMLDivElement>(null);
	const [WIDTH, setWidth] = useState(720);

	// Draw at the real width so text and lines keep their size on any screen.
	useEffect(() => {
		const element = box.current;

		if (!element) return;

		const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));

		observer.observe(element);

		return () => observer.disconnect();
	}, []);
	const series = downloads ? SERIES : SERIES.slice(0, 1);
	const scale = useMemo(() => {
		const max = Math.max(0, ...days.flatMap((day) => series.map((line) => day[line.key])));
		const steps = ticks(max);
		const top = steps.at(-1) || 1;
		const innerWidth = WIDTH - PAD.left - PAD.right;
		const innerHeight = HEIGHT - PAD.top - PAD.bottom;

		return {
			steps,
			x: (index: number) => PAD.left + (days.length > 1 ? (index / (days.length - 1)) * innerWidth : innerWidth / 2),
			y: (value: number) => PAD.top + innerHeight - (value / top) * innerHeight,
			band: innerWidth / Math.max(days.length - 1, 1),
		};
	}, [days, series, WIDTH]);
	const totals = series.map((line) => ({ ...line, total: days.reduce((sum, day) => sum + day[line.key], 0) }));
	const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(WIDTH / 110)));
	const hovered = active === null ? null : days[active];

	return (
		<figure className="panel min-w-0 p-5" aria-labelledby={`${id}-title`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<figcaption id={`${id}-title`} className="font-display text-lg font-bold text-ink-900">
					{title}
				</figcaption>
				<ul className="flex flex-wrap gap-4 text-sm text-ink-700" aria-label="Legend">
					{totals.map((line) => (
						<li key={line.key} className="flex items-center gap-2">
							<span className="h-0.5 w-4 rounded-full" style={{ background: line.color }} aria-hidden />
							{line.label}
							<span className="font-semibold text-ink-900">{number.format(line.total)}</span>
						</li>
					))}
				</ul>
			</div>

			<div ref={box} className="relative mt-4">
				<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`${title}, ${days.length} days. The numbers are in the table below.`}>
					{scale.steps.map((step) => (
						<g key={step}>
							<line x1={PAD.left} x2={WIDTH - PAD.right} y1={scale.y(step)} y2={scale.y(step)} stroke="var(--color-surface-200)" strokeWidth={1} />
							<text x={PAD.left - 8} y={scale.y(step)} dy="0.32em" textAnchor="end" className="fill-ink-500 text-[11px]">
								{number.format(step)}
							</text>
						</g>
					))}
					{days.map((day, index) =>
						(index % labelEvery === 0 && days.length - 1 - index >= labelEvery / 2) || index === days.length - 1 ? (
							<text key={day.date} x={scale.x(index)} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-500 text-[11px]">
								{shortDate(day.date)}
							</text>
						) : null,
					)}

					{active !== null && <line x1={scale.x(active)} x2={scale.x(active)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--color-ink-500)" strokeWidth={1} strokeDasharray="3 3" />}

					{series.map((line) => (
						<polyline
							key={line.key}
							points={days.map((day, index) => `${scale.x(index)},${scale.y(day[line.key])}`).join(" ")}
							fill="none"
							stroke={line.color}
							strokeWidth={2}
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
					))}

					{active !== null &&
						series.map((line) => (
							<circle key={line.key} cx={scale.x(active)} cy={scale.y(days[active][line.key])} r={4.5} fill={line.color} stroke="white" strokeWidth={2} />
						))}

					{/* Hit areas wider than the lines, one per day. */}
					{days.map((day, index) => (
						<rect
							key={day.date}
							x={scale.x(index) - scale.band / 2}
							y={PAD.top}
							width={scale.band}
							height={HEIGHT - PAD.top - PAD.bottom}
							fill="transparent"
							onPointerEnter={() => setActive(index)}
							onPointerLeave={() => setActive((current) => (current === index ? null : current))}
						/>
					))}
				</svg>

				{hovered && active !== null && (
					<div
						className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-xl border-[1.5px] border-surface-200 bg-surface-50 px-3 py-2 text-sm"
						style={{ left: `${(Math.min(Math.max(scale.x(active), 90), WIDTH - 90) / WIDTH) * 100}%` }}
					>
						<p className="font-semibold text-ink-900">{shortDate(hovered.date)}</p>
						{series.map((line) => (
							<p key={line.key} className="flex items-center justify-between gap-4 text-ink-700">
								<span className="flex items-center gap-2">
									<span className="h-2 w-2 rounded-full" style={{ background: line.color }} aria-hidden />
									{line.label}
								</span>
								<span className="font-semibold text-ink-900">{number.format(hovered[line.key])}</span>
							</p>
						))}
					</div>
				)}
			</div>

			<details className="mt-3 text-sm">
				<summary className="cursor-pointer font-semibold text-brand-700">Show as a table</summary>
				<div className="mt-2 max-h-64 overflow-auto">
					<table className="w-full text-left">
						<thead className="text-ink-500">
							<tr>
								<th className="py-1 font-medium">Day</th>
								{series.map((line) => (
									<th key={line.key} className="py-1 text-right font-medium">
										{line.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-surface-200 text-ink-900">
							{[...days].reverse().map((day) => (
								<tr key={day.date}>
									<td className="py-1">{shortDate(day.date)}</td>
									{series.map((line) => (
										<td key={line.key} className="py-1 text-right tabular-nums">
											{number.format(day[line.key])}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</details>
		</figure>
	);
}

/** A row of headline numbers. */
export function StatTiles({ items }: { items: { label: string; value: string; note?: string }[] }) {
	return (
		<dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{items.map((item) => (
				<div key={item.label} className="panel p-5">
					<dt className="text-sm font-medium text-ink-500">{item.label}</dt>
					<dd className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900">{item.value}</dd>
					{item.note && <dd className="mt-1 text-sm text-ink-500">{item.note}</dd>}
				</div>
			))}
		</dl>
	);
}

/** Buttons for 7, 30 or 90 days, kept in the address so the view can be shared. */
export function RangePicker({ days }: { days: number }) {
	const [params] = useSearchParams();
	const link = (range: number) => {
		const next = new URLSearchParams(params);

		next.set("days", String(range));

		return `?${next}`;
	};

	return (
		<nav className="flex gap-1" aria-label="Time range">
			{RANGES.map((range) => (
				<Link
					key={range}
					to={link(range)}
					preventScrollReset
					aria-current={range === days ? "page" : undefined}
					className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${range === days ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface-100"}`}
				>
					{range} days
				</Link>
			))}
		</nav>
	);
}
