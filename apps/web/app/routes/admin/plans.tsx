import { type InputHTMLAttributes, useState } from "react";
import { formatMoney, limitLabel, periodLabel } from "@photos/types";
import { Link, data, redirect, useFetcher } from "react-router";
import type { AdminPlan, AdminPlanFeature, FeatureDefinition, FeatureKey, PlanInput, PlanInterval } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Icon } from "~/components/admin/Icon";
import { Alert, Button, buttonClass } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/plans";

export const meta = () => [{ title: "Plans · Admin · Toneflix Photos" }];

const INTERVALS: PlanInterval[] = ["day", "week", "month", "year"];

type FeatureForm = Pick<AdminPlanFeature, "value" | "active" | "listed">;

interface PlanForm {
	name: string;
	description: string;
	price: string;
	currency: string;
	interval: PlanInterval;
	intervalCount: string;
	billingOptions: Array<{ cycles: string; discount: string }>;
	isDefault: boolean;
	active: boolean;
	isHidden: boolean;
	sort: string;
	features: Record<FeatureKey, FeatureForm>;
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "plans.manage");
	const result = await api.admin.plans();
	const creating = params.plan === "new";
	const current = creating ? null : (result.data.find((plan) => plan.id === params.plan) ?? null);

	if (params.plan && !creating && !current) throw new Response("Not found", { status: 404 });

	return { plans: result.data, catalogue: result.features, current: current ?? (creating ? null : result.data[0]), creating, chosen: Boolean(params.plan) };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "plans.manage");
	const { intent, plan } = (await request.json()) as { intent: "save" | "delete"; plan: PlanInput };

	try {
		if (intent === "delete") {
			const result = await api.admin.removePlan(String(params.plan));

			if (result.deleted) return redirect("/admin/plans");

			return { message: result.message, error: null, fieldErrors: {} as Record<string, string> };
		}

		if (params.plan === "new") {
			const { data: created } = await api.admin.createPlan(plan as PlanInput & { name: string; price: number });

			return redirect(`/admin/plans/${created.id}`);
		}

		await api.admin.updatePlan(String(params.plan), plan);

		return { message: "Saved.", error: null, fieldErrors: {} as Record<string, string> };
	} catch (error) {
		return data({ message: null, ...formError(error) }, { status: 422 });
	}
}

