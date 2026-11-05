import { data, Link } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi, PhotosApiError } from "~/lib/api.server";
import { Owner } from "~/components/explore/Owner";
import { PublicPhotoGrid } from "~/components/explore/PublicPhotoGrid";
import type { Route } from "./+types/photo";

export function meta({ loaderData }: Route.MetaArgs) {
	const photo = loaderData?.photo;

	if (!photo) return [{ title: "Photo not found · Toneflix Photos" }];

	const by = photo.owner.name ? ` by ${photo.owner.name}` : "";

	return [
		{ title: `${photo.caption || "Photo"}${by} · Toneflix Photos` },
		{ name: "description", content: photo.caption ?? `A photo${by} on Toneflix Photos.` },
		{ property: "og:image", content: photo.url },
	];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);

	try {
		const [{ data: photo }, { data: more }] = await Promise.all([api.explore.photo(params.id), api.explore.photos({ per_page: 21 })]);

		return { photo, more: more.filter((item) => item.id !== photo.id).slice(0, 20) };
	} catch (error) {
		if (error instanceof PhotosApiError && error.code === 404) throw data("Photo not found", { status: 404 });

		throw error;
	}
}

export default function ExplorePhoto({ loaderData }: Route.ComponentProps) {
	const { photo, more } = loaderData;

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
				<Link to={photo.space ? `/spaces/${photo.space.slug}` : "/explore"} className="text-sm font-medium text-ink-500 hover:text-ink-900">
					{photo.space ? `Back to ${photo.space.name}` : "Back to Explore"}
				</Link>
			</div>

			<div className="mt-5 flex justify-center rounded-xl bg-surface-100">
				<img
					src={photo.url}
					alt={photo.caption ?? ""}
					className="max-h-[78vh] w-auto max-w-full rounded-xl object-contain"
					style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : undefined }}
				/>
			</div>

			<div className="mt-5 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
				<div className="min-w-0">
					{photo.caption && <p className="max-w-2xl text-lg text-ink-900">{photo.caption}</p>}
					<p className="mt-1 text-sm text-ink-500">
						{photo.takenAt ? `Taken ${formatDate(photo.takenAt)} · ` : ""}Shared {formatDate(photo.publishedAt ?? photo.createdAt)}
					</p>
				</div>

				{photo.books.length > 0 && (
					<div className="w-full shrink-0 md:w-80">
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

			{more.length > 0 && (
				<section className="mt-14">
					<h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-ink-900">More to explore</h2>
					<PublicPhotoGrid photos={more} />
				</section>
			)}
		</main>
	);
}

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
