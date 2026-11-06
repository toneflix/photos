import { Form, Link, useNavigation, useSearchParams, useSubmit } from "react-router";
import { UnpublishButton } from "~/components/admin/ContentParts";
import { Counts } from "~/components/stats/TopList";
import type { ModerationItem, ModerationSort } from "@photos/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { CONTENT_KINDS, contentKind } from "~/components/admin/content";
import { Alert, Button, Input, Select, buttonClass } from "~/components/ui";
import { Icon } from "~/components/admin/Icon";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/content";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.label ?? "Content"} · Admin · Toneflix Photos` }];

const SORTS: { value: ModerationSort; label: string }[] = [
	{ value: "latest", label: "Newest on Explore" },
	{ value: "views", label: "Most viewed" },
	{ value: "downloads", label: "Most downloaded" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "content.moderate");
	const search = new URL(request.url).searchParams;
	const { kind, label, downloads } = contentKind(request.url);
	const sort = SORTS.find((option) => option.value === search.get("sort"))?.value ?? "latest";
	const result = await api.admin.moderation(kind, { q: search.get("q") || undefined, sort, page: Number(search.get("page")) || 1 });

	return { kind, label, downloads, sort, items: result.data, meta: result.meta };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "content.moderate");
	const form = await request.formData();

	try {
		await api.admin.unpublish(contentKind(request.url).kind, String(form.get("id")));

		return { error: null };
	} catch (error) {
		return { error: formError(error).error };
	}
}

export default function AdminContent({ loaderData, actionData }: Route.ComponentProps) {
	const { kind, label, downloads, sort, items, meta } = loaderData;
	const one = CONTENT_KINDS.find((entry) => entry.kind === kind)?.one ?? "item";
	const [params] = useSearchParams();
	const submit = useSubmit();
	const pageLink = (page: number) => {
		const next = new URLSearchParams(params);

		next.set("page", String(page));

		return `?${next}`;
	};

	return (
		<>
			<AdminHeader title={label} description={`Every public ${one}, with how often people view it. Taking one off Explore makes it private for its owner; nothing is deleted.`} />
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<Form method="get" className="flex flex-wrap items-center gap-3" onChange={(event) => event.target instanceof HTMLSelectElement && submit(event.currentTarget)}>
					<Input
						addon={<Icon name="search" className="h-4 w-4" />}
						type="search"
						name="q"
						defaultValue={params.get("q") ?? ""}
						placeholder="Title, owner name or email"
						aria-label="Search"
						className="sm:max-w-sm"
					/>
					<Select name="sort" defaultValue={sort} aria-label="Order" className="w-auto">
						{SORTS.filter((option) => downloads || option.value !== "downloads").map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
					<Button type="submit" variant="brand">
						Search
					</Button>
				</Form>

				{actionData?.error && <Alert>{actionData.error}</Alert>}

				{items.length === 0 ? (
					<p className="panel px-5 py-10 text-center text-ink-500">Nothing public here yet.</p>
				) : (
					<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{items.map((item) => (
							<ContentCard key={item.id} item={item} to={`/admin/${kind}/${item.id}`} />
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

/** One public item: its picture and counts link to its admin page. */
function ContentCard({ item, to }: { item: ModerationItem; to: string }) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle" && navigation.formData?.get("id") === item.id;

	return (
		<li className="panel flex flex-col overflow-hidden">
			<Link prefetch="intent" to={to} className="group block">
				<div className="aspect-[4/3] bg-surface-100">
					{item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
				</div>
				<div className="space-y-1 px-4 pt-4">
					<p className="truncate font-semibold text-ink-900 group-hover:text-brand-700">{item.title}</p>
					<p className="truncate text-sm text-ink-500">{item.owner ? `${item.owner.name} · ${item.owner.email}` : "Unknown owner"}</p>
					<Counts item={item} />
				</div>
			</Link>
			<div className="mt-auto flex gap-2 p-4">
				<Link prefetch="intent" to={to} className={buttonClass("secondary", "!py-2")}>
					Stats
				</Link>
				<UnpublishButton item={item} busy={busy} />
			</div>
		</li>
	);
}
