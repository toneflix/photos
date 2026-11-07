import { useState } from "react";
import { Link } from "react-router";
import type { PublicPhoto, PublicPhotoDetail } from "@photos/types";
import { DownloadDialog } from "~/components/DownloadDialog";
import { Owner } from "~/components/explore/Owner";
import { ContentCounts } from "~/components/ContentCounts";
import { PublicPhotoGrid } from "~/components/explore/PublicPhotoGrid";
import { buttonClass } from "~/components/ui";
import { creditLine, guardImage, licenseFor } from "~/lib/licenses";
import { copyText } from "~/lib/toast";

/**
 * A public photo held still beside its details, or above them on phones, while the details and
 * more photos scroll. `onClose` turns the way back into a close button, for the photo dialog.
 */
export function PhotoView({ photo, more, onClose }: { photo: PublicPhotoDetail; more: PublicPhoto[]; onClose?: () => void }) {
	const license = licenseFor(photo.license);
	const [downloading, setDownloading] = useState(false);

	return (
		<div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-8">
			<div className="sticky top-[var(--photo-top)] z-10 -mx-4 bg-canvas px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex lg:h-[var(--photo-height)] lg:items-center lg:justify-center lg:px-0 lg:py-6">
				<img
					src={photo.url}
					alt={photo.caption ?? ""}
					className="mx-auto max-h-[45dvh] w-auto max-w-full rounded-xl object-contain select-none lg:max-h-full"
					{...guardImage(license)}
					style={{
						aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : undefined,
					}}
				/>
			</div>

			<div className="min-w-0 space-y-6 lg:py-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2">
						<Owner owner={photo.owner} />
						{photo.space && (
							<Link prefetch="intent" to={`/spaces/${photo.space.slug}`} className="truncate text-sm text-ink-500 hover:text-ink-900">
								in <span className="font-semibold text-brand-700">{photo.space.name}</span>
							</Link>
						)}
					</div>
					<div className="flex items-center gap-4">
						{onClose ? (
							<button type="button" onClick={onClose} className="text-sm font-medium text-ink-500 hover:text-ink-900">
								Close
							</button>
						) : (
							<Link
								prefetch="intent"
								to={photo.space ? `/spaces/${photo.space.slug}` : "/explore"}
								className="text-sm font-medium text-ink-500 hover:text-ink-900"
							>
								{photo.space ? `Back to ${photo.space.name}` : "Back to Explore"}
							</Link>
						)}
						{license.downloadable && (
							<button type="button" onClick={() => setDownloading(true)} className={buttonClass("primary")}>
								<IconDownload /> Download
							</button>
						)}
					</div>
				</div>

				<div>
					{photo.caption && <p className="text-lg text-ink-900">{photo.caption}</p>}
					<p className="mt-1 text-sm text-ink-500">
						{photo.takenAt ? `Taken ${formatDate(photo.takenAt)} · ` : ""}Shared {formatDate(photo.publishedAt ?? photo.createdAt)}
					</p>
					<ContentCounts stats={photo.stats} className="mt-2" />
				</div>

				<LicensePanel photo={photo} />

				{photo.books.length > 0 && (
					<div>
						<p className="text-xs font-semibold tracking-widest text-ink-500 uppercase">In {photo.books.length === 1 ? "a book" : "books"}</p>
						<ul className="mt-2 space-y-2">
							{photo.books.map((book) => (
								<li key={book.id}>
									<Link
										prefetch="intent"
										to={`/books/${book.id}?page=${book.page}`}
										className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-3 transition hover:border-ink-500"
									>
										<span className={`h-12 w-9 shrink-0 rounded-sm shadow cover-${book.theme}`} aria-hidden />
										<span className="min-w-0">
											<span className="block truncate font-display font-bold text-ink-900">{book.title}</span>
											<span className="text-sm text-brand-700">Open at page {book.page}</span>
										</span>
									</Link>
								</li>
							))}
						</ul>
					</div>
				)}

				{more.length > 0 && (
					<section className="pt-4">
						<h2 className="mb-4 font-display text-xl font-bold tracking-tight text-ink-900">More to explore</h2>
						<PublicPhotoGrid photos={more} className="columns-2 md:columns-3 lg:columns-2" />
					</section>
				)}
			</div>
			{downloading && <DownloadDialog photo={photo} href={`/explore/photos/${photo.id}/download`} onClose={() => setDownloading(false)} />}
		</div>
	);
}

/** What visitors may do with the photo, and how to credit it when the licence asks for credit. */
function LicensePanel({ photo }: { photo: PublicPhotoDetail }) {
	const license = licenseFor(photo.license);
	const credit = creditLine(photo, license);

	return (
		<div className="panel rounded-xl p-4">
			<p className="text-xs font-semibold tracking-widest text-ink-500 uppercase">Licence</p>
			<p className="mt-1.5 flex items-center gap-2 font-display font-bold text-ink-900">
				{license.downloadable ? <IconOpen /> : <IconLock />}
				{license.label}
			</p>
			<p className="mt-1 text-sm text-ink-500">{license.summary}</p>
			{license.credit && (
				<div className="mt-3 rounded-lg bg-surface-100 p-3">
					<p className="text-xs font-semibold text-ink-700">Credit it like this</p>
					<p className="mt-1 text-sm text-ink-900">{credit}</p>
					<button type="button" onClick={() => copyText(credit, "Credit copied.")} className="mt-2 text-sm font-medium text-brand-700 hover:underline">
						Copy credit
					</button>
				</div>
			)}
			<p className="mt-3 text-sm">
				{license.url && (
					<>
						<a href={license.url} target="_blank" rel="noreferrer license" className="font-medium text-brand-700 hover:underline">
							{license.name}
						</a>
						<span className="text-ink-300"> · </span>
					</>
				)}
				<Link prefetch="intent" to="/licenses" className="font-medium text-brand-700 hover:underline">
					About licences
				</Link>
			</p>
		</div>
	);
}

function IconDownload() {
	return (
		<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
			<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function IconLock() {
	return (
		<svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<rect x="5" y="11" width="14" height="9" rx="2" />
			<path d="M8 11V8a4 4 0 0 1 8 0v3" />
		</svg>
	);
}

function IconOpen() {
	return (
		<svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-700" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<rect x="5" y="11" width="14" height="9" rx="2" />
			<path d="M8 11V8a4 4 0 0 1 7.5-2" strokeLinecap="round" />
		</svg>
	);
}

const formatDate = (value: string) =>
	new Date(value).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
