import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { useInfiniteList } from "~/lib/use-infinite-list";
import { Empty } from "~/components/explore/Empty";
import { Owner } from "~/components/explore/Owner";
import { SpaceCard } from "~/components/spaces/SpaceCard";
import { Spinner } from "~/components/ui";
import { SORT_FILTER, SearchFilters, filterParam, searchText } from "~/components/SearchFilters";
import type { Route } from "./+types/spaces";

export const meta = () => [
	{ title: "Explore spaces · Toneflix Photos" },
	{ name: "description", content: "Spaces photographers and creators share on Toneflix Photos, each with its own photos and books." },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const filters = {
		q: searchText(url),
		sort: filterParam(url, "sort", ["latest", "oldest"] as const),
	};

	const { data: items, meta } = await api.explore.spaces({ ...filters, page, per_page: 24 });

	return { items, page: meta.current_page, lastPage: meta.last_page, total: meta.total, filtered: Object.values(filters).some(Boolean) };
}

export default function ExploreSpaces({ loaderData }: Route.ComponentProps) {
	const { items: spaces, hasMore, loading, sentinel } = useInfiniteList(loaderData, "/explore/spaces");

	return (
		<>
			<SearchFilters placeholder="Search spaces by name or creator" filters={[SORT_FILTER]} />
			<p className="mt-5 mb-4 text-sm text-ink-500">{loaderData.filtered ? `${loaderData.total} ${loaderData.total === 1 ? "space" : "spaces"} found` : ""}</p>
			{!spaces.length && (
				<Empty>
					{loaderData.filtered
						? "No spaces match. Try other words or clear the filters."
						: "No public spaces yet. Make one of your spaces public and it shows up here."}
				</Empty>
			)}
			<ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
				{spaces.map((space) => (
					<SpaceCard key={space.id} space={space}>
						<div className="mt-2">
							<Owner owner={space.owner} />
						</div>
					</SpaceCard>
				))}
			</ul>
			{hasMore && (
				<div ref={sentinel} className="flex h-24 items-center justify-center text-ink-500">
					{loading && <Spinner />}
				</div>
			)}
		</>
	);
}
