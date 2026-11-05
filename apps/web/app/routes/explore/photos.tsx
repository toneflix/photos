import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { useInfiniteList } from "~/lib/use-infinite-list";
import { PublicPhotoGrid } from "~/components/explore/PublicPhotoGrid";
import { Empty } from "~/components/explore/Empty";
import { Spinner } from "~/components/ui";
import { ORIENTATION_FILTER, SORT_FILTER, SearchFilters, filterParam, searchText } from "~/components/SearchFilters";
import type { Route } from "./+types/photos";

export const meta = () => [
	{ title: "Explore photos · Toneflix Photos" },
	{ name: "description", content: "Photos people chose to share with everyone on Toneflix Photos." },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const filters = {
		q: searchText(url),
		orientation: filterParam(url, "orientation", ["landscape", "portrait", "square"] as const),
		sort: filterParam(url, "sort", ["latest", "oldest"] as const),
	};

	const { data: items, meta } = await api.explore.photos({ ...filters, page, per_page: 40 });

	return { items, page: meta.current_page, lastPage: meta.last_page, total: meta.total, filtered: Object.values(filters).some(Boolean) };
}

export default function ExplorePhotos({ loaderData }: Route.ComponentProps) {
	const { items: photos, hasMore, loading, sentinel } = useInfiniteList(loaderData, "/explore");

	return (
		<>
			<SearchFilters placeholder="Search photos by caption or photographer" filters={[ORIENTATION_FILTER, SORT_FILTER]} />
			<p className="mt-5 mb-4 text-sm text-ink-500">
				{loaderData.filtered ? `${loaderData.total} ${loaderData.total === 1 ? "photo" : "photos"} found` : ""}
			</p>
			{!photos.length && (
				<Empty>
					{loaderData.filtered
						? "No photos match. Try other words or clear the filters."
						: "No one has shared a photo yet. Open a photo in your library and turn on Show on Explore."}
				</Empty>
			)}
			<PublicPhotoGrid photos={photos} />
			{hasMore && (
				<div ref={sentinel} className="flex h-24 items-center justify-center text-ink-500">
					{loading && <Spinner />}
				</div>
			)}
		</>
	);
}
