import { useState } from "react";
import { Link } from "react-router";
import { PAGE_SHAPES, pageAspect, type PageShape } from "@photos/types";
import { PlanStar } from "./LayoutPicker";

const SHAPES = Object.keys(PAGE_SHAPES) as PageShape[];

/** Radio cards for the book's page shape, each drawn at its proportions. Shapes outside `allowed` carry a star. */
export function ShapePicker({
	value,
	allowed,
	name,
	onChange,
}: {
	value: PageShape;
	allowed?: PageShape[];
	name?: string;
	onChange: (shape: PageShape) => void;
}) {
	const [asked, setAsked] = useState<PageShape | null>(null);

	return (
		<fieldset>
			<legend className="mb-1.5 text-sm font-medium text-ink-700">Page shape</legend>
			{name && <input type="hidden" name={name} value={value} />}
			<div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Page shape">
				{SHAPES.map((shape) => {
					const on = value === shape;
					const premium = !!allowed && !allowed.includes(shape);
					const aspect = pageAspect(shape);

					return (
						<button
							key={shape}
							type="button"
							role="radio"
							aria-checked={on}
							aria-disabled={premium || undefined}
							aria-describedby={premium ? "premium-shape" : undefined}
							onClick={() => {
								setAsked(premium ? shape : null);

								if (!premium) onChange(shape);
							}}
							className={`group flex flex-col items-center gap-1.5 rounded-lg border-[1.5px] px-1 pt-3 pb-2 transition-colors ${
								on ? "border-brand-600 bg-brand-50" : "border-surface-200 bg-white hover:border-surface-300"
							}`}
						>
							<span className="flex h-10 items-end">
								<span
									style={{ aspectRatio: aspect }}
									className={`relative block rounded-[3px] border-2 ${aspect < 1 ? "h-10" : aspect > 1.4 ? "w-12" : aspect > 1 ? "w-11" : "h-9"} ${
										on ? "border-brand-600 bg-white" : premium ? "border-gold-300 bg-gold-50" : "border-ink-500/50 bg-surface-100"
									}`}
								>
									{premium && <PlanStar />}
								</span>
							</span>
							<span className={`text-xs leading-tight ${on ? "font-semibold text-brand-700" : "text-ink-700"}`}>{PAGE_SHAPES[shape].label}</span>
							<span className="text-[11px] leading-none text-ink-500">{PAGE_SHAPES[shape].ratio}</span>
						</button>
					);
				})}
			</div>
			{asked ? (
				<p id="premium-shape" className="mt-2 text-xs text-ink-700">
					{PAGE_SHAPES[asked].label} pages aren't included in your plan.{" "}
					<Link to="/pricing" className="font-semibold text-brand-700 hover:underline">
						See plans
					</Link>
				</p>
			) : (
				<p className="mt-2 text-xs text-ink-500">The cover and every page take this shape.</p>
			)}
		</fieldset>
	);
}
