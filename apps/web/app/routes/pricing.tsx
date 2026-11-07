import { useState } from "react";
import { periodLabel } from "@photos/types";
import { Form, Link, data, redirect, useNavigation } from "react-router";
import { CycleSwitch, PlanCard } from "~/components/plans/PlanCard";
import { Alert, buttonClass } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { Session, optionalUser, requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/pricing";

export const meta = () => [
	{ title: "Plans · Toneflix Photos" },
	{ name: "description", content: "Make photo books for free, or go Premium for more photos, your own branding and books you hand to clients." },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const api = await (await Session.for(request, context)).api();
	const user = await optionalUser(request, context);
	const [plans, account] = await Promise.all([api.plans(), user ? api.account.plan() : null]);

	return { plans: plans.data, current: account?.data ?? null, signedIn: !!user };
}

/** Start a payment and send the payer to Flutterwave's checkout. */
export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();

	try {
		const { data: payment } = await api.payments.start({ plan: String(form.get("plan")), cycles: Number(form.get("cycles")) || 1 });

		return redirect(payment.checkoutUrl!);
	} catch (error) {
		return data(formError(error), { status: 422 });
	}
}

/** The plans on offer, priced in the visitor's currency, with a way to pay for one. */
export default function Pricing({ loaderData, actionData }: Route.ComponentProps) {
	const { plans, current, signedIn } = loaderData;
	const navigation = useNavigation();
	const paid = plans.filter((plan) => plan.price > 0);
	const cycles = [...new Set(paid.flatMap((plan) => plan.billing.map((option) => option.cycles)))].sort((a, b) => a - b);
	const [chosen, setChosen] = useState(cycles.at(-1) ?? 1);
	const options = cycles.map((count) => ({
		cycles: count,
		label: paid.flatMap((plan) => plan.billing).find((option) => option.cycles === count)?.label ?? periodLabel(paid[0], count),
		discount: Math.max(0, ...paid.map((plan) => plan.billing.find((option) => option.cycles === count)?.discount ?? 0)),
	}));
	const starting = navigation.state !== "idle" && navigation.formAction === "/pricing";

	return (
		<main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
			<div className="text-center">
				<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">Plans</h1>
				<p className="mx-auto mt-3 max-w-2xl text-lg text-ink-500">
					Make photo books for free. Premium gives you room for every shoot, your own branding, and books you hand to your clients.
				</p>
				<div className="mt-8">
					<CycleSwitch options={options} value={chosen} onChange={setChosen} />
				</div>
			</div>

			{actionData?.error && (
				<div className="mx-auto mt-8 max-w-xl">
					<Alert>{Object.values(actionData.fieldErrors)[0] ?? actionData.error}</Alert>
				</div>
			)}

			<div className={`mt-10 grid gap-6 ${plans.length > 2 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
				{plans.map((plan) => {
					const isCurrent = current?.plan.slug === plan.slug;
					const billing = plan.billing.find((option) => option.cycles === chosen) ?? plan.billing[0];

					return (
						<PlanCard key={plan.id} plan={plan} cycles={billing.cycles} current={isCurrent}>
							{plan.price <= 0 ? (
								signedIn ? (
									<span className={buttonClass("secondary", "w-full !cursor-default")}>
										{isCurrent ? "You're on this plan" : "Included with every account"}
									</span>
								) : (
									<Link prefetch="intent" to="/signup" className={buttonClass("secondary", "w-full")}>
										Start for free
									</Link>
								)
							) : (
								<Form method="post">
									<input type="hidden" name="plan" value={plan.slug} />
									<input type="hidden" name="cycles" value={billing.cycles} />
									<button type="submit" disabled={starting} className={buttonClass("primary", "w-full")}>
										{starting ? "Opening checkout…" : isCurrent ? `Add ${periodLabel(plan, billing.cycles)}` : `Get ${plan.name}`}
									</button>
								</Form>
							)}
						</PlanCard>
					);
				})}
			</div>

			{current?.premium && current.endsAt && (
				<p className="mt-10 text-center text-sm text-ink-500">
					Time you add starts after {new Date(current.endsAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.
				</p>
			)}
		</main>
	);
}
