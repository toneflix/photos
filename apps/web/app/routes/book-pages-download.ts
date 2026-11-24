import { cloudflareContext } from "~/lib/cloudflare";
import { ApiDownload } from "~/lib/download.server";
import { readToken } from "~/lib/session.server";
import type { Route } from "./+types/book-pages-download";

/** Streams the book's designed pages as a print-ready PDF, for its owner. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const token = await readToken(request);

	return new ApiDownload(request, env).fetch(`/books/${encodeURIComponent(params.id)}/pages/download`, token ? { Authorization: `Bearer ${token}` } : {}, {
		401: "Sign in to download this book's pages.",
		404: "This book has no pages yet.",
	});
}
