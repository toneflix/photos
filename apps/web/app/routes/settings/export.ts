import { cloudflareContext } from "~/lib/cloudflare";
import { visitorHeaders } from "~/lib/api.server";
import { requireSignIn } from "~/lib/session.server";
import type { Route } from "./+types/export";

/** Streams the account zip from the API, which needs the token the browser never sees. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const { token } = await requireSignIn(request, context);

	const upstream = await fetch(`${env.API_URL}/account/export`, {
		headers: { ...visitorHeaders(request), Authorization: `Bearer ${token}` },
	});

	if (!upstream.ok) {
		return new Response("We couldn't prepare your download. Please try again in a minute.", {
			status: upstream.status,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	return new Response(upstream.body, {
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="toneflix-photos.zip"',
			"Cache-Control": "no-store",
		},
	});
}
