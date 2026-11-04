import { createPhotosClient } from "@photos/api-client";

/**
 * API client for loaders and actions. Create one per request: caching is off
 * so data can't leak between users, and the user's token is read from the
 * incoming request.
 */
export function getServerApi(request: Request, env: Env) {
	return createPhotosClient({
		baseURL: env.API_URL,
		cacheFor: null,
		getToken: () => readSessionToken(request),
	}).api;
}

// Placeholder until sign-in is built: the session cookie name and format will
// be decided in the web app step.
function readSessionToken(request: Request) {
	const cookie = request.headers.get("cookie") ?? "";
	const match = cookie.match(/(?:^|;\s*)photos_token=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : null;
}
