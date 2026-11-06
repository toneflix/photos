import { useState } from "react";
import { Link, data, redirect, useFetcher } from "react-router";
import type { Permission, PermissionDefinition, Role } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Icon } from "~/components/admin/Icon";
import { useToastMessage } from "~/lib/toast";
import { Alert, Button, buttonClass } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/roles";

export const meta = () => [{ title: "Roles · Admin · Toneflix Photos" }];

interface RoleForm {
	intent: "save" | "delete";
	name: string;
	description: string;
	/** Left out for built-in roles, whose permissions can't change. */
	permissions?: Permission[];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "roles.manage");
	const result = await api.admin.roles();
	const creating = params.role === "new";
	const current = creating ? null : (result.data.find((role) => role.id === params.role) ?? null);

	if (params.role && !creating && !current) throw new Response("Not found", { status: 404 });

	return { roles: result.data, permissions: result.permissions, current: current ?? (creating ? null : result.data[0]), creating, chosen: Boolean(params.role) };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "roles.manage");
	const { intent, ...input } = (await request.json()) as RoleForm;

	try {
		if (intent === "delete") {
			await api.admin.removeRole(String(params.role));

			return redirect("/admin/roles");
		}

		if (params.role === "new") {
			const { data: role } = await api.admin.createRole({ ...input, permissions: input.permissions ?? [] });

			return redirect(`/admin/roles/${role.id}`);
		}

		await api.admin.updateRole(String(params.role), input);

		return { message: "Saved.", error: null, fieldErrors: {} as Record<string, string> };
	} catch (error) {
		const result = formError(error);

		return data({ message: null, ...result }, { status: 422 });
	}
}

/**
 * Roles are collections of permissions. The roles are on the left, the chosen one's
 * permissions on the right. Built-in roles show what they allow but can't change.
 */
