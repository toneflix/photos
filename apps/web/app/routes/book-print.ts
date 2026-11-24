import { visitorHeaders } from "~/lib/api.server";
import { cloudflareContext } from "~/lib/cloudflare";
import { readToken } from "~/lib/session.server";
import type { Route } from "./+types/book-print";

/** The book laid out for printing, as the page the Download menu prints from a hidden frame. Failures come back as plain text. */
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const token = await readToken(request);
	const upstream = await fetch(`${env.API_URL}/books/${encodeURIComponent(params.id)}/print`, {
		headers: { ...visitorHeaders(request), Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
	});

	if (!upstream.ok) {
		const reply = (await upstream.json().catch(() => null)) as { message?: string } | null;
		const message = upstream.status === 401 ? "Sign in to print this book." : (reply?.message ?? "We couldn't get your book ready to print. Please try again in a minute.");

		return new Response(message, { status: upstream.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
	}

	return new Response(upstream.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
