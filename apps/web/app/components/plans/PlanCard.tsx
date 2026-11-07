import type { ReactNode } from "react";
import { chargePerCycle, featureLine, formatMoney, periodLabel } from "@photos/types";
import type { Plan } from "@photos/types";

/** One plan on the pricing page: its price for the chosen billing, what it includes, and an action. */
export function PlanCard({ plan, cycles, current, children }: { plan: Plan; cycles: number; current: boolean; children: ReactNode }) {
	const billing = plan.billing.find((option) => option.cycles === cycles) ?? plan.billing[0];
	const free = plan.price <= 0;
	const perPeriod = chargePerCycle(billing);

	return (
		<article className={`panel flex flex-col p-6 sm:p-8 ${plan.isHighlighted ? "!border-brand-600" : ""}`}>
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{plan.name}</h2>
				{current && <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">Your plan</span>}
			</div>
			{plan.description && <p className="mt-1 text-ink-500">{plan.description}</p>}
			<p className="mt-6 flex items-baseline gap-1.5">
				<span className="font-display text-4xl font-bold tracking-tight text-ink-900">{free ? "Free" : formatMoney(perPeriod, plan.chargeCurrency)}</span>
				{!free && <span className="text-ink-500">/ {periodLabel(plan)}</span>}
			</p>
			<p className="mt-1 min-h-5 text-sm text-ink-500">
				{!free && billing.cycles > 1 && (
					<>
						{formatMoney(billing.charge, plan.chargeCurrency)} every {periodLabel(plan, billing.cycles)}
						{billing.discount > 0 && <span className="font-semibold text-emerald-700"> · save {billing.discount}%</span>}
					</>
				)}
			</p>
			<div className="mt-6">{children}</div>
			<ul className="mt-8 space-y-3 text-sm">
				{plan.features.map((feature) => {
					const line = featureLine(feature);

					return (
						<li key={feature.key} className={`flex gap-3 ${line.included ? "text-ink-900" : "text-ink-500 line-through decoration-ink-500/40"}`}>
							<svg
								viewBox="0 0 20 20"
								className={`mt-0.5 h-4 w-4 shrink-0 ${line.included ? "text-brand-600" : "text-ink-500/60"}`}
								fill="none"
								stroke="currentColor"
								strokeWidth="2.2"
								aria-hidden
							>
								{line.included ? (
									<path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
								) : (
									<path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
								)}
							</svg>
							<span>
								<span className="sr-only">{line.included ? "Included: " : "Not included: "}</span>
								{line.text}
							</span>
						</li>
					);
				})}
			</ul>
		</article>
	);
}

/** Choose how many billing periods to pay for at once, e.g. monthly or yearly. */
export function CycleSwitch({
	options,
	value,
	onChange,
}: {
	options: Array<{ cycles: number; label: string; discount: number }>;
	value: number;
	onChange: (cycles: number) => void;
}) {
	if (options.length < 2) return null;

	return (
		<div role="radiogroup" aria-label="Billing" className="inline-flex rounded-xl border-[1.5px] border-surface-200 bg-white p-1">
			{options.map((option) => (
				<button
					key={option.cycles}
					type="button"
					role="radio"
					aria-checked={value === option.cycles}
					onClick={() => onChange(option.cycles)}
					className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${value === option.cycles ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface-100"}`}
				>
					{option.label}
					{option.discount > 0 && <span className={value === option.cycles ? "text-white/80" : "text-emerald-700"}> · save {option.discount}%</span>}
				</button>
			))}
		</div>
	);
}
