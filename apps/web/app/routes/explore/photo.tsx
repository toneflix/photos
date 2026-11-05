import { useState } from "react";
import { data, Link } from "react-router";
import type { PublicPhotoDetail } from "@photos/types";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi, PhotosApiError } from "~/lib/api.server";
import { Owner } from "~/components/explore/Owner";
import { PublicPhotoGrid } from "~/components/explore/PublicPhotoGrid";
import { buttonClass } from "~/components/ui";
import { creditLine, guardImage, licenseFor } from "~/lib/licenses";
import type { Route } from "./+types/photo";

export function meta({ loaderData }: Route.MetaArgs) {
	const photo = loaderData?.photo;

	if (!photo) return [{ title: "Photo not found · Toneflix Photos" }];

	const by = photo.owner.name ? ` by ${photo.owner.name}` : "";

	return [
		{ title: `${photo.caption || "Photo"}${by} · Toneflix Photos` },
		{
			name: "description",
			content: photo.caption ?? `A photo${by} on Toneflix Photos.`,
		},
		{ property: "og:image", content: photo.url },
	];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);

	try {
		const [{ data: photo }, { data: more }] = await Promise.all([api.explore.photo(params.id), api.explore.photos({ per_page: 21 })]);

		return {
			photo,
			more: more.filter((item) => item.id !== photo.id).slice(0, 20),
		};
	} catch (error) {
		if (error instanceof PhotosApiError && error.code === 404) throw data("Photo not found", { status: 404 });

		throw error;
	}
}

export default function ExplorePhoto({ loaderData }: Route.ComponentProps) {
	const { photo, more } = loaderData;
	const license = licenseFor(photo.license);

	return (
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<Owner owner={photo.owner} />
					{photo.space && (
						<Link to={`/spaces/${photo.space.slug}`} className="truncate text-sm text-ink-500 hover:text-ink-900">
							in <span className="font-semibold text-brand-700">{photo.space.name}</span>
						</Link>
					)}
				</div>
				<div className="flex items-center gap-4">
					<Link to={photo.space ? `/spaces/${photo.space.slug}` : "/explore"} className="text-sm font-medium text-ink-500 hover:text-ink-900">
						{photo.space ? `Back to ${photo.space.name}` : "Back to Explore"}
					</Link>
					{license.downloadable && (
						<a href={`/explore/photos/${photo.id}/download`} download className={buttonClass("primary")}>
							<IconDownload /> Download
						</a>
					)}
				</div>
			</div>

			<div className="mt-5 flex justify-center rounded-xl bg-surface-100">
				<img
					src={photo.url}
					alt={photo.caption ?? ""}
					className="max-h-[78vh] w-auto max-w-full rounded-xl object-contain select-none"
					{...guardImage(license)}
					style={{
						aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : undefined,
					}}
				/>
			</div>

			<div className="mt-5 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
				<div className="min-w-0">
					{photo.caption && <p className="max-w-2xl text-lg text-ink-900">{photo.caption}</p>}
					<p className="mt-1 text-sm text-ink-500">
						{photo.takenAt ? `Taken ${formatDate(photo.takenAt)} · ` : ""}Shared {formatDate(photo.publishedAt ?? photo.createdAt)}
					</p>
				</div>

				<div className="w-full shrink-0 space-y-6 md:w-80">
					<LicensePanel photo={photo} />

					{photo.books.length > 0 && (
						<div>
							<p className="text-xs font-semibold tracking-widest text-ink-500 uppercase">In {photo.books.length === 1 ? "a book" : "books"}</p>
							<ul className="mt-2 space-y-2">
								{photo.books.map((book) => (
									<li key={book.id}>
										<Link
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
				</div>
			</div>

			{more.length > 0 && (
				<section className="mt-14">
					<h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-ink-900">More to explore</h2>
					<PublicPhotoGrid photos={more} />
				</section>
			)}
		</main>
	);
}

/** What visitors may do with the photo, and how to credit it when the licence asks for credit. */
function LicensePanel({ photo }: { photo: PublicPhotoDetail }) {
	const license = licenseFor(photo.license);
	const credit = creditLine(photo, license);
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		await navigator.clipboard?.writeText(credit).catch(() => undefined);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="rounded-xl border border-surface-200 bg-white p-4">
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
					<button type="button" onClick={copy} className="mt-2 text-sm font-medium text-brand-700 hover:underline">
						{copied ? "Copied" : "Copy credit"}
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
				<Link to="/licenses" className="font-medium text-brand-700 hover:underline">
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