/** Plans are built from the feature catalogue. The plans are on the left, the chosen one's form on the right. */
export default function AdminPlans({ loaderData }: Route.ComponentProps) {
	const { plans, catalogue, current, creating, chosen } = loaderData;

	return (
		<>
			<AdminHeader title="Plans" description="What each plan costs and what it grants or limits. Accounts without paid time are on the default plan." />
			<div className="lg:grid lg:grid-cols-[22rem_1fr]">
				<nav aria-label="Plans" className={`border-surface-200 p-3 lg:block lg:border-r-[1.5px] ${chosen ? "hidden" : ""}`}>
					<Link prefetch="intent" to="/admin/plans/new" className={buttonClass("brand", "mb-3 w-full")}>
						<Icon name="plus" className="h-4 w-4" />
						New plan
					</Link>
					<ul className="space-y-1">
						{plans.map((plan) => {
							const active = plan.id === current?.id;

							return (
								<li key={plan.id}>
									<Link
										prefetch="intent"
										to={`/admin/plans/${plan.id}`}
										className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition ${active ? "bg-white ring-[1.5px] ring-surface-200 lg:bg-surface-100 lg:ring-0" : "hover:bg-surface-100"}`}
									>
										<Icon name="tag" className="h-5 w-5 text-ink-500" />
										<span className="min-w-0 flex-1">
											<span className={`flex flex-wrap items-center gap-2 font-semibold ${active ? "text-brand-700" : "text-ink-900"}`}>
												{plan.name}
												{plan.isDefault && <Badge>Default</Badge>}
												{!plan.active && <Badge>Off</Badge>}
												{plan.isHidden && <Badge>Hidden</Badge>}
											</span>
											<span className="block text-sm text-ink-500">
												{plan.price > 0 ? `${formatMoney(plan.price, plan.currency)} / ${periodLabel(plan)}` : "Free"} · {plan.subscriberCount}{" "}
												{plan.subscriberCount === 1 ? "account" : "accounts"} on it now
											</span>
										</span>
										<Icon name="chevron" className="h-4 w-4 text-ink-500" />
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
				<div className={chosen ? "" : "hidden lg:block"}>
					<PlanEditor key={current?.id ?? "new"} plan={creating ? null : current} catalogue={catalogue} />
				</div>
			</div>
		</>
	);
}

function Badge({ children }: { children: string }) {
	return <span className="rounded-md bg-surface-200 px-1.5 py-0.5 text-xs font-semibold text-ink-700">{children}</span>;
}

/** The form's starting values: the plan's, or a new monthly plan with every feature at its free value. */
function startingForm(plan: AdminPlan | null, catalogue: FeatureDefinition[]): PlanForm {
	const features = Object.fromEntries(
		catalogue.map((feature) => {
			const stored = plan?.features.find((entry) => entry.key === feature.key);

			return [
				feature.key,
				stored ? { value: stored.value, active: stored.active, listed: stored.listed } : { value: feature.fallback, active: true, listed: true },
			];
		}),
	) as PlanForm["features"];

	return {
		name: plan?.name ?? "",
		description: plan?.description ?? "",
		price: String(plan?.price ?? ""),
		currency: plan?.currency ?? "NGN",
		interval: plan?.interval ?? "month",
		intervalCount: String(plan?.intervalCount ?? 1),
		billingOptions: (plan?.billingOptions ?? []).map((option) => ({ cycles: String(option.cycles), discount: String(option.discount) })),
		isDefault: plan?.isDefault ?? false,
		active: plan?.active ?? true,
		isHidden: plan?.isHidden ?? false,
		sort: String(plan?.sort ?? 0),
		features,
	};
}

/** What the API needs from the form. */
function toInput(form: PlanForm): PlanInput {
	return {
		name: form.name,
		description: form.description || null,
		price: Number(form.price) || 0,
		currency: form.currency,
		interval: form.interval,
		intervalCount: Number(form.intervalCount) || 1,
		billingOptions: form.billingOptions
			.filter((option) => option.cycles)
			.map((option) => ({ cycles: Number(option.cycles), discount: Number(option.discount) || 0 })),
		isDefault: form.isDefault,
		active: form.active,
		isHidden: form.isHidden,
		sort: Number(form.sort) || 0,
		features: form.features,
	};
}

function PlanEditor({ plan, catalogue }: { plan: AdminPlan | null; catalogue: FeatureDefinition[] }) {
	const fetcher = useFetcher<typeof action>();
	const [form, setForm] = useState(() => startingForm(plan, catalogue));
	const [changed, setChanged] = useState(false);
	const busy = fetcher.state !== "idle";
	const result = fetcher.state === "idle" && !changed ? fetcher.data : undefined;
	const errors = result?.fieldErrors ?? {};
	const change = (next: Partial<PlanForm>) => {
		setChanged(true);
		setForm((current) => ({ ...current, ...next }));
	};
	const changeFeature = (key: FeatureKey, next: Partial<FeatureForm>) => change({ features: { ...form.features, [key]: { ...form.features[key], ...next } } });
	const send = (intent: "save" | "delete") => {
		setChanged(false);
		fetcher.submit({ intent, plan: toInput(form) } as never, { method: "post", encType: "application/json" });
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				send("save");
			}}
			className="flex min-h-full flex-col"
		>
			<div className="flex-1 space-y-8 px-4 py-6 sm:px-8">
				<Link prefetch="intent" to="/admin/plans" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 lg:hidden">
					<Icon name="back" className="h-4 w-4" />
					All plans
				</Link>
				<div>
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{plan ? plan.name : "New plan"}</h2>
					<p className="mt-1 text-ink-500">
						{plan?.isDefault
							? "The default plan. Every account without paid time is on it, so it stays free and on offer."
							: "Set a price and choose what this plan grants."}
					</p>
				</div>
				{result?.error && <Alert>{result.error}</Alert>}

				<div className="grid gap-5 sm:grid-cols-2">
					<TextField label="Name" error={errors.name} value={form.name} onChange={(name) => change({ name })} required maxLength={100} placeholder="Studio" />
					<TextField
						label="Description"
						error={errors.description}
						value={form.description}
						onChange={(description) => change({ description })}
						maxLength={500}
						placeholder="Who this plan is for"
					/>
					<TextField
						label="Price"
						error={errors.price}
						value={form.price}
						onChange={(price) => change({ price })}
						required
						inputMode="decimal"
						type="number"
						min={0}
						step="0.01"
						placeholder="5000"
					/>
					<TextField
						label="Currency"
						error={errors.currency}
						value={form.currency}
						onChange={(currency) => change({ currency: currency.toUpperCase() })}
						maxLength={3}
						placeholder="NGN"
					/>
					<div className="grid grid-cols-2 gap-3">
						<TextField
							label="Every"
							error={errors.intervalCount}
							value={form.intervalCount}
							onChange={(intervalCount) => change({ intervalCount })}
							type="number"
							min={1}
							max={120}
						/>
						<label className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5">
							<span className="text-xs font-medium text-ink-500">Period</span>
							<select
								value={form.interval}
								onChange={(event) => change({ interval: event.target.value as PlanInterval })}
								className="field-input cursor-pointer text-base text-ink-900"
							>
								{INTERVALS.map((interval) => (
									<option key={interval} value={interval}>
										{form.intervalCount === "1" ? interval : `${interval}s`}
									</option>
								))}
							</select>
						</label>
					</div>
					<TextField
						label="Order on the pricing page"
						error={errors.sort}
						value={form.sort}
						onChange={(sort) => change({ sort })}
						type="number"
						min={0}
						max={1000}
					/>
				</div>

				<fieldset className="space-y-3">
					<legend className="mb-1 font-semibold text-ink-900">Pay for longer at once</legend>
					<p className="text-sm text-ink-500">Each option lets people pay for several periods in one go, at a discount.</p>
					{form.billingOptions.map((option, index) => (
						<div key={index} className="flex flex-wrap items-center gap-3">
							<div className="w-36">
								<TextField
									label="Periods"
									value={option.cycles}
									onChange={(cycles) => change({ billingOptions: form.billingOptions.map((entry, at) => (at === index ? { ...entry, cycles } : entry)) })}
									type="number"
									min={2}
									max={120}
								/>
							</div>
							<div className="w-36">
								<TextField
									label="Discount %"
									value={option.discount}
									onChange={(discount) => change({ billingOptions: form.billingOptions.map((entry, at) => (at === index ? { ...entry, discount } : entry)) })}
									type="number"
									min={0}
									max={100}
								/>
							</div>
							<Button variant="ghost" onClick={() => change({ billingOptions: form.billingOptions.filter((_, at) => at !== index) })}>
								Remove
							</Button>
						</div>
					))}
					<Button variant="secondary" onClick={() => change({ billingOptions: [...form.billingOptions, { cycles: "12", discount: "20" }] })}>
						<Icon name="plus" className="h-4 w-4" />
						Add an option
					</Button>
				</fieldset>

				<fieldset className="grid gap-3 sm:grid-cols-3">
					<legend className="mb-3 font-semibold text-ink-900">Availability</legend>
					<Check
						label="Default plan"
						hint="Accounts without paid time are on it."
						checked={form.isDefault}
						disabled={plan?.isDefault}
						onChange={(isDefault) => change({ isDefault })}
						error={errors.isDefault}
					/>
					<Check
						label="On"
						hint="Off plans can't be bought or given."
						checked={form.active}
						disabled={form.isDefault}
						onChange={(active) => change({ active })}
						error={errors.active}
					/>
					<Check
						label="Hidden"
						hint="Left off the pricing page. Admins can still give it."
						checked={form.isHidden}
						disabled={form.isDefault}
						onChange={(isHidden) => change({ isHidden })}
						error={errors.isHidden}
					/>
				</fieldset>

				<fieldset>
					<legend className="mb-1 font-semibold text-ink-900">Features</legend>
					<p className="mb-4 text-sm text-ink-500">
						A feature that is off uses the free value. A feature that isn't listed still applies but is left off the pricing page.
					</p>
					<div className="panel divide-y-[1.5px] divide-surface-200 overflow-hidden">
						{catalogue.map((feature) => (
							<FeatureRow key={feature.key} feature={feature} entry={form.features[feature.key]} onChange={(next) => changeFeature(feature.key, next)} />
						))}
					</div>
				</fieldset>
			</div>
			<div className="sticky bottom-0 flex items-center justify-end gap-3 border-t-[1.5px] border-surface-200 bg-canvas/95 px-4 py-4 backdrop-blur sm:px-8">
				{result?.message && (
					<span role="status" className="text-sm text-emerald-700">
						{result.message}
					</span>
				)}
				{plan && !plan.isDefault && (
					<Button
						variant="danger"
						disabled={busy}
						onClick={() => {
							if (confirm(`Delete ${plan.name}? A plan someone has paid for is turned off instead.`)) send("delete");
						}}
					>
						Delete
					</Button>
				)}
				<Button type="submit" variant="brand" disabled={busy} className="min-w-24">
					{busy ? "Saving…" : plan ? "Save" : "Create plan"}
				</Button>
			</div>
		</form>
	);
}

function FeatureRow({ feature, entry, onChange }: { feature: FeatureDefinition; entry: FeatureForm; onChange: (next: Partial<FeatureForm>) => void }) {
	return (
		<div className={`grid gap-3 p-4 sm:grid-cols-[1fr_11rem_auto] sm:items-center ${entry.active ? "" : "bg-surface-100/60"}`}>
			<div>
				<p className="text-sm font-semibold text-ink-900">{feature.title}</p>
				<p className="text-sm text-ink-500">
					{feature.description}
					{feature.type === "limit" &&
						(feature.setting
							? " When off, the limit set in Configuration applies."
							: ` When off: ${limitLabel({ type: "limit", unit: feature.unit ?? null, value: feature.fallback })}.`)}
				</p>
			</div>
			{feature.type === "toggle" ? (
				<label className="flex items-center gap-2 text-sm text-ink-900">
					<input type="checkbox" checked={!!entry.value} onChange={(event) => onChange({ value: event.target.checked })} className="h-4 w-4 accent-brand-600" />
					Included
				</label>
			) : (
				<label className="field !py-0 pr-3">
					<span className="sr-only">{feature.title}</span>
					<input
						type="number"
						min={0}
						value={Number(entry.value)}
						onChange={(event) => onChange({ value: Math.max(0, Math.floor(Number(event.target.value) || 0)) })}
						className="field-input w-full py-2 pl-3 text-sm"
					/>
					<span className="field-addon text-xs">{Number(entry.value) ? (feature.unit ?? "") : "no limit"}</span>
				</label>
			)}
			<div className="flex gap-4 text-sm text-ink-700">
				<label className="flex items-center gap-1.5">
					<input type="checkbox" checked={entry.active} onChange={(event) => onChange({ active: event.target.checked })} className="h-4 w-4 accent-brand-600" />
					On
				</label>
				<label className="flex items-center gap-1.5">
					<input type="checkbox" checked={entry.listed} onChange={(event) => onChange({ listed: event.target.checked })} className="h-4 w-4 accent-brand-600" />
					Listed
				</label>
			</div>
		</div>
	);
}

function TextField({
	label,
	error,
	onChange,
	...props
}: { label: string; error?: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange">) {
	return (
		<div>
			<label className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5" aria-invalid={error ? true : undefined}>
				<span className="text-xs font-medium text-ink-500">{label}</span>
				<input {...props} onChange={(event) => onChange(event.target.value)} className="field-input text-base text-ink-900" />
			</label>
			{error && <p className="mt-1.5 px-1 text-xs text-red-700">{error}</p>}
		</div>
	);
}

function Check({
	label,
	hint,
	checked,
	disabled,
	error,
	onChange,
}: {
	label: string;
	hint: string;
	checked: boolean;
	disabled?: boolean;
	error?: string;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label
			className={`panel flex items-start gap-3 p-4 transition ${disabled ? "opacity-70" : "cursor-pointer hover:border-ink-500"} has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50`}
		>
			<input
				type="checkbox"
				checked={checked}
				disabled={disabled}
				onChange={(event) => onChange(event.target.checked)}
				className="mt-1 h-4 w-4 accent-brand-600"
			/>
			<span>
				<span className="block text-sm font-semibold text-ink-900">{label}</span>
				<span className="block text-sm text-ink-500">{hint}</span>
				{error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
			</span>
		</label>
	);
}
