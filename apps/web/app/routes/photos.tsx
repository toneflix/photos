import { useEffect, useMemo, useState } from "react";
import { Form, Link, useFetcher, useNavigation, useSearchParams } from "react-router";
import type { Photo } from "@photos/types";
import { requireUser } from "~/lib/session.server";
import { handlePhotoIntent } from "~/lib/photo-actions.server";
import { PhotoUploader } from "~/components/PhotoUploader";
import { Button, Input, Textarea, buttonClass } from "~/components/ui";
import type { Route } from "./+types/photos";

export const meta = () => [{ title: "Your photos · Toneflix Photos" }];

const PER_PAGE = 120;

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const pages = Math.max(1, Number(new URL(request.url).searchParams.get("pages")) || 1);
	const result = await api.photos.list({ page: 1, per_page: Math.min(PER_PAGE * pages, 600) });
	return { photos: result.data, total: result.meta.total, pages };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	return handlePhotoIntent(api, await request.formData());
}

/** Group photos by the month they were taken (or uploaded). */
function groupByMonth(photos: Photo[]) {
	const groups = new Map<string, { label: string; photos: Photo[] }>();
	for (const photo of photos) {
		const date = new Date(photo.takenAt ?? photo.createdAt);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		const label = date.toLocaleDateString("en", { month: "long", year: "numeric" });
		if (!groups.has(key)) groups.set(key, { label, photos: [] });
		groups.get(key)!.photos.push(photo);
	}
	return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, g]) => g);
}

export default function Photos({ loaderData }: Route.ComponentProps) {
	const { photos, total, pages } = loaderData;
	const [params] = useSearchParams();
	const [open, setOpen] = useState<Photo | null>(null);
	const [selecting, setSelecting] = useState(false);
	const [picked, setPicked] = useState<string[]>([]);
	const groups = useMemo(() => groupByMonth(photos), [photos]);

	const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
	const stopSelecting = () => {
		setSelecting(false);
		setPicked([]);
	};

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 sm:py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display font-bold tracking-tight text-4xl text-ink-900">Your photos</h1>
					<p className="mt-1 text-ink-500">
						{total === 0 ? "Everything you upload is kept safe here." : `${total} ${total === 1 ? "photo" : "photos"} kept safe.`}
					</p>
				</div>
				{total > 0 &&
					(selecting ? (
						<Button variant="ghost" onClick={stopSelecting}>
							Cancel
						</Button>
					) : (
						<Button variant="secondary" onClick={() => setSelecting(true)}>
							Select photos for a book
						</Button>
					))}
			</div>

			{params.get("welcome") && total === 0 && (
				<p className="mt-6 rounded-xl bg-surface-100 px-5 py-4 text-ink-700">
					Welcome! Start by uploading a few photos. Then pick the ones you love and turn them into a book.
				</p>
			)}

			{!selecting && (
				<div className="mt-8">
					<PhotoUploader action="/photos" compact={total > 0} />
				</div>
			)}

			{groups.map((group) => (
				<section key={group.label} className="mt-10">
					<div className="sticky top-[61px] z-10 -mx-2 mb-3 flex items-center justify-between bg-surface-50/90 px-2 py-2 backdrop-blur">
						<h2 className="font-display font-bold tracking-tight text-xl text-ink-900">{group.label}</h2>
						{selecting && (
							<button
								type="button"
								className="text-sm font-medium text-brand-700 hover:underline"
								onClick={() => {
									const ids = group.photos.map((p) => p.id);
									const all = ids.every((id) => picked.includes(id));
									setPicked((list) => (all ? list.filter((id) => !ids.includes(id)) : [...new Set([...list, ...ids])]));
								}}
							>
								{group.photos.every((p) => picked.includes(p.id)) ? "Clear month" : "Select month"}
							</button>
						)}
					</div>
					<ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
						{group.photos.map((photo) => {
							const order = picked.indexOf(photo.id);
							return (
								<li key={photo.id} className="mb-3 break-inside-avoid">
									<button
										type="button"
										onClick={() => (selecting ? toggle(photo.id) : setOpen(photo))}
										className={`group relative block w-full overflow-hidden rounded-lg bg-surface-200 transition ${
											order >= 0 ? "ring-4 ring-brand-500 ring-offset-2 ring-offset-surface-50" : ""
										}`}
										style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3" }}
										aria-pressed={selecting ? order >= 0 : undefined}
									>
										<img
											src={photo.url}
											alt={photo.caption ?? ""}
											loading="lazy"
											decoding="async"
											className={`fade-in-img h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${order >= 0 ? "scale-[0.97]" : ""}`}
										/>
										<span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
										{photo.caption && (
											<span className="absolute inset-x-0 bottom-0 truncate px-3 pb-2 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
												{photo.caption}
											</span>
										)}
										{photo.visibility === "public" && !selecting && (
											<span className="absolute top-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
												On Explore
											</span>
										)}
										{selecting && (
											<span
												className={`absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${
													order >= 0 ? "border-brand-700 bg-brand-700 text-white" : "border-white bg-black/20"
												}`}
											>
												{order >= 0 ? order + 1 : ""}
											</span>
										)}
									</button>
								</li>
							);
						})}
					</ul>
				</section>
			))}

			{photos.length < total && (
				<div className="mt-8 text-center">
					<Link to={`?pages=${pages + 1}`} preventScrollReset className={buttonClass("secondary")}>
						Show more photos
					</Link>
				</div>
			)}

			{selecting && <SelectionBar picked={picked} onClear={stopSelecting} />}
			{open && <PhotoDialog photo={open} onClose={() => setOpen(null)} />}
		</main>
	);
}

