import { type InputHTMLAttributes, useState } from "react";
import { Link, data, redirect, useFetcher } from "react-router";
import type { PaymentRegion, PaymentRegionInput } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Icon } from "~/components/admin/Icon";
import { Alert, Button, buttonClass } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/payment-regions";

export const meta = () => [{ title: "Payment regions · Admin · Toneflix Photos" }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "plans.manage");
	const { data: regions } = await api.admin.paymentRegions();
	const creating = params.region === "new" || (!params.region && !regions.length);
	const current = creating ? null : (regions.find((region) => region.id === params.region) ?? regions[0] ?? null);

	if (params.region && params.region !== "new" && !current) throw new Response("Not found", { status: 404 });

	return { regions, current, creating, chosen: Boolean(params.region) };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "plans.manage");
	const { intent, region } = (await request.json()) as { intent: "save" | "delete"; region: PaymentRegionInput };

	try {
		if (intent === "delete") {
			await api.admin.removePaymentRegion(String(params.region));

			return redirect("/admin/payment-regions");
		}

		if (!params.region || params.region === "new") {
			const { data: created } = await api.admin.createPaymentRegion(region);

			return redirect(`/admin/payment-regions/${created.id}`);
		}

		await api.admin.updatePaymentRegion(String(params.region), region);

		return { message: "Saved.", error: null, fieldErrors: {} as Record<string, string> };
	} catch (error) {
		return data({ message: null, ...formError(error) }, { status: 422 });
	}
}

