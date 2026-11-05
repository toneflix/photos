import { createCookie, redirect } from "react-router";
import type { User } from "@photos/types";
import { cloudflareContext } from "./cloudflare";
import { PhotosApiError } from "@photos/api-client";
import type { RouterContextProvider } from "react-router";
import { getServerApi } from "./api.server";

/**
 * The API access token lives in an httpOnly cookie, so page scripts never see
 * it. Loaders and actions read it and call the API on the user's behalf.
 */
const tokenCookie = createCookie("photos_token", {
	httpOnly: true,
	sameSite: "lax",
	path: "/",
	maxAge: 60 * 60 * 24 * 30,
});

const isSecure = (request: Request) => new URL(request.url).protocol === "https:";

export async function readToken(request: Request): Promise<string | null> {
	const value = await tokenCookie.parse(request.headers.get("cookie"));
	return typeof value === "string" && value ? value : null;
}

export async function commitToken(request: Request, token: string) {
	return tokenCookie.serialize(token, { secure: isSecure(request) });
}

export async function clearToken(request: Request) {
	return tokenCookie.serialize("", { maxAge: 0, secure: isSecure(request) });
}

/** Where to send someone after they sign in. Only same-site paths are allowed. */
export function safeRedirect(to: FormDataEntryValue | string | null | undefined, fallback = "/books") {
	if (typeof to !== "string" || !to.startsWith("/") || to.startsWith("//")) return fallback;
	return to;
}

/**
 * Load the signed-in user, or send the visitor to sign in. Returns an API
 * client that acts as that user.
 */
export async function requireUser(request: Request, context: Readonly<RouterContextProvider>) {
	const { env } = context.get(cloudflareContext);
	const token = await readToken(request);
	const next = new URL(request.url).pathname;
	const signIn = `/signin?next=${encodeURIComponent(next)}`;

	if (!token) throw redirect(signIn);

	const api = await getServerApi(request, env, token);

	try {
		const { data: user } = await api.auth.me();
		return { user, api, token };
	} catch (error) {
		if (error instanceof PhotosApiError && error.code === 401) {
			throw redirect(signIn, { headers: { "Set-Cookie": await clearToken(request) } });
		}
		throw error;
	}
}

/** The signed-in user if there is one, without redirecting. */
export async function optionalUser(
	request: Request,
	context: Readonly<RouterContextProvider>,
): Promise<User | null> {
	const { env } = context.get(cloudflareContext);
	const token = await readToken(request);
	if (!token) return null;

	const api = await getServerApi(request, env, token);
	try {
		return (await api.auth.me()).data;
	} catch {
		return null;
	}
}
