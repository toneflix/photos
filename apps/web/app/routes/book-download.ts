import { cloudflareContext } from "~/lib/cloudflare";
import { BookCodes } from "~/lib/book-codes.server";
import { ApiDownload } from "~/lib/download.server";
import { readToken } from "~/lib/session.server";
import type { Route } from "./+types/book-download";

/** Streams a zip of the book's original photos, as the visitor's sign-in and access code allow. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const token = await readToken(request);
	const code = (await BookCodes.from(request)).for(params.id);
	const headers: Record<string, string> = {};

	if (token) headers.Authorization = `Bearer ${token}`;
	if (code) headers["X-Access-Code"] = code;

	return new ApiDownload(request, env).fetch(`/books/${encodeURIComponent(params.id)}/download`, headers, {
		403: "The photographer keeps all rights to the photos in this book, so they can't be downloaded.",
		404: "This book is locked or has no photos yet.",
	});
}
