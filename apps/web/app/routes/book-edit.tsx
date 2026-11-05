import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { data, Link, redirect, useFetcher, type ShouldRevalidateFunctionArgs } from "react-router";
import type { BookPageInput, BookTheme, BookWithPages, PageLayout, Photo, Visibility } from "@photos/types";
import { PAGE_LAYOUTS } from "@photos/types";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import { handlePhotoIntent } from "~/lib/photo-actions.server";
import { PageView, CoverView } from "~/components/flipbook/PageView";
import { PhotoUploader } from "~/components/PhotoUploader";
import { Button, Field, Input, Textarea, buttonClass, Spinner } from "~/components/ui";
import type { Route } from "./+types/book-edit";

export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: `Editing ${loaderData?.book.title ?? "book"} · Toneflix Photos` }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const [{ data: book }, photos] = await Promise.all([
		api.books.get(params.id).catch(() => {
			throw data("Book not found", { status: 404 });
		}),
		api.photos.list({ per_page: 200 }),
	]);
	if (!book.canEdit) throw redirect(`/books/${book.id}`);
	return { book, photos: photos.data };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);

	// Photo uploads come in as multipart forms.
	if (!request.headers.get("content-type")?.includes("application/json")) {
		return handlePhotoIntent(api, await request.formData());
	}

	const body = (await request.json()) as
		| { intent: "pages"; pages: BookPageInput[] }
		| { intent: "update"; changes: Record<string, unknown> }
		| { intent: "delete" };

	try {
		if (body.intent === "pages") {
			await api.books.savePages(params.id, body.pages);
			return { ok: true as const, skipRevalidate: true };
		}
		if (body.intent === "update") {
			const { data: book } = await api.books.update(params.id, body.changes as never);
			return { ok: true as const, book };
		}
		if (body.intent === "delete") {
			await api.books.remove(params.id);
			return redirect("/books");
		}
	} catch (error) {
		const result = formError(error);
		return data({ ok: false as const, error: result.error }, { status: result.status });
	}
	return null;
}

