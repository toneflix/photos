import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { FlipbookModel, type Book, type BookTheme, type Space } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireSignIn } from "~/lib/session.server";
import { spaceFiltered } from "~/lib/space-filter.server";
import { useInfiniteList } from "~/lib/use-infinite-list";
import { CoverView } from "@toneflix/flipbook-react";
import { ClothPicker } from "~/components/book/CoverPickers";
import { SpacePicker } from "~/components/spaces/SpacePicker";
import { Alert, Button, Field, Input, Spinner, Textarea } from "~/components/ui";
import { BOOK_VISIBILITY_FILTER, SORT_FILTER, SearchFilters, THEME_FILTER, filterParam, searchText, spaceFilter } from "~/components/SearchFilters";
import type { Route } from "./+types/books";

export const meta = () => [{ title: "Your books · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const filters = {
		q: searchText(url),
		theme: filterParam(url, "theme", ["classic", "linen", "midnight"] as const),
		visibility: filterParam(url, "visibility", ["private", "shared", "public"] as const),
		sort: filterParam(url, "sort", ["latest", "oldest"] as const),
	};
	const list = (space?: string) => api.books.list({ ...filters, space, page, per_page: BOOKS_PER_PAGE });

	const { spaces, space, result } = await spaceFiltered(url, api, list);
	const { data: items, meta } = result;

	return {
		items,
		page: meta.current_page,
		lastPage: meta.last_page,
		total: meta.total,
		spaces,
		space,
		filtered: Object.values(filters).some(Boolean),
	};
}

/** Four shelves of six books per request. */
const BOOKS_PER_PAGE = 24;

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();

	try {
		const { data: book } = await api.books.create({
			title: String(form.get("title") ?? ""),
			description: String(form.get("description") ?? "") || null,
			theme: (String(form.get("theme") ?? "classic") as BookTheme) || "classic",
			spaceId: String(form.get("spaceId") ?? "") || null,
		});
		return redirect(`/books/${book.id}/edit`);
	} catch (error) {
		return data(formError(error), { status: 422 });
	}
}

export default function Books({ loaderData, actionData }: Route.ComponentProps) {
	const { items: books, hasMore, loading, sentinel } = useInfiniteList(loaderData, "/books");
	const { total, spaces, space, filtered } = loaderData;
	const [creating, setCreating] = useState((total === 0 && !filtered) || !!actionData);

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display font-bold tracking-tight text-4xl text-ink-900">Your books</h1>
					<p className="mt-1 text-ink-500">
						{filtered
							? `${total} ${total === 1 ? "book matches" : "books match"}.`
							: space
								? `${total} ${total === 1 ? "book" : "books"} in ${space.name}.`
								: total === 0
									? "Bind your photos into your first book."
									: `${total} ${total === 1 ? "book" : "books"} on your shelf.`}
					</p>
				</div>
				{!creating && (
					<Button onClick={() => setCreating(true)}>
						<IconPlus /> New book
					</Button>
				)}
			</div>

			{creating && (
				<NewBookForm
					key={space?.id ?? ""}
					error={actionData}
					spaces={spaces}
					spaceId={space?.id}
					onCancel={total || filtered || space ? () => setCreating(false) : undefined}
				/>
			)}

			{(total > 0 || filtered || spaces.length > 0) && (
				<div className="mt-8">
					<SearchFilters
						placeholder="Search your books by title or description"
						filters={[...(spaces.length ? [spaceFilter(spaces)] : []), THEME_FILTER, BOOK_VISIBILITY_FILTER, SORT_FILTER]}
					/>
				</div>
			)}

			{filtered && total === 0 && <p className="mt-10 text-center text-ink-500">No books match. Try other words or clear the filters.</p>}

			{books.length > 0 && (
				<ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{books.map((book) => (
						<BookCard key={book.id} book={book} />
					))}
				</ul>
			)}

			{hasMore && (
				<div ref={sentinel} className="flex h-24 items-center justify-center text-ink-500">
					{loading && <Spinner />}
				</div>
			)}
		</main>
	);
}

/** A book in the grid: its cover, with quick actions on hover. */
function BookCard({ book }: { book: Book }) {
	return (
		<li className="group min-w-0">
			<div className="relative">
				<Link prefetch="intent"
					to={`/books/${book.id}`}
					className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-surface-100 shadow-sm transition duration-300 group-hover:shadow-xl"
					style={{ containerType: "size" }}
					aria-label={`Open ${book.title}`}
				>
					<CoverView book={FlipbookModel.cover(book)} />
					<span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 opacity-0 transition group-hover:opacity-100" />
				</Link>
				<div className="absolute top-2 right-2 flex gap-1.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
					<Link prefetch="intent"
						to={`/books/${book.id}/edit`}
						className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-900 shadow hover:bg-white"
					>
						Edit
					</Link>
					{book.creatorId === book.userId && (
						<Link prefetch="intent"
							to={`/stats/books/${book.id}`}
							className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-900 shadow hover:bg-white"
						>
							Stats
						</Link>
					)}
				</div>
				{book.visibility !== "private" && (
					<span className="absolute top-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
						{book.visibility === "public" ? "Public" : "Shared"}
					</span>
				)}
			</div>
			<h2 className="mt-3 truncate font-display font-bold text-ink-900">{book.title}</h2>
			<p className="text-sm text-ink-500">
				{book.pageCount} {book.pageCount === 1 ? "page" : "pages"} · {new Date(book.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
			</p>
		</li>
	);
}


function NewBookForm({
	error,
	spaces,
	spaceId,
	onCancel,
}: {
	error?: { error: string; fieldErrors: Record<string, string> };
	spaces: Space[];
	spaceId?: string;
	onCancel?: () => void;
}) {
	const busy = useNavigation().state !== "idle";
	const [theme, setTheme] = useState<BookTheme>("classic");
	const [title, setTitle] = useState("");

	return (
		<Form method="post" className="mt-8 grid gap-8 panel p-6 md:grid-cols-[1fr_200px] md:p-8">
			<div className="space-y-5">
				<h2 className="font-display font-bold tracking-tight text-2xl">A new book</h2>
				{error?.error && !Object.keys(error.fieldErrors).length && <Alert>{error.error}</Alert>}
				<Field label="Title" error={error?.fieldErrors.title}>
					<Input name="title" required maxLength={160} placeholder="Summer in Lagos" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
				</Field>
				<Field label="A line for the title page (optional)">
					<Textarea name="description" rows={2} maxLength={2000} placeholder="Two weeks of sun, family and jollof." />
				</Field>
				<ClothPicker value={theme} onChange={setTheme} name="theme" />
				{spaces.length > 0 && (
					<Field label="Space">
						<SpacePicker spaces={spaces} name="spaceId" defaultValue={spaceId ?? ""} />
					</Field>
				)}
				<div className="flex gap-2 pt-2">
					<Button type="submit" disabled={busy}>
						{busy ? "Creating…" : "Create book"}
					</Button>
					{onCancel && (
						<Button variant="ghost" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>
			</div>
			<div className="hidden md:block">
				<div className="relative aspect-[3/4] overflow-hidden rounded-r-md shadow-lg" style={{ containerType: "size" }}>
					<CoverView book={FlipbookModel.cover({ title: title || "Your title", description: null, theme, coverDesign: "classic", coverText: null })} />
				</div>
			</div>
		</Form>
	);
}

function IconPlus() {
	return (
		<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
			<path d="M12 5v14M5 12h14" strokeLinecap="round" />
		</svg>
	);
}