const countryName = (code: string) => {
	try {
		return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
};

/** Regions price plans in their own currency. Countries not in a region pay the plan's own price. */
export default function AdminPaymentRegions({ loaderData }: Route.ComponentProps) {
	const { regions, current, creating, chosen } = loaderData;

	return (
		<>
			<AdminHeader title="Payment regions" description="Charge a group of countries in their own currency. Everyone else pays the plan's price in the plan's currency." />
			<div className="lg:grid lg:grid-cols-[22rem_1fr]">
				<nav aria-label="Payment regions" className={`border-surface-200 p-3 lg:block lg:border-r-[1.5px] ${chosen ? "hidden" : ""}`}>
					<Link prefetch="intent" to="/admin/payment-regions/new" className={buttonClass("brand", "mb-3 w-full")}>
						<Icon name="plus" className="h-4 w-4" />
						New region
					</Link>
					{regions.length ? (
						<ul className="space-y-1">
							{regions.map((region) => {
								const active = region.id === current?.id && !creating;

								return (
									<li key={region.id}>
										<Link
											prefetch="intent"
											to={`/admin/payment-regions/${region.id}`}
											className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition ${active ? "bg-white ring-[1.5px] ring-surface-200 lg:bg-surface-100 lg:ring-0" : "hover:bg-surface-100"}`}
										>
											<Icon name="globe" className="h-5 w-5 text-ink-500" />
											<span className="min-w-0 flex-1">
												<span className={`flex items-center gap-2 font-semibold ${active ? "text-brand-700" : "text-ink-900"}`}>
													{region.name}
													{!region.active && <span className="rounded-md bg-surface-200 px-1.5 py-0.5 text-xs font-semibold text-ink-700">Off</span>}
												</span>
												<span className="block truncate text-sm text-ink-500">
													{region.currency} · {region.countries.join(", ")}
												</span>
											</span>
											<Icon name="chevron" className="h-4 w-4 text-ink-500" />
										</Link>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="px-4 py-3 text-sm text-ink-500">No regions yet, so everyone pays in each plan's own currency.</p>
					)}
				</nav>
				<div className={chosen ? "" : "hidden lg:block"}>
					<RegionEditor key={creating ? "new" : (current?.id ?? "new")} region={creating ? null : current} />
				</div>
			</div>
		</>
	);
}

function RegionEditor({ region }: { region: PaymentRegion | null }) {
	const fetcher = useFetcher<typeof action>();
	const [form, setForm] = useState({
		name: region?.name ?? "",
		countries: region?.countries.join(", ") ?? "",
		currency: region?.currency ?? "",
		exchangeRate: region?.exchangeRate ? String(region.exchangeRate) : "",
		rateMarkup: String(region?.rateMarkup ?? 0),
		active: region?.active ?? true,
	});
	const [changed, setChanged] = useState(false);
	const busy = fetcher.state !== "idle";
	const result = fetcher.state === "idle" && !changed ? fetcher.data : undefined;
	const errors = result?.fieldErrors ?? {};
	const countries = form.countries
		.split(/[\s,]+/)
		.map((code) => code.trim().toUpperCase())
		.filter(Boolean);
	const change = (next: Partial<typeof form>) => {
		setChanged(true);
		setForm((current) => ({ ...current, ...next }));
	};
	const send = (intent: "save" | "delete") => {
		setChanged(false);
		fetcher.submit(
			{
				intent,
				region: {
					name: form.name,
					countries,
					currency: form.currency,
					exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : null,
					rateMarkup: Number(form.rateMarkup) || 0,
					active: form.active,
				},
			},
			{ method: "post", encType: "application/json" },
		);
	};
	const field = (label: string, name: keyof typeof form, props: InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
		<div>
			<label className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5" aria-invalid={errors[name] ? true : undefined}>
				<span className="text-xs font-medium text-ink-500">{label}</span>
				<input {...props} value={String(form[name])} onChange={(event) => change({ [name]: event.target.value })} className="field-input text-base text-ink-900" />
			</label>
			{errors[name] ? <p className="mt-1.5 px-1 text-xs text-red-700">{errors[name]}</p> : hint && <p className="mt-1.5 px-1 text-xs text-ink-500">{hint}</p>}
		</div>
	);

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				send("save");
			}}
			className="flex min-h-full flex-col"
		>
			<div className="flex-1 space-y-8 px-4 py-6 sm:px-8">
				<Link prefetch="intent" to="/admin/payment-regions" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 lg:hidden">
					<Icon name="back" className="h-4 w-4" />
					All regions
				</Link>
				<div>
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{region ? region.name : "New region"}</h2>
					<p className="mt-1 text-ink-500">Prices are converted from each plan's currency and rounded up.</p>
				</div>
				{result?.error && <Alert>{result.error}</Alert>}
				<div className="grid gap-5 sm:grid-cols-2">
					{field("Name", "name", { required: true, maxLength: 80, placeholder: "Ghana" })}
					{field("Currency", "currency", { required: true, maxLength: 3, placeholder: "GHS" }, "The three-letter code Flutterwave charges in.")}
					{field("Countries", "countries", { required: true, placeholder: "GH" }, countries.length ? countries.map(countryName).join(", ") : "Two-letter codes, separated by commas.")}
					{field("Fixed rate", "exchangeRate", { type: "number", min: 0, step: "any", placeholder: "Live rate" }, "One unit of the plan currency in this currency. Leave empty to use the live rate.")}
					{field("Markup on the live rate", "rateMarkup", { type: "number", min: 0, max: 100, step: "0.01" }, "Percent added to the live rate to cover conversion costs.")}
				</div>
				<label className="panel flex max-w-md cursor-pointer items-start gap-3 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
					<input type="checkbox" checked={form.active} onChange={(event) => change({ active: event.target.checked })} className="mt-1 h-4 w-4 accent-brand-600" />
					<span>
						<span className="block text-sm font-semibold text-ink-900">On</span>
						<span className="block text-sm text-ink-500">When off, these countries pay the plan's own price.</span>
					</span>
				</label>
			</div>
			<div className="sticky bottom-0 flex items-center justify-end gap-3 border-t-[1.5px] border-surface-200 bg-canvas/95 px-4 py-4 backdrop-blur sm:px-8">
				{result?.message && (
					<span role="status" className="text-sm text-emerald-700">
						{result.message}
					</span>
				)}
				{region && (
					<Button
						variant="danger"
						disabled={busy}
						onClick={() => {
							if (confirm(`Remove ${region.name}? Its countries go back to paying each plan's own price.`)) send("delete");
						}}
					>
						Remove
					</Button>
				)}
				<Button type="submit" variant="brand" disabled={busy} className="min-w-24">
					{busy ? "Saving…" : region ? "Save" : "Add region"}
				</Button>
			</div>
		</form>
	);
}
