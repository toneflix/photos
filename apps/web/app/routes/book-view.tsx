import { useMemo, useState, type ReactNode } from "react";
import { ContentCounts } from "~/components/ContentCounts";
import { data, Form, Link, redirect, useLocation, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi, PhotosApiError } from "~/lib/api.server";
import { BookCodes } from "~/lib/book-codes.server";
import { PreviewImage, type ShareImageHandle } from "~/lib/preview-image";
import { readToken } from "~/lib/session.server";
import { Flipbook } from "@toneflix/flipbook-react";
import { PhotoUploader } from "~/components/PhotoUploader";
import { AuthFrame } from "~/components/AuthFrame";
import { Alert, Button, Field, Input, buttonClass } from "~/components/ui";
import { FlipbookModel, type BookWithPages } from "@photos/types";
import type { Route } from "./+types/book-view";

export const handle: ShareImageHandle = { shareImage: true };

export function meta({ loaderData, matches }: Route.MetaArgs) {
	const book = loaderData?.book;
	const preview = PreviewImage.from(matches);

	if (!book) return [{ title: "Locked book · Toneflix Photos" }, { property: "og:image", content: preview.site() }];

	return [
		{ title: `${book.title} · Toneflix Photos` },
		{ name: "description", content: book.description ?? `A photobook by ${book.owner.name}.` },
		{ property: "og:title", content: book.title },
		{ property: "og:image", content: book.coverPhoto ? preview.book(book.id) : preview.site() },
	];
}

/** `/books/:id/view` is the share link: the same book, opening full screen. */
const opensFullscreen = (request: Request) => new URL(request.url).pathname.endsWith("/view");

const bookPath = (id: string, fullscreen: boolean) => `/books/${id}${fullscreen ? "/view" : ""}`;

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const url = new URL(request.url);
	const fullscreen = opensFullscreen(request);
	const startPage = Number(url.searchParams.get("page")) || undefined;
	const codes = await BookCodes.from(request);
	const shared = url.searchParams.get("code");

	// A share link: check the code, remember it, and take it out of the address bar.
	if (shared) {
		const grant = await api.accessCodes.redeem(shared).catch(() => null);

		if (!grant) return { book: null, startPage, fullscreen, signedIn: false, error: "That access code is not valid or has expired." };

		url.searchParams.delete("code");
		throw redirect(`${bookPath(grant.data.book.id, fullscreen)}${url.search}`, {
			headers: { "Set-Cookie": await codes.remember(grant.data.book.id, grant.data.code) },
		});
	}

	const code = codes.for(params.id);
	const signedIn = !!(await readToken(request));

	try {
		const { data: book } = await api.books.get(params.id, code);
		return { book, startPage, fullscreen, signedIn, error: null };
	} catch (error) {
		if (!(error instanceof PhotosApiError) || (error.code !== 404 && error.code !== 422)) throw error;
		if (!code) return { book: null, startPage, fullscreen, signedIn, error: null };

		return data(
			{ book: null, startPage, fullscreen, signedIn, error: "The access code you used no longer opens this book." },
			{ headers: { "Set-Cookie": await codes.forget(params.id) } },
		);
	}
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const codes = await BookCodes.from(request);
	const form = await request.formData();
	const intent = form.get("intent");
	const fullscreen = opensFullscreen(request);

	try {
		if (intent === "unlock") {
			const { data: grant } = await api.accessCodes.redeem(String(form.get("code") ?? ""));
			return redirect(bookPath(grant.book.id, fullscreen), { headers: { "Set-Cookie": await codes.remember(grant.book.id, grant.code) } });
		}

		if (intent === "claim") {
			if (!(await readToken(request))) return redirect(`/signin?next=${encodeURIComponent(bookPath(params.id, fullscreen))}`);

			await api.accessCodes.claim(codes.for(params.id) ?? "");
			return redirect(bookPath(params.id, fullscreen), { headers: { "Set-Cookie": await codes.forget(params.id) } });
		}

		if (intent === "upload") {
			const file = form.get("photo");
			if (!(file instanceof File)) return data({ ok: false as const, error: "Choose a photo to upload" }, { status: 422 });

			const size = (key: string) => Number(form.get(key)) || undefined;
			await api.books.addPhoto(params.id, file, { width: size("width"), height: size("height") }, codes.for(params.id));
			return { ok: true as const, error: null };
		}
	} catch (error) {
		const result = formError(error);
		return data({ ok: false as const, error: result.error }, { status: result.status });
	}

	return null;
}

const chip = "rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20";

