import { useEffect, useState } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import type { Photo } from "@photos/types";
import { requireUser } from "~/lib/session.server";
import { handlePhotoIntent } from "~/lib/photo-actions.server";
import { PhotoUploader } from "~/components/PhotoUploader";
import { Button, Textarea, buttonClass } from "~/components/ui";
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

export default function Photos({ loaderData }: Route.ComponentProps) {
	const { photos, total, pages } = loaderData;
	const [params] = useSearchParams();
	const [open, setOpen] = useState<Photo | null>(null);

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-serif text-4xl text-ink-900">Your photos</h1>
					<p className="mt-1 text-ink-500">
						{total === 0 ? "Everything you upload is kept safe here." : `${total} ${total === 1 ? "photo" : "photos"} kept safe.`}
					</p>
				</div>
				{total > 0 && (
					<Link to="/books" className={buttonClass("secondary")}>
						Make a book
					</Link>
				)}
			</div>

			{params.get("welcome") && total === 0 && (
				<p className="mt-6 rounded-2xl bg-paper-100 px-5 py-4 text-ink-700">
					Welcome! Start by uploading a few photos. Then create a book and lay them out page by page.
				</p>
			)}

			<div className="mt-8">
				<PhotoUploader action="/photos" compact={total > 0} />
			</div>

			{photos.length > 0 && (
				<ul className="mt-8 columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
					{photos.map((photo) => (
						<li key={photo.id} className="mb-3 break-inside-avoid">
							<button
								type="button"
								onClick={() => setOpen(photo)}
								className="group relative block w-full overflow-hidden rounded-xl bg-paper-200"
								style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3" }}
							>
								<img src={photo.url} alt={photo.caption ?? ""} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
								{photo.caption && (
									<span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-3 pt-6 pb-2 text-left text-xs text-white">
										{photo.caption}
									</span>
								)}
							</button>
						</li>
					))}
				</ul>
			)}

			{photos.length < total && (
				<div className="mt-8 text-center">
					<Link to={`?pages=${pages + 1}`} preventScrollReset className={buttonClass("secondary")}>
						Show more photos
					</Link>
				</div>
			)}

			{open && <PhotoDialog photo={open} onClose={() => setOpen(null)} />}
		</main>
	);
}

function PhotoDialog({ photo, onClose }: { photo: Photo; onClose: () => void }) {
	const fetcher = useFetcher<typeof action>();
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
			<div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white md:flex-row" onClick={(e) => e.stopPropagation()}>
				<div className="flex min-h-0 flex-1 items-center justify-center bg-ink-900">
					<img src={photo.url} alt={photo.caption ?? ""} className="max-h-[60vh] w-full object-contain md:max-h-[80vh]" />
				</div>
				<div className="flex w-full flex-col gap-4 p-6 md:w-80">
					<div className="flex items-start justify-between">
						<h2 className="font-serif text-2xl">Photo</h2>
						<button type="button" onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-paper-100" aria-label="Close">
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
