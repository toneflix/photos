import { useEffect, useState } from "react";
import { data, Form, Link, useFetcher, useNavigation, useSearchParams } from "react-router";
import { spacePermissionLabels, type SharedSpace, type Space } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireSignIn } from "~/lib/session.server";
import { SpaceCard } from "~/components/spaces/SpaceCard";
import { Alert, Button, Field, Input, Textarea } from "~/components/ui";
import type { Route } from "./+types/spaces";

export const meta = () => [{ title: "Your spaces · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const [{ data: spaces }, { data: shared }, invites] = await Promise.all([
		api.spaces.list({ per_page: 100 }),
		api.spaces.shared({ per_page: 100 }),
		api.spaces.invites({ per_page: 1 }),
	]);

	return { spaces, shared, invites: invites.meta.total };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();
	const intent = form.get("intent");
	const id = String(form.get("spaceId") ?? "");
	const details = {
		name: String(form.get("name") ?? "").trim(),
		slug: String(form.get("slug") ?? "").trim() || undefined,
		description: String(form.get("description") ?? "").trim() || null,
		visibility: form.get("visibility") === "public" ? ("public" as const) : ("private" as const),
	};

	try {
		if (intent === "create") await api.spaces.create(details);
		if (intent === "update") await api.spaces.update(id, details);
		if (intent === "delete") await api.spaces.remove(id);
		if (intent === "leave") await api.spaces.removeMember(id, String(form.get("membershipId")));

		return { ok: true as const, intent };
	} catch (error) {
		return data({ ok: false as const, intent, spaceId: id, ...formError(error) }, { status: 422 });
	}
}

export default function Spaces({ loaderData, actionData }: Route.ComponentProps) {
	const { spaces, shared, invites } = loaderData;
	const [params, setParams] = useSearchParams();
	const editing = spaces.find((space) => space.id === params.get("edit")) ?? null;
	const [creating, setCreating] = useState(!spaces.length && !shared.length);
	const failed = actionData && !actionData.ok ? actionData : undefined;

	useEffect(() => {
		if (actionData?.ok && actionData.intent === "create") setCreating(false);
	}, [actionData]);

	const closeEditor = () => setParams((current) => (current.delete("edit"), current), { preventScrollReset: true });

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-4xl font-bold tracking-tight text-ink-900">Your spaces</h1>
					<p className="mt-1 max-w-xl text-ink-500">
						Keep work for different clients, events or brands apart. Each space has its own page, private until you make it public.
					</p>
				</div>
				{!creating && <Button onClick={() => setCreating(true)}>New space</Button>}
			</div>

			{invites > 0 && (
				<Link
					prefetch="intent"
					to="/invites"
					className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-100"
				>
					{invites === 1 ? "You have an invite to join a space." : `You have ${invites} invites to join spaces.`}
					<span aria-hidden>→</span>
				</Link>
			)}

			{creating && <SpaceForm error={failed?.intent === "create" ? failed : undefined} onCancel={spaces.length || shared.length ? () => setCreating(false) : undefined} />}

			{spaces.length > 0 && (
				<ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
					{spaces.map((space) => (
						<SpaceCard key={space.id} space={space}>
							<div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
								<Link prefetch="intent" to={`/photos?space=${space.id}`} className="rounded-full bg-surface-100 px-3 py-1.5 text-ink-700 hover:bg-surface-200">
									Photos
								</Link>
								<Link prefetch="intent" to={`/books?space=${space.id}`} className="rounded-full bg-surface-100 px-3 py-1.5 text-ink-700 hover:bg-surface-200">
									Books
								</Link>
								<Link prefetch="intent" to={`/stats/spaces/${space.id}`} className="rounded-full bg-surface-100 px-3 py-1.5 text-ink-700 hover:bg-surface-200">
									Stats
								</Link>
								<Link prefetch="intent" to={`/spaces/${space.slug}/members`} className="rounded-full bg-surface-100 px-3 py-1.5 text-ink-700 hover:bg-surface-200">
									Members
								</Link>
								<Link to={`?edit=${space.id}`} preventScrollReset className="rounded-full bg-surface-100 px-3 py-1.5 text-ink-700 hover:bg-surface-200">
									Edit
								</Link>
							</div>
						</SpaceCard>
					))}
				</ul>
			)}

			{shared.length > 0 && (
				<section className="mt-16">
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Shared with you</h2>
					<p className="mt-1 text-ink-500">Spaces other people invited you into.</p>
					<ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
						{shared.map((space) => (
							<SharedSpaceCard key={space.id} space={space} />
						))}
					</ul>
				</section>
			)}

			{editing && (
				<SpaceEditor
					key={editing.id}
					space={editing}
					error={failed?.spaceId === editing.id ? failed : undefined}
					saved={!!actionData?.ok}
					onClose={closeEditor}
				/>
			)}
		</main>
	);
}

const pill = "rounded-full bg-surface-100 px-3 py-1.5 text-ink-700 hover:bg-surface-200";

