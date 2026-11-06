import { createPhotosClient, PhotosApiError } from "@photos/api-client";
import { readToken } from "./session.server";

/**
 * API client for loaders and actions. Create one per request: caching is off
 * so data can't leak between users, and the user's token is read from the
 * incoming request's session cookie. `onUnauthorized` runs when the API
 * answers 401, and can throw a redirect.
 */
export async function getServerApi(request: Request, env: Env, token?: string | null, onUnauthorized?: () => void) {
	const sessionToken = token === undefined ? await readToken(request) : token;

	return createPhotosClient({
		baseURL: env.API_URL,
		cacheFor: null,
		getToken: () => sessionToken,
		headers: visitorHeaders(request),
		onUnauthorized,
	}).api;
}

export type ServerApi = Awaited<ReturnType<typeof getServerApi>>;

/**
 * The visitor's browser, IP and country, so the API can name their signed-in device
 * and price plans in their currency.
 * Without these every session would look like the Worker itself. Prefetches
 * are marked so a hovered link doesn't count as a view.
 */
export function visitorHeaders(request: Request): Record<string, string> {
	const headers: Record<string, string> = {};
	const userAgent = request.headers.get("user-agent");
	const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");

	if (userAgent) headers["User-Agent"] = userAgent;
	if (ip) headers["X-Forwarded-For"] = ip;
	if (request.headers.get("cf-ipcountry")) headers["X-Country"] = request.headers.get("cf-ipcountry")!;
	if ((request.headers.get("sec-purpose") ?? request.headers.get("purpose"))?.includes("prefetch")) headers.Purpose = "prefetch";

	return headers;
}

/** Turn an API error into something a form can show. */
export function formError(error: unknown) {
	if (error instanceof PhotosApiError) {
		const fieldErrors: Record<string, string> = {};
		for (const [field, messages] of Object.entries(error.errors ?? {})) {
			if (messages?.[0]) fieldErrors[field] = messages[0];
		}
		return { error: error.message, fieldErrors, status: error.code };
	}

	console.error(error);
	return {
		error: "We couldn't reach Toneflix Photos. Please try again.",
		fieldErrors: {} as Record<string, string>,
		status: 503,
	};
}

export { PhotosApiError };
