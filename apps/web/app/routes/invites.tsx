import { data, Form, Link, redirect, useNavigation } from "react-router";
import { spacePermissionLabels, type SpaceInvite } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import { Avatar } from "~/components/Avatar";
import { Alert, Button, buttonClass } from "~/components/ui";
import type { Route } from "./+types/invites";

export const meta = () => [{ title: "Space invites · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const { data: invites } = await api.spaces.invites({ per_page: 100 });

	return { invites, user };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const invite = String(form.get("invite") ?? "");

	try {
		if (form.get("intent") === "decline") {
			await api.spaces.declineInvite(invite);

			return { ok: true as const, invite };
		}

		const { data: space } = await api.spaces.acceptInvite(invite);

		return redirect(`/spaces/${space.slug}`);
	} catch (error) {
		return data({ ok: false as const, invite, ...formError(error) }, { status: 422 });
	}
}

/** Invites into other people's spaces, sent to the signed-in user's address. */
export default function Invites({ loaderData, actionData }: Route.ComponentProps) {
	const { invites, user } = loaderData;
	const failed = actionData && !actionData.ok ? actionData : undefined;

	return (
		<main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
			<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900">Space invites</h1>
			<p className="mt-1 text-ink-500">People who invited {user.email} into their spaces.</p>

			{!user.emailVerified && invites.length > 0 && (
				<p className="mt-6 rounded-xl bg-amber-50 px-5 py-3 text-sm text-amber-900">
					Confirm your email address before you join a space.{" "}
					<Link prefetch="intent" to="/settings/email" className="font-semibold underline">
						Send the link
					</Link>
				</p>
			)}

			{invites.length ? (
				<ul className="mt-8 space-y-4">
					{invites.map((invite) => (
						<InviteRow key={invite.id} invite={invite} error={failed?.invite === invite.id ? failed.error : undefined} canJoin={user.emailVerified} />
					))}
				</ul>
			) : (
				<div className="mt-8 panel p-8 text-center">
					<p className="text-ink-700">No invites waiting.</p>
					<Link prefetch="intent" to="/spaces" className={`${buttonClass("secondary")} mt-4`}>
						Go to your spaces
					</Link>
				</div>
			)}
		</main>
	);
}

function InviteRow({ invite, error, canJoin }: { invite: SpaceInvite; error?: string; canJoin: boolean }) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle" && navigation.formData?.get("invite") === invite.id;
	const declining = busy && navigation.formData?.get("intent") === "decline";

	return (
		<li className="panel p-5">
			<div className="flex items-start gap-3">
				{invite.invitedBy && <Avatar user={invite.invitedBy} />}
				<div className="min-w-0 flex-1">
					<p className="text-ink-900">
						<span className="font-semibold">{invite.invitedBy?.name ?? "Someone"}</span> invited you to{" "}
						<span className="font-semibold">{invite.space?.name ?? "a space"}</span>
					</p>
					{invite.space?.description && <p className="mt-1 text-sm text-ink-500">{invite.space.description}</p>}
					<p className="mt-2 text-sm text-ink-700">You can: {spacePermissionLabels(invite.permissions)}</p>
				</div>
			</div>
			{error && (
				<div className="mt-4">
					<Alert>{error}</Alert>
				</div>
			)}
			<Form method="post" className="mt-4 flex flex-wrap gap-2">
				<input type="hidden" name="invite" value={invite.id} />
				<Button type="submit" name="intent" value="accept" disabled={busy || !canJoin}>
					{busy && !declining ? "Joining…" : "Join space"}
				</Button>
				<Button type="submit" name="intent" value="decline" variant="ghost" disabled={busy}>
					{declining ? "Declining…" : "Decline"}
				</Button>
			</Form>
		</li>
	);
}