export default function AdminRoles({ loaderData }: Route.ComponentProps) {
	const { roles, permissions, current, creating, chosen } = loaderData;

	return (
		<>
			<AdminHeader title="Roles" description="A role is a set of permissions. Give accounts a role from Users." />
			<div className="lg:grid lg:grid-cols-[22rem_1fr]">
				<nav aria-label="Roles" className={`border-surface-200 p-3 lg:block lg:border-r-[1.5px] ${chosen ? "hidden" : ""}`}>
					<Link prefetch="intent" to="/admin/roles/new" className={buttonClass("brand", "mb-3 w-full")}>
						<Icon name="plus" className="h-4 w-4" />
						New role
					</Link>
					<ul className="space-y-1">
						{roles.map((role) => {
							const active = role.id === current?.id;

							return (
								<li key={role.id}>
									<Link
										prefetch="intent"
										to={`/admin/roles/${role.id}`}
										className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition ${active ? "bg-white ring-[1.5px] ring-surface-200 lg:bg-surface-100 lg:ring-0" : "hover:bg-surface-100"}`}
									>
										<Icon name="key" className="h-5 w-5 text-ink-500" />
										<span className="min-w-0 flex-1">
											<span className={`flex items-center gap-2 font-semibold ${active ? "text-brand-700" : "text-ink-900"}`}>
												{role.name}
												{role.system && <span className="rounded-md bg-surface-200 px-1.5 py-0.5 text-xs font-semibold text-ink-700">Built in</span>}
											</span>
											<span className="block text-sm text-ink-500">
												{role.userCount} {role.userCount === 1 ? "account" : "accounts"} · {role.slug === "admin" ? "everything" : `${role.permissions.length} permissions`}
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
					<RoleEditor key={current?.id ?? "new"} role={creating ? null : current} permissions={permissions} />
				</div>
			</div>
		</>
	);
}

function RoleEditor({ role, permissions }: { role: Role | null; permissions: PermissionDefinition[] }) {
	const fetcher = useFetcher<typeof action>();
	const [form, setForm] = useState({ name: role?.name ?? "", description: role?.description ?? "", permissions: role?.permissions ?? [] });
	const [changed, setChanged] = useState(false);
	const locked = !!role?.system;
	const busy = fetcher.state !== "idle";
	const result = fetcher.state === "idle" && !changed ? fetcher.data : undefined;

	useToastMessage(fetcher.data);

	const change = (next: Partial<typeof form>) => {
		setChanged(true);
		setForm((current) => ({ ...current, ...next }));
	};
	const send = (intent: RoleForm["intent"]) => {
		setChanged(false);
		fetcher.submit({ intent, name: form.name, description: form.description, ...(locked ? {} : { permissions: form.permissions }) }, { method: "post", encType: "application/json", action: `/admin/roles/${role?.id ?? "new"}` });
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
				<Link prefetch="intent" to="/admin/roles" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 lg:hidden">
					<Icon name="back" className="h-4 w-4" />
					All roles
				</Link>
				<div>
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{role ? role.name : "New role"}</h2>
					<p className="mt-1 text-ink-500">
						{locked
							? role.slug === "admin"
								? "Built in. Admins can always do everything, including anything added later."
								: "Built in. Members use the app but have no admin access."
							: "Choose what accounts with this role can do."}
					</p>
				</div>
				{result?.error && <Alert>{result.error}</Alert>}
				<div className="grid gap-5 sm:grid-cols-2">
					<div>
						<label className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5" aria-invalid={result?.fieldErrors?.name ? true : undefined}>
							<span className="text-xs font-medium text-ink-500">Name</span>
							<input
								required
								maxLength={60}
								value={form.name}
								onChange={(event) => change({ name: event.target.value })}
								placeholder="Support desk"
								className="field-input text-base text-ink-900"
							/>
						</label>
						{result?.fieldErrors?.name && <p className="mt-1.5 px-1 text-xs text-red-700">{result.fieldErrors.name}</p>}
					</div>
					<label className="field flex-col !items-stretch px-3.5 pt-2 pb-2.5">
						<span className="text-xs font-medium text-ink-500">Description</span>
						<input
							maxLength={200}
							value={form.description}
							onChange={(event) => change({ description: event.target.value })}
							placeholder="What this role is for"
							className="field-input text-base text-ink-900"
						/>
					</label>
				</div>
				<fieldset>
					<legend className="mb-3 font-semibold text-ink-900">Permissions</legend>
					<div className="grid gap-3 sm:grid-cols-2">
						{permissions.map((permission) => {
							const checked = role?.slug === "admin" || form.permissions.includes(permission.name);

							return (
								<label
									key={permission.name}
									className={`panel flex items-start gap-3 p-4 transition ${locked ? "opacity-80" : "cursor-pointer hover:border-ink-500"} has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50`}
								>
									<input
										type="checkbox"
										checked={checked}
										disabled={locked}
										onChange={(event) =>
											change({
												permissions: event.target.checked ? [...form.permissions, permission.name] : form.permissions.filter((name) => name !== permission.name),
											})
										}
										className="mt-1 h-4 w-4 accent-brand-600"
									/>
									<span>
										<span className="block text-sm font-semibold text-ink-900">{permission.label}</span>
										<span className="block text-sm text-ink-500">{permission.description}</span>
									</span>
								</label>
							);
						})}
					</div>
				</fieldset>
			</div>
			<div className="sticky bottom-0 flex items-center justify-end gap-3 border-t-[1.5px] border-surface-200 bg-canvas/95 px-4 py-4 backdrop-blur sm:px-8">
				{role && !locked && (
					<Button
						variant="danger"
						disabled={busy}
						onClick={() => {
							if (confirm(`Delete the ${role.name} role?`)) send("delete");
						}}
					>
						Delete
					</Button>
				)}
				<Button type="submit" variant="brand" disabled={busy || (locked && form.name === role?.name && form.description === (role?.description ?? ""))} className="min-w-24">
					{busy ? "Saving…" : role ? "Save" : "Create role"}
				</Button>
			</div>
		</form>
	);
}
