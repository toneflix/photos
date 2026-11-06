import { visitorHeaders } from "~/lib/api.server";

/**
 * A file download fetched from the API and passed through to the browser as it streams.
 * Failures come back as plain text the browser shows in place of the file.
 */
export class ApiDownload {
	constructor(
		private readonly request: Request,
		private readonly env: Env,
	) {}

	/** Fetch `path` from the API as the visitor, with any extra headers such as a token or access code. */
	async fetch(path: string, headers: Record<string, string> = {}, messages: Partial<Record<number, string>> = {}): Promise<Response> {
		const upstream = await fetch(`${this.env.API_URL}${path}`, {
			headers: { ...visitorHeaders(this.request), Accept: "application/json", ...headers },
		});

		if (!upstream.ok) {
			const reply = (await upstream.json().catch(() => null)) as { message?: string } | null;
			const message = messages[upstream.status] ?? reply?.message ?? "We couldn't prepare your download. Please try again in a minute.";

			return new Response(message, { status: upstream.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
		}

		return new Response(upstream.body, {
			headers: {
				"Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
				"Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="download"',
				"Cache-Control": "no-store",
			},
		});
	}

	/** The download size options in the page's query string, passed on to the API. */
	static sizeQuery(request: Request): string {
		const params = new URL(request.url).searchParams;
		const query = new URLSearchParams();

		for (const key of ["size", "width", "height"]) {
			const value = params.get(key);

			if (value) query.set(key, value);
		}

		return query.size ? `?${query}` : "";
	}
}
