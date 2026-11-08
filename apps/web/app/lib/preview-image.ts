import type { loader as rootLoader } from "~/root";

type Match = { id: string; loaderData?: unknown } | undefined;

/** Route handle for pages whose meta sets their own `og:image`; the site's default image is left out there. */
export interface ShareImageHandle {
	shareImage: true;
}

/**
 * Stable image links for share previews. Sites that render link previews keep the
 * image URL for days, longer than a signed storage URL lives, so previews point at
 * these routes and each hit redirects to a freshly signed URL.
 */
export class PreviewImage {
	private constructor(private readonly origin: string) {}

	/** Reads the site origin the root loader exposes to every route's meta. */
	static from(matches: readonly Match[]) {
		const root = matches.find((match) => match?.id === "root")?.loaderData as Awaited<ReturnType<typeof rootLoader>> | undefined;

		return new PreviewImage(root?.origin ?? "");
	}

	photo(id: string) {
		return `${this.origin}/explore/photos/${encodeURIComponent(id)}/preview`;
	}

	book(id: string) {
		return `${this.origin}/books/${encodeURIComponent(id)}/cover`;
	}

	/** The Toneflix Photos logo card, for pages without an image of their own. */
	site() {
		return `${this.origin}/og-image.png`;
	}

	/** Whether a matched route's meta sets its own share image. */
	static ownedBy(matches: readonly { handle?: unknown }[]) {
		return matches.some((match) => (match.handle as Partial<ShareImageHandle> | undefined)?.shareImage);
	}

	/** Redirects to a signed URL, cached well inside the URL's lifetime. */
	static redirect(signedUrl: string) {
		return new Response(null, { status: 302, headers: { Location: signedUrl, "Cache-Control": "public, max-age=3600" } });
	}

	static missing() {
		return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
	}
}
