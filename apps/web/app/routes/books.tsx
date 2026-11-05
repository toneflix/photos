import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import type { Book, BookTheme } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import { useInfiniteList } from "~/lib/use-infinite-list";
import { CoverView } from "~/components/flipbook/PageView";
import { Alert, Button, Field, Input, Spinner, Textarea } from "~/components/ui";
import type { Route } from "./+types/books";

export const meta = () => [{ title: "Your books · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);

	const { data: items, meta } = await api.books.list({ page, per_page: BOOKS_PER_PAGE });

	return { items, page: meta.current_page, lastPage: meta.last_page, total: meta.total };
}

/** Four shelves of six books per request. */
const BOOKS_PER_PAGE = 24;

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();

	try {
		const { data: book } = await api.books.create({
			title: String(form.get("title") ?? ""),
			description: String(form.get("description") ?? "") || null,
			theme: (String(form.get("theme") ?? "classic") as BookTheme) || "classic",
		});
		return redirect(`/books/${book.id}/edit`);
	} catch (error) {
		return data(formError(error), { status: 422 });
	}
}

export default function Books({ loaderData, actionData }: Route.ComponentProps) {
	const { items: books, hasMore, loading, sentinel } = useInfiniteList(loaderData, "/books");
	const { total } = loaderData;
	const [creating, setCreating] = useState(total === 0 || !!actionData);

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-serif text-4xl text-ink-900">Your books</h1>
					<p className="mt-1 text-ink-500">
						{total === 0 ? "Bind your photos into your first book." : `${total} ${total === 1 ? "book" : "books"} on your shelf.`}
					</p>
				</div>
				{!creating && (
					<Button onClick={() => setCreating(true)}>
						<IconPlus /> New book
					</Button>
				)}
			</div>

			{creating && <NewBookForm error={actionData} onCancel={total ? () => setCreating(false) : undefined} />}

			{books.length > 0 && (
				<ul className="mt-8 grid grid-cols-3 gap-y-8 rounded-3xl bg-gradient-to-b from-[#efe6d6] to-[#e6dac5] px-3 pt-4 pb-8 shadow-[inset_0_2px_12px_rgb(80_50_20/0.12)] sm:grid-cols-4 sm:px-5 lg:grid-cols-6">
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

const SPINE: Record<BookTheme, string> = {
	classic: "linear-gradient(to right, #3d1115, #5a1d22 40%, #451519)",
	linen: "linear-gradient(to right, #b7aa8f, #d5c9b0 40%, #c2b59a)",
	midnight: "linear-gradient(to right, #0a0f1c, #1c2540 40%, #111829)",
};

/** A book standing on the shelf, turned slightly to show its spine. */
function BookCard({ book }: { book: Book }) {
	const depth = Math.max(10, Math.min(26, 8 + book.pageCount * 1.2));

	return (
		<li className="group relative flex flex-col px-2 pt-6 sm:px-5">
			<Link to={`/books/${book.id}`} className="relative block outline-none" aria-label={`Open ${book.title}`} style={{ perspective: "1100px" }}>
				<div className="shelf-book relative aspect-[3/4]">
					{/* Spine */}
					<div
						className="absolute top-0 left-0 h-full overflow-hidden"
						style={{ width: depth, transformOrigin: "left center", transform: "rotateY(90deg)", background: SPINE[book.theme] ?? SPINE.classic }}
					/>
					{/* Page block */}
					<div
						className="absolute top-[2%] right-0 h-[96%]"
						style={{
							width: depth - 2,
							transformOrigin: "right center",
							transform: "rotateY(-90deg)",
							background: "repeating-linear-gradient(to right, #f4ecdc 0 1px, #ddd2bc 1px 2px)",
						}}
					/>
					{/* Front cover */}
					<div className="absolute inset-0 overflow-hidden rounded-r-[3px] shadow-[inset_-1px_0_0_rgb(255_255_255/0.15)]" style={{ containerType: "size" }}>
						<CoverView book={{ ...book, coverPhoto: book.coverPhoto ?? null }} />
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition duration-500 group-hover:opacity-100" />
					</div>
				</div>
				<div className="pointer-events-none absolute inset-x-2 -bottom-1 h-3 rounded-[50%] bg-black/40 blur-md transition group-hover:opacity-60" />
			</Link>
			<div className="shelf-plank relative z-10 -mx-2 mt-1 h-3.5 rounded-sm sm:-mx-5" />
			<div className="mt-3 min-w-0">
				<h2 className="line-clamp-2 font-serif text-sm leading-snug text-ink-900 sm:text-lg">{book.title}</h2>
				<div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-ink-500 sm:text-sm">
					<p className="truncate">
						{book.pageCount} {book.pageCount === 1 ? "page" : "pages"}
						{book.visibility !== "private" && " · Shared"}
					</p>
					<Link to={`/books/${book.id}/edit`} className="shrink-0 font-medium text-ink-700 hover:text-ink-900 hover:underline">
						Edit
					</Link>
				</div>
			</div>
		</li>
	);
}

const THEMES: { value: BookTheme; label: string }[] = [
	{ value: "classic", label: "Classic leather" },
	{ value: "linen", label: "Linen" },
	{ value: "midnight", label: "Midnight" },
];

function NewBookForm({
	error,
	onCancel,
}: {
	error?: { error: string; fieldErrors: Record<string, string> };
	onCancel?: () => void;
}) {
	const busy = useNavigation().state !== "idle";
	const [theme, setTheme] = useState<BookTheme>("classic");
	const [title, setTitle] = useState("");

	return (
		<Form method="post" className="mt-8 grid gap-8 rounded-3xl border border-paper-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_200px] md:p-8">
			<div className="space-y-5">
				<h2 className="font-serif text-2xl">A new book</h2>
				{error?.error && !Object.keys(error.fieldErrors).length && <Alert>{error.error}</Alert>}
				<Field label="Title" error={error?.fieldErrors.title}>
					<Input name="title" required maxLength={160} placeholder="Summer in Lagos" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
				</Field>
				<Field label="A line for the title page (optional)">
					<Textarea name="description" rows={2} maxLength={2000} placeholder="Two weeks of sun, family and jollof." />
				</Field>
				<fieldset>
					<legend className="mb-1.5 text-sm font-medium text-ink-700">Cover</legend>
					<div className="flex flex-wrap gap-2">
						{THEMES.map((t) => (
							<label
								key={t.value}
								className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
									theme === t.value ? "border-ink-900 bg-ink-900 text-paper-50" : "border-paper-300 hover:bg-paper-100"
								}`}
							>
								<input type="radio" name="theme" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} className="sr-only" />
								{t.label}
							</label>
						))}
					</div>
				</fieldset>
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
					<CoverView book={{ title: title || "Your title", description: null, theme, coverPhoto: null }} />
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