/** A space someone shared with the user, with what they can do there and a way to leave. */
function SharedSpaceCard({ space }: { space: SharedSpace }) {
	const fetcher = useFetcher();
	const owner = space.owner.name ?? "A Toneflix member";

	return (
		<SpaceCard space={space}>
			<p className="text-sm text-ink-500">
				From {owner} · You can: {spacePermissionLabels(space.permissions)}
			</p>
			<div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
				{space.permissions.includes("create") && (
					<>
						<Link prefetch="intent" to={`/photos?space=${space.id}`} className={pill}>
							Your photos
						</Link>
						<Link prefetch="intent" to={`/books?space=${space.id}`} className={pill}>
							Your books
						</Link>
					</>
				)}
				{space.permissions.includes("manage") && (
					<Link prefetch="intent" to={`/spaces/${space.slug}/members`} className={pill}>
						Members
					</Link>
				)}
				<fetcher.Form
					method="post"
					onSubmit={(event) => {
						if (!confirm(`Leave “${space.name}”? Your photos and books leave the space and stay in your library.`)) event.preventDefault();
					}}
				>
					<input type="hidden" name="intent" value="leave" />
					<input type="hidden" name="spaceId" value={space.id} />
					<input type="hidden" name="membershipId" value={space.membershipId} />
					<button type="submit" disabled={fetcher.state !== "idle"} className={`${pill} text-red-700`}>
						{fetcher.state !== "idle" ? "Leaving…" : "Leave"}
					</button>
				</fetcher.Form>
			</div>
		</SpaceCard>
	);
}

type FormFailure = { error: string; fieldErrors: Record<string, string> };

/** Name, web address, description and who can browse a space. */
function SpaceFields({ space, error }: { space?: Space; error?: FormFailure }) {
	const [visibility, setVisibility] = useState(space?.visibility ?? "private");

	return (
		<>
			{error?.error && !Object.keys(error.fieldErrors).length && <Alert>{error.error}</Alert>}
			<Field label="Name" error={error?.fieldErrors.name}>
				<Input name="name" required maxLength={80} defaultValue={space?.name} placeholder="Ada Okafor Weddings" autoFocus={!space} />
			</Field>
			<Field
				label="Web address"
				error={error?.fieldErrors.slug}
				hint={space ? "Changing it breaks links you've already shared." : "Leave empty to make one from the name."}
			>
				<Input
					addon="/spaces/"
					name="slug"
					defaultValue={space?.slug}
					maxLength={60}
					pattern="[a-z0-9]+(-[a-z0-9]+)*"
					title="Lowercase letters, numbers and dashes"
					placeholder="ada-weddings"
				/>
			</Field>
			<Field label="About this space (optional)" error={error?.fieldErrors.description}>
				<Textarea name="description" rows={2} maxLength={1000} defaultValue={space?.description ?? ""} placeholder="Weddings and celebrations across Lagos." />
			</Field>
			<label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg bg-surface-100 p-3">
				<span className="text-sm">
					<span className="block font-semibold text-ink-900">Public space</span>
					<span className="text-ink-500">
						{visibility === "public"
							? "Anyone can browse its public photos and books, and it shows on Explore."
							: "Only you and the people you invite can open it. Its photos and books stay off Explore."}
					</span>
				</span>
				<input type="hidden" name="visibility" value={visibility} />
				<button
					type="button"
					role="switch"
					aria-checked={visibility === "public"}
					aria-label="Public space"
					onClick={() => setVisibility(visibility === "public" ? "private" : "public")}
					className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${visibility === "public" ? "bg-brand-700" : "bg-surface-300"}`}
				>
					<span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${visibility === "public" ? "translate-x-5" : ""}`} />
				</button>
			</label>
		</>
	);
}

function SpaceForm({ error, onCancel }: { error?: FormFailure; onCancel?: () => void }) {
	const busy = useNavigation().state !== "idle";

	return (
		<Form method="post" className="mt-8 max-w-2xl space-y-5 panel p-6 md:p-8">
			<input type="hidden" name="intent" value="create" />
			<h2 className="font-display text-2xl font-bold tracking-tight">A new space</h2>
			<SpaceFields error={error} />
			<div className="flex gap-2 pt-2">
				<Button type="submit" disabled={busy}>
					{busy ? "Creating…" : "Create space"}
				</Button>
				{onCancel && (
					<Button variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
				)}
			</div>
		</Form>
	);
}

/** A side drawer for changing or deleting a space. */
function SpaceEditor({ space, error, saved, onClose }: { space: Space; error?: FormFailure; saved: boolean; onClose: () => void }) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle";
	const deleting = busy && navigation.formData?.get("intent") === "delete";

	useEffect(() => {
		if (saved && navigation.state === "idle") onClose();
	}, [saved, navigation.state, onClose]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();

		window.addEventListener("keydown", onKey);

		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-ink-900/40" onClick={onClose}>
			<div
				className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
				onClick={(event) => event.stopPropagation()}
				role="dialog"
				aria-modal
				aria-label="Edit space"
			>
				<div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
					<h2 className="font-display text-2xl font-bold tracking-tight">Edit space</h2>
					<button type="button" onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-surface-100" aria-label="Close">
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
						</svg>
					</button>
				</div>
				<Form method="post" preventScrollReset className="flex-1 space-y-5 px-6 py-6">
					<input type="hidden" name="intent" value="update" />
					<input type="hidden" name="spaceId" value={space.id} />
					<SpaceFields space={space} error={error} />
					<Button type="submit" disabled={busy} className="w-full">
						{busy && !deleting ? "Saving…" : "Save"}
					</Button>
				</Form>
				<Form
					method="post"
					preventScrollReset
					className="border-t border-surface-200 px-6 py-4"
					onSubmit={(event) => {
						if (!confirm(`Delete “${space.name}”? Its photos and books stay in your library.`)) event.preventDefault();
					}}
				>
					<input type="hidden" name="intent" value="delete" />
					<input type="hidden" name="spaceId" value={space.id} />
					<Button type="submit" variant="danger" disabled={busy} className="w-full">
						{deleting ? "Deleting…" : "Delete space"}
					</Button>
				</Form>
			</div>
		</div>
	);
}
