import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import type { Book, BookTheme } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import { CoverView } from "~/components/flipbook/PageView";
import { Alert, Button, Field, Input, Textarea, buttonClass } from "~/components/ui";
import type { Route } from "./+types/books";

export const meta = () => [{ title: "Your books · Toneflix Photos" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const { data: books } = await api.books.list({ per_page: 100 });
	return { books };
}

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
	const { books } = loaderData;
	const [creating, setCreating] = useState(books.length === 0 || !!actionData);

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-serif text-4xl text-ink-900">Your books</h1>
					<p className="mt-1 text-ink-500">
						{books.length === 0
							? "Bind your photos into your first book."
							: `${books.length} ${books.length === 1 ? "book" : "books"} on your shelf.`}
					</p>
				</div>
				{!creating && (
					<Button onClick={() => setCreating(true)}>
						<IconPlus /> New book
					</Button>
				)}
			</div>

			{creating && <NewBookForm error={actionData} onCancel={books.length ? () => setCreating(false) : undefined} />}

			{books.length > 0 && (
				<ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{books.map((book) => (
						<BookCard key={book.id} book={book} />
					))}
				</ul>
			)}
		</main>
	);
}

function BookCard({ book }: { book: Book }) {
	return (
		<li className="group">
			<Link to={`/books/${book.id}`} className="block" aria-label={`Open ${book.title}`}>
				<div
					className="relative aspect-[3/4] overflow-hidden rounded-r-md shadow-[4px_6px_18px_rgb(0_0_0/0.18)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[6px_12px_28px_rgb(0_0_0/0.25)]"
					style={{ containerType: "size" }}
				>
					<CoverView book={{ ...book, coverPhoto: book.coverPhoto ?? null }} />
				</div>
			</Link>
			<div className="mt-3 flex items-start justify-between gap-2">
				<div className="min-w-0">
					<h2 className="truncate font-medium text-ink-900">{book.title}</h2>
					<p className="text-sm text-ink-500">
						{book.pageCount} {book.pageCount === 1 ? "page" : "pages"}
						{book.visibility !== "private" && " · Shared"}
					</p>
				</div>
				<Link to={`/books/${book.id}/edit`} className={buttonClass("ghost", "px-3 py-1.5 text-xs")}>
					Edit
				</Link>
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
