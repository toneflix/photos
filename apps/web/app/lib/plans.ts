import type { Plan, PlanFeature } from "@photos/types";

/** An amount in its currency, without decimals when it is a whole number. */
export function money(amount: number, currency: string) {
	try {
		return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
	} catch {
		return `${currency} ${amount.toLocaleString("en")}`;
	}
}

/** How long `cycles` billing periods of a plan last, e.g. "month" or "12 months". */
export function periodLabel(plan: Pick<Plan, "interval" | "intervalCount">, cycles = 1) {
	const count = Math.max(1, plan.intervalCount || 1) * Math.max(1, cycles);

	return count === 1 ? plan.interval : `${count} ${plan.interval}s`;
}

/** A limit as people read it: "Unlimited", "100 GB", "200 pages". */
export function limitLabel(feature: Pick<PlanFeature, "type" | "unit" | "value">) {
	const value = Number(feature.value);

	if (!value) return "Unlimited";
	if (feature.unit === "MB") return value >= 1024 ? `${Math.round((value / 1024) * 10) / 10} GB` : `${value} MB`;
	if (feature.unit === "pages") return `${value.toLocaleString("en")} pages`;

	return value.toLocaleString("en");
}

/** One line of a plan's feature list, and whether the plan includes it. */
export function featureLine(feature: PlanFeature): { text: string; included: boolean } {
	if (feature.type === "toggle") return { text: feature.title, included: !!feature.value };

	return { text: `${feature.title}: ${limitLabel(feature)}`, included: true };
}

/** Bytes as people read them. */
export function bytesLabel(bytes: number) {
	if (bytes >= 1024 ** 3) return `${Math.round((bytes / 1024 ** 3) * 10) / 10} GB`;
	if (bytes >= 1024 ** 2) return `${Math.round((bytes / 1024 ** 2) * 10) / 10} MB`;

	return `${Math.max(0, Math.round(bytes / 1024))} KB`;
}
