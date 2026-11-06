import { useState } from "react";
import { Link, NavLink, data, useFetcher } from "react-router";
import type { SettingGroup } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Icon } from "~/components/admin/Icon";
import { SettingControl } from "~/components/admin/SettingControl";
import { Alert, Button } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/configuration";

export const meta = () => [{ title: "Configuration · Admin · Toneflix Photos" }];

type Values = Record<string, number | boolean | string | null>;

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "settings.manage");
	const { data: groups } = await api.admin.settings();
	const current = groups.find((group) => group.id === params.group);

	if (params.group && !current) throw new Response("Not found", { status: 404 });

	return { groups, current: current ?? groups[0], chosen: Boolean(current) };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "settings.manage");
	const values = (await request.json()) as Values;

	try {
		const { data: group } = await api.admin.updateSettings(String(params.group), values);

		return { group, message: "Saved.", error: null, fieldErrors: {} as Record<string, string> };
	} catch (error) {
		const result = formError(error);

		return data({ group: null, message: null, ...result }, { status: 422 });
	}
}

/**
 * App settings, one group at a time: the groups on the left, the chosen group's form
 * on the right. On phones the list comes first and each group opens on its own.
 */
export default function AdminConfiguration({ loaderData }: Route.ComponentProps) {
	const { groups, current, chosen } = loaderData;

	return (
		<>
			<AdminHeader title="Configuration" description="Settings for the whole app. Secrets and API keys are not here; they stay in the API's .env file." />
			<div className="lg:grid lg:grid-cols-[22rem_1fr]">
				<nav aria-label="Settings groups" className={`border-surface-200 p-3 lg:block lg:border-r-[1.5px] ${chosen ? "hidden" : ""}`}>
					<ul className="space-y-1">
						{groups.map((group) => (
							<li key={group.id}>
								<NavLink
									prefetch="intent"
									to={`/admin/configuration/${group.id}`}
									className={({ isActive }) =>
										`group flex items-center gap-4 rounded-xl px-4 py-3.5 transition ${
											isActive || (!chosen && group.id === current.id) ? "bg-white ring-[1.5px] ring-surface-200 lg:ring-0 lg:bg-surface-100" : "hover:bg-surface-100"
										}`
									}
								>
									{({ isActive }) => (
										<>
											<Icon name={group.icon} className="h-5 w-5 text-ink-500" />
											<span className="min-w-0 flex-1">
												<span className={`block font-semibold ${isActive || (!chosen && group.id === current.id) ? "text-brand-700" : "text-ink-900"}`}>
													{group.title}
												</span>
												<span className="block text-sm text-ink-500">{group.description}</span>
											</span>
											<Icon name="chevron" className="h-4 w-4 text-ink-500" />
										</>
									)}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
				<div className={chosen ? "" : "hidden lg:block"}>
					<GroupForm key={current.id} group={current} />
				</div>
			</div>
		</>
	);
}

function GroupForm({ group: loaded }: { group: SettingGroup }) {
	const fetcher = useFetcher<typeof action>();
	const group = fetcher.data?.group ?? loaded;
	const [values, setValues] = useState<Values>(() => Object.fromEntries(loaded.fields.map((field) => [field.name, field.value])));
	const [changed, setChanged] = useState(false);
	const busy = fetcher.state !== "idle";
	const result = fetcher.state === "idle" && !changed ? fetcher.data : undefined;

	return (
		<fetcher.Form
			method="post"
			onSubmit={(event) => {
				event.preventDefault();
				setChanged(false);
				fetcher.submit(values, { method: "post", encType: "application/json", action: `/admin/configuration/${group.id}` });
			}}
			className="flex min-h-full flex-col"
		>
			<div className="flex-1 space-y-8 px-4 py-6 sm:px-8">
				<Link prefetch="intent" to="/admin/configuration" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 lg:hidden">
					<Icon name="back" className="h-4 w-4" />
					All settings
				</Link>
				<div>
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{group.title}</h2>
					<p className="mt-1 text-ink-500">{group.description}</p>
				</div>
				{result?.error && <Alert>{result.error}</Alert>}
				<div className="grid gap-5 sm:grid-cols-2">
					{group.fields.map((field) => (
						<SettingControl
							key={field.name}
							field={field}
							value={values[field.name]}
							error={result?.fieldErrors?.[field.name]}
							onChange={(value) => {
								setChanged(true);
								setValues((current) => ({ ...current, [field.name]: value }));
							}}
						/>
					))}
				</div>
			</div>
			<div className="sticky bottom-0 flex items-center justify-end gap-3 border-t-[1.5px] border-surface-200 bg-canvas/95 px-4 py-4 backdrop-blur sm:px-8">
				{result?.message && (
					<span role="status" className="text-sm text-emerald-700">
						{result.message}
					</span>
				)}
				<Button type="submit" variant="brand" disabled={busy} className="min-w-24">
					{busy ? "Saving…" : "Save"}
				</Button>
			</div>
		</fetcher.Form>
	);
}
