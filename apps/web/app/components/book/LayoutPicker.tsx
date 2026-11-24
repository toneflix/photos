import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { PAGE_LAYOUTS, layoutSketch, pageAspect, type PageLayout, type PageShape, type SketchBox } from "@photos/types";

const LAYOUTS = Object.keys(PAGE_LAYOUTS) as PageLayout[];

/** A small page drawing showing where a layout puts its photos and writing. */
export function LayoutSketch({ layout, shape, className = "" }: { layout: PageLayout; shape?: PageShape; className?: string }) {
	const { width, height, photos, lines } = layoutSketch(layout, shape);
	const box = ([x, y, width, height, turn]: SketchBox, i: number, fill: string) => (
		<rect
			key={i}
			x={x}
			y={y}
			width={width}
			height={height}
			rx={2}
			className={fill}
			transform={turn ? `rotate(${turn} ${x + width / 2} ${y + height / 2})` : undefined}
		/>
	);

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
			{photos.map((photo, i) => box(photo, i, "fill-current"))}
			{lines.map((line, i) => box(line, i, "fill-current opacity-45"))}
		</svg>
	);
}

/** The gold star on a design the plan doesn't include. Its parent must be positioned. */
export function PlanStar() {
	return (
		<span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-gold-400 text-ink-900">
			<svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
				<path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
			</svg>
			<span className="sr-only">Not in your plan</span>
		</span>
	);
}

/** One row of page layouts, sketched in the book's page shape, that scrolls sideways keeping the chosen one in view. Layouts outside `allowed` carry a star. */
export function LayoutPicker({
	value,
	shape = "portrait",
	allowed,
	onPick,
}: {
	value: PageLayout;
	shape?: PageShape;
	allowed?: PageLayout[];
	onPick: (layout: PageLayout) => void;
}) {
	const list = useRef<HTMLDivElement>(null);
	const [asked, setAsked] = useState<PageLayout | null>(null);

	useEffect(() => {
		const row = list.current;
		const chosen = row?.querySelector<HTMLElement>('[aria-checked="true"]');

		if (!row || !chosen) return;

		const left = chosen.offsetLeft - (row.clientWidth - chosen.offsetWidth) / 2;

		row.scrollTo({ left, behavior: "smooth" });
		setAsked(null);
	}, [value]);

	return (
		<div className="panel w-full overflow-hidden">
			<div
				ref={list}
				role="radiogroup"
				aria-label="Page layout"
				className="relative flex snap-x justify-between gap-1 overflow-x-auto px-4 py-2.5 [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)] [scrollbar-width:none]"
			>
				{LAYOUTS.map((layout) => {
					const on = value === layout;
					const premium = !!allowed && !allowed.includes(layout);

					return (
						<button
							key={layout}
							type="button"
							role="radio"
							aria-checked={on}
							aria-disabled={premium || undefined}
							aria-describedby={premium ? "premium-layout" : undefined}
							onClick={() => {
								setAsked(premium ? layout : null);

								if (!premium) onPick(layout);
							}}
							className="group flex min-w-14 shrink-0 snap-center flex-col items-center gap-1.5 rounded-lg px-1 py-1 focus-visible:outline-offset-0"
						>
							<span
								style={{ aspectRatio: pageAspect(shape) }}
								className={`relative flex ${shape === "portrait" ? "w-10" : "h-10"} items-center justify-center rounded-[5px] border-2 transition-colors ${
									on
										? "border-brand-600 bg-brand-50 text-brand-600"
										: premium
											? "border-gold-200 bg-gold-50 text-gold-600 group-hover:border-gold-400"
											: "border-surface-200 bg-surface-100 text-ink-500 group-hover:border-surface-300 group-hover:text-ink-700"
								}`}
							>
								<LayoutSketch layout={layout} shape={shape} className={`h-full w-full ${premium ? "opacity-45" : ""}`} />
								{premium && <PlanStar />}
							</span>
							<span className={`text-[11px] leading-tight whitespace-nowrap ${on ? "font-semibold text-brand-700" : "text-ink-500 group-hover:text-ink-900"}`}>
								{PAGE_LAYOUTS[layout].label}
							</span>
						</button>
					);
				})}
			</div>
			{asked && (
				<p id="premium-layout" className="border-t-[1.5px] border-surface-200 px-4 py-2 text-center text-xs text-ink-700">
					{PAGE_LAYOUTS[asked].label} pages aren't included in your plan.{" "}
					<Link to="/pricing" className="font-semibold text-brand-700 hover:underline">
						See plans
					</Link>
				</p>
			)}
		</div>
	);
}