/** Floating bar for turning the picked photos into a new book. */
function SelectionBar({ picked, onClear }: { picked: string[]; onClear: () => void }) {
	const busy = useNavigation().state !== "idle";

	return (
		<div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
			<Form method="post" className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-xl bg-ink-900 p-3 pl-5 text-surface-50 shadow-2xl sm:flex-nowrap">
				<input type="hidden" name="intent" value="make-book" />
				{picked.map((id) => (
					<input key={id} type="hidden" name="photoIds" value={id} />
				))}
				<p className="shrink-0 text-sm">
					<span className="font-semibold">{picked.length}</span> {picked.length === 1 ? "photo" : "photos"} picked
				</p>
				<Input name="title" placeholder="Name your book" className="min-w-0 flex-1 !border-white/20 !bg-white/10 !py-2 !text-surface-50 placeholder:!text-white/50" />
				<button
					type="submit"
					disabled={!picked.length || busy}
					className="shrink-0 rounded-full bg-gold-400 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-300 disabled:opacity-40"
				>
					{busy ? "Making your book…" : "Make a book"}
				</button>
				<button type="button" onClick={onClear} className="shrink-0 text-sm text-white/60 hover:text-white">
					Cancel
				</button>
			</Form>
		</div>
	);
}

function PhotoDialog({ photo: initial, onClose }: { photo: Photo; onClose: () => void }) {
	const fetcher = useFetcher<typeof action>();
	const visibility = useFetcher<typeof action>();
	const updated = visibility.data && "photo" in visibility.data ? visibility.data.photo : undefined;
	const pending = visibility.formData?.get("visibility");
	const photo = updated ?? initial;
	const isPublic = pending ? pending === "public" : photo.visibility === "public";
	const deleting = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "delete";
	const saving = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "caption";

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.ok && !("photo" in fetcher.data && fetcher.data.photo)) onClose();
	}, [fetcher.state, fetcher.data, onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal>
			<div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white md:flex-row" onClick={(e) => e.stopPropagation()}>
				<div className="flex min-h-0 flex-1 items-center justify-center bg-ink-900">
					<img src={photo.url} alt={photo.caption ?? ""} className="max-h-[60vh] w-full object-contain md:max-h-[80vh]" />
				</div>
				<div className="flex w-full flex-col gap-4 p-6 md:w-80">
					<div className="flex items-start justify-between">
						<h2 className="font-display font-bold tracking-tight text-2xl">Photo</h2>
						<button type="button" onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-surface-100" aria-label="Close">
							<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
						</button>
					</div>
					<dl className="space-y-1 text-sm text-ink-500">
						{photo.width && photo.height && (
							<div>
								{photo.width} × {photo.height} px · {(photo.size / 1024 / 1024).toFixed(1)} MB
							</div>
						)}
						{photo.takenAt && <div>{new Date(photo.takenAt).toLocaleDateString(undefined, { dateStyle: "long" })}</div>}
					</dl>
					<visibility.Form method="post" className="flex items-start justify-between gap-4 rounded-lg bg-surface-100 p-3">
						<input type="hidden" name="intent" value="visibility" />
						<input type="hidden" name="photoId" value={photo.id} />
						<input type="hidden" name="visibility" value={isPublic ? "private" : "public"} />
						<span className="text-sm">
							<span className="block font-semibold text-ink-900">Show on Explore</span>
							<span className="text-ink-500">{isPublic ? "Anyone can see this photo." : "Only you can see this photo."}</span>
							{isPublic && (
								<Link to={`/explore/photos/${photo.id}`} className="mt-1 block font-medium text-brand-700 hover:underline">
									View on Explore
								</Link>
							)}
						</span>
						<button
							type="submit"
							role="switch"
							aria-checked={isPublic}
							aria-label="Show on Explore"
							className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${isPublic ? "bg-brand-700" : "bg-surface-300"}`}
						>
							<span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${isPublic ? "translate-x-5" : ""}`} />
						</button>
					</visibility.Form>
					<fetcher.Form method="post" className="space-y-3">
						<input type="hidden" name="intent" value="caption" />
						<input type="hidden" name="photoId" value={photo.id} />
						<Textarea name="caption" rows={3} defaultValue={photo.caption ?? ""} placeholder="Add a caption" maxLength={2000} />
						<Button type="submit" variant="secondary" disabled={saving} className="w-full">
							{saving ? "Saving…" : "Save caption"}
						</Button>
					</fetcher.Form>
					<fetcher.Form
						method="post"
						className="mt-auto"
						onSubmit={(e) => {
							if (!confirm("Delete this photo? It will also be removed from any books.")) e.preventDefault();
						}}
					>
						<input type="hidden" name="intent" value="delete" />
						<input type="hidden" name="photoId" value={photo.id} />
						<Button type="submit" variant="danger" disabled={deleting} className="w-full">
							{deleting ? "Deleting…" : "Delete photo"}
						</Button>
					</fetcher.Form>
				</div>
			</div>
		</div>
	);
}
