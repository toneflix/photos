import { Link } from "react-router";
import type { AccountPlan } from "@photos/types";
import { buttonClass } from "~/components/ui";
import { PageHeader, Section } from "~/components/settings/Section";
import { bytesLabel, featureLine, limitLabel, money } from "~/lib/plans";
import { requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/plan";

export const meta = () => [{ title: "Plan · Settings · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const [plan, payments] = await Promise.all([api.account.plan(), api.account.payments({ per_page: 10 })]);

	return { plan: plan.data, payments: payments.data };
}

const STATUS = { complete: "Paid", pending: "Waiting", rejected: "Didn't go through" } as const;

/** How much of one limit is used, as a bar. A limit of 0 means no limit. */
function Usage({ label, used, limit, format = (value: number) => value.toLocaleString("en") }: { label: string; used: number; limit: number; format?: (value: number) => string }) {
	const share = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

	return (
		<div>
			<div className="flex items-baseline justify-between gap-3 text-sm">
				<span className="font-medium text-ink-900">{label}</span>
				<span className="text-ink-500">
					{format(used)} of {limit > 0 ? format(limit) : "unlimited"}
				</span>
			</div>
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-200" aria-hidden>
				<div className={`h-full rounded-full ${share >= 90 ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${limit > 0 ? Math.max(share, used ? 2 : 0) : 0}%` }} />
			</div>
		</div>
	);
}

function limitOf(plan: AccountPlan, key: "max_books" | "max_spaces") {
	return Number(plan.features[key]) || 0;
}

/** The account's plan: what it includes, what is used, when paid time ends, and past payments. */
export default function PlanSettings({ loaderData }: Route.ComponentProps) {
	const { plan, payments } = loaderData;
	const endsAt = plan.endsAt ? new Date(plan.endsAt).toLocaleDateString(undefined, { dateStyle: "long" }) : null;

	return (
		<>
			<PageHeader title="Plan" description="What your account includes and how much of it you use." />
			<div className="space-y-6">
				<Section>
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<p className="text-xs font-semibold tracking-[0.14em] text-ink-500 uppercase">Your plan</p>
							<p className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900">{plan.plan.name}</p>
							<p className="mt-1 text-sm text-ink-500">
								{endsAt ? `Paid until ${endsAt}. It doesn't renew on its own; after that you're back on Free and keep everything you made.` : plan.plan.description}
							</p>
						</div>
						<Link prefetch="intent" to="/pricing" className={buttonClass(plan.premium ? "secondary" : "primary")}>
							{plan.premium ? "Add more time" : "See Premium"}
						</Link>
					</div>
					<div className="mt-8 grid gap-6 sm:grid-cols-3">
						<Usage label="Storage" used={plan.usage.storage.used} limit={plan.usage.storage.limit} format={bytesLabel} />
						<Usage label="Books" used={plan.usage.books} limit={limitOf(plan, "max_books")} />
						<Usage label="Spaces" used={plan.usage.spaces} limit={limitOf(plan, "max_spaces")} />
					</div>
				</Section>

				<Section title="What's included">
					<ul className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
						{plan.plan.features.map((feature) => {
							const line = featureLine(feature);

							return (
								<li key={feature.key} className={`flex justify-between gap-4 ${line.included ? "text-ink-900" : "text-ink-500"}`}>
									<span>{feature.title}</span>
									<span className="shrink-0 font-medium">{feature.type === "toggle" ? (feature.value ? "Included" : "Premium") : limitLabel(feature)}</span>
								</li>
							);
						})}
					</ul>
				</Section>

				<Section title="Payments">
					{payments.length ? (
						<ul className="divide-y-[1.5px] divide-surface-200">
							{payments.map((payment) => (
								<li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
									<div>
										<p className="font-medium text-ink-900">{payment.title}</p>
										<p className="text-ink-500">
											{new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · {payment.reference}
										</p>
									</div>
									<div className="text-right">
										<p className="font-medium text-ink-900">{money(payment.chargeAmount, payment.chargeCurrency)}</p>
										<p className={payment.status === "complete" ? "text-emerald-700" : payment.status === "pending" ? "text-ink-500" : "text-amber-700"}>{STATUS[payment.status]}</p>
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-ink-500">No payments yet.</p>
					)}
				</Section>
			</div>
		</>
	);
}