export function shouldRevalidate({ actionResult, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
	if (actionResult && typeof actionResult === "object" && "skipRevalidate" in actionResult) return false;
	return defaultShouldRevalidate;
}

type DraftPage = { key: string; layout: PageLayout; caption: string; photos: Photo[] };

let keySeq = 0;
const newKey = () => `p${Date.now().toString(36)}${(keySeq++).toString(36)}`;

const toDraft = (book: BookWithPages): DraftPage[] =>
	book.pages.map((p) => ({ key: p.id, layout: p.layout, caption: p.caption ?? "", photos: p.photos }));

export default function BookEditor({ loaderData }: Route.ComponentProps) {
	const { book, photos } = loaderData;

	const [pages, setPages] = useState<DraftPage[]>(() => toDraft(book));
	const [selected, setSelected] = useState(0);
	const [slot, setSlot] = useState<number | null>(0);
	const [dirty, setDirty] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const saver = useFetcher<typeof action>();
	const saving = saver.state !== "idle";
	const saveError = saver.data && "ok" in saver.data && !saver.data.ok ? saver.data.error : null;

	const current = pages[selected];
	const usedIds = useMemo(() => new Set(pages.flatMap((p) => p.photos.map((ph) => ph.id))), [pages]);

	const change = useCallback((updater: (pages: DraftPage[]) => DraftPage[]) => {
		setPages((prev) => updater(prev));
		setDirty(true);
	}, []);

	// Autosave shortly after the last change.
	useEffect(() => {
		if (!dirty) return;
		const t = setTimeout(() => {
			setDirty(false);
			saver.submit(
				{
					intent: "pages",
					pages: pages.map((p) => ({ layout: p.layout, caption: p.caption || null, photoIds: p.photos.map((ph) => ph.id) })),
				},
				{ method: "post", encType: "application/json" },
			);
		}, 900);
		return () => clearTimeout(t);
	}, [dirty, pages, saver]);

	// Warn before leaving with unsaved changes.
	useEffect(() => {
		const onUnload = (e: BeforeUnloadEvent) => {
			if (dirty || saving) e.preventDefault();
		};
		window.addEventListener("beforeunload", onUnload);
		return () => window.removeEventListener("beforeunload", onUnload);
	}, [dirty, saving]);

	const addPage = (layout: PageLayout = "framed", withPhotos: Photo[] = []) => {
		change((prev) => {
			const next = [...prev];
			next.splice(selected + 1, 0, { key: newKey(), layout, caption: "", photos: withPhotos });
			return next;
		});
		setSelected(pages.length ? selected + 1 : 0);
		setSlot(0);
	};

	const removePage = (index: number) => {
		change((prev) => prev.filter((_, i) => i !== index));
		setSelected((s) => Math.max(0, Math.min(s, pages.length - 2)));
	};

	const movePage = (index: number, by: number) => {
		const to = index + by;
		if (to < 0 || to >= pages.length) return;
		change((prev) => {
			const next = [...prev];
			const [page] = next.splice(index, 1);
			next.splice(to, 0, page);
			return next;
		});
		setSelected(to);
	};

	const setLayout = (layout: PageLayout) => {
		change((prev) =>
			prev.map((p, i) => (i === selected ? { ...p, layout, photos: p.photos.slice(0, PAGE_LAYOUTS[layout].maxPhotos) } : p)),
		);
		setSlot(0);
	};

	const placePhoto = (photo: Photo) => {
		if (!current) {
			addPage("framed", [photo]);
			return;
		}
		const max = PAGE_LAYOUTS[current.layout].maxPhotos;
		const target = slot !== null && slot < max ? slot : Math.min(current.photos.length, max - 1);
		change((prev) =>
			prev.map((p, i) => {
				if (i !== selected) return p;
				const next = [...p.photos];
				if (target >= next.length) next.push(photo);
				else next[target] = photo;
				return { ...p, photos: next.slice(0, max) };
			}),
		);
		// Move on to the next empty slot.
		setSlot(target + 1 < max ? target + 1 : target);
	};

	const removePhoto = (index: number) => {
		change((prev) => prev.map((p, i) => (i === selected ? { ...p, photos: p.photos.filter((_, j) => j !== index) } : p)));
	};

	/** Give every photo not yet in the book its own page. */
	const addUnused = () => {
		const unused = photos.filter((p) => !usedIds.has(p.id));
		if (!unused.length) return;
		const layouts: PageLayout[] = ["single", "framed", "pair", "framed", "grid", "framed"];
		const added: DraftPage[] = [];
		let i = 0;
		let n = 0;
		while (i < unused.length) {
			const layout = layouts[n++ % layouts.length];
			const count = PAGE_LAYOUTS[layout].maxPhotos;
			added.push({ key: newKey(), layout, caption: "", photos: unused.slice(i, i + count) });
			i += count;
		}
		change((prev) => [...prev, ...added]);
		setSelected(pages.length);
	};

	const status = saveError ? (
		<span className="text-red-700">Couldn't save: {saveError}</span>
	) : dirty || saving ? (
		<span className="flex items-center gap-1.5 text-ink-500">
			<Spinner className="h-3.5 w-3.5" /> Saving…
		</span>
	) : (
		<span className="text-ink-500">All changes saved</span>
	);

	return (
		<div className="flex h-dvh flex-col bg-paper-100">
			{/* Header */}
			<header className="flex items-center gap-3 border-b border-paper-200 bg-paper-50 px-3 py-2.5 sm:px-5">
				<Link to="/books" className="rounded-full p-2 text-ink-700 hover:bg-paper-200" aria-label="Back to your books">
					<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</Link>
				<div className="min-w-0 flex-1">
					<p className="truncate font-serif text-lg leading-tight text-ink-900">{book.title}</p>
					<p className="text-xs">{status}</p>
				</div>
				<Button variant="secondary" onClick={() => setSettingsOpen(true)} className="hidden sm:inline-flex">
					Book settings
				</Button>
				<Button variant="ghost" onClick={() => setSettingsOpen(true)} className="sm:hidden" aria-label="Book settings">
					<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
					</svg>
				</Button>
				<Link to={`/books/${book.id}`} className={buttonClass("primary")}>
					<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5v13c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5z" strokeLinejoin="round" />
						<path d="M12 6v13" />
					</svg>
					Read
				</Link>
			</header>

			<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
				{/* Page list */}
				<aside className="shrink-0 border-paper-200 bg-paper-50 lg:w-52 lg:border-r">
					<div className="flex items-center justify-between px-4 pt-3 pb-2">
						<h2 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Pages · {pages.length}</h2>
						<button type="button" onClick={() => addPage()} className="text-sm font-medium text-ember-600 hover:underline">
							+ Add
						</button>
					</div>
					<ol className="flex gap-3 overflow-x-auto px-4 pb-4 lg:max-h-[calc(100dvh-110px)] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
						{pages.map((page, i) => (
							<li key={page.key} className="group relative shrink-0">
								<button
									type="button"
									onClick={() => {
										setSelected(i);
										setSlot(0);
									}}
									className={`block w-20 overflow-hidden rounded-md shadow-sm ring-2 transition lg:w-full ${
										i === selected ? "ring-ember-500" : "ring-transparent hover:ring-paper-300"
									}`}
									aria-label={`Page ${i + 1}`}
									aria-current={i === selected}
								>
									<div className="relative aspect-[3/4]" style={{ containerType: "size" }}>
										<PageView page={{ layout: page.layout, caption: page.caption, photos: page.photos }} />
									</div>
								</button>
								<div className="mt-1 flex items-center justify-between text-xs text-ink-500">
									<span>{i + 1}</span>
									<span className="flex gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
										<IconButton label="Move up" onClick={() => movePage(i, -1)} disabled={i === 0} path="M12 19V5m-6 6 6-6 6 6" />
										<IconButton label="Move down" onClick={() => movePage(i, 1)} disabled={i === pages.length - 1} path="M12 5v14m6-6-6 6-6-6" />
										<IconButton label="Delete page" onClick={() => removePage(i)} path="M6 7h12M9 7V5h6v2m-8 0 1 12h8l1-12" />
									</span>
								</div>
							</li>
						))}
						{pages.length === 0 && <li className="text-sm text-ink-500">No pages yet.</li>}
					</ol>
				</aside>

				{/* Selected page */}
				<section className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-4 sm:p-6">
					{current ? (
						<>
							<div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-white p-1 shadow-sm">
								{(Object.keys(PAGE_LAYOUTS) as PageLayout[]).map((layout) => (
									<button
										key={layout}
										type="button"
										onClick={() => setLayout(layout)}
										className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
											current.layout === layout ? "bg-ink-900 text-paper-50" : "text-ink-700 hover:bg-paper-100"
										}`}
										aria-pressed={current.layout === layout}
									>
										<LayoutIcon layout={layout} />
										{PAGE_LAYOUTS[layout].label}
									</button>
								))}
							</div>

							<div className="relative aspect-[3/4] w-full max-w-[min(26rem,calc((100dvh-300px)*0.75))] min-w-56 shadow-[0_10px_40px_rgb(0_0_0/0.18)]" style={{ containerType: "size" }}>
								<PageView
									page={{ layout: current.layout, caption: current.caption, photos: current.photos }}
									number={selected + 1}
									side={selected % 2 === 0 ? "right" : "left"}
									onSlotClick={setSlot}
									activeSlot={slot}
								/>
							</div>

							<div className="w-full max-w-md space-y-3">
								{slot !== null && current.photos[slot] && (
									<div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
										<span className="text-ink-500">Photo {slot + 1} selected. Pick another to replace it.</span>
										<button type="button" onClick={() => removePhoto(slot)} className="font-medium text-red-700 hover:underline">
											Remove
										</button>
									</div>
								)}
								<Input
									value={current.caption}
									onChange={(e) => change((prev) => prev.map((p, i) => (i === selected ? { ...p, caption: e.target.value } : p)))}
									placeholder="Write a caption for this page"
									maxLength={500}
								/>
							</div>
						</>
					) : (
						<div className="m-auto max-w-sm text-center">
							<h2 className="font-serif text-2xl">This book has no pages yet</h2>
							<p className="mt-2 text-ink-500">Pick photos on the right to start a page, or fill the book with everything you've uploaded.</p>
							<div className="mt-5 flex justify-center gap-2">
								<Button onClick={() => addPage()}>Add a page</Button>
								{photos.length > 0 && (
									<Button variant="secondary" onClick={addUnused}>
										Fill with my photos
									</Button>
								)}
							</div>
						</div>
					)}
				</section>

				{/* Photo tray */}
				<aside className="flex min-h-0 shrink-0 flex-col border-paper-200 bg-paper-50 lg:w-80 lg:border-l">
					<div className="flex items-center justify-between px-4 pt-3 pb-2">
						<h2 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Your photos</h2>
						{photos.some((p) => !usedIds.has(p.id)) && (
							<button type="button" onClick={addUnused} className="text-sm font-medium text-ember-600 hover:underline">
								Add unused as pages
							</button>
						)}
					</div>
					<div className="px-4 pb-3">
						<PhotoUploader action={`/books/${book.id}/edit`} compact />
					</div>
					<ul className="grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-6 lg:grid-cols-3">
						{photos.map((photo) => (
							<li key={photo.id}>
								<button
									type="button"
									onClick={() => placePhoto(photo)}
									className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-paper-200"
									title={current ? "Place on this page" : "Start a page with this photo"}
								>
									<img src={photo.url} alt={photo.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
									{usedIds.has(photo.id) && (
										<span className="absolute top-1 right-1 rounded-full bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">In book</span>
									)}
								</button>
							</li>
						))}
					</ul>
				</aside>
			</div>

			{settingsOpen && <SettingsDrawer book={book} onClose={() => setSettingsOpen(false)} bookPhotos={pages.flatMap((p) => p.photos)} />}
		</div>
	);
}

function SettingsDrawer({ book, bookPhotos, onClose }: { book: BookWithPages; bookPhotos: Photo[]; onClose: () => void }) {
	const fetcher = useFetcher<typeof action>();
	const [title, setTitle] = useState(book.title);
	const [description, setDescription] = useState(book.description ?? "");
	const [theme, setTheme] = useState<BookTheme>(book.theme);
	const [visibility, setVisibility] = useState<Visibility>(book.visibility);
	const [coverPhotoId, setCoverPhotoId] = useState<string | null>(book.coverPhotoId);
	const [copied, setCopied] = useState(false);
	const saving = fetcher.state !== "idle";
	const uniquePhotos = useMemo(() => [...new Map(bookPhotos.map((p) => [p.id, p])).values()], [bookPhotos]);
	const coverPhoto = uniquePhotos.find((p) => p.id === coverPhotoId) ?? null;
	const submitted = useRef(false);

	useEffect(() => {
		if (submitted.current && fetcher.state === "idle" && fetcher.data && "ok" in fetcher.data && fetcher.data.ok) onClose();
	}, [fetcher.state, fetcher.data, onClose]);

	const save = () => {
		submitted.current = true;
		fetcher.submit(
			{ intent: "update", changes: { title, description: description || null, theme, visibility, coverPhotoId } },
			{ method: "post", encType: "application/json" },
		);
	};

	const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/books/${book.id}` : "";

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-ink-900/40" onClick={onClose}>
			<div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal aria-label="Book settings">
				<div className="flex items-center justify-between border-b border-paper-200 px-6 py-4">
					<h2 className="font-serif text-2xl">Book settings</h2>
					<button type="button" onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-paper-100" aria-label="Close">
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
					</button>
				</div>
				<div className="flex-1 space-y-6 px-6 py-6">
					<div className="mx-auto w-40">
						<div className="relative aspect-[3/4] overflow-hidden rounded-r-md shadow-lg" style={{ containerType: "size" }}>
							<CoverView book={{ title: title || "Untitled", description, theme, coverPhoto }} />
						</div>
					</div>
					<Field label="Title">
						<Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
					</Field>
					<Field label="Title page text">
						<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
					</Field>
					<fieldset>
						<legend className="mb-1.5 text-sm font-medium text-ink-700">Cover</legend>
						<div className="flex flex-wrap gap-2">
							{(["classic", "linen", "midnight"] as BookTheme[]).map((t) => (
								<button key={t} type="button" onClick={() => setTheme(t)} className={`rounded-full border px-3.5 py-1.5 text-sm capitalize ${theme === t ? "border-ink-900 bg-ink-900 text-paper-50" : "border-paper-300 hover:bg-paper-100"}`}>
									{t}
								</button>
							))}
						</div>
					</fieldset>
					<fieldset>
						<legend className="mb-1.5 text-sm font-medium text-ink-700">Cover photo</legend>
						{uniquePhotos.length ? (
							<div className="grid grid-cols-5 gap-2">
								<button type="button" onClick={() => setCoverPhotoId(null)} className={`flex aspect-square items-center justify-center rounded-md border text-xs text-ink-500 ${coverPhotoId === null ? "border-ember-500 ring-2 ring-ember-500" : "border-paper-300"}`}>
									None
								</button>
								{uniquePhotos.map((p) => (
									<button key={p.id} type="button" onClick={() => setCoverPhotoId(p.id)} className={`aspect-square overflow-hidden rounded-md ${coverPhotoId === p.id ? "ring-2 ring-ember-500 ring-offset-1" : ""}`}>
										<img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
									</button>
								))}
							</div>
						) : (
							<p className="text-sm text-ink-500">Add photos to your pages to choose a cover photo.</p>
						)}
					</fieldset>
					<fieldset>
						<legend className="mb-1.5 text-sm font-medium text-ink-700">Who can open it</legend>
						<div className="space-y-2">
							{(
								[
									["private", "Only me"],
									["shared", "Anyone with the link"],
								] as [Visibility, string][]
							).map(([value, label]) => (
								<label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-paper-300 px-4 py-3 text-sm has-[:checked]:border-ink-900">
									<input type="radio" name="visibility" checked={visibility === value || (value === "shared" && visibility === "public")} onChange={() => setVisibility(value)} className="accent-ink-900" />
									{label}
								</label>
							))}
						</div>
						{visibility !== "private" && (
							<div className="mt-3 flex gap-2">
								<Input readOnly value={shareUrl} className="text-xs" onFocus={(e) => e.target.select()} />
								<Button
									variant="secondary"
									onClick={async () => {
										await navigator.clipboard?.writeText(shareUrl).catch(() => {});
										setCopied(true);
										setTimeout(() => setCopied(false), 1500);
									}}
								>
									{copied ? "Copied" : "Copy"}
								</Button>
							</div>
						)}
					</fieldset>
					{fetcher.data && "ok" in fetcher.data && !fetcher.data.ok && <p className="text-sm text-red-700">{fetcher.data.error}</p>}
				</div>
				<div className="flex items-center justify-between gap-3 border-t border-paper-200 px-6 py-4">
					<Button
						variant="danger"
						onClick={() => {
							if (confirm(`Delete “${book.title}”? Your photos stay in your library.`)) {
								fetcher.submit({ intent: "delete" }, { method: "post", encType: "application/json" });
							}
						}}
					>
						Delete book
					</Button>
					<Button onClick={save} disabled={saving || !title.trim()}>
						{saving ? "Saving…" : "Save"}
					</Button>
				</div>
			</div>
		</div>
	);
}

function IconButton({ label, path, onClick, disabled }: { label: string; path: string; onClick: () => void; disabled?: boolean }) {
	return (
		<button type="button" onClick={onClick} disabled={disabled} className="rounded p-0.5 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-30" aria-label={label} title={label}>
			<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
				<path d={path} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</button>
	);
}

function LayoutIcon({ layout }: { layout: PageLayout }) {
	const rects: Record<PageLayout, [number, number, number, number][]> = {
		single: [[0, 0, 12, 16]],
		framed: [[2, 2, 8, 9]],
		pair: [
			[2, 2, 8, 5.5],
			[2, 8.5, 8, 5.5],
		],
		grid: [
			[1.5, 1.5, 4, 6],
			[6.5, 1.5, 4, 6],
			[1.5, 8.5, 4, 6],
			[6.5, 8.5, 4, 6],
		],
	};
	return (
		<svg viewBox="0 0 12 16" className="h-4 w-3" aria-hidden>
			<rect x="0.5" y="0.5" width="11" height="15" fill="none" stroke="currentColor" strokeOpacity="0.5" />
			{rects[layout].map(([x, y, w, h], i) => (
				<rect key={i} x={x} y={y} width={w} height={h} fill="currentColor" />
			))}
		</svg>
	);
}
