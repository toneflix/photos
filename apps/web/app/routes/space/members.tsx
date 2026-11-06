import { useEffect, useRef, useState } from "react";
import { data, Form, redirect, useFetcher, useNavigation } from "react-router";
import { SPACE_PERMISSIONS, type SpaceMember, type SpacePermission } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireSignIn } from "~/lib/session.server";
import { Avatar } from "~/components/Avatar";
import { Alert, Button, Field, Input } from "~/components/ui";
import type { Route } from "./+types/members";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const { data: space } = await api.explore.space(params.space).catch(() => {
		throw data("Space not found", { status: 404 });
	});

	if (!space.permissions.includes("manage")) throw redirect(`/spaces/${space.slug}`);

	const { data: members } = await api.spaces.members(space.id, { per_page: 100 });

	return { space, members };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const { data: space } = await api.explore.space(params.space);
	const form = await request.formData();
	const intent = form.get("intent");
	const member = String(form.get("memberId") ?? "");
	const permissions = form.getAll("permissions").map(String) as SpacePermission[];

	try {
		if (intent === "invite") {
			const { data: invited } = await api.spaces.invite(space.id, { email: String(form.get("email") ?? "").trim(), permissions });

			return { ok: true as const, invited: invited.id, error: null, fieldErrors: {} };
		}

		if (intent === "update") await api.spaces.updateMember(space.id, member, permissions);
		if (intent === "remove") await api.spaces.removeMember(space.id, member);

		return { ok: true as const, invited: null, error: null, fieldErrors: {} };
	} catch (error) {
		const result = formError(error);

		return data({ ok: false as const, invited: null, error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
	}
}

/** Who is in a space and what they may do. Owners and members who manage the space invite and change people here. */
export default function SpaceMembers({ loaderData, actionData }: Route.ComponentProps) {
	const { space, members } = loaderData;
	const busy = useNavigation().state !== "idle";
	const form = useRef<HTMLFormElement>(null);
	const failed = actionData && !actionData.ok ? actionData : undefined;

	useEffect(() => {
		if (actionData?.invited) form.current?.reset();
	}, [actionData]);

	return (
		<div className="max-w-3xl">
			<p className="text-ink-500">
				People you invite can open “{space.name}” even while it's private, and see its public photos and books. Pick what else each person can do.
			</p>

			<section className="mt-6 panel p-5 sm:p-6">
				<h2 className="font-display text-xl font-bold text-ink-900">Invite someone</h2>
				<Form method="post" ref={form} className="mt-4 space-y-5">
					<input type="hidden" name="intent" value="invite" />
					{failed?.error && !failed.fieldErrors.email && <Alert>{failed.error}</Alert>}
					<Field label="Email address" error={failed?.fieldErrors.email} hint="They get an email and join from an account with this address.">
						<Input name="email" type="email" required maxLength={191} placeholder="ada@example.com" />
					</Field>
					<PermissionPicker canManage={space.canEdit} />
					<Button type="submit" disabled={busy}>
						{busy ? "Sending…" : "Send invite"}
					</Button>
				</Form>
			</section>

			<section className="mt-10">
				<h2 className="font-display text-xl font-bold text-ink-900">
					{members.length ? `${members.length} ${members.length === 1 ? "person" : "people"}` : "Nobody invited yet"}
				</h2>
				<ul className="mt-4 space-y-3">
					{members.map((member) => (
						<MemberCard key={member.id} member={member} canManage={space.canEdit} highlight={member.id === actionData?.invited} />
					))}
				</ul>
			</section>
		</div>
	);
}

/** Checkboxes for a member's permissions. Viewing is always on; only the owner can hand out `manage`. */
function PermissionPicker({ selected = ["view"], canManage }: { selected?: SpacePermission[]; canManage: boolean }) {
	return (
		<fieldset>
			<legend className="mb-2 text-sm font-semibold text-ink-900">What they can do</legend>
			<div className="grid gap-2 sm:grid-cols-2">
				{SPACE_PERMISSIONS.map((permission) => {
					const locked = permission.value === "view" || (permission.value === "manage" && !canManage);

					return (
						<label
							key={permission.value}
							className={`flex items-start gap-3 rounded-xl border-[1.5px] border-surface-300 px-4 py-3 text-sm transition ${
								locked ? "bg-surface-100" : "cursor-pointer hover:border-ink-500 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
							}`}
						>
							<input
								type="checkbox"
								name={locked ? undefined : "permissions"}
								value={permission.value}
								defaultChecked={selected.includes(permission.value)}
								disabled={locked}
								className="mt-0.5 accent-brand-600"
							/>
							<span>
								<span className="font-semibold text-ink-900">{permission.label}</span>
								<span className="block text-ink-500">
									{permission.summary}
									{permission.value === "view" && " Every member can."}
									{permission.value === "manage" && !canManage && " Only the owner can give this."}
								</span>
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

function MemberCard({ member, canManage, highlight }: { member: SpaceMember; canManage: boolean; highlight: boolean }) {
	const fetcher = useFetcher<typeof action>();
	const [editing, setEditing] = useState(false);
	const removing = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "remove";
	const locked = member.permissions.includes("manage") && !canManage;

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.ok) setEditing(false);
	}, [fetcher.state, fetcher.data]);

	return (
		<li className={`panel p-5 transition ${highlight ? "!border-brand-600" : ""} ${removing ? "opacity-50" : ""}`}>
			<div className="flex items-start gap-3">
				{member.name ? (
					<Avatar user={{ name: member.name, avatarUrl: member.avatarUrl }} />
				) : (
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-200 text-ink-500" aria-hidden>
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
							<rect x="3" y="5" width="18" height="14" rx="2" />
							<path d="m3 7 9 6 9-6" />
						</svg>
					</span>
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-ink-900">{member.name ?? member.email}</p>
					<p className="truncate text-sm text-ink-500">
						{member.name ? `${member.email} · ` : ""}
						{member.status === "invited" ? "Invite sent, not joined yet" : "Joined"}
					</p>
				</div>
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-1.5">
				{SPACE_PERMISSIONS.filter((permission) => member.permissions.includes(permission.value)).map((permission) => (
					<span key={permission.value} className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
						{permission.label}
					</span>
				))}
			</div>

			{fetcher.data && !fetcher.data.ok && (
				<div className="mt-3">
					<Alert>{fetcher.data.error}</Alert>
				</div>
			)}

			{editing ? (
				<fetcher.Form method="post" className="mt-4 space-y-4 border-t border-surface-200 pt-4">
					<input type="hidden" name="intent" value="update" />
					<input type="hidden" name="memberId" value={member.id} />
					<PermissionPicker selected={member.permissions} canManage={canManage} />
					<div className="flex gap-2">
						<Button type="submit" disabled={fetcher.state !== "idle"}>
							Save
						</Button>
						<Button variant="ghost" onClick={() => setEditing(false)}>
							Cancel
						</Button>
					</div>
				</fetcher.Form>
			) : (
				!locked && (
					<div className="mt-4 flex gap-4 border-t border-surface-200 pt-4 text-sm">
						<button type="button" onClick={() => setEditing(true)} className="font-medium text-brand-700 hover:underline">
							Change
						</button>
						<fetcher.Form
							method="post"
							onSubmit={(e) => {
								const question =
									member.status === "invited"
										? `Cancel the invite to ${member.email}?`
										: `Remove ${member.name ?? member.email}? Their photos and books leave the space and stay in their own library.`;

								if (!confirm(question)) e.preventDefault();
							}}
						>
							<input type="hidden" name="intent" value="remove" />
							<input type="hidden" name="memberId" value={member.id} />
							<button type="submit" className="font-medium text-red-700 hover:underline">
								{member.status === "invited" ? "Cancel invite" : "Remove"}
							</button>
						</fetcher.Form>
					</div>
				)
			)}
		</li>
	);
}
