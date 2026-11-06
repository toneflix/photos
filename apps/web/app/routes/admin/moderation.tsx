import { Form, Link, useNavigation, useSearchParams } from "react-router";
import type { ModeratedKind, ModerationItem } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Alert, Button, Input, buttonClass } from "~/components/ui";
import { Icon } from "~/components/admin/Icon";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/moderation";

export const meta = () => [{ title: "Moderation · Admin · Toneflix Photos" }];

const KINDS: { value: ModeratedKind; label: string }[] = [
	{ value: "photos", label: "Photos" },
	{ value: "books", label: "Books" },
	{ value: "spaces", label: "Spaces" },
];

const kindOf = (value: string | undefined): ModeratedKind => (KINDS.some((kind) => kind.value === value) ? (value as ModeratedKind) : "photos");

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "content.moderate");
	const search = new URL(request.url).searchParams;
	const kind = kindOf(params.kind);
	const result = await api.admin.moderation(kind, { q: search.get("q") || undefined, page: Number(search.get("page")) || 1 });

	return { kind, items: result.data, meta: result.meta };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "content.moderate");
	const form = await request.formData();

	try {
		await api.admin.unpublish(kindOf(params.kind), String(form.get("id")));

		return { error: null };
	} catch (error) {
		return { error: formError(error).error };
	}
}

export default function AdminModeration({ loaderData, actionData }: Route.ComponentProps) {
	const { kind, items, meta } = loaderData;
	const [params] = useSearchParams();
	const pageLink = (page: number) => {
		const next = new URLSearchParams(params);

		next.set("page", String(page));

		return `?${next}`;
	};

	return (
		<>
			<AdminHeader title="Moderation" description="Everything people show on Explore. Taking something down makes it private for its owner; nothing is deleted." />
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<nav className="flex gap-1" aria-label="What to review">
						{KINDS.map((option) => (
							<Link
								key={option.value}
								prefetch="intent"
								to={`/admin/moderation/${option.value}`}
								className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
									option.value === kind ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface-100"
								}`}
							>
								{option.label}
							</Link>
						))}
					</nav>
					<Form method="get" className="flex w-full gap-2 sm:w-auto">
						<Input
							addon={<Icon name="search" className="h-4 w-4" />}
							type="search"
							name="q"
							defaultValue={params.get("q") ?? ""}
							placeholder="Title, owner name or email"
							aria-label="Search"
							className="sm:w-72"
						/>
						<Button type="submit" variant="brand">
							Search
						</Button>
					</Form>
				</div>

				{actionData?.error && <Alert>{actionData.error}</Alert>}

				{items.length === 0 ? (
					<p className="panel px-5 py-10 text-center text-ink-500">Nothing public to review here.</p>
				) : (
					<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{items.map((item) => (
							<ModerationCard key={item.id} item={item} />
						))}
					</ul>
				)}

				{meta.last_page > 1 && (
					<nav className="flex items-center justify-between text-sm text-ink-500" aria-label="Pages">
						<span>
							Page {meta.current_page} of {meta.last_page}
						</span>
						<div className="flex gap-2">
							{meta.current_page > 1 && (
								<Link to={pageLink(meta.current_page - 1)} className={buttonClass("secondary")}>
									Previous
								</Link>
							)}
							{meta.current_page < meta.last_page && (
								<Link to={pageLink(meta.current_page + 1)} className={buttonClass("secondary")}>
									Next
								</Link>
							)}
						</div>
					</nav>
				)}
			</div>
		</>
	);
}

function ModerationCard({ item }: { item: ModerationItem }) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle" && navigation.formData?.get("id") === item.id;
	const link = item.kind === "photo" ? `/explore/photos/${item.id}` : item.kind === "book" ? `/books/${item.id}` : null;

	return (
		<li className="panel flex flex-col overflow-hidden">
			<div className="aspect-[4/3] bg-surface-100">
				{item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
			</div>
			<div className="flex flex-1 flex-col gap-1 p-4">
				<p className="truncate font-semibold text-ink-900">{item.title}</p>
				<p className="truncate text-sm text-ink-500">{item.owner ? `${item.owner.name} · ${item.owner.email}` : "Unknown owner"}</p>
				{item.publishedAt && (
					<p className="text-sm text-ink-500">Public since {new Date(item.publishedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
				)}
				<div className="mt-auto flex gap-2 pt-3">
					{link && (
						<Link to={link} target="_blank" rel="noreferrer" className={buttonClass("secondary", "!py-2")}>
							Open
						</Link>
					)}
					<Form
						method="post"
						preventScrollReset
						onSubmit={(event) => {
							if (!confirm(`Take “${item.title}” off Explore? It becomes private for its owner.`)) event.preventDefault();
						}}
					>
						<input type="hidden" name="id" value={item.id} />
						<Button type="submit" variant="danger" disabled={busy} className="!py-2">
							{busy ? "Taking down…" : "Take off Explore"}
						</Button>
					</Form>
				</div>
			</div>
		</li>
	);
}
