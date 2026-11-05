import { createCookie } from "react-router";

const cookie = createCookie("book_codes", {
	httpOnly: true,
	sameSite: "lax",
	path: "/",
	maxAge: 60 * 60 * 24 * 60,
});

/** How many unlocked books a visitor's browser remembers. */
const LIMIT = 20;

/**
 * Access codes a visitor has unlocked books with, by book id. They live in an
 * httpOnly cookie so the visitor stays in after a reload without retyping.
 */
export class BookCodes {
	private constructor(
		private readonly request: Request,
		private readonly codes: Record<string, string>,
	) {}

	static async from(request: Request) {
		const value = await cookie.parse(request.headers.get("cookie"));

		return new BookCodes(request, value && typeof value === "object" ? value : {});
	}

	for(bookId: string): string | null {
		return this.codes[bookId] ?? null;
	}

	/** The Set-Cookie header that keeps `code` for `bookId`. */
	remember(bookId: string, code: string) {
		const kept = Object.entries(this.codes).filter(([id]) => id !== bookId);

		return this.commit(Object.fromEntries([...kept.slice(-(LIMIT - 1)), [bookId, code]]));
	}

	/** The Set-Cookie header that drops the code for `bookId`. */
	forget(bookId: string) {
		return this.commit(Object.fromEntries(Object.entries(this.codes).filter(([id]) => id !== bookId)));
	}

	private commit(codes: Record<string, string>) {
		return cookie.serialize(codes, { secure: new URL(this.request.url).protocol === "https:" });
	}
}
