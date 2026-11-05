import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { PreviewImage } from "~/lib/preview-image";
import type { Route } from "./+types/preview";

/** The share-preview image of a public photo. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);
	const photo = await api.explore
		.photo(params.id)
		.then(({ data }) => data)
		.catch(() => null);

	if (!photo) return PreviewImage.missing();

	return PreviewImage.redirect(photo.url);
}
