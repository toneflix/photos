import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { data, Link, redirect, useFetcher, type ShouldRevalidateFunctionArgs } from "react-router";
import type { BookPageInput, BookPagePhoto, BookTheme, BookWithPages, FrameStyle, PageLayout, PaperColor, Photo, Space, Visibility } from "@photos/types";
import { coverHasText, FlipbookModel, FRAME_STYLES, PAGE_LAYOUTS, PAPER_COLORS, type CoverDesign } from "@photos/types";
import { BookLookProvider, CoverView, PageView, PHOTO_DRAG_TYPE, PLACED_LAYOUTS, PrintedPhoto, TitlePageView } from "@toneflix/flipbook-react";
import { cloudflareContext } from "~/lib/cloudflare";
import { formError, getServerApi } from "~/lib/api.server";
import { BookCodes } from "~/lib/book-codes.server";
import { readToken } from "~/lib/session.server";
import { handlePhotoIntent } from "~/lib/photo-actions.server";
import { PhotoUploader } from "~/components/PhotoUploader";
import { SpacePicker } from "~/components/spaces/SpacePicker";
import { ClothPicker, CoverDesignPicker } from "~/components/book/CoverPickers";
import { Button, Field, Input, Textarea, buttonClass, Spinner } from "~/components/ui";
import type { Route } from "./+types/book-edit";

