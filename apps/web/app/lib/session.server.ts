import { createContext, createCookie, redirect } from "react-router";
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
 * The visitor's session for one request. Every loader and action in the
 * request shares it, so the account is fetched from the API at most once.
 */
export class Session {
	private static readonly current = createContext<Promise<Session> | null>(null);

	private account?: Promise<User>;

	private constructor(
		private readonly request: Request,
		private readonly env: Env,
		readonly token: string | null,
	) {}

	static for(request: Request, context: Readonly<RouterContextProvider>): Promise<Session> {
		let session = context.get(Session.current);

		if (!session) {
			const { env } = context.get(cloudflareContext);
			session = readToken(request).then((token) => new Session(request, env, token));
			context.set(Session.current, session);
		}

		return session;
	}

	/** An API client acting as the visitor. */
	api(onUnauthorized?: () => void) {
		return getServerApi(this.request, this.env, this.token, onUnauthorized);
	}

	/** The signed-in account. Rejects with the API error when the token is missing or no longer works. */
	me(): Promise<User> {
		this.account ??= this.token ? this.api().then(async (api) => (await api.auth.me()).data) : Promise.reject(new PhotosApiError(401, "Unauthenticated."));

		return this.account;
	}

	/** Sends the visitor to sign in, then back to this page, forgetting a token that stopped working. */
	async signIn(): Promise<Response> {
		const next = new URL(this.request.url).pathname.replace(/(\/_root)?\.data$/, "") || "/";
		const headers: HeadersInit = this.token ? { "Set-Cookie": await clearToken(this.request) } : {};

		return redirect(`/signin?next=${encodeURIComponent(next)}`, { headers });
	}
}

/**
 * For pages that only need to act as the visitor. Nobody signed in, or an API
 * answer of 401, sends them to sign in. The account itself is not fetched.
 */
export async function requireSignIn(request: Request, context: Readonly<RouterContextProvider>) {
	const session = await Session.for(request, context);
	const signIn = await session.signIn();

	if (!session.token) throw signIn;

	const api = await session.api(() => {
		throw signIn;
	});

	return { api, token: session.token };
}

/** Like `requireSignIn`, and also loads the signed-in user. */
export async function requireUser(request: Request, context: Readonly<RouterContextProvider>) {
	const { api, token } = await requireSignIn(request, context);
	const session = await Session.for(request, context);

	try {
		return { user: await session.me(), api, token };
	} catch (error) {
		if (error instanceof PhotosApiError && error.code === 401) throw await session.signIn();

		throw error;
	}
}

/** The signed-in user if there is one, without redirecting. */
export async function optionalUser(request: Request, context: Readonly<RouterContextProvider>): Promise<User | null> {
	const session = await Session.for(request, context);

	if (!session.token) return null;

	return session.me().catch(() => null);
}