export default function BookView({ loaderData, actionData }: Route.ComponentProps) {
	const { book, startPage, fullscreen, signedIn, error } = loaderData;
	const [panel, setPanel] = useState<"add" | "claim" | null>(null);
	const { pathname } = useLocation();
	const flipbook = useMemo(() => book && FlipbookModel.book(book), [book]);

	if (!book || !flipbook) return <LockedBook error={actionData?.error ?? error} />;

	const back = book.isOwner ? { to: "/books", label: "Back to your books" } : { to: "/explore/books", label: "Back to Explore" };
	const can = (permission: string) => book.permissions.includes(permission as never);

	return (
		<div className="relative h-dvh">
			<Flipbook
				book={flipbook}
				startPage={startPage}
				keyboard="global"
				fullscreenPrompt={fullscreen}
				topLeft={
					<div className="flex items-center gap-4">
						<Link prefetch="intent" to={back.to} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label={back.label} title={back.label}>
							<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
								<path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</Link>
						<ContentCounts stats={book.stats} light className="max-sm:hidden" />
					</div>
				}
				topRight={
					<>
						{book.isOwner && (
							<Link prefetch="intent" to={`/books/${book.id}/access`} className={`${chip} max-sm:hidden`}>
								Access codes
							</Link>
						)}
						{!book.isOwner && can("add") && (
							<button type="button" onClick={() => setPanel("add")} className={chip}>
								Add photos
							</button>
						)}
						{!book.isOwner && can("transfer") && (
							<button type="button" onClick={() => setPanel("claim")} className={chip}>
								Make it yours
							</button>
						)}
						{book.canDownload && (
							<a href={`/books/${book.id}/download`} download className={`${chip} inline-flex items-center gap-2 max-sm:px-2`} title={can("transfer") ? "Every original photo, as a zip" : "Openly licensed photos, as a zip"}>
								<svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
									<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<span className="max-sm:sr-only">Download</span>
							</a>
						)}
						{book.canEdit && (
							<Link prefetch="intent" to={`/books/${book.id}/edit`} className={chip}>
								Edit
							</Link>
						)}
					</>
				}
			/>

			{panel === "add" && (
				<Panel title="Add photos" onClose={() => setPanel(null)}>
					<p className="mb-4 text-sm text-ink-500">Each photo goes on a new page at the end of “{book.title}”. The book's owner keeps them in their library.</p>
					<PhotoUploader action={pathname} compact />
				</Panel>
			)}

			{panel === "claim" && !book.isOwner && <ClaimPanel book={book} signedIn={signedIn} error={actionData?.error ?? null} onClose={() => setPanel(null)} />}
		</div>
	);
}

function ClaimPanel({ book, signedIn, error, onClose }: { book: BookWithPages; signedIn: boolean; error: string | null; onClose: () => void }) {
	const busy = useNavigation().state !== "idle";
	const owner = book.owner.name;
	const next = encodeURIComponent(useLocation().pathname);

	return (
		<Panel title="Make this book yours" onClose={onClose}>
			<p className="text-sm text-ink-700">
				“{book.title}” moves to your shelf with its own copies of every photo. You can edit it, share it and choose who can open it.
				{owner ? ` ${owner} will no longer be able to open or change it.` : " Its current owner will no longer be able to open or change it."}
			</p>
			<p className="mt-3 text-sm text-ink-500">Every access code for the book stops working, so share new ones once it's yours.</p>
			{error && (
				<div className="mt-4">
					<Alert>{error}</Alert>
				</div>
			)}
			{signedIn ? (
				<Form method="post" className="mt-6 flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>
						Not now
					</Button>
					<Button type="submit" name="intent" value="claim" disabled={busy}>
						{busy ? "Moving it to your shelf…" : "Make it mine"}
					</Button>
				</Form>
			) : (
				<div className="mt-6 space-y-3">
					<p className="text-sm font-medium text-ink-900">Sign in or join first, then come back to this page.</p>
					<div className="flex justify-end gap-2">
						<Link prefetch="intent" to={`/signin?next=${next}`} className={buttonClass("secondary")}>
							Sign in
						</Link>
						<Link prefetch="intent" to={`/signup?next=${next}`} className={buttonClass("primary")}>
							Join free
						</Link>
					</div>
				</div>
			)}
		</Panel>
	);
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/60 p-4 sm:items-center" onClick={onClose}>
			<div
				role="dialog"
				aria-modal
				aria-label={title}
				className="w-full max-w-md rounded-2xl bg-white p-6 text-ink-900 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="font-display text-xl font-bold">{title}</h2>
					<button type="button" onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-surface-100" aria-label="Close">
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
						</svg>
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}

/** Shown for private books (and missing ones, which look the same) until the visitor enters a code. */
function LockedBook({ error }: { error: string | null }) {
	const busy = useNavigation().state !== "idle";
	const { pathname } = useLocation();

	return (
		<AuthFrame title="This book is locked" subtitle="It's private. Enter the access code its owner gave you to open it.">
			<Form method="post" className="space-y-5">
				{error && <Alert>{error}</Alert>}
				<input type="hidden" name="intent" value="unlock" />
				<Field label="Access code" hint="Like K7QM-4XTP. Capitals and the dash don't matter.">
					<Input
						name="code"
						required
						autoFocus
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						className="font-mono tracking-widest uppercase"
					/>
				</Field>
				<Button type="submit" className="w-full py-3" disabled={busy}>
					{busy ? "Unlocking…" : "Unlock book"}
				</Button>
				<p className="text-center text-sm text-ink-500">
					Is it your book?{" "}
					<Link prefetch="intent" to={`/signin?next=${encodeURIComponent(pathname)}`} className="font-medium text-brand-700 hover:underline">
						Sign in
					</Link>
				</p>
			</Form>
		</AuthFrame>
	);
}