export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: `Editing ${loaderData?.book.title ?? "book"} · Toneflix Photos` }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { api, code, token } = await editorApi(request, context, params.id);
	const book = await api.books.get(params.id, code).then(
		(response) => response.data,
		() => {
			if (!token) throw redirect(`/signin?next=${encodeURIComponent(new URL(request.url).pathname)}`);
			throw data("Book not found", { status: 404 });
		},
	);

	if (!book.canEdit) throw redirect(`/books/${book.id}`);

	// Owners pick from their whole library; code holders from the photos already in the book.
	const photos = book.isOwner
		? (await api.photos.list({ per_page: 200 })).data
		: [...new Map(book.pages.flatMap((page) => page.photos).map((photo) => [photo.id, photo])).values()];
	const spaces = book.isOwner ? (await api.spaces.list({ per_page: 100 })).data : [];

	return { book, photos, spaces };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { api, code } = await editorApi(request, context, params.id);

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
			await api.books.savePages(params.id, body.pages, code);
			return { ok: true as const, skipRevalidate: true };
		}
		if (body.intent === "update") {
			const { data: book } = await api.books.update(params.id, body.changes as never, code);
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

/** The editor works for the book's owner and for anyone holding an access code that allows editing. */
async function editorApi(request: Request, context: Route.LoaderArgs["context"], bookId: string) {
	const { env } = context.get(cloudflareContext);
	const token = await readToken(request);
	const code = (await BookCodes.from(request)).for(bookId);

	return { api: await getServerApi(request, env, token), code, token };
}

export function shouldRevalidate({ actionResult, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
	if (actionResult && typeof actionResult === "object" && "skipRevalidate" in actionResult) return false;
	return defaultShouldRevalidate;
}

type DraftPage = { key: string; layout: PageLayout; frame: FrameStyle | null; caption: string; photos: BookPagePhoto[] };

let keySeq = 0;
const newKey = () => `p${Date.now().toString(36)}${(keySeq++).toString(36)}`;

/** A library photo placed on a page, with its own frame or null to use the page's. */
const placed = (photo: Photo, frame: FrameStyle | null = null): BookPagePhoto => ({ ...photo, frame });

const toDraft = (book: BookWithPages): DraftPage[] => book.pages.map((p) => ({ key: p.id, layout: p.layout, frame: p.frame ?? null, caption: p.caption ?? "", photos: p.photos }));

export default function BookEditor({ loaderData }: Route.ComponentProps) {
	const { book, photos } = loaderData;

	const [pages, setPages] = useState<DraftPage[]>(() => toDraft(book));
	const [selected, setSelected] = useState(0);
	const [slot, setSlot] = useState<number | null>(0);
	const [dirty, setDirty] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [paper, setPaper] = useState<PaperColor>(book.paper ?? "ivory");
	const [bookFrame, setBookFrame] = useState<FrameStyle>(book.frame ?? "none");
	const [dragPage, setDragPage] = useState<number | null>(null);
	const [dropAt, setDropAt] = useState<number | null>(null);

	const saver = useFetcher<typeof action>();
	const lookSaver = useFetcher<typeof action>();
	const saving = saver.state !== "idle" || lookSaver.state !== "idle";
	const saveError = saver.data && "ok" in saver.data && !saver.data.ok ? saver.data.error : null;

	const current = pages[selected];
	const usedIds = useMemo(() => new Set(pages.flatMap((p) => p.photos.map((ph) => ph.id))), [pages]);
	const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

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
					pages: pages.map((p) => ({
						layout: p.layout,
						frame: p.frame,
						caption: p.caption || null,
						photoIds: p.photos.map((ph) => ph.id),
						photoFrames: p.photos.map((ph) => ph.frame),
					})),
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

	const choosePaper = (color: PaperColor) => {
		setPaper(color);
		lookSaver.submit({ intent: "update", changes: { paper: color } }, { method: "post", encType: "application/json" });
	};

	/** Set the frame of the selected page. Null follows the book's frame. */
	const setFrame = (frame: FrameStyle | null) => {
		change((prev) => prev.map((p, i) => (i === selected ? { ...p, frame } : p)));
	};

	/** Set the frame of one photo on the selected page. Null follows the page's frame. */
	const setPhotoFrame = (index: number, frame: FrameStyle | null) => {
		change((prev) => prev.map((p, i) => (i === selected ? { ...p, photos: p.photos.map((ph, j) => (j === index ? { ...ph, frame } : ph)) } : p)));
	};

	/** Make a frame the book's own and let every page follow it. */
	const frameWholeBook = (frame: FrameStyle) => {
		setBookFrame(frame);
		change((prev) => prev.map((p) => ({ ...p, frame: null })));
		lookSaver.submit({ intent: "update", changes: { frame } }, { method: "post", encType: "application/json" });
	};

	const select = (index: number) => {
		setSelected(index);
		setSlot(0);
	};

	const addPage = (layout: PageLayout = "framed", withPhotos: Photo[] = []) => {
		const at = pages.length ? selected + 1 : 0;
		change((prev) => {
			const next = [...prev];
			next.splice(at, 0, { key: newKey(), layout, frame: null, caption: "", photos: withPhotos.map((photo) => placed(photo)) });
			return next;
		});
		select(at);
	};

	const removePage = (index: number) => {
		change((prev) => prev.filter((_, i) => i !== index));
		setSelected((s) => Math.max(0, Math.min(s > index ? s - 1 : s, pages.length - 2)));
	};

	const movePage = (from: number, to: number) => {
		if (from === to || to < 0 || to > pages.length) return;
		const target = to > from ? to - 1 : to;
		change((prev) => {
			const next = [...prev];
			const [page] = next.splice(from, 1);
			next.splice(target, 0, page);
			return next;
		});
		setSelected(target);
	};

	const setLayout = (layout: PageLayout) => {
		change((prev) => prev.map((p, i) => (i === selected ? { ...p, layout, photos: p.photos.slice(0, PAGE_LAYOUTS[layout].slots) } : p)));
		setSlot(0);
	};

	/** Put a photo in a slot of a page (the selected slot, or the next free one). */
	const placePhoto = (photo: Photo, pageIndex = selected, targetSlot: number | null = slot) => {
		const page = pages[pageIndex];
		if (!page) {
			addPage("framed", [photo]);
			return;
		}
		const max = PAGE_LAYOUTS[page.layout].slots;
		if (max === 0) return;
		const target = targetSlot !== null && targetSlot < max ? targetSlot : Math.min(page.photos.length, max - 1);
		change((prev) =>
			prev.map((p, i) => {
				if (i !== pageIndex) return p;
				const next = [...p.photos];
				if (target >= next.length) next.push(placed(photo));
				else next[target] = placed(photo, next[target].frame);
				return { ...p, photos: next.slice(0, max) };
			}),
		);
		if (pageIndex === selected) setSlot(target + 1 < max ? target + 1 : target);
	};

	const removePhoto = (index: number) => {
		change((prev) => prev.map((p, i) => (i === selected ? { ...p, photos: p.photos.filter((_, j) => j !== index) } : p)));
	};

	/** Give every photo not yet in the book a page, mixing layouts. */
	const addUnused = () => {
		const unused = photos.filter((p) => !usedIds.has(p.id));
		if (!unused.length) return;
		const layouts: PageLayout[] = ["single", "framed", "pair", "collage", "framed", "grid"];
		const added: DraftPage[] = [];
		let i = 0;
		let n = 0;
		while (i < unused.length) {
			const layout = layouts[n++ % layouts.length];
			const count = PAGE_LAYOUTS[layout].slots;
			added.push({ key: newKey(), layout, frame: null, caption: "", photos: unused.slice(i, i + count).map((photo) => placed(photo)) });
			i += count;
		}
		change((prev) => [...prev, ...added]);
		select(pages.length);
	};

	// The spread that holds the selected page. Page 1 sits on the right,
	// facing the title page, like in the reader.
	const leftIndex = selected % 2 === 0 ? selected - 1 : selected;
	const rightIndex = leftIndex + 1;

	const renderSpreadPage = (index: number, side: "left" | "right") => {
		const page = pages[index];
		const isSelected = index === selected;

		if (index < 0) {
			return (
				<div className="relative h-full" style={{ containerType: "size" }}>
					<TitlePageView book={FlipbookModel.book(book)} side={side} />
					<span className="absolute inset-x-0 bottom-3 text-center text-[11px] tracking-wide text-ink-500/70 uppercase">Title page</span>
				</div>
			);
		}
		if (!page) {
			return (
				<button
					type="button"
					onClick={() => addPage()}
					className={`fb-paper fb-paper-${paper} flex h-full w-full flex-col items-center justify-center gap-2 text-ink-500 transition hover:text-brand-700`}
				>
					<span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-current text-2xl">+</span>
					<span className="text-sm font-medium">Add a page</span>
				</button>
			);
		}

		return (
			<div className="relative h-full" style={{ containerType: "size" }}>
				<PageView
					page={FlipbookModel.page(page)}
					number={index + 1}
					side={side}
					onSlotClick={isSelected ? setSlot : undefined}
					onSlotDrop={(s, id) => {
						const photo = photoById.get(id);
						if (photo) placePhoto(photo, index, s);
						if (!isSelected) select(index);
					}}
					activeSlot={isSelected ? slot : null}
				/>
				{!isSelected && (
					<button
						type="button"
						onClick={() => select(index)}
						className="absolute inset-0 bg-white/0 transition hover:bg-white/25"
						aria-label={`Edit page ${index + 1}`}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							const photo = photoById.get(e.dataTransfer.getData(PHOTO_DRAG_TYPE));
							if (photo) {
								e.preventDefault();
								placePhoto(photo, index, null);
								select(index);
							}
						}}
					/>
				)}
				{isSelected && <div className="pointer-events-none absolute inset-0 ring-2 ring-brand-500 ring-inset" />}
			</div>
		);
	};

	const status = saveError ? (
		<span className="text-red-700">Couldn't save: {saveError}</span>
	) : dirty || saving ? (
		<span className="flex items-center gap-1.5 text-ink-500">
			<Spinner className="h-3.5 w-3.5" /> Saving…
		</span>
	) : (
		<span className="flex items-center gap-1 text-ink-500">
			<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
				<path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			All changes saved
		</span>
	);

	return (
		<BookLookProvider paper={paper} frame={bookFrame}>
			<div className="flex h-dvh flex-col bg-[#ece6da]">
				{/* Header */}
				<header className="flex items-center gap-3 border-b border-surface-300/70 bg-surface-50 px-3 py-2.5 sm:px-5">
					<Link prefetch="intent"
						to={book.isOwner ? "/books" : `/books/${book.id}`}
						className="rounded-full p-2 text-ink-700 hover:bg-surface-200"
						aria-label={book.isOwner ? "Back to your books" : "Back to the book"}
					>
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</Link>
					<div className="min-w-0 flex-1">
						<p className="truncate font-serif text-lg leading-tight text-ink-900">{book.title}</p>
						<div className="text-xs">{status}</div>
					</div>
					<Button variant="secondary" onClick={() => setSettingsOpen(true)} className="hidden sm:inline-flex">
						Book settings
					</Button>
					<Button variant="ghost" onClick={() => setSettingsOpen(true)} className="sm:hidden" aria-label="Book settings">
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
						</svg>
					</Button>
					<Link prefetch="intent" to={`/books/${book.id}`} className={buttonClass("primary")}>
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<path d="M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5v13c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5z" strokeLinejoin="round" />
							<path d="M12 6v13" />
						</svg>
						Read
					</Link>
				</header>

				<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
					{/* Page list: drag to reorder */}
					<aside className="shrink-0 border-surface-300/70 bg-surface-50 lg:w-52 lg:border-r">
						<div className="flex items-center justify-between px-4 pt-3 pb-2">
							<h2 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Pages · {pages.length}</h2>
							<button type="button" onClick={() => addPage()} className="text-sm font-medium text-brand-700 hover:underline">
								+ Add
							</button>
						</div>
						<ol
							className="flex gap-3 overflow-x-auto px-4 pb-4 lg:max-h-[calc(100dvh-110px)] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto"
							onDragLeave={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null);
							}}
						>
							{pages.map((page, i) => (
								<li
									key={page.key}
									className={`group relative shrink-0 transition-opacity ${dragPage === i ? "opacity-40" : ""}`}
									draggable
									onDragStart={(e) => {
										setDragPage(i);
										e.dataTransfer.effectAllowed = "move";
										e.dataTransfer.setData("text/plain", String(i));
									}}
									onDragEnd={() => {
										setDragPage(null);
										setDropAt(null);
									}}
									onDragOver={(e) => {
										if (dragPage === null) return;
										e.preventDefault();
										const rect = e.currentTarget.getBoundingClientRect();
										const vertical = rect.height > rect.width;
										const after = vertical ? e.clientY > rect.top + rect.height / 2 : e.clientX > rect.left + rect.width / 2;
										setDropAt(after ? i + 1 : i);
									}}
									onDrop={(e) => {
										e.preventDefault();
										if (dragPage !== null && dropAt !== null) movePage(dragPage, dropAt);
										setDragPage(null);
										setDropAt(null);
									}}
								>
									{dropAt === i && dragPage !== null && <DropMarker />}
									<button
										type="button"
										onClick={() => select(i)}
										className={`block w-20 cursor-grab overflow-hidden rounded-[3px] shadow-[0_2px_8px_rgb(0_0_0/0.12)] ring-2 transition active:cursor-grabbing lg:w-full ${
											i === selected ? "ring-brand-500" : "ring-transparent hover:ring-surface-300"
										}`}
										aria-label={`Page ${i + 1}`}
										aria-current={i === selected}
									>
										<div className="relative aspect-[3/4]" style={{ containerType: "size" }}>
											<PageView page={FlipbookModel.page(page)} />
										</div>
									</button>
									<div className="mt-1 flex items-center justify-between text-xs text-ink-500">
										<span>{i + 1}</span>
										<span className="flex gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
											<IconButton label="Move up" onClick={() => movePage(i, i - 1)} disabled={i === 0} path="M12 19V5m-6 6 6-6 6 6" />
											<IconButton label="Move down" onClick={() => movePage(i, i + 2)} disabled={i === pages.length - 1} path="M12 5v14m6-6-6 6-6-6" />
											<IconButton label="Delete page" onClick={() => removePage(i)} path="M6 7h12M9 7V5h6v2m-8 0 1 12h8l1-12" />
										</span>
									</div>
									{dropAt === i + 1 && i === pages.length - 1 && dragPage !== null && <DropMarker />}
								</li>
							))}
							{pages.length === 0 && <li className="text-sm text-ink-500">No pages yet.</li>}
						</ol>
					</aside>

					{/* The open spread */}
					<section className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-4 sm:p-6">
						{current ? (
							<>
								<div className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-white p-1 shadow-sm">
									{(Object.keys(PAGE_LAYOUTS) as PageLayout[]).map((layout) => (
										<button
											key={layout}
											type="button"
											onClick={() => setLayout(layout)}
											className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
												current.layout === layout ? "bg-ink-900 text-surface-50" : "text-ink-700 hover:bg-surface-100"
											}`}
											aria-pressed={current.layout === layout}
										>
											<LayoutIcon layout={layout} />
											<span className="hidden sm:inline">{PAGE_LAYOUTS[layout].label}</span>
										</button>
									))}
								</div>

								<div className="relative w-full max-w-[min(56rem,calc((100dvh-310px)*1.5))] min-w-64">
									<div className="absolute -inset-x-3 -bottom-5 h-8 rounded-[50%] bg-black/25 blur-xl" />
									<div className="relative grid aspect-[3/2] grid-cols-2 bg-surface-50 shadow-[0_18px_50px_rgb(60_40_20/0.25)]">
										<div className="relative overflow-hidden">
											{renderSpreadPage(leftIndex, "left")}
											<div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/15 to-transparent" />
										</div>
										<div className="relative overflow-hidden">
											{renderSpreadPage(rightIndex, "right")}
											<div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/15 to-transparent" />
										</div>
									</div>
								</div>

								<div className="mt-2 flex w-full max-w-xl shrink-0 flex-col gap-3">
									{slot !== null && current.photos[slot] && (
										<div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
											<span className="text-ink-500">Photo {slot + 1} is selected. Pick or drop another to replace it.</span>
											<button type="button" onClick={() => removePhoto(slot)} className="font-medium text-red-700 hover:underline">
												Remove
											</button>
										</div>
									)}
									<div className="flex items-center gap-3">
										{current.layout === "text" ? (
											<Textarea
												value={current.caption}
												onChange={(e) => change((prev) => prev.map((p, i) => (i === selected ? { ...p, caption: e.target.value } : p)))}
												placeholder="Write a memory, a quote or a dedication"
												maxLength={500}
												rows={2}
											/>
										) : (
											<Input
												value={current.caption}
												onChange={(e) => change((prev) => prev.map((p, i) => (i === selected ? { ...p, caption: e.target.value } : p)))}
												placeholder={`Caption for page ${selected + 1}`}
												maxLength={500}
											/>
										)}
										<div className="flex shrink-0 items-center gap-1.5" role="radiogroup" aria-label="Paper colour">
											{(Object.keys(PAPER_COLORS) as PaperColor[]).map((color) => (
												<button
													key={color}
													type="button"
													role="radio"
													aria-checked={paper === color}
													onClick={() => choosePaper(color)}
													title={`${PAPER_COLORS[color].label} paper`}
													className={`h-7 w-7 rounded-full border border-black/15 shadow-inner transition ${
														paper === color ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-[#ece6da]" : "hover:scale-110"
													}`}
													style={{ background: PAPER_COLORS[color].swatch }}
												/>
											))}
										</div>
									</div>
									<FramePicker
										key={`${current.key}:${slot}`}
										page={current}
										slot={slot !== null && current.photos[slot] ? slot : null}
										paper={paper}
										bookFrame={bookFrame}
										sample={current.photos[0] ?? photos[0] ?? null}
										onPick={setFrame}
										onPickPhoto={setPhotoFrame}
										onUseEverywhere={frameWholeBook}
									/>
								</div>
							</>
						) : (
							<div className="m-auto max-w-sm text-center">
								<h2 className="font-serif text-2xl">This book has no pages yet</h2>
								<p className="mt-2 text-ink-500">Drag photos from the right onto a page, or fill the book with everything you've uploaded.</p>
								<div className="mt-5 flex justify-center gap-2">
									<Button onClick={() => addPage()}>Add a page</Button>
									{book.isOwner && photos.length > 0 && (
										<Button variant="secondary" onClick={addUnused}>
											Fill with my photos
										</Button>
									)}
								</div>
							</div>
						)}
					</section>

					{/* Photo tray: click or drag onto a page */}
					<aside className="flex min-h-0 shrink-0 flex-col border-surface-300/70 bg-surface-50 lg:w-80 lg:border-l">
						<div className="flex items-center justify-between px-4 pt-3 pb-2">
							<h2 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{book.isOwner ? "Your photos" : "Photos in this book"}</h2>
							{photos.some((p) => !usedIds.has(p.id)) && (
								<button type="button" onClick={addUnused} className="text-sm font-medium text-brand-700 hover:underline">
									Add unused as pages
								</button>
							)}
						</div>
						{book.isOwner ? (
							<div className="px-4 pb-3">
								<PhotoUploader action={`/books/${book.id}/edit`} compact />
							</div>
						) : (
							book.permissions.includes("add") && <p className="px-4 pb-3 text-xs text-ink-500">To add new photos, open the book and choose Add photos.</p>
						)}
						<p className="hidden px-4 pb-2 text-xs text-ink-500 lg:block">Drag a photo onto a page, or click to place it in the selected spot.</p>
						<ul className="grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-6 lg:grid-cols-3">
							{photos.map((photo) => (
								<li key={photo.id}>
									<button
										type="button"
										draggable
										onDragStart={(e) => {
											e.dataTransfer.setData(PHOTO_DRAG_TYPE, photo.id);
											e.dataTransfer.effectAllowed = "copy";
										}}
										onClick={() => placePhoto(photo)}
										className="group relative block aspect-square w-full cursor-grab overflow-hidden rounded-lg bg-surface-200 shadow-sm active:cursor-grabbing"
										title={current ? "Drag onto a page, or click to place it" : "Start a page with this photo"}
									>
										<img
											src={photo.url}
											alt={photo.caption ?? ""}
											loading="lazy"
											draggable={false}
											className="h-full w-full object-cover transition group-hover:scale-105"
										/>
										{usedIds.has(photo.id) && (
											<span
												className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900/80 text-white"
												title="Already in this book"
											>
												<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
													<path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											</span>
										)}
									</button>
								</li>
							))}
						</ul>
					</aside>
				</div>

				{settingsOpen && (
					<SettingsDrawer
						book={{ ...book, paper }}
						spaces={loaderData.spaces}
						onClose={() => setSettingsOpen(false)}
						bookPhotos={pages.flatMap((p) => p.photos)}
					/>
				)}
			</div>
		</BookLookProvider>
	);
}

/**
 * Frame swatches, each a tiny printed page showing the frame. They set the selected page's frame,
 * or the selected photo's own frame when the picker is switched to that photo.
 */
function FramePicker({
	page,
	slot,
	paper,
	bookFrame,
	sample,
	onPick,
	onPickPhoto,
	onUseEverywhere,
}: {
	page: DraftPage;
	slot: number | null;
	paper: PaperColor;
	bookFrame: FrameStyle;
	sample: Photo | null;
	onPick: (frame: FrameStyle | null) => void;
	onPickPhoto: (slot: number, frame: FrameStyle | null) => void;
	onUseEverywhere: (frame: FrameStyle) => void;
}) {
	const photo = slot !== null ? page.photos[slot] : null;
	const [forPhoto, setForPhoto] = useState(!!photo?.frame);

	if (page.layout === "single" || page.layout === "text") {
		return (
			<p className="text-center text-xs text-ink-500">
				{page.layout === "single" ? "Full-bleed photos print to the edge, so they have no frame." : "Pages of words have no frame."}
			</p>
		);
	}

	const pageFrame = page.frame ?? bookFrame;
	const choosing =
		forPhoto && photo
			? { current: photo.frame, inherited: pageFrame, inheritLabel: "Page's frame" }
			: { current: page.frame, inherited: bookFrame, inheritLabel: "Book's frame" };
	const pick = (frame: FrameStyle | null) => (forPhoto && slot !== null ? onPickPhoto(slot, frame) : onPick(frame));
	const shown = choosing.current ?? choosing.inherited;

	const swatch = (frame: FrameStyle, label: string, value: FrameStyle | null) => {
		const checked = choosing.current === value;

		return (
			<button
				key={label}
				type="button"
				role="radio"
				aria-checked={checked}
				onClick={() => pick(value)}
				title={FRAME_STYLES[frame].description}
				className="group flex flex-col items-center gap-1"
			>
				<span
					className={`fb-paper fb-paper-${paper} relative block aspect-square w-full overflow-hidden rounded-md ring-2 transition ${
						checked ? "ring-brand-500" : "ring-black/5 group-hover:ring-surface-300"
					}`}
					style={{ containerType: "size" }}
				>
					<span className="absolute inset-[12%]">
						<PrintedPhoto photo={FlipbookModel.photo(forPhoto && photo ? photo : sample)} frame={frame} scale={3} />
					</span>
				</span>
				<span className={`text-[11px] leading-tight ${checked ? "font-medium text-ink-900" : "text-ink-500"}`}>{label}</span>
			</button>
		);
	};

	return (
		<div className="rounded-xl bg-white p-3 shadow-sm">
			<div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs">
				<div className="flex items-center gap-2">
					<span className="font-semibold tracking-wide text-ink-500 uppercase">Frame</span>
					{photo && slot !== null && (
						<div className="flex rounded-full bg-surface-100 p-0.5" role="radiogroup" aria-label="Frame for">
							{[
								[false, "This page"],
								[true, `Photo ${slot + 1}`],
							].map(([value, label]) => (
								<button
									key={String(value)}
									type="button"
									role="radio"
									aria-checked={forPhoto === value}
									onClick={() => setForPhoto(value as boolean)}
									className={`rounded-full px-2.5 py-1 font-medium ${forPhoto === value ? "bg-ink-900 text-surface-50" : "text-ink-700 hover:text-ink-900"}`}
								>
									{label}
								</button>
							))}
						</div>
					)}
				</div>
				{!forPhoto && page.frame !== null && page.frame !== bookFrame && (
					<button type="button" onClick={() => onUseEverywhere(page.frame!)} className="font-medium text-brand-700 hover:underline">
						Use {FRAME_STYLES[page.frame].label} on every page
					</button>
				)}
			</div>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-x-2 gap-y-3" role="radiogroup" aria-label={forPhoto ? "Photo frame" : "Page frame"}>
				{swatch(choosing.inherited, choosing.inheritLabel, null)}
				{(Object.keys(FRAME_STYLES) as FrameStyle[]).map((frame) => swatch(frame, FRAME_STYLES[frame].label, frame))}
			</div>
			<p className="mt-1.5 text-xs text-ink-500">{FRAME_STYLES[shown].description}.</p>
		</div>
	);
}

function DropMarker() {
	return <div className="pointer-events-none absolute -top-2 right-0 left-0 z-10 h-1 rounded-full bg-brand-500 lg:-top-2" />;
}

function SettingsDrawer({ book, spaces, bookPhotos, onClose }: { book: BookWithPages; spaces: Space[]; bookPhotos: Photo[]; onClose: () => void }) {
	const fetcher = useFetcher<typeof action>();
	const [title, setTitle] = useState(book.title);
	const [description, setDescription] = useState(book.description ?? "");
	const [theme, setTheme] = useState<BookTheme>(book.theme);
	const [coverDesign, setCoverDesign] = useState<CoverDesign>(book.coverDesign);
	const [coverText, setCoverText] = useState<boolean | null>(book.coverText);
	const [visibility, setVisibility] = useState<Visibility>(book.visibility);
	const [coverPhotoId, setCoverPhotoId] = useState<string | null>(book.coverPhotoId);
	const [spaceId, setSpaceId] = useState(book.spaceId ?? "");
	const [copied, setCopied] = useState(false);
	const saving = fetcher.state !== "idle";
	const uniquePhotos = useMemo(() => [...new Map(bookPhotos.map((p) => [p.id, p])).values()], [bookPhotos]);
	const coverPhoto = uniquePhotos.find((p) => p.id === coverPhotoId) ?? uniquePhotos[0] ?? null;
	const cover = { ...book, title: title || "Untitled", description, theme, coverDesign, coverText, coverPhoto };
	const titled = coverHasText(FlipbookModel.cover(cover));
	const submitted = useRef(false);

	useEffect(() => {
		if (submitted.current && fetcher.state === "idle" && fetcher.data && "ok" in fetcher.data && fetcher.data.ok) onClose();
	}, [fetcher.state, fetcher.data, onClose]);

	const save = () => {
		submitted.current = true;
		fetcher.submit(
			{
				intent: "update",
				changes: { title, description: description || null, theme, coverDesign, coverText, coverPhotoId, ...(book.isOwner ? { visibility, spaceId: spaceId || null } : {}) },
			},
			{ method: "post", encType: "application/json" },
		);
	};

	const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/books/${book.id}/view` : "";

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-ink-900/40" onClick={onClose}>
			<div
				className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal
				aria-label="Book settings"
			>
				<div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
					<h2 className="font-serif text-2xl">Book settings</h2>
					<button type="button" onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-surface-100" aria-label="Close">
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
						</svg>
					</button>
				</div>
				<div className="flex-1 space-y-6 px-6 py-6">
					<div className="mx-auto w-40">
						<div className="relative aspect-[3/4] overflow-hidden rounded-r-md shadow-lg" style={{ containerType: "size" }}>
							<CoverView book={FlipbookModel.cover(cover)} />
						</div>
					</div>
					<Field label="Title">
						<Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
					</Field>
					<Field label="Title page text">
						<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
					</Field>
					<CoverDesignPicker
						book={cover}
						onChange={(design) => {
							setCoverDesign(design);
							setCoverText(null);
						}}
					/>
					<label className="flex cursor-pointer items-center gap-3 text-sm text-ink-700">
						<input
							type="checkbox"
							checked={titled}
							onChange={(e) => setCoverText(e.target.checked === coverHasText({ coverDesign }) ? null : e.target.checked)}
							className="h-4 w-4 accent-ink-900"
						/>
						Print the title on the cover
					</label>
					<ClothPicker value={theme} onChange={setTheme} />
					<fieldset>
						<legend className="mb-1.5 text-sm font-medium text-ink-700">Cover photo</legend>
						{uniquePhotos.length ? (
							<div className="grid grid-cols-5 gap-2">
								<button
									type="button"
									onClick={() => setCoverPhotoId(null)}
									className={`flex aspect-square items-center justify-center rounded-md border text-xs text-ink-500 ${coverPhotoId === null ? "border-brand-500 ring-2 ring-brand-500" : "border-surface-300"}`}
								>
									First photo
								</button>
								{uniquePhotos.map((p) => (
									<button
										key={p.id}
										type="button"
										onClick={() => setCoverPhotoId(p.id)}
										className={`aspect-square overflow-hidden rounded-md ${coverPhotoId === p.id ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
									>
										<img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
									</button>
								))}
							</div>
						) : (
							<p className="text-sm text-ink-500">Add photos to your pages to choose a cover photo.</p>
						)}
					</fieldset>
					{book.isOwner && spaces.length > 0 && (
						<Field label="Space">
							<SpacePicker spaces={spaces} value={spaceId} onChange={(e) => setSpaceId(e.target.value)} />
						</Field>
					)}
					{book.isOwner && (
						<fieldset>
							<legend className="mb-1.5 text-sm font-medium text-ink-700">Who can open it</legend>
							<div className="space-y-2">
								{(
									[
										["private", "Only me"],
										["shared", "Anyone with the link"],
									] as [Visibility, string][]
								).map(([value, label]) => (
									<label
										key={value}
										className="flex cursor-pointer items-center gap-3 rounded-xl border border-surface-300 px-4 py-3 text-sm has-[:checked]:border-ink-900"
									>
										<input
											type="radio"
											name="visibility"
											checked={visibility === value || (value === "shared" && visibility === "public")}
											onChange={() => setVisibility(value)}
											className="accent-ink-900"
										/>
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
							<p className="mt-3 text-sm text-ink-500">
								Give people an access code to open it while it's private, or to let them add photos, edit it or claim it.{" "}
								<Link prefetch="intent" to={`/books/${book.id}/access`} className="font-medium text-brand-700 hover:underline">
									Access codes
								</Link>
							</p>
						</fieldset>
					)}
					{fetcher.data && "ok" in fetcher.data && !fetcher.data.ok && <p className="text-sm text-red-700">{fetcher.data.error}</p>}
				</div>
				<div className="flex items-center justify-between gap-3 border-t border-surface-200 px-6 py-4">
					{book.isOwner ? (
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
					) : (
						<span />
					)}
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
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="rounded p-0.5 hover:bg-surface-200 hover:text-ink-900 disabled:opacity-30"
			aria-label={label}
			title={label}
		>
			<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
				<path d={path} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</button>
	);
}

function LayoutIcon({ layout }: { layout: PageLayout }) {
	const drawn: Partial<Record<PageLayout, [number, number, number, number][]>> = {
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
		collage: [
			[1.5, 1.5, 9, 7],
			[1.5, 9.5, 4, 5],
			[6.5, 9.5, 4, 5],
		],
		text: [
			[3, 5, 6, 1],
			[2, 7.5, 8, 1],
			[3, 10, 6, 1],
		],
	};
	const rects = drawn[layout] ?? (PLACED_LAYOUTS[layout]?.slots ?? []).map(({ x, y, width, height }) => [x * 0.12, y * 0.12, width * 0.12, height * 0.12]);

	return (
		<svg viewBox="0 0 12 16" className="h-4 w-3" aria-hidden>
			<rect x="0.5" y="0.5" width="11" height="15" fill="none" stroke="currentColor" strokeOpacity="0.5" />
			{rects.map(([x, y, w, h], i) => (
				<rect key={i} x={x} y={y} width={w} height={h} fill="currentColor" />
			))}
		</svg>
	);
}
