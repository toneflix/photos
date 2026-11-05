import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { useInfiniteList } from "~/lib/use-infinite-list";
import { PublicPhotoGrid } from "~/components/explore/PublicPhotoGrid";
import { Empty } from "~/components/explore/Empty";
import { Spinner } from "~/components/ui";
import type { Route } from "./+types/photos";

export const meta = () => [
	{ title: "Explore photos · Toneflix Photos" },
	{ name: "description", content: "Photos people chose to share with everyone on Toneflix Photos." },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env);
	const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);

	const { data: items, meta } = await api.explore.photos({ page, per_page: 40 });

	return { items, page: meta.current_page, lastPage: meta.last_page };
}

export default function ExplorePhotos({ loaderData }: Route.ComponentProps) {
	const { items: photos, hasMore, loading, sentinel } = useInfiniteList(loaderData, "/explore");

	if (!photos.length) return <Empty>No one has shared a photo yet. Open a photo in your library and turn on Show on Explore.</Empty>;

	return (
		<>
			<PublicPhotoGrid photos={photos} />
			{hasMore && (
				<div ref={sentinel} className="flex h-24 items-center justify-center text-ink-500">
					{loading && <Spinner />}
				</div>
			)}
		</>
	);
}
