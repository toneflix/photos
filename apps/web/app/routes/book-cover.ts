import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { PreviewImage } from "~/lib/preview-image";
import type { Route } from "./+types/book-cover";

/** The share-preview image of a public book: its cover photo. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);
	const book = await api.books
		.get(params.id)
		.then(({ data }) => data)
		.catch(() => null);

	if (!book?.coverPhoto) return PreviewImage.missing();

	return PreviewImage.redirect(book.coverPhoto.url);
}
