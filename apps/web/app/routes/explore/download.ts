import { cloudflareContext } from "~/lib/cloudflare";
import { visitorHeaders } from "~/lib/api.server";
import type { Route } from "./+types/download";

/** Streams the original of an openly licensed public photo. The API refuses photos whose owner keeps all rights. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const upstream = await fetch(`${env.API_URL}/explore/photos/${encodeURIComponent(params.id)}/download`, {
		headers: { ...visitorHeaders(request), Accept: "application/json" },
	});

	if (!upstream.ok) {
		const message =
			upstream.status === 403
				? "The photographer keeps all rights to this photo, so it can't be downloaded."
				: upstream.status === 404
					? "This photo isn't public anymore."
					: "We couldn't prepare your download. Please try again in a minute.";

		return new Response(message, { status: upstream.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
	}

	return new Response(upstream.body, {
		headers: {
			"Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
			"Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="photo"',
			"Cache-Control": "no-store",
		},
	});
}
