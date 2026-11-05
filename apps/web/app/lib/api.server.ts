import { createPhotosClient, PhotosApiError } from "@photos/api-client";
import { readToken } from "./session.server";

/**
 * API client for loaders and actions. Create one per request: caching is off
 * so data can't leak between users, and the user's token is read from the
 * incoming request's session cookie.
 */
export async function getServerApi(request: Request, env: Env, token?: string | null) {
	const sessionToken = token === undefined ? await readToken(request) : token;

	return createPhotosClient({
		baseURL: env.API_URL,
		cacheFor: null,
		getToken: () => sessionToken,
		headers: visitorHeaders(request),
	}).api;
}

/**
 * The visitor's browser and IP, so the API can name their signed-in device.
 * Without these every session would look like the Worker itself.
 */
export function visitorHeaders(request: Request): Record<string, string> {
	const headers: Record<string, string> = {};
	const userAgent = request.headers.get("user-agent");
	const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");

	if (userAgent) headers["User-Agent"] = userAgent;
	if (ip) headers["X-Forwarded-For"] = ip;

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
