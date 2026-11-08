import { data } from "react-router";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi, PhotosApiError } from "~/lib/api.server";
import { PreviewImage, type ShareImageHandle } from "~/lib/preview-image";
import { PhotoDialog } from "~/lib/photo-dialog";
import { PhotoView } from "~/components/explore/PhotoView";
import type { Route } from "./+types/photo";

export const handle: ShareImageHandle = { shareImage: true };

export function meta({ loaderData, matches }: Route.MetaArgs) {
	const photo = loaderData?.photo;

	if (!photo) return [{ title: "Photo not found · Toneflix Photos" }];

	const by = photo.owner.name ? ` by ${photo.owner.name}` : "";

	return [
		{ title: `${photo.caption || "Photo"}${by} · Toneflix Photos` },
		{
			name: "description",
			content: photo.caption ?? `A photo${by} on Toneflix Photos.`,
		},
		{ property: "og:image", content: PreviewImage.from(matches).photo(photo.id) },
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

export const shouldRevalidate = PhotoDialog.shouldRevalidate;

export default function ExplorePhoto({ loaderData }: Route.ComponentProps) {
	return (
		<main>
			<PhotoView photo={loaderData.photo} more={loaderData.more} />
		</main>
	);
}
